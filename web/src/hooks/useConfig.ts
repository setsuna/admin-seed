import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { configService } from '@/services/config'
import { useGlobalStore } from '@/store'
import type { ConfigItem, PaginationParams } from '@/types'

// 配置列表hook
export function useConfigs(params?: PaginationParams & { search?: string; type?: string }) {
  return useQuery({
    queryKey: ['configs', params],
    queryFn: () => configService.getConfigs(params),
  })
}

// 配置详情hook
export function useConfig(id: string) {
  return useQuery({
    queryKey: ['config', id],
    queryFn: () => configService.getConfig(id),
    enabled: !!id,
  })
}

// 配置操作hooks
export function useConfigOperations() {
  const queryClient = useQueryClient()
  const { addNotification } = useGlobalStore()
  
  const createConfig = useMutation({
    mutationFn: configService.createConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs'] })
      addNotification({
        type: 'success',
        title: '创建成功',
        message: '配置已成功创建',
      })
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: '创建失败',
        message: error.message,
      })
    },
  })
  
  const updateConfig = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ConfigItem> }) =>
      configService.updateConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs'] })
      queryClient.invalidateQueries({ queryKey: ['config'] })
      addNotification({
        type: 'success',
        title: '更新成功',
        message: '配置已更新',
      })
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: '更新失败',
        message: error.message,
      })
    },
  })
  
  const deleteConfig = useMutation({
    mutationFn: configService.deleteConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs'] })
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '配置已删除',
      })
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: '删除失败',
        message: error.message,
      })
    },
  })
  
  return {
    createConfig,
    updateConfig,
    deleteConfig,
  }
}