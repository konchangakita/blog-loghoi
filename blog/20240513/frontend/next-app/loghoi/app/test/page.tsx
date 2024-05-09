import { Suspense } from 'react'

//components
import TestPage from './test'

const Page = () => {
  return (
    <>
      <div data-theme='white' className='p-1 text-center items-center'>
        <div className='p-1'>
          <p className='text-3xl text-primary p-1'>Realtime Log Viewer &lt;tail -f&gt;</p>
        </div>
        <Suspense fallback={<p>Loading feed...</p>}>
          <TestPage />
        </Suspense>
      </div>
    </>
  )
}
export default Page
