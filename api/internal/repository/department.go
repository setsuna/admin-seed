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

// DepartmentRepositoryInterface 部门Repository接口
type DepartmentRepositoryInterface interface {
	BaseRepository[model.Department]

	// 部门操作
	GetByCode(ctx context.Context, code string) (*model.Department, error)
	GetByParent(ctx context.Context, parentID string) ([]*model.Department, error)
	GetChildren(ctx context.Context, parentID string) ([]*model.Department, error)
	GetTreeStructure(ctx context.Context) ([]*model.Department, error)
	UpdateEmployeeCount(ctx context.Context, departmentID string) error

	// 查询方法
	ListWithFilters(ctx context.Context, filters *request.DepartmentFilters) ([]*model.Department, int64, error)
	FindByManager(ctx context.Context, managerID string) ([]*model.Department, error)
	FindByLevel(ctx context.Context, level int) ([]*model.Department, error)

	// 事务支持
	WithTx(tx *sql.Tx) DepartmentRepositoryInterface
}

// departmentRepository 部门Repository实现
type departmentRepository struct {
	*baseRepository[model.Department]
	db db.Database
	tx *sql.Tx
}

// NewDepartmentRepository 创建部门Repository
func NewDepartmentRepository(database db.Database) DepartmentRepositoryInterface {
	base := newBaseRepository[model.Department](database, "departments")
	return &departmentRepository{
		baseRepository: base,
		db:             database,
	}
}

// WithTx 创建带事务的Repository
func (r *departmentRepository) WithTx(tx *sql.Tx) DepartmentRepositoryInterface {
	return &departmentRepository{
		baseRepository: r.baseRepository.withTx(tx),
		db:             r.db,
		tx:             tx,
	}
}

// GetByCode 根据代码获取部门
func (r *departmentRepository) GetByCode(ctx context.Context, code string) (*model.Department, error) {
	query := r.Query().
		SelectAll().
		WhereEq("code", code).
		Where("status != 'deleted'")

	row := query.QueryRowContext(ctx, r.getQuerier())

	dept := &model.Department{}
	err := r.scanDepartmentRow(row, dept)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, NewNotFoundError("Department", code).
				WithField("code").
				WithValue(code)
		}
		return nil, NewDatabaseError("GetByCode", "Department", err).
			WithField("code").
			WithValue(code)
	}

	return dept, nil
}

// GetByParent 根据父部门ID获取子部门列表
func (r *departmentRepository) GetByParent(ctx context.Context, parentID string) ([]*model.Department, error) {
	query := r.Query().
		SelectAll().
		WhereEq("parent_id", parentID).
		Where("status != 'deleted'").
		OrderBy("sort", "ASC").
		OrderBy("created_at", "ASC")

	rows, err := query.QueryContext(ctx, r.getQuerier())
	if err != nil {
		return nil, NewDatabaseError("GetByParent", "Department", err).
			WithField("parent_id").
			WithValue(parentID)
	}
	defer rows.Close()

	var departments []*model.Department
	for rows.Next() {
		dept := &model.Department{}
		if err := r.scanDepartmentRows(rows, dept); err != nil {
			return nil, NewDatabaseError("GetByParent", "Department", err).
				WithField("parent_id").
				WithValue(parentID).
				WithDetail("step", "scan_rows")
		}
		departments = append(departments, dept)
	}

	if err = rows.Err(); err != nil {
		return nil, NewDatabaseError("GetByParent", "Department", err).
			WithField("parent_id").
			WithValue(parentID).
			WithDetail("step", "rows_error")
	}

	return departments, nil
}

// GetChildren 获取子部门（包括所有层级）
func (r *departmentRepository) GetChildren(ctx context.Context, parentID string) ([]*model.Department, error) {
	// 这里使用递归查询所有子部门
	// 由于SQL的限制，我们使用多次查询来实现
	var allChildren []*model.Department

	// 获取直接子部门
	children, err := r.GetByParent(ctx, parentID)
	if err != nil {
		return nil, err
	}

	allChildren = append(allChildren, children...)

	// 递归获取子部门的子部门
	for _, child := range children {
		grandChildren, err := r.GetChildren(ctx, child.ID)
		if err != nil {
			return nil, err
		}
		allChildren = append(allChildren, grandChildren...)
	}

	return allChildren, nil
}

// GetTreeStructure 获取部门树形结构
func (r *departmentRepository) GetTreeStructure(ctx context.Context) ([]*model.Department, error) {
	query := r.Query().
		SelectAll().
		Where("status != 'deleted'").
		OrderBy("level", "ASC").
		OrderBy("sort", "ASC").
		OrderBy("created_at", "ASC")

	rows, err := query.QueryContext(ctx, r.getQuerier())
	if err != nil {
		return nil, NewDatabaseError("GetTreeStructure", "Department", err)
	}
	defer rows.Close()

	var departments []*model.Department
	for rows.Next() {
		dept := &model.Department{}
		if err := r.scanDepartmentRows(rows, dept); err != nil {
			return nil, NewDatabaseError("GetTreeStructure", "Department", err).
				WithDetail("step", "scan_rows")
		}
		departments = append(departments, dept)
	}

	if err = rows.Err(); err != nil {
		return nil, NewDatabaseError("GetTreeStructure", "Department", err).
			WithDetail("step", "rows_error")
	}

	return departments, nil
}

