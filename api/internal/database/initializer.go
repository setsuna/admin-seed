package database

import (
	"fmt"

	"admin-seed/internal/database/migration"
	"admin-seed/internal/database/schema"
	"admin-seed/internal/database/seed"
)

// InitTables 初始化数据库：按 schema → migration → seed 三阶段顺序执行。
//
// 相比原实现的改进：
//   - 建表顺序显式化：schema 各文件按外键依赖排序（core → meeting → log →
//     archive → nameplate），不再依赖多段 SQL 字符串的书写位置。
//   - DDL 与种子数据彻底分离：schema 只建表，seed 只灌数据。
//   - migration 独立成阶段：对旧库加列等演进集中在一处。
//   - 删除了原 initBasicData 中“表不存在则 return nil”的死代码（建表在其之前
//     执行，该分支永不触发，且会掩盖真实错误）。
func (m *Manager) InitTables() error {
	if m.db == nil {
		return fmt.Errorf("数据库连接未初始化")
	}

	// 阶段 1：建表（DDL）
	if err := m.applySchema(); err != nil {
		return fmt.Errorf("建表失败: %w", err)
	}

	// 阶段 2：增量迁移（对既有表的结构演进，幂等）
	if err := migration.Apply(m.db, m.cfg.Driver); err != nil {
		return fmt.Errorf("数据库迁移失败: %w", err)
	}

	// 阶段 3：种子数据（静态 SQL + 动态数据）
	if err := seed.Apply(m.db, m.cfg.Driver); err != nil {
		return fmt.Errorf("初始化种子数据失败: %w", err)
	}

	return nil
}

// applySchema 按驱动选择 schema 语句并顺序执行。
func (m *Manager) applySchema() error {
	var (
		stmts []string
		err   error
	)

	switch m.cfg.Driver {
	case "sqlite", "sqlite3":
		stmts, err = schema.SQLiteStatements()
	case "mysql":
		stmts, err = schema.MySQLStatements()
	default:
		return fmt.Errorf("不支持的数据库驱动: %s", m.cfg.Driver)
	}
	if err != nil {
		return err
	}

	for i, stmt := range stmts {
		if _, execErr := m.db.Exec(stmt); execErr != nil {
			return fmt.Errorf("执行第 %d 段建表语句失败: %w", i+1, execErr)
		}
	}
	return nil
}

// MigrateDatabase 兼容旧调用入口：等价于 InitTables。
// 若上层曾单独调用 MigrateDatabase，可保留此别名；否则可在迁移完成后删除。
func (m *Manager) MigrateDatabase() error {
	return m.InitTables()
}
