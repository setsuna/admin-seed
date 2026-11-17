import { useEffect } from 'react'
import { useUI } from '@/store'
import type { BrandTheme, ThemeMode, UIDensity } from '@/types'

/**
 * 主题管理 Hook —— 三个正交维度。
 *
 *   明暗模式 mode    → <html class="dark">
 *   品牌色   brand   → <html data-brand="pomegranate">
 *   界面密度 density → <html data-density="compact">
 *
 * 两者必须挂在同一元素（html）上，因为 CSS 里 --primary: var(--brand)
 * 需要在同一作用域解析 --brand。
 *
 * 中性色 / 语义色全局固定，换肤只影响品牌色的 4 个变量，
 * 因此任意品牌色 × 2 种明暗都能保持协调。
 */

/** 品牌色元信息，用于设置面板展示 */
export const BRAND_PALETTES: ReadonlyArray<{
  id: BrandTheme
  name: string
  /** 色板预览用的实际色值（与 CSS 中的 --brand 对应） */
  swatch: string
}> = [
  { id: 'neutral', name: '默认', swatch: '#171717' },
  { id: 'pomegranate', name: '石榴红', swatch: '#8C1D22' },
  { id: 'vivid-orange', name: '活力橙', swatch: '#F2630C' },
  { id: 'tech-teal', name: '科技青', swatch: '#0E9488' },
  { id: 'tech-blue', name: '科技蓝', swatch: '#1677FF' },
  { id: 'indigo', name: '靛蓝', swatch: '#4F46E5' },
] as const

export const DEFAULT_BRAND: BrandTheme = 'neutral'

/** 解析 system → 实际的 light / dark */
function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyMode(mode: ThemeMode) {
  const root = window.document.documentElement
  root.classList.toggle('dark', resolveMode(mode) === 'dark')
}

function applyBrand(brand: BrandTheme) {
  window.document.documentElement.setAttribute('data-brand', brand)
}

function applyDensity(density: UIDensity) {
  window.document.documentElement.setAttribute('data-density', density)
}

export function useTheme() {
  const { theme, setTheme, brand, setBrand, density, setDensity } = useUI()

  // 应用明暗模式
  useEffect(() => {
    applyMode(theme)
  }, [theme])

  // 应用品牌色
  useEffect(() => {
    applyBrand(brand)
  }, [brand])

  // 应用界面密度
  useEffect(() => {
    applyDensity(density)
  }, [density])

  // 跟随系统时监听系统偏好变化
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => applyMode('system')

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  return { theme, setTheme, brand, setBrand, density, setDensity }
}
