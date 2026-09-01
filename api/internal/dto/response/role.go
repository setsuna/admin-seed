package response

import "time"

// RoleResponse 角色响应
type RoleResponse struct {
	// 基础字段
	ID        string    `json:"id"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	// 状态字段
	Status string `json:"status"`

	// 角色核心字段
	Name        string   `json:"name"`
	Code        string   `json:"code"`
	Description string   `json:"description,omitempty"`
	Permissions []string `json:"permissions"`

	// 角色分类
	Type      string `json:"type"`
	Level     int    `json:"level"`
	IsBuiltIn bool   `json:"isBuiltIn"`

	// 统计信息（可选）
	UserCount int `json:"userCount,omitempty"`

	// 元数据（可选）
	Metadata *RoleMetadataResponse `json:"metadata,omitempty"`
}

// RoleMetadataResponse 角色元数据响应
type RoleMetadataResponse struct {
	Color    string `json:"color,omitempty"`
	Icon     string `json:"icon,omitempty"`
	Category string `json:"category,omitempty"`
}

// RoleListResponse 角色列表响应
type RoleListResponse struct {
	Items      []*RoleResponse     `json:"items"`
	Pagination *RolePaginationInfo `json:"pagination"`
}

// RolePaginationInfo 分页信息
type RolePaginationInfo struct {
	Page       int   `json:"page"`
	Size       int   `json:"size"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"totalPages"`
}
