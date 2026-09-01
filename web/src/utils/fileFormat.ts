/**
 * 文件格式工具函数
 * 用于文件上传和验证
 * 
 * 支持两种数据源：
 * 1. 策略配置的 allowedFileTypes（扩展名数组，如 ["pdf","docx","pptx"]）—— 优先使用
 * 2. 本地 config 的 allowedTypes（MIME 类型数组）—— 兜底
 */

import { getConfig } from '@/config'

// ==================== 映射表 ====================

/** 扩展名 → MIME 类型 */
const extToMime: Record<string, string> = {
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'txt': 'text/plain',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'mp4': 'video/mp4',
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'zip': 'application/zip',
}

/** MIME 类型 → dropzone 扩展名 */
const mimeToDropzoneExt: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'video/mp4': ['.mp4'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'application/zip': ['.zip'],
}

/** MIME 类型 → 显示用扩展名 */
const mimeToDisplayExt: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'text/plain': 'TXT',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'video/mp4': 'MP4',
  'audio/mpeg': 'MP3',
  'audio/wav': 'WAV',
  'application/zip': 'ZIP',
}

// ==================== 内部工具 ====================

/**
 * 从策略扩展名数组构建 dropzone accept 配置
 * 已知 MIME 的走 MIME 映射，未知的直接用扩展名（dropzone 支持 .ext 写法）
 */
function policyExtensionsToAccept(extensions: string[]): Record<string, string[]> {
  const accept: Record<string, string[]> = {}
  for (const ext of extensions) {
    const normalized = ext.toLowerCase().replace(/^\./, '')
    const dotExt = `.${normalized}`
    const mime = extToMime[normalized]
    if (mime) {
      // 已知 MIME：合并扩展名
      if (!accept[mime]) accept[mime] = []
      if (!accept[mime].includes(dotExt)) accept[mime].push(dotExt)
    } else {
      // 未知 MIME：用通配 MIME 键，直接按扩展名匹配
      const wildcardKey = 'application/octet-stream'
      if (!accept[wildcardKey]) accept[wildcardKey] = []
      if (!accept[wildcardKey].includes(dotExt)) accept[wildcardKey].push(dotExt)
    }
  }
  return accept
}

/**
 * 获取生效的允许扩展名集合（小写、不带点）
 */
function getEffectiveExtensions(policyFileTypes?: string[]): Set<string> | null {
  if (policyFileTypes && policyFileTypes.length > 0) {
    return new Set(policyFileTypes.map(ext => ext.toLowerCase().replace(/^\./, '')))
  }
  return null
}

// ==================== 导出函数 ====================

/**
 * 获取 react-dropzone 的 accept 配置
 * @param policyFileTypes 策略配置的允许文件类型（扩展名数组），可选
 */
export const getDropzoneAccept = (policyFileTypes?: string[]): Record<string, string[]> => {
  // 策略数据可用时，直接从扩展名构建，支持任意格式
  if (policyFileTypes && policyFileTypes.length > 0) {
    return policyExtensionsToAccept(policyFileTypes)
  }

  // 兜底：从 config MIME 列表构建
  const config = getConfig()
  const accept: Record<string, string[]> = {}
  config.features.upload.allowedTypes.forEach(mimeType => {
    const extensions = mimeToDropzoneExt[mimeType]
    if (extensions) {
      accept[mimeType] = extensions
    }
  })
  return accept
}

/**
 * 检查文件是否被支持
 * @param file 要检查的文件
 * @param policyFileTypes 策略配置的允许文件类型（扩展名数组），可选
 */
export const isFileSupported = (file: File, policyFileTypes?: string[]): boolean => {
  const extension = file.name.split('.').pop()?.toLowerCase()

  // 策略可用时，直接用扩展名判断（支持任意格式）
  const policyExts = getEffectiveExtensions(policyFileTypes)
  if (policyExts) {
    if (!extension) return false
    return policyExts.has(extension)
  }

  // 兜底：用 config MIME 列表
  const allowedTypes = getConfig().features.upload.allowedTypes
  if (allowedTypes.includes(file.type)) {
    return true
  }
  if (!extension) return false
  const mime = extToMime[extension]
  return mime ? allowedTypes.includes(mime) : false
}

/**
 * 获取格式化的文件扩展名列表（用于显示）
 * @param policyFileTypes 策略配置的允许文件类型（扩展名数组），可选
 * @returns 格式化的扩展名字符串，如 "PDF、DOCX、PPTX"
 */
export const getFormattedExtensions = (policyFileTypes?: string[]): string => {
  // 策略有数据时直接用扩展名转大写展示，更准确
  if (policyFileTypes && policyFileTypes.length > 0) {
    return policyFileTypes
      .map(ext => ext.replace(/^\./, '').toUpperCase())
      .join('、')
  }

  // 兜底：从 config MIME 类型转换
  const config = getConfig()
  return config.features.upload.allowedTypes
    .map(type => mimeToDisplayExt[type] || type)
    .join('、')
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化的文件大小字符串
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * 验证文件大小
 * @param file 要验证的文件
 * @param policyMaxSize 策略配置的文件大小上限(MB)，可选
 */
export const isFileSizeValid = (file: File, policyMaxSize?: number): boolean => {
  return file.size <= getMaxFileSizeBytes(policyMaxSize)
}

/**
 * 获取生效的文件大小上限（字节）
 * @param policyMaxSize 策略配置的文件大小上限(MB)，可选；缺省回退 config 的 maxSize（字节）
 */
export const getMaxFileSizeBytes = (policyMaxSize?: number): number => {
  if (policyMaxSize && policyMaxSize > 0) {
    return policyMaxSize * 1024 * 1024
  }
  return getConfig().features.upload.maxSize
}
