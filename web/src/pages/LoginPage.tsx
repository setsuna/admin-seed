import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertTriangle, CloudOff, ShieldCheck, History, PanelLeft, Square, User, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Logo, Mark } from '@/components/ui/Logo'
import { useAuth } from '@/store'
import { auth } from '@/services/core/auth.service'
import { isDevelopment, ERROR_CODES } from '@/config'
import { useNotifications } from '@/hooks/useNotifications'
import { encryptPassword } from '@/utils/crypto'
import { ForceChangePasswordDialog } from '@/components/business/auth/ForceChangePasswordDialog'
import { policyService } from '@/services/policy'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { useUI } from '@/store'
import { APP_MAJOR_VERSION, APP_VERSION_FULL, COMPANY_NAME } from '@/utils/version'
import type { AlertItem } from '@/types'

// 🆕 登录页布局：split = 左右分栏（桌面端），centered = 居中卡片
type LoginLayout = 'split' | 'centered'

const LAYOUT_STORAGE_KEY = 'login-layout-preference'

// 🆕 产品名称：优先 VITE_APP_NAME，其次 VITE_APP_TITLE（Logo 组件内嵌文字读的是这个）
const APP_NAME =
  import.meta.env.VITE_APP_NAME || import.meta.env.VITE_APP_TITLE || '管理系统'

const getInitialLayout = (): LoginLayout => {
  try {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (saved === 'split' || saved === 'centered') {
      return saved
    }
  } catch {
    // localStorage 不可用时静默降级
  }
  return 'centered'
}

// 🆕 左侧品牌区特性点（文案可按需调整）
const BRAND_FEATURES = [
  {
    icon: CloudOff,
    title: '离线部署',
    desc: '数据不出内网，全程本地可控',
  },
  {
    icon: ShieldCheck,
    title: '多级密级管控',
    desc: '基于角色与密级的细粒度访问控制',
  },
  {
    icon: History,
    title: '审计留痕',
    desc: '关键操作全程记录，安全可追溯',
  },
]

/**
 * 🆕 金色分隔线 —— 对齐平板端 SealMeet 的 GoldDivider。
 * 用于字标 / 标题下方作点缀，是整套涉密视觉里辨识度最高的一笔。
 * 金色取自全局 --gov-gold（#C9A961），不随主题换色。
 */
const GoldDivider = ({ className = '', width = 'w-12' }: { className?: string; width?: string }) => (
  <div className={`h-[3px] rounded-sm bg-gov-gold ${width} ${className}`} />
)

