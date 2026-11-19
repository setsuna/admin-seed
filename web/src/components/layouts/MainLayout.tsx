import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { SoundToggle } from './SoundToggle'
import { SoundEffectManager } from './SoundEffectManager'
import { PermissionInitializer } from './PermissionInitializer'
import { WebSocketInitializer } from './WebSocketInitializer'
import { IdleTimeoutManager } from './IdleTimeoutManager'
import { ChangePasswordDialog } from '@/components/business/auth/ChangePasswordDialog'
import { useStore } from '@/store'
import { authService } from '@/services/core/auth.service'
import { useLocation } from 'react-router-dom'
import { getBreadcrumbFromMenu } from '@/utils/breadcrumb'
import { useMemo, useCallback, memo, useState } from 'react'
import { shallow } from 'zustand/shallow'
import { NavUser } from './NavUser'

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
      
      {/* 结构照 shadcn 官方 dashboard（ui.shadcn.com/examples/dashboard）：
          左侧栏通顶（顶部系统名、底部当前用户）；右侧 = 顶栏（48 + 1px 底线）+ 内容区 */}
      <AppSidebar
        footer={user && <NavUser user={user} onChangePassword={handleChangePassword} onLogout={handleLogout} />}
      />
      <SidebarInset className="min-w-0">
        {/* 顶栏：折叠按钮 | 面包屑（最后一段即页面标题）… 页面操作 + 音效 + 主题。
            手机上页面操作按钮换到第二行，桌面一行。 */}
        <header className="sticky top-0 z-10 flex min-h-header shrink-0 items-center border-b bg-background md:h-header">
          <div className="flex w-full min-w-0 flex-wrap items-center gap-1 px-4 py-2 md:flex-nowrap md:py-0 lg:gap-2 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />

            {/* 面包屑：手机上只显示当前页 */}
            <nav aria-label="面包屑" className="min-w-0 flex-1 text-sm text-muted-foreground">
              <ol className="flex items-center gap-1.5 whitespace-nowrap">
                {[breadcrumb.module, breadcrumb.parent].filter(Boolean).map((item) => (
                  <li key={item} className="hidden items-center gap-1.5 md:flex">
                    <span className="truncate">{item}</span>
                    <span aria-hidden>/</span>
                  </li>
                ))}
                {/* 页面标题的语义 landmark。视觉上就是面包屑最后一段，
                    各页不再重复渲染大标题（详见 PageActions 组件注释）。 */}
                <li aria-current="page" className="min-w-0">
                  <h1 className="truncate text-base font-medium text-foreground">{breadcrumb.page}</h1>
                </li>
              </ol>
            </nav>

            {/* 页面级操作按钮的挂载点，由 <PageActions> 通过 Portal 填充 */}
            <div
              id="page-actions"
              className="order-last flex basis-full items-center gap-2 empty:hidden md:order-none md:basis-auto md:overflow-x-auto"
            />
            <SoundToggle />
            <ThemeSwitcher />
          </div>
        </header>
        
        {/* 内容区：白底（与 shadcn 一致）。侧栏是极浅灰 + 右边线，
            卡片/表格靠 1px 边框成形，不再靠「灰底托白卡」。 */}
        <main className="flex-1 overflow-auto bg-background p-page">
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
