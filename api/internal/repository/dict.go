package repository

import (
	"admin-seed/internal/db"
	"admin-seed/internal/dto/request"
	"admin-seed/internal/model"
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// DictRepositoryInterface 字典Repository接口
type DictRepositoryInterface interface {
	BaseRepository[model.DataDict]

	// 数据字典操作
	GetDistinctDictTypes(ctx context.Context) ([]*model.DictType, error)
	GetDictByCode(ctx context.Context, code string) (*model.DataDict, error)
	ListDictsWithFilters(ctx context.Context, filters *request.DictFilters) ([]*model.DataDict, int64, error)

	// 字典项操作
	CreateDictItem(ctx context.Context, item *model.DictItem) error
	GetDictItemByID(ctx context.Context, id string) (*model.DictItem, error)
	GetDictItemsByCode(ctx context.Context, dictCode string) ([]*model.DictItem, error)
	UpdateDictItem(ctx context.Context, item *model.DictItem) error
	DeleteDictItem(ctx context.Context, id string) error

	// 统计操作
	UpdateDictItemCount(ctx context.Context, dictCode string) error

	// 事务支持
	WithTx(tx *sql.Tx) DictRepositoryInterface
}

// dictRepository 字典Repository实现
type dictRepository struct {
	*baseRepository[model.DataDict]
	db db.Database
	tx *sql.Tx
}

// NewDictRepository 创建字典Repository
func NewDictRepository(database db.Database) DictRepositoryInterface {
	base := newBaseRepository[model.DataDict](database, "data_dicts")
	return &dictRepository{
		baseRepository: base,
		db:             database,
	}
}

// WithTx 创建带事务的Repository
func (r *dictRepository) WithTx(tx *sql.Tx) DictRepositoryInterface {
	return &dictRepository{
		baseRepository: r.baseRepository.withTx(tx),
		db:             r.db,
		tx:             tx,
	}
}

// GetDistinctDictTypes 获取所有不重复的字典类型
func (r *dictRepository) GetDistinctDictTypes(ctx context.Context) ([]*model.DictType, error) {
	// 查询不重复的 dict_type 和对应的一个 dict_name
	query := `
		SELECT dict_type, 
		       (SELECT dict_name FROM data_dicts d2 
		        WHERE d2.dict_type = d1.dict_type 
		        AND d2.status != 'deleted' 
		        LIMIT 1) as dict_name
		FROM data_dicts d1
		WHERE status != 'deleted'
		GROUP BY dict_type
		ORDER BY dict_type ASC
	`

	rows, err := r.getQuerier().QueryContext(ctx, query)
	if err != nil {
		return nil, NewDatabaseError("GetDistinctDictTypes", "DataDict", err)
	}
	defer rows.Close()

	var types []*model.DictType
	for rows.Next() {
		var t model.DictType
		if err := rows.Scan(&t.Type, &t.Name); err != nil {
			return nil, NewDatabaseError("GetDistinctDictTypes", "DataDict", err).WithDetail("step", "scan")
		}
		types = append(types, &t)
	}

	if err = rows.Err(); err != nil {
		return nil, NewDatabaseError("GetDistinctDictTypes", "DataDict", err).WithDetail("step", "rows_error")
	}

	return types, nil
}

// GetDictByCode 根据代码获取数据字典
func (r *dictRepository) GetDictByCode(ctx context.Context, code string) (*model.DataDict, error) {
	query := r.Query().
		SelectAll().
		WhereEq("dict_code", code).
		Where("status != 'deleted'")

	row := query.QueryRowContext(ctx, r.getQuerier())

	dict := &model.DataDict{}
	err := r.scanDictRow(row, dict)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, NewNotFoundError("DataDict", code).
				WithField("dict_code").
				WithValue(code)
		}
		return nil, NewDatabaseError("GetDictByCode", "DataDict", err).
			WithField("dict_code").
			WithValue(code)
	}

	return dict, nil
}

