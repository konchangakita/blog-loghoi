'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

//api
import fetchPost from '@/app/_api/getTailList'

// Lib
//import { LogFiles } from '@/lib/rt-logs'
import { LogFiles } from '@/lib/rt-logs'

//components
import LogViewer from './realtimelog-logview'

//fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

interface dict {
  [key: string]: any
}

const Content = () => {
  const searchParams = useSearchParams()

  // filter word
  const [filter, setFilter] = useState<string>('')
  console.log('filter word:', filter)
  const clearFilter = () => {
    setFilter('')
  }

  const [tailPath, setTailPath] = useState<string>('/home/nutanix/data/logs/genesis.out')
  const [tailCecked, setTailChecked] = useState<string>('genesis')
  const handleTailLog = (name: string, path: string) => {
    console.log(path)
    setTailChecked(name)
    setTailPath(path)
  }

  // Tailするファイル一覧 from setting_realtimelog.json
  const TailList = () => {
    return (
      <>
        <p className='border border-black p-1'>Log list</p>
        <form>
          {LogFiles.map((val) => {
            return (
              <div key={val.name}>
                <label className='label justify-start cursor-pointer pl-0.5 p-0 text-sm'>
                  <input type='radio' value={val.name} onChange={() => handleTailLog(val.name, val.path)} checked={tailCecked === val.name} />
                  <div className='pl-1'>{val.name}</div>
                </label>
              </div>
            )
          })}
        </form>
      </>
    )
  }

  // CVM list, and connect to paramiko with checked cvm
  type ResValues = {
    pc_list: dict
    cluster_list: dict
  }

  function CvmList() {
    const searchParams = useSearchParams()
    const [isLoading, setLoading] = useState(true)

    const ClusterName = searchParams.get('cluster')
    const [cvmChecked, setcvmChecked] = useState<string>('')
    const prismLeader: string = ''
    useEffect(() => {
      setcvmChecked(prismLeader)
    }, [prismLeader])

    console.log('cluster name', ClusterName)

    const requestUrl = `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/cvmlist`
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ClusterName),
    }

    //const [data, setData] = useState<ResValues>()
    const [data, setData] = useState()

    /*
    useEffect(() => {
      const fetchData = async () => {
        const response = await fetch(requestUrl, requestOptions)
        const data = await response.json()
        setData(data)
      }
      fetchData()
    }, [])
    */
    useEffect(() => {
      fetch(requestUrl, requestOptions)
        .then((res) => res.json())
        .then((data) => {
          setData(data)
          setLoading(false)
        })
    }, [])

    console.log('CVM List:', data)

    if (isLoading) return <p>Loading...</p>
    if (!data) return <p>No profile data</p>

    if (data !== undefined) {
      // Prism Leaderが取得できていなかったら、CVMへsshできていないので、ssh Key設定のアラートをだす
      if (data['prism_leader'] === undefined) {
        alert('ssh key を Prism Elementで設定してください')
      } else {
      }

      // Prism Leaderが取得できたら更新
      const prismLeader: string = data ? data['prism_leader'] : ''
      const cvmChecked: string = prismLeader

      console.log('prismLeader to cvmChecked', prismLeader, cvmChecked)

      const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault()
        setcvmChecked(e.target.value)
      }

      const cvmsIp: any = data['cvms_ip']
      const dispCvm = cvmsIp.map((val: string, idx: number) => {
        const isLeader = val === prismLeader ? '*' : null
        console.log('cvmChecked', cvmChecked)
        console.log(val)
        return (
          <div key={idx}>
            <label className='label justify-normal cursor-pointer p-0'>
              <input type='radio' name='cvm' value={val} className='radio radio-primary radio-xs' onChange={handleOptionChange} checked={cvmChecked === val} />
              <div className='inline pl-1 text-left'>
                {val}
                <p className='inline text-xl text-red-700'>{isLeader}</p>
              </div>
            </label>
          </div>
        )
      })
      return <form>{dispCvm}</form>
    }
    return <></>
  }

  return (
    <>
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
          <div className='form-control flex basis-1/12 p-1 border'>
            <div>
              <TailList />
            </div>
            <div className='p-1'>
              <div>
                <div className='pt-2'>
                  <p className='border border-black p-1'>CVM list</p>
                </div>
                <div className=''>
                  <CvmList />
                </div>
                <div className=''>
                  <p className='inline text-xl text-red-700 '>*</p>
                  <p className='inline text-xs text-red-700 '>Prism Leader</p>
                </div>
              </div>
            </div>
          </div>
          <div className='p-1 flex basis-11/12 flex-col'>
            <LogViewer />
          </div>
        </div>
      </div>
    </>
  )
}
export default Content
