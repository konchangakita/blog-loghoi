'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getBackendUrl } from '../../lib/getBackendUrl'

// Lib
import { LogFiles } from '@/lib/rt-logs'

const TestPage = () => {
  const searchParams = useSearchParams()
  const ClusterName = searchParams.get('cluster')
  const [data, setData] = useState(null)
  const [isLoading, setLoading] = useState(true)

  const requestUrl = `${getBackendUrl()}/api/cvmlist`
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
      })
  }, [])
  console.log('fetch data', data)
  if (isLoading) return <p>Loading...</p>
  if (!data) return <p>No profile data</p>

  return (
    <>
      <div data-theme='white' className='p-1 text-center items-center'>
        aaaa
      </div>
    </>
  )
}
export default TestPage
