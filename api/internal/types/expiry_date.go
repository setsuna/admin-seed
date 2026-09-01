package types

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// ExpiryDate 过期日期类型，支持只传日期，自动补充为当天 23:59:59
type ExpiryDate struct {
	Time  time.Time
	Valid bool // Valid 为 true 表示 Time 有效
}

// UnmarshalJSON 实现 json.Unmarshaler 接口
func (ed *ExpiryDate) UnmarshalJSON(data []byte) error {
	// 处理 null
	if string(data) == "null" {
		ed.Valid = false
		return nil
	}

	// 处理空字符串
	var s string
	if err := json.Unmarshal(data, &s); err == nil {
		if s == "" {
			ed.Valid = false
			return nil
		}

		// 尝试解析各种日期格式
		var t time.Time
		var parseErr error

		// 格式1: 只有日期 "2025-10-24"
		t, parseErr = time.Parse("2006-01-02", s)
		if parseErr == nil {
			// 设置为当天的 23:59:59（东八区）
			loc, _ := time.LoadLocation("Asia/Shanghai")
			ed.Time = time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, loc)
			ed.Valid = true
			return nil
		}

		// 格式2: 完整的时间格式（带时区）
		t, parseErr = time.Parse(time.RFC3339, s)
		if parseErr == nil {
			ed.Time = t
			ed.Valid = true
			return nil
		}

		// 格式3: 不带时区的完整时间
		t, parseErr = time.Parse("2006-01-02T15:04:05", s)
		if parseErr == nil {
			loc, _ := time.LoadLocation("Asia/Shanghai")
			ed.Time = time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), t.Minute(), t.Second(), 0, loc)
			ed.Valid = true
			return nil
		}

		return fmt.Errorf("无法解析日期格式: %s", s)
	}

	// 处理直接的时间对象
	var t time.Time
	if err := json.Unmarshal(data, &t); err != nil {
		return err
	}

	ed.Time = t
	ed.Valid = true
	return nil
}

// MarshalJSON 实现 json.Marshaler 接口
func (ed ExpiryDate) MarshalJSON() ([]byte, error) {
	if !ed.Valid {
		return []byte("null"), nil
	}
	return json.Marshal(ed.Time)
}

// Scan 实现 sql.Scanner 接口（用于数据库读取）
func (ed *ExpiryDate) Scan(value interface{}) error {
	if value == nil {
		ed.Valid = false
		return nil
	}

	if t, ok := value.(time.Time); ok {
		ed.Time = t
		ed.Valid = true
		return nil
	}

	return nil
}

// Value 实现 driver.Valuer 接口（用于数据库写入）
func (ed ExpiryDate) Value() (driver.Value, error) {
	if !ed.Valid {
		return nil, nil
	}
	return ed.Time, nil
}

// ToTimePointer 转换为 *time.Time
func (ed ExpiryDate) ToTimePointer() *time.Time {
	if !ed.Valid {
		return nil
	}
	return &ed.Time
}

// NewExpiryDate 从字符串创建 ExpiryDate
func NewExpiryDate(dateStr string) (ExpiryDate, error) {
	if dateStr == "" {
		return ExpiryDate{Valid: false}, nil
	}

	var ed ExpiryDate
	data, _ := json.Marshal(dateStr)
	err := ed.UnmarshalJSON(data)
	return ed, err
}
