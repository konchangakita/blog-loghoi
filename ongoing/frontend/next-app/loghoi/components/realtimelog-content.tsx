'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

//api
import fetchPost from '@/app/_api/getTailList'

//components
import LogViewer from '@/components/realtimelog-logview'

//fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

interface dict {
  [key: string]: any
}

const Content = () => {
  const searchParams = useSearchParams()

  // filter word
  const [filter, setFilter] = useState<string>('')
  console.log('filter word:', filter)
  const clearFilter = () => {
    setFilter('')
  }

  // Tailするファイル一覧 from setting_realtimelog.json
  const TailList = () => {
    return (
      <>
        <p className='border border-black p-1'>Log list</p>
        <form>
          <div key=''>
            <label className='label justify-start cursor-pointer pl-0.5 p-0 text-sm'>
              <input type='radio' value='aaaaa' />
              <div className='pl-1'>aaaaa</div>
            </label>
            <label className='label justify-start cursor-pointer pl-0.5 p-0 text-sm'>
              <input type='radio' value='bbbbb' />
              <div className='pl-1'>bbbbb</div>
            </label>
            <label className='label justify-start cursor-pointer pl-0.5 p-0 text-sm'>
              <input type='radio' value='ccccc' />
              <div className='pl-1'>ccccc</div>
            </label>
            <label className='label justify-start cursor-pointer pl-0.5 p-0 text-sm'>
              <input type='radio' value='ddddd' />
              <div className='pl-1'>ddddd</div>
            </label>
            <label className='label justify-start cursor-pointer pl-0.5 p-0 text-sm'>
              <input type='radio' value='eeeee' />
              <div className='pl-1'>eeeee</div>
            </label>
          </div>
        </form>
      </>
    )
  }

  // CVM list, and connect to paramiko with checked cvm
  function CvmList() {
    return (
      <div>
        <div className=' pl-1 text-left'>CVM-1</div>
        <div className=' pl-1 text-left'>CVM-2</div>
        <div className=' pl-1 text-left'>CVM-3</div>
      </div>
    )
  }

  return (
    <>
      <div className='p-1 flex justify-center'>
        <div className='m-1 relative  w-[480px] '>
          <input
            type='text'
            value={filter}
            className='textarea textarea-bordered w-[480px]'
            placeholder='検索用のフィルターワードを入力してください。'
            onChange={(e) => setFilter(e.target.value)}
          />
          <button className='absolute inset-y-2 right-4 opacity-20 hover:opacity-100' onClick={clearFilter}>
            <FontAwesomeIcon icon={faXmark} size='lg' />
          </button>
        </div>
      </div>
      <div className='p-1'>
        <div className='p-1 flex flex-nowrap justify-center items-start'>
          <div className='form-control flex basis-1/12 p-1 border'>
            <div>
              <TailList />
            </div>
            <div className='p-1'>
              <div>
                <div className='pt-2'>
                  <p className='border border-black p-1'>CVM list</p>
                </div>
                <div className=''>
                  <CvmList />
                </div>
              </div>
            </div>
          </div>
          <div className='p-1 flex basis-11/12 flex-col'>
            <LogViewer />
          </div>
        </div>
      </div>
    </>
  )
}
export default Content
