package service

import (
	"context"
	"fmt"
	"admin-seed/internal/common"
	"admin-seed/internal/converter"
	"admin-seed/internal/dto/request"
	"admin-seed/internal/dto/response"
	"admin-seed/internal/model"
	"admin-seed/internal/repository"
	"admin-seed/internal/utils"

	"golang.org/x/crypto/bcrypt"
)

// UserService 用户服务
type UserService struct {
	userRepo      repository.UserRepositoryInterface
	deptRepo      repository.DepartmentRepositoryInterface
	roleRepo      repository.RoleRepositoryInterface
	repoManager   repository.RepositoryManager
	userConverter *converter.UserConverter
	loginTracker  *utils.LoginTracker
	policyChecker *PasswordPolicyChecker
}

// NewUserService 创建用户服务
func NewUserService(userRepo repository.UserRepositoryInterface, deptRepo repository.DepartmentRepositoryInterface, roleRepo repository.RoleRepositoryInterface, loginTracker *utils.LoginTracker, policyChecker *PasswordPolicyChecker, repoManager ...repository.RepositoryManager) *UserService {
	s := &UserService{
		userRepo:      userRepo,
		deptRepo:      deptRepo,
		roleRepo:      roleRepo,
		userConverter: converter.NewUserConverter(),
		loginTracker:  loginTracker,
		policyChecker: policyChecker,
	}
	if len(repoManager) > 0 {
		s.repoManager = repoManager[0]
	}
	return s
}

// AuthenticateUser 用户认证
func (s *UserService) AuthenticateUser(username, password string) (*model.User, error) {
	ctx := context.Background()

	// 检查账户是否锁定
	if s.loginTracker != nil {
		if locked, remaining := s.loginTracker.IsLocked(username); locked {
			return nil, common.NewAppErrorWithDetails(
				common.ERROR_ACCOUNT_LOCKED,
				"账户已锁定，请稍后重试",
				map[string]interface{}{"remaining_seconds": remaining},
			)
		}
	}

	// 根据用户名获取用户
	user, err := s.userRepo.GetByUsername(ctx, username)
	if err != nil {
		// Repository错误直接返回
		if repository.IsNotFoundError(err) {
			s.recordLoginFailure(username)
			remaining := s.getRemainingAttempts(username)
			return nil, common.NewAppErrorWithDetails(
				common.ERROR_LOGIN_FAILED,
				"用户名或密码错误",
				map[string]interface{}{"remaining_attempts": remaining},
			)
		}
		return nil, err
	}

	// 验证密码
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
	if err != nil {
		s.recordLoginFailure(username)
		remaining := s.getRemainingAttempts(username)
		return nil, common.NewAppErrorWithDetails(
			common.ERROR_PASSWORD_INVALID,
			"用户名或密码错误",
			map[string]interface{}{"remaining_attempts": remaining},
		)
	}

	// 检查用户状态
	if user.Status != model.UserStatusActive {
		return nil, common.NewAppError(common.ERROR_ACCESS_DENIED, "用户账号已被禁用，请联系管理员")
	}

	// 登录成功，清除失败记录
	if s.loginTracker != nil {
		s.loginTracker.ClearFailures(username)
	}

	return user, nil
}

// recordLoginFailure 记录登录失败
func (s *UserService) recordLoginFailure(username string) {
	if s.loginTracker == nil || s.policyChecker == nil {
		return
	}
	maxAttempts, lockoutMinutes, _ := s.policyChecker.GetLockoutPolicy()
	s.loginTracker.RecordFailure(username, maxAttempts, lockoutMinutes)
}

// getRemainingAttempts 获取剩余尝试次数
func (s *UserService) getRemainingAttempts(username string) int {
	if s.loginTracker == nil || s.policyChecker == nil {
		return 0
	}
	maxAttempts, _, _ := s.policyChecker.GetLockoutPolicy()
	return s.loginTracker.GetRemainingAttempts(username, maxAttempts)
}

// IsPasswordExpired 检查用户密码是否过期
func (s *UserService) IsPasswordExpired(user *model.User) (bool, error) {
	if s.policyChecker == nil {
		return false, nil
	}
	expired, _, err := s.policyChecker.IsPasswordExpired(user.PasswordChangedAt)
	return expired, err
}

