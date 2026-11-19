import { useMemo } from 'react'
import { useListPageLayout } from './ListPage'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type VisibilityState,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Inbox } from 'lucide-react'
import { Select } from '@/components/ui/option-select'
import { cn } from '@/utils'
import type { TableColumn, TableProps } from '@/types'

/**
 * 通用数据表格（TanStack Table 驱动，样式照 shadcn 官方 dashboard 的表格）。
 *
 *   bordered 时：表格自带圆角 10 的 1px 边框（无阴影），分页条在边框外下方；
 *   表头浅灰底、高 40、正文色 14/500；单元格内距 8；勾选框 16px；
 *   分页：左「已选 N / 共 M 行」，右「每页 [N]」「第 X / Y 页」+ 首页/上页/下页/末页 4 个 32px 按钮。
 *
 * 列定义仍沿用项目的 TableColumn（key / title / width / align / render），
 * 老页面不用改就能用；新增能力都是可选的：
 *
 *   fillHeight        表格撑满父容器高度，表体内部滚动、表头吸顶、分页钉在底部
 *   columnVisibility  列显隐状态，配合 useColumnSettings 使用
 *   ellipsis          列级：超宽省略号截断，悬停看全文
 *
 * 尺寸全部来自 token（h-row / h-table-head / px-cell / text-table），不要在这里写死高度和字号。
 */

interface DataTableProps<T> extends TableProps<T> {
  /** 表格加圆角边框、分页放到边框外（官方样式）。不传时跟随所在 ListPage（ListPage 里默认开） */
  bordered?: boolean
  /** @deprecated 行高已由界面密度控制，此参数保留兼容，不再生效 */
  compact?: boolean
  selectable?: boolean
  selectedRowKeys?: string[]
  onSelectionChange?: (selectedKeys: string[]) => void
  /** 撑满父容器高度，表体内部滚动（父容器须是有确定高度的 flex 列）。
   *  不传时跟随所在 ListPage（目前默认不开） */
  fillHeight?: boolean
  /** 列显隐（key 为列 key，false 表示隐藏），来自 useColumnSettings */
  columnVisibility?: VisibilityState
  /** 空数据提示 */
  emptyText?: React.ReactNode
  /** 空态下的可行操作（如「新增用户」按钮）——规范要求空态给出下一步 */
  emptyAction?: React.ReactNode
}

const SELECT_COLUMN_ID = '__select__'
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const SKELETON_ROWS = 5

