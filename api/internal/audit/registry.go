package audit

// registry.go — 资源快照抓取器注册表。
//
// 设计目标：handler 层零埋点，且 before/after 均取自数据库真实值
// （不可由客户端伪造，也不受响应体是否返回对象的影响）。
//
// 依赖方向：
//
//	handler（装配层，持有全部 service）──注册──► audit.Registry
//	middleware ──查询──► audit.Registry        （middleware 不 import service）
//
// 同一个 Fetcher 在业务逻辑执行「前」和「后」各调用一次：
//   - 执行前 → before 快照
//   - 执行后 → after  快照
//
// 这样即便接口响应是 Success(c, nil)（如改状态、改密级、批量操作），
// 也能完整地对比出「从 xx 改成 xx」。
//
// 用法（在 NewHandlers 中集中注册一次）：
//
//	audit.RegisterMany([]string{"PUT", "PATCH", "DELETE"}, "/api/v1/users/:id",
//	    func(c *gin.Context) (any, error) {
//	        return userService.GetUser(c.Param("id"))
//	    })
//
// 未注册的写操作不会丢日志：中间件降级为只记录响应体中的 after_data。

import (
	"sync"

	"github.com/gin-gonic/gin"
)

// Fetcher 返回本次请求所操作资源的当前状态。
//
// 约定：
//   - 返回 (nil, nil) 表示资源不存在（如 DELETE 之后），不视为错误。
//   - 任何 error 都会被静默吞掉，审计不得影响主业务流程。
//   - 实现内部若需要 id，从 c.Param(...) 取；不要读取请求体（body 只能读一次）。
type Fetcher func(c *gin.Context) (any, error)

var (
	mu       sync.RWMutex
	registry = make(map[string]Fetcher)
)

// key 由 HTTP 方法与 gin 路由模板（c.FullPath()）组成，
// 使用模板而非实际 URL，避免为每个 id 注册一次。
func key(method, routePattern string) string {
	return method + " " + routePattern
}

// Register 注册某个写操作的资源抓取器。重复注册时后者覆盖前者。
func Register(method, routePattern string, f Fetcher) {
	mu.Lock()
	defer mu.Unlock()
	registry[key(method, routePattern)] = f
}

// RegisterMany 为同一 Fetcher 批量注册多个 HTTP 方法
// （PUT/PATCH/DELETE 通常共用一个 GetByID）。
func RegisterMany(methods []string, routePattern string, f Fetcher) {
	for _, m := range methods {
		Register(m, routePattern, f)
	}
}

// Lookup 查找匹配的 Fetcher。
func Lookup(method, routePattern string) (Fetcher, bool) {
	mu.RLock()
	defer mu.RUnlock()
	f, ok := registry[key(method, routePattern)]
	return f, ok
}

// Snapshot 执行一次抓取并归一化为 map。
// 抓取失败、资源不存在或未注册，一律返回 nil，调用方据此降级。
func Snapshot(c *gin.Context) map[string]any {
	routePattern := c.FullPath()
	if routePattern == "" {
		return nil
	}

	f, ok := Lookup(c.Request.Method, routePattern)
	if !ok {
		return nil
	}

	data, err := f(c)
	if err != nil || data == nil {
		return nil
	}
	return ToMap(data)
}

// HasFetcher 判断当前请求是否注册了抓取器。
func HasFetcher(c *gin.Context) bool {
	routePattern := c.FullPath()
	if routePattern == "" {
		return false
	}
	_, ok := Lookup(c.Request.Method, routePattern)
	return ok
}

// Count 返回已注册的抓取器数量（便于启动时打点自检）。
func Count() int {
	mu.RLock()
	defer mu.RUnlock()
	return len(registry)
}
