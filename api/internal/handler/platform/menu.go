package platform

import (
	"admin-seed/internal/common"
	"admin-seed/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// MenuHandler 菜单处理器
type MenuHandler struct {
	menuService *service.MenuService
	logger      *zap.Logger
}

// NewMenuHandler 创建菜单处理器
func NewMenuHandler(menuService *service.MenuService, logger *zap.Logger) *MenuHandler {
	return &MenuHandler{
		menuService: menuService,
		logger:      logger,
	}
}

// GetUserMenuConfig 获取用户菜单配置
func (h *MenuHandler) GetUserMenuConfig(c *gin.Context) {
	userID := c.Query("userId")
	if userID == "" {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "用户ID不能为空")
		return
	}

	config, err := h.menuService.GetUserMenuConfig(userID)
	if err != nil {
		h.logger.Error("获取用户菜单配置失败", zap.Error(err), zap.String("userId", userID))
		common.ErrorWithCode(c, common.ERROR_INTERNAL_SERVER, "获取菜单配置失败")
		return
	}

	common.Success(c, config)
}
