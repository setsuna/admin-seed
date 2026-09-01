package platform

import (
	"admin-seed/internal/dto/request"
	"admin-seed/internal/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterDictRoutes 设置数据字典路由
func RegisterDictRoutes(protected *gin.RouterGroup, h *DictHandler) {
	dictGroup := protected.Group("/dictionaries")
	{
		// 获取字典类型列表（必须在 /:id 之前）
		dictGroup.GET("/types", h.GetDictTypes)

		// 获取字典项列表（必须在 /:id 之前）
		dictGroup.GET("/code/:dictCode/items",
			middleware.RequiredParam("dictCode"),
			h.GetDictItems,
		)

		// 获取字典列表（必须在 /:id 之前）
		dictGroup.GET("",
			middleware.PaginationBind(),
			middleware.BindQuery(&request.DictFilters{}),
			h.GetDictionaries,
		)

		// 获取字典详情
		dictGroup.GET("/:id",
			middleware.ValidateIDParam("id"),
			h.GetDictionary,
		)

		// 管理员权限的操作
		adminDictGroup := dictGroup.Group("")
		adminDictGroup.Use(middleware.RequirePermission("system:dict:manage"))
		{
			// 创建字典
			adminDictGroup.POST("",
				middleware.BindJSON(&request.CreateDataDictRequest{}),
				h.CreateDictionary,
			)

			// 更新字典
			adminDictGroup.PUT("/:id",
				middleware.ValidateIDParam("id"),
				middleware.BindJSON(&request.UpdateDataDictRequest{}),
				h.UpdateDictionary,
			)

			// 删除字典
			adminDictGroup.DELETE("/:id",
				middleware.ValidateIDParam("id"),
				h.DeleteDictionary,
			)

			// 批量删除字典
			adminDictGroup.POST("/batch/delete",
				h.DeleteDictionaries,
			)

			// 导出字典
			adminDictGroup.POST("/export",
				h.ExportDictionaries,
			)

			// 同步到设备
			adminDictGroup.POST("/sync",
				h.SyncToDevices,
			)

			// 创建字典项
			adminDictGroup.POST("/code/:dictCode/items",
				middleware.RequiredParam("dictCode"),
				middleware.BindJSON(&request.CreateDictItemRequest{}),
				h.CreateDictItem,
			)
		}

		// 字典项操作
		itemGroup := dictGroup.Group("/items")
		{
			// 更新字典项（需要管理员权限）
			itemGroup.PUT("/:id",
				middleware.RequirePermission("system:dict:manage"),
				middleware.ValidateIDParam("id"),
				middleware.BindJSON(&request.UpdateDictItemRequest{}),
				h.UpdateDictItem,
			)

			// 删除字典项（需要管理员权限）
			itemGroup.DELETE("/:id",
				middleware.RequirePermission("system:dict:manage"),
				middleware.ValidateIDParam("id"),
				h.DeleteDictItem,
			)
		}
	}
}

// RegisterMenuRoutes 设置菜单配置路由
func RegisterMenuRoutes(protected *gin.RouterGroup, h *MenuHandler) {
	menuGroup := protected.Group("/menus")
	{
		menuGroup.GET("/user-config", h.GetUserMenuConfig)
	}
}

// RegisterPolicyRoutes 设置策略配置路由
func RegisterPolicyRoutes(protected *gin.RouterGroup, h *PolicyHandler) {
	policyGroup := protected.Group("/policy")
	{
		// 获取当前策略配置
		policyGroup.GET("", h.GetPolicy)

		// 获取默认策略配置
		policyGroup.GET("/default", h.GetDefaultPolicy)

		// 验证策略配置
		policyGroup.POST("/validate",
			middleware.BindJSON(&request.UpdatePolicyRequest{}),
			h.ValidatePolicy,
		)

		// 导出策略配置
		policyGroup.GET("/export", h.ExportPolicy)

		// 告警检查（所有登录用户可用）
		policyGroup.GET("/alerts/check", h.CheckAlerts)

		// 审计日志统计（所有登录用户可用）
		policyGroup.GET("/audit-logs/stats", h.GetAuditLogStats)

		// 需要管理员权限的操作
		adminPolicyGroup := policyGroup.Group("")
		adminPolicyGroup.Use(middleware.RequirePermission("system:config:manage"))
		{
			// 更新策略配置
			adminPolicyGroup.PUT("",
				middleware.BindJSON(&request.UpdatePolicyRequest{}),
				h.UpdatePolicy,
			)

			// 覆盖审计日志
			adminPolicyGroup.DELETE("/audit-logs",
				middleware.BindJSON(&request.PurgeAuditLogsRequest{}),
				h.PurgeAuditLogs,
			)
		}
	}
}

// RegisterDashboardRoutes 设置仪表板路由
func RegisterDashboardRoutes(protected *gin.RouterGroup, h *DashboardHandler) {
	protected.GET("/dashboard", h.GetDashboard)
}

// RegisterLogRoutes 设置日志管理路由
func RegisterLogRoutes(protected *gin.RouterGroup, h *OperationLogHandler) {
	logGroup := protected.Group("/logs")
	{
		// 获取应用日志列表（安全管理员）
		logGroup.GET("",
			middleware.RequirePermission("logs:admin:read"),
			h.GetLogs,
		)

		// 获取三员操作日志（审计员）
		logGroup.GET("/three-admin",
			middleware.RequirePermission("logs:audit:read"),
			h.GetThreeAdminLogs,
		)
	}
}
