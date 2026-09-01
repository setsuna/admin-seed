package converter

import (
	"encoding/json"
	"admin-seed/internal/dto/request"
	"admin-seed/internal/dto/response"
	"admin-seed/internal/model"
)

// PolicyConverter 策略配置转换器
type PolicyConverter struct{}

// NewPolicyConverter 创建策略配置转换器
func NewPolicyConverter() *PolicyConverter {
	return &PolicyConverter{}
}

// ModelToResponse 将 Model 转换为 Response
func (c *PolicyConverter) ModelToResponse(policy *model.SecurityPolicy) *response.PolicyResponse {
	if policy == nil {
		return nil
	}

	// 解析 JSON 字段
	var allowedFileTypes []string
	if policy.AllowedFileTypes != "" {
		json.Unmarshal([]byte(policy.AllowedFileTypes), &allowedFileTypes)
	}

	var ipWhitelist []string
	if policy.IPWhitelist != "" {
		json.Unmarshal([]byte(policy.IPWhitelist), &ipWhitelist)
	}

	return &response.PolicyResponse{
		ID:        policy.ID,
		CreatedAt: policy.CreatedAt.Unix(),
		UpdatedAt: policy.UpdatedAt.Unix(),

		SystemSecurityLevel:    policy.SystemSecurityLevel,
		AllowSecurityDowngrade: policy.AllowSecurityDowngrade,

		ServerFileRetentionDays:   policy.ServerFileRetentionDays,
		ClientFileExpirationHours: policy.ClientFileExpirationHours,
		FileUploadMaxSize:         policy.FileUploadMaxSize,
		AllowedFileTypes:          allowedFileTypes,
		FileEncryptionEnabled:     policy.FileEncryptionEnabled,

		PasswordPolicy: response.PasswordPolicyResponse{
			MinLength:              policy.PasswordMinLength,
			ChangeIntervalDays:     policy.PasswordChangeIntervalDays,
			MaxFailAttempts:        policy.PasswordMaxFailAttempts,
			LockoutDurationMinutes: policy.PasswordLockoutDuration,
			RequireUppercase:       policy.PasswordRequireUppercase,
			RequireLowercase:       policy.PasswordRequireLowercase,
			RequireNumbers:         policy.PasswordRequireNumbers,
			RequireSpecialChars:    policy.PasswordRequireSpecialChars,
			PreventReuse:           policy.PasswordPreventReuse,
		},

		SessionTimeoutMinutes:   policy.SessionTimeoutMinutes,
		IdleLockTimeoutMinutes:  policy.IdleLockTimeoutMinutes,
		MaxConcurrentSessions:   policy.MaxConcurrentSessions,
		RememberPasswordEnabled: policy.RememberPasswordEnabled,
		SingleSignOnEnabled:     policy.SingleSignOnEnabled,

		AllowedLoginHours: response.TimeRangeResponse{
			Enabled: policy.AllowedLoginHoursEnabled,
			Start:   policy.AllowedLoginHoursStart,
			End:     policy.AllowedLoginHoursEnd,
		},
		IPWhitelistEnabled:    policy.IPWhitelistEnabled,
		IPWhitelist:           ipWhitelist,
		DeviceBindingEnabled:  policy.DeviceBindingEnabled,
		GeoLocationRestricted: policy.GeoLocationRestricted,

		AuditLogRetentionDays:     policy.AuditLogRetentionDays,
		SensitiveOperationLogging: policy.SensitiveOperationLogging,
		AuditLogExportEnabled:     policy.AuditLogExportEnabled,
		AuditLogMaxCount:          policy.AuditLogMaxCount,
		AuditLogAlertThreshold:    policy.AuditLogAlertThreshold,

		MaintenanceWindow: response.TimeRangeResponse{
			Enabled: policy.MaintenanceWindowEnabled,
			Start:   policy.MaintenanceWindowStart,
			End:     policy.MaintenanceWindowEnd,
		},
		AutoBackupEnabled:   policy.AutoBackupEnabled,
		BackupRetentionDays: policy.BackupRetentionDays,
	}
}

// RequestToModel 将 Request 转换为 Model
func (c *PolicyConverter) RequestToModel(req *request.UpdatePolicyRequest, existing *model.SecurityPolicy) *model.SecurityPolicy {
	// 序列化 JSON 字段
	allowedFileTypesJSON, _ := json.Marshal(req.AllowedFileTypes)
	ipWhitelistJSON, _ := json.Marshal(req.IPWhitelist)

	policy := &model.SecurityPolicy{
		SystemSecurityLevel:    req.SystemSecurityLevel,
		AllowSecurityDowngrade: req.AllowSecurityDowngrade,

		ServerFileRetentionDays:   req.ServerFileRetentionDays,
		ClientFileExpirationHours: req.ClientFileExpirationHours,
		FileUploadMaxSize:         req.FileUploadMaxSize,
		AllowedFileTypes:          string(allowedFileTypesJSON),
		FileEncryptionEnabled:     req.FileEncryptionEnabled,

		PasswordMinLength:           req.PasswordPolicy.MinLength,
		PasswordChangeIntervalDays:  req.PasswordPolicy.ChangeIntervalDays,
		PasswordMaxFailAttempts:     req.PasswordPolicy.MaxFailAttempts,
		PasswordLockoutDuration:     req.PasswordPolicy.LockoutDurationMinutes,
		PasswordRequireUppercase:    req.PasswordPolicy.RequireUppercase,
		PasswordRequireLowercase:    req.PasswordPolicy.RequireLowercase,
		PasswordRequireNumbers:      req.PasswordPolicy.RequireNumbers,
		PasswordRequireSpecialChars: req.PasswordPolicy.RequireSpecialChars,
		PasswordPreventReuse:        req.PasswordPolicy.PreventReuse,

		SessionTimeoutMinutes:   req.SessionTimeoutMinutes,
		IdleLockTimeoutMinutes:  req.IdleLockTimeoutMinutes,
		MaxConcurrentSessions:   req.MaxConcurrentSessions,
		RememberPasswordEnabled: req.RememberPasswordEnabled,
		SingleSignOnEnabled:     req.SingleSignOnEnabled,

		AllowedLoginHoursEnabled: req.AllowedLoginHours.Enabled,
		AllowedLoginHoursStart:   req.AllowedLoginHours.Start,
		AllowedLoginHoursEnd:     req.AllowedLoginHours.End,
		IPWhitelistEnabled:       req.IPWhitelistEnabled,
		IPWhitelist:              string(ipWhitelistJSON),
		DeviceBindingEnabled:     req.DeviceBindingEnabled,
		GeoLocationRestricted:    req.GeoLocationRestricted,

		AuditLogRetentionDays:     req.AuditLogRetentionDays,
		SensitiveOperationLogging: req.SensitiveOperationLogging,
		AuditLogExportEnabled:     req.AuditLogExportEnabled,
		AuditLogMaxCount:          req.AuditLogMaxCount,
		AuditLogAlertThreshold:    req.AuditLogAlertThreshold,

		MaintenanceWindowEnabled: req.MaintenanceWindow.Enabled,
		MaintenanceWindowStart:   req.MaintenanceWindow.Start,
		MaintenanceWindowEnd:     req.MaintenanceWindow.End,
		AutoBackupEnabled:        req.AutoBackupEnabled,
		BackupRetentionDays:      req.BackupRetentionDays,
	}

	if existing != nil {
		policy.ID = existing.ID
		policy.CreatedAt = existing.CreatedAt
	}

	return policy
}
