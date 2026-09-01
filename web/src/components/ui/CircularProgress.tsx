import * as React from 'react'
import { cn } from '@/utils'

interface CircularProgressProps {
  /** 进度值 0-100 */
  value: number
  /** 尺寸 */
  size?: number
  /** 线条粗细 */
  strokeWidth?: number
  /** 进度条颜色 */
  color?: string
  /** 背景轨道颜色 */
  trackColor?: string
  /** 是否显示百分比文字 */
  showValue?: boolean
  /** 标记点位置 0-100（可选，用于显示告警阈值等） */
  markerValue?: number
  /** 标记点颜色 */
  markerColor?: string
  /** 自定义显示内容 */
  children?: React.ReactNode
  /** 自定义类名 */
  className?: string
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 120,
  strokeWidth = 8,
  color = '#3b82f6',
  trackColor = '#e5e7eb',
  showValue = true,
  markerValue,
  markerColor = '#3b82f6',
  children,
  className,
}) => {
  // 确保值在 0-100 之间
  const normalizedValue = Math.min(100, Math.max(0, value))
  const normalizedMarker = markerValue !== undefined ? Math.min(100, Math.max(0, markerValue)) : undefined
  
  // 计算圆的参数
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference
  
  // 中心点
  const center = size / 2
  
  // 计算标记点位置（SVG 已经旋转 -90 度，所以这里不需要再偏移）
  const getMarkerPosition = (percent: number) => {
    const angle = (percent / 100) * 2 * Math.PI
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    }
  }

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* 背景轨道 */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* 进度条 */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300 ease-in-out"
        />
        {/* 告警阈值标记点 */}
        {normalizedMarker !== undefined && (
          <circle
            cx={getMarkerPosition(normalizedMarker).x}
            cy={getMarkerPosition(normalizedMarker).y}
            r={5}
            fill={markerColor}
            className="transition-all duration-300 ease-in-out"
          />
        )}
      </svg>
      {/* 中间内容 */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children ? children : (
          showValue && (
            <span className="text-2xl font-semibold text-gray-700">
              {normalizedValue.toFixed(1)}%
            </span>
          )
        )}
      </div>
    </div>
  )
}

export { CircularProgress }
export type { CircularProgressProps }
