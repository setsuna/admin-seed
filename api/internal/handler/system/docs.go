package system

import (
	"net/http"

	"admin-seed/web"

	"github.com/gin-gonic/gin"
)

// DocsHandler 文档处理器
type DocsHandler struct{}

// NewDocsHandler 创建文档处理器
func NewDocsHandler() *DocsHandler {
	return &DocsHandler{}
}

// Redoc 显示Redoc文档页面
func (h *DocsHandler) Redoc(c *gin.Context) {
	c.Data(http.StatusOK, "text/html; charset=utf-8", web.RedocHTML)
}
