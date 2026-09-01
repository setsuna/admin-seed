/**
 * 权限管理页面（重写）
 * 角色卡片概览 + 权限矩阵（只读/编辑模式）
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { permissionApi } from '@/services/permission'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { FormModal } from '@/components/ui/FormModal'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { DialogComponents } from '@/components/ui/DialogComponents'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip'
import { useDialog } from '@/hooks/useModal'
import { useNotifications } from '@/hooks/useNotifications'
import {
  ChevronRight, ChevronDown, Plus, Pencil, Trash2, Shield,
  ChevronsDownUp, ChevronsUpDown, Save, X, PenLine,
} from 'lucide-react'
import type { Role, RoleStatus, PermissionGroup } from '@/types'
import type { CreateRoleRequest, UpdateRoleRequest } from '@/services/api/permission.api'
import { PageActions } from '@/components/layouts/PageActions'

// ============================================================
// 类型定义
// ============================================================

/** 编辑草稿：roleId → { permCode → boolean } */
type EditDraft = Record<string, Record<string, boolean>>

interface ChangeSummary {
  changedRoles: number
  added: number
  removed: number
}

// ============================================================
// 主页面
// ============================================================

export default function PermissionManagePage() {
  const dialog = useDialog()
  const { showSuccess, showError } = useNotifications()
  const queryClient = useQueryClient()

  // --- 角色弹窗状态 ---
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)

  // --- 分组折叠状态 ---
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // --- 编辑模式状态 ---
  const [isEditing, setIsEditing] = useState(false)
  const [editDraft, setEditDraft] = useState<EditDraft>({})
  const originalSnapshot = useRef<EditDraft>({})

  // ======================== 数据查询 ========================

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => permissionApi.getAllRoles(),
  })

  const { data: permissionGroups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['permissionGroups'],
    queryFn: () => permissionApi.getPermissionGroups(),
  })

  const { data: matrix = [], isLoading: matrixLoading } = useQuery({
    queryKey: ['rolePermissionMatrix'],
    queryFn: () => permissionApi.getRolePermissionMatrix(),
  })

  // ======================== 派生数据 ========================

  const totalPermissions = useMemo(
    () => permissionGroups.reduce((sum, g) => sum + (g.permissions?.length || 0), 0),
    [permissionGroups]
  )

  // 在编辑模式下用 editDraft 计算，否则用 matrix
  const rolePermissionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (isEditing) {
      Object.entries(editDraft).forEach(([roleId, perms]) => {
        counts[roleId] = Object.values(perms).filter(Boolean).length
      })
    } else {
      matrix.forEach((rm) => {
        counts[rm.roleId] = Object.values(rm.permissions).filter(Boolean).length
      })
    }
    return counts
  }, [matrix, editDraft, isEditing])

  // 变更摘要
  const changeSummary = useMemo((): ChangeSummary => {
    if (!isEditing) return { changedRoles: 0, added: 0, removed: 0 }
    let changedRoles = 0
    let added = 0
    let removed = 0
    const orig = originalSnapshot.current
    Object.keys(editDraft).forEach((roleId) => {
      const origPerms = orig[roleId] || {}
      const draftPerms = editDraft[roleId] || {}
      let roleChanged = false
      const allCodes = new Set([...Object.keys(origPerms), ...Object.keys(draftPerms)])
      allCodes.forEach((code) => {
        const was = !!origPerms[code]
        const now = !!draftPerms[code]
        if (was !== now) {
          roleChanged = true
          if (now) added++
          else removed++
        }
      })
      if (roleChanged) changedRoles++
    })
    return { changedRoles, added, removed }
  }, [editDraft, isEditing])

  const hasChanges = changeSummary.changedRoles > 0

  // ======================== 分组控制 ========================

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setExpandedGroups(new Set(permissionGroups.map((g) => g.key)))
  }, [permissionGroups])

  const collapseAll = useCallback(() => {
    setExpandedGroups(new Set())
  }, [])

  // ======================== 编辑模式 ========================

  /** 进入编辑模式：拍快照 */
  const enterEditMode = useCallback(() => {
    const snapshot: EditDraft = {}
    matrix.forEach((rm) => {
      snapshot[rm.roleId] = { ...rm.permissions }
    })
    originalSnapshot.current = JSON.parse(JSON.stringify(snapshot))
    setEditDraft(snapshot)
    setIsEditing(true)
    // 进入编辑时展开所有组，方便操作
    setExpandedGroups(new Set(permissionGroups.map((g) => g.key)))
  }, [matrix, permissionGroups])

  /** 放弃修改 */
  const cancelEdit = useCallback(async () => {
    if (hasChanges) {
      const confirmed = await dialog.confirm({
        title: '放弃修改',
        message: '确定要放弃所有未保存的权限修改吗？',
        type: 'warning',
        confirmText: '放弃',
        cancelText: '继续编辑',
      })
      if (!confirmed) return
    }
    setIsEditing(false)
    setEditDraft({})
  }, [hasChanges, dialog])

  /** 切换单个权限 */
  const togglePermission = useCallback((roleId: string, permCode: string) => {
    setEditDraft((prev) => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [permCode]: !prev[roleId]?.[permCode],
      },
    }))
  }, [])

  /** 切换整组权限 */
  const toggleGroupPermissions = useCallback(
    (roleId: string, group: PermissionGroup) => {
      const codes = group.permissions?.map((p) => p.code) || []
      if (codes.length === 0) return
      setEditDraft((prev) => {
        const rolePerms = { ...prev[roleId] }
        // 判断当前是否全选
        const allChecked = codes.every((c) => rolePerms[c])
        codes.forEach((c) => {
          rolePerms[c] = !allChecked
        })
        return { ...prev, [roleId]: rolePerms }
      })
    },
    []
  )

  // ======================== 保存权限 ========================

  const savePermissionsMutation = useMutation({
    mutationFn: async () => {
      const orig = originalSnapshot.current
      const promises: Promise<any>[] = []

      Object.keys(editDraft).forEach((roleId) => {
        const origPerms = orig[roleId] || {}
        const draftPerms = editDraft[roleId] || {}

        // 检查此角色是否有变更
        const changed = Object.keys({ ...origPerms, ...draftPerms }).some(
          (code) => !!origPerms[code] !== !!draftPerms[code]
        )
        if (!changed) return

        // 提取所有 true 的权限码
        const newPermissions = Object.entries(draftPerms)
          .filter(([, v]) => v)
          .map(([k]) => k)

        promises.push(permissionApi.updateRolePermissions(roleId, newPermissions))
      })

      await Promise.all(promises)
      return promises.length
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      queryClient.invalidateQueries({ queryKey: ['rolePermissionMatrix'] })
      setIsEditing(false)
      setEditDraft({})
      showSuccess('权限保存成功', `已更新 ${count} 个角色的权限`)
    },
    onError: (err: any) => showError('权限保存失败', err.message),
  })

  const handleSave = useCallback(async () => {
    const confirmed = await dialog.confirm({
      title: '保存权限修改',
      message: `即将更新 ${changeSummary.changedRoles} 个角色的权限（新增 ${changeSummary.added} 项，移除 ${changeSummary.removed} 项），确认保存？`,
      type: 'info',
      confirmText: '保存',
      cancelText: '取消',
    })
    if (confirmed) {
      savePermissionsMutation.mutate()
    }
  }, [dialog, changeSummary, savePermissionsMutation])

  // ======================== 角色 CRUD mutations ========================

  const createRoleMutation = useMutation({
    mutationFn: (data: CreateRoleRequest) => permissionApi.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      queryClient.invalidateQueries({ queryKey: ['rolePermissionMatrix'] })
      setShowRoleModal(false)
      setEditingRole(null)
      showSuccess('角色创建成功')
    },
    onError: (err: any) => showError('角色创建失败', err.message),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleRequest }) =>
      permissionApi.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      queryClient.invalidateQueries({ queryKey: ['rolePermissionMatrix'] })
      setShowRoleModal(false)
      setEditingRole(null)
      showSuccess('角色更新成功')
    },
    onError: (err: any) => showError('角色更新失败', err.message),
  })

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => permissionApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      queryClient.invalidateQueries({ queryKey: ['rolePermissionMatrix'] })
      showSuccess('角色删除成功')
    },
    onError: (err: any) => showError('角色删除失败', err.message),
  })

  // ======================== 角色操作 ========================

  const handleEditRole = (role: Role) => {
    setEditingRole(role)
    setShowRoleModal(true)
  }

  const handleDeleteRole = async (role: Role) => {
    const message = role.isBuiltIn
      ? `「${role.name}」是内置角色，删除后可能影响系统正常运行。确定要删除吗？`
      : `确定要删除角色「${role.name}」吗？此操作不可恢复。`
    const confirmed = await dialog.confirm({
      title: '删除角色',
      message,
      type: 'danger',
      confirmText: '确认删除',
      cancelText: '取消',
    })
    if (confirmed) {
      deleteRoleMutation.mutate(role.id)
    }
  }

  const handleRoleSubmit = (formData: RoleFormData) => {
    if (editingRole) {
      updateRoleMutation.mutate({
        id: editingRole.id,
        data: {
          name: formData.name,
          code: formData.code,
          description: formData.description,
          status: formData.status,
        },
      })
    } else {
      createRoleMutation.mutate({
        name: formData.name,
        code: formData.code,
        description: formData.description,
        status: formData.status,
        permissions: [],
      })
    }
  }

  // ======================== 矩阵辅助 ========================

  /** 某角色在某权限组内的选中状态 */
  const getGroupCheckState = useCallback(
    (roleId: string, group: PermissionGroup): 'all' | 'some' | 'none' => {
      const codes = group.permissions?.map((p) => p.code) || []
      if (codes.length === 0) return 'none'

      let checkedCount: number
      if (isEditing) {
        const rolePerms = editDraft[roleId] || {}
        checkedCount = codes.filter((c) => rolePerms[c]).length
      } else {
        const rm = matrix.find((m) => m.roleId === roleId)
        if (!rm) return 'none'
        checkedCount = codes.filter((c) => rm.permissions[c]).length
      }

      if (checkedCount === 0) return 'none'
      if (checkedCount === codes.length) return 'all'
      return 'some'
    },
    [matrix, editDraft, isEditing]
  )

  /** 获取某角色某权限的当前值（编辑/只读模式自动切换数据源） */
  const getPermissionValue = useCallback(
    (roleId: string, permCode: string): boolean => {
      if (isEditing) {
        return !!editDraft[roleId]?.[permCode]
      }
      const rm = matrix.find((m) => m.roleId === roleId)
      return !!rm?.permissions[permCode]
    },
    [matrix, editDraft, isEditing]
  )

  // ======================== Loading ========================

  if (rolesLoading || groupsLoading || matrixLoading) {
    return <Loading />
  }

  // ======================== Render ========================

  return (
    <TooltipProvider delayDuration={300}>
      <div className="p-6 space-y-6">
        {/* 页面级操作：Portal 到顶栏面包屑那一行 */}
        <PageActions>
          <Button
            onClick={() => { setEditingRole(null); setShowRoleModal(true) }}
            disabled={isEditing}
          >
            <Plus className="w-4 h-4" />
            新增角色
          </Button>
        </PageActions>

        {/* ====== 角色概览卡片 ====== */}
        <RoleCardGrid
          roles={roles}
          totalPermissions={totalPermissions}
          rolePermissionCounts={rolePermissionCounts}
          onEdit={handleEditRole}
          onDelete={handleDeleteRole}
          disabled={isEditing}
        />

        {/* ====== 权限矩阵 ====== */}
        <div>
          {/* 矩阵标题栏 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">权限矩阵</h2>
              {isEditing && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  编辑中
                </span>
              )}
            </div>

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={expandAll}>
                    <ChevronsUpDown className="w-4 h-4" />
                    全部展开
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAll}>
                    <ChevronsDownUp className="w-4 h-4" />
                    全部折叠
                  </Button>
                  <div className="w-px bg-border mx-1" />
                  <Button variant="outline" size="sm" onClick={cancelEdit}>
                    <X className="w-4 h-4" />
                    放弃修改
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!hasChanges || savePermissionsMutation.isPending}
                    loading={savePermissionsMutation.isPending}
                  >
                    <Save className="w-4 h-4" />
                    保存修改
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={expandAll}>
                    <ChevronsUpDown className="w-4 h-4" />
                    全部展开
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAll}>
                    <ChevronsDownUp className="w-4 h-4" />
                    全部折叠
                  </Button>
                  <div className="w-px bg-border mx-1" />
                  <Button size="sm" onClick={enterEditMode}>
                    <PenLine className="w-4 h-4" />
                    编辑权限
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* 变更摘要 */}
          {isEditing && hasChanges && (
            <div className="mb-3 px-4 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
              已修改 <strong>{changeSummary.changedRoles}</strong> 个角色
              {changeSummary.added > 0 && <> · 新增 <strong className="text-green-600 dark:text-green-400">{changeSummary.added}</strong> 项</>}
              {changeSummary.removed > 0 && <> · 移除 <strong className="text-red-600 dark:text-red-400">{changeSummary.removed}</strong> 项</>}
            </div>
          )}

          {/* 矩阵表格 */}
          <PermissionMatrix
            roles={roles}
            permissionGroups={permissionGroups}
            expandedGroups={expandedGroups}
            onToggleGroup={toggleGroup}
            getGroupCheckState={getGroupCheckState}
            getPermissionValue={getPermissionValue}
            isEditing={isEditing}
            onTogglePermission={togglePermission}
            onToggleGroupPermissions={toggleGroupPermissions}
          />
        </div>

        {/* ====== 角色编辑弹窗 ====== */}
        <RoleModal
          isOpen={showRoleModal}
          onClose={() => { setShowRoleModal(false); setEditingRole(null) }}
          role={editingRole}
          onSubmit={handleRoleSubmit}
          isLoading={createRoleMutation.isPending || updateRoleMutation.isPending}
        />

        {/* ====== 对话框渲染 ====== */}
        <DialogComponents dialog={dialog} />
      </div>
    </TooltipProvider>
  )
}

