package utils

import (
	"crypto/rand"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// FileStorage 文件存储工具
type FileStorage struct {
	rootPath string
}

// NewFileStorage 创建文件存储工具
func NewFileStorage(rootPath string) *FileStorage {
	return &FileStorage{
		rootPath: rootPath,
	}
}

// GenerateFilePath 生成文件存储路径
func (fs *FileStorage) GenerateFilePath(meetingID string) (string, string, error) {
	now := time.Now()
	year := now.Format("2006")
	month := now.Format("01")

	// 生成随机文件名
	randomName, err := fs.generateRandomFileName()
	if err != nil {
		return "", "", err
	}

	// 构建相对路径: 2024/01/m001/abc123.enc
	relativePath := filepath.Join(year, month, meetingID, randomName+".enc")

	// 构建绝对路径
	absolutePath := filepath.Join(fs.rootPath, relativePath)

	return relativePath, absolutePath, nil
}

// generateRandomFileName 生成随机文件名
func (fs *FileStorage) generateRandomFileName() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return fmt.Sprintf("%x", bytes), nil
}

// EnsureDir 确保目录存在
func (fs *FileStorage) EnsureDir(filePath string) error {
	dir := filepath.Dir(filePath)
	return os.MkdirAll(dir, 0755)
}

// WriteFileSecure 安全写入文件
func (fs *FileStorage) WriteFileSecure(filePath string, data []byte) error {
	// 确保目录存在
	if err := fs.EnsureDir(filePath); err != nil {
		return fmt.Errorf("创建目录失败: %w", err)
	}

	// 创建临时文件
	tempFile := filePath + ".tmp"

	file, err := os.OpenFile(tempFile, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0600)
	if err != nil {
		return fmt.Errorf("创建临时文件失败: %w", err)
	}
	defer file.Close()

	// 写入数据
	if _, err := file.Write(data); err != nil {
		os.Remove(tempFile)
		return fmt.Errorf("写入文件失败: %w", err)
	}

	// 确保数据写入磁盘
	if err := file.Sync(); err != nil {
		os.Remove(tempFile)
		return fmt.Errorf("同步文件失败: %w", err)
	}

	file.Close()

	// 原子性重命名
	if err := os.Rename(tempFile, filePath); err != nil {
		os.Remove(tempFile)
		return fmt.Errorf("重命名文件失败: %w", err)
	}

	return nil
}

// ReadFile 读取文件
func (fs *FileStorage) ReadFile(relativePath string) ([]byte, error) {
	absolutePath := filepath.Join(fs.rootPath, relativePath)
	return os.ReadFile(absolutePath)
}

// DeleteFile 删除文件
func (fs *FileStorage) DeleteFile(relativePath string) error {
	absolutePath := filepath.Join(fs.rootPath, relativePath)
	return os.Remove(absolutePath)
}

// WriteFileStream 流式写入大文件
func (fs *FileStorage) WriteFileStream(filePath string, reader io.Reader, chunkSize int) error {
	// 确保目录存在
	if err := fs.EnsureDir(filePath); err != nil {
		return fmt.Errorf("创建目录失败: %w", err)
	}

	// 创建临时文件
	tempFile := filePath + ".tmp"

	file, err := os.OpenFile(tempFile, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0600)
	if err != nil {
		return fmt.Errorf("创建临时文件失败: %w", err)
	}
	defer file.Close()

	// 分块写入
	buffer := make([]byte, chunkSize)
	for {
		n, err := reader.Read(buffer)
		if n > 0 {
			if _, writeErr := file.Write(buffer[:n]); writeErr != nil {
				os.Remove(tempFile)
				return fmt.Errorf("写入文件块失败: %w", writeErr)
			}
		}
		if err != nil {
			if err == io.EOF {
				break
			}
			os.Remove(tempFile)
			return fmt.Errorf("读取数据块失败: %w", err)
		}
	}

	// 确保数据写入磁盘
	if err := file.Sync(); err != nil {
		os.Remove(tempFile)
		return fmt.Errorf("同步文件失败: %w", err)
	}

	file.Close()

	// 原子性重命名
	if err := os.Rename(tempFile, filePath); err != nil {
		os.Remove(tempFile)
		return fmt.Errorf("重命名文件失败: %w", err)
	}

	return nil
}

// ValidateFileType 验证文件类型
func ValidateFileType(filename string, allowedTypes []string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	for _, allowedType := range allowedTypes {
		if ext == strings.ToLower(allowedType) {
			return true
		}
	}
	return false
}

// GetFileSize 获取文件大小
func (fs *FileStorage) GetFileSize(relativePath string) (int64, error) {
	absolutePath := filepath.Join(fs.rootPath, relativePath)
	info, err := os.Stat(absolutePath)
	if err != nil {
		return 0, err
	}
	return info.Size(), nil
}
