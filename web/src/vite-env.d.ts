/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  /** 产品名（登录页品牌区主标识），未配置时回落 VITE_APP_TITLE */
  readonly VITE_APP_NAME?: string
  readonly VITE_COMPANY_NAME?: string
  readonly VITE_APP_VERSION?: string
  /** 默认界面密度：comfortable（舒展卡片风，默认）/ compact（紧凑数据风） */
  readonly VITE_UI_DENSITY?: 'comfortable' | 'compact'
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
