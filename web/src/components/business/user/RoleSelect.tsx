/**
 * 角色选择组件
 * 统一的角色选择器，使用权限系统作为数据源
 */

import { Select } from '@/components/ui'
import { useRoleOptions } from '@/hooks/useRole'

interface RoleSelectProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  allowClear?: boolean
  size?: 'default' | 'sm' | 'lg'
}

export function RoleSelect({
  value,
  onChange,
  placeholder = '请选择角色',
  disabled = false,
  className,
  size = 'default'
}: RoleSelectProps) {
  const { roleOptions, isLoading } = useRoleOptions()

  return (
    <Select
      value={value}
      onValueChange={onChange}
      placeholder={isLoading ? '加载角色中...' : placeholder}
      disabled={disabled || isLoading}
      className={className}
      size={size}
      options={roleOptions}
    />
  )
}

// 多选角色组件
interface RoleMultiSelectProps {
  value?: string[]
  onChange?: (values: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  maxCount?: number
}

export function RoleMultiSelect({
  value = [],
  onChange,
  placeholder = '请选择角色',
  disabled = false,
  className,
  maxCount
}: RoleMultiSelectProps) {
  const { roleOptions, isLoading } = useRoleOptions()

  const handleChange = (selectedValue: string) => {
    if (!onChange) return

    const newValues = value.includes(selectedValue)
      ? value.filter(v => v !== selectedValue)
      : [...value, selectedValue]
    
    onChange(newValues)
  }

  const handleRemove = (valueToRemove: string) => {
    if (!onChange) return
    onChange(value.filter(v => v !== valueToRemove))
  }

  const handleClear = () => {
    if (!onChange) return
    onChange([])
  }

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        加载角色选项中...
      </div>
    )
  }

  return (
    <div className={className}>
      {/* 已选择的角色标签 */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {value.map(selectedValue => {
            const option = roleOptions.find((opt: { value: string; label: string }) => opt.value === selectedValue)
            return (
              <span
                key={selectedValue}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md"
              >
                {option?.label || selectedValue}
                <button
                  type="button"
                  onClick={() => handleRemove(selectedValue)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                  disabled={disabled}
                >
                  ×
                </button>
              </span>
            )
          })}
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-gray-500 hover:text-gray-700 px-1"
            disabled={disabled}
          >
            清空
          </button>
        </div>
      )}

      {/* 角色选择下拉框 */}
      <select
        disabled={disabled || Boolean(maxCount && value.length >= maxCount)}
        onChange={(e) => {
          if (e.target.value) {
            handleChange(e.target.value)
            e.target.value = '' // 重置选择
          }
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
      >
        <option value="">
          {maxCount && value.length >= maxCount 
            ? `最多选择 ${maxCount} 个角色` 
            : placeholder
          }
        </option>
        {roleOptions
          .filter((option: { value: string; label: string }) => !value.includes(option.value))
          .map((option: { value: string; label: string }) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        }
      </select>
    </div>
  )
}

// 角色显示组件（只读）
interface RoleDisplayProps {
  roleCode: string
  showCode?: boolean
  className?: string
}

export function RoleDisplay({ 
  roleCode, 
  showCode = false, 
  className 
}: RoleDisplayProps) {
  const { roleOptions } = useRoleOptions()
  
  const role = roleOptions.find((option: { value: string; label: string }) => option.value === roleCode)
  const displayName = role?.label || roleCode

  return (
    <span className={className}>
      {displayName}
      {showCode && role && (
        <span className="text-xs text-muted-foreground ml-1">
          ({roleCode})
        </span>
      )}
    </span>
  )
}

// 角色批量显示组件
interface RoleListDisplayProps {
  roleCodes: string[]
  showCode?: boolean
  separator?: string
  className?: string
}

export function RoleListDisplay({ 
  roleCodes, 
  showCode = false, 
  separator = ', ',
  className 
}: RoleListDisplayProps) {
  if (!roleCodes || roleCodes.length === 0) {
    return <span className={className}>无角色</span>
  }

  return (
    <span className={className}>
      {roleCodes.map((roleCode, index) => (
        <span key={roleCode}>
          <RoleDisplay roleCode={roleCode} showCode={showCode} />
          {index < roleCodes.length - 1 && separator}
        </span>
      ))}
    </span>
  )
}
