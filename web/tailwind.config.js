import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* ========== 基础配色（shadcn/ui 兼容，保持向后兼容）========== */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        /* ========== 主品牌色（支持状态变体）========== */
        /* 使用方式：
         * - bg-primary           默认态
         * - bg-primary-hover     悬停态（或使用 hover:bg-primary-hover）
         * - bg-primary-active    点击态（或使用 active:bg-primary-active）
         * - bg-primary-disabled  禁用态
         */
        primary: {
          DEFAULT: "hsl(var(--primary))",          /* 保持向后兼容 */
          foreground: "hsl(var(--primary-foreground))",
          default: "hsl(var(--primary-default))",  /* 新增：默认态 */
          hover: "hsl(var(--primary-hover))",      /* 新增：悬停态 */
          active: "hsl(var(--primary-active))",    /* 新增：点击态 */
          disabled: "hsl(var(--primary-disabled))", /* 新增：禁用态 */
        },
        
        /* ========== 辅助品牌色（支持状态变体）========== */
        secondary: {
          DEFAULT: "hsl(var(--secondary))",        /* 保持向后兼容 */
          foreground: "hsl(var(--secondary-foreground))",
          default: "hsl(var(--secondary-default))",
          hover: "hsl(var(--secondary-hover))",
          active: "hsl(var(--secondary-active))",
          disabled: "hsl(var(--secondary-disabled))",
        },
        
        /* ========== 其他基础配色 ========== */
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        
        /* ========== 品牌色原始 token（换肤只换这 4 个）========== */
        /* 一般直接用 primary/tint；需要渐变、阴影时才用 brand-* */
        brand: {
          DEFAULT: "hsl(var(--brand))",
          dark: "hsl(var(--brand-dark))",
        },
        tint: "hsl(var(--tint))",       /* 浅色实色底（选中态/高亮底） */
        glow: "hsl(var(--glow))",       /* 阴影/涟漪，用时叠 alpha */

        /* ========== 金色点缀（全局固定，不随主题）========== */
        "gov-gold": "hsl(var(--gov-gold))",
        
        /* ========== 背景色系统（多层级）========== */
        /* 使用方式：
         * - bg-bg-page        页面最外层背景
         * - bg-bg-container   容器背景（比页面深一点）
         * - bg-bg-card        卡片背景（最亮/最白）
         * - bg-bg-elevated    悬浮层背景（Dialog、Popover、Tooltip）
         */
        bg: {
          page: "hsl(var(--bg-page))",
          container: "hsl(var(--bg-container))",
          card: "hsl(var(--bg-card))",
          elevated: "hsl(var(--bg-elevated))",
          input: "hsl(var(--input-bg))",  /* 输入框底色 #FAF8F5 */
        },
        
        /* ========== 文字颜色系统（多层级）========== */
        /* 使用方式：
         * - text-text-primary     一级标题、重要内容
         * - text-text-secondary   二级标题、次要内容
         * - text-text-regular     正文、常规内容
         * - text-text-tertiary    辅助文字、说明文本
         * - text-text-inverse     反色文字（深色背景上的白字）
         */
        text: {
          primary: "hsl(var(--text-primary))",
          secondary: "hsl(var(--text-secondary))",
          regular: "hsl(var(--text-regular))",
          tertiary: "hsl(var(--text-tertiary))",
          inverse: "hsl(var(--text-inverse))",
        },
        
        /* ========== 功能语义色（固定不变）========== */
        /* 这些颜色不随主题变化，符合用户认知习惯 */
        success: "hsl(var(--success))",  /* #52c41a 成功-绿色 */
        warning: "hsl(var(--warning))",  /* #faad14 警告-黄色 */
        info: "hsl(var(--info))",        /* #1B8CF6 信息-蓝色 */
        error: "hsl(var(--error))",      /* #FF2600 错误-红色 */
        
        /* ========== 人员类型配色系统========== */
        /* 用于区分内部人员和临时人员 */
        'participant-internal': {
          DEFAULT: '0 0% 25%',       // #404040 内部人员-深灰
          light: '0 0% 96%',         // #F5F5F5 背景色
          border: '0 0% 35%',        // #595959 边框色
          text: '0 0% 15%',          // #262626 文字色
          hover: '0 0% 30%',         // 悬停态
        },
        'participant-temporary': {
          DEFAULT: '0 0% 65%',       // #A6A6A6 临时人员-浅灰
          light: '0 0% 98%',         // #FAFAFA 背景色
          border: '0 0% 75%',        // #BFBFBF 边框色
          text: '0 0% 52%',          // #848484 文字色
          hover: '0 0% 60%',         // 悬停态
        },
        
        /* ========== Sidebar 相关颜色 ========== */
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      
      /* ========== 圆角系统 ========== */
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      
      /* ========== 动画关键帧 ========== */
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "collapsible-down": {
          from: { height: "0" },
          to: { height: "var(--radix-collapsible-content-height)" },
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)" },
          to: { height: "0" },
        },
        /* 登录页：入场动画（淡入 + 上移 + 轻微缩放） */
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        /* 登录页：错误提示抖动 */
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-6px)" },
          "40%, 80%": { transform: "translateX(6px)" },
        },
        /* 登录页：背景光斑缓慢漂浮 */
        "float-slow": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(28px, -20px)" },
        },
        "float-slower": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(-24px, 18px)" },
        },
        /* 登录页：装饰圆环呼吸 */
        "breathe": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.55" },
          "50%": { transform: "scale(1.05)", opacity: "0.9" },
        },
      },
      
      /* ========== 动画定义 ========== */
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "collapsible-down": "collapsible-down 0.2s ease-out",
        "collapsible-up": "collapsible-up 0.2s ease-out",
        /* 登录页动画 */
        "fade-up": "fade-up 0.5s ease-out both",
        "shake": "shake 0.4s ease-in-out",
        "float-slow": "float-slow 18s ease-in-out infinite",
        "float-slower": "float-slower 26s ease-in-out infinite",
        "breathe": "breathe 10s ease-in-out infinite",
        "spin-slowest": "spin 80s linear infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
