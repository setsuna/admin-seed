package repository

import (
	"context"
	"database/sql"
	"fmt"
	"reflect"
	"time"

	"admin-seed/internal/db"

	"github.com/google/uuid"
)

// baseRepository 基础Repository实现
type baseRepository[T any] struct {
	db        db.Database
	tx        *sql.Tx
	tableName string
}

// newBaseRepository 创建基础Repository
func newBaseRepository[T any](database db.Database, tableName string) *baseRepository[T] {
	return &baseRepository[T]{
		db:        database,
		tableName: tableName,
	}
}

// TableName 返回表名
func (r *baseRepository[T]) TableName() string {
	return r.tableName
}

// getExecutor 获取执行器
func (r *baseRepository[T]) getExecutor() db.Executor {
	if r.tx != nil {
		return r.tx
	}
	return r.db
}

// getQuerier 获取查询器
func (r *baseRepository[T]) getQuerier() db.Querier {
	if r.tx != nil {
		return r.tx
	}
	return r.db
}

// Query 创建查询构建器
func (r *baseRepository[T]) Query() db.QueryBuilder {
	return db.NewSelectBuilder(r.tableName)
}

// Create 创建实体
func (r *baseRepository[T]) Create(ctx context.Context, entity *T) error {
	fields, values := r.extractFieldsAndValues(entity, true)

	// 设置创建时间和更新时间
	now := time.Now()
	fields = append(fields, "created_at", "updated_at")
	values = append(values, now, now)

	// 如果没有ID，生成一个
	if !r.hasField(fields, "id") {
		id := uuid.New().String()
		fields = append([]string{"id"}, fields...)
		values = append([]interface{}{id}, values...)
		r.setFieldValue(entity, "id", id)
	}

	builder := db.Insert(r.tableName).Columns(fields...).Values(values...)

	_, err := builder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return fmt.Errorf("创建实体失败: %w", err)
	}

	// 设置时间戳字段
	r.setFieldValue(entity, "created_at", now)
	r.setFieldValue(entity, "updated_at", now)

	return nil
}

// GetByID 根据ID获取实体
func (r *baseRepository[T]) GetByID(ctx context.Context, id string) (*T, error) {
	// 由于扫描逻辑依赖于具体的实体结构，这里返回错误
	// 提示需要在具体Repository中重写GetByID方法
	return nil, fmt.Errorf("GetByID方法需要在具体Repository中重写以处理特定的扫描逻辑")
}

// Update 更新实体
func (r *baseRepository[T]) Update(ctx context.Context, entity *T) error {
	fields, values := r.extractFieldsAndValues(entity, false)

	// 设置更新时间
	fields = append(fields, "updated_at")
	values = append(values, time.Now())

	// 获取ID
	id := r.getFieldValue(entity, "id")
	if id == nil {
		return fmt.Errorf("实体缺少ID字段")
	}

	// 构建更新映射
	updateMap := make(map[string]interface{})
	for i, field := range fields {
		if field != "id" && field != "created_at" {
			updateMap[field] = values[i]
		}
	}

	builder := db.Update(r.tableName).SetMap(updateMap).WhereEq("id", id)

	result, err := builder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return fmt.Errorf("更新实体失败: %w", err)
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if affected == 0 {
		return fmt.Errorf("实体不存在或未更新")
	}

	return nil
}

// Delete 删除实体（软删除）
func (r *baseRepository[T]) Delete(ctx context.Context, id string) error {
	builder := db.SoftDelete(r.tableName, id)

	result, err := builder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return fmt.Errorf("删除实体失败: %w", err)
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if affected == 0 {
		return fmt.Errorf("实体不存在")
	}

	return nil
}

