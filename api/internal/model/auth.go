package model

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims JWT载荷
type JWTClaims struct {
	UserID      string   `json:"sub"`         // 用户ID
	Username    string   `json:"username"`    // 用户名
	Name        string   `json:"name"`        // 姓名（用于审计日志等显示）
	Roles       []string `json:"roles"`       // 用户角色
	Permissions []string `json:"permissions"` // 权限列表
	jwt.RegisteredClaims
}

// Claims 类型别名，用于兼容
type Claims = JWTClaims

// TokenValidationResponse Token验证响应
type TokenValidationResponse struct {
	Valid     bool      `json:"valid"`
	UserID    string    `json:"user_id"`
	Username  string    `json:"username"`
	Role      string    `json:"role"`
	ExpiresAt time.Time `json:"expires_at"`
	IssuedAt  time.Time `json:"issued_at"`
}
