/**
 * 批量导入用户对话框
 */

import { useState, useCallback, useMemo } from 'react'
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import * as XLSX from 'xlsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/SelectNew'
import { useRoleOptions } from '@/hooks/useRole'

// 需要过滤掉的管理角色
const EXCLUDED_ROLES = ['admin', 'security_admin', 'system_admin', 'audit_admin']

interface ParsedUser {
  username: string
  name: string
  phone: string
  error?: string
}

interface BatchImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  departmentOptions: Array<{ id: string; name: string }>
  onSubmit: (data: {
    department?: string
    default_password?: string
    users: Array<{ username: string; name: string; phone?: string; role: string; permissions?: string[] }>
  }) => Promise<any>
  loading?: boolean
  getPermissionsByRole?: (role: string) => string[]
}

export function BatchImportDialog({
  open,
  onOpenChange,
  departmentOptions,
  onSubmit,
  loading = false,
  getPermissionsByRole,
}: BatchImportDialogProps) {
  const { roleOptions } = useRoleOptions()

  // 过滤管理角色
  const filteredRoleOptions = useMemo(
    () => roleOptions.filter((opt: { value: string }) => !EXCLUDED_ROLES.includes(opt.value)),
    [roleOptions]
  )

  // 表单状态 — 默认选中第一条
  const firstDeptId = departmentOptions.length > 0 ? departmentOptions[0].id : ''
  const firstRoleValue = filteredRoleOptions.length > 0 ? filteredRoleOptions[0].value : ''
  const [department, setDepartment] = useState<string>('')
  const [role, setRole] = useState<string>('')
  const [defaultPassword, setDefaultPassword] = useState<string>('')

  // 文件解析状态
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [parseError, setParseError] = useState<string>('')

  // 导入结果
  const [importResult, setImportResult] = useState<{
    success_count: number
    fail_count: number
    failures?: Array<{ index: number; username: string; reason: string }>
  } | null>(null)

  // 重置状态
  const resetState = useCallback(() => {
    setDepartment(firstDeptId)
    setRole(firstRoleValue)
    setDefaultPassword('')
    setParsedUsers([])
    setFileName('')
    setParseError('')
    setImportResult(null)
  }, [firstDeptId, firstRoleValue])

  // 打开时设置默认值，关闭时重置
  const handleOpenChange = (val: boolean) => {
    if (val) {
      // 打开时如果还没选，默认选第一条
      if (!department && firstDeptId) setDepartment(firstDeptId)
      if (!role && firstRoleValue) setRole(firstRoleValue)
    } else {
      resetState()
    }
    onOpenChange(val)
  }

  // 解析 xlsx 文件
  const handleFileParse = useCallback((file: File) => {
    setParseError('')
    setFileName(file.name)
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
          setParseError('文件中没有找到工作表')
          return
        }

        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })

        if (rows.length === 0) {
          setParseError('文件中没有数据行')
          return
        }

        // 列名映射（支持中英文表头）
        const colMap: Record<string, string> = {
          username: 'username',
          '用户名': 'username',
          name: 'name',
          '姓名': 'name',
          phone: 'phone',
          '手机号': 'phone',
          '电话': 'phone',
        }

        const parsed: ParsedUser[] = rows.map((row, idx) => {
          const mapped: Record<string, string> = {}
          for (const [key, val] of Object.entries(row)) {
            const normalizedKey = colMap[key.trim()]
            if (normalizedKey) {
              mapped[normalizedKey] = String(val).trim()
            }
          }

          const user: ParsedUser = {
            username: mapped.username || '',
            name: mapped.name || '',
            phone: mapped.phone || '',
          }

          // 校验
          if (!user.username) {
            user.error = `第 ${idx + 2} 行：用户名不能为空`
          } else if (!user.name) {
            user.error = `第 ${idx + 2} 行：姓名不能为空`
          }

          return user
        })

        setParsedUsers(parsed)
      } catch {
        setParseError('文件解析失败，请确认是有效的 .xlsx 文件')
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  // dropzone 配置
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleFileParse(acceptedFiles[0])
      }
    },
  })

  // 下载模板
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['用户名', '姓名', '手机号'],
      ['zhangsan', '张三', '13800138001'],
      ['lisi', '李四', '13800138002'],
    ])
    // 设置列宽
    ws['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 15 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '用户导入模板')
    XLSX.writeFile(wb, '用户导入模板.xlsx')
  }

  // 统计
  const validUsers = parsedUsers.filter((u) => !u.error)
  const errorUsers = parsedUsers.filter((u) => u.error)
  const canSubmit = validUsers.length > 0 && !!department && !!role && !loading

  // 提交
  const handleSubmit = async () => {
    const payload = {
      department,
      default_password: defaultPassword || undefined,
      users: validUsers.map((u) => ({
        username: u.username,
        name: u.name,
        phone: u.phone || undefined,
        role,
        status: 'active',
        security_level: 'unknown',
        ...(getPermissionsByRole ? { permissions: getPermissionsByRole(role) } : {}),
      })),
    }

    try {
      const result = await onSubmit(payload)
      setImportResult(result)
    } catch {
      // 错误已在 mutation onError 中处理
    }
  }

  // 清除文件
  const handleClearFile = () => {
    setParsedUsers([])
    setFileName('')
    setParseError('')
    setImportResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>批量导入用户</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-2">
          {/* 导入结果 */}
          {importResult && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">导入完成</span>
              </div>
              <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <p>总计 {importResult.success_count + importResult.fail_count} 条，成功 {importResult.success_count} 条，失败 {importResult.fail_count} 条</p>
                {importResult.failures && importResult.failures.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="font-medium">失败详情：</p>
                    {importResult.failures.map((err, i) => (
                      <p key={i} className="text-red-600 dark:text-red-400">
                        · 第{err.index}行 {err.username}：{err.reason}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 配置区 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                部门 <span className="text-destructive">*</span>
              </label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择部门" />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                角色 <span className="text-destructive">*</span>
              </label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择角色" />
                </SelectTrigger>
                <SelectContent>
                  {filteredRoleOptions.map((opt: { value: string; label: string }) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">
                默认密码 <span className="text-muted-foreground text-xs">（可选）</span>
              </label>
              <Input
                type="text"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                placeholder="不填则使用系统默认密码"
              />
            </div>
          </div>

          {/* 文件上传区 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">
                上传文件 <span className="text-destructive">*</span>
              </label>
              <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} className="h-7 text-xs">
                <Download className="h-3.5 w-3.5" />
                下载模板
              </Button>
            </div>

            {!fileName ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  拖拽 .xlsx 文件到这里，或点击选择文件
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                <FileSpreadsheet className="h-8 w-8 text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    共 {parsedUsers.length} 条数据，
                    <span className="text-green-600">{validUsers.length} 条有效</span>
                    {errorUsers.length > 0 && (
                      <span className="text-destructive">，{errorUsers.length} 条有误</span>
                    )}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleClearFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {parseError && (
              <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}
          </div>

          {/* 预览表格 */}
          {parsedUsers.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                数据预览（前 50 条）
              </label>
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-52 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium w-10">#</th>
                        <th className="px-3 py-2 text-left font-medium">用户名</th>
                        <th className="px-3 py-2 text-left font-medium">姓名</th>
                        <th className="px-3 py-2 text-left font-medium">手机号</th>
                        <th className="px-3 py-2 text-left font-medium w-20">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {parsedUsers.slice(0, 50).map((user, idx) => (
                        <tr key={idx} className={user.error ? 'bg-destructive/5' : ''}>
                          <td className="px-3 py-1.5 text-muted-foreground">{idx + 1}</td>
                          <td className="px-3 py-1.5">{user.username || '-'}</td>
                          <td className="px-3 py-1.5">{user.name || '-'}</td>
                          <td className="px-3 py-1.5">{user.phone || '-'}</td>
                          <td className="px-3 py-1.5">
                            {user.error ? (
                              <span className="text-destructive text-xs" title={user.error}>异常</span>
                            ) : (
                              <span className="text-green-600 text-xs">正常</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 错误详情 */}
              {errorUsers.length > 0 && (
                <div className="mt-2 space-y-1">
                  {errorUsers.slice(0, 10).map((user, idx) => (
                    <p key={idx} className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {user.error}
                    </p>
                  ))}
                  {errorUsers.length > 10 && (
                    <p className="text-xs text-muted-foreground">
                      ...还有 {errorUsers.length - 10} 条错误
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {importResult ? '关闭' : '取消'}
          </Button>
          {!importResult && (
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {loading ? '导入中...' : `确认导入 (${validUsers.length} 人)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
