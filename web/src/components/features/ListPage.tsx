import { createContext, useContext } from 'react'
import type { LucideIcon } from 'lucide-react'
import { X } from 'lucide-react'
import { PageActions } from '@/components/layouts/PageActions'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useStore } from '@/store'
import { cn } from '@/utils'

/**
 * 列表页骨架 —— 页面只声明「有哪几块」，怎么摆由界面密度决定。
 *
 *   舒展卡片风 comfortable：统计卡片 → 筛选卡 → 表格卡（分页随页面滚动）
 *   紧凑数据风 compact    ：一张卡撑满视口——一行工具栏（筛选 | 统计摘要 | 列设置）
 *                           + 表格（表头吸顶、表体内部滚动、分页钉在底部）
 *
 * ```tsx
 * <ListPage
 *   actions={<Button>新增用户</Button>}          // 送到顶栏面包屑那一行
 *   stats={[{ key: 'total', label: '总数', value: 5 }]}
 *   filters={<><Input .../><Select .../></>}
 *   toolbarRight={columnSettings}
 *   selection={{ count, onClear, actions: <Button>批量删除</Button> }}
 * >
 *   <DataTable ... />                             // 紧凑模式下自动 fillHeight
 * </ListPage>
 * ```
 *
 * 筛选控件请给 className="h-control"，高度才会跟着密度走。
 */

export type StatTone = 'primary' | 'success' | 'warning' | 'error' | 'muted'

export interface StatItem {
  key: string
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  tone?: StatTone
}

export interface ListPageSelection {
  count: number
  onClear: () => void
  /** 选中后出现的批量操作按钮 */
  actions: React.ReactNode
}

export interface ListPageProps {
  /** 页面级操作（新增、导入…），Portal 到顶栏 */
  actions?: React.ReactNode
  stats?: StatItem[]
  /** 搜索 / 筛选控件 */
  filters?: React.ReactNode
  /** 工具栏右侧：列设置、刷新等 */
  toolbarRight?: React.ReactNode
  selection?: ListPageSelection
  /** 表格 */
  children: React.ReactNode
  className?: string
}

/** 让 DataTable 知道自己是否该撑满高度（不传 fillHeight 时读这里） */
export const ListPageContext = createContext<{ fillHeight: boolean }>({ fillHeight: false })
export const useListPageLayout = () => useContext(ListPageContext)

const toneStyles: Record<StatTone, { text: string; dot: string }> = {
  primary: { text: 'text-primary', dot: 'bg-primary' },
  success: { text: 'text-success', dot: 'bg-success' },
  warning: { text: 'text-warning', dot: 'bg-warning' },
  error: { text: 'text-error', dot: 'bg-error' },
  muted: { text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
}

export function ListPage({
  actions,
  stats,
  filters,
  toolbarRight,
  selection,
  children,
  className,
}: ListPageProps) {
  const density = useStore((s) => s.density)
  const compact = density === 'compact'
  const hasSelection = !!selection && selection.count > 0

  const pageActions = actions ? <PageActions>{actions}</PageActions> : null

  if (compact) {
    return (
      <ListPageContext.Provider value={{ fillHeight: true }}>
        {pageActions}
        <div
          className={cn(
            // 撑满内容区：视口 - 顶栏 - 上下内边距；太矮时保底 360px，交给外层滚动
            'flex h-[calc(100svh-var(--header-h)-2*var(--page-pad))] min-h-[360px] flex-col overflow-hidden rounded-xl border bg-card shadow-xs',
            className
          )}
        >
          {(filters || stats?.length || toolbarRight) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-cell py-2">
              {filters}
              <div className="ml-auto flex items-center gap-3">
                {stats && stats.length > 0 && <StatSummary stats={stats} />}
                {toolbarRight}
              </div>
            </div>
          )}
          {hasSelection && <SelectionBar selection={selection!} />}
          {children}
        </div>
      </ListPageContext.Provider>
    )
  }

  return (
    <ListPageContext.Provider value={{ fillHeight: false }}>
      {pageActions}
      <div className={cn('space-y-section', className)}>
        {stats && stats.length > 0 && <StatCards stats={stats} />}

        {(filters || toolbarRight) && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4 shadow-xs">
            {filters}
            {toolbarRight && <div className="ml-auto flex items-center gap-1">{toolbarRight}</div>}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          {hasSelection && <SelectionBar selection={selection!} />}
          {children}
        </div>
      </div>
    </ListPageContext.Provider>
  )
}

// ---------- 舒展：统计卡片（shadcn dashboard-01 SectionCards 同款） ----------
function StatCards({ stats }: { stats: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-section lg:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon
        const tone = toneStyles[s.tone ?? 'muted']
        return (
          <Card key={s.key} className="@container/card gap-2 bg-linear-to-t from-primary/5 to-card py-4 shadow-xs dark:bg-card">
            <CardHeader className="px-4">
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">{s.value}</CardTitle>
              {Icon && (
                <CardAction>
                  <Icon className={cn('size-4', tone.text)} />
                </CardAction>
              )}
            </CardHeader>
          </Card>
        )
      })}
    </div>
  )
}

// ---------- 紧凑：工具栏里的一行统计摘要 ----------
function StatSummary({ stats }: { stats: StatItem[] }) {
  return (
    <div className="hidden items-center gap-3 whitespace-nowrap text-table text-muted-foreground md:flex">
      {stats.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          {s.tone && s.tone !== 'primary' && (
            <span className={cn('h-1.5 w-1.5 rounded-full', toneStyles[s.tone].dot)} aria-hidden />
          )}
          {s.label}
          <span className="font-medium tabular-nums text-foreground">{s.value}</span>
        </span>
      ))}
    </div>
  )
}

// ---------- 选中后的批量操作条（两种密度共用） ----------
function SelectionBar({ selection }: { selection: ListPageSelection }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-tint px-cell py-1.5 text-table">
      <span className="text-foreground">
        已选 <span className="font-medium tabular-nums">{selection.count}</span> 项
      </span>
      <button
        type="button"
        onClick={selection.onClear}
        className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
        取消选择
      </button>
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      <div className="flex flex-wrap items-center gap-2">{selection.actions}</div>
    </div>
  )
}
