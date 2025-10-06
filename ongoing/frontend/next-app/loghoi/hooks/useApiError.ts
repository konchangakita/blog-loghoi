/**
 * 統一エラーハンドリングフック
 */
import { useState, useCallback } from 'react'
import { 
  APIError, 
  getUserFriendlyMessage, 
  logError, 
  createErrorAlert,
  type APIErrorResponse,
  type APISuccessResponse 
} from '../lib/errorHandler'

export interface ErrorState {
  error: APIError | null
  userMessage: string
  alert: {
    type: 'error' | 'warning' | 'info'
    title: string
    message: string
    details?: string
  } | null
}

export const useApiError = () => {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    userMessage: '',
    alert: null
  })

  const handleError = useCallback((error: Error, context?: Record<string, any>) => {
    logError(error, context)
    
    const userMessage = getUserFriendlyMessage(error)
    const alert = createErrorAlert(error)
    
    setErrorState({
      error: error instanceof APIError ? error : new APIError(error.message),
      userMessage,
      alert
    })
  }, [])

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      userMessage: '',
      alert: null
    })
  }, [])

  const handleApiResponse = useCallback(async <T = any>(
    response: Response,
    operation: string
  ): Promise<APISuccessResponse<T>> => {
    try {
      const data = await response.json()
      
      if (data.status === 'error') {
        const errorData = data as APIErrorResponse
        const error = new APIError(
          errorData.message,
          response.status,
          errorData.error_code,
          errorData.details,
          errorData.operation
        )
        handleError(error, { operation, responseStatus: response.status })
        throw error
      }
      
      return data as APISuccessResponse<T>
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }
      
      // JSON解析エラーやその他のエラー
      const apiError = new APIError(
        `APIレスポンスの処理中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        response.status,
        'RESPONSE_PARSE_ERROR',
        undefined,
        operation
      )
      handleError(apiError, { operation, responseStatus: response.status })
      throw apiError
    }
  }, [handleError])

  const handleFetchError = useCallback((error: Error, operation: string, context?: Record<string, any>) => {
    let apiError: APIError
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      apiError = new APIError(
        'ネットワーク接続に問題があります',
        0,
        'NETWORK_ERROR',
        { originalError: error.message },
        operation
      )
    } else if (error.name === 'AbortError') {
      apiError = new APIError(
        'リクエストがタイムアウトしました',
        408,
        'TIMEOUT_ERROR',
        { originalError: error.message },
        operation
      )
    } else {
      apiError = new APIError(
        error.message,
        500,
        'UNKNOWN_ERROR',
        { originalError: error.message },
        operation
      )
    }
    
    handleError(apiError, { operation, ...context })
    return apiError
  }, [handleError])

  return {
    errorState,
    handleError,
    clearError,
    handleApiResponse,
    handleFetchError
  }
}

/**
 * API呼び出し用の統一フック
 */
export const useApiCall = <T = any>() => {
  const { errorState, handleError, clearError, handleApiResponse, handleFetchError } = useApiError()
  const [loading, setLoading] = useState(false)

  const executeApiCall = useCallback(async (
    apiCall: () => Promise<Response>,
    operation: string,
    context?: Record<string, any>
  ): Promise<T | null> => {
    setLoading(true)
    clearError()

    try {
      const response = await apiCall()
      
      if (!response.ok) {
        const error = new APIError(
          `HTTP error! status: ${response.status}`,
          response.status,
          'HTTP_ERROR',
          undefined,
          operation
        )
        handleError(error, { operation, responseStatus: response.status, ...context })
        return null
      }

      const result = await handleApiResponse<T>(response, operation)
      return result.data
    } catch (error) {
      if (error instanceof APIError) {
        return null
      }
      
      const apiError = handleFetchError(error as Error, operation, context)
      return null
    } finally {
      setLoading(false)
    }
  }, [handleError, clearError, handleApiResponse, handleFetchError])

  return {
    loading,
    errorState,
    executeApiCall,
    clearError
  }
}
