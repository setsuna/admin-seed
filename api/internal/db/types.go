package db

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/Masterminds/squirrel"
)

// QueryBuilder 查询构建器接口
type QueryBuilder interface {
	// WHERE条件
	Where(pred interface{}, args ...interface{}) QueryBuilder
	WhereEq(field string, value interface{}) QueryBuilder
	WhereIn(field string, values []interface{}) QueryBuilder
	WhereLike(field string, value string) QueryBuilder
	WhereNot(pred interface{}, args ...interface{}) QueryBuilder
	WhereOr(pred interface{}, args ...interface{}) QueryBuilder

	// 排序
	OrderBy(field string, direction ...string) QueryBuilder
	OrderByAsc(field string) QueryBuilder
	OrderByDesc(field string) QueryBuilder

	// 分页
	Limit(limit uint64) QueryBuilder
	Offset(offset uint64) QueryBuilder
	Page(page, size int) QueryBuilder

	// 字段选择
	Select(fields ...string) QueryBuilder
	SelectAll() QueryBuilder

	// JOIN操作
	LeftJoin(table, on string) QueryBuilder
	InnerJoin(table, on string) QueryBuilder
	RightJoin(table, on string) QueryBuilder

	// 聚合
	Count() QueryBuilder
	Sum(field string) QueryBuilder
	Avg(field string) QueryBuilder
	Max(field string) QueryBuilder
	Min(field string) QueryBuilder

	// 构建和执行
	Build() (string, []interface{}, error)
	ToSQL() (string, []interface{}, error)

	// 执行方法
	QueryContext(ctx context.Context, db Querier) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, db Querier) *sql.Row
	ExecContext(ctx context.Context, db Executor) (sql.Result, error)

	// 工具方法
	Clone() QueryBuilder
	Reset() QueryBuilder
}

// SelectBuilder 查询构建器实现
type SelectBuilder struct {
	squirrel.SelectBuilder
	table    string
	database string
}

// UpdateBuilder 更新构建器
type UpdateBuilder struct {
	squirrel.UpdateBuilder
}

// InsertBuilder 插入构建器
type InsertBuilder struct {
	squirrel.InsertBuilder
}

// DeleteBuilder 删除构建器
type DeleteBuilder struct {
	squirrel.DeleteBuilder
}

// Querier 查询接口
type Querier interface {
	QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row
}

// Executor 执行接口
type Executor interface {
	ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error)
}

// Database 数据库接口
type Database interface {
	Querier
	Executor
	BeginTx(ctx context.Context, opts *sql.TxOptions) (*sql.Tx, error)
}

// SortDirection 排序方向
type SortDirection string

const (
	SortAsc  SortDirection = "ASC"
	SortDesc SortDirection = "DESC"
)

// QueryOptions 查询选项
type QueryOptions struct {
	Select  []string
	Where   []WhereCondition
	OrderBy []OrderBy
	Limit   *uint64
	Offset  *uint64
	Page    *int
	Size    *int
	Joins   []Join
	GroupBy []string
	Having  []WhereCondition
}

// WhereCondition WHERE条件
type WhereCondition struct {
	Field    string
	Operator string
	Value    interface{}
	Values   []interface{}
	Type     ConditionType
}

// ConditionType 条件类型
type ConditionType string

const (
	ConditionAnd     ConditionType = "AND"
	ConditionOr      ConditionType = "OR"
	ConditionIn      ConditionType = "IN"
	ConditionNotIn   ConditionType = "NOT IN"
	ConditionLike    ConditionType = "LIKE"
	ConditionEq      ConditionType = "="
	ConditionNe      ConditionType = "!="
	ConditionGt      ConditionType = ">"
	ConditionGte     ConditionType = ">="
	ConditionLt      ConditionType = "<"
	ConditionLte     ConditionType = "<="
	ConditionIsNull  ConditionType = "IS NULL"
	ConditionNotNull ConditionType = "IS NOT NULL"
)

// OrderBy 排序
type OrderBy struct {
	Field     string
	Direction SortDirection
}

// Join 连接
type Join struct {
	Type  string // LEFT, RIGHT, INNER
	Table string
	On    string
}

// PaginationResult 分页结果
type PaginationResult[T any] struct {
	Data    []T   `json:"data"`
	Total   int64 `json:"total"`
	Page    int   `json:"page"`
	Size    int   `json:"size"`
	Pages   int   `json:"pages"`
	HasNext bool  `json:"has_next"`
	HasPrev bool  `json:"has_prev"`
}

// NewPaginationResult 创建分页结果
func NewPaginationResult[T any](data []T, total int64, page, size int) *PaginationResult[T] {
	pages := int((total + int64(size) - 1) / int64(size))
	if pages == 0 {
		pages = 1
	}

	return &PaginationResult[T]{
		Data:    data,
		Total:   total,
		Page:    page,
		Size:    size,
		Pages:   pages,
		HasNext: page < pages,
		HasPrev: page > 1,
	}
}

// BuildWhereClause 构建WHERE子句
func BuildWhereClause(conditions []WhereCondition) (string, []interface{}) {
	if len(conditions) == 0 {
		return "", nil
	}

	var parts []string
	var args []interface{}

	for i, condition := range conditions {
		if i > 0 && condition.Type != ConditionOr {
			parts = append(parts, "AND")
		} else if condition.Type == ConditionOr {
			parts = append(parts, "OR")
		}

		switch condition.Type {
		case ConditionIn, ConditionNotIn:
			placeholders := make([]string, len(condition.Values))
			for j := range placeholders {
				placeholders[j] = "?"
			}
			parts = append(parts, fmt.Sprintf("%s %s (%s)",
				condition.Field, string(condition.Type), strings.Join(placeholders, ",")))
			args = append(args, condition.Values...)
		case ConditionIsNull, ConditionNotNull:
			parts = append(parts, fmt.Sprintf("%s %s", condition.Field, string(condition.Type)))
		default:
			parts = append(parts, fmt.Sprintf("%s %s ?", condition.Field, string(condition.Type)))
			args = append(args, condition.Value)
		}
	}

	return strings.Join(parts, " "), args
}

// BuildOrderByClause 构建ORDER BY子句
func BuildOrderByClause(orderBy []OrderBy) string {
	if len(orderBy) == 0 {
		return ""
	}

	var parts []string
	for _, order := range orderBy {
		parts = append(parts, fmt.Sprintf("%s %s", order.Field, string(order.Direction)))
	}

	return strings.Join(parts, ", ")
}

// Error 错误常量
var (
	ErrRecordNotFound = fmt.Errorf("record not found")
	ErrInvalidInput   = fmt.Errorf("invalid input")
	ErrDuplicateEntry = fmt.Errorf("duplicate entry")
)
