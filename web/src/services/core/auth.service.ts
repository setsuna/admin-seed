/**
 * 认证服务 - 统一架构版本 (适配新的后台数据结构)
 */

import { httpClient } from './http.client'
import { getConfig, API_PATHS } from '@/config'
import type { User } from '@/types'
import type { LoginResponse } from '@/types/api/response.types'
import { useStore } from '@/store'

export interface LoginRequest {
  username: string
  password: string
}

class AuthService {
  private config = getConfig()
  private tokenKey = this.config.auth.tokenKey
  private refreshTokenKey = this.config.auth.refreshTokenKey
  private currentUser: User | null = null

  /**
   * 🔧 修复：用户登录 - 适配新的后台数据结构
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      console.log('[认证服务] 开始登录请求:', { username: credentials.username })
      
      // 🔧 修复：使用httpClient，错误会在拦截器中处理
      const response = await httpClient.post<LoginResponse>(API_PATHS.AUTH_LOGIN, credentials)
      
      console.log('[认证服务] 登录响应:', response)
      
      // 🆕 适配新的数据结构
      const { access_token, refresh_token, expires_in, user } = response
      
      if (!access_token || !user) {
        throw new Error('登录响应数据不完整')
      }
      
      // 映射后端数据结构到前端格式
      const userInfo: User = {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role as any,
        avatar: user.avatar || '',
        department: '',
        position: '',
        status: user.status as any,
        securityLevel: 'internal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        permissions: [] // 权限从 JWT token 中解析
      }
      
      // 🆕 从 JWT token 中解析权限
      try {
        const payload = JSON.parse(atob(access_token.split('.')[1]))
        if (payload.permissions && Array.isArray(payload.permissions)) {
          userInfo.permissions = payload.permissions
        }
      } catch (error) {
        console.warn('[认证服务] 解析 token 权限失败:', error)
      }
      
      const loginResult: LoginResponse = {
        access_token,
        refresh_token,
        token_type: 'Bearer',
        expires_in,
        user
      }
      
      // 保存 token 和用户信息
      this.setToken(access_token)
      this.setRefreshToken(refresh_token)
      this.currentUser = userInfo
      
      localStorage.setItem('user', JSON.stringify(userInfo))
      
      // 🔧 Store 更新由调用者负责（LoginPage 等组件）
      // 这样避免了循环依赖和动态导入警告
      
      console.log('[认证服务] 登录成功')
      return loginResult
      
    } catch (error: any) {
      console.error('[认证服务] 登录失败:', {
        message: error.message,
        isNetworkError: error.isNetworkError,
        code: error.code
      })
      
      // 🔧 修复：直接抛出错误，让上层处理
      // 网络错误已在拦截器中显示通知，不会阻塞UI
      throw error
    }
  }

  /**
   * 🆕 强制修改密码（密码过期时使用）
   */
  async forceChangePassword(params: {
    user_id: string
    old_password: string
    new_password: string
  }): Promise<void> {
    await httpClient.post('/auth/force-change-password', params)
  }

  /**
   * 🆕 修改密码（登录后使用）
   */
  async changePassword(params: {
    old_password: string
    new_password: string
  }): Promise<void> {
    await httpClient.post('/auth/change-password', params)
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    try {
      await httpClient.post(API_PATHS.AUTH_LOGOUT)
    } catch (error) {
      console.warn('Logout API warning:', error)
    } finally {
      this.clearStorage()
      useStore.getState().clearAuth()
    }
  }

  /**
   * 刷新Token
   */
  async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await httpClient.post<{ access_token: string; refresh_token: string }>(API_PATHS.AUTH_REFRESH, { refreshToken })

      if (response.access_token) {
        this.setToken(response.access_token)
        this.setRefreshToken(response.refresh_token)
        return response.access_token
      }

      throw new Error('Failed to refresh token')
    } catch (error) {
      console.error('Refresh token failed:', error)
      this.clearStorage()
      throw error
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      if (this.currentUser) {
        return this.currentUser
      }

      const userStr = localStorage.getItem('user')
      if (userStr) {
        this.currentUser = JSON.parse(userStr)
        return this.currentUser!
      }

      const response = await httpClient.get<User>(API_PATHS.AUTH_PROFILE)
      
      if (response) {
        this.currentUser = response
        localStorage.setItem('user', JSON.stringify(response))
        return response
      }
      
      return null
    } catch (error) {
      console.error('Get current user failed:', error)
      return null
    }
  }

  /**
   * 权限检查
   */
  hasPermission(permission: string): boolean {
    return this.currentUser?.permissions?.includes(permission) || false
  }

  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(permission))
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission))
  }

  hasRole(role: string): boolean {
    return this.currentUser?.role === role
  }

  /**
   * Token管理
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey)
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token)
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey)
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(this.refreshTokenKey, token)
  }

  /**
   * 状态检查
   */
  isAuthenticated(): boolean {
    const token = this.getToken()
    return !!token && !this.isTokenExpired(token)
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated()
  }

  canRefreshToken(): boolean {
    const refreshToken = this.getRefreshToken()
    return !!refreshToken && !this.isTokenExpired(refreshToken)
  }

  shouldRefreshToken(): boolean {
    const token = this.getToken()
    if (!token) return false

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      const timeUntilExpiry = payload.exp - currentTime
      
      return timeUntilExpiry < this.config.auth.autoRefreshThreshold / 1000
    } catch {
      return false
    }
  }

  /**
   * 私有方法
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      return payload.exp < currentTime
    } catch {
      return true
    }
  }

  private clearStorage(): void {
    localStorage.removeItem(this.tokenKey)
    localStorage.removeItem(this.refreshTokenKey)
    localStorage.removeItem('user')
    this.currentUser = null
  }
}

export const authService = new AuthService()

// 兼容性导出
export const auth = {
  async login(credentials: LoginRequest) {
    const result = await authService.login(credentials)
    return {
      user: result.user,
      token: result.access_token,
      refreshToken: result.refresh_token,
      expiresIn: result.expires_in
    }
  },
  
  async logout() {
    return authService.logout()
  },
  
  async getCurrentUser() {
    return authService.getCurrentUser()
  },
  
  async refreshToken() {
    try {
      const newToken = await authService.refreshToken()
      return !!newToken
    } catch {
      return false
    }
  },
  
  isLoggedIn() {
    return authService.isLoggedIn()
  },
  
  getToken() {
    return authService.getToken()
  },
  
  // 🆕 强制修改密码
  async forceChangePassword(params: {
    user_id: string
    old_password: string
    new_password: string
  }) {
    return authService.forceChangePassword(params)
  },
  
  // 🆕 修改密码（登录后使用）
  async changePassword(params: {
    old_password: string
    new_password: string
  }) {
    return authService.changePassword(params)
  }
}
