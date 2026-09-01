package auth

import (
	"context"
	"time"

	"admin-seed/internal/common"
	"admin-seed/internal/converter"
	"admin-seed/internal/dto/request"
	"admin-seed/internal/dto/response"
	"admin-seed/internal/middleware"
	"admin-seed/internal/model"
	"admin-seed/internal/repository"
	"admin-seed/internal/service"
	"admin-seed/internal/utils"

	"github.com/gin-gonic/gin"
)

// AuthHandler 认证处理器
type AuthHandler struct {
	jwtManager    *utils.JWTManager
	userService   *service.UserService
	roleRepo      repository.RoleRepositoryInterface
	authConverter *converter.AuthConverter
	rsaDecryptor  *utils.RSADecryptor
	cryptoEnabled bool
	logService    *service.OperationLogService
}

// NewAuthHandler 创建认证处理器
func NewAuthHandler(jwtManager *utils.JWTManager, userService *service.UserService, roleRepo repository.RoleRepositoryInterface, rsaDecryptor *utils.RSADecryptor, cryptoEnabled bool, logService *service.OperationLogService) *AuthHandler {
	return &AuthHandler{
		jwtManager:    jwtManager,
		userService:   userService,
		roleRepo:      roleRepo,
		authConverter: converter.NewAuthConverter(),
		rsaDecryptor:  rsaDecryptor,
		cryptoEnabled: cryptoEnabled,
		logService:    logService,
	}
}

// Login 用户登录
func (h *AuthHandler) Login(c *gin.Context) {
	var req request.LoginRequest
	if err := middleware.GetValidatedDataAs(c, &req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	// 解密密码
	password := req.Password
	if h.cryptoEnabled && h.rsaDecryptor != nil {
		decrypted, err := h.rsaDecryptor.Decrypt(req.Password)
		if err != nil {
			common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "密码解密失败")
			return
		}
		password = decrypted
	}

	// 验证用户
	user, err := h.userService.AuthenticateUser(req.Username, password)
	if err != nil {
		if appErr, ok := common.IsAppError(err); ok {
			// 账户锁定
			if appErr.Code == common.ERROR_ACCOUNT_LOCKED {
				h.recordSecurityLog(c, req.Username, "账户锁定", "账户因多次登录失败被锁定")
				common.ErrorWithDetails(c, common.ERROR_ACCOUNT_LOCKED, appErr.Message, appErr.Details)
				return
			}
			// 密码错误，返回剩余次数
			if appErr.Code == common.ERROR_LOGIN_FAILED || appErr.Code == common.ERROR_PASSWORD_INVALID {
				h.recordSecurityLog(c, req.Username, "登录失败", "用户名或密码错误")
				common.ErrorWithDetails(c, common.ERROR_LOGIN_FAILED, "用户名或密码错误", appErr.Details)
				return
			}
		}
		// 其他错误
		h.recordSecurityLog(c, req.Username, "登录失败", "用户名或密码错误")
		common.ErrorWithCode(c, common.ERROR_LOGIN_FAILED, "用户名或密码错误")
		return
	}

	// 检查密码是否过期
	passwordExpired, _ := h.userService.IsPasswordExpired(user)
	if passwordExpired {
		common.ErrorWithDetails(c, common.ERROR_PASSWORD_EXPIRED, "密码已过期，请修改密码", gin.H{
			"user_id":  user.ID,
			"username": user.Username,
		})
		return
	}


	// 动态从角色读取权限
	ctx := c.Request.Context()
	role, err := h.roleRepo.GetByCode(ctx, user.Role)
	if err != nil {
		common.ErrorWithCode(c, common.ERROR_INTERNAL_SERVER, "获取角色权限失败")
		return
	}

	// 从角色继承权限
	permissions := role.Permissions

	// 合并用户额外权限
	if len(user.Permissions) > 0 {
		permMap := make(map[string]bool)
		for _, p := range permissions {
			permMap[p] = true
		}
		for _, p := range user.Permissions {
			if !permMap[p] {
				permissions = append(permissions, p)
			}
		}
	}

	// 生成JWT token
	token, err := h.jwtManager.GenerateToken(user.ID, user.Username, user.Name, []string{user.Role}, permissions)
	if err != nil {
		common.ErrorWithCode(c, common.ERROR_INTERNAL_SERVER, "生成token失败")
		return
	}

	// 生成刷新token
	refreshToken, err := h.jwtManager.GenerateRefreshToken(user.ID)
	if err != nil {
		common.ErrorWithCode(c, common.ERROR_INTERNAL_SERVER, "生成刷新token失败")
		return
	}

	// 更新最后登录时间
	_ = h.userService.UpdateLastLogin(user.ID)

	// 构建响应
	responseData := h.authConverter.CreateLoginResponse(token, refreshToken, 3600, user)

	common.SuccessWithMessage(c, "登录成功", responseData)
}

