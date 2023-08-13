import type { NextPage } from 'next'
import Link from 'next/link'
import { useState, useEffect } from 'react'

import MyHead from '@/components/myhead'
import Layout from '@/components/layout'
import LogViewer from '@/components/logviewer'

import { saveAs } from 'file-saver'

import { GetServerSideProps } from 'next'
import { InferGetServerSidePropsType } from 'next'
type Props = InferGetServerSidePropsType<typeof getServerSideProps>

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

interface dict {
  [key: string]: string
}

const RealtimeLog: NextPage<Props> = ({ res, hostname }) => {
  //console.log('cluster', res)
  console.log('hostname: ', hostname)
  const cvmsIp = res.cluster_info.cvms_ip
  const prismLeader: string = res.cluster_info.prism_leader
  const [cvmChecked, setcvmChecked] = useState<string>(prismLeader)
  const [tailPath, setTailPath] = useState<string>('/home/nutanix/data/logs/genesis.out')

  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    setcvmChecked(e.target.value)
  }

  // CVM list, and connect to paramiko with checked cvm
  function CvmList() {
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

  const [tailCecked, setTailChecked] = useState<string>('genesis')
  const TailList = () => {
    const tailFileList = res.tail_file_list
    /*
    const [tailFile, setTailFile] = useState([])
    useEffect(() => {
      fetch('/api/rt_taillist', { method: 'GET' })
        .then((response) => response.json())
        .then((data) => setTailFile(data))
    }, [])
    */

    const handleTailLog = (name: string, path: string) => {
      console.log(path)
      setTailChecked(name)
      setTailPath(path)
    }

    return (
      <>
        <p className='border border-black p-1'>List</p>
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

  const [filter, setFilter] = useState<string>('')
  console.log('filter word:', filter)
  const clearFilter = () => {
    setFilter('')
  }

  return (
    <>
      <MyHead title='realtimelog' />
      <main data-theme='white' className='text-center items-center'>
        <Layout>
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
                  <LogViewer cvmChecked={cvmChecked} tailName={tailCecked} tailPath={tailPath} filter={filter} hostname={hostname} />
                </div>
              </div>
            </div>
          </div>
        </Layout>
      </main>
    </>
  )
}

export default RealtimeLog

export const getServerSideProps: GetServerSideProps = async (context) => {
  //const fetchUrl = 'http://backend:7776/api/cvmlist'
  const fetchUrl = 'http://backend:7776/api/rt/taillist'

  const keyword = context.query
  const _hostname = context.req.rawHeaders[1]
  const hostname = _hostname.split(':')[0]
  console.log('>>>>>>>>>>>>>>> hostname ', hostname)
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(keyword),
  }

  try {
    const response = await fetch(fetchUrl, requestOptions)
    if (response.ok) {
      const res: dict = await response.json()
      return { props: { res, hostname: hostname } }
    }
    console.log('connection error')
    return { props: {} }
  } catch (err) {
    //console.error(err)
    console.log('connection error')
    return { props: {} }
  }
}
