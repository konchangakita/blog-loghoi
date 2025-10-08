/**
 * 共通入力フィールドコンポーネント
 */
import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'

export interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  placeholder?: string
  value?: string
  defaultValue?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  disabled?: boolean
  required?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'bordered' | 'ghost' | 'primary'
  error?: string
  label?: string
  helperText?: string
  icon?: IconDefinition
  iconPosition?: 'left' | 'right'
  className?: string
  fullWidth?: boolean
  name?: string
  id?: string
}

export const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  onKeyDown,
  disabled = false,
  required = false,
  size = 'md',
  variant = 'bordered',
  error,
  label,
  helperText,
  icon,
  iconPosition = 'left',
  className = '',
  fullWidth = false,
  name,
  id
}) => {
  const getSizeClass = () => {
    const sizes = {
      xs: 'input-xs',
      sm: 'input-sm',
      md: '',
      lg: 'input-lg'
    }
    return sizes[size] || sizes.md
  }

  const getVariantClass = () => {
    const variants = {
      bordered: 'input-bordered',
      ghost: 'input-ghost',
      primary: 'input-primary'
    }
    return variants[variant] || variants.bordered
  }

  const getWidthClass = () => {
    return fullWidth ? 'w-full' : ''
  }

  const getErrorClass = () => {
    return error ? 'input-error' : ''
  }

  const inputClasses = [
    'input',
    getSizeClass(),
    getVariantClass(),
    getWidthClass(),
    getErrorClass(),
    disabled ? 'input-disabled' : '',
    className
  ].filter(Boolean).join(' ')

  const iconElement = icon && (
    <FontAwesomeIcon 
      icon={icon} 
      className="text-gray-400"
      style={{ fontSize: size === 'xs' ? '10px' : size === 'sm' ? '12px' : size === 'lg' ? '16px' : '14px' }}
    />
  )

  return (
    <div className={`form-control ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="label" htmlFor={id}>
          <span className="label-text">
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </span>
        </label>
      )}
      
      <div className={`relative ${fullWidth ? 'w-full' : ''}`}>
        {icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {iconElement}
          </div>
        )}
        
        <input
          type={type}
          id={id}
          name={name}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          disabled={disabled}
          required={required}
          className={`${inputClasses} ${icon && iconPosition === 'left' ? 'pl-10' : ''} ${icon && iconPosition === 'right' ? 'pr-10' : ''}`}
        />
        
        {icon && iconPosition === 'right' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {iconElement}
          </div>
        )}
      </div>
      
      {error && (
        <label className="label">
          <span className="label-text-alt text-error text-xs">
            {error}
          </span>
        </label>
      )}
      
      {helperText && !error && (
        <label className="label">
          <span className="label-text-alt text-gray-500 text-xs">
            {helperText}
          </span>
        </label>
      )}
    </div>
  )
}

/**
 * 検索入力フィールドコンポーネント
 */
export interface SearchInputProps extends Omit<InputProps, 'type' | 'icon'> {
  onSearch?: (value: string) => void
  onClear?: () => void
  showClearButton?: boolean
}

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  onClear,
  showClearButton = true,
  value,
  onChange,
  ...props
}) => {
  const handleClear = () => {
    if (onClear) {
      onClear()
    }
  }

  return (
    <div className="relative">
      <Input
        {...props}
        type="search"
        value={value}
        onChange={onChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onSearch) {
            onSearch()
          }
        }}
        icon={undefined} // 検索アイコンは別途実装
        className={`${props.className || ''} pr-10`}
      />
      
      {showClearButton && value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          aria-label="検索をクリア"
        >
          <FontAwesomeIcon icon="times" style={{ fontSize: '12px' }} />
        </button>
      )}
    </div>
  )
}
