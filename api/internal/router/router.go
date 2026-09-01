package router

import (
	"context"
	"os"

	"admin-seed/internal/config"
	"admin-seed/internal/handler"
	"admin-seed/internal/handler/auth"
	"admin-seed/internal/handler/platform"
	"admin-seed/internal/handler/user"
	"admin-seed/internal/middleware"
	"admin-seed/internal/service"
	"admin-seed/internal/utils"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Router 路由配置
type Router struct {
	engine     *gin.Engine
	config     *config.Config
	logger     *zap.Logger
	jwtManager *utils.JWTManager
	handlers   *handler.Handlers
	staticDir  string
	logService *service.OperationLogService

	// rateLimiter API 限流器，需在服务关闭时停止其清理 goroutine
	rateLimiter *middleware.RateLimiter
	// cancelCleanup 用于取消限流器清理 goroutine
	cancelCleanup context.CancelFunc
}

// NewRouter 创建路由
func NewRouter(cfg *config.Config, logger *zap.Logger, jwtManager *utils.JWTManager, handlers *handler.Handlers) *Router {
	// 设置Gin模式
	gin.SetMode(cfg.Server.Mode)

	engine := gin.New()

	return &Router{
		engine:     engine,
		config:     cfg,
		logger:     logger,
		jwtManager: jwtManager,
		handlers:   handlers,
		staticDir:  "./static",
		logService: handlers.OperationLogService,
	}
}

// Setup 设置路由
func (r *Router) Setup() *gin.Engine {
	// 全局中间件
	r.setupMiddleware()

	// 设置路由
	r.setupRoutes()

	return r.engine
}

// Close 释放路由持有的后台资源（限流器清理 goroutine）。
// 应在服务优雅关闭时调用。
func (r *Router) Close() {
	if r.cancelCleanup != nil {
		r.cancelCleanup()
	}
	if r.rateLimiter != nil {
		r.rateLimiter.Stop()
	}
}

// setupMiddleware 设置中间件
func (r *Router) setupMiddleware() {
	// 全局错误处理中间件（最先加载）
	r.engine.Use(middleware.ErrorHandlerMiddleware(r.logger))

	// 业务错误处理中间件
	r.engine.Use(middleware.ErrorResponseMiddleware(r.logger))

	// 请求ID中间件
	r.engine.Use(middleware.RequestID())

	// 安全头中间件
	r.engine.Use(middleware.Security())
	r.engine.Use(middleware.RemovePoweredBy())

	// CORS中间件
	r.engine.Use(middleware.CORS(&r.config.Security.CORS))

	// 注意：限流中间件不在此处全局挂载。
	// 全局挂载会让静态资源（/assets/*）与 API 争抢同一份令牌桶配额，
	// 因此限流只作用于 /api/v1 路由组，详见 setupRoutes。

	// 日志中间件
	r.engine.Use(middleware.AccessLog(r.logger))
	r.engine.Use(middleware.ErrorLog(r.logger))
}

// setupRoutes 设置路由
func (r *Router) setupRoutes() {
	h := r.handlers

	// 健康检查路由（无需认证）
	r.engine.GET("/health", h.Health.Health)
	r.engine.GET("/ready", h.Health.Ready)

	// 文档路由
	r.engine.GET("/docs", h.Docs.Redoc)

	// API v1路由组
	v1 := r.engine.Group("/api/v1")

	// 限流中间件：只作用于 API 路由组，静态资源不受影响。
	// 限流 key 为 userID，未认证请求回退按 IP（详见 middleware.rateLimitKey）。
	// 注意本中间件挂在 AuthMiddleware 之前，未认证端点（如登录）走 IP 回退分支，
	// 认证后的端点在 AuthMiddleware 设置 user_id 后走 userID 分支。
	// 限流未启用时 RateLimit 返回空操作中间件且 limiter 为 nil。
	rateLimitHandler, limiter := middleware.RateLimit(&r.config.Security.RateLimit)
	if limiter != nil {
		ctx, cancel := context.WithCancel(context.Background())
		limiter.StartCleanup(ctx, 0, 0) // 0 表示使用默认清理间隔与空闲时长
		r.rateLimiter = limiter
		r.cancelCleanup = cancel
	}
	v1.Use(rateLimitHandler)

	// 登录审计（此时尚未认证，需从响应体提取用户信息）
	v1.Use(middleware.AuditAuthMiddleware(h.OperationLogService))

	// 认证相关路由（无需认证）
	auth.RegisterAuthRoutes(v1, h.Auth, r.jwtManager)

	// 需要认证的路由组
	protected := v1.Group("")
	protected.Use(middleware.AuthMiddleware(r.jwtManager))
	protected.Use(middleware.AuditLogMiddleware(h.OperationLogService)) // 必须在 AuthMiddleware 之后，才能拿到登录用户
	{
		// 数据字典路由
		platform.RegisterDictRoutes(protected, h.Dict)

		// 日志管理路由
		platform.RegisterLogRoutes(protected, h.OperationLog)

		// 菜单配置路由
		platform.RegisterMenuRoutes(protected, h.Menu)

		// 权限管理路由
		user.RegisterPermissionRoutes(protected, h.Permission)

		// 角色管理路由
		user.RegisterRoleRoutes(protected, h.Role, h.Permission)

		// 策略配置路由
		platform.RegisterPolicyRoutes(protected, h.Policy)

		// 部门管理路由
		user.RegisterDepartmentRoutes(protected, h.Department)

		// 用户管理路由
		user.RegisterUserRoutes(protected, h.User)

		// 仪表板路由
		platform.RegisterDashboardRoutes(protected, h.Dashboard)

	}

	// 静态文件服务
	r.setupStaticRoutes()
}

// setupStaticRoutes 设置静态文件路由
func (r *Router) setupStaticRoutes() {
	// 检查静态文件目录是否存在
	if _, err := os.Stat(r.staticDir); os.IsNotExist(err) {
		r.logger.Warn("静态文件目录不存在", zap.String("dir", r.staticDir))
		return
	}

	// Vite 构建的静态资源（JS、CSS、图片等）
	r.engine.Static("/assets", r.staticDir+"/assets")

	// 网站图标
	r.engine.StaticFile("/favicon.ico", r.staticDir+"/favicon.ico")
	r.engine.StaticFile("/logo.svg", r.staticDir+"/logo.svg")

	// 根路径返回前端入口
	r.engine.GET("/", func(c *gin.Context) {
		c.File(r.staticDir + "/index.html")
	})

	// SPA路由fallback - 所有未匹配的路由都返回 index.html
	// 让 React Router 处理前端路由
	r.engine.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		// API、Docs 路由返回 404 JSON
		if len(path) >= 4 && (path[:4] == "/api" ||
			len(path) >= 5 && path[:5] == "/docs" ||
			len(path) >= 7 && path[:7] == "/health" ||
			len(path) >= 6 && path[:6] == "/ready") {
			c.JSON(404, gin.H{
				"code":      404,
				"message":   "endpoint not found",
				"path":      path,
				"timestamp": c.GetInt64("timestamp"),
			})
			return
		}

		// 其他路由返回 index.html（前端路由）
		c.File(r.staticDir + "/index.html")
	})

	r.logger.Info("静态文件服务已启用", zap.String("dir", r.staticDir))
}
