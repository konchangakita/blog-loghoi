import { Suspense } from 'react'
import Image from 'next/image'

//components
import Contents from './gatekeeper-contents'

const GateKeeperPage = () => {
  return (
    <>
      <div className='relative min-h-screen'>
        {/* 背景画像 - Next.js Imageで最適化 */}
        <div className='fixed inset-0 -z-10'>
          <Image
            src='/Desktop-BG-3DPurple.png'
            alt='Background'
            fill
            priority
            quality={85}
            className='object-cover'
          />
        </div>
        {/* フォールバック背景色 */}
        <div className='fixed inset-0 -z-20 bg-violet-900'></div>
        
        <Suspense fallback={<p>Loading feed...</p>}>
          <Contents />
        </Suspense>
      </div>
    </>
  )
}
export default GateKeeperPage
