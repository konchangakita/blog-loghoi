import { useState } from 'react'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUuidData = async (params: QueryParams): Promise<UuidApiResponse | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/uuid/latestdataset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Failed to fetch UUID data:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  const searchUuid = async (params: QueryParams & { search: string }): Promise<UuidApiResponse | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/uuid/searchdataset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Failed to search UUID:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  const getUuidContent = async (params: QueryParams & { content: string }): Promise<UuidApiResponse | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/uuid/contentdataset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Failed to get UUID content:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    fetchUuidData,
    searchUuid,
    getUuidContent,
    loading,
    error,
  }
}
