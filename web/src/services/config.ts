import { httpClient } from './core/http.client'
import type { ConfigItem, PaginationParams, PaginatedResponse } from '@/types'

export const configService = {
  // 获取配置列表
  getConfigs: (params?: PaginationParams & { search?: string; type?: string }) =>
    httpClient.get<PaginatedResponse<ConfigItem>>('/configs', params),

  // 获取配置详情
  getConfig: (id: string) =>
    httpClient.get<ConfigItem>(`/configs/${id}`),

  // 创建配置
  createConfig: (data: Omit<ConfigItem, 'id' | 'createdAt' | 'updatedAt'>) =>
    httpClient.post<ConfigItem>('/configs', data),

  // 更新配置
  updateConfig: (id: string, data: Partial<ConfigItem>) =>
    httpClient.put<ConfigItem>(`/configs/${id}`, data),

  // 删除配置
  deleteConfig: (id: string) =>
    httpClient.delete(`/configs/${id}`),

  // 验证YAML格式
  validateYaml: (content: string) =>
    httpClient.post<{ valid: boolean; error?: string }>('/configs/validate-yaml', { content }),

  // 导出配置
  exportConfig: (id: string) =>
    httpClient.download(`/configs/${id}/export`),

  // 导入配置
  importConfig: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return httpClient.post<ConfigItem>('/configs/import', formData)
  },
}
