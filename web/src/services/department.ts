/**
 * 部门服务 - 业务逻辑层
 * 调用 API 层，封装业务逻辑
 */

import { departmentApiService, type DepartmentOption, type DepartmentStats } from './api/department.api'
import type { 
  Department, 
  DepartmentFilters, 
  CreateDepartmentRequest, 
  UpdateDepartmentRequest,
  PaginatedResponse 
} from '@/types'

/**
 * 部门服务类
 * 封装部门相关的业务逻辑
 */
class DepartmentService {
  /**
   * 获取部门列表
   */
  async getDepartments(
    params: DepartmentFilters & { page?: number; pageSize?: number } = {}
  ): Promise<PaginatedResponse<Department>> {
    const { page = 1, pageSize = 20, ...filters } = params
    return await departmentApiService.getDepartments(filters, page, pageSize)
  }

  /**
   * 获取部门树形结构
   */
  async getDepartmentTree(): Promise<Department[]> {
    return await departmentApiService.getDepartmentTree()
  }

  /**
   * 获取部门选项列表
   */
  async getDepartmentOptions(): Promise<DepartmentOption[]> {
    return await departmentApiService.getDepartmentOptions()
  }

  /**
   * 获取单个部门详情
   */
  async getDepartment(id: string): Promise<Department> {
    return await departmentApiService.getDepartment(id)
  }

  /**
   * 创建部门
   */
  async createDepartment(data: CreateDepartmentRequest): Promise<Department> {
    return await departmentApiService.createDepartment(data)
  }

  /**
   * 更新部门
   */
  async updateDepartment(data: UpdateDepartmentRequest): Promise<Department> {
    const { id, ...updateData } = data
    return await departmentApiService.updateDepartment(id, updateData)
  }

  /**
   * 删除部门
   */
  async deleteDepartment(id: string): Promise<boolean> {
    const response = await departmentApiService.deleteDepartment(id)
    return response.success
  }

  /**
   * 批量删除部门
   */
  async batchDeleteDepartments(ids: string[]): Promise<boolean> {
    const response = await departmentApiService.batchDeleteDepartments(ids)
    return response.successCount === ids.length
  }

  /**
   * 移动部门
   */
  async moveDepartment(id: string, parentId?: string): Promise<Department> {
    return await departmentApiService.moveDepartment(id, parentId)
  }

  /**
   * 获取部门统计信息
   */
  async getDepartmentStats(): Promise<DepartmentStats> {
    return await departmentApiService.getDepartmentStats()
  }

  /**
   * 更新部门状态
   */
  async updateDepartmentStatus(id: string, status: 'enabled' | 'disabled'): Promise<boolean> {
    const response = await departmentApiService.updateDepartmentStatus(id, status)
    return response.success
  }

  /**
   * 获取部门下的用户
   */
  async getDepartmentUsers(id: string, page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<any>> {
    return await departmentApiService.getDepartmentUsers(id, page, pageSize)
  }

  /**
   * 搜索部门
   */
  async searchDepartments(keyword: string): Promise<Department[]> {
    return await departmentApiService.searchDepartments(keyword)
  }
}

export const departmentService = new DepartmentService()
