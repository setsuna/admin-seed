import { useCallback, useMemo, useState } from 'react'
import type { VisibilityState } from '@tanstack/react-table'
import { Columns } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { TableColumn } from '@/types'

/**
 * 列显隐设置：状态 + 按钮一起给，页面只需把两样东西各放到该放的位置。
 *
 * ```tsx
 * const { columnVisibility, columnSettings } = useColumnSettings('users', columns)
 *
 * <ListPage toolbarRight={columnSettings}>
 *   <DataTable columns={columns} columnVisibility={columnVisibility} ... />
 * </ListPage>
 * ```
 *
 * storageKey 用来把选择记在浏览器里（每个列表页一个 key，互不影响）。
 * localStorage 不可用（隐私模式等）时退化为只在本次会话内有效。
 */
export function useColumnSettings<T>(storageKey: string, columns: TableColumn<T>[]) {
  const fullKey = `table-columns:${storageKey}`

  const defaults = useMemo<VisibilityState>(
    () =>
      Object.fromEntries(
        columns.filter((c) => c.defaultHidden).map((c) => [String(c.key), false])
      ),
    [columns]
  )

  const [visibility, setVisibility] = useState<VisibilityState>(() => {
    try {
      const raw = window.localStorage.getItem(fullKey)
      if (raw) return { ...defaults, ...(JSON.parse(raw) as VisibilityState) }
    } catch {
      /* 读不到就用默认值 */
    }
    return defaults
  })

  const update = useCallback(
    (next: VisibilityState) => {
      setVisibility(next)
      try {
        window.localStorage.setItem(fullKey, JSON.stringify(next))
      } catch {
        /* 写不进去不影响本次使用 */
      }
    },
    [fullKey]
  )

  const hideable = columns.filter((c) => c.hideable !== false && c.title)
  const hiddenCount = hideable.filter((c) => visibility[String(c.key)] === false).length

  const columnSettings = (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-control gap-1 px-2 text-table text-muted-foreground"
          title="列设置"
        >
          <Columns />
          <span className="hidden sm:inline">列</span>
          {hiddenCount > 0 && <span className="text-xs">（隐藏 {hiddenCount}）</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        <div className="px-2 pb-1 pt-1.5 text-xs text-muted-foreground">显示的列</div>
        {hideable.map((c) => {
          const id = String(c.key)
          const checked = visibility[id] !== false
          return (
            <label
              key={id}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-primary"
                checked={checked}
                onChange={(e) => update({ ...visibility, [id]: e.target.checked })}
              />
              {c.title}
            </label>
          )
        })}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => update(defaults)}
            className="mt-1 w-full rounded-sm border-t px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent"
          >
            恢复默认
          </button>
        )}
      </PopoverContent>
    </Popover>
  )

  return { columnVisibility: visibility, columnSettings }
}