// ListDictsWithFilters 根据过滤条件查询字典列表
func (r *dictRepository) ListDictsWithFilters(ctx context.Context, filters *request.DictFilters) ([]*model.DataDict, int64, error) {
	opts := &db.QueryOptions{
		Select: []string{"*"},
		Where:  []db.WhereCondition{},
	}

	// 处理关键词搜索（兼容新旧字段）
	keyword := filters.Keyword
	if keyword != "" {
		// 关键词搜索多个字段
		keywordPattern := "%" + keyword + "%"
		opts.Where = append(opts.Where, db.WhereCondition{
			Type:   db.ConditionAnd, // 使用AND类型，但Field中包含OR逻辑
			Field:  "(dict_code LIKE ? OR dict_name LIKE ?)",
			Values: []interface{}{keywordPattern, keywordPattern},
		})
	}

	// 字典代码
	if filters.DictCode != "" {
		opts.Where = append(opts.Where, db.WhereCondition{
			Type:  db.ConditionEq,
			Field: "dict_code",
			Value: filters.DictCode,
		})
	}

	// 字典名称
	if filters.DictName != "" {
		opts.Where = append(opts.Where, db.WhereCondition{
			Type:  db.ConditionLike,
			Field: "dict_name",
			Value: filters.DictName,
		})
	}

	// 字典类型（兼容新旧字段）
	dictType := filters.DictType
	if dictType != "" {
		opts.Where = append(opts.Where, db.WhereCondition{
			Type:  db.ConditionEq,
			Field: "dict_type",
			Value: dictType,
		})
	}

	// 状态（兼容新旧字段）
	status := filters.Status
	if status != "" {
		opts.Where = append(opts.Where, db.WhereCondition{
			Type:  db.ConditionEq,
			Field: "status",
			Value: status,
		})
	}

	// 分页（兼容新旧字段）
	page := filters.Page
	size := filters.Size

	if page > 0 && size > 0 {
		opts.Page = &page
		opts.Size = &size
	}

	// 排序
	opts.OrderBy = []db.OrderBy{
		{Field: "created_at", Direction: db.SortDesc},
	}

	return r.List(ctx, opts)
}

// CreateDictItem 创建字典项
func (r *dictRepository) CreateDictItem(ctx context.Context, item *model.DictItem) error {
	if item.ID == "" {
		item.ID = uuid.New().String()
	}

	now := time.Now()
	item.CreatedAt = now
	item.UpdatedAt = now

	builder := db.Insert("dict_items").Columns(
		"id", "dict_code", "code", "name", "value", "status",
		"sort", "created_at", "updated_at",
	).Values(
		item.ID, item.DictCode, item.Code, item.Name, item.Value, item.Status,
		item.Sort, item.CreatedAt, item.UpdatedAt,
	)

	_, err := builder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return WrapError(err, "CreateDictItem", "DictItem").
			WithField("dict_code").
			WithValue(item.DictCode).
			WithDetail("code", item.Code)
	}

	return nil
}

// GetDictItemByID 根据ID获取字典项
func (r *dictRepository) GetDictItemByID(ctx context.Context, id string) (*model.DictItem, error) {
	query := db.NewSelectBuilder("dict_items").
		Select(
			"id", "dict_code", "code", "name", "value", "status",
			"sort", "created_at", "updated_at",
		).
		WhereEq("id", id).
		Where("status != 'deleted'")

	row := query.QueryRowContext(ctx, r.getQuerier())

	item := &model.DictItem{}
	err := r.scanDictItemRow(row, item)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, NewNotFoundError("DictItem", id)
		}
		return nil, NewDatabaseError("GetDictItemByID", "DictItem", err).
			WithEntityID(id)
	}

	return item, nil
}

