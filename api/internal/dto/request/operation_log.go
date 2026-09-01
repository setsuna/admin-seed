package request

// OperationLogFilters 操作日志查询过滤器
type OperationLogFilters struct {
	StartTime      string `form:"start_time" json:"start_time"`             // 开始时间
	EndTime        string `form:"end_time" json:"end_time"`                 // 结束时间
	Operator       string `form:"operator" json:"operator"`                 // 操作人名称
	OperatorID     string `form:"operator_id" json:"operator_id"`           // 操作人ID
	OperatorRole   string `form:"operator_role" json:"operator_role"`       // 操作人角色
	Module         string `form:"module" json:"module"`                     // 操作模块
	ActionCategory string `form:"action_category" json:"action_category"`   // 行为类别
	IPAddress      string `form:"ip_address" json:"ip_address"`             // IP地址
	Result         string `form:"result" json:"result"`                     // 操作结果
	Keyword        string `form:"keyword" json:"keyword"`                   // 关键词搜索
	Page           int    `form:"page" json:"page" binding:"min=1"`         // 页码
	Size           int    `form:"size" json:"size" binding:"min=1,max=100"` // 每页大小
	SortBy         string `form:"sort_by" json:"sort_by"`                   // 排序字段
	SortOrder      string `form:"sort_order" json:"sort_order"`             // 排序方向
}