// UpdateEmployeeCount 更新部门员工数量
func (r *departmentRepository) UpdateEmployeeCount(ctx context.Context, departmentID string) error {
	// 统计部门员工数量
	countQuery := db.Select("users").
		Count().
		WhereEq("department", departmentID).
		Where("status != 'deleted'")

	var count int64
	err := countQuery.QueryRowContext(ctx, r.getQuerier()).Scan(&count)
	if err != nil {
		return NewDatabaseError("UpdateEmployeeCount", "Department", err).
			WithEntityID(departmentID).
			WithDetail("step", "count")
	}

	// 更新部门员工数量
	updateBuilder := db.Update(r.TableName()).
		Set("employee_count", count).
		SetUpdatedAt().
		WhereEq("id", departmentID)

	_, err = updateBuilder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return NewDatabaseError("UpdateEmployeeCount", "Department", err).
			WithEntityID(departmentID).
			WithDetail("step", "update")
	}

	return nil
}

// ListWithFilters 根据过滤条件查询部门列表
func (r *departmentRepository) ListWithFilters(ctx context.Context, filters *request.DepartmentFilters) ([]*model.Department, int64, error) {
	opts := &db.QueryOptions{
		Select: []string{"*"},
		Where:  []db.WhereCondition{},
	}

	// 关键词搜索
	if filters.Keyword != "" {
		// 关键词搜索多个字段
		keyword := "%" + filters.Keyword + "%"
		opts.Where = append(opts.Where, db.WhereCondition{
			Type:   db.ConditionAnd, // 使用AND类型，但Field中包含OR逻辑
			Field:  "(name LIKE ? OR code LIKE ? OR description LIKE ?)",
			Values: []interface{}{keyword, keyword, keyword},
		})
	}

	// 状态
	if filters.Status != "" {
		opts.Where = append(opts.Where, db.WhereCondition{
			Type:  db.ConditionEq,
			Field: "status",
			Value: filters.Status,
		})
	}

	// 负责人
	if filters.ManagerID != "" {
		opts.Where = append(opts.Where, db.WhereCondition{
			Type:  db.ConditionEq,
			Field: "manager_id",
			Value: filters.ManagerID,
		})
	}

	// 分页
	if filters.Page > 0 && filters.Size > 0 {
		opts.Page = &filters.Page
		opts.Size = &filters.Size
	}

	// 排序
	opts.OrderBy = []db.OrderBy{
		{Field: "level", Direction: db.SortAsc},
		{Field: "sort", Direction: db.SortAsc},
		{Field: "created_at", Direction: db.SortAsc},
	}

	return r.List(ctx, opts)
}

// FindByManager 根据负责人查找部门
func (r *departmentRepository) FindByManager(ctx context.Context, managerID string) ([]*model.Department, error) {
	opts := &db.QueryOptions{
		Where: []db.WhereCondition{
			{Type: db.ConditionEq, Field: "manager_id", Value: managerID},
		},
		OrderBy: []db.OrderBy{
			{Field: "level", Direction: db.SortAsc},
			{Field: "sort", Direction: db.SortAsc},
		},
	}

	departments, _, err := r.List(ctx, opts)
	return departments, err
}

// FindByLevel 根据层级查找部门
func (r *departmentRepository) FindByLevel(ctx context.Context, level int) ([]*model.Department, error) {
	opts := &db.QueryOptions{
		Where: []db.WhereCondition{
			{Type: db.ConditionEq, Field: "level", Value: level},
		},
		OrderBy: []db.OrderBy{
			{Field: "sort", Direction: db.SortAsc},
			{Field: "created_at", Direction: db.SortAsc},
		},
	}

	departments, _, err := r.List(ctx, opts)
	return departments, err
}

// getExecutor 获取执行器
func (r *departmentRepository) getExecutor() db.Executor {
	if r.tx != nil {
		return r.tx
	}
	return r.db
}

// getQuerier 获取查询器
func (r *departmentRepository) getQuerier() db.Querier {
	if r.tx != nil {
		return r.tx
	}
	return r.db
}

// scanDepartmentRow 扫描部门单行数据
func (r *departmentRepository) scanDepartmentRow(row *sql.Row, dept *model.Department) error {
	return row.Scan(
		&dept.ID, &dept.Name, &dept.Code, &dept.Description, &dept.ParentID,
		&dept.ManagerID, &dept.ManagerName, &dept.Level, &dept.Path, &dept.Sort,
		&dept.Status, &dept.Phone, &dept.Email, &dept.Address, &dept.EmployeeCount,
		&dept.CreatedAt, &dept.UpdatedAt)
}

