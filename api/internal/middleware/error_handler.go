package middleware

import (
	"fmt"
	"admin-seed/internal/common"
	"admin-seed/internal/repository"
	"net"
	"net/http"
	"net/http/httputil"
	"os"
	"runtime/debug"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// ErrorHandlerMiddleware 全局错误处理中间件
func ErrorHandlerMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		// 检查是否是连接中断错误
		if err, ok := recovered.(string); ok {
			logger.Error("系统错误恢复",
				zap.String("error", err),
				zap.String("path", c.Request.URL.Path),
				zap.String("method", c.Request.Method),
			)
		}

		// 检查是否是网络连接错误
		if ne, ok := recovered.(*net.OpError); ok {
			if se, ok := ne.Err.(*os.SyscallError); ok {
				if strings.Contains(strings.ToLower(se.Error()), "broken pipe") ||
					strings.Contains(strings.ToLower(se.Error()), "connection reset by peer") {
					logger.Warn("网络连接中断",
						zap.String("path", c.Request.URL.Path),
						zap.String("method", c.Request.Method),
						zap.String("error", se.Error()),
					)
					c.AbortWithStatus(http.StatusInternalServerError)
					return
				}
			}
		}

		// 记录错误详情
		httpRequest, _ := httputil.DumpRequest(c.Request, false)
		logger.Error("系统崩溃恢复",
			zap.Any("recovered", recovered),
			zap.String("request", string(httpRequest)),
			zap.String("stack", string(debug.Stack())),
			zap.String("path", c.Request.URL.Path),
			zap.String("method", c.Request.Method),
			zap.String("ip", c.ClientIP()),
			zap.String("user-agent", c.Request.UserAgent()),
		)

		// 返回统一的错误响应
		requestID := getRequestIDFromContext(c)
		errorResp := &common.ErrorResponse{
			Code:      common.ERROR_INTERNAL_SERVER,
			Message:   common.GetErrorMessage(common.ERROR_INTERNAL_SERVER),
			Data:      nil,
			Timestamp: time.Now().Unix(),
			RequestID: requestID,
		}

		c.JSON(http.StatusInternalServerError, errorResp)
	})
}

// ErrorResponseMiddleware 错误响应处理中间件
// 这个中间件会捕获handler中的panic，并转换为统一的错误响应
func ErrorResponseMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// 检查是否是Repository错误
				if repoErr, ok := err.(*repository.RepositoryError); ok {
					handleRepositoryError(c, repoErr, logger)
					c.Abort()
					return
				}

				// 如果是AppError，使用统一响应格式
				if appErr, ok := err.(*common.AppError); ok {
					logger.Error("业务错误",
						zap.Int("code", appErr.Code),
						zap.String("message", appErr.Message),
						zap.String("path", c.Request.URL.Path),
						zap.String("method", c.Request.Method),
						zap.Any("details", appErr.Details),
						zap.Error(appErr.Internal),
					)

					common.Error(c, appErr)
					c.Abort()
					return
				}

				// 其他类型的panic，记录日志并返回内部错误
				logger.Error("未处理的panic",
					zap.Any("error", err),
					zap.String("path", c.Request.URL.Path),
					zap.String("method", c.Request.Method),
					zap.String("stack", string(debug.Stack())),
				)

				common.ErrorWithCode(c, common.ERROR_INTERNAL_SERVER)
				c.Abort()
			}
		}()

		c.Next()
	}
}

// RepositoryErrorMiddleware Repository错误处理中间件
// 用于在Service层返回Repository错误时自动转换为HTTP响应
func RepositoryErrorMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// 检查是否有错误存储在上下文中
		if len(c.Errors) > 0 {
			// 获取最后一个错误
			lastError := c.Errors.Last()
			if lastError != nil && lastError.Err != nil {
				// 检查是否是Repository错误
				if repoErr, ok := lastError.Err.(*repository.RepositoryError); ok {
					handleRepositoryError(c, repoErr, logger)
					return
				}
			}
		}
	}
}

// handleRepositoryError 处理Repository错误
func handleRepositoryError(c *gin.Context, repoErr *repository.RepositoryError, logger *zap.Logger) {
	// 获取请求ID
	requestID := getRequestIDFromContext(c)

	// 记录详细的错误日志
	logRepositoryError(logger, c, repoErr)

	// 构建错误响应
	errorResp := buildErrorResponse(repoErr, requestID)

	// 获取HTTP状态码
	httpStatus := repoErr.GetHTTPStatus()

	// 返回JSON响应
	c.JSON(httpStatus, errorResp)
}

