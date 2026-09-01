package seed

import (
	"database/sql"
	_ "embed"
	"fmt"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// staticSeedSQLite 内嵌静态种子数据（角色、字典、菜单、权限、图标）。
// 全部使用 INSERT OR IGNORE，可重复执行。
//
//go:embed seed_sqlite.sql
var staticSeedSQLite string

// defaultAdminPassword 默认账号初始密码。
// 注意：此处沿用原有硬编码密码，安全加固（首登强制改密 / 环境变量注入）留待后续处理。
const defaultAdminPassword = "1234QWer"

// Apply 执行全部种子数据初始化：先静态 SQL，再动态数据。
// driver 目前仅支持 sqlite；mysql 需要另行提供 seed_mysql.sql 与对应分支。
func Apply(db *sql.DB, driver string) error {
	switch driver {
	case "sqlite", "sqlite3":
	default:
		return fmt.Errorf("种子数据暂只支持 sqlite 驱动，收到: %s", driver)
	}

	// 1. 静态种子（角色 / 字典 / 菜单 / 权限）
	if _, err := db.Exec(staticSeedSQLite); err != nil {
		return fmt.Errorf("执行静态种子数据失败: %w", err)
	}

	// 2. 动态种子（需运行时计算，无法用纯 SQL 表达）
	if err := seedDefaultAdmins(db); err != nil {
		return fmt.Errorf("初始化默认账号失败: %w", err)
	}
	if err := seedDefaultDepartment(db); err != nil {
		return fmt.Errorf("初始化默认部门失败: %w", err)
	}
	if err := seedDefaultSecurityPolicy(db); err != nil {
		return fmt.Errorf("初始化默认安全策略失败: %w", err)
	}

	return nil
}

// seedDefaultAdmins 创建默认账号（密码经 bcrypt 哈希，故无法放入静态 SQL）。
func seedDefaultAdmins(db *sql.DB) error {
	var count int
	err := db.QueryRow(
		"SELECT COUNT(*) FROM users WHERE role IN ('admin', 'security_admin', 'system_admin', 'audit_admin')",
	).Scan(&count)
	if err != nil {
		return fmt.Errorf("检查管理员账户失败: %w", err)
	}
	if count > 0 {
		return nil
	}

	type adminConfig struct {
		Username    string
		Name        string
		Role        string
		Permissions string
	}

	defaultAdmins := []adminConfig{
		{
			Username:    "admin",
			Name:        "管理员",
			Role:        "admin",
			Permissions: `["dashboard:view","meeting:read","meeting:write","meeting:delete","meeting:manage","sync:read","sync:manage","personnel:read","personnel:write","personnel:delete","personnel:manage","role:read","role:write","role:delete","role:manage","security:read","security:manage","org:read","org:manage","staff:read","staff:manage","user:read","user:write","user:delete","user:manage","system:dict:read","system:dict:manage","system:config:read","system:config:manage","system:logs:read","logs:admin:read","logs:audit:read","monitor:alerts:read","monitor:alerts:manage","device:read","device:manage"]`,
		},
		{
			Username:    "secadm",
			Name:        "安全管理员",
			Role:        "security_admin",
			Permissions: `["dashboard:view","security:read","security:manage","user:read","user:write","user:delete","user:manage","personnel:read","personnel:write","personnel:manage","logs:admin:read"]`,
		},
		{
			Username:    "sysadm",
			Name:        "系统管理员",
			Role:        "system_admin",
			Permissions: `["dashboard:view","org:read","org:manage","personnel:read","personnel:manage","device:read","device:manage","system:nameplate:manage"]`,
		},
		{
			Username:    "auditadm",
			Name:        "审计员",
			Role:        "audit_admin",
			Permissions: `["dashboard:view","logs:audit:read"]`,
		},
		{
			Username:    "user",
			Name:        "普通用户",
			Role:        "user",
			Permissions: `["dashboard:view","meeting:read","meeting:write","meeting:delete","meeting:manage","sync:read","sync:manage","device:clear"]`,
		},
	}

	for _, admin := range defaultAdmins {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(defaultAdminPassword), bcrypt.DefaultCost)
		if err != nil {
			return fmt.Errorf("密码哈希失败: %w", err)
		}

		adminID := uuid.New().String()
		now := time.Now()

		query := `
			INSERT INTO users (id, username, name, password, email, role, status, security_level, permissions, created_at, updated_at, password_changed_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`
		_, err = db.Exec(query, adminID, admin.Username, admin.Name, string(hashedPassword),
			admin.Username+"@example.com", admin.Role, "active", "secret", admin.Permissions, now, now, now)
		if err != nil {
			return fmt.Errorf("创建账户 %s 失败: %w", admin.Username, err)
		}
	}

	return nil
}

