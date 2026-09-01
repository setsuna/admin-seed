/**
 * 配置相关类型定义
 */

import type { 
  API_PATHS, 
  HTTP_STATUS, 
  PERMISSIONS, 
  USER_ROLES, 
  MEETING_STATUS,
  FILE_TYPES,
  NOTIFICATION_TYPES,
  THEMES,
  DICT_TYPES,
  LOG_TYPES
} from './constants'

// 从常量中提取类型
export type ApiPath = typeof API_PATHS[keyof typeof API_PATHS]
export type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS]
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]
export type MeetingStatus = typeof MEETING_STATUS[keyof typeof MEETING_STATUS]
export type FileType = typeof FILE_TYPES[keyof typeof FILE_TYPES]
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES]
export type Theme = typeof THEMES[keyof typeof THEMES]
export type DictType = typeof DICT_TYPES[keyof typeof DICT_TYPES]
export type LogType = typeof LOG_TYPES[keyof typeof LOG_TYPES]

// 配置验证错误类型
export interface ConfigValidationError {
  field: string
  message: string
  value?: unknown
}

// 环境类型
export type Environment = 'development' | 'production' | 'test'

// API响应类型
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
  timestamp: string
}

// 分页响应类型
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
  hasPrev: boolean
}

// 配置更新类型
export interface ConfigUpdate {
  key: string
  value: unknown
  description?: string
}

// 系统信息类型
export interface SystemInfo {
  version: string
  buildTime: string
  environment: Environment
  features: string[]
}

// 用户会话信息类型
export interface SessionInfo {
  userId: string
  username: string
  role: UserRole
  permissions: Permission[]
  loginTime: string
  lastActivity: string
  expireTime: string
}

// 主题配置类型
export interface ThemeConfig {
  name: Theme
  colors: {
    primary: string
    secondary: string
    background: string
    text: string
    border: string
  }
  fonts: {
    sans: string[]
    mono: string[]
  }
}

// 导出所有类型
export * from './constants'
