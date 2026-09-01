import React, { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeProps {
  value: string
  size?: number
  className?: string
}

// ✅ 使用 Canvas 渲染，避免 CSP 问题
export const SimpleQRCode: React.FC<QRCodeProps> = ({ value, size = 150, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const generateQRCode = async () => {
      if (!canvasRef.current) return

      try {
        // ✅ 直接渲染到 Canvas，不需要 data URI
        await QRCode.toCanvas(canvasRef.current, value, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        })
        setError(false)
      } catch (err) {
        console.error('Failed to generate QR code:', err)
        setError(true)
      }
    }

    if (value) {
      generateQRCode()
    }
  }, [value, size])

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center border-2 border-dashed border-border rounded ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="text-center p-2">
          <div className="text-sm text-text-tertiary mb-2">二维码生成失败</div>
          <div className="text-xs font-mono break-all max-w-full overflow-hidden">
            {value.substring(0, 20)}...
          </div>
        </div>
      </div>
    )
  }

  return (
    <canvas 
      ref={canvasRef}
      className={`border rounded ${className}`}
      style={{ 
        width: size, 
        height: size,
        imageRendering: 'pixelated' // 确保二维码清晰
      }}
    />
  )
}
