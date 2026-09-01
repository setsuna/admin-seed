import { useEffect } from 'react'
import { useUI } from '@/store'
import type { BrandTheme, ThemeMode } from '@/types'

/**
 * 主题管理 Hook —— 两个正交维度。
 *
 *   明暗模式 mode   → <html class="dark">
 *   品牌色   brand  → <html data-brand="pomegranate">
 *
 * 两者必须挂在同一元素（html）上，因为 CSS 里 --primary: var(--brand)
 * 需要在同一作用域解析 --brand。
 *
 * 中性色 / 语义色全局固定，换肤只影响品牌色的 4 个变量，
 * 因此 10 套品牌色 × 2 种明暗都能保持协调。
 */

/** 品牌色元信息，用于设置面板展示 */
export const BRAND_PALETTES: ReadonlyArray<{
  id: BrandTheme
  name: string
  /** 色板预览用的实际色值（与 CSS 中的 --brand 对应） */
  swatch: string
}> = [
  { id: 'pomegranate', name: '深石榴红', swatch: '#8C1D22' },
  { id: 'china-red', name: '中国红', swatch: '#C0181F' },
  { id: 'wine', name: '酒红', swatch: '#7A1E2B' },
  { id: 'cinnabar', name: '朱砂红', swatch: '#B5341B' },
  { id: 'tech-blue', name: '科技蓝', swatch: '#1677FF' },
  { id: 'indigo', name: '靛蓝', swatch: '#4F46E5' },
  { id: 'geek-purple', name: '极客紫', swatch: '#7C3AED' },
  { id: 'tech-teal', name: '科技青', swatch: '#0E9488' },
  { id: 'vivid-orange', name: '活力橙', swatch: '#F2630C' },
  { id: 'ink-black', name: '墨黑', swatch: '#1F2937' },
] as const

export const DEFAULT_BRAND: BrandTheme = 'pomegranate'

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

export function useTheme() {
  const { theme, setTheme, brand, setBrand } = useUI()

  // 应用明暗模式
  useEffect(() => {
    applyMode(theme)
  }, [theme])

  // 应用品牌色
  useEffect(() => {
    applyBrand(brand)
  }, [brand])

  // 跟随系统时监听系统偏好变化
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => applyMode('system')

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  return { theme, setTheme, brand, setBrand }
}
