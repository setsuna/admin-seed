/**
 * 请求/响应拦截器 (修复错误信息显示问题)
 */

import { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { HTTP_STATUS, JWT_CONFIG, ERROR_CODES, getErrorCategory, needsAutoLogin, getErrorMessage, isLoginLocalError, isChangePasswordLocalError } from '@/config'
import type { ApiResponse, ValidationError } from '@/types/api/response.types'
import { errorHandler } from './error.handler'
// 使用统一的认证服务
import { auth } from './auth.service'
import { useStore } from '@/store'

// 扩展配置类型以包含metadata
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    requestId: string
    startTime: number
  }
}

// 请求ID生成器
let requestId = 0
const generateRequestId = () => `req_${Date.now()}_${++requestId}`

/**
 * 请求拦截器
 */
export const requestInterceptor = async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
  // 生成请求ID用于追踪
  const reqId = generateRequestId()
  ;(config as ExtendedAxiosRequestConfig).metadata = { requestId: reqId, startTime: Date.now() }

  // 添加认证token
  const token = auth.getToken() // 使用统一的认证服务
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `${JWT_CONFIG.HEADER_PREFIX} ${token}`
  } else {
    console.log('[请求拦截器] No token found')
  }

  // 添加请求头
  if (config.headers) {
    config.headers.set('X-Request-ID', reqId)
    config.headers.set('X-Timestamp', Date.now().toString())
  }

  return config
}

/**
 * 🔄 修复：响应拦截器 - 正确提取后端错误信息
 */
export const responseInterceptor = (response: AxiosResponse<ApiResponse>): AxiosResponse<ApiResponse> => {
  const { config, data } = response
  const extendedConfig = config as ExtendedAxiosRequestConfig
  const requestId = extendedConfig.metadata?.requestId

  // 添加响应元数据
  if (data && typeof data === 'object') {
    ;(data as any).requestId = requestId
    ;(data as any).timestamp = Date.now()
  }


  // 🔧 修复：正确处理业务错误码 - 使用新错误码常量
  if (data?.code && data.code !== ERROR_CODES.SUCCESS) {
    
    // 创建错误对象，带有完整的后端信息
    const businessError = new Error(data.message || '业务错误')
    ;(businessError as any).code = data.code
    ;(businessError as any).data = data
    ;(businessError as any).errors = data.errors
    ;(businessError as any).category = getErrorCategory(data.code)
    ;(businessError as any).requestId = requestId
    
    throw businessError
  }

  return response
}

/**
 * 🔧 修复：错误拦截器 - 正确处理HTTP错误中的业务信息
 */
export const errorInterceptor = async (error: AxiosError<ApiResponse>): Promise<never> => {
  const { config, response, request } = error
  const requestId = (config as ExtendedAxiosRequestConfig)?.metadata?.requestId

  if (response && response.data) {
    const { status, data } = response
    
    if (data && typeof data === 'object' && data.code && data.message) {
      // 使用后端返回的具体错误信息和错误码
      await handleApiError(data.code, data.message, data.errors, requestId, data.data)  // 🆕 传递完整的 data.data
      
      // 抛出包含完整业务信息的错误
      const businessError = new Error(data.message)
      ;(businessError as any).code = data.code
      ;(businessError as any).data = data
      ;(businessError as any).errors = data.errors
      ;(businessError as any).requestId = requestId
      ;(businessError as any).httpStatus = status
      
      return Promise.reject(businessError)
    }
    
    switch (status) {
      case HTTP_STATUS.UNAUTHORIZED:
        const authMessage = data?.message || '未授权，请先登录'
        await handleApiError(ERROR_CODES.UNAUTHORIZED, authMessage, undefined, requestId)
        break
      case HTTP_STATUS.FORBIDDEN:
        const forbiddenMessage = data?.message || '权限不足，请联系管理员'
        await handleApiError(ERROR_CODES.PERMISSION_DENIED, forbiddenMessage, undefined, requestId)
        break
      case HTTP_STATUS.NOT_FOUND:
        errorHandler.handleError(new Error(data?.message || '请求的资源不存在'), 'NOT_FOUND')
        break
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
        await handleApiError(ERROR_CODES.INTERNAL_SERVER_ERROR, data?.message || '系统异常，请稍后重试', undefined, requestId)
        break
      default:
        const errorMessage = data?.message || `请求失败 (HTTP ${status})`
        errorHandler.handleError(new Error(errorMessage), 'API_ERROR')
    }
    
    // 抛出包含HTTP错误信息的错误
    const httpError = new Error(data?.message || `HTTP ${status} Error`)
    ;(httpError as any).httpStatus = status
    ;(httpError as any).data = data
    ;(httpError as any).requestId = requestId
    return Promise.reject(httpError)
  }
  
  // 🔧 修复：处理网络错误和请求配置错误
  else if (request) {
    console.warn('[HTTP客户端] 网络连接失败:', {
      url: config?.url,
      method: config?.method,
      requestId,
      message: error.message
    })
    
    // 显示网络错误通知（但不阻塞UI）
    errorHandler.handleError(new Error('网络连接失败，请检查网络设置'), 'NETWORK_ERROR')
    
    // 🔧 关键修复：使用增强的错误对象，确保错误信息完整
    const networkError = new Error('网络连接失败')
    ;(networkError as any).isNetworkError = true
    ;(networkError as any).requestId = requestId
    ;(networkError as any).config = config
    ;(networkError as any).originalError = error
    
    return Promise.reject(networkError)
  } 
  // 请求配置错误
  else {
    console.error('[HTTP客户端] 请求配置错误:', error)
    errorHandler.handleError(new Error('请求配置错误'), 'CONFIG_ERROR')
    return Promise.reject(error)
  }
}

