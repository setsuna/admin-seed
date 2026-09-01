import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/Separator'
import { Button } from '@/components/ui/Button'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { SoundToggle } from './SoundToggle'
import { SoundEffectManager } from './SoundEffectManager'
import { PermissionInitializer } from './PermissionInitializer'
import { WebSocketInitializer } from './WebSocketInitializer'
import { IdleTimeoutManager } from './IdleTimeoutManager'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover'
import { ChangePasswordDialog } from '@/components/business/auth/ChangePasswordDialog'
import { useStore } from '@/store'
import { authService } from '@/services/core/auth.service'
import { useLocation } from 'react-router-dom'
import { getBreadcrumbFromMenu } from '@/utils/breadcrumb'
import { useMemo, useCallback, memo, useState } from 'react'
import { shallow } from 'zustand/shallow'
import { KeyRound, ChevronDown } from 'lucide-react'

// ✅ 将选择器提取到组件外部，避免每次渲染创建新函数
const selectMainLayoutState = (state: any) => ({
  menuConfig: state.menuConfig,
  user: state.user,
  clearAuth: state.clearAuth,
})

// ✅ 使用 React.memo 包装，阻止父组件重渲染导致的不必要重渲染
export const MainLayout = memo(function MainLayout() {
  // ✅ 使用单个选择器 + shallow 比较
  const { menuConfig, user, clearAuth } = useStore(selectMainLayoutState, shallow)
  const location = useLocation()
  
  // 🆕 修改密码对话框状态
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  // 🆕 用户菜单 Popover 状态
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  
  const handleLogout = useCallback(async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.warn('Logout API error:', error)
    } finally {
      clearAuth()
      window.location.href = '/login'
    }
  }, [clearAuth])
  
  // 🆕 打开修改密码对话框
  const handleChangePassword = useCallback(() => {
    setUserMenuOpen(false)
    setChangePasswordOpen(true)
  }, [])
  
  // 从菜单配置动态生成面包屑 - 使用 useMemo 缓存结果
  const breadcrumb = useMemo(() => 
    getBreadcrumbFromMenu(location.pathname, menuConfig)
  , [location.pathname, menuConfig])
  
  return (
    <SidebarProvider defaultOpen>
      {/* 音效管理器 - 负责同步状态到 soundManager */}
      <SoundEffectManager />
      
      {/* 权限初始化器 - 负责加载和设置权限配置 */}
      <PermissionInitializer />
      
      {/* WebSocket 初始化器 - 负责初始化 WebSocket 连接 */}
      <WebSocketInitializer />
      
      {/* 空闲超时管理器 - 负责监听用户活动并在超时后登出 */}
      <IdleTimeoutManager />
      
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 bg-background p-4 sm:gap-4">
          <SidebarTrigger variant="outline" className="scale-125 sm:scale-100" />
          <Separator orientation="vertical" className="h-6" />
          
          {/* 面包屑导航 */}
          <div className="flex flex-1 items-center justify-between">
            <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
              <span>{breadcrumb.module}</span>
              <span>/</span>
              {breadcrumb.parent && (
                <>
                  <span>{breadcrumb.parent}</span>
                  <span>/</span>
                </>
              )}
              {/* 页面标题的语义 landmark。视觉上就是面包屑最后一段，
                  各页不再重复渲染大标题（详见 PageActions 组件注释）。 */}
              <h1 className="text-sm font-normal text-foreground">{breadcrumb.page}</h1>
            </nav>

            {/* 右侧操作区 */}
            <div className="flex items-center gap-2">
              {/* 页面级操作按钮的挂载点，由 <PageActions> 通过 Portal 填充 */}
              <div id="page-actions" className="flex items-center gap-2" />
              {(
                <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
              )}
              {/* 音效开关 - 使用独立组件，避免父组件重渲染 */}
              <SoundToggle />
              
              {/* 主题切换 */}
              <ThemeSwitcher />
              
              {/* 用户菜单 */}
              {user && (
                <div className="flex items-center gap-3 pl-2">
                  {/* 🆕 用户头像下拉菜单 */}
                  <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                          {(user.name || user.username).charAt(0).toUpperCase()}
                        </div>
                        <div className="hidden md:block text-left">
                          <div className="text-sm font-medium">{user.name || user.username}</div>
                          <div className="text-xs text-muted-foreground">{user.role}</div>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-48 p-1">
                      <button
                        onClick={handleChangePassword}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                      >
                        <KeyRound className="h-4 w-4" />
                        <span>修改密码</span>
                      </button>
                    </PopoverContent>
                  </Popover>
                  
                  {/* 退出按钮 */}
                  <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <span className="sr-only">退出登录</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" x2="9" y1="12" y2="12" />
                    </svg>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>
        
        {/* 内容区：暖灰底（bg-page），使白底卡片/表格能从背景中“浮”出来。
            若使用 bg-background（纯白），卡片会与背景糊成一片。 */}
        <main className="flex-1 overflow-auto bg-bg-page p-6">
          <Outlet />
        </main>
      </SidebarInset>
      
      {/* 🆕 修改密码对话框 */}
      <ChangePasswordDialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </SidebarProvider>
  )
})  // ✅ memo 的闭合
