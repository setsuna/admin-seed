import { useStore } from '@/store'
import type { ValidationError } from '@/types/api/response.types'
import { ERROR_CODES, getErrorMessage, isRetryableError, needsAutoLogin } from '@/config'

export function useNotifications() {
  const addNotification = useStore((state) => state.addNotification)
  const removeNotification = useStore((state) => state.removeNotification)
  const clearNotifications = useStore((state) => state.clearNotifications)
  
  interface NotificationOptions {
    duration?: number
    actions?: Array<{
      label: string
      action: () => void
      type?: 'primary' | 'secondary'
    }>
  }
  
  const showSuccess = (title: string, message?: string, options?: NotificationOptions) => {
    addNotification({ type: 'success', title, message: message || '', ...options })
  }
  
  const showError = (title: string, message?: string, options?: NotificationOptions) => {
    addNotification({ type: 'error', title, message: message || '', ...options })
  }
  
  const showWarning = (title: string, message?: string, options?: NotificationOptions) => {
    addNotification({ type: 'warning', title, message: message || '', ...options })
  }
  
  const showInfo = (title: string, message?: string, options?: NotificationOptions) => {
    addNotification({ type: 'info', title, message: message || '', ...options })
  }
  
  const showApiError = (code: number, message?: string, errors?: ValidationError[]) => {
    const errorMessage = getErrorMessage(code, message)
    
    switch (true) {
      case needsAutoLogin(code):
        break
        
      case code === ERROR_CODES.VALIDATION_ERROR:
        if (errors && errors.length > 0) {
          showValidationErrors(errors)
        } else {
          showError('数据验证失败', errorMessage)
        }
        break
        
      case code === ERROR_CODES.PERMISSION_DENIED:
        showWarning('权限不足', '您没有权限执行此操作，请联系管理员')
        break
        
      case code === ERROR_CODES.FILE_TOO_LARGE:
        showError('文件过大', '请选择小于10MB的文件')
        break
        
      case code === ERROR_CODES.FILE_TYPE_NOT_SUPPORTED:
        showError('文件类型不支持', '请选择文档、图片或视频格式的文件')
        break
        
      case code === ERROR_CODES.AUTHORIZATION_CODE_INVALID ||
           code === ERROR_CODES.AUTHORIZATION_CODE_EXPIRED ||
           code === ERROR_CODES.AUTHORIZATION_CODE_NOT_EXIST:
        showError('系统授权异常', errorMessage + '，请联系系统管理员')
        break
        
      case isRetryableError(code):
        showError('系统繁忙', errorMessage + '，请稍后重试', {
          actions: [{
            label: '重试',
            action: () => window.location.reload()
          }]
        })
        break
        
      default:
        showError('操作失败', errorMessage)
    }
  }
  
  const showValidationErrors = (errors: ValidationError[]) => {
    window.dispatchEvent(new CustomEvent('app:validation-error', {
      detail: { errors }
    }))
    
    const errorCount = errors.length
    showError(
      '表单验证失败',
      `发现 ${errorCount} 个字段错误，请检查并修正后重试`
    )
  }
  
  const showNetworkError = (message?: string) => {
    showError(
      '网络连接失败',
      message || '请检查网络连接后重试',
      {
        duration: 8000,
        actions: [{
          label: '知道了',
          action: () => {}
        }]
      }
    )
  }
  
  const showMaintenanceNotice = (message?: string) => {
    showInfo(
      '系统维护中',
      message || '系统正在维护升级，请稍后访问',
      {
        duration: 0
      }
    )
  }
  
  const showPermissionGuide = (permission: string) => {
    showWarning(
      '需要更高权限',
      `此操作需要 ${permission} 权限，请联系管理员申请`,
      {
        actions: [{
          label: '联系管理员',
          action: () => {
            console.log('打开权限申请流程')
          }
        }]
      }
    )
  }
  
  return {
    addNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showApiError,
    showValidationErrors,
    showNetworkError,
    showMaintenanceNotice,
    showPermissionGuide,
  }
}
