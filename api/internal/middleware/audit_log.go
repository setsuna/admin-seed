package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"strings"
	"time"

	"admin-seed/internal/audit"
	"admin-seed/internal/model"
	"admin-seed/internal/service"

	"github.com/gin-gonic/gin"
)

// auditResponseWriter 捕获响应体，用于在未注册抓取器时降级提取 after_data。
type auditResponseWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *auditResponseWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

// beforeDataKey 允许 handler 手动覆盖 before 快照（注册表无法表达的特殊场景）。
const beforeDataKey = "before_data"

// AuditLogMiddleware 审计日志中间件。
//
// before / after 均由 audit.Registry 在业务逻辑执行前后各抓取一次，
// 直接取自数据库，因此：
//   - handler 无需任何埋点；
//   - 响应体为 null 的接口（改状态 / 改密级 / 批量操作）同样能得出完整变更明细；
//   - 未注册抓取器的接口降级为从响应体提取 after，而非静默丢弃整条日志。
//
// 注册位置：本中间件需要在 AuthMiddleware 之后注册（才能在 c.Next() 前拿到
// 登录用户）。登录/登出接口位于认证之前，由 AuditAuthMiddleware 单独处理。
func AuditLogMiddleware(logService *service.OperationLogService) gin.HandlerFunc {
	return func(c *gin.Context) {
		if audit.ShouldSkip(c.Request.RequestURI) {
			c.Next()
			return
		}

		user, exists := GetUser(c)
		if !exists {
			// 未认证请求不归本中间件管（登录走 AuditAuthMiddleware）
			c.Next()
			return
		}
		if model.IsSuperAdmin(user.Username) {
			c.Next()
			return
		}

		recordAudit(c, user, logService)
	}
}

// AuditAuthMiddleware 仅处理登录接口的审计（此时尚未认证，无 Claims）。
// 挂在 v1 组上；登出不记录。
func AuditAuthMiddleware(logService *service.OperationLogService) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !strings.Contains(c.Request.RequestURI, "/login") {
			c.Next()
			return
		}
		recordAudit(c, nil, logService)
	}
}

// recordAudit 审计主流程：前置快照 → 执行业务 → 后置快照 → 异步落库。
func recordAudit(c *gin.Context, user *model.Claims, logService *service.OperationLogService) {
	action := audit.ParseAction(c.Request.Method, c.FullPath())

	// 读操作与登出不记录
	if action == model.ActionView || action == model.ActionLogout {
		c.Next()
		return
	}

	startTime := time.Now()

	// 保留请求体供后续 handler 读取（body 只能读一次）
	var requestBody []byte
	if c.Request.Body != nil {
		requestBody, _ = io.ReadAll(c.Request.Body)
		c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
	}

	// 导入操作：在 body 被 handler 消费前解析名单，用于生成描述。
	var importNames []string
	if action == model.ActionImport {
		importNames = audit.ParseImportNames(requestBody)
	}

	// 关键：业务逻辑执行「前」抓取 before —— 此刻数据库仍是旧值。
	// CREATE / LOGIN 没有 before，跳过以省一次查询。
	var beforeMap map[string]any
	if action != model.ActionCreate && action != model.ActionLogin {
		beforeMap = audit.Snapshot(c)
	}

	writer := &auditResponseWriter{
		ResponseWriter: c.Writer,
		body:           bytes.NewBufferString(""),
	}
	c.Writer = writer

	c.Next()

	// handler 可通过 c.Set("before_data", obj) 覆盖注册表结果
	if val, ok := c.Get(beforeDataKey); ok && val != nil {
		if m := audit.ToMap(val); m != nil {
			beforeMap = m
		}
	}

	// 业务逻辑执行「后」抓取 after —— 取数据库真实落库结果。
	// DELETE 之后资源已不存在，Snapshot 返回 nil，符合预期。
	var afterMap map[string]any
	if c.Writer.Status() < 400 && action != model.ActionDelete {
		afterMap = audit.Snapshot(c)
	}

	// 未注册抓取器时降级：从响应体提取 after
	if afterMap == nil && !audit.HasFetcher(c) {
		afterMap = audit.ToMap(extractDataFromResponse(writer.body.Bytes()))
	}

	log := buildOperationLog(c, user, startTime, writer.body.Bytes(), beforeMap, afterMap, action, importNames)
	if log == nil {
		return
	}

	// 异步落库，不阻塞主流程
	go func() {
		_ = logService.RecordLog(context.Background(), log)
	}()
}