// List 分页查询实体列表
func (r *baseRepository[T]) List(ctx context.Context, opts *db.QueryOptions) ([]*T, int64, error) {
	if opts == nil {
		opts = &db.QueryOptions{}
	}

	// 构建查询
	query := r.buildQuery(opts)

	// 添加默认条件：排除已删除的记录
	query = query.Where("status != 'deleted'")

	// 查询总数
	countQuery := r.Query().Count().Where("status != 'deleted'")
	countQuery = r.applyWhereConditions(countQuery, opts.Where)

	var total int64
	err := countQuery.QueryRowContext(ctx, r.getQuerier()).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("查询总数失败: %w", err)
	}

	// 查询数据
	rows, err := query.QueryContext(ctx, r.getQuerier())
	if err != nil {
		return nil, 0, fmt.Errorf("查询列表失败: %w", err)
	}
	defer rows.Close()

	var entities []*T
	for rows.Next() {
		// 由于扫描逻辑依赖于具体的实体结构，这里返回错误
		// 提示需要在具体Repository中重写List方法或实现扫描逻辑
		return nil, 0, fmt.Errorf("List方法需要在具体Repository中重写以处理特定的扫描逻辑")
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("遍历结果集失败: %w", err)
	}

	return entities, total, nil
}

// CreateBatch 批量创建
func (r *baseRepository[T]) CreateBatch(ctx context.Context, entities []*T) error {
	if len(entities) == 0 {
		return nil
	}

	// 开始事务
	tx, err := r.BeginTx(ctx)
	if err != nil {
		return fmt.Errorf("开始事务失败: %w", err)
	}
	defer tx.Rollback()

	// 创建带事务的Repository
	txRepo := r.withTx(tx)

	for _, entity := range entities {
		if err := txRepo.Create(ctx, entity); err != nil {
			return fmt.Errorf("批量创建失败: %w", err)
		}
	}

	return tx.Commit()
}

// UpdateBatch 批量更新
func (r *baseRepository[T]) UpdateBatch(ctx context.Context, entities []*T) error {
	if len(entities) == 0 {
		return nil
	}

	// 开始事务
	tx, err := r.BeginTx(ctx)
	if err != nil {
		return fmt.Errorf("开始事务失败: %w", err)
	}
	defer tx.Rollback()

	// 创建带事务的Repository
	txRepo := r.withTx(tx)

	for _, entity := range entities {
		if err := txRepo.Update(ctx, entity); err != nil {
			return fmt.Errorf("批量更新失败: %w", err)
		}
	}

	return tx.Commit()
}

// DeleteBatch 批量删除
func (r *baseRepository[T]) DeleteBatch(ctx context.Context, ids []string) error {
	if len(ids) == 0 {
		return nil
	}

	// 转换为interface{}切片
	values := make([]interface{}, len(ids))
	for i, id := range ids {
		values[i] = id
	}

	builder := db.Update(r.tableName).
		Set("status", "deleted").
		SetUpdatedAt().
		WhereIn("id", values)

	result, err := builder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return fmt.Errorf("批量删除失败: %w", err)
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if affected == 0 {
		return fmt.Errorf("没有实体被删除")
	}

	return nil
}

// Count 计算数量
func (r *baseRepository[T]) Count(ctx context.Context, opts *db.QueryOptions) (int64, error) {
	query := r.Query().Count().Where("status != 'deleted'")

	if opts != nil {
		query = r.applyWhereConditions(query, opts.Where)
	}

	var count int64
	err := query.QueryRowContext(ctx, r.getQuerier()).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("计算数量失败: %w", err)
	}

	return count, nil
}

// Exists 检查实体是否存在
func (r *baseRepository[T]) Exists(ctx context.Context, id string) (bool, error) {
	query := r.Query().Count().WhereEq("id", id).Where("status != 'deleted'")

	var count int64
	err := query.QueryRowContext(ctx, r.getQuerier()).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("检查实体存在性失败: %w", err)
	}

	return count > 0, nil
}

// BeginTx 开始事务
func (r *baseRepository[T]) BeginTx(ctx context.Context) (*sql.Tx, error) {
	return r.db.BeginTx(ctx, nil)
}

// withTx 创建带事务的Repository
func (r *baseRepository[T]) withTx(tx *sql.Tx) *baseRepository[T] {
	return &baseRepository[T]{
		db:        r.db,
		tx:        tx,
		tableName: r.tableName,
	}
}

// 辅助方法