// GetDictItemsByCode 根据字典代码获取字典项列表
func (r *dictRepository) GetDictItemsByCode(ctx context.Context, dictCode string) ([]*model.DictItem, error) {
	query := db.NewSelectBuilder("dict_items").
		Select(
			"id", "dict_code", "code", "name", "value", "status",
			"sort", "created_at", "updated_at",
		).
		WhereEq("dict_code", dictCode).
		Where("status != 'deleted'").
		OrderBy("sort", "ASC").
		OrderBy("created_at", "ASC")

	// 调试：打印SQL
	sqlStr, args, _ := query.ToSQL()
	fmt.Printf("[DEBUG] SQL: %s\n[DEBUG] Args: %v\n", sqlStr, args)

	rows, err := query.QueryContext(ctx, r.getQuerier())
	if err != nil {
		return nil, NewDatabaseError("GetDictItemsByCode", "DictItem", err).
			WithField("dict_code").
			WithValue(dictCode)
	}
	defer rows.Close()

	// 调试：打印列名
	columns, _ := rows.Columns()
	fmt.Printf("[DEBUG] Returned columns (%d): %v\n", len(columns), columns)

	var items []*model.DictItem
	for rows.Next() {
		item := &model.DictItem{}
		if err := r.scanDictItemRows(rows, item); err != nil {
			return nil, NewDatabaseError("GetDictItemsByCode", "DictItem", err).
				WithField("dict_code").
				WithValue(dictCode).
				WithDetail("step", "scan_rows")
		}
		items = append(items, item)
	}

	if err = rows.Err(); err != nil {
		return nil, NewDatabaseError("GetDictItemsByCode", "DictItem", err).
			WithField("dict_code").
			WithValue(dictCode).
			WithDetail("step", "rows_error")
	}

	return items, nil
}

// UpdateDictItem 更新字典项
func (r *dictRepository) UpdateDictItem(ctx context.Context, item *model.DictItem) error {
	item.UpdatedAt = time.Now()

	builder := db.Update("dict_items").SetMap(map[string]interface{}{
		"code":       item.Code,
		"name":       item.Name,
		"value":      item.Value,
		"status":     item.Status,
		"sort":       item.Sort,
		"updated_at": item.UpdatedAt,
	}).WhereEq("id", item.ID)

	result, err := builder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return WrapError(err, "UpdateDictItem", "DictItem").
			WithEntityID(item.ID)
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return NewDatabaseError("UpdateDictItem", "DictItem", err).
			WithEntityID(item.ID).
			WithDetail("step", "get_affected_rows")
	}

	if affected == 0 {
		return NewNotFoundError("DictItem", item.ID)
	}

	return nil
}

// DeleteDictItem 删除字典项（软删除）
func (r *dictRepository) DeleteDictItem(ctx context.Context, id string) error {
	builder := db.Update("dict_items").
		Set("status", "deleted").
		SetUpdatedAt().
		WhereEq("id", id)

	result, err := builder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return NewDatabaseError("DeleteDictItem", "DictItem", err).
			WithEntityID(id)
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return NewDatabaseError("DeleteDictItem", "DictItem", err).
			WithEntityID(id).
			WithDetail("step", "get_affected_rows")
	}

	if affected == 0 {
		return NewNotFoundError("DictItem", id)
	}

	return nil
}

// UpdateDictItemCount 更新字典项数量
func (r *dictRepository) UpdateDictItemCount(ctx context.Context, dictCode string) error {
	// 统计有效的字典项数量
	countQuery := db.Select("dict_items").
		Count().
		WhereEq("dict_code", dictCode).
		Where("status != 'deleted'")

	var count int64
	err := countQuery.QueryRowContext(ctx, r.getQuerier()).Scan(&count)
	if err != nil {
		return NewDatabaseError("UpdateDictItemCount", "DataDict", err).
			WithField("dict_code").
			WithValue(dictCode).
			WithDetail("step", "count")
	}

	// 更新字典的项目数量
	updateBuilder := db.Update(r.TableName()).
		Set("item_count", count).
		SetUpdatedAt().
		WhereEq("dict_code", dictCode)

	_, err = updateBuilder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return NewDatabaseError("UpdateDictItemCount", "DataDict", err).
			WithField("dict_code").
			WithValue(dictCode).
			WithDetail("step", "update")
	}

	return nil
}

