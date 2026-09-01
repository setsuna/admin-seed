package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AccessLog 访问日志记录
func AccessLog(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 跳过健康检查和开发工具路径
		if shouldSkipAccessLog(c.Request.RequestURI) {
			c.Next()
			return
		}

		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// 处理请求
		c.Next()

		// 计算延迟
		latency := time.Since(start)

		// 获取请求信息
		clientIP := c.ClientIP()
		method := c.Request.Method
		statusCode := c.Writer.Status()
		bodySize := c.Writer.Size()
		userAgent := c.Request.UserAgent()
		requestID := GetRequestID(c)

		// 构建完整路径
		if raw != "" {
			path = path + "?" + raw
		}

		// 根据状态码决定日志级别
		fields := []zap.Field{
			zap.String("method", method),
			zap.String("path", path),
			zap.Int("status", statusCode),
			zap.String("client_ip", clientIP),
			zap.String("user_agent", userAgent),
			zap.Duration("latency", latency),
			zap.String("request_id", requestID),
			zap.Int("body_size", bodySize),
		}

		// 添加用户信息（如果已认证）
		if userID, exists := c.Get("user_id"); exists {
			fields = append(fields, zap.String("user_id", userID.(string)))
		}
		if username, exists := c.Get("username"); exists {
			fields = append(fields, zap.String("username", username.(string)))
		}

		// 根据状态码记录不同级别的日志
		switch {
		case statusCode >= 400 && statusCode < 500:
			logger.Warn("Client Error", fields...)
		case statusCode >= 500:
			logger.Error("Server Error", fields...)
		default:
			logger.Info("Request", fields...)
		}
	}
}

// shouldSkipAccessLog 判断是否跳过访问日志
func shouldSkipAccessLog(path string) bool {
	skipPaths := []string{
		"/health",
		"/metrics",
		"/.well-known/appspecific/com.chrome.devtools.json",
	}

	for _, skip := range skipPaths {
		if path == skip || len(path) >= len(skip) && path[:len(skip)] == skip {
			return true
		}
	}

	return false
}

// ErrorLog 错误日志记录
func ErrorLog(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// 记录所有错误
		for _, err := range c.Errors {
			logger.Error("Request Error",
				zap.String("error", err.Error()),
				zap.Uint32("type", uint32(err.Type)),
				zap.String("path", c.Request.URL.Path),
				zap.String("method", c.Request.Method),
				zap.String("client_ip", c.ClientIP()),
				zap.String("request_id", GetRequestID(c)),
			)
		}
	}
}
