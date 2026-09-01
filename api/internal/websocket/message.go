package websocket

import "time"

// MessageType 消息类型
type MessageType string

const (
	// 设备相关消息
	MessageTypeDeviceOnline  MessageType = "device_online"  // 设备上线
	MessageTypeDeviceOffline MessageType = "device_offline" // 设备下线
	MessageTypeDeviceUpdate  MessageType = "device_update"  // 设备信息更新

	// 系统相关消息
	MessageTypeSystemNotify MessageType = "system_notify" // 系统通知
	MessageTypeHeartbeat    MessageType = "heartbeat"     // 心跳

	// 会议相关消息（预留）
	MessageTypeMeetingCreate MessageType = "meeting_create" // 会议创建
	MessageTypeMeetingUpdate MessageType = "meeting_update" // 会议更新
	MessageTypeMeetingDelete MessageType = "meeting_delete" // 会议删除

	// 同步相关消息
	MessageTypeSyncProgress MessageType = "sync_progress" // 同步进度

	// 归档相关消息
	MessageTypeArchiveStart    MessageType = "archive_start"    // 归档开始
	MessageTypeArchiveComplete MessageType = "archive_complete" // 归档完成
	MessageTypeArchiveFailed   MessageType = "archive_failed"   // 归档失败
)

// Message WebSocket 消息结构
type Message struct {
	Type      MessageType `json:"type"`                // 消息类型
	Data      interface{} `json:"data"`                // 消息数据
	Timestamp int64       `json:"timestamp"`           // 时间戳
	RequestID string      `json:"requestId,omitempty"` // 请求ID（可选）
}

// NewMessage 创建新消息
func NewMessage(msgType MessageType, data interface{}) *Message {
	return &Message{
		Type:      msgType,
		Data:      data,
		Timestamp: time.Now().UnixMilli(),
	}
}

// DeviceOnlineData 设备上线消息数据
type DeviceOnlineData struct {
	SerialNumber string `json:"serialNumber"` // 设备序列号
	DeviceName   string `json:"deviceName"`   // 设备名称
	MountPath    string `json:"mountPath"`    // 挂载路径
	IsRegistered bool   `json:"isRegistered"` // 是否已注册
}

// DeviceOfflineData 设备下线消息数据
type DeviceOfflineData struct {
	SerialNumber string `json:"serialNumber"` // 设备序列号
	DeviceName   string `json:"deviceName"`   // 设备名称
}

// SystemNotifyData 系统通知消息数据
type SystemNotifyData struct {
	Title   string `json:"title"`   // 通知标题
	Content string `json:"content"` // 通知内容
	Level   string `json:"level"`   // 通知级别: info, warning, error
}

// HeartbeatData 心跳消息数据
type HeartbeatData struct {
	ServerTime int64 `json:"serverTime"` // 服务器时间
}

// SyncProgressData 同步进度数据
type SyncProgressData struct {
	TaskID      string  `json:"task_id"`      // 任务ID
	Progress    float64 `json:"progress"`     // 进度百分比 (0-100)
	Speed       string  `json:"speed"`        // 速度 (如 "10 MB/s")
	ETA         string  `json:"eta"`          // 预计剩余时间 (如 "2m30s")
	CurrentFile string  `json:"current_file"` // 当前文件
}

// ArchiveNotifyData 归档通知数据
type ArchiveNotifyData struct {
	DeviceSerial    string `json:"device_serial"`           // 设备序列号
	MeetingCount    int    `json:"meeting_count"`           // 处理的会议数量
	SignaturesCount int    `json:"signatures_count"`        // 签到数
	VotesCount      int    `json:"votes_count"`             // 投票记录数
	AuditLogsCount  int    `json:"audit_logs_count"`        // 审计日志数
	ErrorMessage    string `json:"error_message,omitempty"` // 错误信息
}
