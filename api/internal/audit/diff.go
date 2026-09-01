package audit

// diff.go — 变更对比引擎。
//
// 关键设计：before 与 after 一律先归一化为 map[string]any 再比对。
//
// 原实现用 reflect 直接比较两个值，要求 before/after 类型完全相同；
// 但实际上 before 来自 service 返回的结构体指针，after 来自响应 JSON
// 反序列化得到的 map —— 类型永远不同，比对必然返回空，导致所有 UPDATE
// 日志被静默丢弃。归一化后该问题根除。

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"
)

// ToMap 把任意对象（结构体、指针、map）归一化为 map[string]any。
// 通过 JSON 往返实现，因此字段名与 json tag 一致，与响应体天然对齐。
func ToMap(v any) map[string]any {
	if v == nil {
		return nil
	}
	if m, ok := v.(map[string]any); ok {
		return m
	}

	data, err := json.Marshal(v)
	if err != nil {
		return nil
	}
	var m map[string]any
	if err := json.Unmarshal(data, &m); err != nil {
		return nil
	}
	return m
}

// Sanitize 返回剔除敏感字段后的副本，用于写入 before_data / after_data。
func Sanitize(m map[string]any) map[string]any {
	if m == nil {
		return nil
	}
	out := make(map[string]any, len(m))
	for k, v := range m {
		if IsSensitiveField(k) {
			continue
		}
		out[k] = v
	}
	return out
}

// Change 单个字段的变更。
type Change struct {
	Field  string `json:"field"`  // 原始字段名（json tag）
	Label  string `json:"label"`  // 中文显示名
	Before string `json:"before"` // 格式化后的旧值
	After  string `json:"after"`  // 格式化后的新值
}

// BuildChanges 对比 before/after，返回发生变化的字段列表。
//
// 只比对 after 中出现的字段（after 通常是更新后的完整对象；若接口只返回
// 部分字段，也只对这些字段负责，避免把“未返回”误判为“被清空”）。
func BuildChanges(before, after map[string]any) []Change {
	if before == nil || after == nil {
		return nil
	}

	changes := make([]Change, 0, 4)
	for key, afterVal := range after {
		if isIgnoredField(key) || IsSensitiveField(key) {
			continue
		}

		beforeVal, existed := before[key]
		if !existed {
			// before 中没有该字段：可能是接口新增返回项，不视为变更
			continue
		}

		if equalValue(beforeVal, afterVal) {
			continue
		}

		changes = append(changes, Change{
			Field:  key,
			Label:  displayFieldName(key),
			Before: FormatValue(key, beforeVal),
			After:  FormatValue(key, afterVal),
		})
	}

	// 稳定输出顺序，便于阅读与测试
	sort.Slice(changes, func(i, j int) bool { return changes[i].Field < changes[j].Field })

	if len(changes) == 0 {
		return nil
	}
	return changes
}

// DescribeChanges 把变更列表渲染成中文描述：
//
//	"密级 从 内部 改为 秘密；状态 从 正常 改为 停用"
func DescribeChanges(changes []Change) string {
	if len(changes) == 0 {
		return ""
	}
	parts := make([]string, 0, len(changes))
	for _, ch := range changes {
		parts = append(parts, fmt.Sprintf("%s 从 %s 改为 %s", ch.Label, ch.Before, ch.After))
	}
	return strings.Join(parts, "；")
}

// equalValue 比较两个来自 JSON 的值。
// JSON 反序列化后数字统一是 float64，切片是 []any，故用 JSON 再序列化比较，
// 既能处理嵌套结构，又避免 int/float64 的伪差异。
func equalValue(a, b any) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}

	// 时间字符串归一化：忽略等价时间的格式差异
	if ta, ok := parseTime(a); ok {
		if tb, ok2 := parseTime(b); ok2 {
			return ta.Equal(tb)
		}
	}

	ja, errA := json.Marshal(a)
	jb, errB := json.Marshal(b)
	if errA != nil || errB != nil {
		return fmt.Sprintf("%v", a) == fmt.Sprintf("%v", b)
	}
	return string(ja) == string(jb)
}

// parseTime 尝试把值解析为时间（仅处理字符串形式）。
func parseTime(v any) (time.Time, bool) {
	s, ok := v.(string)
	if !ok || s == "" {
		return time.Time{}, false
	}
	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02 15:04:05",
	}
	for _, l := range layouts {
		if t, err := time.Parse(l, s); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}

// FormatValue 把字段值渲染为便于阅读的中文文本。
func FormatValue(field string, v any) string {
	if v == nil {
		return "空"
	}

	switch val := v.(type) {
	case string:
		if val == "" {
			return "空"
		}
		// 枚举翻译：先按 "字段:值" 精确匹配
		if zh, ok := valueDisplayNames[field+":"+val]; ok {
			return zh
		}
		// 未命中时按 snake_case 归一化字段名再查（兼容 camelCase 资源）
		if snake := camelToSnake(field); snake != field {
			if zh, ok := valueDisplayNames[snake+":"+val]; ok {
				return zh
			}
		}
		return val

	case bool:
		if val {
			return "是"
		}
		return "否"

	case float64:
		// JSON 数字统一为 float64；整数去掉小数尾巴
		if val == float64(int64(val)) {
			return fmt.Sprintf("%d", int64(val))
		}
		return fmt.Sprintf("%.2f", val)

	case []any:
		if len(val) == 0 {
			return "空"
		}
		items := make([]string, 0, len(val))
		for _, item := range val {
			items = append(items, FormatValue(field, item))
		}
		return strings.Join(items, "、")

	case map[string]any:
		if len(val) == 0 {
			return "空"
		}
		data, err := json.Marshal(val)
		if err != nil {
			return "复杂对象"
		}
		return string(data)

	default:
		return fmt.Sprintf("%v", v)
	}
}
