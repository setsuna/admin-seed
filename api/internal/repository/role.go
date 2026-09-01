package repository

import (
	"admin-seed/internal/db"
	"admin-seed/internal/model"
	"context"
	"database/sql"
	"encoding/json"
)

// RoleRepositoryInterface 角色Repository接口
type RoleRepositoryInterface interface {
	BaseRepository[model.Role]
	GetByCode(ctx context.Context, code string) (*model.Role, error)
	ListWithUserCount(ctx context.Context, query *db.QueryOptions) ([]*model.Role, int64, error)
}

// roleRepository 角色Repository实现
type roleRepository struct {
	*baseRepository[model.Role]
}

// NewRoleRepository 创建角色Repository
func NewRoleRepository(database *sql.DB) RoleRepositoryInterface {
	base := newBaseRepository[model.Role](database, "roles")
	return &roleRepository{
		baseRepository: base,
	}
}

// newRoleRepositoryWithTx 创建带事务的角色Repository
func newRoleRepositoryWithTx(tx *sql.Tx) RoleRepositoryInterface {
	// 创建一个基础的repository，但使用tx作为db
	txWrapper := &transactionWrapper{tx: tx}
	base := newBaseRepository[model.Role](txWrapper, "roles")
	return &roleRepository{
		baseRepository: base,
	}
}

// GetByCode 根据角色代码获取角色
func (r *roleRepository) GetByCode(ctx context.Context, code string) (*model.Role, error) {
	query := r.Query().
		SelectAll().
		WhereEq("code", code)

	sqlStr, args, err := query.ToSQL()
	if err != nil {
		return nil, NewDatabaseError("GetByCode", "Role", err)
	}

	row := r.getQuerier().QueryRowContext(ctx, sqlStr, args...)

	role := &model.Role{}
	err = row.Scan(
		&role.ID,
		&role.Name,
		&role.Code,
		&role.Description,
		&role.PermissionsStr,
		&role.Status,
		&role.Type,
		&role.Level,
		&role.IsBuiltIn,
		&role.DataScope,
		&role.MetadataStr,
		&role.CreatedAt,
		&role.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, NewNotFoundError("Role", code)
	}

	if err != nil {
		return nil, NewDatabaseError("GetByCode", "Role", err)
	}

	// 解析 JSON 字段
	if err := r.parseJSONFields(role); err != nil {
		return nil, err
	}

	return role, nil
}

// ListWithUserCount 获取角色列表（包含用户数量统计）
func (r *roleRepository) ListWithUserCount(ctx context.Context, query *db.QueryOptions) ([]*model.Role, int64, error) {
	// 先获取基本列表
	roles, total, err := r.List(ctx, query)
	if err != nil {
		return nil, 0, err
	}

	// 为每个角色统计用户数量 - 这部分在service层处理更合适

	return roles, total, nil
}

// Create 创建角色（重写以处理JSON字段）
func (r *roleRepository) Create(ctx context.Context, role *model.Role) error {
	// 序列化 JSON 字段
	if err := r.serializeJSONFields(role); err != nil {
		return err
	}

	builder := db.Insert(r.tableName).
		Columns(
			"id", "name", "code", "description", "permissions",
			"status", "type", "level", "is_built_in", "data_scope", "metadata",
			"created_at", "updated_at",
		).
		Values(
			role.ID, role.Name, role.Code, role.Description, role.PermissionsStr,
			role.Status, role.Type, role.Level, role.IsBuiltIn, role.DataScope, role.MetadataStr,
			role.CreatedAt, role.UpdatedAt,
		)

	_, err := builder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return WrapError(err, "Create", "Role").
			WithField("code").
			WithValue(role.Code)
	}

	return nil
}

// Update 更新角色（重写以处理JSON字段）
func (r *roleRepository) Update(ctx context.Context, role *model.Role) error {
	// 序列化 JSON 字段
	if err := r.serializeJSONFields(role); err != nil {
		return err
	}

	builder := db.Update(r.tableName).
		SetMap(map[string]interface{}{
			"name":        role.Name,
			"code":        role.Code,
			"description": role.Description,
			"permissions": role.PermissionsStr,
			"status":      role.Status,
			"type":        role.Type,
			"level":       role.Level,
			"is_built_in": role.IsBuiltIn,
			"data_scope":  role.DataScope,
			"metadata":    role.MetadataStr,
			"updated_at":  role.UpdatedAt,
		}).
		WhereEq("id", role.ID)

	result, err := builder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return WrapError(err, "Update", "Role").
			WithEntityID(role.ID)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return NewDatabaseError("Update", "Role", err)
	}

	if rowsAffected == 0 {
		return NewNotFoundError("Role", role.ID)
	}

	return nil
}

