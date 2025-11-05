/**
 * 統合的なバックエンドURL管理システム
 * Kubernetes、Docker、ローカル環境を統合的にサポート
 */

import { getConfigManager } from './configManager'
import { getServiceDiscovery } from './serviceDiscovery'
import { getHealthCheckManager } from './healthCheck'

export interface BackendUrlOptions {
  // フォールバック設定
  enableFallback?: boolean
  fallbackUrls?: string[]
  
  // ヘルスチェック設定
  enableHealthCheck?: boolean
  healthCheckTimeout?: number
  
  // キャッシュ設定
  enableCache?: boolean
  cacheTimeout?: number
  
  // リトライ設定
  enableRetry?: boolean
  retryAttempts?: number
  retryDelay?: number
}

export interface BackendUrlResult {
  url: string
  source: 'config' | 'service-discovery' | 'fallback' | 'default'
  available: boolean
  responseTime?: number
  error?: string
}

/**
 * バックエンドURLマネージャー
 */
export class BackendUrlManager {
  private config = getConfigManager()
  private serviceDiscovery = getServiceDiscovery()
  private healthCheck = getHealthCheckManager()
  private cache: Map<string, BackendUrlResult> = new Map()
  private cacheTimeout = 30000 // 30秒

  /**
   * バックエンドURLを取得
   */
  async getBackendUrl(options: BackendUrlOptions = {}): Promise<BackendUrlResult> {
    const {
      enableFallback = true,
      fallbackUrls = [],
      enableHealthCheck = true,
      healthCheckTimeout = 5000,
      enableCache = true,
      cacheTimeout = this.cacheTimeout,
      enableRetry = true,
      retryAttempts = 3,
      retryDelay = 1000
    } = options

    // キャッシュをチェック
    if (enableCache) {
      const cached = this.getCachedUrl()
      if (cached && this.isCacheValid(cached, cacheTimeout)) {
        return cached
      }
    }

    // 複数の方法でURLを取得
    const candidates = this.generateUrlCandidates(fallbackUrls)
    
    for (const candidate of candidates) {
      try {
        const result = await this.validateUrl(candidate, {
          enableHealthCheck,
          healthCheckTimeout,
          enableRetry,
          retryAttempts,
          retryDelay
        })
        
        if (result.available) {
          // キャッシュに保存
          if (enableCache) {
            this.cache.set('backend-url', result)
          }
          return result
        }
      } catch (error) {
        console.warn(`URL validation failed for ${candidate}:`, error)
      }
    }

    // フォールバック: 設定されたURLを返す
    const fallbackResult: BackendUrlResult = {
      url: this.getConfigUrl(),
      source: 'config',
      available: false,
      error: 'All URL candidates failed validation'
    }
    
    if (enableCache) {
      this.cache.set('backend-url', fallbackResult)
    }
    
    return fallbackResult
  }

  /**
   * URL候補を生成
   */
  private generateUrlCandidates(fallbackUrls: string[]): string[] {
    const candidates: string[] = []
    
    // 1. 設定から取得
    const configUrl = this.getConfigUrl()
    if (configUrl) {
      candidates.push(configUrl)
    }
    
    // 2. サービス検出から取得
    const serviceUrl = this.getServiceDiscoveryUrl()
    if (serviceUrl) {
      candidates.push(serviceUrl)
    }
    
    // 3. フォールバックURL
    candidates.push(...fallbackUrls)
    
    // 4. デフォルトURL
    candidates.push('http://localhost:7776')
    
    // 重複を削除
    return Array.from(new Set(candidates))
  }

  /**
   * 設定からURLを取得
   */
  private getConfigUrl(): string {
    const backendConfig = this.config.getNestedValue('backend', 'url')
    if (backendConfig) {
      return backendConfig
    }
    
    const host = this.config.getNestedValue('backend', 'host')
    const port = this.config.getNestedValue('backend', 'port')
    const protocol = this.config.getNestedValue('backend', 'protocol')
    
    const defaultPorts = { 'http': '80', 'https': '443' }
    const defaultPort = defaultPorts[protocol as keyof typeof defaultPorts]
    
    let url = `${protocol}://${host}`
    if (port !== defaultPort) {
      url += `:${port}`
    }
    return url
  }

