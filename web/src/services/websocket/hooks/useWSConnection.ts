import { useEffect, useRef } from 'react'
import { wsClient } from '../client'
import { notificationHandler } from '../handlers'
import { useStore } from '@/store'

/**
 * WebSocket 连接管理 Hook
 *
 * 职责：
 * - 管理 WebSocket 连接生命周期
 * - 注册全局消息处理器
 *
 * 使用场景：
 * - 在顶层组件（如 App.tsx 或 Layout）中使用一次
 * - 确保全局只有一个连接
 *
 * 种子版只保留通用的「系统通知」处理器。业务项目按需在此追加自己的
 * handler（例如拍报机的设备在线状态、耗材告警），照 notificationHandler
 * 的写法在 handlers/ 下新增一个文件并在此注册即可。
 *
 * @example
 * ```tsx
 * function App() {
 *   useWSConnection()
 *   return <Router />
 * }
 * ```
 */
export function useWSConnection() {
  // 用 ref 存储回调，避免依赖变化导致重复连接
  const userRef = useRef(useStore.getState().user)
  const addNotificationRef = useRef(useStore.getState().addNotification)

  // 同步最新的回调函数
  useEffect(() => {
    userRef.current = useStore.getState().user
    addNotificationRef.current = useStore.getState().addNotification
  })

  const hasInitializedRef = useRef(false)

  useEffect(() => {
    // 确保只初始化一次
    if (hasInitializedRef.current) return

    const token = localStorage.getItem('access_token')
    if (!token || !userRef.current) {
      console.log('[WS] No token or user, skipping connection')
      return
    }

    console.log('[WS] Initializing connection...')
    hasInitializedRef.current = true

    notificationHandler.setCallbacks({
      onNotification: (notification) => {
        addNotificationRef.current(notification)
      },
    })

    // 注册消息处理器
    const unsubscribeSystemNotify = wsClient.on(
      'system_notify',
      notificationHandler.handleSystemNotify.bind(notificationHandler)
    )

    // 连接 WebSocket
    wsClient.connect(token)

    // 清理函数
    return () => {
      console.log('[WS] Cleaning up connection')
      unsubscribeSystemNotify()
      wsClient.disconnect()
      hasInitializedRef.current = false
    }
  }, [])

  return {
    connectionState: wsClient.getConnectionState(),
  }
}
