/**
 * TanStack Query 配置
 * 
 * 配置 React Query 的全局默认选项，包括缓存、重试、刷新等行为
 */

import { QueryClient } from '@tanstack/react-query'

/**
 * 默认 Query 配置选项
 */
export const defaultQueryOptions = {
  queries: {
    // 数据立即过期
    // 确保 invalidateQueries 后能立即重新获取数据
    staleTime: 0,
    
    // 缓存保留时间（5分钟）
    // 离开页面后缓存保留时间，避免短时间内重复请求
    gcTime: 5 * 60 * 1000,
    
    // 失败重试次数
    retry: 1,
    
    // 窗口聚焦时不自动刷新
    // 避免用户切换标签页时频繁请求
    refetchOnWindowFocus: false,
    
    // 网络重连时自动刷新
    refetchOnReconnect: true,
    
    // 组件挂载时自动刷新（如果数据 stale）
    // 确保返回列表页时能获取最新数据
    refetchOnMount: true,
  },
}

/**
 * Query Client 实例
 * 
 * 全局唯一的 QueryClient 实例，管理所有查询和缓存
 */
export const queryClient = new QueryClient({
  defaultOptions: defaultQueryOptions,
})
