package repository

import (
	"admin-seed/internal/db"
	"admin-seed/internal/model"
	"context"
	"database/sql"
)

// PolicyRepositoryInterface 策略配置Repository接口
type PolicyRepositoryInterface interface {
	Get(ctx context.Context) (*model.SecurityPolicy, error)
	Update(ctx context.Context, policy *model.SecurityPolicy) error
	GetDefault(ctx context.Context) (*model.SecurityPolicy, error)
}

// policyRepository 策略配置Repository实现
type policyRepository struct {
	*baseRepository[model.SecurityPolicy]
}

// NewPolicyRepository 创建策略配置Repository
func NewPolicyRepository(database *sql.DB) PolicyRepositoryInterface {
	base := newBaseRepository[model.SecurityPolicy](database, "security_policies")
	return &policyRepository{
		baseRepository: base,
	}
}

// newPolicyRepositoryWithTx 创建带事务的策略配置Repository
func newPolicyRepositoryWithTx(tx *sql.Tx) PolicyRepositoryInterface {
	txWrapper := &transactionWrapper{tx: tx}
	base := newBaseRepository[model.SecurityPolicy](txWrapper, "security_policies")
	return &policyRepository{
		baseRepository: base,
	}
}

// Get 获取当前策略配置（只有一条记录）
func (r *policyRepository) Get(ctx context.Context) (*model.SecurityPolicy, error) {
	query := r.Query().
		SelectAll().
		OrderByDesc("updated_at").
		Limit(1)

	sqlStr, args, err := query.ToSQL()
	if err != nil {
		return nil, NewDatabaseError("Get", "SecurityPolicy", err)
	}

	row := r.getQuerier().QueryRowContext(ctx, sqlStr, args...)

	policy := &model.SecurityPolicy{}
	err = row.Scan(
		&policy.ID,
		&policy.CreatedAt,
		&policy.UpdatedAt,
		&policy.SystemSecurityLevel,
		&policy.AllowSecurityDowngrade,
		&policy.ServerFileRetentionDays,
		&policy.ClientFileExpirationHours,
		&policy.FileUploadMaxSize,
		&policy.AllowedFileTypes,
		&policy.FileEncryptionEnabled,
		&policy.PasswordMinLength,
		&policy.PasswordChangeIntervalDays,
		&policy.PasswordMaxFailAttempts,
		&policy.PasswordLockoutDuration,
		&policy.PasswordRequireUppercase,
		&policy.PasswordRequireLowercase,
		&policy.PasswordRequireNumbers,
		&policy.PasswordRequireSpecialChars,
		&policy.PasswordPreventReuse,
		&policy.SessionTimeoutMinutes,
		&policy.IdleLockTimeoutMinutes,
		&policy.MaxConcurrentSessions,
		&policy.RememberPasswordEnabled,
		&policy.SingleSignOnEnabled,
		&policy.AllowedLoginHoursEnabled,
		&policy.AllowedLoginHoursStart,
		&policy.AllowedLoginHoursEnd,
		&policy.IPWhitelistEnabled,
		&policy.IPWhitelist,
		&policy.DeviceBindingEnabled,
		&policy.GeoLocationRestricted,
		&policy.AuditLogRetentionDays,
		&policy.SensitiveOperationLogging,
		&policy.AuditLogExportEnabled,
		&policy.AuditLogMaxCount,
		&policy.AuditLogAlertThreshold,
		&policy.MaintenanceWindowEnabled,
		&policy.MaintenanceWindowStart,
		&policy.MaintenanceWindowEnd,
		&policy.AutoBackupEnabled,
		&policy.BackupRetentionDays,
	)

	if err == sql.ErrNoRows {
		return nil, NewNotFoundError("SecurityPolicy", "current")
	}

	if err != nil {
		return nil, NewDatabaseError("Get", "SecurityPolicy", err)
	}

	return policy, nil
}

