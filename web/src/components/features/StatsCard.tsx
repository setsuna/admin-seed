import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/utils'

export interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className
}: StatsCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              {trend && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend.isPositive ? 'text-success' : 'text-error'
                  )}
                >
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {Icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export interface StatsGridProps {
  stats: StatsCardProps[]
  columns?: number
  className?: string
}

export function StatsGrid({ stats, columns = 4, className }: StatsGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        {
          'grid-cols-1': columns === 1,
          'grid-cols-1 md:grid-cols-2': columns === 2,
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3': columns === 3,
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-4': columns === 4,
        },
        className
      )}
    >
      {stats.map((stat, index) => (
        <StatsCard key={index} {...stat} />
      ))}
    </div>
  )
}
