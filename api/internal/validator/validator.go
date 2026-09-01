package validator

import (
	"fmt"
	"reflect"
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
)

// UnifiedValidator 统一验证器
type UnifiedValidator struct {
	validator *validator.Validate
}

// ValidationError 验证错误
type ValidationError struct {
	Field   string      `json:"field"`
	Message string      `json:"message"`
	Value   interface{} `json:"value,omitempty"`
}

// NewUnifiedValidator 创建统一验证器
func NewUnifiedValidator() *UnifiedValidator {
	v := validator.New()

	// 注册自定义标签名函数
	v.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})

	// 注册自定义验证规则
	registerCustomValidations(v)

	return &UnifiedValidator{
		validator: v,
	}
}

// ValidateStruct 验证结构体
func (uv *UnifiedValidator) ValidateStruct(s interface{}) []ValidationError {
	var validationErrors []ValidationError

	if err := uv.validator.Struct(s); err != nil {
		if errs, ok := err.(validator.ValidationErrors); ok {
			for _, validationErr := range errs {
				validationErrors = append(validationErrors, ValidationError{
					Field:   validationErr.Field(),
					Message: getValidationMessage(validationErr),
					Value:   validationErr.Value(),
				})
			}
		}
	}

	return validationErrors
}

// ValidateVar 验证单个变量
func (uv *UnifiedValidator) ValidateVar(field interface{}, tag string) error {
	return uv.validator.Var(field, tag)
}

// RegisterValidation 注册自定义验证规则
func (uv *UnifiedValidator) RegisterValidation(tag string, fn validator.Func) error {
	return uv.validator.RegisterValidation(tag, fn)
}

// 注册自定义验证规则
func registerCustomValidations(v *validator.Validate) {
	// 中国手机号验证
	v.RegisterValidation("mobile", func(fl validator.FieldLevel) bool {
		mobile := fl.Field().String()
		if matched, _ := regexp.MatchString(`^1[3-9]\d{9}$`, mobile); matched {
			return true
		}
		return false
	})

	// 身份证号验证
	v.RegisterValidation("idcard", func(fl validator.FieldLevel) bool {
		idcard := fl.Field().String()
		// 18位身份证号验证
		if matched, _ := regexp.MatchString(`^\d{17}[\dXx]$`, idcard); matched {
			return true
		}
		return false
	})

	// 用户名验证（字母、数字、下划线）
	v.RegisterValidation("username", func(fl validator.FieldLevel) bool {
		username := fl.Field().String()
		if matched, _ := regexp.MatchString(`^[a-zA-Z0-9_]{3,20}$`, username); matched {
			return true
		}
		return false
	})

	// 强密码验证
	v.RegisterValidation("strongpassword", func(fl validator.FieldLevel) bool {
		password := fl.Field().String()
		// 至少8位，包含大小写字母、数字和特殊字符
		if len(password) < 8 {
			return false
		}
		patterns := []string{
			`[a-z]`,                                  // 小写字母
			`[A-Z]`,                                  // 大写字母
			`\d`,                                     // 数字
			`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]`, // 特殊字符
		}
		count := 0
		for _, pattern := range patterns {
			if matched, _ := regexp.MatchString(pattern, password); matched {
				count++
			}
		}
		return count >= 3 // 至少包含3种类型
	})

	// 状态验证
	v.RegisterValidation("status", func(fl validator.FieldLevel) bool {
		status := fl.Field().String()
		validStatuses := []string{"enabled", "disabled", "active", "inactive", "pending"}
		for _, valid := range validStatuses {
			if status == valid {
				return true
			}
		}
		return false
	})

	// 正整数验证
	v.RegisterValidation("positiveint", func(fl validator.FieldLevel) bool {
		value := fl.Field().Int()
		return value > 0
	})
}

// getValidationMessage 获取友好的验证错误消息
func getValidationMessage(err validator.FieldError) string {
	field := err.Field()
	tag := err.Tag()
	param := err.Param()

	switch tag {
	case "required":
		return fmt.Sprintf("%s不能为空", field)
	case "email":
		return fmt.Sprintf("%s必须是有效的邮箱地址", field)
	case "min":
		if err.Kind() == reflect.String {
			return fmt.Sprintf("%s长度不能少于%s个字符", field, param)
		}
		return fmt.Sprintf("%s不能小于%s", field, param)
	case "max":
		if err.Kind() == reflect.String {
			return fmt.Sprintf("%s长度不能超过%s个字符", field, param)
		}
		return fmt.Sprintf("%s不能大于%s", field, param)
	case "len":
		return fmt.Sprintf("%s长度必须是%s个字符", field, param)
	case "oneof":
		return fmt.Sprintf("%s必须是以下值之一: %s", field, param)
	case "alphanum":
		return fmt.Sprintf("%s只能包含字母和数字", field)
	case "numeric":
		return fmt.Sprintf("%s只能包含数字", field)
	case "alpha":
		return fmt.Sprintf("%s只能包含字母", field)
	case "gt":
		return fmt.Sprintf("%s必须大于%s", field, param)
	case "gte":
		return fmt.Sprintf("%s必须大于等于%s", field, param)
	case "lt":
		return fmt.Sprintf("%s必须小于%s", field, param)
	case "lte":
		return fmt.Sprintf("%s必须小于等于%s", field, param)
	case "url":
		return fmt.Sprintf("%s必须是有效的URL地址", field)
	case "uuid":
		return fmt.Sprintf("%s必须是有效的UUID格式", field)
	case "json":
		return fmt.Sprintf("%s必须是有效的JSON格式", field)
	case "base64":
		return fmt.Sprintf("%s必须是有效的Base64格式", field)
	case "mobile":
		return fmt.Sprintf("%s必须是有效的手机号码", field)
	case "idcard":
		return fmt.Sprintf("%s必须是有效的身份证号", field)
	case "username":
		return fmt.Sprintf("%s必须是3-20位的字母、数字或下划线组合", field)
	case "strongpassword":
		return fmt.Sprintf("%s必须至少8位，且包含大写字母、小写字母、数字和特殊字符中的至少3种", field)
	case "status":
		return fmt.Sprintf("%s必须是有效的状态值", field)
	case "positiveint":
		return fmt.Sprintf("%s必须是正整数", field)
	default:
		return fmt.Sprintf("%s格式不正确", field)
	}
}

