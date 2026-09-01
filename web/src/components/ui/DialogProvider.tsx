import React, { createContext, useContext, ReactNode, useEffect } from 'react'
import { useDialog, UseDialogReturn } from '@/hooks/useModal'
import { DialogComponents } from './DialogComponents'

interface DialogProviderProps {
  children: ReactNode
}

const DialogContext = createContext<UseDialogReturn | null>(null)

export const DialogProvider: React.FC<DialogProviderProps> = ({ children }) => {
  const dialog = useDialog()

  useEffect(() => {
    setGlobalDialog(dialog)
  }, [dialog])

  return (
    <DialogContext.Provider value={dialog}>
      {children}
      <DialogComponents dialog={dialog} />
    </DialogContext.Provider>
  )
}

export const useGlobalDialog = (): UseDialogReturn => {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useGlobalDialog must be used within a DialogProvider')
  }
  return context
}

// 便捷的全局方法
let globalDialog: UseDialogReturn | null = null

export const setGlobalDialog = (dialog: UseDialogReturn) => {
  globalDialog = dialog
}

export const showAlert = async (options: Parameters<UseDialogReturn['alert']>[0]) => {
  if (!globalDialog) {
    throw new Error('Global dialog not initialized. Make sure DialogProvider is mounted.')
  }
  return globalDialog.alert(options)
}

export const showConfirm = async (options: Parameters<UseDialogReturn['confirm']>[0]) => {
  if (!globalDialog) {
    throw new Error('Global dialog not initialized. Make sure DialogProvider is mounted.')
  }
  return globalDialog.confirm(options)
}
