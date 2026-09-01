import { lazy, Suspense, useMemo } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { MainLayout } from '@/components/layouts'
import { Loading } from '@/components/ui/Loading'
import { useStore } from '@/store'
import { useMenuPermission } from '@/hooks/usePermission'
import { generateRoutesFromMenus } from '@/utils/routeGenerator'

const LoginPage = lazy(() => import('@/pages/LoginPage'))

function LazyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Loading />}>
      {children}
    </Suspense>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // ✅ 直接订阅 user，避免 useGlobalStore() 返回新对象
  const user = useStore((state) => state.user)
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  // ✅ 直接订阅 user
  const user = useStore((state) => state.user)
  
  if (user) {
    return <Navigate to="/" replace />
  }
  
  return <>{children}</>
}

// 静态基础路由
const staticRoutes = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LazyWrapper>
          <LoginPage />
        </LazyWrapper>
      </PublicRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
])

// 动态路由提供者组件
export function DynamicRouter() {
  // ✅ 直接订阅 user，避免不必要的重渲染
  const user = useStore((state) => state.user)
  const { menus, isLoading } = useMenuPermission()

  // ✅ 将 useMemo 移到所有条件判断之前，确保 Hook 调用顺序一致
  const router = useMemo(() => {
    // 生成动态路由
    const dynamicRoutes = generateRoutesFromMenus(menus)
    
    return createBrowserRouter([
      {
        path: '/login',
        element: (
          <PublicRoute>
            <LazyWrapper>
              <LoginPage />
            </LazyWrapper>
          </PublicRoute>
        ),
      },
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        ),
        children: dynamicRoutes,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ])
  }, [menus])  // ✅ 只依赖 menus

  // ✅ 条件判断放在所有 Hooks 之后
  // 未登录时使用静态路由
  if (!user) {
    return <RouterProvider router={staticRoutes} />
  }

  // 加载菜单时显示加载状态
  if (isLoading) {
    return <Loading />
  }

  return <RouterProvider router={router} />
}

// 导出空的 router 用于兼容旧代码
export const router = staticRoutes
