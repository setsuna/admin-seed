package repository

import (
	"admin-seed/internal/db"
	"admin-seed/internal/dto/request"
	"admin-seed/internal/model"
	"context"
	"database/sql"
)

// OperationLogRepositoryInterface 操作日志Repository接口
type OperationLogRepositoryInterface interface {
	Create(ctx context.Context, log *model.OperationLog) error
	List(ctx context.Context, filters *request.OperationLogFilters) ([]*model.OperationLog, int64, error)
	GetThreeAdminLogs(ctx context.Context, filters *request.OperationLogFilters) ([]*model.OperationLog, int64, error)
	CountAll(ctx context.Context) (int64, error)
	DeleteBefore(ctx context.Context, beforeTime string) (int64, error)
	WithTx(tx *sql.Tx) OperationLogRepositoryInterface
}

// operationLogRepository 操作日志Repository实现
type operationLogRepository struct {
	*baseRepository[model.OperationLog]
}

// NewOperationLogRepository 创建操作日志Repository
func NewOperationLogRepository(database interface{}) OperationLogRepositoryInterface {
	// 处理不同类型的数据库连接
	var dbInterface db.Database

	switch d := database.(type) {
	case *sql.DB:
		// 包装 *sql.DB 为 db.Database 接口
		dbInterface = &databaseWrapper{db: d}
	case db.Database:
		dbInterface = d
	default:
		panic("unsupported database type")
	}

	base := newBaseRepository[model.OperationLog](dbInterface, "operation_logs")
	return &operationLogRepository{
		baseRepository: base,
	}
}

// Create 创建操作日志
func (r *operationLogRepository) Create(ctx context.Context, log *model.OperationLog) error {
	query := db.Insert(r.tableName).
		Columns(
			"request_id", "timestamp", "operator", "operator_id", "operator_name", "operator_role",
			"ip_address", "module", "action_category", "action_description",
			"operation_result", "before_data", "after_data", "change_details",
		).
		Values(
			log.RequestID, log.Timestamp, log.Operator, log.OperatorID, log.OperatorName, log.OperatorRole,
			log.IPAddress, log.Module, log.ActionCategory, log.ActionDescription,
			log.OperationResult, log.BeforeData, log.AfterData, log.ChangeDetails,
		)

	result, err := query.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return WrapError(err, "Create", "OperationLog")
	}

	id, err := result.LastInsertId()
	if err != nil {
		return WrapError(err, "Create", "OperationLog")
	}

	log.ID = id
	return nil
}

// List 查询操作日志列表
func (r *operationLogRepository) List(ctx context.Context, filters *request.OperationLogFilters) ([]*model.OperationLog, int64, error) {
	return r.listWithFilters(ctx, filters, false)
}

// GetThreeAdminLogs 查询三员操作日志
func (r *operationLogRepository) GetThreeAdminLogs(ctx context.Context, filters *request.OperationLogFilters) ([]*model.OperationLog, int64, error) {
	return r.listWithFilters(ctx, filters, true)
}

