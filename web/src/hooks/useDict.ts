import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dictApi } from '@/services/dict'
import { useNotifications } from '@/hooks/useNotifications'
import type { DictFilters, CreateDictRequest, UpdateDictRequest } from '@/types'

export interface UseDictOptions {
  initialFilters?: DictFilters
  initialPagination?: { page: number; pageSize: number }
  enableAutoRefresh?: boolean
  autoRefreshInterval?: number
}

/**
 * 数据字典管理Hook
 * 处理字典的增删改查和相关业务逻辑
 */
export const useDict = (options: UseDictOptions = {}) => {
  const { 
    initialFilters = {},
    initialPagination = { page: 1, pageSize: 10 },
    enableAutoRefresh = false,
    autoRefreshInterval = 30000
  } = options
  
  const { showSuccess, showError } = useNotifications()
  const queryClient = useQueryClient()
  
  // 本地状态管理
  const [filters, setFilters] = useState<DictFilters>(initialFilters)
  const [pagination, setPagination] = useState(initialPagination)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // 服务端状态查询 - 字典列表
  const dictQuery = useQuery({
    queryKey: ['dictionaries', filters, pagination],
    queryFn: () => dictApi.getDictionaries(filters, pagination.page, pagination.pageSize),
    refetchInterval: enableAutoRefresh ? autoRefreshInterval : false
  })
  
  // 服务端状态查询 - 字典类型选项
  const dictTypesQuery = useQuery({
    queryKey: ['dictTypes'],
    queryFn: () => dictApi.getDictTypes(),
    staleTime: 10 * 60 * 1000,
  })
  
  // 缓存失效函数
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['dictionaries'] })
  }
  
  // 创建字典
  const createMutation = useMutation({
    mutationFn: (data: CreateDictRequest) => dictApi.createDictionary(data),
    onSuccess: () => {
      showSuccess('创建成功', '数据字典已成功创建')
      invalidateQueries()
    },
    onError: (error: any) => {
      showError('创建失败', error.message || '请稍后重试')
    }
  })
  
  // 更新字典
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDictRequest }) => 
      dictApi.updateDictionary(id, data),
    onSuccess: () => {
      showSuccess('更新成功', '数据字典已成功更新')
      invalidateQueries()
    },
    onError: (error: any) => {
      showError('更新失败', error.message || '请稍后重试')
    }
  })
  
  // 删除字典
  const deleteMutation = useMutation({
    mutationFn: (id: string) => dictApi.deleteDictionary(id),
    onSuccess: () => {
      showSuccess('删除成功', '数据字典已成功删除')
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== deleteMutation.variables))
      invalidateQueries()
    },
    onError: (error: any) => {
      showError('删除失败', error.message || '请稍后重试')
    }
  })
  
  // 批量删除
  const batchDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => dictApi.deleteDictionaries(ids),
    onSuccess: (_, ids) => {
      showSuccess('批量删除成功', `已删除 ${ids.length} 个数据字典`)
      setSelectedIds([])
      invalidateQueries()
    },
    onError: (error: any) => {
      showError('批量删除失败', error.message || '请稍后重试')
    }
  })
  
  // 同步到设备
  const syncToDevicesMutation = useMutation({
    mutationFn: (ids: string[]) => dictApi.syncToDevices(ids),
    onSuccess: (_, ids) => {
      showSuccess('同步成功', `已同步 ${ids.length} 个数据字典到设备`)
    },
    onError: (error: any) => {
      showError('同步失败', error.message || '请稍后重试')
    }
  })
  
  // 导出字典
  const exportMutation = useMutation({
    mutationFn: (ids?: string[]) => dictApi.exportDictionaries(ids),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `data-dictionaries-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showSuccess('导出成功', '数据字典已导出')
    },
    onError: (error: any) => {
      showError('导出失败', error.message || '请稍后重试')
    }
  })
  
  // 工具函数
  const resetFilters = () => {
    setFilters(initialFilters)
    setPagination(initialPagination)
  }
  
  const refreshData = () => {
    dictQuery.refetch()
  }
  
  const toggleSelectAll = () => {
    const allIds = dictQuery.data?.items.map((dict: any) => dict.id) || []
    setSelectedIds(selectedIds.length === allIds.length ? [] : allIds)
  }
  
  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    )
  }
  
  const isAllSelected = () => {
    const allIds = dictQuery.data?.items.map((dict: any) => dict.id) || []
    return allIds.length > 0 && selectedIds.length === allIds.length
  }
  
  const isIndeterminate = () => {
    const allIds = dictQuery.data?.items.map((dict: any) => dict.id) || []
    return selectedIds.length > 0 && selectedIds.length < allIds.length
  }
  
  return {
    // 数据
    dictionaries: dictQuery.data?.items || [],
    dictTypes: dictTypesQuery.data || [],
    pagination: dictQuery.data?.pagination,
    filters,
    selectedIds,
    
    // 状态
    isLoading: dictQuery.isLoading,
    error: dictQuery.error,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBatchDeleting: batchDeleteMutation.isPending,
    isSyncing: syncToDevicesMutation.isPending,
    isExporting: exportMutation.isPending,
    
    // 选择状态
    isAllSelected: isAllSelected(),
    isIndeterminate: isIndeterminate(),
    
    // 操作（返回 Promise）
    createDict: createMutation.mutateAsync,
    updateDict: (id: string, data: Omit<UpdateDictRequest, 'id'>) => 
      updateMutation.mutateAsync({ id, data: { ...data, id } }),
    deleteDict: deleteMutation.mutateAsync,
    batchDeleteDicts: batchDeleteMutation.mutateAsync,
    syncToDevices: syncToDevicesMutation.mutateAsync,
    exportDicts: exportMutation.mutateAsync,
    
    // 过滤和分页
    setFilters,
    setPagination,
    resetFilters,
    
    // 选择
    setSelectedIds,
    toggleSelectAll,
    toggleSelectId,
    
    // 工具
    refreshData,
    invalidateQueries
  }
}
