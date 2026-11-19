import React from 'react'
import { AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/utils'
import { Button } from './button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnOverlay?: boolean
  showCloseButton?: boolean
  className?: string
}

const SIZE_CLASSES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
}

/**
 * 通用弹窗：底层是 shadcn Dialog（焦点锁定、Esc 关闭、滚动锁定都由 Radix 处理）。
 * 样式同官方：圆角 10、无分隔线，标题 18/600 在左上，内容自己决定内边距。
 * 没有标题时也渲染一个隐藏的 DialogTitle，读屏能念出来。
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlay = true,
  showCloseButton = true,
  className,
}) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent
      showCloseButton={showCloseButton}
      aria-describedby={undefined}
      onInteractOutside={(e) => !closeOnOverlay && e.preventDefault()}
      onEscapeKeyDown={(e) => !closeOnOverlay && e.preventDefault()}
      className={cn('flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0', SIZE_CLASSES[size], className)}
    >
      <DialogHeader className={cn('px-6 pt-6', !title && 'sr-only')}>
        <DialogTitle>{title || '对话框'}</DialogTitle>
      </DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </DialogContent>
  </Dialog>
)

export interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  type?: 'info' | 'warning' | 'error' | 'success'
  title: string
  message?: string
  confirmText?: string
  showCancel?: boolean
  cancelText?: string
  onConfirm?: () => void
  loading?: boolean
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  type = 'info',
  title,
  message,
  confirmText = '确定',
  showCancel = false,
  cancelText = '取消',
  onConfirm,
  loading = false
}) => {
  const icons = {
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle,
    success: CheckCircle
  }

  // 使用语义化颜色（固定不变的功能色）
  const iconColors = {
    info: 'text-info',
    warning: 'text-warning',
    error: 'text-error',
    success: 'text-success'
  }

  const Icon = icons[type]

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    } else {
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnOverlay={!loading}
      showCloseButton={false}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className={cn('shrink-0 mt-1', iconColors[type])}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-text-primary mb-2">
              {title}
            </h3>
            {message && (
              <p className="text-sm text-text-regular leading-relaxed">
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          {showCancel && (
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            loading={loading}
            variant={type === 'error' ? 'default' : 'default'}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  type?: 'warning' | 'danger' | 'info'
  loading?: boolean
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  type = 'warning',
  loading = false
}) => {
  const [confirming, setConfirming] = React.useState(false)

  const handleConfirm = async () => {
    try {
      setConfirming(true)
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Confirm action failed:', error)
    } finally {
      setConfirming(false)
    }
  }

  const isLoading = loading || confirming

  return (
    <AlertModal
      isOpen={isOpen}
      onClose={onClose}
      type={type === 'danger' ? 'error' : type === 'info' ? 'info' : 'warning'}
      title={title}
      message={message}
      confirmText={confirmText}
      cancelText={cancelText}
      showCancel={true}
      onConfirm={handleConfirm}
      loading={isLoading}
    />
  )
}
