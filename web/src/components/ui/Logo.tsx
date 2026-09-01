import React from 'react'

import logoHorizontal from '@/assets/logo/logo-horizontal.png'
import logoHorizontalWhite from '@/assets/logo/logo-horizontal-white.png'
import logoVertical from '@/assets/logo/logo-vertical.png'

/**
 * Logo 变体：
 * - color    横版彩色（浅色背景，如白卡片、页面背景）
 * - white    横版白色（深色 / 品牌色背景，如 split 布局左侧品牌区、深色侧边栏）
 * - vertical 竖版彩色（方形，适合正方形容器 / 大尺寸展示）
 *
 * 注意：资源为 PNG（来自平板端 SealMeet），无法通过 fill-current 换色，
 * 因此深色背景必须显式指定 variant="white"。
 */
export type LogoVariant = 'color' | 'white' | 'vertical'

interface LogoProps {
  className?: string
  /** 是否在图标右侧显示产品名文字 */
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: LogoVariant
  /** 覆盖产品名，默认取 VITE_APP_TITLE */
  text?: string
}

const LOGO_SRC: Record<LogoVariant, string> = {
  color: logoHorizontal,
  white: logoHorizontalWhite,
  vertical: logoVertical,
}

/** 横版 logo 原始宽高比约 1200:500，竖版约 1:1 */
const ASPECT_RATIO: Record<LogoVariant, number> = {
  color: 1200 / 500,
  white: 1200 / 500,
  vertical: 1,
}

/**
 * 尺寸指的是 logo 图片高度。
 * 横版 logo 宽高比约 2.4:1，同样高度下视觉体量比方形图标小，
 * 故此处取值比一般图标偏大。
 */
const SIZE_CONFIG = {
  sm: { height: 36, fontSize: 15 },
  md: { height: 48, fontSize: 19 },
  lg: { height: 68, fontSize: 24 },
} as const

export const Logo: React.FC<LogoProps> = ({
  className = '',
  showText = true,
  size = 'md',
  variant = 'color',
  text,
}) => {
  const appTitle = text ?? import.meta.env.VITE_APP_TITLE ?? '管理系统'
  const config = SIZE_CONFIG[size]
  const src = LOGO_SRC[variant]
  const width = Math.round(config.height * ASPECT_RATIO[variant])

  const image = (
    <img
      src={src}
      alt={appTitle}
      width={width}
      height={config.height}
      draggable={false}
      style={{ height: config.height, width: 'auto' }}
      className="select-none object-contain"
    />
  )

  if (!showText) {
    return <span className={`inline-flex items-center ${className}`}>{image}</span>
  }

  // 白版 logo 用于深色底，文字跟随 currentColor；彩色版用于浅色底，文字用主文本色
  const textColorClass = variant === 'white' ? 'text-current' : 'text-text-primary'
  // 分隔线高度跟随 logo 高度，避免小尺寸下显得过长
  const dividerHeight = Math.round(config.height * 0.55)

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {image}
      {/* 分隔竖线，弱化但保持两个标识的独立性 */}
      <span
        aria-hidden="true"
        style={{ height: dividerHeight }}
        className={variant === 'white' ? 'w-px bg-current opacity-30' : 'w-px bg-border'}
      />
      <span
        className={`font-semibold tracking-wide whitespace-nowrap ${textColorClass}`}
        style={{ fontSize: config.fontSize }}
      >
        {appTitle}
      </span>
    </div>
  )
}
