import { cn } from '@/utils'
export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeConfig = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
}

export function Loading({ size = 'md', className }: LoadingProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <svg
        className={cn('animate-spin text-primary', sizeConfig[size])}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  )
}

export function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loading size="lg" />
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    </div>
  )
}
