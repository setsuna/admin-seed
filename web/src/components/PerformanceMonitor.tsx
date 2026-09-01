import { useEffect } from 'react'

interface PerformanceMetrics {
  fcp?: number // First Contentful Paint
  lcp?: number // Largest Contentful Paint
  cls?: number // Cumulative Layout Shift
  fid?: number // First Input Delay
  ttfb?: number // Time to First Byte
}

export const PerformanceMonitor: React.FC = () => {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.performance) return

    const metrics: PerformanceMetrics = {}

    // 监控核心 Web Vitals
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        try {
          switch (entry.entryType) {
            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                metrics.fcp = entry.startTime
              }
              break
            case 'largest-contentful-paint':
              metrics.lcp = entry.startTime
              break
            case 'layout-shift':
              const layoutShiftEntry = entry as any
              if (layoutShiftEntry && !layoutShiftEntry.hadRecentInput) {
                metrics.cls = (metrics.cls || 0) + (layoutShiftEntry.value || 0)
              }
              break
            case 'first-input':
              const firstInputEntry = entry as any
              if (firstInputEntry && firstInputEntry.processingStart) {
                metrics.fid = firstInputEntry.processingStart - entry.startTime
              }
              break
          }
        } catch (e) {
          console.warn('Performance monitoring error:', e)
        }
      })
    })

    // 安全地观察性能指标
    try {
      const entryTypes = []
      if ('PerformancePaintTiming' in window) entryTypes.push('paint')
      if ('LargestContentfulPaint' in window) entryTypes.push('largest-contentful-paint')
      if ('LayoutShift' in window) entryTypes.push('layout-shift')
      if ('PerformanceEventTiming' in window) entryTypes.push('first-input')
      
      if (entryTypes.length > 0) {
        observer.observe({ entryTypes })
      }
    } catch (e) {
      console.warn('Performance Observer not supported')
    }

    // TTFB 计算
    try {
      const navigationEntries = performance.getEntriesByType('navigation')
      if (navigationEntries.length > 0) {
        const navigationEntry = navigationEntries[0] as PerformanceNavigationTiming
        metrics.ttfb = navigationEntry.responseStart - navigationEntry.requestStart
      }
    } catch (e) {
      console.warn('Navigation timing not available')
    }

    // 资源加载监控
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        try {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming
            
            // 大文件加载警告
            if (resource.transferSize && resource.transferSize > 200 * 1024) {
              console.warn(`⚠️ Large resource: ${resource.name} (${(resource.transferSize / 1024).toFixed(1)}KB)`)
            }
            
            // 慢加载警告
            if (resource.duration > 1000) {
              console.warn(`🐌 Slow resource: ${resource.name} took ${resource.duration.toFixed(0)}ms`)
            }
          }
        } catch (e) {
          console.warn('Resource monitoring error:', e)
        }
      })
    })

    try {
      resourceObserver.observe({ entryTypes: ['resource'] })
    } catch (e) {
      console.warn('Resource Observer not supported')
    }

    // 内存使用监控（如果支持）
    const checkMemoryUsage = () => {
      try {
        if ('memory' in performance) {
          const memory = (performance as any).memory
          if (memory) {
            const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(1)
            const limitMB = (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1)
            
            console.log(`💾 Memory: ${usedMB}MB / ${limitMB}MB`)
            
            // 内存使用过高警告
            if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.8) {
              console.warn('🚨 High memory usage detected!')
            }
          }
        }
      } catch (e) {
        console.warn('Memory monitoring not available')
      }
    }

    const memoryInterval = setInterval(checkMemoryUsage, 30000)

    // 页面卸载时输出性能报告
    const handleBeforeUnload = () => {
      try {
        console.group('📊 Performance Report')
        console.log('🎨 First Contentful Paint:', metrics.fcp ? `${metrics.fcp.toFixed(2)}ms` : 'N/A')
        console.log('🖼️ Largest Contentful Paint:', metrics.lcp ? `${metrics.lcp.toFixed(2)}ms` : 'N/A')
        console.log('📐 Cumulative Layout Shift:', metrics.cls ? metrics.cls.toFixed(4) : 'N/A')
        console.log('👆 First Input Delay:', metrics.fid ? `${metrics.fid.toFixed(2)}ms` : 'N/A')
        console.log('🌐 Time to First Byte:', metrics.ttfb ? `${metrics.ttfb.toFixed(2)}ms` : 'N/A')
        
        const score = calculatePerformanceScore(metrics)
        console.log(`🏆 Performance Score: ${score}/100`)
        
        console.groupEnd()
      } catch (e) {
        console.warn('Performance report error:', e)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      try {
        observer.disconnect()
        resourceObserver.disconnect()
        clearInterval(memoryInterval)
        window.removeEventListener('beforeunload', handleBeforeUnload)
      } catch (e) {
        console.warn('Cleanup error:', e)
      }
    }
  }, [])

  return null
}

