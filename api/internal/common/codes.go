package common

// 业务错误码定义
const (
	// 成功状态码
	SUCCESS = 200

	// 通用错误码 (1xxx)
	ERROR_INVALID_PARAMS    = 1001 // 参数错误
	ERROR_INVALID_REQUEST   = 1002 // 请求格式错误
	ERROR_INVALID_JSON      = 1003 // JSON格式错误
	ERROR_VALIDATION_FAILED = 1004 // 数据验证失败

	// 认证授权错误码 (2xxx)
	ERROR_UNAUTHORIZED          = 2001 // 未授权
	ERROR_TOKEN_INVALID         = 2002 // token无效
	ERROR_TOKEN_EXPIRED         = 2003 // token过期
	ERROR_PERMISSION_DENIED     = 2004 // 权限不足
	ERROR_ACCESS_DENIED         = 2005 // 访问被拒绝
	ERROR_LOGIN_FAILED          = 2006 // 登录失败
	ERROR_USER_NOT_FOUND        = 2007 // 用户不存在
	ERROR_PASSWORD_INVALID      = 2008 // 密码错误
	ERROR_REFRESH_TOKEN_INVALID = 2009 // 刷新token无效
	ERROR_ACCOUNT_LOCKED        = 2010 // 账户已锁定
	ERROR_PASSWORD_EXPIRED      = 2011 // 密码已过期
	ERROR_PASSWORD_WEAK         = 2012 // 密码强度不足

	// 文件操作错误码 (3xxx)
	ERROR_FILE_NOT_FOUND     = 3001 // 文件不存在
	ERROR_FILE_UPLOAD_FAILED = 3002 // 文件上传失败
	ERROR_FILE_TOO_LARGE     = 3003 // 文件过大
	ERROR_FILE_TYPE_INVALID  = 3004 // 文件类型不支持
	ERROR_FILE_SAVE_FAILED   = 3005 // 文件保存失败
	ERROR_FILE_DELETE_FAILED = 3006 // 文件删除失败
	ERROR_FILE_READ_FAILED   = 3007 // 文件读取失败

	// 数据库操作错误码 (4xxx)
	ERROR_DATABASE_ERROR          = 4001 // 数据库错误
	ERROR_RECORD_NOT_FOUND        = 4002 // 记录不存在
	ERROR_RECORD_ALREADY_EXISTS   = 4003 // 记录已存在
	ERROR_DATABASE_CONNECT_FAILED = 4004 // 数据库连接失败

	// 业务逻辑错误码 (5xxx)
	ERROR_MEETING_NOT_FOUND      = 5001 // 会议不存在
	ERROR_MEETING_ALREADY_EXISTS = 5002 // 会议已存在
	ERROR_DICT_NOT_FOUND         = 5003 // 字典项不存在
	ERROR_DICT_ALREADY_EXISTS    = 5004 // 字典项已存在
	ERROR_DICT_CODE_EXISTS       = 5005 // 字典代码已存在
	ERROR_DICT_ITEM_EXISTS       = 5006 // 字典项代码已存在
	ERROR_DICT_ITEM_NOT_FOUND    = 5007 // 字典项不存在
	ERROR_NOT_FOUND              = 5008 // 资源不存在
	ERROR_ALREADY_EXISTS         = 5009 // 资源已存在
	ERROR_OPERATION_FAILED       = 5010 // 操作失败
	ERROR_AGENDA_NOT_FOUND       = 5011 // 议题不存在
	ERROR_AGENDA_INVALID         = 5012 // 议题ID无效
	ERROR_FILE_INVALID           = 5013 // 文件ID无效
	ERROR_SECURITY_LEVEL_INVALID = 5014 // 密级值无效
	ERROR_DEVICE_LIMIT_EXCEEDED  = 5015 // 设备数量超限
	ERROR_NAMEPLATE_INVALID      = 5016 // 铭牌模板包校验失败
	ERROR_NAMEPLATE_NOT_FOUND    = 5017 // 铭牌配置不存在
	ERROR_FONT_INVALID           = 5018 // 字体文件非法
	ERROR_IMAGE_INVALID          = 5019 // 背景图文件非法

	// 授权相关错误码 (6xxx)
	ERROR_LICENSE_INVALID   = 6001 // 授权码无效
	ERROR_LICENSE_EXPIRED   = 6002 // 授权码过期
	ERROR_LICENSE_NOT_FOUND = 6003 // 授权码不存在

	// 系统错误码 (9xxx)
	ERROR_INTERNAL_SERVER     = 9001 // 内部服务器错误
	ERROR_SERVICE_UNAVAILABLE = 9002 // 服务不可用
	ERROR_EXTERNAL_SERVICE    = 9003 // 外部服务错误
	ERROR_SYSTEM_MAINTENANCE  = 9004 // 系统维护中
)

