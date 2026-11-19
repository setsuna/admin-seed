import { createContext, useContext } from 'react'
import type { LucideIcon } from 'lucide-react'
import { X } from 'lucide-react'
import { PageActions } from '@/components/layouts/PageActions'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/utils'

/**
 * 列表页骨架 —— 页面只声明「有哪几块」：
 *
 *   统计卡片 → 筛选卡 → 表格（圆角边框，照 shadcn 官方 dashboard）→ 分页（边框外）
 *
 * ```tsx
 * <ListPage
 *   actions={<Button>新增用户</Button>}          // 送到顶栏面包屑那一行
 *   stats={[{ key: 'total', label: '总数', value: 5 }]}
 *   filters={<><Input .../><Select .../></>}
 *   toolbarRight={columnSettings}
 *   selection={{ count, onClear, actions: <Button>批量删除</Button> }}
 * >
 *   <DataTable ... />
 * </ListPage>
 * ```
 *
 * 筛选控件请给 className="h-control"，与按钮同高。
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

/** 让 DataTable 知道自己的排法（不传 fillHeight / bordered 时读这里）：ListPage 里的表格默认带官方边框 */
export const ListPageContext = createContext<{ fillHeight: boolean; bordered: boolean }>({
  fillHeight: false,
  bordered: false,
})
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
  const hasSelection = !!selection && selection.count > 0

  const pageActions = actions ? <PageActions>{actions}</PageActions> : null

  return (
    <ListPageContext.Provider value={{ fillHeight: false, bordered: true }}>
      {pageActions}
      <div className={cn('space-y-section', className)}>
        {stats && stats.length > 0 && <StatCards stats={stats} />}

        {(filters || toolbarRight) && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4 shadow-xs">
            {filters}
            {toolbarRight && <div className="ml-auto flex items-center gap-1">{toolbarRight}</div>}
          </div>
        )}

        {/* 照 shadcn 官方 dashboard：（选中时）批量操作条 → 表格（自带圆角边框）→ 分页（边框外），间距 16 */}
        <div className="flex flex-col gap-4">
          {hasSelection && <SelectionBar selection={selection!} />}
          {children}
        </div>
      </div>
    </ListPageContext.Provider>
  )
}

// ---------- 统计卡片（shadcn dashboard-01 SectionCards 同款） ----------
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

// ---------- 选中后的批量操作条 ----------
function SelectionBar({ selection }: { selection: ListPageSelection }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 text-sm">
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