// GetByID 根据ID获取角色（重写以处理JSON字段）
func (r *roleRepository) GetByID(ctx context.Context, id string) (*model.Role, error) {
	query := r.Query().
		SelectAll().
		WhereEq("id", id)

	sqlStr, args, err := query.ToSQL()
	if err != nil {
		return nil, NewDatabaseError("GetByID", "Role", err)
	}

	row := r.getQuerier().QueryRowContext(ctx, sqlStr, args...)

	role := &model.Role{}
	err = row.Scan(
		&role.ID,
		&role.Name,
		&role.Code,
		&role.Description,
		&role.PermissionsStr,
		&role.Status,
		&role.Type,
		&role.Level,
		&role.IsBuiltIn,
		&role.DataScope,
		&role.MetadataStr,
		&role.CreatedAt,
		&role.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, NewNotFoundError("Role", id)
	}

	if err != nil {
		return nil, NewDatabaseError("GetByID", "Role", err).WithEntityID(id)
	}

	// 解析 JSON 字段
	if err := r.parseJSONFields(role); err != nil {
		return nil, err
	}

	return role, nil
}

// List 获取角色列表（重写以处理JSON字段）
func (r *roleRepository) List(ctx context.Context, queryOpts *db.QueryOptions) ([]*model.Role, int64, error) {
	// 构建查询
	query := r.Query().SelectAll()

	if queryOpts != nil {
		// 应用筛选条件
		for _, where := range queryOpts.Where {
			query = r.applyWhereCondition(query, where)
		}

		// 应用排序
		for _, order := range queryOpts.OrderBy {
			if order.Direction == db.SortDesc {
				query = query.OrderByDesc(order.Field)
			} else {
				query = query.OrderByAsc(order.Field)
			}
		}

		// 应用分页
		if queryOpts.Page != nil && queryOpts.Size != nil {
			query = query.Page(*queryOpts.Page, *queryOpts.Size)
		}
	}

	// 获取总数
	total, err := r.Count(ctx, queryOpts)
	if err != nil {
		return nil, 0, err
	}

	// 执行查询
	sqlStr, args, err := query.ToSQL()
	if err != nil {
		return nil, 0, NewDatabaseError("List", "Role", err)
	}

	rows, err := r.getQuerier().QueryContext(ctx, sqlStr, args...)
	if err != nil {
		return nil, 0, NewDatabaseError("List", "Role", err)
	}
	defer rows.Close()

	var roles []*model.Role
	for rows.Next() {
		role := &model.Role{}
		err := rows.Scan(
			&role.ID,
			&role.Name,
			&role.Code,
			&role.Description,
			&role.PermissionsStr,
			&role.Status,
			&role.Type,
			&role.Level,
			&role.IsBuiltIn,
			&role.DataScope,
			&role.MetadataStr,
			&role.CreatedAt,
			&role.UpdatedAt,
		)
		if err != nil {
			return nil, 0, NewDatabaseError("List", "Role", err)
		}

		// 解析 JSON 字段
		if err := r.parseJSONFields(role); err != nil {
			return nil, 0, err
		}

		roles = append(roles, role)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, NewDatabaseError("List", "Role", err)
	}

	return roles, total, nil
}

// applyWhereCondition 应用WHERE条件
func (r *roleRepository) applyWhereCondition(query db.QueryBuilder, where db.WhereCondition) db.QueryBuilder {
	switch where.Type {
	case db.ConditionEq:
		return query.WhereEq(where.Field, where.Value)
	case db.ConditionLike:
		return query.WhereLike(where.Field, where.Value.(string))
	case db.ConditionIn:
		return query.WhereIn(where.Field, where.Values)
	default:
		return query
	}
}

// serializeJSONFields 序列化 JSON 字段
func (r *roleRepository) serializeJSONFields(role *model.Role) error {
	// 序列化 permissions
	if role.Permissions != nil {
		permissionsJSON, err := json.Marshal(role.Permissions)
		if err != nil {
			return NewDatabaseError("Serialize", "Role", err)
		}
		role.PermissionsStr = string(permissionsJSON)
	}

	// 序列化 metadata
	if role.Metadata != nil {
		metadataJSON, err := json.Marshal(role.Metadata)
		if err != nil {
			return NewDatabaseError("Serialize", "Role", err)
		}
		role.MetadataStr = string(metadataJSON)
	}

	return nil
}

// parseJSONFields 解析 JSON 字段
func (r *roleRepository) parseJSONFields(role *model.Role) error {
	// 解析 permissions
	if role.PermissionsStr != "" {
		if err := json.Unmarshal([]byte(role.PermissionsStr), &role.Permissions); err != nil {
			return NewDatabaseError("Parse", "Role", err)
		}
	}

	// 解析 metadata
	if role.MetadataStr != "" {
		role.Metadata = &model.RoleMetadata{}
		if err := json.Unmarshal([]byte(role.MetadataStr), role.Metadata); err != nil {
			return NewDatabaseError("Parse", "Role", err)
		}
	}

	return nil
}