// buildOperationLog 组装一条操作日志；返回 nil 表示不记录。
func buildOperationLog(
	c *gin.Context,
	user *model.Claims,
	startTime time.Time,
	responseBody []byte,
	beforeMap, afterMap map[string]any,
	action string,
	importNames []string,
) *model.OperationLog {
	result := model.OperationSuccess
	if c.Writer.Status() >= 400 {
		result = model.OperationFailure
	}

	module := audit.ParseModule(c.FullPath())

	operator, operatorName, operatorID, operatorRole, ok := resolveOperator(c, user, action, result, responseBody)
	if !ok {
		return nil
	}

	// 资源名称：优先取 after（创建/更新后的名称），删除场景取 before。
	resourceName := audit.ResourceName(afterMap)
	if resourceName == "" {
		resourceName = audit.ResourceName(beforeMap)
	}

	// 描述：导入操作带名单摘要，其余用资源名称。
	var description string
	if action == model.ActionImport {
		description = audit.BuildImportDescription(module, importNames)
	} else {
		description = audit.BuildDescription(module, action, resourceName)
	}

	log := &model.OperationLog{
		Timestamp:         startTime,
		Operator:          operator,
		OperatorID:        operatorID,
		OperatorName:      operatorName,
		OperatorRole:      operatorRole,
		IPAddress:         c.ClientIP(),
		Module:            module,
		ActionCategory:    action,
		ActionDescription: description,
		OperationResult:   result,
		RequestID:         GetRequestID(c),
	}

	// 失败的写操作：记录事实本身，不记录数据快照
	if result == model.OperationFailure {
		return log
	}

	switch action {
	case model.ActionCreate, model.ActionImport:
		attachJSON(&log.AfterData, audit.Sanitize(afterMap))

	case model.ActionUpdate:
		attachJSON(&log.BeforeData, audit.Sanitize(beforeMap))
		attachJSON(&log.AfterData, audit.Sanitize(afterMap))

		switch {
		case beforeMap != nil && afterMap != nil:
			changes := audit.BuildChanges(beforeMap, afterMap)
			if len(changes) == 0 {
				// 确实没有任何字段发生变化，无需留痕
				return nil
			}
			details := audit.DescribeChanges(changes)
			log.ChangeDetails = &details

		default:
			// before 或 after 快照缺失（未注册抓取器等）：
			// 不写任何内部提示性文案，前端自行展示“—”即可。
		}

	case model.ActionDelete:
		attachJSON(&log.BeforeData, audit.Sanitize(beforeMap))

	default:
		// SYNC / EXPORT / ARCHIVE / CONFIG 等：只留 after
		attachJSON(&log.AfterData, audit.Sanitize(afterMap))
	}

	return log
}

// resolveOperator 解析操作者信息。登录操作需从响应体提取。
// 最后一个返回值为 false 表示这条日志不应被记录。
func resolveOperator(
	c *gin.Context,
	user *model.Claims,
	action, result string,
	responseBody []byte,
) (operator, operatorName, operatorID, operatorRole string, ok bool) {
	if user != nil {
		operator = user.Username
		operatorName = user.Name
		operatorID = user.UserID
		if len(user.Roles) > 0 {
			operatorRole = user.Roles[0]
		}
		return operator, operatorName, operatorID, operatorRole, true
	}

	if action == model.ActionLogin {
		if result == model.OperationFailure {
			return "", "", "", "", false
		}
		dataMap, isMap := extractDataFromResponse(responseBody).(map[string]any)
		if !isMap {
			return "", "", "", "", false
		}
		userObj, hasUser := dataMap["user"].(map[string]any)
		if !hasUser {
			return "", "", "", "", false
		}
		operator, _ = userObj["username"].(string)
		operatorID, _ = userObj["id"].(string)
		operatorName, _ = userObj["name"].(string)
		if operator == "" || operatorID == "" {
			return "", "", "", "", false
		}
		if model.IsSuperAdmin(operator) {
			return "", "", "", "", false
		}
		if role, hasRole := userObj["role"].(string); hasRole {
			operatorRole = role
		}
		return operator, operatorName, operatorID, operatorRole, true
	}

	return "匿名用户", "", "anonymous", "", true
}

// attachJSON 把 map 序列化后挂到日志字段上；空 map 不写入。
func attachJSON(target **string, m map[string]any) {
	if len(m) == 0 {
		return
	}
	data, err := json.Marshal(m)
	if err != nil {
		return
	}
	s := string(data)
	*target = &s
}

// extractDataFromResponse 从统一响应结构中提取 data 字段。
func extractDataFromResponse(responseBody []byte) any {
	if len(responseBody) == 0 {
		return nil
	}
	var resp map[string]any
	if err := json.Unmarshal(responseBody, &resp); err != nil {
		return nil
	}
	if code, hasCode := resp["code"].(float64); !hasCode || code != 200 {
		return nil
	}
	return resp["data"]
}

// isLoginOrLogout 已废弃：登录审计改由 AuditAuthMiddleware 直接判断。
