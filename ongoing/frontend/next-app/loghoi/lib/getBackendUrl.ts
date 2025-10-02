/**
 * バックエンドURLを動的に取得する関数
 * Kubernetes対応の包括的な実装
 * 優先順位: NEXT_PUBLIC_BACKEND_URL > 個別環境変数 > クライアントサイド検出 > デフォルト
 */
export function getBackendUrl(): string {
  // 1. 完全なURLが環境変数で指定されている場合
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    console.log('Using NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL)
    return process.env.NEXT_PUBLIC_BACKEND_URL
  }
  
  // 2. 個別の環境変数から構築
  const host = process.env.NEXT_PUBLIC_BACKEND_HOST || 
               process.env.BACKEND_SERVICE_HOST || 
               process.env.BACKEND_HOST ||
               '10.38.113.49'  // デフォルトを変更
  const port = process.env.NEXT_PUBLIC_BACKEND_PORT || 
               process.env.BACKEND_SERVICE_PORT || 
               process.env.BACKEND_PORT ||
               '7776'
  const protocol = process.env.NEXT_PUBLIC_BACKEND_PROTOCOL || 
                   process.env.BACKEND_PROTOCOL ||
                   'http'
  
  // 3. クライアントサイドで現在のホストを使用
  if (typeof window !== 'undefined') {
    const currentProtocol = window.location.protocol
    const currentHostname = window.location.hostname
    const url = `${currentProtocol}//${currentHostname}:${port}`
    console.log('Client-side URL:', url)
    return url
  }
  
  // 4. サーバーサイドでは環境変数を使用
  const defaultPorts = { 'http': '80', 'https': '443' }
  const defaultPort = defaultPorts[protocol as keyof typeof defaultPorts]
  
  let url = `${protocol}://${host}`
  if (port !== defaultPort) {
    url += `:${port}`
  }
  console.log('Server-side URL:', url)
  return url
}

/**
 * バックエンドURLを取得する関数（非同期版）
 * より柔軟な設定が可能
 */
export async function getBackendUrlAsync(): Promise<string> {
  // 環境変数が設定されている場合はそれを使用
  if (process.env.NEXT_PUBLIC_BACKEND_IP) {
    return process.env.NEXT_PUBLIC_BACKEND_IP
  }

  // クライアントサイドで実行されている場合
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    const port = process.env.NEXT_PUBLIC_BACKEND_PORT || '7776'
    return `${protocol}//${hostname}:${port}`
  }

  // サーバーサイドで実行されている場合
  // 環境変数から取得を試行
  const serverHost = process.env.BACKEND_HOST || 'localhost'
  const serverPort = process.env.BACKEND_PORT || '7776'
  return `http://${serverHost}:${serverPort}`
}


