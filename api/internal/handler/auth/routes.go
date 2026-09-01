package auth

import (
	"admin-seed/internal/dto/request"
	"admin-seed/internal/middleware"
	"admin-seed/internal/utils"

	"github.com/gin-gonic/gin"
)

// RegisterAuthRoutes 设置认证相关路由。
// jwtManager 用于对需要认证的子路由施加 AuthMiddleware。
func RegisterAuthRoutes(v1 *gin.RouterGroup, h *AuthHandler, jwtManager *utils.JWTManager) {
	authGroup := v1.Group("/auth")
	{
		// 登录 - 使用JSON参数绑定和验证
		authGroup.POST("/login",
			middleware.BindJSON(&request.LoginRequest{}),
			h.Login,
		)

		// 刷新Token - 使用JSON参数绑定和验证
		authGroup.POST("/refresh",
			middleware.BindJSON(&request.RefreshTokenRequest{}),
			h.RefreshToken,
		)

		// 登出 - 不需要认证，因为token可能已过期
		authGroup.POST("/logout", h.Logout)

		// 获取系统状态
		authGroup.GET("/system-status", h.GetSystemStatus)

		// 强制修改密码（密码过期场景，无需认证）
		authGroup.POST("/force-change-password",
			middleware.BindJSON(&request.ForceChangePasswordRequest{}),
			h.ForceChangePassword,
		)

		// 需要认证的路由
		authenticated := authGroup.Group("")
		authenticated.Use(middleware.AuthMiddleware(jwtManager))
		{
			authenticated.GET("/me", h.GetCurrentUser)
			authenticated.POST("/validate", h.ValidateToken)
			authenticated.POST("/change-password",
				middleware.BindJSON(&request.ChangePasswordRequest{}),
				h.ChangePassword,
			)
		}
	}
}
