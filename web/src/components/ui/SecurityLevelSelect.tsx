import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { ChevronDown } from 'lucide-react'
import type { SecurityLevelOption } from '@/hooks/useSecurityLevels'

interface SecurityLevelSelectProps {
  value: string
  onChange: (value: string) => void
  options: SecurityLevelOption[]
  disabled?: boolean
}

export interface SecurityLevelSelectRef {
  focus: () => void
  openDropdown: () => void
}

const SecurityLevelSelect = forwardRef<SecurityLevelSelectRef, SecurityLevelSelectProps>(
  ({ value, onChange, options, disabled = false }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const selectedOption = options.find(opt => opt.value === value)

    useImperativeHandle(ref, () => ({
      focus: () => {
        buttonRef.current?.focus()
      },
      openDropdown: () => {
        setIsOpen(true)
      }
    }))

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isOpen])

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return

      switch (e.key) {
        case 'Tab':
          if (!isOpen) {
            e.preventDefault()
            setIsOpen(true)
          } else {
            setIsOpen(false)
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          break
        case 'ArrowDown':
          e.preventDefault()
          if (!isOpen) {
            setIsOpen(true)
          } else {
            setHighlightedIndex(prev => (prev + 1) % options.length)
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          if (isOpen) {
            setHighlightedIndex(prev => (prev - 1 + options.length) % options.length)
          }
          break
        case 'Enter':
          e.preventDefault()
          if (isOpen) {
            onChange(options[highlightedIndex].value)
            setIsOpen(false)
          } else {
            setIsOpen(true)
          }
          break
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          if (isOpen) {
            e.preventDefault()
            const index = parseInt(e.key) - 1
            if (index < options.length) {
              onChange(options[index].value)
              setIsOpen(false)
            }
          }
          break
      }
    }

    const handleSelect = (optionValue: string) => {
      onChange(optionValue)
      setIsOpen(false)
    }

    return (
      <div ref={containerRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`
            w-full px-3 py-2 text-left bg-background border rounded-md
            flex items-center justify-between
            ${disabled ? 'bg-muted cursor-not-allowed' : 'hover:border-input cursor-pointer'}
            ${isOpen ? 'border-primary ring-2 ring-primary/20' : 'border-border'}
          `}
        >
          <span className={selectedOption ? 'text-text-primary' : 'text-text-tertiary'}>
            {selectedOption ? selectedOption.name : '请选择密级'}
          </span>
          <ChevronDown className={`h-4 w-4 text-text-tertiary transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`
                  w-full px-3 py-2 text-left flex items-center justify-between
                  ${highlightedIndex === index ? 'bg-primary/10 text-primary' : 'text-text-primary'}
                  ${value === option.value ? 'bg-primary/20 text-primary font-medium' : ''}
                  hover:bg-primary/10 hover:text-primary
                `}
              >
                <span>{option.name}</span>
                <span className="text-xs text-text-tertiary ml-2">{index + 1}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }
)

SecurityLevelSelect.displayName = 'SecurityLevelSelect'

export default SecurityLevelSelect
