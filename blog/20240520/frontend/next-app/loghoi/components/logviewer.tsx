import { useEffect, useState, useRef } from 'react'
import io, { Socket } from 'socket.io-client'

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

  // connect websocket
  const handleConnect = () => {
    //const newsocket = io('http://172.16.0.132:7776/')
    //const websocketBackend = 'http://' + hostname + ':7776/'
    const websocketBackend = `${process.env.NEXT_PUBLIC_HOST}`
    const newsocket = io(websocketBackend)
    setSocket(newsocket)
  }

  const handleDisconnect = () => {
    if (socket) {
      socket.disconnect()
      setSocket(null)
    }
  }

  useEffect(() => {
    if (socket) {
      socket.on('connect', () => {
        console.log('Connected to WebSocket server')
        setIsActive(true)

        socket.emit('log', { cvm: cvmChecked, tail_name: tailName, tail_path: tailPath })
        socket.on('log', (msg) => {
          console.log('recive log:', msg)
          setLogs((logs) => [...logs, msg])
        })
      })

      socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server')
      })
    }

    return () => {
      handleDisconnect()
    }
  }, [socket])

  // page遷移で disconnect
  useEffect(() => {
    const handleRouteChange = () => {
      handleDisconnect()
    }
    console.log('beforeHistoryChange on')
    return () => {
      console.log('beforeHistoryChange off')
    }
  }, [pathname, searchParams])

  // change false after modal
  const handleActiveFlase = () => {
    setIsActive(false)
  }

  const filteredLogs = logs.filter((logM) => logM.line.includes(filter))

  return (
    <>
      <div className='flex justify-center items-center m-2'>
        {!isActive ? (
          <div className='btn btn-primary btn-wide btn-outline' onClick={handleConnect}>
            "tail -f" Start!
          </div>
        ) : (
          <label htmlFor='my-modal'>
            <div className='hotx btn btn-secondary btn-wide btn-outline' onClick={handleDisconnect}>
              <p className=''>"tail -f {tailName}" NOW</p>
              <p className=''>stop?</p>{' '}
            </div>
          </label>
        )}

        {/* Put this part before </body> tag */}
        <input type='checkbox' id='my-modal' className='modal-toggle' />
        <label htmlFor='my-modal' className='modal cursor-pointer'>
          <label className='modal-box relative text-left' htmlFor=''>
            <p className='text-lg font-bold '>Stopped</p>
            <p className='py-4'>mokemoke</p>
            <div className='modal-action' onClick={handleActiveFlase}>
              <label htmlFor='my-modal' className='btn'>
                close
              </label>
            </div>
          </label>
        </label>
      </div>

      {/*
      <div className='mockup-code sm:w-auto w-[1470px] h-[480px] overflow-auto text-left mx-5' ref={logViewRef}>
      */}
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
