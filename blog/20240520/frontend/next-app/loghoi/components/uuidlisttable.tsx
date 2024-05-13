import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { MouseEventHandler } from 'react'

import { setLinkCookie, delCookie } from '../components/setcookie'

interface dict {
  [key: string]: string
}

const UuidListTable = ({ entity }: any) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pcip = searchParams.get('pcip')
  const cluster = searchParams.get('cluster')
  const prism = searchParams.get('prism')

  const list = entity ? (
    entity.map((vm: any, idx: number) => {
      const contentUrl = '/uuid/content/' + vm.uuid
      return (
        <tr className='hover' key={idx + 1}>
          <td>{idx + 1}</td>
          <td className='whitespace-normal'>{vm.name}</td>
          <td>
            <Link href={{ pathname: contentUrl, query: { pcip: pcip, cluster: cluster } }} onClick={() => setLinkCookie(vm.uuid)}>
              {vm.uuid}
            </Link>
          </td>
        </tr>
      )
    })
  ) : (
    <tr>
      <td>empty</td>
      <td className='w-64'>empty</td>
      <td className='w-80'>empty</td>
    </tr>
  )

  return (
    <>
      <table className='table table-zebra m-0'>
        <thead className='sticky top-0'>
          <tr>
            <th>No.</th>
            <th className='w-64'>NAME</th>
            <th>UUID</th>
          </tr>
        </thead>
        <tbody>{list}</tbody>
      </table>
    </>
  )
}

export default UuidListTable
