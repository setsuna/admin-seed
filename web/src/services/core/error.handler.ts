/**
 * 统一错误处理器
 */

import { getConfig, getErrorCategory, getErrorMessage, isRetryableError } from '@/config'
import type { ValidationError } from '@/types/api/response.types'

export type ErrorType = 
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'AUTH_ERROR'
  | 'FILE_ERROR'
  | 'SYSTEM_ERROR'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'CONFIG_ERROR'
  | 'VALIDATION_ERROR'
  | 'BUSINESS_ERROR'

export interface ErrorInfo {
  type: ErrorType
  message: string
  code?: string | number
  details?: any
  timestamp: number
  requestId?: string
  category?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  retryable?: boolean
  userAction?: string
  validationErrors?: ValidationError[]
}

export interface ErrorHandler {
  handleError: (error: Error, type: ErrorType, details?: any) => void
  showError: (message: string, type?: ErrorType) => void
  logError: (errorInfo: ErrorInfo) => void
}

class DefaultErrorHandler implements ErrorHandler {
  /**
   * 🔄 更新：处理错误 - 支持新错误码系统
   */
  handleError(error: Error | number, type?: ErrorType, details?: any): void {
    let errorInfo: ErrorInfo
    
    // 🆕 支持直接传入错误码
    if (typeof error === 'number') {
      errorInfo = this.createErrorInfoFromCode(error, details)
    } else {
      errorInfo = this.createErrorInfoFromError(error, type, details)
    }

    // 记录错误日志
    this.logError(errorInfo)

    // 显示用户友好的错误信息
    this.showError(errorInfo.message, errorInfo.type, errorInfo)
  }
  
  /**
   * 🆕 从错误码创建错误信息
   */
  private createErrorInfoFromCode(code: number, details?: any): ErrorInfo {
    const category = getErrorCategory(code)
    const message = getErrorMessage(code)
    const type = this.mapCategoryToType(category)
    
    return {
      type,
      message,
      code,
      details,
      timestamp: Date.now(),
      category,
      severity: this.getSeverityByCode(code),
      retryable: isRetryableError(code),
      userAction: this.getUserActionByCode(code),
      validationErrors: details?.errors
    }
  }
  
  /**
   * 🆕 从 Error 对象创建错误信息
   */
  private createErrorInfoFromError(error: Error, type?: ErrorType, details?: any): ErrorInfo {
    return {
      type: type || 'API_ERROR',
      message: error.message,
      code: (error as any).code,
      details,
      timestamp: Date.now(),
      requestId: (error as any).requestId,
      category: (error as any).category,
      retryable: (error as any).retryable || false
    }
  }
  
  /**
   * 🆕 将错误分类映射到错误类型
   */
  private mapCategoryToType(category: string): ErrorType {
    const mapping: Record<string, ErrorType> = {
      'general': 'VALIDATION_ERROR',
      'auth': 'AUTH_ERROR',
      'file': 'FILE_ERROR',
      'database': 'SERVER_ERROR',
      'business': 'BUSINESS_ERROR',
      'authorization': 'PERMISSION_DENIED',
      'system': 'SYSTEM_ERROR'
    }
    
    return mapping[category] || 'API_ERROR'
  }
  
  /**
   * 🆕 根据错误码获取严重程度
   */
  private getSeverityByCode(code: number): 'low' | 'medium' | 'high' | 'critical' {
    // 认证错误 - 高
    if (code >= 2001 && code <= 2999) return 'high'
    // 系统错误 - 严重
    if (code >= 9001 && code <= 9999) return 'critical'
    // 授权错误 - 高
    if (code >= 6001 && code <= 6999) return 'high'
    // 数据库错误 - 中等
    if (code >= 4001 && code <= 4999) return 'medium'
    // 其他 - 低
    return 'low'
  }
  
  /**
   * 🆕 根据错误码获取用户建议操作
   */
  private getUserActionByCode(code: number): string {
    switch (true) {
      case code >= 2001 && code <= 2003:
      case code === 2009:
        return '请重新登录'
      case code === 2004:
        return '请联系管理员申请权限'
      case code === 3003:
        return '请选择较小的文件'
      case code === 3004:
        return '请选择支持的文件格式'
      case code >= 6001 && code <= 6999:
        return '请联系系统管理员'
      case code >= 9001 && code <= 9999:
        return '请稍后重试或联系技术支持'
      default:
        return '请重试或联系支持人员'
    }
  }

  /**
   * 🔄 更新：显示错误信息给用户
   */
  showError(message: string, type: ErrorType = 'API_ERROR', errorInfo?: ErrorInfo): void {
    // 🆕 触发增强的全局错误事件
    window.dispatchEvent(new CustomEvent('app:error', {
      detail: { 
        message, 
        type, 
        errorInfo,
        code: errorInfo?.code,
        severity: errorInfo?.severity,
        userAction: errorInfo?.userAction,
        retryable: errorInfo?.retryable,
        validationErrors: errorInfo?.validationErrors
      }
    }))
    
  }

  /**
   * 记录错误日志
   */
  logError(errorInfo: ErrorInfo): void {
    // 开发环境控制台输出
    const config = getConfig()
    // 生产环境发送到日志服务
    if (config.env.isProduction) {
      this.sendToLogService(errorInfo)
    }
  }

  /**
   * 发送错误日志到服务器
   */
  private async sendToLogService(errorInfo: ErrorInfo): Promise<void> {
    try {
      // 这里可以调用日志服务API
      await fetch('/api/v1/logs/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorInfo)
      })
    } catch (logError) {
      // 忽略日志发送错误，避免无限循环
      console.warn('Failed to send error log:', logError)
    }
  }
}

// 错误重试机制
export class RetryManager {
  private retryMap = new Map<string, number>()

  shouldRetry(error: Error, requestId: string, maxRetries: number = 3): boolean {
    const currentRetries = this.retryMap.get(requestId) || 0
    
    // 只对特定类型的错误进行重试
    if (this.isRetryableError(error) && currentRetries < maxRetries) {
      this.retryMap.set(requestId, currentRetries + 1)
      return true
    }
    
    this.retryMap.delete(requestId)
    return false
  }

  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'NETWORK_ERROR',
      'SERVER_ERROR',
      'TIMEOUT_ERROR'
    ]
    
    return retryableErrors.some(type => 
      error.message.includes(type) || (error as any).type === type
    )
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (i === maxRetries || !this.isRetryableError(lastError)) {
          throw lastError
        }
        
        // 指数退避延迟
        await this.wait(delay * Math.pow(2, i))
      }
    }
    
    throw lastError!
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const errorHandler = new DefaultErrorHandler()
export const retryManager = new RetryManager()
