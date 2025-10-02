'use client'
import { useState, useCallback } from 'react'
import { getBackendUrl } from '../../../lib/getBackendUrl'
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
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const getCvmList = useCallback(async (clusterName: string): Promise<ClusterData | null> => {
    try {
      clearError()
      const response = await fetch(`${getBackendUrl()}/api/cvmlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_name: clusterName }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.detail || `HTTP error! status: ${response.status}`
        console.error('CVM一覧取得エラー:', errorMessage)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'CVM一覧の取得に失敗しました'
      setError(errorMessage)
      console.error('CVM一覧取得エラー:', err)
      return null
    }
  }, [clearError])

  const collectLogs = useCallback(async (cvm: string): Promise<LogCollectionResponse | null> => {
    try {
      clearError()
      const response = await fetch(`${getBackendUrl()}/api/col/getlogs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvm }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ログ収集に失敗しました'
      setError(errorMessage)
      console.error('ログ収集エラー:', err)
      return null
    }
  }, [clearError])

  const getZipList = useCallback(async (): Promise<string[]> => {
    try {
      clearError()
      const response = await fetch(`${getBackendUrl()}/api/col/ziplist`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ZipListResponse = await response.json()
      return data.zip_list || []
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ZIP一覧の取得に失敗しました'
      setError(errorMessage)
      console.error('ZIP一覧取得エラー:', err)
      return []
    }
  }, [clearError])

  const getLogsInZip = useCallback(async (zipName: string): Promise<string[]> => {
    try {
      clearError()
      const response = await fetch(`${getBackendUrl()}/api/col/logs_in_zip/${zipName}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: LogsInZipResponse = await response.json()
      return data.logs || []
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ZIP内ログ一覧の取得に失敗しました'
      setError(errorMessage)
      console.error('ZIP内ログ一覧取得エラー:', err)
      return []
    }
  }, [clearError])

  const getLogFileSize = useCallback(async (logFile: string, zipName: string): Promise<{ file_size: number; file_size_mb: number } | null> => {
    try {
      clearError()
      
      const response = await fetch(`${getBackendUrl()}/api/col/logsize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_file: logFile, zip_name: zipName }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.detail || `HTTP error! status: ${response.status}`
        console.error('ファイルサイズ取得エラー:', errorMessage)
        throw new Error(errorMessage)
      }

      const data: LogSizeResponse = await response.json()
      
      if (data.status === 'error' || !data.data) {
        throw new Error(data.error || 'ファイルサイズの取得に失敗しました')
      }
      
      return data.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ファイルサイズの取得に失敗しました'
      setError(errorMessage)
      console.error('ファイルサイズ取得エラー:', err)
      return null
    }
  }, [clearError])

  const getLogContent = useCallback(async (logFile: string, zipName: string): Promise<string | null> => {
    try {
      clearError()
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒のタイムアウト
      
      const response = await fetch(`${getBackendUrl()}/api/col/logdisplay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_file: logFile, zip_name: zipName }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('ログ内容取得エラー:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      let responseText: string
      try {
        responseText = await response.text()
      } catch (textError) {
        console.error('レスポンス読み取りエラー:', textError)
        throw new Error('Failed to read response text')
      }
      
      let data: LogDisplayResponse
      try {
        data = JSON.parse(responseText)
        
        // 空のファイルかチェック
        if (typeof data.data === 'object' && data.data && 'empty' in data.data && data.data.empty) {
          return `EMPTY_FILE:${data.data.message}`
        }
        
        // 大きなログファイルの場合は最初の10000文字のみを表示
        const content = typeof data.data === 'string' ? data.data : ''
        const maxLength = 10000
        if (content.length > maxLength) {
          return content.substring(0, maxLength) + '\n\n... (ログが長すぎるため、最初の10000文字のみを表示しています)'
        }
        
        return content
      } catch (parseError) {
        console.error('JSON解析エラー:', parseError)
        throw new Error('Failed to parse JSON response')
      }
    } catch (err) {
      let errorMessage = 'ログ内容の取得に失敗しました'
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'ログ内容の取得がタイムアウトしました（30秒）'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
      console.error('ログ内容取得エラー:', err)
      return null
    }
  }, [clearError])

  const downloadZip = useCallback((zipName: string) => {
    try {
      clearError()
      const downloadUrl = `${getBackendUrl()}/api/col/download/${zipName}`
      window.open(downloadUrl, '_blank')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ZIPダウンロードに失敗しました'
      setError(errorMessage)
      console.error('ZIPダウンロードエラー:', err)
    }
  }, [clearError])

  return {
    error,
    clearError,
    getCvmList,
    collectLogs,
    getZipList,
    getLogsInZip,
    getLogFileSize,
    getLogContent,
    downloadZip,
  }
}
