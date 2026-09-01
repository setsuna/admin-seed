/**
 * 数据字典类型重新导向
 * 将原有的字典类型导向新的类型结构
 */

// 重新导出新类型结构中的字典相关类型
export * from '@/types/domain/system.types'
export * from '@/types/api/request.types'
export * from '@/types/api/response.types'

// 为了保持兼容性，重新导出常用类型
export type {
  DataDict,
  DictItem,
  EntityStatus as DictStatus,
  CreateDictRequest,
  UpdateDictRequest,
  DictFilters
} from '@/types'

// 保持原有的特定字典类型定义
export interface CreateDictItemRequest {
  code: string
  name: string
  value: string | number
  status: EntityStatus
  sort: number
  remark?: string
}

export interface UpdateDictItemRequest extends Partial<CreateDictItemRequest> {
  id: string
}

export interface DictSyncRequest {
  dictIds: string[]
  deviceIds?: string[]
  force?: boolean
}

export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed'

export interface DictSyncResult {
  dictId: string
  dictName: string
  status: SyncStatus
  syncedAt?: string
  error?: string
  deviceResults?: Array<{
    deviceId: string
    deviceName: string
    status: SyncStatus
    error?: string
  }>
}

export interface DictExportConfig {
  dictIds?: string[]
  includeItems: boolean
  format: 'json' | 'excel' | 'csv'
  encoding?: 'utf8' | 'gbk'
}

export interface DictImportResult {
  total: number
  created: number
  updated: number
  failed: number
  errors: Array<{
    row: number
    dictCode?: string
    field?: string
    message: string
  }>
}

// 从新类型结构导入EntityStatus
import type { EntityStatus } from '@/types'