// CreateUser 创建用户
func (s *UserService) CreateUser(req *request.CreateUserRequest) (*response.UserResponse, error) {
	ctx := context.Background()

	// 检查用户名是否已存在
	existingUser, err := s.userRepo.GetByUsername(ctx, req.Username)
	if err != nil && !repository.IsNotFoundError(err) {
		// 数据库错误直接返回
		return nil, err
	}
	if existingUser != nil {
		// 转换为业务错误
		return nil, common.NewAppError(
			common.ERROR_ALREADY_EXISTS,
			"用户名已被占用，请使用其他用户名",
		)
	}

	// 验证角色是否存在并获取角色权限
	role, err := s.roleRepo.GetByCode(ctx, req.Role)
	if err != nil {
		if repository.IsNotFoundError(err) {
			return nil, common.NewAppError(
				common.ERROR_NOT_FOUND,
				"所选角色不存在，请重新选择",
			)
		}
		return nil, err
	}
	if role == nil {
		return nil, common.NewAppError(
			common.ERROR_NOT_FOUND,
			"所选角色不存在，请重新选择",
		)
	}

	// 验证部门是否存在
	var deptName string
	if req.Department != "" {
		dept, err := s.deptRepo.GetByID(ctx, req.Department)
		if err != nil {
			if repository.IsNotFoundError(err) {
				return nil, common.NewAppError(
					common.ERROR_NOT_FOUND,
					"所选部门不存在，请重新选择",
				)
			}
			return nil, err
		}
		if dept == nil {
			return nil, common.NewAppError(
				common.ERROR_NOT_FOUND,
				"所选部门不存在，请重新选择",
			)
		}
		deptName = dept.Name
	}

	// 检查密码强度
	if s.policyChecker != nil {
		result, _ := s.policyChecker.CheckPasswordStrength(req.Password)
		if !result.Valid {
			return nil, common.NewAppError(common.ERROR_PASSWORD_WEAK, result.FormatCheckResult())
		}
	}

	// 转换请求为模型
	user := s.userConverter.CreateRequestToModel(req)
	user.DepartmentName = deptName

	// 如果请求中没有传入permissions，则从角色继承
	if len(req.Permissions) == 0 {
		user.Permissions = role.Permissions
	}

	// 哈希密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, common.NewInternalError(err, "密码加密失败")
	}
	user.Password = string(hashedPassword)

	// 创建用户
	err = s.userRepo.Create(ctx, user)
	if err != nil {
		// Repository错误直接返回，中间件会处理
		return nil, err
	}

	// 转换为响应
	return s.userConverter.ModelToResponse(user), nil
}

// GetUser 获取用户
func (s *UserService) GetUser(id string) (*response.UserResponse, error) {
	ctx := context.Background()

	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		// Repository错误直接返回
		return nil, err
	}
	if user == nil {
		// 兼容旧代码：GetByID可能返回nil而不是错误
		return nil, repository.NewNotFoundError("User", id)
	}

	return s.userConverter.ModelToResponse(user), nil
}

// UpdateUser 更新用户
func (s *UserService) UpdateUser(id string, req *request.UpdateUserRequest) (*response.UserResponse, error) {
	ctx := context.Background()

	// 获取现有用户
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, repository.NewNotFoundError("User", id)
	}

	// 检查用户名是否已被其他用户使用
	if req.Username != "" && req.Username != user.Username {
		existingUser, err := s.userRepo.GetByUsername(ctx, req.Username)
		if err != nil && !repository.IsNotFoundError(err) {
			return nil, err
		}
		if existingUser != nil && existingUser.ID != id {
			return nil, common.NewAppError(
				common.ERROR_ALREADY_EXISTS,
				"用户名已被占用，请使用其他用户名",
			)
		}
	}

	// 验证部门是否存在
	if req.Department != "" && req.Department != user.Department {
		dept, err := s.deptRepo.GetByID(ctx, req.Department)
		if err != nil {
			if repository.IsNotFoundError(err) {
				return nil, common.NewAppError(
					common.ERROR_NOT_FOUND,
					"所选部门不存在，请重新选择",
				)
			}
			return nil, err
		}
		if dept == nil {
			return nil, common.NewAppError(
				common.ERROR_NOT_FOUND,
				"所选部门不存在，请重新选择",
			)
		}
		user.DepartmentName = dept.Name
	}

	// 应用更新
	s.userConverter.UpdateRequestToModel(user, req)

	// 更新用户
	err = s.userRepo.Update(ctx, user)
	if err != nil {
		// Repository错误直接返回
		return nil, err
	}

	return s.userConverter.ModelToResponse(user), nil
}

// DeleteUser 删除用户
func (s *UserService) DeleteUser(id string) error {
	ctx := context.Background()

	// 检查用户是否存在
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if user == nil {
		return repository.NewNotFoundError("User", id)
	}

	// 删除用户
	err = s.userRepo.Delete(ctx, id)
	if err != nil {
		return err
	}

	return nil
}

