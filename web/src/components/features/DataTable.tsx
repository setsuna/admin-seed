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
import { Loading } from '@/components/ui/Loading'
import { Select } from '@/components/ui/option-select'
import { cn } from '@/utils'
import type { TableColumn, TableProps } from '@/types'

/**
 * 通用数据表格（TanStack Table 驱动，样式随界面密度切换）。
 *
 * 列定义仍沿用项目的 TableColumn（key / title / width / align / render），
 * 老页面不用改就能用；新增能力都是可选的：
 *
 *   fillHeight        表格撑满父容器高度，表体内部滚动、表头吸顶、分页钉在底部
 *                     （紧凑数据风的列表页由 ListPage 自动开启）
 *   columnVisibility  列显隐状态，配合 useColumnSettings 使用
 *   ellipsis          列级：超宽省略号截断，悬停看全文
 *
 * 尺寸全部来自密度 token（h-row / h-table-head / px-cell / text-table），
 * 不要在这里写死高度和字号，否则两套风格会对不上。
 */

interface DataTableProps<T> extends TableProps<T> {
  /** 外层加圆角边框（表格不在 Card 里时用） */
  bordered?: boolean
  /** @deprecated 行高已由界面密度控制，此参数保留兼容，不再生效 */
  compact?: boolean
  selectable?: boolean
  selectedRowKeys?: string[]
  onSelectionChange?: (selectedKeys: string[]) => void
  /** 撑满父容器高度，表体内部滚动（父容器须是有确定高度的 flex 列）。
   *  不传时跟随所在 ListPage：紧凑数据风自动开启 */
  fillHeight?: boolean
  /** 列显隐（key 为列 key，false 表示隐藏），来自 useColumnSettings */
  columnVisibility?: VisibilityState
  /** 空数据提示 */
  emptyText?: React.ReactNode
}

const SELECT_COLUMN_ID = '__select__'
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export function DataTable<T = any>({
  data,
  columns,
  loading = false,
  pagination,
  onPaginationChange,
  rowKey = 'id' as keyof T,
  className,
  bordered = false,
  selectable = false,
  selectedRowKeys = [],
  onSelectionChange,
  fillHeight: fillHeightProp,
  columnVisibility,
  emptyText = '暂无数据',
}: DataTableProps<T>) {
  const layout = useListPageLayout()
  const fillHeight = fillHeightProp ?? layout.fillHeight

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
          <input
            type="checkbox"
            aria-label="全选"
            className="h-3.5 w-3.5 cursor-pointer accent-primary align-middle"
            checked={table.getIsAllRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomeRowsSelected()
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label="选择此行"
            className="h-3.5 w-3.5 cursor-pointer accent-primary align-middle"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
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
    <div
      className={cn(
        'flex flex-col',
        fillHeight && 'min-h-0 flex-1',
        bordered && 'rounded-md border',
        className
      )}
    >
      {/* 表体：fillHeight 时在这里滚动，表头吸顶 */}
      <div className={cn('relative w-full overflow-auto', fillHeight && 'min-h-0 flex-1')}>
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
                        'h-table-head whitespace-nowrap border-b bg-muted/60 px-cell font-medium text-muted-foreground',
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
              <tr>
                <td colSpan={visibleColumnCount} className="h-24 text-center">
                  <Loading />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumnCount} className="h-24 text-center text-muted-foreground">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className={cn(
                    'group transition-colors hover:bg-muted/50 data-[state=selected]:bg-tint',
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
                          'h-row whitespace-nowrap border-b px-cell align-middle',
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
  onChange: (page: number, pageSize: number) => void
}

export function TablePagination({ page, pageSize, total, onChange }: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // 最多显示 5 个页码，当前页尽量居中
  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i)

  const navBtn = 'h-control w-control p-0'

  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-t px-cell py-2 text-table">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>共 {total} 条</span>
        <Select
          size="sm"
          value={pageSize}
          onValueChange={(v) => onChange(1, Number(v))}
          options={PAGE_SIZE_OPTIONS.map((s) => ({ value: s, label: `${s} 条/页` }))}
          className="w-[96px]"
          triggerClassName="h-control text-table"
        />
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className={navBtn} aria-label="第一页"
          onClick={() => onChange(1, pageSize)} disabled={page <= 1}>
          <ChevronsLeft />
        </Button>
        <Button variant="ghost" size="sm" className={navBtn} aria-label="上一页"
          onClick={() => onChange(page - 1, pageSize)} disabled={page <= 1}>
          <ChevronLeft />
        </Button>
        {pages.map((p) => (
          <Button
            key={p}
            variant={p === page ? 'outline' : 'ghost'}
            size="sm"
            className={cn('h-control min-w-(--control-h) px-2', p === page && 'border-primary text-primary')}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p, pageSize)}
          >
            {p}
          </Button>
        ))}
        <Button variant="ghost" size="sm" className={navBtn} aria-label="下一页"
          onClick={() => onChange(page + 1, pageSize)} disabled={page >= totalPages}>
          <ChevronRight />
        </Button>
        <Button variant="ghost" size="sm" className={navBtn} aria-label="最后一页"
          onClick={() => onChange(totalPages, pageSize)} disabled={page >= totalPages}>
          <ChevronsRight />
        </Button>
      </div>
    </div>
  )
}
