package response

import "time"

// APIResponse 统一API响应格式
type APIResponse struct {
	Code      int         `json:"code"`
	Message   string      `json:"message"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
	RequestID string      `json:"request_id,omitempty"`
}

// PaginatedResponse 分页响应格式
type PaginatedResponse struct {
	Items      interface{} `json:"items"`
	Page       int         `json:"page"`
	Size       int         `json:"size"`
	Total      int64       `json:"total"`
	TotalPages int         `json:"total_pages"`
}

// HealthResponse 健康检查响应
type HealthResponse struct {
	Status    string            `json:"status"`
	Version   string            `json:"version"`
	Timestamp time.Time         `json:"timestamp"`
	Services  map[string]string `json:"services"`
}

// ErrorResponse 错误响应
type ErrorResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// TokenValidationResponse Token验证响应
type TokenValidationResponse struct {
	Valid     bool   `json:"valid"`
	UserID    string `json:"user_id"`
	Username  string `json:"username"`
	Role      string `json:"role"`
	ExpiresAt string `json:"expires_at"`
	IssuedAt  string `json:"issued_at"`
}

// UserInfo 用户信息
type UserInfo struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Name     string `json:"name"`
	Email    string `json:"email,omitempty"`
	Role     string `json:"role"`
	Status   string `json:"status"`
}

// LoginResponse 登录响应
type LoginResponse struct {
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token"`
	TokenType    string   `json:"token_type"`
	ExpiresIn    int      `json:"expires_in"`
	User         UserInfo `json:"user"`
}

// FileInfo 文件信息
type FileInfo struct {
	ID            string `json:"id"`
	OriginalName  string `json:"original_name"`
	FilePath      string `json:"file_path,omitempty"`
	FileSize      int64  `json:"file_size"`
	EncryptedSize int64  `json:"encrypted_size"`
	MimeType      string `json:"mime_type"`
	Checksum      string `json:"checksum"`
	MeetingID     string `json:"meeting_id,omitempty"`
	AgendaID      string `json:"agenda_id,omitempty"`
	SecurityLevel string `json:"security_level,omitempty"`
	UploadedBy    string `json:"uploaded_by"`
	OrderNum      int    `json:"order_num"`
	Status        int    `json:"status"`
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
}