// scanDepartmentRows 扫描部门多行数据
func (r *departmentRepository) scanDepartmentRows(rows *sql.Rows, dept *model.Department) error {
	return rows.Scan(
		&dept.ID, &dept.Name, &dept.Code, &dept.Description, &dept.ParentID,
		&dept.ManagerID, &dept.ManagerName, &dept.Level, &dept.Path, &dept.Sort,
		&dept.Status, &dept.Phone, &dept.Email, &dept.Address, &dept.EmployeeCount,
		&dept.CreatedAt, &dept.UpdatedAt)
}

// Create 创建部门
func (r *departmentRepository) Create(ctx context.Context, dept *model.Department) error {
	if dept.ID == "" {
		dept.ID = uuid.New().String()
	}

	now := time.Now()
	dept.CreatedAt = now
	dept.UpdatedAt = now

	builder := db.Insert(r.TableName()).Columns(
		"id", "name", "code", "description", "parent_id", "manager_id", "manager_name",
		"level", "path", "sort", "status", "phone", "email", "address",
		"employee_count", "created_at", "updated_at",
	).Values(
		dept.ID, dept.Name, dept.Code, dept.Description, dept.ParentID, dept.ManagerID, dept.ManagerName,
		dept.Level, dept.Path, dept.Sort, dept.Status, dept.Phone, dept.Email, dept.Address,
		dept.EmployeeCount, dept.CreatedAt, dept.UpdatedAt,
	)

	_, err := builder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return WrapError(err, "Create", "Department").
			WithField("code").
			WithValue(dept.Code)
	}

	return nil
}

// Update 更新部门
func (r *departmentRepository) Update(ctx context.Context, dept *model.Department) error {
	dept.UpdatedAt = time.Now()

	builder := db.Update(r.TableName()).SetMap(map[string]interface{}{
		"name":           dept.Name,
		"code":           dept.Code,
		"description":    dept.Description,
		"parent_id":      dept.ParentID,
		"manager_id":     dept.ManagerID,
		"manager_name":   dept.ManagerName,
		"level":          dept.Level,
		"path":           dept.Path,
		"sort":           dept.Sort,
		"status":         dept.Status,
		"phone":          dept.Phone,
		"email":          dept.Email,
		"address":        dept.Address,
		"employee_count": dept.EmployeeCount,
		"updated_at":     dept.UpdatedAt,
	}).WhereEq("id", dept.ID)

	result, err := builder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return WrapError(err, "Update", "Department").
			WithEntityID(dept.ID)
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return NewDatabaseError("Update", "Department", err).
			WithEntityID(dept.ID).
			WithDetail("step", "get_affected_rows")
	}

	if affected == 0 {
		return NewNotFoundError("Department", dept.ID)
	}

	return nil
}

// GetByID 根据ID获取部门
func (r *departmentRepository) GetByID(ctx context.Context, id string) (*model.Department, error) {
	query := r.Query().
		SelectAll().
		WhereEq("id", id).
		Where("status != 'deleted'")

	row := query.QueryRowContext(ctx, r.getQuerier())

	dept := &model.Department{}
	err := r.scanDepartmentRow(row, dept)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, NewNotFoundError("Department", id)
		}
		return nil, NewDatabaseError("GetByID", "Department", err).
			WithEntityID(id)
	}

	return dept, nil
}

// List 重写基础Repository的List方法，处理部门特定的扫描逻辑
func (r *departmentRepository) List(ctx context.Context, opts *db.QueryOptions) ([]*model.Department, int64, error) {
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
		return nil, 0, NewDatabaseError("List", "Department", err).
			WithDetail("step", "count")
	}

	// 查询数据
	rows, err := query.QueryContext(ctx, r.getQuerier())
	if err != nil {
		return nil, 0, NewDatabaseError("List", "Department", err).
			WithDetail("step", "query")
	}
	defer rows.Close()

	var departments []*model.Department
	for rows.Next() {
		dept := &model.Department{}
		if err := r.scanDepartmentRows(rows, dept); err != nil {
			return nil, 0, NewDatabaseError("List", "Department", err).
				WithDetail("step", "scan_rows")
		}
		departments = append(departments, dept)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, NewDatabaseError("List", "Department", err).
			WithDetail("step", "rows_error")
	}

	return departments, total, nil
}

// buildQuery 构建查询
func (r *departmentRepository) buildQuery(opts *db.QueryOptions) db.QueryBuilder {
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

	// 如果没有指定排序，默认按层级和排序号
	if len(opts.OrderBy) == 0 {
		query = query.OrderBy("level", "ASC").OrderBy("sort", "ASC")
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
func (r *departmentRepository) applyWhereConditions(query db.QueryBuilder, conditions []db.WhereCondition) db.QueryBuilder {
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
