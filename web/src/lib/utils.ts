/**
 * shadcn/ui 约定的工具入口（components.json → aliases.utils）。
 * 实现在 @/utils/common，这里只转出，保证 `npx shadcn add` 生成的组件不用改 import。
 */
export { cn } from '@/utils/common'