// RefreshToken 刷新访问令牌
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req request.RefreshTokenRequest
	if err := middleware.GetValidatedDataAs(c, &req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}


	// 验证并刷新token
	userID, err := h.jwtManager.ParseRefreshToken(req.RefreshToken)
	if err != nil {
		common.ErrorWithCode(c, common.ERROR_REFRESH_TOKEN_INVALID, "刷新token无效或已过期")
		return
	}

	// 获取用户信息
	userResp, err := h.userService.GetUser(userID)
	if err != nil {
		common.ErrorWithCode(c, common.ERROR_USER_NOT_FOUND, "用户不存在")
		return
	}

	// 由于service返回的是response，我们需要创建一个临时的user对象用于token生成
	// 这里可以优化service接口，让它返回model对象或者提供专门的方法
	user := &model.User{
		ID:       userResp.ID,
		Username: userResp.Username,
		Name:     userResp.Name,
		Role:     userResp.Role,
		Status:   userResp.Status,
	}

	// 动态从角色读取权限
	ctx := c.Request.Context()
	role, err := h.roleRepo.GetByCode(ctx, user.Role)
	if err != nil {
		common.ErrorWithCode(c, common.ERROR_INTERNAL_SERVER, "获取角色权限失败")
		return
	}

	// 从角色继承权限
	permissions := role.Permissions

	// 合并用户额外权限
	if len(userResp.Permissions) > 0 {
		permMap := make(map[string]bool)
		for _, p := range permissions {
			permMap[p] = true
		}
		for _, p := range userResp.Permissions {
			if !permMap[p] {
				permissions = append(permissions, p)
			}
		}
	}

	// 生成新token
	token, err := h.jwtManager.GenerateToken(user.ID, user.Username, user.Name, []string{user.Role}, permissions)
	if err != nil {
		common.ErrorWithCode(c, common.ERROR_INTERNAL_SERVER, "生成token失败")
		return
	}

	// 生成新刷新token
	refreshToken, err := h.jwtManager.GenerateRefreshToken(user.ID)
	if err != nil {
		common.ErrorWithCode(c, common.ERROR_INTERNAL_SERVER, "生成刷新token失败")
		return
	}

	// 构建响应
	responseData := h.authConverter.CreateLoginResponse(token, refreshToken, 3600, user)

	common.SuccessWithMessage(c, "token刷新成功", responseData)
}

// Logout 用户登出
func (h *AuthHandler) Logout(c *gin.Context) {
	// 登出总是成功的，不管token是否有效
	// 如果需要将token加入黑名单，可以在这里处理
	common.SuccessWithMessage(c, "登出成功", nil)
}

// GetCurrentUser 获取当前用户信息
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	// 获取用户信息
	userClaims, exists := c.Get("user")
	if !exists {
		common.ErrorWithCode(c, common.ERROR_UNAUTHORIZED, "用户未认证")
		return
	}

	claims := userClaims.(*model.Claims)

	// 获取用户详细信息
	user, err := h.userService.GetUser(claims.UserID)
	if err != nil {
		common.ErrorWithCode(c, common.ERROR_USER_NOT_FOUND, "用户不存在")
		return
	}

	userInfo := response.UserInfo{
		ID:       user.ID,
		Username: user.Username,
		Role:     user.Role,
		Status:   user.Status,
	}

	common.Success(c, userInfo)
}

// ChangePassword 修改密码
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	var req request.ChangePasswordRequest
	if err := middleware.GetValidatedDataAs(c, &req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	// 解密密码
	oldPassword := req.OldPassword
	newPassword := req.NewPassword
	if h.cryptoEnabled && h.rsaDecryptor != nil {
		if decrypted, err := h.rsaDecryptor.Decrypt(req.OldPassword); err == nil {
			oldPassword = decrypted
		}
		if decrypted, err := h.rsaDecryptor.Decrypt(req.NewPassword); err == nil {
			newPassword = decrypted
		}
	}

	// 获取用户信息
	userClaims, exists := c.Get("user")
	if !exists {
		common.ErrorWithCode(c, common.ERROR_UNAUTHORIZED, "用户未认证")
		return
	}

	claims := userClaims.(*model.Claims)

	// 验证原密码并修改密码
	err := h.userService.ChangePassword(claims.UserID, &request.ChangePasswordRequest{
		OldPassword: oldPassword,
		NewPassword: newPassword,
	})
	if err != nil {
		if appErr, ok := common.IsAppError(err); ok {
			h.recordPasswordChangeLog(c, claims.Username, claims.UserID, false, appErr.Message)
			common.ErrorWithCode(c, appErr.Code, appErr.Message)
			return
		}
		h.recordPasswordChangeLog(c, claims.Username, claims.UserID, false, "修改密码失败")
		common.ErrorWithCode(c, common.ERROR_INTERNAL_SERVER, "修改密码失败")
		return
	}

	h.recordPasswordChangeLog(c, claims.Username, claims.UserID, true, "密码修改成功")
	common.SuccessWithMessage(c, "密码修改成功", nil)
}

