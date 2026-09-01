package service

import (
	"context"
	"encoding/json"
	"fmt"
	"admin-seed/internal/dto/response"
	"admin-seed/internal/model"
	"admin-seed/internal/repository"
	"sort"
	"strings"
	"time"

	"go.uber.org/zap"
)

// MenuService 菜单服务
type MenuService struct {
	userRepo repository.UserRepositoryInterface
	roleRepo repository.RoleRepositoryInterface
	dictRepo repository.DictRepositoryInterface
	logger   *zap.Logger
}

// NewMenuService 创建菜单服务
func NewMenuService(
	userRepo repository.UserRepositoryInterface,
	roleRepo repository.RoleRepositoryInterface,
	dictRepo repository.DictRepositoryInterface,
	logger *zap.Logger,
) *MenuService {
	return &MenuService{
		userRepo: userRepo,
		roleRepo: roleRepo,
		dictRepo: dictRepo,
		logger:   logger,
	}
}

// GetUserMenuConfig 获取用户菜单配置
func (s *MenuService) GetUserMenuConfig(userID string) (*response.MenuConfigResponse, error) {
	ctx := context.Background()

	// 1. 获取用户信息
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("获取用户信息失败: %w", err)
	}

	// 2. 根据用户角色获取角色权限
	var rolePermissions []string
	if user.Role != "" {
		role, err := s.roleRepo.GetByCode(ctx, user.Role)
		if err != nil {
			s.logger.Warn("获取角色权限失败",
				zap.String("userID", userID),
				zap.String("role", user.Role),
				zap.Error(err))
		} else {
			rolePermissions = role.Permissions
		}
	}

	// 3. 解析用户个人额外权限
	var userPermissions []string
	if user.PermissionsStr != "" {
		if err := json.Unmarshal([]byte(user.PermissionsStr), &userPermissions); err != nil {
			s.logger.Warn("解析用户个人权限失败",
				zap.String("userID", userID),
				zap.Error(err))
		}
	}

	// 4. 合并权限（去重）
	allPermissions := s.mergePermissions(rolePermissions, userPermissions)

	// 5. 获取菜单分组（从 MENU_GROUPS 字典）
	menuGroups, err := s.dictRepo.GetDictItemsByCode(ctx, "MENU_GROUPS")
	if err != nil {
		return nil, fmt.Errorf("获取菜单分组失败: %w", err)
	}

	// 6. 获取所有菜单项（从 MENU_ITEMS 字典）
	menuItems, err := s.dictRepo.GetDictItemsByCode(ctx, "MENU_ITEMS")
	if err != nil {
		return nil, fmt.Errorf("获取菜单项失败: %w", err)
	}

	// 7. 解析并过滤菜单
	filteredMenus := make(map[string][]response.MenuItem) // group -> items

	for _, item := range menuItems {
		// 跳过已禁用的菜单项
		if item.Status != model.DictStatusEnabled {
			continue
		}

		// 解析 JSON value
		var menuData response.MenuItemFromDict
		if err := json.Unmarshal([]byte(item.Value), &menuData); err != nil {
			// 使用字典项的基本字段
			menuData.Key = item.Code
			menuData.Label = item.Name
			// path, icon, permissions, group 保持为空/默认值
			// 尝试从 value 中推断 group（假设 value 可能是 group 名称）
			menuData.Group = item.Value // 可能 value 就是 group
		}

		// 权限检查：使用合并后的权限
		if !s.hasAnyPermission(allPermissions, menuData.Permissions) {
			s.logger.Debug("菜单项被权限过滤",
				zap.String("key", menuData.Key),
				zap.Strings("required", menuData.Permissions),
				zap.Strings("user", allPermissions))
			continue
		}
		// 构建菜单项
		menu := s.buildMenuItem(item, &menuData)

		// 按 group 分类
		if filteredMenus[menuData.Group] == nil {
			filteredMenus[menuData.Group] = []response.MenuItem{}
		}
		filteredMenus[menuData.Group] = append(filteredMenus[menuData.Group], menu)
	}

	menuTree := s.buildMenuTree(menuGroups, filteredMenus)

	// 8. 排序菜单树
	s.sortMenus(menuTree)

	// 9. 构建响应
	var createdAt, updatedAt *string
	if !user.CreatedAt.IsZero() {
		t := user.CreatedAt.Format(time.RFC3339)
		createdAt = &t
	}
	if !user.UpdatedAt.IsZero() {
		t := user.UpdatedAt.Format(time.RFC3339)
		updatedAt = &t
	}

	return &response.MenuConfigResponse{
		UserID:          userID,
		UserPermissions: allPermissions,
		Menus:           menuTree,
		CreatedAt:       createdAt,
		UpdatedAt:       updatedAt,
	}, nil
}