// Update 更新策略配置
func (r *policyRepository) Update(ctx context.Context, policy *model.SecurityPolicy) error {
	builder := db.Update(r.tableName).
		Set("system_security_level", policy.SystemSecurityLevel).
		Set("allow_security_downgrade", policy.AllowSecurityDowngrade).
		Set("server_file_retention_days", policy.ServerFileRetentionDays).
		Set("client_file_expiration_hours", policy.ClientFileExpirationHours).
		Set("file_upload_max_size", policy.FileUploadMaxSize).
		Set("allowed_file_types", policy.AllowedFileTypes).
		Set("file_encryption_enabled", policy.FileEncryptionEnabled).
		Set("password_min_length", policy.PasswordMinLength).
		Set("password_change_interval_days", policy.PasswordChangeIntervalDays).
		Set("password_max_fail_attempts", policy.PasswordMaxFailAttempts).
		Set("password_lockout_duration", policy.PasswordLockoutDuration).
		Set("password_require_uppercase", policy.PasswordRequireUppercase).
		Set("password_require_lowercase", policy.PasswordRequireLowercase).
		Set("password_require_numbers", policy.PasswordRequireNumbers).
		Set("password_require_special_chars", policy.PasswordRequireSpecialChars).
		Set("password_prevent_reuse", policy.PasswordPreventReuse).
		Set("session_timeout_minutes", policy.SessionTimeoutMinutes).
		Set("idle_lock_timeout_minutes", policy.IdleLockTimeoutMinutes).
		Set("max_concurrent_sessions", policy.MaxConcurrentSessions).
		Set("remember_password_enabled", policy.RememberPasswordEnabled).
		Set("single_sign_on_enabled", policy.SingleSignOnEnabled).
		Set("allowed_login_hours_enabled", policy.AllowedLoginHoursEnabled).
		Set("allowed_login_hours_start", policy.AllowedLoginHoursStart).
		Set("allowed_login_hours_end", policy.AllowedLoginHoursEnd).
		Set("ip_whitelist_enabled", policy.IPWhitelistEnabled).
		Set("ip_whitelist", policy.IPWhitelist).
		Set("device_binding_enabled", policy.DeviceBindingEnabled).
		Set("geo_location_restricted", policy.GeoLocationRestricted).
		Set("audit_log_retention_days", policy.AuditLogRetentionDays).
		Set("sensitive_operation_logging", policy.SensitiveOperationLogging).
		Set("audit_log_export_enabled", policy.AuditLogExportEnabled).
		Set("audit_log_max_count", policy.AuditLogMaxCount).
		Set("audit_log_alert_threshold", policy.AuditLogAlertThreshold).
		Set("maintenance_window_enabled", policy.MaintenanceWindowEnabled).
		Set("maintenance_window_start", policy.MaintenanceWindowStart).
		Set("maintenance_window_end", policy.MaintenanceWindowEnd).
		Set("auto_backup_enabled", policy.AutoBackupEnabled).
		Set("backup_retention_days", policy.BackupRetentionDays).
		SetUpdatedAt().
		WhereEq("id", policy.ID)

	_, err := builder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return WrapError(err, "Update", "SecurityPolicy")
	}

	return nil
}

// GetDefault 获取默认策略配置
func (r *policyRepository) GetDefault(ctx context.Context) (*model.SecurityPolicy, error) {
	// 返回默认配置
	return &model.SecurityPolicy{
		SystemSecurityLevel:    "confidential",
		AllowSecurityDowngrade: false,

		ServerFileRetentionDays:   90,
		ClientFileExpirationHours: 24,
		FileUploadMaxSize:         100,
		AllowedFileTypes:          `["pdf","doc","docx","xls","xlsx","ppt","pptx","txt"]`,
		FileEncryptionEnabled:     true,

		PasswordMinLength:           8,
		PasswordChangeIntervalDays:  90,
		PasswordMaxFailAttempts:     5,
		PasswordLockoutDuration:     30,
		PasswordRequireUppercase:    true,
		PasswordRequireLowercase:    true,
		PasswordRequireNumbers:      true,
		PasswordRequireSpecialChars: false,
		PasswordPreventReuse:        5,

		SessionTimeoutMinutes:   480,
		IdleLockTimeoutMinutes:  30,
		MaxConcurrentSessions:   3,
		RememberPasswordEnabled: false,
		SingleSignOnEnabled:     false,

		AllowedLoginHoursEnabled: false,
		AllowedLoginHoursStart:   "08:00",
		AllowedLoginHoursEnd:     "18:00",
		IPWhitelistEnabled:       false,
		IPWhitelist:              "[]",
		DeviceBindingEnabled:     false,
		GeoLocationRestricted:    false,

		AuditLogRetentionDays:     365,
		SensitiveOperationLogging: "standard",
		AuditLogExportEnabled:     true,
		AuditLogMaxCount:          300000,
		AuditLogAlertThreshold:    13000,

		MaintenanceWindowEnabled: false,
		MaintenanceWindowStart:   "02:00",
		MaintenanceWindowEnd:     "04:00",
		AutoBackupEnabled:        true,
		BackupRetentionDays:      30,
	}, nil
}
