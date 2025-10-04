'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

import { useUuidApi } from '../hooks/useUuidApi'
import UuidHistory from '../components/UuidHistory'

interface UuidContentResponse {
  list: Record<string, any>
  main_flag: string | null
  error?: string
  timestamp_list: {
    local_time: string
  }
}

export default function UuidContentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { getUuidContent, loading, error } = useUuidApi()
  
  const [uuidData, setUuidData] = useState<UuidContentResponse | null>(null)
  const uuid = params.uuid as string

  useEffect(() => {
    const fetchData = async () => {
      const queryParams = {
        pcip: searchParams.get('pcip') || '',
        cluster: searchParams.get('cluster') || '',
        prism: searchParams.get('prism') || '',
        content: uuid,
      }
      
      try {
        const data = await getUuidContent(queryParams)
        if (data) {
          setUuidData(data)
        }
      } catch (err) {
        console.error('Failed to fetch UUID content:', err)
      }
    }

    if (uuid) {
      fetchData()
    }
  }, [uuid, searchParams])

  const entityName: Record<string, string> = { 
    vmlist: 'VMs', 
    vglist: 'Volume Group', 
    vflist: 'File Server', 
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
        <span>データの取得に失敗しました: {error}</span>
      </div>
    )
  }

  const list = uuidData.list
  const mainFlag = uuidData.main_flag
  const mainList = mainFlag && list[mainFlag] ? list[mainFlag][0] : null

  const name = !mainFlag ? 'no hit' : mainList?.name || 'N/A'
  const uuidValue = !mainFlag ? 'no hit' : mainList?.uuid || 'N/A'
  const icon = !mainFlag ? '/robo.png' : iconList[mainFlag] || '/robo.png'

  const allListKey = list ? Object.keys(list) : []
  const subListKey = allListKey.filter((val) => val !== mainFlag)

  const Detail = () => {
    if (mainFlag === 'vmlist' && mainList) {
      return (
        <div className="m-2 text-xs">
          【VM Spec Detail】
          <div>Cluster UUID: {mainList['cluster_uuid']}</div>
          {mainList['niclist_uuid'] && mainList['niclist_uuid'].map((val: string, key: number) => (
            <div key={'nic' + key + 1}>
              NIC UUID({key + 1}): {val}
            </div>
          ))}
          {mainList['disklist_uuid'] && mainList['disklist_uuid'].map((val: string, key: number) => (
            <div key={'disk' + key + 1}>
              Disk UUID({key + 1}): {val}
            </div>
          ))}
        </div>
      )
    } else if (mainFlag === 'vglist' && mainList) {
      return (
        <div className="m-2 text-xs">
          【Volume Group Detail】
          <div>Cluster UUID: {mainList['cluster_uuid']}</div>
          {mainList['attachment_list'] && mainList['attachment_list'][0]?.['vm_uuid'] && 
            mainList['attachment_list'].map((val: any, key: number) => (
              <div key={'attachvm' + key + 1}>
                Attach VM UUID({key + 1}): {val['vm_uuid']}
              </div>
            ))
          }
          {mainList['attachment_list'] && mainList['attachment_list'][0]?.['iscsi_initiator_name'] && 
            mainList['attachment_list'].map((val: any, key: number) => (
              <div key={'initiator' + key + 1}>
                Initiator Name({key + 1}): {val['iscsi_initiator_name']}
              </div>
            ))
          }
          <div className="pt-2 font-bold">Disks {Object.keys(mainList['disklist'] || {}).length}</div>
          {mainList['disklist'] && mainList['disklist'].map((val: any, key: number) => (
            <div key={'disklist' + key}>
              <div>vDisk UUID({key + 1}): {val['vmdisk_uuid']}</div>
              <div>vDisk Size({key + 1}): {Number(val['vmdisk_size_mb']).toLocaleString()} Mbytes</div>
            </div>
          ))}
        </div>
      )
    } else if (mainFlag === 'vflist' && mainList) {
      return (
        <div className="m-2 text-xs">
          【File Server Detail】
          <div>Cluster UUID: {mainList['cluster_uuid']}</div>
          {mainList['nvms'] && mainList['nvms'].map((val: any, key: number) => (
            <div className="mb-1" key={'nvm' + key + 1}>
              <div>NVMS UUID({key + 1}): {val['uuid']}</div>
              <div>NVMS VM UUID({key + 1}): {val['vmUuid']}</div>
            </div>
          ))}
        </div>
      )
    } else if (mainFlag === 'sharelist' && mainList) {
      return (
        <div className="m-2 text-xs">
          【Share Detail】
          <div>Cluster UUID: {mainList['cluster_uuid']}</div>
          <div>File Server UUID: {mainList['fileServerUuid']}</div>
          <div>Container UUID: {mainList['containerUuid']}</div>
          <div>Default Quota Policy UUID:</div>
          <div>{mainList['defaultQuotaPolicyUuid']}</div>
        </div>
      )
    } else if (mainFlag === 'sclist' && mainList) {
      return (
        <div className="m-2 text-xs">
          【Storage Container Detail】
          <div>Cluster UUID: {mainList['cluster_uuid']}</div>
          <div>
            使用中サイズ:{' '}
            {mainList['own_usage_bytes'] <= 1024 * 1024 * 1024 * 1024
              ? (mainList['own_usage_bytes'] / (1024 * 1024 * 1024)).toFixed(2) + ' GiB'
              : (mainList['own_usage_bytes'] / (1024 * 1024 * 1024 * 1024)).toFixed(2) + ' TiB'}
          </div>
          <div>圧縮: {mainList['compression_enabled']?.toString()}</div>
          <div>重複排除: {mainList['on_disk_dedup']}</div>
          <div>暗号化: {mainList['enable_software_encryption']?.toString()}</div>
          <div>Erasure Coding: {mainList['erasure_code']}</div>
        </div>
      )
    } else {
      return <></>
    }
  }

  const hitSub = subListKey.map((val, key) => {
    const entity = list[val]
    const entityTitle = entityName[val]

    const entityChildren = entity.map((val: any, key: number) => {
      const name = val.name
      const uuid = val.uuid
      const contentsUrl = `/uuid/${uuid}`
      const cluster = searchParams.get('cluster')
      const pcip = searchParams.get('pcip')
      
      return (
        <div className="my-1" key={key * 100}>
          <Link 
            href={{ 
              pathname: contentsUrl, 
              query: { pcip: pcip, cluster: cluster } 
            }}
          >
            <div className="text-white text-xs hover:no-underline">
              <p className="ml-2 underline font-bold">{name}</p>
              <p className="mx-2 hover:no-underline">{uuid}</p>
            </div>
          </Link>
        </div>
      )
    })
    
    return (
      <div className="m-2" key={key}>
        <p>{entityTitle} &gt;</p>
        {entityChildren}
      </div>
    )
  })

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
      <div className="w-screen">
        <div className="border-4 flex flex-col">
          <div className="border-b-2 border-black text-xl px-3 pt-2">
            <div className="float-left mr-2">
              <Image src={icon} width={60} height={60} alt="" />
            </div>
            Type:
            <span className="text-4xl">
              {mainFlag && entityName[mainFlag]}
              {!mainFlag && uuidData.error}
            </span>
            <div className="border-b-2 my-2 flex">
              <h2>UUID: {uuid}</h2>
              <div className="flex-auto pt-2 text-right text-sm">
                データ取得ターゲット：{uuidData.timestamp_list.local_time}
              </div>
            </div>
          </div>

          <div className="w-screen flex flex-row">
            <div className="w-64 bg-primary text-white p-2">
              <span className="text-gray-200">Related Contents</span>
              <div className="px-2">{hitSub}</div>
            </div>

            <div className="w-2/5">
              <div className="">
                <div className="flex-1">
                  {mainFlag && mainList && (
                    <div className="border-2 h-full p-1">
                      <h3 className="text-sm">Name: {mainList.name}</h3>
                      <h3 className="text-sm">
                        UUID: <span className="bg-yellow-200">{mainList.uuid}</span>
                      </h3>
                      <Detail />
                    </div>
                  )}
                  {!mainFlag && <div>no hit</div>}
                </div>
              </div>
            </div>
            <div className="w-2/5">
              ここにツリー表示予定（工事中）
            </div>
          </div>
        </div>
        <UuidHistory />
      </div>
    </main>
  )
}