// GetErrorMessage 根据错误码获取错误消息
func GetErrorMessage(code int) string {
	messages := map[int]string{
		SUCCESS: "success",

		// 通用错误
		ERROR_INVALID_PARAMS:    "参数错误",
		ERROR_INVALID_REQUEST:   "请求格式错误",
		ERROR_INVALID_JSON:      "JSON格式错误",
		ERROR_VALIDATION_FAILED: "数据验证失败",

		// 认证授权错误
		ERROR_UNAUTHORIZED:          "未授权",
		ERROR_TOKEN_INVALID:         "token无效",
		ERROR_TOKEN_EXPIRED:         "token已过期",
		ERROR_PERMISSION_DENIED:     "权限不足",
		ERROR_ACCESS_DENIED:         "访问被拒绝",
		ERROR_LOGIN_FAILED:          "登录失败",
		ERROR_USER_NOT_FOUND:        "用户不存在",
		ERROR_PASSWORD_INVALID:      "密码错误",
		ERROR_REFRESH_TOKEN_INVALID: "刷新token无效",
		ERROR_ACCOUNT_LOCKED:        "账户已锁定",
		ERROR_PASSWORD_EXPIRED:      "密码已过期，请修改密码",
		ERROR_PASSWORD_WEAK:         "密码强度不足",

		// 文件操作错误
		ERROR_FILE_NOT_FOUND:     "文件不存在",
		ERROR_FILE_UPLOAD_FAILED: "文件上传失败",
		ERROR_FILE_TOO_LARGE:     "文件过大",
		ERROR_FILE_TYPE_INVALID:  "文件类型不支持",
		ERROR_FILE_SAVE_FAILED:   "文件保存失败",
		ERROR_FILE_DELETE_FAILED: "文件删除失败",
		ERROR_FILE_READ_FAILED:   "文件读取失败",

		// 数据库操作错误
		ERROR_DATABASE_ERROR:          "数据库错误",
		ERROR_RECORD_NOT_FOUND:        "记录不存在",
		ERROR_RECORD_ALREADY_EXISTS:   "记录已存在",
		ERROR_DATABASE_CONNECT_FAILED: "数据库连接失败",

		// 业务逻辑错误
		ERROR_MEETING_NOT_FOUND:      "会议不存在",
		ERROR_MEETING_ALREADY_EXISTS: "会议已存在",
		ERROR_DICT_NOT_FOUND:         "字典项不存在",
		ERROR_DICT_ALREADY_EXISTS:    "字典项已存在",
		ERROR_DICT_CODE_EXISTS:       "字典代码已存在",
		ERROR_DICT_ITEM_EXISTS:       "字典项代码已存在",
		ERROR_DICT_ITEM_NOT_FOUND:    "字典项不存在",
		ERROR_NOT_FOUND:              "资源不存在",
		ERROR_ALREADY_EXISTS:         "资源已存在",
		ERROR_OPERATION_FAILED:       "操作失败",
		ERROR_AGENDA_NOT_FOUND:       "议题不存在",
		ERROR_AGENDA_INVALID:         "议题ID无效",
		ERROR_FILE_INVALID:           "文件ID无效",
		ERROR_SECURITY_LEVEL_INVALID: "密级值无效",
		ERROR_DEVICE_LIMIT_EXCEEDED:  "设备数量超限",
		ERROR_NAMEPLATE_INVALID:      "铭牌模板包校验失败",
		ERROR_NAMEPLATE_NOT_FOUND:    "铭牌配置不存在",
		ERROR_FONT_INVALID:           "字体文件非法",
		ERROR_IMAGE_INVALID:          "背景图文件非法",

		// 授权相关错误
		ERROR_LICENSE_INVALID:   "授权码无效",
		ERROR_LICENSE_EXPIRED:   "授权码过期",
		ERROR_LICENSE_NOT_FOUND: "授权码不存在",

		// 系统错误
		ERROR_INTERNAL_SERVER:     "内部服务器错误",
		ERROR_SERVICE_UNAVAILABLE: "服务不可用",
		ERROR_EXTERNAL_SERVICE:    "外部服务错误",
		ERROR_SYSTEM_MAINTENANCE:  "系统维护中",
	}

	if message, ok := messages[code]; ok {
		return message
	}
	return "未知错误"
}

// IsSuccess 判断是否为成功状态
func IsSuccess(code int) bool {
	return code == SUCCESS
}

// GetHTTPStatusCode 根据错误码获取HTTP状态码
func GetHTTPStatusCode(code int) int {
	switch {
	case code == SUCCESS:
		return 200
	case code >= 1000 && code < 2000: // 参数错误
		return 400
	case code >= 2000 && code < 3000: // 认证错误
		if code == ERROR_UNAUTHORIZED || code == ERROR_LOGIN_FAILED {
			return 401
		}
		if code == ERROR_PERMISSION_DENIED || code == ERROR_ACCESS_DENIED {
			return 403
		}
		return 400
	case code >= 3000 && code < 4000: // 文件错误
		if code == ERROR_FILE_NOT_FOUND {
			return 404
		}
		if code == ERROR_FILE_TOO_LARGE {
			return 413
		}
		return 400
	case code >= 4000 && code < 5000: // 数据库错误
		if code == ERROR_RECORD_NOT_FOUND {
			return 404
		}
		return 500
	case code >= 5000 && code < 6000: // 业务错误
		if code == ERROR_MEETING_NOT_FOUND || code == ERROR_DICT_NOT_FOUND || code == ERROR_DICT_ITEM_NOT_FOUND || code == ERROR_NOT_FOUND || code == ERROR_AGENDA_NOT_FOUND || code == ERROR_NAMEPLATE_NOT_FOUND {
			return 404
		}
		if code == ERROR_MEETING_ALREADY_EXISTS || code == ERROR_DICT_ALREADY_EXISTS || code == ERROR_DICT_CODE_EXISTS || code == ERROR_DICT_ITEM_EXISTS || code == ERROR_ALREADY_EXISTS {
			return 409
		}
		if code == ERROR_DEVICE_LIMIT_EXCEEDED {
			return 403
		}
		return 400
	case code >= 6000 && code < 9000: // 授权错误
		if code == ERROR_LICENSE_INVALID || code == ERROR_LICENSE_EXPIRED {
			return 403
		}
		if code == ERROR_LICENSE_NOT_FOUND {
			return 404
		}
		return 400
	case code >= 9000: // 系统错误
		if code == ERROR_SERVICE_UNAVAILABLE || code == ERROR_SYSTEM_MAINTENANCE {
			return 503
		}
		return 500
	default:
		return 500
	}
}
