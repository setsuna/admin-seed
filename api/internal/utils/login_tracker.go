package utils

import (
	"sync"
	"time"
)

// LoginAttempt 登录尝试记录
type LoginAttempt struct {
	FailCount   int
	LockedUntil time.Time
}

// LoginTracker 登录追踪器（内存存储）
type LoginTracker struct {
	mu       sync.RWMutex
	attempts map[string]*LoginAttempt
}

// NewLoginTracker 创建登录追踪器
func NewLoginTracker() *LoginTracker {
	return &LoginTracker{
		attempts: make(map[string]*LoginAttempt),
	}
}

// IsLocked 检查账户是否被锁定，返回是否锁定和剩余锁定秒数
func (t *LoginTracker) IsLocked(username string) (bool, int) {
	t.mu.RLock()
	defer t.mu.RUnlock()

	attempt, exists := t.attempts[username]
	if !exists {
		return false, 0
	}

	if attempt.LockedUntil.After(time.Now()) {
		remaining := int(time.Until(attempt.LockedUntil).Seconds())
		return true, remaining
	}

	return false, 0
}

// RecordFailure 记录登录失败，返回是否触发锁定
func (t *LoginTracker) RecordFailure(username string, maxAttempts int, lockoutMinutes int) (locked bool, failCount int) {
	t.mu.Lock()
	defer t.mu.Unlock()

	attempt, exists := t.attempts[username]
	if !exists {
		attempt = &LoginAttempt{}
		t.attempts[username] = attempt
	}

	// 如果锁定已过期，重置计数
	if attempt.LockedUntil.Before(time.Now()) && attempt.FailCount >= maxAttempts {
		attempt.FailCount = 0
	}

	attempt.FailCount++

	if attempt.FailCount >= maxAttempts {
		attempt.LockedUntil = time.Now().Add(time.Duration(lockoutMinutes) * time.Minute)
		return true, attempt.FailCount
	}

	return false, attempt.FailCount
}

// ClearFailures 清除失败记录（登录成功时调用）
func (t *LoginTracker) ClearFailures(username string) {
	t.mu.Lock()
	defer t.mu.Unlock()

	delete(t.attempts, username)
}

// GetFailCount 获取当前失败次数
func (t *LoginTracker) GetFailCount(username string) int {
	t.mu.RLock()
	defer t.mu.RUnlock()

	attempt, exists := t.attempts[username]
	if !exists {
		return 0
	}
	return attempt.FailCount
}

// GetRemainingAttempts 获取剩余尝试次数
func (t *LoginTracker) GetRemainingAttempts(username string, maxAttempts int) int {
	failCount := t.GetFailCount(username)
	remaining := maxAttempts - failCount
	if remaining < 0 {
		return 0
	}
	return remaining
}
