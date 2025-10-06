/**
 * 共通ローディングコンポーネント
 */
import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBug, faSpinner } from '@fortawesome/free-solid-svg-icons'

export interface LoadingProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'spinner' | 'dots' | 'bug' | 'pulse'
  text?: string
  fullScreen?: boolean
  className?: string
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  variant = 'spinner',
  text,
  fullScreen = false,
  className = ''
}) => {
  const getSizeClass = () => {
    const sizes = {
      xs: 'loading-xs',
      sm: 'loading-sm',
      md: 'loading-md',
      lg: 'loading-lg',
      xl: 'loading-xl'
    }
    return sizes[size] || sizes.md
  }

  const getVariantClass = () => {
    const variants = {
      spinner: 'loading-spinner',
      dots: 'loading-dots',
      bug: '',
      pulse: 'loading-pulse'
    }
    return variants[variant] || variants.spinner
  }

  const getSizePixels = () => {
    const sizes = {
      xs: '12px',
      sm: '16px',
      fontSize: '10px'
    }
    const sizesMd = {
      xs: '16px',
      sm: '20px',
      fontSize: '12px'
    }
    const sizesLg = {
      xs: '24px',
      sm: '28px',
      fontSize: '14px'
    }
    const sizesXl = {
      xs: '32px',
      sm: '36px',
      fontSize: '16px'
    }

    switch (size) {
      case 'xs': return sizes.xs
      case 'sm': return sizesMd
      case 'lg': return sizesLg
      case 'xl': return sizesXl
      default: return sizesMd
    }
  }

  const renderLoading = () => {
    if (variant === 'bug') {
      return (
        <div className="flex flex-col items-center justify-center">
          <FontAwesomeIcon 
            icon={faBug} 
            spin 
            style={{ 
              fontSize: getSizePixels().xs, 
              color: 'black' 
            }} 
          />
          {text && (
            <span 
              className="ml-1 text-black" 
              style={{ fontSize: getSizePixels().fontSize }}
            >
              {text}
            </span>
          )}
        </div>
      )
    }

    if (variant === 'pulse') {
      return (
        <div className="flex flex-col items-center justify-center">
          <div className="animate-pulse">
            <FontAwesomeIcon 
              icon={faSpinner} 
              style={{ 
                fontSize: getSizePixels().xs, 
                color: 'currentColor' 
              }} 
            />
          </div>
          {text && (
            <span 
              className="ml-1" 
              style={{ fontSize: getSizePixels().fontSize }}
            >
              {text}
            </span>
          )}
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center">
        <span className={`loading ${getVariantClass()} ${getSizeClass()}`}></span>
        {text && (
          <span 
            className="ml-2" 
            style={{ fontSize: getSizePixels().fontSize }}
          >
            {text}
          </span>
        )}
      </div>
    )
  }

  const containerClass = fullScreen 
    ? 'fixed inset-0 bg-base-100 bg-opacity-80 flex items-center justify-center z-50'
    : 'flex items-center justify-center'

  return (
    <div className={`${containerClass} ${className}`}>
      {renderLoading()}
    </div>
  )
}

/**
 * インラインローディングコンポーネント
 */
export interface InlineLoadingProps {
  text?: string
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  text = 'Loading...',
  size = 'sm',
  className = ''
}) => {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <span className={`loading loading-spinner ${size === 'xs' ? 'loading-xs' : size === 'sm' ? 'loading-sm' : 'loading-md'}`}></span>
      {text && <span className="ml-2 text-sm">{text}</span>}
    </div>
  )
}

/**
 * ボタン内ローディングコンポーネント
 */
export interface ButtonLoadingProps {
  loading?: boolean
  children: React.ReactNode
  className?: string
}

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({
  loading = false,
  children,
  className = ''
}) => {
  return (
    <div className={`relative ${className}`}>
      {loading && (
        <span className="loading loading-spinner loading-sm absolute left-2 top-1/2 transform -translate-y-1/2"></span>
      )}
      <span className={loading ? 'opacity-0' : ''}>
        {children}
      </span>
    </div>
  )
}

/**
 * スケルトンローディングコンポーネント
 */
export interface SkeletonProps {
  width?: string
  height?: string
  className?: string
  lines?: number
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  className = '',
  lines = 1
}) => {
  if (lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="skeleton h-4 w-full mb-2"
            style={{ width: index === lines - 1 ? '75%' : '100%' }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height }}
    />
  )
}
