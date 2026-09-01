import React from 'react'

/**
 * 品牌标记（中性占位）
 *
 * 种子项目不带任何公司标识，这里用一个内联 SVG：圆角方块 + 三条递减横线。
 * 换成自己的品牌时，只需替换下方 <Mark> 的 SVG 内容，尺寸与调用方无需改动。
 *
 * 用 currentColor 上色，因此深浅背景都能自适应：
 * - variant="color" 取主题色（浅色背景）
 * - variant="white" 取白色（深色 / 品牌色背景）
 */
export type LogoVariant = 'color' | 'white'

interface LogoProps {
  className?: string
  /** 是否在图标右侧显示产品名文字 */
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: LogoVariant
  /** 覆盖产品名，默认取 VITE_APP_TITLE */
  text?: string
}

const SIZE_PX: Record<NonNullable<LogoProps['size']>, number> = {
  sm: 24,
  md: 32,
  lg: 48,
}

const TEXT_CLASS: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
}

/** 纯图形部分，可单独使用（如侧边栏收起时只剩 32px 宽） */
export const Mark: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    role="img"
    aria-label="Logo"
    className={className}
  >
    <rect width="32" height="32" rx="8" fill="currentColor" />
    <rect x="9" y="10" width="14" height="2.6" rx="1.3" fill="#fff" />
    <rect x="9" y="15" width="10" height="2.6" rx="1.3" fill="#fff" opacity=".8" />
    <rect x="9" y="20" width="6" height="2.6" rx="1.3" fill="#fff" opacity=".6" />
  </svg>
)

export const Logo: React.FC<LogoProps> = ({
  className = '',
  showText = true,
  size = 'md',
  variant = 'color',
  text,
}) => {
  const appName = text ?? import.meta.env.VITE_APP_TITLE ?? '管理后台'
  const markColor = variant === 'white' ? 'text-white' : 'text-primary'

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Mark size={SIZE_PX[size]} className={`${markColor} shrink-0`} />
      {showText && (
        <span className={`font-semibold tracking-wide ${TEXT_CLASS[size]}`}>{appName}</span>
      )}
    </div>
  )
}

export default Logo
