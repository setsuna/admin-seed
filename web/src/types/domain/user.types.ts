/**
 * 用户领域类型定义
 * 包含用户相关的业务实体和值对象
 */

import type { 
  BaseEntity, 
  ActiveStatus, 
  UserSecurityLevel, 
  ISODateString, 
  ContactInfo 
} from '../common'

// 用户角色枚举
export type UserRole = 'admin' | 'user' | 'meeting_admin' | 'auditor' | 'security_admin' 

// 用户实体
export interface User extends BaseEntity {
  username: string
  realName?: string
  name?: string
  email?: string
  role: UserRole
  avatar?: string
  department?: string
  departmentName?: string
  position?: string
  phone?: string
  status: ActiveStatus
  securityLevel: UserSecurityLevel
  ukeyId?: string
  allowedIps?: string[]
  lastLoginAt?: ISODateString
  lastLoginIp?: string
  isHide?: boolean
  isDeleted?: boolean
  permissions?: string[]
  profile?: UserProfile
  preferences?: UserPreferences
  stats?: UserStats
}

// 用户档案信息
export interface UserProfile {
  firstName?: string
  lastName?: string
  middleName?: string
  gender?: 'male' | 'female' | 'other'
  birthDate?: ISODateString
  idNumber?: string
  nationality?: string
  address?: string
  emergencyContact?: ContactInfo & {
    relationship?: string
    name?: string
  }
  skills?: string[]
  languages?: Array<{
    language: string
    level: 'beginner' | 'intermediate' | 'advanced' | 'native'
  }>
  education?: Array<{
    institution: string
    degree: string
    major: string
    startYear: number
    endYear?: number
  }>
  certifications?: Array<{
    name: string
    issuer: string
    issueDate: ISODateString
    expiryDate?: ISODateString
    credentialId?: string
  }>
}

// 用户偏好设置
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system' | 'gov-red'
  language: 'zh-CN' | 'en-US'
  timezone: string
  dateFormat: string
  timeFormat: '12h' | '24h'
  notifications: {
    email: boolean
    browser: boolean
    mobile: boolean
    meeting: boolean
    system: boolean
  }
  privacy: {
    showProfile: boolean
    showActivity: boolean
    allowMention: boolean
  }
  dashboard: {
    layout: 'grid' | 'list'
    widgets: string[]
    refreshInterval: number
  }
}

// 用户统计信息
export interface UserStats {
  loginCount: number
  lastLoginDuration: number
  meetingsHosted: number
  meetingsAttended: number
  filesUploaded: number
  operationsPerformed: number
  securityEvents: number
  accountAge: number
}

// 用户会话信息
export interface UserSession {
  id: string
  userId: string
  token: string
  deviceInfo: {
    type: 'desktop' | 'mobile' | 'tablet'
    os: string
    browser: string
    ip: string
    location?: string
  }
  loginAt: ISODateString
  lastActivity: ISODateString
  expiresAt: ISODateString
  isActive: boolean
}

// 用户操作日志
export interface UserActivity extends BaseEntity {
  userId: string
  action: string
  resource: string
  resourceId?: string
  description: string
  ip: string
  userAgent: string
  location?: string
  status: 'success' | 'failed'
  duration?: number
  metadata?: Record<string, any>
}

// 用户权限上下文
export interface UserPermissionContext {
  user: User
  permissions: string[]
  roles: string[]
  groups: string[]
  restrictions?: {
    ipWhitelist?: string[]
    timeRestriction?: {
      start: string
      end: string
      timezone: string
    }
    resourceAccess?: Record<string, string[]>
  }
}

// 用户安全信息
export interface UserSecurity {
  userId: string
  passwordLastChanged: ISODateString
  passwordExpiresAt?: ISODateString
  mfaEnabled: boolean
  mfaMethods: Array<{
    type: 'totp' | 'sms' | 'email' | 'hardware'
    enabled: boolean
    setupAt: ISODateString
  }>
  trustedDevices: Array<{
    deviceId: string
    deviceName: string
    addedAt: ISODateString
    lastUsed: ISODateString
  }>
  loginAttempts: {
    failed: number
    lastFailedAt?: ISODateString
    lockedUntil?: ISODateString
  }
  securityQuestions?: Array<{
    question: string
    answerHash: string
    updatedAt: ISODateString
  }>
}

// 用户搜索结果
export interface UserSearchResult {
  user: User
  relevanceScore: number
  matchedFields: string[]
  highlights?: Record<string, string>
}

// 用户导入记录
export interface UserImportRecord {
  rowNumber: number
  data: Partial<User>
  status: 'success' | 'error' | 'warning'
  errors?: Array<{
    field: string
    message: string
  }>
  warnings?: Array<{
    field: string
    message: string
  }>
}

// 用户组织关系
export interface UserOrganization {
  userId: string
  departmentId: string
  roleInDepartment: string
  isManager: boolean
  joinDate: ISODateString
  leaveDate?: ISODateString
  responsibilities?: string[]
  reportingTo?: string
  directReports?: string[]
}

// 用户认证信息
export interface UserAuth {
  userId: string
  provider: 'local' | 'ldap' | 'oauth' | 'saml'
  providerId?: string
  credentials?: {
    passwordHash?: string
    salt?: string
    algorithm?: string
  }
  oauth?: {
    provider: string
    providerId: string
    accessToken?: string
    refreshToken?: string
    expiresAt?: ISODateString
  }
  lastAuthAt: ISODateString
  authHistory: Array<{
    method: string
    success: boolean
    timestamp: ISODateString
    ip: string
    userAgent?: string
  }>
}
