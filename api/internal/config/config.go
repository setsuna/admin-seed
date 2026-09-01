package config

import (
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config 应用配置
type Config struct {
	Server    ServerConfig    `yaml:"server"`
	Database  DatabaseConfig  `yaml:"database"`
	JWT       JWTConfig       `yaml:"jwt"`
	Security  SecurityConfig  `yaml:"security"`
	Log       LogConfig       `yaml:"log"`
	File      FileConfig      `yaml:"file"`
	Package   PackageConfig   `yaml:"package"`
	Developer DeveloperConfig `yaml:"developer"`
	License   LicenseConfig   `yaml:"license"`
	Mount     MountConfig     `yaml:"mount"`
	Crypto    CryptoConfig    `yaml:"crypto"`
	Archive   ArchiveConfig   `yaml:"archive"`
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Host         string        `yaml:"host"`
	Port         int           `yaml:"port"`
	Mode         string        `yaml:"mode"` // debug, release, test
	ReadTimeout  time.Duration `yaml:"readTimeout"`
	WriteTimeout time.Duration `yaml:"writeTimeout"`
}

// DatabaseConfig 数据库配置
type DatabaseConfig struct {
	Driver       string `yaml:"driver"` // mysql, sqlite
	DSN          string `yaml:"dsn"`
	MaxOpenConns int    `yaml:"maxOpenConns"`
	MaxIdleConns int    `yaml:"maxIdleConns"`
	MaxLifetime  int    `yaml:"maxLifetime"` // minutes
}

// JWTConfig JWT配置
type JWTConfig struct {
	Secret           string        `yaml:"secret"`
	ExpiresIn        time.Duration `yaml:"expiresIn"`
	RefreshExpiresIn time.Duration `yaml:"refreshExpiresIn"`
	Issuer           string        `yaml:"issuer"`
}

// SecurityConfig 安全配置
type SecurityConfig struct {
	RateLimit    RateLimitConfig `yaml:"rateLimit"`
	CORS         CORSConfig      `yaml:"cors"`
	IPWhitelist  []string        `yaml:"ipWhitelist"`
	MaxFileSize  int64           `yaml:"maxFileSize"` // MB
	AllowedTypes []string        `yaml:"allowedTypes"`
}

// RateLimitConfig 限流配置
type RateLimitConfig struct {
	Enable bool    `yaml:"enable"`
	RPS    float64 `yaml:"rps"`   // 每秒请求数
	Burst  int     `yaml:"burst"` // 突发请求数
}

// CORSConfig CORS配置
type CORSConfig struct {
	AllowOrigins     []string `yaml:"allowOrigins"`
	AllowMethods     []string `yaml:"allowMethods"`
	AllowHeaders     []string `yaml:"allowHeaders"`
	ExposeHeaders    []string `yaml:"exposeHeaders"`
	AllowCredentials bool     `yaml:"allowCredentials"`
	MaxAge           int      `yaml:"maxAge"`
}

// LogConfig 日志配置
type LogConfig struct {
	Level      string `yaml:"level"`
	Format     string `yaml:"format"` // json, console
	Output     string `yaml:"output"` // stdout, file
	Filename   string `yaml:"filename"`
	MaxSize    int    `yaml:"maxSize"` // MB
	MaxBackups int    `yaml:"maxBackups"`
	MaxAge     int    `yaml:"maxAge"` // days
	Compress   bool   `yaml:"compress"`
}

// FileConfig 文件配置
type FileConfig struct {
	StorageRoot     string   `yaml:"storageRoot"`     // 文件存储根目录
	EncryptionKey   string   `yaml:"encryptionKey"`   // 加密主密钥
	MaxFileSize     int64    `yaml:"maxFileSize"`     // 最大文件大小（字节）
	AllowedTypes    []string `yaml:"allowedTypes"`    // 允许的文件类型
	ChunkSize       int      `yaml:"chunkSize"`       // 文件块大小（用于流式处理）
	CleanupInterval int      `yaml:"cleanupInterval"` // 清理间隔（分钟）
	TempDir         string   `yaml:"tempDir"`         // 临时目录

	// MaxRequestBodySize 单个请求体总上限（字节）。
	// 批量导入一次传输多个议题的全部文件，需要比单文件上限大得多。
	// 若部署拓扑存在反代，需同步调整反代的 client_max_body_size。
	MaxRequestBodySize int64 `yaml:"maxRequestBodySize"`
	// MaxMultipartMemory multipart 解析时驻留内存的上限（字节），超出部分落临时文件
	MaxMultipartMemory int64 `yaml:"maxMultipartMemory"`
}

// PackageConfig 打包配置
type PackageConfig struct {
	StorageRoot   string `yaml:"storageRoot"`   // 打包文件存储根目录
	EncryptionKey string `yaml:"encryptionKey"` // 打包加密密钥
}

// DeveloperConfig 开发者配置
type DeveloperConfig struct {
	Mode        bool `yaml:"mode"`        // 开发者模式开关
	SkipLicense bool `yaml:"skipLicense"` // 跳过授权检查
}

// LicenseConfig 授权配置
type LicenseConfig struct {
	Dir       string `yaml:"dir"`       // 授权文件目录
	File      string `yaml:"file"`      // 授权文件名
	PublicKey string `yaml:"publicKey"` // RSA公钥
	SecretKey string `yaml:"secretKey"` // 加密密钥
}

// CryptoConfig 加密配置
type CryptoConfig struct {
	Enable         bool   `yaml:"enable"`         // 是否启用密码加密
	PrivateKeyPath string `yaml:"privateKeyPath"` // RSA私钥文件路径
}

// ArchiveConfig 归档配置
type ArchiveConfig struct {
	StorageRoot string `yaml:"storageRoot"` // 归档文件存储目录
	FontPath    string `yaml:"fontPath"`    // 中文字体文件路径（TTF，用于生成签到PDF）
}

// MountConfig 挂载监控配置
type MountConfig struct {
	Enabled      bool          `yaml:"enabled"`      // 是否启用挂载监控
	MonitorType  string        `yaml:"monitorType"`  // 监控类型: polling, fsnotify, udev
	PollInterval time.Duration `yaml:"pollInterval"` // 轮询间隔（秒）
	BasePath     string        `yaml:"basePath"`     // 基础挂载路径
	AutoProcess  bool          `yaml:"autoProcess"`  // 是否自动处理
	AppDataDir   string        `yaml:"appDataDir"`   // 设备端应用数据目录名（为空回退到 sync.DefaultAppDataDir）

	// 同步配置
	MaxConcurrentTasks     int           `yaml:"maxConcurrentTasks"`     // 最大并发任务数
	TaskQueueSize          int           `yaml:"taskQueueSize"`          // 任务队列大小
	ProgressUpdateInterval time.Duration `yaml:"progressUpdateInterval"` // 进度更新间隔
	ProgressUpdateBytes    int64         `yaml:"progressUpdateBytes"`    // 进度更新字节数
	TaskTimeout            time.Duration `yaml:"taskTimeout"`            // 任务超时时间
}

// LoadConfig 加载配置
func LoadConfig() *Config {
	// 加载 .env 文件
	if err := godotenv.Load(); err != nil {
		// .env 文件不存在不是错误，可能使用系统环境变量
		log.Println("未找到 .env 文件，使用系统环境变量和默认值")
	}

	return &Config{
		Server: ServerConfig{
			Host:         getEnv("SERVER_HOST", "0.0.0.0"),
			Port:         getEnvInt("SERVER_PORT", 8080),
			Mode:         getEnv("GIN_MODE", "debug"),
			ReadTimeout:  time.Duration(getEnvInt("READ_TIMEOUT", 10)) * time.Second,
			WriteTimeout: time.Duration(getEnvInt("WRITE_TIMEOUT", 10)) * time.Second,
		},
		Database: DatabaseConfig{
			Driver:       getEnv("DB_DRIVER", "sqlite3"),
			DSN:          getEnv("DB_DSN", "./data.db"),
			MaxOpenConns: getEnvInt("DB_MAX_OPEN_CONNS", 100),
			MaxIdleConns: getEnvInt("DB_MAX_IDLE_CONNS", 10),
			MaxLifetime:  getEnvInt("DB_MAX_LIFETIME", 60),
		},
		JWT: JWTConfig{
			Secret:           GetFixedJWTSecret(), // 使用固定密钥
			ExpiresIn:        time.Duration(getEnvInt("JWT_EXPIRES_IN", 24)) * time.Hour,
			RefreshExpiresIn: time.Duration(getEnvInt("JWT_REFRESH_EXPIRES_IN", 168)) * time.Hour, // 7 days
			Issuer:           getEnv("JWT_ISSUER", "meeting-api"),
		},
		Security: SecurityConfig{
			RateLimit: RateLimitConfig{
				Enable: getEnvBool("RATE_LIMIT_ENABLE", true),
				// 内网离线系统，限流主要用于防异常风暴而非对抗公网滥用，
				// 且已改为按 userID 限流（不再多用户共享网关 IP 配额），因此适当放宽。
				RPS:   getEnvFloat("RATE_LIMIT_RPS", 30.0),
				Burst: getEnvInt("RATE_LIMIT_BURST", 60),
			},
			CORS: CORSConfig{
				AllowOrigins:     getCORSOrigins(),
				AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
				AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Request-ID", "X-Timestamp"},
				ExposeHeaders:    []string{"Content-Length", "Content-Type"},
				AllowCredentials: true,
				MaxAge:           12 * 60 * 60, // 12 hours
			},
			MaxFileSize:  getEnvInt64("MAX_FILE_SIZE", 100), // 100MB
			AllowedTypes: []string{".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt", ".zip"},
		},
		Log: LogConfig{
			Level:      getEnv("LOG_LEVEL", "info"),
			Format:     getEnv("LOG_FORMAT", "console"),
			Output:     getEnv("LOG_OUTPUT", "stdout"),
			Filename:   getEnv("LOG_FILENAME", "logs/app.log"),
			MaxSize:    getEnvInt("LOG_MAX_SIZE", 100),
			MaxBackups: getEnvInt("LOG_MAX_BACKUPS", 5),
			MaxAge:     getEnvInt("LOG_MAX_AGE", 30),
			Compress:   getEnvBool("LOG_COMPRESS", true),
		},
		File: FileConfig{
			StorageRoot:     getEnv("FILE_STORAGE_ROOT", "./files/storage"),
			EncryptionKey:   getFileEncryptionKey(),                      // 优先使用环境变量，否则使用固定密钥
			MaxFileSize:     getEnvInt64("FILE_MAX_SIZE", 100*1024*1024), // 100MB
			AllowedTypes:    []string{".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt", ".zip"},
			ChunkSize:       getEnvInt("FILE_CHUNK_SIZE", 8192),     // 8KB
			CleanupInterval: getEnvInt("FILE_CLEANUP_INTERVAL", 60), // 60分钟
			TempDir:         getEnv("FILE_TEMP_DIR", "./tmp"),
			// 批量导入请求体总上限，默认 500MB
			MaxRequestBodySize: getEnvInt64("FILE_MAX_REQUEST_BODY_SIZE", 500*1024*1024),
			// multipart 内存驻留上限，默认 32MB，超出部分由 Gin 落临时文件
			MaxMultipartMemory: getEnvInt64("FILE_MAX_MULTIPART_MEMORY", 32*1024*1024),
		},
		Package: PackageConfig{
			StorageRoot:   getEnv("PACKAGE_STORAGE_ROOT", "./files/packages"),
			EncryptionKey: getPackageEncryptionKey(),
		},
		Developer: DeveloperConfig{
			Mode:        getEnvBool("DEVELOPER_MODE", false),
			SkipLicense: getEnvBool("SKIP_LICENSE_CHECK", false),
		},
		License: LicenseConfig{
			Dir:       getEnv("LICENSE_DIR", "./config"),
			File:      getEnv("LICENSE_FILE", "system.license"),
			PublicKey: GetLicensePublicKey(),
			SecretKey: GetLicenseSecret(),
		},
		Crypto: CryptoConfig{
			Enable:         getEnvBool("CRYPTO_ENABLE", true),
			PrivateKeyPath: getEnv("CRYPTO_PRIVATE_KEY_PATH", "./certs/private_key.pem"),
		},
		Archive: ArchiveConfig{
			StorageRoot: getEnv("ARCHIVE_STORAGE_ROOT", "./files/archives"),
			FontPath:    getEnv("ARCHIVE_FONT_PATH", "./config/NotoSansSC-Regular.ttf"),
		},
		Mount: MountConfig{
			Enabled:      getEnvBool("MOUNT_ENABLED", false),
			MonitorType:  getEnv("MOUNT_MONITOR_TYPE", "polling"),
			PollInterval: time.Duration(getEnvInt("MOUNT_POLL_INTERVAL", 10)) * time.Second,
			BasePath:     getEnv("MOUNT_BASE_PATH", "/media"),
			AutoProcess:  getEnvBool("MOUNT_AUTO_PROCESS", false),
			AppDataDir:   getEnv("MOUNT_APP_DATA_DIR", ""), // 空则回退到 sync.DefaultAppDataDir(.sealmeet)

			// 同步配置
			MaxConcurrentTasks:     getEnvInt("MOUNT_MAX_CONCURRENT_TASKS", 2),
			TaskQueueSize:          getEnvInt("MOUNT_TASK_QUEUE_SIZE", 100),
			ProgressUpdateInterval: time.Duration(getEnvInt("MOUNT_PROGRESS_UPDATE_INTERVAL", 1)) * time.Second,
			ProgressUpdateBytes:    getEnvInt64("MOUNT_PROGRESS_UPDATE_BYTES", 1024*1024), // 1MB
			TaskTimeout:            time.Duration(getEnvInt("MOUNT_TASK_TIMEOUT", 30)) * time.Minute,
		},
	}
}

// 环境变量辅助函数
//
// 注意：godotenv 对不带引号的值不会去除首尾空白，例如
//	 MOUNT_APP_DATA_DIR=.sealmeet␠
// 会读出 ".sealmeet "（带尾随空格）。这类值多为路径/目录名，
// 带空格后不会报错、只会静默生成错误的目录，因此统一 TrimSpace。
func getEnv(key, defaultValue string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if i, err := strconv.Atoi(value); err == nil {
			return i
		}
	}
	return defaultValue
}

