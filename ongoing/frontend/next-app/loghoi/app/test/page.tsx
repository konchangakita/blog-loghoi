'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// Lib
import { LogFiles } from '@/lib/rt-logs'

const Page = () => {
  const searchParams = useSearchParams()
  const ClusterName = searchParams.get('cluster')

  const requestUrl = `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/cvmlist`
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ClusterName),
  }
  console.log(LogFiles)
  const fetchData = async () => {
    const response = await fetch(requestUrl, requestOptions)
    const data = await response.json()
    console.log('fetch', data)
  }
  const data1 = 'meme'

  return (
    <>
      <div data-theme='white' className='p-1 text-center items-center'>
        <div className='p-1'>
          <p className='text-3xl text-primary p-1'>Realtime Log Viewer &lt;tail -f&gt;</p>
        </div>
        <Suspense fallback={<p>Loading feed...</p>}>
          puripuri
          {data1}
        </Suspense>
      </div>
    </>
  )
}
export default Page
