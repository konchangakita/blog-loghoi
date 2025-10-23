import { Suspense } from 'react'

//components
import Contents from './gatekeeper-contents'

const GateKeeperPage = () => {
  return (
    <>
      <div className="min-h-screen bg-[url('/Desktop-BG-3DPurple.png')] bg-cover bg-center bg-fixed bg-violet-900">
        <Suspense fallback={<p>Loading feed...</p>}>
          <Contents />
        </Suspense>
      </div>
    </>
  )
}
export default GateKeeperPage