// 性能评分算法
function calculatePerformanceScore(metrics: PerformanceMetrics): number {
  let score = 100
  
  if (metrics.fcp) {
    if (metrics.fcp > 3000) score -= 25
    else if (metrics.fcp > 1800) score -= 15
    else if (metrics.fcp > 1000) score -= 8
  }
  
  if (metrics.lcp) {
    if (metrics.lcp > 4000) score -= 25
    else if (metrics.lcp > 2500) score -= 15
    else if (metrics.lcp > 1500) score -= 8
  }
  
  if (metrics.cls !== undefined) {
    if (metrics.cls > 0.25) score -= 25
    else if (metrics.cls > 0.1) score -= 15
    else if (metrics.cls > 0.05) score -= 8
  }
  
  if (metrics.fid) {
    if (metrics.fid > 300) score -= 25
    else if (metrics.fid > 100) score -= 15
    else if (metrics.fid > 50) score -= 8
  }
  
  return Math.max(0, score)
}

// 开发模式下的性能工具
export const DevPerformanceTools: React.FC = () => {
  useEffect(() => {
    const isDevelopment = import.meta.env.DEV
    if (!isDevelopment) return

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + P = 显示性能报告
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        showPerformanceReport()
      }
      
      // Ctrl/Cmd + Shift + M = 显示内存使用
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
        e.preventDefault()
        showMemoryReport()
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    
    console.log('🔧 Performance Dev Tools:')
    console.log('  - Ctrl/Cmd + Shift + P: Show performance report')
    console.log('  - Ctrl/Cmd + Shift + M: Show memory usage')

    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [])

  return null
}

function showPerformanceReport() {
  try {
    const navigationEntries = performance.getEntriesByType('navigation')
    if (navigationEntries.length === 0) {
      console.warn('No navigation timing data available')
      return
    }
    
    const entries = navigationEntries[0] as PerformanceNavigationTiming
    
    console.group('🚀 Performance Report (Current Session)')
    console.log('🌐 DNS Lookup:', `${(entries.domainLookupEnd - entries.domainLookupStart).toFixed(2)}ms`)
    console.log('🔗 TCP Connection:', `${(entries.connectEnd - entries.connectStart).toFixed(2)}ms`)
    console.log('📡 Request:', `${(entries.responseStart - entries.requestStart).toFixed(2)}ms`)
    console.log('📥 Response:', `${(entries.responseEnd - entries.responseStart).toFixed(2)}ms`)
    console.log('🏗️ DOM Processing:', `${(entries.domComplete - entries.domContentLoadedEventStart).toFixed(2)}ms`)
    console.log('⚡ Total Load Time:', `${(entries.loadEventEnd - entries.fetchStart).toFixed(2)}ms`)
    console.groupEnd()
  } catch (e) {
    console.warn('Performance report not available:', e)
  }
}

function showMemoryReport() {
  try {
    if (!('memory' in performance)) {
      console.warn('Memory API not supported in this browser')
      return
    }
    
    const memory = (performance as any).memory
    if (!memory) {
      console.warn('Memory data not available')
      return
    }
    
    console.group('💾 Memory Usage Report')
    console.log('Used:', `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`)
    console.log('Total:', `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`)
    console.log('Limit:', `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`)
    console.log('Usage:', `${((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1)}%`)
    console.groupEnd()
  } catch (e) {
    console.warn('Memory report not available:', e)
  }
}
