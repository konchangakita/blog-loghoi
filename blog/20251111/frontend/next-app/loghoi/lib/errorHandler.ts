/**
 * 統一エラーハンドリングユーティリティ
 */

export interface APIErrorResponse {
  status: 'error' | 'success'
  message: string
  operation: string
  error_code?: string
  details?: Record<string, any>
  timestamp: string
}

export interface APISuccessResponse<T = any> {
  status: 'success'
  message: string
  operation: string
  data: T
  timestamp: string
}

export class APIError extends Error {
  public statusCode: number
  public errorCode?: string
  public details?: Record<string, any>
  public operation?: string

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode?: string,
    details?: Record<string, any>,
    operation?: string
  ) {
    super(message)
    this.name = 'APIError'
    this.statusCode = statusCode
    this.errorCode = errorCode
    this.details = details
    this.operation = operation
  }
}

export class ValidationError extends APIError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', details, 'validation')
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 401, 'AUTHENTICATION_ERROR', details, 'authentication')
  }
}

export class AuthorizationError extends APIError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 403, 'AUTHORIZATION_ERROR', details, 'authorization')
  }
}

export class NotFoundError extends APIError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 404, 'NOT_FOUND_ERROR', details, 'not_found')
  }
}

export class ConflictError extends APIError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 409, 'CONFLICT_ERROR', details, 'conflict')
  }
}

export class ServiceUnavailableError extends APIError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 503, 'SERVICE_UNAVAILABLE_ERROR', details, 'service_unavailable')
  }
}

/**
 * HTTPレスポンスを解析してエラーを判定
 */
export function parseAPIResponse<T = any>(
  response: Response,
  operation: string
): Promise<APISuccessResponse<T>> {
  return response.json().then((data: APIErrorResponse | APISuccessResponse<T>) => {
    if (data.status === 'error') {
      const errorData = data as APIErrorResponse
      throw createErrorFromResponse(errorData, operation)
    }
    return data as APISuccessResponse<T>
  })
}

/**
 * APIエラーレスポンスから適切なエラークラスを作成
 */
export function createErrorFromResponse(errorData: APIErrorResponse, operation: string): APIError {
  const { error_code, message, details } = errorData

  switch (error_code) {
    case 'VALIDATION_ERROR':
      return new ValidationError(message, details)
    case 'AUTHENTICATION_ERROR':
      return new AuthenticationError(message, details)
    case 'AUTHORIZATION_ERROR':
      return new AuthorizationError(message, details)
    case 'NOT_FOUND_ERROR':
      return new NotFoundError(message, details)
    case 'CONFLICT_ERROR':
      return new ConflictError(message, details)
    case 'SERVICE_UNAVAILABLE_ERROR':
      return new ServiceUnavailableError(message, details)
    default:
      return new APIError(message, 500, error_code, details, operation)
  }
}

/**
 * ユーザーフレンドリーなエラーメッセージを生成
 */
export function getUserFriendlyMessage(error: Error): string {
  if (error instanceof ValidationError) {
    return `入力内容に問題があります: ${error.message}`
  }
  
  if (error instanceof AuthenticationError) {
    return `認証に失敗しました: ${error.message}`
  }
  
  if (error instanceof AuthorizationError) {
    return `アクセス権限がありません: ${error.message}`
  }
  
  if (error instanceof NotFoundError) {
    return `データが見つかりません: ${error.message}`
  }
  
  if (error instanceof ConflictError) {
    return `操作が競合しています: ${error.message}`
  }
  
  if (error instanceof ServiceUnavailableError) {
    return `サービスが一時的に利用できません: ${error.message}`
  }
  
  if (error instanceof APIError) {
    return `APIエラー: ${error.message}`
  }
  
  // ネットワークエラーやその他のエラー
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return 'ネットワーク接続に問題があります。インターネット接続を確認してください。'
  }
  
  if (error.name === 'AbortError') {
    return 'リクエストがタイムアウトしました。しばらく待ってから再試行してください。'
  }
  
  return `予期しないエラーが発生しました: ${error.message}`
}

/**
 * エラーログを出力
 */
export function logError(error: Error, context?: Record<string, any>): void {
  console.error('❌ エラーが発生しました:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  })
}

/**
 * エラーをユーザーに表示するためのアラートを生成
 */
export function createErrorAlert(error: Error): {
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
  details?: string
} {
  const userMessage = getUserFriendlyMessage(error)
  
  if (error instanceof ValidationError) {
    return {
      type: 'warning',
      title: '入力エラー',
      message: userMessage,
      details: error.details ? JSON.stringify(error.details, null, 2) : undefined
    }
  }
  
  if (error instanceof AuthenticationError) {
    return {
      type: 'error',
      title: '認証エラー',
      message: userMessage
    }
  }
  
  if (error instanceof AuthorizationError) {
    return {
      type: 'error',
      title: 'アクセス権限エラー',
      message: userMessage
    }
  }
  
  if (error instanceof NotFoundError) {
    return {
      type: 'warning',
      title: 'データが見つかりません',
      message: userMessage
    }
  }
  
  if (error instanceof ServiceUnavailableError) {
    return {
      type: 'error',
      title: 'サービス利用不可',
      message: userMessage
    }
  }
  
  return {
    type: 'error',
    title: 'エラー',
    message: userMessage,
    details: error.stack
  }
}

/**
 * 必須フィールドのバリデーション
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(
    field => !data[field] || data[field] === ''
  )
  
  if (missingFields.length > 0) {
    throw new ValidationError(
      `必須フィールドが不足しています: ${missingFields.join(', ')}`,
      { missingFields }
    )
  }
}

/**
 * HTTPステータスコードからエラークラスを判定
 */
export function createErrorFromStatus(
  status: number,
  message: string,
  operation: string
): APIError {
  switch (status) {
    case 400:
      return new ValidationError(message)
    case 401:
      return new AuthenticationError(message)
    case 403:
      return new AuthorizationError(message)
    case 404:
      return new NotFoundError(message)
    case 409:
      return new ConflictError(message)
    case 503:
      return new ServiceUnavailableError(message)
    default:
      return new APIError(message, status, 'HTTP_ERROR', undefined, operation)
  }
}
