package middleware

import (
	"fmt"
	"net/http"
	"reflect"
	"strconv"
	"strings"

	"admin-seed/internal/common"
	"admin-seed/internal/validator"

	"github.com/gin-gonic/gin"
)

// BindConfig 绑定配置
type BindConfig struct {
	SkipValidation bool                                            // 跳过验证
	CustomRules    map[string]validator.ValidationRule             // 自定义验证规则
	SetDefaults    bool                                            // 设置默认值
	StrictMode     bool                                            // 严格模式，未知字段会报错
	ErrorHandler   func(*gin.Context, []validator.ValidationError) // 自定义错误处理
}

// DefaultBindConfig 默认绑定配置
var DefaultBindConfig = &BindConfig{
	SkipValidation: false,
	SetDefaults:    true,
	StrictMode:     false,
	ErrorHandler:   nil,
}

// BindOption 绑定选项
type BindOption func(*BindConfig)

// WithSkipValidation 跳过验证
func WithSkipValidation() BindOption {
	return func(config *BindConfig) {
		config.SkipValidation = true
	}
}

// WithCustomRules 自定义验证规则
func WithCustomRules(rules map[string]validator.ValidationRule) BindOption {
	return func(config *BindConfig) {
		config.CustomRules = rules
	}
}

// WithSetDefaults 设置默认值
func WithSetDefaults(enable bool) BindOption {
	return func(config *BindConfig) {
		config.SetDefaults = enable
	}
}

// WithStrictMode 严格模式
func WithStrictMode() BindOption {
	return func(config *BindConfig) {
		config.StrictMode = true
	}
}

// WithErrorHandler 自定义错误处理
func WithErrorHandler(handler func(*gin.Context, []validator.ValidationError)) BindOption {
	return func(config *BindConfig) {
		config.ErrorHandler = handler
	}
}

// BindJSON JSON参数绑定中间件
func BindJSON(obj interface{}, opts ...BindOption) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 创建对象实例
		objType := reflect.TypeOf(obj)
		if objType.Kind() == reflect.Ptr {
			objType = objType.Elem()
		}
		instance := reflect.New(objType).Interface()

		// 绑定JSON
		if err := c.ShouldBindJSON(instance); err != nil {
			handleBindError(c, err)
			return
		}

		// 应用配置并处理
		config := *DefaultBindConfig
		for _, opt := range opts {
			opt(&config)
		}

		processAndValidate(c, instance, config)
	}
}

// BindQuery Query参数绑定中间件
func BindQuery(obj interface{}, opts ...BindOption) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 创建对象实例
		objType := reflect.TypeOf(obj)
		if objType.Kind() == reflect.Ptr {
			objType = objType.Elem()
		}
		instance := reflect.New(objType).Interface()

		// 绑定Query参数
		if err := c.ShouldBindQuery(instance); err != nil {
			handleBindError(c, err)
			return
		}

		// 应用配置并处理
		config := *DefaultBindConfig
		for _, opt := range opts {
			opt(&config)
		}

		processAndValidate(c, instance, config)
	}
}

// PaginationBind 分页参数绑定中间件
func PaginationBind() gin.HandlerFunc {
	return func(c *gin.Context) {
		var pagination struct {
			Page int `form:"page" default:"1" validate:"min=1"`
			Size int `form:"size" default:"20" validate:"min=1,max=100"`
		}

		if err := c.ShouldBindQuery(&pagination); err != nil {
			handleBindError(c, err)
			return
		}

		// 设置默认值
		if pagination.Page == 0 {
			pagination.Page = 1
		}
		if pagination.Size == 0 {
			pagination.Size = 20
		}

		// 验证参数
		if pagination.Page < 1 {
			common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "页码必须大于0")
			c.Abort()
			return
		}
		if pagination.Size < 1 || pagination.Size > 100 {
			common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "每页数量必须在1-100之间")
			c.Abort()
			return
		}

		// 存储到context
		c.Set("pagination", pagination)
		c.Next()
	}
}

