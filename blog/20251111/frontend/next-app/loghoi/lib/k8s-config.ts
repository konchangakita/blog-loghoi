/**
 * Kubernetes環境用の設定管理
 */

export interface K8sConfig {
  // アプリケーション設定
  appName: string
  appVersion: string
  debug: boolean
  
  // サーバー設定
  backendHost: string
  backendPort: number
  frontendPort: number
  
  // API設定
  apiBaseUrl: string
  websocketUrl: string
  
  // 環境設定
  environment: 'development' | 'staging' | 'production'
  namespace?: string
  podName?: string
  podIp?: string
  
  // 機能フラグ
  features: {
    realtimeLogs: boolean
    logCollection: boolean
    uuidExplorer: boolean
    syslogSearch: boolean
  }
  
  // パフォーマンス設定
  maxFileSize: string
  timeout: number
  retryAttempts: number
}

class ConfigManager {
  private config: K8sConfig

  constructor() {
    this.config = this.loadConfig()
  }

  private loadConfig(): K8sConfig {
    // 環境変数から設定を読み込み
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'LogHoi'
    const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || 'v1.0.0'
    const debug = process.env.NEXT_PUBLIC_DEBUG === 'true'
    
    const backendHost = process.env.NEXT_PUBLIC_BACKEND_HOST || 'localhost'
    const backendPort = parseInt(process.env.NEXT_PUBLIC_BACKEND_PORT || '7776')
    const frontendPort = parseInt(process.env.NEXT_PUBLIC_FRONTEND_PORT || '3000')
    
    // API URLの構築
    const apiBaseUrl = this.buildApiUrl(backendHost, backendPort)
    const websocketUrl = this.buildWebSocketUrl(backendHost, backendPort)
    
    // 環境の判定
    const environment = this.determineEnvironment(debug)
    
    // 機能フラグ
    const features = {
      realtimeLogs: process.env.NEXT_PUBLIC_FEATURE_REALTIME_LOGS !== 'false',
      logCollection: process.env.NEXT_PUBLIC_FEATURE_LOG_COLLECTION !== 'false',
      uuidExplorer: process.env.NEXT_PUBLIC_FEATURE_UUID_EXPLORER !== 'false',
      syslogSearch: process.env.NEXT_PUBLIC_FEATURE_SYSLOG_SEARCH !== 'false'
    }
    
    return {
      appName,
      appVersion,
      debug,
      backendHost,
      backendPort,
      frontendPort,
      apiBaseUrl,
      websocketUrl,
      environment,
      namespace: process.env.NEXT_PUBLIC_NAMESPACE,
      podName: process.env.NEXT_PUBLIC_POD_NAME,
      podIp: process.env.NEXT_PUBLIC_POD_IP,
      features,
      maxFileSize: process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '100MB',
      timeout: parseInt(process.env.NEXT_PUBLIC_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.NEXT_PUBLIC_RETRY_ATTEMPTS || '3')
    }
  }

  private buildApiUrl(host: string, port: number): string {
    // Kubernetes環境ではサービス名を使用
    if (process.env.NEXT_PUBLIC_NAMESPACE) {
      return `http://loghoi-backend-service:${port}/api`
    }
    
    // 開発環境ではlocalhostを使用
    return `http://${host}:${port}/api`
  }

  private buildWebSocketUrl(host: string, port: number): string {
    // Kubernetes環境ではサービス名を使用
    if (process.env.NEXT_PUBLIC_NAMESPACE) {
      return `http://loghoi-backend-service:${port}`
    }
    
    // 開発環境ではlocalhostを使用
    return `http://${host}:${port}`
  }

  private determineEnvironment(debug: boolean): 'development' | 'staging' | 'production' {
    const namespace = process.env.NEXT_PUBLIC_NAMESPACE
    
    if (debug || namespace === 'loghoi-dev') {
      return 'development'
    }
    
    if (namespace === 'loghoi-staging') {
      return 'staging'
    }
    
    return 'production'
  }

  public getConfig(): K8sConfig {
    return this.config
  }

  public getApiUrl(): string {
    return this.config.apiBaseUrl
  }

  public getWebSocketUrl(): string {
    return this.config.websocketUrl
  }

  public isFeatureEnabled(feature: keyof K8sConfig['features']): boolean {
    return this.config.features[feature]
  }

  public isDevelopment(): boolean {
    return this.config.environment === 'development'
  }

  public isProduction(): boolean {
    return this.config.environment === 'production'
  }

  public getMaxFileSizeBytes(): number {
    const sizeStr = this.config.maxFileSize.toUpperCase()
    if (sizeStr.endsWith('MB')) {
      return parseInt(sizeStr.slice(0, -2)) * 1024 * 1024
    } else if (sizeStr.endsWith('GB')) {
      return parseInt(sizeStr.slice(0, -2)) * 1024 * 1024 * 1024
    } else if (sizeStr.endsWith('KB')) {
      return parseInt(sizeStr.slice(0, -2)) * 1024
    } else {
      return parseInt(sizeStr)
    }
  }

  public getRetryConfig() {
    return {
      attempts: this.config.retryAttempts,
      delay: 1000,
      backoff: 2
    }
  }
}

// グローバル設定インスタンス
export const k8sConfig = new ConfigManager()

// 便利な関数
export const getApiUrl = () => k8sConfig.getApiUrl()
export const getWebSocketUrl = () => k8sConfig.getWebSocketUrl()
export const isFeatureEnabled = (feature: keyof K8sConfig['features']) => 
  k8sConfig.isFeatureEnabled(feature)
export const isDevelopment = () => k8sConfig.isDevelopment()
export const isProduction = () => k8sConfig.isProduction()