// hasAnyPermission 检查用户是否拥有任意一个权限
func (s *MenuService) hasAnyPermission(userPermissions []string, requiredPermissions []string) bool {
	// 如果没有权限要求，则所有人可见
	if len(requiredPermissions) == 0 {
		return true
	}

	// 创建权限映射以提高查找效率
	permMap := make(map[string]bool)
	for _, perm := range userPermissions {
		permMap[perm] = true
	}

	// 检查是否有任意一个权限匹配
	for _, reqPerm := range requiredPermissions {
		if permMap[reqPerm] {
			return true
		}
	}

	return false
}

// buildMenuItem 构建菜单项
func (s *MenuService) buildMenuItem(dictItem *model.DictItem, menuData *response.MenuItemFromDict) response.MenuItem {
	menu := response.MenuItem{
		ID:          dictItem.ID,
		Key:         menuData.Key,
		Label:       menuData.Label,
		Type:        "item",
		Permissions: menuData.Permissions,
		Visible:     true,
		Disabled:    false,
		Sort:        dictItem.Sort, // 使用字典项的 Sort 字段
		Level:       1,
	}

	// 可选字段
	if menuData.Icon != "" {
		menu.Icon = &menuData.Icon
	}
	if menuData.Path != "" {
		menu.Path = &menuData.Path
	}

	return menu
}

// buildMenuTree 构建菜单树结构
func (s *MenuService) buildMenuTree(groups []*model.DictItem, itemsMap map[string][]response.MenuItem) []response.MenuItem {
	var menuTree []response.MenuItem

	s.logger.Info("开始遍历菜单分组", zap.Int("totalGroups", len(groups)))

	// 打印 itemsMap 的键
	var keys []string
	for k := range itemsMap {
		keys = append(keys, k)
	}
	for _, group := range groups {
		// 跳过已禁用的菜单分组
		if group.Status != model.DictStatusEnabled {
			continue
		}

		// 解析分组的 JSON value
		var groupData struct {
			Key   string `json:"key"`
			Label string `json:"label"`
			Icon  string `json:"icon,omitempty"`
		}

		// 尝试解析 JSON
		err := json.Unmarshal([]byte(group.Value), &groupData)
		if err != nil {
			groupData.Key = group.Code
			groupData.Label = group.Name
			// icon 保持为空
		}

		// 获取该分组下的菜单项（忽略大小写）
		items, exists := itemsMap[group.Code]
		if !exists {
			// 尝试小写匹配
			items, exists = itemsMap[strings.ToLower(group.Code)]
		}

		if !exists || len(items) == 0 {
			// 如果该分组下没有可见的菜单项，跳过
			continue
		}

		// 构建分组菜单
		groupMenu := response.MenuItem{
			ID:       group.ID,
			Key:      groupData.Key,
			Label:    groupData.Label,
			Type:     "group",
			Visible:  true,
			Disabled: false,
			Sort:     group.Sort,
			Level:    0,
			Children: items,
		}

		if groupData.Icon != "" {
			groupMenu.Icon = &groupData.Icon
		}

		menuTree = append(menuTree, groupMenu)
	}
	return menuTree
}

// sortMenus 排序菜单树
func (s *MenuService) sortMenus(menus []response.MenuItem) {
	// 排序顶层菜单
	sort.Slice(menus, func(i, j int) bool {
		return menus[i].Sort < menus[j].Sort
	})

	// 递归排序子菜单
	for i := range menus {
		if len(menus[i].Children) > 0 {
			s.sortMenus(menus[i].Children)
		}
	}
}

// mergePermissions 合并角色权限和用户权限（去重）
func (s *MenuService) mergePermissions(rolePerms, userPerms []string) []string {
	permSet := make(map[string]bool)

	// 添加角色权限
	for _, perm := range rolePerms {
		permSet[perm] = true
	}

	// 添加用户个人权限
	for _, perm := range userPerms {
		permSet[perm] = true
	}

	// 转换为切片
	result := make([]string, 0, len(permSet))
	for perm := range permSet {
		result = append(result, perm)
	}

	return result
}
