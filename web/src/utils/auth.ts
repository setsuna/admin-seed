/**
 * 授权相关工具函数
 */

// 获取设备指纹
export const getCurrentDeviceFingerprint = (): string => {
  // 简单的设备指纹生成，实际项目中可能需要更复杂的算法
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('Device fingerprint', 2, 2)
  }
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL()
  ].join('|')
  
  // 生成简单的哈希
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为32位整数
  }
  
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')
}

// 获取当前授权信息
export const getCurrentAuthInfo = () => {
  const license = localStorage.getItem('license_data')
  
  if (!license) {
    return {
      isValid: false,
      deviceFingerprint: getCurrentDeviceFingerprint(),
      expireDate: null,
      remainingDays: 0,
      errorMessage: '未找到授权信息'
    }
  }
  
  try {
    const licenseData = JSON.parse(license)
    const expireDate = new Date(licenseData.expireDate)
    const now = new Date()
    const remainingDays = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    return {
      isValid: remainingDays > 0,
      deviceFingerprint: getCurrentDeviceFingerprint(),
      expireDate: expireDate.toLocaleDateString(),
      remainingDays: Math.max(0, remainingDays),
      errorMessage: remainingDays <= 0 ? '授权已过期' : null
    }
  } catch (error) {
    return {
      isValid: false,
      deviceFingerprint: getCurrentDeviceFingerprint(),
      expireDate: null,
      remainingDays: 0,
      errorMessage: '授权数据格式错误'
    }
  }
}

// 验证授权码
export const validateLicenseKey = (licenseKey: string): boolean => {
  // 简单的格式验证
  const cleanKey = licenseKey.replace(/[^A-Z0-9]/g, '')
  
  if (cleanKey.length !== 25) {
    return false
  }
  
  // 这里应该有复杂的验证逻辑，包括RSA签名验证等
  // 目前只做简单的校验和验证
  let checksum = 0
  for (let i = 0; i < cleanKey.length - 1; i++) {
    const char = cleanKey.charCodeAt(i)
    checksum += char
  }
  
  const expectedChecksum = checksum % 36
  const actualChecksum = parseInt(cleanKey.slice(-1), 36)
  
  return expectedChecksum === actualChecksum
}

// 保存授权信息
export const saveLicenseInfo = (licenseKey: string): boolean => {
  if (!validateLicenseKey(licenseKey)) {
    return false
  }
  
  // 解析授权码并保存（这里是简化的实现）
  const licenseData = {
    licenseKey,
    deviceFingerprint: getCurrentDeviceFingerprint(),
    expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1年后过期
    activatedAt: new Date().toISOString()
  }
  
  localStorage.setItem('license_data', JSON.stringify(licenseData))
  return true
}

// 格式化授权码输入
export const formatLicenseKey = (input: string): string => {
  const cleaned = input.replace(/[^A-Z0-9]/g, '').toUpperCase()
  const formatted = cleaned.match(/.{1,5}/g)?.join('-') || cleaned
  return formatted.slice(0, 29) // 限制最大长度
}
