import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
    // 强制去重，解决状态管理库可能的冲突
    dedupe: ['react', 'react-dom', 'zustand']
  },
  server: {
    host: '0.0.0.0', // 允许局域网访问
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,  // 支持 WebSocket
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 优化的分包策略：避免状态管理库被分散导致运行时错误
        manualChunks: {
          // React 核心
          'react-vendor': ['react', 'react-dom'],
          // 状态管理（关键：单独分包避免冲突）
          'state-management': ['zustand'],
          // 路由
          'router': ['react-router-dom'],
          // UI 组件库
          'ui-libs': ['lucide-react'],
          // 表单相关
          'form-libs': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // 表格和数据查询
          'table-libs': ['@tanstack/react-table', '@tanstack/react-query'],
          // 工具库
          'utils': ['axios', 'clsx', 'js-yaml', 'tailwind-merge', 'react-dropzone'],
          // 二维码库（单独分包，避免打包问题）
          'qrcode-lib': ['qrcode']
        }
      }
    },
    minify: 'esbuild',
    sourcemap: false,
    target: 'es2020'
  },
  
  optimizeDeps: {
    include: [
      'react',
      'react-dom', 
      'react-router-dom',
      'zustand'
    ],
    // 强制预构建，确保开发和生产环境一致性
    force: false
  }
})
