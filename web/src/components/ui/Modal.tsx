import React, { useEffect, useRef } from 'react'
import { X, AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/utils'
import { Button } from './Button'

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

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlay = true,
  showCloseButton = true,
  className
}) => {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlay && e.target === overlayRef.current) {
      onClose()
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        className={cn(
          'relative w-full max-h-[90vh] mx-4 bg-bg-elevated rounded-lg shadow-xl',
          'animate-in fade-in-0 zoom-in-95 duration-200',
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-border">
            {title && (
              <h2 className="text-lg font-semibold text-text-primary">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-bg-container transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          {children}
        </div>
      </div>
    </div>
  )
}

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
          <div className={cn('flex-shrink-0 mt-1', iconColors[type])}>
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
