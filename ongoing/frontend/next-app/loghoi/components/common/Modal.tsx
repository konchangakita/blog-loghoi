/**
 * 共通モーダルコンポーネント
 */
import React, { useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  className?: string
  showCloseButton?: boolean
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  showCloseButton = true
}) => {
  const getSizeClass = () => {
    const sizes = {
      xs: 'max-w-xs',
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
      '4xl': 'max-w-4xl',
      '5xl': 'max-w-5xl',
      '6xl': 'max-w-6xl',
      '7xl': 'max-w-7xl'
    }
    return sizes[size] || sizes.md
  }

  // ESCキーで閉じる
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // モーダルが開いている時はbodyのスクロールを無効化
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div 
        className="modal-backdrop"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      <div className={`modal-box ${getSizeClass()} ${className}`}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">{title}</h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="btn btn-sm btn-circle btn-ghost"
                aria-label="モーダルを閉じる"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

/**
 * 確認モーダルコンポーネント
 */
export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'primary' | 'error' | 'warning' | 'info'
  loading?: boolean
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '確認',
  cancelText = 'キャンセル',
  variant = 'primary',
  loading = false
}) => {
  const getVariantClass = () => {
    const variants = {
      primary: 'btn-primary',
      error: 'btn-error',
      warning: 'btn-warning',
      info: 'btn-info'
    }
    return variants[variant] || variants.primary
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
    >
      <div className="py-4">
        <p className="text-sm text-gray-600">{message}</p>
      </div>
      
      <div className="modal-action">
        <button
          onClick={onClose}
          className="btn btn-ghost"
          disabled={loading}
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className={`btn ${getVariantClass()}`}
          disabled={loading}
        >
          {loading && <span className="loading loading-spinner loading-sm"></span>}
          {confirmText}
        </button>
      </div>
    </Modal>
  )
}

/**
 * アラートモーダルコンポーネント
 */
export interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  buttonText?: string
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  buttonText = 'OK'
}) => {
  const getTypeClass = () => {
    const types = {
      success: 'alert-success',
      error: 'alert-error',
      warning: 'alert-warning',
      info: 'alert-info'
    }
    return types[type] || types.info
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
    >
      <div className={`alert ${getTypeClass()} mb-4`}>
        <div>
          <h3 className="font-bold">{title}</h3>
          <div className="text-sm">{message}</div>
        </div>
      </div>
      
      <div className="modal-action">
        <button
          onClick={onClose}
          className="btn btn-primary"
        >
          {buttonText}
        </button>
      </div>
    </Modal>
  )
}
