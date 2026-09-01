import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { Select } from '@/components/ui/Select'
import { cn } from '@/utils'
import type { TableProps } from '@/types'

interface DataTableProps<T> extends TableProps<T> {
  bordered?: boolean
  compact?: boolean
  selectable?: boolean
  selectedRowKeys?: string[]
  onSelectionChange?: (selectedKeys: string[]) => void
}

export function DataTable<T = any>({ 
  data, 
  columns, 
  loading = false,
  pagination,
  onPaginationChange,
  rowKey = 'id' as keyof T,
  className,
  bordered = false,
  compact = false,
  selectable = false,
  selectedRowKeys = [],
  onSelectionChange
}: DataTableProps<T>) {
  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record)
    }
    return (record as any)[rowKey] || index.toString()
  }
  
  const renderCell = (column: any, record: T, index: number) => {
    const value = (record as any)[column.key]
    
    if (column.render) {
      return column.render(value, record, index)
    }
    
    return value
  }
  
  const handlePageChange = (page: number) => {
    if (pagination && onPaginationChange) {
      onPaginationChange({
        ...pagination,
        page,
      })
    }
  }
  
  const handlePageSizeChange = (pageSize: number) => {
    if (pagination && onPaginationChange) {
      onPaginationChange({
        ...pagination,
        page: 1,
        pageSize,
      })
    }
  }
  
  // 选择功能相关
  const allRowKeys = data.map((record, index) => getRowKey(record, index))
  const isAllSelected = selectable && allRowKeys.length > 0 && 
    allRowKeys.every(key => selectedRowKeys.includes(key))
  const isSomeSelected = selectable && selectedRowKeys.length > 0 && 
    selectedRowKeys.length < allRowKeys.length
  
  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(checked ? allRowKeys : [])
    }
  }
  
  const handleSelectRow = (key: string, checked: boolean) => {
    if (onSelectionChange) {
      const newSelectedKeys = checked
        ? [...selectedRowKeys, key]
        : selectedRowKeys.filter(k => k !== key)
      onSelectionChange(newSelectedKeys)
    }
  }
  
  const totalPages = pagination?.total ? Math.ceil(pagination.total / pagination.pageSize) : 0
  const currentPage = pagination?.page || 1
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* 表格 */}
      <div className={cn(bordered && 'rounded-md border')}>
        <Table>
          <TableHeader>
            <TableRow>
              {/* 选择列表头 */}
              {selectable && (
                <TableHead style={{ width: 50 }} className="text-center">
                  <input
                    type="checkbox"
                    className="rounded border-border cursor-pointer"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = isSomeSelected
                      }
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead 
                  key={column.key.toString()}
                  style={{ width: column.width }}
                  className={cn(
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                >
                  {column.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="h-24 text-center">
                  <Loading />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="h-24 text-center">
                  <div className="text-muted-foreground">暂无数据</div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((record, index) => {
                const key = getRowKey(record, index)
                const isSelected = selectedRowKeys.includes(key)
                
                return (
                  <TableRow key={key} className={cn(compact && 'h-12')}>
                    {/* 选择列 */}
                    {selectable && (
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          className="rounded border-border cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(key, e.target.checked)}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell 
                        key={column.key.toString()}
                        className={cn(
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right',
                          compact && 'py-2'
                        )}
                      >
                        {renderCell(column, record, index)}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* 分页 */}
      {pagination && (pagination.total ?? 0) > 0 && (
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>每页显示</span>
            <Select
              size="sm"
              value={pagination.pageSize}
              onValueChange={(v) => handlePageSizeChange(Number(v))}
              options={[10, 20, 50, 100].map((s) => ({ value: s, label: String(s) }))}
              className="w-[72px]"
            />
            <span>条，共 {pagination.total} 条</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number
                if (totalPages <= 5) {
                  page = i + 1
                } else if (currentPage <= 3) {
                  page = i + 1
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i
                } else {
                  page = currentPage - 2 + i
                }
                
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className="w-8"
                  >
                    {page}
                  </Button>
                )
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