// ListUsers 获取用户列表
func (s *UserService) ListUsers(filters *request.UserFilters) ([]*response.UserResponse, int64, error) {
	ctx := context.Background()

	users, total, err := s.userRepo.ListWithFilters(ctx, filters)
	if err != nil {
		// Repository错误直接返回
		return nil, 0, err
	}

	// 批量补充 department_name
	s.populateDepartmentNames(ctx, users)

	responses := s.userConverter.ModelsToResponses(users)
	return responses, total, nil
}

// populateDepartmentNames 根据 department ID 批量填充 department_name
func (s *UserService) populateDepartmentNames(ctx context.Context, users []*model.User) {
	if s.deptRepo == nil {
		return
	}

	// 收集需要查询的唯一部门ID
	deptIDs := make(map[string]struct{})
	for _, u := range users {
		if u.Department != "" && u.DepartmentName == "" {
			deptIDs[u.Department] = struct{}{}
		}
	}
	if len(deptIDs) == 0 {
		return
	}

	// 查询部门名称
	deptNameMap := make(map[string]string)
	for id := range deptIDs {
		dept, err := s.deptRepo.GetByID(ctx, id)
		if err == nil && dept != nil {
			deptNameMap[id] = dept.Name
		}
	}

	// 回填
	for _, u := range users {
		if u.Department != "" && u.DepartmentName == "" {
			if name, ok := deptNameMap[u.Department]; ok {
				u.DepartmentName = name
			}
		}
	}
}

// ChangePassword 修改密码
func (s *UserService) ChangePassword(userID string, req *request.ChangePasswordRequest) error {
	ctx := context.Background()

	// 获取用户
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if user == nil {
		return repository.NewNotFoundError("User", userID)
	}

	// 验证旧密码
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword))
	if err != nil {
		return common.NewAppError(common.ERROR_PASSWORD_INVALID, "原密码不正确，请重新输入")
	}

	// 检查新密码强度
	if s.policyChecker != nil {
		result, _ := s.policyChecker.CheckPasswordStrength(req.NewPassword)
		if !result.Valid {
			return common.NewAppError(common.ERROR_PASSWORD_WEAK, result.FormatCheckResult())
		}
	}

	// 哈希新密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return common.NewInternalError(err, "密码加密失败")
	}

	// 更新密码
	err = s.userRepo.UpdatePassword(ctx, userID, string(hashedPassword))
	if err != nil {
		return err
	}

	return nil
}

// UpdateLastLogin 更新最后登录时间
func (s *UserService) UpdateLastLogin(userID string) error {
	ctx := context.Background()

	err := s.userRepo.UpdateLastLogin(ctx, userID)
	if err != nil {
		// 登录时间更新失败不影响主流程，仅记录错误
		return err
	}
	return nil
}

// GetUsersByDepartment 根据部门获取用户列表
func (s *UserService) GetUsersByDepartment(departmentID string) ([]*response.UserResponse, error) {
	ctx := context.Background()

	users, err := s.userRepo.GetByDepartment(ctx, departmentID)
	if err != nil {
		return nil, err
	}

	responses := s.userConverter.ModelsToResponses(users)
	return responses, nil
}

// UpdateSecurityLevel 更新用户安全级别
func (s *UserService) UpdateSecurityLevel(userID, newLevel, updatedBy, updatedByName, reason string) error {
	ctx := context.Background()

	// 验证安全级别
	validLevels := map[string]bool{
		model.SecurityLevelInternal:     true,
		model.SecurityLevelConfidential: true,
		model.SecurityLevelSecret:       true,
		model.SecurityLevelUnknown:      true,
	}

	if !validLevels[newLevel] {
		return common.NewValidationError("无效的安全级别", map[string]interface{}{
			"security_level": newLevel,
			"valid_levels":   []string{model.SecurityLevelInternal, model.SecurityLevelConfidential, model.SecurityLevelSecret, model.SecurityLevelUnknown},
		})
	}

	// 更新安全级别
	err := s.userRepo.UpdateSecurityLevel(ctx, userID, newLevel, updatedBy, updatedByName, reason)
	if err != nil {
		return err
	}

	return nil
}

// BatchDeleteUsers 批量删除用户
func (s *UserService) BatchDeleteUsers(ids []string) error {
	ctx := context.Background()

	// 逐个删除用户
	for _, id := range ids {
		if err := s.userRepo.Delete(ctx, id); err != nil {
			// 如果某个用户不存在，跳过
			if !repository.IsNotFoundError(err) {
				return err
			}
		}
	}

	return nil
}

