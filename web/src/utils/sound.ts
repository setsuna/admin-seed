/**
 * 音效管理器
 * 负责播放系统提示音，支持音量控制和开关
 */

export type SoundType = 'online' | 'offline' | 'notify'

class SoundManager {
  private enabled: boolean = true
  private volume: number = 0.8  // 调大音量到 0.8
  private audioCache: Map<SoundType, HTMLAudioElement> = new Map()
  private initialized: boolean = false

  constructor() {
    this.loadSettings()
  }

  /**
   * 从 localStorage 加载音效设置
   */
  private loadSettings() {
    try {
      const settings = localStorage.getItem('sound-settings')
      if (settings) {
        const { enabled, volume } = JSON.parse(settings)
        this.enabled = enabled ?? true
        this.volume = volume ?? 0.8  // 默认音量 0.8
      }
    } catch (error) {
      console.error('Failed to load sound settings:', error)
    }
  }

  /**
   * 保存音效设置到 localStorage
   */
  private saveSettings() {
    try {
      localStorage.setItem('sound-settings', JSON.stringify({
        enabled: this.enabled,
        volume: this.volume,
      }))
    } catch (error) {
      console.error('Failed to save sound settings:', error)
    }
  }

  /**
   * 预加载音频文件
   */
  private preloadSound(soundType: SoundType) {
    if (this.audioCache.has(soundType)) {
      return this.audioCache.get(soundType)!
    }

    const audio = new Audio(`/sounds/device-${soundType}.mp3`)
    audio.volume = this.volume
    audio.preload = 'auto'
    this.audioCache.set(soundType, audio)
    return audio
  }

  /**
   * 初始化音频权限（需要用户交互后调用）
   */
  async initialize() {
    if (this.initialized) return

    try {
      // 预加载所有音效
      const sounds: SoundType[] = ['online', 'offline', 'notify']
      await Promise.all(sounds.map(sound => {
        const audio = this.preloadSound(sound)
        // 以极低音量播放一次来解锁浏览器音频权限
        audio.volume = 0.01
        return audio.play().then(() => audio.pause()).catch(() => {})
      }))
      
      // 恢复正常音量
      this.audioCache.forEach(audio => {
        audio.volume = this.volume
      })
      
      this.initialized = true
    } catch (error) {
      console.warn('Failed to initialize audio:', error)
    }
  }

  /**
   * 播放音效
   */
  async play(soundType: SoundType) {
    if (!this.enabled) return

    try {
      const audio = this.preloadSound(soundType)
      audio.volume = this.volume
      audio.currentTime = 0 // 重置播放位置
      await audio.play()
    } catch (error) {
      console.warn(`Failed to play sound: ${soundType}`, error)
    }
  }

  /**
   * 设置音量 (0-1)
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
    this.audioCache.forEach(audio => {
      audio.volume = this.volume
    })
    this.saveSettings()
  }

  /**
   * 获取当前音量
   */
  getVolume(): number {
    return this.volume
  }

  /**
   * 切换音效开关
   */
  toggle() {
    this.enabled = !this.enabled
    this.saveSettings()
    return this.enabled
  }

  /**
   * 设置音效开关
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled
    this.saveSettings()
  }

  /**
   * 获取音效开关状态
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * 清理音频缓存
   */
  dispose() {
    this.audioCache.forEach(audio => {
      audio.pause()
      audio.src = ''
    })
    this.audioCache.clear()
    this.initialized = false
  }
}

// 导出单例
export const soundManager = new SoundManager()
