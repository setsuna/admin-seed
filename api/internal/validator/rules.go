package validator

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
)

// ValidationRule 验证规则定义
type ValidationRule struct {
	Field    string                 // 字段名
	Tag      string                 // 验证标签
	Message  string                 // 自定义错误消息
	Required bool                   // 是否必填
	Depends  []string               // 依赖字段
	Custom   func(interface{}) bool // 自定义验证函数
}

// RuleSet 规则集
type RuleSet struct {
	Name  string                    // 规则集名称
	Rules map[string]ValidationRule // 字段规则映射
}

// 预定义的验证规则集
var (
	// 用户相关验证规则
	UserRules = RuleSet{
		Name: "user",
		Rules: map[string]ValidationRule{
			"username": {
				Field:    "username",
				Tag:      "required,username",
				Message:  "用户名必须是3-20位的字母、数字或下划线组合",
				Required: true,
			},
			"password": {
				Field:    "password",
				Tag:      "required,min=6,max=50",
				Message:  "密码长度必须在6-50位之间",
				Required: true,
			},
			"strong_password": {
				Field:    "password",
				Tag:      "required,strongpassword",
				Message:  "密码必须至少8位，且包含大小写字母、数字和特殊字符中的至少3种",
				Required: true,
			},
			"email": {
				Field:   "email",
				Tag:     "omitempty,email",
				Message: "邮箱格式不正确",
			},
			"mobile": {
				Field:   "mobile",
				Tag:     "omitempty,mobile",
				Message: "手机号码格式不正确",
			},
			"status": {
				Field:   "status",
				Tag:     "omitempty,status",
				Message: "状态值不正确",
			},
		},
	}

	// 分页相关验证规则
	PaginationRules = RuleSet{
		Name: "pagination",
		Rules: map[string]ValidationRule{
			"page": {
				Field:   "page",
				Tag:     "omitempty,gte=1",
				Message: "页码必须大于等于1",
			},
			"pageSize": {
				Field:   "pageSize",
				Tag:     "omitempty,gte=1,lte=100",
				Message: "每页数量必须在1-100之间",
			},
			"size": {
				Field:   "size",
				Tag:     "omitempty,gte=1,lte=100",
				Message: "每页数量必须在1-100之间",
			},
		},
	}

	// ID相关验证规则
	IDRules = RuleSet{
		Name: "id",
		Rules: map[string]ValidationRule{
			"id": {
				Field:    "id",
				Tag:      "required,min=1",
				Message:  "ID不能为空",
				Required: true,
			},
			"uuid": {
				Field:    "id",
				Tag:      "required,uuid",
				Message:  "ID必须是有效的UUID格式",
				Required: true,
			},
			"ids": {
				Field:    "ids",
				Tag:      "required,min=1,dive,required",
				Message:  "ID列表不能为空",
				Required: true,
			},
		},
	}

	// 字典相关验证规则
	DictRules = RuleSet{
		Name: "dict",
		Rules: map[string]ValidationRule{
			"dict_code": {
				Field:    "dictCode",
				Tag:      "required,min=2,max=50,alphanum",
				Message:  "字典代码必须是2-50位的字母数字组合",
				Required: true,
			},
			"dict_name": {
				Field:    "dictName",
				Tag:      "required,min=2,max=100",
				Message:  "字典名称必须在2-100个字符之间",
				Required: true,
			},
			"dict_type": {
				Field:   "dictType",
				Tag:     "required,oneof=system business",
				Message: "字典类型必须是system或business",
			},
			"item_key": {
				Field:    "itemKey",
				Tag:      "required,min=1,max=50",
				Message:  "字典项键必须在1-50个字符之间",
				Required: true,
			},
			"item_value": {
				Field:    "itemValue",
				Tag:      "required,min=1,max=100",
				Message:  "字典项值必须在1-100个字符之间",
				Required: true,
			},
			"sort_order": {
				Field:   "sortOrder",
				Tag:     "omitempty,gte=0",
				Message: "排序值必须大于等于0",
			},
		},
	}

	// 文件相关验证规则
	FileRules = RuleSet{
		Name: "file",
		Rules: map[string]ValidationRule{
			"file_name": {
				Field:    "fileName",
				Tag:      "required,min=1,max=255",
				Message:  "文件名必须在1-255个字符之间",
				Required: true,
			},
			"file_size": {
				Field:   "fileSize",
				Tag:     "omitempty,gte=0",
				Message: "文件大小必须大于等于0",
			},
			"file_type": {
				Field:   "fileType",
				Tag:     "omitempty,oneof=image document video audio other",
				Message: "文件类型不正确",
			},
		},
	}

	// 搜索相关验证规则
	SearchRules = RuleSet{
		Name: "search",
		Rules: map[string]ValidationRule{
			"keyword": {
				Field:   "keyword",
				Tag:     "omitempty,min=1,max=100",
				Message: "关键词长度必须在1-100个字符之间",
			},
			"search_type": {
				Field:   "searchType",
				Tag:     "omitempty,oneof=exact fuzzy",
				Message: "搜索类型必须是exact或fuzzy",
			},
		},
	}

	// 时间相关验证规则
	TimeRules = RuleSet{
		Name: "time",
		Rules: map[string]ValidationRule{
			"start_time": {
				Field:   "startTime",
				Tag:     "omitempty,datetime=2006-01-02 15:04:05",
				Message: "开始时间格式不正确",
			},
			"end_time": {
				Field:   "endTime",
				Tag:     "omitempty,datetime=2006-01-02 15:04:05",
				Message: "结束时间格式不正确",
			},
		},
	}
)

