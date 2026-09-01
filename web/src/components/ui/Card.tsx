import React from 'react'
import { cn } from '@/utils'
import { cva, type VariantProps } from 'class-variance-authority'

// Card 动画变体
const cardVariants = cva(
  'rounded-xl border bg-card text-card-foreground shadow',
  {
    variants: {
      // 悬停动画效果
      hover: {
        none: '',
        lift: 'transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
        glow: 'transition-all duration-300 hover:shadow-lg hover:shadow-primary/20',
        scale: 'transition-all duration-300 hover:scale-[1.02]',
        border: 'transition-all duration-300 hover:border-primary',
      },
      // 进入动画效果
      animate: {
        none: '',
        fadeIn: 'animate-in fade-in duration-500',
        slideUp: 'animate-in slide-in-from-bottom-4 fade-in duration-500',
        scaleIn: 'animate-in zoom-in-95 fade-in duration-500',
      },
      // 交互状态
      interactive: {
        false: '',
        true: 'cursor-pointer transition-all duration-200 active:scale-[0.98]',
      },
    },
    defaultVariants: {
      hover: 'none',
      animate: 'none',
      interactive: false,
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover, animate, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ hover, animate, interactive }), className)}
      {...props}
    />
  )
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'font-semibold leading-none tracking-tight',
        className
      )}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
