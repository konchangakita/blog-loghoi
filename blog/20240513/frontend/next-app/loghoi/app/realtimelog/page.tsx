import { Suspense } from 'react'

// Lib
import { LogFiles } from '@/lib/rt-logs'

//components
import Content from './realtimelog-content'

const RealtimelogPage = () => {
  return (
    <>
      <div data-theme='white' className='p-1 text-center items-center'>
        <div className='p-1'>
          <p className='text-3xl text-primary p-1'>Realtime Log Viewer &lt;tail -f&gt;</p>
        </div>
        <Suspense fallback={<p>Loading feed...</p>}>
          <Content />
        </Suspense>
      </div>
    </>
  )
}
export default RealtimelogPage
