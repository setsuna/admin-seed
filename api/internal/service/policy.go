package service

import (
	"context"
	"encoding/json"
	"fmt"
	"admin-seed/internal/common"
	"admin-seed/internal/converter"
	"admin-seed/internal/dto/request"
	"admin-seed/internal/dto/response"
	"admin-seed/internal/repository"
	"time"
)

// PolicyService 策略配置服务
type PolicyService struct {
	policyRepo       repository.PolicyRepositoryInterface
	operationLogRepo repository.OperationLogRepositoryInterface
	policyConverter  *converter.PolicyConverter
}

// NewPolicyService 创建策略配置服务
func NewPolicyService(repoManager repository.RepositoryManager) *PolicyService {
	return &PolicyService{
		policyRepo:       repoManager.Policy(),
		operationLogRepo: repoManager.OperationLog(),
		policyConverter:  converter.NewPolicyConverter(),
	}
}

// GetPolicy 获取当前策略配置
func (s *PolicyService) GetPolicy(ctx context.Context) (*response.PolicyResponse, error) {
	policy, err := s.policyRepo.Get(ctx)
	if err != nil {
		// 如果没有配置，返回默认配置
		if repository.IsNotFoundError(err) {
			defaultPolicy, err := s.policyRepo.GetDefault(ctx)
			if err != nil {
				return nil, err
			}
			return s.policyConverter.ModelToResponse(defaultPolicy), nil
		}
		return nil, err
	}

	return s.policyConverter.ModelToResponse(policy), nil
}

// UpdatePolicy 更新策略配置
func (s *PolicyService) UpdatePolicy(ctx context.Context, req *request.UpdatePolicyRequest) (*response.PolicyResponse, error) {
	// 获取现有配置
	existing, err := s.policyRepo.Get(ctx)
	if err != nil {
		if !repository.IsNotFoundError(err) {
			return nil, err
		}
		// 没有现有配置，创建新的
		existing = nil
	}

	// 转换请求为模型
	policy := s.policyConverter.RequestToModel(req, existing)

	// 更新数据库
	if err := s.policyRepo.Update(ctx, policy); err != nil {
		return nil, err
	}

	// 返回更新后的配置
	return s.GetPolicy(ctx)
}

// ValidatePolicy 验证策略配置
func (s *PolicyService) ValidatePolicy(ctx context.Context, req *request.UpdatePolicyRequest) error {
	// 验证登录时间范围
	if req.AllowedLoginHours.Enabled {
		if req.AllowedLoginHours.Start == "" || req.AllowedLoginHours.End == "" {
			return common.NewValidationError("启用登录时间限制时，必须指定开始和结束时间", nil)
		}
	}

	// 验证维护窗口
	if req.MaintenanceWindow.Enabled {
		if req.MaintenanceWindow.Start == "" || req.MaintenanceWindow.End == "" {
			return common.NewValidationError("启用维护窗口时，必须指定开始和结束时间", nil)
		}
	}

	// 验证密码策略至少有一项复杂度要求
	if !req.PasswordPolicy.RequireUppercase &&
		!req.PasswordPolicy.RequireLowercase &&
		!req.PasswordPolicy.RequireNumbers &&
		!req.PasswordPolicy.RequireSpecialChars {
		return common.NewValidationError("密码策略至少需要启用一项复杂度要求", nil)
	}

	return nil
}

// ExportPolicy 导出策略配置
func (s *PolicyService) ExportPolicy(ctx context.Context) ([]byte, error) {
	policy, err := s.GetPolicy(ctx)
	if err != nil {
		return nil, err
	}

	// 转换为格式化的 JSON
	data, err := json.MarshalIndent(policy, "", "  ")
	if err != nil {
		return nil, common.NewAppError(common.ERROR_INTERNAL_SERVER, "导出配置失败")
	}

	return data, nil
}

// GetDefaultPolicy 获取默认策略配置
func (s *PolicyService) GetDefaultPolicy(ctx context.Context) (*response.PolicyResponse, error) {
	defaultPolicy, err := s.policyRepo.GetDefault(ctx)
	if err != nil {
		return nil, err
	}

	return s.policyConverter.ModelToResponse(defaultPolicy), nil
}

// CheckAlerts 检查告警
func (s *PolicyService) CheckAlerts(ctx context.Context) (*response.AlertCheckResponse, error) {
	alerts := make([]response.AlertItem, 0)

	// 获取策略配置
	policy, err := s.policyRepo.Get(ctx)
	if err != nil {
		if repository.IsNotFoundError(err) {
			// 没有配置，使用默认值
			policy, _ = s.policyRepo.GetDefault(ctx)
		} else {
			return nil, err
		}
	}

	// 检查日志存储告警
	logCount, err := s.operationLogRepo.CountAll(ctx)
	if err != nil {
		return nil, err
	}

	remaining := int64(policy.AuditLogMaxCount) - logCount
	if remaining <= int64(policy.AuditLogAlertThreshold) {
		alerts = append(alerts, response.AlertItem{
			Type:     "audit_log_storage",
			Severity: "high",
			Title:    "日志存储空间不足",
			Message:  fmt.Sprintf("审计日志剩余可用条数不足（剩余%d条），请联系管理员清理", remaining),
		})
	}

	// 未来可以在这里添加其他类型的告警检查

	return &response.AlertCheckResponse{
		HasAlert: len(alerts) > 0,
		Alerts:   alerts,
	}, nil
}

// GetAuditLogStats 获取审计日志统计信息
func (s *PolicyService) GetAuditLogStats(ctx context.Context) (*response.AuditLogStatsResponse, error) {
	// 获取策略配置
	policy, err := s.policyRepo.Get(ctx)
	if err != nil {
		if repository.IsNotFoundError(err) {
			policy, _ = s.policyRepo.GetDefault(ctx)
		} else {
			return nil, err
		}
	}

	// 统计日志数量
	logCount, err := s.operationLogRepo.CountAll(ctx)
	if err != nil {
		return nil, err
	}

	remaining := int64(policy.AuditLogMaxCount) - logCount
	if remaining < 0 {
		remaining = 0
	}

	usagePercent := float64(logCount) / float64(policy.AuditLogMaxCount) * 100

	return &response.AuditLogStatsResponse{
		MaxCount:       policy.AuditLogMaxCount,
		UsedCount:      logCount,
		RemainingCount: remaining,
		UsagePercent:   usagePercent,
		AlertThreshold: policy.AuditLogAlertThreshold,
		IsAlert:        remaining <= int64(policy.AuditLogAlertThreshold),
		RetentionDays:  policy.AuditLogRetentionDays,
	}, nil
}

// PurgeAuditLogs 覆盖指定月份之前的日志
func (s *PolicyService) PurgeAuditLogs(ctx context.Context, months int) (*response.PurgeAuditLogsResponse, error) {
	// 计算截止时间
	beforeTime := time.Now().AddDate(0, -months, 0).Format("2006-01-02 15:04:05")

	// 删除日志
	deletedCount, err := s.operationLogRepo.DeleteBefore(ctx, beforeTime)
	if err != nil {
		return nil, common.NewAppError(common.ERROR_DATABASE_ERROR, "清理日志失败")
	}

	return &response.PurgeAuditLogsResponse{
		DeletedCount: deletedCount,
	}, nil
}
