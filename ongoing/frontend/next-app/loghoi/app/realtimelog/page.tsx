'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

//components
import Navbar from '../components/navbar'
import fetchPost from '../api/fetchPost'
import LogViewer from '../components/logviewer'

//fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

interface dict {
  [key: string]: any
}

const RealtimePage = () => {
  const searchParams = useSearchParams()
  const [tailCecked, setTailChecked] = useState<string>('genesis')
  const [tailPath, setTailPath] = useState<string>('/home/nutanix/data/logs/genesis.out')
  const [cvmChecked, setcvmChecked] = useState<string>('')

  // get PC list
  const path: string = '/api/rt/taillist'
  const query: dict = { pcip: searchParams.get('pcip'), cluster: searchParams.get('cluster'), prism: searchParams.get('prism') }
  const res: any = fetchPost(path, query)
  console.log('page info: ', res)

  // Prism Leaderが取得できたら更新
  const prismLeader: string = res ? res.cluster_info.prism_leader : ''
  useEffect(() => {
    setcvmChecked(prismLeader)
  }, [prismLeader])

  // filter word
  const [filter, setFilter] = useState<string>('')
  console.log('filter word:', filter)
  const clearFilter = () => {
    setFilter('')
  }

  // CVM list, and connect to paramiko with checked cvm
  function CvmList() {
    if (res) {
      const cvmsIp = res.cluster_info.cvms_ip
      console.log('cvmlist desu')

      const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault()
        setcvmChecked(e.target.value)
      }

      const dispCvm = cvmsIp.map((val: string, idx: number) => {
        const isLeader = val === prismLeader ? '*' : null
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

  // Tailするファイル一覧 from setting_realtimelog.json
  const TailList = () => {
    if (res) {
      const tailFileList = res.tail_file_list

      const handleTailLog = (name: string, path: string) => {
        console.log(path)
        setTailChecked(name)
        setTailPath(path)
      }

      return (
        <>
          <p className='border border-black p-1'>Log list</p>
          <form>
            {tailFileList.map((val: dict, idx: number) => (
              <div key={idx}>
                <label className='label justify-start cursor-pointer pl-0.5 p-0 text-sm'>
                  <input type='radio' value={val.name} onChange={() => handleTailLog(val.name, val.path)} checked={tailCecked === val.name} />
                  <div className='pl-1'>{val.name}</div>
                </label>
              </div>
            ))}
          </form>
        </>
      )
    }
  }

  return (
    <>
      <main data-theme='white' className='text-center items-center'>
        <Navbar />
        <div className='p-1'>
          <div className='p-1'>
            <p className='text-3xl text-primary p-1'>Realtime Log Viewer &lt;tail -f&gt;</p>
          </div>
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
                    <div>
                      <p className='inline text-xl text-red-700'>*</p>
                      <p className='inline text-xs text-red-700 align-top'>Prism Leader</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className='p-1 flex basis-11/12 flex-col'>
                <LogViewer cvmChecked={cvmChecked} tailName={tailCecked} tailPath={tailPath} filter={filter} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
export default RealtimePage
