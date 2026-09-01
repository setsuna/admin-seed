package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// User 用户数据库模型
type User struct {
	ID                string     `json:"id" db:"id"`
	Username          string     `json:"username" db:"username"`
	Password          string     `json:"-" db:"password"` // 密码字段，不在JSON中显示
	Email             string     `json:"email" db:"email"`
	Role              string     `json:"role" db:"role"` // 'admin', 'user', 'system_admin', 'security_admin', 'audit_admin'
	Avatar            string     `json:"avatar" db:"avatar"`
	Department        string     `json:"department" db:"department"`
	DepartmentName    string     `json:"department_name" db:"department_name"`
	Position          string     `json:"position" db:"position"`
	Phone             string     `json:"phone" db:"phone"`
	Status            string     `json:"status" db:"status"`                           // 'active', 'inactive', 'suspended'
	SecurityLevel     string     `json:"security_level" db:"security_level"`           // 'internal', 'confidential', 'secret', 'unknown'
	AllowedIPs        string     `json:"allowed_ips" db:"allowed_ips"`                 // IP白名单，JSON数组字符串
	UkeyID            string     `json:"ukey_id" db:"ukey_id"`                         // Ukey ID
	Name              string     `json:"name" db:"name"`                               // 姓名
	LastLoginIP       string     `json:"last_login_ip" db:"last_login_ip"`             // 最后登录IP
	IsHide            bool       `json:"is_hide" db:"is_hide"`                         // 隐藏标记
	IsDeleted         bool       `json:"is_deleted" db:"is_deleted"`                   // 删除标记
	PasswordChangedAt *time.Time `json:"password_changed_at" db:"password_changed_at"` // 密码最后修改时间
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
	LastLoginAt       *time.Time `json:"last_login_at" db:"last_login_at"`
	PermissionsStr    string     `json:"-" db:"permissions"`      // 数据库存储字段
	Permissions       []string   `json:"permissions" db:"-"`      // JSON字段
	AllowedIPsList    []string   `json:"allowed_ips_list" db:"-"` // 解析后的IP列表
}

// TableName 返回表名
func (User) TableName() string {
	return "users"
}

// SecurityLevelHistory 安全级别变更历史模型
type SecurityLevelHistory struct {
	ID            string    `json:"id" db:"id"`
	UserID        string    `json:"user_id" db:"user_id"`
	OldLevel      string    `json:"old_level" db:"old_level"`
	NewLevel      string    `json:"new_level" db:"new_level"`
	UpdatedBy     string    `json:"updated_by" db:"updated_by"`
	UpdatedByName string    `json:"updated_by_name" db:"updated_by_name"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
	Reason        string    `json:"reason" db:"reason"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

// TableName 返回表名
func (SecurityLevelHistory) TableName() string {
	return "security_level_histories"
}

// 用户状态常量
const (
	UserStatusActive    = "active"
	UserStatusInactive  = "inactive"
	UserStatusSuspended = "suspended"
)

// 密级常量
const (
	SecurityLevelInternal     = "internal"
	SecurityLevelConfidential = "confidential"
	SecurityLevelSecret       = "secret"
	SecurityLevelUnknown      = "unknown"
)

// securityLevelRanks 密级→等级序。数值越大密级越高。
// 未登记的值（空串 / unknown / 非法值）rank 为 0，视为无效。
var securityLevelRanks = map[string]int{
	SecurityLevelInternal:     1,
	SecurityLevelConfidential: 2,
	SecurityLevelSecret:       3,
}

// SecurityLevelRank 返回密级的等级序；internal<confidential<secret。
// 空串 / unknown / 非法值返回 0（无效）。
func SecurityLevelRank(level string) int {
	return securityLevelRanks[level]
}

// IsValidSecurityLevel 判断是否为有效密级（internal/confidential/secret 之一）。
func IsValidSecurityLevel(level string) bool {
	return securityLevelRanks[level] > 0
}

// SecurityLevelWithin 判断 subject 密级是否不高于 resource 密级（subject ≤ resource）。
// 任一方密级无效时返回 false（安全默认拒绝）。
// 用于「参会人/文件密级 ≤ 会议密级」类校验。
func SecurityLevelWithin(subject, resource string) bool {
	sr := securityLevelRanks[subject]
	rr := securityLevelRanks[resource]
	if sr == 0 || rr == 0 {
		return false
	}
	return sr <= rr
}

// SecurityLevelAtLeast 判断 subject 密级是否不低于 resource 密级（subject ≥ resource）。
// 任一方密级无效时返回 false（安全默认拒绝）。
// 用于“参会人密级 ≥ 会议密级”校验（高密级人员可参加低密级会议）。
func SecurityLevelAtLeast(subject, resource string) bool {
	sr := securityLevelRanks[subject]
	rr := securityLevelRanks[resource]
	if sr == 0 || rr == 0 {
		return false
	}
	return sr >= rr
}

// 角色常量统一定义在 constants.go 中，请使用 Role* 系列常量

// StringSlice 字符串切片类型，用于JSON字段
type StringSlice []string

// Scan 实现 sql.Scanner 接口
func (s *StringSlice) Scan(value interface{}) error {
	if value == nil {
		*s = []string{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into StringSlice", value)
	}

	return json.Unmarshal(bytes, s)
}

// Value 实现 driver.Valuer 接口
func (s StringSlice) Value() (driver.Value, error) {
	if s == nil {
		return nil, nil
	}
	return json.Marshal(s)
}
