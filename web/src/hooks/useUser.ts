import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService, departmentService } from '@/services'
import { userApiService } from '@/services/api/user.api'
import { useNotifications } from '@/hooks/useNotifications'
import type { UserFilters, CreateUserRequest, UpdateUserRequest } from '@/types'

export interface UseUserOptions {
  initialFilters?: UserFilters
  initialPagination?: { page: number; pageSize: number }
  enableAutoRefresh?: boolean
  autoRefreshInterval?: number
}

/**
 * 用户管理Hook
 * 处理用户的增删改查和相关业务逻辑
 */
export const useUser = (options: UseUserOptions = {}) => {
  const { 
    initialFilters = {},
    initialPagination = { page: 1, pageSize: 20 },
    enableAutoRefresh = false,
    autoRefreshInterval = 30000
  } = options
  
  const { showSuccess, showError } = useNotifications()
  const queryClient = useQueryClient()
  
  // 本地状态管理
  const [filters, setFilters] = useState<UserFilters>(initialFilters)
  const [pagination, setPagination] = useState(initialPagination)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // 服务端状态查询
  const userQuery = useQuery({
    queryKey: ['users', filters, pagination],
    queryFn: () => userService.getUsers({ ...filters, ...pagination }),
    refetchInterval: enableAutoRefresh ? autoRefreshInterval : false,
    retry: 1
  })
  
  const departmentOptionsQuery = useQuery({
    queryKey: ['departmentOptions'],
    queryFn: () => departmentService.getDepartmentOptions(),
    staleTime: 10 * 60 * 1000,
    retry: 1
  })
  
  const userStatsQuery = useQuery({
    queryKey: ['userStats'],
    queryFn: () => userApiService.getUserStats(),
    staleTime: 1 * 60 * 1000,
    retry: 1
  })
  
  // 监听查询错误，使用通知系统提示
  useEffect(() => {
    if (userQuery.isError && userQuery.error) {
      showError('加载用户列表失败', (userQuery.error as any)?.message || '请稍后重试')
    }
  }, [userQuery.isError, userQuery.error, showError])
  
  useEffect(() => {
    if (departmentOptionsQuery.isError && departmentOptionsQuery.error) {
      showError('加载部门列表失败', (departmentOptionsQuery.error as any)?.message || '请稍后重试')
    }
  }, [departmentOptionsQuery.isError, departmentOptionsQuery.error, showError])
  
  // 统计信息失败不显著提示，因为不影响主要功能
  useEffect(() => {
    if (userStatsQuery.isError && userStatsQuery.error) {
      console.error('Failed to load user stats:', userStatsQuery.error)
    }
  }, [userStatsQuery.isError, userStatsQuery.error])
  
  // 缓存失效函数
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
  }
  
  // 创建用户
  const createMutation = useMutation({
    mutationFn: (data: CreateUserRequest) => userService.createUser(data),
    onSuccess: () => {
      showSuccess('创建成功', '用户已成功创建')
      invalidateQueries()
    },
    onError: (error: any) => {
      showError('创建失败', error.message || '请稍后重试')
    }
  })
  
  // 更新用户
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) => 
      userService.updateUser(id, data),
    onSuccess: () => {
      showSuccess('更新成功', '用户信息已成功更新')
      invalidateQueries()
    },
    onError: (error: any) => {
      showError('更新失败', error.message || '请稍后重试')
    }
  })
  
  // 删除用户
  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: () => {
      showSuccess('删除成功', '用户已成功删除')
      invalidateQueries()
    },
    onError: (error: any) => {
      showError('删除失败', error.message || '请稍后重试')
    }
  })
  
  // 批量删除
  const batchDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => userService.deleteUsers(ids),
    onSuccess: (_, ids) => {
      showSuccess('批量删除成功', `已删除 ${ids.length} 个用户`)
      setSelectedIds([])
      invalidateQueries()
    },
    onError: (error: any) => {
      showError('批量删除失败', error.message || '请稍后重试')
    }
  })
  
  // 重置密码
  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => userService.resetUserPassword(id),
    onSuccess: () => {
      showSuccess('重置成功', '用户密码已重置为默认密码')
    },
    onError: (error: any) => {
      showError('重置失败', error.message || '请稍后重试')
    }
  })
  
  // 更新用户状态
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' | 'suspended' }) => 
      userApiService.updateUserStatus(id, status),
    onSuccess: (_, { status }) => {
      const statusMap = { active: '启用', inactive: '禁用', suspended: '停用' }
      showSuccess('状态更新成功', `用户已${statusMap[status]}`)
      invalidateQueries()
      queryClient.invalidateQueries({ queryKey: ['userStats'] })
    },
    onError: (error: any) => {
      showError('状态更新失败', error.message || '请稍后重试')
    }
  })
  
  // 更新用户密级
  const updateSecurityLevelMutation = useMutation({
    mutationFn: ({ id, securityLevel }: { id: string; securityLevel: string }) => 
      userApiService.updateUserSecurityLevel(id, securityLevel),
    onSuccess: () => {
      showSuccess('密级更新成功', '用户密级已更新')
      invalidateQueries()
      queryClient.invalidateQueries({ queryKey: ['userStats'] })
    },
    onError: (error: any) => {
      showError('密级更新失败', error.message || '请稍后重试')
    }
  })
  
  // 批量更新密级
  const batchUpdateSecurityLevelMutation = useMutation({
    mutationFn: ({ ids, securityLevel }: { ids: string[]; securityLevel: string }) => 
      userApiService.batchUpdateSecurityLevel(ids, securityLevel),
    onSuccess: (_, { ids }) => {
      showSuccess('批量更新成功', `已更新 ${ids.length} 个用户的密级`)
      setSelectedIds([])
      invalidateQueries()
      queryClient.invalidateQueries({ queryKey: ['userStats'] })
    },
    onError: (error: any) => {
      showError('批量更新失败', error.message || '请稍后重试')
    }
  })
  
  // 批量导入
  const batchImportMutation = useMutation({
    mutationFn: (data: {
      department?: string
      default_password?: string
      users: Array<{ username: string; name: string; phone?: string; role: string; status?: string; security_level?: string; permissions?: string[] }>
    }) => userApiService.batchImportUsers(data),
    onSuccess: (result) => {
      showSuccess('导入完成', `成功 ${result.success_count} 个，失败 ${result.fail_count} 个`)
      invalidateQueries()
      queryClient.invalidateQueries({ queryKey: ['userStats'] })
    },
    onError: (error: any) => {
      showError('导入失败', error.message || '请稍后重试')
    }
  })

  // 批量调整部门
  const batchUpdateDepartmentMutation = useMutation({
    mutationFn: ({ ids, department }: { ids: string[]; department: string }) =>
      userApiService.batchUpdateDepartment(ids, department),
    onSuccess: (_, { ids }) => {
      showSuccess('批量调整成功', `已更新 ${ids.length} 个用户的部门`)
      setSelectedIds([])
      invalidateQueries()
    },
    onError: (error: any) => {
      showError('批量调整失败', error.message || '请稍后重试')
    }
  })

  // 工具函数
  const resetFilters = () => {
    setFilters(initialFilters)
    setPagination(initialPagination)
  }
  
  const refreshData = () => {
    userQuery.refetch()
  }
  
  const toggleSelectAll = () => {
    const allIds = userQuery.data?.items.map((user: any) => user.id) || []
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
    const allIds = userQuery.data?.items.map((user: any) => user.id) || []
    return allIds.length > 0 && selectedIds.length === allIds.length
  }
  
  const isIndeterminate = () => {
    const allIds = userQuery.data?.items.map((user: any) => user.id) || []
    return selectedIds.length > 0 && selectedIds.length < allIds.length
  }
  
  // 根据角色获取权限的工具函数
  const getPermissionsByRole = (role: string): string[] => {
    const rolePermissionsMap: Record<string, string[]> = {
      admin: ['*'],
      meeting_admin: ['meeting:*', 'dashboard:view'],
      auditor: ['audit:view', 'report:view', 'dashboard:view'],
      security_admin: ['security:user:manage', 'dashboard:view'],
      user: ['meeting:view', 'dashboard:view']
    }
    return rolePermissionsMap[role] || ['dashboard:view']
  }

  return {
    // 数据
    users: userQuery.data?.items || [],
    departmentOptions: departmentOptionsQuery.data || [],
    userStats: userStatsQuery.data,
    
    pagination: userQuery.data?.pagination,
    filters,
    selectedIds,
    
    // 状态
    isLoading: userQuery.isLoading,
    error: userQuery.error,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBatchDeleting: batchDeleteMutation.isPending,
    isResettingPassword: resetPasswordMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isUpdatingSecurityLevel: updateSecurityLevelMutation.isPending,
    isBatchUpdatingSecurityLevel: batchUpdateSecurityLevelMutation.isPending,
    isBatchImporting: batchImportMutation.isPending,
    isBatchUpdatingDepartment: batchUpdateDepartmentMutation.isPending,
    
    // 选择状态
    isAllSelected: isAllSelected(),
    isIndeterminate: isIndeterminate(),
    
    // 操作
    createUser: createMutation.mutate,
    createUserAsync: createMutation.mutateAsync,
    updateUser: (data: UpdateUserRequest) => updateMutation.mutate({ id: data.id, data }),
    updateUserAsync: (data: UpdateUserRequest) => updateMutation.mutateAsync({ id: data.id, data }),
    deleteUser: deleteMutation.mutate,
    batchDeleteUsers: batchDeleteMutation.mutate,
    resetPassword: resetPasswordMutation.mutate,
    updateUserStatus: (id: string, status: 'active' | 'inactive' | 'suspended') => 
      updateStatusMutation.mutate({ id, status }),
    updateUserSecurityLevel: (id: string, securityLevel: string) => 
      updateSecurityLevelMutation.mutate({ id, securityLevel }),
    batchUpdateSecurityLevel: (ids: string[], securityLevel: string) => 
      batchUpdateSecurityLevelMutation.mutate({ ids, securityLevel }),
    batchImportUsers: batchImportMutation.mutateAsync,
    batchUpdateDepartment: (ids: string[], department: string) =>
      batchUpdateDepartmentMutation.mutate({ ids, department }),
    
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
    invalidateQueries,
    getPermissionsByRole
  }
}
