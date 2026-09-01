package system

import (
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// StaticHandler 静态文件处理器
type StaticHandler struct {
	staticDir string
}

// NewStaticHandler 创建静态文件处理器
func NewStaticHandler(staticDir string) *StaticHandler {
	return &StaticHandler{
		staticDir: staticDir,
	}
}

// SPAFallback SPA路由回退处理
func (h *StaticHandler) SPAFallback() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path

		// 跳过API路径和文档路径
		if strings.HasPrefix(path, "/api/") ||
			strings.HasPrefix(path, "/docs") ||
			strings.HasPrefix(path, "/swagger") ||
			strings.HasPrefix(path, "/health") ||
			strings.HasPrefix(path, "/ready") ||
			strings.HasPrefix(path, "/static/") {
			c.Next()
			return
		}

		// 检查是否是静态资源文件
		ext := filepath.Ext(path)
		if ext != "" && ext != ".html" {
			// 是静态资源，继续处理
			c.Next()
			return
		}

		// SPA路由，返回index.html
		indexPath := filepath.Join(h.staticDir, "index.html")
		if _, err := filepath.Abs(indexPath); err == nil {
			c.File(indexPath)
			return
		}

		// 如果没有index.html，继续处理
		c.Next()
	}
}
