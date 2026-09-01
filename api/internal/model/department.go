package model

import (
	"time"
)

// Department 部门数据库模型
type Department struct {
	ID            string    `json:"id" db:"id"`
	Name          string    `json:"name" db:"name"`
	Code          string    `json:"code" db:"code"`
	Description   *string   `json:"description" db:"description"`
	ParentID      *string   `json:"parent_id" db:"parent_id"`
	ManagerID     string    `json:"manager_id" db:"manager_id"`
	ManagerName   string    `json:"manager_name" db:"manager_name"`
	Level         int       `json:"level" db:"level"`
	Path          string    `json:"path" db:"path"`
	Sort          int       `json:"sort" db:"sort"`
	Status        string    `json:"status" db:"status"` // 'enabled', 'disabled'
	Phone         *string   `json:"phone" db:"phone"`
	Email         *string   `json:"email" db:"email"`
	Address       *string   `json:"address" db:"address"`
	EmployeeCount int       `json:"employee_count" db:"employee_count"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}

// TableName 返回表名
func (Department) TableName() string {
	return "departments"
}

// 部门状态常量
const (
	DepartmentStatusEnabled  = "enabled"
	DepartmentStatusDisabled = "disabled"
)
