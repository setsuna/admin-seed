package response

// UserResponse 用户响应结构（不包含密码）
type UserResponse struct {
	ID             string   `json:"id"`
	Username       string   `json:"username"`
	Email          string   `json:"email"`
	Role           string   `json:"role"`
	Avatar         string   `json:"avatar"`
	Department     string   `json:"department"`
	DepartmentName string   `json:"department_name"`
	Position       string   `json:"position"`
	Phone          string   `json:"phone"`
	Status         string   `json:"status"`
	SecurityLevel  string   `json:"security_level"`
	AllowedIPs     []string `json:"allowed_ips"`   // IP白名单
	UkeyID         string   `json:"ukey_id"`       // Ukey ID
	Name           string   `json:"name"`          // 姓名
	LastLoginIP    string   `json:"last_login_ip"` // 最后登录IP
	IsHide         bool     `json:"is_hide"`       // 隐藏标记
	IsDeleted      bool     `json:"is_deleted"`    // 删除标记
	CreatedAt      string   `json:"created_at"`
	UpdatedAt      string   `json:"updated_at"`
	LastLoginAt    *string  `json:"last_login_at"`
	Permissions    []string `json:"permissions"`
}

// ImportFailureItem 导入失败单条
type ImportFailureItem struct {
	Index    int    `json:"index"`    // 行号（从1开始）
	Username string `json:"username"` // 用户名
	Reason   string `json:"reason"`   // 失败原因
}

// BatchImportUsersResponse 批量导入用户响应
type BatchImportUsersResponse struct {
	SuccessCount int                 `json:"success_count"` // 成功数量
	FailCount    int                 `json:"fail_count"`    // 失败数量
	Failures     []ImportFailureItem `json:"failures"`      // 失败明细
}

// DepartmentStatsResponse 部门统计响应
type DepartmentStatsResponse struct {
	Total        int `json:"total"`        // 部门总数
	Active       int `json:"active"`       // 启用的部门数
	Inactive     int `json:"inactive"`     // 禁用的部门数
	TopLevel     int `json:"topLevel"`     // 顶级部门数
	AvgEmployees int `json:"avgEmployees"` // 平均员工数
}

// DepartmentTreeResponse 部门树形响应结构
type DepartmentTreeResponse struct {
	ID            string                   `json:"id"`
	Name          string                   `json:"name"`
	Code          string                   `json:"code"`
	Description   *string                  `json:"description"`
	ParentID      *string                  `json:"parent_id"`
	ManagerName   string                   `json:"manager_name"`
	Level         int                      `json:"level"`
	Sort          int                      `json:"sort"`
	Status        string                   `json:"status"`
	Phone         *string                  `json:"phone"`
	Email         *string                  `json:"email"`
	Address       *string                  `json:"address"`
	EmployeeCount int                      `json:"employee_count"`
	CreatedAt     string                   `json:"created_at"`
	UpdatedAt     string                   `json:"updated_at"`
	Children      []DepartmentTreeResponse `json:"children,omitempty"`
}
