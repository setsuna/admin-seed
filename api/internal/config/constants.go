package config

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"os"
	"strconv"
	"time"
)

// 全局常量配置 - 使用混淆的方式存储
const (
	// 系统标识的组件
	systemPart1 = "meeting"
	systemPart2 = "api"
	systemPart3 = "v1.0"
	systemPart4 = "setsuna"

	// 加密种子（Base64编码）
	seedJWT     = "bWVldGluZy1hcGktand0LXNlY3JldA=="
	seedFile    = "ZmlsZS1lbmNyeXB0LWtleQ=="
	seedDevice  = "ZGV2aWNlLWF1dGgtc2VjcmV0"
	seedLicense = "bGljZW5zZS1nZW5lcmF0aW9u"

	// 产品信息
	PRODUCT_NAME    = "SealMeet System"
	PRODUCT_VERSION = "1.0.0"
	PRODUCT_VENDOR  = "Xunyidi Tech"

	// 默认管理员账户 (仅用于初始化)
	DEFAULT_ADMIN_USERNAME = "admin"
	DEFAULT_ADMIN_PASSWORD = "meeting@2025"
)

// RSA公钥配置
// 公钥文件路径（支持多个路径，按顺序查找）
var LICENSE_PUBLIC_KEY_PATHS = []string{
	"./certs/public_key.pem",             // 相对路径（开发环境）
	"/opt/sealmeet/certs/public_key.pem", // 生产环境路径
	"/etc/sealmeet/certs/public_key.pem", // 备用配置路径
}

// 公钥缓存变量
var (
	cachedPublicKey string
	publicKeyLoaded bool
)

// 获取系统标识符
func getSystemID() string {
	return systemPart1 + "-" + systemPart2 + "-" + systemPart3 + "-" + systemPart4 + "-edition"
}

// 解码Base64种子
func decodeSeed(seed string) string {
	data, _ := base64.StdEncoding.DecodeString(seed)
	return string(data)
}

// 生成动态盐（基于系统信息）
func getDynamicSalt() string {
	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "default-host"
	}

	// 用系统标识和主机名生成盐
	salt := getSystemID() + "-" + hostname + "-2024"
	hash := sha256.Sum256([]byte(salt))
	return hex.EncodeToString(hash[:8]) // 取前8字节
}

// 生成最终密钥
func generateFinalKey(seed, purpose string) string {
	baseSeed := decodeSeed(seed)
	salt := getDynamicSalt()
	timeStamp := "20240101" // 固定时间戳

	// 组合所有组件
	combined := baseSeed + "-" + salt + "-" + purpose + "-" + timeStamp
	hash := sha256.Sum256([]byte(combined))
	return hex.EncodeToString(hash[:])
}

// GetFixedJWTSecret 获取JWT密钥
func GetFixedJWTSecret() string {
	return generateFinalKey(seedJWT, "jwt-auth")
}

// GetFixedEncryptionKey 获取文件加密密钥
func GetFixedEncryptionKey() string {
	// 生成完整密钥后只取32字节（AES-256）
	fullKey := generateFinalKey(seedFile, "file-encrypt")
	hash := sha256.Sum256([]byte(fullKey))
	return hex.EncodeToString(hash[:32]) // 32字节 = 64个十六进制字符
}

// GetDeviceAuthSecret 获取设备授权密钥
func GetDeviceAuthSecret() string {
	return generateFinalKey(seedDevice, "device-auth")
}

// GetLicenseSecret 获取授权码生成密钥
func GetLicenseSecret() string {
	return generateFinalKey(seedLicense, "license-gen")
}

// GetLicensePublicKey 获取授权验证RSA公钥
// 从文件读取，支持多路径查找和缓存

func GetLicensePublicKey() string {
	// 如果已经加载过，直接返回缓存
	if publicKeyLoaded {
		return cachedPublicKey
	}

	// 尝试从多个路径读取公钥文件
	for _, path := range LICENSE_PUBLIC_KEY_PATHS {
		if data, err := os.ReadFile(path); err == nil {
			cachedPublicKey = string(data)
			publicKeyLoaded = true
			return cachedPublicKey
		}
	}

	// 如果所有路径都失败，返回空字符串并记录警告
	// 注意：在实际使用时应该处理这个错误情况
	return ""
}

// ReloadPublicKey 重新加载公钥（用于密钥更换后刷新）
func ReloadPublicKey() error {
	for _, path := range LICENSE_PUBLIC_KEY_PATHS {
		if data, err := os.ReadFile(path); err == nil {
			cachedPublicKey = string(data)
			publicKeyLoaded = true
			return nil
		}
	}
	return os.ErrNotExist
}

// GetPublicKeyPath 获取实际使用的公钥文件路径（用于诊断）
func GetPublicKeyPath() string {
	for _, path := range LICENSE_PUBLIC_KEY_PATHS {
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}
	return "not found"
}

// IsDeveloperMode 检查是否开发者模式
var globalConfig *Config

func SetGlobalConfig(cfg *Config) {
	globalConfig = cfg
}

func IsDeveloperMode() bool {
	if globalConfig != nil {
		return globalConfig.Developer.Mode
	}
	// 直接检查环境变量
	if value := os.Getenv("DEVELOPER_MODE"); value != "" {
		if b, err := strconv.ParseBool(value); err == nil {
			return b
		}
	}
	return false
}

func ShouldSkipLicenseCheck() bool {
	if globalConfig != nil {
		return globalConfig.Developer.SkipLicense || globalConfig.Developer.Mode
	}
	// 直接检查环境变量
	skipLicense := false
	if value := os.Getenv("SKIP_LICENSE_CHECK"); value != "" {
		if b, err := strconv.ParseBool(value); err == nil {
			skipLicense = b
		}
	}

	developerMode := false
	if value := os.Getenv("DEVELOPER_MODE"); value != "" {
		if b, err := strconv.ParseBool(value); err == nil {
			developerMode = b
		}
	}

	return skipLicense || developerMode
}

// GetSystemInfo 获取系统信息
func GetSystemInfo() map[string]string {
	return map[string]string{
		"name":       PRODUCT_NAME,
		"version":    PRODUCT_VERSION,
		"vendor":     PRODUCT_VENDOR,
		"identifier": getSystemID(),
		"build_time": getBuildTime(),
	}
}

// 获取构建时间（由编译时注入）
var (
	buildTime string
)

func getBuildTime() string {
	if buildTime != "" {
		return buildTime
	}
	return time.Now().Format("20060102150405")
}
