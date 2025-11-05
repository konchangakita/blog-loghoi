/**
 * 共通ボタンコンポーネント
 */
import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'

export interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'ghost' | 'outline'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  icon?: IconDefinition
  iconPosition?: 'left' | 'right'
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
  fullWidth?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  className = '',
  fullWidth = false
}) => {
  const getVariantClass = () => {
    const variants = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      success: 'btn-success',
      error: 'btn-error',
      warning: 'btn-warning',
      info: 'btn-info',
      ghost: 'btn-ghost',
      outline: 'btn-outline'
    }
    return variants[variant] || variants.primary
  }

  const getSizeClass = () => {
    const sizes = {
      xs: 'btn-xs',
      sm: 'btn-sm',
      md: '',
      lg: 'btn-lg'
    }
    return sizes[size] || sizes.md
  }

  const getWidthClass = () => {
    return fullWidth ? 'w-full' : ''
  }

  const buttonClasses = [
    'btn',
    getVariantClass(),
    getSizeClass(),
    getWidthClass(),
    disabled || loading ? 'btn-disabled' : '',
    className
  ].filter(Boolean).join(' ')

  const iconElement = icon && (
    <FontAwesomeIcon 
      icon={icon} 
      className={loading ? 'opacity-0' : ''}
      style={{ fontSize: size === 'xs' ? '10px' : size === 'sm' ? '12px' : size === 'lg' ? '16px' : '14px' }}
    />
  )

  const loadingElement = loading && (
    <span className="loading loading-spinner loading-sm"></span>
  )

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && loadingElement}
      {!loading && icon && iconPosition === 'left' && iconElement}
      <span className={loading ? 'opacity-0' : ''}>{children}</span>
      {!loading && icon && iconPosition === 'right' && iconElement}
    </button>
  )
}

/**
 * アイコンボタンコンポーネント
 */
export interface IconButtonProps {
  icon: IconDefinition
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  className?: string
  'aria-label': string
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  'aria-label': ariaLabel
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled}
      loading={loading}
      onClick={onClick}
      className={`btn-circle ${className}`}
      aria-label={ariaLabel}
    >
      <FontAwesomeIcon 
        icon={icon} 
        style={{ fontSize: size === 'xs' ? '10px' : size === 'sm' ? '12px' : size === 'lg' ? '16px' : '14px' }}
      />
    </Button>
  )
}
