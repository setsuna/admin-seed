import { useState } from 'react'
import { EllipsisVertical, KeyRound, LogOut } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { APP_VERSION_FULL } from '@/utils/version'
import type { User } from '@/types'

/**
 * 侧栏底部的当前用户（照 shadcn 官方 dashboard 的 NavUser）：
 * 头像 + 姓名 + 账号，点开是修改密码、退出登录，底部带版本号。
 */
export function NavUser({
  user,
  onChangePassword,
  onLogout,
}: {
  user: User
  onChangePassword: () => void
  onLogout: () => void
}) {
  const { isMobile } = useSidebar()
  const [open, setOpen] = useState(false)
  const name = user.name || user.username
  const avatar = (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
      {name.charAt(0).toUpperCase()}
    </span>
  )
  const identity = (
    <span className="grid flex-1 text-left text-sm leading-tight">
      <span className="truncate font-medium">{name}</span>
      <span className="truncate text-xs text-muted-foreground">{user.username}</span>
    </span>
  )
  const itemClass =
    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground [&>svg]:size-4 [&>svg]:text-muted-foreground'

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label="用户菜单"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {avatar}
              {identity}
              <EllipsisVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </PopoverTrigger>
          <PopoverContent
            className="w-(--radix-popover-trigger-width) min-w-56 rounded-lg p-1"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <div className="flex items-center gap-2 px-1 py-1.5">
              {avatar}
              {identity}
            </div>
            <div className="-mx-1 my-1 h-px bg-border" />
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                setOpen(false)
                onChangePassword()
              }}
            >
              <KeyRound />
              修改密码
            </button>
            <button type="button" className={itemClass} onClick={onLogout}>
              <LogOut />
              退出登录
            </button>
            <div className="-mx-1 my-1 h-px bg-border" />
            <div className="px-2 py-1 text-xs text-muted-foreground tabular-nums">版本 {APP_VERSION_FULL}</div>
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
