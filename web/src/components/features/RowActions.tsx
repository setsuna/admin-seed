import { EllipsisVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * 表格操作列（照 shadcn 官方 dashboard）：一个灰色「⋮」图标按钮（32px），点开是操作菜单。
 * 菜单里先放 actions，再放 more；危险操作（danger）排在最后、分隔线下面、红字，
 * 点击后由调用方弹二次确认（说明影响）。
 *
 * 操作列请设 title: ''、width: 56、align: 'right'，与官方一致。
 */
export interface RowAction {
  key: string
  label: string
  onClick: () => void
  disabled?: boolean
  /** 删除、停用等，红字显示，排在菜单最后 */
  danger?: boolean
}

export interface RowActionsProps {
  /** 常用操作，排在菜单前面 */
  actions?: RowAction[]
  /** 其余操作，危险操作放这里 */
  more?: RowAction[]
  /** 按钮的无障碍名称，默认「更多操作」 */
  label?: string
}

export function RowActions({ actions = [], more = [], label = '更多操作' }: RowActionsProps) {
  const all = [...actions, ...more].filter(Boolean)
  const normal = all.filter((a) => !a.danger)
  const danger = all.filter((a) => a.danger)
  if (all.length === 0) return null

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            className="size-8 text-muted-foreground data-[state=open]:bg-muted"
          >
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          {normal.map((a) => (
            <DropdownMenuItem key={a.key} onSelect={a.onClick} disabled={a.disabled}>
              {a.label}
            </DropdownMenuItem>
          ))}
          {normal.length > 0 && danger.length > 0 && <DropdownMenuSeparator />}
          {danger.map((a) => (
            <DropdownMenuItem key={a.key} onSelect={a.onClick} disabled={a.disabled} variant="destructive">
              {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
