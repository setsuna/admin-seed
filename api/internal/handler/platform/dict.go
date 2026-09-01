package platform

import (
	"admin-seed/internal/common"
	"admin-seed/internal/dto/request"
	"admin-seed/internal/middleware"
	"admin-seed/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// DictHandler 字典处理器
type DictHandler struct {
	dictService service.DictService
	logger      *zap.Logger
}

// NewDictHandler 创建字典处理器
func NewDictHandler(dictService service.DictService, logger *zap.Logger) *DictHandler {
	return &DictHandler{
		dictService: dictService,
		logger:      logger,
	}
}

// GetDictTypes 获取字典类型列表
func (h *DictHandler) GetDictTypes(c *gin.Context) {
	types, err := h.dictService.GetDictTypes()
	if err != nil {
		panic(err)
	}

	common.Success(c, types)
}

// GetDictionaries 获取数据字典列表
func (h *DictHandler) GetDictionaries(c *gin.Context) {
	// 从middleware中获取验证后的数据
	var filters request.DictFilters
	if err := middleware.GetValidatedDataAs(c, &filters); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	dicts, total, err := h.dictService.ListDicts(&filters)
	if err != nil {
		panic(err)
	}

	// 使用common包的分页响应
	page := filters.Page
	if page < 1 {
		page = 1
	}

	size := filters.Size
	if size < 1 {
		size = 20
	}

	pagination := common.CreatePagination(page, size, total)
	common.PaginatedSuccess(c, dicts, pagination)
}

// CreateDictionary 创建数据字典
func (h *DictHandler) CreateDictionary(c *gin.Context) {
	var req request.CreateDataDictRequest
	if err := middleware.GetValidatedDataAs(c, &req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	dict, err := h.dictService.CreateDict(&req)
	if err != nil {
		panic(err)
	}

	common.SuccessWithMessage(c, "创建字典成功", dict)
}

// GetDictionary 获取数据字典详情
func (h *DictHandler) GetDictionary(c *gin.Context) {
	dictID := c.Param("id")
	if dictID == "" {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "字典ID不能为空")
		return
	}

	dict, err := h.dictService.GetDict(dictID)
	if err != nil {
		panic(err)
	}

	common.Success(c, dict)
}

// UpdateDictionary 更新数据字典
func (h *DictHandler) UpdateDictionary(c *gin.Context) {
	dictID := c.Param("id")
	if dictID == "" {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "字典ID不能为空")
		return
	}

	var req request.UpdateDataDictRequest
	if err := middleware.GetValidatedDataAs(c, &req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	// 审计日志：记录修改前的数据
	beforeDict, err := h.dictService.GetDict(dictID)
	if err == nil {
		c.Set("before_data", beforeDict)
	}

	dict, err := h.dictService.UpdateDict(dictID, &req)
	if err != nil {
		panic(err)
	}

	common.SuccessWithMessage(c, "更新字典成功", dict)
}

// DeleteDictionary 删除数据字典
func (h *DictHandler) DeleteDictionary(c *gin.Context) {
	dictID := c.Param("id")
	if dictID == "" {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "字典ID不能为空")
		return
	}

	// 审计日志：记录删除前的数据
	beforeDict, err := h.dictService.GetDict(dictID)
	if err == nil {
		c.Set("before_data", beforeDict)
	}

	err = h.dictService.DeleteDict(dictID)
	if err != nil {
		panic(err)
	}

	common.SuccessWithMessage(c, "删除字典成功", nil)
}

// DeleteDictionaries 批量删除数据字典
func (h *DictHandler) DeleteDictionaries(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required,min=1"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数错误")
		return
	}

	err := h.dictService.DeleteDicts(req.IDs)
	if err != nil {
		panic(err)
	}

	common.SuccessWithMessage(c, "批量删除成功", nil)
}

// ExportDictionaries 导出数据字典
func (h *DictHandler) ExportDictionaries(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		// 如果没有传ids，就导出所有
		req.IDs = []string{}
	}

	data, err := h.dictService.ExportDicts(req.IDs)
	if err != nil {
		panic(err)
	}

	c.Header("Content-Type", "application/json")
	c.Header("Content-Disposition", "attachment; filename=dictionaries.json")
	c.Data(200, "application/json", data)
}

// SyncToDevices 同步到设备
func (h *DictHandler) SyncToDevices(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required,min=1"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数错误")
		return
	}

	err := h.dictService.SyncToDevices(req.IDs)
	if err != nil {
		panic(err)
	}

	common.SuccessWithMessage(c, "同步成功", nil)
}

// GetDictItems 获取字典项列表
func (h *DictHandler) GetDictItems(c *gin.Context) {
	dictCode := c.Param("dictCode")
	if dictCode == "" {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "字典代码不能为空")
		return
	}

	items, err := h.dictService.GetDictItems(dictCode)
	if err != nil {
		panic(err)
	}

	common.Success(c, items)
}

// CreateDictItem 创建字典项
func (h *DictHandler) CreateDictItem(c *gin.Context) {
	dictCode := c.Param("dictCode")
	if dictCode == "" {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "字典代码不能为空")
		return
	}

	var req request.CreateDictItemRequest
	if err := middleware.GetValidatedDataAs(c, &req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	item, err := h.dictService.CreateDictItem(dictCode, &req)
	if err != nil {
		panic(err)
	}

	common.SuccessWithMessage(c, "创建字典项成功", item)
}

// UpdateDictItem 更新字典项
func (h *DictHandler) UpdateDictItem(c *gin.Context) {
	itemID := c.Param("id")
	if itemID == "" {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "字典项ID不能为空")
		return
	}

	var req request.UpdateDictItemRequest
	if err := middleware.GetValidatedDataAs(c, &req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	beforeItem, err := h.dictService.GetDictItem(itemID)
	if err == nil {
		c.Set("before_data", beforeItem)
	}

	item, err := h.dictService.UpdateDictItem(itemID, &req)
	if err != nil {
		panic(err)
	}

	common.SuccessWithMessage(c, "更新字典项成功", item)
}

// DeleteDictItem 删除字典项
func (h *DictHandler) DeleteDictItem(c *gin.Context) {
	itemID := c.Param("id")
	if itemID == "" {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "字典项ID不能为空")
		return
	}

	beforeItem, err := h.dictService.GetDictItem(itemID)
	if err == nil {
		c.Set("before_data", beforeItem)
	}

	err = h.dictService.DeleteDictItem(itemID)
	if err != nil {
		panic(err)
	}

	common.SuccessWithMessage(c, "删除字典项成功", nil)
}
