package response

// DictResponse 字典响应
type DictResponse struct {
	ID        string              `json:"id"`
	DictCode  string              `json:"dictCode"`
	DictName  string              `json:"dictName"`
	DictType  string              `json:"dictType"`
	Status    string              `json:"status"`
	ItemCount int                 `json:"itemCount"`
	Remark    string              `json:"remark"`
	Items     []*DictItemResponse `json:"items,omitempty"` // 字典项列表（可选）
	CreatedAt string              `json:"createdAt"`
	UpdatedAt string              `json:"updatedAt"`
}

// DictItemResponse 字典项响应
type DictItemResponse struct {
	ID        string `json:"id"`
	DictCode  string `json:"dictCode"`
	Code      string `json:"code"`  // 项编码
	Name      string `json:"name"`  // 项名称
	Value     string `json:"value"` // 项值
	Status    string `json:"status"`
	Sort      int    `json:"sort"` // 排序
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

// DictTypeOption 字典类型选项
type DictTypeOption struct {
	Label string `json:"label"`
	Value string `json:"value"`
}
