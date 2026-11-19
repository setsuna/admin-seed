import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusTag } from '@/components/ui/StatusTag'
import { DataTable } from '@/components/features/DataTable'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/utils'
import type { DataDict, DictItem, TableColumn } from '@/types'

/**
 * 数据字典详情（只读）：右侧 640 宽抽屉，手机上从底部出。
 * 上面是基本信息，下面是字典项表格；增删改在「编辑」里做（打开编辑抽屉）。
 */
interface DictDetailSheetProps {
  open: boolean
  /** 完整详情（含 items）；加载中为 null */
  dict: DataDict | null
  loading?: boolean
  onClose: () => void
  onEdit: (dict: DataDict) => void
}

const statusTag = (status: string) =>
  status === 'enabled' ? <StatusTag tone="success">启用</StatusTag> : <StatusTag tone="neutral">禁用</StatusTag>

const itemColumns: TableColumn<DictItem>[] = [
  {
    key: 'code',
    title: '项编码',
    width: 150,
    ellipsis: true,
    render: (code: string) => <span className="font-mono text-xs">{code}</span>,
  },
  { key: 'name', title: '项名称', width: 120, ellipsis: true },
  {
    key: 'value',
    title: '项值',
    width: 220,
    ellipsis: true,
    render: (value: string | number) => <span className="font-mono text-xs text-muted-foreground">{String(value)}</span>,
  },
  { key: 'status', title: '状态', width: 80, render: statusTag },
]

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-1.5', wide && 'col-span-2')}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{children}</dd>
    </div>
  )
}

export function DictDetailSheet({ open, dict, loading, onClose, onEdit }: DictDetailSheetProps) {
  const isMobile = useIsMobile()

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn('gap-0 sm:max-w-[640px]', isMobile && 'max-h-[90svh]')}
      >
        <SheetHeader className="gap-1 pr-12">
          <div className="flex items-center gap-3">
            <SheetTitle className="truncate">{dict?.dictName ?? '字典详情'}</SheetTitle>
            {dict && (
              <Button variant="outline" size="sm" className="ml-auto h-7" onClick={() => onEdit(dict)}>
                <Pencil />
                编辑
              </Button>
            )}
          </div>
          <SheetDescription className="font-mono text-xs">{dict?.dictCode ?? ' '}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 text-sm">
          {loading || !dict ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-1/2 bg-muted" />
              <Skeleton className="h-4 w-2/3 bg-muted" />
              <Skeleton className="h-40 w-full bg-muted" />
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-4">
                <Field label="字典类型">{dict.dictType}</Field>
                <Field label="状态">{statusTag(dict.status)}</Field>
                <Field label="子项数量"><span className="tabular-nums">{dict.itemCount}</span></Field>
                <Field label="更新时间">
                  <span className="tabular-nums">{new Date(dict.updatedAt).toLocaleString('zh-CN')}</span>
                </Field>
                {dict.remark && <Field label="备注" wide>{dict.remark}</Field>}
              </dl>

              <section className="mt-6 flex flex-col gap-4 border-t pt-6">
                <h3 className="font-medium">字典项</h3>
                <DataTable
                  bordered
                  data={dict.items ?? []}
                  columns={itemColumns}
                  rowKey="id"
                  emptyText="暂无字典项"
                />
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
