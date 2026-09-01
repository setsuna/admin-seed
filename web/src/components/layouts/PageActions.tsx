import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * 把页面级操作按钮送到顶栏面包屑那一行。
 *
 * 背景：各页原本有一个「大标题 + 副标题」的头部块（约 80px 高），
 * 标题内容与顶栏面包屑完全重复，只是顺带充当了操作按钮的容器。
 * 删掉那一块后，按钮通过本组件 Portal 到顶栏，既省下整块垂直空间，
 * 又让「当前在哪个页面」和「这个页面能做什么」并排出现。
 *
 * 用法（放在页面组件任意位置，不影响布局）：
 * ```tsx
 * <PageActions>
 *   <Button onClick={...}>新增角色</Button>
 * </PageActions>
 * ```
 *
 * 注意：同一时刻只应有一个页面渲染 PageActions；路由切换时旧的会自动卸载。
 */
export function PageActions({ children }: { children: React.ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // 顶栏挂载于 MainLayout，页面首渲染时容器已存在；
    // 用 state 而非直接查询，确保 SSR / 首帧不为空时能触发重渲染。
    setHost(document.getElementById('page-actions'))
  }, [])

  if (!host) return null
  return createPortal(<div className="flex items-center gap-2">{children}</div>, host)
}
