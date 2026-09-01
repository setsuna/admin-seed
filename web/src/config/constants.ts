/**
 * 应用常量配置
 * 包含所有业务相关的常量定义
 */

// API路径前缀配置
export const API_PATHS = {
  // 认证
  AUTH_LOGIN: '/auth/login',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_PROFILE: '/auth/profile',

  // 用户与权限
  USERS: '/users',
  ROLES: '/roles',
  ROLE_PERMISSION_MATRIX: '/roles/permission-matrix',
  PERMISSIONS: '/permissions',

  // 组织
  DEPARTMENTS: '/departments',
  DEPARTMENT_TREE: '/departments/tree',
  DEPARTMENT_OPTIONS: '/departments/options',

  // 平台
  DICTIONARIES: '/dictionaries',
  MENUS_USER_CONFIG: '/menus/user-config',
  DASHBOARD: '/dashboard',
  POLICY: '/policy',
  POLICY_DEFAULT: '/policy/default',
  LOGS: '/logs',
  LOGS_THREE_ADMIN: '/logs/three-admin',
} as const

// HTTP状态码配置
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

// JWT相关配置
export const JWT_CONFIG = {
  HEADER_PREFIX: 'Bearer',
  ALGORITHM: 'HS256',
} as const

// 权限配置
export const PERMISSIONS = {
  // 工作台权限
  DASHBOARD_VIEW: 'dashboard:view',
  
  // 会议管理权限
  MEETING_VIEW: 'meeting:view',
  MEETING_CREATE: 'meeting:create',
  MEETING_UPDATE: 'meeting:update',
  MEETING_DELETE: 'meeting:delete',
  MEETING_EXPORT: 'meeting:export',
  MEETING_IMPORT: 'meeting:import',
  
  // 系统管理权限
  SYSTEM_DICT: 'system:dict',
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_LOGS: 'system:logs',
  SYSTEM_BACKUP: 'system:backup',
  
  // 用户管理权限
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_MANAGE: 'user:manage',
  ROLE_MANAGE: 'role:manage',
  PERMISSION_MANAGE: 'permission:manage',
  
  // 部门管理权限
  DEPARTMENT_VIEW: 'department:view',
  DEPARTMENT_CREATE: 'department:create',
  DEPARTMENT_UPDATE: 'department:update',
  DEPARTMENT_DELETE: 'department:delete',
  DEPARTMENT_MANAGE: 'department:manage',
  
  // 审计权限
  AUDIT_VIEW: 'audit:view',
  AUDIT_EXPORT: 'audit:export',
  
  // 文件管理权限
  FILE_UPLOAD: 'file:upload',
  FILE_DOWNLOAD: 'file:download',
  FILE_DELETE: 'file:delete',
} as const

// 用户角色配置
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MEETING_ADMIN: 'meeting_admin',
  USER: 'user',
  AUDITOR: 'auditor',
  GUEST: 'guest',
} as const

// 文件类型配置
export const FILE_TYPES = {
  DOCUMENT: 'document',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  ARCHIVE: 'archive',
  OTHER: 'other',
} as const

// 通知类型配置
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const

// 主题配置
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
  GOV_RED: 'gov-red',
} as const

// 数据字典类型
export const DICT_TYPES = {
  MEETING_TYPE: 'meeting_type',
  MEETING_LEVEL: 'meeting_level',
  DOCUMENT_TYPE: 'document_type',
  USER_STATUS: 'user_status',
  ORGANIZATION: 'organization',
} as const

// 操作日志类型
export const LOG_TYPES = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  EXPORT: 'export',
  IMPORT: 'import',
  DOWNLOAD: 'download',
  UPLOAD: 'upload',
} as const

// 分页配置常量
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  MIN_PAGE_SIZE: 1,
  MAX_PAGE_SIZE: 500,
  DEFAULT_SIZE_OPTIONS: [10, 20, 50, 100] as const,
} as const

// 表格配置
export const TABLE = {
  DEFAULT_SORT_ORDER: 'desc' as const,
  MAX_COLUMNS: 20,
  ROW_HEIGHT: {
    COMPACT: 32,
    NORMAL: 48,
    COMFORTABLE: 64,
  },
} as const

