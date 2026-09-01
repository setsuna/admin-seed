package user

import (
	"admin-seed/internal/common"
	"admin-seed/internal/service"

	"github.com/gin-gonic/gin"
)

// PermissionHandler 权限处理器
type PermissionHandler struct {
	permissionService *service.PermissionService
}

// NewPermissionHandler 创建权限处理器
func NewPermissionHandler(permissionService *service.PermissionService) *PermissionHandler {
	return &PermissionHandler{
		permissionService: permissionService,
	}
}

// GetPermissionGroups 获取权限分组
func (h *PermissionHandler) GetPermissionGroups(c *gin.Context) {
	groups, err := h.permissionService.GetPermissionGroups(c.Request.Context())
	if err != nil {
		panic(err)
	}

	common.Success(c, groups)
}

// GetRolePermissionMatrix 获取角色权限矩阵
func (h *PermissionHandler) GetRolePermissionMatrix(c *gin.Context) {
	matrix, err := h.permissionService.GetRolePermissionMatrix(c.Request.Context())
	if err != nil {
		panic(err)
	}

	common.Success(c, matrix)
}
