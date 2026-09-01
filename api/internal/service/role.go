package service

import (
	"context"
	"database/sql"
	"admin-seed/internal/converter"
	"admin-seed/internal/db"
	"admin-seed/internal/dto/request"
	"admin-seed/internal/dto/response"
	"admin-seed/internal/repository"

	sq "github.com/Masterminds/squirrel"
	"github.com/google/uuid"
)

// RoleService 角色服务
type RoleService struct {
	roleRepo      repository.RoleRepositoryInterface
	userRepo      repository.UserRepositoryInterface
	roleConverter *converter.RoleConverter
	database      *sql.DB
}

// NewRoleService 创建角色服务
func NewRoleService(repoManager repository.RepositoryManager, database *sql.DB) *RoleService {
	return &RoleService{
		roleRepo:      repoManager.Role(),
		userRepo:      repoManager.User(),
		roleConverter: converter.NewRoleConverter(),
		database:      database,
	}
}

// GetRoles 获取角色列表
func (s *RoleService) GetRoles(ctx context.Context, filters *request.RoleFilters) (*response.RoleListResponse, error) {
	// 构建查询选项
	queryOpts := &db.QueryOptions{
		Where: []db.WhereCondition{},
	}

	// 关键词搜索
	if filters.Keyword != "" {
		// 分别添加多个条件，最后会用 AND 连接
		// 这里简化处理，只搜索 name
		queryOpts.Where = append(queryOpts.Where, db.WhereCondition{
			Type:  db.ConditionLike,
			Field: "name",
			Value: filters.Keyword,
		})
	}

	// 类型筛选
	if filters.Type != "" {
		queryOpts.Where = append(queryOpts.Where, db.WhereCondition{
			Type:  db.ConditionEq,
			Field: "type",
			Value: filters.Type,
		})
	}

	// 状态筛选
	if filters.Status != "" {
		queryOpts.Where = append(queryOpts.Where, db.WhereCondition{
			Type:  db.ConditionEq,
			Field: "status",
			Value: filters.Status,
		})
	}

	// 排序
	sortField := "level"
	if filters.SortBy != "" {
		sortField = filters.SortBy
	}
	sortDirection := db.SortAsc
	if filters.SortOrder == "desc" {
		sortDirection = db.SortDesc
	}
	queryOpts.OrderBy = []db.OrderBy{
		{Field: sortField, Direction: sortDirection},
	}

	// 分页
	page := filters.Page
	if page <= 0 {
		page = 1
	}
	size := filters.Size
	if size <= 0 || size > 100 {
		size = 20
	}
	queryOpts.Page = &page
	queryOpts.Size = &size

	// 查询数据
	roles, total, err := s.roleRepo.List(ctx, queryOpts)
	if err != nil {
		return nil, err
	}

	// 转换为响应
	responses := s.roleConverter.ModelsToResponses(roles)

	// 统计每个角色的用户数量
	for _, resp := range responses {
		count, err := s.getUserCountByRoleCode(ctx, resp.Code)
		if err == nil {
			resp.UserCount = count
		}
	}

	return &response.RoleListResponse{
		Items: responses,
		Pagination: &response.RolePaginationInfo{
			Page:       page,
			Size:       size,
			Total:      total,
			TotalPages: (int(total) + size - 1) / size,
		},
	}, nil
}

// GetRole 获取角色详情
func (s *RoleService) GetRole(ctx context.Context, id string) (*response.RoleResponse, error) {
	role, err := s.roleRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	resp := s.roleConverter.ModelToResponse(role)

	// 统计用户数量
	count, err := s.getUserCountByRoleCode(ctx, role.Code)
	if err == nil {
		resp.UserCount = count
	}

	return resp, nil
}

// CreateRole 创建角色
func (s *RoleService) CreateRole(ctx context.Context, req *request.CreateRoleRequest) (*response.RoleResponse, error) {
	// 检查角色代码是否已存在
	existingRole, err := s.roleRepo.GetByCode(ctx, req.Code)
	if err == nil && existingRole != nil {
		return nil, repository.NewAlreadyExistsError("Role", "code", req.Code)
	}

	// 转换为 Model
	role := s.roleConverter.CreateRequestToModel(req)
	role.ID = uuid.New().String()

	// 创建角色
	if err := s.roleRepo.Create(ctx, role); err != nil {
		return nil, err
	}

	return s.roleConverter.ModelToResponse(role), nil
}

// UpdateRole 更新角色
func (s *RoleService) UpdateRole(ctx context.Context, id string, req *request.UpdateRoleRequest) (*response.RoleResponse, error) {
	// 获取角色
	role, err := s.roleRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// 检查是否为内置角色
	if role.IsBuiltIn && req.Code != "" && req.Code != role.Code {
		return nil, repository.NewValidationError("不能修改内置角色的代码", nil)
	}

	// 如果修改了角色代码，检查新代码是否已存在
	if req.Code != "" && req.Code != role.Code {
		existingRole, err := s.roleRepo.GetByCode(ctx, req.Code)
		if err == nil && existingRole != nil {
			return nil, repository.NewAlreadyExistsError("Role", "code", req.Code)
		}
	}

	// 应用更新
	s.roleConverter.UpdateRequestToModel(role, req)

	// 更新角色
	if err := s.roleRepo.Update(ctx, role); err != nil {
		return nil, err
	}

	return s.roleConverter.ModelToResponse(role), nil
}

// DeleteRole 删除角色
func (s *RoleService) DeleteRole(ctx context.Context, id string) error {
	// 获取角色
	role, err := s.roleRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// 检查是否为内置角色
	if role.IsBuiltIn {
		return repository.NewValidationError("不能删除内置角色", nil)
	}

	// 检查是否有用户使用该角色
	count, err := s.getUserCountByRoleCode(ctx, role.Code)
	if err != nil {
		return err
	}
	if count > 0 {
		return repository.NewValidationError("该角色下还有用户，不能删除", map[string]interface{}{
			"userCount": count,
		})
	}

	// 删除角色
	return s.roleRepo.Delete(ctx, id)
}

// getUserCountByRoleCode 统计指定角色的用户数量
func (s *RoleService) getUserCountByRoleCode(ctx context.Context, roleCode string) (int, error) {
	countSQL := sq.Select("COUNT(*)").
		From("users").
		Where(sq.Eq{"role": roleCode})

	sqlStr, args, err := countSQL.ToSql()
	if err != nil {
		return 0, err
	}

	var count int
	err = s.database.QueryRowContext(ctx, sqlStr, args...).Scan(&count)
	if err != nil {
		return 0, err
	}

	return count, nil
}
