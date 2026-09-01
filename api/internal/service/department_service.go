package service

import (
	"context"
	"fmt"
	"math/rand"
	"admin-seed/internal/common"
	"admin-seed/internal/converter"
	"admin-seed/internal/dto/request"
	"admin-seed/internal/dto/response"
	"admin-seed/internal/model"
	"admin-seed/internal/repository"
	"strings"
)

// DepartmentService 部门服务
type DepartmentService struct {
	deptRepo  repository.DepartmentRepositoryInterface
	userRepo  repository.UserRepositoryInterface
	converter *converter.DepartmentConverter
}

// NewDepartmentService 创建部门服务
func NewDepartmentService(deptRepo repository.DepartmentRepositoryInterface, userRepo repository.UserRepositoryInterface) *DepartmentService {
	return &DepartmentService{
		deptRepo:  deptRepo,
		userRepo:  userRepo,
		converter: converter.NewDepartmentConverter(),
	}
}

// GetDepartments 获取部门列表（分页）
func (s *DepartmentService) GetDepartments(filters *request.DepartmentFilters) ([]*response.DepartmentTreeResponse, int64, error) {
	ctx := context.Background()

	// 查询部门列表
	departments, total, err := s.deptRepo.ListWithFilters(ctx, filters)
	if err != nil {
		return nil, 0, err
	}

	// 转换为响应格式
	responses := make([]*response.DepartmentTreeResponse, len(departments))
	for i, dept := range departments {
		resp := s.converter.ModelToTreeResponse(dept, nil)
		responses[i] = &resp
	}

	return responses, total, nil
}

// GetDepartmentTree 获取部门树形结构
func (s *DepartmentService) GetDepartmentTree() ([]response.DepartmentTreeResponse, error) {
	ctx := context.Background()

	// 获取所有部门
	departments, err := s.deptRepo.GetTreeStructure(ctx)
	if err != nil {
		return nil, err
	}

	// 构建树形结构
	return s.buildTree(departments, nil), nil
}

// GetDepartment 获取部门详情
func (s *DepartmentService) GetDepartment(id string) (*response.DepartmentTreeResponse, error) {
	ctx := context.Background()

	dept, err := s.deptRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// 获取子部门
	children, err := s.deptRepo.GetByParent(ctx, id)
	if err != nil {
		return nil, err
	}

	childrenResp := make([]response.DepartmentTreeResponse, len(children))
	for i, child := range children {
		childrenResp[i] = s.converter.ModelToTreeResponse(child, nil)
	}

	resp := s.converter.ModelToTreeResponse(dept, childrenResp)
	return &resp, nil
}

// CreateDepartment 创建部门
func (s *DepartmentService) CreateDepartment(req *request.CreateDepartmentRequest) (*response.DepartmentTreeResponse, error) {
	ctx := context.Background()

	// 如果编码为空，自动生成唯一编码
	if req.Code == "" {
		req.Code = fmt.Sprintf("%04d", rand.Intn(10000))
	}

	// 检查部门编码是否已存在
	existingDept, err := s.deptRepo.GetByCode(ctx, req.Code)
	if err != nil && !repository.IsNotFoundError(err) {
		return nil, err
	}
	if existingDept != nil {
		return nil, common.NewAppError(
			common.ERROR_ALREADY_EXISTS,
			"部门编码已被占用，请使用其他编码",
		)
	}

	// 转换请求为模型
	dept := s.converter.CreateRequestToModel(req)

	// 验证负责人是否存在（负责人ID非空时才校验）
	if req.ManagerID != "" {
		manager, err := s.userRepo.GetByID(ctx, req.ManagerID)
		if err != nil {
			if repository.IsNotFoundError(err) {
				return nil, common.NewAppError(
					common.ERROR_NOT_FOUND,
					"所选负责人不存在，请重新选择",
				)
			}
			return nil, err
		}
		dept.ManagerName = manager.Username
	}

	// 计算层级和路径
	if req.ParentID != nil && *req.ParentID != "" {
		parentDept, err := s.deptRepo.GetByID(ctx, *req.ParentID)
		if err != nil {
			if repository.IsNotFoundError(err) {
				return nil, common.NewAppError(
					common.ERROR_NOT_FOUND,
					"所选上级部门不存在，请重新选择",
				)
			}
			return nil, err
		}
		dept.Level = parentDept.Level + 1
		dept.Path = parentDept.Path + "/" + dept.ID
	} else {
		dept.Level = 0
		dept.Path = "/" + dept.ID
	}

	// 创建部门
	if err := s.deptRepo.Create(ctx, dept); err != nil {
		return nil, err
	}

	resp := s.converter.ModelToTreeResponse(dept, nil)
	return &resp, nil
}

