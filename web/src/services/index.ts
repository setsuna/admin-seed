/**
 * 服务层统一导出
 * 重构后的简洁架构，移除Mock和懒加载复杂逻辑
 */

// ========================================
// 核心服务导出
// ========================================
export { httpClient } from './core/http.client'
export { sseService } from './core/sse.service'

// 延迟导入其他核心服务，避免初始化问题
export * from './core/auth.service'
// 只导出 error.handler 的服务，不导出类型（避免与 ../types 冲突）
export { errorHandler, retryManager } from './core/error.handler'

// ========================================
// API服务导出 (services/api/*.ts)
// ========================================
export { dictApiService } from './api/dict.api'
export { userApiService, userApi } from './api/user.api'
export { permissionApiService } from './api/permission.api'
export { policyApi } from './api/policy.api'
export { departmentApiService } from './api/department.api'
export { logApiService } from './api/log.api'

// 简写导出
export { departmentApiService as departmentApi } from './api/department.api'

// ========================================
// 业务服务导出 (services/*.ts)
// ========================================
export { departmentService } from './department'
export { userService } from './user'
export { policyService } from './policy'
export { dictService } from './dict'
export { permissionService } from './permission'
export { logService } from './log'

// ========================================
// WebSocket 服务导出 (新架构)
// ========================================
export { wsClient, useWSConnection, useWSSubscription, useWSState } from './websocket'
export type { WSMessage, WSMessageType, WSConnectionState, ArchiveNotifyData } from './websocket'

// ========================================
// 类型导出
// ========================================
// 只从 error.handler 导出类型（明确导出，避免冲突）
export type { ErrorType, ErrorInfo, ErrorHandler } from './core/error.handler'
// 导出其他服务类型
export type * from './types/dict.types'  
export type * from '../types'
