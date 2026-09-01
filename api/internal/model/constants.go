package model

// 角色常量（与 roles 表 code 字段一致）
const (
	RoleAdmin         = "admin"          // 超级管理员
	RoleUser          = "user"           // 普通用户
	RoleSystemAdmin   = "system_admin"   // 系统管理员（三员）
	RoleSecurityAdmin = "security_admin" // 安全管理员（三员）
	RoleAuditAdmin    = "audit_admin"    // 审计员（三员）
)

// 超级管理员用户名（不记录操作日志）
var SuperAdminUsernames = []string{
	"admin",
	"xunyidi",
	"administrator",
}

// SystemHiddenUsernames 系统内置账号（接口列表不返回给前端）
var SystemHiddenUsernames = []string{
	"auditadm",
	"sysadm",
	"secadm",
	"xunyidi",
}

// 三员角色列表
var ThreeAdminRoles = []string{
	RoleSystemAdmin,
	RoleSecurityAdmin,
	RoleAuditAdmin,
}

// 三员日志可见角色（审计员看不到自己）
var ThreeAdminLogVisibleRoles = []string{
	RoleSystemAdmin,
	RoleSecurityAdmin,
}

// IsSuperAdmin 判断是否为超级管理员
func IsSuperAdmin(username string) bool {
	for _, name := range SuperAdminUsernames {
		if username == name {
			return true
		}
	}
	return false
}

// IsThreeAdminRole 判断是否为三员角色
func IsThreeAdminRole(role string) bool {
	for _, r := range ThreeAdminRoles {
		if r == role {
			return true
		}
	}
	return false
}

// ShouldRecordInThreeAdminLog 判断是否应该记录到三员日志视图中
func ShouldRecordInThreeAdminLog(role string) bool {
	for _, r := range ThreeAdminLogVisibleRoles {
		if r == role {
			return true
		}
	}
	return false
}

// 操作模块常量
const (
	ModuleUser       = "USER"
	ModuleDepartment = "DEPARTMENT"
	ModuleMeeting    = "MEETING"
	ModuleDict       = "DICT"
	ModulePermission = "PERMISSION"
	ModuleSecurity   = "SECURITY"
	ModuleSystem     = "SYSTEM"
	ModuleAuth       = "AUTH"
	ModuleConfig     = "CONFIG"
	ModuleSync       = "SYNC"
	ModuleFile       = "FILE"
	ModulePackage    = "PACKAGE"
	ModuleDeviceLog  = "DEVICE_LOG"
	ModuleArchive    = "ARCHIVE"
	ModuleDevice     = "DEVICE"
	ModuleNameplate  = "NAMEPLATE"
	ModulePolicy     = "POLICY"
	ModuleVote       = "VOTE"
	ModuleRole       = "ROLE"
	ModuleMenu       = "MENU"
	ModuleLicense    = "LICENSE"
)

// 操作类别常量
const (
	ActionCreate  = "CREATE"
	ActionUpdate  = "UPDATE"
	ActionDelete  = "DELETE"
	ActionView    = "VIEW"
	ActionLogin   = "LOGIN"
	ActionLogout  = "LOGOUT"
	ActionExport  = "EXPORT"
	ActionImport  = "IMPORT"
	ActionConfig  = "CONFIG"
	ActionSync    = "SYNC"
	ActionArchive = "ARCHIVE"
)

// 操作结果常量
const (
	OperationSuccess = "success"
	OperationFailure = "failure"
)
