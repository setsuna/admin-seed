/**
 * 全局错误处理Hook
 * 监听全局错误事件并使用通知系统显示错误
 */

import { useEffect } from 'react'
import { useNotifications } from './useNotifications'
import type { ValidationError } from '@/types/api/response.types'

interface GlobalErrorEvent extends CustomEvent {
  detail: {
    message: string
    type: string
    errorInfo?: any
    code?: number
    severity?: 'low' | 'medium' | 'high' | 'critical'
    userAction?: string
    retryable?: boolean
    validationErrors?: ValidationError[]
  }
}

interface ValidationErrorEvent extends CustomEvent {
  detail: {
    message?: string
    errors: ValidationError[]
  }
}

export function useErrorHandler() {
  const { 
    showApiError, 
    showValidationErrors, 
    showNetworkError,
    showError,
    showWarning
  } = useNotifications()

  useEffect(() => {
    // 🎯 监听全局错误事件
    const handleGlobalError = (event: GlobalErrorEvent) => {
      const { message, type, code, validationErrors, severity } = event.detail
      
      console.log('[全局错误监听器] 收到错误事件:', event.detail)
      
      // 如果有具体的错误码，使用API错误处理
      if (code && typeof code === 'number') {
        console.log('[全局错误监听器] 使用API错误处理:', code, message)
        showApiError(code, message, validationErrors)
        return
      }
      
      // 根据错误类型分别处理
      console.log('[全局错误监听器] 按类型处理错误:', type, message)
      
      switch (type) {
        case 'NETWORK_ERROR':
          showNetworkError(message)
          break
        case 'AUTH_ERROR':
        case 'PERMISSION_DENIED':
          showWarning('权限问题', message)
          break
        case 'VALIDATION_ERROR':
          if (validationErrors && validationErrors.length > 0) {
            showValidationErrors(validationErrors)
          } else {
            showError('验证失败', message)
          }
          break
        case 'FILE_ERROR':
          showError('文件操作失败', message)
          break
        case 'SYSTEM_ERROR':
          showError('系统异常', message)
          break
        default:
          // 根据严重程度选择通知类型
          if (severity === 'critical' || severity === 'high') {
            showError('系统错误', message)
          } else {
            showWarning('操作提示', message)
          }
      }
      
      console.log('[全局错误监听器] 错误处理完成')
    }
    
    // 🎯 监听表单验证错误事件
    const handleValidationError = (event: ValidationErrorEvent) => {
      const { errors } = event.detail
      console.log('[验证错误监听器] 收到验证错误:', errors)
      showValidationErrors(errors)
    }
    
    // 🎯 监听未处理的Promise错误
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[未处理的Promise错误]:', event.reason)
      
      // 尝试从错误对象中提取信息
      const error = event.reason
      if (error && typeof error === 'object') {
        const code = error.apiCode || error.code
        if (code && typeof code === 'number') {
          showApiError(code, error.message)
          event.preventDefault() // 阻止默认的错误处理
          return
        }
      }
      
      showError('系统异常', '发生了未处理的错误，请稍后重试')
    }
    
    // 🎯 监听全局JavaScript错误
    const handleGlobalJSError = (event: ErrorEvent) => {
      console.error('[全局JS错误]:', event.error)
      
      // 只在开发环境显示JS错误
      const isDev = process.env.NODE_ENV === 'development'
      if (isDev) {
        showError('代码错误', `${event.message} (${event.filename}:${event.lineno})`)
      } else {
        showError('系统异常', '页面出现异常，请刷新重试')
      }
    }

    // 添加事件监听器
    window.addEventListener('app:error', handleGlobalError as EventListener)
    window.addEventListener('app:validation-error', handleValidationError as EventListener)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleGlobalJSError)

    // 清理事件监听器
    return () => {
      window.removeEventListener('app:error', handleGlobalError as EventListener)
      window.removeEventListener('app:validation-error', handleValidationError as EventListener)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleGlobalJSError)
    }
  }, [showApiError, showValidationErrors, showNetworkError, showError, showWarning])

  // 🎯 提供手动触发错误的方法（用于测试或手动处理）
  const triggerError = (code: number, message?: string, errors?: ValidationError[]) => {
    showApiError(code, message, errors)
  }
  
  const triggerNetworkError = (message?: string) => {
    showNetworkError(message)
  }
  
  const triggerValidationError = (errors: ValidationError[]) => {
    showValidationErrors(errors)
  }

  return {
    triggerError,
    triggerNetworkError,
    triggerValidationError,
  }
}
