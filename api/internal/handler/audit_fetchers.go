package handler

// audit_fetchers.go — 审计快照抓取器的集中注册。
//
// 「零埋点」的落地处：注册一次，中间件便会在每个写操作的业务逻辑执行前后
// 各调用一次对应 Fetcher，从数据库取得 before / after 真实快照，
// 进而生成「XX 从 A 改为 B」的变更明细。
//
// 新增资源时，只需在下方追加一条 RegisterMany，handler 无需任何改动。
// 未注册的写操作不会丢日志，只是缺少 before 快照（中间件会标注原因）。
//
// 注意：
//   - 路由模板必须与 router 中注册的路径完全一致（含 :id 占位符）。
//   - Fetcher 内不要读取请求体，body 只能被读取一次。
//   - 任何错误都会被中间件吞掉，不影响主业务流程。

import (
	"admin-seed/internal/audit"
	"admin-seed/internal/service"

	"github.com/gin-gonic/gin"
)

// 常用方法组合
var (
	writeMethods  = []string{"PUT", "PATCH", "DELETE"}
	updateMethods = []string{"PUT", "PATCH"}
)

// registerAuditFetchers 注册系统管理资源的审计快照抓取器。
// 在 NewHandlers 末尾调用，此时各 service 均已构造完毕。
func registerAuditFetchers(
	userService *service.UserService,
	departmentService *service.DepartmentService,
	roleService *service.RoleService,
	policyService *service.PolicyService,
) {
	// ---------------- 用户 ----------------
	userByID := func(c *gin.Context) (any, error) {
		return userService.GetUser(c.Param("id"))
	}
	audit.RegisterMany(writeMethods, "/api/v1/users/:id", userByID)
	audit.Register("POST", "/api/v1/users/:id/reset-password", userByID)
	audit.RegisterMany(updateMethods, "/api/v1/users/:id/status", userByID)

	// ---------------- 部门 ----------------
	audit.RegisterMany(writeMethods, "/api/v1/departments/:id", func(c *gin.Context) (any, error) {
		return departmentService.GetDepartment(c.Param("id"))
	})

	// ---------------- 角色 ----------------
	audit.RegisterMany(writeMethods, "/api/v1/roles/:id", func(c *gin.Context) (any, error) {
		return roleService.GetRole(c.Request.Context(), c.Param("id"))
	})

	// ---------------- 安全策略 ----------------
	audit.RegisterMany(updateMethods, "/api/v1/policy", func(c *gin.Context) (any, error) {
		return policyService.GetPolicy(c.Request.Context())
	})
}
