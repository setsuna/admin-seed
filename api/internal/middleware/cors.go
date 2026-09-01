package middleware

import (
	"strings"
	"time"

	"admin-seed/internal/config"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORS 跨域中间件
func CORS(cfg *config.CORSConfig) gin.HandlerFunc {
	// 如果配置了允许所有源，使用动态CORS
	if len(cfg.AllowOrigins) == 1 && cfg.AllowOrigins[0] == "*" {
		return DynamicCORS(cfg)
	}

	// 使用标准CORS配置
	corsConfig := cors.Config{
		AllowOrigins:     cfg.AllowOrigins,
		AllowMethods:     cfg.AllowMethods,
		AllowHeaders:     cfg.AllowHeaders,
		ExposeHeaders:    cfg.ExposeHeaders,
		AllowCredentials: cfg.AllowCredentials,
		MaxAge:           time.Duration(cfg.MaxAge) * time.Second,
	}

	return cors.New(corsConfig)
}

// DynamicCORS 动态CORS中间件，允许所有源但支持凭据
func DynamicCORS(cfg *config.CORSConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// 如果没有Origin头，说明不是跨域请求
		if origin == "" {
			c.Next()
			return
		}

		// 动态设置允许的源（这样就不会与 AllowCredentials 冲突）
		c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Methods", strings.Join(cfg.AllowMethods, ", "))
		c.Writer.Header().Set("Access-Control-Allow-Headers", strings.Join(cfg.AllowHeaders, ", "))
		c.Writer.Header().Set("Access-Control-Expose-Headers", strings.Join(cfg.ExposeHeaders, ", "))
		c.Writer.Header().Set("Access-Control-Max-Age", "43200") // 12小时

		// 处理OPTIONS预检请求
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
