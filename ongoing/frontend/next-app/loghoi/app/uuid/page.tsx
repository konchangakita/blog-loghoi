'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, MouseEventHandler } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { SubmitHandler, useForm } from 'react-hook-form'

// components
import fetchPost from '@/app/api/fetchPost'
import Navbar from '../components/navbar'
import UuidListTable from '../components/uuidlisttable'

// fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch } from '@fortawesome/free-solid-svg-icons'
import Page from '../test/page'

type FormValues = {
  searchUuid: string
}

interface dict {
  [key: string]: string
}

export const UuidPage = () => {
  const searchParams = useSearchParams()
  const pcip = searchParams.get('pcip')
  const cluster = searchParams.get('cluster')
  const prism = searchParams.get('prism')

  const path: string = '/api/uuid/latestdataset'
  const body = { pcip: pcip, cluster: cluster, prism: prism }
  const res: any = fetchPost(path, body)
  console.log('res', res)

  //const [entity, setEntity] = useState(res.list.vmlist)
  const [entity, setEntity] = useState()
  const [isActive, setIsActive] = useState('vmlist')
  const tabActive = 'tab tab-bordered tab-active text-gray-800 bg-blue-100 rounded-t-md'
  const tabInactive = 'tab tab-bordered'

  const vmlistLength = res ? (res.list.vmlist ? Object.keys(res.list.vmlist).length : 0) : 0
  const vglistLength = res ? (res.list.vglist ? Object.keys(res.list.vglist).length : 0) : 0
  const vflistLength = res ? (res.list.vflist ? Object.keys(res.list.vflist).length : 0) : 0
  const sharelistLength = res ? (res.list.sharelist ? Object.keys(res.list.sharelist).length : 0) : 0
  const sclistLength = res ? (res.list.sclist ? Object.keys(res.list.sclist).length : 0) : 0

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>()

  const handleActive: MouseEventHandler<HTMLAnchorElement> = (e) => {
    let _key = e.currentTarget.rel
    setEntity(res.list[_key])
    setIsActive(_key)
  }

  const handleSearch: SubmitHandler<FormValues> = (data) => {
    const searchUrl = '/uuid/search/[search]'
    const searchQuery = router.query
    searchQuery['search'] = data.searchUuid

    router.push({
      pathname: searchUrl,
      query: searchQuery,
    })
  }

  return (
    <>
      <main data-theme='white' className='text-center items-center'>
        <Navbar />
        {res ? (
          <div className='p-1'>
            <p className='text-3xl text-primary p-2'>UUID Xplorer -&quot;{res.cluster_name}&quot;</p>
            <div className='flex flex-col'>
              <div className='flex flex-col'>
                <div className='text-center my-1'>データ取得時間：{res.timestamp_list.local_time}</div>
                <div className=''>
                  <form className='flex flex-row justify-center' onSubmit={handleSubmit(handleSearch)}>
                    <div className='inline-block flex h-6'>
                      <input
                        {...register('searchUuid', { required: true })}
                        type='text'
                        placeholder='UUID'
                        className='w-64 pl-2 text-gray-800 border text-xs'
                      />
                    </div>
                    <div className='inline-block flex items-center'>
                      <button type='submit' className=' bg-primary hover:bg-primary-focus rounded-r h-6 flex items-center px-2'>
                        <FontAwesomeIcon icon={faSearch} size='xs' />
                      </button>
                    </div>
                  </form>
                  {errors.searchUuid ? <p className='text-red-600'>required.</p> : <div>&nbsp;</div>}
                </div>
              </div>
              <div className='mx-auto flex flex-row'>
                <div className='w-32 pt-8'>
                  <div className='grid-flow-row shadow-lg border-2 stats w-32'>
                    <div className='stat p-4 text-right'>
                      <a className='cursor-pointer hover:no-underline' onClick={handleActive} rel='vmlist'>
                        <div className='stat-title text-info'>VMs</div>
                        <div className='stat-value text-xl'>{vmlistLength}</div>
                      </a>
                    </div>
                    <div className='stat p-4 text-right'>
                      <a className='cursor-pointer hover:no-underline' onClick={handleActive} rel='vglist'>
                        <div className='stat-title text-success text-sm'>Volume Group</div>
                        <div className='stat-value text-xl'>{vglistLength}</div>
                      </a>
                    </div>
                    <div className='stat p-4 text-right'>
                      <a className='cursor-pointer hover:no-underline' onClick={handleActive} rel='vflist'>
                        <div className='stat-title text-warning text-sm'>File Server</div>
                        <div className='stat-value text-xl'>{vflistLength}</div>
                      </a>
                    </div>
                    <div className='stat p-4 text-right'>
                      <a className='cursor-pointer hover:no-underline' onClick={handleActive} rel='sharelist'>
                        <div className='stat-title text-error'>Shares</div>
                        <div className='stat-value text-xl'>{sharelistLength}</div>
                      </a>
                    </div>
                    <div className='stat p-3 text-right'>
                      <a className='cursor-pointer hover:no-underline' onClick={handleActive} rel='sclist'>
                        <div className='stat-title text-secondary text-xs'>StorageContainer</div>
                        <div className='stat-value text-xl'>{sclistLength}</div>
                      </a>
                    </div>
                  </div>
                </div>
                <div className='mx-4'>
                  <div className=''>
                    <a className={isActive === 'vmlist' ? tabActive : tabInactive} onClick={handleActive} rel='vmlist'>
                      VM List
                    </a>
                    <a className={isActive === 'vglist' ? tabActive : tabInactive} onClick={handleActive} rel='vglist'>
                      Volume Group
                    </a>
                    <a className={isActive === 'vflist' ? tabActive : tabInactive} onClick={handleActive} rel='vflist'>
                      File Server
                    </a>
                    <a className={isActive === 'sharelist' ? tabActive : tabInactive} onClick={handleActive} rel='sharelist'>
                      Shares
                    </a>
                    <a className={isActive === 'sclist' ? tabActive : tabInactive} onClick={handleActive} rel='sclist'>
                      Storage Container
                    </a>
                    <div className='h-[480px] overflow-auto border-2 shadow'>
                      <div className=''>
                        <UuidListTable entity={entity} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className='w-32 '>migi</div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </>
  )
}
export default UuidPage
