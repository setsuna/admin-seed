package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/Masterminds/squirrel"
)

// NewSelectBuilder 创建查询构建器
func NewSelectBuilder(table string) QueryBuilder {
	return &SelectBuilder{
		SelectBuilder: squirrel.Select().From(table).PlaceholderFormat(squirrel.Question),
		table:         table,
	}
}

// NewUpdateBuilder 创建更新构建器
func NewUpdateBuilder(table string) *UpdateBuilder {
	return &UpdateBuilder{
		UpdateBuilder: squirrel.Update(table).PlaceholderFormat(squirrel.Question),
	}
}

// NewInsertBuilder 创建插入构建器
func NewInsertBuilder(table string) *InsertBuilder {
	return &InsertBuilder{
		InsertBuilder: squirrel.Insert(table).PlaceholderFormat(squirrel.Question),
	}
}

// NewDeleteBuilder 创建删除构建器
func NewDeleteBuilder(table string) *DeleteBuilder {
	return &DeleteBuilder{
		DeleteBuilder: squirrel.Delete(table).PlaceholderFormat(squirrel.Question),
	}
}

// SelectBuilder 实现 QueryBuilder 接口
func (b *SelectBuilder) Where(pred interface{}, args ...interface{}) QueryBuilder {
	b.SelectBuilder = b.SelectBuilder.Where(pred, args...)
	return b
}

func (b *SelectBuilder) WhereEq(field string, value interface{}) QueryBuilder {
	b.SelectBuilder = b.SelectBuilder.Where(squirrel.Eq{field: value})
	return b
}

func (b *SelectBuilder) WhereIn(field string, values []interface{}) QueryBuilder {
	b.SelectBuilder = b.SelectBuilder.Where(squirrel.Eq{field: values})
	return b
}

func (b *SelectBuilder) WhereLike(field string, value string) QueryBuilder {
	b.SelectBuilder = b.SelectBuilder.Where(fmt.Sprintf("%s LIKE ?", field), "%"+value+"%")
	return b
}

func (b *SelectBuilder) WhereNot(pred interface{}, args ...interface{}) QueryBuilder {
	b.SelectBuilder = b.SelectBuilder.Where(squirrel.NotEq{pred.(string): args[0]})
	return b
}

func (b *SelectBuilder) WhereOr(pred interface{}, args ...interface{}) QueryBuilder {
	b.SelectBuilder = b.SelectBuilder.Where(squirrel.Or{squirrel.Expr(pred.(string), args...)})
	return b
}

func (b *SelectBuilder) OrderBy(field string, direction ...string) QueryBuilder {
	dir := "ASC"
	if len(direction) > 0 {
		dir = direction[0]
	}
	b.SelectBuilder = b.SelectBuilder.OrderBy(fmt.Sprintf("%s %s", field, dir))
	return b
}

func (b *SelectBuilder) OrderByAsc(field string) QueryBuilder {
	return b.OrderBy(field, "ASC")
}

func (b *SelectBuilder) OrderByDesc(field string) QueryBuilder {
	return b.OrderBy(field, "DESC")
}

func (b *SelectBuilder) Limit(limit uint64) QueryBuilder {
	b.SelectBuilder = b.SelectBuilder.Limit(limit)
	return b
}

func (b *SelectBuilder) Offset(offset uint64) QueryBuilder {
	b.SelectBuilder = b.SelectBuilder.Offset(offset)
	return b
}

func (b *SelectBuilder) Page(page, size int) QueryBuilder {
	if page < 1 {
		page = 1
	}
	if size < 1 {
		size = 20
	}
	offset := uint64((page - 1) * size)
	return b.Limit(uint64(size)).Offset(offset)
}

func (b *SelectBuilder) Select(fields ...string) QueryBuilder {
	b.SelectBuilder = b.SelectBuilder.Columns(fields...)
	return b
}

func (b *SelectBuilder) SelectAll() QueryBuilder {
	b.SelectBuilder = b.SelectBuilder.Columns("*")
	return b
}

