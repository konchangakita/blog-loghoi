'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'

//api
import getClusterList from '@/app/api/getClusterList'

interface dict {
  [key: string]: any
}

const GateKeeperPage = () => {
  const searchParams = useSearchParams()
  const pcIp = searchParams.get('pcip')
  const clusterList = getClusterList({ pcip: pcIp })
  console.log(clusterList)

  return (
    <>
      <div className=''>
        <div className="bg-[url('/Desktop-BG-3DPurple.png')] bg-cover bg-center bg-violet-900 h-full">
          <p className='pt-5 text-5xl text-white text-center'>Welcome to PC &#34;{pcIp}&#34;</p>
          <Suspense fallback={<p>Loading feed...</p>}>
            <div className='h-screen text-9xl text-white text-center'>
              <p>Please click</p>
              <p>cluster name</p>
            </div>{' '}
          </Suspense>
        </div>
      </div>
    </>
  )
}
export default GateKeeperPage
