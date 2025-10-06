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

  const collectLogs = useCallback(async (cvm: string): Promise<LogCollectionResponse | null> => {
    try {
      validateRequiredFields({ cvm }, ['cvm'])
      
      return await executeApiCall(
        () => fetch(`${getBackendUrl()}/api/col/getlogs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cvm }),
        }),
        'collectLogs',
        { cvm }
      )
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
      
      if (result?.status === 'error' || !result?.data) {
        throw new APIError(result?.error || 'ファイルサイズの取得に失敗しました')
      }
      
      return result.data
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
      
      // 空のファイルかチェック
      if (typeof result.data === 'object' && result.data && 'empty' in result.data && result.data.empty) {
        return `EMPTY_FILE:${result.data.message}`
      }
      
      // 大きなログファイルの場合は最初の10000文字のみを表示
      const content = typeof result.data === 'string' ? result.data : ''
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
    downloadZip,
  }
}
