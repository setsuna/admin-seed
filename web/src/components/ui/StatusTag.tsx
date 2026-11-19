import { CircleAlert, CircleMinus, CircleX, Loader } from 'lucide-react'
import { CircleCheckFilled } from '@/components/icons/CircleCheckFilled'
import { cn } from '@/utils'

/**
 * 状态标签 —— 页面里所有「状态」都走这里，不自己选色。
 *
 * 样式照 shadcn 官方 dashboard 表格的 Status 列：白底细边框的胶囊、灰字 12/500，
 * 颜色只放在前面 12px 的小图标上。必须带文字，不能只靠颜色。
 *
 *   success  成功 / 正常 / 启用      绿色实心对勾
 *   warning  待确认 / 注意           橙色感叹号
 *   danger   错误 / 故障 / 锁定      红色叉
 *   info     处理中 / 提示           灰色转圈（官方 In Process）
 *   neutral  停用 / 未开始           灰色减号
 */
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const TONE_ICON: Record<StatusTone, React.ReactNode> = {
  success: <CircleCheckFilled className="text-success" />,
  warning: <CircleAlert className="text-warning" />,
  danger: <CircleX className="text-error" />,
  info: <Loader />,
  neutral: <CircleMinus />,
}

/** 统计卡片、圆点等地方仍按语气取文字色 / 圆点色 */
export const STATUS_TONE_STYLES: Record<StatusTone, { dot: string; text: string }> = {
  success: { dot: 'bg-success', text: 'text-success' },
  warning: { dot: 'bg-warning', text: 'text-warning' },
  danger: { dot: 'bg-error', text: 'text-error' },
  info: { dot: 'bg-info', text: 'text-info' },
  neutral: { dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
}

export interface StatusTagProps {
  tone: StatusTone
  /** 状态文字（必填） */
  children: React.ReactNode
  className?: string
}

export function StatusTag({ tone, children, className }: StatusTagProps) {
  return (
    <span
      data-slot="status-tag"
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-xs font-medium text-muted-foreground [&>svg]:size-3 [&>svg]:shrink-0',
        className
      )}
    >
      {TONE_ICON[tone]}
      {children}
    </span>
  )
}
