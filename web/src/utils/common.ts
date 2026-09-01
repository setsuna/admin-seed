import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 合并CSS类名的工具函数
 * 结合clsx和tailwind-merge，提供更好的Tailwind CSS类名合并
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化字节大小
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * 格式化日期时间
 */
export function formatDateTime(date: string | Date, format: 'date' | 'datetime' | 'time' = 'datetime'): string {
  const d = new Date(date)
  
  if (isNaN(d.getTime())) {
    return '无效日期'
  }

  const options: Intl.DateTimeFormatOptions = {}

  switch (format) {
    case 'date':
      options.year = 'numeric'
      options.month = '2-digit'
      options.day = '2-digit'
      break
    case 'time':
      options.hour = '2-digit'
      options.minute = '2-digit'
      options.second = '2-digit'
      break
    case 'datetime':
    default:
      options.year = 'numeric'
      options.month = '2-digit'
      options.day = '2-digit'
      options.hour = '2-digit'
      options.minute = '2-digit'
      options.second = '2-digit'
      break
  }

  return d.toLocaleDateString('zh-CN', options)
}

// 别名，保持向后兼容
export const formatDate = formatDateTime

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }

    const callNow = immediate && !timeout
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    
    if (callNow) func(...args)
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 生成随机字符串
 */
export function generateId(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T
    Object.keys(obj as object).forEach(key => {
      ;(cloned as any)[key] = deepClone((obj as any)[key])
    })
    return cloned
  }
  
  return obj
}

/**
 * 检查是否为空值
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * 安全的JSON解析
 */
export function safeParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString)
  } catch {
    return fallback
  }
}

/**
 * 下划线转驼峰
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * 驼峰转下划线
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * 递归将对象的key从下划线转为驼峰
 */
export function keysToCamel<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (obj instanceof Date) {
    return obj as T
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => keysToCamel(item)) as T
  }
  
  if (typeof obj === 'object') {
    const result: any = {}
    Object.keys(obj).forEach(key => {
      const camelKey = snakeToCamel(key)
      result[camelKey] = keysToCamel(obj[key])
    })
    return result as T
  }
  
  return obj
}

/**
 * 递归将对象的key从驼峰转为下划线
 */
export function keysToSnake<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (obj instanceof Date) {
    return obj as T
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => keysToSnake(item)) as T
  }
  
  if (typeof obj === 'object') {
    const result: any = {}
    Object.keys(obj).forEach(key => {
      const snakeKey = camelToSnake(key)
      result[snakeKey] = keysToSnake(obj[key])
    })
    return result as T
  }
  
  return obj
}
