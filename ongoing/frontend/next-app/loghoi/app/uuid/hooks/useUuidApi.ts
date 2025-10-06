import { useState } from 'react'
import { useApiCall } from '../../../hooks/useApiError'
import { APIError, validateRequiredFields } from '../../../lib/errorHandler'

interface UuidApiResponse {
  list: {
    vmlist: Record<string, any>
    vglist: Record<string, any>
    vflist: Record<string, any>
    sharelist: Record<string, any>
    sclist: Record<string, any>
  }
  cluster_name: string
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
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7776'
      
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
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7776'
      
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
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7776'
      
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

  return {
    fetchUuidData,
    searchUuid,
    getUuidContent,
    loading,
    error: errorState.error,
    errorMessage: errorState.userMessage,
    errorAlert: errorState.alert,
    clearError,
  }
}
