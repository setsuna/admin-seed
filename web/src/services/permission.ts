/**
 * 权限服务 - 简洁封装层
 * 对 API 服务做薄封装，提供业务语义化接口
 */

import { permissionApiService } from './api/permission.api'
import type {
  MenuConfig,
  Role,
  User,
  MenuItem,
  PermissionGroup,
  RolePermissionMatrix
} from '@/types'
import type { CreateRoleRequest, UpdateRoleRequest } from './api/permission.api'

class PermissionService {
  /**
   * 获取权限分组列表
   */
  async getPermissionGroups(): Promise<PermissionGroup[]> {
    const groups = await permissionApiService.getPermissionGroups()

    // 确保每个分组的 permissions 是数组
    return groups.map(group => ({
      ...group,
      permissions: Array.isArray(group.permissions) ? group.permissions : []
    }))
  }

  /**
   * 获取角色权限矩阵（直接使用后端接口）
   */
  async getRolePermissionMatrix(): Promise<RolePermissionMatrix[]> {
    return permissionApiService.getPermissionMatrix()
  }

  /**
   * 获取所有角色
   */
  async getAllRoles(): Promise<Role[]> {
    return permissionApiService.getAllRoles()
  }

  /**
   * 创建角色
   */
  async createRole(data: CreateRoleRequest): Promise<Role> {
    return permissionApiService.createRole(data)
  }

  /**
   * 更新角色基本信息（名称/描述/状态等，不含权限）
   */
  async updateRole(roleId: string, data: UpdateRoleRequest): Promise<Role> {
    return permissionApiService.updateRole(roleId, data)
  }

  /**
   * 更新角色权限（只传 permissions 字段）
   */
  async updateRolePermissions(roleId: string, permissions: string[]): Promise<Role> {
    return permissionApiService.updateRolePermissions(roleId, permissions)
  }

  /**
   * 删除角色
   */
  async deleteRole(roleId: string): Promise<any> {
    return permissionApiService.deleteRole(roleId)
  }

  /**
   * 获取用户菜单配置
   */
  async getUserMenuConfig(user: User): Promise<MenuConfig> {
    return permissionApiService.getUserMenuConfig(user)
  }

  /**
   * 根据用户角色过滤菜单项
   */
  filterMenuByUserRole(menuItems: MenuItem[], userPermissions: string[]): MenuItem[] {
    return menuItems.filter(item => {
      if (!item.permissions || item.permissions.length === 0) {
        return true
      }
      return item.permissions.some(perm => userPermissions.includes(perm))
    }).map(item => ({
      ...item,
      children: item.children
        ? this.filterMenuByUserRole(item.children, userPermissions)
        : undefined
    }))
  }
}

export const permissionService = new PermissionService()

// 兼容性导出 — 页面层可以用 permissionApi.xxx() 调用
export const permissionApi = {
  getPermissionGroups: permissionService.getPermissionGroups.bind(permissionService),
  getRolePermissionMatrix: permissionService.getRolePermissionMatrix.bind(permissionService),
  getAllRoles: permissionService.getAllRoles.bind(permissionService),
  createRole: permissionService.createRole.bind(permissionService),
  updateRole: permissionService.updateRole.bind(permissionService),
  updateRolePermissions: permissionService.updateRolePermissions.bind(permissionService),
  deleteRole: permissionService.deleteRole.bind(permissionService),
  getUserMenuConfig: permissionService.getUserMenuConfig.bind(permissionService),
}
