'use client'
import Link from 'next/link'
import Image from 'next/image'
import { getBackendUrl } from '../lib/getBackendUrl'

import { useEffect, useState } from 'react'

interface dict {
  [key: string]: any
}

type ResValues = {
  pc_list: dict
  cluster_list: dict
  error?: string | null
  errorType?: string | null
}

const DisplayCluster = ({ clusterList }: any) => {
  const clusters = clusterList.length ? (
    clusterList.map((val: dict, idx: number) => {
      const iconList: dict = { AHV: '/ahv_ico.png', VMWARE: '/vmware_ico.png' }
      const icon = iconList[val.hypervisor]
      return (
        <tr className='' key={idx + 1}>
          <td className='whitespace-normal'>
            <div className='ml-8'>
              <Image src={icon} width={30} height={30} alt={''} className='inline' />
              <div className='inline px-2'>
                {val.name} {val.prism_ip}
              </div>
            </div>
          </td>
        </tr>
      )
    })
  ) : (
    <>empty</>
  )

  return <>{clusters}</>
}

export default function PcList2() {
  const requestUrl = `${getBackendUrl()}/api/pclist`
  const [data, setData] = useState<ResValues>()
  const [showAlert, setShowAlert] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(requestUrl, { 
          method: 'GET',
          signal: AbortSignal.timeout(10000) // 10秒のタイムアウト
        })
        
        if (!response.ok) {
          console.error(`API Error: ${response.status} ${response.statusText}`)
          setData({
            pc_list: null,
            cluster_list: null,
            error: `バックエンド接続エラー (${response.status}): ${response.statusText}`,
            errorType: 'CONNECTION_ERROR'
          })
          setShowAlert(true)
          return
        }
        
        const data = await response.json()
        setData(data)
        
        // エラーがある場合はアラートを表示
        if (data.error && data.errorType !== 'NO_DATA') {
          setShowAlert(true)
        }
      } catch (error) {
        console.error('Network Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        setData({
          pc_list: null,
          cluster_list: null,
          error: `ネットワークエラー: ${errorMessage}`,
          errorType: 'NETWORK_ERROR'
        })
        setShowAlert(true)
      }
    }
    fetchData()
  }, [])
  
  console.log('PC List:', data)

  const pcList: any = data ? data.pc_list : ''
  const clusterList: any = data ? data.cluster_list : ''

  // エラー表示
  const displayError = data?.error && data?.errorType !== 'NO_DATA' ? (
    <div className="alert alert-error mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{data.error}</span>
      <button 
        className="btn btn-sm btn-ghost" 
        onClick={() => setShowAlert(false)}
      >
        ✕
      </button>
    </div>
  ) : null

  const displayPc = pcList && pcList.length ? (
    pcList.map((val: dict, idx: number) => {
      const clusterListSub = clusterList[val.prism_ip]
      return (
        <div className='table table-compact p-4' key={idx + 1}>
          <table className='table '>
            <thead className='sticky top-0'>
              <tr className='hover'>
                <th>
                  <div className='text-2xl'>
                    <p className='inline px-4'>
                      <Link href={{ pathname: 'gatekeeper', query: { pcip: val.prism_ip } }}>
                        PC {val.prism_ip} &#91; {val.timestamp_jst} &#93;
                      </Link>
                    </p>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <DisplayCluster clusterList={clusterListSub} />
            </tbody>
          </table>
        </div>
      )
    })
  ) : (
    <div>
      <table>
        <tbody>
          <tr>
            <td>empty</td>
            <td className='w-32'>&mdash;</td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  return (
    <>
      <div className='text-2xl font-bold m-5'>PC LIST</div>
      
      {showAlert && displayError}
      
      <div className='flex flex-col justify-center items-center'>{displayPc}</div>
    </>
  )
}
