import { useState, useCallback } from 'react'

export interface UseModalReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export function useModal(initialOpen = false): UseModalReturn {
  const [isOpen, setIsOpen] = useState(initialOpen)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(prev => !prev), [])

  return {
    isOpen,
    open,
    close,
    toggle
  }
}

export interface AlertOptions {
  type?: 'info' | 'warning' | 'error' | 'success'
  title: string
  message?: string
  confirmText?: string
}

export interface ConfirmOptions {
  title: string
  message?: string
  content?: string
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'danger' | 'info'
}

interface AlertState {
  isOpen: boolean
  options: AlertOptions | null
  resolve: ((value: void) => void) | null
}

interface ConfirmState {
  isOpen: boolean
  options: ConfirmOptions | null
  resolve: ((value: boolean) => void) | null
}

export interface UseDialogReturn {
  alert: (options: AlertOptions) => Promise<void>
  confirm: (options: ConfirmOptions) => Promise<boolean>
  showConfirm: (options: ConfirmOptions) => Promise<boolean>
  alertState: AlertState
  confirmState: ConfirmState
  closeAlert: () => void
  closeConfirm: (result: boolean) => void
}

export function useDialog(): UseDialogReturn {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    options: null,
    resolve: null
  })

  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    options: null,
    resolve: null
  })

  const alert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        options,
        resolve
      })
    })
  }, [])

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve
      })
    })
  }, [])

  const closeAlert = useCallback(() => {
    if (alertState.resolve) {
      alertState.resolve()
    }
    setAlertState({
      isOpen: false,
      options: null,
      resolve: null
    })
  }, [alertState.resolve])

  const closeConfirm = useCallback((result: boolean) => {
    if (confirmState.resolve) {
      confirmState.resolve(result)
    }
    setConfirmState({
      isOpen: false,
      options: null,
      resolve: null
    })
  }, [confirmState.resolve])

  return {
    alert,
    confirm,
    showConfirm: confirm,
    alertState,
    confirmState,
    closeAlert,
    closeConfirm
  }
}
