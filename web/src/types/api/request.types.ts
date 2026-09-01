/**
 * API 请求类型定义
 */

import type { UserRole } from '../domain/user.types'
import type { UserSecurityLevel, ActiveStatus } from '../common/base.types'

// ========== 通用请求参数 ==========
// PaginationParams 和 SortParams 已在 base.types 中定义

/**
 * 查询参数
 */
export interface QueryParams {
  [key: string]: string | number | boolean | undefined
}

/**
 * 批量请求
 */
export interface BatchRequest<T = any> {
  ids: string[]
  data?: T
}

/**
 * 导出请求
 */
export interface ExportRequest {
  format?: 'csv' | 'xlsx' | 'pdf'
  filters?: Record<string, any>
  columns?: string[]
}

/**
 * 导入请求
 */
export interface ImportRequest {
  file: File
  overwrite?: boolean
}

// ========== 会议相关请求 ==========

// ========== 部门相关请求 ==========

/**
 * 部门筛选条件
 */
export interface DepartmentFilters {
  keyword?: string
  status?: 'enabled' | 'disabled'
  parentId?: string
}

/**
 * 创建部门请求
 */
export interface CreateDepartmentRequest {
  name: string
  code: string
  description?: string
  parentId?: string
  managerId?: string
  sort: number
  status: 'enabled' | 'disabled'
  phone?: string
  email?: string
  address?: string
}

/**
 * 更新部门请求
 */
export interface UpdateDepartmentRequest {
  id: string
  name?: string
  code?: string
  description?: string
  parentId?: string
  managerId?: string
  sort?: number
  status?: 'enabled' | 'disabled'
  phone?: string
  email?: string
  address?: string
}

// ========== 用户相关请求 ==========

/**
 * 用户筛选条件
 */
export interface UserFilters {
  keyword?: string
  role?: UserRole
  status?: ActiveStatus
  department?: string
  securityLevel?: UserSecurityLevel
  page?: number
  pageSize?: number
}

/**
 * 创建用户请求
 */
export interface CreateUserRequest {
  username: string
  realName?: string
  name?: string
  email?: string
  password: string
  role: UserRole
  department?: string
  position?: string
  phone?: string
  status: ActiveStatus
  securityLevel: UserSecurityLevel
  ukeyId?: string
  allowedIps?: string[]
  isHide?: boolean
  permissions?: string[]
}

/**
 * 更新用户请求
 */
export interface UpdateUserRequest {
  id: string
  username?: string
  realName?: string
  name?: string
  email?: string
  role?: UserRole
  department?: string
  position?: string
  phone?: string
  status?: ActiveStatus
  securityLevel?: UserSecurityLevel
  ukeyId?: string
  allowedIps?: string[]
  isHide?: boolean
  permissions?: string[]
}

// ========== 数据字典相关请求 ==========

/**
 * 字典筛选条件
 */
export interface DictFilters {
  keyword?: string
  dictType?: string
  status?: 'enabled' | 'disabled'
}

/**
 * 创建字典请求
 */
export interface CreateDictRequest {
  dictCode: string
  dictName: string
  dictType: string
  remark?: string
  status: 'enabled' | 'disabled'
  items?: Array<{
    code: string
    name: string
    value: string | number
    sort: number
    remark?: string
    status: 'enabled' | 'disabled'
  }>
}

/**
 * 更新字典请求
 */
export interface UpdateDictRequest {
  id: string
  dictCode?: string
  dictName?: string
  dictType?: string
  remark?: string
  status?: 'enabled' | 'disabled'
  items?: Array<{
    id?: string
    code: string
    name: string
    value: string | number
    sort: number
    remark?: string
    status: 'enabled' | 'disabled'
  }>
}

// ========== 参会人员相关请求 ==========

/**
 * 创建参会人员请求项
 */
export interface CreateParticipantItemRequest {
  user_id: string
  user_name: string
  name?: string          // 姓名
  email?: string
  department?: string
  security_level?: string // 密级
  password?: string       // 密码（可选，如果不提供则从用户表查询）
  role: 'host' | 'participant' | 'observer'
}

/**
 * 创建参会人员请求
 */
export interface CreateParticipantRequest extends CreateParticipantItemRequest {
  meeting_id?: string  // 从路径参数获取，不在请求体中
}

/**
 * 批量创建参会人员请求
 */
export interface BatchCreateParticipantRequest {
  meeting_id?: string  // 从路径参数获取
  participants: CreateParticipantItemRequest[]
}

/**
 * 更新参会人员请求
 */
export interface UpdateParticipantRequest {
  role?: 'host' | 'participant' | 'observer'
  department?: string
}

/**
 * 更新参会人员状态请求
 */
export interface UpdateParticipantStatusRequest {
  status: 'invited' | 'accepted' | 'declined' | 'attended'
}
