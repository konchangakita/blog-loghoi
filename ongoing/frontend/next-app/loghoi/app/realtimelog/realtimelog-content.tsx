'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

//api
import fetchPost from '@/app/_api/getTailList'

// Lib
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

    console.log('cluster name', searchParams.get('cluster'))
    const requestUrl = `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/cvmlist`
    //const [data, setData] = useState<ResValues>()
    const [data, setData] = useState()

    useEffect(() => {
      const fetchData = async () => {
        const response = await fetch(requestUrl, { method: 'POST' })
        const data = await response.json()
        setData(data)
      }
      fetchData()
    }, [])
    console.log('CVM List:', data)

    return (
      <div>
        <div className=' pl-1 text-left'>CVM-1</div>
        <div className=' pl-1 text-left'>CVM-2</div>
        <div className=' pl-1 text-left'>CVM-3</div>
      </div>
    )
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
