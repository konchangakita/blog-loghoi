'use client'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

// component
import Laoding from '@/components/loading'

interface dict {
  [key: string]: string
}

const CollectlogContnet = () => {
  const searchParams = useSearchParams()
  const pcip = searchParams.get('pcip')
  const cluster = searchParams.get('cluster')
  const prism = searchParams.get('prism')

  // loading
  const [pageLoading, setPageLoading] = useState(false)
  return (
    <>
      {pageLoading && <Laoding />}
      <div className='flex flex-row h-full'>
        <div className='flex flex-col items-center'>
          <div className='btn btn-primary w-48'>Start Collect Log</div>
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
              <div className=''></div>
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