// ResetPassword 重置用户密码（安全管理员功能）
func (s *UserService) ResetPassword(userID string) error {
	ctx := context.Background()

	// 检查用户是否存在
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if user == nil {
		return repository.NewNotFoundError("User", userID)
	}

	// 生成默认密码：123456
	defaultPassword := "123456"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(defaultPassword), bcrypt.DefaultCost)
	if err != nil {
		return common.NewInternalError(err, "密码加密失败")
	}

	// 更新密码
	err = s.userRepo.UpdatePassword(ctx, userID, string(hashedPassword))
	if err != nil {
		return err
	}

	return nil
}

// UpdateUserStatus 更新用户状态（安全管理员功能）
func (s *UserService) UpdateUserStatus(userID, status string) error {
	ctx := context.Background()

	// 验证状态
	validStatuses := map[string]bool{
		model.UserStatusActive:    true,
		model.UserStatusInactive:  true,
		model.UserStatusSuspended: true,
	}

	if !validStatuses[status] {
		return common.NewValidationError("无效的用户状态", map[string]interface{}{
			"status":         status,
			"valid_statuses": []string{model.UserStatusActive, model.UserStatusInactive, model.UserStatusSuspended},
		})
	}

	// 检查用户是否存在
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if user == nil {
		return repository.NewNotFoundError("User", userID)
	}

	// 更新状态
	user.Status = status
	err = s.userRepo.Update(ctx, user)
	if err != nil {
		return err
	}

	return nil
}

// GetUserStats 获取用户统计信息
func (s *UserService) GetUserStats() (map[string]interface{}, error) {
	ctx := context.Background()

	// 获取各状态用户数
	activeUsers, err := s.userRepo.FindByStatus(ctx, model.UserStatusActive)
	if err != nil {
		return nil, err
	}

	inactiveUsers, err := s.userRepo.FindByStatus(ctx, model.UserStatusInactive)
	if err != nil {
		return nil, err
	}

	suspendedUsers, err := s.userRepo.FindByStatus(ctx, model.UserStatusSuspended)
	if err != nil {
		return nil, err
	}

	// 获取所有用户（用于计算总数和分组统计）
	allUsers, _, err := s.userRepo.ListWithFilters(ctx, &request.UserFilters{})
	if err != nil {
		return nil, err
	}

	// 按角色统计
	byRole := make(map[string]int)
	for _, user := range allUsers {
		byRole[user.Role]++
	}

	// 按密级统计
	bySecurityLevel := make(map[string]int)
	for _, user := range allUsers {
		bySecurityLevel[user.SecurityLevel]++
	}

	stats := map[string]interface{}{
		"total":           len(allUsers),
		"active":          len(activeUsers),
		"inactive":        len(inactiveUsers),
		"suspended":       len(suspendedUsers),
		"byRole":          byRole,
		"bySecurityLevel": bySecurityLevel,
	}

	return stats, nil
}

// BatchUpdateSecurityLevel 批量更新用户密级
func (s *UserService) BatchUpdateSecurityLevel(ids []string, newLevel, updatedBy, updatedByName, reason string) error {
	ctx := context.Background()

	// 验证安全级别
	validLevels := map[string]bool{
		model.SecurityLevelInternal:     true,
		model.SecurityLevelConfidential: true,
		model.SecurityLevelSecret:       true,
		model.SecurityLevelUnknown:      true,
	}

	if !validLevels[newLevel] {
		return common.NewValidationError("无效的安全级别", map[string]interface{}{
			"security_level": newLevel,
			"valid_levels":   []string{model.SecurityLevelInternal, model.SecurityLevelConfidential, model.SecurityLevelSecret, model.SecurityLevelUnknown},
		})
	}

	// 逐个更新密级
	for _, id := range ids {
		if err := s.userRepo.UpdateSecurityLevel(ctx, id, newLevel, updatedBy, updatedByName, reason); err != nil {
			// 如果某个用户不存在，跳过
			if !repository.IsNotFoundError(err) {
				return err
			}
		}
	}

	return nil
}

// BatchUpdateDepartment 批量调整用户部门
func (s *UserService) BatchUpdateDepartment(ids []string, departmentID string) error {
	ctx := context.Background()

	// 验证目标部门是否存在
	dept, err := s.deptRepo.GetByID(ctx, departmentID)
	if err != nil {
		if repository.IsNotFoundError(err) {
			return common.NewAppError(common.ERROR_NOT_FOUND, "目标部门不存在，请重新选择")
		}
		return err
	}
	if dept == nil {
		return common.NewAppError(common.ERROR_NOT_FOUND, "目标部门不存在，请重新选择")
	}

	// 逐个更新用户部门
	for _, id := range ids {
		user, err := s.userRepo.GetByID(ctx, id)
		if err != nil {
			if repository.IsNotFoundError(err) {
				continue // 跳过不存在的用户
			}
			return err
		}

		user.Department = departmentID
		user.DepartmentName = dept.Name
		if err := s.userRepo.Update(ctx, user); err != nil {
			return err
		}
	}

	return nil
}