// 表单验证配置
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 20,
  USERNAME_MIN_LENGTH: 2,
  USERNAME_MAX_LENGTH: 20,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^1[3-9]\d{9}$/,
} as const

// 🆕 错误码分类工具函数
export const getErrorCategory = (code: number): string => {
  if (code === 200) return 'success'
  if (code >= 1001 && code <= 1999) return 'general'
  if (code >= 2001 && code <= 2999) return 'auth'
  if (code >= 3001 && code <= 3999) return 'file'
  if (code >= 4001 && code <= 4999) return 'database'
  if (code >= 5001 && code <= 5999) return 'business'
  if (code >= 6001 && code <= 6999) return 'authorization'
  if (code >= 9001 && code <= 9999) return 'system'
  return 'unknown'
}

export const isAuthError = (code: number): boolean => {
  return code >= 2001 && code <= 2999
}

export const needsAutoLogin = (code: number): boolean => {
  return AUTH_REDIRECT_CODES.includes(code as any)
}

export const isRetryableError = (code: number): boolean => {
  return RETRYABLE_ERROR_CODES.includes(code as any)
}

export const getErrorMessage = (code: number, defaultMessage?: string): string => {
  return ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES] || defaultMessage || '操作失败，请重试'
}

// 缓存键配置
export const CACHE_KEYS = {
  USER_PROFILE: 'user_profile',
  USER_PERMISSIONS: 'user_permissions',
  DICTIONARIES: 'dictionaries',
  SYSTEM_CONFIG: 'system_config',
  THEME_PREFERENCE: 'theme_preference',
} as const

// 🔄 更新：新错误码分类体系 (1xxx-9xxx)
export const ERROR_CODES = {
  // ✅ 成功状态码
  SUCCESS: 200,
  
  // 1️⃣ 通用错误码 (1xxx)
  PARAM_ERROR: 1001,
  REQUEST_FORMAT_ERROR: 1002,
  JSON_FORMAT_ERROR: 1003,
  VALIDATION_ERROR: 1004,
  
  // 2️⃣ 认证授权错误码 (2xxx)
  UNAUTHORIZED: 2001,
  INVALID_TOKEN: 2002,
  TOKEN_EXPIRED: 2003,
  PERMISSION_DENIED: 2004,
  ACCESS_DENIED: 2005,
  LOGIN_FAILED: 2006,
  USER_NOT_FOUND: 2007,
  PASSWORD_INVALID: 2008,
  REFRESH_TOKEN_INVALID: 2009,
  ACCOUNT_LOCKED: 2010,
  PASSWORD_EXPIRED: 2011,
  PASSWORD_WEAK: 2012,
  
  // 3️⃣ 文件操作错误码 (3xxx)
  FILE_NOT_EXIST: 3001,
  FILE_UPLOAD_FAILED: 3002,
  FILE_TOO_LARGE: 3003,
  FILE_TYPE_NOT_SUPPORTED: 3004,
  FILE_SAVE_FAILED: 3005,
  FILE_DELETE_FAILED: 3006,
  FILE_READ_FAILED: 3007,
  
  // 4️⃣ 数据库操作错误码 (4xxx)
  DATABASE_ERROR: 4001,
  RECORD_NOT_EXIST: 4002,
  RECORD_ALREADY_EXIST: 4003,
  DATABASE_CONNECTION_FAILED: 4004,
  
  // 5️⃣ 业务逻辑错误码 (5xxx)
  MEETING_NOT_EXIST: 5001,
  MEETING_ALREADY_EXIST: 5002,
  DICT_ITEM_NOT_EXIST: 5003,
  DICT_ITEM_ALREADY_EXIST: 5004,
  RESOURCE_NOT_EXIST: 5005,
  RESOURCE_ALREADY_EXIST: 5006,
  
  // 6️⃣ 授权相关错误码 (6xxx)
  AUTHORIZATION_CODE_INVALID: 6001,
  AUTHORIZATION_CODE_EXPIRED: 6002,
  AUTHORIZATION_CODE_NOT_EXIST: 6003,
  
  // 9️⃣ 系统错误码 (9xxx)
  INTERNAL_SERVER_ERROR: 9001,
  SERVICE_UNAVAILABLE: 9002,
  EXTERNAL_SERVICE_ERROR: 9003,
  SYSTEM_MAINTENANCE: 9004,
  
  // 兼容性：保留旧的字符串错误码
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  SERVER_ERROR: 'SERVER_ERROR',
} as const

