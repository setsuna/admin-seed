import React from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Select } from './Select'

export interface FormModalProps {
  isOpen?: boolean
  open?: boolean
  onClose?: () => void
  onOpenChange?: (open: boolean) => void
  title: string
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
    // 双列模式下，字段默认占半行；标记 colSpan=2 的占整行（如长输入、textarea）
    const spanClass = columns === 2 && colSpan === 2 ? 'sm:col-span-2' : ''
    const inputClass = 'w-full h-10 px-3 bg-background border border-input rounded-md text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-ring/60 focus:border-ring transition-colors'
    
    switch (type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <div key={name} className={`space-y-1.5 ${spanClass}`}>
            <label className="text-sm font-medium text-text-secondary">
              {label} {required && <span className="text-error">*</span>}
            </label>
            <input
              type={type}
              value={formData[name] || ''}
              onChange={(e) => handleFieldChange(name, type === 'number' ? Number(e.target.value) : e.target.value)}
              placeholder={placeholder}
              required={required}
              className={inputClass}
            />
          </div>
        )
      case 'textarea':
        return (
          <div key={name} className={`space-y-1.5 ${columns === 2 ? 'sm:col-span-2' : ''}`}>
            <label className="text-sm font-medium text-text-secondary">
              {label} {required && <span className="text-error">*</span>}
            </label>
            <textarea
              value={formData[name] || ''}
              onChange={(e) => handleFieldChange(name, e.target.value)}
              placeholder={placeholder}
              required={required}
              rows={3}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-ring/60 focus:border-ring transition-colors resize-none"
            />
          </div>
        )
      case 'select':
        return (
          <div key={name} className={`space-y-1.5 ${spanClass}`}>
            <label className="text-sm font-medium text-text-secondary">
              {label} {required && <span className="text-error">*</span>}
            </label>
            <Select
              options={(options || []).map((o: any) => ({ value: o.value, label: o.label, disabled: o.disabled }))}
              value={formData[name] ?? ''}
              onValueChange={(v) => handleFieldChange(name, v)}
              placeholder={placeholder}
              className="w-full"
            />
          </div>
        )
      default:
        return null
    }
  }

  const defaultFooter = (
    <div className="flex gap-2 justify-end pt-4 mt-4 border-t border-border">
      <Button 
        type="button" 
        variant="outline" 
        onClick={actualOnClose}
        disabled={actualIsLoading}
      >
        {cancelText}
      </Button>
      {submitAndContinueText && onSubmitAndContinue && (
        <Button
          type="button"
          variant="outline"
          onClick={handleSubmitAndContinue}
          loading={actualIsLoading}
          disabled={disabled}
        >
          {submitAndContinueText}
        </Button>
      )}
      <Button 
        type="submit" 
        loading={actualIsLoading}
        disabled={disabled}
      >
        {submitText}
      </Button>
    </div>
  )

  const gridClass = columns === 2
    ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4'
    : 'space-y-4'

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
      {/* 内容区可滚动，footer 固定在底部（字段多时无需滚动到底才能提交） */}
      <form onSubmit={handleSubmit} className="flex max-h-[75vh] flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          <div className={gridClass}>
            {fields ? fields.map(renderField) : children}
          </div>
        </div>
        {showFooter && (
          <div className="shrink-0 bg-background px-6 pb-6">
            {footerContent || defaultFooter}
          </div>
        )}
      </form>
    </Modal>
  )
}

export default FormModal
