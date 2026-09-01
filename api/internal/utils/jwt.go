package utils

import (
	"errors"
	"fmt"
	"time"

	"admin-seed/internal/config"
	"admin-seed/internal/model"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrTokenExpired = errors.New("token已过期")
	ErrTokenInvalid = errors.New("无效的token")
)

// JWTManager JWT管理器
type JWTManager struct {
	config *config.JWTConfig
}

// NewJWTManager 创建JWT管理器
func NewJWTManager(cfg *config.JWTConfig) *JWTManager {
	return &JWTManager{
		config: cfg,
	}
}

// GenerateToken 生成JWT token
func (j *JWTManager) GenerateToken(userID, username, name string, roles, permissions []string) (string, error) {
	now := time.Now()
	claims := &model.JWTClaims{
		UserID:      userID,
		Username:    username,
		Name:        name,
		Roles:       roles,
		Permissions: permissions,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    j.config.Issuer,
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(j.config.ExpiresIn)),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(j.config.Secret))
}

// GenerateRefreshToken 生成刷新令牌
func (j *JWTManager) GenerateRefreshToken(userID string) (string, error) {
	now := time.Now()
	claims := &jwt.RegisteredClaims{
		Issuer:    j.config.Issuer,
		Subject:   userID,
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(j.config.RefreshExpiresIn)),
		NotBefore: jwt.NewNumericDate(now),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	// 使用同样的secret签名refresh token，也可以使用不同的secret
	return token.SignedString([]byte(j.config.Secret + "_refresh"))
}

// ParseToken 解析JWT token
func (j *JWTManager) ParseToken(tokenString string) (*model.JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &model.JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(j.config.Secret), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		return nil, ErrTokenInvalid
	}

	if claims, ok := token.Claims.(*model.JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, ErrTokenInvalid
}

// ParseRefreshToken 解析刷新令牌
func (j *JWTManager) ParseRefreshToken(tokenString string) (string, error) {
	token, err := jwt.ParseWithClaims(tokenString, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(j.config.Secret + "_refresh"), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return "", ErrTokenExpired
		}
		return "", ErrTokenInvalid
	}

	if claims, ok := token.Claims.(*jwt.RegisteredClaims); ok && token.Valid {
		return claims.Subject, nil
	}

	return "", ErrTokenInvalid
}

// ValidateToken 验证token有效性
func (j *JWTManager) ValidateToken(tokenString string) bool {
	_, err := j.ParseToken(tokenString)
	return err == nil
}

// GetTokenRemainingTime 获取token剩余时间
func (j *JWTManager) GetTokenRemainingTime(tokenString string) (time.Duration, error) {
	claims, err := j.ParseToken(tokenString)
	if err != nil {
		return 0, err
	}

	remaining := time.Until(claims.ExpiresAt.Time)
	if remaining <= 0 {
		return 0, ErrTokenExpired
	}

	return remaining, nil
}
