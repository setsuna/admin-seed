package utils

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"os"
)

// RSADecryptor RSA解密器
type RSADecryptor struct {
	privateKey *rsa.PrivateKey
}

// NewRSADecryptor 创建RSA解密器
func NewRSADecryptor(privateKeyPath string) (*RSADecryptor, error) {
	keyData, err := os.ReadFile(privateKeyPath)
	if err != nil {
		return nil, err
	}

	block, _ := pem.Decode(keyData)
	if block == nil {
		return nil, errors.New("failed to parse PEM block")
	}

	// 支持 PKCS#8 格式
	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		// 尝试 PKCS#1 格式
		key, err = x509.ParsePKCS1PrivateKey(block.Bytes)
		if err != nil {
			return nil, err
		}
	}

	rsaKey, ok := key.(*rsa.PrivateKey)
	if !ok {
		return nil, errors.New("not an RSA private key")
	}

	return &RSADecryptor{privateKey: rsaKey}, nil
}

// Decrypt 解密Base64编码的密文
func (d *RSADecryptor) Decrypt(ciphertext string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	plaintext, err := rsa.DecryptPKCS1v15(rand.Reader, d.privateKey, data)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
