package service

import (
	"context"
	"encoding/json"
	"admin-seed/internal/common"
	"admin-seed/internal/converter"
	"admin-seed/internal/dto/request"
	"admin-seed/internal/dto/response"
	"admin-seed/internal/model"
	"admin-seed/internal/repository"
	"strings"
)

// DictService 字典服务接口
type DictService interface {
	// 数据字典操作
	GetDictTypes() ([]*response.DictTypeOption, error)
	CreateDict(req *request.CreateDataDictRequest) (*response.DictResponse, error)
	GetDict(id string) (*response.DictResponse, error)
	GetDictByCode(dictCode string) (*response.DictResponse, error)
	UpdateDict(id string, req *request.UpdateDataDictRequest) (*response.DictResponse, error)
	DeleteDict(id string) error
	DeleteDicts(ids []string) error
	ListDicts(filters *request.DictFilters) ([]*response.DictResponse, int64, error)
	ExportDicts(ids []string) ([]byte, error)
	SyncToDevices(ids []string) error

	// 字典项操作
	CreateDictItem(dictCode string, req *request.CreateDictItemRequest) (*response.DictItemResponse, error)
	GetDictItem(id string) (*response.DictItemResponse, error)
	GetDictItems(dictCode string) ([]*response.DictItemResponse, error)
	UpdateDictItem(id string, req *request.UpdateDictItemRequest) (*response.DictItemResponse, error)
	DeleteDictItem(id string) error
}

// dictService 字典服务实现
type dictService struct {
	dictRepo      repository.DictRepositoryInterface
	dictConverter *converter.DictConverter
}

// NewDictService 创建字典服务
func NewDictService(dictRepo repository.DictRepositoryInterface) DictService {
	return &dictService{
		dictRepo:      dictRepo,
		dictConverter: converter.NewDictConverter(),
	}
}

// GetDictTypes 获取所有字典类型
func (s *dictService) GetDictTypes() ([]*response.DictTypeOption, error) {
	ctx := context.Background()
	types, err := s.dictRepo.GetDistinctDictTypes(ctx)
	if err != nil {
		return nil, err
	}

	options := make([]*response.DictTypeOption, len(types))
	for i, t := range types {
		options[i] = &response.DictTypeOption{
			Label: t.Name,
			Value: t.Type,
		}
	}
	return options, nil
}

// CreateDict 创建数据字典
func (s *dictService) CreateDict(req *request.CreateDataDictRequest) (*response.DictResponse, error) {
	ctx := context.Background()

	// 检查字典代码是否已存在
	dictCode := strings.ToUpper(req.DictCode)
	existing, err := s.dictRepo.GetDictByCode(ctx, dictCode)
	if err != nil && !repository.IsNotFoundError(err) {
		return nil, err
	}
	if existing != nil {
		return nil, common.NewAppError(
			common.ERROR_DICT_CODE_EXISTS,
			"字典代码已存在，请使用其他代码",
		)
	}

	// 转换请求为模型
	dict := s.dictConverter.CreateDictRequestToModel(req)
	dict.DictCode = dictCode

	// 创建字典
	err = s.dictRepo.Create(ctx, dict)
	if err != nil {
		// Repository错误直接返回
		return nil, err
	}

	// 转换为响应
	return s.dictConverter.DictModelToResponse(dict), nil
}

// GetDict 根据ID获取数据字典（包含字典项）
func (s *dictService) GetDict(id string) (*response.DictResponse, error) {
	ctx := context.Background()

	dict, err := s.dictRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if dict == nil {
		return nil, repository.NewNotFoundError("DataDict", id)
	}

	// 获取字典项
	items, err := s.dictRepo.GetDictItemsByCode(ctx, dict.DictCode)
	if err != nil {
		// 如果获取字典项失败，不影响字典本身返回
		items = []*model.DictItem{}
	}

	return s.dictConverter.DictModelToResponseWithItems(dict, items), nil
}

// GetDictByCode 根据代码获取数据字典
func (s *dictService) GetDictByCode(dictCode string) (*response.DictResponse, error) {
	ctx := context.Background()

	dict, err := s.dictRepo.GetDictByCode(ctx, strings.ToUpper(dictCode))
	if err != nil {
		return nil, err
	}
	if dict == nil {
		return nil, repository.NewNotFoundError("DataDict", dictCode).
			WithField("dict_code").
			WithValue(dictCode)
	}

	return s.dictConverter.DictModelToResponse(dict), nil
}

