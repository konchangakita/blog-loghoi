/**
 * Kubernetes ConfigMap/Secret対応の設定管理
 * 環境変数、ConfigMap、Secretを統合的に管理
 */

export interface AppConfig {
  // バックエンド設定
  backend: {
    url: string
    host: string
    port: string
    protocol: string
    timeout: number
    retryAttempts: number
  }
  
  // 認証設定
  auth: {
    enabled: boolean
    token?: string
    secretKey?: string
  }
  
  // ログ設定
  logging: {
    level: string
    enableConsole: boolean
    enableRemote: boolean
  }
  
  // 機能フラグ
  features: {
    enableRealtimeLogs: boolean
    enableChatRoom: boolean
    enableHealthCheck: boolean
  }
  
  // 環境情報
  environment: {
    isProduction: boolean
    isKubernetes: boolean
    namespace: string
    cluster: string
  }
}

/**
 * 環境変数から設定を読み込み
 */
function loadConfigFromEnv(): Partial<AppConfig> {
  return {
    backend: {
      url: process.env.NEXT_PUBLIC_BACKEND_URL || '',
      host: process.env.NEXT_PUBLIC_BACKEND_HOST || 
            process.env.BACKEND_SERVICE_HOST || 
            'localhost',
      port: process.env.NEXT_PUBLIC_BACKEND_PORT || 
            process.env.BACKEND_SERVICE_PORT || 
            '7776',
      protocol: process.env.NEXT_PUBLIC_BACKEND_PROTOCOL || 
                process.env.BACKEND_PROTOCOL || 
                'http',
      timeout: parseInt(process.env.BACKEND_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.BACKEND_RETRY_ATTEMPTS || '3')
    },
    
    auth: {
      enabled: process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true',
      token: process.env.NEXT_PUBLIC_AUTH_TOKEN,
      secretKey: process.env.AUTH_SECRET_KEY
    },
    
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      enableConsole: process.env.LOG_CONSOLE !== 'false',
      enableRemote: process.env.LOG_REMOTE === 'true'
    },
    
    features: {
      enableRealtimeLogs: process.env.NEXT_PUBLIC_FEATURE_REALTIME_LOGS !== 'false',
      enableChatRoom: process.env.NEXT_PUBLIC_FEATURE_CHAT_ROOM === 'true',
      enableHealthCheck: process.env.NEXT_PUBLIC_FEATURE_HEALTH_CHECK !== 'false'
    },
    
    environment: {
      isProduction: process.env.NODE_ENV === 'production',
      isKubernetes: !!process.env.KUBERNETES_SERVICE_HOST,
      namespace: process.env.KUBERNETES_NAMESPACE || 'default',
      cluster: process.env.KUBERNETES_CLUSTER || 'unknown'
    }
  }
}

/**
 * デフォルト設定
 */
function getDefaultConfig(): AppConfig {
  return {
    backend: {
      url: 'http://localhost:7776',
      host: 'localhost',
      port: '7776',
      protocol: 'http',
      timeout: 30000,
      retryAttempts: 3
    },
    
    auth: {
      enabled: false
    },
    
    logging: {
      level: 'info',
      enableConsole: true,
      enableRemote: false
    },
    
    features: {
      enableRealtimeLogs: true,
      enableChatRoom: false,
      enableHealthCheck: true
    },
    
    environment: {
      isProduction: false,
      isKubernetes: false,
      namespace: 'default',
      cluster: 'unknown'
    }
  }
}

/**
 * 設定をマージ
 */
function mergeConfig(defaultConfig: AppConfig, envConfig: Partial<AppConfig>): AppConfig {
  return {
    backend: {
      ...defaultConfig.backend,
      ...envConfig.backend
    },
    auth: {
      ...defaultConfig.auth,
      ...envConfig.auth
    },
    logging: {
      ...defaultConfig.logging,
      ...envConfig.logging
    },
    features: {
      ...defaultConfig.features,
      ...envConfig.features
    },
    environment: {
      ...defaultConfig.environment,
      ...envConfig.environment
    }
  }
}

/**
 * 設定を検証
 */
