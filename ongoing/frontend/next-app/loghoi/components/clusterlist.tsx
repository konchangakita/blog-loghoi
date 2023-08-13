import Link from 'next/link'

import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '@/pages/index'
type Props = InferGetServerSidePropsType<typeof getServerSideProps>

interface dict {
  [key: string]: string
}

const ClusterList = ({ clusterList }: Props) => {
  const list = clusterList.length ? (
    clusterList.map((val: dict, idx: number) => {
      return (
        <tr className='hover' key={idx + 1}>
          <td>{idx + 1}</td>
          <td className='whitespace-normal'>
            <Link href={{ pathname:'gatekeeper', query: {cluster: val.name}}}>{val.name}</Link>
          </td>
          <td className='whitespace-normal'>{val.prism_ip}</td>
        </tr>
      )
    })
  ) : (
    <tr>
      <td>empty</td>
      <td className='w-32'>&mdash;</td>
      <td className='w-32'>&mdash;</td>
    </tr>
  )

  return (
    <>
      <table className='table table-zebra m-0'>
        <thead className='sticky top-0'>
          <tr>
            <th>No.</th>
            <th className='w-32'>Cluster Name</th>
            <th>Prism IP</th>
          </tr>
        </thead>
        <tbody>{list}</tbody>
      </table>
    </>
  )
}

export default ClusterList
