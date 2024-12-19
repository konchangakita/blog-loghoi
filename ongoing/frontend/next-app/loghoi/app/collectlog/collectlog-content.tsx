'use client'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

// component
import Laoding from '@/components/loading'

interface dict {
  [key: string]: string
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

const CollectlogContnet = () => {
  const searchParams = useSearchParams()
  //const pcip = searchParams.get('pcip')
  const ClusterName = searchParams.get('cluster')
  const PrismIp = searchParams.get('prism')

  // loading
  const [loading, setLoading] = useState(true)

  // CVM list, and connect to paramiko with checked cvm
  const [data, setData] = useState<ResValues>()
  const [prismLeader, setprismLeader] = useState<string>('')
  const [cvmChecked, setcvmChecked] = useState<string>('')
  const requestUrl = `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/cvmlist`
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ClusterName),
  }
  useEffect(() => {
    fetch(requestUrl, requestOptions)
      .then((res) => res.json())
      .then((data) => {
        setData(data)
        setLoading(false)
        console.log('data get from cvm')
        if (data !== undefined && data['prism_leader'] !== undefined) {
          setprismLeader(data['prism_leader'])
          setcvmChecked(data['prism_leader'])
        } else {
          // Prism Leaderが取得できていなかったら、CVMへsshできていないので、ssh Key設定のアラートをだす
          if (data['prism_leader'] === undefined) {
            alert('ssh key を cluster [' + PrismIp + '] の Prism Element で設定してください')
          }
        }
      })

    console.log('cluster data get', prismLeader, cvmChecked)
  }, [])

  function CvmList(res: any) {
    if (loading) return <p>Loading...</p>

    const cvmsIp = res.cvmsIp
    const prismLeader = res.prismLeader
    const cvmChecked = res.cvmChecked
    const handleOptionChange = (val: string) => {
      setcvmChecked(val)
      console.log('change cvm', val)
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

  // get log
  const handleGetLogs = async () => {
    setLoading(true)

    const requestUrl = `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/col/getlogs`
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cvm: cvmChecked }),
    }

    const response = await fetch(requestUrl, requestOptions)
    if (response.status === 200) {
      const resJson = await response.json()
      console.log(resJson)
      //location.reload()
      setLoading(false)
    } else {
      alert('Failed to connect to backend')
      setLoading(false)
    }
  }

  return (
    <>
      {loading && <Laoding />}
      <div className='flex flex-row h-full'>
        <div className='flex flex-col items-center'>
          <button className='btn btn-primary w-48' onClick={handleGetLogs}>
            Start Collect Log
          </button>
          <div className='w-49 text-center'>
            <div className='text-primary'>File / Log List</div>
            <div className='h-96 overflow-auto'>
              <div>Log1</div>
              <div>Log2</div>
              <div>Log3</div>
              <div>Log4</div>
              <div>Log5</div>
              <div>Log6</div>
              <div>Log7</div>
            </div>
          </div>

          <div className='p-1'>
            <div>
              <div className='pt-2'>
                <p className='border border-black p-1'>CVM list</p>
              </div>
              <div className=''>
                <CvmList cvmsIp={data ? data.cvms_ip : ''} prismLeader={prismLeader} cvmChecked={cvmChecked} />
              </div>
              <div>
                <p className='inline text-xl text-red-700'>*</p>
                <p className='inline text-xs text-red-700 align-top'>Prism Leader</p>
              </div>
            </div>
          </div>
        </div>
        <div className='flex basis-11/12 '>
          <div className='mockup-code w-full h-[650px] overflow-auto text-left mx-5'>
            <div className='w-[640px]'>
              <pre className='px-2'>
                <code>
                  <p className='text-xs m-0 p-0'></p>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
export default CollectlogContnet
