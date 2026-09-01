package response

// PolicyResponse 策略配置响应
type PolicyResponse struct {
	ID        string `json:"id"`
	CreatedAt int64  `json:"createdAt"`
	UpdatedAt int64  `json:"updatedAt"`

	// 系统安全策略
	SystemSecurityLevel    string `json:"systemSecurityLevel"`
	AllowSecurityDowngrade bool   `json:"allowSecurityDowngrade"`

	// 文件管理策略
	ServerFileRetentionDays   int      `json:"serverFileRetentionDays"`
	ClientFileExpirationHours int      `json:"clientFileExpirationHours"`
	FileUploadMaxSize         int      `json:"fileUploadMaxSize"`
	AllowedFileTypes          []string `json:"allowedFileTypes"`
	FileEncryptionEnabled     bool     `json:"fileEncryptionEnabled"`

	// 口令策略
	PasswordPolicy PasswordPolicyResponse `json:"passwordPolicy"`

	// 会话管理策略
	SessionTimeoutMinutes   int  `json:"sessionTimeoutMinutes"`
	IdleLockTimeoutMinutes  int  `json:"idleLockTimeoutMinutes"`
	MaxConcurrentSessions   int  `json:"maxConcurrentSessions"`
	RememberPasswordEnabled bool `json:"rememberPasswordEnabled"`
	SingleSignOnEnabled     bool `json:"singleSignOnEnabled"`

	// 访问控制策略
	AllowedLoginHours     TimeRangeResponse `json:"allowedLoginHours"`
	IPWhitelistEnabled    bool              `json:"ipWhitelistEnabled"`
	IPWhitelist           []string          `json:"ipWhitelist"`
	DeviceBindingEnabled  bool              `json:"deviceBindingEnabled"`
	GeoLocationRestricted bool              `json:"geoLocationRestricted"`

	// 审计策略
	AuditLogRetentionDays     int    `json:"auditLogRetentionDays"`
	SensitiveOperationLogging string `json:"sensitiveOperationLogging"`
	AuditLogExportEnabled     bool   `json:"auditLogExportEnabled"`
	AuditLogMaxCount          int    `json:"auditLogMaxCount"`
	AuditLogAlertThreshold    int    `json:"auditLogAlertThreshold"`

	// 系统维护策略
	MaintenanceWindow   TimeRangeResponse `json:"maintenanceWindow"`
	AutoBackupEnabled   bool              `json:"autoBackupEnabled"`
	BackupRetentionDays int               `json:"backupRetentionDays"`
}

// PasswordPolicyResponse 口令策略响应
type PasswordPolicyResponse struct {
	MinLength              int  `json:"minLength"`
	ChangeIntervalDays     int  `json:"changeIntervalDays"`
	MaxFailAttempts        int  `json:"maxFailAttempts"`
	LockoutDurationMinutes int  `json:"lockoutDurationMinutes"`
	RequireUppercase       bool `json:"requireUppercase"`
	RequireLowercase       bool `json:"requireLowercase"`
	RequireNumbers         bool `json:"requireNumbers"`
	RequireSpecialChars    bool `json:"requireSpecialChars"`
	PreventReuse           int  `json:"preventReuse"`
}

// TimeRangeResponse 时间范围响应
type TimeRangeResponse struct {
	Enabled bool   `json:"enabled"`
	Start   string `json:"start"`
	End     string `json:"end"`
}

// AlertItem 告警项
type AlertItem struct {
	Type     string `json:"type"`     // 告警类型
	Severity string `json:"severity"` // 级别: low/medium/high/critical
	Title    string `json:"title"`    // 告警标题
	Message  string `json:"message"`  // 告警详情
}

// AlertCheckResponse 告警检查响应
type AlertCheckResponse struct {
	HasAlert bool        `json:"hasAlert"` // 是否有告警
	Alerts   []AlertItem `json:"alerts"`   // 告警列表
}

// AuditLogStatsResponse 审计日志统计响应
type AuditLogStatsResponse struct {
	MaxCount       int     `json:"maxCount"`       // 总量上限
	UsedCount      int64   `json:"usedCount"`      // 已使用
	RemainingCount int64   `json:"remainingCount"` // 剩余条数
	UsagePercent   float64 `json:"usagePercent"`   // 使用比例
	AlertThreshold int     `json:"alertThreshold"` // 告警阈值
	IsAlert        bool    `json:"isAlert"`        // 当前是否告警
	RetentionDays  int     `json:"retentionDays"`  // 日志周期(天)
}

// PurgeAuditLogsResponse 覆盖日志响应
type PurgeAuditLogsResponse struct {
	DeletedCount int64 `json:"deletedCount"` // 删除的记录数
}
