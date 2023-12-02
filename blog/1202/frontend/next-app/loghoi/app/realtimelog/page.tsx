import { Suspense } from 'react'

//components
import Content from '@/components/realtimelog-content'

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
