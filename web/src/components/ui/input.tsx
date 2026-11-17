import * as React from "react"
import { cn } from "@/lib/utils"

// 项目扩展（重新 `shadcn add input --overwrite` 后要补回）：
//   error  校验错误文案：输入框标红（aria-invalid）并在下方显示文字
function Input({
  className,
  type,
  error,
  ...props
}: React.ComponentProps<"input"> & { error?: string }) {
  const input = (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      aria-invalid={error ? true : props["aria-invalid"]}
      {...props}
    />
  )
  if (!error) return input
  return (
    <>
      {input}
      <p className="mt-1 text-sm text-destructive">{error}</p>
    </>
  )
}

export { Input }
