import React, { useState } from 'react'
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  RefreshCw, 
  Eye, 
  Edit, 
  Power,
  PowerOff,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { DataTable } from '@/components/features/DataTable'
import { Card, CardContent } from '@/components/ui/Card'
import DictEditModal from '@/components/features/DictEditModal'
import { useGlobalDialog } from '@/components/ui/DialogProvider'
import { useDict } from '@/hooks/useDict'
import { useNotifications } from '@/hooks/useNotifications'
import { dictApi } from '@/services/dict'
import { debounce } from '@/utils'
import type { 
  DataDict, 
  DictItem, 
  EntityStatus,
  TableColumn,
  CreateDictRequest,
  UpdateDictRequest
} from '@/types'

const statusConfig = {
  enabled: { label: '启用', color: 'text-green-600', bgColor: 'bg-green-100', icon: Power },
  disabled: { label: '禁用', color: 'text-red-600', bgColor: 'bg-red-100', icon: PowerOff }
}

const DataDictionaryPage: React.FC = () => {
  const { showConfirm } = useGlobalDialog()
  const { showError } = useNotifications()
  
  // 使用字典管理hook
  const {
    dictionaries,
    dictTypes,
    pagination,
    filters,
    selectedIds,
    isLoading,
    isCreating,
    isBatchDeleting,
    isSyncing,
    isExporting,
    isAllSelected,
    isIndeterminate,
    setFilters,
    setPagination,
    createDict,
    updateDict,
    deleteDict,
    batchDeleteDicts,
    syncToDevices,
    exportDicts,
    toggleSelectAll,
    toggleSelectId
  } = useDict()
  
  // 表单状态
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingDict, setEditingDict] = useState<DataDict | null>(null)
  const [expandedDict, setExpandedDict] = useState<string | null>(null)
  const [expandedDictDetails, setExpandedDictDetails] = useState<DataDict | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  
  // 搜索关键词状态
  const [searchKeyword, setSearchKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<EntityStatus | ''>('')

  // 防抖搜索
  const debouncedSearch = debounce((keyword: string) => {
    setFilters({ ...filters, keyword })
    setPagination({ page: 1, pageSize: pagination?.pageSize || 10 })
  }, 500)

  const handleSearch = (value: string) => {
    setSearchKeyword(value)
    debouncedSearch(value)
  }

  const handleTypeFilter = (type: string) => {
    setTypeFilter(type)
    setFilters({ ...filters, dictType: type || undefined })
    setPagination({ page: 1, pageSize: pagination?.pageSize || 10 })
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status as EntityStatus | '')
    setFilters({ ...filters, status: status as EntityStatus | undefined })
    setPagination({ page: 1, pageSize: pagination?.pageSize || 10 })
  }

  const handleToggleExpand = async (dictId: string) => {
    if (expandedDict === dictId) {
      setExpandedDict(null)
      setExpandedDictDetails(null)
    } else {
      setExpandedDict(dictId)
      // 加载完整的字典详情（包括items）
      setLoadingDetails(true)
      try {
        const details = await dictApi.getDictionary(dictId)
        setExpandedDictDetails(details)
      } catch (error) {
        console.error('Failed to load dictionary details:', error)
      } finally {
        setLoadingDetails(false)
      }
    }
  }

  const handleEdit = async (dict: DataDict) => {
    // 加载完整的字典详情（包括 items）
    setLoadingDetails(true)
    try {
      const fullDict = await dictApi.getDictionary(dict.id)
      setEditingDict(fullDict)
      setIsEditModalOpen(true)
    } catch (error: any) {
      console.error('Failed to load dictionary details:', error)
      showError('加载失败', error?.message || '无法加载字典详情，请重试')
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: '确认删除',
      content: '确定要删除这个数据字典吗？删除后无法恢复。',
      confirmText: '删除',
      cancelText: '取消'
    })
    
    if (confirmed) {
      try {
        await deleteDict(id)
      } catch (error) {
        console.error('Failed to delete dict:', error)
      }
    }
  }

  const handleBatchDelete = async () => {
    const confirmed = await showConfirm({
      title: '批量删除确认',
      content: `确定要删除选中的 ${selectedIds.length} 个数据字典吗？删除后无法恢复。`,
      confirmText: '批量删除',
      cancelText: '取消'
    })
    
    if (confirmed) {
      try {
        await batchDeleteDicts(selectedIds)
      } catch (error) {
        console.error('Failed to batch delete dicts:', error)
      }
    }
  }

  const handleExport = async () => {
    try {
      const exportIds = selectedIds.length > 0 ? selectedIds : undefined
      await exportDicts(exportIds)
    } catch (error) {
      console.error('Failed to export dicts:', error)
    }
  }

  const handleSyncToDevices = async () => {
    const confirmed = await showConfirm({
      title: '同步到设备',
      content: `确定要将选中的 ${selectedIds.length} 个数据字典同步到设备吗？`,
      confirmText: '同步',
      cancelText: '取消'
    })
    
    if (confirmed) {
      try {
        await syncToDevices(selectedIds)
      } catch (error) {
        console.error('Failed to sync to devices:', error)
      }
    }
  }

  const handleCreateNew = () => {
    setEditingDict(null)
    setIsEditModalOpen(true)
  }

  const handleSaveDict = async (data: CreateDictRequest) => {
    try {
      if (editingDict) {
        await updateDict(editingDict.id, data as Omit<UpdateDictRequest, 'id'>)
      } else {
        await createDict(data)
      }
      setIsEditModalOpen(false)
      setEditingDict(null)
    } catch (error) {
      // 错误已由 useDict hook 处理，这里只需要捕获以防止未处理的 Promise rejection
      console.error('Failed to save dict:', error)
      throw error // 重新抛出以便 DictEditModal 可以处理
    }
  }

  const renderStatus = (status: EntityStatus) => {
    const config = statusConfig[status]
    if (!config) {
      return <span>{status}</span>
    }
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.bgColor} ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    )
  }

  const renderDictItems = (items: DictItem[] = []) => {
    if (!items || items.length === 0) {
      return (
        <div className="mt-4 border-t pt-4 text-center text-muted-foreground">
          暂无字典项
        </div>
      )
    }

    return (
      <div className="mt-4 border-t pt-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          字典项列表
          <Button variant="outline" size="sm">
            <Plus className="w-3 h-3" />
            新增项
          </Button>
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="text-left p-2 font-medium">项编码</th>
                <th className="text-left p-2 font-medium">项名称</th>
                <th className="text-left p-2 font-medium">项值</th>
                <th className="text-left p-2 font-medium">状态</th>
                <th className="text-center p-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b hover:bg-muted/10">
                  <td className="p-2 font-mono text-xs">{item.code}</td>
                  <td className="p-2">{item.name}</td>
                  <td className="p-2 font-mono text-xs">{item.value}</td>
                  <td className="p-2">{renderStatus(item.status)}</td>
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const columns: TableColumn<DataDict>[] = [
    {
      key: 'select',
      title: '',
      width: 50,
      render: (_, record: DataDict) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(record.id)}
          onChange={() => toggleSelectId(record.id)}
          className="rounded border-gray-300"
        />
      ),
    },
    {
      key: 'dictCode',
      title: '字典ID',
      width: 120,
      render: (dictCode: string) => (
        <code className="text-xs bg-muted px-2 py-1 rounded">{dictCode}</code>
      ),
    },
    {
      key: 'dictName',
      title: '字典名称',
      width: 150,
      render: (dictName: string) => (
        <span className="font-medium">{dictName}</span>
      ),
    },
    {
      key: 'dictType',
      title: '字典类型',
      width: 100,
      render: (dictType: string) => (
        <span className="text-sm text-muted-foreground">{dictType}</span>
      ),
    },
    {
      key: 'itemCount',
      title: '子项数量',
      width: 80,
      align: 'center',
      render: (itemCount: number) => (
        <span className="font-medium">{itemCount}</span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      width: 80,
      render: (status: EntityStatus) => renderStatus(status),
    },
    {
      key: 'actions',
      title: '操作',
      width: 200,
      align: 'center',
      render: (_, record: DataDict) => (
        <div className="flex items-center justify-center gap-1">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleToggleExpand(record.id)}
            title="查看详情"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleEdit(record)}
            disabled={loadingDetails}
            title="编辑"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleDelete(record.id)}
            className="text-red-600 hover:text-red-700"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleExport()}
            title="下载"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* 搜索和筛选工具栏 */}
      <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索字典名称或ID..."
                value={searchKeyword}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={typeFilter}
              onValueChange={handleTypeFilter}
              className="w-[140px]"
              options={[
                { value: '', label: '字典类型' },
                ...dictTypes.map((type) => ({ value: type.value, label: type.label })),
              ]}
            />

            <Select
              value={statusFilter}
              onValueChange={handleStatusFilter}
              className="w-[110px]"
              options={[
                { value: '', label: '状态' },
                { value: 'enabled', label: '启用' },
                { value: 'disabled', label: '禁用' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* 操作按钮区域 */}
      <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => {
              if (el) el.indeterminate = isIndeterminate
            }}
            onChange={() => toggleSelectAll()}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.length > 0 && `已选择 ${selectedIds.length} 项`}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="w-4 h-4" />
            导出
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleBatchDelete}
            disabled={selectedIds.length === 0 || isBatchDeleting}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
            批量删除
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSyncToDevices}
            disabled={selectedIds.length === 0 || isSyncing}
          >
            <RefreshCw className="w-4 h-4" />
            同步到设备
          </Button>
          <Button onClick={handleCreateNew} disabled={isCreating}>
            <Plus className="w-4 h-4" />
            新增字典
          </Button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-background rounded-lg border">
        <DataTable
          data={dictionaries}
          columns={columns}
          loading={isLoading}
          pagination={pagination}
          onPaginationChange={setPagination}
          bordered={true}
          compact={true}
        />
        
        {/* 展开的字典详情 */}
        {expandedDict && (
          <div className="border-t">
            {loadingDetails ? (
              <div className="p-8 text-center text-muted-foreground">
                加载详情中...
              </div>
            ) : expandedDictDetails ? (
              <Card className="m-4 border-0 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <span>字典详情: {expandedDictDetails.dictCode} - {expandedDictDetails.dictName}</span>
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setExpandedDict(null)
                        setExpandedDictDetails(null)
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">字典类型：</span>
                      <span className="font-medium">{expandedDictDetails.dictType}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">状态：</span>
                      {renderStatus(expandedDictDetails.status)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">子项数量：</span>
                      <span className="font-medium">{expandedDictDetails.itemCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">更新时间：</span>
                      <span className="font-medium">{new Date(expandedDictDetails.updatedAt).toLocaleString('zh-CN')}</span>
                    </div>
                  </div>
                  
                  {expandedDictDetails.remark && (
                    <div className="mb-4 text-sm">
                      <span className="text-muted-foreground">备注：</span>
                      <span>{expandedDictDetails.remark}</span>
                    </div>
                  )}
                  
                  {renderDictItems(expandedDictDetails.items || [])}
                </CardContent>
              </Card>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                无法加载字典详情
              </div>
            )}
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      <DictEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingDict(null)
        }}
        onSave={handleSaveDict}
        dict={editingDict}
      />
    </div>
  )
}

export default DataDictionaryPage
