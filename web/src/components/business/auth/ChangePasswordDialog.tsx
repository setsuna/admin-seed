/**
 * 修改密码对话框
 * 用于登录后用户主动修改密码
 */

import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { auth } from '@/services/core/auth.service'
import { useNotifications } from '@/hooks/useNotifications'
import { encryptPassword } from '@/utils/crypto'
import { ERROR_CODES } from '@/config'

interface ChangePasswordDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const { showSuccess } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.oldPassword) {
      newErrors.oldPassword = '请输入原密码'
    }

    if (!formData.newPassword) {
      newErrors.newPassword = '请输入新密码'
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = '密码长度至少6位'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '请确认新密码'
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致'
    }

    if (formData.oldPassword && formData.newPassword && formData.oldPassword === formData.newPassword) {
      newErrors.newPassword = '新密码不能与原密码相同'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    setErrors({})

    try {
      await auth.changePassword({
        old_password: encryptPassword(formData.oldPassword),
        new_password: encryptPassword(formData.newPassword)
      })

      showSuccess('密码修改成功')
      
      // 重置表单
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      
      onSuccess?.()
      onClose()
    } catch (error: any) {
      const code = error?.code
      const message = error?.message

      // 本地处理错误码
      if (code === ERROR_CODES.PASSWORD_INVALID) {
        // 2008 原密码错误
        setErrors({ oldPassword: message || '原密码错误' })
      } else if (code === ERROR_CODES.PASSWORD_WEAK) {
        // 2012 密码强度不足 - 使用后端返回的具体信息
        setErrors({ newPassword: message || '密码强度不足' })
      } else {
        // 其他错误显示在表单顶部
        setErrors({ submit: message || '修改密码失败，请重试' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setErrors({})
      onClose()
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="修改密码"
      size="sm"
      closeOnOverlay={false}
      showCloseButton={!loading}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* 全局错误 */}
        {errors.submit && (
          <div className="text-sm text-error bg-error/10 p-3 rounded-md border border-error/30">
            {errors.submit}
          </div>
        )}

        {/* 原密码 */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            原密码
          </label>
          <div className="relative">
            <Input
              type={showOldPassword ? 'text' : 'password'}
              value={formData.oldPassword}
              onChange={(e) => handleInputChange('oldPassword', e.target.value)}
              placeholder="请输入原密码"
              error={errors.oldPassword}
              disabled={loading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowOldPassword(!showOldPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-regular transition-colors"
              disabled={loading}
              tabIndex={-1}
            >
              {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* 新密码 */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            新密码
          </label>
          <div className="relative">
            <Input
              type={showNewPassword ? 'text' : 'password'}
              value={formData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              placeholder="请输入新密码"
              error={errors.newPassword}
              disabled={loading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-regular transition-colors"
              disabled={loading}
              tabIndex={-1}
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* 确认密码 */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            确认新密码
          </label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="请再次输入新密码"
              error={errors.confirmPassword}
              disabled={loading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-regular transition-colors"
              disabled={loading}
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={loading}
          >
            确认修改
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default ChangePasswordDialog
