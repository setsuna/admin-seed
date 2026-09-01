package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"admin-seed/internal/config"
	"admin-seed/internal/database"
	"admin-seed/internal/handler"
	"admin-seed/internal/router"
	"admin-seed/internal/utils"

	// 数据库驱动导入
	_ "github.com/go-sql-driver/mysql"
	_ "github.com/mattn/go-sqlite3"

	"go.uber.org/zap"
)

func main() {
	// 第一步：环境验证（在任何其他初始化之前）
	if err := performSecurityChecks(); err != nil {
		fmt.Printf("系统安全检查失败: %v\n", err)
		os.Exit(1)
	}

	// 加载配置
	cfg := config.LoadConfig()

	// 设置全局配置
	config.SetGlobalConfig(cfg)

	// 初始化授权配置

	// 初始化日志
	logger, err := utils.NewLogger(&cfg.Log)
	if err != nil {
		panic(fmt.Sprintf("初始化日志失败: %v", err))
	}
	defer logger.Sync()


	// 记录启动信息
	logger.Info("会议管理API服务启动中...",
		zap.String("version", "1.0.0"),
		zap.String("mode", cfg.Server.Mode),
		zap.String("port", fmt.Sprintf("%d", cfg.Server.Port)),
	)

	// 初始化JWT管理器
	jwtManager := utils.NewJWTManager(&cfg.JWT)

	// 初始化数据库
	dbManager := database.NewManager(&cfg.Database)
	if err := dbManager.Connect(); err != nil {
		logger.Fatal("数据库连接失败", zap.Error(err))
	}
	defer dbManager.Close()

	// 初始化数据库表
	if err := dbManager.InitTables(); err != nil {
		logger.Fatal("数据库表初始化失败", zap.Error(err))
	}

	logger.Info("数据库初始化成功",
		zap.String("driver", cfg.Database.Driver),
		zap.String("dsn", maskDSN(cfg.Database.DSN)),
	)

	// 确保文件存储目录存在
	fileStorage := utils.NewFileStorage(cfg.File.StorageRoot)
	if err := fileStorage.EnsureDir(cfg.File.StorageRoot); err != nil {
		logger.Fatal("创建文件存储目录失败", zap.Error(err))
	}

	// 确保临时目录存在
	// 0700：涉密系统，临时目录仅当前服务进程可访问
	if err := os.MkdirAll(cfg.File.TempDir, 0700); err != nil {
		logger.Fatal("创建临时目录失败", zap.Error(err))
	}

	logger.Info("文件存储初始化成功",
		zap.String("storage_root", cfg.File.StorageRoot),
		zap.String("temp_dir", cfg.File.TempDir),
	)

	// 初始化处理器
	handlers := handler.NewHandlers(cfg, dbManager.GetDB(), jwtManager, logger)

	// 初始化路由
	r := router.NewRouter(cfg, logger, jwtManager, handlers)
	engine := r.Setup()

	// 显式设置 multipart 内存驻留上限（超出部分由 Gin 落临时文件），
	// 避免批量导入大请求体时全量驻留内存。
	engine.MaxMultipartMemory = cfg.File.MaxMultipartMemory

	// 释放路由持有的后台资源（限流器清理 goroutine）
	defer r.Close()

	// 创建HTTP服务器
	srv := &http.Server{
		Addr:           fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler:        engine,
		ReadTimeout:    cfg.Server.ReadTimeout,
		WriteTimeout:   cfg.Server.WriteTimeout,
		MaxHeaderBytes: 1 << 20, // 1MB
	}

	// 启动服务器
	go func() {
		logger.Info("HTTP服务器启动",
			zap.String("address", srv.Addr),
		)

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("HTTP服务器启动失败", zap.Error(err))
		}
	}()

	// 等待中断信号进行优雅关闭
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("正在关闭服务器...")

	// 停止限流器清理 goroutine
	r.Close()

	// 设置5秒的超时时间
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 优雅关闭服务器
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("服务器关闭失败", zap.Error(err))
	} else {
		logger.Info("服务器已优雅关闭")
	}

	select {
	case <-ctx.Done():
		logger.Info("服务器关闭超时")
	default:
		logger.Info("服务器关闭完成")
	}
}

// maskDSN 隐藏DSN中的敏感信息
func maskDSN(dsn string) string {
	if len(dsn) > 20 {
		return dsn[:10] + "****" + dsn[len(dsn)-6:]
	}
	return "****"
}

// performSecurityChecks 执行安全检查
func performSecurityChecks() error {
	// 种子项目未启用环境验证 / 授权校验，按需在此扩展
	return nil
}
