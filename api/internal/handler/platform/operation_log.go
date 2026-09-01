package platform

import (
	"admin-seed/internal/common"
	"admin-seed/internal/dto/request"
	"admin-seed/internal/middleware"
	"admin-seed/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

// OperationLogHandler 操作日志处理器
type OperationLogHandler struct {
	logService *service.OperationLogService
}

// NewOperationLogHandler 创建操作日志处理器
func NewOperationLogHandler(logService *service.OperationLogService) *OperationLogHandler {
	return &OperationLogHandler{
		logService: logService,
	}
}

// GetLogs 获取应用日志列表（安全管理员）
func (h *OperationLogHandler) GetLogs(c *gin.Context) {
	// 用户认证检查
	_, exists := middleware.GetUser(c)
	if !exists {
		panic(common.NewAppError(
			common.ERROR_UNAUTHORIZED,
			"用户未认证",
		))
	}

	// 获取筛选参数
	filters := &request.OperationLogFilters{
		StartTime:      c.Query("start_time"),
		EndTime:        c.Query("end_time"),
		Operator:       c.Query("operator"),
		OperatorID:     c.Query("operator_id"),
		OperatorRole:   c.Query("operator_role"),
		Module:         c.Query("module"),
		ActionCategory: c.Query("action_category"),
		IPAddress:      c.Query("ip_address"),
		Result:         c.Query("result"),
		Keyword:        c.Query("keyword"),
		SortBy:         c.Query("sort_by"),
		SortOrder:      c.Query("sort_order"),
		Page:           1,
		Size:           20,
	}

	// 解析分页参数
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			filters.Page = page
		}
	}
	if sizeStr := c.Query("size"); sizeStr != "" {
		if size, err := strconv.Atoi(sizeStr); err == nil && size > 0 && size <= 100 {
			filters.Size = size
		}
	}

	// 查询日志
	result, err := h.logService.ListLogs(filters)
	if err != nil {
		panic(err)
	}

	common.Success(c, result)
}

// GetThreeAdminLogs 获取三员操作日志（审计员）
func (h *OperationLogHandler) GetThreeAdminLogs(c *gin.Context) {
	// 用户认证检查
	_, exists := middleware.GetUser(c)
	if !exists {
		panic(common.NewAppError(
			common.ERROR_UNAUTHORIZED,
			"用户未认证",
		))
	}

	// 获取筛选参数
	filters := &request.OperationLogFilters{
		StartTime:      c.Query("start_time"),
		EndTime:        c.Query("end_time"),
		Operator:       c.Query("operator"),
		OperatorID:     c.Query("operator_id"),
		Module:         c.Query("module"),
		ActionCategory: c.Query("action_category"),
		IPAddress:      c.Query("ip_address"),
		Result:         c.Query("result"),
		Keyword:        c.Query("keyword"),
		SortBy:         c.Query("sort_by"),
		SortOrder:      c.Query("sort_order"),
		Page:           1,
		Size:           20,
	}

	// 解析分页参数
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			filters.Page = page
		}
	}
	if sizeStr := c.Query("size"); sizeStr != "" {
		if size, err := strconv.Atoi(sizeStr); err == nil && size > 0 && size <= 100 {
			filters.Size = size
		}
	}

	// 查询日志
	result, err := h.logService.GetThreeAdminLogs(filters)
	if err != nil {
		panic(err)
	}

	common.Success(c, result)
}
