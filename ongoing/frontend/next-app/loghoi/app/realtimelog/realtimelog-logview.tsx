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
    console.log('Starting SocketIO connection...')
    // Docker Compose環境では、ブラウザから直接アクセスするためlocalhostを使用
    const newsocket = io('http://localhost:7776/', {
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: false,
      timeout: 20000,
      forceNew: true
    })
    //const websocketBackend = 'http://' + hostname + ':7776/'
    //const websocketBackend = `${process.env.NEXT_PUBLIC_BACKEND_HOST}`
    //const newsocket = io(websocketBackend)
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
    }
  }

  // tail -f start
  const handleStartTailF = () => {
    if (socket && socket.connected) {
      console.log('Starting tail -f...')
      socket.emit('start_tail_f', {
        cvm_ip: cvmChecked,
        log_path: tailPath
      })
    } else {
      console.log('SocketIO not connected')
    }
  }

  // tail -f stop
  const handleStopTailF = () => {
    if (socket && socket.connected) {
      console.log('Stopping tail -f...')
      socket.emit('stop_tail_f', {})
    } else {
      console.log('SocketIO not connected')
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
          const newLogs = [...logs, { name: tailName, line: msg.line }]
          console.log('Updated logs:', newLogs)
          return newLogs
        })
      })

      // tail -f ステータスを受信
      socket.on('tail_f_status', (data) => {
        console.log('tail -f status:', data)
        if (data.status === 'started') {
          setIsActive(true)
        } else if (data.status === 'stopped') {
          setIsActive(false)
        }
      })

      socket.on('connect', () => {
        console.log('Connected to SocketIO server')
        console.log('Socket connected state:', socket.connected)
        console.log('Socket ID:', socket.id)
        setIsActive(false) // 初期状態は非アクティブ
      })

      socket.on('disconnect', () => {
        console.log('Disconnected from SocketIO server')
        setIsActive(false)
      })

      socket.on('connect_error', (error) => {
        console.error('SocketIO connection error:', error)
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
      handleDisconnect()
    }
    
    // ページの再読み込み・閉じる時に確実に切断
    const handleBeforeUnload = () => {
      handleDisconnect()
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
        {/* SocketIO接続ボタン */}
        {!socket || !socket.connected ? (
          <div className='btn btn-primary btn-outline' onClick={handleConnect}>
            SocketIO接続
          </div>
        ) : (
          <div className='btn btn-secondary btn-outline' onClick={handleDisconnect}>
            SocketIO切断
          </div>
        )}

        {/* tail -f ボタン */}
        {socket && socket.connected ? (
          !isActive ? (
            <div className='btn btn-success btn-outline' onClick={handleStartTailF}>
              tail -f Start
            </div>
          ) : (
            <label htmlFor='my-modal'>
              <div className='btn btn-warning btn-outline'>
                tail -f Stop
              </div>
            </label>
          )
        ) : (
          <div className='btn btn-disabled btn-outline'>
            tail -f Start (SocketIO未接続)
          </div>
        )}

        {/* tail -f停止確認モーダル */}
        <input type='checkbox' id='my-modal' className='modal-toggle' />
        <label htmlFor='my-modal' className='modal cursor-pointer'>
          <label className='modal-box relative text-left' htmlFor=''>
            <p className='text-lg font-bold'>tail -f停止確認</p>
            <p className='py-4'>tail -fを停止しますか？</p>
            <div className='modal-action'>
              <button className='btn btn-error' onClick={handleStopTailF}>
                停止
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
                  <div className='text-xs m-0' key={i}>
                    <p className='inline text-primary'>{log.name}</p> {log.line}
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