// 🆕 错误码分类映射
export const ERROR_CODE_CATEGORIES = {
  // 通用错误 1xxx
  GENERAL: [1001, 1002, 1003, 1004],
  // 认证错误 2xxx  
  AUTH: [2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009],
  // 文件错误 3xxx
  FILE: [3001, 3002, 3003, 3004, 3005, 3006, 3007],
  // 数据库错误 4xxx
  DATABASE: [4001, 4002, 4003, 4004],
  // 业务错误 5xxx
  BUSINESS: [5001, 5002, 5003, 5004, 5005, 5006],
  // 授权错误 6xxx
  AUTHORIZATION: [6001, 6002, 6003],
  // 系统错误 9xxx
  SYSTEM: [9001, 9002, 9003, 9004],
} as const

// 🆕 需要自动跳转登录的错误码
export const AUTH_REDIRECT_CODES = [2001, 2002, 2003, 2009] as const

// 🆕 需要重试的错误码
export const RETRYABLE_ERROR_CODES = [9001, 9002, 9003] as const

// 🆕 登录页本地处理的错误码（不走全局通知）
export const LOGIN_LOCAL_ERROR_CODES = [2006, 2007, 2010, 2011] as const

// 🆕 修改密码本地处理的错误码
export const CHANGE_PASSWORD_LOCAL_ERROR_CODES = [2008, 2012] as const

// 🆕 检查是否为登录页本地处理的错误
export const isLoginLocalError = (code: number): boolean => {
  return LOGIN_LOCAL_ERROR_CODES.includes(code as any)
}

// 🆕 检查是否为修改密码本地处理的错误
export const isChangePasswordLocalError = (code: number): boolean => {
  return CHANGE_PASSWORD_LOCAL_ERROR_CODES.includes(code as any)
}

// 🆕 用户友好的错误信息映射
export const ERROR_MESSAGES = {
  // 通用错误 1xxx
  1001: '参数错误，请检查输入信息',
  1002: '请求格式错误，请重试',
  1003: '数据格式错误，请检查输入',
  1004: '数据验证失败',
  
  // 认证错误 2xxx
  2001: '未授权，请先登录',
  2002: 'Token无效，请重新登录',
  2003: 'Token已过期，请重新登录',
  2004: '权限不足，无法执行此操作',
  2005: '访问被拒绝',
  2006: '用户名或密码错误',
  2007: '用户不存在',
  2008: '原密码错误',
  2009: '刷新令牌无效，请重新登录',
  2010: '账户已锁定',
  2011: '密码已过期，请修改密码',
  2012: '密码强度不足',
  
  // 文件错误 3xxx
  3001: '文件不存在或已被删除',
  3002: '文件上传失败，请重试',
  3003: '文件过大，请选择较小的文件',
  3004: '不支持该文件类型',
  3005: '文件保存失败，请重试',
  3006: '文件删除失败，请重试',
  3007: '文件读取失败，请重试',
  
  // 数据库错误 4xxx
  4001: '系统繁忙，请稍后重试',
  4002: '数据不存在或已被删除',
  4003: '数据已存在，请勿重复创建',
  4004: '系统维护中，请稍后重试',
  
  // 业务错误 5xxx
  5001: '会议不存在或已被删除',
  5002: '会议已存在，请勿重复创建',
  5003: '配置项不存在',
  5004: '配置项已存在',
  5005: '资源不存在或已被删除',
  5006: '资源已存在，请勿重复创建',
  
  // 授权错误 6xxx
  6001: '系统授权已失效，请联系管理员',
  6002: '系统授权已过期，请联系管理员',
  6003: '系统未授权，请联系管理员',
  
  // 系统错误 9xxx
  9001: '系统异常，请稍后重试',
  9002: '服务暂时不可用，请稍后重试',
  9003: '系统繁忙，请稍后重试',
  9004: '系统维护中，请稍后访问',
} as const