// GetRuleSet 获取规则集
func GetRuleSet(name string) (RuleSet, bool) {
	switch name {
	case "user":
		return UserRules, true
	case "pagination":
		return PaginationRules, true
	case "id":
		return IDRules, true
	case "dict":
		return DictRules, true
	case "file":
		return FileRules, true
	case "search":
		return SearchRules, true
	case "time":
		return TimeRules, true
	default:
		return RuleSet{}, false
	}
}

// MergeRuleSets 合并多个规则集
func MergeRuleSets(ruleSets ...RuleSet) RuleSet {
	merged := RuleSet{
		Name:  "merged",
		Rules: make(map[string]ValidationRule),
	}

	for _, ruleSet := range ruleSets {
		for field, rule := range ruleSet.Rules {
			merged.Rules[field] = rule
		}
	}

	return merged
}

// ApplyRuleSet 应用规则集到结构体
func ApplyRuleSet(s interface{}, ruleSet RuleSet) []ValidationError {
	var errors []ValidationError

	v := reflect.ValueOf(s)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}

	if v.Kind() != reflect.Struct {
		return errors
	}

	t := v.Type()
	for i := 0; i < v.NumField(); i++ {
		field := t.Field(i)
		fieldValue := v.Field(i)

		// 获取JSON标签作为字段名
		jsonTag := field.Tag.Get("json")
		if jsonTag == "" || jsonTag == "-" {
			continue
		}

		fieldName := strings.Split(jsonTag, ",")[0]
		if rule, exists := ruleSet.Rules[fieldName]; exists {
			if err := GlobalValidator.ValidateVar(fieldValue.Interface(), rule.Tag); err != nil {
				if validationErrs, ok := err.(validator.ValidationErrors); ok {
					for _, validationErr := range validationErrs {
						message := rule.Message
						if message == "" {
							message = getValidationMessage(validationErr)
						}
						errors = append(errors, ValidationError{
							Field:   fieldName,
							Message: message,
							Value:   fieldValue.Interface(),
						})
					}
				}
			}
		}
	}

	return errors
}

// CustomRule 自定义规则构建器
type CustomRule struct {
	field    string
	tag      string
	message  string
	required bool
	custom   func(interface{}) bool
}