// 全局验证器实例
var GlobalValidator *UnifiedValidator

func init() {
	GlobalValidator = NewUnifiedValidator()
}

// 便捷方法
func ValidateStruct(s interface{}) []ValidationError {
	return GlobalValidator.ValidateStruct(s)
}

func ValidateVar(field interface{}, tag string) error {
	return GlobalValidator.ValidateVar(field, tag)
}

// ValidationHelper 验证助手
type ValidationHelper struct {
	validator *UnifiedValidator
}

// NewValidationHelper 创建验证助手
func NewValidationHelper() *ValidationHelper {
	return &ValidationHelper{
		validator: GlobalValidator,
	}
}

// ValidateAndReturnErrors 验证并返回错误列表
func (vh *ValidationHelper) ValidateAndReturnErrors(s interface{}) []ValidationError {
	return vh.validator.ValidateStruct(s)
}

// HasValidationErrors 检查是否有验证错误
func (vh *ValidationHelper) HasValidationErrors(s interface{}) bool {
	errors := vh.validator.ValidateStruct(s)
	return len(errors) > 0
}

// MustValidate 强制验证，如果失败则panic
func (vh *ValidationHelper) MustValidate(s interface{}) {
	if errors := vh.validator.ValidateStruct(s); len(errors) > 0 {
		panic(fmt.Sprintf("validation failed: %+v", errors))
	}
}

// ValidateFields 验证指定字段
func (vh *ValidationHelper) ValidateFields(data map[string]interface{}, rules map[string]string) []ValidationError {
	var errors []ValidationError

	for field, rule := range rules {
		if value, exists := data[field]; exists {
			if err := vh.validator.ValidateVar(value, rule); err != nil {
				if validationErr, ok := err.(validator.ValidationErrors); ok {
					for _, e := range validationErr {
						errors = append(errors, ValidationError{
							Field:   field,
							Message: getValidationMessage(e),
							Value:   value,
						})
					}
				}
			}
		} else if strings.Contains(rule, "required") {
			errors = append(errors, ValidationError{
				Field:   field,
				Message: fmt.Sprintf("%s不能为空", field),
				Value:   nil,
			})
		}
	}

	return errors
}

// ConditionalValidation 条件验证
type ConditionalValidation struct {
	Field     string                                 // 要验证的字段
	Value     interface{}                            // 字段值
	Rule      string                                 // 验证规则
	Condition func(data map[string]interface{}) bool // 验证条件
}

// ValidateConditional 条件验证
func (vh *ValidationHelper) ValidateConditional(data map[string]interface{}, conditionalRules []ConditionalValidation) []ValidationError {
	var errors []ValidationError

	for _, rule := range conditionalRules {
		if rule.Condition(data) {
			if err := vh.validator.ValidateVar(rule.Value, rule.Rule); err != nil {
				if validationErr, ok := err.(validator.ValidationErrors); ok {
					for _, e := range validationErr {
						errors = append(errors, ValidationError{
							Field:   rule.Field,
							Message: getValidationMessage(e),
							Value:   rule.Value,
						})
					}
				}
			}
		}
	}

	return errors
}

// 便捷的条件构造函数
func RequiredIf(field string, condition func(data map[string]interface{}) bool) func(data map[string]interface{}) ConditionalValidation {
	return func(data map[string]interface{}) ConditionalValidation {
		return ConditionalValidation{
			Field:     field,
			Value:     data[field],
			Rule:      "required",
			Condition: condition,
		}
	}
}

func ValidateIf(field, rule string, condition func(data map[string]interface{}) bool) func(data map[string]interface{}) ConditionalValidation {
	return func(data map[string]interface{}) ConditionalValidation {
		return ConditionalValidation{
			Field:     field,
			Value:     data[field],
			Rule:      rule,
			Condition: condition,
		}
	}
}
