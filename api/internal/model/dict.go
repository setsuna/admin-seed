package model

import (
	"database/sql"
	"time"
)

// DataDict 数据字典数据库模型
type DataDict struct {
	ID        string         `json:"id" db:"id"`
	DictCode  string         `json:"dict_code" db:"dict_code"`
	DictName  string         `json:"dict_name" db:"dict_name"`
	DictType  string         `json:"dict_type" db:"dict_type"`
	Status    string         `json:"status" db:"status"` // 'enabled', 'disabled'
	ItemCount int            `json:"item_count" db:"item_count"`
	Remark    sql.NullString `json:"remark" db:"remark"`
	CreatedAt time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt time.Time      `json:"updated_at" db:"updated_at"`
}

// TableName 返回表名
func (DataDict) TableName() string {
	return "data_dicts"
}

// DictItem 字典项数据库模型
type DictItem struct {
	ID        string    `json:"id" db:"id"`
	DictCode  string    `json:"dict_code" db:"dict_code"` // 关联字典代码
	Code      string    `json:"code" db:"code"`
	Name      string    `json:"name" db:"name"`
	Value     string    `json:"value" db:"value"`
	Status    string    `json:"status" db:"status"` // 'enabled', 'disabled'
	Sort      int       `json:"sort" db:"sort"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// TableName 返回表名
func (DictItem) TableName() string {
	return "dict_items"
}

// DictType 字典类型
type DictType struct {
	Type string `json:"type"`
	Name string `json:"name"`
}

// 字典状态常量
const (
	DictStatusEnabled  = "enabled"
	DictStatusDisabled = "disabled"
)
