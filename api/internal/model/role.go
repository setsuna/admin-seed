package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// Role 角色数据库模型
type Role struct {
	ID             string        `json:"id" db:"id"`
	Name           string        `json:"name" db:"name"`
	Code           string        `json:"code" db:"code"`
	Description    string        `json:"description" db:"description"`
	PermissionsStr string        `json:"-" db:"permissions"` // 数据库存储字段
	Permissions    []string      `json:"permissions" db:"-"` // JSON字段
	Status         string        `json:"status" db:"status"` // 'active', 'inactive', 'deleted'
	Type           string        `json:"type" db:"type"`     // 'system', 'business', 'custom'
	Level          int           `json:"level" db:"level"`
	IsBuiltIn      bool          `json:"is_built_in" db:"is_built_in"`
	// DataScope 数据范围：1-全部 2-自定义 3-本部门 4-本部门及以下 5-仅本人
	// 多级代理/加盟场景由此控制"谁能看到哪些数据"，取代按角色枚举硬编码。
	DataScope      int           `json:"data_scope" db:"data_scope"`
	MetadataStr    string        `json:"-" db:"metadata"`           // 数据库存储字段
	Metadata       *RoleMetadata `json:"metadata,omitempty" db:"-"` // JSON字段
	CreatedAt      time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time     `json:"updated_at" db:"updated_at"`
}

// RoleMetadata 角色元数据
type RoleMetadata struct {
	Color    string `json:"color,omitempty"`
	Icon     string `json:"icon,omitempty"`
	Category string `json:"category,omitempty"`
}

// TableName 返回表名
func (Role) TableName() string {
	return "roles"
}

// 角色状态常量
const (
	RoleStatusActive   = "active"
	RoleStatusInactive = "inactive"
	RoleStatusDeleted  = "deleted"
)

// 角色类型常量
const (
	RoleTypeSystem   = "system"
	RoleTypeBusiness = "business"
	RoleTypeCustom   = "custom"
)

// Scan 实现 sql.Scanner 接口 - 用于 Metadata
func (m *RoleMetadata) Scan(value interface{}) error {
	if value == nil {
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into RoleMetadata", value)
	}

	return json.Unmarshal(bytes, m)
}

// Value 实现 driver.Valuer 接口 - 用于 Metadata
func (m RoleMetadata) Value() (driver.Value, error) {
	return json.Marshal(m)
}
