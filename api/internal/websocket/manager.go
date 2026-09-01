package websocket

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

// Client WebSocket 客户端信息
type Client struct {
	Conn          *websocket.Conn
	UserID        string                 // 用户ID
	Username      string                 // 用户名
	Roles         []string               // 用户角色
	Permissions   []string               // 用户权限
	Send          chan []byte            // 发送消息通道
	LastHeartbeat time.Time              // 最后心跳时间
	Metadata      map[string]interface{} // 额外元数据
}

// Manager WebSocket 管理器
type Manager struct {
	clients    map[*Client]bool   // 已连接的客户端
	broadcast  chan *Message      // 广播消息通道
	register   chan *Client       // 注册客户端通道
	unregister chan *Client       // 注销客户端通道
	mu         sync.RWMutex       // 读写锁
	logger     *zap.Logger        // 日志
	ctx        context.Context    // 上下文
	cancel     context.CancelFunc // 取消函数
}

// NewManager 创建 WebSocket 管理器
func NewManager(logger *zap.Logger) *Manager {
	ctx, cancel := context.WithCancel(context.Background())

	manager := &Manager{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan *Message, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		logger:     logger,
		ctx:        ctx,
		cancel:     cancel,
	}

	// 启动管理器
	go manager.run()
	// 启动心跳检查
	go manager.heartbeatChecker()

	return manager
}

// run 运行管理器主循环
func (m *Manager) run() {
	for {
		select {
		case <-m.ctx.Done():
			return

		case client := <-m.register:
			m.mu.Lock()
			m.clients[client] = true
			m.mu.Unlock()
			m.logger.Info("WebSocket client connected",
				zap.String("userID", client.UserID),
				zap.String("username", client.Username),
			)

			// 发送欢迎消息
			welcomeMsg := NewMessage(MessageTypeSystemNotify, SystemNotifyData{
				Title:   "连接成功",
				Content: "实时消息服务已连接",
				Level:   "info",
			})
			m.sendToClient(client, welcomeMsg)

		case client := <-m.unregister:
			m.mu.Lock()
			if _, ok := m.clients[client]; ok {
				delete(m.clients, client)
				close(client.Send)
			}
			m.mu.Unlock()
			m.logger.Info("WebSocket client disconnected",
				zap.String("userID", client.UserID),
				zap.String("username", client.Username),
			)

		case message := <-m.broadcast:
			m.broadcastMessage(message)
		}
	}
}

// heartbeatChecker 心跳检查器
func (m *Manager) heartbeatChecker() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	heartbeatMsg := NewMessage(MessageTypeHeartbeat, HeartbeatData{
		ServerTime: time.Now().UnixMilli(),
	})

	for {
		select {
		case <-m.ctx.Done():
			return

		case <-ticker.C:
			// 更新心跳时间戳
			heartbeatMsg.Timestamp = time.Now().UnixMilli()
			if data, ok := heartbeatMsg.Data.(HeartbeatData); ok {
				data.ServerTime = time.Now().UnixMilli()
				heartbeatMsg.Data = data
			}

			m.mu.RLock()
			for client := range m.clients {
				// 检查客户端是否超时（2分钟无响应）
				if time.Since(client.LastHeartbeat) > 2*time.Minute {
					m.logger.Warn("Client heartbeat timeout",
						zap.String("userID", client.UserID),
					)
					go m.UnregisterClient(client)
					continue
				}

				// 发送心跳
				m.sendToClient(client, heartbeatMsg)
			}
			m.mu.RUnlock()
		}
	}
}

// RegisterClient 注册客户端
func (m *Manager) RegisterClient(client *Client) {
	client.LastHeartbeat = time.Now()
	m.register <- client
}

// UnregisterClient 注销客户端
func (m *Manager) UnregisterClient(client *Client) {
	m.unregister <- client
}

// Broadcast 广播消息（所有在线客户端）
func (m *Manager) Broadcast(msgType MessageType, data interface{}) {
	message := NewMessage(msgType, data)

	select {
	case m.broadcast <- message:
	case <-time.After(time.Second):
		m.logger.Warn("Broadcast message timeout", zap.String("type", string(msgType)))
	}
}

// BroadcastToPermission 向有特定权限的用户广播
func (m *Manager) BroadcastToPermission(msgType MessageType, data interface{}, requiredPermission string) {
	message := NewMessage(msgType, data)

	m.mu.RLock()
	defer m.mu.RUnlock()

	for client := range m.clients {
		if m.hasPermission(client, requiredPermission) {
			m.sendToClient(client, message)
		}
	}
}

// BroadcastToRole 向有特定角色的用户广播
func (m *Manager) BroadcastToRole(msgType MessageType, data interface{}, requiredRole string) {
	message := NewMessage(msgType, data)

	m.mu.RLock()
	defer m.mu.RUnlock()

	for client := range m.clients {
		if m.hasRole(client, requiredRole) {
			m.sendToClient(client, message)
		}
	}
}

// broadcastMessage 广播消息到所有客户端
func (m *Manager) broadcastMessage(message *Message) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for client := range m.clients {
		m.sendToClient(client, message)
	}
}

// sendToClient 发送消息到指定客户端
func (m *Manager) sendToClient(client *Client, message *Message) {
	data, err := json.Marshal(message)
	if err != nil {
		m.logger.Error("Failed to marshal message",
			zap.Error(err),
			zap.String("type", string(message.Type)),
		)
		return
	}

	select {
	case client.Send <- data:
	default:
		// 发送通道已满，移除客户端
		m.logger.Warn("Client send channel is full, removing client",
			zap.String("userID", client.UserID),
		)
		go m.UnregisterClient(client)
	}
}

// hasPermission 检查客户端是否有指定权限
func (m *Manager) hasPermission(client *Client, permission string) bool {
	if permission == "" {
		return true
	}

	for _, p := range client.Permissions {
		if p == permission || p == "*" {
			return true
		}
	}

	// 检查是否是管理员角色
	for _, role := range client.Roles {
		if role == "admin" || role == "super_admin" {
			return true
		}
	}

	return false
}

// hasRole 检查客户端是否有指定角色
func (m *Manager) hasRole(client *Client, role string) bool {
	if role == "" {
		return true
	}

	for _, r := range client.Roles {
		if r == role {
			return true
		}
	}

	return false
}

// GetOnlineCount 获取在线客户端数量
func (m *Manager) GetOnlineCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.clients)
}

// GetOnlineUsers 获取在线用户列表
func (m *Manager) GetOnlineUsers() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	users := make([]string, 0, len(m.clients))
	seen := make(map[string]bool)

	for client := range m.clients {
		if !seen[client.UserID] {
			users = append(users, client.Username)
			seen[client.UserID] = true
		}
	}

	return users
}

// Shutdown 关闭管理器
func (m *Manager) Shutdown() {
	m.logger.Info("Shutting down WebSocket manager")
	m.cancel()

	m.mu.Lock()
	defer m.mu.Unlock()

	// 关闭所有客户端连接
	for client := range m.clients {
		close(client.Send)
		client.Conn.Close()
		delete(m.clients, client)
	}
}
