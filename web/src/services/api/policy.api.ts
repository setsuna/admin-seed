/**
 * 策略配置 API 服务层
 * 遵循项目架构规范：
 * - httpClient 已经自动提取 response.data.data
 * - 所有方法直接返回结果，不访问 .data
 */

import { httpClient } from '../core/http.client'
import type { 
  SecurityPolicy, 
  AlertCheckResponse, 
  AuditLogStatsResponse,
  PurgeAuditLogsResponse 
} from '@/types'

const API_BASE = '/policy'

/**
 * 策略配置 API 服务类
 */
export class PolicyApiService {
  /**
   * 获取当前策略配置
   */
  async getPolicy(): Promise<SecurityPolicy> {
    return await httpClient.get<SecurityPolicy>(API_BASE)
  }

  /**
   * 更新策略配置
   * @param config - 策略配置（不包含 id、createdAt、updatedAt）
   */
  async updatePolicy(config: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<SecurityPolicy> {
    return await httpClient.put<SecurityPolicy>(API_BASE, config)
  }

  /**
   * 验证策略配置
   * @param config - 待验证的策略配置
   */
  async validatePolicy(config: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ valid: boolean }> {
    return await httpClient.post<{ valid: boolean }>(`${API_BASE}/validate`, config)
  }

  /**
   * 获取默认策略配置
   */
  async getDefaultPolicy(): Promise<SecurityPolicy> {
    return await httpClient.get<SecurityPolicy>(`${API_BASE}/default`)
  }

  /**
   * 导出策略配置
   * @returns Blob 对象，用于下载
   */
  async exportPolicy(): Promise<Blob> {
    return await httpClient.download(`${API_BASE}/export`)
  }

  // ==================== 告警相关接口 ====================

  /**
   * 检查告警（登录后调用）
   */
  async checkAlerts(): Promise<AlertCheckResponse> {
    return await httpClient.get<AlertCheckResponse>(`${API_BASE}/alerts/check`)
  }

  /**
   * 获取审计日志统计信息
   */
  async getAuditLogStats(): Promise<AuditLogStatsResponse> {
    return await httpClient.get<AuditLogStatsResponse>(`${API_BASE}/audit-logs/stats`)
  }

  /**
   * 覆盖（清理）审计日志
   */
  async purgeAuditLogs(): Promise<PurgeAuditLogsResponse> {
    // axios DELETE 请求带 body 需要用 data 配置项
    return await httpClient.delete<PurgeAuditLogsResponse>(`${API_BASE}/audit-logs`, undefined, {
      data: { months: 6 }
    })
  }
}

export const policyApi = new PolicyApiService()
