package repository

import (
	"context"
	"database/sql"
	"fmt"
)

// transaction 事务实现
type transaction struct {
	tx           *sql.Tx
	user         UserRepositoryInterface
	dict         DictRepositoryInterface
	dept         DepartmentRepositoryInterface
	role         RoleRepositoryInterface
	policy       PolicyRepositoryInterface
	operationLog OperationLogRepositoryInterface
}

// NewTransaction 创建事务
func NewTransaction(tx *sql.Tx) Transaction {
	txWrapper := &transactionWrapper{tx: tx}

	return &transaction{
		tx:           tx,
		user:         NewUserRepository(txWrapper).WithTx(tx),
		dict:         NewDictRepository(txWrapper).WithTx(tx),
		dept:         NewDepartmentRepository(txWrapper).WithTx(tx),
		role:         newRoleRepositoryWithTx(tx),
		policy:       newPolicyRepositoryWithTx(tx),
		operationLog: NewOperationLogRepository(txWrapper),
	}
}

// Commit 提交事务
func (t *transaction) Commit() error {
	if err := t.tx.Commit(); err != nil {
		return fmt.Errorf("提交事务失败: %w", err)
	}
	return nil
}

// Rollback 回滚事务
func (t *transaction) Rollback() error {
	if err := t.tx.Rollback(); err != nil {
		return fmt.Errorf("回滚事务失败: %w", err)
	}
	return nil
}

// User 获取事务内用户Repository
func (t *transaction) User() UserRepositoryInterface {
	return t.user
}

// Dict 获取事务内字典Repository
func (t *transaction) Dict() DictRepositoryInterface {
	return t.dict
}

// Department 获取事务内部门Repository
func (t *transaction) Department() DepartmentRepositoryInterface {
	return t.dept
}

// Role 获取事务内角色Repository
func (t *transaction) Role() RoleRepositoryInterface {
	return t.role
}

// Policy 获取事务内策略配置Repository
func (t *transaction) Policy() PolicyRepositoryInterface {
	return t.policy
}

// OperationLog 获取事务内操作日志Repository
func (t *transaction) OperationLog() OperationLogRepositoryInterface {
	return t.operationLog
}

// transactionWrapper 事务包装器，实现db.Database接口
type transactionWrapper struct {
	tx *sql.Tx
}

func (w *transactionWrapper) QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	return w.tx.QueryContext(ctx, query, args...)
}

func (w *transactionWrapper) QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row {
	return w.tx.QueryRowContext(ctx, query, args...)
}

func (w *transactionWrapper) ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	return w.tx.ExecContext(ctx, query, args...)
}

func (w *transactionWrapper) BeginTx(ctx context.Context, opts *sql.TxOptions) (*sql.Tx, error) {
	// 事务内不能再开启事务，返回当前事务
	return w.tx, nil
}

// ExecuteInTransaction 在事务中执行操作
func ExecuteInTransaction(ctx context.Context, mgr RepositoryManager, fn func(tx Transaction) error) error {
	tx, err := mgr.BeginTransaction(ctx)
	if err != nil {
		return err
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	if err := fn(tx); err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			return fmt.Errorf("事务执行失败: %w, 回滚失败: %v", err, rollbackErr)
		}
		return err
	}

	return tx.Commit()
}

// WithTransaction 事务包装器函数
func WithTransaction[T any](ctx context.Context, mgr RepositoryManager, fn func(tx Transaction) (T, error)) (T, error) {
	var result T

	err := ExecuteInTransaction(ctx, mgr, func(tx Transaction) error {
		var err error
		result, err = fn(tx)
		return err
	})

	return result, err
}
