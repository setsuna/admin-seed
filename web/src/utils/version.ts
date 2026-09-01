/**
 * 应用版本信息 —— 单一真相来源。
 *
 * 版本号来自 .env.* 的 VITE_APP_VERSION（如 1.2.10）。
 * 注意：.env.development 与 .env.production 需保持同步，
 * 否则开发环境与线上显示的版本会不一致。
 */

/** 完整版本号，如 "1.2.10"；未配置时回落 "0.0.0" */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.0.0'

/** 带前缀的完整版本，如 "v1.2.10" */
export const APP_VERSION_FULL = `v${APP_VERSION}`

/**
 * 大版本号（主版本），如 "V1"。
 * 用于产品名后缀与菜单顶部标识，弱化小版本变动带来的视觉噪音。
 */
export const APP_MAJOR_VERSION = `V${APP_VERSION.split('.')[0] || '0'}`

/** 产品名（不含版本） */
export const APP_TITLE = import.meta.env.VITE_APP_TITLE ?? '管理系统'

/** 产品名 + 大版本，如 "管理后台 V1" */
export const APP_TITLE_WITH_VERSION = `${APP_TITLE} ${APP_MAJOR_VERSION}`

/** 公司名 */
export const COMPANY_NAME = import.meta.env.VITE_COMPANY_NAME ?? ''