// UpdateDepartment 更新部门
func (s *DepartmentService) UpdateDepartment(id string, req *request.UpdateDepartmentRequest) (*response.DepartmentTreeResponse, error) {
	ctx := context.Background()

	// 获取现有部门
	dept, err := s.deptRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// 如果更新了编码，检查是否重复
	if req.Code != "" && req.Code != dept.Code {
		existingDept, err := s.deptRepo.GetByCode(ctx, req.Code)
		if err != nil && !repository.IsNotFoundError(err) {
			return nil, err
		}
		if existingDept != nil {
			return nil, common.NewAppError(
				common.ERROR_ALREADY_EXISTS,
				"部门编码已被占用，请使用其他编码",
			)
		}
	}

	// 如果更新了负责人，验证是否存在
	if req.ManagerID != "" && req.ManagerID != dept.ManagerID {
		manager, err := s.userRepo.GetByID(ctx, req.ManagerID)
		if err != nil {
			if repository.IsNotFoundError(err) {
				return nil, common.NewAppError(
					common.ERROR_NOT_FOUND,
					"所选负责人不存在，请重新选择",
				)
			}
			return nil, err
		}
		dept.ManagerName = manager.Username
	}

	// 应用更新
	s.converter.UpdateRequestToModel(dept, req)

	// 如果更新了父部门，重新计算层级和路径
	if req.ParentID != nil {
		if *req.ParentID != "" {
			parentDept, err := s.deptRepo.GetByID(ctx, *req.ParentID)
			if err != nil {
				if repository.IsNotFoundError(err) {
					return nil, common.NewAppError(
						common.ERROR_NOT_FOUND,
						"所选上级部门不存在，请重新选择",
					)
				}
				return nil, err
			}

			// 检查是否形成循环
			if strings.Contains(parentDept.Path, "/"+id+"/") || parentDept.ID == id {
				return nil, common.NewAppError(
					common.ERROR_INVALID_PARAMS,
					"不能将部门设置为自己或其子部门的上级部门",
				)
			}

			dept.Level = parentDept.Level + 1
			dept.Path = parentDept.Path + "/" + dept.ID
		} else {
			dept.Level = 0
			dept.Path = "/" + dept.ID
		}

		// 需要更新所有子部门的层级和路径
		if err := s.updateChildrenPaths(ctx, dept); err != nil {
			return nil, err
		}
	}

	// 更新部门
	if err := s.deptRepo.Update(ctx, dept); err != nil {
		return nil, err
	}

	resp := s.converter.ModelToTreeResponse(dept, nil)
	return &resp, nil
}

// DeleteDepartment 删除部门
func (s *DepartmentService) DeleteDepartment(id string) error {
	ctx := context.Background()

	// 检查部门是否存在
	dept, err := s.deptRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// 检查是否有子部门
	children, err := s.deptRepo.GetByParent(ctx, id)
	if err != nil {
		return err
	}
	if len(children) > 0 {
		return common.NewAppError(
			common.ERROR_INVALID_PARAMS,
			"该部门下还有子部门，无法删除",
		)
	}

	// 检查是否有员工
	if dept.EmployeeCount > 0 {
		return common.NewAppError(
			common.ERROR_INVALID_PARAMS,
			fmt.Sprintf("该部门下还有 %d 名员工，无法删除", dept.EmployeeCount),
		)
	}

	// 软删除
	dept.Status = "deleted"
	return s.deptRepo.Update(ctx, dept)
}

