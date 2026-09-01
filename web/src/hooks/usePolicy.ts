/**
 * 策略配置管理 Hook
 * 使用 TanStack Query 管理服务端状态
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { policyService } from '@/services/policy'
import { useNotifications } from './useNotifications'
import type { SecurityPolicy } from '@/types'

export interface UsePolicyOptions {
  enableAutoRefresh?: boolean
  autoRefreshInterval?: number
}

export const usePolicy = (options: UsePolicyOptions = {}) => {
  const { 
    enableAutoRefresh = false,
    autoRefreshInterval = 60000
  } = options
  
  const { showSuccess, showError, showInfo } = useNotifications()
  const queryClient = useQueryClient()
  
  // 状态管理
  const [isValidating, setIsValidating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  
  // 查询当前策略配置
  const policyQuery = useQuery({
    queryKey: ['policy'],
    queryFn: () => policyService.getPolicy(),
    refetchInterval: enableAutoRefresh ? autoRefreshInterval : false,
    staleTime: 5 * 60 * 1000, // 5分钟内认为数据新鲜
  })
  
  // 查询默认配置（手动触发）
  const defaultPolicyQuery = useQuery({
    queryKey: ['defaultPolicy'],
    queryFn: () => policyService.getDefaultPolicy(),
    enabled: false, // 默认不自动执行
  })
  
  // 刷新相关查询
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['policy'] })
  }
  
  // 更新策略配置
  const updateMutation = useMutation({
    mutationFn: (config: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'>) => 
      policyService.updatePolicy(config),
    onSuccess: () => {
      showSuccess('配置保存成功', '策略配置已成功保存并生效')
      invalidateQueries()
    },
    onError: (error: any) => {
      showError('配置保存失败', error.message || '请稍后重试')
    }
  })
  
  // 验证策略配置
  const validateConfig = async (config: SecurityPolicy): Promise<boolean> => {
    setIsValidating(true)
    try {
      // 移除不需要的字段
      const { id, createdAt, updatedAt, ...configToValidate } = config
      const result = await policyService.validatePolicy(configToValidate)
      
      if (!result.valid) {
        showError('配置验证失败', '请检查配置参数是否符合要求')
        return false
      }
      
      return true
    } catch (error: any) {
      showError('配置验证失败', error.message || '请稍后重试')
      return false
    } finally {
      setIsValidating(false)
    }
  }
  
  // 加载默认配置
  const loadDefaultConfig = async (): Promise<SecurityPolicy | undefined> => {
    try {
      const result = await defaultPolicyQuery.refetch()
      if (result.data) {
        showInfo('默认配置已加载', '已加载默认策略配置，请检查后保存')
        return result.data
      }
    } catch (error: any) {
      showError('加载默认配置失败', error.message || '请稍后重试')
    }
    return undefined
  }
  
  // 导出配置
  const exportConfig = async () => {
    setIsExporting(true)
    try {
      const blob = await policyService.exportPolicy()
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `policy-config-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      showSuccess('导出成功', '策略配置已成功导出')
    } catch (error: any) {
      showError('导出失败', error.message || '请稍后重试')
    } finally {
      setIsExporting(false)
    }
  }
  
  // 刷新数据
  const refreshData = () => {
    policyQuery.refetch()
  }
  
  return {
    // 数据
    policy: policyQuery.data,
    defaultPolicy: defaultPolicyQuery.data,
    
    // 状态
    isLoading: policyQuery.isLoading,
    error: policyQuery.error,
    isValidating,
    isExporting,
    isUpdating: updateMutation.isPending,
    
    // 操作
    updatePolicy: updateMutation.mutate,
    validateConfig,
    exportConfig,
    loadDefaultConfig,
    refreshData,
    invalidateQueries
  }
}

export default usePolicy
