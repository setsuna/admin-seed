package repository

import (
	"admin-seed/internal/db"
	"admin-seed/internal/dto/request"
	"admin-seed/internal/model"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// hiddenUsersCondition 生成系统内置账号过滤条件
func hiddenUsersCondition() (string, []interface{}) {
	names := model.SystemHiddenUsernames
	placeholders := make([]string, len(names))
	args := make([]interface{}, len(names))
	for i, name := range names {
		placeholders[i] = "?"
		args[i] = name
	}
	return fmt.Sprintf("username NOT IN (%s)", strings.Join(placeholders, ", ")), args
}

// UserRepositoryInterface 用户Repository接口
type UserRepositoryInterface interface {
	BaseRepository[model.User]

	// 原有方法，保持兼容性
	GetByUsername(ctx context.Context, username string) (*model.User, error)
	UpdatePassword(ctx context.Context, id string, hashedPassword string) error
	UpdateLastLogin(ctx context.Context, id string) error
	GetByDepartment(ctx context.Context, departmentID string) ([]*model.User, error)
	UpdateSecurityLevel(ctx context.Context, id, newLevel, updatedBy, updatedByName, reason string) error

	// 新增查询方法
	ListWithFilters(ctx context.Context, filters *request.UserFilters) ([]*model.User, int64, error)
	FindByRole(ctx context.Context, role string) ([]*model.User, error)
	FindBySecurityLevel(ctx context.Context, level string) ([]*model.User, error)
	FindByStatus(ctx context.Context, status string) ([]*model.User, error)

	// 事务支持
	WithTx(tx *sql.Tx) UserRepositoryInterface
}

// userRepository 用户Repository实现
type userRepository struct {
	*baseRepository[model.User]
	db db.Database
	tx *sql.Tx
}

// NewUserRepository 创建用户Repository
func NewUserRepository(database db.Database) UserRepositoryInterface {
	base := newBaseRepository[model.User](database, "users")
	return &userRepository{
		baseRepository: base,
		db:             database,
	}
}

// WithTx 创建带事务的Repository
func (r *userRepository) WithTx(tx *sql.Tx) UserRepositoryInterface {
	return &userRepository{
		baseRepository: r.baseRepository.withTx(tx),
		db:             r.db,
		tx:             tx,
	}
}

// GetByUsername 根据用户名获取用户
func (r *userRepository) GetByUsername(ctx context.Context, username string) (*model.User, error) {
	query := r.Query().
		SelectAll().
		WhereEq("username", username).
		Where("status != 'deleted'")

	row := query.QueryRowContext(ctx, r.getQuerier())

	user := &model.User{}
	err := r.scanUserRow(row, user)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, NewNotFoundError("User", username).
				WithField("username").
				WithValue(username)
		}
		return nil, NewDatabaseError("GetByUsername", "User", err).
			WithField("username").
			WithValue(username)
	}

	return user, nil
}

// UpdatePassword 更新用户密码
func (r *userRepository) UpdatePassword(ctx context.Context, id string, hashedPassword string) error {
	builder := db.Update(r.TableName()).
		Set("password", hashedPassword).
		Set("password_changed_at", time.Now()).
		SetUpdatedAt().
		WhereEq("id", id)

	result, err := builder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return NewDatabaseError("UpdatePassword", "User", err).
			WithEntityID(id)
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return NewDatabaseError("UpdatePassword", "User", err).
			WithEntityID(id).
			WithDetail("step", "get_affected_rows")
	}

	if affected == 0 {
		return NewNotFoundError("User", id)
	}

	return nil
}

// UpdateLastLogin 更新最后登录时间
func (r *userRepository) UpdateLastLogin(ctx context.Context, id string) error {
	builder := db.Update(r.TableName()).
		Set("last_login_at", time.Now()).
		WhereEq("id", id)

	_, err := builder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return NewDatabaseError("UpdateLastLogin", "User", err).
			WithEntityID(id)
	}

	return nil
}

