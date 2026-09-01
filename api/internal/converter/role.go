package converter

import (
	"admin-seed/internal/dto/request"
	"admin-seed/internal/dto/response"
	"admin-seed/internal/model"
	"time"
)

// RoleConverter 角色转换器
type RoleConverter struct{}

// NewRoleConverter 创建角色转换器
func NewRoleConverter() *RoleConverter {
	return &RoleConverter{}
}

// ModelToResponse 将 Model 转换为 Response
func (c *RoleConverter) ModelToResponse(role *model.Role) *response.RoleResponse {
	if role == nil {
		return nil
	}

	resp := &response.RoleResponse{
		ID:          role.ID,
		CreatedAt:   role.CreatedAt,
		UpdatedAt:   role.UpdatedAt,
		Status:      role.Status,
		Name:        role.Name,
		Code:        role.Code,
		Description: role.Description,
		Permissions: role.Permissions,
		Type:        role.Type,
		Level:       role.Level,
		IsBuiltIn:   role.IsBuiltIn,
	}

	// 转换元数据
	if role.Metadata != nil {
		resp.Metadata = &response.RoleMetadataResponse{
			Color:    role.Metadata.Color,
			Icon:     role.Metadata.Icon,
			Category: role.Metadata.Category,
		}
	}

	return resp
}

// ModelsToResponses 批量转换 Model 到 Response
func (c *RoleConverter) ModelsToResponses(roles []*model.Role) []*response.RoleResponse {
	responses := make([]*response.RoleResponse, 0, len(roles))
	for _, role := range roles {
		responses = append(responses, c.ModelToResponse(role))
	}
	return responses
}

// CreateRequestToModel 将创建请求转换为 Model
func (c *RoleConverter) CreateRequestToModel(req *request.CreateRoleRequest) *model.Role {
	now := time.Now()

	roleType := req.Type
	if roleType == "" {
		roleType = model.RoleTypeBusiness
	}

	role := &model.Role{
		Name:        req.Name,
		Code:        req.Code,
		Description: req.Description,
		Permissions: req.Permissions,
		Status:      model.RoleStatusActive,
		Type:        roleType,
		Level:       req.Level,
		IsBuiltIn:   false,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	// 转换元数据
	if len(req.Metadata) > 0 {
		role.Metadata = &model.RoleMetadata{
			Color:    req.Metadata["color"],
			Icon:     req.Metadata["icon"],
			Category: req.Metadata["category"],
		}
	}

	return role
}

// UpdateRequestToModel 将更新请求应用到 Model
func (c *RoleConverter) UpdateRequestToModel(role *model.Role, req *request.UpdateRoleRequest) {
	if req.Name != "" {
		role.Name = req.Name
	}
	if req.Code != "" {
		role.Code = req.Code
	}
	if req.Description != "" {
		role.Description = req.Description
	}
	if req.Permissions != nil {
		role.Permissions = req.Permissions
	}
	if req.Type != "" {
		role.Type = req.Type
	}
	if req.Level > 0 {
		role.Level = req.Level
	}
	if req.Status != "" {
		role.Status = req.Status
	}

	// 更新元数据
	if len(req.Metadata) > 0 {
		if role.Metadata == nil {
			role.Metadata = &model.RoleMetadata{}
		}
		if color, ok := req.Metadata["color"]; ok {
			role.Metadata.Color = color
		}
		if icon, ok := req.Metadata["icon"]; ok {
			role.Metadata.Icon = icon
		}
		if category, ok := req.Metadata["category"]; ok {
			role.Metadata.Category = category
		}
	}

	role.UpdatedAt = time.Now()
}
