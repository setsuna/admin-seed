package migration

import (
	"database/sql"
	"fmt"
)

// Apply 执行所有幂等增量迁移。
//
// 与 schema 的区别：schema 用 CREATE TABLE IF NOT EXISTS 建新表，对“已存在的旧表加列”
// 无能为力；migration 专门处理这类对既有表的结构演进。所有迁移都必须幂等
// （可重复执行不报错）。
//
// 新增迁移时，追加一个 migrateXxx(db) 并在此顺序调用。
func Apply(db *sql.DB, driver string) error {
	switch driver {
	case "sqlite", "sqlite3":
	default:
		// 目前迁移逻辑仅覆盖 sqlite；mysql 待 schema 补齐后另行处理。
		return nil
	}

	if err := migrateOperationLogOperatorName(db); err != nil {
		return fmt.Errorf("迁移 operation_logs.operator_name 失败: %w", err)
	}

	return nil
}

// migrateOperationLogOperatorName 为旧 operation_logs 补充 operator_name 列，并重建依赖它的视图。
// 新库由 schema 直接建出该列；旧库补列后需重建 view（视图定义是快照，不会自动含新列）。
func migrateOperationLogOperatorName(db *sql.DB) error {
	hasColumn, err := columnExists(db, "operation_logs", "operator_name")
	if err != nil {
		return err
	}
	if !hasColumn {
		if _, err := db.Exec("ALTER TABLE operation_logs ADD COLUMN operator_name TEXT NOT NULL DEFAULT ''"); err != nil {
			return fmt.Errorf("添加 operator_name 列失败: %w", err)
		}
	}

	// 重建两个视图（视图无法 ALTER，只能 DROP 后重建）。
	if _, err := db.Exec("DROP VIEW IF EXISTS view_application_logs"); err != nil {
		return fmt.Errorf("删除 view_application_logs 失败: %w", err)
	}
	if _, err := db.Exec("DROP VIEW IF EXISTS view_three_admin_logs"); err != nil {
		return fmt.Errorf("删除 view_three_admin_logs 失败: %w", err)
	}
	if _, err := db.Exec(`
		CREATE VIEW IF NOT EXISTS view_application_logs AS
		SELECT
			id, request_id, timestamp, operator, operator_id, operator_name, operator_role,
			ip_address, module, action_category, action_description,
			operation_result, before_data, after_data, change_details,
			created_at, updated_at
		FROM operation_logs
		ORDER BY timestamp DESC`); err != nil {
		return fmt.Errorf("重建 view_application_logs 失败: %w", err)
	}
	if _, err := db.Exec(`
		CREATE VIEW IF NOT EXISTS view_three_admin_logs AS
		SELECT
			id, request_id, timestamp, operator, operator_id, operator_name, operator_role,
			ip_address, module, action_category, action_description,
			operation_result, before_data, after_data, change_details,
			created_at, updated_at
		FROM operation_logs
		WHERE operator_role IN ('SYSTEM_ADMIN', 'SECURITY_ADMIN')
		ORDER BY timestamp DESC`); err != nil {
		return fmt.Errorf("重建 view_three_admin_logs 失败: %w", err)
	}

	return nil
}

// columnExists 通过 PRAGMA table_info 判断 SQLite 表是否已有指定列。
func columnExists(db *sql.DB, table, column string) (bool, error) {
	rows, err := db.Query(fmt.Sprintf("PRAGMA table_info(%s)", table))
	if err != nil {
		return false, fmt.Errorf("读取 %s 表结构失败: %w", table, err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			cid       int
			name      string
			ctype     string
			notnull   int
			dfltValue sql.NullString
			pk        int
		)
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dfltValue, &pk); err != nil {
			return false, fmt.Errorf("扫描 %s 表结构失败: %w", table, err)
		}
		if name == column {
			return true, nil
		}
	}
	if err := rows.Err(); err != nil {
		return false, fmt.Errorf("遍历 %s 表结构失败: %w", table, err)
	}
	return false, nil
}
