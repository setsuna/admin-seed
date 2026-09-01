/**
 * 角色相关钩子
 * 提供角色选项和角色显示名称功能
 */

import { useQuery } from '@tanstack/react-query'
import { permissionApi } from '@/services/permission'

// 角色选项钩子
export function useRoleOptions() {
  const { data: roles = [], isLoading, error } = useQuery({
    queryKey: ['roles'],
    queryFn: () => permissionApi.getAllRoles(),
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  })

  // 转换为选项格式
  const roleOptions = roles.map((role: any) => ({
    label: role.name || role.code,
    value: role.code
  }))

  return {
    roleOptions,
    isLoading,
    error
  }
}

// 角色显示名称钩子
export function useRoleDisplayName(roleCode?: string) {
  const { roleOptions } = useRoleOptions()
  
  const getRoleDisplayName = (code: string) => {
    const role = roleOptions.find((opt: { value: string; label: string }) => opt.value === code)
    return role?.label || code
  }

  if (!roleCode) {
    return { roleDisplayName: '', getRoleDisplayName }
  }

  return {
    roleDisplayName: getRoleDisplayName(roleCode),
    getRoleDisplayName
  }
}

// 批量获取角色显示名称
export function useBatchRoleDisplayNames(roleCodes: string[]) {
  const { roleOptions } = useRoleOptions()
  
  const getRoleDisplayName = (code: string) => {
    const role = roleOptions.find((opt: { value: string; label: string }) => opt.value === code)
    return role?.label || code
  }

  const roleDisplayNames = roleCodes.reduce((acc, code) => {
    acc[code] = getRoleDisplayName(code)
    return acc
  }, {} as Record<string, string>)

  return {
    roleDisplayNames,
    getRoleDisplayName
  }
}

// 默认导出
export const useRole = useRoleOptions