// seedDefaultDepartment 创建默认根部门。
func seedDefaultDepartment(db *sql.DB) error {
	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM departments").Scan(&count); err != nil {
		return fmt.Errorf("检查部门失败: %w", err)
	}
	if count > 0 {
		return nil
	}

	deptID := uuid.New().String()
	now := time.Now()
	query := `
		INSERT INTO departments (id, name, code, description, status, sort, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`
	if _, err := db.Exec(query, deptID, "总办", "ROOT", "总办", "enabled", 1, now, now); err != nil {
		return fmt.Errorf("创建默认部门失败: %w", err)
	}
	return nil
}

// seedDefaultSecurityPolicy 创建默认安全策略（单行）。
func seedDefaultSecurityPolicy(db *sql.DB) error {
	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM security_policies").Scan(&count); err != nil {
		return fmt.Errorf("检查安全策略失败: %w", err)
	}
	if count > 0 {
		return nil
	}

	policyID := "default-policy-001"
	now := time.Now()
	query := `
		INSERT INTO security_policies (
			id, created_at, updated_at,
			system_security_level, allow_security_downgrade,
			server_file_retention_days, client_file_expiration_hours,
			file_upload_max_size, allowed_file_types, file_encryption_enabled,
			password_min_length, password_change_interval_days,
			password_max_fail_attempts, password_lockout_duration,
			password_require_uppercase, password_require_lowercase,
			password_require_numbers, password_require_special_chars,
			password_prevent_reuse,
			session_timeout_minutes, idle_lock_timeout_minutes,
			max_concurrent_sessions, remember_password_enabled,
			single_sign_on_enabled,
			allowed_login_hours_enabled, allowed_login_hours_start,
			allowed_login_hours_end, ip_whitelist_enabled,
			ip_whitelist, device_binding_enabled, geo_location_restricted,
			audit_log_retention_days, sensitive_operation_logging,
			audit_log_export_enabled, audit_log_max_count, audit_log_alert_threshold,
			maintenance_window_enabled, maintenance_window_start,
			maintenance_window_end, auto_backup_enabled, backup_retention_days
		) VALUES (
			?, ?, ?,
			?, ?,
			?, ?,
			?, ?, ?,
			?, ?,
			?, ?,
			?, ?,
			?, ?,
			?,
			?, ?,
			?, ?,
			?,
			?, ?,
			?, ?,
			?, ?, ?,
			?, ?,
			?, ?, ?,
			?, ?,
			?, ?, ?
		)
	`
	_, err := db.Exec(query,
		policyID, now, now,
		"confidential", 0,
		90, 24,
		100, `["pdf","doc","docx","xls","xlsx","ppt","pptx","txt","png","mp4","et","wps","ofd","dps"]`, 1,
		8, 30,
		5, 30,
		1, 1,
		1, 0,
		5,
		480, 30,
		3, 0,
		0,
		0, "08:00",
		"18:00", 0,
		"[]", 0, 0,
		365, "standard",
		1, 300000, 13000,
		0, "02:00",
		"04:00", 1, 30,
	)
	if err != nil {
		return fmt.Errorf("创建默认安全策略失败: %w", err)
	}
	return nil
}
