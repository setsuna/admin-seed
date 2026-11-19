import { useState } from 'react'
import { Upload, Trash2, Search, RefreshCw, Shield, Users, UserCheck, UserX, AlertTriangle, Key, ShieldCheck, ShieldAlert, Building } from 'lucide-react'
import { CirclePlusFilled } from '@/components/icons/CirclePlusFilled'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/features/DataTable'
import { ListPage, type StatItem } from '@/components/features/ListPage'
import { useColumnSettings } from '@/components/features/ColumnSettings'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusTag } from '@/components/ui/StatusTag'
import { Badge } from '@/components/ui/badge'
import { RowActions } from '@/components/features/RowActions'
import { Loading } from '@/components/ui/Loading'
import { FormModal } from '@/components/ui/FormModal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useGlobalDialog } from '@/components/ui/DialogProvider'
import { BatchImportDialog } from '@/components/business/user/BatchImportDialog'
import { useUser } from '@/hooks/useUser'
import { useRoleOptions } from '@/hooks/useRole'
import type { User, CreateUserRequest, UpdateUserRequest, UserSecurityLevel, TableColumn } from '@/types'
import { cn, getSecurityLevelLabel } from '@/utils'

interface UserManagePageProps {
  mode: 'admin' | 'security' | 'security_level'
}

interface UserFormData {
  username: string
  name?: string
  email?: string
  password?: string
  role: 'admin' | 'user' | 'meeting_admin' | 'auditor' | 'security_admin'
  department?: string
  position?: string
  phone?: string
  status?: 'active' | 'inactive' | 'suspended'
  securityLevel?: UserSecurityLevel
  ukeyId?: string
  allowedIps?: string
  permissions?: string[]
}

