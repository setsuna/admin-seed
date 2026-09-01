/**
 * 时间处理工具函数
 */

/**
 * 将时间向后取整到最近的30分钟（不跨天）
 * @param dateTimeStr - 格式：YYYY-MM-DDTHH:mm
 * @returns 取整后的时间字符串，格式：YYYY-MM-DDTHH:mm
 * 
 * @example
 * roundUpToNext30Minutes('2025-10-23T23:45') // '2025-10-23T23:45' (不跨天，保持原值)
 */
export function roundUpToNext30Minutes(dateTimeStr: string): string {
  if (!dateTimeStr) return dateTimeStr
  
  const [datePart, timePart] = dateTimeStr.split('T')
  if (!datePart || !timePart) return dateTimeStr
  
  const [hours, minutes] = timePart.split(':').map(Number)
  if (isNaN(hours) || isNaN(minutes)) return dateTimeStr
  
  // 如果已经是 0 或 30 分钟，不需要调整
  if (minutes === 0 || minutes === 30) {
    return dateTimeStr
  }
  
  // 计算调整后的分钟数
  let newMinutes = 0
  let newHours = hours
  if (minutes < 30) {
    newMinutes = 30
  } else {
    // minutes > 30，需要进位到下一小时
    newHours = hours + 1
    newMinutes = 0
  }
  
  // 检查是否会跨天
  if (newHours >= 24) {
    // 不跨天，返回原值
    return dateTimeStr
  }
  
  const hoursStr = String(newHours).padStart(2, '0')
  const minutesStr = String(newMinutes).padStart(2, '0')
  
  return `${datePart}T${hoursStr}:${minutesStr}`
}

/**
 * 添加指定分钟数到时间（不跨天）
 * @param dateTimeStr - 格式：YYYY-MM-DDTHH:mm
 * @param minutesToAdd - 要添加的分钟数
 * @returns 新的时间字符串，格式：YYYY-MM-DDTHH:mm；如果会跨天则返回原值
 * 
 * @example
 * addMinutes('2025-10-23T14:30', 30) // '2025-10-23T15:00'
 * addMinutes('2025-10-23T23:45', 30) // '2025-10-23T23:45' (不跨天，返回原值)
 */
export function addMinutes(dateTimeStr: string, minutesToAdd: number): string {
  if (!dateTimeStr) return dateTimeStr
  
  const [datePart, timePart] = dateTimeStr.split('T')
  if (!datePart || !timePart) return dateTimeStr
  
  const [hours, minutes] = timePart.split(':').map(Number)
  if (isNaN(hours) || isNaN(minutes)) return dateTimeStr
  
  // 计算新的小时和分钟
  const totalMinutes = hours * 60 + minutes + minutesToAdd
  const newHours = Math.floor(totalMinutes / 60)
  const newMinutes = totalMinutes % 60

  const hoursStr = String(newHours).padStart(2, '0')
  const minutesStr = String(newMinutes).padStart(2, '0')
  
  return `${datePart}T${hoursStr}:${minutesStr}`
}

/**
 * 将前端的日期时间格式转换为后端需要的 ISO 8601 格式（带时区）
 * @param dateTimeStr - 格式：YYYY-MM-DDTHH:mm
 * @returns ISO 8601 格式，例如：2025-10-23T14:30:00+08:00
 * 
 * @example
 * formatToBackendDateTime('2025-10-23T14:30') // '2025-10-23T14:30:00+08:00'
 */
export function formatToBackendDateTime(dateTimeStr: string): string {
  if (!dateTimeStr) return ''
  
  // 如果已经包含时区信息，直接返回
  if (dateTimeStr.includes('+') || dateTimeStr.includes('Z')) {
    return dateTimeStr
  }
  
  // 添加秒和时区（中国时区 +08:00）
  return `${dateTimeStr}:00+08:00`
}

/**
 * 将后端的 ISO 8601 格式转换为前端的日期时间格式
 * @param isoDateTimeStr - ISO 8601 格式，例如：2025-10-23T14:30:00+08:00
 * @returns 格式：YYYY-MM-DDTHH:mm
 * 
 * @example
 * formatFromBackendDateTime('2025-10-23T14:30:00+08:00') // '2025-10-23T14:30'
 */
export function formatFromBackendDateTime(isoDateTimeStr: string): string {
  if (!isoDateTimeStr) return ''
  
  // 移除秒和时区信息
  // 支持格式：2025-10-23T14:30:00+08:00 或 2025-10-23T14:30:00Z
  return isoDateTimeStr.substring(0, 16)
}

/**
 * 自动处理会议时间：开始时间取整，结束时间自动设置（不跨天）
 * @param startTime - 开始时间，格式：YYYY-MM-DDTHH:mm
 * @returns { startTime, endTime } 处理后的开始和结束时间
 * 
 * 规则：
 * 1. 开始时间向后取整到30分钟（不跨天）
 * 2. 结束时间 = 开始时间 + 30分钟（不跨天）
 * 3. 如果任何操作会导致跨天，则保持原值不变
 */
export function autoAdjustMeetingTimes(startTime: string): {
  startTime: string
  endTime: string
} {
  // 1. 开始时间向后取整到30分钟
  const roundedStartTime = roundUpToNext30Minutes(startTime)
  
  // 2. 结束时间 = 开始时间 + 30分钟
  const endTime = addMinutes(roundedStartTime, 30)
  
  return {
    startTime: roundedStartTime,
    endTime
  }
}
