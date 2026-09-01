import React from 'react'
import { cn } from '@/utils'
import {
  Select as RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './SelectNew'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectProps {
  options: SelectOption[]
  placeholder?: string
  size?: 'default' | 'sm' | 'lg'
  error?: boolean
  value?: string | number
  defaultValue?: string | number
  disabled?: boolean
  className?: string
  /** 触发器（收起态）额外类名 */
  triggerClassName?: string
  name?: string
  onValueChange?: (value: string) => void
}

/**
 * 通用下拉选择组件。
 *
 * 历史实现是原生 <select>（浏览器渲染，圆角/箭头/焦点/下拉面板都不受控，
 * 与全站输入框观感不一致）。现改为内部复用 Radix 版 SelectNew，对外 API
 * 保持不变（options / placeholder / value / onValueChange / error / size /
 * disabled），因此所有调用方无需改动即可获得统一样式。
 *
 * 注意与原生的差异：
 * - Radix 不是原生表单元素，原生 `required` 校验不再生效（本组件本就未依赖）。
 * - value 统一按字符串处理（原生 select 的 value 也是字符串），onValueChange 回传字符串。
 * - 不再支持通过 children 传 <option>；请使用 options 数组。
 */
const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      className,
      triggerClassName,
      options,
      placeholder,
      size = 'default',
      error,
      value,
      defaultValue,
      disabled,
      name,
      onValueChange,
    },
    _ref,
  ) => {
    // 尺寸 → 高度/内距/字号（对齐原实现的 default/sm/lg 三档）
    const sizeClass =
      size === 'sm'
        ? 'h-8 px-2 py-1 text-xs'
        : size === 'lg'
          ? 'h-12 px-4 py-3 text-base'
          : 'h-10 px-3 py-2 text-sm'

    // value / defaultValue 统一转字符串（Radix 只接受 string；原生 select 亦为字符串）
    const toStr = (v: string | number | undefined) =>
      v === undefined ? undefined : String(v)

    // Radix 不允许 value="" 的 Item（会报错），而很多筛选下拉用空字符串表示“全部”。
    // 用哨兵值内部代替空字符串，对外仍表现为 ""（传入/回调都做双向映射）。
    const EMPTY = '__EMPTY__'
    const encode = (v: string | undefined) =>
      v === undefined ? undefined : v === '' ? EMPTY : v
    const decode = (v: string) => (v === EMPTY ? '' : v)

    return (
      <RadixSelect
        value={encode(toStr(value))}
        defaultValue={encode(toStr(defaultValue))}
        onValueChange={(v) => onValueChange?.(decode(v))}
        disabled={disabled}
        name={name}
      >
        <SelectTrigger
          className={cn(
            sizeClass,
            error && 'border-destructive focus:ring-destructive',
            className,
            triggerClassName,
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={String(option.value)}
              value={encode(String(option.value)) as string}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </RadixSelect>
    )
  },
)

Select.displayName = 'Select'

export { Select }
