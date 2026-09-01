package request

// CreateRoleRequest 创建角色请求
type CreateRoleRequest struct {
	Name        string            `json:"name" binding:"required"`
	Code        string            `json:"code" binding:"required"`
	Description string            `json:"description"`
	Permissions []string          `json:"permissions" binding:"required"`
	Type        string            `json:"type" binding:"omitempty,oneof=system business custom"`
	Level       int               `json:"level"`
	Metadata    map[string]string `json:"metadata"`
}

// UpdateRoleRequest 更新角色请求
type UpdateRoleRequest struct {
	Name        string            `json:"name"`
	Code        string            `json:"code"`
	Description string            `json:"description"`
	Permissions []string          `json:"permissions"`
	Type        string            `json:"type" binding:"omitempty,oneof=system business custom"`
	Level       int               `json:"level"`
	Status      string            `json:"status" binding:"omitempty,oneof=active inactive deleted"`
	Metadata    map[string]string `json:"metadata"`
}

// RoleFilters 角色筛选条件
type RoleFilters struct {
	Keyword   string `json:"keyword" form:"keyword"`     // 关键词搜索
	Type      string `json:"type" form:"type"`           // 角色类型
	Status    string `json:"status" form:"status"`       // 状态
	Page      int    `json:"page" form:"page"`           // 页码
	Size      int    `json:"size" form:"size"`           // 每页大小
	SortBy    string `json:"sortBy" form:"sortBy"`       // 排序字段
	SortOrder string `json:"sortOrder" form:"sortOrder"` // 排序方向
}
