'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { saveAs } from 'file-saver'
import { getBackendUrl } from '../../lib/getBackendUrl'

// need install
import { Controller, SubmitHandler, useForm } from 'react-hook-form'

/* カレンダーからデータを取得するためのライブラリの読み込み */
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

// fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

//components
import Loading from '@/components/loading'

// Input value
type FormValues = {
  searchtxt: string
  startDateTime: Date | null
  endDateTime: Date | null
  startDT: Date | null
  endDT: Date | null
}
const SyslogContent = () => {
  const searchParams = useSearchParams()
  const pcip = searchParams.get('pcip')
  const cluster = searchParams.get('cluster')
  const prism = searchParams.get('prism')
  const [resMsg, setResMsg] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isPageLoading, setIsPageLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  // react hook form
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>()

  // 開始日の初期設定
  const [startDateTime, setStartDateTime] = useState<Date | null>(() => {
    const currentDate = new Date()
    currentDate.setMinutes(0, 0, 0)
    currentDate.setDate(currentDate.getDate() - 7)
    return currentDate
  })

  // 終了日の初期設定
  const [endDateTime, setEndDateTime] = useState<Date | null>(() => {
    const currentDate = new Date()
    currentDate.setMinutes(0, 0, 0)
    return currentDate
  })

  // フィルター用初期設定
  const [filter, setFilter] = useState<string>('')
  console.log('filter word:', filter)
  const clearFilter = () => {
    setFilter('')
  }

  // ページの初期読み込み完了時にローディング状態を解除
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false)
    }, 1000) // 1秒後にローディング完了

    return () => clearTimeout(timer)
  }, [])

  // FileをSaveするための関数を定義
  const handleDownload = () => {
    const data = resMsg.map((logEntry: any) => {
      if (typeof logEntry === 'string') {
        return logEntry
      } else {
        const parts = []
        if (logEntry.timestamp) parts.push(`[${new Date(logEntry.timestamp).toLocaleString('ja-JP')}]`)
        if (logEntry.hostname) parts.push(`[${logEntry.hostname}]`)
        if (logEntry.facility_label) parts.push(`[Facility: ${logEntry.facility_label}]`)
        if (logEntry.severity_label) parts.push(`[Severity: ${logEntry.severity_label}]`)
        parts.push(logEntry.message || '')
        return parts.join(' ')
      }
    }).join('\n')
    
    const outputData = new Blob([data], { type: 'text/plain;charset=utf-8' })
    const nowData = new Date()
    const yearData = nowData.getFullYear()
    const monthData = ('0' + (nowData.getMonth() + 1)).slice(-2)
    const dayData = ('0' + nowData.getDate()).slice(-2)
    const hoursData = ('0' + nowData.getHours()).slice(-2)
    const minutesData = ('0' + nowData.getMinutes()).slice(-2)
    const secondsData = ('0' + nowData.getSeconds()).slice(-2)
    const outputDateName = `syslog_${yearData}${monthData}${dayData}-${hoursData}${minutesData}${secondsData}.txt`
    console.log(outputDateName)
    saveAs(outputData, outputDateName)
  }

  const searchSyslog: SubmitHandler<FormValues> = async (data) => {
    console.log('********** debug **************: ', data)
    
    setIsLoading(true)
    setError('')
    
    // 日付を適切な形式に変換
    const formatDate = (date: Date | null) => {
      if (!date) return ''
      return date.toISOString().replace('Z', '')
    }
    
    const sendData = {
      keyword: data.searchtxt || '',
      start_datetime: formatDate(data.startDT),
      end_datetime: formatDate(data.endDT),
      serial: '', // 必要に応じて設定
      cluster: cluster || '' // URLパラメータから取得
    }
    
    const requestUrl = `${getBackendUrl()}/api/sys/search`
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sendData),
    }

    try {
      const response = await fetch(requestUrl, requestOptions)
      const resJson = await response.json()
      
      
      if (response.status === 200 && resJson.status === 'success') {
        setResMsg(resJson.data || [])
        setError('')
      } else {
        console.error('API Error:', resJson)
        setError(`検索エラー: ${resJson.message || 'Unknown error'}`)
        setResMsg([])
      }
    } catch (error) {
      console.error('Network Error:', error)
      setError('バックエンドへの接続に失敗しました')
      setResMsg([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setResMsg([])
    setError('')
  }

  const filteredLogs = resMsg.filter((logEntry) => {
    if (typeof logEntry === 'string') {
      // 古い形式（文字列）の場合
      return logEntry.toLowerCase().includes(filter.toLowerCase())
    } else {
      // 新しい形式（オブジェクト）の場合
      const message = logEntry.message || ''
      const facility = logEntry.facility_label || ''
      const severity = logEntry.severity_label || ''
      const searchText = filter.toLowerCase()
      return message.toLowerCase().includes(searchText) ||
             facility.toLowerCase().includes(searchText) ||
             severity.toLowerCase().includes(searchText)
    }
  })

  // ページの初期読み込み中はローディング画面を表示
  if (isPageLoading) {
    return <Loading />
  }

  return (
    <>
      <div className='p-1'>
        <div className='p-1'>
          <div className='form-control'>
            <form onSubmit={handleSubmit(searchSyslog)}>
              <div className='p-1'>
                {/* <input {...register('searchtxt')} type='text' placeholder='検索用のホイホイワードを入力' className='input input-bordered input-md w-full max-w-xs' /> */}
                <input type='text' {...register('searchtxt')} className='textarea textarea-bordered w-full' placeholder='検索キーワードを入力' />
              </div>
              <div className='flex flex-nowrap p-1'>
                <div className='p-1 '>
                  <label className='label'>
                    <span className='label-text'></span>
                  </label>
                  <label className='input-group input-group-vertical'>
                    <span>Start Date</span>
                    <Controller
                      name='startDT'
                      control={control}
                      defaultValue={startDateTime}
                      render={({ field: { onChange, value } }) => (
                        <DatePicker
                          id='startDateTime'
                          className='input input-bordered input-primary input-sm w-50'
                          dateFormat='yyyy/MM/dd HH:mm'
                          /* locale='ja' */
                          selected={value || startDateTime}
                          onChange={onChange}
                          showTimeSelect
                          timeIntervals={60}
                          timeFormat='HH:mm'
                        />
                      )}
                    />
                  </label>
                </div>
                {/* <div className='p-1 '>〜</div> */}
                <div className='p-1 '>
                  <label className='label'>
                    <span className='label-text'></span>
                  </label>
                  <label className='input-group input-group-vertical'>
                    <span>End Date</span>
                    <Controller
                      name='endDT'
                      control={control}
                      defaultValue={endDateTime}
                      render={({ field: { onChange, value } }) => (
                        <DatePicker
                          id='endDateTime'
                          className='input input-bordered input-primary input-sm w-50'
                          dateFormat='yyyy/MM/dd HH:mm'
                          /* locale='ja' */
                          selected={value || endDateTime}
                          onChange={onChange}
                          showTimeSelect
                          timeIntervals={60}
                          timeFormat='HH:mm'
                        />
                      )}
                    />
                  </label>
                </div>
                <div className='p-1 flex items-stretch'>
                  <div className='self-end'>
                    <button 
                      className='btn btn-primary' 
                      type='submit'
                      disabled={isLoading}
                    >
                      {isLoading ? '検索中...' : 'Search'}
                    </button>
                  </div>
                </div>
                <div className='p-1 flex items-stretch'>
                  <div className='self-end'>
                    <div className='btn btn-secondary' onClick={handleClear}>
                      Clear
                    </div>
                  </div>
                </div>

                <div className='m-1 relative  w-[360px] self-end '>
                  <input
                    type='text'
                    value={filter}
                    className='textarea textarea-bordered w-[360px]'
                    placeholder='フィルター'
                    onChange={(e) => setFilter(e.target.value)}
                  />
                  <button className='absolute inset-y-2 right-4 opacity-20 hover:opacity-100' onClick={clearFilter}>
                    <FontAwesomeIcon icon={faXmark} size='lg' />
                  </button>
                </div>
              </div>
            </form>
            
            {/* エラーメッセージ表示 */}
            {error && (
              <div className='alert alert-error mx-5 mt-2'>
                <span>{error}</span>
              </div>
            )}
            
            
            {/* ローディング表示 */}
            {isLoading && <Loading />}
            
            <div className=''>
              <div className='mockup-code h-[480px] overflow-auto text-left mx-5 '>
                <div className='w-full '>
                  <pre className='px-2'>
                    <code className=''>
                      {filteredLogs.map((logEntry: any, idx: number) => (
                        <div key={idx} className='text-xs m-0 mb-1 p-1 border-l-2 border-gray-200'>
                          {typeof logEntry === 'string' ? (
                            // 古い形式（文字列）の場合
                            <p className='m-0 text-white'>{logEntry}</p>
                          ) : (
                            // 新しい形式（オブジェクト）の場合
                            <div className='m-0'>
                              <div className='flex flex-nowrap gap-2 mb-1 overflow-x-auto'>
                                {logEntry.timestamp && (
                                  <span className='px-2 py-1 text-xs text-white bg-transparent border border-gray-400 rounded flex-shrink-0'>
                                    {new Date(logEntry.timestamp).toLocaleString('ja-JP')}
                                  </span>
                                )}
                                {logEntry.hostname && (
                                  <span className='px-2 py-1 text-xs text-white bg-transparent border border-gray-400 rounded flex-shrink-0'>
                                    Host: {logEntry.hostname}
                                  </span>
                                )}
                                {logEntry.facility_label && (
                                  <span className='px-2 py-1 text-xs text-white bg-transparent border border-gray-400 rounded flex-shrink-0'>
                                    Facility: {logEntry.facility_label}
                                  </span>
                                )}
                                {logEntry.severity_label && (
                                  <span className='px-2 py-1 text-xs text-white bg-transparent border border-gray-400 rounded flex-shrink-0'>
                                    Severity: {logEntry.severity_label}
                                  </span>
                                )}
                              </div>
                              <p className='m-0 text-white'>{logEntry.message}</p>
                            </div>
                          )}
                        </div>
                      ))}
                      {filteredLogs.length === 0 && !isLoading && (
                        <p className='text-xs m-0 text-gray-500'>検索結果がありません</p>
                      )}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
            <div className='p-1'>
              <button className='btn btn-primary' onClick={handleDownload}>
                Download
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
export default SyslogContent
