import { useEffect, useState } from 'react'
import { getBackendUrl } from '../../lib/getBackendUrl'

interface dict {
  [key: string]: any
}

const getClusterList = (query: dict) => {
  const [data, setData] = useState<dict>()
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  
  const requestUrl = `${getBackendUrl()}/api/pccluster`
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  }
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(requestUrl, requestOptions)
        
        if (response.status === 200) {
          const responseData = await response.json()
          console.log('Cluster List Response:', responseData)
          
          // 新しいレスポンス形式に対応
          if (responseData.clusters) {
            setData(responseData.clusters)
          } else {
            setData(responseData)
          }
        } else {
          const errorText = await response.text()
          console.error('API Error:', response.status, errorText)
          setError(`API接続エラー (${response.status}): ${errorText}`)
        }
      } catch (error) {
        console.error('Network Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        setError(`ネットワークエラー: ${errorMessage}`)
      } finally {
        setLoading(false)
      }
    }
    
    if (query.pcip) {
      fetchData()
    }
  }, [query.pcip])
  
  return { data, loading, error }
}
export default getClusterList
