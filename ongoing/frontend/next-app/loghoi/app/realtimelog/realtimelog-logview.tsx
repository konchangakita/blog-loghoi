import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

import { saveAs } from 'file-saver'
import { usePathname, useSearchParams } from 'next/navigation'

interface dict {
  [key: string]: string
}

type ChildProps = {
  cvmChecked: string
  tailName: string
  tailPath: string
  filter: string
}

export default function LogViewer({ cvmChecked, tailName, tailPath, filter }: ChildProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isActive, setIsActive] = useState(false)
  const [logs, setLogs] = useState<dict[]>([])
  const logViewRef = useRef<HTMLDivElement>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // FileをSaveするための関数を定義
  const handleDownload = () => {
    const data = logs.map((log) => `${log.name} ${log.line}`).join('\n')
    const nowData = new Date()
    const yearData = nowData.getFullYear()
    const monthData = ('0' + (nowData.getMonth() + 1)).slice(-2)
    const dayData = ('0' + nowData.getDate()).slice(-2)
    const hoursData = ('0' + nowData.getHours()).slice(-2)
    const minutesData = ('0' + nowData.getMinutes()).slice(-2)
    const secondsData = ('0' + nowData.getSeconds()).slice(-2)
    const outputDateName = `realtimelog_${yearData}${monthData}${dayData}-${hoursData}${minutesData}${secondsData}.txt`
    const outputData = new Blob([data], { type: 'text/plain;charset=utf-8' })
    saveAs(outputData, outputDateName)
  }

  useEffect(() => {
    if (logViewRef.current) {
      logViewRef.current.scrollTop = logViewRef.current.scrollHeight
    }
  }, [logs])

  // connect SocketIO
  const handleConnect = () => {
    if (isConnecting || (socket && socket.connected)) {
      console.log('Already connecting or connected')
      return
    }

    console.log('Starting SocketIO connection...')
    setIsConnecting(true)
    
    // Docker Compose環境では、ブラウザから直接アクセスするためlocalhostを使用
    const newsocket = io('http://localhost:7776/', {
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: false,
      timeout: 20000,
      forceNew: true
    })
    
    console.log('SocketIO object created:', newsocket)
    setSocket(newsocket)
  }

  const handleDisconnect = () => {
    if (socket) {
      console.log('Disconnecting SocketIO...')
      // disconnect()を呼び出すだけで、明示的なemitは不要
      socket.disconnect()
      setSocket(null)
      setIsActive(false)
      setIsConnecting(false)
    }
  }

  // tail -f start
  const handleStartTailF = () => {
    if (!socket || !socket.connected) {
      console.log('SocketIO not connected')
      return
    }
    
    if (!tailName) {
      console.log('ログ名が選択されていません')
      alert('ログ名を選択してください')
      return
    }
    
    console.log('Starting tail -f...')
    socket.emit('start_tail_f', {
      cvm_ip: cvmChecked,
      log_path: tailPath,
      log_name: tailName
    })
  }

  // tail -f stop
  const handleStopTailF = () => {
    console.log('handleStopTailF called, socket connected:', socket?.connected)
    if (socket && socket.connected) {
      console.log('Emitting stop_tail_f event...')
      socket.emit('stop_tail_f', {})
      
      // モーダルを閉じる
      const modal = document.getElementById('my-modal') as HTMLInputElement
      if (modal) {
        console.log('Closing modal...')
        modal.checked = false
      }
    } else {
      console.log('SocketIO not connected, cannot stop tail -f')
    }
  }

  // ログクリア
  const handleClearLogs = () => {
    console.log('Clearing logs...')
    setLogs([])
    console.log('Logs cleared')
  }

  // 統合開始ボタン: SocketIO接続 + tail -f Start
  const handleStartAll = () => {
    if (isConnecting) {
      console.log('Already connecting...')
      return
    }

    if (!tailName) {
      console.log('ログ名が選択されていません')
      alert('ログ名を選択してください')
      return
    }

    console.log('Starting SocketIO connection and tail -f...')
    setIsConnecting(true)
    
    // SocketIO接続
    const newsocket = io('http://localhost:7776/', {
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: false,
      timeout: 20000,
      forceNew: true
    })
    
    console.log('SocketIO object created:', newsocket)
    setSocket(newsocket)
  }

  // 統合停止ボタン: tail -f Stop + SocketIO切断
  const handleStopAll = () => {
    console.log('Stopping tail -f and disconnecting SocketIO...')
    
    if (socket && socket.connected) {
      // tail -f停止
      console.log('Emitting stop_tail_f event...')
      socket.emit('stop_tail_f', {})
    }
    
    // SocketIO切断
    if (socket) {
      console.log('Disconnecting SocketIO...')
      socket.disconnect()
      setSocket(null)
    }
    
    setIsActive(false)
    setIsConnecting(false)
    
    // モーダルを閉じる
    const modal = document.getElementById('my-modal') as HTMLInputElement
    if (modal) {
      console.log('Closing modal...')
      modal.checked = false
    }
  }

  // SocketIOイベントリスナーを登録
  useEffect(() => {
    if (socket) {
      console.log('Setting up SocketIO event listeners')
      
      // 接続確認メッセージを受信
      socket.on('message', (data) => {
        console.log('SocketIO message:', data)
      })
      
      // ログデータを受信
      socket.on('log', (msg) => {
        console.log('receive log:', msg)
        setLogs((logs) => {
          const newLogs = [...logs, { name: msg.name || tailName, line: msg.line }]
          console.log('Updated logs:', newLogs)
          return newLogs
        })
      })

      // tail -f ステータスを受信
      socket.on('tail_f_status', (data) => {
        console.log('tail -f status received:', data)
        if (data.status === 'started') {
          console.log('Setting isActive to true')
          setIsActive(true)
        } else if (data.status === 'stopped') {
          console.log('Setting isActive to false')
          setIsActive(false)
        } else if (data.status === 'error') {
          console.log('tail -f error:', data.message)
          setIsActive(false)
        }
      })

      socket.on('connect', () => {
        console.log('Connected to SocketIO server')
        console.log('Socket connected state:', socket.connected)
        console.log('Socket ID:', socket.id)
        setIsActive(false) // 初期状態は非アクティブ
        setIsConnecting(false) // 接続完了
        
        // 接続成功後、自動的にtail -fを開始
        if (tailName) {
          console.log('Auto-starting tail -f after connection...')
          setTimeout(() => {
            socket.emit('start_tail_f', {
              cvm_ip: cvmChecked,
              log_path: tailPath,
              log_name: tailName
            })
          }, 1000) // 1秒待機してから開始
        }
      })

      socket.on('disconnect', () => {
        console.log('Disconnected from SocketIO server')
        setIsActive(false)
        setIsConnecting(false) // 接続状態をリセット
      })

      socket.on('connect_error', (error) => {
        console.error('SocketIO connection error:', error)
        setIsConnecting(false) // 接続エラー時も接続状態をリセット
      })
    }

    // クリーンアップ関数
    return () => {
      if (socket) {
        console.log('Cleaning up SocketIO event listeners')
        socket.off('message')
        socket.off('log')
        socket.off('tail_f_status')
        socket.off('connect')
        socket.off('disconnect')
        socket.off('connect_error')
      }
    }
  }, [socket]) // socketのみを依存配列に

  // パラメータが変更された時の処理（手動でtail -fを再開始する必要がある）
  useEffect(() => {
    if (socket && socket.connected && isActive) {
      console.log('Parameters changed, need to restart tail -f manually')
      // 自動再開はしない。ユーザーが手動でtail -fを再開始する必要がある
    }
  }, [socket, cvmChecked, tailName, tailPath, isActive])

  // page遷移で disconnect
  useEffect(() => {
    const handleRouteChange = () => {
      handleStopAll() // SocketIO + SSH両方を切断
    }
    
    // ページの再読み込み・閉じる時に確実に切断
    const handleBeforeUnload = () => {
      handleStopAll() // SocketIO + SSH両方を切断
    }
    
    console.log('beforeHistoryChange on')
    
    // beforeunloadイベントを追加
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      console.log('beforeHistoryChange off')
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [pathname, searchParams])

  // change false after modal

  const filteredLogs = logs.filter((logM) => logM.line.includes(filter))
  
  // デバッグ用ログ
  console.log('logs:', logs)
  console.log('filter:', filter)
  console.log('filteredLogs:', filteredLogs)

  return (
    <>
      <div className='flex justify-center items-center m-2 space-x-2'>
        {/* 統合ボタンとログクリアボタン */}
        <div className='flex gap-2'>
          {/* 統合開始/停止ボタン */}
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
          
          {/* ログクリアボタン */}
          <div className='btn btn-warning btn-outline' onClick={handleClearLogs}>
            ログクリア
          </div>
        </div>

        {/* ログ取得停止確認モーダル */}
        <input type='checkbox' id='my-modal' className='modal-toggle' />
        <label htmlFor='my-modal' className='modal cursor-pointer'>
          <label className='modal-box relative text-left' htmlFor=''>
            <p className='text-lg font-bold'>ログ取得停止します</p>
            <div className='modal-action'>
              <button className='btn btn-error' onClick={handleStopAll}>
                STOP
              </button>
              <label htmlFor='my-modal' className='btn'>
                キャンセル
              </label>
            </div>
          </label>
        </label>
      </div>

      <div className='mockup-code  h-[480px] overflow-auto text-left mx-5' ref={logViewRef}>
        <div className='w-[640px]'>
          <pre className='px-2'>
            <code>
              {filteredLogs.map((log: dict, i) => {
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
