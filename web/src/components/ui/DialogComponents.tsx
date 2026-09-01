import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './AlertDialog'
import { UseDialogReturn } from '@/hooks/useModal'
import { AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { cn } from '@/utils'

interface DialogComponentsProps {
  dialog: UseDialogReturn
}

export const DialogComponents: React.FC<DialogComponentsProps> = ({ dialog }) => {
  const { alertState, confirmState, closeAlert, closeConfirm } = dialog

  // 图标配置
  const getIcon = (type?: 'warning' | 'danger' | 'info') => {
    switch (type) {
      case 'danger':
        return <AlertCircle className="h-6 w-6 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />
      case 'info':
      default:
        return <Info className="h-6 w-6 text-blue-600" />
    }
  }

  // 确认按钮样式
  const getConfirmButtonClass = (type?: 'warning' | 'danger' | 'info') => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white'
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white'
      case 'info':
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  }

  return (
    <>
      {/* Alert Dialog */}
      <AlertDialog open={alertState.isOpen} onOpenChange={(open) => !open && closeAlert()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-start gap-4">
              {alertState.options?.type && (
                <div className="flex-shrink-0 mt-1">
                  {getIcon(alertState.options.type as 'warning' | 'danger' | 'info')}
                </div>
              )}
              <div className="flex-1">
                <AlertDialogTitle>{alertState.options?.title}</AlertDialogTitle>
                {alertState.options?.message && (
                  <AlertDialogDescription className="mt-2">
                    {alertState.options.message}
                  </AlertDialogDescription>
                )}
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={closeAlert}>
              {alertState.options?.confirmText || '确定'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmState.isOpen} onOpenChange={(open) => !open && closeConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-start gap-4">
              {confirmState.options?.type && (
                <div className="flex-shrink-0 mt-1">
                  {getIcon(confirmState.options.type)}
                </div>
              )}
              <div className="flex-1">
                <AlertDialogTitle>{confirmState.options?.title}</AlertDialogTitle>
                {(confirmState.options?.message || confirmState.options?.content) && (
                  <AlertDialogDescription className="mt-2">
                    {confirmState.options?.message || confirmState.options?.content}
                  </AlertDialogDescription>
                )}
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => closeConfirm(false)}>
              {confirmState.options?.cancelText || '取消'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => closeConfirm(true)}
              className={cn(
                getConfirmButtonClass(confirmState.options?.type)
              )}
            >
              {confirmState.options?.confirmText || '确定'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
