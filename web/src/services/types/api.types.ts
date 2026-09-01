/**
 * 服务层类型重新导向
 * 将原有的服务层类型导向新的类型结构
 * 保持兼容性，逐步迁移
 */

// 重新导出新类型结构中的类型，保持兼容性
export * from '@/types/api'
export * from '@/types/common'

// 为了保持兼容性，重新导出常用类型
export type {
  ApiResponse,
  PaginatedResponse,
  OperationResult,
  BatchRequest,
  BatchResponse,
  FileUploadResponse,
  BaseEntity,
  StatusEntity,
  EntityStatus,
  PaginationParams,
  SortParams,
  BaseFilters,  // 使用 BaseFilters 替代 FilterParams
  QueryParams
} from '@/types'
