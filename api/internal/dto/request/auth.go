package request

// LoginRequest 登录请求
type LoginRequest struct {
	Username string `json:"username" binding:"required" validate:"required"`
	Password string `json:"password" binding:"required" validate:"required"`
}

// RefreshTokenRequest 刷新Token请求
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required" validate:"required"`
}

// ChangePasswordRequest 修改密码请求
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required" validate:"required"`
	NewPassword string `json:"new_password" binding:"required" validate:"required"`
}

// ForceChangePasswordRequest 强制修改密码请求（密码过期场景）
type ForceChangePasswordRequest struct {
	UserID      string `json:"user_id" binding:"required" validate:"required"`
	OldPassword string `json:"old_password" binding:"required" validate:"required"`
	NewPassword string `json:"new_password" binding:"required" validate:"required"`
}

// FileUploadRequest 文件上传请求
type FileUploadRequest struct {
	MeetingID string `json:"meeting_id" form:"meeting_id" validate:"required"`
	// 文件通过 multipart/form-data 上传
}
