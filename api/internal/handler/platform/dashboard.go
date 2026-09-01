package platform

import (
	"admin-seed/internal/common"
	"admin-seed/internal/service"

	"github.com/gin-gonic/gin"
)

// DashboardHandler 仪表板处理器
type DashboardHandler struct {
	dashboardService *service.DashboardService
}

// NewDashboardHandler 创建仪表板处理器
func NewDashboardHandler(dashboardService *service.DashboardService) *DashboardHandler {
	return &DashboardHandler{dashboardService: dashboardService}
}

// GetDashboard 获取仪表板数据
func (h *DashboardHandler) GetDashboard(c *gin.Context) {
	data, err := h.dashboardService.GetDashboard()
	if err != nil {
		panic(err)
	}

	common.Success(c, data)
}
