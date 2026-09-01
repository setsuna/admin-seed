/**
 * 日志领域类型定义
 */

import type { BaseEntity } from '../common/base.types'

// ==================== 基础类型 ====================

/**
 * 日志操作结果
 */
export type LogOperationResult = 'success' | 'failure'

/**
 * 行为类别
 */
export type ActionCategory = 
  | 'CREATE'    // 创建
  | 'UPDATE'    // 修改
  | 'DELETE'    // 删除
  | 'VIEW'      // 查看
  | 'LOGIN'     // 登录
  | 'LOGOUT'    // 登出
  | 'EXPORT'    // 导出
  | 'IMPORT'    // 导入
  | 'CONFIG'    // 配置
  | 'SYNC'      // 同步

/**
 * 操作模块
 */
export type OperationModule =
  | 'USER'          // 用户管理
  | 'DEPARTMENT'    // 部门管理
  | 'MEETING'       // 会议管理
  | 'DICT'          // 数据字典
  | 'PERMISSION'    // 权限管理
  | 'SECURITY'      // 安全管理
  | 'SYSTEM'        // 系统管理
  | 'AUTH'          // 认证
  | 'CONFIG'        // 配置管理
  | 'SYNC'          // 同步管理

// ==================== 日志实体 ====================

/**
 * 应用日志（安全管理员查看）
 */
export interface ApplicationLog extends BaseEntity {
  /** 操作时间 */
  timestamp: string
  /** 操作人 */
  operator: string
  /** 操作人ID */
  operatorId: string
  /** 操作人姓名 */
  operatorName?: string
  /** 操作人角色 */
  operatorRole: string
  /** IP地址 */
  ipAddress: string
  /** 操作模块 */
  module: OperationModule
  /** 操作模块中文名（后端翻译，权威显示值） */
  moduleName?: string
  /** 行为类别 */
  actionCategory: ActionCategory
  /** 操作描述 */
  actionDescription: string
  /** 操作结果 */
  operationResult: LogOperationResult
  /** 修改前的数据 */
  beforeData?: Record<string, any>
  /** 修改后的数据 */
  afterData?: Record<string, any>
  /** 变更说明 */
  changeDetails?: string
}

/**
 * 三员操作日志（审计员查看）
 */
export interface ThreeAdminLog extends BaseEntity {
  /** 操作时间 */
  timestamp: string
  /** 操作人 */
  operator: string
  /** 操作人ID */
  operatorId: string
  /** 操作人姓名 */
  operatorName?: string
  /** 操作人角色 */
  operatorRole: 'SYSTEM_ADMIN' | 'SECURITY_ADMIN' | 'AUDITOR'
  /** IP地址 */
  ipAddress: string
  /** 操作模块 */
  module: OperationModule
  /** 操作模块中文名（后端翻译，权威显示值） */
  moduleName?: string
  /** 行为类别 */
  actionCategory: ActionCategory
  /** 操作描述 */
  actionDescription: string
  /** 操作结果 */
  operationResult: LogOperationResult
  /** 修改前的数据 */
  beforeData?: Record<string, any>
  /** 修改后的数据 */
  afterData?: Record<string, any>
  /** 变更说明 */
  changeDetails?: string
}

// ==================== 筛选条件 ====================

/**
 * 日志筛选条件基础类型
 */
export interface LogFiltersBase {
  /** 关键词搜索（操作描述） */
  keyword?: string
  /** 操作人 */
  operator?: string
  /** 操作模块 */
  module?: OperationModule
  /** 行为类别 */
  actionCategory?: ActionCategory
  /** 操作结果 */
  operationResult?: LogOperationResult
  /** 开始时间 */
  startTime?: string
  /** 结束时间 */
  endTime?: string
}

/**
 * 应用日志筛选条件
 */
export interface ApplicationLogFilters extends LogFiltersBase {
  /** 操作人角色 */
  operatorRole?: string
}

/**
 * 三员操作日志筛选条件
 */
export interface ThreeAdminLogFilters extends LogFiltersBase {
  /** 操作人角色（限定为三员） */
  operatorRole?: 'SYSTEM_ADMIN' | 'SECURITY_ADMIN' | 'AUDITOR'
}

// ==================== 常量配置 ====================

/**
 * 日志操作结果配置
 */
export const LOG_OPERATION_RESULT_CONFIG = {
  success: { 
    label: '成功', 
    color: 'text-green-600', 
    bgColor: 'bg-green-100' 
  },
  failure: { 
    label: '失败', 
    color: 'text-red-600', 
    bgColor: 'bg-red-100' 
  }
} as const

/**
 * 行为类别配置
 */
export const ACTION_CATEGORY_CONFIG = {
  CREATE: { label: '创建', color: 'text-blue-600' },
  UPDATE: { label: '修改', color: 'text-orange-600' },
  DELETE: { label: '删除', color: 'text-red-600' },
  VIEW: { label: '查看', color: 'text-gray-600' },
  LOGIN: { label: '登录', color: 'text-green-600' },
  LOGOUT: { label: '登出', color: 'text-gray-600' },
  EXPORT: { label: '导出', color: 'text-purple-600' },
  IMPORT: { label: '导入', color: 'text-indigo-600' },
  CONFIG: { label: '配置', color: 'text-yellow-600' },
  SYNC: { label: '同步', color: 'text-cyan-600' }
} as const

/**
 * 操作模块配置
 */
export const OPERATION_MODULE_CONFIG = {
  USER: { label: '用户管理', icon: '👤' },
  DEPARTMENT: { label: '部门管理', icon: '🏢' },
  MEETING: { label: '会议管理', icon: '📅' },
  DICT: { label: '数据字典', icon: '📚' },
  PERMISSION: { label: '权限管理', icon: '🔐' },
  SECURITY: { label: '安全管理', icon: '🛡️' },
  SYSTEM: { label: '系统管理', icon: '⚙️' },
  AUTH: { label: '认证', icon: '🔑' },
  CONFIG: { label: '配置管理', icon: '📝' },
  SYNC: { label: '同步管理', icon: '🔄' }
} as const
