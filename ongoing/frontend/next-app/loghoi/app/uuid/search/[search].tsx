import type { GetServerSideProps, InferGetServerSidePropsType, NextPage } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { useRouter } from 'next/router'

import MyHead from '@/components/myhead'
import Layout from '@/components/layout'
import UuidHistory from '@/components/uuidhistory'

type Props = InferGetServerSidePropsType<typeof getServerSideProps>
interface dict {
  [name: string]: string
}

const SearchUUID: NextPage<Props> = ({ res }) => {
  //console.log('res:', res)
  const router = useRouter()
  const { search } = router.query

  const mainFlag = res.main_flag ? [res.main_flag] : ['empty']
  const listAll = res.list
  console.log(mainFlag)

  const entityName: dict = { vmlist: 'VMs', vglist: 'Volume Group', vflist: 'Files', sharelist: 'Shares', sclist: 'Storage Containers' }
  const iconList: dict = { vmlist: '/vms.png', vglist: '/vg.png', vflist: '/vfiler.png', sharelist: '/share.png', sclist: '/storage.png' }

  const displayFromList = (listKey: string[], list: any) => {
    const doc = listKey.map((entityKey, key: number) => {
      const entity = list[entityKey]
      const icon = iconList[entityKey]
      const entityTitle = entityName[entityKey]
      const count = Object.keys(entity).length

      const entityChildren = entity.map((val: any, key: number) => {
        const name = val.name
        const uuid = val.uuid
        const mainBg = mainFlag[0] === entityKey ? 'bg-yellow-200' : ''

        const contentUrl = '/uuid/content/[content]'
        const searchQuery = { ...router.query }
        delete searchQuery.search
        searchQuery['content'] = uuid
        return (
          <div className='p-1 mx-4 my-2' key={key + 1}>
            -- Search-result {key + 1} --
            <br />
            VM Name : {name}
            <br />
            VM UUID :{' '}
            <Link href={{ pathname: contentUrl, query: searchQuery }}>
              <p className={mainBg}>{uuid}</p>
            </Link>
          </div>
        )
      })

      return (
        <div className='p-1 border-4 m-4' key={key}>
          <div className='h-16'>
            <div className='float-left'>
              <Image src={icon} width={60} height={60} alt={''} />
            </div>
            <div className='h-16 py-4'>
              - {entityTitle} Result - hit count : {count}
            </div>
          </div>
          {entityChildren}
        </div>
      )
    })
    return <>{doc}</>
  }

  const hitMain = mainFlag[0] === 'empty' ? <div className=''>no hit</div> : displayFromList(mainFlag, listAll)

  const listAllKey = listAll ? Object.keys(res.list) : []
  const listSubKey = listAllKey.filter((val) => val !== mainFlag[0])
  const hitSubBar = Object.keys(listSubKey).length ? <div className='border-b-4 border-dashed w-4/5 mx-auto'></div> : null
  const hitSub = listSubKey ? displayFromList(listSubKey, listAll) : null

  console.log('hit list:', res.list)

  return (
    <>
      <MyHead title='UUID search' />
      <Layout>
        <main>
          <div className='flex justify-center p-1'>
            <Link className='hover:no-underline' href={{ pathname: '/uuid', query: { pcip: router.query.pcip, cluster: router.query.cluster } }}>
              <p className='text-3xl text-primary p-2 text-center '>UUID Xplorer -&quot;{router.query.cluster}&quot;</p>
            </Link>
          </div>
          <div>
            <div className='border-b-2 border-black px-3 pt-2 flex justify-between'>
              <div className='text-xl flex'>
                <h2>
                  Search Keyword: UUID <span className='bg-yellow-200'>{search}</span>
                </h2>
              </div>
              <div className='flex justify-end items-end text-sm'>取得ターゲット：{res.timestamp_list.local_time}</div>
            </div>
            <div className='m-2 flex flex-row '>
              <div className='flex-1 items-center justify-center items-center'>
                {hitMain}
                {hitSubBar}
                {hitSub}
              </div>
            </div>
            <UuidHistory />
          </div>{' '}
        </main>
      </Layout>
    </>
  )
}
export default SearchUUID

export const getServerSideProps: GetServerSideProps = async (context) => {
  //console.log(context.query)
  const fetchUrl = 'http://backend:7776/api/uuid/searchdataset'
  const keyword = context.query
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(keyword),
  }

  try {
    const response = await fetch(fetchUrl, requestOptions)
    if (response.ok) {
      const res: dict = await response.json()
      return { props: { res } }
    }
    console.log('connection error')
    return { props: {} }
  } catch (err) {
    //console.error(err)
    console.log('error connection error')
    return { props: {} }
  }
}
