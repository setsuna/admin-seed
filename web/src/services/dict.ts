/**
 * 数据字典服务 - 重构后的简洁版本
 * 直接使用API服务，移除Mock逻辑
 */

import { dictApiService } from './api/dict.api'
import type { 
  DataDict, 
  DictFilters, 
  CreateDictRequest,
  UpdateDictRequest,
  PaginatedResponse 
} from '@/types'

/**
 * 字典服务类
 * 封装字典相关的业务逻辑
 */
class DictService {
  /**
   * 获取数据字典列表
   */
  async getDictionaries(
    filters: DictFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<DataDict>> {
    return dictApiService.getDictionaries(filters, page, pageSize)
  }

  /**
   * 获取单个数据字典详情
   */
  async getDictionary(id: string): Promise<DataDict> {
    return dictApiService.getDictionary(id)
  }

  /**
   * 创建数据字典
   */
  async createDictionary(data: CreateDictRequest): Promise<DataDict> {
    return dictApiService.createDictionary(data)
  }

  /**
   * 更新数据字典
   */
  async updateDictionary(id: string, data: UpdateDictRequest): Promise<DataDict> {
    return dictApiService.updateDictionary(id, data)
  }

  /**
   * 删除单个数据字典
   */
  async deleteDictionary(id: string): Promise<boolean> {
    const result = await dictApiService.deleteDictionary(id)
    return result.success
  }

  /**
   * 批量删除数据字典
   */
  async deleteDictionaries(ids: string[]): Promise<boolean> {
    const result = await dictApiService.deleteDictionaries(ids)
    return result.successCount === ids.length
  }

  /**
   * 更新数据字典状态
   */
  async updateDictionaryStatus(id: string, status: 'enabled' | 'disabled'): Promise<boolean> {
    const result = await dictApiService.updateDictionaryStatus(id, status)
    return result.success
  }

  /**
   * 获取字典类型列表
   */
  async getDictTypes(): Promise<{ label: string; value: string }[]> {
    return dictApiService.getDictTypes()
  }

  /**
   * 同步字典到设备
   */
  async syncToDevices(dictIds: string[]): Promise<boolean> {
    return dictApiService.syncToDevices(dictIds)
  }

  /**
   * 导出数据字典
   */
  async exportDictionaries(dictIds?: string[]): Promise<Blob> {
    return dictApiService.exportDictionaries(dictIds)
  }
}

export const dictService = new DictService()

// 兼容性导出，保持原有接口不变
export const dictApi = {
  getDictionaries: dictService.getDictionaries.bind(dictService),
  getDictionary: dictService.getDictionary.bind(dictService),
  createDictionary: dictService.createDictionary.bind(dictService),
  updateDictionary: dictService.updateDictionary.bind(dictService),
  deleteDictionary: dictService.deleteDictionary.bind(dictService),
  deleteDictionaries: dictService.deleteDictionaries.bind(dictService),
  updateDictionaryStatus: dictService.updateDictionaryStatus.bind(dictService),
  getDictTypes: dictService.getDictTypes.bind(dictService),
  syncToDevices: dictService.syncToDevices.bind(dictService),
  exportDictionaries: dictService.exportDictionaries.bind(dictService)
}
