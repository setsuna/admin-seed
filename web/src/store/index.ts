import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createAuthSlice } from './slices/auth.slice'
import { createUISlice } from './slices/ui.slice'
import { createAppSlice } from './slices/app.slice'
import type { GlobalStore, PersistedState } from './types'
import type { ThemeMode, BrandTheme } from '@/types'

/** 合法的明暗模式值 */
const VALID_MODES: ReadonlyArray<ThemeMode> = ['light', 'dark', 'system']

/** 合法的品牌色值 */
const VALID_BRANDS: ReadonlyArray<BrandTheme> = [
  'pomegranate', 'china-red', 'wine', 'cinnabar', 'tech-blue',
  'indigo', 'geek-purple', 'tech-teal', 'vivid-orange', 'ink-black',
]

/**
 * 旧数据迁移：旧版本把 'gov-red' 当作一种主题存在 theme 里。
 * 新模型下它是品牌色（中国红），而非明暗模式。
 */
function migrateTheme(raw: unknown): { theme: ThemeMode; brand?: BrandTheme } {
  if (raw === 'gov-red') {
    return { theme: 'light', brand: 'china-red' }
  }
  if (typeof raw === 'string' && VALID_MODES.includes(raw as ThemeMode)) {
    return { theme: raw as ThemeMode }
  }
  return { theme: 'light' }
}

function sanitizeBrand(raw: unknown, fallback: BrandTheme): BrandTheme {
  return typeof raw === 'string' && VALID_BRANDS.includes(raw as BrandTheme)
    ? (raw as BrandTheme)
    : fallback
}

// 创建全局store
export const useStore = create<GlobalStore>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createUISlice(...a),
      ...createAppSlice(...a),
    }),
    {
      name: 'admin-global-store',
      partialize: (state): PersistedState => ({
        auth: {
          user: state.user,
        },
        ui: {
          theme: state.theme,
          brand: state.brand,
        },
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as PersistedState
        const migrated = migrateTheme(persisted.ui?.theme)

        return {
          ...currentState,
          // 恢复认证状态
          user: persisted.auth?.user || currentState.user,
          // 恢复UI状态（含旧版 gov-red 迁移）
          theme: migrated.theme,
          brand: sanitizeBrand(
            persisted.ui?.brand ?? migrated.brand,
            currentState.brand
          ),
        }
      },
    }
  )
)

// 状态选择器hooks - 优化性能，避免不必要的重渲染
export const useAuth = () => useStore((state) => ({
  user: state.user,
  permissions: state.permissions,
  menuConfig: state.menuConfig,
  authError: state.authError,
  setUser: state.setUser,
  setPermissions: state.setPermissions,
  setMenuConfig: state.setMenuConfig,
  hasPermission: state.hasPermission,
  hasAnyPermission: state.hasAnyPermission,
  clearAuth: state.clearAuth,
  showAuthError: state.showAuthError,
  hideAuthError: state.hideAuthError,
  showAuthManagement: state.showAuthManagement,
}))

export const useUI = () => useStore((state) => ({
  theme: state.theme,
  brand: state.brand,
  notifications: state.notifications,
  globalLoading: state.globalLoading,
  soundEnabled: state.soundEnabled,
  soundVolume: state.soundVolume,
  setTheme: state.setTheme,
  setBrand: state.setBrand,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
  setGlobalLoading: state.setGlobalLoading,
  setSoundEnabled: state.setSoundEnabled,
  setSoundVolume: state.setSoundVolume,
  toggleSound: state.toggleSound,
}))

export const useApp = () => useStore((state) => ({
  devices: state.devices,
  deviceStats: state.deviceStats,
  appConfig: state.appConfig,
  updateDeviceStatus: state.updateDeviceStatus,
  updateDeviceStats: state.updateDeviceStats,
  updateAppConfig: state.updateAppConfig,
}))

// 兼容性导出 - 保持向后兼容
export const useGlobalStore = useStore
export const usePermissionStore = () => {
  const auth = useAuth()
  return {
    permissions: auth.permissions,
    menuConfig: auth.menuConfig,
    setPermissions: auth.setPermissions,
    setMenuConfig: auth.setMenuConfig,
    hasPermission: auth.hasPermission,
    hasAnyPermission: auth.hasAnyPermission,
    clearPermissions: auth.clearAuth,
  }
}
export const useDeviceStore = useApp

// 导出类型
export type * from './types'
