import type { ErrorInfo, AuthErrorData } from '@/types'

/**
 * 从API响应中提取错误信息
 */
export const extractErrorInfo = (response: any): ErrorInfo => {
  const { code, message, data } = response || {}
  
  // 检查是否为授权错误
  const isAuthError = isAuthorizationError(data)
  
  // 优先级：message > data.error_message > 默认消息
  let errorMessage = '请求失败'
  
  if (message) {
    errorMessage = message
  } else if (data && typeof data === 'object' && data.error_message) {
    errorMessage = data.error_message
  } else if (code) {
    errorMessage = `请求失败 (${code})`
  }
  
  return {
    message: errorMessage,
    isAuthError,
    authData: isAuthError ? data : undefined
  }
}

/**
 * 检查是否为授权错误
 */
export const isAuthorizationError = (data: any): boolean => {
  if (!data || typeof data !== 'object') {
    return false
  }
  
  // 检查是否包含授权相关的字段
  return !!(
    data.error_code === 'EXPIRED' ||
    data.need_license === true ||
    data.device_fingerprint ||
    data.hardware_summary
  )
}

/**
 * 创建授权错误对话框数据
 */
export const createAuthErrorDialogData = (errorInfo: ErrorInfo, authData: AuthErrorData) => {
  return {
    message: errorInfo.message,
    deviceFingerprint: authData.device_fingerprint,
    hardwareSummary: authData.hardware_summary,
    errorCode: authData.error_code,
    mode: 'error' as const,
    allowClose: false, // 授权错误通常不允许关闭
    showCurrentStatus: false
  }
}

/**
 * 检查授权状态并显示过期提醒
 */
export const checkAndShowExpirationWarning = (showAlert: Function) => {
  try {
    const license = localStorage.getItem('license_data')
    if (!license) return
    
    const licenseData = JSON.parse(license)
    const expireDate = new Date(licenseData.expireDate)
    const now = new Date()
    const remainingDays = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (remainingDays <= 7 && remainingDays > 0) {
      // 检查今天是否已经提醒过
      const lastReminder = localStorage.getItem('last_auth_reminder')
      const today = new Date().toDateString()
      
      if (lastReminder !== today) {
        showAlert({
          type: 'warning',
          title: '授权即将过期',
          message: `授权将在 ${remainingDays} 天后过期，请及时更新授权`
        })
        localStorage.setItem('last_auth_reminder', today)
      }
    }
  } catch (error) {
    console.error('检查授权状态失败:', error)
  }
}
