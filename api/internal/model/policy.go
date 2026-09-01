package model

import "time"

// SecurityPolicy 系统安全策略配置
type SecurityPolicy struct {
	ID        string    `db:"id"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`

	// 系统安全策略
	SystemSecurityLevel    string `db:"system_security_level"`    // confidential, secret
	AllowSecurityDowngrade bool   `db:"allow_security_downgrade"` // 是否允许密级降级

	// 文件管理策略
	ServerFileRetentionDays   int    `db:"server_file_retention_days"`   // 服务器文件存储周期(天)
	ClientFileExpirationHours int    `db:"client_file_expiration_hours"` // 客户端文件过期时间(小时)
	FileUploadMaxSize         int    `db:"file_upload_max_size"`         // 文件上传大小限制(MB)
	AllowedFileTypes          string `db:"allowed_file_types"`           // 允许的文件类型(JSON数组)
	FileEncryptionEnabled     bool   `db:"file_encryption_enabled"`      // 启用文件加密存储

	// 口令策略
	PasswordMinLength           int  `db:"password_min_length"`            // 最小长度
	PasswordChangeIntervalDays  int  `db:"password_change_interval_days"`  // 更换周期(天)
	PasswordMaxFailAttempts     int  `db:"password_max_fail_attempts"`     // 最大错误次数
	PasswordLockoutDuration     int  `db:"password_lockout_duration"`      // 锁定时长(分钟)
	PasswordRequireUppercase    bool `db:"password_require_uppercase"`     // 包含大写字母
	PasswordRequireLowercase    bool `db:"password_require_lowercase"`     // 包含小写字母
	PasswordRequireNumbers      bool `db:"password_require_numbers"`       // 包含数字
	PasswordRequireSpecialChars bool `db:"password_require_special_chars"` // 包含特殊字符
	PasswordPreventReuse        int  `db:"password_prevent_reuse"`         // 防止重用历史密码数量

	// 会话管理策略
	SessionTimeoutMinutes   int  `db:"session_timeout_minutes"`   // 会话超时时间(分钟)
	IdleLockTimeoutMinutes  int  `db:"idle_lock_timeout_minutes"` // 空闲锁定时间(分钟)
	MaxConcurrentSessions   int  `db:"max_concurrent_sessions"`   // 最大并发会话数
	RememberPasswordEnabled bool `db:"remember_password_enabled"` // 允许记住密码
	SingleSignOnEnabled     bool `db:"single_sign_on_enabled"`    // 启用单点登录

	// 访问控制策略
	AllowedLoginHoursEnabled bool   `db:"allowed_login_hours_enabled"` // 限制登录时间段
	AllowedLoginHoursStart   string `db:"allowed_login_hours_start"`   // 开始时间 HH:MM
	AllowedLoginHoursEnd     string `db:"allowed_login_hours_end"`     // 结束时间 HH:MM
	IPWhitelistEnabled       bool   `db:"ip_whitelist_enabled"`        // 启用IP白名单
	IPWhitelist              string `db:"ip_whitelist"`                // IP白名单(JSON数组)
	DeviceBindingEnabled     bool   `db:"device_binding_enabled"`      // 启用设备绑定
	GeoLocationRestricted    bool   `db:"geo_location_restricted"`     // 启用地理位置限制

	// 审计策略
	AuditLogRetentionDays     int    `db:"audit_log_retention_days"`    // 审计日志保留时间(天)
	SensitiveOperationLogging string `db:"sensitive_operation_logging"` // minimal, standard, detailed
	AuditLogExportEnabled     bool   `db:"audit_log_export_enabled"`    // 允许审计日志导出
	AuditLogMaxCount          int    `db:"audit_log_max_count"`         // 日志总量上限
	AuditLogAlertThreshold    int    `db:"audit_log_alert_threshold"`   // 告警阈值(剩余条数)

	// 系统维护策略
	MaintenanceWindowEnabled bool   `db:"maintenance_window_enabled"` // 设置维护时间窗口
	MaintenanceWindowStart   string `db:"maintenance_window_start"`   // 开始时间 HH:MM
	MaintenanceWindowEnd     string `db:"maintenance_window_end"`     // 结束时间 HH:MM
	AutoBackupEnabled        bool   `db:"auto_backup_enabled"`        // 启用自动备份
	BackupRetentionDays      int    `db:"backup_retention_days"`      // 备份保留时间(天)
}

// TableName 表名
func (SecurityPolicy) TableName() string {
	return "security_policies"
}
