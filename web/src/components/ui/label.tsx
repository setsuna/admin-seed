import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * 表单标签，样式同 shadcn Label（14/500、leading-none、正文色）。
 * 不引 Radix Label：原生 <label> 就够用（for/htmlFor 关联输入框）。
 * required 时在后面加红色 *（官方没有，中文后台习惯保留）。
 */
function Label({ className, required, children, ...props }: React.ComponentProps<'label'> & { required?: boolean }) {
  return (
    <label
      data-slot="label"
      className={cn(
        'flex items-center gap-1 text-sm leading-none font-medium text-foreground select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-error" aria-hidden>*</span>}
    </label>
  )
}

export { Label }
