package converter

import (
	"admin-seed/internal/dto/request"
	"admin-seed/internal/dto/response"
	"admin-seed/internal/model"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// UserConverter 用户转换器
type UserConverter struct{}

// NewUserConverter 创建用户转换器
func NewUserConverter() *UserConverter {
	return &UserConverter{}
}

// CreateRequestToModel 将创建请求转换为模型
func (c *UserConverter) CreateRequestToModel(req *request.CreateUserRequest) *model.User {
	now := time.Now()

	// 将IP列表转为JSON字符串
	allowedIPsJSON := ""
	if len(req.AllowedIPs) > 0 {
		if data, err := json.Marshal(req.AllowedIPs); err == nil {
			allowedIPsJSON = string(data)
		}
	}

	return &model.User{
		ID:             uuid.New().String(),
		Username:       req.Username,
		Password:       req.Password, // 注意：调用方需要处理密码哈希
		Email:          req.Email,
		Role:           req.Role,
		Department:     req.Department,
		Position:       req.Position,
		Phone:          req.Phone,
		Status:         req.Status,
		SecurityLevel:  req.SecurityLevel,
		AllowedIPs:     allowedIPsJSON,
		UkeyID:         req.UkeyID,
		Name:           req.Name,
		LastLoginIP:    req.LastLoginIP,
		IsHide:         req.IsHide,
		IsDeleted:      req.IsDeleted,
		Permissions:    req.Permissions,
		AllowedIPsList: req.AllowedIPs,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
}

// UpdateRequestToModel 将更新请求应用到模型
func (c *UserConverter) UpdateRequestToModel(user *model.User, req *request.UpdateUserRequest) {
	if req.Username != "" {
		user.Username = req.Username
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.Role != "" {
		user.Role = req.Role
	}
	if req.Department != "" {
		user.Department = req.Department
	}
	if req.Position != "" {
		user.Position = req.Position
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}
	if req.Status != "" {
		user.Status = req.Status
	}
	if req.SecurityLevel != "" {
		user.SecurityLevel = req.SecurityLevel
	}
	if req.AllowedIPs != nil {
		if data, err := json.Marshal(req.AllowedIPs); err == nil {
			user.AllowedIPs = string(data)
			user.AllowedIPsList = req.AllowedIPs
		}
	}
	if req.UkeyID != "" {
		user.UkeyID = req.UkeyID
	}
	if req.Name != "" {
		user.Name = req.Name
	}
	if req.LastLoginIP != "" {
		user.LastLoginIP = req.LastLoginIP
	}
	// 布尔字段直接赋值，不需要检查是否为空
	user.IsHide = req.IsHide
	user.IsDeleted = req.IsDeleted
	if req.Permissions != nil {
		user.Permissions = req.Permissions
	}
	user.UpdatedAt = time.Now()
}

// ModelToResponse 将模型转换为响应
func (c *UserConverter) ModelToResponse(user *model.User) *response.UserResponse {
	resp := &response.UserResponse{
		ID:             user.ID,
		Username:       user.Username,
		Email:          user.Email,
		Role:           user.Role,
		Avatar:         user.Avatar,
		Department:     user.Department,
		DepartmentName: user.DepartmentName,
		Position:       user.Position,
		Phone:          user.Phone,
		Status:         user.Status,
		SecurityLevel:  user.SecurityLevel,
		UkeyID:         user.UkeyID,
		Name:           user.Name,
		LastLoginIP:    user.LastLoginIP,
		IsHide:         user.IsHide,
		IsDeleted:      user.IsDeleted,
		CreatedAt:      user.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      user.UpdatedAt.Format(time.RFC3339),
		Permissions:    user.Permissions,
	}

	// 解析AllowedIPs
	if len(user.AllowedIPsList) > 0 {
		resp.AllowedIPs = user.AllowedIPsList
	} else if user.AllowedIPs != "" {
		var ips []string
		if err := json.Unmarshal([]byte(user.AllowedIPs), &ips); err == nil {
			resp.AllowedIPs = ips
		} else {
			resp.AllowedIPs = []string{}
		}
	} else {
		resp.AllowedIPs = []string{}
	}

	if user.LastLoginAt != nil {
		lastLogin := user.LastLoginAt.Format(time.RFC3339)
		resp.LastLoginAt = &lastLogin
	}

	return resp
}

// ModelsToResponses 将模型列表转换为响应列表
func (c *UserConverter) ModelsToResponses(users []*model.User) []*response.UserResponse {
	responses := make([]*response.UserResponse, len(users))
	for i, user := range users {
		responses[i] = c.ModelToResponse(user)
	}
	return responses
}

// DepartmentConverter 部门转换器
type DepartmentConverter struct{}

// NewDepartmentConverter 创建部门转换器
func NewDepartmentConverter() *DepartmentConverter {
	return &DepartmentConverter{}
}

// CreateRequestToModel 将创建请求转换为模型
func (c *DepartmentConverter) CreateRequestToModel(req *request.CreateDepartmentRequest) *model.Department {
	now := time.Now()
	return &model.Department{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Code:        req.Code,
		Description: stringToPtr(req.Description),
		ParentID:    req.ParentID,
		ManagerID:   req.ManagerID,
		Phone:       stringToPtr(req.Phone),
		Email:       stringToPtr(req.Email),
		Address:     stringToPtr(req.Address),
		Sort:        req.Sort,
		Status:      model.DepartmentStatusEnabled,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}

// stringToPtr 将字符串转换为指针，空字符串返回nil
func stringToPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// UpdateRequestToModel 将更新请求应用到模型
func (c *DepartmentConverter) UpdateRequestToModel(dept *model.Department, req *request.UpdateDepartmentRequest) {
	if req.Name != "" {
		dept.Name = req.Name
	}
	if req.Code != "" {
		dept.Code = req.Code
	}
	if req.Description != "" {
		dept.Description = stringToPtr(req.Description)
	}
	if req.ParentID != nil {
		dept.ParentID = req.ParentID
	}
	if req.ManagerID != "" {
		dept.ManagerID = req.ManagerID
	}
	if req.Phone != "" {
		dept.Phone = stringToPtr(req.Phone)
	}
	if req.Email != "" {
		dept.Email = stringToPtr(req.Email)
	}
	if req.Address != "" {
		dept.Address = stringToPtr(req.Address)
	}
	if req.Sort != 0 {
		dept.Sort = req.Sort
	}
	if req.Status != "" {
		dept.Status = req.Status
	}
	dept.UpdatedAt = time.Now()
}

// ModelToTreeResponse 将模型转换为树形响应
func (c *DepartmentConverter) ModelToTreeResponse(dept *model.Department, children []response.DepartmentTreeResponse) response.DepartmentTreeResponse {
	return response.DepartmentTreeResponse{
		ID:            dept.ID,
		Name:          dept.Name,
		Code:          dept.Code,
		Description:   dept.Description,
		ParentID:      dept.ParentID,
		ManagerName:   dept.ManagerName,
		Level:         dept.Level,
		Sort:          dept.Sort,
		Status:        dept.Status,
		Phone:         dept.Phone,
		Email:         dept.Email,
		Address:       dept.Address,
		EmployeeCount: dept.EmployeeCount,
		CreatedAt:     dept.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     dept.UpdatedAt.Format(time.RFC3339),
		Children:      children,
	}
}

// FileConverter 文件转换器
type FileConverter struct{}

// NewFileConverter 创建文件转换器
func NewFileConverter() *FileConverter {
	return &FileConverter{}
}

// AuthConverter 认证转换器
type AuthConverter struct{}

// NewAuthConverter 创建认证转换器
func NewAuthConverter() *AuthConverter {
	return &AuthConverter{}
}

// UserToUserInfo 将用户模型转换为用户信息
func (c *AuthConverter) UserToUserInfo(user *model.User) response.UserInfo {
	return response.UserInfo{
		ID:       user.ID,
		Username: user.Username,
		Name:     user.Name,
		Email:    user.Email,
		Role:     user.Role,
		Status:   user.Status,
	}
}

// CreateLoginResponse 创建登录响应
func (c *AuthConverter) CreateLoginResponse(accessToken, refreshToken string, expiresIn int, user *model.User) *response.LoginResponse {
	return &response.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    expiresIn,
		User:         c.UserToUserInfo(user),
	}
}
