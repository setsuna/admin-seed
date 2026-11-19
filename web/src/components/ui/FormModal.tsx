import React from 'react'
import { Modal } from './Modal'
import { Button } from './button'
import { Input } from './input'
import { Textarea } from './textarea'
import { Label } from './label'
import { Select } from './option-select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from './sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/utils'

/**
 * 表单弹窗。字段样式照 shadcn 官方 dashboard 的编辑表单：
 * 标签 14/500 正文色，与输入框间距 12；字段间距 16；输入框 shadcn Input（高 36、圆角 8、细阴影）。
 *
 *   variant="dialog"（默认）居中弹窗，按钮在右下角。
 *   variant="sheet"  右侧抽屉（宽 384，手机上从底部出），按钮在底部满宽叠放——
 *                    照官方「点表格行 → 右侧抽屉编辑」，用于表格的新增 / 编辑。
 */
export interface FormModalProps {
  isOpen?: boolean
  open?: boolean
  onClose?: () => void
  onOpenChange?: (open: boolean) => void
  title: string
  /** 标题下的灰色说明（抽屉里显示） */
  description?: string
  variant?: 'dialog' | 'sheet'
  children?: React.ReactNode
  fields?: any[]
  initialData?: any
  size?: 'sm' | 'md' | 'lg' | 'xl'
  columns?: 1 | 2
  onSubmit?: (data: any) => void
  submitText?: string
  cancelText?: string
  submitAndContinueText?: string
  onSubmitAndContinue?: (data: any) => void
  isLoading?: boolean
  loading?: boolean
  disabled?: boolean
  showFooter?: boolean
  footerContent?: React.ReactNode
  className?: string
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  open,
  onClose,
  onOpenChange,
  title,
  description,
  variant = 'dialog',
  children,
  fields,
  initialData,
  size = 'md',
  columns = 1,
  onSubmit,
  submitText = '保存',
  cancelText = '取消',
  submitAndContinueText,
  onSubmitAndContinue,
  isLoading = false,
  loading = false,
  disabled = false,
  showFooter = true,
  footerContent,
  className
}) => {
  const [formData, setFormData] = React.useState(initialData || {})
  const isMobile = useIsMobile()
  const formId = React.useId()

  React.useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData])

  const actualIsOpen = isOpen ?? open ?? false
  const actualOnClose = onClose || ((onOpenChange) ? () => onOpenChange(false) : () => {})
  const actualIsLoading = isLoading || loading

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSubmit && !actualIsLoading && !disabled) {
      onSubmit(formData)
    }
  }

  // 「保存并继续」：提交但不关闭弹窗，由父组件负责重置表单
  const handleSubmitAndContinue = () => {
    if (onSubmitAndContinue && !actualIsLoading && !disabled) {
      onSubmitAndContinue(formData)
    }
  }

  const handleFieldChange = (name: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }))
  }

  const renderField = (field: any) => {
    const { name, label, type, required, placeholder, options, colSpan } = field
    const id = `${formId}-${name}`
    // 双列模式下，字段默认占半行；标记 colSpan=2 的占整行（如长输入、textarea）
    const span = columns === 2 && (colSpan === 2 || type === 'textarea') ? 'col-span-2' : ''

    let control: React.ReactNode = null
    switch (type) {
      case 'text':
      case 'email':
      case 'number':
        control = (
          <Input
            id={id}
            type={type}
            value={formData[name] ?? ''}
            onChange={(e) => handleFieldChange(name, type === 'number' ? Number(e.target.value) : e.target.value)}
            placeholder={placeholder}
            required={required}
          />
        )
        break
      case 'textarea':
        control = (
          <Textarea
            id={id}
            value={formData[name] || ''}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            placeholder={placeholder}
            required={required}
            rows={3}
            className="resize-none"
          />
        )
        break
      case 'select':
        control = (
          <Select
            options={(options || []).map((o: any) => ({ value: o.value, label: o.label, disabled: o.disabled }))}
            value={formData[name] ?? ''}
            onValueChange={(v) => handleFieldChange(name, v)}
            placeholder={placeholder}
            className="w-full"
          />
        )
        break
      default:
        return null
    }

    return (
      <div key={name} className={cn('flex flex-col gap-3', span)}>
        <Label htmlFor={id} required={required}>{label}</Label>
        {control}
      </div>
    )
  }

  const body = (
    <div className={columns === 2 ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-4'}>
      {fields ? fields.map(renderField) : children}
    </div>
  )

  const continueButton = submitAndContinueText && onSubmitAndContinue && (
    <Button type="button" variant="outline" onClick={handleSubmitAndContinue} loading={actualIsLoading} disabled={disabled}>
      {submitAndContinueText}
    </Button>
  )

  // ---------- 右侧抽屉（官方样式） ----------
  if (variant === 'sheet') {
    return (
      <Sheet open={actualIsOpen} onOpenChange={(v) => !v && !actualIsLoading && actualOnClose()}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className={cn('gap-0', isMobile && 'max-h-[90svh]', className)}
        >
          <SheetHeader className="gap-1">
            <SheetTitle>{title}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : <SheetDescription className="sr-only">{title}</SheetDescription>}
          </SheetHeader>
          <form id={formId} onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 text-sm">
            {body}
          </form>
          {showFooter && (
            footerContent || (
              <SheetFooter>
                <Button type="submit" form={formId} loading={actualIsLoading} disabled={disabled}>
                  {submitText}
                </Button>
                {continueButton}
                <Button type="button" variant="outline" onClick={actualOnClose} disabled={actualIsLoading}>
                  {cancelText}
                </Button>
              </SheetFooter>
            )
          )}
        </SheetContent>
      </Sheet>
    )
  }

  // ---------- 居中弹窗 ----------
  return (
    <Modal
      isOpen={actualIsOpen}
      onClose={actualOnClose}
      title={title}
      size={size}
      className={className}
      closeOnOverlay={!actualIsLoading}
      showCloseButton={!actualIsLoading}
    >
      {/* 内容区可滚动，按钮固定在底部（字段多时无需滚动到底才能提交） */}
      <form onSubmit={handleSubmit} className="flex max-h-[75vh] flex-col">
        <div className="flex-1 overflow-y-auto px-6 py-4">{body}</div>
        {showFooter && (
          <div className="shrink-0 px-6 pb-6">
            {footerContent || (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={actualOnClose} disabled={actualIsLoading}>
                  {cancelText}
                </Button>
                {continueButton}
                <Button type="submit" loading={actualIsLoading} disabled={disabled}>
                  {submitText}
                </Button>
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}

export default FormModal