// ============================================================
// 角色卡片网格
// ============================================================

interface RoleCardGridProps {
  roles: Role[]
  totalPermissions: number
  rolePermissionCounts: Record<string, number>
  onEdit: (role: Role) => void
  onDelete: (role: Role) => void
  disabled?: boolean
}

function RoleCardGrid({ roles, totalPermissions, rolePermissionCounts, onEdit, onDelete, disabled }: RoleCardGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {roles.map((role) => {
        const count = rolePermissionCounts[role.id] || 0
        const color = role.metadata?.color || '#6B7280'
        return (
          <Card
            key={role.id}
            className={`group relative p-4 transition-shadow ${disabled ? 'opacity-60' : 'hover:shadow-md'}`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg" style={{ backgroundColor: color }} />
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 flex-shrink-0" style={{ color }} />
                <span className="font-semibold text-sm truncate">{role.name}</span>
                {role.isBuiltIn && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">内置</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono mb-1">{role.code}</p>
              {role.description && (
                <p className="text-xs text-muted-foreground truncate mb-1" title={role.description}>{role.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{count}/{totalPermissions} 权限</span>
                {role.userCount !== undefined && <span>{role.userCount} 人</span>}
              </div>
              <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${totalPermissions > 0 ? (count / totalPermissions) * 100 : 0}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
            {!disabled && (
              <div className="absolute inset-0 rounded-lg bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(role)}>
                  <Pencil className="w-3 h-3" />
                  编辑
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(role)}
                >
                  <Trash2 className="w-3 h-3" />
                  删除
                </Button>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ============================================================
// 权限矩阵表格
// ============================================================

interface PermissionMatrixProps {
  roles: Role[]
  permissionGroups: PermissionGroup[]
  expandedGroups: Set<string>
  onToggleGroup: (key: string) => void
  getGroupCheckState: (roleId: string, group: PermissionGroup) => 'all' | 'some' | 'none'
  getPermissionValue: (roleId: string, permCode: string) => boolean
  isEditing: boolean
  onTogglePermission: (roleId: string, permCode: string) => void
  onToggleGroupPermissions: (roleId: string, group: PermissionGroup) => void
}

function PermissionMatrix({
  roles,
  permissionGroups,
  expandedGroups,
  onToggleGroup,
  getGroupCheckState,
  getPermissionValue,
  isEditing,
  onTogglePermission,
  onToggleGroupPermissions,
}: PermissionMatrixProps) {
  const ROLE_COL_W = 'w-28'

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-20 bg-muted/50 text-left px-4 py-3 text-sm font-medium min-w-[220px] border-r">
                权限项
              </th>
              {roles.map((role) => (
                <th
                  key={role.id}
                  className={`${ROLE_COL_W} px-2 py-3 text-center text-sm font-medium border-r last:border-r-0`}
                >
                  <div className="truncate">{role.name}</div>
                  <div className="text-xs text-muted-foreground font-mono font-normal truncate">{role.code}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissionGroups.map((group) => (
              <GroupRows
                key={group.key}
                group={group}
                roles={roles}
                isExpanded={expandedGroups.has(group.key)}
                onToggle={() => onToggleGroup(group.key)}
                getGroupCheckState={getGroupCheckState}
                getPermissionValue={getPermissionValue}
                isEditing={isEditing}
                onTogglePermission={onTogglePermission}
                onToggleGroupPermissions={onToggleGroupPermissions}
                roleColW={ROLE_COL_W}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// 权限组行
// ============================================================

interface GroupRowsProps {
  group: PermissionGroup
  roles: Role[]
  isExpanded: boolean
  onToggle: () => void
  getGroupCheckState: (roleId: string, group: PermissionGroup) => 'all' | 'some' | 'none'
  getPermissionValue: (roleId: string, permCode: string) => boolean
  isEditing: boolean
  onTogglePermission: (roleId: string, permCode: string) => void
  onToggleGroupPermissions: (roleId: string, group: PermissionGroup) => void
  roleColW: string
}

function GroupRows({
  group,
  roles,
  isExpanded,
  onToggle,
  getGroupCheckState,
  getPermissionValue,
  isEditing,
  onTogglePermission,
  onToggleGroupPermissions,
  roleColW,
}: GroupRowsProps) {
  const permissions = group.permissions || []

  return (
    <>
      {/* 组标题行 */}
      <tr className="bg-muted/30 border-t">
        <td className="sticky left-0 z-10 bg-muted/30 px-4 py-2.5 border-r">
          <button
            className="flex items-center gap-1.5 font-medium text-sm hover:text-primary transition-colors"
            onClick={onToggle}
          >
            {isExpanded
              ? <ChevronDown className="w-4 h-4" />
              : <ChevronRight className="w-4 h-4" />
            }
            {group.name}
            <span className="text-xs text-muted-foreground font-normal">({permissions.length})</span>
          </button>
        </td>
        {roles.map((role) => {
          const state = getGroupCheckState(role.id, group)
          return (
            <td key={role.id} className={`${roleColW} text-center px-2 py-2.5 border-r last:border-r-0`}>
              <TriStateCheckbox
                state={state}
                disabled={!isEditing}
                onChange={isEditing ? () => onToggleGroupPermissions(role.id, group) : undefined}
              />
            </td>
          )
        })}
      </tr>

      {/* 权限子行 */}
      {isExpanded && permissions.map((perm) => (
        <tr key={perm.id} className="border-t border-dashed hover:bg-muted/10">
          <td className="sticky left-0 z-10 bg-background px-4 py-2 pl-10 border-r">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm cursor-default">{perm.name}</span>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="font-mono text-xs mb-1">{perm.code}</p>
                {perm.description && <p className="text-xs text-muted-foreground">{perm.description}</p>}
              </TooltipContent>
            </Tooltip>
          </td>
          {roles.map((role) => {
            const checked = getPermissionValue(role.id, perm.code)
            return (
              <td key={role.id} className={`${roleColW} text-center px-2 py-2 border-r last:border-r-0`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!isEditing}
                  onChange={isEditing ? () => onTogglePermission(role.id, perm.code) : undefined}
                  readOnly={!isEditing}
                  className={`w-4 h-4 rounded border-gray-300 text-primary ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}
                />
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}

// ============================================================
// 三态 Checkbox 组件
// ============================================================

interface TriStateCheckboxProps {
  state: 'all' | 'some' | 'none'
  disabled?: boolean
  onChange?: () => void
}

function TriStateCheckbox({ state, disabled, onChange }: TriStateCheckboxProps) {
  const ref = useCallback(
    (el: HTMLInputElement | null) => {
      if (el) el.indeterminate = state === 'some'
    },
    [state]
  )

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === 'all'}
      disabled={disabled}
      onChange={onChange}
      readOnly={!onChange}
      className={`w-4 h-4 rounded border-gray-300 text-primary ${onChange ? 'cursor-pointer' : 'cursor-default'}`}
    />
  )
}

// ============================================================
// 角色编辑弹窗
// ============================================================

interface RoleFormData {
  name: string
  code: string
  description: string
  status: RoleStatus
}

interface RoleModalProps {
  isOpen: boolean
  onClose: () => void
  role: Role | null
  onSubmit: (data: RoleFormData) => void
  isLoading: boolean
}

function RoleModal({ isOpen, onClose, role, onSubmit, isLoading }: RoleModalProps) {
  const { showWarning } = useNotifications()
  const [formData, setFormData] = useState<RoleFormData>({
    name: '', code: '', description: '', status: 'active',
  })

  // 弹窗打开时初始化表单
  useEffect(() => {
    if (isOpen) {
      if (role) {
        setFormData({
          name: role.name,
          code: role.code,
          description: role.description || '',
          status: role.status,
        })
      } else {
        setFormData({ name: '', code: '', description: '', status: 'active' })
      }
    }
  }, [isOpen, role])

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      showWarning('请输入角色名称')
      return
    }
    if (!formData.code.trim()) {
      showWarning('请输入角色代码')
      return
    }
    onSubmit(formData)
  }

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={role ? '编辑角色' : '新增角色'}
      size="lg"
      onSubmit={handleSubmit}
      submitText={isLoading ? '保存中...' : '保存'}
      cancelText="取消"
      isLoading={isLoading}
      disabled={isLoading || !formData.name.trim() || !formData.code.trim()}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">角色名称</label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
              placeholder="请输入角色名称"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">角色代码</label>
            <Input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData((d) => ({ ...d, code: e.target.value }))}
              placeholder="如 meeting_admin"
              required
              disabled={!!role}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">状态</label>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData((d) => ({ ...d, status: v as RoleStatus }))}
            options={[
              { value: 'active', label: '启用' },
              { value: 'inactive', label: '停用' },
            ]}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">描述</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData((d) => ({ ...d, description: e.target.value }))}
            rows={3}
            placeholder="请输入角色描述"
          />
        </div>
      </div>
    </FormModal>
  )
}
