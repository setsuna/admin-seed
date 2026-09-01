package request

// CreateUserRequest 创建用户请求
type CreateUserRequest struct {
	Username      string   `json:"username" validate:"required"`
	Password      string   `json:"password" validate:"required,min=6"`
	Email         string   `json:"email" validate:"required,email"`
	Role          string   `json:"role" validate:"required"`
	Department    string   `json:"department" validate:"required"`
	Position      string   `json:"position"`
	Phone         string   `json:"phone"`
	Status        string   `json:"status" validate:"required"`
	SecurityLevel string   `json:"security_level" validate:"required"`
	AllowedIPs    []string `json:"allowed_ips"`   // IP白名单
	UkeyID        string   `json:"ukey_id"`       // Ukey ID
	Name          string   `json:"name"`          // 姓名
	LastLoginIP   string   `json:"last_login_ip"` // 最后登录IP
	IsHide        bool     `json:"is_hide"`       // 隐藏标记
	IsDeleted     bool     `json:"is_deleted"`    // 删除标记
	Permissions   []string `json:"permissions"`
}

// UpdateUserRequest 更新用户请求
type UpdateUserRequest struct {
	Username      string   `json:"username"`
	Email         string   `json:"email" validate:"email"`
	Role          string   `json:"role"`
	Department    string   `json:"department"`
	Position      string   `json:"position"`
	Phone         string   `json:"phone"`
	Status        string   `json:"status"`
	SecurityLevel string   `json:"security_level"`
	AllowedIPs    []string `json:"allowed_ips"`   // IP白名单
	UkeyID        string   `json:"ukey_id"`       // Ukey ID
	Name          string   `json:"name"`          // 姓名
	LastLoginIP   string   `json:"last_login_ip"` // 最后登录IP
	IsHide        bool     `json:"is_hide"`       // 隐藏标记
	IsDeleted     bool     `json:"is_deleted"`    // 删除标记
	Permissions   []string `json:"permissions"`
}

// UserFilters 用户过滤条件
type UserFilters struct {
	Keyword       string `json:"keyword" form:"keyword"`
	Department    string `json:"department" form:"department"`
	Role          string `json:"role" form:"role"`
	Status        string `json:"status" form:"status"`
	SecurityLevel string `json:"security_level" form:"security_level"`
	Page          int    `json:"page" form:"page"`
	Size          int    `json:"size" form:"size"`
}

// CreateDepartmentRequest 创建部门请求
type CreateDepartmentRequest struct {
	Name        string  `json:"name" validate:"required"`
	Code        string  `json:"code"`
	Description string  `json:"description"`
	ParentID    *string `json:"parent_id"`
	ManagerID   string  `json:"manager_id"`
	Phone       string  `json:"phone"`
	Email       string  `json:"email"`
	Address     string  `json:"address"`
	Sort        int     `json:"sort"`
}

// UpdateDepartmentRequest 更新部门请求
type UpdateDepartmentRequest struct {
	Name        string  `json:"name"`
	Code        string  `json:"code"`
	Description string  `json:"description"`
	ParentID    *string `json:"parent_id"`
	ManagerID   string  `json:"manager_id"`
	Phone       string  `json:"phone"`
	Email       string  `json:"email"`
	Address     string  `json:"address"`
	Sort        int     `json:"sort"`
	Status      string  `json:"status"`
}

// ImportUserItem 导入用户单条数据
type ImportUserItem struct {
	Username      string `json:"username" validate:"required"`
	Name          string `json:"name"`
	Password      string `json:"password"`
	Role          string `json:"role"`
	Department    string `json:"department"`
	Position      string `json:"position"`
	Phone         string `json:"phone"`
	Email         string `json:"email"`
	SecurityLevel string `json:"security_level"`
}

// BatchImportUsersRequest 批量导入用户请求
type BatchImportUsersRequest struct {
	Users           []ImportUserItem `json:"users" validate:"required"`
	DefaultPassword string           `json:"default_password"` // 默认密码，单条未指定时使用
	Department      string           `json:"department"`       // 默认部门，单条未指定时使用
}

// DepartmentFilters 部门过滤条件
type DepartmentFilters struct {
	Keyword   string `json:"keyword" form:"keyword"`
	Status    string `json:"status" form:"status"`
	ManagerID string `json:"manager_id" form:"manager_id"`
	Page      int    `json:"page" form:"page"`
	Size      int    `json:"size" form:"size"`
}
