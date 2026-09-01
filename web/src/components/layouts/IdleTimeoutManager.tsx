/**
 * 空闲超时管理器
 * 监听用户活动，空闲超时后自动登出
 * 从策略配置中读取 idleLockTimeoutMinutes 参数
 */

import { useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/store'
import { authService } from '@/services/core/auth.service'
import { policyService } from '@/services/policy'

export const IdleTimeoutManager = () => {
  const { clearAuth } = useStore()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // 从策略接口获取配置
  const { data: policy } = useQuery({
    queryKey: ['policy'],
    queryFn: () => policyService.getPolicy(),
    staleTime: 1 * 60 * 1000, // 5分钟缓存
  })
  
  // 获取超时时间（分钟）
  const timeoutMinutes = policy?.idleLockTimeoutMinutes || 0
  
  // 执行登出
  const handleTimeout = useCallback(async () => {
    console.log('[空闲超时] 会话超时，正在登出...')
    
    try {
      await authService.logout()
    } catch (error) {
      console.warn('[空闲超时] 登出API错误:', error)
    } finally {
      clearAuth()
      window.location.href = '/login'
    }
  }, [clearAuth])
  
  // 重置计时器
  const resetTimer = useCallback(() => {
    // 如果没有设置超时时间，不启用
    if (timeoutMinutes <= 0) {
      return
    }
    
    // 清除旧的计时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // 设置新的计时器
    const timeoutMs = timeoutMinutes * 60 * 1000
    timeoutRef.current = setTimeout(handleTimeout, timeoutMs)
  }, [timeoutMinutes, handleTimeout])
  
  // 处理用户活动
  const handleActivity = useCallback(() => {
    resetTimer()
  }, [resetTimer])
  
  useEffect(() => {
    // 如果没有设置超时时间，不启用监听
    if (timeoutMinutes <= 0) {
      return
    }
    
    // 监听的事件类型
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ]
    
    // 节流函数，避免频繁触发
    let throttleTimer: NodeJS.Timeout | null = null
    const throttledHandler = () => {
      if (throttleTimer) return
      throttleTimer = setTimeout(() => {
        throttleTimer = null
        handleActivity()
      }, 1000) // 1秒节流
    }
    
    // 添加事件监听
    events.forEach(event => {
      document.addEventListener(event, throttledHandler, { passive: true })
    })
    
    // 初始化计时器
    resetTimer()
    
    console.log(`[空闲超时] 已启用，超时时间: ${timeoutMinutes} 分钟`)
    
    // 清理函数
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledHandler)
      })
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      if (throttleTimer) {
        clearTimeout(throttleTimer)
      }
    }
  }, [timeoutMinutes, handleActivity, resetTimer])
  
  // 不渲染任何内容
  return null
}

export default IdleTimeoutManager
