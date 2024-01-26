import { useEffect, useState, useRef } from 'react'
import io, { Socket } from 'socket.io-client'

import { saveAs } from 'file-saver'
import { usePathname, useSearchParams } from 'next/navigation'

interface dict {
  [key: string]: string
}

type ChildProps = {
  cvmChecked: string
  tailName: string
  tailPath: string
  filter: string
}

export default function LogViewer() {
  return (
    <>
      <div className='flex justify-center items-center m-2'>
        <div className='btn btn-primary btn-wide btn-outline'>"tail -f" Start!</div>
      </div>

      <div className='mockup-code  h-[480px] overflow-auto text-left mx-5'>
        <div className='w-[640px]'>
          <pre className='px-2'>
            <code></code>
          </pre>
        </div>
      </div>
      <div className='p-1'>
        <button className='btn btn-primary'>Download</button>
      </div>
    </>
  )
}
