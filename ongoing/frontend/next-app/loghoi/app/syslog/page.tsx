'use client'
import { Suspense } from 'react'
import { useEffect, useState } from 'react'

//components
import Content from '@/components/realtimelog-content'

// need install
import { Controller, SubmitHandler, useForm } from 'react-hook-form'

// fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

// Input value
type FormValues = {
  searchtxt: string
  startDateTime: Date | null
  endDateTime: Date | null
  startDT: Date | null
  endDT: Date | null
}

const Page = () => {
  // react hook form
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>()

  const [filter, setFilter] = useState<string>('')
  console.log('filter word:', filter)
  const clearFilter = () => {
    setFilter('')
  }

  return (
    <>
      <div data-theme='white' className='p-1 text-center items-center'>
        <div className='p-1'>
          <p className='text-3xl text-primary p-1'>Syslog Viewer</p>
        </div>
        <Suspense fallback={<p>Loading feed...</p>}>
          <div className='p-1'>
            <div className='p-1'>
              <div className='form-control'>
                <form>
                  <div className='p-1'>
                    {/* <input {...register('searchtxt')} type='text' placeholder='検索用のホイホイワードを入力' className='input input-bordered input-md w-full max-w-xs' /> */}
                    <input type='text' {...register('searchtxt')} className='textarea textarea-bordered w-full' placeholder='検索キーワードを入力' />
                  </div>
                  <div className='flex flex-nowrap p-1'>
                    <div className='p-1 '>
                      <label className='label'>
                        <span className='label-text'></span>
                      </label>
                      <label className='input-group input-group-vertical'>
                        <span>Start Date</span>
                      </label>
                    </div>
                    {/* <div className='p-1 '>〜</div> */}
                    <div className='p-1 '>
                      <label className='label'>
                        <span className='label-text'></span>
                      </label>
                      <label className='input-group input-group-vertical'>
                        <span>End Date</span>
                      </label>
                    </div>
                    <div className='p-1 flex items-stretch'>
                      <div className='self-end'>
                        <button className='btn btn-primary' type='submit'>
                          Search
                        </button>
                      </div>
                    </div>
                    <div className='p-1 flex items-stretch'>
                      <div className='self-end'>
                        <div className='btn btn-secondary'>Clear</div>
                      </div>
                    </div>

                    <div className='m-1 relative  w-[360px] self-end '>
                      <input
                        type='text'
                        value={filter}
                        className='textarea textarea-bordered w-[360px]'
                        placeholder='フィルター'
                        onChange={(e) => setFilter(e.target.value)}
                      />
                      <button className='absolute inset-y-2 right-4 opacity-20 hover:opacity-100' onClick={clearFilter}>
                        <FontAwesomeIcon icon={faXmark} size='lg' />
                      </button>
                    </div>
                  </div>
                </form>
                <div className=''>
                  <div className='mockup-code h-[480px] overflow-auto text-left mx-5'>
                    <div className='w-[640px]'>
                      <pre className='px-2'>
                        <code></code>
                      </pre>
                    </div>
                  </div>
                </div>
                <div className='p-1'>
                  <button className='btn btn-primary'>Download</button>
                </div>
              </div>
            </div>
          </div>
        </Suspense>
      </div>
    </>
  )
}
export default Page
