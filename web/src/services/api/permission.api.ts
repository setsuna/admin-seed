/**
 * 权限管理API服务
 */

import { httpClient } from '@/services/core/http.client'
import { API_PATHS } from '@/config'
import type {
  Permission,
  Role,
  RoleStatus,
  User,
  MenuConfig,
  PermissionGroup,
  RolePermissionMatrix,
  OperationResult
} from '@/types'

// 角色相关请求类型
export interface CreateRoleRequest {
  name: string
  code: string
  permissions?: string[]
  description?: string
  status?: RoleStatus
  type?: string
  level?: number
  isBuiltIn?: boolean
}

export interface UpdateRoleRequest {
  name?: string
  code?: string
  description?: string
  permissions?: string[]
  status?: RoleStatus
  type?: string
  level?: number
  metadata?: Record<string, string>
}

export class PermissionApiService {
  private basePath = API_PATHS.PERMISSIONS
  private rolePath = API_PATHS.ROLES
  private matrixPath = API_PATHS.ROLE_PERMISSION_MATRIX

  /**
   * 获取权限分组
   */
  async getPermissionGroups(): Promise<PermissionGroup[]> {
    const response = await httpClient.get<any>(`${this.basePath}/groups`)

    // 兼容分页响应格式: { items: [...] }
    if (response && response.items) {
      return response.items
    }

    // 直接返回数组
    return Array.isArray(response) ? response : []
  }

  /**
   * 获取角色权限矩阵
   */
  async getPermissionMatrix(): Promise<RolePermissionMatrix[]> {
    const response = await httpClient.get<any>(this.matrixPath)

    // 兼容分页响应格式
    if (response && response.items) {
      return response.items
    }

    return Array.isArray(response) ? response : []
  }

  /**
   * 获取所有角色
   */
  async getAllRoles(): Promise<Role[]> {
    const response = await httpClient.get<{ items: Role[], pagination: any }>(this.rolePath)
    return response.items || []
  }

  /**
   * 获取单个角色详情
   */
  async getRole(id: string): Promise<Role> {
    return await httpClient.get<Role>(`${this.rolePath}/${id}`)
  }

  /**
   * 创建角色
   */
  async createRole(data: CreateRoleRequest): Promise<Role> {
    return await httpClient.post<Role>(this.rolePath, data)
  }

  /**
   * 更新角色（支持 partial update，只传需要修改的字段）
   */
  async updateRole(id: string, data: UpdateRoleRequest): Promise<Role> {
    return await httpClient.put<Role>(`${this.rolePath}/${id}`, data)
  }

  /**
   * 更新角色权限（只传 permissions 字段）
   * 注意：传 [] 会清空权限，不传字段则不改动
   */
  async updateRolePermissions(id: string, permissions: string[]): Promise<Role> {
    return await httpClient.put<Role>(`${this.rolePath}/${id}`, { permissions })
  }

  /**
   * 删除角色
   */
  async deleteRole(id: string): Promise<OperationResult> {
    return await httpClient.delete<OperationResult>(`${this.rolePath}/${id}`)
  }

  /**
   * 获取用户菜单配置
   */
  async getUserMenuConfig(user: User): Promise<MenuConfig> {
    return await httpClient.get<MenuConfig>('/menus/user-config', {
      userId: user.id
    })
  }

  /**
   * 获取所有权限（扁平列表）
   */
  async getAllPermissions(): Promise<Permission[]> {
    const response = await httpClient.get<{ items: Permission[], pagination?: any } | Permission[]>(this.basePath)
    return Array.isArray(response) ? response : (response.items || [])
  }
}

export const permissionApiService = new PermissionApiService()
