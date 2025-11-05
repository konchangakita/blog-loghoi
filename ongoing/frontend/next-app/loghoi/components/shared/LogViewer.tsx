'use client'
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import io from 'socket.io-client'
import { saveAs } from 'file-saver'
import { usePathname, useSearchParams } from 'next/navigation'
import { getBackendUrl } from '../../lib/getBackendUrl'
import VirtualizedLogList from './VirtualizedLogList'

// 共通の型定義
export interface LogEntry {
  name: string
  line: string
  timestamp?: string
  line_number?: number
}

export interface LogViewerProps {
  // 共通プロパティ
  variant: 'collect' | 'realtime'
  logs?: LogEntry[]
  filter?: string
  onClear?: () => void
  onDownload?: () => void
  // 追記前スナップショット用（親からトリガーを受け取る）
  appendTick?: number
  // ビュワー最終行に表示するヒント文
  footerHint?: string
  // フッターヒントをクリックしたときのアクション（続きを読むなど）
  footerAction?: () => void
  // 仮想化設定
  enableVirtualization?: boolean
  virtualizationThreshold?: number
  
  // collectlog用プロパティ
  logsInZip?: string[]
  displayLog?: string
  onLogSelect?: (logFile: string) => void
  loadingDisplay?: boolean
  selectedZip?: string | null
  selectedLogFile?: string
  
  // realtimelog用プロパティ
  cvmChecked?: string
  tailName?: string
  tailPath?: string
}

// 共通のダウンロード機能
const createDownloadData = (logs: LogEntry[], variant: 'collect' | 'realtime'): string => {
  if (variant === 'realtime') {
    return logs.map((log) => `${log.name} ${log.line}`).join('\n')
  } else {
    return logs.map((log) => log.line).join('\n')
  }
}

const generateFileName = (variant: 'collect' | 'realtime', prefix?: string): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = ('0' + (now.getMonth() + 1)).slice(-2)
  const day = ('0' + now.getDate()).slice(-2)
  const hours = ('0' + now.getHours()).slice(-2)
  const minutes = ('0' + now.getMinutes()).slice(-2)
  const seconds = ('0' + now.getSeconds()).slice(-2)
  
  const baseName = variant === 'realtime' ? 'realtimelog' : 'collectlog'
  const customPrefix = prefix || baseName
  
  return `${customPrefix}_${year}${month}${day}-${hours}${minutes}${seconds}.txt`
}

