/**
 * Kubernetes対応のバックエンドURL設定管理
 * ConfigMap、Service Discovery、環境変数を統合的に管理
 */

export interface BackendConfig {
  host: string
  port: string
  protocol: string
  namespace?: string
  serviceName?: string
  path?: string
}

export interface K8sBackendConfig {
  // 基本設定
  host: string
  port: string
  protocol: string
  
  // Kubernetes固有設定
  namespace?: string
  serviceName?: string
  path?: string
  
  // フォールバック設定
  fallbackUrls?: string[]
  
  // ヘルスチェック設定
  healthCheckPath?: string
  healthCheckTimeout?: number
  
  // 接続設定
  retryAttempts?: number
  retryDelay?: number
}

/**
 * Kubernetes環境変数から設定を取得
 * 優先順位: 環境変数 > デフォルト値
 */
function getK8sConfig(): K8sBackendConfig {
  return {
    // 基本設定（環境変数から取得）
    host: process.env.NEXT_PUBLIC_BACKEND_HOST || 
          process.env.BACKEND_SERVICE_HOST || 
          'localhost',
    
    port: process.env.NEXT_PUBLIC_BACKEND_PORT || 
          process.env.BACKEND_SERVICE_PORT || 
          '7776',
    
    protocol: process.env.NEXT_PUBLIC_BACKEND_PROTOCOL || 
              process.env.BACKEND_PROTOCOL || 
              'http',
    
    // Kubernetes固有設定
    namespace: process.env.BACKEND_NAMESPACE || 'default',
    serviceName: process.env.BACKEND_SERVICE_NAME || 'backend-service',
    path: process.env.BACKEND_PATH || '',
    
    // フォールバック設定
    fallbackUrls: process.env.BACKEND_FALLBACK_URLS?.split(',') || [
      'http://localhost:7776',
      'http://127.0.0.1:7776'
    ],
    
    // ヘルスチェック設定
    healthCheckPath: process.env.BACKEND_HEALTH_CHECK_PATH || '/health',
    healthCheckTimeout: parseInt(process.env.BACKEND_HEALTH_CHECK_TIMEOUT || '5000'),
    
    // 接続設定
    retryAttempts: parseInt(process.env.BACKEND_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.BACKEND_RETRY_DELAY || '1000')
  }
}

/**
 * Kubernetes Service Discovery URLを構築
 */
function buildK8sServiceUrl(config: K8sBackendConfig): string {
  const { protocol, host, port, path } = config
  
  // 完全なURLが指定されている場合
  if (host.startsWith('http')) {
    return host
  }
  
  // ポートがデフォルトポートの場合
  const defaultPorts = { 'http': '80', 'https': '443' }
  const defaultPort = defaultPorts[protocol as keyof typeof defaultPorts]
  
  let url = `${protocol}://${host}`
  if (port !== defaultPort) {
    url += `:${port}`
  }
  
  if (path) {
    url += path.startsWith('/') ? path : `/${path}`
  }
  
  return url
}

/**
 * 環境に応じたバックエンドURLを取得
 */
export function getBackendUrl(): string {
  const config = getK8sConfig()
  
  // 1. 完全なURLが環境変数で指定されている場合
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL
  }
  
  // 2. Kubernetes Service Discovery URLを構築
  return buildK8sServiceUrl(config)
}

/**
 * 複数の候補URLから利用可能なものを検出
 */
export async function detectAvailableBackendUrl(): Promise<string | null> {
  const config = getK8sConfig()
  const candidates = [
    getBackendUrl(),
    ...(config.fallbackUrls || [])
  ]
  
  for (const url of candidates) {
    if (await isBackendAvailable(url, config)) {
      return url
    }
  }
  
  return null
}

/**
 * バックエンドの可用性をチェック
 */
export async function isBackendAvailable(
  url: string, 
  config?: K8sBackendConfig
): Promise<boolean> {
  const k8sConfig = config || getK8sConfig()
  const healthCheckPath = k8sConfig.healthCheckPath || '/health'
  const timeout = k8sConfig.healthCheckTimeout || 5000
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(`${url}${healthCheckPath}`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'loghoi-frontend'
      }
    })
    
    clearTimeout(timeoutId)
    return response.ok
  } catch (error) {
    console.warn(`Backend health check failed for ${url}:`, error)
    return false
  }
}

/**
 * リトライ機能付きでバックエンドURLを取得
 */
export async function getBackendUrlWithRetry(): Promise<string> {
  const config = getK8sConfig()
  const retryAttempts = config.retryAttempts || 3
  const retryDelay = config.retryDelay || 1000
  
  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      const url = await detectAvailableBackendUrl()
      if (url) {
        console.log(`Backend URL detected: ${url} (attempt ${attempt})`)
        return url
      }
    } catch (error) {
      console.warn(`Backend detection attempt ${attempt} failed:`, error)
    }
    
    if (attempt < retryAttempts) {
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }
  }
  
  // フォールバック: 設定されたURLを返す
  const fallbackUrl = getBackendUrl()
  console.warn(`Using fallback backend URL: ${fallbackUrl}`)
  return fallbackUrl
}

/**
 * 環境情報を取得（デバッグ用）
 */
export function getEnvironmentInfo(): Record<string, any> {
  const config = getK8sConfig()
  
  return {
    environment: {
      isClient: typeof window !== 'undefined',
      isServer: typeof window === 'undefined',
      nodeEnv: process.env.NODE_ENV,
      isK8s: !!process.env.KUBERNETES_SERVICE_HOST
    },
    config: {
      host: config.host,
      port: config.port,
      protocol: config.protocol,
      namespace: config.namespace,
      serviceName: config.serviceName
    },
    urls: {
      primary: getBackendUrl(),
      fallbacks: config.fallbackUrls
    }
  }
}