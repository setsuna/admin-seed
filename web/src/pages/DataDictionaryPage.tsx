import React, { useState } from 'react'
import { Search, Filter, Download, Trash2, RefreshCw } from 'lucide-react'
import { CirclePlusFilled } from '@/components/icons/CirclePlusFilled'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/option-select'
import { DataTable } from '@/components/features/DataTable'
import { RowActions } from '@/components/features/RowActions'
import { DictDetailSheet } from '@/components/features/DictDetailSheet'
import { StatusTag } from '@/components/ui/StatusTag'
import { PageActions } from '@/components/layouts/PageActions'
import DictEditModal from '@/components/features/DictEditModal'
import { useGlobalDialog } from '@/components/ui/DialogProvider'
import { useDict } from '@/hooks/useDict'
import { useNotifications } from '@/hooks/useNotifications'
import { dictApi } from '@/services/dict'
import { debounce } from '@/utils'
import type { 
  DataDict, 
  EntityStatus,
  TableColumn,
  CreateDictRequest,
  UpdateDictRequest
} from '@/types'

const statusConfig = {
  enabled: { label: '启用', tone: 'success' as const },
  disabled: { label: '禁用', tone: 'neutral' as const },
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
    setFilters,
    setPagination,
    createDict,
    updateDict,
    deleteDict,
    batchDeleteDicts,
    syncToDevices,
    exportDicts,
    setSelectedIds,
  } = useDict()
  
  // 表单状态
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingDict, setEditingDict] = useState<DataDict | null>(null)
  // 详情抽屉：正在查看的字典 id 和加载到的完整详情（含字典项）
  const [viewingDictId, setViewingDictId] = useState<string | null>(null)
  const [viewingDict, setViewingDict] = useState<DataDict | null>(null)
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

  // 打开详情抽屉，加载完整的字典详情（包括 items）
  const handleView = async (dictId: string) => {
    setViewingDictId(dictId)
    setViewingDict(null)
    setLoadingDetails(true)
    try {
      setViewingDict(await dictApi.getDictionary(dictId))
    } catch (error: any) {
      console.error('Failed to load dictionary details:', error)
      showError('加载失败', error?.message || '无法加载字典详情，请重试')
      setViewingDictId(null)
    } finally {
      setLoadingDetails(false)
    }
  }

  const closeView = () => {
    setViewingDictId(null)
    setViewingDict(null)
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
    return <StatusTag tone={config.tone}>{config.label}</StatusTag>
  }

  const columns: TableColumn<DataDict>[] = [
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
      render: (dictName: string, record: DataDict) => (
        <button
          type="button"
          className="font-medium text-foreground hover:underline underline-offset-4"
          onClick={() => handleView(record.id)}
        >
          {dictName}
        </button>
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
      title: '',
      width: 56,
      align: 'right',
      render: (_, record: DataDict) => (
        <RowActions
          actions={[
            { key: 'view', label: '查看详情', onClick: () => handleView(record.id) },
            { key: 'edit', label: '编辑', onClick: () => handleEdit(record), disabled: loadingDetails },
            { key: 'export', label: '下载', onClick: () => handleExport() },
          ]}
          more={[{ key: 'delete', label: '删除', danger: true, onClick: () => handleDelete(record.id) }]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* 搜索和筛选工具栏 */}
      <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-xs">
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

      {/* 页面级操作：送到顶栏 */}
      <PageActions>
        <Button size="sm" className="h-control" onClick={handleCreateNew} disabled={isCreating}>
          <CirclePlusFilled />
          新增字典
        </Button>
      </PageActions>

      {/* 照官方：工具栏（无边框）→ 表格（自带圆角边框，分页在框外）；详情和编辑都在右侧抽屉 */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-table text-muted-foreground">
            {selectedIds.length > 0 ? `已选 ${selectedIds.length} 项` : '勾选后可批量删除、同步到设备'}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-control" onClick={handleExport} disabled={isExporting}>
              <Download />
              {selectedIds.length > 0 ? '导出所选' : '导出全部'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-control text-destructive hover:text-destructive"
              onClick={handleBatchDelete}
              disabled={selectedIds.length === 0 || isBatchDeleting}
            >
              <Trash2 />
              批量删除
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-control"
              onClick={handleSyncToDevices}
              disabled={selectedIds.length === 0 || isSyncing}
            >
              <RefreshCw />
              同步到设备
            </Button>
          </div>
        </div>

        <DataTable
          bordered
          data={dictionaries}
          columns={columns}
          loading={isLoading}
          pagination={pagination}
          onPaginationChange={setPagination}
          selectable
          selectedRowKeys={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>

      {/* 详情抽屉（只读）；「编辑」切到编辑抽屉 */}
      <DictDetailSheet
        open={!!viewingDictId}
        dict={viewingDict}
        loading={loadingDetails}
        onClose={closeView}
        onEdit={(dict) => {
          closeView()
          setEditingDict(dict)
          setIsEditModalOpen(true)
        }}
      />

      {/* 编辑抽屉 */}
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
