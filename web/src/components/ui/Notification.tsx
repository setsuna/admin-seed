import { X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/utils'
import { useStore } from '@/store'
import type { NotificationType } from '@/types'

/**
 * 顶部提示（Toast）。
 *
 * 视觉与全站卡片同一套语言：实色底（popover 色，深浅模式自动跟随）+ 1px 边框
 * + 浮层阴影，语义色只用在图标上。
 *
 * 旧实现是「语义色 20% 透明底 + 同色文字」：叠在白色顶栏/表格上发灰发脏，
 * 绿底绿字、红底红字可读性也差，和中性灰的后台风格不搭。
 */

const notificationConfig = {
  success: { icon: CheckCircle2, iconClass: 'text-success' },
  error: { icon: XCircle, iconClass: 'text-error' },
  warning: { icon: AlertTriangle, iconClass: 'text-warning' },
  info: { icon: Info, iconClass: 'text-info' },
} as const

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
  // 只有一行时（无副文案）垂直居中，图标与文字对齐更整齐
  const single = !title || !message

  return (
    <div
      role={type === 'error' || type === 'warning' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex w-full gap-2.5 rounded-lg border bg-popover px-3.5 py-2.5 text-popover-foreground',
        'shadow-[0_6px_24px_-6px_rgba(0,0,0,0.12),0_2px_6px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_6px_24px_-6px_rgba(0,0,0,0.5)]',
        'animate-in fade-in-0 slide-in-from-top-2 duration-200',
        single ? 'items-center' : 'items-start'
      )}
    >
      <Icon className={cn('h-[18px] w-[18px] shrink-0', !single && 'mt-px', config.iconClass)} />
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-medium leading-5">{title}</p>}
        {message && (
          <p className={cn('text-sm leading-5', title ? 'mt-0.5 text-muted-foreground' : 'text-foreground')}>
            {message}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onClose(id)}
        aria-label="关闭提示"
        className={cn(
          'shrink-0 rounded p-0.5 text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground',
          !single && '-mr-1'
        )}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function NotificationContainer() {
  const notifications = useStore((state) => state.notifications)
  const removeNotification = useStore((state) => state.removeNotification)

  if (notifications.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-3 z-100 flex w-[min(380px,calc(100vw-2rem))] -translate-x-1/2 flex-col items-stretch gap-2"
    >
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
