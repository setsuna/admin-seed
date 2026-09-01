package response

// DashboardResponse 仪表板响应（种子版：只统计系统管理域）
//
// 业务项目应在自己的 dashboard 服务中扩展或替换本结构，
// 例如拍报机会增加设备、订单、营业额等统计。
type DashboardResponse struct {
	User       UserStats        `json:"user"`
	Department DepartmentStats  `json:"department"`
	Role       RoleStats        `json:"role"`
	Log        OperationLogStat `json:"log"`
}

// UserStats 用户统计
type UserStats struct {
	Total    int64 `json:"total"`
	Active   int64 `json:"active"`
	Inactive int64 `json:"inactive"`
}

// DepartmentStats 部门统计
type DepartmentStats struct {
	Total int64 `json:"total"`
}

// RoleStats 角色统计
type RoleStats struct {
	Total int64 `json:"total"`
}

// OperationLogStat 操作日志统计
type OperationLogStat struct {
	Total   int64 `json:"total"`
	Today   int64 `json:"today"`
	Failed7 int64 `json:"failed7d"`
}
