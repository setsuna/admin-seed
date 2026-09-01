package middleware

import (
	"net/http"
	"strings"

	"admin-seed/internal/model"
	"admin-seed/internal/utils"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware JWT认证中间件
func AuthMiddleware(jwtManager *utils.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		var token string

		// 优先从 Authorization 头获取 token
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			// 检查Bearer前缀
			const bearerPrefix = "Bearer "
			if !strings.HasPrefix(authHeader, bearerPrefix) {
				respondWithError(c, http.StatusUnauthorized, "Authorization头格式错误")
				return
			}
			token = strings.TrimPrefix(authHeader, bearerPrefix)
		} else {
			// 如果 Header 没有，尝试从 URL 参数获取（主要用于 WebSocket）
			token = c.Query("token")
			if token == "" {
				respondWithError(c, http.StatusUnauthorized, "缺少认证token")
				return
			}
		}

		// 解析token
		claims, err := jwtManager.ParseToken(token)
		if err != nil {
			if err == utils.ErrTokenExpired {
				respondWithError(c, http.StatusUnauthorized, "token已过期")
			} else {
				respondWithError(c, http.StatusUnauthorized, "token无效")
			}
			return
		}

		// 将用户信息存储到上下文中
		c.Set("user", claims)
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("roles", claims.Roles)
		c.Set("permissions", claims.Permissions)

		c.Next()
	}
}

// RequireRole 角色权限中间件
func RequireRole(requiredRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userClaims, exists := c.Get("user")
		if !exists {
			respondWithError(c, http.StatusUnauthorized, "用户未认证")
			return
		}

		claims := userClaims.(*model.Claims)

		// 检查用户是否有所需角色
		hasRole := false
		for _, userRole := range claims.Roles {
			for _, requiredRole := range requiredRoles {
				if userRole == requiredRole {
					hasRole = true
					break
				}
			}
			if hasRole {
				break
			}
		}

		if !hasRole {
			respondWithError(c, http.StatusForbidden, "权限不足")
			return
		}

		c.Next()
	}
}

// RequirePermission 权限检查中间件
func RequirePermission(requiredPermissions ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userClaims, exists := c.Get("user")
		if !exists {
			respondWithError(c, http.StatusUnauthorized, "用户未认证")
			return
		}

		claims := userClaims.(*model.Claims)

		// 检查用户是否有所需权限
		hasPermission := false
		for _, userPermission := range claims.Permissions {
			for _, requiredPermission := range requiredPermissions {
				if userPermission == requiredPermission {
					hasPermission = true
					break
				}
			}
			if hasPermission {
				break
			}
		}

		if !hasPermission {
			respondWithError(c, http.StatusForbidden, "权限不足")
			return
		}

		c.Next()
	}
}

// OptionalAuth 可选认证中间件（不强制要求认证）
func OptionalAuth(jwtManager *utils.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		const bearerPrefix = "Bearer "
		if !strings.HasPrefix(authHeader, bearerPrefix) {
			c.Next()
			return
		}

		token := strings.TrimPrefix(authHeader, bearerPrefix)
		claims, err := jwtManager.ParseToken(token)
		if err == nil {
			// 如果token有效，将用户信息存储到上下文中
			c.Set("user", claims)
			c.Set("user_id", claims.UserID)
			c.Set("username", claims.Username)
			c.Set("roles", claims.Roles)
			c.Set("permissions", claims.Permissions)
		}

		c.Next()
	}
}

// respondWithError 响应错误
func respondWithError(c *gin.Context, code int, message string) {
	c.JSON(code, gin.H{
		"error": message,
		"code":  code,
	})
	c.Abort()
}

// ========== 辅助函数 ==========

// GetUserID 从上下文获取用户ID
func GetUserID(c *gin.Context) string {
	return c.GetString("user_id")
}

// GetUsername 从上下文获取用户名
func GetUsername(c *gin.Context) string {
	return c.GetString("username")
}

// GetUser 从上下文获取用户Claims
func GetUser(c *gin.Context) (*model.Claims, bool) {
	if userClaims, exists := c.Get("user"); exists {
		if claims, ok := userClaims.(*model.Claims); ok {
			return claims, true
		}
	}
	return nil, false
}

// GetRoles 从上下文获取用户角色列表
func GetRoles(c *gin.Context) []string {
	if rolesValue, exists := c.Get("roles"); exists {
		if roles, ok := rolesValue.([]string); ok {
			return roles
		}
	}
	return []string{}
}

// GetPermissions 从上下文获取用户权限列表
func GetPermissions(c *gin.Context) []string {
	if permsValue, exists := c.Get("permissions"); exists {
		if perms, ok := permsValue.([]string); ok {
			return perms
		}
	}
	return []string{}
}

// HasRole 检查用户是否拥有指定角色
func HasRole(c *gin.Context, role string) bool {
	roles := GetRoles(c)
	for _, r := range roles {
		if r == role {
			return true
		}
	}
	return false
}

// HasPermission 检查用户是否拥有指定权限
func HasPermission(c *gin.Context, permission string) bool {
	perms := GetPermissions(c)
	for _, p := range perms {
		if p == permission {
			return true
		}
	}
	return false
}

// IsAuthenticated 检查用户是否已认证
func IsAuthenticated(c *gin.Context) bool {
	_, exists := c.Get("user")
	return exists
}
