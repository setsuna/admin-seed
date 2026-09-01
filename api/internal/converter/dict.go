package converter

import (
	"database/sql"
	"admin-seed/internal/dto/request"
	"admin-seed/internal/dto/response"
	"admin-seed/internal/model"
)

// DictConverter 字典转换器
type DictConverter struct{}

// NewDictConverter 创建字典转换器
func NewDictConverter() *DictConverter {
	return &DictConverter{}
}

// DictModelToResponse 将字典模型转换为响应
func (c *DictConverter) DictModelToResponse(dict *model.DataDict) *response.DictResponse {
	if dict == nil {
		return nil
	}

	remark := ""
	if dict.Remark.Valid {
		remark = dict.Remark.String
	}

	return &response.DictResponse{
		ID:        dict.ID,
		DictCode:  dict.DictCode,
		DictName:  dict.DictName,
		DictType:  dict.DictType,
		Status:    dict.Status,
		ItemCount: dict.ItemCount,
		Remark:    remark,
		CreatedAt: dict.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt: dict.UpdatedAt.Format("2006-01-02 15:04:05"),
		Items:     nil, // 默认不包含items
	}
}

// DictModelToResponseWithItems 将字典模型转换为包含items的响应
func (c *DictConverter) DictModelToResponseWithItems(dict *model.DataDict, items []*model.DictItem) *response.DictResponse {
	resp := c.DictModelToResponse(dict)
	if resp != nil {
		resp.Items = c.DictItemModelsToResponses(items)
	}
	return resp
}

// DictModelsToResponses 批量转换字典模型
func (c *DictConverter) DictModelsToResponses(dicts []*model.DataDict) []*response.DictResponse {
	responses := make([]*response.DictResponse, len(dicts))
	for i, dict := range dicts {
		responses[i] = c.DictModelToResponse(dict)
	}
	return responses
}

// CreateDictRequestToModel 将创建请求转换为模型
func (c *DictConverter) CreateDictRequestToModel(req *request.CreateDataDictRequest) *model.DataDict {
	dict := &model.DataDict{
		DictCode:  req.DictCode,
		DictName:  req.DictName,
		DictType:  req.DictType,
		Status:    model.DictStatusEnabled,
		ItemCount: 0,
	}

	if req.Remark != "" {
		dict.Remark = sql.NullString{String: req.Remark, Valid: true}
	}

	return dict
}

// UpdateDictRequestToModel 将更新请求应用到模型
func (c *DictConverter) UpdateDictRequestToModel(dict *model.DataDict, req *request.UpdateDataDictRequest) {
	dict.DictName = req.DictName
	dict.DictType = req.DictType

	// 更新状态字段
	if req.Status != "" {
		dict.Status = req.Status
	}

	if req.Remark != "" {
		dict.Remark = sql.NullString{String: req.Remark, Valid: true}
	} else {
		dict.Remark = sql.NullString{Valid: false}
	}
}

// DictItemModelToResponse 将字典项模型转换为响应
func (c *DictConverter) DictItemModelToResponse(item *model.DictItem) *response.DictItemResponse {
	if item == nil {
		return nil
	}

	return &response.DictItemResponse{
		ID:        item.ID,
		DictCode:  item.DictCode,
		Code:      item.Code,
		Name:      item.Name,
		Value:     item.Value,
		Status:    item.Status,
		Sort:      item.Sort,
		CreatedAt: item.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt: item.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
}

// DictItemModelsToResponses 批量转换字典项模型
func (c *DictConverter) DictItemModelsToResponses(items []*model.DictItem) []*response.DictItemResponse {
	responses := make([]*response.DictItemResponse, len(items))
	for i, item := range items {
		responses[i] = c.DictItemModelToResponse(item)
	}
	return responses
}

// CreateDictItemRequestToModel 将创建字典项请求转换为模型
func (c *DictConverter) CreateDictItemRequestToModel(dictCode string, req *request.CreateDictItemRequest) *model.DictItem {
	return &model.DictItem{
		DictCode: dictCode,
		Code:     req.ItemKey,
		Name:     req.ItemValue,
		Value:    req.ItemValue,
		Status:   model.DictStatusEnabled,
		Sort:     req.SortOrder,
	}
}

// UpdateDictItemRequestToModel 将更新字典项请求应用到模型
func (c *DictConverter) UpdateDictItemRequestToModel(item *model.DictItem, req *request.UpdateDictItemRequest) {
	// 优先使用新格式字段
	if req.Name != "" {
		item.Name = req.Name
	} else if req.ItemValue != "" {
		item.Name = req.ItemValue
	}

	if req.Value != "" {
		item.Value = req.Value
	} else if req.ItemValue != "" {
		item.Value = req.ItemValue
	}

	if req.Code != "" {
		item.Code = req.Code
	}

	if req.Sort > 0 {
		item.Sort = req.Sort
	} else {
		item.Sort = req.SortOrder
	}

	if req.Status != "" {
		item.Status = req.Status
	}
}
