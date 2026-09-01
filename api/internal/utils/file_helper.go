package utils

import (
	"os"
	"path/filepath"
	"time"
)

// FileEntry 文件条目信息
type FileEntry struct {
	Path    string
	Name    string
	Size    int64
	ModTime time.Time
	IsDir   bool
}

// GetDirectoryEntries 获取目录中的所有条目
func GetDirectoryEntries(dir string) ([]*FileEntry, error) {
	var entries []*FileEntry

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// 跳过根目录本身
		if path == dir {
			return nil
		}

		entry := &FileEntry{
			Path:    path,
			Name:    info.Name(),
			Size:    info.Size(),
			ModTime: info.ModTime(),
			IsDir:   info.IsDir(),
		}

		entries = append(entries, entry)
		return nil
	})

	return entries, err
}

// RemoveFile 删除文件或目录
func RemoveFile(path string) error {
	return os.RemoveAll(path)
}

// CreateTempFile 创建临时文件
func CreateTempFile(dir, pattern string) (*os.File, error) {
	return os.CreateTemp(dir, pattern)
}

// GetFileExtension 获取文件扩展名
func GetFileExtension(filename string) string {
	return filepath.Ext(filename)
}

// SanitizeFilename 清理文件名，移除不安全字符
func SanitizeFilename(filename string) string {
	// 这里可以添加文件名清理逻辑
	// 移除路径分隔符和其他不安全字符
	safe := filepath.Base(filename)
	return safe
}
