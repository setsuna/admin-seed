/**
 * 密码加密工具
 * 用于前端密码传输加密
 */

// 简单的密码加密（使用浏览器内置的Web Crypto API）
export class PasswordEncoder {
  /**
   * 使用SHA-256对密码进行哈希（加盐）
   * @param password 明文密码
   * @param salt 盐值（默认使用用户名）
   * @returns Promise<string> 加密后的密码
   */
  static async hashPassword(password: string, salt: string = ''): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(password + salt)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * 生成随机盐值
   */
  static generateSalt(): string {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Base64编码
   */
  static encode(text: string): string {
    return btoa(unescape(encodeURIComponent(text)))
  }

  /**
   * Base64解码
   */
  static decode(encoded: string): string {
    return decodeURIComponent(escape(atob(encoded)))
  }
}

// 简单的前端加密方案（可选使用）
export const passwordUtils = {
  /**
   * 对登录密码进行简单编码
   * 注意：这不是真正的加密，只是增加传输时的混淆
   */
  encodeForTransport(password: string, username: string): string {
    // 简单的Base64编码 + 时间戳
    const timestamp = Date.now().toString()
    const payload = JSON.stringify({
      pwd: password,
      usr: username,
      ts: timestamp
    })
    return btoa(payload)
  },

  /**
   * 解码传输密码（后端需要对应实现）
   */
  decodeFromTransport(encoded: string): { password: string; username: string; timestamp: string } {
    try {
      const payload = JSON.parse(atob(encoded))
      return {
        password: payload.pwd,
        username: payload.usr,
        timestamp: payload.ts
      }
    } catch (error) {
      throw new Error('密码解码失败')
    }
  }
}