// Delete 重写删除方法，同时删除字典项
func (r *dictRepository) Delete(ctx context.Context, id string) error {
	// 开始事务
	var tx *sql.Tx
	var err error

	if r.tx != nil {
		tx = r.tx
	} else {
		tx, err = r.db.BeginTx(ctx, nil)
		if err != nil {
			return NewTransactionError("BeginTx", err).
				WithDetail("operation", "Delete").
				WithEntityID(id)
		}
		defer tx.Rollback()
	}

	// 获取字典代码
	var dictCode string
	err = tx.QueryRowContext(ctx, "SELECT dict_code FROM data_dicts WHERE id = ?", id).Scan(&dictCode)
	if err != nil {
		if err == sql.ErrNoRows {
			return NewNotFoundError("DataDict", id)
		}
		return NewDatabaseError("Delete", "DataDict", err).
			WithEntityID(id).
			WithDetail("step", "get_dict_code")
	}

	// 删除字典
	_, err = tx.ExecContext(ctx, "UPDATE data_dicts SET status = 'deleted', updated_at = ? WHERE id = ?",
		time.Now(), id)
	if err != nil {
		return NewDatabaseError("Delete", "DataDict", err).
			WithEntityID(id).
			WithDetail("step", "delete_dict")
	}

	// 删除字典项
	_, err = tx.ExecContext(ctx, "UPDATE dict_items SET status = 'deleted', updated_at = ? WHERE dict_code = ?",
		time.Now(), dictCode)
	if err != nil {
		return NewDatabaseError("Delete", "DataDict", err).
			WithEntityID(id).
			WithDetail("step", "delete_items").
			WithDetail("dict_code", dictCode)
	}

	// 如果不是在外部事务中，提交事务
	if r.tx == nil {
		if err = tx.Commit(); err != nil {
			return NewTransactionError("Commit", err).
				WithDetail("operation", "Delete").
				WithEntityID(id)
		}
	}

	return nil
}

// getExecutor 获取执行器
func (r *dictRepository) getExecutor() db.Executor {
	if r.tx != nil {
		return r.tx
	}
	return r.db
}

// getQuerier 获取查询器
func (r *dictRepository) getQuerier() db.Querier {
	if r.tx != nil {
		return r.tx
	}
	return r.db
}

// scanDictRow 扫描字典单行数据
func (r *dictRepository) scanDictRow(row *sql.Row, dict *model.DataDict) error {
	return row.Scan(
		&dict.ID, &dict.DictCode, &dict.DictName, &dict.DictType, &dict.Status,
		&dict.ItemCount, &dict.Remark, &dict.CreatedAt, &dict.UpdatedAt)
}

// scanDictRows 扫描字典多行数据
func (r *dictRepository) scanDictRows(rows *sql.Rows, dict *model.DataDict) error {
	return rows.Scan(
		&dict.ID, &dict.DictCode, &dict.DictName, &dict.DictType, &dict.Status,
		&dict.ItemCount, &dict.Remark, &dict.CreatedAt, &dict.UpdatedAt)
}

// scanDictItemRow 扫描字典项单行数据
func (r *dictRepository) scanDictItemRow(row *sql.Row, item *model.DictItem) error {
	return row.Scan(
		&item.ID, &item.DictCode, &item.Code, &item.Name, &item.Value, &item.Status,
		&item.Sort, &item.CreatedAt, &item.UpdatedAt)
}

// scanDictItemRows 扫描字典项多行数据
func (r *dictRepository) scanDictItemRows(rows *sql.Rows, item *model.DictItem) error {
	return rows.Scan(
		&item.ID, &item.DictCode, &item.Code, &item.Name, &item.Value, &item.Status,
		&item.Sort, &item.CreatedAt, &item.UpdatedAt)
}

