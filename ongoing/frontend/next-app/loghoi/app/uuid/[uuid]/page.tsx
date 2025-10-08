'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFingerprint } from '@fortawesome/free-solid-svg-icons'

import { useUuidApi } from '../hooks/useUuidApi'
import UuidHistory from '../components/UuidHistory'
import UuidRelationshipGraph from '../components/UuidRelationshipGraph'

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
  const [activeTab, setActiveTab] = useState('details')
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
    vmlist: '/VirtualApplications.svg', 
    vglist: '/InvisibleInfrastructure1.svg', 
    vflist: '/AcropolisFileServices.svg', 
    sharelist: '/EnterpriseStorage.svg', 
    sclist: '/GenericStorage.svg' 
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
        <span>データの取得に失敗しました: {error?.message || 'Unknown error'}</span>
      </div>
    )
  }

  const list = uuidData.list
  const mainFlag = uuidData.main_flag
  const mainList = mainFlag && list[mainFlag] ? list[mainFlag][0] : null

  const name = !mainFlag ? 'no hit' : mainList?.name || 'N/A'
  const uuidValue = !mainFlag ? 'no hit' : mainList?.uuid || 'N/A'
  const icon = !mainFlag ? '/AI-PoweredAutomation.svg' : iconList[mainFlag] || '/AI-PoweredAutomation.svg'

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
      {/* ナビゲートバー */}
      <div className='navbar bg-neutral text-neutral-content'>
        <div className='w-2/6 flex'>
          <div className='dropdown'>
            <label tabIndex={0} className='btn btn-square btn-ghost'>
              <svg xmlns='http://www.w3.org/2000/svg' className='inline-block w-6 h-6 stroke-white' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M4 6h16M4 12h16M4 18h16' />
              </svg>
            </label>

            <ul tabIndex={0} className='menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52 text-black'>
              <li>
                <Link 
                  href={{ 
                    pathname: '/uuid', 
                    query: { 
                      pcip: searchParams.get('pcip'), 
                      cluster: searchParams.get('cluster'),
                      prism: searchParams.get('prism')
                    } 
                  }} 
                  className='hover:no-underline'
                >
                  <FontAwesomeIcon icon={faFingerprint} style={{ fontSize: '21px' }} />
                  UUIDトップへ
                </Link>
              </li>
            </ul>
          </div>

          <div className='flex-none px-2'>
            <Link 
              href={{ 
                pathname: '/gatekeeper', 
                query: { 
                  pcip: searchParams.get('pcip'), 
                  cluster: searchParams.get('cluster'),
                  prism: searchParams.get('prism')
                } 
              }}
            >
              <Image src='/hoihoi_logo-neg.png' alt='hoihoi logo neg' width={122} height={35} />
            </Link>
          </div>
        </div>
      </div>

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
      <div className="w-screen bg-white">
        <div className="border-4 flex flex-col bg-white">
          <div className="border-b-2 border-gray-300 text-xl px-3 pt-2 bg-white text-black">
            <div className="float-left mr-2">
              <Image src={icon} width={60} height={60} alt="" />
            </div>
            <span className="text-black">Type:</span>
            <span className="text-4xl text-black">
              {mainFlag && entityName[mainFlag]}
              {!mainFlag && uuidData.error}
            </span>
            <div className="border-b-2 my-2 flex">
              <h2 className="text-black">UUID: {uuid}</h2>
              <div className="flex-auto pt-2 text-right text-sm text-black">
                データ取得日時：{uuidData.timestamp_list.local_time}
              </div>
            </div>
          </div>

          <div className="w-screen flex flex-row">
            <div className="w-64 bg-primary text-white p-2">
              <span className="text-gray-200">Related Contents</span>
              <div className="px-2">{hitSub}</div>
            </div>

            <div className="flex-1 p-4 bg-white">
              {/* タブナビゲーション */}
              <div className="tabs tabs-bordered mb-4">
                <button 
                  className={`tab ${activeTab === 'details' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('details')}
                >
                  詳細情報
                </button>
                <button 
                  className={`tab ${activeTab === 'relationships' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('relationships')}
                >
                  関連性
                </button>
                <button 
                  className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('history')}
                >
                  履歴
                </button>
              </div>

              {/* タブコンテンツ */}
              <div className="tab-content">
                {activeTab === 'details' && (
                  <div className="card bg-white shadow-xl">
                    <div className="card-body text-black">
                      {mainFlag && mainList && (
                        <>
                          <h2 className="card-title text-black">
                            <Image src={icon} width={40} height={40} alt="" />
                            <span className="text-black">{mainList.name}</span>
                          </h2>
                          <div className="badge badge-primary badge-lg">
                            {mainFlag && entityName[mainFlag]}
                          </div>
                          <div className="mt-4">
                            <h3 className="text-lg font-semibold mb-2 text-black">基本情報</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="form-control">
                                <label className="label">
                                  <span className="label-text font-semibold text-black">UUID</span>
                                </label>
                                <div className="input input-bordered bg-yellow-100 text-black">
                                  {mainList.uuid}
                                </div>
                              </div>
                              <div className="form-control">
                                <label className="label">
                                  <span className="label-text font-semibold text-black">名前</span>
                                </label>
                                <div className="input input-bordered text-black">
                                  {mainList.name}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-6">
                            <h3 className="text-lg font-semibold mb-2 text-black">詳細設定</h3>
                            <div className="bg-gray-50 p-4 rounded-lg text-black">
                              <Detail />
                            </div>
                          </div>
                        </>
                      )}
                      {!mainFlag && (
                        <div className="alert alert-warning">
                          <span className="text-black">UUIDが見つかりませんでした</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'relationships' && (
                  <div className="card bg-white shadow-xl">
                    <div className="card-body text-black">
                      <h2 className="card-title text-black">関連性の可視化</h2>
                      {mainFlag && mainList && list ? (
                        <UuidRelationshipGraph
                          mainUuid={mainList.uuid}
                          mainName={mainList.name}
                          mainType={mainFlag}
                          relatedData={list}
                          entityName={entityName}
                        />
                      ) : (
                        <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-6xl mb-4">🔗</div>
                          <p className="text-lg text-black">関連データがありません</p>
                          <p className="text-sm text-gray-600 mt-2">
                            選択したUUIDに関連するデータが見つかりませんでした
                          </p>
                        </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="card bg-white shadow-xl">
                    <div className="card-body text-black">
                      <h2 className="card-title text-black">変更履歴</h2>
                      <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-6xl mb-4">📊</div>
                          <p className="text-lg text-black">履歴表示（実装予定）</p>
                          <p className="text-sm text-gray-600 mt-2">
                            UUIDの変更履歴を時系列で表示します
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <UuidHistory />
        
        {/* UUIDエクスプローラのトップページへのリンク */}
        <div className="flex justify-center mt-8 mb-4">
          <Link 
            className="btn btn-primary btn-lg"
            href={{ 
              pathname: '/uuid', 
              query: { 
                pcip: searchParams.get('pcip'), 
                cluster: searchParams.get('cluster'),
                prism: searchParams.get('prism')
              } 
            }}
          >
            <FontAwesomeIcon icon={faFingerprint} className="mr-2" />
            UUIDエクスプローラのトップページに戻る
          </Link>
        </div>
      </div>
    </main>
  )
}


