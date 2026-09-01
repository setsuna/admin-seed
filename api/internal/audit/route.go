package audit

// route.go — 从请求路径与方法推导「模块」「操作类别」「操作描述」。
//
// 相比原实现的修正：
//   - /dicts 修正为 /dictionaries（原匹配与真实路由不符，导致字典操作全被归入“系统配置”）
//   - 补全 devices / nameplate / policy / archives / votes / mount / menus / license / device-logs
//   - 匹配顺序改为「最具体优先」，并用显式列表替代 if-else 链，便于维护

import (
	"encoding/json"
	"strings"

	"admin-seed/internal/model"
)

// moduleRule 一条路径→模块的匹配规则。顺序敏感：先匹配到的生效。
type moduleRule struct {
	fragment string
	module   string
}

// moduleRules 必须从最具体到最宽泛排列。
// 例如 /meetings/:id/votes 要先于 /meetings 匹配到 VOTE。
var moduleRules = []moduleRule{
	// 会议子资源（须在 /meetings 之前）
	{"/votes", model.ModuleVote},
	{"/package", model.ModulePackage},
	{"/participants", model.ModuleMeeting},
	{"/agendas", model.ModuleMeeting},
	{"/agenda", model.ModuleMeeting},
	{"/files", model.ModuleFile},

	// 独立资源
	{"/device-logs", model.ModuleDeviceLog},
	{"/devices", model.ModuleDevice},
	{"/nameplate", model.ModuleNameplate},
	{"/archives", model.ModuleArchive},
	{"/archive-download", model.ModuleArchive},
	{"/mount", model.ModuleSync},
	{"/packages", model.ModulePackage},
	{"/policy", model.ModulePolicy},
	{"/dictionaries", model.ModuleDict},
	{"/departments", model.ModuleDepartment},
	{"/menus", model.ModuleMenu},
	{"/roles", model.ModuleRole},
	{"/permissions", model.ModulePermission},
	{"/license", model.ModuleLicense},
	{"/users", model.ModuleUser},
	{"/meetings", model.ModuleMeeting},
	{"/auth", model.ModuleAuth},
	{"/logs", model.ModuleSystem},
}

// moduleNames 模块 → 中文名，用于拼接操作描述。
var moduleNames = map[string]string{
	model.ModuleUser:       "用户",
	model.ModuleDepartment: "部门",
	model.ModuleMeeting:    "会议",
	model.ModuleDict:       "字典",
	model.ModulePermission: "权限",
	model.ModuleRole:       "角色",
	model.ModuleSecurity:   "安全配置",
	model.ModuleSystem:     "系统配置",
	model.ModuleAuth:       "认证",
	model.ModuleConfig:     "配置",
	model.ModuleSync:       "同步",
	model.ModuleFile:       "文件",
	model.ModulePackage:    "会议加密包",
	model.ModuleDevice:     "设备",
	model.ModuleDeviceLog:  "终端日志",
	model.ModuleArchive:    "会议归档",
	model.ModuleNameplate:  "电子铭牌",
	model.ModulePolicy:     "安全策略",
	model.ModuleVote:       "投票",
	model.ModuleMenu:       "菜单",
	model.ModuleLicense:    "系统授权",
}

// ParseModule 依据路由模板推导模块。
func ParseModule(path string) string {
	for _, rule := range moduleRules {
		if strings.Contains(path, rule.fragment) {
			return rule.module
		}
	}
	return model.ModuleSystem
}

// ParseAction 依据 HTTP 方法与路径推导操作类别。
func ParseAction(method, path string) string {
	switch method {
	case "POST":
		switch {
		case strings.Contains(path, "/login"):
			return model.ActionLogin
		case strings.Contains(path, "/logout"):
			return model.ActionLogout
		case strings.Contains(path, "/export"):
			return model.ActionExport
		case strings.Contains(path, "/import"):
			return model.ActionImport
		case strings.Contains(path, "/batch-delete"), strings.Contains(path, "/batch/delete"):
			return model.ActionDelete
		case strings.Contains(path, "/batch-"), strings.Contains(path, "/batch"):
			// 批量更新类（batch-department / batch-security-level）
			if strings.Contains(path, "/batch-import") {
				return model.ActionImport
			}
			return model.ActionUpdate
		case strings.Contains(path, "/reset-password"), strings.Contains(path, "/change-password"):
			return model.ActionUpdate
		case strings.Contains(path, "/sync"), strings.Contains(path, "/mount/process"):
			return model.ActionSync
		case strings.Contains(path, "/clear-all"), strings.Contains(path, "/cleanup"):
			return model.ActionDelete
		default:
			return model.ActionCreate
		}
	case "PUT", "PATCH":
		return model.ActionUpdate
	case "DELETE":
		return model.ActionDelete
	case "GET":
		if strings.Contains(path, "/export") {
			return model.ActionExport
		}
		return model.ActionView
	}
	return model.ActionView
}