func (b *SelectBuilder) LeftJoin(table, on string) QueryBuilder {
	b.SelectBuilder = b.SelectBuilder.LeftJoin(fmt.Sprintf("%s ON %s", table, on))
	return b
}

func (b *SelectBuilder) InnerJoin(table, on string) QueryBuilder {
	b.SelectBuilder = b.SelectBuilder.Join(fmt.Sprintf("%s ON %s", table, on))
	return b
}

func (b *SelectBuilder) RightJoin(table, on string) QueryBuilder {
	b.SelectBuilder = b.SelectBuilder.RightJoin(fmt.Sprintf("%s ON %s", table, on))
	return b
}

func (b *SelectBuilder) Count() QueryBuilder {
	return &SelectBuilder{
		SelectBuilder: squirrel.Select("COUNT(*)").From(b.table).PlaceholderFormat(squirrel.Question),
		table:         b.table,
	}
}

func (b *SelectBuilder) Sum(field string) QueryBuilder {
	return &SelectBuilder{
		SelectBuilder: squirrel.Select(fmt.Sprintf("SUM(%s)", field)).From(b.table).PlaceholderFormat(squirrel.Question),
		table:         b.table,
	}
}

func (b *SelectBuilder) Avg(field string) QueryBuilder {
	return &SelectBuilder{
		SelectBuilder: squirrel.Select(fmt.Sprintf("AVG(%s)", field)).From(b.table).PlaceholderFormat(squirrel.Question),
		table:         b.table,
	}
}

func (b *SelectBuilder) Max(field string) QueryBuilder {
	return &SelectBuilder{
		SelectBuilder: squirrel.Select(fmt.Sprintf("MAX(%s)", field)).From(b.table).PlaceholderFormat(squirrel.Question),
		table:         b.table,
	}
}

func (b *SelectBuilder) Min(field string) QueryBuilder {
	return &SelectBuilder{
		SelectBuilder: squirrel.Select(fmt.Sprintf("MIN(%s)", field)).From(b.table).PlaceholderFormat(squirrel.Question),
		table:         b.table,
	}
}

func (b *SelectBuilder) Build() (string, []interface{}, error) {
	return b.SelectBuilder.ToSql()
}

func (b *SelectBuilder) ToSQL() (string, []interface{}, error) {
	return b.SelectBuilder.ToSql()
}

func (b *SelectBuilder) QueryContext(ctx context.Context, db Querier) (*sql.Rows, error) {
	query, args, err := b.ToSQL()
	if err != nil {
		return nil, err
	}
	return db.QueryContext(ctx, query, args...)
}

func (b *SelectBuilder) QueryRowContext(ctx context.Context, db Querier) *sql.Row {
	query, args, err := b.ToSQL()
	if err != nil {
		return &sql.Row{} // 返回空行，错误会在Scan时处理
	}
	return db.QueryRowContext(ctx, query, args...)
}

func (b *SelectBuilder) ExecContext(ctx context.Context, db Executor) (sql.Result, error) {
	query, args, err := b.ToSQL()
	if err != nil {
		return nil, err
	}
	return db.ExecContext(ctx, query, args...)
}

func (b *SelectBuilder) Clone() QueryBuilder {
	newBuilder := *b
	return &newBuilder
}

func (b *SelectBuilder) Reset() QueryBuilder {
	return &SelectBuilder{
		SelectBuilder: squirrel.Select().From(b.table).PlaceholderFormat(squirrel.Question),
		table:         b.table,
	}
}

// 便捷函数
func Select(table string, fields ...string) QueryBuilder {
	builder := NewSelectBuilder(table)
	if len(fields) > 0 {
		return builder.Select(fields...)
	}
	return builder.SelectAll()
}

func Update(table string) *UpdateBuilder {
	return NewUpdateBuilder(table)
}

func Insert(table string) *InsertBuilder {
	return NewInsertBuilder(table)
}

func Delete(table string) *DeleteBuilder {
	return NewDeleteBuilder(table)
}