/**
 * 🆕 API错误分类处理器 - 修复后使用正确的后端错误信息
 */
async function handleApiError(
  code: number, 
  message: string, 
  errors?: ValidationError[], 
  requestId?: string,
  fullData?: any  // 🆕 添加完整的响应数据
) {
  // 🆕 登录页/修改密码页本地处理的错误码，不走全局通知
  if (isLoginLocalError(code) || isChangePasswordLocalError(code)) {
    return
  }
  
  const category = getErrorCategory(code)
  const userMessage = getErrorMessage(code, message)
  
  switch (category) {
    case 'auth':
      await handleAuthError(code, message, userMessage, requestId)
      break
    case 'file':
      handleFileError(code, message, userMessage, errors)
      break
    case 'general':
      handleGeneralError(code, message, userMessage, errors)
      break
    case 'authorization':
      handleAuthorizationError(code, message, userMessage, fullData)  // 🆕 传递完整数据
      break
    case 'system':
      handleSystemError(code, message, userMessage)
      break
    case 'business':
    case 'database':
    default:
      // 🔧 修复：使用后端原始错误信息
      errorHandler.handleError(new Error(message), 'API_ERROR')
  }
}

/**
 * 🔧 修复：认证错误处理 - 使用后端原始消息 + 防止循环调用
 */
async function handleAuthError(code: number, backendMessage: string, _userMessage?: string, _requestId?: string) {
  // 需要自动跳转登录的错误码
  if (needsAutoLogin(code)) {
    // 先清空 store 状态
    useStore.getState().clearAuth()
    // 然后执行 logout 逻辑
    await auth.logout()
    // 最后跳转登录页
    window.location.href = '/login'
    return
  }
  
  // 其他认证错误显示后端原始提示
  errorHandler.handleError(new Error(backendMessage), 'PERMISSION_DENIED')
}

/**
 * 🔧 修复：文件错误处理 - 优先使用后端信息
 */
function handleFileError(code: number, backendMessage: string, userMessage: string, _errors?: ValidationError[]) {
  // 优先使用后端返回的具体错误信息
  let finalMessage = backendMessage
  
  // 如果后端没有具体信息，才使用默认的用户友好提示
  if (!backendMessage || backendMessage === '文件错误') {
    switch (code) {
      case ERROR_CODES.FILE_TOO_LARGE:
        finalMessage = '文件过大，请选择小于10MB的文件'
        break
      case ERROR_CODES.FILE_TYPE_NOT_SUPPORTED:
        finalMessage = '不支持该文件类型，请选择文档、图片或视频文件'
        break
      default:
        finalMessage = userMessage
    }
  }
  
  errorHandler.handleError(new Error(finalMessage), 'BUSINESS_ERROR')
}

/**
 * 🔧 修复：通用错误处理 - 优先使用后端信息
 */
function handleGeneralError(code: number, backendMessage: string, _userMessage: string, errors?: ValidationError[]) {
  if (code === ERROR_CODES.VALIDATION_ERROR && errors && errors.length > 0) {
    // 表单验证错误，触发专门的验证错误事件
    window.dispatchEvent(new CustomEvent('app:validation-error', {
      detail: { message: backendMessage, errors }
    }))
    return
  }
  
  errorHandler.handleError(new Error(backendMessage), 'VALIDATION_ERROR')
}

/**
 * 🔧 修复：授权错误处理 - 使用后端原始消息 + 自动显示授权对话框
 */
function handleAuthorizationError(code: number, backendMessage: string, _userMessage?: string, fullData?: any) {
  // 检测授权验证失败且需要授权码
  if (code === ERROR_CODES.AUTHORIZATION_CODE_INVALID) {
    const { showAuthError } = useStore.getState()
    
    // 显示授权错误对话框
    showAuthError({
      message: backendMessage || '系统授权验证失败',
      code: code,
      mode: 'error',
      allowClose: false,
      showCurrentStatus: false,
      errorDetails: backendMessage,
      applicationCode: fullData?.applicationCode,
      errorCode: fullData?.error_code,
      errorMessage: fullData?.error_message,
      needLicense: fullData?.need_license
    })
    return
  }
  
  // 其他授权错误使用原有处理
  errorHandler.handleError(new Error(backendMessage + '，请联系系统管理员'), 'PERMISSION_DENIED')
}

/**
 * 🔧 修复：系统错误处理 - 使用后端原始消息
 */
function handleSystemError(_code: number, backendMessage: string, _userMessage?: string) {
  // 系统错误可能需要重试，使用后端原始消息
  const error = new Error(backendMessage)
  ;(error as any).retryable = true
  errorHandler.handleError(error, 'SERVER_ERROR')
}

// 扩展AxiosRequestConfig类型以支持metadata
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: {
      requestId: string
      startTime: number
    }
  }
}
