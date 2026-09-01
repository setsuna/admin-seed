package response

// MenuConfigResponse 菜单配置响应
type MenuConfigResponse struct {
	UserID          string     `json:"userId"`
	UserPermissions []string   `json:"userPermissions"`
	Menus           []MenuItem `json:"menus"`
	CreatedAt       *string    `json:"createdAt,omitempty"`
	UpdatedAt       *string    `json:"updatedAt,omitempty"`
}

// MenuItem 菜单项
type MenuItem struct {
	ID          string     `json:"id"`
	Key         string     `json:"key"`
	Label       string     `json:"label"`
	Icon        *string    `json:"icon,omitempty"`
	Path        *string    `json:"path,omitempty"`
	Parent      *string    `json:"parent,omitempty"`
	Children    []MenuItem `json:"children,omitempty"`
	Type        string     `json:"type"` // 'group' | 'item' | 'divider'
	Permissions []string   `json:"permissions,omitempty"`
	Visible     bool       `json:"visible"`
	Disabled    bool       `json:"disabled"`
	Sort        int        `json:"sort"`
	Level       int        `json:"level"`
	Target      *string    `json:"target,omitempty"`
	Badge       *MenuBadge `json:"badge,omitempty"`
	Meta        *MenuMeta  `json:"meta,omitempty"`
}

// MenuBadge 菜单徽章
type MenuBadge struct {
	Count int    `json:"count"`
	Color string `json:"color"`
	Dot   bool   `json:"dot"`
}

// MenuMeta 菜单元数据
type MenuMeta struct {
	Title       *string  `json:"title,omitempty"`
	Description *string  `json:"description,omitempty"`
	Keywords    []string `json:"keywords,omitempty"`
	Cache       *bool    `json:"cache,omitempty"`
	Affix       *bool    `json:"affix,omitempty"`
}

// MenuItemFromDict 从字典项解析的菜单项（内部使用）
type MenuItemFromDict struct {
	Key         string   `json:"key"`
	Label       string   `json:"label"`
	Icon        string   `json:"icon,omitempty"`
	Path        string   `json:"path,omitempty"`
	Permissions []string `json:"permissions,omitempty"`
	Group       string   `json:"group"`
}
