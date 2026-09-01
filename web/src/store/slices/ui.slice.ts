import type { StateCreator } from 'zustand'
import type { UISlice, GlobalStore } from '../types'
import type { Notification } from '@/types'

export const createUISlice: StateCreator<
  GlobalStore,
  [],
  [],
  UISlice
> = (set) => ({
  // 主题：明暗模式（与品牌色正交）。默认浅色。
  theme: 'light',
  setTheme: (theme) => set({ theme }),

  // 主题：品牌色。默认墨黑。
  brand: 'ink-black',
  setBrand: (brand) => set({ brand }),
  
  // 音效系统
  soundEnabled: true,
  soundVolume: 0.8,
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
  setSoundVolume: (volume) => set({ soundVolume: Math.max(0, Math.min(1, volume)) }),
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  
  // Toast通知系统
  notifications: [],
  
  addNotification: (notification) => {
    const notificationId = Math.random().toString(36).substring(2)
    const newNotification: Notification = {
      ...notification,
      id: notificationId,
      timestamp: Date.now(),
    }
    
    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }))
    
    // Toast 自动消失
    if (notification.duration !== 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== notificationId)
        }))
      }, notification.duration || 5000)
    }
  },
  
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),
  
  clearNotifications: () => set({ notifications: [] }),
  
  // 全局加载状态
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
})
