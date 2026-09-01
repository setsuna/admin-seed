package middleware

import (
	"context"
	"net/http"
	"sync"
	"time"

	"admin-seed/internal/config"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// 限流器清理相关默认值。
// limiters map 按 key（userID 或 IP）只增不减会造成内存泄漏，
// 因此由后台 goroutine 定期淘汰长时间未使用的条目。
const (
	// defaultCleanupInterval 后台清理任务的执行间隔
	defaultCleanupInterval = 5 * time.Minute
	// defaultLimiterTTL 限流器条目的空闲存活时长，超过该时长未访问则被淘汰
	defaultLimiterTTL = 10 * time.Minute
)

// limiterEntry 单个限流器条目，附带最后访问时间用于空闲淘汰
type limiterEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// RateLimiter 限流器
//
// 内部维护 key -> limiter 的映射。key 的语义由调用方决定：
// 认证后的请求使用 userID，未认证请求回退为客户端 IP。
type RateLimiter struct {
	limiters map[string]*limiterEntry
	mu       sync.Mutex
	rps      rate.Limit
	burst    int

	// stopOnce 保证 Stop 可以被重复调用而不会 panic
	stopOnce sync.Once
	stopCh   chan struct{}
}

// NewRateLimiter 创建限流器（不启动清理 goroutine）
func NewRateLimiter(cfg *config.RateLimitConfig) *RateLimiter {
	return newRateLimiter(rate.Limit(cfg.RPS), cfg.Burst)
}

// newRateLimiter 内部构造函数
func newRateLimiter(rps rate.Limit, burst int) *RateLimiter {
	return &RateLimiter{
		limiters: make(map[string]*limiterEntry),
		rps:      rps,
		burst:    burst,
		stopCh:   make(chan struct{}),
	}
}

// StartCleanup 启动后台清理 goroutine，定期淘汰空闲的限流器条目。
//
// 生命周期可控：ctx 取消或调用 Stop() 时 goroutine 会退出，
// 便于服务优雅关闭时不残留 goroutine。
func (rl *RateLimiter) StartCleanup(ctx context.Context, interval, ttl time.Duration) {
	if interval <= 0 {
		interval = defaultCleanupInterval
	}
	if ttl <= 0 {
		ttl = defaultLimiterTTL
	}

	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				rl.cleanup(ttl)
			case <-ctx.Done():
				return
			case <-rl.stopCh:
				return
			}
		}
	}()
}

// Stop 停止清理 goroutine（幂等）
func (rl *RateLimiter) Stop() {
	rl.stopOnce.Do(func() {
		close(rl.stopCh)
	})
}

// cleanup 淘汰超过 ttl 未被访问的限流器条目。
// 与 getLimiter 共用同一把互斥锁，保证并发安全。
func (rl *RateLimiter) cleanup(ttl time.Duration) {
	cutoff := time.Now().Add(-ttl)

	rl.mu.Lock()
	defer rl.mu.Unlock()

	for key, entry := range rl.limiters {
		if entry.lastSeen.Before(cutoff) {
			delete(rl.limiters, key)
		}
	}
}

// Size 返回当前限流器条目数（用于观测/调试，验证清理是否生效）
func (rl *RateLimiter) Size() int {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	return len(rl.limiters)
}

// getLimiter 获取或创建限流器，并刷新最后访问时间。
//
// 这里统一使用互斥锁而非读写锁：因为每次访问都需要写入 lastSeen，
// 读写锁的读路径无法避免写操作，反而增加复杂度。
func (rl *RateLimiter) getLimiter(key string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	entry, exists := rl.limiters[key]
	if !exists {
		entry = &limiterEntry{
			limiter: rate.NewLimiter(rl.rps, rl.burst),
		}
		rl.limiters[key] = entry
	}
	entry.lastSeen = time.Now()

	return entry.limiter
}

// createRateLimitErrorResponse 创建限流错误响应
func createRateLimitErrorResponse(code int, message string, requestID string) gin.H {
	return gin.H{
		"code":      code,
		"message":   message,
		"data":      nil,
		"timestamp": time.Now().Unix(),
		"requestId": requestID,
	}
}

// rateLimitKey 计算限流 key。
//
// 有意的分层设计：
//   - 已认证请求：按 userID 限流。内网部署下多个用户常共享同一网关 IP，
//     若按 IP 限流会导致用户之间互相拖累配额。
//   - 未认证请求：回退按客户端 IP 限流。此时没有用户身份可用，
//     且登录等未认证端点恰恰需要按来源 IP 防爆破，因此 IP 回退是必要的保护而非降级。
func rateLimitKey(c *gin.Context) string {
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(string); ok && id != "" {
			return "user:" + id
		}
	}
	return "ip:" + c.ClientIP()
}

// RateLimit 限流中间件。
//
// 注意：应挂载到 /api/v1 路由组而非全局，避免静态资源（/assets/*）
// 与 API 争抢同一份令牌桶配额。
//
// 返回中间件与对应的 RateLimiter，调用方负责启动清理与优雅关闭。
// 当限流未启用时返回的 RateLimiter 为 nil。
func RateLimit(cfg *config.RateLimitConfig) (gin.HandlerFunc, *RateLimiter) {
	if !cfg.Enable {
		return func(c *gin.Context) {
			c.Next()
		}, nil
	}

	limiter := NewRateLimiter(cfg)

	handler := func(c *gin.Context) {
		key := rateLimitKey(c)

		if !limiter.getLimiter(key).Allow() {
			requestID := GetRequestID(c)
			response := createRateLimitErrorResponse(
				http.StatusTooManyRequests,
				"请求过于频繁，请稍后再试",
				requestID,
			)
			c.JSON(http.StatusTooManyRequests, response)
			c.Abort()
			return
		}

		c.Next()
	}

	return handler, limiter
}

// IPRateLimit 基于IP的限流中间件（供需要强制按 IP 限流的端点单独使用）
func IPRateLimit(rps float64, burst int) (gin.HandlerFunc, *RateLimiter) {
	limiter := newRateLimiter(rate.Limit(rps), burst)

	handler := func(c *gin.Context) {
		ip := c.ClientIP()

		if !limiter.getLimiter(ip).Allow() {
			requestID := GetRequestID(c)
			response := createRateLimitErrorResponse(
				http.StatusTooManyRequests,
				"IP请求过于频繁",
				requestID,
			)
			c.JSON(http.StatusTooManyRequests, response)
			c.Abort()
			return
		}

		c.Next()
	}

	return handler, limiter
}

// UserRateLimit 基于用户的限流中间件（未认证时回退按 IP，理由见 rateLimitKey 注释）
func UserRateLimit(rps float64, burst int) (gin.HandlerFunc, *RateLimiter) {
	limiter := newRateLimiter(rate.Limit(rps), burst)

	handler := func(c *gin.Context) {
		key := rateLimitKey(c)

		if !limiter.getLimiter(key).Allow() {
			requestID := GetRequestID(c)
			response := createRateLimitErrorResponse(
				http.StatusTooManyRequests,
				"用户请求过于频繁",
				requestID,
			)
			c.JSON(http.StatusTooManyRequests, response)
			c.Abort()
			return
		}

		c.Next()
	}

	return handler, limiter
}
