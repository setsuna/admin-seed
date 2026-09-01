package repository

import (
	"context"
	"database/sql"
	"fmt"
)

// repositoryManager Repository管理器实现
type repositoryManager struct {
	db           *sql.DB
	user         UserRepositoryInterface
	dict         DictRepositoryInterface
	dept         DepartmentRepositoryInterface
	role         RoleRepositoryInterface
	policy       PolicyRepositoryInterface
	operationLog OperationLogRepositoryInterface
}

// NewRepositoryManager 创建Repository管理器
func NewRepositoryManager(database *sql.DB) RepositoryManager {
	dbWrapper := &databaseWrapper{db: database}

	return &repositoryManager{
		db:           database,
		user:         NewUserRepository(dbWrapper),
		dict:         NewDictRepository(dbWrapper),
		dept:         NewDepartmentRepository(dbWrapper),
		role:         NewRoleRepository(database),
		policy:       NewPolicyRepository(database),
		operationLog: NewOperationLogRepository(dbWrapper),
	}
}

// User 获取用户Repository
func (m *repositoryManager) User() UserRepositoryInterface {
	return m.user
}

// Dict 获取字典Repository
func (m *repositoryManager) Dict() DictRepositoryInterface {
	return m.dict
}

// Department 获取部门Repository
func (m *repositoryManager) Department() DepartmentRepositoryInterface {
	return m.dept
}

// Role 获取角色Repository
func (m *repositoryManager) Role() RoleRepositoryInterface {
	return m.role
}

// Policy 获取策略配置Repository
func (m *repositoryManager) Policy() PolicyRepositoryInterface {
	return m.policy
}

// OperationLog 获取操作日志Repository
func (m *repositoryManager) OperationLog() OperationLogRepositoryInterface {
	return m.operationLog
}

// BeginTransaction 开始事务
func (m *repositoryManager) BeginTransaction(ctx context.Context) (Transaction, error) {
	tx, err := m.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("开始事务失败: %w", err)
	}

	return NewTransaction(tx), nil
}

// WithDB 使用指定数据库
func (m *repositoryManager) WithDB(database *sql.DB) RepositoryManager {
	return NewRepositoryManager(database)
}

// databaseWrapper 数据库包装器，实现db.Database接口
type databaseWrapper struct {
	db *sql.DB
}

func (w *databaseWrapper) QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	return w.db.QueryContext(ctx, query, args...)
}

func (w *databaseWrapper) QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row {
	return w.db.QueryRowContext(ctx, query, args...)
}

func (w *databaseWrapper) ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	return w.db.ExecContext(ctx, query, args...)
}

func (w *databaseWrapper) BeginTx(ctx context.Context, opts *sql.TxOptions) (*sql.Tx, error) {
	return w.db.BeginTx(ctx, opts)
}
