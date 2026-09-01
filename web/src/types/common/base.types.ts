/**
 * 基础通用类型定义
 * 包含系统中最基础的类型定义
 */

// 时间相关
export type ISODateString = string
export type UnixTimestamp = number

// 状态枚举
export type EntityStatus = 'enabled' | 'disabled'
export type ActiveStatus = 'active' | 'inactive' | 'suspended'
export type OperationStatus = 'pending' | 'processing' | 'completed' | 'failed'

// 主题系统（两个正交维度，对齐平板端 SealMeet）
//
//   明暗模式 ThemeMode  ×  品牌色 BrandTheme
//
// 中性色 / 语义色全局固定（暖灰基调），换肤只换品牌色的 4 个变量：
// brand / brand-dark / tint / glow。这样 10 套品牌色 × 2 种明暗都能保持协调。

/** 明暗模式（system = 跟随系统） */
export type ThemeMode = 'light' | 'dark' | 'system'

/** 品牌色（10 套，与平板端 BrandPalettes 一致） */
export type BrandTheme =
  | 'pomegranate'   // 深石榴红（默认）
  | 'china-red'     // 中国红
  | 'wine'          // 酒红
  | 'cinnabar'      // 朱砂红
  | 'tech-blue'     // 科技蓝
  | 'indigo'        // 靖蓝
  | 'geek-purple'   // 极客紫
  | 'tech-teal'     // 科技青
  | 'vivid-orange'  // 活力橙
  | 'ink-black'     // 墨黑

/**
 * @deprecated 旧的单维度主题类型。已拆分为 ThemeMode + BrandTheme。
 * 保留仅为兼容尚未迁移的调用点。
 */
export type Theme = ThemeMode | 'gov-red'

// 安全等级
export type UserSecurityLevel = 'unknown' | 'internal' | 'confidential' | 'secret'
export type SystemSecurityLevel = 'internal' | 'confidential' | 'secret'
// MeetingSecurityLevel 在 domain/meeting.types.ts 中定义

// 通用实体基础字段
export interface BaseEntity {
  id: string
  createdAt: ISODateString
  updatedAt: ISODateString
  createdBy?: string
  updatedBy?: string
}

// 带状态的实体
export interface StatusEntity extends BaseEntity {
  status: EntityStatus
}

// 软删除实体
export interface SoftDeleteEntity extends BaseEntity {
  deletedAt?: ISODateString
  deletedBy?: string
}

// 分页参数
export interface PaginationParams {
  page: number
  pageSize: number
}

// 排序参数
export interface SortParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 时间范围
export interface TimeRange {
  start: ISODateString
  end: ISODateString
}

// 通用筛选参数基础接口
export interface BaseFilters {
  keyword?: string
  dateRange?: [ISODateString, ISODateString]
  [key: string]: any
}

// 树形结构节点
export interface TreeNode<T = any> extends BaseEntity {
  parentId?: string
  level: number
  path: string
  children?: TreeNode<T>[]
  data?: T
}

// 字典选项
export interface SelectOption<T = string | number> {
  label: string
  value: T
  disabled?: boolean
  extra?: Record<string, any>
}

// ID值类型
export type ID = string | number

// 文件信息
export interface FileInfo {
  id: string
  name: string
  originalName: string
  size: number
  type: string
  url: string
  thumbnailUrl?: string
  hash?: string
  uploadedAt: ISODateString
  uploadedBy?: string
}

// 地理位置
export interface GeoLocation {
  latitude: number
  longitude: number
  address?: string
  city?: string
  country?: string
}

// 联系信息
export interface ContactInfo {
  phone?: string
  email?: string
  address?: string
  website?: string
}

// 统计数据基础结构
export interface StatsData {
  total: number
  [key: string]: number
}

// 错误码枚举
export enum ErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // 认证错误
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  LOGIN_REQUIRED = 'LOGIN_REQUIRED',
  
  // 资源错误
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  
  // 业务错误
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  OPERATION_FAILED = 'OPERATION_FAILED'
}

// 操作类型
export type OperationType = 'create' | 'read' | 'update' | 'delete' | 'export' | 'import' | 'batch'

// 权限动作
export type PermissionAction = 'read' | 'write' | 'delete' | 'manage' | 'export' | 'import'

// 日志级别
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

// 环境类型
export type Environment = 'development' | 'staging' | 'production'

// 语言类型
export type Language = 'zh-CN' | 'en-US'

// 用户设备类型（前端设备）
export type ClientDeviceType = 'desktop' | 'tablet' | 'mobile'

// 浏览器类型
export type BrowserType = 'chrome' | 'firefox' | 'safari' | 'edge' | 'ie' | 'unknown'

// 操作系统类型
export type OSType = 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'unknown'