// GetByDepartment 根据部门ID获取用户列表
func (r *userRepository) GetByDepartment(ctx context.Context, departmentID string) ([]*model.User, error) {
	hiddenSQL, hiddenArgs := hiddenUsersCondition()
	query := r.Query().
		SelectAll().
		WhereEq("department", departmentID).
		Where("status != 'deleted'").
		Where(hiddenSQL, hiddenArgs...).
		OrderByDesc("created_at")

	rows, err := query.QueryContext(ctx, r.getQuerier())
	if err != nil {
		return nil, NewDatabaseError("GetByDepartment", "User", err).
			WithField("department").
			WithValue(departmentID)
	}
	defer rows.Close()

	var users []*model.User
	for rows.Next() {
		user := &model.User{}
		if err := r.scanUserRows(rows, user); err != nil {
			return nil, NewDatabaseError("GetByDepartment", "User", err).
				WithField("department").
				WithValue(departmentID).
				WithDetail("step", "scan_rows")
		}
		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		return nil, NewDatabaseError("GetByDepartment", "User", err).
			WithField("department").
			WithValue(departmentID).
			WithDetail("step", "rows_error")
	}

	return users, nil
}

// UpdateSecurityLevel 更新用户安全级别
func (r *userRepository) UpdateSecurityLevel(ctx context.Context, id, newLevel, updatedBy, updatedByName, reason string) error {
	// 开始事务
	var tx *sql.Tx
	var err error

	if r.tx != nil {
		tx = r.tx
	} else {
		tx, err = r.db.BeginTx(ctx, nil)
		if err != nil {
			return NewTransactionError("BeginTx", err).
				WithDetail("operation", "UpdateSecurityLevel").
				WithEntityID(id)
		}
		defer tx.Rollback()
	}

	// 获取当前安全级别
	var oldLevel string
	err = tx.QueryRowContext(ctx, "SELECT security_level FROM users WHERE id = ?", id).Scan(&oldLevel)
	if err != nil {
		if err == sql.ErrNoRows {
			return NewNotFoundError("User", id)
		}
		return NewDatabaseError("UpdateSecurityLevel", "User", err).
			WithEntityID(id).
			WithDetail("step", "get_old_level")
	}

	// 更新用户安全级别
	_, err = tx.ExecContext(ctx,
		"UPDATE users SET security_level = ?, updated_at = ? WHERE id = ?",
		newLevel, time.Now(), id)
	if err != nil {
		return NewDatabaseError("UpdateSecurityLevel", "User", err).
			WithEntityID(id).
			WithDetail("step", "update_level")
	}

	// 记录变更历史
	historyID := uuid.New().String()
	_, err = tx.ExecContext(ctx, `
		INSERT INTO security_level_histories (
			id, user_id, old_level, new_level, updated_by, 
			updated_by_name, updated_at, reason, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		historyID, id, oldLevel, newLevel, updatedBy,
		updatedByName, time.Now(), reason, time.Now())

	if err != nil {
		return NewDatabaseError("UpdateSecurityLevel", "User", err).
			WithEntityID(id).
			WithDetail("step", "insert_history")
	}

	// 如果不是在外部事务中，提交事务
	if r.tx == nil {
		if err = tx.Commit(); err != nil {
			return NewTransactionError("Commit", err).
				WithDetail("operation", "UpdateSecurityLevel").
				WithEntityID(id)
		}
	}

	return nil
}

// ListWithFilters 根据过滤条件查询用户列表
func (r *userRepository) ListWithFilters(ctx context.Context, filters *request.UserFilters) ([]*model.User, int64, error) {
	// 构建查询选项
	opts := &db.QueryOptions{
		Select: []string{"*"},
		Where:  []db.WhereCondition{},
	}

	// 添加过滤条件
	if filters.Keyword != "" {
		// 关键词搜索多个字段
		keyword := "%" + filters.Keyword + "%"
		opts.Where = append(opts.Where, db.WhereCondition{
			Type:   db.ConditionAnd, // 使用AND类型，但Field中包含OR逻辑
			Field:  "(username LIKE ? OR email LIKE ? OR department_name LIKE ? OR position LIKE ?)",
			Values: []interface{}{keyword, keyword, keyword, keyword},
		})
	}

	if filters.Department != "" {
		opts.Where = append(opts.Where, db.WhereCondition{
			Type:  db.ConditionEq,
			Field: "department",
			Value: filters.Department,
		})
	}

	if filters.Role != "" {
		opts.Where = append(opts.Where, db.WhereCondition{
			Type:  db.ConditionEq,
			Field: "role",
			Value: filters.Role,
		})
	}

	if filters.Status != "" {
		opts.Where = append(opts.Where, db.WhereCondition{
			Type:  db.ConditionEq,
			Field: "status",
			Value: filters.Status,
		})
	}

	if filters.SecurityLevel != "" {
		opts.Where = append(opts.Where, db.WhereCondition{
			Type:  db.ConditionEq,
			Field: "security_level",
			Value: filters.SecurityLevel,
		})
	}

	// 分页
	if filters.Page > 0 && filters.Size > 0 {
		opts.Page = &filters.Page
		opts.Size = &filters.Size
	}

	// 排序
	opts.OrderBy = []db.OrderBy{
		{Field: "created_at", Direction: db.SortDesc},
	}

	return r.List(ctx, opts)
}

// FindByRole 根据角色查找用户
func (r *userRepository) FindByRole(ctx context.Context, role string) ([]*model.User, error) {
	opts := &db.QueryOptions{
		Where: []db.WhereCondition{
			{Type: db.ConditionEq, Field: "role", Value: role},
		},
		OrderBy: []db.OrderBy{
			{Field: "created_at", Direction: db.SortDesc},
		},
	}

	users, _, err := r.List(ctx, opts)
	return users, err
}

// FindBySecurityLevel 根据安全级别查找用户
func (r *userRepository) FindBySecurityLevel(ctx context.Context, level string) ([]*model.User, error) {
	opts := &db.QueryOptions{
		Where: []db.WhereCondition{
			{Type: db.ConditionEq, Field: "security_level", Value: level},
		},
		OrderBy: []db.OrderBy{
			{Field: "created_at", Direction: db.SortDesc},
		},
	}

	users, _, err := r.List(ctx, opts)
	return users, err
}

// FindByStatus 根据状态查找用户
func (r *userRepository) FindByStatus(ctx context.Context, status string) ([]*model.User, error) {
	opts := &db.QueryOptions{
		Where: []db.WhereCondition{
			{Type: db.ConditionEq, Field: "status", Value: status},
		},
		OrderBy: []db.OrderBy{
			{Field: "created_at", Direction: db.SortDesc},
		},
	}

	users, _, err := r.List(ctx, opts)
	return users, err
}

// getExecutor 获取执行器
func (r *userRepository) getExecutor() db.Executor {
	if r.tx != nil {
		return r.tx
	}
	return r.db
}

// getQuerier 获取查询器
func (r *userRepository) getQuerier() db.Querier {
	if r.tx != nil {
		return r.tx
	}
	return r.db
}

// scanUserRow 扫描单行用户数据
func (r *userRepository) scanUserRow(row *sql.Row, user *model.User) error {
	var permissionsStr sql.NullString
	var lastLoginAt sql.NullTime
	var allowedIPs sql.NullString
	var ukeyID sql.NullString
	var name sql.NullString
	var lastLoginIP sql.NullString
	var avatar sql.NullString
	var department sql.NullString
	var departmentName sql.NullString
	var position sql.NullString
	var phone sql.NullString
	var email sql.NullString

	var passwordChangedAt sql.NullTime

	err := row.Scan(
		&user.ID, &user.Username, &user.Password, &email, &user.Role,
		&avatar, &department, &departmentName, &position,
		&phone, &user.Status, &user.SecurityLevel, &allowedIPs, &ukeyID,
		&name, &lastLoginIP, &user.IsHide, &user.IsDeleted, &passwordChangedAt,
		&permissionsStr, &user.CreatedAt, &user.UpdatedAt, &lastLoginAt)

	if err != nil {
		return err
	}

	// 处理可空字符串字段
	if email.Valid {
		user.Email = email.String
	}
	if avatar.Valid {
		user.Avatar = avatar.String
	}
	if department.Valid {
		user.Department = department.String
	}
	if departmentName.Valid {
		user.DepartmentName = departmentName.String
	}
	if position.Valid {
		user.Position = position.String
	}
	if phone.Valid {
		user.Phone = phone.String
	}
	if ukeyID.Valid {
		user.UkeyID = ukeyID.String
	}
	if name.Valid {
		user.Name = name.String
	}
	if lastLoginIP.Valid {
		user.LastLoginIP = lastLoginIP.String
	}

	// 处理权限字段
	if permissionsStr.Valid {
		user.PermissionsStr = permissionsStr.String
		if err := json.Unmarshal([]byte(permissionsStr.String), &user.Permissions); err != nil {
			user.Permissions = []string{}
		}
	}

	// 处理IP白名单
	if allowedIPs.Valid {
		user.AllowedIPs = allowedIPs.String
		if err := json.Unmarshal([]byte(allowedIPs.String), &user.AllowedIPsList); err != nil {
			user.AllowedIPsList = []string{}
		}
	}

	// 处理最后登录时间
	if lastLoginAt.Valid {
		user.LastLoginAt = &lastLoginAt.Time
	}

	// 处理密码修改时间
	if passwordChangedAt.Valid {
		user.PasswordChangedAt = &passwordChangedAt.Time
	}

	return nil
}

// scanUserRows 扫描多行用户数据
func (r *userRepository) scanUserRows(rows *sql.Rows, user *model.User) error {
	var permissionsStr sql.NullString
	var lastLoginAt sql.NullTime
	var allowedIPs sql.NullString
	var ukeyID sql.NullString
	var name sql.NullString
	var lastLoginIP sql.NullString
	var avatar sql.NullString
	var department sql.NullString
	var departmentName sql.NullString
	var position sql.NullString
	var phone sql.NullString
	var email sql.NullString

	var passwordChangedAt sql.NullTime

	err := rows.Scan(
		&user.ID, &user.Username, &user.Password, &email, &user.Role,
		&avatar, &department, &departmentName, &position,
		&phone, &user.Status, &user.SecurityLevel, &allowedIPs, &ukeyID,
		&name, &lastLoginIP, &user.IsHide, &user.IsDeleted, &passwordChangedAt,
		&permissionsStr, &user.CreatedAt, &user.UpdatedAt, &lastLoginAt)

	if err != nil {
		return err
	}

	// 处理可空字符串字段
	if email.Valid {
		user.Email = email.String
	}
	if avatar.Valid {
		user.Avatar = avatar.String
	}
	if department.Valid {
		user.Department = department.String
	}
	if departmentName.Valid {
		user.DepartmentName = departmentName.String
	}
	if position.Valid {
		user.Position = position.String
	}
	if phone.Valid {
		user.Phone = phone.String
	}
	if ukeyID.Valid {
		user.UkeyID = ukeyID.String
	}
	if name.Valid {
		user.Name = name.String
	}
	if lastLoginIP.Valid {
		user.LastLoginIP = lastLoginIP.String
	}

	// 处理权限字段
	if permissionsStr.Valid {
		user.PermissionsStr = permissionsStr.String
		if err := json.Unmarshal([]byte(permissionsStr.String), &user.Permissions); err != nil {
			user.Permissions = []string{}
		}
	}

	// 处理IP白名单
	if allowedIPs.Valid {
		user.AllowedIPs = allowedIPs.String
		if err := json.Unmarshal([]byte(allowedIPs.String), &user.AllowedIPsList); err != nil {
			user.AllowedIPsList = []string{}
		}
	}

	// 处理最后登录时间
	if lastLoginAt.Valid {
		user.LastLoginAt = &lastLoginAt.Time
	}

	// 处理密码修改时间
	if passwordChangedAt.Valid {
		user.PasswordChangedAt = &passwordChangedAt.Time
	}

	return nil
}

// Create 创建用户（重写以处理权限字段）
func (r *userRepository) Create(ctx context.Context, user *model.User) error {
	// 处理权限字段
	permissionsJSON, err := json.Marshal(user.Permissions)
	if err != nil {
		return NewDatabaseError("Create", "User", err).
			WithDetail("step", "marshal_permissions")
	}

	// 生成ID
	if user.ID == "" {
		user.ID = uuid.New().String()
	}

	// 设置时间戳
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now

	// 新用户设置密码修改时间为当前时间
	user.PasswordChangedAt = &now

	builder := db.Insert(r.TableName()).Columns(
		"id", "username", "password", "email", "role", "avatar", "department",
		"department_name", "position", "phone", "status", "security_level",
		"allowed_ips", "ukey_id", "name", "last_login_ip", "is_hide", "is_deleted",
		"password_changed_at", "permissions", "created_at", "updated_at",
	).Values(
		user.ID, user.Username, user.Password, user.Email, user.Role,
		user.Avatar, user.Department, user.DepartmentName, user.Position,
		user.Phone, user.Status, user.SecurityLevel,
		user.AllowedIPs, user.UkeyID, user.Name, user.LastLoginIP, user.IsHide, user.IsDeleted,
		user.PasswordChangedAt, string(permissionsJSON), user.CreatedAt, user.UpdatedAt,
	)

	_, err = builder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return WrapError(err, "Create", "User").
			WithField("username").
			WithValue(user.Username)
	}

	return nil
}

// Update 更新用户（重写以处理权限字段）
func (r *userRepository) Update(ctx context.Context, user *model.User) error {
	// 处理权限字段
	permissionsJSON, err := json.Marshal(user.Permissions)
	if err != nil {
		return NewDatabaseError("Update", "User", err).
			WithEntityID(user.ID).
			WithDetail("step", "marshal_permissions")
	}

	// 设置更新时间
	user.UpdatedAt = time.Now()

	builder := db.Update(r.TableName()).SetMap(map[string]interface{}{
		"username":        user.Username,
		"email":           user.Email,
		"role":            user.Role,
		"avatar":          user.Avatar,
		"department":      user.Department,
		"department_name": user.DepartmentName,
		"position":        user.Position,
		"phone":           user.Phone,
		"status":          user.Status,
		"security_level":  user.SecurityLevel,
		"allowed_ips":     user.AllowedIPs,
		"ukey_id":         user.UkeyID,
		"name":            user.Name,
		"last_login_ip":   user.LastLoginIP,
		"is_hide":         user.IsHide,
		"is_deleted":      user.IsDeleted,
		"permissions":     string(permissionsJSON),
		"updated_at":      user.UpdatedAt,
	}).WhereEq("id", user.ID)

	result, err := builder.ExecContext(ctx, r.getExecutor())
	if err != nil {
		return WrapError(err, "Update", "User").
			WithEntityID(user.ID)
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return NewDatabaseError("Update", "User", err).
			WithEntityID(user.ID).
			WithDetail("step", "get_affected_rows")
	}

	if affected == 0 {
		return NewNotFoundError("User", user.ID)
	}

	return nil
}

// List 重写基础Repository的List方法，处理用户特定的扫描逻辑
func (r *userRepository) List(ctx context.Context, opts *db.QueryOptions) ([]*model.User, int64, error) {
	if opts == nil {
		opts = &db.QueryOptions{}
	}

	// 构建查询
	query := r.buildQuery(opts)

	// 添加默认条件：排除已删除的记录
	query = query.Where("status != 'deleted'")

	// 排除系统内置账号
	hiddenSQL, hiddenArgs := hiddenUsersCondition()
	query = query.Where(hiddenSQL, hiddenArgs...)

	// 查询总数
	countQuery := r.Query().Count().Where("status != 'deleted'").Where(hiddenSQL, hiddenArgs...)
	countQuery = r.applyWhereConditions(countQuery, opts.Where)

	var total int64
	err := countQuery.QueryRowContext(ctx, r.getQuerier()).Scan(&total)
	if err != nil {
		return nil, 0, NewDatabaseError("List", "User", err).
			WithDetail("step", "count")
	}

	// 查询数据
	rows, err := query.QueryContext(ctx, r.getQuerier())
	if err != nil {
		return nil, 0, NewDatabaseError("List", "User", err).
			WithDetail("step", "query")
	}
	defer rows.Close()

	var users []*model.User
	for rows.Next() {
		user := &model.User{}
		if err := r.scanUserRows(rows, user); err != nil {
			return nil, 0, NewDatabaseError("List", "User", err).
				WithDetail("step", "scan_rows")
		}
		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, NewDatabaseError("List", "User", err).
			WithDetail("step", "rows_error")
	}

	return users, total, nil
}

// GetByID 重写GetByID方法以处理权限字段
func (r *userRepository) GetByID(ctx context.Context, id string) (*model.User, error) {
	query := r.Query().
		SelectAll().
		WhereEq("id", id).
		Where("status != 'deleted'")

	row := query.QueryRowContext(ctx, r.getQuerier())

	user := &model.User{}
	err := r.scanUserRow(row, user)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, NewNotFoundError("User", id)
		}
		return nil, NewDatabaseError("GetByID", "User", err).
			WithEntityID(id)
	}

	return user, nil
}

// buildQuery 构建查询（从baseRepository复制的逻辑）
func (r *userRepository) buildQuery(opts *db.QueryOptions) db.QueryBuilder {
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

// applyWhereConditions 应用WHERE条件（从baseRepository复制的逻辑）
func (r *userRepository) applyWhereConditions(query db.QueryBuilder, conditions []db.WhereCondition) db.QueryBuilder {
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
