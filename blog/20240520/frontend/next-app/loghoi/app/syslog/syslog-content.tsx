'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { saveAs } from 'file-saver'

// need install
import { Controller, SubmitHandler, useForm } from 'react-hook-form'

/* カレンダーからデータを取得するためのライブラリの読み込み */
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

// fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

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
  const [resMsg, setResMsg] = useState<string[]>([])

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

  // FileをSaveするための関数を定義
  const handleDownload = () => {
    const data = resMsg.join('\n')
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
    const query = { pcip: pcip, cluster: cluster }
    const sendData = { data, query }
    console.log('************ senddata debug *************', sendData)

    const requestUrl = `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/sys/search`
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sendData),
    }

    const response = await fetch(requestUrl, requestOptions)
    if (response.status === 200) {
      const resJson = await response.json()
      setResMsg(resJson)
    } else {
      alert('Failed to connect to backend')
    }
  }

  const handleClear = () => {
    setResMsg([])
  }

  const filteredLogs = resMsg.filter((logM) => logM.toLowerCase().includes(filter.toLowerCase()))

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
                          selected={value}
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
                          selected={value}
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
                    <button className='btn btn-primary' type='submit'>
                      Search
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
            <div className=''>
              <div className='mockup-code h-[480px] overflow-auto text-left mx-5 '>
                <div className='w-[640px] '>
                  <pre className='px-2'>
                    <code className=''>
                      {filteredLogs.map((val: string, idx: number) => (
                        <p className='text-xs m-0' key={idx}>
                          {val}
                        </p>
                      ))}
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
