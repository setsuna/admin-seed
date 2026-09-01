import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  X,
  Calendar,
  User,
  Activity,
  AlertCircle,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { DataTable } from '@/components/features/DataTable'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/SelectNew'
import { logService } from '@/services'
import { formatDateTime } from '@/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip'
import type { 
  ApplicationLog,
  ThreeAdminLog,
  ApplicationLogFilters,
  ThreeAdminLogFilters,
  ActionCategory,
  OperationModule,
  LogOperationResult,
  TableColumn
} from '@/types'

// 模式配置
type LogMode = 'application' | 'three-admin'

interface LogPageConfig {
  title: string
  description?: string
  icon?: React.ReactNode
  showOperatorFilter: boolean
  showRoleFilter: boolean
  renderOperatorCell: (operator: string, record: ApplicationLog | ThreeAdminLog) => React.ReactNode
}

const logModeConfig: Record<LogMode, LogPageConfig> = {
  'application': {
    title: '应用日志',
    description: '查看系统所有操作记录',
    showOperatorFilter: true,
    showRoleFilter: false,
    renderOperatorCell: (operator: string, record: ApplicationLog | ThreeAdminLog) => (
      <span className="font-medium">{record.operatorName || operator}</span>
    )
  },
  'three-admin': {
    title: '操作日志',
    icon: <Shield className="h-6 w-6 text-orange-600" />,
    showOperatorFilter: false,
    showRoleFilter: true,
    renderOperatorCell: (operator: string, record: ApplicationLog | ThreeAdminLog) => (
      <span className="font-medium">{record.operatorName || operator}</span>
    )
  }
}

