/**
 * 密级视觉配置 —— 全局唯一数据源
 *
 * 背景：此前各页面硬编码密级配色（会议列表、用户管理、编辑会议各写一套），
 * 导致同一密级在不同页面颜色不一致，甚至出现「机密/秘密」高低色相反的错误。
 * 本模块统一「密级 → 名称 / 色相」映射，所有页面从此处取值。
 *
 * 色相语义（跟随主题语义色 token，密级越高越醒目）：
 *   internal     内部  → success（绿）
 *   confidential 秘密  → warning（本主题为砖红橙 #C2410C，非黄色）
 *   secret       机密  → error（红 #C0291F）
 *
 * 注意：soft 变体也走语义色（bg-*\/15），不得写死 Tailwind 固定色阶
 * （如 bg-yellow-100），否则不跟随主题、与编辑页/文件密级对不上。
 *
 * 提供三种呈现变体，语义一致、视觉分场景：
 *   - dot ：圆点纯色（列表内联标识）
 *   - solid：实底白字（强调按钮 / 徽章）
 *   - soft ：浅底深字（列表胶囊标签，视觉更轻）
 */

export type SecurityLevelKey = 'internal' | 'confidential' | 'secret'

interface SecurityLevelVisual {
  /** 中文显示名 */
  label: string
  /** 圆点纯色底 */
  dot: string
  /** 实底白字（按钮/徽章） */
  solid: string
  /** 浅底深字（轻量胶囊标签） */
  soft: string
}

const SECURITY_LEVEL_MAP: Record<SecurityLevelKey, SecurityLevelVisual> = {
  internal: {
    label: '内部',
    dot: 'bg-success',
    solid: 'bg-success text-text-inverse',
    soft: 'bg-success/15 text-success',
  },
  confidential: {
    label: '秘密',
    dot: 'bg-warning',
    solid: 'bg-warning text-text-inverse',
    soft: 'bg-warning/15 text-warning',
  },
  secret: {
    label: '机密',
    dot: 'bg-error',
    solid: 'bg-error text-text-inverse',
    soft: 'bg-error/15 text-error',
  },
}

/** 未知/越界密级的兜底样式 */
const FALLBACK: SecurityLevelVisual = {
  label: '未知',
  dot: 'bg-text-tertiary',
  solid: 'bg-text-tertiary text-text-inverse',
  soft: 'bg-text-tertiary/15 text-text-tertiary',
}

/** 取某密级的完整视觉配置（含中文名与三种色变体） */
export function getSecurityLevelVisual(level?: string | null): SecurityLevelVisual {
  return (level && SECURITY_LEVEL_MAP[level as SecurityLevelKey]) || FALLBACK
}

/** 密级中文名 */
export function getSecurityLevelLabel(level?: string | null): string {
  return getSecurityLevelVisual(level).label
}

/** 圆点纯色底（列表内联标识） */
export function getSecurityDotClass(level?: string | null): string {
  return getSecurityLevelVisual(level).dot
}

/** 实底白字（按钮/徽章） */
export function getSecuritySolidClass(level?: string | null): string {
  return getSecurityLevelVisual(level).solid
}

/** 浅底深字（轻量胶囊标签） */
export function getSecuritySoftClass(level?: string | null): string {
  return getSecurityLevelVisual(level).soft
}
