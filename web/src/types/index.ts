/**
 * 类型定义统一导出
 */

// ========== 通用基础类型 ==========
export * from './common/base.types'

// ========== UI 类型 ==========
export * from './common/ui.types'

// ========== WebSocket 类型 ==========
// WebSocket 类型已迁移到 @/services/websocket/types.ts
// 如需使用，请从 '@/services/websocket' 导入

// ========== 域类型 ==========
export * from './domain/user.types'
export * from './domain/system.types'
export * from './domain/log.types'

// ========== API 类型 ==========
export * from './api/request.types'
export * from './api/response.types'
