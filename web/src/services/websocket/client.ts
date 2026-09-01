import type { 
  WSMessage, 
  WSMessageType, 
  WSConnectionState,
  WSConfig,
  MessageHandler,
  StateListener
} from './types'

/**
 * WebSocket 核心客户端
 * 
 * 职责：
 * - 管理 WebSocket 连接生命周期
 * - 自动重连机制
 * - 消息分发（发布-订阅模式）
 * - 连接状态管理
 * 
 * 特点：
 * - 单例模式，全局唯一连接
 * - 插件化消息处理
 * - 类型安全的消息订阅
 */
export class WebSocketClient {
  private ws: WebSocket | null = null
  private config: WSConfig
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  
  // 消息处理器映射
  private messageHandlers: Map<WSMessageType | '*', Set<MessageHandler>> = new Map()
  
  // 连接状态
  private connectionState: WSConnectionState = 'disconnected'
  private stateListeners: Set<StateListener> = new Set()
  
  // 连接参数（用于重连）
  private currentToken: string | null = null

  constructor(config: WSConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config,
    }
  }

  /**
   * 连接 WebSocket
   */
  connect(token: string): void {
    // 如果已连接，不重复连接
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WS] Already connected')
      return
    }

    // 保存 token 用于重连
    this.currentToken = token
    
    this.updateConnectionState('connecting')
    
    try {
      const url = `${this.config.url}?token=${encodeURIComponent(token)}`
      this.ws = new WebSocket(url)

      this.ws.onopen = () => this.handleOpen()
      this.ws.onmessage = (event) => this.handleMessage(event)
      this.ws.onerror = (error) => this.handleError(error)
      this.ws.onclose = (event) => this.handleClose(event)
      
    } catch (error) {
      console.error('[WS] Failed to connect:', error)
      this.updateConnectionState('error')
      this.scheduleReconnect()
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    console.log('[WS] Disconnecting...')
    
    this.clearReconnectTimer()
    this.clearHeartbeatTimer()
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    
    this.currentToken = null
    this.updateConnectionState('disconnected')
  }

  /**
   * 订阅消息
   * @returns 取消订阅函数
   */
  on<T = any>(type: WSMessageType | '*', handler: MessageHandler<T>): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set())
    }
    this.messageHandlers.get(type)!.add(handler as MessageHandler)

    // 返回取消订阅函数
    return () => this.off(type, handler)
  }

  /**
   * 取消订阅
   */
  off(type: WSMessageType | '*', handler: MessageHandler): void {
    this.messageHandlers.get(type)?.delete(handler)
  }

  /**
   * 监听连接状态变化
   * @returns 取消监听函数
   */
  onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  /**
   * 获取当前连接状态
   */
  getConnectionState(): WSConnectionState {
    return this.connectionState
  }

  /**
   * 获取 WebSocket 实例
   */
  getSocket(): WebSocket | null {
    return this.ws
  }

  // ==================== 私有方法 ====================

  /**
   * 处理连接建立
   */
  private handleOpen(): void {
    console.log('[WS] Connected')
    this.updateConnectionState('connected')
    this.reconnectAttempts = 0
    this.clearReconnectTimer()
    this.startHeartbeat()
  }

  /**
   * 处理消息接收
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WSMessage = JSON.parse(event.data)
      
      // 转换 snake_case 字段为 camelCase
      if (message.type === 'sync_progress' && message.data) {
        message.data = this.convertToCamelCase(message.data)
      }
      
      this.dispatchMessage(message)
    } catch (error) {
      console.error('[WS] Failed to parse message:', error)
    }
  }

  /**
   * 处理错误
   *
   * 浏览器 WebSocket 的 error 事件是不透明的 Event（不携带原因），且“非正常断连”
   * （刷新/HMR/后端重启/网络抖动）必然先触发 onerror 再触发 onclose。
   * 真正的断连原因在 close 的 code/reason 里，状态转移也统一交给 handleClose。
   * 故这里不再改连接状态（避免状态指示灯 error→disconnected 闪红），
   * 也降为 debug 级日志（避免无信息量的 error 刷屏）。
   */
  private handleError(error: Event): void {
    console.debug('[WS] error event (原因见随后的 close code/reason)', error)
  }

  /**
   * 处理连接关闭
   */
  private handleClose(event: CloseEvent): void {
    console.log(`[WS] Disconnected: ${event.code} ${event.reason}`)
    this.updateConnectionState('disconnected')
    this.clearHeartbeatTimer()
    
    // 如果不是正常关闭，尝试重连
    if (!event.wasClean && this.currentToken) {
      this.scheduleReconnect()
    }
  }

  /**
   * 分发消息到处理器
   */
  private dispatchMessage(message: WSMessage): void {
    // 调用通配符处理器
    this.messageHandlers.get('*')?.forEach(handler => {
      try {
        handler(message)
      } catch (error) {
        console.error('[WS] Handler error (*):', error)
      }
    })

    // 调用特定类型处理器
    this.messageHandlers.get(message.type)?.forEach(handler => {
      try {
        handler(message)
      } catch (error) {
        console.error(`[WS] Handler error (${message.type}):`, error)
      }
    })
  }

  /**
   * 更新连接状态
   */
  private updateConnectionState(state: WSConnectionState): void {
    if (this.connectionState === state) return
    
    console.log(`[WS] State: ${this.connectionState} → ${state}`)
    this.connectionState = state
    
    this.stateListeners.forEach(listener => {
      try {
        listener(state)
      } catch (error) {
        console.error('[WS] State listener error:', error)
      }
    })
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    const maxAttempts = this.config.maxReconnectAttempts || 10
    
    if (this.reconnectAttempts >= maxAttempts) {
      console.error(`[WS] Max reconnect attempts (${maxAttempts}) reached`)
      return
    }

    this.clearReconnectTimer()
    
    const interval = this.config.reconnectInterval || 5000
    console.log(`[WS] Reconnecting in ${interval}ms (attempt ${this.reconnectAttempts + 1}/${maxAttempts})`)
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++
      if (this.currentToken) {
        this.connect(this.currentToken)
      }
    }, interval)
  }

  /**
   * 清除重连定时器
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.clearHeartbeatTimer()
    
    const interval = this.config.heartbeatInterval
    if (!interval) return
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // 心跳消息由服务端主动发送，客户端只需保持连接
        console.log('[WS] Heartbeat check')
      }
    }, interval)
  }

  /**
   * 清除心跳定时器
   */
  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * 转换 snake_case 为 camelCase
   */
  private convertToCamelCase(obj: any): any {
    const result: any = {}
    for (const key in obj) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      result[camelKey] = obj[key]
    }
    return result
  }
}

// ==================== 工具函数 ====================

/**
 * 获取 WebSocket URL
 */
function getWebSocketURL(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
  
  // 如果是相对路径（开发环境），使用当前域名
  if (apiBaseUrl.startsWith('/')) {
    const host = window.location.host
    return `${protocol}//${host}/api/v1/ws`
  }
  
  // 如果是完整URL（生产环境），提取host
  const host = apiBaseUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  return `${protocol}//${host}/api/v1/ws`
}

// ==================== 单例导出 ====================

export const wsClient = new WebSocketClient({
  url: getWebSocketURL(),
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
})