// UpdateDict 更新数据字典
func (s *dictService) UpdateDict(id string, req *request.UpdateDataDictRequest) (*response.DictResponse, error) {
	ctx := context.Background()

	// 获取现有字典
	dict, err := s.dictRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if dict == nil {
		return nil, repository.NewNotFoundError("DataDict", id)
	}

	// 应用更新
	s.dictConverter.UpdateDictRequestToModel(dict, req)

	// 更新字典基本信息
	err = s.dictRepo.Update(ctx, dict)
	if err != nil {
		return nil, err
	}

	// 如果请求中包含字典项，则更新字典项
	if len(req.Items) > 0 {
		// 获取现有的字典项
		existingItems, err := s.dictRepo.GetDictItemsByCode(ctx, dict.DictCode)
		if err != nil {
			return nil, err
		}

		// 构建现有字典项的Code映射（通过code匹配）
		existingItemByCode := make(map[string]*model.DictItem)
		existingItemByID := make(map[string]*model.DictItem)
		for _, item := range existingItems {
			existingItemByCode[item.Code] = item
			existingItemByID[item.ID] = item
		}

		// 处理请求中的字典项
		processedCodes := make(map[string]bool)
		for _, reqItem := range req.Items {
			itemCode := strings.ToUpper(reqItem.Code)
			processedCodes[itemCode] = true

			// 先通过ID匹配，再through Code匹配
			var existingItem *model.DictItem
			if reqItem.ID != "" {
				existingItem = existingItemByID[reqItem.ID]
			}
			if existingItem == nil {
				existingItem = existingItemByCode[itemCode]
			}

			if existingItem != nil {
				// 更新现有字典项
				existingItem.Code = itemCode
				existingItem.Name = reqItem.Name
				existingItem.Value = reqItem.Value
				if reqItem.Status != "" {
					existingItem.Status = reqItem.Status
				}
				existingItem.Sort = reqItem.Sort

				if err := s.dictRepo.UpdateDictItem(ctx, existingItem); err != nil {
					return nil, err
				}
			} else {
				// 新建字典项
				newItem := &model.DictItem{
					DictCode: dict.DictCode,
					Code:     itemCode,
					Name:     reqItem.Name,
					Value:    reqItem.Value,
					Status:   reqItem.Status,
					Sort:     reqItem.Sort,
				}
				if newItem.Status == "" {
					newItem.Status = "enabled"
				}
				if err := s.dictRepo.CreateDictItem(ctx, newItem); err != nil {
					return nil, err
				}
			}
		}

		// 删除不在请求中的字典项（软删除）
		for _, existingItem := range existingItems {
			if !processedCodes[existingItem.Code] {
				if err := s.dictRepo.DeleteDictItem(ctx, existingItem.ID); err != nil {
					return nil, err
				}
			}
		}

		// 更新字典项数量
		_ = s.dictRepo.UpdateDictItemCount(ctx, dict.DictCode)
	}

	return s.dictConverter.DictModelToResponse(dict), nil
}

// DeleteDict 删除数据字典
func (s *dictService) DeleteDict(id string) error {
	ctx := context.Background()

	// 检查字典是否存在
	dict, err := s.dictRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if dict == nil {
		return repository.NewNotFoundError("DataDict", id)
	}

	// 删除字典（会级联删除字典项）
	err = s.dictRepo.Delete(ctx, id)
	if err != nil {
		return err
	}

	return nil
}

// ListDicts 分页获取数据字典列表
func (s *dictService) ListDicts(filters *request.DictFilters) ([]*response.DictResponse, int64, error) {
	ctx := context.Background()

	dicts, total, err := s.dictRepo.ListDictsWithFilters(ctx, filters)
	if err != nil {
		return nil, 0, err
	}

	responses := s.dictConverter.DictModelsToResponses(dicts)
	return responses, total, nil
}

// CreateDictItem 创建字典项
func (s *dictService) CreateDictItem(dictCode string, req *request.CreateDictItemRequest) (*response.DictItemResponse, error) {
	ctx := context.Background()

	// 检查字典是否存在
	dictCode = strings.ToUpper(dictCode)
	dict, err := s.dictRepo.GetDictByCode(ctx, dictCode)
	if err != nil {
		if repository.IsNotFoundError(err) {
			return nil, common.NewAppError(
				common.ERROR_DICT_NOT_FOUND,
				"数据字典不存在，无法添加字典项",
			)
		}
		return nil, err
	}
	if dict == nil {
		return nil, common.NewAppError(
			common.ERROR_DICT_NOT_FOUND,
			"数据字典不存在，无法添加字典项",
		)
	}

	// 转换请求为模型
	item := s.dictConverter.CreateDictItemRequestToModel(dictCode, req)
	item.Code = strings.ToUpper(req.ItemKey)

	// 创建字典项
	err = s.dictRepo.CreateDictItem(ctx, item)
	if err != nil {
		// 检查是否是重复的字典项
		if repository.IsAlreadyExistsError(err) {
			return nil, common.NewAppError(
				common.ERROR_DICT_ITEM_EXISTS,
				"字典项代码已存在，请使用其他代码",
			)
		}
		return nil, err
	}

	// 更新字典项数量
	_ = s.dictRepo.UpdateDictItemCount(ctx, dictCode)

	// 转换为响应
	return s.dictConverter.DictItemModelToResponse(item), nil
}

