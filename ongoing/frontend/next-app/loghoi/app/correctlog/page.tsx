'use client'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

import Laoding from '../components/loading'

//components
import fetchPost from '@/app/api/fetchPost'
import Navbar from '../components/navbar'

interface dict {
  [key: string]: string
}

const CorrectPage = () => {
  const searchParams = useSearchParams()
  const pcip = searchParams.get('pcip')
  const cluster = searchParams.get('cluster')
  const prism = searchParams.get('prism')

  // loading
  const [pageLoading, setPageLoading] = useState(false)

  // get existing file list
  const path: string = '/api/hoi/hoihoilist'
  const query = { pcip: pcip, cluster: cluster }
  const res: any = fetchPost(path, query)
  console.log('page info: ', res)

  const [hoihoiList, setHoihoiList] = useState<dict[]>([])
  const [clusterInfo, setClusterInfo] = useState<dict[]>([])
  //const hoihoiList = res ? res.hoihoilist : ''
  //const clusterInfo = res ? res.cluster_info : ''
  useEffect(() => {
    if (res) {
      setHoihoiList(res.hoihoilist)
      setClusterInfo(res.cluster_info)
    }
  }, [res])

  // 真ん中の表示用
  const [logs, setLogs] = useState<string>()

  const logViewRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (logViewRef.current) {
      logViewRef.current.scrollTop = 0
      // 一番下に
      //logViewRef.current.scrollTop = logViewRef.current.scrollHeight
    }
  }, [logs])

  const [cvmChecked, setcvmChecked] = useState<string>('')
  // Prism Leaderが取得できたら更新
  const prismLeader: string = res ? res.cluster_info.prism_leader : ''
  useEffect(() => {
    setcvmChecked(prismLeader)
  }, [prismLeader])

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

  const logCollection = async () => {
    setPageLoading(true)
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND}/api/hoi/hoihoi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cvm: cvmChecked }),
    })
    if (response.status === 200) {
      const resJson = await response.json()
      location.reload()
      setPageLoading(false)
    } else {
      alert('Failed to connect to backend')
      setPageLoading(false)
    }

    setPageLoading(false)
  }

  const LogFileList = () => {
    const fileList: any = hoihoiList[0]?.file_list ? hoihoiList[0]?.file_list : null
    const latestDir = hoihoiList[0]?.file_list ? hoihoiList[0]?.directory : null
    const [selectedFile, setSelectedFile] = useState<string>('')

    const handleDownloadFile = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedFile(e.target.value) //download target file
      const { value, dataset } = e.target.options[e.target.selectedIndex]
      //const filename = dataset.directory + '/' + value
      const filename = value

      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: filename, directory: dataset.directory }),
      }
      console.log(requestOptions)
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND}/api/hoi/download`, requestOptions)
      if (response.status === 200) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        alert('Failed to connect to backend')
      }
    }

    const handleDisplayLog = (logFile: string) => {
      setLogs(logFile)
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_file: logFile, dir: latestDir }),
      }
      fetch(`${process.env.NEXT_PUBLIC_BACKEND}/api/hoi/logdisplay`, requestOptions)
        .then((response) => response.json())
        .then((data) => setLogs(data))
    }

    return (
      <>
        <div className='flex justify-center py-1'>
          <select className='select select-primary w-48 max-w-xs text-sm' value={selectedFile} onChange={handleDownloadFile}>
            <option disabled value='' className='text-center'>
              -- Please select --
            </option>
            {hoihoiList.length
              ? hoihoiList.map((val: dict, idx: number) => (
                  <option value={val.zip_filename} data-directory={val.directory} key={val.zip_filename}>
                    {val.zip_filename}
                  </option>
                ))
              : null}
          </select>
        </div>
        {/*}
        <div>
          <ul className='menu bg-base-100 w-48'></ul>
        </div>
        */}
        <div className='w-49 text-center'>
          <div className='text-primary'>File / Log List</div>
          <div className='h-96 overflow-auto'>
            <ul className='menu break-all bg-base-100 w-44 text-left text-xs py-0'>
              {fileList ? (
                fileList.map((val: string, idx: number) => (
                  <li key={idx}>
                    <div className='py-0.5' onClick={() => handleDisplayLog(val)}>
                      {val}
                    </div>
                  </li>
                ))
              ) : (
                <li className='text-center'>nothing</li>
              )}
            </ul>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {pageLoading && <Laoding />}
      <main data-theme='white' className='text-center items-center'>
        <Navbar />
        <div className='p-4 justify-center items-center'>
          <p className='text-3xl text-primary p-2'>Collect Log</p>
          <div className='flex flex-row h-full'>
            <div className='flex flex-col items-center'>
              <div className='btn btn-primary w-48' onClick={logCollection}>
                Start Collect Log
              </div>
              <div className=''>{hoihoiList ? <LogFileList /> : null}</div>
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
            <div className='flex basis-11/12 '>
              <div className='mockup-code w-full h-[650px] overflow-auto text-left mx-5' ref={logViewRef}>
                <div className='w-[640px]'>
                  <pre className='px-2'>
                    <code>
                      <p className='text-xs m-0 p-0'>{logs}</p>
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
export default CorrectPage
