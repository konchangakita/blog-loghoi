'use client'

import { useState, useCallback } from 'react'

import { getBackendUrl } from '../../../lib/getBackendUrl'
import { useApiCall } from '../../../hooks/useApiError'
import { APIError, validateRequiredFields } from '../../../lib/errorHandler'
import { 
  ClusterData, 
  LogCollectionRequest, 
  LogCollectionResponse,
  ZipListResponse,
  LogsInZipResponse,
  LogDisplayRequest,
  LogDisplayResponse,
  LogSizeResponse
} from '../types'

export const useCollectLogApi = () => {
  const { loading, errorState, executeApiCall, clearError } = useApiCall()

  const getCvmList = useCallback(async (clusterName: string): Promise<ClusterData | null> => {
    try {
      validateRequiredFields({ cluster_name: clusterName }, ['cluster_name'])
      
      return await executeApiCall(
        () => fetch(`${getBackendUrl()}/api/cvmlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cluster_name: clusterName }),
        }),
        'getCvmList',
        { clusterName }
      )
    } catch (error) {
      if (error instanceof APIError) {
        return null
      }
      throw error
    }
  }, [executeApiCall])

  const collectLogs = useCallback(async (
    cvm: string,
    onProgress?: (progress: { stage: string; current: number; total: number; message: string }) => void
  ): Promise<LogCollectionResponse | null> => {
    try {
      validateRequiredFields({ cvm }, ['cvm'])
      
      // ログ収集ジョブを開始
      const jobResponse = await executeApiCall(
        () => fetch(`${getBackendUrl()}/api/col/getlogs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cvm }),
        }),
        'collectLogs',
        { cvm }
      )
      
      // executeApiCallは result.data を返すので、jobResponseは既に { job_id, status } の形式
      if (!jobResponse || !jobResponse.job_id) {
        console.error('ジョブレスポンス:', jobResponse)
        throw new Error('ジョブIDが取得できませんでした')
      }
      
      const jobId = jobResponse.job_id
      console.log('ログ収集ジョブ開始:', jobId)
      
      // ジョブ完了をポーリング（最大5分、1秒ごと）
      const maxAttempts = 300  // 5分 = 300 * 1秒
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1秒待機
        
        const statusResponse = await executeApiCall(
          () => fetch(`${getBackendUrl()}/api/col/job/${jobId}`),
          'getJobStatus',
          { jobId }
        )
        
        // executeApiCallは result.data を返すので、statusResponseは既にジョブオブジェクト
        if (statusResponse?.status === 'completed') {
          console.log('ログ収集完了:', jobId)
          console.log('完了時刻:', new Date().toISOString())
          // 完了時は即座にreturn（executeApiCallの処理を完了させてから）
          return { message: 'finished collect log' }
        } else if (statusResponse?.status === 'failed') {
          throw new Error(`ログ収集失敗: ${statusResponse.error}`)
        }
        
        // 進捗情報をログ出力とコールバック
        const progress = statusResponse?.progress
        if (progress) {
          console.log(`ジョブステータス: ${statusResponse?.status} (${i + 1}/${maxAttempts})`, 
                      `stage: ${progress.stage}, progress: ${progress.current}/${progress.total}, message: ${progress.message}`)
          // 進捗コールバックを呼び出す
          if (onProgress) {
            onProgress(progress)
          }
        } else {
          console.log(`ジョブステータス: ${statusResponse?.status} (${i + 1}/${maxAttempts})`)
        }
      }
      
      throw new Error('ログ収集がタイムアウトしました')
      
    } catch (error) {
      if (error instanceof APIError) {
        return null
      }
      throw error
    }
  }, [executeApiCall])

  const getZipList = useCallback(async (): Promise<string[]> => {
    try {
      const result = await executeApiCall(
        () => fetch(`${getBackendUrl()}/api/col/ziplist`),
        'getZipList'
      )
      return result?.zip_list || []
    } catch (error) {
      if (error instanceof APIError) {
        return []
      }
      throw error
    }
  }, [executeApiCall])

  const getLogsInZip = useCallback(async (zipName: string): Promise<string[]> => {
    try {
      validateRequiredFields({ zipName }, ['zipName'])
      
      const result = await executeApiCall(
        () => fetch(`${getBackendUrl()}/api/col/logs_in_zip/${zipName}`),
        'getLogsInZip',
        { zipName }
      )
      return result?.logs || []
    } catch (error) {
      if (error instanceof APIError) {
        return []
      }
      throw error
    }
  }, [executeApiCall])

  const getLogFileSize = useCallback(async (logFile: string, zipName: string): Promise<{ file_size: number; file_size_mb: number } | null> => {
    try {
      validateRequiredFields({ logFile, zipName }, ['logFile', 'zipName'])
      
      const result = await executeApiCall(
        () => fetch(`${getBackendUrl()}/api/col/logsize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ log_file: logFile, zip_name: zipName }),
        }),
        'getLogFileSize',
        { logFile, zipName }
      )
      // executeApiCall は後方互換で payload を返す
      // 期待形: { file_size: number, file_size_mb: number }
      if (result && typeof result === 'object' && 'file_size' in result && 'file_size_mb' in result) {
        return result as { file_size: number; file_size_mb: number }
      }
      return null
    } catch (error) {
      if (error instanceof APIError) {
        return null
      }
      throw error
    }
  }, [executeApiCall])

  const getLogContent = useCallback(async (logFile: string, zipName: string): Promise<string | null> => {
    try {
      validateRequiredFields({ logFile, zipName }, ['logFile', 'zipName'])
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒のタイムアウト
      
      const result = await executeApiCall(
        () => fetch(`${getBackendUrl()}/api/col/logdisplay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ log_file: logFile, zip_name: zipName }),
          signal: controller.signal
        }),
        'getLogContent',
        { logFile, zipName }
      )
      
      clearTimeout(timeoutId)
      
      if (!result) return null
      
      // 後方互換: result は string または { empty: boolean, message: string } の可能性
      if (typeof result === 'object' && result && 'empty' in result) {
        const r: any = result
        if (r.empty) return `EMPTY_FILE:${r.message}`
      }

      const content = typeof result === 'string' ? result : (typeof (result as any).data === 'string' ? (result as any).data : '')
      const maxLength = 10000
      if (content.length > maxLength) {
        return content.substring(0, maxLength) + '\n\n... (ログが長すぎるため、最初の10000文字のみを表示しています)'
      }
      
      return content
    } catch (error) {
      if (error instanceof APIError) {
        return null
      }
      throw error
    }
  }, [executeApiCall])

  const getLogContentRange = useCallback(async (logFile: string, zipName: string, start: number, length: number): Promise<{ content: string; range: { start: number; length: number } } | null> => {
    try {
      validateRequiredFields({ logFile, zipName }, ['logFile', 'zipName'])
      const payload: any = { log_file: logFile, zip_name: zipName, start, length }
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const result = await executeApiCall(
        () => fetch(`${getBackendUrl()}/api/col/logdisplay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        }),
        'getLogContentRange',
        { logFile, zipName, start, length }
      )

      clearTimeout(timeoutId)
      if (!result) return null

      // 後方互換考慮: 新形式は { range, content } もしくは { empty: true }
      if (typeof result === 'object' && result) {
        const r: any = result
        if ('empty' in r && r.empty) {
          return { content: '', range: { start, length: 0 } }
        }
        if ('range' in r && 'content' in r) {
          return { content: String(r.content ?? ''), range: { start: Number(r.range?.start ?? 0), length: Number(r.range?.length ?? 0) } }
        }
        // 旧形式フォールバック
        const content = typeof r.data === 'string' ? r.data : (typeof r === 'string' ? r : '')
        return { content, range: { start, length: content.length } }
      }

      if (typeof result === 'string') {
        return { content: result, range: { start, length: result.length } }
      }

      return null
    } catch (error) {
      if (error instanceof APIError) {
        return null
      }
      throw error
    }
  }, [executeApiCall])

  const downloadZip = useCallback((zipName: string) => {
    try {
      validateRequiredFields({ zipName }, ['zipName'])
      const downloadUrl = `${getBackendUrl()}/api/col/download/${zipName}`
      window.open(downloadUrl, '_blank')
    } catch (err) {
      const error = new APIError(
        err instanceof Error ? err.message : 'ZIPダウンロードに失敗しました',
        500,
        'DOWNLOAD_ERROR',
        { zipName },
        'downloadZip'
      )
      // エラーハンドリングはexecuteApiCallを使わないので、直接handleErrorを呼び出し
      console.error('ZIPダウンロードエラー:', error)
    }
  }, [])

  const clearCache = useCallback(async (pattern?: string): Promise<{ cleared_count: number; pattern?: string; cache_stats: any } | null> => {
    try {
      const backendUrl = getBackendUrl()
      const url = `${backendUrl}/api/col/cache/clear`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pattern }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('キャッシュクリアエラー:', error)
      return null
    }
  }, [])

  const getCacheStats = useCallback(async (): Promise<any | null> => {
    try {
      const backendUrl = getBackendUrl()
      const url = `${backendUrl}/api/col/cache/stats`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('キャッシュ統計取得エラー:', error)
      return null
    }
  }, [])

  return {
    loading,
    error: errorState.error,
    errorMessage: errorState.userMessage,
    errorAlert: errorState.alert,
    clearError,
    getCvmList,
    collectLogs,
    getZipList,
    getLogsInZip,
    getLogFileSize,
    getLogContent,
    getLogContentRange,
    downloadZip,
    clearCache,
    getCacheStats,
  }
}
