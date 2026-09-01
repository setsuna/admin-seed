package utils

import (
	"os"

	"admin-seed/internal/config"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// NewLogger 创建日志记录器
func NewLogger(cfg *config.LogConfig) (*zap.Logger, error) {
	// 设置日志级别
	level, err := zapcore.ParseLevel(cfg.Level)
	if err != nil {
		level = zapcore.InfoLevel
	}

	// 设置编码配置
	encoderConfig := zapcore.EncoderConfig{
		TimeKey:        "timestamp",
		LevelKey:       "level",
		NameKey:        "logger",
		CallerKey:      "caller",
		FunctionKey:    zapcore.OmitKey,
		MessageKey:     "message",
		StacktraceKey:  "stacktrace",
		LineEnding:     zapcore.DefaultLineEnding,
		EncodeLevel:    zapcore.LowercaseLevelEncoder,
		EncodeTime:     zapcore.ISO8601TimeEncoder,
		EncodeDuration: zapcore.SecondsDurationEncoder,
		EncodeCaller:   zapcore.ShortCallerEncoder,
	}

	// 设置编码器
	var encoder zapcore.Encoder
	if cfg.Format == "json" {
		encoder = zapcore.NewJSONEncoder(encoderConfig)
	} else {
		// 控制台格式的颜色配置
		encoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
		encoder = zapcore.NewConsoleEncoder(encoderConfig)
	}

	// 设置输出
	var writeSyncer zapcore.WriteSyncer
	switch cfg.Output {
	case "file":
		// 创建日志目录
		if err := os.MkdirAll("logs", 0755); err != nil {
			return nil, err
		}

		// TODO: 可以添加日志轮转功能
		file, err := os.OpenFile(cfg.Filename, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
		if err != nil {
			return nil, err
		}
		writeSyncer = zapcore.AddSync(file)
	default:
		writeSyncer = zapcore.AddSync(os.Stdout)
	}

	// 创建核心
	core := zapcore.NewCore(encoder, writeSyncer, level)

	// 创建logger
	logger := zap.New(
		core,
		zap.AddCaller(),
		zap.AddStacktrace(zapcore.ErrorLevel),
	)

	return logger, nil
}

// NewDevelopmentLogger 创建开发环境日志记录器
func NewDevelopmentLogger() (*zap.Logger, error) {
	config := zap.NewDevelopmentConfig()
	config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	return config.Build()
}

// NewProductionLogger 创建生产环境日志记录器
func NewProductionLogger() (*zap.Logger, error) {
	return zap.NewProduction()
}
