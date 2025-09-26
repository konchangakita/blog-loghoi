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
      console.log('Fetching CVM list for cluster:', clusterName)
      const response = await fetch(`${getBackendUrl()}/api/cvmlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_name: clusterName }),
      })

      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.detail || `HTTP error! status: ${response.status}`
        console.error('API Error:', errorMessage)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('CVM data from API:', data)
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
      console.log('Fetching log file size:', { logFile, zipName })
      
      const response = await fetch(`${getBackendUrl()}/api/col/logsize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_file: logFile, zip_name: zipName }),
      })

      console.log('Log size response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.detail || `HTTP error! status: ${response.status}`
        console.error('API Error:', errorMessage)
        throw new Error(errorMessage)
      }

      const data: LogSizeResponse = await response.json()
      console.log('Log size data received:', data)
      
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
      console.log('Fetching log content:', { logFile, zipName })
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒のタイムアウト
      
      const response = await fetch(`${getBackendUrl()}/api/col/logdisplay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_file: logFile, zip_name: zipName }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      console.log('Log content response status:', response.status)
      console.log('Response headers:', response.headers)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response error text:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      console.log('About to parse JSON response...')
      
      let responseText: string
      try {
        responseText = await response.text()
        console.log('Raw response text length:', responseText.length)
        console.log('Raw response text (first 200 chars):', responseText.substring(0, 200) + '...')
      } catch (textError) {
        console.error('Error reading response text:', textError)
        throw new Error('Failed to read response text')
      }
      
      let data: LogDisplayResponse
      try {
        data = JSON.parse(responseText)
        console.log('Log content data received:', data)
        if (typeof data.data === 'string') {
          console.log('Extracted content length:', data.data.length)
          console.log('Extracted content (first 100 chars):', data.data.substring(0, 100) + '...')
        } else {
          console.log('Data is object:', data.data)
        }
        
        // 空のファイルかチェック
        if (typeof data.data === 'object' && data.data && 'empty' in data.data && data.data.empty) {
          console.log('Empty file detected:', data.data.message)
          return `EMPTY_FILE:${data.data.message}`
        }
        
        // 大きなログファイルの場合は最初の10000文字のみを表示
        const content = typeof data.data === 'string' ? data.data : ''
        const maxLength = 10000
        if (content.length > maxLength) {
          console.log(`Log content is large (${content.length} chars), truncating to first ${maxLength} chars`)
          return content.substring(0, maxLength) + '\n\n... (ログが長すぎるため、最初の10000文字のみを表示しています)'
        }
        
        return content
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        console.error('Response text that failed to parse (first 500 chars):', responseText.substring(0, 500))
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
