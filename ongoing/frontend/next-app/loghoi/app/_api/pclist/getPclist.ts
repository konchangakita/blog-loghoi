import { notFound } from 'next/navigation'
import { getBackendUrl } from '../../../lib/getBackendUrl'

interface dict {
  [key: string]: any
}

type PcLists = {
  pc_list: dict
  cluster_list: dict
}

export async function getPclist() {
  const requestUrl = `${getBackendUrl()}/api/pclist`
  
  try {
    const res = await fetch(requestUrl, { 
      method: 'GET', 
      cache: 'no-store',
      signal: AbortSignal.timeout(10000) // 10秒のタイムアウト
    })
    
    if (!res.ok) {
      console.error(`API Error: ${res.status} ${res.statusText}`)
      // バックエンド接続エラーの場合はアラートを表示するための特別な値を返す
      return {
        pc_list: null,
        cluster_list: null,
        error: `バックエンド接続エラー (${res.status}): ${res.statusText}`,
        errorType: 'CONNECTION_ERROR'
      }
    }

    const resJson = (await res.json()) as PcLists
    
    // Elasticsearchにデータがない場合は空のリストを返す
    if (!resJson['pc_list'] || (Array.isArray(resJson['pc_list']) && resJson['pc_list'].length === 0)) {
      console.log('No data found in Elasticsearch')
      return {
        pc_list: [],
        cluster_list: {},
        error: null,
        errorType: 'NO_DATA'
      }
    }

    return {
      ...resJson,
      error: null,
      errorType: null
    }
    
  } catch (error) {
    console.error('Network Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // ネットワークエラーの場合はアラートを表示するための特別な値を返す
    return {
      pc_list: null,
      cluster_list: null,
      error: `ネットワークエラー: ${errorMessage}`,
      errorType: 'NETWORK_ERROR'
    }
  }
}

  const resJson = (await res.json()) as PcLists
  if (!resJson['pc_list']) {
    // Render the closest `not-found.js` Error Boundary
    notFound()
  }

  return resJson
}