// logRepositoryError 记录Repository错误日志
func logRepositoryError(logger *zap.Logger, c *gin.Context, repoErr *repository.RepositoryError) {
	fields := []zap.Field{
		zap.Int("code", repoErr.Code),
		zap.String("message", repoErr.Message),
		zap.String("operation", repoErr.Operation),
		zap.String("entity", repoErr.Entity),
		zap.String("path", c.Request.URL.Path),
		zap.String("method", c.Request.Method),
		zap.String("ip", c.ClientIP()),
	}

	// 添加可选字段
	if repoErr.EntityID != "" {
		fields = append(fields, zap.String("entity_id", repoErr.EntityID))
	}
	if repoErr.Field != "" {
		fields = append(fields, zap.String("field", repoErr.Field))
	}
	if repoErr.Value != nil {
		fields = append(fields, zap.Any("value", repoErr.Value))
	}
	if repoErr.Details != nil && len(repoErr.Details) > 0 {
		fields = append(fields, zap.Any("details", repoErr.Details))
	}
	if repoErr.Err != nil {
		fields = append(fields, zap.Error(repoErr.Err))
	}

	// 根据错误类型选择日志级别
	switch repoErr.Code {
	case common.ERROR_RECORD_NOT_FOUND:
		// 记录不存在通常不是严重错误，使用Info级别
		logger.Info("Repository错误: 记录不存在", fields...)
	case common.ERROR_RECORD_ALREADY_EXISTS:
		// 记录已存在通常是业务逻辑问题，使用Warn级别
		logger.Warn("Repository错误: 记录已存在", fields...)
	case common.ERROR_INVALID_PARAMS:
		// 无效参数通常是客户端问题，使用Warn级别
		logger.Warn("Repository错误: 无效参数", fields...)
	default:
		// 数据库错误等严重问题使用Error级别
		logger.Error("Repository错误", fields...)
	}
}

// buildErrorResponse 构建错误响应
func buildErrorResponse(repoErr *repository.RepositoryError, requestID string) *common.ErrorResponse {
	errorResp := &common.ErrorResponse{
		Code:      repoErr.Code,
		Message:   repoErr.Message,
		Data:      nil,
		Timestamp: time.Now().Unix(),
		RequestID: requestID,
	}

	// 构建errors字段，提供更详细的错误信息
	var fieldErrors []common.FieldError

	// 如果有实体和字段信息，添加到errors中
	if repoErr.Entity != "" {
		fieldError := common.FieldError{
			Field:   buildFieldName(repoErr),
			Message: buildFieldMessage(repoErr),
		}
		fieldErrors = append(fieldErrors, fieldError)
	}

	// 如果有其他详细信息，也可以添加到errors中
	if repoErr.Details != nil && len(repoErr.Details) > 0 {
		for key, value := range repoErr.Details {
			fieldError := common.FieldError{
				Field:   key,
				Message: fmt.Sprintf("%v", value),
			}
			fieldErrors = append(fieldErrors, fieldError)
		}
	}

	if len(fieldErrors) > 0 {
		errorResp.Errors = fieldErrors
	}

	return errorResp
}

// buildFieldName 构建字段名称
func buildFieldName(repoErr *repository.RepositoryError) string {
	if repoErr.Field != "" {
		return repoErr.Field
	}
	if repoErr.EntityID != "" {
		return "id"
	}
	return strings.ToLower(repoErr.Entity)
}

// buildFieldMessage 构建字段错误消息
func buildFieldMessage(repoErr *repository.RepositoryError) string {
	switch repoErr.Code {
	case common.ERROR_RECORD_NOT_FOUND:
		if repoErr.EntityID != "" {
			return fmt.Sprintf("%s(ID: %s)不存在", getEntityDisplayName(repoErr.Entity), repoErr.EntityID)
		}
		if repoErr.Field != "" && repoErr.Value != nil {
			return fmt.Sprintf("%s(%s=%v)不存在", getEntityDisplayName(repoErr.Entity), repoErr.Field, repoErr.Value)
		}
		return fmt.Sprintf("%s不存在", getEntityDisplayName(repoErr.Entity))

	case common.ERROR_RECORD_ALREADY_EXISTS:
		if repoErr.Field != "" && repoErr.Value != nil {
			return fmt.Sprintf("%s=%v已存在", repoErr.Field, repoErr.Value)
		}
		return fmt.Sprintf("%s已存在", getEntityDisplayName(repoErr.Entity))

	case common.ERROR_INVALID_PARAMS:
		if repoErr.Field != "" {
			return fmt.Sprintf("字段%s的值无效", repoErr.Field)
		}
		return "参数无效"

	case common.ERROR_DATABASE_ERROR:
		return fmt.Sprintf("%s操作失败", repoErr.Operation)

	default:
		return repoErr.Message
	}
}

// getEntityDisplayName 获取实体的显示名称（中文）
func getEntityDisplayName(entity string) string {
	entityNames := map[string]string{
		"User":        "用户",
		"Department":  "部门",
		"DataDict":    "数据字典",
		"DictItem":    "字典项",
		"File":        "文件",
		"Meeting":     "会议",
		"Transaction": "事务",
	}

	if displayName, exists := entityNames[entity]; exists {
		return displayName
	}
	return entity
}

// getRequestIDFromContext 从上下文获取请求ID
func getRequestIDFromContext(c *gin.Context) string {
	if requestID, exists := c.Get("requestId"); exists {
		if id, ok := requestID.(string); ok {
			return id
		}
	}

	// 生成一个简单的请求ID
	return fmt.Sprintf("%d_%s", time.Now().UnixNano(), c.Request.Method)
}
