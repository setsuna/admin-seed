package repository

import (
	"admin-seed/internal/db"
	"context"
	"database/sql"
)

// BaseRepository 基础Repository接口
type BaseRepository[T any] interface {
	Create(ctx context.Context, entity *T) error
	GetByID(ctx context.Context, id string) (*T, error)
	Update(ctx context.Context, entity *T) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, query *db.QueryOptions) ([]*T, int64, error)

	// 批量操作
	CreateBatch(ctx context.Context, entities []*T) error
	UpdateBatch(ctx context.Context, entities []*T) error
	DeleteBatch(ctx context.Context, ids []string) error

	// 查询构建器
	Query() db.QueryBuilder
	Count(ctx context.Context, query *db.QueryOptions) (int64, error)
	Exists(ctx context.Context, id string) (bool, error)

	// 表名
	TableName() string
}

// TransactionalRepository 支持事务的Repository
type TransactionalRepository interface {
	WithTx(tx *sql.Tx) TransactionalRepository
	BeginTx(ctx context.Context) (*sql.Tx, error)
}

// RepositoryManager Repository管理器接口
type RepositoryManager interface {
	// 获取各种Repository
	User() UserRepositoryInterface
	Dict() DictRepositoryInterface
	Department() DepartmentRepositoryInterface
	Role() RoleRepositoryInterface
	Policy() PolicyRepositoryInterface
	OperationLog() OperationLogRepositoryInterface

	// 事务管理
	BeginTransaction(ctx context.Context) (Transaction, error)
	WithDB(db *sql.DB) RepositoryManager
}

// Transaction 事务接口
type Transaction interface {
	Commit() error
	Rollback() error

	// 获取事务内的Repository
	User() UserRepositoryInterface
	Dict() DictRepositoryInterface
	Department() DepartmentRepositoryInterface
	Role() RoleRepositoryInterface
	Policy() PolicyRepositoryInterface
	OperationLog() OperationLogRepositoryInterface
}

// Pagination 分页参数
type Pagination struct {
	Page int `json:"page" form:"page"`
	Size int `json:"size" form:"size"`
}

// GetOffset 获取偏移量
func (p *Pagination) GetOffset() int {
	if p.Page <= 0 {
		p.Page = 1
	}
	return (p.Page - 1) * p.GetSize()
}

// GetSize 获取页面大小
func (p *Pagination) GetSize() int {
	if p.Size <= 0 || p.Size > 100 {
		p.Size = 20
	}
	return p.Size
}

// Normalize 标准化分页参数
func (p *Pagination) Normalize() {
	if p.Page <= 0 {
		p.Page = 1
	}
	if p.Size <= 0 || p.Size > 100 {
		p.Size = 20
	}
}

// PaginatedResult 分页结果
type PaginatedResult[T any] struct {
	Data    []*T  `json:"data"`
	Total   int64 `json:"total"`
	Page    int   `json:"page"`
	Size    int   `json:"size"`
	Pages   int   `json:"pages"`
	HasNext bool  `json:"has_next"`
	HasPrev bool  `json:"has_prev"`
}

// NewPaginatedResult 创建分页结果
func NewPaginatedResult[T any](data []*T, total int64, page, size int) *PaginatedResult[T] {
	pages := int((total + int64(size) - 1) / int64(size))
	if pages == 0 {
		pages = 1
	}

	return &PaginatedResult[T]{
		Data:    data,
		Total:   total,
		Page:    page,
		Size:    size,
		Pages:   pages,
		HasNext: page < pages,
		HasPrev: page > 1,
	}
}
