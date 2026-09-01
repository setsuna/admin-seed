import { useWSConnection } from '@/services/websocket'

/**
 * WebSocket 连接初始化组件
 * 负责初始化和管理 WebSocket 连接
 * 不渲染任何UI，只处理连接逻辑
 */
export function WebSocketInitializer() {
  useWSConnection()
  return null
}
