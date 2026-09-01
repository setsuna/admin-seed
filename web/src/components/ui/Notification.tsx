import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/utils'
import { useStore } from '@/store'
import type { NotificationType } from '@/types'

const notificationConfig = {
  success: {
    icon: CheckCircle,
    className: 'border-success/30 bg-success/20 text-success',
  },
  error: {
    icon: AlertCircle,
    className: 'border-error/30 bg-error/20 text-error',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-warning/30 bg-warning/20 text-warning',
  },
  info: {
    icon: Info,
    className: 'border-info/30 bg-info/20 text-info',
  },
}

interface NotificationItemProps {
  id: string
  type: NotificationType
  title?: string
  message?: string
  onClose: (id: string) => void
}

function NotificationItem({ id, type, title, message, onClose }: NotificationItemProps) {
  const config = notificationConfig[type]
  const Icon = config.icon
  
  return (
    <div className={cn(
      'mb-4 flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300',
      config.className
    )}>
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-medium">{title}</h4>}
        {message && (
          <p className={cn("text-sm opacity-90", title && "mt-1")}>{message}</p>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 rounded-lg p-1 hover:bg-black/10 dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function NotificationContainer() {
  // ✅ 直接订阅 notifications 状态（Toast 列表）
  const notifications = useStore((state) => state.notifications)
  const removeNotification = useStore((state) => state.removeNotification)
  
  if (notifications.length === 0) return null
  
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-96 max-w-sm">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id!}
          id={notification.id!}
          type={notification.type}
          title={notification.title || ''}
          message={notification.message}
          onClose={removeNotification}
        />
      ))}
    </div>
  )
}
