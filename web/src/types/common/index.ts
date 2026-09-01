/**
 * 通用类型导出文件
 * 统一导出common模块的所有类型
 */

// 基础类型
export * from './base.types'

// UI类型
export * from './ui.types'

// WebSocket类型已迁移到 @/services/websocket/types.ts
// 如需使用 WebSocket 类型，请从 @/services/websocket 导入

// 常用类型别名
export type { ID, ISODateString, UnixTimestamp } from './base.types'
export type { NotificationType, ActionButton, BatchAction } from './ui.types'

// 设备相关类型别名
export type { ClientDeviceType, BrowserType, OSType } from './base.types'