// 三员角色配置
const threeAdminRoleConfig = {
  SYSTEM_ADMIN: { 
    label: '系统管理员', 
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  SECURITY_ADMIN: { 
    label: '安全管理员', 
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  AUDITOR: { 
    label: '审计员', 
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  }
}

// 结果配置
const resultConfig = {
  success: { 
    label: '成功', 
    color: 'text-green-600', 
    bgColor: 'bg-green-100' 
  },
  failure: { 
    label: '失败', 
    color: 'text-red-600', 
    bgColor: 'bg-red-100' 
  }
}

// 行为类别配置
const actionConfig = {
  CREATE: { label: '创建', color: 'text-blue-600' },
  UPDATE: { label: '修改', color: 'text-orange-600' },
  DELETE: { label: '删除', color: 'text-red-600' },
  VIEW: { label: '查看', color: 'text-gray-600' },
  LOGIN: { label: '登录', color: 'text-green-600' },
  LOGOUT: { label: '登出', color: 'text-gray-600' },
  EXPORT: { label: '导出', color: 'text-purple-600' },
  IMPORT: { label: '导入', color: 'text-indigo-600' },
  CONFIG: { label: '配置', color: 'text-yellow-600' },
  SYNC: { label: '同步', color: 'text-cyan-600' }
}

// 模块配置
const moduleConfig = {
  USER: { label: '用户管理' },
  DEPARTMENT: { label: '部门管理' },
  MEETING: { label: '会议管理' },
  DICT: { label: '数据字典' },
  PERMISSION: { label: '权限管理' },
  SECURITY: { label: '安全管理' },
  SYSTEM: { label: '系统管理' },
  AUTH: { label: '认证' },
  CONFIG: { label: '配置管理' },
  SYNC: { label: '同步管理' }
}

interface LogPageProps {
  mode: LogMode
}

const LogPage: React.FC<LogPageProps> = ({ mode }) => {
  // 根据模式获取配置
  const config = logModeConfig[mode]
  
  // 状态
  const [isFilterExpanded, setIsFilterExpanded] = useState(false)
  
  // 筛选条件
  const [filters, setFilters] = useState<ApplicationLogFilters | ThreeAdminLogFilters>({})
  const [searchKeyword, setSearchKeyword] = useState('')
  
  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0
  })

  // 使用TanStack Query获取数据
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['logs', mode, pagination.page, pagination.pageSize, filters, searchKeyword],
    queryFn: async () => {
      const params = {
        ...filters,
        keyword: searchKeyword || undefined,
        page: pagination.page,
        pageSize: pagination.pageSize
      }
      
      if (mode === 'application') {
        return logService.getApplicationLogs(params as ApplicationLogFilters & { page?: number; pageSize?: number })
      } else {
        return logService.getThreeAdminLogs(params as ThreeAdminLogFilters & { page?: number; pageSize?: number })
      }
    },
    staleTime: 30000 // 30秒缓存
  })

  // 更新分页总数
  React.useEffect(() => {
    if (data?.pagination) {
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total
      }))
    }
  }, [data?.pagination])

  const logs = data?.items || []

  // 处理分页变化
  const handlePaginationChange = (newPagination: { page: number; pageSize: number }) => {
    setPagination(prev => ({
      ...prev,
      ...newPagination
    }))
  }

  // 日志数据转 XML
  const logsToXml = (items: (ApplicationLog | ThreeAdminLog)[]): string => {
    const escapeXml = (str: string) =>
      String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')

    const rows = items.map((log) => {
      const fields = [
        `      <id>${escapeXml(String(log.id))}</id>`,
        `      <module>${escapeXml(log.module)}</module>`,
        `      <actionCategory>${escapeXml(log.actionCategory)}</actionCategory>`,
        `      <actionDescription>${escapeXml(log.actionDescription)}</actionDescription>`,
        `      <operationResult>${escapeXml(log.operationResult)}</operationResult>`,
        `      <operator>${escapeXml(log.operator)}</operator>`,
        `      <ipAddress>${escapeXml(log.ipAddress || '')}</ipAddress>`,
        `      <timestamp>${escapeXml(log.timestamp)}</timestamp>`,
      ]
      // 三员日志额外字段
      if ('operatorRole' in log && log.operatorRole) {
        fields.push(`      <operatorRole>${escapeXml(log.operatorRole)}</operatorRole>`)
      }
      return `    <log>\n${fields.join('\n')}\n    </log>`
    })

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<logs mode="${mode}" exportTime="${new Date().toISOString()}" count="${items.length}">`,
      ...rows,
      '</logs>',
    ].join('\n')
  }

  // 处理导出
  const handleExport = () => {
    if (!logs.length) return

    const xml = logsToXml(logs)
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const timestamp = new Date().toISOString().slice(0, 10)
    a.download = `${mode === 'application' ? '应用日志' : '操作日志'}_${timestamp}.xml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 处理刷新
  const handleRefresh = () => {
    refetch()
  }

  // 重置筛选
  const handleResetFilters = () => {
    setFilters({})
    setSearchKeyword('')
  }

  // 应用筛选
  const handleApplyFilters = () => {
    // 重置到第一页
    setPagination(prev => ({
      ...prev,
      page: 1
    }))
  }
  
  // 表格列定义
  const columns: TableColumn<ApplicationLog | ThreeAdminLog>[] = [
    {
      key: 'module',
      title: '模块',
      width: 120,
      render: (module: OperationModule, record: ApplicationLog | ThreeAdminLog) => (
        <span className="font-medium">
          {record.moduleName || moduleConfig[module]?.label || module}
        </span>
      )
    },
    {
      key: 'actionDescription',
      title: '操作描述',
      render: (description: string, record: ApplicationLog | ThreeAdminLog) => (
        record.changeDetails ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="max-w-md cursor-help border-b border-dashed border-muted-foreground/40 inline-block">
                  {description}
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="start"
                className="max-w-md whitespace-pre-wrap select-text"
              >
                {record.changeDetails}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="max-w-md">{description}</div>
        )
      )
    },
    {
      key: 'operationResult',
      title: '结果',
      width: 100,
      render: (result: LogOperationResult) => (
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${resultConfig[result]?.bgColor} ${resultConfig[result]?.color}`}>
          {resultConfig[result]?.label || result}
        </div>
      )
    },
    {
      key: 'actionCategory',
      title: '行为',
      width: 100,
      render: (action: ActionCategory) => (
        <span className={`font-medium ${actionConfig[action]?.color}`}>
          {actionConfig[action]?.label || action}
        </span>
      )
    },
    {
      key: 'timestamp',
      title: '时间',
      width: 180,
      render: (timestamp: string) => (
        <span className="whitespace-nowrap">
          {formatDateTime(timestamp)}
        </span>
      )
    },
    {
      key: 'operator',
      title: '操作人',
      width: mode === 'application' ? 120 : 140,
      render: (operator: string, record: ApplicationLog | ThreeAdminLog) => 
        config.renderOperatorCell(operator, record)
    },
    {
      key: 'ipAddress',
      title: 'IP地址',
      width: 140,
      render: (ip: string) => (
        <span className="text-muted-foreground font-mono text-sm">
          {ip}
        </span>
      )
    }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            {config.icon}
            <h1 className="text-2xl font-bold">{config.title}</h1>
          </div>
          {config.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {config.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={handleExport} disabled={!logs.length}>
            <Download className="h-4 w-4" />
            导出XML
          </Button>
        </div>
      </div>

      {/* 筛选区域 */}
      <Card>
        <CardContent className="pt-6">
          {/* 基础搜索栏 */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索操作描述..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyFilters()
                  }
                }}
                className="pl-9"
              />
            </div>
            <Button
              variant={isFilterExpanded ? "default" : "outline"}
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            >
              <Filter className="h-4 w-4" />
              高级筛选
            </Button>
          </div>

          {/* 高级筛选 */}
          {isFilterExpanded && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 时间范围 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    开始时间
                  </label>
                  <Input
                    type="datetime-local"
                    value={filters.startTime || ''}
                    onChange={(e) => setFilters({ ...filters, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    结束时间
                  </label>
                  <Input
                    type="datetime-local"
                    value={filters.endTime || ''}
                    onChange={(e) => setFilters({ ...filters, endTime: e.target.value })}
                  />
                </div>

                {/* 操作人筛选 - 仅应用日志模式 */}
                {config.showOperatorFilter && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      操作人
                    </label>
                    <Input
                      placeholder="输入操作人姓名"
                      value={(filters as ApplicationLogFilters).operator || ''}
                      onChange={(e) => setFilters({ ...filters, operator: e.target.value })}
                    />
                  </div>
                )}

                {/* 三员角色筛选 - 仅三员日志模式 */}
                {config.showRoleFilter && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      管理员角色
                    </label>
                    <Select
                      value={(filters as ThreeAdminLogFilters).operatorRole || undefined}
                      onValueChange={(value) => setFilters({ 
                        ...filters, 
                        operatorRole: value as 'SYSTEM_ADMIN' | 'SECURITY_ADMIN' | 'AUDITOR'
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="全部角色" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(threeAdminRoleConfig)
                          .filter(([key]) => key !== 'AUDITOR')
                          .map(([key, roleConfig]) => (
                            <SelectItem key={key} value={key}>
                              {roleConfig.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 操作模块 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    操作模块
                  </label>
                  <Select
                    value={filters.module || undefined}
                    onValueChange={(value) => setFilters({ 
                      ...filters, 
                      module: value as OperationModule
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="全部模块" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(moduleConfig).map(([key, moduleConf]) => (
                        <SelectItem key={key} value={key}>
                          {moduleConf.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 行为类别 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    行为类别
                  </label>
                  <Select
                    value={filters.actionCategory || undefined}
                    onValueChange={(value) => setFilters({ 
                      ...filters, 
                      actionCategory: value as ActionCategory
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="全部类别" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(actionConfig).map(([key, actionConf]) => (
                        <SelectItem key={key} value={key}>
                          {actionConf.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 操作结果 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    操作结果
                  </label>
                  <Select
                    value={filters.operationResult || undefined}
                    onValueChange={(value) => setFilters({ 
                      ...filters, 
                      operationResult: value as LogOperationResult
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="全部结果" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="success">成功</SelectItem>
                      <SelectItem value="failure">失败</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 筛选操作 */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleResetFilters}>
                  <X className="h-4 w-4" />
                  重置
                </Button>
                <Button onClick={handleApplyFilters}>
                  应用筛选
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 日志表格 */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            data={logs}
            columns={columns}
            loading={isLoading}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            rowKey="id"
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default LogPage