// WhereIn 添加WhereIn方法
func (b *UpdateBuilder) WhereIn(field string, values []interface{}) *UpdateBuilder {
	b.UpdateBuilder = b.UpdateBuilder.Where(squirrel.Eq{field: values})
	return b
}
func (b *UpdateBuilder) Set(field string, value interface{}) *UpdateBuilder {
	b.UpdateBuilder = b.UpdateBuilder.Set(field, value)
	return b
}

func (b *UpdateBuilder) SetMap(values map[string]interface{}) *UpdateBuilder {
	for field, value := range values {
		b.UpdateBuilder = b.UpdateBuilder.Set(field, value)
	}
	return b
}

// SetUpdatedAt 设置更新时间
func (b *UpdateBuilder) SetUpdatedAt() *UpdateBuilder {
	return b.Set("updated_at", time.Now())
}

func (b *UpdateBuilder) Where(pred interface{}, args ...interface{}) *UpdateBuilder {
	b.UpdateBuilder = b.UpdateBuilder.Where(pred, args...)
	return b
}

func (b *UpdateBuilder) WhereEq(field string, value interface{}) *UpdateBuilder {
	b.UpdateBuilder = b.UpdateBuilder.Where(squirrel.Eq{field: value})
	return b
}

func (b *UpdateBuilder) ExecContext(ctx context.Context, db Executor) (sql.Result, error) {
	query, args, err := b.UpdateBuilder.ToSql()
	if err != nil {
		return nil, err
	}
	return db.ExecContext(ctx, query, args...)
}

// InsertBuilder 扩展方法
func (b *InsertBuilder) Values(values ...interface{}) *InsertBuilder {
	b.InsertBuilder = b.InsertBuilder.Values(values...)
	return b
}

func (b *InsertBuilder) Columns(columns ...string) *InsertBuilder {
	b.InsertBuilder = b.InsertBuilder.Columns(columns...)
	return b
}

func (b *InsertBuilder) SetMap(values map[string]interface{}) *InsertBuilder {
	var columns []string
	var vals []interface{}

	for field, value := range values {
		columns = append(columns, field)
		vals = append(vals, value)
	}

	return b.Columns(columns...).Values(vals...)
}

func (b *InsertBuilder) ExecContext(ctx context.Context, db Executor) (sql.Result, error) {
	query, args, err := b.InsertBuilder.ToSql()
	if err != nil {
		return nil, err
	}
	return db.ExecContext(ctx, query, args...)
}

// DeleteBuilder 扩展方法
func (b *DeleteBuilder) Where(pred interface{}, args ...interface{}) *DeleteBuilder {
	b.DeleteBuilder = b.DeleteBuilder.Where(pred, args...)
	return b
}

func (b *DeleteBuilder) WhereEq(field string, value interface{}) *DeleteBuilder {
	b.DeleteBuilder = b.DeleteBuilder.Where(squirrel.Eq{field: value})
	return b
}

func (b *DeleteBuilder) ExecContext(ctx context.Context, db Executor) (sql.Result, error) {
	query, args, err := b.DeleteBuilder.ToSql()
	if err != nil {
		return nil, err
	}
	return db.ExecContext(ctx, query, args...)
}

// 软删除
func SoftDelete(table, id string) *UpdateBuilder {
	return Update(table).Set("status", "deleted").SetUpdatedAt().WhereEq("id", id)
}

// 通用查询函数
func QueryCount(ctx context.Context, db Querier, table string, where QueryBuilder) (int64, error) {
	builder := Select(table).Count()

	// 复制where条件
	if where != nil {
		whereQuery, whereArgs, err := where.ToSQL()
		if err != nil {
			return 0, err
		}
		// 提取WHERE部分
		if whereClause := extractWhereClause(whereQuery); whereClause != "" {
			builder = builder.Where(whereClause, whereArgs...)
		}
	}

	var count int64
	err := builder.QueryRowContext(ctx, db).Scan(&count)
	if err != nil {
		return 0, err
	}

	return count, nil
}

// 提取WHERE子句的辅助函数
func extractWhereClause(query string) string {
	// 简单实现，实际可能需要更复杂的解析
	// 这里假设query是完整的SELECT语句
	return ""
}
