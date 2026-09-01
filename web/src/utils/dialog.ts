/**
 * 提示框工具类
 * 提供简单的静态方法来显示提示框，用于快速替换项目中的 alert/confirm 调用
 */

import { showAlert, showConfirm } from '@/components/ui'

export class Dialog {
  /**
   * 显示信息提示
   */
  static async info(message: string, title = '提示') {
    return showAlert({
      type: 'info',
      title,
      message
    })
  }

  /**
   * 显示成功提示
   */
  static async success(message: string, title = '操作成功') {
    return showAlert({
      type: 'success',
      title,
      message
    })
  }

  /**
   * 显示警告提示
   */
  static async warning(message: string, title = '注意') {
    return showAlert({
      type: 'warning',
      title,
      message
    })
  }

  /**
   * 显示错误提示
   */
  static async error(message: string, title = '操作失败') {
    return showAlert({
      type: 'error',
      title,
      message
    })
  }

  /**
   * 显示确认对话框
   */
  static async confirm(message: string, title = '确认', options?: {
    confirmText?: string
    cancelText?: string
    type?: 'warning' | 'danger' | 'info'
  }) {
    return showConfirm({
      title,
      message,
      confirmText: options?.confirmText || '确定',
      cancelText: options?.cancelText || '取消',
      type: options?.type || 'warning'
    })
  }

  /**
   * 显示删除确认对话框
   */
  static async confirmDelete(message = '删除后无法恢复，确定要删除吗？', title = '确认删除') {
    return showConfirm({
      title,
      message,
      type: 'danger',
      confirmText: '删除',
      cancelText: '取消'
    })
  }

  /**
   * 显示保存确认对话框
   */
  static async confirmSave(message = '是否保存当前更改？', title = '保存确认') {
    return showConfirm({
      title,
      message,
      type: 'info',
      confirmText: '保存',
      cancelText: '不保存'
    })
  }

  /**
   * 显示退出确认对话框
   */
  static async confirmExit(message = '有未保存的更改，确定要退出吗？', title = '确认退出') {
    return showConfirm({
      title,
      message,
      type: 'warning',
      confirmText: '退出',
      cancelText: '继续编辑'
    })
  }
}

// 便捷的全局方法，用于快速替换原生 alert/confirm
export const alert = Dialog.info
export const confirm = Dialog.confirm

// 导出所有方法
export default Dialog
