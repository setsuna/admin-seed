/**
 * 动态路由生成器
 * 根据后端返回的菜单配置动态生成路由配置
 */

import { lazy, Suspense, ComponentType } from 'react'
import { RouteObject } from 'react-router-dom'
import type { MenuItem } from '@/types'
import { PermissionGuard } from '@/components/business/permission/PermissionGuard'
import { Loading } from '@/components/ui/Loading'

// 页面组件映射表
const PAGE_COMPONENTS: Record<string, () => Promise<{ default: ComponentType<any> }>> = {
  '/': () => import('@/pages/Dashboard'),
  '/participants': () => import('@/pages/UserManagePage'),
  '/role-permissions': () => import('@/pages/permission/PermissionManagePage'),
  '/security-levels': () => import('@/pages/UserManagePage'),
  '/departments': () => import('@/pages/DepartmentPage'),
  '/users': () => import('@/pages/UserManagePage'),
  '/security-users': () => import('@/pages/UserManagePage'),
  '/data-dictionary': () => import('@/pages/DataDictionaryPage'),
  '/basic-config': () => import('@/pages/PolicyConfigPage'),
  '/admin-logs': () => import('@/pages/LogPage'),
  '/audit-logs': () => import('@/pages/LogPage'),
  '/anomaly-alerts': () => Promise.resolve({
    default: () => (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">异常行为告警</h1>
        <p className="text-muted-foreground">异常行为告警页面待开发</p>
      </div>
    )
  }),
  '/system-logs': () => Promise.resolve({
    default: () => (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">系统日志</h1>
        <p className="text-muted-foreground">系统日志页面待开发</p>
      </div>
    )
  }),
  '/staff': () => Promise.resolve({
    default: () => (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">人员管理</h1>
        <p className="text-muted-foreground">人员管理页面待开发</p>
      </div>
    )
  }),
}

// 页面属性配置
const PAGE_PROPS: Record<string, any> = {
  '/participants': { mode: 'admin' },
  '/security-levels': { mode: 'security_level' },
  '/users': { mode: 'admin' },
  '/security-users': { mode: 'security' },
  '/admin-logs': { mode: 'application' },
  '/audit-logs': { mode: 'three-admin' },
}

// 创建会议表单页的懒加载组件
// 注意：直接 lazy(() => import(...)) 拿到组件本身，以 JSX 元素渲染并通过 props 传 mode。
// 切勿写成 () => module.default({ mode }) 这种“把组件当函数调用”的形式——
// 将其识别为组件类型，编辑该文件热更新时极易触发 hooks 错位 / context 丢失
// （如 useSidebar 报 “must be used within a SidebarProvider”）。

// 额外的子路由配置（不在菜单中但需要的路由）
//
// 种子项目没有额外路由。业务项目在此登记不出现在菜单里、
// 但需要单独可访问的页面（如 xxx/create、xxx/edit/:id）。
function getExtraRoutes(): RouteObject[] {
  return []
}

// 懒加载包装器
function LazyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Loading />}>
      {children}
    </Suspense>
  )
}

// 创建懒加载组件
function createLazyComponent(path: string) {
  const componentLoader = PAGE_COMPONENTS[path]
  if (!componentLoader) {
    return lazy(() => Promise.resolve({
      default: () => (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">页面未找到</h1>
          <p className="text-muted-foreground">路径: {path}</p>
        </div>
      )
    }))
  }

  return lazy(async () => {
    const module = await componentLoader()
    const Component = module.default
    const props = PAGE_PROPS[path] || {}
    
    return {
      default: (componentProps: any) => <Component {...props} {...componentProps} />
    }
  })
}

// 从菜单项生成路由配置
function menuItemToRoute(menuItem: MenuItem): RouteObject | null {
  // 跳过分组类型和没有路径的项
  if (menuItem.type === 'group' || !menuItem.path) {
    return null
  }

  const Component = createLazyComponent(menuItem.path)
  const permissions = menuItem.permissions || []

  // 移除开头的斜杠，因为这些是子路由
  const routePath = menuItem.path.startsWith('/') ? menuItem.path.slice(1) : menuItem.path
  // 根路径特殊处理
  const finalPath = routePath === '' ? undefined : routePath

  return {
    path: finalPath,
    index: routePath === '',
    element: (
      <PermissionGuard permissions={permissions}>
        <LazyWrapper>
          <Component />
        </LazyWrapper>
      </PermissionGuard>
    ),
  }
}

// 递归提取所有菜单项（包括子菜单）
function extractAllMenuItems(menus: MenuItem[]): MenuItem[] {
  const items: MenuItem[] = []
  
  function traverse(menuList: MenuItem[]) {
    for (const menu of menuList) {
      if (menu.type !== 'group' && menu.path) {
        items.push(menu)
      }
      if (menu.children && menu.children.length > 0) {
        traverse(menu.children)
      }
    }
  }
  
  traverse(menus)
  return items
}

/**
 * 根据菜单配置生成动态路由
 */
export function generateRoutesFromMenus(menus: MenuItem[]): RouteObject[] {
  const allMenuItems = extractAllMenuItems(menus)
  
  const routes: RouteObject[] = []
  
  for (const menuItem of allMenuItems) {
    const route = menuItemToRoute(menuItem)
    if (route) {
      routes.push(route)
    }
  }
  
  // 添加额外的子路由
  routes.push(...getExtraRoutes())
  
  return routes
}