  /**
   * サービス検出からURLを取得
   */
  private getServiceDiscoveryUrl(): string | null {
    // サービス検出の実装は非同期なので、ここでは設定から取得
    return null
  }

  /**
   * URLを検証
   */
  private async validateUrl(
    url: string, 
    options: {
      enableHealthCheck: boolean
      healthCheckTimeout: number
      enableRetry: boolean
      retryAttempts: number
      retryDelay: number
    }
  ): Promise<BackendUrlResult> {
    const { enableHealthCheck, healthCheckTimeout, enableRetry, retryAttempts, retryDelay } = options
    
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= (enableRetry ? retryAttempts : 1); attempt++) {
      try {
        const startTime = Date.now()
        
        if (enableHealthCheck) {
          const response = await this.checkHealth(url, healthCheckTimeout)
          if (response.ok) {
            return {
              url,
              source: this.determineSource(url),
              available: true,
              responseTime: Date.now() - startTime
            }
          }
        } else {
          // ヘルスチェックなしで単純に接続テスト
          const response = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(healthCheckTimeout)
          })
          
          if (response.ok) {
            return {
              url,
              source: this.determineSource(url),
              available: true,
              responseTime: Date.now() - startTime
            }
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < retryAttempts) {
          await this.delay(retryDelay)
        }
      }
    }
    
    return {
      url,
      source: this.determineSource(url),
      available: false,
      error: lastError?.message || 'Validation failed'
    }
  }

  /**
   * ヘルスチェックを実行
   */
  private async checkHealth(url: string, timeout: number): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'loghoi-backend-url-manager'
        }
      })
      
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  /**
   * URLのソースを判定
   */
  private determineSource(url: string): BackendUrlResult['source'] {
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return 'default'
    }
    
    if (url.includes('.svc.cluster.local') || url.includes('.svc')) {
      return 'service-discovery'
    }
    
    return 'config'
  }

  /**
   * キャッシュからURLを取得
   */
  private getCachedUrl(): BackendUrlResult | null {
    return this.cache.get('backend-url') || null
  }

  /**
   * キャッシュの有効性をチェック
   */
  private isCacheValid(result: BackendUrlResult, timeout: number): boolean {
    return Date.now() - (result as any).timestamp < timeout
  }

  /**
   * 遅延関数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 現在のキャッシュ状態を取得
   */
  getCacheStatus(): Record<string, BackendUrlResult> {
    return Object.fromEntries(this.cache)
  }
}

/**
 * シングルトンインスタンス
 */
let backendUrlManagerInstance: BackendUrlManager | null = null

/**
 * バックエンドURLマネージャーインスタンスを取得
 */
export function getBackendUrlManager(): BackendUrlManager {
  if (!backendUrlManagerInstance) {
    backendUrlManagerInstance = new BackendUrlManager()
  }
  return backendUrlManagerInstance
}

/**
 * バックエンドURLを取得（簡易版）
 */
export async function getBackendUrl(options?: BackendUrlOptions): Promise<string> {
  const manager = getBackendUrlManager()
  const result = await manager.getBackendUrl(options)
  return result.url
}

/**
 * バックエンドURLを取得（詳細版）
 */
export async function getBackendUrlWithDetails(options?: BackendUrlOptions): Promise<BackendUrlResult> {
  const manager = getBackendUrlManager()
  return await manager.getBackendUrl(options)
}

/**
 * バックエンドが利用可能かどうか
 */
export async function isBackendAvailable(): Promise<boolean> {
  const result = await getBackendUrlWithDetails({ enableHealthCheck: true })
  return result.available
}