const LoginPage = () => {
  const navigate = useNavigate()
  const { setUser, setPermissions } = useAuth()
  const { showSuccess } = useNotifications()
  const { brand, theme } = useUI()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // 🆕 布局偏好（持久化到 localStorage，下次登录记住选择）
  const [layout, setLayout] = useState<LoginLayout>(getInitialLayout)
  
  // 🆕 密码过期对话框状态
  const [passwordExpiredDialog, setPasswordExpiredDialog] = useState({
    open: false,
    userId: '',
    username: ''
  })
  
  // 🆕 告警弹窗状态
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean
    alerts: AlertItem[]
  }>({
    open: false,
    alerts: []
  })
  
  // 🆕 切换布局并持久化
  const toggleLayout = () => {
    const next: LoginLayout = layout === 'split' ? 'centered' : 'split'
    setLayout(next)
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, next)
    } catch {
      // localStorage 不可用时仅本次会话生效
    }
  }
  
  // 品牌区（bg-primary）在墨黑主题 + 深色模式下会变成浅灰，
  // 此时白版 logo 看不清，需改用彩色版。
  const isDarkMode =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  const brandAreaIsLight = brand === 'ink-black' && isDarkMode
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    // 清除登录错误
    if (errors.login) {
      setErrors(prev => ({ ...prev, login: '' }))
    }
  }
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.username.trim()) {
      newErrors.username = '请输入用户名'
    }
    
    if (!formData.password) {
      newErrors.password = '请输入密码'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    setErrors({}) // 清除之前的错误
    
    try {
      console.log('Login attempt:', { 
        username: formData.username
      })
      
      const result = await auth.login({
        username: formData.username,
        password: encryptPassword(formData.password)
      })
      
      console.log('Login success:', result)
      
      // 完整更新 store
      const userStr = localStorage.getItem('user')
      let displayName = result.user.name || result.user.username
      if (userStr) {
        const fullUser = JSON.parse(userStr)
        setUser(fullUser)
        setPermissions(fullUser.permissions || [])
        displayName = fullUser.name || fullUser.username
      } else {
        setUser(result.user as any)
        setPermissions([])
      }
      
      showSuccess('登录成功', `欢迎回来，${displayName}!`)
      
      // 🆕 登录成功后检查告警
      try {
        const alertRes = await policyService.checkAlerts()
        if (alertRes.hasAlert && alertRes.alerts.length > 0) {
          // 有告警，显示弹窗
          setAlertDialog({
            open: true,
            alerts: alertRes.alerts
          })
          return // 等待用户关闭弹窗后再跳转
        }
      } catch (e) {
        // 告警检查失败不影响登录流程
        console.warn('检查告警失败:', e)
      }
      
      navigate('/')
    } catch (error: any) {
      console.error('Login error:', error)
      
      const code = error?.code
      const data = error?.data?.data || error?.data || {}
      const message = error?.message
      
      // 🆕 根据错误码进行本地处理
      switch (code) {
        case ERROR_CODES.LOGIN_FAILED: {
          // 2006 登录失败（密码错误，有剩余次数）
          const remainingAttempts = data.remaining_attempts
          if (remainingAttempts !== undefined) {
            setErrors({ login: `用户名或密码错误，还剩 ${remainingAttempts} 次机会` })
          } else {
            setErrors({ login: message || '用户名或密码错误' })
          }
          break
        }
        
        case ERROR_CODES.USER_NOT_FOUND: {
          // 2007 用户不存在
          setErrors({ login: message || '用户不存在' })
          break
        }
        
        case ERROR_CODES.ACCOUNT_LOCKED: {
          // 2010 账户已锁定
          const remainingSeconds = data.remaining_seconds
          if (remainingSeconds !== undefined) {
            setErrors({ login: `账户已锁定，请 ${remainingSeconds} 秒后重试` })
          } else {
            setErrors({ login: message || '账户已锁定，请稍后重试' })
          }
          break
        }
        
        case ERROR_CODES.PASSWORD_EXPIRED: {
          // 2011 密码过期 - 打开修改密码对话框
          setPasswordExpiredDialog({
            open: true,
            userId: data.user_id || '',
            username: data.username || formData.username
          })
          break
        }
        
        case ERROR_CODES.VALIDATION_ERROR: {
          // 1004 表单验证错误
          const validationErrors = error?.errors
          if (validationErrors && Array.isArray(validationErrors)) {
            const formErrors: Record<string, string> = {}
            validationErrors.forEach((err: any) => {
              if (err.field) {
                formErrors[err.field] = err.message
              }
            })
            setErrors(formErrors)
          } else {
            setErrors({ login: message || '输入数据验证失败' })
          }
          break
        }
        
        default:
          // 其他错误（网络错误等）- 已在全局拦截器中处理，这里不重复显示
          break
      }
    } finally {
      setLoading(false)
    }
  }
  
  // 🆕 密码修改成功回调
  const handlePasswordChangeSuccess = () => {
    setPasswordExpiredDialog({ open: false, userId: '', username: '' })
    // 清空密码输入框，让用户用新密码重新登录
    setFormData(prev => ({ ...prev, password: '' }))
    setErrors({ login: '密码已更新，请使用新密码登录' })
  }
  
  // 🆕 关闭告警弹窗并跳转
  const handleAlertDialogClose = () => {
    setAlertDialog({ open: false, alerts: [] })
    navigate('/')
  }
  
  // 🆕 根据告警级别获取颜色
  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }
  
  // 获取测试账号提示
  const getTestAccountHints = () => {
    if (!isDevelopment()) {
      return null
    }
    
    return (
      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p className="mb-2">测试账号：</p>
        <div className="space-y-1">
          <p>系统管理员：admin / admin123</p>
        </div>
      </div>
    )
  }
  
  // 🆕 右上角控件区：主题切换 + 布局切换
  const renderLayoutToggle = () => (
    <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
      {/* 主题切换：明暗模式 + 10 套品牌色 */}
      <ThemeSwitcher className="h-9 w-9 rounded-md border border-border/60 bg-card/80 backdrop-blur-sm hover:bg-card hover:shadow-md" />

      {/* 布局切换 */}
      <button
        type="button"
        onClick={toggleLayout}
        title={layout === 'split' ? '切换为居中布局' : '切换为分栏布局'}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border/60 bg-card/80 text-text-tertiary backdrop-blur-sm transition-all duration-200 hover:bg-card hover:text-text-secondary hover:shadow-md"
      >
        {/* 图标表示“切换后会变成什么布局”：
            当前 split → 显示 Square（居中卡片）；当前 centered → 显示 PanelLeft（分栏）。
            注：lucide-react@0.294 无 Columns2，勿换。 */}
        {layout === 'split' ? (
          <Square className="h-4 w-4" />
        ) : (
          <PanelLeft className="h-4 w-4" />
        )}
      </button>
    </div>
  )
  
  // 🆕 登录表单（两种布局共用，含错峰入场动画）
  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div
        className="group animate-fade-up motion-reduce:animate-none"
        style={{ animationDelay: '160ms' }}
      >
        <label className="block text-sm font-medium text-text-secondary mb-2 transition-colors duration-200 group-focus-within:text-primary">
          用户名
        </label>
        {/* 🆕 前缀图标（对齐平板端 Icons.Default.Person）
            定位基于输入框高度 h-11(44px) 的中线，而非容器中线，
            否则错误提示出现时图标会被拉偏。 */}
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-[22px] h-4 w-4 -translate-y-1/2 text-text-tertiary transition-colors duration-200 group-focus-within:text-primary" />
          <Input
            type="text"
            name="username"
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            placeholder="请输入用户名"
            error={errors.username}
            autoComplete="off"
            disabled={loading}
            className="h-11 pl-10 transition-shadow duration-200 focus:shadow-md"
          />
        </div>
      </div>
      
      <div
        className="group animate-fade-up motion-reduce:animate-none"
        style={{ animationDelay: '240ms' }}
      >
        <label className="block text-sm font-medium text-text-secondary mb-2 transition-colors duration-200 group-focus-within:text-primary">
          密码
        </label>
        <div className="relative">
          {/* 🆕 前缀图标（对齐平板端 Icons.Default.Lock）同上：基于输入框中线定位 */}
          <Lock className="pointer-events-none absolute left-3 top-[22px] h-4 w-4 -translate-y-1/2 text-text-tertiary transition-colors duration-200 group-focus-within:text-primary" />
          <Input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="请输入密码"
            error={errors.password}
            autoComplete="off"
            className="h-11 pl-10 pr-10 transition-shadow duration-200 focus:shadow-md"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[22px] -translate-y-1/2 text-text-tertiary hover:text-text-regular transition-colors"
            disabled={loading}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      
      {/* 🆕 登录错误显示（key 触发重新挂载，每次错误都会抖动提醒） */}
      {errors.login && (
        <div
          key={errors.login}
          className="text-sm text-error bg-error/10 p-3 rounded-md border border-error/30 animate-shake motion-reduce:animate-none"
        >
          {errors.login}
        </div>
      )}
      
      {errors.submit && (
        <div
          key={errors.submit}
          className="text-sm text-error bg-error/10 p-3 rounded-md border border-error/30 animate-shake motion-reduce:animate-none"
        >
          {errors.submit}
        </div>
      )}
      
      <div
        className="animate-fade-up motion-reduce:animate-none"
        style={{ animationDelay: '320ms' }}
      >
        {/* 🆕 品牌渐变按钮（对齐平板端 GradientPrimaryButton：brand → brandDark）
            禁用态下去掉渐变，避免“亮色但不可点”的迷惑感 */}
        <Button
          type="submit"
          className="w-full h-11 text-base font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 motion-reduce:transform-none bg-gradient-to-br from-primary to-primary-active hover:from-primary-hover hover:to-primary-active disabled:bg-none disabled:bg-primary-disabled"
          loading={loading}
          disabled={loading}
        >
          {loading ? '登录中...' : '登录'}
        </Button>
      </div>
    </form>
  )
  
  // 🆕 共用页脚
  const renderFooter = (className = '') => (
    <footer className={`py-6 text-center ${className}`}>
      <p className="text-sm text-text-tertiary">
        {COMPANY_NAME} | {APP_VERSION_FULL}
      </p>
    </footer>
  )
  
  // ==================== 布局 A：居中卡片 ====================
  const renderCenteredLayout = () => (
    <div className="min-h-screen bg-bg-page flex flex-col relative overflow-hidden">
      {renderLayoutToggle()}
      
      {/* 装饰性背景元素 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 点阵纹理 */}
        <div
          className="absolute inset-0 text-text-tertiary opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 75%)',
          }}
        />
        {/* 漂浮光斑 */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-float-slow motion-reduce:animate-none"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-float-slower motion-reduce:animate-none"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-primary/4 rounded-full blur-3xl animate-float-slow motion-reduce:animate-none" style={{ animationDelay: '-9s' }}></div>
      </div>
      
      {/* 主内容区域 */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo + 眉标 + 金线（层级对齐平板端 SingleCardLayout） */}
          <div className="text-center mb-6 animate-fade-up motion-reduce:animate-none">
            <div className="flex justify-center mb-4">
              <Logo size="lg" showText={false} variant="color" />
            </div>
            <h1 className="relative inline-flex items-center justify-center text-xl font-bold text-text-primary">
              <span>{APP_NAME}</span>
              {/* V1 绝对定位挂在主标题右侧，不占据居中宽度，避免把主标题顶偏。 */}
              <span className="absolute left-full ml-2 align-middle text-sm font-semibold text-primary">
                {APP_MAJOR_VERSION}
              </span>
            </h1>
            <div className="mt-3 flex justify-center">
              <GoldDivider width="w-11" />
            </div>
          </div>
          
          {/* 登录卡片 */}
          <Card
            className="shadow-2xl border-border/50 backdrop-blur-sm bg-card/95 animate-fade-up motion-reduce:animate-none"
            style={{ animationDelay: '80ms' }}
          >
            <CardContent className="px-8 py-8">
              {renderForm()}
              {getTestAccountHints()}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {renderFooter()}
    </div>
  )
  
  // ==================== 布局 B：左右分栏 ====================
  const renderSplitLayout = () => (
    <div className="min-h-screen bg-bg-page flex relative overflow-hidden">
      {renderLayoutToggle()}
      
      {/* 左侧品牌区（小屏隐藏，降级为居中表单） */}
      <div className="relative hidden lg:flex lg:w-[46%] flex-col justify-between overflow-hidden bg-primary p-10 xl:p-14 text-primary-foreground">
        {/* 深度渐变叠层（主题无关，政务红/暗色主题自动适配） */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/10 to-black/40 pointer-events-none" />
        
        {/* 点阵纹理 */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
            backgroundSize: '26px 26px',
          }}
        />
        
        {/* 装饰圆环：右上（呼吸 + 虚线环缓慢旋转） */}
        <svg
          className="absolute -top-28 -right-28 h-[440px] w-[440px] text-primary-foreground/25 animate-breathe motion-reduce:animate-none pointer-events-none"
          viewBox="0 0 440 440"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="220" cy="220" r="210" stroke="currentColor" strokeOpacity="0.7" />
          <circle
            cx="220"
            cy="220"
            r="150"
            stroke="currentColor"
            strokeDasharray="4 12"
            className="origin-center animate-spin-slowest motion-reduce:animate-none"
          />
          <circle cx="220" cy="220" r="90" stroke="currentColor" strokeOpacity="0.7" />
        </svg>
        
        {/* 装饰圆环：左下（缓慢漂浮） */}
        <svg
          className="absolute -bottom-24 -left-24 h-[320px] w-[320px] text-primary-foreground/20 animate-float-slower motion-reduce:animate-none pointer-events-none"
          viewBox="0 0 320 320"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="160" cy="160" r="150" stroke="currentColor" />
          <circle cx="160" cy="160" r="100" stroke="currentColor" strokeDasharray="3 10" />
        </svg>
        
        {/* 顶部：公司 logo（白版）+ 产品名称 */}
        {/* 品牌区背景为 bg-primary 深色；Mark 用 currentColor，随下方类名换色 */}
        <div className="relative z-10 animate-fade-up motion-reduce:animate-none">
          <Mark
            size={72}
            className={brandAreaIsLight ? 'text-primary opacity-95' : 'text-white opacity-95'}
          />
          <h1 className="mt-6 flex items-baseline gap-2.5 text-3xl xl:text-4xl font-bold tracking-wide leading-snug">
            <span>{APP_NAME}</span>
            <span className="text-xl xl:text-2xl font-semibold text-primary-foreground/70">
              {APP_MAJOR_VERSION}
            </span>
          </h1>
          <GoldDivider className="mt-5" width="w-14" />
        </div>
        
        {/* 中部：标语 + 特性点 */}
        <div className="relative z-10">
          <h2
            className="text-lg xl:text-xl font-medium text-primary-foreground/90 mb-2 animate-fade-up motion-reduce:animate-none"
            style={{ animationDelay: '80ms' }}
          >
            安全可信的离线会议管理平台
          </h2>
          <p
            className="text-primary-foreground/60 text-sm mb-10 animate-fade-up motion-reduce:animate-none"
            style={{ animationDelay: '160ms' }}
          >
            会议全生命周期管理，面向高安全要求场景
          </p>
          
          <div className="space-y-5">
            {BRAND_FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                className="flex items-start gap-3.5 animate-fade-up motion-reduce:animate-none"
                style={{ animationDelay: `${240 + index * 80}ms` }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 border border-primary-foreground/15">
                  <feature.icon className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-sm font-medium">{feature.title}</p>
                  <p className="text-xs text-primary-foreground/60 mt-0.5">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 底部：公司信息 */}
        <div
          className="relative z-10 text-xs text-primary-foreground/50 animate-fade-up motion-reduce:animate-none"
          style={{ animationDelay: '520ms' }}
        >
          {COMPANY_NAME} | {APP_VERSION_FULL}
        </div>
      </div>
      
      {/* 右侧表单区 */}
      <div className="relative flex flex-1 flex-col">
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm">
            {/* 小屏时显示 Logo（左侧品牌区已隐藏）；浅色背景用彩色版 */}
            <div className="lg:hidden text-center mb-8 animate-fade-up motion-reduce:animate-none">
              <div className="flex justify-center">
                <Logo size="lg" showText={false} variant="color" />
              </div>
              <h1 className="mt-4 text-lg font-bold text-text-primary">
                {APP_NAME}
                <span className="ml-2 align-middle text-xs font-semibold text-primary">
                  {APP_MAJOR_VERSION}
                </span>
              </h1>
            </div>
            
            <div
              className="mb-8 animate-fade-up motion-reduce:animate-none"
              style={{ animationDelay: '80ms' }}
            >
              {/* 主标题 → 金线（省略台式“特殊会议登录”眉标，后台与 pad 区分） */}
              <h1 className="text-2xl font-bold text-text-primary mb-1.5">欢迎登录</h1>
              <p className="text-sm text-text-tertiary">请输入您的账号信息</p>
              <GoldDivider className="mt-5" width="w-11" />
            </div>
            
            {renderForm()}
            {getTestAccountHints()}
          </div>
        </div>
        
        {/* 小屏时显示页脚（左侧品牌区已隐藏） */}
        {renderFooter('lg:hidden')}
      </div>
    </div>
  )
  
  return (
    <>
      {layout === 'split' ? renderSplitLayout() : renderCenteredLayout()}
      
      {/* 🆕 强制修改密码对话框 */}
      <ForceChangePasswordDialog
        open={passwordExpiredDialog.open}
        onClose={() => setPasswordExpiredDialog({ open: false, userId: '', username: '' })}
        onSuccess={handlePasswordChangeSuccess}
        userId={passwordExpiredDialog.userId}
        username={passwordExpiredDialog.username}
      />
      
      {/* 🆕 告警弹窗 */}
      <Dialog open={alertDialog.open} onOpenChange={(open) => !open && handleAlertDialogClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              系统告警
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {alertDialog.alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getAlertSeverityColor(alert.severity)}`}
              >
                <div className="font-medium mb-1">{alert.title}</div>
                <div className="text-sm opacity-80">{alert.message}</div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={handleAlertDialogClose}>
              知道了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default LoginPage