export function DataTable<T = any>({
  data,
  columns,
  loading = false,
  pagination,
  onPaginationChange,
  rowKey = 'id' as keyof T,
  className,
  bordered: borderedProp,
  selectable = false,
  selectedRowKeys = [],
  onSelectionChange,
  fillHeight: fillHeightProp,
  columnVisibility,
  emptyText = '暂无数据',
  emptyAction,
}: DataTableProps<T>) {
  const layout = useListPageLayout()
  const fillHeight = fillHeightProp ?? layout.fillHeight
  const bordered = borderedProp ?? layout.bordered

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') return rowKey(record)
    return String((record as any)[rowKey] ?? index)
  }

  // ---------- 列定义：TableColumn → TanStack ColumnDef ----------
  const columnDefs = useMemo<ColumnDef<T>[]>(() => {
    const defs: ColumnDef<T>[] = columns.map((col: TableColumn<T>) => ({
      id: String(col.key),
      header: col.title,
      accessorFn: (row: T) => (row as any)[col.key as string],
      cell: (ctx) =>
        col.render
          ? col.render(ctx.getValue(), ctx.row.original, ctx.row.index)
          : (ctx.getValue() as React.ReactNode) ?? '-',
      enableHiding: col.hideable !== false,
      meta: col,
    }))

    if (selectable) {
      defs.unshift({
        id: SELECT_COLUMN_ID,
        enableHiding: false,
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              aria-label="全选"
              checked={table.getIsAllRowsSelected() || (table.getIsSomeRowsSelected() && 'indeterminate')}
              onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              aria-label="选择此行"
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(!!v)}
            />
          </div>
        ),
      })
    }
    return defs
  }, [columns, selectable])

  // ---------- 选择：受控，外部仍用 string[] ----------
  const rowSelection = useMemo<RowSelectionState>(
    () => Object.fromEntries(selectedRowKeys.map((k) => [k, true])),
    [selectedRowKeys]
  )

  const table = useReactTable<T>({
    data,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row, index) => getRowKey(row, index),
    manualPagination: true,
    enableRowSelection: selectable,
    state: {
      rowSelection,
      columnVisibility: columnVisibility ?? {},
    },
    onRowSelectionChange: (updater) => {
      if (!onSelectionChange) return
      const next = typeof updater === 'function' ? updater(rowSelection) : updater
      onSelectionChange(Object.keys(next).filter((k) => next[k]))
    },
  })

  const visibleColumnCount = table.getVisibleLeafColumns().length
  const rows = table.getRowModel().rows

  const alignClass = (col?: TableColumn<T>) =>
    col?.align === 'center' ? 'text-center' : col?.align === 'right' ? 'text-right' : 'text-left'

  return (
    <div className={cn('flex flex-col', bordered && 'gap-4', fillHeight && 'min-h-0 flex-1', className)}>
      {/* 表体：fillHeight 时在这里滚动，表头吸顶；bordered 时外面是官方的圆角边框 */}
      <div
        className={cn(
          'relative w-full overflow-auto',
          bordered && 'rounded-[10px] border',
          fillHeight && 'min-h-0 flex-1'
        )}
      >
        <table className="w-full caption-bottom border-separate border-spacing-0 text-table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const col = header.column.columnDef.meta as TableColumn<T> | undefined
                  const isSelect = header.column.id === SELECT_COLUMN_ID
                  return (
                    <th
                      key={header.id}
                      style={{ width: isSelect ? 40 : col?.width }}
                      className={cn(
                        'h-table-head whitespace-nowrap border-b bg-muted px-cell font-medium text-foreground',
                        fillHeight && 'sticky top-0 z-1',
                        isSelect ? 'text-center' : alignClass(col)
                      )}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              // 加载态：骨架屏（规范）
              Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <tr key={`skeleton-${i}`} aria-hidden>
                  {Array.from({ length: visibleColumnCount }, (__, j) => (
                    <td key={j} className="h-row border-b px-cell">
                      <Skeleton className="h-3.5 w-3/4 bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              // 空态：说明 + 可行操作
              <tr>
                <td colSpan={visibleColumnCount} className="py-10 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Inbox className="size-6" aria-hidden />
                    <span>{emptyText}</span>
                    {emptyAction}
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className={cn(
                    'group transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted [&:last-child>td]:border-b-0',
                    loading && 'opacity-60'
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const col = cell.column.columnDef.meta as TableColumn<T> | undefined
                    const isSelect = cell.column.id === SELECT_COLUMN_ID
                    const content = flexRender(cell.column.columnDef.cell, cell.getContext())
                    const raw = cell.getValue()
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          'h-row whitespace-nowrap border-b px-cell align-middle text-foreground',
                          isSelect ? 'text-center' : alignClass(col)
                        )}
                      >
                        {col?.ellipsis ? (
                          <div
                            className="truncate"
                            style={{ maxWidth: col.width }}
                            title={typeof raw === 'string' || typeof raw === 'number' ? String(raw) : undefined}
                          >
                            {content}
                          </div>
                        ) : (
                          content
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (pagination.total ?? 0) > 0 && (
        <TablePagination
          page={pagination.page || 1}
          pageSize={pagination.pageSize}
          total={pagination.total ?? 0}
          selectedCount={selectable ? selectedRowKeys.length : undefined}
          bordered={bordered}
          onChange={(page, pageSize) => onPaginationChange?.({ ...pagination, page, pageSize })}
        />
      )}
    </div>
  )
}

// ============================================================
// 分页条
// ============================================================

interface TablePaginationProps {
  page: number
  pageSize: number
  total: number
  /** 可勾选的表格传已选数，左侧显示「已选 N / 共 M 行」 */
  selectedCount?: number
  /** 分页在表格边框外（官方样式）；否则在表格底部、带上边线 */
  bordered?: boolean
  onChange: (page: number, pageSize: number) => void
}

/** 分页条（照 shadcn 官方 dashboard）：左边已选/总数，右边每页条数、页码、4 个 32px 描边图标按钮 */
export function TablePagination({ page, pageSize, total, selectedCount, bordered = true, onChange }: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const navBtn = 'size-8 p-0'

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-between gap-4 px-4 text-sm',
        !bordered && 'border-t py-2'
      )}
    >
      <div className="hidden flex-1 text-muted-foreground lg:flex">
        {selectedCount !== undefined ? `已选 ${selectedCount} / 共 ${total} 行` : `共 ${total} 行`}
      </div>

      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <span className="font-medium">每页</span>
          <Select
            size="sm"
            value={pageSize}
            onValueChange={(v) => onChange(1, Number(v))}
            options={PAGE_SIZE_OPTIONS.map((s) => ({ value: s, label: String(s) }))}
            className="w-20"
            triggerClassName="h-8 text-sm"
          />
        </div>
        <div className="flex w-fit items-center justify-center font-medium tabular-nums">
          第 {page} / {totalPages} 页
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button variant="outline" className={cn(navBtn, 'hidden lg:flex')} aria-label="第一页"
            onClick={() => onChange(1, pageSize)} disabled={page <= 1}>
            <ChevronsLeft />
          </Button>
          <Button variant="outline" className={navBtn} aria-label="上一页"
            onClick={() => onChange(page - 1, pageSize)} disabled={page <= 1}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" className={navBtn} aria-label="下一页"
            onClick={() => onChange(page + 1, pageSize)} disabled={page >= totalPages}>
            <ChevronRight />
          </Button>
          <Button variant="outline" className={cn(navBtn, 'hidden lg:flex')} aria-label="最后一页"
            onClick={() => onChange(totalPages, pageSize)} disabled={page >= totalPages}>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
