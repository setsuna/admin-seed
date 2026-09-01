package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// Security 安全头中间件
func Security() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 防止MIME类型嗅探
		c.Header("X-Content-Type-Options", "nosniff")

		// 防止点击劫持
		c.Header("X-Frame-Options", "DENY")

		// XSS防护
		c.Header("X-XSS-Protection", "1; mode=block")

		// HSTS (仅在HTTPS下有效)
		if c.Request.TLS != nil {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}

		// 内容安全策略 - 为文档页面提供特殊配置
		cspPolicy := getCSPPolicy(c.Request.URL.Path)
		c.Header("Content-Security-Policy", cspPolicy)

		// 引用策略
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// 权限策略
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		c.Next()
	}
}

// getCSPPolicy 根据路径返回相应的CSP策略
func getCSPPolicy(path string) string {
	// 为文档相关路径使用宽松的CSP策略
	if strings.HasPrefix(path, "/docs") || strings.HasPrefix(path, "/swagger") {
		return "default-src 'self'; " +
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
			"font-src 'self' https://fonts.gstatic.com; " +
			"script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com; " +
			"connect-src 'self'; " +
			"img-src 'self' data:;"
	}

	// 其他路径使用严格的CSP策略
	return "default-src 'self'"
}

// RemovePoweredBy 移除服务器标识
func RemovePoweredBy() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Server", "")
		c.Next()
	}
}
