/**
 * 策略配置页面
 * 管理系统安全策略和配置规则
 */

import { useState, useEffect, KeyboardEvent } from 'react'
import { Save, RefreshCw, Shield, Clock, Key, FileText, Monitor, AlertTriangle, Settings, Database } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Loading } from '@/components/ui/Loading'
import { useGlobalDialog } from '@/components/ui/DialogProvider'
import { usePolicy } from '@/hooks/usePolicy'
import { Slider } from '@/components/ui/Slider'
import { CircularProgress } from '@/components/ui/CircularProgress'
import { policyService } from '@/services/policy'
import { useNotifications } from '@/hooks/useNotifications'
import type { SecurityPolicy, AuditLogStatsResponse } from '@/types'

const PolicyConfigPage = () => {
  const { showConfirm } = useGlobalDialog()
  const { showSuccess, showError } = useNotifications()
  
  // 使用策略管理hook
  const {
    policy: originalPolicy,
    isLoading,
    error,
    updatePolicy,
    isUpdating,
    validateConfig,
    exportConfig,
    loadDefaultConfig,
    refreshData,
    isExporting
  } = usePolicy()
  
  // 本地策略状态
  const [policy, setPolicy] = useState<SecurityPolicy | null>(null)
  
  // 🆕 日志统计状态
  const [auditLogStats, setAuditLogStats] = useState<AuditLogStatsResponse | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [isPurging, setIsPurging] = useState(false)
  const [isUpdatingRetention, setIsUpdatingRetention] = useState(false)
  
  // 当原始策略加载后，同步到本地状态
  useEffect(() => {
    if (originalPolicy) {
      setPolicy(originalPolicy)
    }
  }, [originalPolicy])
  
  // 🆕 加载日志统计信息
  const loadAuditLogStats = async () => {
    setStatsLoading(true)
    try {
      const stats = await policyService.getAuditLogStats()
      setAuditLogStats(stats)
    } catch (e) {
      console.error('加载日志统计失败:', e)
    } finally {
      setStatsLoading(false)
    }
  }
  
  // 页面加载时获取日志统计
  useEffect(() => {
    loadAuditLogStats()
  }, [])
  
  // 🆕 覆盖日志操作（固定删6个月前的日志）
  const handlePurgeAuditLogs = async () => {
    const confirmed = await showConfirm({
      title: '覆盖日志',
      content: '确定要覆盖 6 个月前的日志吗？此操作不可恢复。',
      confirmText: '确定覆盖',
      cancelText: '取消'
    })
    
    if (!confirmed) return
    
    setIsPurging(true)
    try {
      const result = await policyService.purgeAuditLogs()
      showSuccess('覆盖成功', `已删除 ${result.deletedCount} 条日志记录`)
      // 刷新统计数据
      await loadAuditLogStats()
    } catch (e: any) {
      showError('覆盖失败', e.message || '操作失败，请重试')
    } finally {
      setIsPurging(false)
    }
  }
  
  // 🆕 更新日志存储周期并保存
  const handleRetentionChange = async (months: string) => {
    if (!policy) return
    
    const days = monthsToDays(months)
    
    setIsUpdatingRetention(true)
    try {
      // 更新本地状态
      const updatedPolicy = { ...policy, auditLogRetentionDays: days }
      setPolicy(updatedPolicy)
      
      // 立即保存到服务器
      const { id, createdAt, updatedAt, ...configToUpdate } = updatedPolicy
      await policyService.updatePolicy(configToUpdate)
      
      showSuccess('保存成功', `日志存储周期已更新为 ${months} 个月`)
      // 刷新统计数据
      await loadAuditLogStats()
      // 刷新策略数据
      refreshData()
    } catch (e: any) {
      showError('保存失败', e.message || '操作失败，请重试')
    } finally {
      setIsUpdatingRetention(false)
    }
  }
  
  // 🆕 天数转换为月数显示
  const daysToMonths = (days: number): string => {
    if (days >= 365) return '12'
    if (days >= 270) return '9'
    if (days >= 180) return '6'
    return String(Math.round(days / 30))
  }
  
  // 🆕 月数转换为天数
  const monthsToDays = (months: string): number => {
    switch (months) {
      case '12': return 365
      case '9': return 270
      case '6': return 180
      default: return 365
    }
  }
  
  // 系统密级选项
  const systemSecurityLevelOptions = [
    { label: '秘密', value: 'confidential' },
    { label: '机密', value: 'secret' }
  ]
  
  // 敏感操作日志级别选项
  const loggingLevelOptions = [
    { label: '最小化', value: 'minimal' },
    { label: '标准', value: 'standard' },
    { label: '详细', value: 'detailed' }
  ]
  
  // 文件存储周期选项
  const fileRetentionOptions = [
    { label: '30天', value: '30' },
    { label: '60天', value: '60' },
    { label: '90天', value: '90' },
    { label: '180天', value: '180' },
    { label: '365天', value: '365' },
    { label: '永久', value: '0' }
  ]
  
  // 🆕 日志存储周期选项
  const logRetentionOptions = [
    { label: '6个月', value: '6' },
    { label: '9个月', value: '9' },
    { label: '12个月', value: '12' }
  ]
  
  // 标签输入组件
  const TagInput = ({ value, onChange, placeholder }: { value: string[], onChange: (value: string[]) => void, placeholder?: string }) => {
    const [inputValue, setInputValue] = useState('')

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && inputValue.trim()) {
        e.preventDefault()
        if (!value.includes(inputValue.trim())) {
          onChange([...value, inputValue.trim()])
        }
        setInputValue('')
      }
    }

    const handleRemove = (item: string) => {
      onChange(value.filter(v => v !== item))
    }

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px] bg-white">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
            >
              {item}
              <button
                type="button"
                onClick={() => handleRemove(item)}
                className="hover:text-blue-600"
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 min-w-[120px] outline-none bg-transparent"
          />
        </div>
        <p className="text-xs text-gray-500">按回车添加，点击标签删除</p>
      </div>
    )
  }

  // 保存配置
  const handleSave = async () => {
    if (!policy) return
    
    const confirmed = await showConfirm({
      title: '保存策略配置',
      content: '确定要保存当前的策略配置吗？配置生效后将影响所有用户。',
      confirmText: '保存',
      cancelText: '取消'
    })
    
    if (!confirmed) return
    
    // 先验证配置
    const isValid = await validateConfig(policy)
    if (!isValid) return
    
    // 移除不需要的字段，但保留 preventReuse
    const { id, createdAt, updatedAt, ...configToUpdate } = policy
    updatePolicy(configToUpdate)
  }
  
  // 重置配置
  const handleReset = async () => {
    if (!originalPolicy) return
    
    const confirmed = await showConfirm({
      title: '重置配置',
      content: '确定要重置所有配置为上次保存的状态吗？',
      confirmText: '重置',
      cancelText: '取消'
    })
    
    if (confirmed) {
      setPolicy({ ...originalPolicy })
    }
  }
  
  // 加载默认配置
  const handleLoadDefault = async () => {
    const confirmed = await showConfirm({
      title: '加载默认配置',
      content: '确定要加载默认策略配置吗？当前未保存的更改将丢失。',
      confirmText: '加载',
      cancelText: '取消'
    })
    
    if (confirmed) {
      const defaultConfig = await loadDefaultConfig()
      if (defaultConfig) {
        setPolicy(defaultConfig)
      }
    }
  }
  
  // 更新策略配置
  const updatePolicyField = (path: string, value: any) => {
    if (!policy) return
    
    setPolicy((prev: SecurityPolicy | null) => {
      if (!prev) return prev
      
      const keys = path.split('.')
      const updated = { ...prev }
      let current: any = updated
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return updated
    })
  }
  
  // 检查是否有未保存的更改
  const hasUnsavedChanges = originalPolicy && policy && JSON.stringify(policy) !== JSON.stringify(originalPolicy)
  
  if (isLoading || !policy) {
    return <Loading />
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">加载失败</p>
          <Button onClick={refreshData}>重试</Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">策略配置</h1>
          <p className="text-sm text-gray-500 mt-1">配置系统安全策略和管理规则</p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleLoadDefault}
            disabled={isUpdating}
          >
            <Settings className="w-4 h-4" />
            默认配置
          </Button>
          
          <Button
            variant="outline"
            onClick={exportConfig}
            loading={isExporting}
          >
            导出配置
          </Button>
          
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasUnsavedChanges || isUpdating}
          >
            <RefreshCw className="w-4 h-4" />
            重置
          </Button>
          
          <Button
            onClick={handleSave}
            loading={isUpdating}
            disabled={!hasUnsavedChanges}
          >
            <Save className="w-4 h-4" />
            保存配置
          </Button>
        </div>
      </div>
      
      {/* 未保存更改提示 */}
      {hasUnsavedChanges && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
              <span className="text-yellow-800">您有未保存的配置更改</span>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="columns-1 lg:columns-2 gap-6">
        {/* 系统安全策略 */}
        <Card className="break-inside-avoid mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              系统安全策略
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">系统密级</label>
              <Select
                value={policy.systemSecurityLevel}
                onValueChange={(value) => updatePolicyField('systemSecurityLevel', value)}
                options={systemSecurityLevelOptions}
              />
            </div>
            
            {/* 禁止密级降级 - 已隐藏 */}
          </CardContent>
        </Card>
        
        {/* 文件管理策略 */}
        <Card className="break-inside-avoid mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              文件管理策略
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">服务器文件存储周期</label>
              <Select
                value={String(policy.serverFileRetentionDays)}
                onValueChange={(value) => updatePolicyField('serverFileRetentionDays', parseInt(value))}
                options={fileRetentionOptions}
              />
              <p className="text-xs text-gray-500 mt-1">选择"永久"表示文件永不过期</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">客户端文件过期时间 (小时)</label>
              <Input
                type="number"
                value={policy.clientFileExpirationHours}
                onChange={(e) => updatePolicyField('clientFileExpirationHours', parseInt(e.target.value) || 24)}
                min="1"
                max="168"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">文件上传大小限制 (MB)</label>
              <Input
                type="number"
                value={policy.fileUploadMaxSize}
                onChange={(e) => updatePolicyField('fileUploadMaxSize', parseInt(e.target.value) || 100)}
                min="1"
                max="1024"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">允许的文件类型</label>
              <TagInput
                value={policy.allowedFileTypes}
                onChange={(value) => updatePolicyField('allowedFileTypes', value)}
                placeholder="输入文件格式后按回车"
              />
            </div>
            
            {/* 启用文件加密存储 - 已隐藏 */}
          </CardContent>
        </Card>
        
        {/* 密码策略 */}
        <Card className="break-inside-avoid mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Key className="w-5 h-5 mr-2" />
              口令策略
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">最小长度</label>
                <Input
                  type="number"
                  value={policy.passwordPolicy.minLength}
                  onChange={(e) => {
                    let val = parseInt(e.target.value) || 8
                    if (val < 8) val = 8
                    if (val > 15) val = 15
                    updatePolicyField('passwordPolicy.minLength', val)
                  }}
                  min="8"
                  max="15"
                />
                <p className="text-xs text-gray-500 mt-1">范围：8-15</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">更换周期 (天)</label>
                <Input
                  type="number"
                  value={policy.passwordPolicy.changeIntervalDays}
                  onChange={(e) => {
                    let val = parseInt(e.target.value) || 30
                    if (val < 1) val = 1
                    if (val > 30) val = 30
                    updatePolicyField('passwordPolicy.changeIntervalDays', val)
                  }}
                  min="1"
                  max="30"
                />
                <p className="text-xs text-gray-500 mt-1">最大30天</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">最大错误次数</label>
                <Input
                  type="number"
                  value={policy.passwordPolicy.maxFailAttempts}
                  onChange={(e) => {
                    let val = parseInt(e.target.value) || 3
                    if (val < 1) val = 1
                    if (val > 5) val = 5
                    updatePolicyField('passwordPolicy.maxFailAttempts', val)
                  }}
                  min="1"
                  max="5"
                />
                <p className="text-xs text-gray-500 mt-1">最大5次</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">锁定时长 (分钟)</label>
                <Input
                  type="number"
                  value={policy.passwordPolicy.lockoutDurationMinutes}
                  onChange={(e) => updatePolicyField('passwordPolicy.lockoutDurationMinutes', parseInt(e.target.value) || 30)}
                  min="5"
                  max="1440"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium">密码复杂度要求</label>
              <div className="space-y-1">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={policy.passwordPolicy.requireUppercase}
                    onChange={(e) => updatePolicyField('passwordPolicy.requireUppercase', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">包含大写字母</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={policy.passwordPolicy.requireLowercase}
                    onChange={(e) => updatePolicyField('passwordPolicy.requireLowercase', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">包含小写字母</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={policy.passwordPolicy.requireNumbers}
                    onChange={(e) => updatePolicyField('passwordPolicy.requireNumbers', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">包含数字</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={policy.passwordPolicy.requireSpecialChars}
                    onChange={(e) => updatePolicyField('passwordPolicy.requireSpecialChars', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">包含特殊字符</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 会话管理策略 */}
        <Card className="break-inside-avoid mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              会话管理策略
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 会话超时时间 - 已隐藏 */}
            
            <div>
              <label className="block text-sm font-medium mb-2">空闲锁定时间 (分钟)</label>
              <Input
                type="number"
                value={policy.idleLockTimeoutMinutes}
                onChange={(e) => updatePolicyField('idleLockTimeoutMinutes', parseInt(e.target.value) || 30)}
                min="5"
                max="120"
              />
            </div>
            
            {/* 最大并发会话数 - 已隐藏 */}
            {/* 允许记住密码 - 已隐藏 */}
            {/* 启用单点登录 - 已隐藏 */}
          </CardContent>
        </Card>
        
        {/* 访问控制策略 - 已隐藏 */}
        
        {/* 审计策略 */}
        <Card className="break-inside-avoid mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Monitor className="w-5 h-5 mr-2" />
              审计策略
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">审计日志保留时间 (天)</label>
              <Input
                type="number"
                value={policy.auditLogRetentionDays}
                onChange={(e) => updatePolicyField('auditLogRetentionDays', parseInt(e.target.value) || 365)}
                min="90"
                max="2555"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">敏感操作记录级别</label>
              <Select
                value={policy.sensitiveOperationLogging}
                onValueChange={(value) => updatePolicyField('sensitiveOperationLogging', value)}
                options={loggingLevelOptions}
              />
            </div>
            
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={policy.auditLogExportEnabled}
                  onChange={(e) => updatePolicyField('auditLogExportEnabled', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">允许审计日志导出</span>
              </label>
            </div>
          </CardContent>
        </Card>
        
        {/* 🆕 日志存储管理 */}
        <Card className="break-inside-avoid mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              日志存储管理
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {statsLoading ? (
              <div className="flex justify-center py-8">
                <Loading />
              </div>
            ) : auditLogStats ? (
              <>
                {/* 日志存储占用比例 */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-4">日志存储占用比例</h4>
                  <div className="flex justify-center">
                    <CircularProgress
                      value={auditLogStats.usagePercent}
                      size={140}
                      strokeWidth={10}
                      color={auditLogStats.isAlert ? '#f97316' : '#3b82f6'}
                      markerValue={((auditLogStats.maxCount - (policy.auditLogAlertThreshold || 13000)) / auditLogStats.maxCount) * 100}
                      markerColor="#3b82f6"
                    />
                  </div>
                </div>
                
                {/* 日志详情 */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-4">日志详情</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">总量：</span>
                      <span className="font-medium">{auditLogStats.maxCount.toLocaleString()} 条</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">使用比例：</span>
                      <span className="font-medium">{auditLogStats.usagePercent.toFixed(2)} %</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">告警剩余条数：</span>
                      <span className="font-medium">{(policy.auditLogAlertThreshold || 13000).toLocaleString()} 条</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">已使用：</span>
                      <span className="font-medium">{auditLogStats.usedCount.toLocaleString()} 条</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">当前是否已告警：</span>
                      <span className={`font-medium ${auditLogStats.isAlert ? 'text-orange-600' : 'text-green-600'}`}>
                        {auditLogStats.isAlert ? '是' : '否'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">日志周期：</span>
                      <span className="font-medium">{daysToMonths(auditLogStats.retentionDays)} 个月</span>
                    </div>
                  </div>
                </div>
                
                {/* 告警剩余条数滑块 */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-4">告警剩余条数</h4>
                  <div className="space-y-4">
                    <Slider
                      value={[policy.auditLogAlertThreshold || 13000]}
                      onValueChange={(value) => updatePolicyField('auditLogAlertThreshold', value[0])}
                      min={1000}
                      max={100000}
                      step={1000}
                      className="w-full"
                    />
                    <p className="text-sm text-gray-600 text-center">
                      当日志剩余条数小于等于 <span className="font-semibold text-primary">{(policy.auditLogAlertThreshold || 13000).toLocaleString()}</span> 条，弹出警告提示。
                    </p>
                  </div>
                </div>
                
                {/* 日志周期和覆盖操作 */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">日志周期：</span>
                    <Select
                      value={daysToMonths(policy.auditLogRetentionDays)}
                      onValueChange={handleRetentionChange}
                      options={logRetentionOptions}
                      className="w-32"
                      disabled={isUpdatingRetention}
                    />
                    {isUpdatingRetention && (
                      <span className="text-sm text-gray-500">保存中...</span>
                    )}
                  </div>
                  <Button
                    onClick={handlePurgeAuditLogs}
                    loading={isPurging}
                    variant="destructive"
                  >
                    覆盖6个月前日志
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                无法加载日志统计信息
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* 系统维护策略 - 已隐藏 */}
      </div>
    </div>
  )
}

export default PolicyConfigPage
