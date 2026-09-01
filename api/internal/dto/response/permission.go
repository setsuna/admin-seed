package response

// PermissionResponse 权限响应
type PermissionResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Code        string `json:"code"`
	Category    string `json:"category"`
	Resource    string `json:"resource"`
	Action      string `json:"action"`
	Description string `json:"description,omitempty"`
}

// PermissionGroupResponse 权限分组响应
type PermissionGroupResponse struct {
	Key         string               `json:"key"`
	Name        string               `json:"name"`
	Permissions []PermissionResponse `json:"permissions"`
}

// RolePermissionMatrixResponse 角色权限矩阵响应
type RolePermissionMatrixResponse struct {
	RoleID      string          `json:"roleId"`
	RoleName    string          `json:"roleName"`
	Permissions map[string]bool `json:"permissions"`
}
