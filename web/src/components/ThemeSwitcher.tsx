import { Monitor, Moon, Sun, Check, Palette, StretchHorizontal, AlignJustify } from 'lucide-react'
import { useTheme, BRAND_PALETTES } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils'
import type { ThemeMode, UIDensity } from '@/types'

/**
 * 主题切换器 —— 三个正交维度。
 *
 *   外观：明暗模式（浅色 / 深色 / 跟随系统）
 *   密度：舒展卡片风 / 紧凑数据风
 *   主题色：品牌色（10 套色板，对齐平板端 SealMeet）
 *
 * 中性色全局固定，换肤只改品牌色，因此任意组合都保持协调。
 */

const modeOptions: ReadonlyArray<{
  value: ThemeMode
  label: string
  icon: typeof Sun
}> = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
]

const densityOptions: ReadonlyArray<{
  value: UIDensity
  label: string
  icon: typeof Sun
}> = [
  { value: 'comfortable', label: '舒展', icon: StretchHorizontal },
  { value: 'compact', label: '紧凑', icon: AlignJustify },
]

interface ThemeSwitcherProps {
  className?: string
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { theme, setTheme, brand, setBrand, density, setDensity } = useTheme()

  const currentMode = modeOptions.find((o) => o.value === theme) ?? modeOptions[2]
  const currentBrand = BRAND_PALETTES.find((b) => b.id === brand) ?? BRAND_PALETTES[0]
  const CurrentIcon = currentMode.icon

  return (
    <div className="relative group">
      <Button
        variant="ghost"
        size="icon"
        className={className}
        title={`${currentMode.label} · ${currentBrand.name}`}
      >
        <CurrentIcon className="h-4 w-4" />
      </Button>

      {/* 主题面板：hover 展开 */}
      <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border bg-popover p-3 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {/* ---------- 明暗模式 ---------- */}
        <div className="mb-1 px-1 text-xs font-medium text-muted-foreground">
          外观
        </div>
        <div className="mb-4 grid grid-cols-3 gap-1">
          {modeOptions.map((option) => {
            const Icon = option.icon
            const isActive = theme === option.value

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-md px-2 py-2.5 text-xs transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{option.label}</span>
              </button>
            )
          })}
        </div>

        {/* ---------- 界面密度 ---------- */}
        <div className="mb-1 px-1 text-xs font-medium text-muted-foreground">
          密度
        </div>
        <div className="mb-4 grid grid-cols-2 gap-1">
          {densityOptions.map((option) => {
            const Icon = option.icon
            const isActive = density === option.value

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setDensity(option.value)}
                aria-pressed={isActive}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{option.label}</span>
              </button>
            )
          })}
        </div>

        {/* ---------- 品牌色 ---------- */}
        <div className="mb-2 flex items-center gap-1.5 px-1">
          <Palette className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">主题色</span>
          <span className="ml-auto text-xs text-muted-foreground/70">
            {currentBrand.name}
          </span>
        </div>

        <div className="grid grid-cols-6 gap-2">
          {BRAND_PALETTES.map((palette) => {
            const isActive = brand === palette.id

            return (
              <button
                key={palette.id}
                type="button"
                onClick={() => setBrand(palette.id)}
                title={palette.name}
                aria-label={palette.name}
                aria-pressed={isActive}
                className={cn(
                  'relative flex h-9 w-9 items-center justify-center rounded-md transition-transform',
                  'hover:scale-105 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                  isActive && 'ring-2 ring-offset-2 ring-offset-popover ring-foreground/30'
                )}
                style={{ backgroundColor: palette.swatch }}
              >
                {isActive && (
                  <Check className="h-4 w-4 text-white drop-shadow-xs" strokeWidth={3} />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
