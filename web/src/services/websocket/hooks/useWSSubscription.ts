import { useEffect, useRef, useState } from 'react'
import { wsClient } from '../client'
import type { WSMessage, WSMessageType } from '../types'

/**
 * WebSocket 消息订阅 Hook
 * 
 * 职责：
 * - 订阅特定类型的 WebSocket 消息
 * - 自动管理订阅生命周期
 * 
 * 使用场景：
 * - 在业务组件中订阅特定消息
 * - 实现页面级别的实时更新
 * 
 * @example
 * ```tsx
 * // 订阅设备上线消息
 * function DevicePage() {
 *   useWSSubscription('device_online', (message) => {
 *     console.log('Device online:', message.data)
 *     // 刷新设备列表
 *   })
 * }
 * 
 * // 订阅多个消息类型
 * function MeetingPage() {
 *   useWSSubscription(['meeting_create', 'meeting_update', 'meeting_delete'], (message) => {
 *     console.log('Meeting changed:', message)
 *     // 刷新会议列表
 *   })
 * }
 * 
 * // 订阅所有消息
 * function DebugPanel() {
 *   useWSSubscription('*', (message) => {
 *     console.log('WS message:', message)
 *   })
 * }
 * ```
 */
export function useWSSubscription<T = any>(
  type: WSMessageType | WSMessageType[] | '*',
  handler: (message: WSMessage<T>) => void,
  deps: any[] = []
) {
  // 使用 ref 存储最新的 handler，避免频繁订阅/取消订阅
  const handlerRef = useRef(handler)
  
  useEffect(() => {
    handlerRef.current = handler
  }, [handler, ...deps])

  useEffect(() => {
    const types = Array.isArray(type) ? type : [type]
    const unsubscribers: Array<() => void> = []

    // 为每个消息类型注册处理器
    types.forEach(msgType => {
      const wrappedHandler = (message: WSMessage<T>) => {
        handlerRef.current(message)
      }
      
      const unsubscribe = wsClient.on(msgType, wrappedHandler)
      unsubscribers.push(unsubscribe)
    })

    // 清理订阅
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [type])
}

/**
 * WebSocket 连接状态 Hook
 * 
 * @example
 * ```tsx
 * function StatusIndicator() {
 *   const { state, isConnected } = useWSState()
 *   
 *   return (
 *     <div>
 *       {isConnected ? '已连接' : '未连接'}
 *       <span>{state}</span>
 *     </div>
 *   )
 * }
 * ```
 */
export function useWSState() {
  const [state, setState] = useState(wsClient.getConnectionState())

  useEffect(() => {
    // 订阅状态变化
    const unsubscribe = wsClient.onStateChange(setState)
    
    // 立即更新一次状态
    setState(wsClient.getConnectionState())
    
    return unsubscribe
  }, [])

  return {
    state,
    isConnected: state === 'connected',
    isConnecting: state === 'connecting',
    isDisconnected: state === 'disconnected',
    isError: state === 'error',
  }
}
