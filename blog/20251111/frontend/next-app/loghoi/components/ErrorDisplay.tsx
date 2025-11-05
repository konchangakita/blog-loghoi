/**
 * 統一エラー表示コンポーネント
 */
import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle, faInfoCircle, faTimes } from '@fortawesome/free-solid-svg-icons'

interface ErrorDisplayProps {
  error: {
    type: 'error' | 'warning' | 'info'
    title: string
    message: string
    details?: string
  } | null
  onClose?: () => void
  className?: string
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onClose,
  className = ''
}) => {
  if (!error) return null

  const getIcon = () => {
    switch (error.type) {
      case 'error':
        return faExclamationTriangle
      case 'warning':
        return faExclamationTriangle
      case 'info':
        return faInfoCircle
      default:
        return faExclamationTriangle
    }
  }

  const getAlertClass = () => {
    switch (error.type) {
      case 'error':
        return 'alert-error'
      case 'warning':
        return 'alert-warning'
      case 'info':
        return 'alert-info'
      default:
        return 'alert-error'
    }
  }

  return (
    <div className={`alert ${getAlertClass()} ${className}`}>
      <div className="flex items-start">
        <FontAwesomeIcon 
          icon={getIcon()} 
          className="flex-shrink-0 mt-1 mr-3" 
          style={{ fontSize: '16px' }}
        />
        <div className="flex-1">
          <h3 className="font-bold text-sm">{error.title}</h3>
          <div className="text-sm mt-1">{error.message}</div>
          {error.details && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs opacity-75 hover:opacity-100">
                詳細情報を表示
              </summary>
              <pre className="mt-2 text-xs bg-base-200 p-2 rounded overflow-auto max-h-32">
                {error.details}
              </pre>
            </details>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="btn btn-sm btn-ghost btn-circle ml-2"
            aria-label="エラーを閉じる"
          >
            <FontAwesomeIcon icon={faTimes} style={{ fontSize: '12px' }} />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * インラインエラー表示コンポーネント（小さなエラーメッセージ用）
 */
interface InlineErrorProps {
  message: string
  className?: string
}

export const InlineError: React.FC<InlineErrorProps> = ({
  message,
  className = ''
}) => {
  if (!message) return null

  return (
    <div className={`text-error text-sm mt-1 ${className}`}>
      <FontAwesomeIcon 
        icon={faExclamationTriangle} 
        className="mr-1" 
        style={{ fontSize: '12px' }}
      />
      {message}
    </div>
  )
}

/**
 * ローディングエラー表示コンポーネント（ローディング中のエラー用）
 */
interface LoadingErrorProps {
  error: string | null
  onRetry?: () => void
  className?: string
}

export const LoadingError: React.FC<LoadingErrorProps> = ({
  error,
  onRetry,
  className = ''
}) => {
  if (!error) return null

  return (
    <div className={`text-center py-8 ${className}`}>
      <div className="alert alert-error max-w-md mx-auto">
        <FontAwesomeIcon icon={faExclamationTriangle} />
        <div>
          <h3 className="font-bold">エラーが発生しました</h3>
          <div className="text-sm">{error}</div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="btn btn-sm btn-primary mt-3"
            >
              再試行
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