func getEnvInt64(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		if i, err := strconv.ParseInt(value, 10, 64); err == nil {
			return i
		}
	}
	return defaultValue
}

func getEnvFloat(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if f, err := strconv.ParseFloat(value, 64); err == nil {
			return f
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if b, err := strconv.ParseBool(value); err == nil {
			return b
		}
	}
	return defaultValue
}

// getFileEncryptionKey 获取文件加密密钥，优先使用环境变量
func getFileEncryptionKey() string {
	if key := os.Getenv("FILE_ENCRYPTION_KEY"); key != "" {
		return key
	}
	// 如果没有配置环境变量，使用自动生成的固定密钥
	return GetFixedEncryptionKey()
}

// getPackageEncryptionKey 获取打包加密密钥，优先使用环境变量
func getPackageEncryptionKey() string {
	if key := os.Getenv("PACKAGE_ENCRYPTION_KEY"); key != "" {
		return key
	}
	// 如果没有配置环境变量，使用固定密钥
	return "package-encryption-key-32-chars!!"
}

// getCORSOrigins 获取CORS允许的源，支持从环境变量配置
func getCORSOrigins() []string {
	// 从环境变量读取，支持逗号分隔的多个域名
	if origins := os.Getenv("CORS_ALLOW_ORIGINS"); origins != "" {
		// 如果配置了 "*"，则允许所有源（使用动态CORS）
		if origins == "*" {
			return []string{"*"}
		}
		// 分割多个域名（逗号分隔）
		originList := strings.Split(origins, ",")
		// 去除空格
		for i := range originList {
			originList[i] = strings.TrimSpace(originList[i])
		}
		return originList
	}

	// 默认值：允许所有源（开发环境便利）
	return []string{"*"}
}
