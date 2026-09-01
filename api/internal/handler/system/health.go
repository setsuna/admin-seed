package system

import (
	"time"

	"admin-seed/internal/common"

	"github.com/gin-gonic/gin"
)

// HealthHandler 健康检查处理器
type HealthHandler struct{}

// NewHealthHandler 创建健康检查处理器
func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

// HealthResponse 健康检查响应
type HealthResponse struct {
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
	Version   string    `json:"version"`
	Uptime    string    `json:"uptime"`
}

var startTime = time.Now()

// Health 健康检查
func (h *HealthHandler) Health(c *gin.Context) {
	response := &HealthResponse{
		Status:    "ok",
		Timestamp: time.Now(),
		Version:   "1.0.0",
		Uptime:    time.Since(startTime).String(),
	}

	common.Success(c, response)
}

// Ready 就绪检查
func (h *HealthHandler) Ready(c *gin.Context) {
	// TODO: 检查数据库连接、外部依赖等
	// 这里可以添加各种就绪检查逻辑

	data := gin.H{
		"status": "ready",
		"checks": gin.H{
			"database": "ok",
			"storage":  "ok",
		},
	}

	common.Success(c, data)
}
