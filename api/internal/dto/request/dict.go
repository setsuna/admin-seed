package request

// DictFilters 字典查询过滤器
type DictFilters struct {
	Page     int    `form:"page" json:"page"`
	Size     int    `form:"pageSize" json:"pageSize"`
	DictCode string `form:"dictCode" json:"dictCode"`
	DictName string `form:"dictName" json:"dictName"`
	DictType string `form:"dictType" json:"dictType"`
	Status   string `form:"status" json:"status"`
	Keyword  string `form:"keyword" json:"keyword"`
}

// CreateDataDictRequest 创建数据字典请求
type CreateDataDictRequest struct {
	DictCode string `json:"dictCode" binding:"required,min=2,max=50" example:"USER_STATUS"`
	DictName string `json:"dictName" binding:"required,min=2,max=100" example:"用户状态"`
	DictType string `json:"dictType" binding:"required,min=2,max=50" example:"system"`
	Remark   string `json:"remark" example:"用户状态字典"`
}

// UpdateDataDictRequest 更新数据字典请求
type UpdateDataDictRequest struct {
	DictCode string                        `json:"dictCode"`
	DictName string                        `json:"dictName" binding:"required,min=2,max=100" example:"用户状态"`
	DictType string                        `json:"dictType" binding:"required,min=2,max=50" example:"system"`
	Status   string                        `json:"status"`
	Remark   string                        `json:"remark" example:"用户状态字典"`
	Items    []UpdateDictItemInBulkRequest `json:"items"` // 字典项列表
}

// UpdateDictItemInBulkRequest 批量更新字典项请求（用于更新字典时）
type UpdateDictItemInBulkRequest struct {
	ID     string `json:"id"`     // 字典项ID，如果为空表示新建
	DictID string `json:"dictId"` // 字典ID
	Code   string `json:"code" binding:"required"`
	Name   string `json:"name" binding:"required"`
	Value  string `json:"value"`
	Status string `json:"status"`
	Sort   int    `json:"sort"`
}

// CreateDictItemRequest 创建字典项请求
type CreateDictItemRequest struct {
	ItemKey   string `json:"itemKey" binding:"required,min=1,max=50" example:"active"`
	ItemValue string `json:"itemValue" binding:"required,min=1,max=100" example:"激活"`
	SortOrder int    `json:"sortOrder" example:"1"`
	IsDefault bool   `json:"isDefault" example:"false"`
	Remark    string `json:"remark" example:"用户激活状态"`
}

// UpdateDictItemRequest 更新字典项请求
type UpdateDictItemRequest struct {
	ItemValue string `json:"itemValue" binding:"required,min=1,max=100" example:"激活"`
	SortOrder int    `json:"sortOrder" example:"1"`
	IsDefault bool   `json:"isDefault" example:"false"`
	Remark    string `json:"remark" example:"用户激活状态"`
	// 兼容原有请求
	Code   string `json:"code"`
	Name   string `json:"name"`
	Value  string `json:"value"`
	Sort   int    `json:"sort"`
	Status string `json:"status"`
}
