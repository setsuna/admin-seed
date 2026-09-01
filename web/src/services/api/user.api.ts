/**
 * 用户管理API服务
 */

import { httpClient } from '@/services/core/http.client'
import { API_PATHS } from '@/config'
import type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserFilters,
  PaginatedResponse,
  OperationResult
} from '@/types'

// 重置密码响应类型
export interface ResetPasswordResponse {
  tempPassword: string
  expiresIn: number
  requireChange: boolean
}

export class UserApiService {
  private basePath = API_PATHS.USERS

  /**
   * 获取用户列表
   */
  async getUsers(
    filters: UserFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<User>> {
    const result = await httpClient.get<PaginatedResponse<any>>(this.basePath, {
      ...filters,
      page,
      pageSize
    })
    
    // 字段映射：security_level -> securityLevel
    if (result.items) {
      result.items = result.items.map((user: any) => ({
        ...user,
        securityLevel: user.security_level || user.securityLevel,
        departmentName: user.department_name || user.departmentName,
        ukeyId: user.ukey_id || user.ukeyId,
        allowedIps: user.allowed_ips || user.allowedIps,
        lastLoginAt: user.last_login_at || user.lastLoginAt,
        lastLoginIp: user.last_login_ip || user.lastLoginIp,
        isHide: user.is_hide !== undefined ? user.is_hide : user.isHide,
        isDeleted: user.is_deleted !== undefined ? user.is_deleted : user.isDeleted,
        realName: user.real_name || user.realName,
        createdAt: user.created_at || user.createdAt,
        updatedAt: user.updated_at || user.updatedAt
      }))
    }
    
    return result as PaginatedResponse<User>
  }

  /**
   * 获取单个用户详情
   */
  async getUser(id: string): Promise<User> {
    const user = await httpClient.get<any>(`${this.basePath}/${id}`)
    
    // 字段映射
    return {
      ...user,
      securityLevel: user.security_level || user.securityLevel,
      departmentName: user.department_name || user.departmentName,
      ukeyId: user.ukey_id || user.ukeyId,
      allowedIps: user.allowed_ips || user.allowedIps,
      lastLoginAt: user.last_login_at || user.lastLoginAt,
      lastLoginIp: user.last_login_ip || user.lastLoginIp,
      isHide: user.is_hide !== undefined ? user.is_hide : user.isHide,
      isDeleted: user.is_deleted !== undefined ? user.is_deleted : user.isDeleted,
      realName: user.real_name || user.realName,
      createdAt: user.created_at || user.createdAt,
      updatedAt: user.updated_at || user.updatedAt
    } as User
  }

  /**
   * 将前端 camelCase 字段转为后端 snake_case
   */
  private toSnakeCase(data: Record<string, any>): Record<string, any> {
    const keyMap: Record<string, string> = {
      securityLevel: 'security_level',
      ukeyId: 'ukey_id',
      allowedIps: 'allowed_ips',
      isHide: 'is_hide',
      realName: 'real_name',
      lastLoginAt: 'last_login_at',
      lastLoginIp: 'last_login_ip',
    }
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue
      result[keyMap[key] || key] = value
    }
    return result
  }

  /**
   * 创建用户
   */
  async createUser(data: CreateUserRequest): Promise<User> {
    return await httpClient.post<User>(this.basePath, this.toSnakeCase(data))
  }

  /**
   * 更新用户
   */
  async updateUser(id: string, data: UpdateUserRequest): Promise<User> {
    return await httpClient.put<User>(`${this.basePath}/${id}`, this.toSnakeCase(data))
  }

  /**
   * 删除用户
   */
  async deleteUser(id: string): Promise<OperationResult> {
    return await httpClient.delete<OperationResult>(`${this.basePath}/${id}`)
  }

  /**
   * 批量删除用户
   */
  async deleteUsers(ids: string[]): Promise<{ successCount: number; failedCount: number }> {
    return await httpClient.post<{ successCount: number; failedCount: number }>(
      `${this.basePath}/batch-delete`,
      { ids }
    )
  }

  /**
   * 重置用户密码
   */
  async resetUserPassword(id: string): Promise<ResetPasswordResponse> {
    return await httpClient.post<ResetPasswordResponse>(`${this.basePath}/${id}/reset-password`)
  }

  /**
   * 更新用户状态
   */
  async updateUserStatus(id: string, status: 'active' | 'inactive' | 'suspended'): Promise<OperationResult> {
    return await httpClient.put<OperationResult>(`${this.basePath}/${id}/status`, { status })
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(): Promise<{
    total: number
    active: number
    inactive: number
    suspended: number
    byRole: Record<string, number>
    bySecurityLevel: Record<string, number>
  }> {
    return await httpClient.get(`${this.basePath}/stats`)
  }

  /**
   * 更新用户密级
   */
  async updateUserSecurityLevel(id: string, securityLevel: string): Promise<User> {
    return await httpClient.put<User>(`${this.basePath}/${id}/security-level`, { security_level: securityLevel })
  }

  /**
   * 批量更新用户密级
   */
  async batchUpdateSecurityLevel(ids: string[], securityLevel: string): Promise<OperationResult> {
    return await httpClient.put<OperationResult>(`${this.basePath}/batch-security-level`, {
      ids,
      security_level: securityLevel
    })
  }

  /**
   * 批量调整部门
   */
  async batchUpdateDepartment(userIds: string[], department: string): Promise<OperationResult> {
    return await httpClient.put<OperationResult>(`${this.basePath}/batch-department`, {
      user_ids: userIds,
      department
    })
  }

  /**
   * 获取用户安全等级选项
   */
  async getUserSecurityLevels(): Promise<string[]> {
    return await httpClient.get<string[]>(`${this.basePath}/security-levels`)
  }

  /**
   * 搜索用户
   */
  async searchUsers(keyword: string, limit: number = 10): Promise<User[]> {
    return await httpClient.get<User[]>(`${this.basePath}/search`, {
      keyword,
      limit
    })
  }

  /**
   * 批量导入用户
   */
  async batchImportUsers(data: {
    department?: string
    default_password?: string
    users: Array<{ username: string; name: string; phone?: string; role: string; status?: string; security_level?: string; permissions?: string[] }>
  }): Promise<{
    success_count: number
    fail_count: number
    failures?: Array<{ index: number; username: string; reason: string }>
  }> {
    return await httpClient.post(`${this.basePath}/batch-import`, data)
  }
}

// 导出服务实例
export const userApiService = new UserApiService()
export const userApi = userApiService
