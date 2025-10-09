import { useState, useCallback } from 'react'
import { useApiCall } from '../../../hooks/useApiError'
import { APIError, validateRequiredFields } from '../../../lib/errorHandler'
import { getBackendUrl } from '../../../lib/getBackendUrl'

interface UuidApiResponse {
  list: {
    vmlist: Record<string, any>
    vglist: Record<string, any>
    vflist: Record<string, any>
    sharelist: Record<string, any>
    sclist: Record<string, any>
  }
  cluster_name: string
  main_flag: string | null
  timestamp_list: {
    local_time: string
  }
}

interface QueryParams {
  pcip: string
  cluster: string
  prism?: string
}

export const useUuidApi = () => {
  const { loading, errorState, executeApiCall, clearError } = useApiCall<UuidApiResponse>()

  const fetchUuidData = async (params: QueryParams): Promise<UuidApiResponse | null> => {
    try {
      // 必須フィールドのバリデーション
      validateRequiredFields(params, ['cluster'])
      
      const backendUrl = getBackendUrl()
      
      return await executeApiCall(
        () => fetch(`${backendUrl}/api/uuid/latestdataset`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        }),
        'fetchUuidData',
        { cluster: params.cluster }
      )
    } catch (error) {
      if (error instanceof APIError) {
        // APIErrorの場合は既にhandleErrorで処理済み
        return null
      }
      throw error
    }
  }

  const searchUuid = async (params: QueryParams & { search: string }): Promise<UuidApiResponse | null> => {
    try {
      // 必須フィールドのバリデーション
      validateRequiredFields(params, ['cluster', 'search'])
      
      const backendUrl = getBackendUrl()
      
      return await executeApiCall(
        () => fetch(`${backendUrl}/api/uuid/searchdataset`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        }),
        'searchUuid',
        { cluster: params.cluster, search: params.search }
      )
    } catch (error) {
      if (error instanceof APIError) {
        return null
      }
      throw error
    }
  }

  const getUuidContent = async (params: QueryParams & { content: string }): Promise<UuidApiResponse | null> => {
    try {
      // 必須フィールドのバリデーション
      validateRequiredFields(params, ['cluster', 'content'])
      
      const backendUrl = getBackendUrl()
      
      return await executeApiCall(
        () => fetch(`${backendUrl}/api/uuid/contentdataset`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        }),
        'getUuidContent',
        { cluster: params.cluster, content: params.content }
      )
    } catch (error) {
      if (error instanceof APIError) {
        return null
      }
      throw error
    }
  }

  const clearCache = useCallback(async (pattern?: string): Promise<{ cleared_count: number; pattern?: string; cache_stats: any } | null> => {
    try {
      const backendUrl = getBackendUrl()
      const url = `${backendUrl}/api/uuid/cache/clear`
      
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
      const url = `${backendUrl}/api/uuid/cache/stats`
      
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
    fetchUuidData,
    searchUuid,
    getUuidContent,
    clearCache,
    getCacheStats,
    loading,
    error: errorState.error,
    errorMessage: errorState.userMessage,
    errorAlert: errorState.alert,
    clearError,
  }
}