// RequiredParam 必需参数验证中间件
func RequiredParam(paramName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		param := c.Param(paramName)
		if param == "" {
			common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, fmt.Sprintf("参数%s不能为空", paramName))
			c.Abort()
			return
		}

		c.Set(paramName, param)
		c.Next()
	}
}

// ValidateIDParam ID参数验证中间件
func ValidateIDParam(paramName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		param := c.Param(paramName)
		if param == "" {
			common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, fmt.Sprintf("参数%s不能为空", paramName))
			c.Abort()
			return
		}

		// 简单的ID格式验证（这里可以根据需要调整）
		if len(param) < 1 || len(param) > 64 {
			common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, fmt.Sprintf("参数%s格式无效", paramName))
			c.Abort()
			return
		}

		c.Set(paramName, param)
		c.Next()
	}
}

// setDefaults 设置结构体默认值（简化版实现）
func setDefaults(obj interface{}) error {
	v := reflect.ValueOf(obj)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}

	if v.Kind() != reflect.Struct {
		return nil
	}

	t := v.Type()
	for i := 0; i < v.NumField(); i++ {
		field := t.Field(i)
		fieldValue := v.Field(i)

		if !fieldValue.CanSet() {
			continue
		}

		// 检查default标签
		defaultTag := field.Tag.Get("default")
		if defaultTag == "" {
			continue
		}

		// 设置默认值
		switch fieldValue.Kind() {
		case reflect.String:
			if fieldValue.String() == "" {
				fieldValue.SetString(defaultTag)
			}
		case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
			if fieldValue.Int() == 0 {
				if defaultVal, err := strconv.ParseInt(defaultTag, 10, 64); err == nil {
					fieldValue.SetInt(defaultVal)
				}
			}
		case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
			if fieldValue.Uint() == 0 {
				if defaultVal, err := strconv.ParseUint(defaultTag, 10, 64); err == nil {
					fieldValue.SetUint(defaultVal)
				}
			}
		case reflect.Bool:
			if !fieldValue.Bool() {
				if defaultVal, err := strconv.ParseBool(defaultTag); err == nil {
					fieldValue.SetBool(defaultVal)
				}
			}
		}
	}

	return nil
}

// convertStruct 简化的结构体转换（使用反射）
func convertStruct(src, dst interface{}) error {
	srcVal := reflect.ValueOf(src)
	dstVal := reflect.ValueOf(dst)

	if srcVal.Kind() == reflect.Ptr {
		srcVal = srcVal.Elem()
	}
	if dstVal.Kind() != reflect.Ptr {
		return fmt.Errorf("destination must be a pointer")
	}
	dstVal = dstVal.Elem()

	if srcVal.Kind() != reflect.Struct || dstVal.Kind() != reflect.Struct {
		return fmt.Errorf("both source and destination must be structs")
	}

	srcType := srcVal.Type()
	dstType := dstVal.Type()

	for i := 0; i < srcType.NumField(); i++ {
		srcField := srcType.Field(i)
		srcFieldVal := srcVal.Field(i)

		// 查找目标结构体中对应的字段
		if dstField, found := dstType.FieldByName(srcField.Name); found {
			dstFieldVal := dstVal.FieldByName(srcField.Name)
			if dstFieldVal.CanSet() && srcFieldVal.Type().AssignableTo(dstField.Type) {
				dstFieldVal.Set(srcFieldVal)
			}
		}
	}

	return nil
}

// bindRequest 根据请求类型自动绑定参数
func bindRequest(c *gin.Context, obj interface{}) error {
	method := c.Request.Method
	contentType := c.GetHeader("Content-Type")

	switch method {
	case http.MethodGet, http.MethodDelete:
		// GET和DELETE主要使用查询参数
		return c.ShouldBindQuery(obj)

	case http.MethodPost, http.MethodPut, http.MethodPatch:
		// POST、PUT、PATCH根据Content-Type选择绑定方式
		if strings.Contains(contentType, "application/json") {
			return c.ShouldBindJSON(obj)
		} else if strings.Contains(contentType, "application/x-www-form-urlencoded") ||
			strings.Contains(contentType, "multipart/form-data") {
			return c.ShouldBind(obj)
		} else {
			// 默认尝试JSON绑定
			return c.ShouldBindJSON(obj)
		}

	default:
		return c.ShouldBind(obj)
	}
}

