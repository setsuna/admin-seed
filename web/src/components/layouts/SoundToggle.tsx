import { memo } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/store'

/**
 * 音效开关按钮组件
 * 使用 memo 包装，只在 soundEnabled 变化时重渲染
 */
export const SoundToggle = memo(function SoundToggle() {
  
  const soundEnabled = useStore((state) => state.soundEnabled)
  const toggleSound = useStore((state) => state.toggleSound)
  
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleSound}
      title={soundEnabled ? '关闭音效' : '开启音效'}
    >
      {soundEnabled ? (
        <Volume2 className="h-4 w-4" />
      ) : (
        <VolumeX className="h-4 w-4" />
      )}
    </Button>
  )
})
