package common

import (
	"errors"
	"fmt"
)

// AppError 应用错误类型
type AppError struct {
	Code     int         `json:"code"`
	Message  string      `json:"message"`
	Details  interface{} `json:"details,omitempty"`
	Internal error       `json:"-"` // 内部错误，不对外暴露
}

// Error 实现error接口
func (e *AppError) Error() string {
	if e.Internal != nil {
		return fmt.Sprintf("code: %d, message: %s, internal: %s", e.Code, e.Message, e.Internal.Error())
	}
	return fmt.Sprintf("code: %d, message: %s", e.Code, e.Message)
}

// NewAppError 创建应用错误
func NewAppError(code int, message string, details ...interface{}) *AppError {
	appErr := &AppError{
		Code:    code,
		Message: message,
	}

	if len(details) > 0 {
		appErr.Details = details[0]
	}

	return appErr
}

// NewAppErrorWithDetails 创建带详情的应用错误
func NewAppErrorWithDetails(code int, message string, details interface{}) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
		Details: details,
	}
}

// NewAppErrorWithInternal 创建带内部错误的应用错误
func NewAppErrorWithInternal(code int, message string, internal error, details ...interface{}) *AppError {
	appErr := &AppError{
		Code:     code,
		Message:  message,
		Internal: internal,
	}

	if len(details) > 0 {
		appErr.Details = details[0]
	}

	return appErr
}

// WrapError 包装标准错误为应用错误
func WrapError(err error, code int, message string) *AppError {
	if err == nil {
		return nil
	}

	// 如果已经是AppError，直接返回
	if appErr, ok := err.(*AppError); ok {
		return appErr
	}

	return NewAppErrorWithInternal(code, message, err)
}

// IsAppError 判断是否为应用错误
func IsAppError(err error) (*AppError, bool) {
	if err == nil {
		return nil, false
	}

	if appErr, ok := err.(*AppError); ok {
		return appErr, true
	}

	return nil, false
}

// 预定义的常用错误创建函数

// NewValidationError 创建参数验证错误
func NewValidationError(message string, details ...interface{}) *AppError {
	return NewAppError(ERROR_VALIDATION_FAILED, message, details...)
}

// NewUnauthorizedError 创建未授权错误
func NewUnauthorizedError(message ...string) *AppError {
	msg := GetErrorMessage(ERROR_UNAUTHORIZED)
	if len(message) > 0 && message[0] != "" {
		msg = message[0]
	}
	return NewAppError(ERROR_UNAUTHORIZED, msg)
}

// NewPermissionDeniedError 创建权限不足错误
func NewPermissionDeniedError(message ...string) *AppError {
	msg := GetErrorMessage(ERROR_PERMISSION_DENIED)
	if len(message) > 0 && message[0] != "" {
		msg = message[0]
	}
	return NewAppError(ERROR_PERMISSION_DENIED, msg)
}

// NewNotFoundError 创建资源不存在错误
func NewNotFoundError(resource string) *AppError {
	message := fmt.Sprintf("%s不存在", resource)
	return NewAppError(ERROR_RECORD_NOT_FOUND, message)
}

// NewFileNotFoundError 创建文件不存在错误
func NewFileNotFoundError(filename ...string) *AppError {
	msg := GetErrorMessage(ERROR_FILE_NOT_FOUND)
	if len(filename) > 0 && filename[0] != "" {
		msg = fmt.Sprintf("文件 %s 不存在", filename[0])
	}
	return NewAppError(ERROR_FILE_NOT_FOUND, msg)
}

// NewDatabaseError 创建数据库错误
func NewDatabaseError(internal error, operation ...string) *AppError {
	msg := GetErrorMessage(ERROR_DATABASE_ERROR)
	if len(operation) > 0 && operation[0] != "" {
		msg = fmt.Sprintf("数据库%s操作失败", operation[0])
	}
	return NewAppErrorWithInternal(ERROR_DATABASE_ERROR, msg, internal)
}

// NewInternalError 创建内部服务器错误
func NewInternalError(internal error, message ...string) *AppError {
	msg := GetErrorMessage(ERROR_INTERNAL_SERVER)
	if len(message) > 0 && message[0] != "" {
		msg = message[0]
	}
	return NewAppErrorWithInternal(ERROR_INTERNAL_SERVER, msg, internal)
}

// NewTokenExpiredError 创建token过期错误
func NewTokenExpiredError() *AppError {
	return NewAppError(ERROR_TOKEN_EXPIRED, GetErrorMessage(ERROR_TOKEN_EXPIRED))
}

// NewTokenInvalidError 创建token无效错误
func NewTokenInvalidError() *AppError {
	return NewAppError(ERROR_TOKEN_INVALID, GetErrorMessage(ERROR_TOKEN_INVALID))
}

// NewLicenseError 创建授权错误
func NewLicenseError(code int, message string, details interface{}) *AppError {
	return NewAppError(code, message, details)
}

// FromStandardError 从标准error转换为AppError
func FromStandardError(err error) *AppError {
	if err == nil {
		return nil
	}

	if appErr, ok := err.(*AppError); ok {
		return appErr
	}

	// 根据错误类型进行智能转换
	switch {
	case errors.Is(err, errors.New("record not found")):
		return NewAppError(ERROR_RECORD_NOT_FOUND, GetErrorMessage(ERROR_RECORD_NOT_FOUND))
	case errors.Is(err, errors.New("sql: no rows in result set")):
		return NewAppError(ERROR_RECORD_NOT_FOUND, GetErrorMessage(ERROR_RECORD_NOT_FOUND))
	default:
		return NewInternalError(err)
	}
}
