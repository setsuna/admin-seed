/**
 * 权限验证组件
 * 提供细粒度的组件级权限控制
 */

import { ReactNode } from 'react'
import { usePermission } from '@/hooks/usePermission'

interface PermissionCheckProps {
  children: ReactNode
  permissions?: string[]
  roles?: string[]
  requireAll?: boolean // 是否需要所有权限都满足，默认为false（满足任一即可）
  fallback?: ReactNode
  loading?: ReactNode
}

export function PermissionCheck({
  children,
  permissions = [],
  roles = [],
  requireAll = false,
  fallback = null,
  loading = null
}: PermissionCheckProps) {
  const { hasPermission, hasAnyPermission, isLoading } = usePermission()

  if (isLoading && loading) {
    return <>{loading}</>
  }

  // 如果没有指定任何权限要求，直接显示内容
  if (permissions.length === 0 && roles.length === 0) {
    return <>{children}</>
  }

  // 检查权限
  let hasAccess = true

  if (permissions.length > 0) {
    if (requireAll) {
      // 需要所有权限
      hasAccess = permissions.every(permission => hasPermission(permission))
    } else {
      // 只需要任一权限
      hasAccess = hasAnyPermission(permissions)
    }
  }

  // TODO: 如果需要角色检查，可以在这里实现
  // 当前主要基于权限进行控制

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// 权限按钮组件
interface PermissionButtonProps {
  children: ReactNode
  permissions?: string[]
  roles?: string[]
  requireAll?: boolean
  onClick?: () => void
  disabled?: boolean
  className?: string
  [key: string]: any
}

export function PermissionButton({
  children,
  permissions = [],
  roles = [],
  requireAll = false,
  onClick,
  disabled = false,
  className = '',
  ...props
}: PermissionButtonProps) {
  return (
    <PermissionCheck 
      permissions={permissions} 
      roles={roles} 
      requireAll={requireAll}
      fallback={null}
    >
      <button
        onClick={onClick}
        disabled={disabled}
        className={className}
        {...props}
      >
        {children}
      </button>
    </PermissionCheck>
  )
}

// 权限链接组件
interface PermissionLinkProps {
  children: ReactNode
  permissions?: string[]
  roles?: string[]
  requireAll?: boolean
  href?: string
  className?: string
  [key: string]: any
}

export function PermissionLink({
  children,
  permissions = [],
  roles = [],
  requireAll = false,
  href,
  className = '',
  ...props
}: PermissionLinkProps) {
  return (
    <PermissionCheck 
      permissions={permissions} 
      roles={roles} 
      requireAll={requireAll}
      fallback={null}
    >
      <a
        href={href}
        className={className}
        {...props}
      >
        {children}
      </a>
    </PermissionCheck>
  )
}

// 权限表单字段组件
interface PermissionFieldProps {
  children: ReactNode
  permissions?: string[]
  readOnlyPermissions?: string[]
  writePermissions?: string[]
  deletePermissions?: string[]
  roles?: string[]
  requireAll?: boolean
  readOnlyFallback?: ReactNode
}

export function PermissionField({
  children,
  permissions = [],
  readOnlyPermissions = [],
  writePermissions = [],
  readOnlyFallback = null
}: PermissionFieldProps) {
  const { hasAnyPermission } = usePermission()

  // 检查写权限
  const canWrite = writePermissions.length === 0 || hasAnyPermission([...permissions, ...writePermissions])
  
  // 检查读权限
  const canRead = readOnlyPermissions.length === 0 || hasAnyPermission([...permissions, ...readOnlyPermissions])

  if (!canRead) {
    return null
  }

  if (!canWrite) {
    // 只读模式
    return <>{readOnlyFallback || <div className="text-muted-foreground">只读</div>}</>
  }

  return <>{children}</>
}

// 权限HOC
export function withPermission<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  permissions: string[] = [],
  roles: string[] = [],
  fallback: ReactNode = null
) {
  return function PermissionWrapper(props: T) {
    return (
      <PermissionCheck 
        permissions={permissions} 
        roles={roles} 
        fallback={fallback}
      >
        <WrappedComponent {...props} />
      </PermissionCheck>
    )
  }
}

// 权限装饰器钩子
export function usePermissionState(permissions: string[] = []) {
  const { hasPermission, hasAnyPermission, isLoading } = usePermission()

  const hasAccess = permissions.length === 0 || hasAnyPermission(permissions)
  const hasFullAccess = permissions.length === 0 || permissions.every(permission => hasPermission(permission))

  return {
    hasAccess,
    hasFullAccess,
    isLoading,
    canRead: hasAccess,
    canWrite: hasFullAccess,
    canDelete: hasFullAccess
  }
}

// 批量权限检查钩子
export function useBatchPermissionCheck(permissionMap: Record<string, string[]>) {
  const { hasAnyPermission } = usePermission()

  const permissionResults = Object.entries(permissionMap).reduce((acc, [key, permissions]) => {
    acc[key] = permissions.length === 0 || hasAnyPermission(permissions)
    return acc
  }, {} as Record<string, boolean>)

  return permissionResults
}
