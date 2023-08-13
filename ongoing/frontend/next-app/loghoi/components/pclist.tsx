import Link from 'next/link'
import Image from 'next/image'

import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '@/pages/index'
import { disconnect } from 'process'

type Props = InferGetServerSidePropsType<typeof getServerSideProps>

interface dict {
  [key: string]: string
}

const DisplayCluster = ({ clusterList }: Props) => {
  console.log('clusterList:', clusterList)
  const clusters = clusterList.length ? (
    clusterList.map((val: dict, idx: number) => {
      const iconList: dict = { AHV: '/ahv_ico.png', VMWARE: '/vmware_ico.png' }
      const icon = iconList[val.hypervisor]
      return (
        <tr className='' key={idx + 1}>
          <td className='whitespace-normal'>
            <div className='ml-8'>
              <Image src={icon} width={30} height={30} alt={''} className='inline' />
              <div className='inline px-2'>
                {val.name} {val.prism_ip}
              </div>
            </div>
          </td>
        </tr>
      )
    })
  ) : (
    <>empty</>
  )

  return <>{clusters}</>
}

const PcList = ({ res }: Props) => {
  const pcList = res.pc_list
  const clusterList = res.cluster_list

  const displayPc = pcList.length ? (
    pcList.map((val: dict, idx: number) => {
      const clusterListSub = clusterList[val.prism_ip]
      return (
        <div className='table table-compact p-4' key={idx + 1}>
          <table className='table '>
            <thead className='sticky top-0'>
              <tr className='hover'>
                <th>
                  <div className='text-2xl'>
                    <p className='inline px-4'>
                      <Link href={{ pathname: 'gatekeeper', query: { pcip: val.prism_ip } }}>
                        PC {val.prism_ip} &#91; {val.timestamp_jst} &#93;
                      </Link>
                    </p>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <DisplayCluster clusterList={clusterListSub} />
            </tbody>
          </table>
        </div>
      )
    })
  ) : (
    <tr>
      <td>empty</td>
      <td className='w-32'>&mdash;</td>
    </tr>
  )

  return <>{displayPc}</>
}
export default PcList
