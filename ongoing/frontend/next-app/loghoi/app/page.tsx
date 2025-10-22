import { Suspense } from 'react'

import Loading from '@/components/loading'
import PcRegist from '@/components/pcRegist'
import PcList from '@/components/pcList'

const Index = () => {
  return (
    <>
      <main data-theme='white' className='relative flex text-center items-center h-screen'>
        <div className='absolute top-16 left-0 right-0 z-10 pointer-events-none'>
          <h1 className='text-6xl font-bold text-gray-700 tracking-wide drop-shadow-md'>
            Welcome to Log Hoihoi!
          </h1>
        </div>
        <div className='w-1/2'>
          <Suspense fallback={<Loading />}>
            <PcList />
          </Suspense>
        </div>
        <PcRegist />
      </main>
    </>
  )
}
export default Index
