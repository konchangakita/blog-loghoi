'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

import { useUuidApi } from '../hooks/useUuidApi'
import UuidHistory from '../components/UuidHistory'

interface UuidSearchResponse {
  list: Record<string, any>
  main_flag: string | null
  timestamp_list: {
    local_time: string
  }
}

export default function UuidSearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { searchUuid, loading, error } = useUuidApi()
  
  const [uuidData, setUuidData] = useState<UuidSearchResponse | null>(null)
  const search = searchParams.get('search') || ''

  useEffect(() => {
    const fetchData = async () => {
      if (!search) return

      const queryParams = {
        pcip: searchParams.get('pcip') || '',
        cluster: searchParams.get('cluster') || '',
        prism: searchParams.get('prism') || '',
        search: search,
      }
      
      try {
        const data = await searchUuid(queryParams)
        if (data) {
          setUuidData(data)
        }
      } catch (err) {
        console.error('Failed to search UUID:', err)
      }
    }

    fetchData()
  }, [search, searchParams])

  const entityName: Record<string, string> = { 
    vmlist: 'VMs', 
    vglist: 'Volume Group', 
    vflist: 'Files', 
    sharelist: 'Shares', 
    sclist: 'Storage Containers' 
  }
  
  const iconList: Record<string, string> = { 
    vmlist: '/vms.png', 
    vglist: '/vg.png', 
    vflist: '/vfiler.png', 
    sharelist: '/share.png', 
    sclist: '/storage.png' 
  }

  const displayFromList = (listKey: string[], list: any) => {
    const doc = listKey.map((entityKey, key: number) => {
      const entity = list[entityKey]
      const icon = iconList[entityKey]
      const entityTitle = entityName[entityKey]
      const count = Object.keys(entity).length

      const entityChildren = entity.map((val: any, key: number) => {
        const name = val.name
        const uuid = val.uuid
        const mainBg = uuidData?.main_flag === entityKey ? 'bg-yellow-200' : ''

        const contentUrl = `/uuid/${uuid}`
        const searchQuery = {
          pcip: searchParams.get('pcip') || '',
          cluster: searchParams.get('cluster') || '',
          prism: searchParams.get('prism') || '',
        }
        
        return (
          <div className="p-1 mx-4 my-2" key={key + 1}>
            -- Search-result {key + 1} --
            <br />
            VM Name : {name}
            <br />
            VM UUID :{' '}
            <Link 
              href={{ 
                pathname: contentUrl, 
                query: searchQuery 
              }}
            >
              <p className={mainBg}>{uuid}</p>
            </Link>
          </div>
        )
      })

      return (
        <div className="p-1 border-4 m-4" key={key}>
          <div className="h-16">
            <div className="float-left">
              <Image src={icon} width={60} height={60} alt="" />
            </div>
            <div className="h-16 py-4">
              - {entityTitle} Result - hit count : {count}
            </div>
          </div>
          {entityChildren}
        </div>
      )
    })
    return <>{doc}</>
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    )
  }

  if (error || !uuidData) {
    return (
      <div className="alert alert-error">
        <span>検索に失敗しました: {error}</span>
      </div>
    )
  }

  const mainFlag = uuidData.main_flag ? [uuidData.main_flag] : ['empty']
  const listAll = uuidData.list

  const hitMain = mainFlag[0] === 'empty' ? (
    <div className="">no hit</div>
  ) : (
    displayFromList(mainFlag, listAll)
  )

  const listAllKey = listAll ? Object.keys(uuidData.list) : []
  const listSubKey = listAllKey.filter((val) => val !== mainFlag[0])
  const hitSubBar = Object.keys(listSubKey).length ? (
    <div className="border-b-4 border-dashed w-4/5 mx-auto"></div>
  ) : null
  const hitSub = listSubKey ? displayFromList(listSubKey, listAll) : null

  return (
    <main>
      <div className="flex justify-center p-1">
        <Link 
          className="hover:no-underline" 
          href={{ 
            pathname: '/uuid', 
            query: { 
              pcip: searchParams.get('pcip'), 
              cluster: searchParams.get('cluster') 
            } 
          }}
        >
          <p className="text-3xl text-primary p-2 text-center">
            UUID Xplorer - "{searchParams.get('cluster')}"
          </p>
        </Link>
      </div>
      <div>
        <div className="border-b-2 border-black px-3 pt-2 flex justify-between">
          <div className="text-xl flex">
            <h2>
              Search Keyword: UUID <span className="bg-yellow-200">{search}</span>
            </h2>
          </div>
          <div className="flex justify-end items-end text-sm">
            取得ターゲット：{uuidData.timestamp_list.local_time}
          </div>
        </div>
        <div className="m-2 flex flex-row">
          <div className="flex-1 items-center justify-center items-center">
            {hitMain}
            {hitSubBar}
            {hitSub}
          </div>
        </div>
        <UuidHistory />
      </div>
    </main>
  )
}
