/**
 * 共通カードコンポーネント
 */
import React from 'react'

export interface CardProps {
  children: React.ReactNode
  variant?: 'default' | 'bordered' | 'compact' | 'side' | 'elevated'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
  hover?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  onClick,
  hover = false
}) => {
  const getVariantClass = () => {
    const variants = {
      default: 'card',
      bordered: 'card card-bordered',
      compact: 'card card-compact',
      side: 'card card-side',
      elevated: 'card shadow-lg'
    }
    return variants[variant] || variants.default
  }

  const getSizeClass = () => {
    const sizes = {
      sm: 'card-sm',
      md: '',
      lg: 'card-lg'
    }
    return sizes[size] || sizes.md
  }

  const getHoverClass = () => {
    return hover ? 'hover:shadow-md transition-shadow cursor-pointer' : ''
  }

  const cardClasses = [
    getVariantClass(),
    getSizeClass(),
    getHoverClass(),
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={cardClasses} onClick={onClick}>
      {children}
    </div>
  )
}

export interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`card-header ${className}`}>
      {children}
    </div>
  )
}

export interface CardBodyProps {
  children: React.ReactNode
  className?: string
}

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`card-body ${className}`}>
      {children}
    </div>
  )
}

export interface CardTitleProps {
  children: React.ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export const CardTitle: React.FC<CardTitleProps> = ({
  children,
  className = '',
  as: Component = 'h3'
}) => {
  return (
    <Component className={`card-title ${className}`}>
      {children}
    </Component>
  )
}

export interface CardActionsProps {
  children: React.ReactNode
  className?: string
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
}

export const CardActions: React.FC<CardActionsProps> = ({
  children,
  className = '',
  justify = 'start'
}) => {
  const getJustifyClass = () => {
    const justifies = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly'
    }
    return justifies[justify] || justifies.start
  }

  return (
    <div className={`card-actions ${getJustifyClass()} ${className}`}>
      {children}
    </div>
  )
}

export interface CardFigureProps {
  children: React.ReactNode
  className?: string
}

export const CardFigure: React.FC<CardFigureProps> = ({
  children,
  className = ''
}) => {
  return (
    <figure className={`card-figure ${className}`}>
      {children}
    </figure>
  )
}

/**
 * 統計カードコンポーネント
 */
export interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    label: string
    positive?: boolean
  }
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  trend,
  className = ''
}) => {
  return (
    <Card className={`stat ${className}`}>
      <CardBody>
        <div className="stat-figure text-primary">
          {icon}
        </div>
        <div className="stat-title">{title}</div>
        <div className="stat-value text-primary">{value}</div>
        {description && (
          <div className="stat-desc">{description}</div>
        )}
        {trend && (
          <div className={`stat-desc ${trend.positive ? 'text-success' : 'text-error'}`}>
            {trend.positive ? '↗︎' : '↘︎'} {trend.value}% {trend.label}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