const UserManagePage: React.FC<UserManagePageProps> = ({ mode }) => {
  const { showConfirm } = useGlobalDialog()
  
  const {
    users,
    departmentOptions,
    userStats,
    pagination,
    filters,
    selectedIds,
    isLoading,
    setFilters,
    setPagination,
    setSelectedIds,
    createUserAsync,
    updateUserAsync,
    deleteUser,
    batchDeleteUsers,
    resetPassword,
    updateUserStatus,
    updateUserSecurityLevel,
    batchUpdateSecurityLevel,
    batchImportUsers,
    batchUpdateDepartment,
    isCreating,
    isUpdating,
    isDeleting,
    isBatchDeleting,
    isResettingPassword,
    isUpdatingStatus,
    isUpdatingSecurityLevel,
    isBatchUpdatingSecurityLevel,
    isBatchImporting,
    isBatchUpdatingDepartment,
    resetFilters,
    refreshData,
    getPermissionsByRole
  } = useUser()
  
  // 表单状态
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  // 「保存并继续」重置种子：每次提交后更新它的引用，作为新表单的 initialData（保留 role/department）
  const [continueSeed, setContinueSeed] = useState<{ role: string; department: string } | null>(null)
  const [showSecurityLevelModal, setShowSecurityLevelModal] = useState(false)
  const [showBatchUpdateModal, setShowBatchUpdateModal] = useState(false)
  const [showBatchDepartmentModal, setShowBatchDepartmentModal] = useState(false)
  const [batchDepartment, setBatchDepartment] = useState('')
  const [securityLevelFormData, setSecurityLevelFormData] = useState<{ securityLevel: UserSecurityLevel; reason?: string }>({
    securityLevel: 'unknown',
    reason: ''
  })
  
  // 搜索关键词状态
  const [searchKeyword, setSearchKeyword] = useState(filters.keyword || '')
  
  // 批量导入弹窗
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false)
  
  // 配置选项（过滤管理角色，与批量导入一致）
  const { roleOptions: allRoleOptions } = useRoleOptions()
  const EXCLUDED_ROLES = ['admin', 'security_admin', 'system_admin', 'audit_admin']
  const roleOptions = allRoleOptions.filter((opt: { value: string }) => !EXCLUDED_ROLES.includes(opt.value))
  
  const statusOptions = [
    { label: '正常', value: 'active' },
    { label: '禁用', value: 'inactive' },
    { label: '停用', value: 'suspended' }
  ]
  
  const securityLevelOptions = [
    { label: '密级未知', value: 'unknown' },
    { label: '内部', value: 'internal' },
    { label: '秘密', value: 'confidential' },
    { label: '机密', value: 'secret' }
  ]
  
  // 根据模式获取页面配置
  const getPageConfig = () => {
    switch (mode) {
      case 'admin':
        return {
          title: '用户管理',
          showCreateButton: true,
          showEditButton: true,
          showDeleteButton: true,
          showSecurityOperations: false,
          showSecurityLevelOperations: false
        }
      case 'security':
        return {
          title: '用户管理（安全管理员）',
          showCreateButton: false,
          showEditButton: false,
          showDeleteButton: false,
          showSecurityOperations: true,
          showSecurityLevelOperations: false
        }
      case 'security_level':
        return {
          title: '人员密级管理',
          showCreateButton: false,
          showEditButton: false,
          showDeleteButton: false,
          showSecurityOperations: false,
          showSecurityLevelOperations: true
        }
    }
  }
  
  const pageConfig = getPageConfig()
  
  // 搜索处理
  const handleSearch = () => {
    setFilters({ ...filters, keyword: searchKeyword })
    setPagination({ page: 1, pageSize: pagination?.pageSize || 20 })
  }
  
  // ========== Admin 模式操作 ==========
  const handleCreateUser = () => {
    setEditingUser(null)
    setContinueSeed({ role: 'user', department: '' })
    setIsFormModalOpen(true)
  }
  
  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setIsFormModalOpen(true)
  }
  
  const handleDeleteUser = async (user: User) => {
    const confirmed = await showConfirm({
      title: '删除用户',
      content: `确定要删除用户"${user.username}"吗？此操作无法撤销。`,
      confirmText: '删除',
      cancelText: '取消'
    })
    
    if (confirmed) {
      deleteUser(user.id)
    }
  }
  
  const handleBatchDelete = async () => {
    const confirmed = await showConfirm({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedIds.length} 个用户吗？此操作无法撤销。`,
      confirmText: '删除',
      cancelText: '取消'
    })
    
    if (confirmed) {
      batchDeleteUsers(selectedIds)
    }
  }
  
  const handleFormSubmit = async (formData: UserFormData) => {
    const allowedIpsArray = formData.allowedIps 
      ? formData.allowedIps.split(',').map(ip => ip.trim()).filter(ip => ip)
      : undefined
    
    try {
      if (editingUser) {
        const { password, ...updateData } = formData
        await updateUserAsync({
          id: editingUser.id,
          ...updateData,
          allowedIps: allowedIpsArray,
          permissions: getPermissionsByRole(formData.role)
        } as UpdateUserRequest)
      } else {
        await createUserAsync({
          ...formData,
          password: formData.password || '123456',
          status: 'active',
          securityLevel: 'unknown',
          allowedIps: allowedIpsArray,
          permissions: getPermissionsByRole(formData.role)
        } as CreateUserRequest)
      }
      setIsFormModalOpen(false)
    } catch {
      // 错误已在 mutation onError 中处理，表单保持打开
    }
  }

  // 「保存并继续」：创建成功后不关弹窗，重置表单但保留角色/部门（方便连续录同部门人员）
  const handleSubmitAndContinue = async (formData: UserFormData) => {
    const allowedIpsArray = formData.allowedIps
      ? formData.allowedIps.split(',').map(ip => ip.trim()).filter(ip => ip)
      : undefined

    try {
      await createUserAsync({
        ...formData,
        password: formData.password || '123456',
        status: 'active',
        securityLevel: 'unknown',
        allowedIps: allowedIpsArray,
        permissions: getPermissionsByRole(formData.role)
      } as CreateUserRequest)

      // 重置表单：保留 role/department，清空其余逐人不同的字段
      // 变更 continueSeed 引用以触发 FormModal 重新初始化
      setContinueSeed({
        role: formData.role,
        department: formData.department || '',
      })
    } catch {
      // 错误已在 mutation onError 中处理，表单保持打开
    }
  }
  
  // ========== Security 模式操作 ==========
  const handleResetPassword = async (user: User) => {
    const confirmed = await showConfirm({
      title: '重置密码',
      content: `确定要重置用户"${user.username}"的密码吗？密码将重置为默认密码。`,
      confirmText: '重置',
      cancelText: '取消'
    })
    
    if (confirmed) {
      resetPassword(user.id)
    }
  }
  
  const handleUpdateStatus = async (user: User, newStatus: 'active' | 'inactive' | 'suspended') => {
    const statusMap = { active: '启用', inactive: '禁用', suspended: '停用' }
    const confirmed = await showConfirm({
      title: '更新状态',
      content: `确定要${statusMap[newStatus]}用户"${user.username}"吗？`,
      confirmText: '确定',
      cancelText: '取消'
    })
    
    if (confirmed) {
      updateUserStatus(user.id, newStatus)
    }
  }
  
  const handleBatchResetPassword = async () => {
    const confirmed = await showConfirm({
      title: '批量重置密码',
      content: `确定要重置选中的 ${selectedIds.length} 个用户的密码吗？密码将重置为默认密码。`,
      confirmText: '重置',
      cancelText: '取消'
    })
    
    if (confirmed) {
      for (const userId of selectedIds) {
        resetPassword(userId)
      }
      setSelectedIds([])
    }
  }
  
  const handleBatchUpdateStatus = async (status: 'active' | 'inactive' | 'suspended') => {
    const statusMap = { active: '启用', inactive: '禁用', suspended: '停用' }
    const confirmed = await showConfirm({
      title: `批量${statusMap[status]}`,
      content: `确定要${statusMap[status]}选中的 ${selectedIds.length} 个用户吗？`,
      confirmText: '确定',
      cancelText: '取消'
    })
    
    if (confirmed) {
      for (const userId of selectedIds) {
        updateUserStatus(userId, status)
      }
      setSelectedIds([])
    }
  }
  
  // ========== Security Level 模式操作 ==========
  const handleUpdateSecurityLevel = (user: User) => {
    setEditingUser(user)
    setSecurityLevelFormData({
      securityLevel: user.securityLevel || 'unknown',
      reason: ''
    })
    setShowSecurityLevelModal(true)
  }
  
  const handleBatchUpdateSecurityLevel = () => {
    if (selectedIds.length === 0) return
    setSecurityLevelFormData({
      securityLevel: 'unknown',
      reason: ''
    })
    setShowBatchUpdateModal(true)
  }

  const handleBatchUpdateDepartment = () => {
    if (selectedIds.length === 0) return
    setBatchDepartment('')
    setShowBatchDepartmentModal(true)
  }

  const handleBatchDepartmentSubmit = async () => {
    if (!batchDepartment) return
    const deptName = departmentOptions.find(d => d.id === batchDepartment)?.name || batchDepartment
    const confirmed = await showConfirm({
      title: '批量调整部门',
      content: `确定要将选中的 ${selectedIds.length} 个用户调整到“${deptName}”吗？`,
      confirmText: '确定',
      cancelText: '取消'
    })

    if (confirmed) {
      batchUpdateDepartment(selectedIds, batchDepartment)
      setShowBatchDepartmentModal(false)
    }
  }
  
  const handleSecurityLevelSubmit = async () => {
    if (!editingUser) return
    
    const confirmed = await showConfirm({
      title: '调整用户密级',
      content: `确定要将用户"${editingUser.username}"的密级调整为"${getSecurityLevelLabel(securityLevelFormData.securityLevel)}"吗？`,
      confirmText: '确定',
      cancelText: '取消'
    })
    
    if (confirmed) {
      updateUserSecurityLevel(editingUser.id, securityLevelFormData.securityLevel)
      setShowSecurityLevelModal(false)
      setEditingUser(null)
    }
  }
  
  const handleBatchUpdateSubmit = async () => {
    const confirmed = await showConfirm({
      title: '批量调整密级',
      content: `确定要将选中的 ${selectedIds.length} 个用户的密级调整为"${getSecurityLevelLabel(securityLevelFormData.securityLevel)}"吗？`,
      confirmText: '确定',
      cancelText: '取消'
    })
    
    if (confirmed) {
      batchUpdateSecurityLevel(selectedIds, securityLevelFormData.securityLevel)
      setShowBatchUpdateModal(false)
    }
  }
  
  // 表格列定义：单行显示，不再用「头像 + 用户名/邮箱两行」，一屏能多放 2~3 倍行数
  const roleMap: Record<string, { label: string; className: string }> = {
    admin: { label: '管理员', className: 'bg-error/10 text-error' },
    security_admin: { label: '安全管理员', className: 'bg-primary/10 text-primary' },
    system_admin: { label: '系统管理员', className: 'bg-primary/10 text-primary' },
    audit_admin: { label: '审计员', className: 'bg-warning/10 text-warning' },
    auditor: { label: '审计员', className: 'bg-warning/10 text-warning' },
    user: { label: '普通用户', className: 'bg-muted text-muted-foreground' },
  }
  const statusMap: Record<string, { label: string; type: 'success' | 'warning' | 'error' }> = {
    active: { label: '正常', type: 'success' },
    inactive: { label: '禁用', type: 'warning' },
    suspended: { label: '停用', type: 'error' }
  }

  const getColumns = (): TableColumn<User>[] => {
    const baseColumns: TableColumn<User>[] = [
      {
        key: 'username',
        title: '用户名',
        width: 140,
        ellipsis: true,
        hideable: false,
        render: (username: string) => <span className="font-medium text-foreground">{username}</span>
      },
      {
        key: 'name',
        title: '姓名',
        width: 120,
        ellipsis: true,
        render: (name?: string) => name || '-'
      },
      {
        key: 'email',
        title: '邮箱',
        width: 200,
        ellipsis: true,
        render: (email?: string) => <span className="text-muted-foreground">{email || '-'}</span>
      },
      {
        key: 'departmentName',
        title: '部门',
        width: 140,
        ellipsis: true,
        render: (departmentName?: string) => departmentName || '-'
      },
      {
        key: 'position',
        title: '职位',
        width: 120,
        ellipsis: true,
        render: (position?: string) => position || '-'
      },
      {
        key: 'phone',
        title: '手机号',
        width: 130,
        defaultHidden: true,
        render: (phone?: string) => phone || '-'
      },
      {
        key: 'role',
        title: '角色',
        width: 110,
        render: (role: string) => {
          return <Badge variant="outline" className="px-1.5 text-muted-foreground">{roleMap[role]?.label || role || '未知'}</Badge>
        }
      },
      // 「密级」列已移除：种子项目不使用涉密场景的密级体系。
      // 数据库 users.security_level 字段仍保留，需要时把本列加回即可。
      {
        key: 'status',
        title: '状态',
        width: 90,
        render: (status: string) => {
          const statusInfo = statusMap[status] || { label: status || '未知', type: 'warning' as const }
          return <StatusTag tone={statusInfo.type === 'error' ? 'danger' : statusInfo.type}>{statusInfo.label}</StatusTag>
        }
      },
      {
        key: mode === 'security_level' ? 'updatedAt' : 'lastLoginAt',
        title: mode === 'security_level' ? '最后更新' : '最后登录',
        width: 160,
        render: (timestamp?: string) => (
          <span className="tabular-nums text-muted-foreground">
            {timestamp ? new Date(timestamp).toLocaleString() : '-'}
          </span>
        )
      }
    ]
    
    // 根据模式添加操作列（照官方：靠右的「⋮」菜单，危险操作排最后、红字并二次确认）
    if (mode === 'admin') {
      baseColumns.push({
        key: 'actions',
        title: '',
        width: 56,
        align: 'right',
        hideable: false,
        render: (_: any, user: User) => (
          <RowActions
            actions={[{ key: 'edit', label: '编辑', onClick: () => handleEditUser(user), disabled: isUpdating }]}
            more={[{ key: 'delete', label: '删除', danger: true, onClick: () => handleDeleteUser(user), disabled: isDeleting }]}
          />
        )
      })
    } else if (mode === 'security') {
      baseColumns.push({
        key: 'actions',
        title: '',
        width: 56,
        align: 'right',
        hideable: false,
        render: (_: any, user: User) => (
          <RowActions
            actions={[{ key: 'reset', label: '重置密码', onClick: () => handleResetPassword(user), disabled: isResettingPassword }]}
            more={[
              user.status === 'active'
                ? { key: 'disable', label: '禁用', danger: true, onClick: () => handleUpdateStatus(user, 'inactive'), disabled: isUpdatingStatus }
                : { key: 'enable', label: '启用', onClick: () => handleUpdateStatus(user, 'active'), disabled: isUpdatingStatus },
              ...(user.status !== 'suspended'
                ? [{ key: 'suspend', label: '停用', danger: true, onClick: () => handleUpdateStatus(user, 'suspended'), disabled: isUpdatingStatus }]
                : []),
            ]}
          />
        )
      })
    } else if (mode === 'security_level') {
      baseColumns.push({
        key: 'actions',
        title: '',
        width: 56,
        align: 'right',
        hideable: false,
        render: (_: any, user: User) => (
          <RowActions
            actions={[{ key: 'level', label: '调整密级', onClick: () => handleUpdateSecurityLevel(user), disabled: isUpdatingSecurityLevel }]}
          />
        )
      })
    }
    
    return baseColumns
  }

  const columns = getColumns()
  const { columnVisibility, columnSettings } = useColumnSettings(`users-${mode}`, columns)
  
  // 表单字段定义
  const formFields = [
    {
      name: 'username',
      label: '用户名',
      type: 'text',
      required: true,
      placeholder: '请输入用户名'
    },
    {
      name: 'name',
      label: '姓名',
      type: 'text',
      required: true,
      placeholder: '请输入真实姓名'
    },
    {
      name: 'email',
      label: '邮箱',
      type: 'text',
      required: false,
      placeholder: '请输入邮箱地址（可选）'
    },
    ...(editingUser ? [] : [{
      name: 'password',
      label: '密码',
      type: 'text',
      required: true,
      placeholder: '请输入密码'
    }]),
    {
      name: 'role',
      label: '角色',
      type: 'select',
      required: true,
      options: roleOptions
    },
    {
      name: 'department',
      label: '部门',
      type: 'select',
      options: [
        { label: '请选择部门', value: '' },
        ...departmentOptions.map(dept => ({ label: dept.name, value: dept.id }))
      ]
    },
    {
      name: 'position',
      label: '职位',
      type: 'text',
      placeholder: '请输入职位'
    },
    {
      name: 'phone',
      label: '手机号',
      type: 'text',
      placeholder: '请输入手机号'
    },
    {
      name: 'ukeyId',
      label: 'UKey ID',
      type: 'text',
      placeholder: '如果绑定UKey，只能用此Key登录'
    },
    {
      name: 'allowedIps',
      label: '允许登录的IP',
      type: 'text',
      colSpan: 2,
      placeholder: '多个IP用逗号分隔，例如：192.168.1.1,192.168.1.2'
    }
  ]
  
  // 统计：ListPage 渲染成顶部的统计卡片
  const stats: StatItem[] = !userStats ? [] : mode === 'security_level'
    ? [
        { key: 'total', label: '总用户数', value: userStats.total, icon: Users, tone: 'primary' },
        { key: 'internal', label: '内部级别', value: userStats.bySecurityLevel?.internal || 0, icon: Shield, tone: 'success' },
        { key: 'confidential', label: '秘密级别', value: userStats.bySecurityLevel?.confidential || 0, icon: ShieldAlert, tone: 'warning' },
        { key: 'secret', label: '机密级别', value: userStats.bySecurityLevel?.secret || 0, icon: ShieldCheck, tone: 'error' },
      ]
    : [
        { key: 'total', label: '总用户', value: userStats.total, icon: Users, tone: 'primary' },
        { key: 'active', label: '正常', value: userStats.active, icon: UserCheck, tone: 'success' },
        { key: 'inactive', label: '禁用', value: userStats.inactive, icon: UserX, tone: 'warning' },
        { key: 'suspended', label: '停用', value: userStats.suspended, icon: AlertTriangle, tone: 'error' },
      ]

  // 批量操作（选中后出现在表格上方的操作条里）
  const batchBtn = 'h-control px-2.5 text-table'
  const batchActions = (
    <>
      {pageConfig.showDeleteButton && (
        <>
          <Button variant="outline" size="sm" className={batchBtn} onClick={handleBatchUpdateDepartment} disabled={isBatchUpdatingDepartment}>
            <Building />
            调整部门
          </Button>
          <Button variant="outline" size="sm" className={cn(batchBtn, 'text-error hover:text-error')} onClick={handleBatchDelete} disabled={isBatchDeleting}>
            <Trash2 />
            删除
          </Button>
        </>
      )}
      {pageConfig.showSecurityOperations && (
        <>
          <Button variant="outline" size="sm" className={batchBtn} onClick={handleBatchResetPassword} disabled={isResettingPassword}>
            <Key />
            重置密码
          </Button>
          <Button variant="outline" size="sm" className={batchBtn} onClick={() => handleBatchUpdateStatus('active')} disabled={isUpdatingStatus}>
            <UserCheck />
            启用
          </Button>
          <Button variant="outline" size="sm" className={batchBtn} onClick={() => handleBatchUpdateStatus('inactive')} disabled={isUpdatingStatus}>
            <UserX />
            禁用
          </Button>
          <Button variant="outline" size="sm" className={cn(batchBtn, 'text-error hover:text-error')} onClick={() => handleBatchUpdateStatus('suspended')} disabled={isUpdatingStatus}>
            <AlertTriangle />
            停用
          </Button>
        </>
      )}
      {pageConfig.showSecurityLevelOperations && (
        <Button variant="outline" size="sm" className={batchBtn} onClick={handleBatchUpdateSecurityLevel} disabled={isBatchUpdatingSecurityLevel}>
          <Shield />
          调整密级
        </Button>
      )}
    </>
  )
  
  if (isLoading && !users.length) {
    return <Loading />
  }
  
  return (
    <>
      <ListPage
        actions={pageConfig.showCreateButton && (
          <>
            <Button variant="outline" size="sm" className="h-control" onClick={() => setIsBatchImportOpen(true)}>
              <Upload />
              批量导入
            </Button>
            <Button size="sm" className="h-control" onClick={handleCreateUser} disabled={isCreating}>
              <CirclePlusFilled />
              新增用户
            </Button>
          </>
        )}
        stats={stats}
        filters={
          <>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索用户名、邮箱、部门、职位"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="h-control pl-8 text-table md:text-table"
              />
            </div>
            <Select
              value={filters.department || undefined}
              onValueChange={(value) => {
                setFilters({ ...filters, department: value || '' })
                setPagination({ page: 1, pageSize: pagination?.pageSize || 20 })
              }}
            >
              <SelectTrigger className="h-control w-[140px] py-0 text-table">
                <SelectValue placeholder="全部部门" />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status || undefined}
              onValueChange={(value) => {
                setFilters({ ...filters, status: (value || '') as any })
                setPagination({ page: 1, pageSize: pagination?.pageSize || 20 })
              }}
            >
              <SelectTrigger className="h-control w-[110px] py-0 text-table">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(status => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-control px-2.5 text-table" onClick={() => { setSearchKeyword(''); resetFilters() }} disabled={isLoading}>
              重置
            </Button>
          </>
        }
        toolbarRight={
          <>
            {columnSettings}
            <Button
              variant="ghost"
              size="sm"
              className="h-control w-control p-0 text-muted-foreground"
              onClick={refreshData}
              disabled={isLoading}
              title="刷新"
              aria-label="刷新"
            >
              <RefreshCw className={isLoading ? 'animate-spin' : ''} />
            </Button>
          </>
        }
        selection={{
          count: selectedIds.length,
          onClear: () => setSelectedIds([]),
          actions: batchActions,
        }}
      >
        <DataTable
          data={users}
          columns={columns}
          columnVisibility={columnVisibility}
          loading={isLoading}
          pagination={pagination}
          onPaginationChange={setPagination}
          rowKey="id"
          selectable
          selectedRowKeys={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </ListPage>
      
      {/* Admin 模式表单弹窗 */}
      {pageConfig.showCreateButton && (
        <FormModal
          open={isFormModalOpen}
          onOpenChange={setIsFormModalOpen}
          title={editingUser ? '编辑用户' : '新增用户'}
          variant="sheet"
          fields={formFields}
          columns={2}
          initialData={editingUser ? {
            username: editingUser.username,
            name: editingUser.name,
            email: editingUser.email,
            role: editingUser.role,
            department: editingUser.department || '',
            position: editingUser.position,
            phone: editingUser.phone,
            ukeyId: editingUser.ukeyId,
            allowedIps: editingUser.allowedIps?.join(', '),
            securityLevel: editingUser.securityLevel,
            status: editingUser.status
          } : (continueSeed || {
            role: 'user',
            department: '',
          })}
          onSubmit={handleFormSubmit}
          submitAndContinueText={editingUser ? undefined : '保存并继续'}
          onSubmitAndContinue={editingUser ? undefined : handleSubmitAndContinue}
          loading={isCreating || isUpdating}
          submitText={editingUser ? '更新' : '创建'}
        />
      )}
      
      {/* Security Level 模式表单弹窗 - 单个用户调整 */}
      {pageConfig.showSecurityLevelOperations && (
        <>
          <Dialog open={showSecurityLevelModal} onOpenChange={setShowSecurityLevelModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>调整用户密级 - {editingUser?.username}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    新密级 <span className="text-error">*</span>
                  </label>
                  <Select
                    value={securityLevelFormData.securityLevel}
                    onValueChange={(value) => setSecurityLevelFormData({
                      ...securityLevelFormData,
                      securityLevel: value as UserSecurityLevel
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择密级" />
                    </SelectTrigger>
                    <SelectContent>
                      {securityLevelOptions.filter(level => level.value !== 'unknown').map(level => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowSecurityLevelModal(false)}
                >
                  取消
                </Button>
                <Button
                  onClick={handleSecurityLevelSubmit}
                  disabled={isUpdatingSecurityLevel}
                >
                  调整
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Security Level 模式表单弹窗 - 批量调整 */}
          <Dialog open={showBatchUpdateModal} onOpenChange={setShowBatchUpdateModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>批量调整密级 ({selectedIds.length} 个用户)</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    统一密级 <span className="text-error">*</span>
                  </label>
                  <Select
                    value={securityLevelFormData.securityLevel}
                    onValueChange={(value) => setSecurityLevelFormData({
                      ...securityLevelFormData,
                      securityLevel: value as UserSecurityLevel
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择密级" />
                    </SelectTrigger>
                    <SelectContent>
                      {securityLevelOptions.filter(level => level.value !== 'unknown').map(level => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowBatchUpdateModal(false)}
                >
                  取消
                </Button>
                <Button
                  onClick={handleBatchUpdateSubmit}
                  disabled={isBatchUpdatingSecurityLevel}
                >
                  批量调整
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
      
      {/* 批量导入弹窗 */}
      {pageConfig.showCreateButton && (
        <BatchImportDialog
          open={isBatchImportOpen}
          onOpenChange={setIsBatchImportOpen}
          departmentOptions={departmentOptions}
          onSubmit={batchImportUsers}
          loading={isBatchImporting}
          getPermissionsByRole={getPermissionsByRole}
        />
      )}

      {/* 批量调整部门弹窗 */}
      <Dialog open={showBatchDepartmentModal} onOpenChange={setShowBatchDepartmentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量调整部门 ({selectedIds.length} 个用户)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                目标部门 <span className="text-error">*</span>
              </label>
              <Select
                value={batchDepartment}
                onValueChange={setBatchDepartment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择部门" />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBatchDepartmentModal(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleBatchDepartmentSubmit}
              disabled={!batchDepartment || isBatchUpdatingDepartment}
            >
              调整
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default UserManagePage
