'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'

// components
import fetchPost from '@/app/api/fetchPost'
import Navbar from '@/app/components/navbar'
import UuidHistory from '@/app/components/uuidhistory'
import { setLinkCookie, delCookie } from '@/app/components/setcookie'

// cookie
import { parseCookies, setCookie, destroyCookie } from 'nookies'
import { cookies } from 'next/dist/client/components/headers'

interface dict {
  [key: string]: string
}

// Switch by list
export const HitMain = ({ mainFlag, hitMain }: any) => {
  console.log('mainFlag:', mainFlag)
  const Detail = () => {
    if (mainFlag === 'vmlist') {
      return (
        <div className='m-2 text-xs'>
          【VM Spec Detail】
          <div>Cluster UUID: {hitMain['cluster_uuid']}</div>
          {hitMain['niclist_uuid']
            ? hitMain['niclist_uuid'].map((val: string, key: number) => {
                return (
                  <div key={'nic' + key + 1}>
                    NIC UUID&#40;{key + 1}&#41;: {val}
                  </div>
                )
              })
            : null}
          {hitMain['disklist_uuid']
            ? hitMain['disklist_uuid'].map((val: string, key: number) => {
                return (
                  <div key={'disk' + key + 1}>
                    Disk UUID&#40;{key + 1}&#41;: {val}
                  </div>
                )
              })
            : null}
        </div>
      )
    } else if (mainFlag === 'vglist') {
      return (
        <div className='m-2 text-xs'>
          【Volume Group Detail】
          <div>Cluster UUID: {hitMain['cluster_uuid']}</div>
          {hitMain['attachment_list'] &&
            (hitMain['attachment_list'][0]['vm_uuid']
              ? hitMain['attachment_list'].map((val: dict, key: number) => {
                  return (
                    <div key={'attachvm' + key + 1}>
                      Attach VM UUID&#40;{key + 1}&#41;: {val['vm_uuid']}
                    </div>
                  )
                })
              : '')}
          {hitMain['attachment_list'] &&
            (hitMain['attachment_list'][0]['iscsi_initiator_name']
              ? hitMain['attachment_list'].map((val: dict, key: number) => {
                  return (
                    <div key={'initiator' + key + 1}>
                      Initiator Name&#40;{key + 1}&#41;: {val['iscsi_initiator_name']}
                    </div>
                  )
                })
              : '')}
          <div className='pt-2 font-bold'>Disks {Object.keys(hitMain['disklist']).length}</div>
          {hitMain['disklist'].map((val: dict, key: number) => {
            return (
              <div key={'disklist' + key}>
                <div>
                  vDisk UUID&#40;{key + 1}&#41;: {val['vmdisk_uuid']}
                </div>
                <div>
                  vDisk Size&#40;{key + 1}&#41;: {Number(val['vmdisk_size_mb']).toLocaleString()} Mbytes
                </div>
              </div>
            )
          })}
        </div>
      )
    } else if (mainFlag === 'vflist') {
      return (
        <div className='m-2 text-xs'>
          【File Server Detail】
          <div>Cluster UUID: {hitMain['cluster_uuid']}</div>
          {hitMain['nvms'].map((val: dict, key: number) => {
            return (
              <div className='mb-1' key={'nvm' + key + 1}>
                <div key={'nvmsuuid' + key + 1}>
                  NVMS UUID&#40;{key + 1}&#41;: {val['uuid']}
                </div>
                <div key={'nvmsvmuuid' + key + 1}>
                  NVMS VM UUID&#40;{key + 1}&#41;: {val['vmUuid']}
                </div>
              </div>
            )
          })}
        </div>
      )
    } else if (mainFlag === 'sharelist') {
      return (
        <div className='m-2 text-xs'>
          【Share Detail】
          <div>Cluster UUID: {hitMain['cluster_uuid']}</div>
          <div>File Server UUID: {hitMain['fileServerUuid']}</div>
          <div>Container UUID: {hitMain['containerUuid']}</div>
          <div>Default Quota Policy UUID:</div>
          <div>{hitMain['defaultQuotaPolicyUuid']}</div>
        </div>
      )
    } else if (mainFlag === 'sclist') {
      console.log(hitMain)
      return (
        <div className='m-2 text-xs'>
          【Storage Container Detail】
          <div>Cluster UUID: {hitMain['cluster_uuid']}</div>
          <div>
            使用中サイズ:{' '}
            {hitMain['own_usage_bytes'] <= 1024 * 1024 * 1024 * 1024
              ? (hitMain['own_usage_bytes'] / (1024 * 1024 * 1024)).toFixed(2) + ' GiB'
              : (hitMain['own_usage_bytes'] / (1024 * 1024 * 1024 * 1024)).toFixed(2) + ' TiB'}
          </div>
          <div>圧縮: {hitMain['compression_enabled'].toString()}</div>
          <div>重複排除: {hitMain['on_disk_dedup']}</div>
          <div>暗号化: {hitMain['enable_software_encryption'].toString()}</div>
          <div>Erasure Coding: {hitMain['erasure_code']}</div>
        </div>
      )
    } else {
      return <></>
    }
  }

  return (
    <div className=''>
      {mainFlag && (
        <div className='border-2 h-full p-1'>
          <h3 className='text-sm'>Name: {hitMain.name}</h3>
          <h3 className='text-sm'>
            UUID: <span className='bg-yellow-200'>{hitMain.uuid}</span>
          </h3>
          <Detail />
        </div>
      )}
      {!mainFlag && <div>no hit</div>}
    </div>
  )
}

