/**
 * 数据字典API服务
 */

import { httpClient } from '@/services/core/http.client'
import { API_PATHS } from '@/config'
import type {
  DataDict,
  DictFilters,
  CreateDictRequest,
  UpdateDictRequest,
  PaginatedResponse,
  BatchRequest,
  BatchResponse,
  OperationResult
} from '@/types'

// 字典特有的扩展类型
export interface DictSyncRequest {
  dictIds: string[]
  deviceIds?: string[]
  force?: boolean
}

export interface DictExportConfig {
  dictIds?: string[]
  includeItems: boolean
  format: 'json' | 'excel' | 'csv'
  encoding?: 'utf8' | 'gbk'
}

export class DictApiService {
  private basePath = API_PATHS.DICTIONARIES

  /**
   * 获取数据字典列表
   */
  async getDictionaries(
    filters: DictFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<DataDict>> {
    const response = await httpClient.get<PaginatedResponse<DataDict>>(this.basePath, {
      ...filters,
      page,
      pageSize
    })
    // httpClient.get 已经返回了 data 字段，直接返回 response
    return response
  }

  /**
   * 获取单个数据字典详情
   */
  async getDictionary(id: string): Promise<DataDict> {
    return await httpClient.get<DataDict>(`${this.basePath}/${id}`)
  }

  /**
   * 根据字典代码获取字典
   */
  async getDictionaryByCode(dictCode: string): Promise<DataDict> {
    return await httpClient.get<DataDict>(`${this.basePath}/code/${dictCode}`)
  }

  /**
   * 创建数据字典
   */
  async createDictionary(data: CreateDictRequest): Promise<DataDict> {
    return await httpClient.post<DataDict>(this.basePath, data)
  }

  /**
   * 更新数据字典
   */
  async updateDictionary(id: string, data: Partial<UpdateDictRequest>): Promise<DataDict> {
    return await httpClient.put<DataDict>(`${this.basePath}/${id}`, data)
  }

  /**
   * 删除数据字典
   */
  async deleteDictionary(id: string): Promise<OperationResult> {
    return await httpClient.delete<OperationResult>(`${this.basePath}/${id}`)
  }

  /**
   * 批量删除数据字典
   */
  async deleteDictionaries(ids: string[]): Promise<BatchResponse<OperationResult>> {
    const batchRequest: BatchRequest = {
      ids
    }
    return await httpClient.post<BatchResponse<OperationResult>>(`${this.basePath}/batch-delete`, batchRequest)
  }

  /**
   * 更新字典状态
   */
  async updateDictionaryStatus(
    id: string, 
    status: 'enabled' | 'disabled'
  ): Promise<OperationResult> {
    return await httpClient.patch<OperationResult>(
      `${this.basePath}/${id}/status`,
      { status }
    )
  }

  /**
   * 获取字典类型列表
   */
  async getDictTypes(): Promise<Array<{ label: string; value: string }>> {
    return await httpClient.get<Array<{ label: string; value: string }>>(
      `${this.basePath}/types`
    )
  }

  /**
   * 同步字典到设备
   */
  async syncToDevices(dictIds: string[]): Promise<boolean> {
    const request: DictSyncRequest = { dictIds }
    const response = await httpClient.post<OperationResult>(
      `${this.basePath}/sync`,
      request
    )
    return response.success
  }

  /**
   * 导出数据字典
   */
  async exportDictionaries(dictIds?: string[]): Promise<Blob> {
    const config: DictExportConfig = {
      dictIds,
      includeItems: true,
      format: 'json'
    }
    const response = await httpClient.download(`${this.basePath}/export`, config)
    return response
  }
}

export const dictApiService = new DictApiService()
