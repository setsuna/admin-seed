package user

import (
	"admin-seed/internal/common"
	"admin-seed/internal/dto/request"
	"admin-seed/internal/middleware"
	"admin-seed/internal/service"

	"github.com/gin-gonic/gin"
)

// RoleHandler 角色处理器
type RoleHandler struct {
	roleService *service.RoleService
}

// NewRoleHandler 创建角色处理器
func NewRoleHandler(roleService *service.RoleService) *RoleHandler {
	return &RoleHandler{
		roleService: roleService,
	}
}

// GetRoles 获取角色列表
func (h *RoleHandler) GetRoles(c *gin.Context) {
	var filters request.RoleFilters
	if err := c.ShouldBindQuery(&filters); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数错误")
		return
	}

	result, err := h.roleService.GetRoles(c.Request.Context(), &filters)
	if err != nil {
		panic(err)
	}

	common.Success(c, result)
}

// GetRole 获取角色详情
func (h *RoleHandler) GetRole(c *gin.Context) {
	id := c.Param("id")

	role, err := h.roleService.GetRole(c.Request.Context(), id)
	if err != nil {
		panic(err)
	}

	common.Success(c, role)
}

// CreateRole 创建角色
func (h *RoleHandler) CreateRole(c *gin.Context) {
	var req request.CreateRoleRequest
	if err := middleware.GetValidatedDataAs(c, &req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	role, err := h.roleService.CreateRole(c.Request.Context(), &req)
	if err != nil {
		panic(err)
	}

	common.Success(c, role)
}

// UpdateRole 更新角色
func (h *RoleHandler) UpdateRole(c *gin.Context) {
	id := c.Param("id")

	var req request.UpdateRoleRequest
	if err := middleware.GetValidatedDataAs(c, &req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	// 审计日志：记录修改前的数据
	beforeRole, err := h.roleService.GetRole(c.Request.Context(), id)
	if err == nil {
		c.Set("before_data", beforeRole)
	}

	role, err := h.roleService.UpdateRole(c.Request.Context(), id, &req)
	if err != nil {
		panic(err)
	}

	common.Success(c, role)
}

// DeleteRole 删除角色
func (h *RoleHandler) DeleteRole(c *gin.Context) {
	id := c.Param("id")

	// 审计日志：记录删除前的数据
	beforeRole, err := h.roleService.GetRole(c.Request.Context(), id)
	if err == nil {
		c.Set("before_data", beforeRole)
	}

	err = h.roleService.DeleteRole(c.Request.Context(), id)
	if err != nil {
		panic(err)
	}

	common.Success(c, nil)
}
