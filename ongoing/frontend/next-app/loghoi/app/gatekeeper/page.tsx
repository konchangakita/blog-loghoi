import { Suspense } from 'react'

//components
import Contents from '@/components/gatekeeper-contents'

const GateKeeperPage = () => {
  return (
    <>
      <div className=''>
        <div className="bg-[url('/Desktop-BG-3DPurple.png')] bg-cover bg-center bg-violet-900 h-full">
          <Suspense fallback={<p>Loading feed...</p>}>
            <Contents />
          </Suspense>
        </div>
      </div>
    </>
  )
}
export default GateKeeperPage