function validateConfig(config: AppConfig): string[] {
  const errors: string[] = []
  
  // バックエンド設定の検証
  if (!config.backend.host) {
    errors.push('Backend host is required')
  }
  
  if (!config.backend.port || isNaN(parseInt(config.backend.port))) {
    errors.push('Backend port must be a valid number')
  }
  
  if (!['http', 'https'].includes(config.backend.protocol)) {
    errors.push('Backend protocol must be http or https')
  }
  
  // 認証設定の検証
  if (config.auth.enabled && !config.auth.token && !config.auth.secretKey) {
    errors.push('Auth token or secret key is required when auth is enabled')
  }
  
  // ログレベルの検証
  const validLogLevels = ['error', 'warn', 'info', 'debug']
  if (!validLogLevels.includes(config.logging.level)) {
    errors.push(`Log level must be one of: ${validLogLevels.join(', ')}`)
  }
  
  return errors
}

/**
 * 設定マネージャークラス
 */
export class ConfigManager {
  private config: AppConfig
  private listeners: Array<(config: AppConfig) => void> = []

  constructor() {
    const defaultConfig = getDefaultConfig()
    const envConfig = loadConfigFromEnv()
    this.config = mergeConfig(defaultConfig, envConfig)
    
    // 設定を検証
    const errors = validateConfig(this.config)
    if (errors.length > 0) {
      console.warn('Configuration validation errors:', errors)
    }
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): AppConfig {
    return { ...this.config }
  }

  /**
   * 特定の設定値を取得
   */
  getValue<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key]
  }

  /**
   * ネストされた設定値を取得
   */
  getNestedValue<K extends keyof AppConfig, T extends keyof AppConfig[K]>(
    section: K, 
    key: T
  ): AppConfig[K][T] {
    return this.config[section][key]
  }

  /**
   * 設定変更リスナーを登録
   */
  addChangeListener(listener: (config: AppConfig) => void): void {
    this.listeners.push(listener)
  }

  /**
   * 設定変更リスナーを削除
   */
  removeChangeListener(listener: (config: AppConfig) => void): void {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  /**
   * 設定を更新
   */
  updateConfig(updates: Partial<AppConfig>): void {
    const oldConfig = { ...this.config }
    this.config = mergeConfig(this.config, updates)
    
    // リスナーに通知
    this.listeners.forEach(listener => listener(this.config))
    
    console.log('Configuration updated:', {
      old: oldConfig,
      new: this.config
    })
  }

  /**
   * 設定をリロード
   */
  reloadConfig(): void {
    const envConfig = loadConfigFromEnv()
    this.updateConfig(envConfig)
  }

  /**
   * 設定をデバッグ出力
   */
  debugConfig(): void {
    console.log('Current configuration:', {
      ...this.config,
      // 機密情報はマスク
      auth: {
        ...this.config.auth,
        token: this.config.auth.token ? '***' : undefined,
        secretKey: this.config.auth.secretKey ? '***' : undefined
      }
    })
  }

  /**
   * 環境情報を取得
   */
  getEnvironmentInfo(): Record<string, any> {
    return {
      ...this.config.environment,
      nodeEnv: process.env.NODE_ENV,
      kubernetesServiceHost: process.env.KUBERNETES_SERVICE_HOST,
      kubernetesNamespace: process.env.KUBERNETES_NAMESPACE,
      kubernetesPodName: process.env.KUBERNETES_POD_NAME,
      kubernetesPodIP: process.env.KUBERNETES_POD_IP
    }
  }
}

/**
 * シングルトンインスタンス
 */
let configManagerInstance: ConfigManager | null = null

/**
 * 設定マネージャーインスタンスを取得
 */
export function getConfigManager(): ConfigManager {
  if (!configManagerInstance) {
    configManagerInstance = new ConfigManager()
  }
  return configManagerInstance
}

/**
 * バックエンドURLを取得
 */
export function getBackendUrl(): string {
  const config = getConfigManager().getConfig()
  
  if (config.backend.url) {
    return config.backend.url
  }
  
  const { protocol, host, port } = config.backend
  const defaultPorts = { 'http': '80', 'https': '443' }
  const defaultPort = defaultPorts[protocol as keyof typeof defaultPorts]
  
  let url = `${protocol}://${host}`
  if (port !== defaultPort) {
    url += `:${port}`
  }
  
  return url
}





