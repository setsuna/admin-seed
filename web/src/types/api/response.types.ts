/**
 * API 响应类型定义
 */

// ========== 通用响应 ==========

/**
 * 标准 API 响应
 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  errors?: ValidationError[]  // 添加验证错误字段
  timestamp?: number
  requestId?: string
}

/**
 * API 错误响应
 */
export interface ApiErrorResponse {
  code: number
  message: string
  errors?: ValidationError[]
  timestamp?: number
  requestId?: string
}

/**
 * 登录响应
 */
export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: {
    id: string
    username: string
    name?: string
    email?: string
    role: string
    avatar?: string
    status: string
  }
}

/**
 * 验证错误项
 */
export interface ValidationError {
  field: string
  message: string
  code?: string
}

/**
 * 分页信息
 */
export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[]
  pagination: PaginationInfo
}

/**
 * 操作结果
 */
export interface OperationResult {
  success: boolean
  message: string
  data?: any
}

/**
 * 批量操作响应
 */
export interface BatchResponse<T> {
  success: boolean
  message: string
  successCount: number
  failCount: number
  results: Array<{
    id: string
    success: boolean
    data?: T
    error?: string
  }>
}

/**
 * 文件上传响应
 */
export interface FileUploadResponse {
  id: string
  filename: string
  originalName: string
  size: number
  mimeType: string
  url: string
  uploadedAt: string
}