// buildQuery 构建查询
func (r *baseRepository[T]) buildQuery(opts *db.QueryOptions) db.QueryBuilder {
	query := r.Query()

	// 选择字段
	if len(opts.Select) > 0 {
		query = query.Select(opts.Select...)
	} else {
		query = query.SelectAll()
	}

	// WHERE条件
	query = r.applyWhereConditions(query, opts.Where)

	// 排序
	for _, order := range opts.OrderBy {
		query = query.OrderBy(order.Field, string(order.Direction))
	}

	// 如果没有指定排序，默认按创建时间倒序
	if len(opts.OrderBy) == 0 {
		query = query.OrderByDesc("created_at")
	}

	// 分页
	if opts.Page != nil && opts.Size != nil {
		query = query.Page(*opts.Page, *opts.Size)
	} else if opts.Limit != nil {
		query = query.Limit(*opts.Limit)
		if opts.Offset != nil {
			query = query.Offset(*opts.Offset)
		}
	}

	return query
}

// applyWhereConditions 应用WHERE条件
func (r *baseRepository[T]) applyWhereConditions(query db.QueryBuilder, conditions []db.WhereCondition) db.QueryBuilder {
	for _, condition := range conditions {
		switch condition.Type {
		case db.ConditionEq:
			query = query.WhereEq(condition.Field, condition.Value)
		case db.ConditionIn:
			query = query.WhereIn(condition.Field, condition.Values)
		case db.ConditionLike:
			query = query.WhereLike(condition.Field, condition.Value.(string))
		default:
			query = query.Where(fmt.Sprintf("%s %s ?", condition.Field, string(condition.Type)), condition.Value)
		}
	}
	return query
}

// extractFieldsAndValues 提取字段和值
func (r *baseRepository[T]) extractFieldsAndValues(entity *T, isCreate bool) ([]string, []interface{}) {
	v := reflect.ValueOf(entity).Elem()
	t := v.Type()

	var fields []string
	var values []interface{}

	for i := 0; i < v.NumField(); i++ {
		field := t.Field(i)
		value := v.Field(i)

		// 获取数据库字段名
		dbTag := field.Tag.Get("db")
		if dbTag == "" || dbTag == "-" {
			continue
		}

		// 跳过某些字段
		if isCreate && (dbTag == "created_at" || dbTag == "updated_at") {
			continue
		}
		if !isCreate && (dbTag == "id" || dbTag == "created_at") {
			continue
		}

		fields = append(fields, dbTag)
		values = append(values, value.Interface())
	}

	return fields, values
}

// hasField 检查字段是否存在
func (r *baseRepository[T]) hasField(fields []string, field string) bool {
	for _, f := range fields {
		if f == field {
			return true
		}
	}
	return false
}

// getFieldValue 获取字段值
func (r *baseRepository[T]) getFieldValue(entity *T, fieldName string) interface{} {
	v := reflect.ValueOf(entity).Elem()
	t := v.Type()

	for i := 0; i < v.NumField(); i++ {
		field := t.Field(i)
		dbTag := field.Tag.Get("db")

		if dbTag == fieldName {
			return v.Field(i).Interface()
		}
	}

	return nil
}

// setFieldValue 设置字段值
func (r *baseRepository[T]) setFieldValue(entity *T, fieldName string, value interface{}) {
	v := reflect.ValueOf(entity).Elem()
	t := v.Type()

	for i := 0; i < v.NumField(); i++ {
		field := t.Field(i)
		dbTag := field.Tag.Get("db")

		if dbTag == fieldName {
			fieldValue := v.Field(i)
			if fieldValue.CanSet() {
				fieldValue.Set(reflect.ValueOf(value))
			}
			break
		}
	}
}

// scanEntity 扫描实体
func (r *baseRepository[T]) scanEntity(scanner interface{}, entity *T) error {
	// 基础实现，由具体Repository重写
	// 这里返回错误，提示需要在具体Repository中实现
	return fmt.Errorf("scanEntity需要在具体Repository中实现")
}

// scanRow 扫描单行
func (r *baseRepository[T]) scanRow(row *sql.Row, entity *T) error {
	// 基础实现，由具体Repository重写
	return fmt.Errorf("scanRow需要在具体Repository中实现")
}

// scanRows 扫描多行
func (r *baseRepository[T]) scanRows(rows *sql.Rows, entity *T) error {
	// 基础实现，由具体Repository重写
	return fmt.Errorf("scanRows需要在具体Repository中实现")
}
