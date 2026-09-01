import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/store'
import { permissionApi } from '@/services/permission'

// 模块级别的重定向锁，防止多个组件实例重复触发
let isRedirecting = false

/**
 * 权限初始化组件
 * 负责在用户登录后初始化权限和菜单配置
 * 不渲染任何UI，只处理权限初始化逻辑
 */
export function PermissionInitializer() {
  const user = useStore((state) => state.user)
  const setPermissions = useStore((state) => state.setPermissions)
  const setMenuConfig = useStore((state) => state.setMenuConfig)
  const clearAuth = useStore((state) => state.clearAuth)
  const hasRedirected = useRef(false)

  // 获取用户菜单配置
  const { data: userMenuConfig, isSuccess, isError } = useQuery({
    queryKey: ['userMenuConfig', user?.id],
    queryFn: () => {
      // 如果已经在重定向，不再发请求
      if (isRedirecting) return Promise.resolve(null)
      return user ? permissionApi.getUserMenuConfig(user) : Promise.resolve(null)
    },
    enabled: !!user && !isRedirecting,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  // 菜单配置请求失败时，清除认证跳转登录
  useEffect(() => {
    if (isError && !hasRedirected.current && !isRedirecting) {
      hasRedirected.current = true
      isRedirecting = true
      clearAuth()
      window.location.href = '/login'
    }
  }, [isError, clearAuth])

  // 更新权限状态
  useEffect(() => {
    if (userMenuConfig && isSuccess) {
      const userPerms = userMenuConfig.userPermissions || []
      
      const currentPerms = useStore.getState().permissions
      const currentMenuConfig = useStore.getState().menuConfig
      
      const permsChanged = JSON.stringify(currentPerms) !== JSON.stringify(userPerms)
      const configChanged = JSON.stringify(currentMenuConfig) !== JSON.stringify(userMenuConfig)
      
      if (permsChanged) {
        setPermissions(userPerms)
      }
      
      if (configChanged) {
        setMenuConfig(userMenuConfig)
      }
    }
  }, [userMenuConfig, isSuccess, setPermissions, setMenuConfig])

  return null
}