// Create 创建数据字典
func (r *dictRepository) Create(ctx context.Context, dict *model.DataDict) error {
	if dict.ID == "" {
		dict.ID = uuid.New().String()
	}

	now := time.Now()
	dict.CreatedAt = now
	dict.UpdatedAt = now

	builder := db.Insert(r.TableName()).Columns(
		"id", "dict_code", "dict_name", "dict_type", "status",
		"item_count", "remark", "created_at", "updated_at",
	).Values(
		dict.ID, dict.DictCode, dict.DictName, dict.DictType, dict.Status,
		dict.ItemCount, dict.Remark, dict.CreatedAt, dict.UpdatedAt,
	)

	_, err := builder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return WrapError(err, "Create", "DataDict").
			WithField("dict_code").
			WithValue(dict.DictCode)
	}

	return nil
}

// Update 更新数据字典
func (r *dictRepository) Update(ctx context.Context, dict *model.DataDict) error {
	dict.UpdatedAt = time.Now()

	builder := db.Update(r.TableName()).SetMap(map[string]interface{}{
		"dict_name":  dict.DictName,
		"dict_type":  dict.DictType,
		"status":     dict.Status,
		"remark":     dict.Remark,
		"updated_at": dict.UpdatedAt,
	}).WhereEq("id", dict.ID)

	result, err := builder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return WrapError(err, "Update", "DataDict").
			WithEntityID(dict.ID)
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return NewDatabaseError("Update", "DataDict", err).
			WithEntityID(dict.ID).
			WithDetail("step", "get_affected_rows")
	}

	if affected == 0 {
		return NewNotFoundError("DataDict", dict.ID)
	}

	return nil
}

// GetByID 根据ID获取数据字典
func (r *dictRepository) GetByID(ctx context.Context, id string) (*model.DataDict, error) {
	query := r.Query().
		SelectAll().
		WhereEq("id", id).
		Where("status != 'deleted'")

	row := query.QueryRowContext(ctx, r.getQuerier())

	dict := &model.DataDict{}
	err := r.scanDictRow(row, dict)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, NewNotFoundError("DataDict", id)
		}
		return nil, NewDatabaseError("GetByID", "DataDict", err).
			WithEntityID(id)
	}

	return dict, nil
}

// List 重写基础Repository的List方法，处理字典特定的扫描逻辑
func (r *dictRepository) List(ctx context.Context, opts *db.QueryOptions) ([]*model.DataDict, int64, error) {
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
		return nil, 0, NewDatabaseError("List", "DataDict", err).
			WithDetail("step", "count")
	}

	// 查询数据
	rows, err := query.QueryContext(ctx, r.getQuerier())
	if err != nil {
		return nil, 0, NewDatabaseError("List", "DataDict", err).
			WithDetail("step", "query")
	}
	defer rows.Close()

	var dicts []*model.DataDict
	for rows.Next() {
		dict := &model.DataDict{}
		if err := r.scanDictRows(rows, dict); err != nil {
			return nil, 0, NewDatabaseError("List", "DataDict", err).
				WithDetail("step", "scan_rows")
		}
		dicts = append(dicts, dict)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, NewDatabaseError("List", "DataDict", err).
			WithDetail("step", "rows_error")
	}

	return dicts, total, nil
}

// buildQuery 构建查询
func (r *dictRepository) buildQuery(opts *db.QueryOptions) db.QueryBuilder {
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
func (r *dictRepository) applyWhereConditions(query db.QueryBuilder, conditions []db.WhereCondition) db.QueryBuilder {
	for _, condition := range conditions {
		switch condition.Type {
		case db.ConditionEq:
			query = query.WhereEq(condition.Field, condition.Value)
		case db.ConditionIn:
			query = query.WhereIn(condition.Field, condition.Values)
		case db.ConditionLike:
			query = query.WhereLike(condition.Field, condition.Value.(string))
		default:
			// 处理复杂条件，包含多个Values的情况
			if len(condition.Values) > 0 {
				query = query.Where(condition.Field, condition.Values...)
			} else {
				query = query.Where(fmt.Sprintf("%s %s ?", condition.Field, string(condition.Type)), condition.Value)
			}
		}
	}
	return query
}
