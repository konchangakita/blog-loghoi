'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

// Lib
//import { LogFiles } from '@/lib/rt-logs'
import { LogFiles } from '@/lib/rt-logs'

//components
import LogViewer from './realtimelog-logview'
import Loading from '@/components/loading'

//fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

interface dict {
  [key: string]: any
}

type ResValues = {
  block_serial_number: string
  cvms_ip: []
  hypervisor: string
  name: string
  pc_ip: string
  prism_ip: string
  prism_leader: string
  timestamp: string
  uuid: string
}

const RealtimelogContent = () => {
  const searchParams = useSearchParams()
  const PrismIp = searchParams.get('prism')

  // filter word
  const [filter, setFilter] = useState<string>('')
  console.log('filter word:', filter)
  const clearFilter = () => {
    setFilter('')
  }

  const [tailPath, setTailPath] = useState<string>('/home/nutanix/data/logs/genesis.out')
  const [tailCecked, setTailChecked] = useState<string>('genesis')
  const handleTailLog = (name: string, path: string) => {
    setTailChecked(name)
    setTailPath(path)
  }

  // Tailするファイル一覧 from setting_realtimelog.json
  const TailList = () => {
    return (
      <>
        <p className='border border-black p-1'>Log list</p>
        <p className='font-extrabold bg-purple-100 rounded-full'>{tailCecked}</p>
        <div className='h-[460px] overflow-auto overflow-x-hidden scroll-py-1 scroll-padding antiscrollbar-vertical antiscrollbar-w-7'>
          <form>
            {LogFiles.map((val, idx: number) => {
              return (
                <div className='hover:bg-gray-200' key={idx}>
                  <label className='label justify-start cursor-pointer pl-0.5 p-0 text-sm'>
                    <input type='radio' value={val.name} onChange={() => handleTailLog(val.name, val.path)} checked={tailCecked === val.name} />
                    <div className='pl-1'>{val.name}</div>
                  </label>
                </div>
              )
            })}
          </form>
        </div>
      </>
    )
  }

  // CVM list, and connect to paramiko with checked cvm
  const ClusterName = searchParams.get('cluster')
  const [isLoading, setLoading] = useState(true)
  const [data, setData] = useState<ResValues>()

  const [prismLeader, setprismLeader] = useState<string>('')
  const [cvmChecked, setcvmChecked] = useState<string>('')
  const requestUrl = `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/cvmlist`
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cluster_name: ClusterName }),
  }

  useEffect(() => {
    fetch(requestUrl, requestOptions)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        console.log('CVM API response:', data)
        setData(data)
        setLoading(false)
        
        // APIレスポンスの形式に応じて処理
        if (data && data.cvm_list) {
          // 新しいAPI形式: {cvm_list: [...]}
          const cvmData = data.cvm_list
          if (cvmData && cvmData.prism_leader) {
            setprismLeader(cvmData.prism_leader)
            setcvmChecked(cvmData.prism_leader)
          } else {
            alert('ssh key を cluster [' + PrismIp + '] の Prism Element で設定してください')
          }
        } else if (data && data.prism_leader) {
          // 古いAPI形式: {prism_leader: ...}
          setprismLeader(data.prism_leader)
          setcvmChecked(data.prism_leader)
        } else {
          alert('ssh key を cluster [' + PrismIp + '] の Prism Element で設定してください')
        }
      })
      .catch((error) => {
        console.error('CVM API error:', error)
        setLoading(false)
        alert('CVM情報の取得に失敗しました: ' + error.message)
      })

    console.log('cluster data get', prismLeader, cvmChecked)
  }, [])

  function CvmList({ cvmsIp, prismLeader, cvmChecked }: { cvmsIp: any, prismLeader: string, cvmChecked: string }) {
    if (isLoading) return <p>Loading...</p>

    // cvmsIpが存在しない場合のエラーハンドリング
    if (!cvmsIp) {
      console.error('cvmsIp is undefined')
      return (
        <div className="text-red-500 p-4">
          Error: CVM IP data is not available
        </div>
      )
    }

    // cvmsIpが配列でない場合のエラーハンドリング
    if (!Array.isArray(cvmsIp)) {
      console.error('cvmsIp is not an array:', cvmsIp)
      return (
        <div className="text-red-500 p-4">
          Error: CVM IP data is not in valid format
        </div>
      )
    }
    const handleOptionChange = (val: string) => {
      setcvmChecked(val)
      console.log('change cvm', val)
    }

    // cvmsIpが配列でない場合のエラーハンドリング
    if (!Array.isArray(cvmsIp)) {
      console.error('cvmsIp is not an array:', cvmsIp)
      return (
        <div className="text-red-500 p-4">
          Error: CVM IP data is not available or invalid format
        </div>
      )
    }

    const dispCvm = cvmsIp.map((val: string, idx: number) => {
      const isLeader = val === prismLeader ? '*' : null
      return (
        <div key={idx}>
          <label className='label justify-normal cursor-pointer p-0'>
            <input
              type='radio'
              name='cvm'
              value={val}
              className='radio radio-primary radio-xs'
              onChange={() => handleOptionChange(val)}
              checked={val === cvmChecked}
            />
            <div className='inline pl-1 text-left select-text'>
              <span className='select-text'>{val}</span>
              <p className='inline text-xl text-red-700'>{isLeader}</p>
            </div>
          </label>
        </div>
      )
    })
    return <form>{dispCvm}</form>
  }

  return (
    <>
      {isLoading && <Loading />}
      <div className='p-1 flex justify-center'>
        <div className='m-1 relative  w-[480px] '>
          <input
            type='text'
            value={filter}
            className='textarea textarea-bordered w-[480px]'
            placeholder='検索用のフィルターワードを入力してください。'
            onChange={(e) => setFilter(e.target.value)}
          />
          <button className='absolute inset-y-2 right-4 opacity-20 hover:opacity-100' onClick={clearFilter}>
            <FontAwesomeIcon icon={faXmark} size='lg' />
          </button>
        </div>
      </div>
      <div className='p-1'>
        <div className='p-1 flex flex-nowrap justify-center items-start'>
          <div className='form-control flex basis-1/12 p-1 border '>
            <div className=''>
              <TailList />
            </div>
            <div className='p-1'>
              <div>
                <div className='pt-2'>
                  <p className='border border-black p-1'>CVM list</p>
                </div>
                <div className=''>
                  <CvmList 
                    cvmsIp={data?.cvm_list?.cvms_ip || data?.cvms_ip || []} 
                    prismLeader={prismLeader} 
                    cvmChecked={cvmChecked} 
                  />
                </div>
                <div className=''>
                  <p className='inline text-xl text-red-700 '>*</p>
                  <p className='inline text-xs text-red-700 '>Prism Leader</p>
                </div>
              </div>
            </div>
          </div>
          <div className='p-1 flex basis-11/12 flex-col'>
            <LogViewer cvmChecked={cvmChecked} tailName={tailCecked} tailPath={tailPath} filter={filter} />
          </div>
        </div>
      </div>
    </>
  )
}
export default RealtimelogContent
