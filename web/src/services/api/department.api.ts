/**
 * 部门管理API服务
 */

import { httpClient } from '@/services/core/http.client'
import { API_PATHS } from '@/config'
import type {
  Department,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  DepartmentFilters,
  PaginatedResponse
} from '@/types'

// 部门选项类型
export interface DepartmentOption {
  label: string
  value: string
  level: number
  id: string
  name: string
}

// 部门统计类型
export interface DepartmentStats {
  total: number
  active: number
  inactive: number
  avgEmployees: number
  topLevel?: number  // 顶级部门数量（可选）
}

export class DepartmentApiService {
  private basePath = API_PATHS.DEPARTMENTS

  /**
   * 获取部门列表（分页）
   */
  async getDepartments(
    filters: DepartmentFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<Department>> {
    return await httpClient.get<PaginatedResponse<Department>>(this.basePath, {
      ...filters,
      page,
      pageSize
    })
  }

  /**
   * 获取部门树形结构
   */
  async getDepartmentTree(): Promise<Department[]> {
    return await httpClient.get<Department[]>(`${this.basePath}/tree`)
  }

  /**
   * 获取部门选项列表
   */
  async getDepartmentOptions(): Promise<DepartmentOption[]> {
    return await httpClient.get<DepartmentOption[]>(`${this.basePath}/options`)
  }

  /**
   * 获取单个部门详情
   */
  async getDepartment(id: string): Promise<Department> {
    return await httpClient.get<Department>(`${this.basePath}/${id}`)
  }

  /**
   * 将前端 camelCase 字段转为后端 snake_case
   */
  private toSnakeCase(data: Record<string, any>): Record<string, any> {
    const keyMap: Record<string, string> = {
      parentId: 'parent_id',
      managerId: 'manager_id',
    }
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(data)) {
      result[keyMap[key] || key] = value
    }
    return result
  }

  /**
   * 创建部门
   */
  async createDepartment(data: CreateDepartmentRequest): Promise<Department> {
    return await httpClient.post<Department>(this.basePath, this.toSnakeCase(data))
  }

  /**
   * 更新部门
   */
  async updateDepartment(id: string, data: Omit<UpdateDepartmentRequest, 'id'>): Promise<Department> {
    return await httpClient.put<Department>(`${this.basePath}/${id}`, this.toSnakeCase(data))
  }

  /**
   * 删除部门
   */
  async deleteDepartment(id: string): Promise<{ success: boolean; message?: string }> {
    return await httpClient.delete<{ success: boolean; message?: string }>(`${this.basePath}/${id}`)
  }

  /**
   * 批量删除部门
   */
  async batchDeleteDepartments(ids: string[]): Promise<{ successCount: number; failedCount: number }> {
    return await httpClient.post<{ successCount: number; failedCount: number }>(
      `${this.basePath}/batch-delete`,
      { ids }
    )
  }

  /**
   * 获取部门统计信息
   */
  async getDepartmentStats(): Promise<DepartmentStats> {
    return await httpClient.get<DepartmentStats>(`${this.basePath}/stats`)
  }

  /**
   * 移动部门
   */
  async moveDepartment(id: string, parentId?: string): Promise<Department> {
    return await httpClient.patch<Department>(`${this.basePath}/${id}/move`, { parentId })
  }

  /**
   * 更新部门状态
   */
  async updateDepartmentStatus(
    id: string, 
    status: 'enabled' | 'disabled'
  ): Promise<{ success: boolean }> {
    return await httpClient.patch<{ success: boolean }>(`${this.basePath}/${id}/status`, { status })
  }

  /**
   * 获取部门下的用户
   */
  async getDepartmentUsers(
    id: string, 
    page: number = 1, 
    pageSize: number = 20
  ): Promise<PaginatedResponse<any>> {
    return await httpClient.get<PaginatedResponse<any>>(`${this.basePath}/${id}/users`, {
      page,
      pageSize
    })
  }

  /**
   * 搜索部门
   */
  async searchDepartments(keyword: string, limit: number = 100): Promise<Department[]> {
    const result = await this.getDepartments({ keyword }, 1, limit)
    return result.items
  }
}

// 导出服务实例
export const departmentApiService = new DepartmentApiService()
