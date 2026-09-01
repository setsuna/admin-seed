package common

import (
	"time"

	"github.com/gin-gonic/gin"
)

// Response 统一响应结构
type Response struct {
	Code      int         `json:"code"`
	Message   string      `json:"message"`
	Data      interface{} `json:"data"`
	Timestamp int64       `json:"timestamp"`
	RequestID string      `json:"requestId"`
}

// ErrorResponse 错误响应结构
type ErrorResponse struct {
	Code      int          `json:"code"`
	Message   string       `json:"message"`
	Data      interface{}  `json:"data"`
	Errors    []FieldError `json:"errors,omitempty"`
	Timestamp int64        `json:"timestamp"`
	RequestID string       `json:"requestId"`
}

// FieldError 字段错误
type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// PaginatedResponse 分页响应
type PaginatedResponse struct {
	Items      interface{} `json:"items"`
	Pagination Pagination  `json:"pagination"`
}

// Pagination 分页信息
type Pagination struct {
	Page       int   `json:"page"`
	PageSize   int   `json:"pageSize"`
	Total      int64 `json:"total"`
	TotalPages int64 `json:"totalPages"`
	HasNext    bool  `json:"hasNext"`
	HasPrev    bool  `json:"hasPrev"`
}

// ResponseHelper 响应助手
type ResponseHelper struct{}

// NewResponseHelper 创建响应助手
func NewResponseHelper() *ResponseHelper {
	return &ResponseHelper{}
}

// Success 成功响应
func (h *ResponseHelper) Success(c *gin.Context, data interface{}) {
	h.SuccessWithMessage(c, "success", data)
}

// SuccessWithMessage 带消息的成功响应
func (h *ResponseHelper) SuccessWithMessage(c *gin.Context, message string, data interface{}) {
	requestID := getRequestID(c)

	response := &Response{
		Code:      SUCCESS,
		Message:   message,
		Data:      data,
		Timestamp: time.Now().Unix(),
		RequestID: requestID,
	}

	c.JSON(GetHTTPStatusCode(SUCCESS), response)
}

// Error 错误响应
func (h *ResponseHelper) Error(c *gin.Context, err error) {
	if err == nil {
		h.Success(c, nil)
		return
	}

	requestID := getRequestID(c)

	if appErr, ok := IsAppError(err); ok {
		h.errorResponse(c, appErr.Code, appErr.Message, appErr.Details, requestID)
	} else {
		// 未知错误，包装为内部错误
		h.errorResponse(c, ERROR_INTERNAL_SERVER, GetErrorMessage(ERROR_INTERNAL_SERVER), nil, requestID)
	}
}

// ErrorWithCode 指定错误码的错误响应
func (h *ResponseHelper) ErrorWithCode(c *gin.Context, code int, message ...string) {
	requestID := getRequestID(c)

	msg := GetErrorMessage(code)
	if len(message) > 0 && message[0] != "" {
		msg = message[0]
	}

	h.errorResponse(c, code, msg, nil, requestID)
}

// ErrorWithDetails 带详细信息的错误响应
func (h *ResponseHelper) ErrorWithDetails(c *gin.Context, code int, message string, details interface{}) {
	requestID := getRequestID(c)
	h.errorResponse(c, code, message, details, requestID)
}

// ValidationError 参数验证错误响应
func (h *ResponseHelper) ValidationError(c *gin.Context, errors []FieldError) {
	requestID := getRequestID(c)

	errorResp := &ErrorResponse{
		Code:      ERROR_VALIDATION_FAILED,
		Message:   GetErrorMessage(ERROR_VALIDATION_FAILED),
		Data:      nil,
		Errors:    errors,
		Timestamp: time.Now().Unix(),
		RequestID: requestID,
	}

	c.JSON(GetHTTPStatusCode(ERROR_VALIDATION_FAILED), errorResp)
}

// PaginatedSuccess 分页成功响应
func (h *ResponseHelper) PaginatedSuccess(c *gin.Context, items interface{}, pagination Pagination) {
	requestID := getRequestID(c)

	response := &Response{
		Code:    SUCCESS,
		Message: "success",
		Data: PaginatedResponse{
			Items:      items,
			Pagination: pagination,
		},
		Timestamp: time.Now().Unix(),
		RequestID: requestID,
	}

	c.JSON(GetHTTPStatusCode(SUCCESS), response)
}

// errorResponse 内部错误响应方法
func (h *ResponseHelper) errorResponse(c *gin.Context, code int, message string, details interface{}, requestID string) {
	response := &ErrorResponse{
		Code:      code,
		Message:   message,
		Data:      details,
		Timestamp: time.Now().Unix(),
		RequestID: requestID,
	}

	httpStatus := GetHTTPStatusCode(code)
	c.JSON(httpStatus, response)
}

// getRequestID 从context获取请求ID
func getRequestID(c *gin.Context) string {
	if requestID, exists := c.Get("requestId"); exists {
		if id, ok := requestID.(string); ok {
			return id
		}
	}
	// 如果没有找到请求ID，生成一个简单的ID
	return generateSimpleID()
}

// generateSimpleID 生成简单的请求ID
func generateSimpleID() string {
	return time.Now().Format("20060102150405") + randomString(6)
}

// randomString 生成随机字符串
func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(b)
}

// CreatePagination 创建分页信息
func CreatePagination(page, pageSize int, total int64) Pagination {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}

	totalPages := (total + int64(pageSize) - 1) / int64(pageSize)
	if totalPages == 0 {
		totalPages = 1
	}

	return Pagination{
		Page:       page,
		PageSize:   pageSize,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    int64(page) < totalPages,
		HasPrev:    page > 1,
	}
}

// 全局响应助手实例
var GlobalResponseHelper = NewResponseHelper()

// 便捷方法，直接使用全局实例
func Success(c *gin.Context, data interface{}) {
	GlobalResponseHelper.Success(c, data)
}

func SuccessWithMessage(c *gin.Context, message string, data interface{}) {
	GlobalResponseHelper.SuccessWithMessage(c, message, data)
}

func Error(c *gin.Context, err error) {
	GlobalResponseHelper.Error(c, err)
}

func ErrorWithCode(c *gin.Context, code int, message ...string) {
	GlobalResponseHelper.ErrorWithCode(c, code, message...)
}

func ErrorWithDetails(c *gin.Context, code int, message string, details interface{}) {
	GlobalResponseHelper.ErrorWithDetails(c, code, message, details)
}

func ValidationError(c *gin.Context, errors []FieldError) {
	GlobalResponseHelper.ValidationError(c, errors)
}

func PaginatedSuccess(c *gin.Context, items interface{}, pagination Pagination) {
	GlobalResponseHelper.PaginatedSuccess(c, items, pagination)
}
