/**
 * 日志服务
 */

import { logApiService } from './api/log.api'
import type {
  ApplicationLog,
  ThreeAdminLog,
  ApplicationLogFilters,
  ThreeAdminLogFilters,
  PaginatedResponse
} from '@/types'

class LogService {
  /**
   * 获取应用日志列表（安全管理员）
   */
  async getApplicationLogs(
    params: ApplicationLogFilters & { page?: number; pageSize?: number } = {}
  ): Promise<PaginatedResponse<ApplicationLog>> {
    const { page = 1, pageSize = 20, ...filters } = params
    return logApiService.getLogs(filters, page, pageSize)
  }

  /**
   * 获取三员操作日志（审计员）
   */
  async getThreeAdminLogs(
    params: ThreeAdminLogFilters & { page?: number; pageSize?: number } = {}
  ): Promise<PaginatedResponse<ThreeAdminLog>> {
    const { page = 1, pageSize = 20, ...filters } = params
    return logApiService.getThreeAdminLogs(filters, page, pageSize)
  }
}

export const logService = new LogService()
