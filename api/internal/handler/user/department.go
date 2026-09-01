package user

import (
	"admin-seed/internal/common"
	"admin-seed/internal/dto/request"
	"admin-seed/internal/middleware"
	"admin-seed/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

// DepartmentHandler 部门处理器
type DepartmentHandler struct {
	departmentService *service.DepartmentService
}

// NewDepartmentHandler 创建部门处理器
func NewDepartmentHandler(departmentService *service.DepartmentService) *DepartmentHandler {
	return &DepartmentHandler{
		departmentService: departmentService,
	}
}

// GetDepartments 获取部门列表
func (h *DepartmentHandler) GetDepartments(c *gin.Context) {
	// 获取筛选参数
	filters := &request.DepartmentFilters{
		Keyword:   c.Query("keyword"),
		Status:    c.Query("status"),
		ManagerID: c.Query("manager_id"),
	}

	// 解析分页参数
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil {
			filters.Page = page
		}
	}
	if sizeStr := c.Query("size"); sizeStr != "" {
		if size, err := strconv.Atoi(sizeStr); err == nil {
			filters.Size = size
		}
	}

	// 设置默认分页
	if filters.Page <= 0 {
		filters.Page = 1
	}
	if filters.Size <= 0 {
		filters.Size = 20
	}

	// 调用服务
	departments, total, err := h.departmentService.GetDepartments(filters)
	if err != nil {
		panic(err)
	}

	// 返回分页数据
	pagination := common.CreatePagination(filters.Page, filters.Size, total)
	common.PaginatedSuccess(c, departments, pagination)
}

// GetDepartmentTree 获取部门树形结构
func (h *DepartmentHandler) GetDepartmentTree(c *gin.Context) {
	tree, err := h.departmentService.GetDepartmentTree()
	if err != nil {
		panic(err)
	}

	common.Success(c, tree)
}

// GetDepartment 获取部门详情
func (h *DepartmentHandler) GetDepartment(c *gin.Context) {
	id := c.Param("id")

	department, err := h.departmentService.GetDepartment(id)
	if err != nil {
		panic(err)
	}

	common.Success(c, department)
}

// CreateDepartment 创建部门
func (h *DepartmentHandler) CreateDepartment(c *gin.Context) {
	var req request.CreateDepartmentRequest
	if err := middleware.GetValidatedDataAs(c, &req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	department, err := h.departmentService.CreateDepartment(&req)
	if err != nil {
		panic(err)
	}

	common.Success(c, department)
}

// UpdateDepartment 更新部门
func (h *DepartmentHandler) UpdateDepartment(c *gin.Context) {
	id := c.Param("id")

	var req request.UpdateDepartmentRequest
	if err := middleware.GetValidatedDataAs(c, &req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	// 审计日志：记录修改前的数据
	beforeDepartment, err := h.departmentService.GetDepartment(id)
	if err == nil {
		c.Set("before_data", beforeDepartment)
	}

	department, err := h.departmentService.UpdateDepartment(id, &req)
	if err != nil {
		panic(err)
	}

	common.Success(c, department)
}

// DeleteDepartment 删除部门
func (h *DepartmentHandler) DeleteDepartment(c *gin.Context) {
	id := c.Param("id")

	// 审计日志：记录删除前的数据
	beforeDepartment, err := h.departmentService.GetDepartment(id)
	if err == nil {
		c.Set("before_data", beforeDepartment)
	}

	err = h.departmentService.DeleteDepartment(id)
	if err != nil {
		panic(err)
	}

	common.Success(c, nil)
}

// BatchDeleteDepartments 批量删除部门
func (h *DepartmentHandler) BatchDeleteDepartments(c *gin.Context) {
	var ids []string
	if err := c.ShouldBindJSON(&ids); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数格式错误")
		return
	}

	if len(ids) == 0 {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "请选择要删除的部门")
		return
	}

	err := h.departmentService.BatchDeleteDepartments(ids)
	if err != nil {
		panic(err)
	}

	common.Success(c, nil)
}

// GetDepartmentOptions 获取部门选项列表
func (h *DepartmentHandler) GetDepartmentOptions(c *gin.Context) {
	options, err := h.departmentService.GetDepartmentOptions()
	if err != nil {
		panic(err)
	}

	common.Success(c, options)
}

// GetDepartmentStats 获取部门统计信息
func (h *DepartmentHandler) GetDepartmentStats(c *gin.Context) {
	stats, err := h.departmentService.GetDepartmentStats()
	if err != nil {
		panic(err)
	}

	common.Success(c, stats)
}
