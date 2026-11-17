/**
 * UI 组件通用类型定义
 */

import type { PaginationParams, SelectOption } from '../common/base.types'

// ========== 通知相关 ==========

/**
 * 通知类型
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

/**
 * 通知
 */
export interface Notification {
  id?: string
  type: NotificationType
  title?: string
  message?: string
  duration?: number
  timestamp?: number
  read?: boolean
}

/**
 * 操作按钮
 */
export interface ActionButton {
  label: string
  onClick: () => void
  type?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
}

/**
 * 批量操作
 */
export interface BatchAction {
  label: string
  icon?: React.ReactNode
  onClick: (selectedIds: string[]) => void
  danger?: boolean
  disabled?: boolean
}

// ========== 表格相关 ==========

/**
 * 表格列定义
 */
export interface TableColumn<T = any> {
  key: keyof T | string
  title: string
  width?: string | number
  align?: 'left' | 'center' | 'right'
  render?: (value: any, record: T, index: number) => React.ReactNode
  /** 超出 width 时省略号截断，悬停看全文（需同时设置 width） */
  ellipsis?: boolean
  /** 能否在「列设置」里隐藏，默认 true；操作列等应设 false */
  hideable?: boolean
  /** 默认隐藏（用户可在「列设置」里打开） */
  defaultHidden?: boolean
}

/**
 * 表格属性
 */
export interface TableProps<T = any> {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  pagination?: PaginationParams & { total?: number }
  onPaginationChange?: (pagination: PaginationParams) => void
  rowKey?: keyof T | ((record: T) => string)
  className?: string
}

// ========== 表单相关 ==========
// SelectOption 已在 base.types 中定义

/**
 * 表单字段
 */
export interface FormField {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'date' | 'checkbox'
  required?: boolean
  placeholder?: string
  options?: SelectOption[]
  rules?: any[]
}

// ========== 错误处理相关 ==========

/**
 * 错误信息
 */
export interface ErrorInfo {
  message: string
  isAuthError: boolean
  authData?: AuthErrorData
}

/**
 * 认证错误数据
 */
export interface AuthErrorData {
  device_fingerprint?: string
  hardware_summary?: string
  error_code?: string
  need_license?: boolean
}

/**
 * 认证错误对话框数据
 */
export interface AuthErrorDialogData {
  message: string
  deviceFingerprint?: string
  hardwareSummary?: string
  errorCode?: string
  mode: 'error' | 'warning' | 'info'
  allowClose: boolean
  showCurrentStatus: boolean
  // 🆕 新增：授权错误相关字段
  code?: number  // 错误码
  errorDetails?: string  // 错误详情
  applicationCode?: string  // 系统授权码
  errorMessage?: string  // 后端返回的错误消息
  needLicense?: boolean  // 是否需要授权
}

// ========== WebSocket 相关 ==========

/**
 * WebSocket 消息
 */
export interface WebSocketMessage {
  type: string
  data: any
  timestamp?: number
}
