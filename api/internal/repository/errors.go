package repository

import (
	"fmt"
	"net/http"

	"admin-seed/internal/common"
)

// RepositoryError 统一的Repository错误类型
type RepositoryError struct {
	// 必须字段
	Code      int    // 对应codes.go中的错误码
	Message   string // 错误消息
	Operation string // 操作名称（如"GetByID", "Create"）
	Entity    string // 实体类型（如"User", "Department"）
	Err       error  // 原始错误（如果有）

	// 可选字段
	EntityID string                 // 实体ID
	Field    string                 // 相关字段
	Value    interface{}            // 相关值
	Details  map[string]interface{} // 额外详细信息
}

// Error 实现error接口
func (e *RepositoryError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("[%s:%s] %s: %v", e.Entity, e.Operation, e.Message, e.Err)
	}
	return fmt.Sprintf("[%s:%s] %s", e.Entity, e.Operation, e.Message)
}

// Unwrap 实现errors.Unwrap接口，支持errors.Is和errors.As
func (e *RepositoryError) Unwrap() error {
	return e.Err
}

// GetCode 获取错误码
func (e *RepositoryError) GetCode() int {
	return e.Code
}

// GetHTTPStatus 获取HTTP状态码
func (e *RepositoryError) GetHTTPStatus() int {
	return common.GetHTTPStatusCode(e.Code)
}

// WithEntityID 添加实体ID
func (e *RepositoryError) WithEntityID(id string) *RepositoryError {
	e.EntityID = id
	return e
}

// WithField 添加字段名
func (e *RepositoryError) WithField(field string) *RepositoryError {
	e.Field = field
	return e
}

// WithValue 添加字段值
func (e *RepositoryError) WithValue(value interface{}) *RepositoryError {
	e.Value = value
	return e
}

// WithDetail 添加详细信息
func (e *RepositoryError) WithDetail(key string, value interface{}) *RepositoryError {
	if e.Details == nil {
		e.Details = make(map[string]interface{})
	}
	e.Details[key] = value
	return e
}

// 预定义的错误类型
var (
	// ErrNotFound 记录不存在
	ErrNotFound = &RepositoryError{
		Code:    common.ERROR_RECORD_NOT_FOUND,
		Message: common.GetErrorMessage(common.ERROR_RECORD_NOT_FOUND),
	}

	// ErrAlreadyExists 记录已存在
	ErrAlreadyExists = &RepositoryError{
		Code:    common.ERROR_RECORD_ALREADY_EXISTS,
		Message: common.GetErrorMessage(common.ERROR_RECORD_ALREADY_EXISTS),
	}

	// ErrDatabase 数据库操作失败
	ErrDatabase = &RepositoryError{
		Code:    common.ERROR_DATABASE_ERROR,
		Message: common.GetErrorMessage(common.ERROR_DATABASE_ERROR),
	}

	// ErrInvalidInput 无效输入
	ErrInvalidInput = &RepositoryError{
		Code:    common.ERROR_INVALID_PARAMS,
		Message: common.GetErrorMessage(common.ERROR_INVALID_PARAMS),
	}

	// ErrTransaction 事务错误
	ErrTransaction = &RepositoryError{
		Code:    common.ERROR_DATABASE_ERROR,
		Message: "transaction error",
	}
)

// NewNotFoundError 创建记录不存在错误
func NewNotFoundError(entity, id string) *RepositoryError {
	return &RepositoryError{
		Code:      common.ERROR_RECORD_NOT_FOUND,
		Message:   fmt.Sprintf("%s not found", entity),
		Operation: "GetByID",
		Entity:    entity,
		EntityID:  id,
	}
}

// NewAlreadyExistsError 创建记录已存在错误
func NewAlreadyExistsError(entity, field string, value interface{}) *RepositoryError {
	return &RepositoryError{
		Code:      common.ERROR_RECORD_ALREADY_EXISTS,
		Message:   fmt.Sprintf("%s with %s='%v' already exists", entity, field, value),
		Operation: "Create",
		Entity:    entity,
		Field:     field,
		Value:     value,
	}
}

// NewDatabaseError 创建数据库错误
func NewDatabaseError(operation, entity string, err error) *RepositoryError {
	return &RepositoryError{
		Code:      common.ERROR_DATABASE_ERROR,
		Message:   "database operation failed",
		Operation: operation,
		Entity:    entity,
		Err:       err,
	}
}

// NewInvalidInputError 创建无效输入错误
func NewInvalidInputError(entity, field string, value interface{}) *RepositoryError {
	return &RepositoryError{
		Code:      common.ERROR_INVALID_PARAMS,
		Message:   fmt.Sprintf("invalid input for field '%s'", field),
		Operation: "Validate",
		Entity:    entity,
		Field:     field,
		Value:     value,
	}
}