const ContentsUUIDPage = ({ params }: { params: { content: string } }) => {
  //console.log(res, cookies)
  const content = params.content
  const searchParams = useSearchParams()
  const pcip = searchParams.get('pcip')
  const cluster = searchParams.get('cluster')
  const prism = searchParams.get('prism')

  const path: string = '/api/uuid/contentdataset'
  const body = { pcip: pcip, cluster: cluster, prism: prism, content: content }
  const res: any = fetchPost(path, body)
  console.log('res', res)

  const router = useRouter()

  const entityName: dict = { vmlist: 'VMs', vglist: 'Volume Group', vflist: 'File Server', sharelist: 'Shares', sclist: 'Storage Containers' }
  const iconList: dict = { vmlist: '/vms.png', vglist: '/vg.png', vflist: '/vfiler.png', sharelist: '/share.png', sclist: '/storage.png' }

  const list = res ? res.list : ''
  const mainFlag = res ? (res.main_flag ? res.main_flag : null) : null
  const mainList = mainFlag ? list[mainFlag][0] : null

  const name = !mainFlag ? 'no hit' : list[mainFlag][0].name
  const uuid = !mainFlag ? 'no hit' : list[mainFlag][0].uuid
  const icon = !mainFlag ? '/robo.png' : iconList[mainFlag]

  const allListKey = res ? (res.list ? Object.keys(res.list) : []) : []
  const subListKey = allListKey.filter((val) => val !== mainFlag)
  const hitSub = subListKey.map((val, key) => {
    const entity = list[val]
    const entityTitle = entityName[val]

    const entityChildren = entity.map((val: any, key: number) => {
      const name = val.name
      const uuid = val.uuid
      const contentsUrl = '/uuid/content/' + uuid
      // const cluster = router.query.cluster
      // const pcip = router.query.pcip
      // const user = router.query.user
      return (
        <div className='my-1' key={key * 100}>
          <Link href={{ pathname: contentsUrl, query: { pcip: pcip, cluster: cluster } }} onClick={() => setLinkCookie(uuid)}>
            <div className='text-white text-xs hover:no-underline'>
              <p className='ml-2 underline font-bold'>{name}</p>
              <p className='mx-2 hover:no-underline'>{uuid}</p>
            </div>
          </Link>
        </div>
      )
    })
    return (
      <div className='m-2' key={key}>
        <p>{entityTitle} &gt;</p>
        {entityChildren}
      </div>
    )
  })

  return (
    <>
      <main>
        <Navbar />
        {res ? (
          <>
            <div className='flex justify-center p-1'>
              <Link className='hover:no-underline' href={{ pathname: '/uuid', query: { pcip: pcip, cluster: pcip } }}>
                <p className='text-3xl text-primary p-2 text-center '>UUID Xplorer -&quot;{cluster}&quot;</p>
              </Link>
            </div>
            <div className='w-screen'>
              <div className='border-4 flex flex-col'>
                <div className='border-b-2 border-black text-xl px-3 pt-2 '>
                  <div className='float-left mr-2'>
                    <Image src={icon} width={60} height={60} alt={''} />
                  </div>
                  Type:
                  <span className='text-4xl'>
                    {mainFlag && entityName[mainFlag]}
                    {!mainFlag && res.error}
                  </span>
                  <div className='border-b-2 my-2 flex'>
                    <h2>UUID: {content}</h2>
                    <div className='flex-auto pt-2 text-right text-sm'>データ取得ターゲット：{res.timestamp_list.local_time}</div>
                  </div>
                </div>

                <div className='w-screen flex flex-row'>
                  <div className='w-64 bg-primary text-white p-2'>
                    <span className='text-gray-200'>Related Contents</span>
                    <div className='px-2'>{hitSub}</div>
                  </div>

                  <div className='w-2/5'>
                    <div className=''>
                      <div className='flex-1 '>
                        <HitMain mainFlag={mainFlag} hitMain={mainList} />
                      </div>
                    </div>
                  </div>
                  <div className='w-2/5'>
                    ここにツリー表示予定（工事中）
                    {/*<TreeDraw />*/}
                  </div>
                </div>
              </div>
              <UuidHistory content={content} />
            </div>
          </>
        ) : null}
      </main>
    </>
  )
}
export default ContentsUUIDPage
