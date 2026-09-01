package user

import (
	"admin-seed/internal/dto/request"
	"admin-seed/internal/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterUserRoutes 设置用户管理路由
func RegisterUserRoutes(protected *gin.RouterGroup, h *UserHandler) {
	userGroup := protected.Group("/users")
	{
		// === 读操作（所有登录用户可访问） ===
		userGroup.GET("/stats", h.GetUserStats)
		userGroup.GET("", h.GetUsers)
		userGroup.GET("/:id",
			middleware.ValidateIDParam("id"),
			h.GetUser,
		)

		// === 用户管理操作（需要 staff:manage 权限） ===
		staffGroup := userGroup.Group("")
		staffGroup.Use(middleware.RequirePermission("staff:manage"))
		{
			staffGroup.POST("/batch-delete", h.BatchDeleteUsers)
			staffGroup.POST("/batch-import", h.BatchImportUsers)
			staffGroup.PUT("/batch-department", h.BatchUpdateDepartment)
			staffGroup.POST("", h.CreateUser)
			staffGroup.PUT("/:id",
				middleware.ValidateIDParam("id"),
				h.UpdateUser,
			)
			staffGroup.DELETE("/:id",
				middleware.ValidateIDParam("id"),
				h.DeleteUser,
			)
		}

		// === 安全管理员操作（需要 security:user:manage 权限） ===
		securityGroup := userGroup.Group("")
		securityGroup.Use(middleware.RequirePermission("security:user:manage"))
		{
			securityGroup.PUT("/batch-security-level", h.BatchUpdateSecurityLevel)
			securityGroup.POST("/:id/reset-password",
				middleware.ValidateIDParam("id"),
				h.ResetPassword,
			)
			securityGroup.PUT("/:id/status",
				middleware.ValidateIDParam("id"),
				h.UpdateUserStatus,
			)
			securityGroup.PUT("/:id/security-level",
				middleware.ValidateIDParam("id"),
				h.UpdateSecurityLevel,
			)
		}
	}
}

// RegisterDepartmentRoutes 设置部门管理路由
func RegisterDepartmentRoutes(protected *gin.RouterGroup, h *DepartmentHandler) {
	departmentGroup := protected.Group("/departments")
	{
		// 获取部门统计信息（必须在 /:id 之前）
		departmentGroup.GET("/stats", h.GetDepartmentStats)

		// 获取部门选项列表（必须在 /:id 之前）
		departmentGroup.GET("/options", h.GetDepartmentOptions)

		// 获取部门树形结构（必须在 /:id 之前）
		departmentGroup.GET("/tree", h.GetDepartmentTree)

		// 获取部门列表（必须在 /:id 之前）
		departmentGroup.GET("", h.GetDepartments)

		// 获取部门详情
		departmentGroup.GET("/:id",
			middleware.ValidateIDParam("id"),
			h.GetDepartment,
		)

		// 需要组织架构管理权限的操作
		adminDeptGroup := departmentGroup.Group("")
		adminDeptGroup.Use(middleware.RequirePermission("org:manage"))
		{
			// 批量删除部门
			adminDeptGroup.POST("/batch-delete", h.BatchDeleteDepartments)

			// 创建部门
			adminDeptGroup.POST("", h.CreateDepartment)

			// 更新部门
			adminDeptGroup.PUT("/:id",
				middleware.ValidateIDParam("id"),
				h.UpdateDepartment,
			)

			// 删除部门
			adminDeptGroup.DELETE("/:id",
				middleware.ValidateIDParam("id"),
				h.DeleteDepartment,
			)
		}
	}
}

// RegisterRoleRoutes 设置角色管理路由。
// permissionH 用于角色权限矩阵接口（挂在 /roles 下）。
func RegisterRoleRoutes(protected *gin.RouterGroup, h *RoleHandler, permissionH *PermissionHandler) {
	roleGroup := protected.Group("/roles")
	{
		// 获取角色列表
		roleGroup.GET("", h.GetRoles)

		// 获取角色权限矩阵
		roleGroup.GET("/permission-matrix", permissionH.GetRolePermissionMatrix)

		// 获取角色详情
		roleGroup.GET("/:id",
			middleware.ValidateIDParam("id"),
			h.GetRole,
		)

		// 管理员权限的操作
		adminRoleGroup := roleGroup.Group("")
		adminRoleGroup.Use(middleware.RequirePermission("role:manage"))
		{
			// 创建角色
			adminRoleGroup.POST("",
				middleware.BindJSON(&request.CreateRoleRequest{}),
				h.CreateRole,
			)

			// 更新角色
			adminRoleGroup.PUT("/:id",
				middleware.ValidateIDParam("id"),
				middleware.BindJSON(&request.UpdateRoleRequest{}),
				h.UpdateRole,
			)

			// 删除角色
			adminRoleGroup.DELETE("/:id",
				middleware.ValidateIDParam("id"),
				h.DeleteRole,
			)
		}
	}
}

// RegisterPermissionRoutes 设置权限管理路由
func RegisterPermissionRoutes(protected *gin.RouterGroup, h *PermissionHandler) {
	permissionGroup := protected.Group("/permissions")
	{
		// 获取权限分组
		permissionGroup.GET("/groups", h.GetPermissionGroups)
	}
}