// BatchDeleteDepartments 批量删除部门
func (s *DepartmentService) BatchDeleteDepartments(ids []string) error {
	ctx := context.Background()

	for _, id := range ids {
		// 检查部门是否存在
		dept, err := s.deptRepo.GetByID(ctx, id)
		if err != nil {
			if repository.IsNotFoundError(err) {
				continue // 跳过不存在的部门
			}
			return err
		}

		// 检查是否有子部门
		children, err := s.deptRepo.GetByParent(ctx, id)
		if err != nil {
			return err
		}
		if len(children) > 0 {
			return common.NewAppError(
				common.ERROR_INVALID_PARAMS,
				fmt.Sprintf("部门 %s 下还有子部门，无法删除", dept.Name),
			)
		}

		// 检查是否有员工
		if dept.EmployeeCount > 0 {
			return common.NewAppError(
				common.ERROR_INVALID_PARAMS,
				fmt.Sprintf("部门 %s 下还有员工，无法删除", dept.Name),
			)
		}

		// 软删除
		dept.Status = "deleted"
		if err := s.deptRepo.Update(ctx, dept); err != nil {
			return err
		}
	}

	return nil
}

// GetDepartmentOptions 获取部门选项列表（用于下拉框）
func (s *DepartmentService) GetDepartmentOptions() ([]map[string]interface{}, error) {
	ctx := context.Background()

	departments, err := s.deptRepo.GetTreeStructure(ctx)
	if err != nil {
		return nil, err
	}

	options := make([]map[string]interface{}, len(departments))
	for i, dept := range departments {
		options[i] = map[string]interface{}{
			"id":    dept.ID,
			"name":  dept.Name,
			"level": dept.Level,
		}
	}

	return options, nil
}

// GetDepartmentStats 获取部门统计信息
func (s *DepartmentService) GetDepartmentStats() (*response.DepartmentStatsResponse, error) {
	ctx := context.Background()

	// 获取所有部门（包括禁用的）
	departments, err := s.deptRepo.GetTreeStructure(ctx)
	if err != nil {
		return nil, err
	}

	stats := &response.DepartmentStatsResponse{
		Total:        len(departments),
		Active:       0,
		Inactive:     0,
		TopLevel:     0,
		AvgEmployees: 0,
	}

	totalEmployees := 0
	for _, dept := range departments {
		// 统计启用/禁用数量
		if dept.Status == model.DepartmentStatusEnabled {
			stats.Active++
		} else if dept.Status == model.DepartmentStatusDisabled {
			stats.Inactive++
		}

		// 统计顶级部门数量（parentId 为 NULL）
		if dept.ParentID == nil {
			stats.TopLevel++
		}

		totalEmployees += dept.EmployeeCount
	}

	// 计算平均员工数
	if stats.Total > 0 {
		stats.AvgEmployees = totalEmployees / stats.Total
	}

	return stats, nil
}

// buildTree 构建树形结构
func (s *DepartmentService) buildTree(departments []*model.Department, parentID *string) []response.DepartmentTreeResponse {
	var result []response.DepartmentTreeResponse

	for _, dept := range departments {
		// 匹配父级ID
		if (parentID == nil && dept.ParentID == nil) ||
			(parentID != nil && dept.ParentID != nil && *parentID == *dept.ParentID) {

			// 递归构建子树
			children := s.buildTree(departments, &dept.ID)

			resp := s.converter.ModelToTreeResponse(dept, children)
			result = append(result, resp)
		}
	}

	return result
}

// updateChildrenPaths 更新所有子部门的路径
func (s *DepartmentService) updateChildrenPaths(ctx context.Context, parent *model.Department) error {
	children, err := s.deptRepo.GetByParent(ctx, parent.ID)
	if err != nil {
		return err
	}

	for _, child := range children {
		child.Level = parent.Level + 1
		child.Path = parent.Path + "/" + child.ID

		if err := s.deptRepo.Update(ctx, child); err != nil {
			return err
		}

		// 递归更新子部门的子部门
		if err := s.updateChildrenPaths(ctx, child); err != nil {
			return err
		}
	}

	return nil
}
