/**
 * バックエンドヘルスチェック機能
 * Kubernetes環境でのサービス可用性監視
 */

import { getConfigManager } from './configManager'
import { getServiceDiscovery } from './serviceDiscovery'

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown'
  timestamp: number
  responseTime?: number
  error?: string
  details?: Record<string, any>
}

export interface HealthCheckConfig {
  enabled: boolean
  interval: number
  timeout: number
  retryAttempts: number
  endpoints: string[]
  onStatusChange?: (status: HealthStatus) => void
}

/**
 * ヘルスチェックマネージャー
 */
export class HealthCheckManager {
  private config: HealthCheckConfig
  private currentStatus: HealthStatus = {
    status: 'unknown',
    timestamp: Date.now()
  }
  private checkInterval?: NodeJS.Timeout
  private isRunning = false
  private changeListeners: Array<(status: HealthStatus) => void> = []

  constructor(config?: Partial<HealthCheckConfig>) {
    const appConfig = getConfigManager().getConfig()
    
    this.config = {
      enabled: config?.enabled ?? appConfig.features.enableHealthCheck,
      interval: config?.interval ?? 30000, // 30秒
      timeout: config?.timeout ?? 5000,   // 5秒
      retryAttempts: config?.retryAttempts ?? 3,
      endpoints: config?.endpoints ?? [getConfigManager().getValue('backend').url],
      onStatusChange: config?.onStatusChange
    }
  }

  /**
   * ヘルスチェックを開始
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Health check is already running')
      return
    }

    if (!this.config.enabled) {
      console.log('Health check is disabled')
      return
    }

    this.isRunning = true
    console.log('Starting health check with interval:', this.config.interval)
    
    // 即座に1回チェック
    this.performHealthCheck()
    
    // 定期チェックを開始
    this.checkInterval = setInterval(() => {
      this.performHealthCheck()
    }, this.config.interval)
  }

  /**
   * ヘルスチェックを停止
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = undefined
    }
    this.isRunning = false
    console.log('Health check stopped')
  }

  /**
   * ヘルスチェックを実行
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const status = await this.checkBackendHealth()
      this.updateStatus(status)
    } catch (error) {
      console.error('Health check failed:', error)
      this.updateStatus({
        status: 'unhealthy',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * バックエンドのヘルスをチェック
   */
  private async checkBackendHealth(): Promise<HealthStatus> {
    const startTime = Date.now()
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      for (const endpoint of this.config.endpoints) {
        try {
          const response = await this.checkEndpoint(endpoint)
          if (response.ok) {
            const responseTime = Date.now() - startTime
            return {
              status: 'healthy',
              timestamp: Date.now(),
              responseTime,
              details: {
                endpoint,
                attempt,
                statusCode: response.status
              }
            }
          }
        } catch (error) {
          console.warn(`Health check attempt ${attempt} failed for ${endpoint}:`, error)
        }
      }
      
      if (attempt < this.config.retryAttempts) {
        await this.delay(1000) // 1秒待機
      }
    }

    return {
      status: 'unhealthy',
      timestamp: Date.now(),
      error: 'All endpoints failed after retries',
      details: {
        attempts: this.config.retryAttempts,
        endpoints: this.config.endpoints
      }
    }
  }

  /**
   * エンドポイントをチェック
   */
  private async checkEndpoint(url: string): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'loghoi-health-check'
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
   * ステータスを更新
   */
  private updateStatus(newStatus: HealthStatus): void {
    const previousStatus = this.currentStatus.status
    this.currentStatus = newStatus

    // ステータスが変更された場合のみ通知
    if (previousStatus !== newStatus.status) {
      console.log(`Health status changed: ${previousStatus} -> ${newStatus.status}`)
      
      if (this.config.onStatusChange) {
        this.config.onStatusChange(newStatus)
      }
      
      // リスナーに通知
      this.notifyListeners()
    }
  }

  /**
   * 現在のステータスを取得
   */
  getStatus(): HealthStatus {
    return { ...this.currentStatus }
  }

  /**
   * ヘルスチェックが実行中かどうか
   */
  isActive(): boolean {
    return this.isRunning
  }

  /**
   * 設定を更新
   */
  updateConfig(updates: Partial<HealthCheckConfig>): void {
    this.config = { ...this.config, ...updates }
    
    // 実行中の場合、再起動
    if (this.isRunning) {
      this.stop()
      this.start()
    }
  }

  /**
   * 遅延関数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 変更リスナーを追加
   */
  addChangeListener(callback: (status: HealthStatus) => void): void {
    this.changeListeners.push(callback)
  }

  /**
   * 変更リスナーを削除
   */
  removeChangeListener(callback: (status: HealthStatus) => void): void {
    this.changeListeners = this.changeListeners.filter(listener => listener !== callback)
  }

  /**
   * リスナーに通知
   */
  private notifyListeners(): void {
    this.changeListeners.forEach(listener => {
      try {
        listener(this.currentStatus)
      } catch (error) {
        console.error('Error in health check listener:', error)
      }
    })
  }
}

/**
 * シングルトンインスタンス
 */
let healthCheckInstance: HealthCheckManager | null = null

/**
 * ヘルスチェックマネージャーインスタンスを取得
 */
export function getHealthCheckManager(): HealthCheckManager {
  if (!healthCheckInstance) {
    healthCheckInstance = new HealthCheckManager()
  }
  return healthCheckInstance
}

/**
 * ヘルスチェックを開始
 */
export function startHealthCheck(): void {
  const manager = getHealthCheckManager()
  manager.start()
}

/**
 * ヘルスチェックを停止
 */
export function stopHealthCheck(): void {
  const manager = getHealthCheckManager()
  manager.stop()
}

/**
 * 現在のヘルスステータスを取得
 */
export function getHealthStatus(): HealthStatus {
  const manager = getHealthCheckManager()
  return manager.getStatus()
}

/**
 * バックエンドが利用可能かどうか
 */
export function isBackendAvailable(): boolean {
  const status = getHealthStatus()
  return status.status === 'healthy'
}

/**
 * ヘルスチェックの状態を監視
 */
export function watchHealthStatus(
  callback: (status: HealthStatus) => void
): () => void {
  const manager = getHealthCheckManager()
  manager.addChangeListener(callback)
  
  // クリーンアップ関数を返す
  return () => {
    manager.removeChangeListener(callback)
  }
}







