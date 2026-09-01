import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect } from 'react'
import { DynamicRouter } from './router'
import { PerformanceMonitor, DevPerformanceTools } from './components/PerformanceMonitor'
import { DialogProvider } from '@/components/ui/DialogProvider'
import { NotificationContainer } from '@/components/ui/Notification'
import { useGlobalStore } from '@/store'
import { checkAndShowExpirationWarning } from '@/utils/errorHandler'
import { showAlert } from '@/components/ui/DialogProvider'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { useTheme } from '@/hooks/useTheme'
import { queryClient } from '@/config/query.config'
import './styles/globals.css'

function App() {
  const isDevelopment = import.meta.env.DEV
  // ✅ 只订阅需要的方法，不使用 useGlobalStore()
  const showAuthManagement = useGlobalStore((state) => state.showAuthManagement)
  
  useErrorHandler()
  
  // 在根组件应用主题，使登录页（在 MainLayout 之外）也能跟随明暗模式与品牌色。
  // 否则主题仅在 ThemeSwitcher 挂载后生效。
  useTheme()
  
  useEffect(() => {
    const title = import.meta.env.VITE_APP_TITLE || '管理系统'
    document.title = title
  }, [])
  
  useEffect(() => {
    const checkUrlParams = () => {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('info') === 'true') {
        showAuthManagement()
        
        const newUrl = window.location.pathname + window.location.hash
        window.history.replaceState({}, '', newUrl)
      }
    }
    
    checkUrlParams()
    
    const handlePopState = () => checkUrlParams()
    window.addEventListener('popstate', handlePopState)
    
    const handleHashChange = () => checkUrlParams()
    window.addEventListener('hashchange', handleHashChange)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [showAuthManagement])
  
  useEffect(() => {
    const checkAuthPeriodically = () => {
      checkAndShowExpirationWarning(showAlert)
    }
    
    checkAuthPeriodically()
    
    const interval = setInterval(checkAuthPeriodically, 60 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <QueryClientProvider client={queryClient}>
      <DialogProvider>
        <PerformanceMonitor />
        {isDevelopment && <DevPerformanceTools />}
        {isDevelopment && <ReactQueryDevtools initialIsOpen={false} />}
        <DynamicRouter />
        <NotificationContainer />
      </DialogProvider>
    </QueryClientProvider>
  )
}

export default App