// BatchImportUsers 批量导入用户
func (s *UserService) BatchImportUsers(req *request.BatchImportUsersRequest) (*response.BatchImportUsersResponse, error) {
	if s.repoManager == nil {
		return nil, common.NewInternalError(nil, "服务未配置事务管理器")
	}

	ctx := context.Background()
	result := &response.BatchImportUsersResponse{}

	// 确定默认密码
	defaultPassword := req.DefaultPassword
	if defaultPassword == "" {
		defaultPassword = "1234QWer"
	}

	// 校验默认密码复杂度
	if s.policyChecker != nil {
		checkResult, _ := s.policyChecker.CheckPasswordStrength(defaultPassword)
		if !checkResult.Valid {
			return nil, common.NewAppError(common.ERROR_PASSWORD_WEAK, fmt.Sprintf("默认密码不符合要求: %s", checkResult.FormatCheckResult()))
		}
	}

	// 验证默认部门是否存在
	if req.Department != "" {
		_, err := s.deptRepo.GetByID(ctx, req.Department)
		if err != nil {
			if repository.IsNotFoundError(err) {
				return nil, common.NewAppError(common.ERROR_NOT_FOUND, "所选部门不存在，请重新选择")
			}
			return nil, err
		}
	}

	// 事务内批量创建
	err := repository.ExecuteInTransaction(ctx, s.repoManager, func(tx repository.Transaction) error {
		for i, item := range req.Users {
			index := i + 1

			// 校验用户名必填
			if item.Username == "" {
				result.FailCount++
				result.Failures = append(result.Failures, response.ImportFailureItem{
					Index: index, Username: item.Username, Reason: "用户名不能为空",
				})
				continue
			}

			// 检查用户名是否已存在
			_, err := tx.User().GetByUsername(ctx, item.Username)
			if err == nil {
				result.FailCount++
				result.Failures = append(result.Failures, response.ImportFailureItem{
					Index: index, Username: item.Username, Reason: "用户名已存在",
				})
				continue
			}
			if !repository.IsNotFoundError(err) {
				return fmt.Errorf("第%d行查询用户名失败: %w", index, err)
			}

			// 确定密码
			password := item.Password
			if password == "" {
				password = defaultPassword
			} else if s.policyChecker != nil {
				// 单条自定义密码也要校验复杂度
				checkResult, _ := s.policyChecker.CheckPasswordStrength(password)
				if !checkResult.Valid {
					result.FailCount++
					result.Failures = append(result.Failures, response.ImportFailureItem{
						Index: index, Username: item.Username, Reason: fmt.Sprintf("密码不符合要求: %s", checkResult.FormatCheckResult()),
					})
					continue
				}
			}
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
			if err != nil {
				return fmt.Errorf("第%d行密码加密失败: %w", index, err)
			}

			// 确定部门
			department := item.Department
			if department == "" {
				department = req.Department
			}

			// 确定角色
			role := item.Role
			if role == "" {
				role = model.RoleUser
			}

			// 确定密级
			securityLevel := item.SecurityLevel
			if securityLevel == "" {
				securityLevel = model.SecurityLevelUnknown
			}

			// 构建创建请求并转换
			createReq := &request.CreateUserRequest{
				Username:      item.Username,
				Password:      password,
				Name:          item.Name,
				Email:         item.Email,
				Role:          role,
				Department:    department,
				Position:      item.Position,
				Phone:         item.Phone,
				Status:        model.UserStatusActive,
				SecurityLevel: securityLevel,
			}
			user := s.userConverter.CreateRequestToModel(createReq)
			user.Password = string(hashedPassword)

			// 从角色继承权限
			roleEntity, err := tx.Role().GetByCode(ctx, role)
			if err == nil && roleEntity != nil {
				user.Permissions = roleEntity.Permissions
			}

			// 创建用户
			if err := tx.User().Create(ctx, user); err != nil {
				result.FailCount++
				result.Failures = append(result.Failures, response.ImportFailureItem{
					Index: index, Username: item.Username, Reason: fmt.Sprintf("创建失败: %v", err),
				})
				continue
			}

			result.SuccessCount++
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}