// NewCustomRule 创建自定义规则
func NewCustomRule(field, tag string) *CustomRule {
	return &CustomRule{
		field: field,
		tag:   tag,
	}
}

// WithMessage 设置错误消息
func (cr *CustomRule) WithMessage(message string) *CustomRule {
	cr.message = message
	return cr
}

// WithRequired 设置必填
func (cr *CustomRule) WithRequired() *CustomRule {
	cr.required = true
	return cr
}

// WithCustom 设置自定义验证函数
func (cr *CustomRule) WithCustom(fn func(interface{}) bool) *CustomRule {
	cr.custom = fn
	return cr
}

// Build 构建验证规则
func (cr *CustomRule) Build() ValidationRule {
	return ValidationRule{
		Field:    cr.field,
		Tag:      cr.tag,
		Message:  cr.message,
		Required: cr.required,
		Custom:   cr.custom,
	}
}

// RuleBuilder 规则构建器
type RuleBuilder struct {
	rules map[string]ValidationRule
}

// NewRuleBuilder 创建规则构建器
func NewRuleBuilder() *RuleBuilder {
	return &RuleBuilder{
		rules: make(map[string]ValidationRule),
	}
}

// AddRule 添加规则
func (rb *RuleBuilder) AddRule(field, tag string, message ...string) *RuleBuilder {
	rule := ValidationRule{
		Field: field,
		Tag:   tag,
	}
	if len(message) > 0 {
		rule.Message = message[0]
	}
	rb.rules[field] = rule
	return rb
}

// AddRequired 添加必填规则
func (rb *RuleBuilder) AddRequired(field string, message ...string) *RuleBuilder {
	return rb.AddRule(field, "required", message...)
}

// AddEmail 添加邮箱规则
func (rb *RuleBuilder) AddEmail(field string, required bool, message ...string) *RuleBuilder {
	tag := "email"
	if !required {
		tag = "omitempty,email"
	} else {
		tag = "required,email"
	}
	return rb.AddRule(field, tag, message...)
}

// AddLength 添加长度规则
func (rb *RuleBuilder) AddLength(field string, min, max int, message ...string) *RuleBuilder {
	tag := fmt.Sprintf("min=%d,max=%d", min, max)
	return rb.AddRule(field, tag, message...)
}

// AddRange 添加数值范围规则
func (rb *RuleBuilder) AddRange(field string, min, max int, message ...string) *RuleBuilder {
	tag := fmt.Sprintf("gte=%d,lte=%d", min, max)
	return rb.AddRule(field, tag, message...)
}

// AddOneOf 添加枚举规则
func (rb *RuleBuilder) AddOneOf(field string, values []string, message ...string) *RuleBuilder {
	tag := fmt.Sprintf("oneof=%s", strings.Join(values, " "))
	return rb.AddRule(field, tag, message...)
}

// Build 构建规则集
func (rb *RuleBuilder) Build(name string) RuleSet {
	return RuleSet{
		Name:  name,
		Rules: rb.rules,
	}
}

// 便捷的规则集合并函数
func CombineRules(names ...string) RuleSet {
	var ruleSets []RuleSet
	for _, name := range names {
		if ruleSet, exists := GetRuleSet(name); exists {
			ruleSets = append(ruleSets, ruleSet)
		}
	}
	return MergeRuleSets(ruleSets...)
}

// 常用组合规则集
var (
	// 基础CRUD规则集
	BasicCRUDRules = CombineRules("id", "pagination")

	// 用户管理规则集
	UserManagementRules = CombineRules("user", "pagination")

	// 字典管理规则集
	DictManagementRules = CombineRules("dict", "pagination", "id")

	// 文件管理规则集
	FileManagementRules = CombineRules("file", "pagination", "id")

	// 搜索功能规则集
	SearchFeatureRules = CombineRules("search", "pagination")
)