// 共通のLogViewerコンポーネント
const LogViewer: React.FC<LogViewerProps> = ({
  variant,
  logs = [],
  filter = '',
  onClear,
  onDownload,
  appendTick,
  footerHint,
  footerAction,
  // 仮想化設定
  enableVirtualization = true,
  virtualizationThreshold = 1000,
  // collectlog用
  logsInZip,
  displayLog,
  onLogSelect,
  loadingDisplay,
  selectedZip,
  selectedLogFile,
  // realtimelog用
  cvmChecked,
  tailName,
  tailPath
}) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const logViewRef = useRef<HTMLDivElement>(null)
  const collectViewRef = useRef<HTMLDivElement>(null)
  const lastScrollTopRef = useRef<number>(0)
  const lastOffsetFromBottomRef = useRef<number>(0)
  
  // realtimelog用の状態
  const [isActive, setIsActive] = useState(false)
  const [socket, setSocket] = useState<any>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [realtimeLogs, setRealtimeLogs] = useState<LogEntry[]>([])

  // 表示するログを決定（メモ化）
  const displayLogs = useMemo(() => 
    variant === 'realtime' ? realtimeLogs : logs || [], 
    [variant, realtimeLogs, logs]
  )
  
  // フィルタリング処理をメモ化
  const filteredLogs = useMemo(() => {
    if (!filter) return displayLogs
    const lowerFilter = filter.toLowerCase()
    return displayLogs.filter((log) => 
      log.line.toLowerCase().includes(lowerFilter)
    )
  }, [displayLogs, filter])

  // 仮想化の判定
  const shouldUseVirtualization = useMemo(() => {
    return enableVirtualization && filteredLogs.length > virtualizationThreshold
  }, [enableVirtualization, filteredLogs.length, virtualizationThreshold])

  // 自動スクロール
  useEffect(() => {
    if (logViewRef.current) {
      logViewRef.current.scrollTop = logViewRef.current.scrollHeight
    }
  }, [displayLogs])

  // collect の表示更新時に、直前の距離（下端からのオフセット）で復元
  useEffect(() => {
    if (variant !== 'collect') return
    if (!collectViewRef.current) return
    if (typeof displayLog === 'undefined') return
    const el = collectViewRef.current
    const restore = () => {
      const target = Math.max(0, el.scrollHeight - lastOffsetFromBottomRef.current)
      el.scrollTop = target
    }
    // レンダリング反映後に復元
    if (typeof window !== 'undefined') {
      setTimeout(restore, 0)
    } else {
      restore()
    }
  }, [variant, displayLog])

  // 親からのトリガーで、追記前に現在位置をスナップショット
  useEffect(() => {
    if (variant !== 'collect') return
    if (!collectViewRef.current) return
    if (typeof appendTick === 'undefined') return
    const el = collectViewRef.current
    lastScrollTopRef.current = el.scrollTop
    lastOffsetFromBottomRef.current = el.scrollHeight - el.scrollTop
  }, [variant, appendTick])

  // ダウンロード機能（メモ化）
  const handleDownload = useCallback(() => {
    const data = createDownloadData(displayLogs, variant)
    const fileName = generateFileName(variant, tailName)
    const blob = new Blob([data], { type: 'text/plain;charset=utf-8' })
    saveAs(blob, fileName)
    
    if (onDownload) {
      onDownload()
    }
  }, [displayLogs, variant, tailName, onDownload])

  // ログクリア機能（メモ化）
  const handleClear = useCallback(() => {
    if (variant === 'realtime') {
      setRealtimeLogs([])
    }
    if (onClear) {
      onClear()
    }
  }, [variant, onClear])

  // SocketIO接続（realtimelog用）
  const handleConnect = () => {
    if (variant !== 'realtime') return
    
    if (isConnecting || (socket && socket.connected)) {
      return
    }
    setIsConnecting(true)
    
    const backendUrl = getBackendUrl()
    const newsocket = io(`${backendUrl}/`, {
      transports: ['websocket'],
      upgrade: true,
      rememberUpgrade: false,
      timeout: 20000,
      forceNew: true,
      // engine.ioのping設定は型未定義のため未設定
    })
    
    setSocket(newsocket)
  }

  const handleDisconnect = () => {
    if (variant !== 'realtime' || !socket) return
    
    socket.disconnect()
    setSocket(null)
    setIsActive(false)
    setIsConnecting(false)
    setIsDisconnecting(false)
  }

  // tail -f開始（realtimelog用）
  const handleStartTailF = () => {
    if (variant !== 'realtime' || !socket || !socket.connected) return
    
    if (!tailName) {
      alert('ログ名を選択してください')
      return
    }
    
    socket.emit('start_tail_f', {
      cvm_ip: cvmChecked,
      log_path: tailPath,
      log_name: tailName
    })
  }

  // tail -f停止（realtimelog用）
  const handleStopTailF = () => {
    if (variant !== 'realtime' || !socket || !socket.connected) return
    
    socket.emit('stop_tail_f', {})
    
    const modal = document.getElementById('my-modal') as HTMLInputElement
    if (modal) {
      modal.checked = false
    }
  }

  // 統合開始ボタン（realtimelog用）
  const handleStartAll = () => {
    if (variant !== 'realtime') return
    
    if (isConnecting) return
    if (!tailName) {
      alert('ログ名を選択してください')
      return
    }

    // 既存のSocket接続があれば先に切断
    if (socket) {
      try {
        socket.disconnect()
      } catch (e) {
        console.error('Failed to disconnect old socket:', e)
      }
      setSocket(null)
    }

    setIsConnecting(true)
    console.log('🔌 Creating new Socket.IO connection...')
    
    const backendUrl = getBackendUrl()
    const newsocket = io(`${backendUrl}/`, {
      transports: ['websocket'],
      timeout: 20000,
      forceNew: true,
    })
    
    // 接続確立後にtail -fを開始する
    newsocket.once('connect', () => {
      console.log('🔌 Socket.IO connected, starting tail -f...')
      try {
        newsocket.emit('start_tail_f', {
          cvm_ip: cvmChecked,
          log_path: tailPath,
          log_name: tailName
        })
        setIsConnecting(false)
      } catch (e) {
        console.error('start_tail_f emit failed:', e)
        setIsConnecting(false)
      }
    })

    // 接続エラー時の処理
    newsocket.once('connect_error', (error: any) => {
      console.error('🔌 Socket.IO connection error:', error)
      setIsConnecting(false)
      alert('Socket.IO接続エラー: ' + error.message)
    })

    // 接続タイムアウト（25秒）
    const connectionTimeout = setTimeout(() => {
      if (!newsocket.connected) {
        console.error('🔌 Socket.IO connection timeout')
        setIsConnecting(false)
        newsocket.disconnect()
        alert('Socket.IO接続がタイムアウトしました')
      }
    }, 25000)

    // 接続成功時にタイムアウトをクリア
    newsocket.once('connect', () => {
      clearTimeout(connectionTimeout)
    })

    setSocket(newsocket)
  }

  // 統合停止ボタン（realtimelog用）
  const handleStopAll = () => {
    if (variant !== 'realtime') return
    
    // 切断中状態に設定
    setIsDisconnecting(true)
    
    if (socket && socket.connected) {
      socket.emit('stop_tail_f', {})
      // tail_f_statusイベントで'stopped'を受信したら切断完了
    } else {
      // ソケットが接続されていない場合は即座に完了
      setIsActive(false)
      setIsConnecting(false)
      setIsDisconnecting(false)
      
      const modal = document.getElementById('my-modal') as HTMLInputElement
      if (modal) {
        modal.checked = false
      }
    }
  }

  // SocketIOイベントリスナー（realtimelog用）
  useEffect(() => {
    if (variant !== 'realtime' || !socket) return

    
    socket.on('message', (data: any) => {
    })
    
    socket.on('log', (msg: any) => {
      setRealtimeLogs((logs) => {
        const newLogs = [...logs, { name: msg.name || tailName, line: msg.line }]
        return newLogs
      })
    })

    socket.on('tail_f_status', (data: any) => {
      if (data.status === 'started') {
        setIsActive(true)
        setIsDisconnecting(false)
      } else if (data.status === 'stopped') {
        setIsActive(false)
        setIsDisconnecting(false)
        
        // Socket.IO切断とクリーンアップ
        if (socket) {
          socket.disconnect()
          setSocket(null)
        }
        setIsConnecting(false)
        
        // モーダルを閉じる
        const modal = document.getElementById('my-modal') as HTMLInputElement
        if (modal) {
          modal.checked = false
        }
      } else if (data.status === 'error') {
        setIsActive(false)
        setIsDisconnecting(false)
        
        // エラー時もクリーンアップ
        if (socket) {
          socket.disconnect()
          setSocket(null)
        }
        setIsConnecting(false)
        
        // モーダルを閉じる
        const modal = document.getElementById('my-modal') as HTMLInputElement
        if (modal) {
          modal.checked = false
        }
      }
    })

    socket.on('connect', () => {
      setIsActive(false)
      setIsConnecting(false)
      
      // 接続時は自動開始しない（手動で開始ボタンを押すまで待機）
    })

    socket.on('disconnect', () => {
      setIsActive(false)
      setIsConnecting(false)
      setIsDisconnecting(false)
    })

    socket.on('connect_error', (error: any) => {
      console.error('SocketIO connection error:', error)
      setIsConnecting(false)
    })

    return () => {
      if (socket) {
        socket.off('message')
        socket.off('log')
        socket.off('tail_f_status')
        socket.off('connect')
        socket.off('disconnect')
        socket.off('connect_error')
      }
    }
  }, [socket, variant])

  // ページ遷移/離脱時の切断（realtimelog用）
  useEffect(() => {
    if (variant !== 'realtime') return

    const stopImmediately = () => {
      try {
        // 可能ならstopを先に通知
        if (socket && socket.connected) {
          try {
            socket.emit('stop_tail_f', {})
          } catch {}
        }
      } finally {
        // 常に切断実行
        if (socket) {
          try {
            socket.disconnect()
          } catch {}
        }
        setIsActive(false)
        setIsConnecting(false)
        setIsDisconnecting(false)
      }
    }

    const handleBeforeUnload = () => {
      stopImmediately()
    }

    const handlePageHide = () => {
      stopImmediately()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handlePageHide)

    // アンマウント時も確実に停止
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handlePageHide)
      stopImmediately()
    }
  }, [variant, socket])

  // collectlog用のレンダリング
  if (variant === 'collect') {
    // ファイルサイズが大きい場合のチェック
    const isFileTooLarge = displayLog?.startsWith('FILE_SIZE_TOO_LARGE:')
    const fileSizeMB = isFileTooLarge ? 
      (() => {
        try {
          return parseFloat(displayLog?.split(':')[1] ?? '') || 0
        } catch {
          return 0
        }
      })() : 0

    // 空のファイルかチェック
    const isEmptyFile = displayLog?.startsWith('EMPTY_FILE:')

    if (!selectedZip) {
      return (
        <div className="w-49 text-center">
          <div className="text-primary">File / Log List</div>
          <div className="h-96 overflow-auto flex items-center justify-center">
            <p className="text-gray-500">ZIPファイルを選択してください</p>
          </div>
        </div>
      )
    }

    return (
      <div className="flex-1 min-w-0 max-w-full h-[650px]">
        <div className="mb-2">
          <div className="text-sm font-semibold text-primary">
            {loadingDisplay ? (
              <span className="text-gray-500">Loading...</span>
            ) : selectedLogFile ? (
              <div>
                <span className="text-success">✓ ログ表示中: </span>
                <span className="text-info font-mono">{selectedLogFile}</span>
              </div>
            ) : (
              <span className="text-gray-500">ログファイルを選択してください</span>
            )}
          </div>
        </div>
        {isFileTooLarge ? (
          <div className="w-full h-[600px] flex items-center justify-center overflow-auto">
            <div className="alert alert-warning max-w-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="font-bold">ファイルサイズが大きすぎます</h3>
                <div className="text-xs mt-2">
                  <p>ファイルサイズ: <strong>{fileSizeMB.toFixed(2)} MB</strong></p>
                  <p className="mt-2">このファイルは表示に時間がかかるため、</p>
                  <p>ZIPファイルをダウンロードして確認してください。</p>
                </div>
              </div>
            </div>
          </div>
        ) : isEmptyFile ? (
          <div className="w-full h-[600px] flex items-center justify-center overflow-auto">
            <div className="alert alert-info max-w-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-bold">ファイル内ログ無し</h3>
                <div className="text-xs mt-2">
                  <p>選択されたファイルにはログが含まれていません。</p>
                  <p className="mt-1">ファイル: <strong>{selectedLogFile}</strong></p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="mockup-code w-full h-[600px] overflow-auto text-left relative"
            ref={collectViewRef}
            onScroll={(e) => {
              lastScrollTopRef.current = e.currentTarget.scrollTop
            }}
          >
            <div className="w-full">
              <pre className="px-2 whitespace-pre leading-tight" style={{ lineHeight: '1.2' }}>
                <code className="text-xs" style={{ lineHeight: '1.2' }}>
                  {loadingDisplay ? (
                    <span className="text-gray-500">Loading...</span>
                  ) : typeof displayLog !== 'undefined' ? (
                    <>
                      {displayLog}
                      {footerHint && (
                        <> {'\n'}{footerHint} </>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-500">ログファイルを選択してください</span>
                  )}
                </code>
              </pre>
            </div>
            {footerHint && footerAction && (
              <div className="sticky bottom-0 z-10 w-full">
                <div className="flex justify-start pl-2 pb-2">
                  <button
                    className="btn btn-primary btn-sm shadow px-6 min-w-[160px] opacity-80 hover:opacity-100"
                    onClick={footerAction}
                  >
                    続きを表示
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // realtimelog用のレンダリング
  return (
    <>
      <div className='flex justify-center items-center m-2 space-x-2'>
        <div className='flex gap-2'>
          {isConnecting ? (
            <div className='btn btn-primary btn-outline btn-disabled'>
              <span className="loading loading-spinner loading-sm"></span>
              接続中...
            </div>
          ) : !socket || !socket.connected ? (
            !tailName ? (
              <div className='btn btn-disabled btn-outline'>
                ログ取得開始 (ログ名未選択)
              </div>
            ) : (
              <div className='btn btn-success btn-outline' onClick={handleStartAll}>
                ログ取得開始
              </div>
            )
          ) : (
            <label htmlFor='my-modal'>
              <div className='btn btn-error btn-outline'>
                ログ取得停止
              </div>
            </label>
          )}
          
          <div className='btn btn-warning btn-outline' onClick={handleClear}>
            ログクリア
          </div>
        </div>

        <input type='checkbox' id='my-modal' className='modal-toggle' />
        <label htmlFor='my-modal' className='modal cursor-pointer'>
          <label className='modal-box relative text-left' htmlFor=''>
            <p className='text-lg font-bold'>ログ取得停止します</p>
            <div className='modal-action'>
              {isDisconnecting ? (
                <button className='btn btn-error btn-disabled'>
                  <span className="loading loading-spinner loading-sm"></span>
                  切断中...
                </button>
              ) : (
                <button className='btn btn-error' onClick={handleStopAll}>
                  STOP
                </button>
              )}
              <label htmlFor='my-modal' className={`btn ${isDisconnecting ? 'btn-disabled' : ''}`}>
                キャンセル
              </label>
            </div>
          </label>
        </label>
      </div>

      <div className='mockup-code h-[480px] overflow-auto text-left mx-5' ref={logViewRef}>
        <div className='w-[640px]'>
          {shouldUseVirtualization ? (
            <VirtualizedLogList
              logs={filteredLogs}
              height={480}
              itemHeight={20}
              overscan={10}
            />
          ) : (
            <pre className='px-2'>
              <code>
                {filteredLogs.map((log: LogEntry, i) => {
                  return (
                    <div className='text-xs m-0 flex items-start' key={i}>
                      <span className='text-gray-500 mr-1 min-w-[40px] flex-shrink-0 text-right'>
                        {String(i + 1).padStart(4, ' ')}
                      </span>
                      <span className='text-primary font-bold mr-1 min-w-[80px] flex-shrink-0'>
                        [{log.name}]
                      </span>
                      <span className='text-gray-300 flex-1 break-all'>
                        {log.line}
                      </span>
                    </div>
                  )
                })}
              </code>
            </pre>
          )}
        </div>
      </div>
      <div className='p-1'>
        <button className='btn btn-primary' onClick={handleDownload}>
          Download
        </button>
      </div>
    </>
  )
}

export default LogViewer
