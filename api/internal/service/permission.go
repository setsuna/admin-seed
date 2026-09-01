package service

import (
	"context"
	"encoding/json"
	"fmt"

	"admin-seed/internal/dto/response"
	"admin-seed/internal/model"
	"admin-seed/internal/repository"
)

// PermissionService 权限服务
type PermissionService struct {
	dictRepo repository.DictRepositoryInterface
	roleRepo repository.RoleRepositoryInterface
}

// NewPermissionService 创建权限服务
func NewPermissionService(
	dictRepo repository.DictRepositoryInterface,
	roleRepo repository.RoleRepositoryInterface,
) *PermissionService {
	return &PermissionService{
		dictRepo: dictRepo,
		roleRepo: roleRepo,
	}
}

// PermissionDetail 权限详情结构
type PermissionDetail struct {
	Category    string `json:"category"`
	Resource    string `json:"resource"`
	Action      string `json:"action"`
	Description string `json:"description"`
}

// GetPermissionGroups 获取权限分组
func (s *PermissionService) GetPermissionGroups(ctx context.Context) ([]response.PermissionGroupResponse, error) {
	// 从字典获取所有权限
	dictItems, err := s.dictRepo.GetDictItemsByCode(ctx, "PERMISSIONS")
	if err != nil {
		return nil, fmt.Errorf("failed to get permissions from dict: %w", err)
	}

	// 解析权限并按category分组
	groupMap := make(map[string]*response.PermissionGroupResponse)

	for _, item := range dictItems {
		if item.Status != model.DictStatusEnabled {
			continue
		}

		// 解析value字段中的JSON
		var detail PermissionDetail
		if err := json.Unmarshal([]byte(item.Value), &detail); err != nil {
			continue
		}

		permission := response.PermissionResponse{
			ID:          item.ID,
			Name:        item.Name,
			Code:        item.Code,
			Category:    detail.Category,
			Resource:    detail.Resource,
			Action:      detail.Action,
			Description: detail.Description,
		}

		// 添加到对应的分组
		if group, exists := groupMap[detail.Category]; exists {
			group.Permissions = append(group.Permissions, permission)
		} else {
			groupMap[detail.Category] = &response.PermissionGroupResponse{
				Key:         detail.Category,
				Name:        s.getCategoryName(detail.Category),
				Permissions: []response.PermissionResponse{permission},
			}
		}
	}

	// 转换为数组并排序
	groups := make([]response.PermissionGroupResponse, 0, len(groupMap))
	categoryOrder := []string{
		"workspace", "meeting", "sync", "personnel",
		"organization", "security", "system", "monitoring",
	}

	for _, category := range categoryOrder {
		if group, exists := groupMap[category]; exists {
			groups = append(groups, *group)
		}
	}

	return groups, nil
}

// GetRolePermissionMatrix 获取角色权限矩阵
func (s *PermissionService) GetRolePermissionMatrix(ctx context.Context) ([]response.RolePermissionMatrixResponse, error) {
	// 获取所有角色
	roles, _, err := s.roleRepo.List(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get roles: %w", err)
	}

	// 获取所有权限
	dictItems, err := s.dictRepo.GetDictItemsByCode(ctx, "PERMISSIONS")
	if err != nil {
		return nil, fmt.Errorf("failed to get permissions: %w", err)
	}

	// 构建所有权限代码列表
	allPermissionCodes := make([]string, 0, len(dictItems))
	for _, item := range dictItems {
		if item.Status == model.DictStatusEnabled {
			allPermissionCodes = append(allPermissionCodes, item.Code)
		}
	}

	// 构建角色权限矩阵
	matrix := make([]response.RolePermissionMatrixResponse, 0, len(roles))

	for _, role := range roles {
		// 解析角色的权限列表
		var rolePermissions []string
		if err := json.Unmarshal([]byte(role.PermissionsStr), &rolePermissions); err != nil {
			rolePermissions = []string{}
		}

		// 构建权限映射
		permissionMap := make(map[string]bool)
		rolePermSet := make(map[string]bool)
		for _, perm := range rolePermissions {
			rolePermSet[perm] = true
		}

		for _, code := range allPermissionCodes {
			permissionMap[code] = rolePermSet[code]
		}

		matrix = append(matrix, response.RolePermissionMatrixResponse{
			RoleID:      role.ID,
			RoleName:    role.Name,
			Permissions: permissionMap,
		})
	}

	return matrix, nil
}

// getCategoryName 获取分类名称
func (s *PermissionService) getCategoryName(category string) string {
	categoryNames := map[string]string{
		"workspace":    "工作台",
		"meeting":      "会议管理",
		"sync":         "同步管理",
		"personnel":    "人员管理",
		"organization": "组织架构",
		"security":     "安全管理",
		"system":       "系统管理",
		"monitoring":   "监控告警",
	}

	if name, exists := categoryNames[category]; exists {
		return name
	}
	return category
}
