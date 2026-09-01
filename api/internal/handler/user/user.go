package user

import (
	"admin-seed/internal/common"
	"admin-seed/internal/dto/request"
	"admin-seed/internal/middleware"
	"admin-seed/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

// UserHandler 用户处理器
type UserHandler struct {
	userService *service.UserService
}

// NewUserHandler 创建用户处理器
func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

// GetUsers 获取用户列表
func (h *UserHandler) GetUsers(c *gin.Context) {
	// 获取筛选参数
	filters := &request.UserFilters{
		Keyword:       c.Query("keyword"),
		Department:    c.Query("department"),
		Role:          c.Query("role"),
		Status:        c.Query("status"),
		SecurityLevel: c.Query("security_level"),
	}

	// 解析分页参数
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil {
			filters.Page = page
		}
	}
	if sizeStr := c.Query("size"); sizeStr != "" {
		if size, err := strconv.Atoi(sizeStr); err == nil {
			filters.Size = size
		}
	}

	// 设置默认分页
	if filters.Page <= 0 {
		filters.Page = 1
	}
	if filters.Size <= 0 {
		filters.Size = 20
	}

	// 调用服务
	users, total, err := h.userService.ListUsers(filters)
	if err != nil {
		panic(err)
	}

	// 返回分页数据
	pagination := common.CreatePagination(filters.Page, filters.Size, total)
	common.PaginatedSuccess(c, users, pagination)
}

// GetUser 获取用户详情
func (h *UserHandler) GetUser(c *gin.Context) {
	id := c.Param("id")

	user, err := h.userService.GetUser(id)
	if err != nil {
		panic(err)
	}

	common.Success(c, user)
}

// CreateUser 创建用户
func (h *UserHandler) CreateUser(c *gin.Context) {
	var req request.CreateUserRequest
	if err := middleware.GetValidatedDataAs(c, &req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	user, err := h.userService.CreateUser(&req)
	if err != nil {
		panic(err)
	}

	common.Success(c, user)
}

// UpdateUser 更新用户
func (h *UserHandler) UpdateUser(c *gin.Context) {
	id := c.Param("id")

	var req request.UpdateUserRequest
	if err := middleware.GetValidatedDataAs(c, &req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	user, err := h.userService.UpdateUser(id, &req)
	if err != nil {
		panic(err)
	}

	common.Success(c, user)
}

// DeleteUser 删除用户
func (h *UserHandler) DeleteUser(c *gin.Context) {
	id := c.Param("id")

	err := h.userService.DeleteUser(id)
	if err != nil {
		panic(err)
	}

	common.Success(c, nil)
}

// BatchDeleteUsers 批量删除用户
func (h *UserHandler) BatchDeleteUsers(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	err := h.userService.BatchDeleteUsers(req.IDs)
	if err != nil {
		panic(err)
	}

	common.Success(c, nil)
}

// GetUserStats 获取用户统计信息
func (h *UserHandler) GetUserStats(c *gin.Context) {
	stats, err := h.userService.GetUserStats()
	if err != nil {
		panic(err)
	}

	common.Success(c, stats)
}

// ResetPassword 重置用户密码（安全管理员功能）
func (h *UserHandler) ResetPassword(c *gin.Context) {
	id := c.Param("id")

	err := h.userService.ResetPassword(id)
	if err != nil {
		panic(err)
	}

	common.Success(c, gin.H{"message": "密码已重置为默认密码: 123456"})
}

// UpdateUserStatus 更新用户状态（安全管理员功能）
func (h *UserHandler) UpdateUserStatus(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	err := h.userService.UpdateUserStatus(id, req.Status)
	if err != nil {
		panic(err)
	}

	common.Success(c, nil)
}

// UpdateSecurityLevel 更新用户密级
func (h *UserHandler) UpdateSecurityLevel(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		SecurityLevel string `json:"security_level" binding:"required"`
		Reason        string `json:"reason"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	// 获取当前用户信息（用于记录）
	currentUserID := c.GetString("user_id")
	currentUsername := c.GetString("username")

	err := h.userService.UpdateSecurityLevel(id, req.SecurityLevel, currentUserID, currentUsername, req.Reason)
	if err != nil {
		panic(err)
	}

	common.Success(c, nil)
}

// BatchUpdateSecurityLevel 批量更新用户密级
func (h *UserHandler) BatchUpdateSecurityLevel(c *gin.Context) {
	var req struct {
		IDs           []string `json:"ids" binding:"required"`
		SecurityLevel string   `json:"security_level" binding:"required"`
		Reason        string   `json:"reason"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	// 获取当前用户信息（用于记录）
	currentUserID := c.GetString("user_id")
	currentUsername := c.GetString("username")

	err := h.userService.BatchUpdateSecurityLevel(req.IDs, req.SecurityLevel, currentUserID, currentUsername, req.Reason)
	if err != nil {
		panic(err)
	}

	common.Success(c, nil)
}

// BatchUpdateDepartment 批量调整用户部门
func (h *UserHandler) BatchUpdateDepartment(c *gin.Context) {
	var req struct {
		UserIDs    []string `json:"user_ids" binding:"required"`
		Department string   `json:"department" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	err := h.userService.BatchUpdateDepartment(req.UserIDs, req.Department)
	if err != nil {
		panic(err)
	}

	common.Success(c, nil)
}

// BatchImportUsers 批量导入用户
func (h *UserHandler) BatchImportUsers(c *gin.Context) {
	var req request.BatchImportUsersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数格式错误")
		return
	}

	if len(req.Users) == 0 {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "导入列表不能为空")
		return
	}

	result, err := h.userService.BatchImportUsers(&req)
	if err != nil {
		panic(err)
	}

	common.Success(c, result)
}
