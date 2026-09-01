import type { StateCreator } from 'zustand'
import type { AppSlice, GlobalStore } from '../types'

export const createAppSlice: StateCreator<
  GlobalStore,
  [],
  [],
  AppSlice
> = (set) => ({
  // 设备状态管理
  devices: {},
  deviceStats: null,
  
  updateDeviceStatus: (deviceId, status) => set((state) => ({
    devices: {
      ...state.devices,
      [deviceId]: { ...state.devices[deviceId], ...status }
    }
  })),
  
  updateDeviceStats: (stats) => set({ deviceStats: stats }),
  
  // 应用配置
  appConfig: {
    version: '1.0.0',
    environment: 'development',
    features: {
      darkMode: true,
      notifications: true,
      deviceMonitoring: true,
      realTimeUpdates: true,
    }
  },
  
  updateAppConfig: (config) => set((state) => ({
    appConfig: { ...state.appConfig, ...config }
  })),
})
