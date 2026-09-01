import { useEffect } from 'react'
import { useStore } from '@/store'
import { soundManager } from '@/utils/sound'

/**
 * 音效管理器组件
 * 负责同步 store 中的音效状态到 soundManager
 * 这个组件不渲染任何UI，只处理副作用
 */
export function SoundEffectManager() {
  const soundEnabled = useStore((state) => state.soundEnabled)
  
  useEffect(() => {
    soundManager.setEnabled(soundEnabled)
  }, [soundEnabled])
  
  return null
}
