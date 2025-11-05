import { Suspense } from 'react'

//components
import CollectlogContnet from './collectlog-content'

const Page = () => {
  return (
    <>
      <div data-theme='white' className='p-1 text-center items-center'>
        <div className='p-1'>
          <p className='text-3xl text-primary p-1'>Collect Log Viewer</p>
        </div>
        <Suspense fallback={<p>Loading feed...</p>}>
          <CollectlogContnet />
        </Suspense>
      </div>
    </>
  )
}
export default Page
