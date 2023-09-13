import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBug } from '@fortawesome/free-solid-svg-icons'

export default function Loading() {
  return (
    <>
      <div className='fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 '>
        <div className='flex w-64 h-24 rounded-xl bg-white border-gray-200 border-2 justify-center items-center'>
          <Image className='opacity-25' src='/xplorer.ico' alt='uuid xplorer logo' width={50} height={50} />
          <div className='absolute justify-center items-center flex'>
            {/*}
            <div className='animate-spin h-8 w-8 rounded-full border-green-400 border-opacity-25 border-b-2 mr-2 inline-block'></div>
             */}
            <FontAwesomeIcon icon={faBug} spin style={{ fontSize: '21px' }} />
            <span className='ml-1 text-lg'>Loading...</span>
          </div>
        </div>
      </div>
    </>
  )
}
