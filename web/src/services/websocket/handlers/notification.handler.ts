import type { WSMessage, SystemNotifyData } from '../types'
import { soundManager } from '@/utils/sound'

/**
 * 系统通知消息处理器
 * 
 * 职责：
 * - 处理系统通知消息
 * - 播放通知音效
 * - 显示通知弹窗
 */
export class NotificationMessageHandler {
  private onNotification?: (notification: any) => void

  /**
   * 设置回调函数
   */
  setCallbacks(callbacks: {
    onNotification?: (notification: any) => void
  }) {
    this.onNotification = callbacks.onNotification
  }

  /**
   * 处理系统通知消息
   */
  handleSystemNotify(message: WSMessage<SystemNotifyData>): void {
    console.log('[Handler] System notify:', message.data)
    
    // 播放音效
    soundManager.play('notify')
    
    // 确定通知类型
    const notificationType = 
      message.data.level === 'error' ? 'error' 
      : message.data.level === 'warning' ? 'warning' 
      : 'info'
    
    // 发送通知
    this.onNotification?.({
      type: notificationType,
      title: message.data.title,
      message: message.data.content,
      duration: 5000,
    })
  }
}

// 导出单例
export const notificationHandler = new NotificationMessageHandler()
