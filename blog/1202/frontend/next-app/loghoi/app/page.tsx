import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'

//api
import { getPclist } from './_api/pclist/getPclist'

//components
import Loading from '@/components/loading'
import PcRegist from '@/components/pcRegist'
import PcList from '@/components/pcList'

const Index = () => {
  return (
    <>
      <main data-theme='white' className='flex text-center items-center h-screen'>
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
