import React from 'react'
import { cn } from '@/utils'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`
    
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={checkboxId}
            ref={ref}
            className={cn(
              'w-4 h-4 rounded border border-input bg-background transition-colors',
              'checked:bg-primary checked:border-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-destructive',
              className
            )}
            {...props}
          />
          {label && (
            <label
              htmlFor={checkboxId}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {label}
            </label>
          )}
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export { Checkbox }
