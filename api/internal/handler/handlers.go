package handler

import (
	"context"
	"database/sql"

	"admin-seed/internal/config"
	"admin-seed/internal/handler/auth"
	"admin-seed/internal/handler/platform"
	"admin-seed/internal/handler/system"
	"admin-seed/internal/handler/user"
	"admin-seed/internal/repository"
	"admin-seed/internal/service"
	"admin-seed/internal/utils"
	ws "admin-seed/internal/websocket"

	"go.uber.org/zap"
)

// Handlers 处理器集合。
//
// 种子项目只包含框架层与系统管理能力：
//   system   健康检查 / 文档 / 静态资源
//   auth     登录 / 登出 / 刷新 Token / 修改密码
//   user     用户 / 角色 / 权限 / 部门
//   platform 字典 / 菜单 / 安全策略 / 仪表盘 / 操作日志
//
// 新增业务域时，在此追加对应 handler 字段与构造即可。
type Handlers struct {
	// system 域
	Health *system.HealthHandler
	Docs   *system.DocsHandler
	Static *system.StaticHandler

	// auth 域
	Auth *auth.AuthHandler

	// user 域
	Role       *user.RoleHandler
	Permission *user.PermissionHandler
	Department *user.DepartmentHandler
	User       *user.UserHandler

	// platform 域
	Dict         *platform.DictHandler
	Menu         *platform.MenuHandler
	Policy       *platform.PolicyHandler
	Dashboard    *platform.DashboardHandler
	OperationLog *platform.OperationLogHandler

	// 供中间件与业务层复用的服务
	OperationLogService *service.OperationLogService
	WSManager           *ws.Manager
}

// sqlDatabase 实现 db.Database 接口
type sqlDatabase struct {
	*sql.DB
}

func (d *sqlDatabase) BeginTx(ctx context.Context, opts *sql.TxOptions) (*sql.Tx, error) {
	return d.DB.BeginTx(ctx, opts)
}

// NewHandlers 创建所有处理器
func NewHandlers(cfg *config.Config, database *sql.DB, jwtManager *utils.JWTManager, logger *zap.Logger) *Handlers {
	dbWrapper := &sqlDatabase{DB: database}

	// ---- Repository ----
	userRepo := repository.NewUserRepository(dbWrapper)
	deptRepo := repository.NewDepartmentRepository(dbWrapper)
	dictRepo := repository.NewDictRepository(dbWrapper)
	roleRepo := repository.NewRoleRepository(database)
	policyRepo := repository.NewPolicyRepository(database)
	repoManager := repository.NewRepositoryManager(database)

	// ---- Service ----
	loginTracker := utils.NewLoginTracker()
	policyChecker := service.NewPasswordPolicyChecker(policyRepo)

	userService := service.NewUserService(userRepo, deptRepo, roleRepo, loginTracker, policyChecker, repoManager)
	dictService := service.NewDictService(dictRepo)
	menuService := service.NewMenuService(userRepo, roleRepo, dictRepo, logger)
	roleService := service.NewRoleService(repoManager, database)
	permissionService := service.NewPermissionService(dictRepo, repoManager.Role())
	departmentService := service.NewDepartmentService(deptRepo, userRepo)
	operationLogService := service.NewOperationLogService(repoManager)
	policyService := service.NewPolicyService(repoManager)
	dashboardService := service.NewDashboardService(database)

	// ---- 可选：RSA 密码解密 ----
	var rsaDecryptor *utils.RSADecryptor
	if cfg.Crypto.Enable {
		var err error
		rsaDecryptor, err = utils.NewRSADecryptor(cfg.Crypto.PrivateKeyPath)
		if err != nil {
			logger.Fatal("密码加密已启用但 RSA 私钥加载失败，请检查私钥文件是否存在",
				zap.String("path", cfg.Crypto.PrivateKeyPath),
				zap.Error(err),
			)
		}
	}

	// ---- WebSocket ----
	wsManager := ws.NewManager(logger)

	// ---- 审计快照抓取器（零埋点，middleware 自动调用）----
	registerAuditFetchers(userService, departmentService, roleService, policyService)

	return &Handlers{
		Health: system.NewHealthHandler(),
		Docs:   system.NewDocsHandler(),
		Static: system.NewStaticHandler("./static"),

		Auth: auth.NewAuthHandler(jwtManager, userService, roleRepo, rsaDecryptor,
			cfg.Crypto.Enable && rsaDecryptor != nil, operationLogService),

		Role:       user.NewRoleHandler(roleService),
		Permission: user.NewPermissionHandler(permissionService),
		Department: user.NewDepartmentHandler(departmentService),
		User:       user.NewUserHandler(userService),

		Dict:         platform.NewDictHandler(dictService, logger),
		Menu:         platform.NewMenuHandler(menuService, logger),
		Policy:       platform.NewPolicyHandler(policyService),
		Dashboard:    platform.NewDashboardHandler(dashboardService),
		OperationLog: platform.NewOperationLogHandler(operationLogService),

		OperationLogService: operationLogService,
		WSManager:           wsManager,
	}
}