// GetDictItem 根据ID获取字典项
func (s *dictService) GetDictItem(id string) (*response.DictItemResponse, error) {
	ctx := context.Background()

	item, err := s.dictRepo.GetDictItemByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if item == nil {
		return nil, repository.NewNotFoundError("DictItem", id)
	}

	return s.dictConverter.DictItemModelToResponse(item), nil
}

// GetDictItems 根据字典代码获取字典项列表
func (s *dictService) GetDictItems(dictCode string) ([]*response.DictItemResponse, error) {
	ctx := context.Background()

	items, err := s.dictRepo.GetDictItemsByCode(ctx, strings.ToUpper(dictCode))
	if err != nil {
		return nil, err
	}

	responses := s.dictConverter.DictItemModelsToResponses(items)
	return responses, nil
}

// UpdateDictItem 更新字典项
func (s *dictService) UpdateDictItem(id string, req *request.UpdateDictItemRequest) (*response.DictItemResponse, error) {
	ctx := context.Background()

	// 获取现有字典项
	item, err := s.dictRepo.GetDictItemByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if item == nil {
		return nil, repository.NewNotFoundError("DictItem", id)
	}

	// 应用更新
	s.dictConverter.UpdateDictItemRequestToModel(item, req)

	// 更新字典项
	err = s.dictRepo.UpdateDictItem(ctx, item)
	if err != nil {
		return nil, err
	}

	return s.dictConverter.DictItemModelToResponse(item), nil
}

// DeleteDictItem 删除字典项
func (s *dictService) DeleteDictItem(id string) error {
	ctx := context.Background()

	// 检查字典项是否存在
	item, err := s.dictRepo.GetDictItemByID(ctx, id)
	if err != nil {
		return err
	}
	if item == nil {
		return repository.NewNotFoundError("DictItem", id)
	}

	// 删除字典项
	err = s.dictRepo.DeleteDictItem(ctx, id)
	if err != nil {
		return err
	}

	// 更新字典项数量
	_ = s.dictRepo.UpdateDictItemCount(ctx, item.DictCode)

	return nil
}

// DeleteDicts 批量删除数据字典
func (s *dictService) DeleteDicts(ids []string) error {
	if len(ids) == 0 {
		return common.NewAppError(
			common.ERROR_INVALID_PARAMS,
			"请选择要删除的数据字典",
		)
	}

	ctx := context.Background()

	// 逐个删除
	for _, id := range ids {
		err := s.dictRepo.Delete(ctx, id)
		if err != nil && !repository.IsNotFoundError(err) {
			return err
		}
	}

	return nil
}

// ExportDicts 导出数据字典
func (s *dictService) ExportDicts(ids []string) ([]byte, error) {
	ctx := context.Background()
	var dicts []*model.DataDict

	if len(ids) == 0 {
		// 导出所有字典
		filters := &request.DictFilters{}
		allDicts, _, err := s.dictRepo.ListDictsWithFilters(ctx, filters)
		if err != nil {
			return nil, err
		}
		dicts = allDicts
	} else {
		// 导出指定字典
		for _, id := range ids {
			dict, err := s.dictRepo.GetByID(ctx, id)
			if err != nil {
				if repository.IsNotFoundError(err) {
					continue
				}
				return nil, err
			}
			dicts = append(dicts, dict)
		}
	}

	// 为每个字典获取字典项
	type ExportDict struct {
		*model.DataDict
		Items []*model.DictItem `json:"items"`
	}

	exportData := make([]ExportDict, len(dicts))
	for i, dict := range dicts {
		items, _ := s.dictRepo.GetDictItemsByCode(ctx, dict.DictCode)
		if items == nil {
			items = []*model.DictItem{}
		}
		exportData[i] = ExportDict{
			DataDict: dict,
			Items:    items,
		}
	}

	// 序列化为JSON
	return json.MarshalIndent(exportData, "", "  ")
}

// SyncToDevices 同步到设备
func (s *dictService) SyncToDevices(ids []string) error {
	if len(ids) == 0 {
		return common.NewAppError(
			common.ERROR_INVALID_PARAMS,
			"请选择要同步的数据字典",
		)
	}

	// TODO: 实现同步到设备的逻辑
	// 这里需要根据实际业务需求实现
	// 例如：
	// 1. 获取所有在线设备
	// 2. 将字典数据推送到设备
	// 3. 记录同步结果

	return nil
}
