import { useRoutePermission } from '@/hooks/usePermission'

interface PermissionGuardProps {
  children: React.ReactNode
  permissions?: string[]
  fallback?: React.ReactNode
}

export function PermissionGuard({ 
  children, 
  permissions = [], 
  fallback 
}: PermissionGuardProps) {
  const { hasAccess, isLoading } = useRoutePermission(permissions)
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">加载中...</div>
      </div>
    )
  }
  
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="text-lg font-medium text-muted-foreground">权限不足</div>
        <div className="text-sm text-muted-foreground">
          您没有权限访问此页面，请联系管理员
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}
