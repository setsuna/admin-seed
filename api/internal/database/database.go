package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"admin-seed/internal/config"

	_ "github.com/go-sql-driver/mysql" // MySQL driver
	_ "github.com/mattn/go-sqlite3"    // SQLite driver
)

// Manager 数据库管理器：负责连接、连接池配置、初始化编排与关闭。
type Manager struct {
	db  *sql.DB
	cfg *config.DatabaseConfig
}

// NewManager 创建数据库管理器。
func NewManager(cfg *config.DatabaseConfig) *Manager {
	return &Manager{cfg: cfg}
}

// Connect 连接数据库并配置连接池。
func (m *Manager) Connect() error {
	db, err := sql.Open(m.cfg.Driver, m.cfg.DSN)
	if err != nil {
		return fmt.Errorf("连接数据库失败: %w", err)
	}

	db.SetMaxOpenConns(m.cfg.MaxOpenConns)
	db.SetMaxIdleConns(m.cfg.MaxIdleConns)
	// 原实现遗漏了连接最大存活时间，这里补上（cfg.MaxLifetime 单位为分钟）。
	if m.cfg.MaxLifetime > 0 {
		db.SetConnMaxLifetime(time.Duration(m.cfg.MaxLifetime) * time.Minute)
	}

	if err := db.Ping(); err != nil {
		return fmt.Errorf("数据库ping失败: %w", err)
	}

	m.db = db
	return nil
}

// GetDB 返回底层 *sql.DB。
func (m *Manager) GetDB() *sql.DB {
	return m.db
}

// Close 关闭数据库连接。
func (m *Manager) Close() error {
	if m.db != nil {
		return m.db.Close()
	}
	return nil
}

// BeginTx 开启事务（便于上层统一从 Manager 获取事务）。
func (m *Manager) BeginTx(ctx context.Context, opts *sql.TxOptions) (*sql.Tx, error) {
	return m.db.BeginTx(ctx, opts)
}
