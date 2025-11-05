/**
 * Kubernetes Service Discovery対応のバックエンドURL管理
 * DNS、環境変数、ConfigMapを統合的に活用
 */

import { getK8sConfig, type K8sBackendConfig } from './k8sBackendConfig'

export interface ServiceEndpoint {
  url: string
  available: boolean
  lastChecked: number
  responseTime?: number
}

export interface ServiceDiscoveryConfig {
  // サービス設定
  serviceName: string
  namespace: string
  port: string
  protocol: string
  
  // 検出設定
  discoveryTimeout: number
  cacheTimeout: number
  maxRetries: number
  
  // ヘルスチェック設定
  healthCheckPath: string
  healthCheckInterval: number
}

/**
 * Kubernetes環境でのサービス検出
 */
export class KubernetesServiceDiscovery {
  private config: ServiceDiscoveryConfig
  private cache: Map<string, ServiceEndpoint> = new Map()
  private healthCheckInterval?: NodeJS.Timeout

  constructor(config?: Partial<ServiceDiscoveryConfig>) {
    const k8sConfig = getK8sConfig()
    
    this.config = {
      serviceName: config?.serviceName || k8sConfig.serviceName || 'backend-service',
      namespace: config?.namespace || k8sConfig.namespace || 'default',
      port: config?.port || k8sConfig.port || '7776',
      protocol: config?.protocol || k8sConfig.protocol || 'http',
      discoveryTimeout: config?.discoveryTimeout || 5000,
      cacheTimeout: config?.cacheTimeout || 30000, // 30秒
      maxRetries: config?.maxRetries || 3,
      healthCheckPath: config?.healthCheckPath || '/health',
      healthCheckInterval: config?.healthCheckInterval || 60000 // 1分
    }
  }

  /**
   * サービスエンドポイントを検出
   */
  async discoverService(): Promise<ServiceEndpoint | null> {
    const cacheKey = `${this.config.serviceName}.${this.config.namespace}`
    const cached = this.cache.get(cacheKey)
    
    // キャッシュが有効な場合はそれを返す
    if (cached && this.isCacheValid(cached)) {
      return cached
    }

    // 複数の候補URLを生成
    const candidates = this.generateCandidateUrls()
    
    for (const url of candidates) {
      try {
        const available = await this.checkEndpointAvailability(url)
        if (available) {
          const endpoint: ServiceEndpoint = {
            url,
            available: true,
            lastChecked: Date.now(),
            responseTime: await this.measureResponseTime(url)
          }
          
          this.cache.set(cacheKey, endpoint)
          return endpoint
        }
      } catch (error) {
        console.warn(`Service discovery failed for ${url}:`, error)
      }
    }

    return null
  }

  /**
   * 候補URLを生成
   */
  private generateCandidateUrls(): string[] {
    const { serviceName, namespace, port, protocol } = this.config
    
    return [
      // Kubernetes内部DNS名
      `${protocol}://${serviceName}.${namespace}.svc.cluster.local:${port}`,
      `${protocol}://${serviceName}.${namespace}.svc:${port}`,
      `${protocol}://${serviceName}:${port}`,
      
      // 環境変数から取得
      process.env.NEXT_PUBLIC_BACKEND_URL || '',
      process.env.BACKEND_SERVICE_URL || '',
      
      // フォールバック
      `${protocol}://localhost:${port}`,
      `${protocol}://127.0.0.1:${port}`
    ].filter(url => url && url !== '')
  }

  /**
   * エンドポイントの可用性をチェック
   */
  private async checkEndpointAvailability(url: string): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.discoveryTimeout)
      
      const response = await fetch(`${url}${this.config.healthCheckPath}`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'loghoi-service-discovery'
        }
      })
      
      clearTimeout(timeoutId)
      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * レスポンス時間を測定
   */
  private async measureResponseTime(url: string): Promise<number> {
    const startTime = Date.now()
    try {
      await fetch(`${url}${this.config.healthCheckPath}`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.discoveryTimeout)
      })
      return Date.now() - startTime
    } catch {
      return -1
    }
  }

  /**
   * キャッシュの有効性をチェック
   */
  private isCacheValid(endpoint: ServiceEndpoint): boolean {
    return Date.now() - endpoint.lastChecked < this.config.cacheTimeout
  }

  /**
   * ヘルスチェックを開始
   */
  startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    this.healthCheckInterval = setInterval(async () => {
      const cacheKey = `${this.config.serviceName}.${this.config.namespace}`
      const cached = this.cache.get(cacheKey)
      
      if (cached) {
        const available = await this.checkEndpointAvailability(cached.url)
        if (!available) {
          this.cache.delete(cacheKey)
          console.warn(`Service ${cacheKey} is no longer available`)
        }
      }
    }, this.config.healthCheckInterval)
  }

  /**
   * ヘルスチェックを停止
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = undefined
    }
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
  getCacheStatus(): Record<string, ServiceEndpoint> {
    return Object.fromEntries(this.cache)
  }
}

/**
 * シングルトンインスタンス
 */
let serviceDiscoveryInstance: KubernetesServiceDiscovery | null = null

/**
 * サービス検出インスタンスを取得
 */
export function getServiceDiscovery(): KubernetesServiceDiscovery {
  if (!serviceDiscoveryInstance) {
    serviceDiscoveryInstance = new KubernetesServiceDiscovery()
  }
  return serviceDiscoveryInstance
}

/**
 * 利用可能なバックエンドURLを取得
 */
export async function getAvailableBackendUrl(): Promise<string | null> {
  const discovery = getServiceDiscovery()
  const endpoint = await discovery.discoverService()
  return endpoint?.url || null
}

/**
 * サービス検出を初期化
 */
export function initializeServiceDiscovery(): void {
  const discovery = getServiceDiscovery()
  discovery.startHealthCheck()
}

/**
 * サービス検出を停止
 */
export function shutdownServiceDiscovery(): void {
  const discovery = getServiceDiscovery()
  discovery.stopHealthCheck()
}







