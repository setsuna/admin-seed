/**
 * WebSocket 消息类型
 */
export type WSMessageType = 
  | 'device_online'
  | 'device_offline'
  | 'system_notify'
  | 'heartbeat'
  | 'meeting_create'
  | 'meeting_update'
  | 'meeting_delete'
  | 'sync_progress'
  | 'archive_start'
  | 'archive_complete'
  | 'archive_failed'

/**
 * WebSocket 消息基础结构
 */
export interface WSMessage<T = any> {
  type: WSMessageType
  data: T
  timestamp: number
  requestId?: string
}

/**
 * 设备上线消息数据
 */
export interface DeviceOnlineData {
  serialNumber: string
  deviceName: string
  mountPath: string
  isRegistered: boolean
}

/**
 * 设备下线消息数据
 */
export interface DeviceOfflineData {
  serialNumber: string
  deviceName: string
}

/**
 * 系统通知消息数据
 */
export interface SystemNotifyData {
  title: string
  content: string
  level: 'info' | 'warning' | 'error'
}

/**
 * 心跳消息数据
 */
export interface HeartbeatData {
  serverTime: number
}

/**
 * 同步进度消息数据
 */
export interface SyncProgressData {
  taskId: string        // 转换为 camelCase
  progress: number
  speed: string
  eta: string
  currentFile?: string  // 转换为 camelCase
}

/**
 * 归档通知消息数据
 */
export interface ArchiveNotifyData {
  device_serial: string
  meeting_count?: number
  signatures_count?: number
  votes_count?: number
  audit_logs_count?: number
  error_message?: string
}

/**
 * WebSocket 连接状态
 */
export type WSConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * WebSocket 配置
 */
export interface WSConfig {
  url: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

/**
 * 消息处理器类型
 */
export type MessageHandler<T = any> = (message: WSMessage<T>) => void | Promise<void>

/**
 * 状态监听器类型
 */
export type StateListener = (state: WSConnectionState) => void

/**
 * 消息处理器注册接口
 */
export interface MessageHandlerRegistry {
  register<T = any>(type: WSMessageType | '*', handler: MessageHandler<T>): () => void
  unregister(type: WSMessageType | '*', handler: MessageHandler): void
}
