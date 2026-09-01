/**
 * WebSocket 模块统一导出
 * 
 * 架构说明：
 * - client.ts: 核心客户端，管理连接和消息分发
 * - handlers/: 消息处理器，处理各类业务消息
 * - hooks/: React Hooks，提供便捷的使用方式
 * - types.ts: 类型定义
 * 
 * 使用方式：
 * 
 * 1. 在顶层组件初始化连接：
 * ```tsx
 * import { useWSConnection } from '@/services/websocket'
 * 
 * function App() {
 *   useWSConnection()  // 只调用一次
 *   return <Router />
 * }
 * ```
 * 
 * 2. 在业务组件订阅消息：
 * ```tsx
 * import { useWSSubscription } from '@/services/websocket'
 * 
 * function DevicePage() {
 *   useWSSubscription('device_online', (message) => {
 *     console.log('Device online:', message.data)
 *   })
 * }
 * ```
 * 
 * 3. 监听连接状态：
 * ```tsx
 * import { useWSState } from '@/services/websocket'
 * 
 * function StatusBar() {
 *   const { isConnected } = useWSState()
 *   return <div>{isConnected ? '已连接' : '未连接'}</div>
 * }
 * ```
 */

// 核心客户端
export { wsClient, WebSocketClient } from './client'

// 消息处理器
export {
  notificationHandler,
  NotificationMessageHandler,
} from './handlers'

// React Hooks
export {
  useWSConnection,
  useWSSubscription,
  useWSState,
} from './hooks'

// 类型定义
export type {
  WSMessage,
  WSMessageType,
  WSConnectionState,
  WSConfig,
  DeviceOnlineData,
  DeviceOfflineData,
  SystemNotifyData,
  HeartbeatData,
  SyncProgressData,
  ArchiveNotifyData,
  MessageHandler,
  StateListener,
} from './types'
