import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { departmentService } from '@/services'
import { useUI } from '@/store'
import type { Department, DepartmentFilters, CreateDepartmentRequest, UpdateDepartmentRequest } from '@/types'

export interface UseDepartmentOptions {
  initialFilters?: DepartmentFilters
  initialPagination?: { page: number; pageSize: number }
  enableAutoRefresh?: boolean
  autoRefreshInterval?: number
}

export const useDepartment = (options: UseDepartmentOptions = {}) => {
  const { 
    initialFilters = {},
    initialPagination = { page: 1, pageSize: 20 },
    enableAutoRefresh = false,
    autoRefreshInterval = 30000
  } = options
  
  const { addNotification } = useUI()
  const queryClient = useQueryClient()
  
  // 状态管理
  const [filters, setFilters] = useState<DepartmentFilters>(initialFilters)
  const [pagination, setPagination] = useState(initialPagination)
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // 查询部门列表（表格模式）
  const departmentQuery = useQuery({
    queryKey: ['departments', filters, pagination],
    queryFn: () => departmentService.getDepartments({ ...filters, ...pagination }),
    refetchInterval: enableAutoRefresh ? autoRefreshInterval : false
  })
  
  // 查询部门树（树形模式）
  const departmentTreeQuery = useQuery({
    queryKey: ['departmentTree'],
    queryFn: () => departmentService.getDepartmentTree(),
    refetchInterval: enableAutoRefresh ? autoRefreshInterval : false
  })
  
  // 查询部门选项
  const departmentOptionsQuery = useQuery({
    queryKey: ['departmentOptions'],
    queryFn: () => departmentService.getDepartmentOptions()
  })
  
  // 查询部门统计
  const departmentStatsQuery = useQuery({
    queryKey: ['departmentStats'],
    queryFn: () => departmentService.getDepartmentStats()
  })
  
  // 刷新相关查询
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['departments'] })
    queryClient.invalidateQueries({ queryKey: ['departmentTree'] })
    queryClient.invalidateQueries({ queryKey: ['departmentOptions'] })
    queryClient.invalidateQueries({ queryKey: ['departmentStats'] })
  }
  
  // 创建部门
  const createMutation = useMutation({
    mutationFn: (data: CreateDepartmentRequest) => departmentService.createDepartment(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '部门已成功创建' })
      invalidateQueries()
    },
    onError: (error: any) => {
      addNotification({ 
        type: 'error', 
        title: '创建失败', 
        message: error.response?.data?.message || '请稍后重试' 
      })
    }
  })
  
  // 更新部门
  const updateMutation = useMutation({
    mutationFn: (data: UpdateDepartmentRequest) => departmentService.updateDepartment(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '更新成功', message: '部门信息已成功更新' })
      invalidateQueries()
    },
    onError: (error: any) => {
      addNotification({ 
        type: 'error', 
        title: '更新失败', 
        message: error.response?.data?.message || '请稍后重试' 
      })
    }
  })
  
  // 删除部门
  const deleteMutation = useMutation({
    mutationFn: (id: string) => departmentService.deleteDepartment(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '部门已成功删除' })
      invalidateQueries()
    },
    onError: (error: any) => {
      addNotification({ 
        type: 'error', 
        title: '删除失败', 
        message: error.response?.data?.message || '请稍后重试' 
      })
    }
  })
  
  // 批量删除
  const batchDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => departmentService.batchDeleteDepartments(ids),
    onSuccess: (_, ids) => {
      addNotification({ type: 'success', title: '批量删除成功', message: `已删除 ${ids.length} 个部门` })
      setSelectedIds([])
      invalidateQueries()
    },
    onError: (error: any) => {
      addNotification({ 
        type: 'error', 
        title: '批量删除失败', 
        message: error.response?.data?.message || '请稍后重试' 
      })
    }
  })
  
  // 移动部门
  const moveMutation = useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId?: string }) => 
      departmentService.moveDepartment(id, parentId),
    onSuccess: () => {
      addNotification({ type: 'success', title: '移动成功', message: '部门已成功移动' })
      invalidateQueries()
    },
    onError: (error: any) => {
      addNotification({ 
        type: 'error', 
        title: '移动失败', 
        message: error.response?.data?.message || '请稍后重试' 
      })
    }
  })
  
  // 工具函数
  const resetFilters = () => {
    setFilters(initialFilters)
    setPagination(initialPagination)
  }
  
  const refreshData = () => {
    departmentQuery.refetch()
    if (viewMode === 'tree') {
      departmentTreeQuery.refetch()
    }
  }
  
  const toggleSelectAll = () => {
    const allIds = departmentQuery.data?.items.map((dept: Department) => dept.id) || []
    setSelectedIds(selectedIds.length === allIds.length ? [] : allIds)
  }
  
  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    )
  }
  
  // 计算总数（树形模式）
  const countTotalDepartments = (departments: Department[]): number => {
    let count = 0
    const traverse = (depts: Department[]) => {
      depts.forEach(dept => {
        count++
        if (dept.children) {
          traverse(dept.children)
        }
      })
    }
    traverse(departments)
    return count
  }
  
  return {
    // 数据
    departments: departmentQuery.data?.items || [],
    departmentTree: departmentTreeQuery.data || [],
    departmentOptions: departmentOptionsQuery.data || [],
    departmentStats: departmentStatsQuery.data,
    pagination: departmentQuery.data?.pagination,
    
    // 状态
    filters,
    viewMode,
    selectedIds,
    isLoading: departmentQuery.isLoading || departmentTreeQuery.isLoading,
    error: departmentQuery.error || departmentTreeQuery.error,
    
    // 状态更新
    setFilters,
    setPagination,
    setViewMode,
    setSelectedIds,
    
    // 操作
    createDepartment: createMutation.mutate,
    createDepartmentAsync: createMutation.mutateAsync,
    updateDepartment: updateMutation.mutate,
    updateDepartmentAsync: updateMutation.mutateAsync,
    deleteDepartment: deleteMutation.mutate,
    batchDeleteDepartments: batchDeleteMutation.mutate,
    moveDepartment: moveMutation.mutate,
    
    // 状态
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBatchDeleting: batchDeleteMutation.isPending,
    isMoving: moveMutation.isPending,
    
    // 工具函数
    resetFilters,
    refreshData,
    invalidateQueries,
    toggleSelectAll,
    toggleSelectId,
    countTotalDepartments
  }
}

export default useDepartment
