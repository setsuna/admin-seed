package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"fmt"
	"io"
)

// FileEncryption 文件加密工具
type FileEncryption struct {
	masterKey []byte
}

// NewFileEncryption 创建文件加密工具
func NewFileEncryption(masterKey string) *FileEncryption {
	// 确保主密钥长度为32字节
	key := sha256.Sum256([]byte(masterKey))
	return &FileEncryption{
		masterKey: key[:],
	}
}

// DeriveKey 派生文件专用密钥
func (f *FileEncryption) DeriveKey(fileID string) []byte {
	// 使用固定盐值和文件ID派生密钥
	salt := "meeting-api-file-salt-2024"
	data := fmt.Sprintf("%s%s%s", f.masterKey, fileID, salt)
	key := sha256.Sum256([]byte(data))
	return key[:]
}

// EncryptData 加密数据
func (f *FileEncryption) EncryptData(data []byte, fileID string) ([]byte, error) {
	// 派生文件专用密钥
	key := f.DeriveKey(fileID)

	// 创建AES-GCM加密器
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("创建AES加密器失败: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("创建GCM加密器失败: %w", err)
	}

	// 生成随机nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("生成nonce失败: %w", err)
	}

	// 加密数据
	encrypted := gcm.Seal(nonce, nonce, data, nil)
	return encrypted, nil
}

// DecryptData 解密数据
func (f *FileEncryption) DecryptData(encryptedData []byte, fileID string) ([]byte, error) {
	// 派生文件专用密钥
	key := f.DeriveKey(fileID)

	// 创建AES-GCM解密器
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("创建AES解密器失败: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("创建GCM解密器失败: %w", err)
	}

	// 检查数据长度
	nonceSize := gcm.NonceSize()
	if len(encryptedData) < nonceSize {
		return nil, fmt.Errorf("加密数据长度不足")
	}

	// 提取nonce和密文
	nonce := encryptedData[:nonceSize]
	ciphertext := encryptedData[nonceSize:]

	// 解密数据
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("解密失败: %w", err)
	}

	return plaintext, nil
}

// CalculateChecksum 计算文件校验和
func CalculateChecksum(data []byte) string {
	hash := sha256.Sum256(data)
	return fmt.Sprintf("%x", hash)
}