// processAndValidate 处理和验证对象
func processAndValidate(c *gin.Context, obj interface{}, config BindConfig) {
	// 设置默认值
	if config.SetDefaults {
		if err := setDefaults(obj); err != nil {
			common.ErrorWithCode(c, common.ERROR_INTERNAL_SERVER, "设置默认值失败: "+err.Error())
			c.Abort()
			return
		}
	}

	// 验证参数
	if !config.SkipValidation {
		var errors []validator.ValidationError

		if config.CustomRules != nil {
			errors = validateWithCustomRules(obj, config.CustomRules)
		} else {
			errors = validator.ValidateStruct(obj)
		}

		if len(errors) > 0 {
			if config.ErrorHandler != nil {
				config.ErrorHandler(c, errors)
			} else {
				common.ValidationError(c, convertValidationErrors(errors))
			}
			c.Abort()
			return
		}
	}

	// 存储验证后的对象
	c.Set("validated_data", obj)
	c.Next()
}

// validateWithCustomRules 使用自定义规则验证
func validateWithCustomRules(obj interface{}, rules map[string]validator.ValidationRule) []validator.ValidationError {
	var errors []validator.ValidationError

	v := reflect.ValueOf(obj)
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
		if rule, exists := rules[fieldName]; exists {
			if err := validator.GlobalValidator.ValidateVar(fieldValue.Interface(), rule.Tag); err != nil {
				message := rule.Message
				if message == "" {
					message = fmt.Sprintf("%s验证失败", fieldName)
				}
				errors = append(errors, validator.ValidationError{
					Field:   fieldName,
					Message: message,
					Value:   fieldValue.Interface(),
				})
			}
		}
	}

	return errors
}

// convertValidationErrors 转换验证错误格式
func convertValidationErrors(errors []validator.ValidationError) []common.FieldError {
	var result []common.FieldError
	for _, err := range errors {
		result = append(result, common.FieldError{
			Field:   err.Field,
			Message: err.Message,
		})
	}
	return result
}

// handleBindError 处理绑定错误
func handleBindError(c *gin.Context, err error) {
	method := c.Request.Method
	contentType := c.GetHeader("Content-Type")

	if method == http.MethodGet || method == http.MethodDelete {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "查询参数错误: "+err.Error())
	} else if strings.Contains(contentType, "application/json") {
		common.ErrorWithCode(c, common.ERROR_INVALID_JSON, "JSON参数格式错误: "+err.Error())
	} else {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "请求参数错误: "+err.Error())
	}
	c.Abort()
}

// GetValidatedData 从context中获取验证后的数据
func GetValidatedData(c *gin.Context) (interface{}, bool) {
	if data, exists := c.Get("validated_data"); exists {
		return data, true
	}
	return nil, false
}

// GetValidatedDataAs 获取验证后的数据并转换为指定类型
func GetValidatedDataAs(c *gin.Context, target interface{}) error {
	if data, exists := GetValidatedData(c); exists {
		return convertStruct(data, target)
	}

	// 如果没有验证数据，尝试直接绑定
	method := c.Request.Method
	contentType := c.GetHeader("Content-Type")

	switch method {
	case http.MethodGet, http.MethodDelete:
		return c.ShouldBindQuery(target)
	case http.MethodPost, http.MethodPut, http.MethodPatch:
		if strings.Contains(contentType, "application/json") {
			return c.ShouldBindJSON(target)
		} else {
			return c.ShouldBind(target)
		}
	default:
		return c.ShouldBind(target)
	}
}

// MustGetValidatedData 必须获取验证后的数据，失败则panic
func MustGetValidatedData(c *gin.Context) interface{} {
	if data, exists := GetValidatedData(c); exists {
		return data
	}
	panic("validated data not found in context")
}

// MustGetValidatedDataAs 必须获取验证后的数据并转换为指定类型
func MustGetValidatedDataAs(c *gin.Context, target interface{}) {
	if err := GetValidatedDataAs(c, target); err != nil {
		panic("validated data not found or conversion failed: " + err.Error())
	}
}