// NewTransactionError 创建事务错误
func NewTransactionError(operation string, err error) *RepositoryError {
	return &RepositoryError{
		Code:      common.ERROR_DATABASE_ERROR,
		Message:   "transaction operation failed",
		Operation: operation,
		Entity:    "Transaction",
		Err:       err,
	}
}

// WrapError 包装错误为RepositoryError
func WrapError(err error, operation, entity string) *RepositoryError {
	if err == nil {
		return nil
	}

	// 如果已经是RepositoryError，直接返回
	if repoErr, ok := err.(*RepositoryError); ok {
		return repoErr
	}

	// 根据错误类型判断
	errMsg := err.Error()

	// 判断是否为记录不存在错误
	if isNotFoundError(errMsg) {
		return &RepositoryError{
			Code:      common.ERROR_RECORD_NOT_FOUND,
			Message:   "record not found",
			Operation: operation,
			Entity:    entity,
			Err:       err,
		}
	}

	// 判断是否为唯一约束错误
	if isUniqueConstraintError(errMsg) {
		return &RepositoryError{
			Code:      common.ERROR_RECORD_ALREADY_EXISTS,
			Message:   "record already exists",
			Operation: operation,
			Entity:    entity,
			Err:       err,
		}
	}

	// 默认为数据库错误
	return &RepositoryError{
		Code:      common.ERROR_DATABASE_ERROR,
		Message:   "database operation failed",
		Operation: operation,
		Entity:    entity,
		Err:       err,
	}
}

// isNotFoundError 判断是否为记录不存在错误
func isNotFoundError(errMsg string) bool {
	notFoundPatterns := []string{
		"record not found",
		"no rows",
		"sql: no rows in result set",
		"not found",
	}
	for _, pattern := range notFoundPatterns {
		if contains(errMsg, pattern) {
			return true
		}
	}
	return false
}

// isUniqueConstraintError 判断是否为唯一约束错误
func isUniqueConstraintError(errMsg string) bool {
	uniquePatterns := []string{
		"UNIQUE constraint failed",
		"Duplicate entry",
		"duplicate key",
		"unique constraint",
		"already exists",
	}
	for _, pattern := range uniquePatterns {
		if contains(errMsg, pattern) {
			return true
		}
	}
	return false
}

// contains 检查字符串是否包含子串（不区分大小写）
func contains(s, substr string) bool {
	return len(s) >= len(substr) &&
		(s == substr ||
			len(s) > len(substr) &&
				(containsIgnoreCase(s, substr)))
}

// containsIgnoreCase 不区分大小写的包含检查
func containsIgnoreCase(s, substr string) bool {
	s = toLower(s)
	substr = toLower(substr)
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// toLower 转小写
func toLower(s string) string {
	result := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			result[i] = c + 32
		} else {
			result[i] = c
		}
	}
	return string(result)
}

// IsNotFoundError 判断是否为记录不存在错误
func IsNotFoundError(err error) bool {
	if err == nil {
		return false
	}
	if repoErr, ok := err.(*RepositoryError); ok {
		return repoErr.Code == common.ERROR_RECORD_NOT_FOUND
	}
	return false
}

// IsAlreadyExistsError 判断是否为记录已存在错误
func IsAlreadyExistsError(err error) bool {
	if err == nil {
		return false
	}
	if repoErr, ok := err.(*RepositoryError); ok {
		return repoErr.Code == common.ERROR_RECORD_ALREADY_EXISTS
	}
	return false
}

// IsDatabaseError 判断是否为数据库错误
func IsDatabaseError(err error) bool {
	if err == nil {
		return false
	}
	if repoErr, ok := err.(*RepositoryError); ok {
		return repoErr.Code == common.ERROR_DATABASE_ERROR
	}
	return false
}

// IsInvalidInputError 判断是否为无效输入错误
func IsInvalidInputError(err error) bool {
	if err == nil {
		return false
	}
	if repoErr, ok := err.(*RepositoryError); ok {
		return repoErr.Code == common.ERROR_INVALID_PARAMS
	}
	return false
}

// NewValidationError 创建验证错误
func NewValidationError(message string, details map[string]interface{}) error {
	return &RepositoryError{
		Code:    common.ERROR_VALIDATION_FAILED,
		Message: message,
		Details: details,
	}
}

// ToHTTPStatus 将错误转换为HTTP状态码
func ToHTTPStatus(err error) int {
	if err == nil {
		return http.StatusOK
	}
	if repoErr, ok := err.(*RepositoryError); ok {
		return repoErr.GetHTTPStatus()
	}
	return http.StatusInternalServerError
}