// ModuleName 返回模块中文名。
func ModuleName(module string) string {
	if name, ok := moduleNames[module]; ok {
		return name
	}
	return "资源"
}

// actionVerbs 操作类别 → 中文动词。
var actionVerbs = map[string]string{
	model.ActionCreate:  "创建",
	model.ActionUpdate:  "更新",
	model.ActionDelete:  "删除",
	model.ActionView:    "查看",
	model.ActionExport:  "导出",
	model.ActionImport:  "导入",
	model.ActionSync:    "同步",
	model.ActionArchive: "归档",
	model.ActionConfig:  "配置",
}

// resourceNameKeys 从资源对象中提取“名称”的候选字段，按优先级排列。
var resourceNameKeys = []string{
	"name",          // 通用名称（部门/角色/设备/会议等）
	"title",         // 会议/议程/投票
	"original_name", // 文件
	"username",      // 用户
	"dict_name",     // 字典
	"user_name",     // 参会人
	"code",          // 退而求其次：编码
}

// ResourceName 从资源快照 map 中提取可读名称；取不到时返回空串。
func ResourceName(m map[string]any) string {
	if m == nil {
		return ""
	}
	for _, k := range resourceNameKeys {
		if v, ok := m[k]; ok {
			if s, isStr := v.(string); isStr && s != "" {
				return s
			}
		}
	}
	return ""
}

// BuildDescription 构建操作描述。
// 优先用资源名称（如“创建用户李四”）；无名称时不再拼接 ID。
// 资源 ID 仍保留在 before_data/after_data 中供排查。
func BuildDescription(module, action, resourceName string) string {
	switch action {
	case model.ActionLogin:
		return "用户登录系统"
	case model.ActionLogout:
		return "用户登出系统"
	}

	verb, ok := actionVerbs[action]
	if !ok {
		verb = "操作"
	}
	desc := verb + ModuleName(module)

	if resourceName != "" {
		desc += "“" + resourceName + "”"
	}
	return desc
}

// skipPaths 完全不记录审计日志的路径片段。
var skipPaths = []string{
	"/health",
	"/ready",
	"/static",
	"/docs",
	"/api/v1/logs",        // 查看日志本身不记录，避免自我循环
	"/api/v1/device-logs", // 同上
}

// ParseImportNames 从导入请求体解析出名称列表。
// 兼容形如 {"users":[{"name":"张三","username":"zhangsan"}]} 的结构：
// 优先取 name，缺失时回退 username。解析失败返回空切片（降级为无名单描述）。
func ParseImportNames(requestBody []byte) []string {
	if len(requestBody) == 0 {
		return nil
	}

	var payload struct {
		Users []struct {
			Name     string `json:"name"`
			Username string `json:"username"`
		} `json:"users"`
	}
	if err := json.Unmarshal(requestBody, &payload); err != nil {
		return nil
	}

	names := make([]string, 0, len(payload.Users))
	for _, u := range payload.Users {
		if u.Name != "" {
			names = append(names, u.Name)
		} else if u.Username != "" {
			names = append(names, u.Username)
		}
	}
	return names
}

// BuildImportDescription 为导入操作构建带名单摘要的描述，如“导入用户2人：张三、李四”。
// names 为从请求体解析出的名称列表；超过 5 个只展示前 5 个后跟“等 N 人”。
func BuildImportDescription(module string, names []string) string {
	base := "导入" + ModuleName(module)
	if len(names) == 0 {
		return base
	}
	base += itoa(len(names)) + "人"

	const maxShow = 5
	shown := names
	suffix := ""
	if len(names) > maxShow {
		shown = names[:maxShow]
		suffix = "等"
	}

	out := base + "："
	for i, n := range shown {
		if i > 0 {
			out += "、"
		}
		out += n
	}
	return out + suffix
}

// itoa 轻量整数转字符串（避免为一处调用引入 strconv）。
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[i:])
}

// ShouldSkip 判断该路径是否跳过审计。
func ShouldSkip(path string) bool {
	for _, p := range skipPaths {
		if strings.Contains(path, p) {
			return true
		}
	}
	// 草稿是临时状态，不记录；但提交草稿（submit）是正式操作，要记录
	if strings.Contains(path, "/meetings/draft") && !strings.Contains(path, "/submit") {
		return true
	}
	return false
}
