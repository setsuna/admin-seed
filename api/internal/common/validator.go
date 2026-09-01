package common

import (
	"reflect"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// Validator 全局验证器
var Validator *validator.Validate

func init() {
	Validator = validator.New()

	// 注册自定义标签名函数
	Validator.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})
}

// ValidateStruct 验证结构体并返回友好的错误信息
func ValidateStruct(s interface{}) []FieldError {
	var fieldErrors []FieldError

	if err := Validator.Struct(s); err != nil {
		validationErrors := err.(validator.ValidationErrors)
		for _, validationErr := range validationErrors {
			fieldError := FieldError{
				Field:   validationErr.Field(),
				Message: getValidationMessage(validationErr),
			}
			fieldErrors = append(fieldErrors, fieldError)
		}
	}

	return fieldErrors
}

// getValidationMessage 根据验证错误获取友好的错误消息
func getValidationMessage(err validator.FieldError) string {
	switch err.Tag() {
	case "required":
		return "该字段不能为空"
	case "email":
		return "请输入有效的邮箱地址"
	case "min":
		return "长度不能少于 " + err.Param() + " 个字符"
	case "max":
		return "长度不能超过 " + err.Param() + " 个字符"
	case "len":
		return "长度必须是 " + err.Param() + " 个字符"
	case "oneof":
		return "必须是以下值之一: " + err.Param()
	case "alphanum":
		return "只能包含字母和数字"
	case "numeric":
		return "只能包含数字"
	case "gt":
		return "值必须大于 " + err.Param()
	case "gte":
		return "值必须大于等于 " + err.Param()
	case "lt":
		return "值必须小于 " + err.Param()
	case "lte":
		return "值必须小于等于 " + err.Param()
	case "url":
		return "请输入有效的URL地址"
	case "uuid":
		return "请输入有效的UUID格式"
	default:
		return "格式不正确"
	}
}

// ShouldBindAndValidate 绑定JSON并进行验证，如果失败则自动返回错误响应
func ShouldBindAndValidate(c *gin.Context, obj interface{}) bool {
	if err := c.ShouldBindJSON(obj); err != nil {
		ErrorWithCode(c, ERROR_INVALID_JSON, "JSON格式错误: "+err.Error())
		return false
	}

	if fieldErrors := ValidateStruct(obj); len(fieldErrors) > 0 {
		ValidationError(c, fieldErrors)
		return false
	}

	return true
}

// ShouldBindQueryAndValidate 绑定查询参数并进行验证
func ShouldBindQueryAndValidate(c *gin.Context, obj interface{}) bool {
	if err := c.ShouldBindQuery(obj); err != nil {
		ErrorWithCode(c, ERROR_INVALID_PARAMS, "查询参数错误: "+err.Error())
		return false
	}

	if fieldErrors := ValidateStruct(obj); len(fieldErrors) > 0 {
		ValidationError(c, fieldErrors)
		return false
	}

	return true
}

// ShouldBindURIAndValidate 绑定URI参数并进行验证
func ShouldBindURIAndValidate(c *gin.Context, obj interface{}) bool {
	if err := c.ShouldBindUri(obj); err != nil {
		ErrorWithCode(c, ERROR_INVALID_PARAMS, "路径参数错误: "+err.Error())
		return false
	}

	if fieldErrors := ValidateStruct(obj); len(fieldErrors) > 0 {
		ValidationError(c, fieldErrors)
		return false
	}

	return true
}

// RequireParam 要求路径参数不为空
func RequireParam(c *gin.Context, paramName string) (string, bool) {
	value := c.Param(paramName)
	if value == "" {
		ErrorWithCode(c, ERROR_INVALID_PARAMS, paramName+"不能为空")
		return "", false
	}
	return value, true
}

// RequireQuery 要求查询参数不为空
func RequireQuery(c *gin.Context, queryName string) (string, bool) {
	value := c.Query(queryName)
	if value == "" {
		ErrorWithCode(c, ERROR_INVALID_PARAMS, queryName+"不能为空")
		return "", false
	}
	return value, true
}
