/**
 * より高度な動的バックエンドURL取得
 * 複数の方法でバックエンドURLを特定
 */

interface BackendConfig {
  host: string
  port: string
  protocol: string
}

/**
 * 現在のアクセスURLからバックエンドURLを推測
 */
function getBackendUrlFromCurrentLocation(): BackendConfig {
  if (typeof window === 'undefined') {
    // サーバーサイド
    return {
      host: process.env.BACKEND_HOST || 'localhost',
      port: process.env.BACKEND_PORT || '7776',
      protocol: 'http'
    }
  }

  // クライアントサイド
  const { protocol, hostname } = window.location
  const port = process.env.NEXT_PUBLIC_BACKEND_PORT || '7776'
  
  return {
    host: hostname,
    port,
    protocol: protocol.replace(':', '')
  }
}

/**
 * 環境変数からバックエンドURLを取得
 */
function getBackendUrlFromEnv(): BackendConfig | null {
  const backendIp = process.env.NEXT_PUBLIC_BACKEND_IP
  if (!backendIp) return null

  try {
    const url = new URL(backendIp)
    return {
      host: url.hostname,
      port: url.port || (url.protocol === 'https:' ? '443' : '80'),
      protocol: url.protocol.replace(':', '')
    }
  } catch {
    return null
  }
}

/**
 * バックエンドURLを構築
 */
function buildBackendUrl(config: BackendConfig): string {
  const { protocol, host, port } = config
  const defaultPort = protocol === 'https' ? '443' : '80'
  
  if (port === defaultPort) {
    return `${protocol}://${host}`
  }
  return `${protocol}://${host}:${port}`
}

/**
 * 動的にバックエンドURLを取得
 * 優先順位: 環境変数 > 現在のアクセスURL
 */
export function getDynamicBackendUrl(): string {
  // 1. 環境変数から取得を試行
  const envConfig = getBackendUrlFromEnv()
  if (envConfig) {
    return buildBackendUrl(envConfig)
  }

  // 2. 現在のアクセスURLから推測
  const currentConfig = getBackendUrlFromCurrentLocation()
  return buildBackendUrl(currentConfig)
}

/**
 * バックエンドURLの検証
 */
export async function validateBackendUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5秒でタイムアウト
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * 利用可能なバックエンドURLを自動検出
 */
export async function detectBackendUrl(): Promise<string | null> {
  const candidates = [
    getDynamicBackendUrl(),
    // よく使用されるポートを試行
    'http://localhost:7776',
    'http://localhost:8000',
    'http://127.0.0.1:7776',
    'http://127.0.0.1:8000'
  ]

  for (const url of candidates) {
    if (await validateBackendUrl(url)) {
      return url
    }
  }

  return null
}





