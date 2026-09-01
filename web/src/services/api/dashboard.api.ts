/**
 * 仪表板 API 服务
 *
 * 种子版只统计系统管理域。业务项目请在此扩展类型与字段，
 * 并同步修改后端 internal/service/dashboard.go 与 dto/response/dashboard.go。
 */

import { httpClient } from '@/services/core/http.client'
import { API_PATHS } from '@/config'

// ========== 类型定义 ==========

export interface DashboardUserStats {
  total: number
  active: number
  inactive: number
}

export interface DashboardDepartmentStats {
  total: number
}

export interface DashboardRoleStats {
  total: number
}

export interface DashboardLogStats {
  total: number
  today: number
  failed7d: number
}

export interface DashboardData {
  user: DashboardUserStats
  department: DashboardDepartmentStats
  role: DashboardRoleStats
  log: DashboardLogStats
}

// ========== API ==========

export const dashboardApi = {
  /** 获取仪表板汇总数据 */
  getDashboard: (): Promise<DashboardData> =>
    httpClient.get<DashboardData>(API_PATHS.DASHBOARD),
}
