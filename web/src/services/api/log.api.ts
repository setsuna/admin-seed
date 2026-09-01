/**
 * 日志管理API服务
 */

import { httpClient } from '@/services/core/http.client'
import { API_PATHS } from '@/config'
import type {
  ApplicationLog,
  ThreeAdminLog,
  ApplicationLogFilters,
  ThreeAdminLogFilters,
  PaginatedResponse
} from '@/types'

export class LogApiService {
  private basePath = API_PATHS.LOGS
  private threeAdminPath = API_PATHS.LOGS_THREE_ADMIN

  /**
   * 获取应用日志列表（安全管理员）
   */
  async getLogs(
    filters: ApplicationLogFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<ApplicationLog>> {
    const params: Record<string, any> = {
      ...filters,
      page,
      size: pageSize
    }
    
    // 转换日期时间格式字段（如果前端使用的是datetime-local格式）
    if (params.startTime) {
      params.start_time = params.startTime
      delete params.startTime
    }
    if (params.endTime) {
      params.end_time = params.endTime
      delete params.endTime
    }
    
    // 转换其他snake_case字段
    if (params.operatorId) {
      params.operator_id = params.operatorId
      delete params.operatorId
    }
    if (params.operatorRole) {
      params.operator_role = params.operatorRole
      delete params.operatorRole
    }
    if (params.actionCategory) {
      params.action_category = params.actionCategory
      delete params.actionCategory
    }
    if (params.ipAddress) {
      params.ip_address = params.ipAddress
      delete params.ipAddress
    }
    if (params.operationResult) {
      params.result = params.operationResult
      delete params.operationResult
    }

    const response = await httpClient.get<any>(this.basePath, params)
    
    // 转换后端返回格式 { logs: [...], total: 2 } -> PaginatedResponse
    const logs = response?.logs || []
    const total = response?.total || 0
    
    // 字段映射：snake_case -> camelCase
    const items = logs.map((log: any) => ({
        ...log,
        operatorId: log.operator_id || log.operatorId,
        operatorName: log.operator_name || log.operatorName,
        operatorRole: log.operator_role || log.operatorRole,
        ipAddress: log.ip_address || log.ipAddress,
        moduleName: log.module_name || log.moduleName,
        actionCategory: log.action_category || log.actionCategory,
        actionDescription: log.action_description || log.actionDescription,
        operationResult: log.operation_result || log.result || log.operationResult,
        beforeData: log.before_data || log.beforeData,
        afterData: log.after_data || log.afterData,
        changeDetails: log.change_details || log.changeDetails,
        createdAt: log.created_at || log.createdAt,
        updatedAt: log.updated_at || log.updatedAt
      }))
    
    return {
      items,
      pagination: {
        total,
        page,
        pageSize
      }
    } as PaginatedResponse<ApplicationLog>
  }

  /**
   * 获取三员操作日志（审计员）
   */
  async getThreeAdminLogs(
    filters: ThreeAdminLogFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<ThreeAdminLog>> {
    const params: Record<string, any> = {
      ...filters,
      page,
      size: pageSize
    }
    
    // 转换日期时间格式字段
    if (params.startTime) {
      params.start_time = params.startTime
      delete params.startTime
    }
    if (params.endTime) {
      params.end_time = params.endTime
      delete params.endTime
    }
    
    // 转换其他snake_case字段
    if (params.operatorId) {
      params.operator_id = params.operatorId
      delete params.operatorId
    }
    if (params.operatorRole) {
      params.operator_role = params.operatorRole
      delete params.operatorRole
    }
    if (params.actionCategory) {
      params.action_category = params.actionCategory
      delete params.actionCategory
    }
    if (params.ipAddress) {
      params.ip_address = params.ipAddress
      delete params.ipAddress
    }
    if (params.operationResult) {
      params.result = params.operationResult
      delete params.operationResult
    }

    const response = await httpClient.get<any>(this.threeAdminPath, params)
    
    // 转换后端返回格式 { logs: [...], total: 2 } -> PaginatedResponse
    const logs = response?.logs || []
    const total = response?.total || 0
    
    // 字段映射：snake_case -> camelCase
    const items = logs.map((log: any) => ({
        ...log,
        operatorId: log.operator_id || log.operatorId,
        operatorName: log.operator_name || log.operatorName,
        operatorRole: log.operator_role || log.operatorRole,
        ipAddress: log.ip_address || log.ipAddress,
        moduleName: log.module_name || log.moduleName,
        actionCategory: log.action_category || log.actionCategory,
        actionDescription: log.action_description || log.actionDescription,
        operationResult: log.operation_result || log.result || log.operationResult,
        beforeData: log.before_data || log.beforeData,
        afterData: log.after_data || log.afterData,
        changeDetails: log.change_details || log.changeDetails,
        createdAt: log.created_at || log.createdAt,
        updatedAt: log.updated_at || log.updatedAt
      }))
    
    return {
      items,
      pagination: {
        total,
        page,
        pageSize
      }
    } as PaginatedResponse<ThreeAdminLog>
  }
}

export const logApiService = new LogApiService()
