import type { StateCreator } from 'zustand'
import type { AuthSlice, GlobalStore } from '../types'
import { getCurrentDeviceFingerprint } from '@/utils/auth'

export const createAuthSlice: StateCreator<
  GlobalStore,
  [],
  [],
  AuthSlice
> = (set, get) => ({
  // 用户信息
  user: null,
  setUser: (user) => set({ user }),
  
  // 权限管理
  permissions: [],
  menuConfig: null,
  setPermissions: (permissions) => set({ permissions }),
  setMenuConfig: (config) => set({ menuConfig: config }),
  
  hasPermission: (permission) => {
    const { permissions } = get()
    return permissions.includes(permission)
  },
  
  hasAnyPermission: (requiredPermissions) => {
    const { permissions } = get()
    return requiredPermissions.some(permission => permissions.includes(permission))
  },
  
  clearAuth: () => set({ 
    user: null,
    permissions: [],
    menuConfig: null,
    authError: { visible: false, data: null }
  }),
  
  // 授权错误处理
  authError: {
    visible: false,
    data: null,
  },
  
  showAuthError: (data) => set({ 
    authError: { visible: true, data } 
  }),
  
  hideAuthError: () => set({ 
    authError: { visible: false, data: null } 
  }),
  
  showAuthManagement: () => {
    const currentFingerprint = getCurrentDeviceFingerprint()
    set({ 
      authError: { 
        visible: true, 
        data: {
          message: '授权信息管理',
          deviceFingerprint: currentFingerprint,
          mode: 'info',
          allowClose: true,
          showCurrentStatus: true
        }
      } 
    })
  },
})
