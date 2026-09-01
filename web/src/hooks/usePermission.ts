import { useStore } from '@/store'
import type { MenuItem } from '@/types'

/**
 * 权限管理Hook
 * 统一管理用户权限和菜单配置
 * 注意：数据加载由 PermissionInitializer 统一处理，这里只读取 store 状态
 */
export function usePermission() {
  const permissions = useStore((state) => state.permissions)
  const menuConfig = useStore((state) => state.menuConfig)
  const hasPermission = useStore((state) => state.hasPermission)
  const hasAnyPermission = useStore((state) => state.hasAnyPermission)

  return {
    permissions,
    menuConfig,
    isLoading: false,
    hasPermission,
    hasAnyPermission
  }
}

/**
 * 菜单权限Hook
 * 获取用户可见的菜单项
 */
export function useMenuPermission() {
  const { menuConfig, isLoading } = usePermission()
  
  const getVisibleMenus = (): MenuItem[] => {
    return menuConfig?.menus || []
  }

  return {
    menus: getVisibleMenus(),
    isLoading
  }
}

/**
 * 路由权限Hook
 * 检查用户是否有访问特定路由的权限
 */
export function useRoutePermission(requiredPermissions: string[] = []) {
  const { hasAnyPermission, isLoading } = usePermission()
  
  const hasAccess = requiredPermissions.length === 0 || hasAnyPermission(requiredPermissions)
  
  return {
    hasAccess,
    isLoading
  }
}