// listWithFilters 通用查询方法
func (r *operationLogRepository) listWithFilters(ctx context.Context, filters *request.OperationLogFilters, threeAdminOnly bool) ([]*model.OperationLog, int64, error) {
	query := r.Query().SelectAll()

	// 三员日志过滤：按操作人过滤
	if threeAdminOnly {
		// 只显示 sysadm 和 secadm 的日志
		query = query.WhereIn("operator", []interface{}{"sysadm", "secadm"})
	} else {
		// 排除 sysadm 和 secadm 的日志
		query = query.Where("operator NOT IN (?, ?)", "sysadm", "secadm")
	}

	// 时间范围过滤
	if filters.StartTime != "" {
		query = query.Where("timestamp >= ?", filters.StartTime)
	}
	if filters.EndTime != "" {
		query = query.Where("timestamp <= ?", filters.EndTime)
	}

	// 操作人过滤
	if filters.Operator != "" {
		query = query.WhereLike("operator", filters.Operator)
	}
	if filters.OperatorID != "" {
		query = query.WhereEq("operator_id", filters.OperatorID)
	}
	if filters.OperatorRole != "" {
		query = query.WhereEq("operator_role", filters.OperatorRole)
	}

	// 模块和行为过滤
	if filters.Module != "" {
		query = query.WhereEq("module", filters.Module)
	}
	if filters.ActionCategory != "" {
		query = query.WhereEq("action_category", filters.ActionCategory)
	}

	// IP地址过滤
	if filters.IPAddress != "" {
		query = query.WhereEq("ip_address", filters.IPAddress)
	}

	// 操作结果过滤
	if filters.Result != "" {
		query = query.WhereEq("operation_result", filters.Result)
	}

	// 关键词搜索
	if filters.Keyword != "" {
		query = query.Where("(operator LIKE ? OR action_description LIKE ?)",
			"%"+filters.Keyword+"%", "%"+filters.Keyword+"%")
	}

	// 统计总数
	total, err := r.count(ctx, query)
	if err != nil {
		return nil, 0, WrapError(err, "List", "OperationLog")
	}

	// 排序
	sortBy := "timestamp"
	if filters.SortBy != "" {
		sortBy = filters.SortBy
	}
	sortOrder := string(db.SortDesc)
	if filters.SortOrder == "asc" {
		sortOrder = string(db.SortAsc)
	}
	query = query.OrderBy(sortBy, sortOrder)

	// 分页
	page := 1
	if filters.Page > 0 {
		page = filters.Page
	}
	size := 20
	if filters.Size > 0 && filters.Size <= 100 {
		size = filters.Size
	}
	query = query.Page(page, size)

	// 执行查询
	rows, err := query.QueryContext(ctx, r.getQuerier())
	if err != nil {
		return nil, 0, WrapError(err, "List", "OperationLog")
	}
	defer rows.Close()

	logs := make([]*model.OperationLog, 0)
	for rows.Next() {
		log := &model.OperationLog{}
		err := rows.Scan(
			&log.ID, &log.RequestID, &log.Timestamp, &log.Operator, &log.OperatorID, &log.OperatorName,
			&log.OperatorRole, &log.IPAddress, &log.Module, &log.ActionCategory,
			&log.ActionDescription, &log.OperationResult, &log.BeforeData,
			&log.AfterData, &log.ChangeDetails, &log.CreatedAt, &log.UpdatedAt,
		)
		if err != nil {
			return nil, 0, WrapError(err, "List", "OperationLog")
		}
		logs = append(logs, log)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, WrapError(err, "List", "OperationLog")
	}

	return logs, total, nil
}

// count 统计数量
func (r *operationLogRepository) count(ctx context.Context, query db.QueryBuilder) (int64, error) {
	countQuery := query.Count()
	row := countQuery.QueryRowContext(ctx, r.getQuerier())

	var count int64
	if err := row.Scan(&count); err != nil {
		return 0, err
	}

	return count, nil
}

// CountAll 统计所有日志数量
func (r *operationLogRepository) CountAll(ctx context.Context) (int64, error) {
	query := r.Query().Count()
	row := query.QueryRowContext(ctx, r.getQuerier())

	var count int64
	if err := row.Scan(&count); err != nil {
		return 0, WrapError(err, "CountAll", "OperationLog")
	}

	return count, nil
}

// DeleteBefore 删除指定时间之前的日志
func (r *operationLogRepository) DeleteBefore(ctx context.Context, beforeTime string) (int64, error) {
	query := db.Delete(r.tableName).Where("timestamp < ?", beforeTime)

	result, err := query.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return 0, WrapError(err, "DeleteBefore", "OperationLog")
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return 0, WrapError(err, "DeleteBefore", "OperationLog")
	}

	return affected, nil
}

// WithTx 使用事务
func (r *operationLogRepository) WithTx(tx *sql.Tx) OperationLogRepositoryInterface {
	base := r.baseRepository.withTx(tx)
	return &operationLogRepository{
		baseRepository: base,
	}
}
