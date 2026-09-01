package service

import (
	"context"
	"fmt"
	"admin-seed/internal/model"
	"admin-seed/internal/repository"
	"regexp"
	"strings"
	"time"
)

// PasswordPolicyChecker 密码策略检查器
type PasswordPolicyChecker struct {
	policyRepo repository.PolicyRepositoryInterface
}

// NewPasswordPolicyChecker 创建密码策略检查器
func NewPasswordPolicyChecker(policyRepo repository.PolicyRepositoryInterface) *PasswordPolicyChecker {
	return &PasswordPolicyChecker{
		policyRepo: policyRepo,
	}
}

// PasswordCheckResult 密码检查结果
type PasswordCheckResult struct {
	Valid    bool
	Messages []string
}

// CheckPasswordStrength 检查密码强度
func (c *PasswordPolicyChecker) CheckPasswordStrength(password string) (*PasswordCheckResult, error) {
	ctx := context.Background()
	policy, err := c.policyRepo.Get(ctx)
	if err != nil {
		// 如果获取策略失败，使用默认策略
		policy, _ = c.policyRepo.GetDefault(ctx)
	}

	result := &PasswordCheckResult{Valid: true}

	// 检查最小长度
	if len(password) < policy.PasswordMinLength {
		result.Valid = false
		result.Messages = append(result.Messages, fmt.Sprintf("密码长度至少为 %d 位", policy.PasswordMinLength))
	}

	// 检查大写字母
	if policy.PasswordRequireUppercase {
		if !regexp.MustCompile(`[A-Z]`).MatchString(password) {
			result.Valid = false
			result.Messages = append(result.Messages, "密码必须包含大写字母")
		}
	}

	// 检查小写字母
	if policy.PasswordRequireLowercase {
		if !regexp.MustCompile(`[a-z]`).MatchString(password) {
			result.Valid = false
			result.Messages = append(result.Messages, "密码必须包含小写字母")
		}
	}

	// 检查数字
	if policy.PasswordRequireNumbers {
		if !regexp.MustCompile(`[0-9]`).MatchString(password) {
			result.Valid = false
			result.Messages = append(result.Messages, "密码必须包含数字")
		}
	}

	// 检查特殊字符
	if policy.PasswordRequireSpecialChars {
		if !regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`).MatchString(password) {
			result.Valid = false
			result.Messages = append(result.Messages, "密码必须包含特殊字符")
		}
	}

	return result, nil
}

// IsPasswordExpired 检查密码是否过期
func (c *PasswordPolicyChecker) IsPasswordExpired(passwordChangedAt *time.Time) (bool, int, error) {
	ctx := context.Background()
	policy, err := c.policyRepo.Get(ctx)
	if err != nil {
		policy, _ = c.policyRepo.GetDefault(ctx)
	}

	// 如果更换周期为0，表示不限制
	if policy.PasswordChangeIntervalDays <= 0 {
		return false, 0, nil
	}

	// 如果从未修改过密码，视为过期
	if passwordChangedAt == nil {
		return true, 0, nil
	}

	expireTime := passwordChangedAt.AddDate(0, 0, policy.PasswordChangeIntervalDays)
	if time.Now().After(expireTime) {
		return true, 0, nil
	}

	// 返回剩余天数
	daysRemaining := int(time.Until(expireTime).Hours() / 24)
	return false, daysRemaining, nil
}

// GetLockoutPolicy 获取锁定策略
func (c *PasswordPolicyChecker) GetLockoutPolicy() (maxAttempts int, lockoutMinutes int, error error) {
	ctx := context.Background()
	policy, err := c.policyRepo.Get(ctx)
	if err != nil {
		policy, _ = c.policyRepo.GetDefault(ctx)
	}

	return policy.PasswordMaxFailAttempts, policy.PasswordLockoutDuration, nil
}

// FormatCheckResult 格式化检查结果为字符串
func (r *PasswordCheckResult) FormatCheckResult() string {
	if r.Valid {
		return ""
	}
	return strings.Join(r.Messages, "；")
}

// GetPolicy 获取当前策略
func (c *PasswordPolicyChecker) GetPolicy() (*model.SecurityPolicy, error) {
	ctx := context.Background()
	policy, err := c.policyRepo.Get(ctx)
	if err != nil {
		return c.policyRepo.GetDefault(ctx)
	}
	return policy, nil
}
