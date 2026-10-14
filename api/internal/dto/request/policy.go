package request

// UpdatePolicyRequest 更新策略配置请求
type UpdatePolicyRequest struct {
	// 系统安全策略
	SystemSecurityLevel    string `json:"systemSecurityLevel" binding:"required,oneof=confidential secret"`
	AllowSecurityDowngrade bool   `json:"allowSecurityDowngrade"`

	// 文件管理策略
	ServerFileRetentionDays   int      `json:"serverFileRetentionDays" binding:"min=0,max=3650"`
	ClientFileExpirationHours int      `json:"clientFileExpirationHours" binding:"required,min=1,max=168"`
	FileUploadMaxSize         int      `json:"fileUploadMaxSize" binding:"required,min=1,max=1024"`
	AllowedFileTypes          []string `json:"allowedFileTypes" binding:"required,min=1"`
	FileEncryptionEnabled     bool     `json:"fileEncryptionEnabled"`

	// 口令策略
	PasswordPolicy PasswordPolicyRequest `json:"passwordPolicy" binding:"required"`

	// 会话管理策略
	SessionTimeoutMinutes   int  `json:"sessionTimeoutMinutes" binding:"required,min=5,max=1440"`
	IdleLockTimeoutMinutes  int  `json:"idleLockTimeoutMinutes" binding:"min=0,max=120"`
	MaxConcurrentSessions   int  `json:"maxConcurrentSessions" binding:"required,min=1,max=10"`
	RememberPasswordEnabled bool `json:"rememberPasswordEnabled"`
	SingleSignOnEnabled     bool `json:"singleSignOnEnabled"`

	// 访问控制策略
	AllowedLoginHours     TimeRangeRequest `json:"allowedLoginHours" binding:"required"`
	IPWhitelistEnabled    bool             `json:"ipWhitelistEnabled"`
	IPWhitelist           []string         `json:"ipWhitelist"`
	DeviceBindingEnabled  bool             `json:"deviceBindingEnabled"`
	GeoLocationRestricted bool             `json:"geoLocationRestricted"`

	// 审计策略
	AuditLogRetentionDays     int    `json:"auditLogRetentionDays" binding:"required,min=90,max=2555"`
	SensitiveOperationLogging string `json:"sensitiveOperationLogging" binding:"required,oneof=minimal standard detailed"`
	AuditLogExportEnabled     bool   `json:"auditLogExportEnabled"`
	AuditLogMaxCount          int    `json:"auditLogMaxCount" binding:"required,min=10000,max=1000000"`
	AuditLogAlertThreshold    int    `json:"auditLogAlertThreshold" binding:"required,min=1000,max=100000"`

	// 系统维护策略
	MaintenanceWindow   TimeRangeRequest `json:"maintenanceWindow" binding:"required"`
	AutoBackupEnabled   bool             `json:"autoBackupEnabled"`
	BackupRetentionDays int              `json:"backupRetentionDays" binding:"required,min=7,max=365"`
}

// PasswordPolicyRequest 口令策略
type PasswordPolicyRequest struct {
	MinLength              int  `json:"minLength" binding:"required,min=6,max=32"`
	ChangeIntervalDays     int  `json:"changeIntervalDays" binding:"min=0,max=365"` // 0 = 不过期（required 会把 0 当成没填而拒掉）
	MaxFailAttempts        int  `json:"maxFailAttempts" binding:"required,min=1,max=10"`
	LockoutDurationMinutes int  `json:"lockoutDurationMinutes" binding:"required,min=1,max=1440"`
	RequireUppercase       bool `json:"requireUppercase"`
	RequireLowercase       bool `json:"requireLowercase"`
	RequireNumbers         bool `json:"requireNumbers"`
	RequireSpecialChars    bool `json:"requireSpecialChars"`
	PreventReuse           int  `json:"preventReuse" binding:"min=0,max=10"`
}

// TimeRangeRequest 时间范围
type TimeRangeRequest struct {
	Enabled bool   `json:"enabled"`
	Start   string `json:"start" binding:"required_if=Enabled true"`
	End     string `json:"end" binding:"required_if=Enabled true"`
}

// PurgeAuditLogsRequest 覆盖审计日志请求
type PurgeAuditLogsRequest struct {
	Months int `json:"months" binding:"required,oneof=6 9 12"` // 覆盖N个月前的日志
}