// ForceChangePassword 强制修改密码（密码过期场景，无需认证）
func (h *AuthHandler) ForceChangePassword(c *gin.Context) {
	var req request.ForceChangePasswordRequest
	if err := middleware.GetValidatedDataAs(c, &req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	// 解密密码
	oldPassword := req.OldPassword
	newPassword := req.NewPassword
	if h.cryptoEnabled && h.rsaDecryptor != nil {
		if decrypted, err := h.rsaDecryptor.Decrypt(req.OldPassword); err == nil {
			oldPassword = decrypted
		}
		if decrypted, err := h.rsaDecryptor.Decrypt(req.NewPassword); err == nil {
			newPassword = decrypted
		}
	}

	// 获取用户名用于日志
	userResp, _ := h.userService.GetUser(req.UserID)
	username := ""
	if userResp != nil {
		username = userResp.Username
	}

	// 修改密码
	err := h.userService.ChangePassword(req.UserID, &request.ChangePasswordRequest{
		OldPassword: oldPassword,
		NewPassword: newPassword,
	})
	if err != nil {
		if appErr, ok := common.IsAppError(err); ok {
			h.recordPasswordChangeLog(c, username, req.UserID, false, "强制修改密码失败: "+appErr.Message)
			common.ErrorWithCode(c, appErr.Code, appErr.Message)
			return
		}
		h.recordPasswordChangeLog(c, username, req.UserID, false, "强制修改密码失败")
		common.ErrorWithCode(c, common.ERROR_INTERNAL_SERVER, "修改密码失败")
		return
	}

	h.recordPasswordChangeLog(c, username, req.UserID, true, "密码过期强制修改成功")
	common.SuccessWithMessage(c, "密码修改成功", nil)
}

// ValidateToken 验证token有效性
func (h *AuthHandler) ValidateToken(c *gin.Context) {
	// 获取用户信息
	userClaims, exists := c.Get("user")
	if !exists {
		common.ErrorWithCode(c, common.ERROR_UNAUTHORIZED, "token无效")
		return
	}

	claims := userClaims.(*model.Claims)

	// 构建验证结果
	responseData := response.TokenValidationResponse{
		Valid:     true,
		UserID:    claims.UserID,
		Username:  claims.Username,
		Role:      claims.Roles[0], // 取第一个角色
		ExpiresAt: claims.ExpiresAt.Time.Format(time.RFC3339),
		IssuedAt:  claims.IssuedAt.Time.Format(time.RFC3339),
	}

	common.Success(c, responseData)
}

// GetSystemStatus 获取系统状态（包含授权状态）
func (h *AuthHandler) GetSystemStatus(c *gin.Context) {
	// 构建系统状态信息
	status := gin.H{
		"system_name":    "Admin Seed",
		"version":        "1.0.0",
		"server_time":    time.Now().Format("2006-01-02 15:04:05"),
		"uptime":         time.Since(time.Now()).String(), // 这里应该是实际的启动时间
	}

	common.Success(c, status)
}

// recordSecurityLog 记录安全日志
func (h *AuthHandler) recordSecurityLog(c *gin.Context, username, action, description string) {
	if h.logService == nil {
		return
	}

	log := &model.OperationLog{
		Timestamp:         time.Now(),
		Operator:          username,
		OperatorID:        "",
		OperatorRole:      "",
		IPAddress:         c.ClientIP(),
		Module:            model.ModuleAuth,
		ActionCategory:    action,
		ActionDescription: description,
		OperationResult:   model.OperationFailure,
		RequestID:         middleware.GetRequestID(c),
	}

	// 异步记录日志
	go func() {
		ctx := context.Background()
		_ = h.logService.RecordLog(ctx, log)
	}()
}

// recordPasswordChangeLog 记录密码修改日志
func (h *AuthHandler) recordPasswordChangeLog(c *gin.Context, username, userID string, success bool, description string) {
	if h.logService == nil {
		return
	}

	result := model.OperationFailure
	if success {
		result = model.OperationSuccess
	}

	log := &model.OperationLog{
		Timestamp:         time.Now(),
		Operator:          username,
		OperatorID:        userID,
		OperatorRole:      "",
		IPAddress:         c.ClientIP(),
		Module:            model.ModuleAuth,
		ActionCategory:    "修改密码",
		ActionDescription: description,
		OperationResult:   result,
		RequestID:         middleware.GetRequestID(c),
	}

	// 异步记录日志
	go func() {
		ctx := context.Background()
		_ = h.logService.RecordLog(ctx, log)
	}()
}
