import Link from 'next/link'
import Image from 'next/image'

//api
import { getPclist } from './api/pclist/getPclist'

//components
import Laoding from './components/loading'
import PcRegist from './components/pcRegist'

// React Hook Form
import { SubmitHandler, useForm } from 'react-hook-form'

//fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowCircleRight } from '@fortawesome/free-solid-svg-icons'

// Input value
type FormValues = {
  prism_ip: string
  prism_user: string
  prism_pass: string
}

interface dict {
  [key: string]: any
}

type ResValues = {
  pc_list: dict
  cluster_list: dict
}

const DisplayCluster = ({ clusterList }: any) => {
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

const PcList = async () => {
  // fetch
  const res = await getPclist()
  console.log(res)

  const pcList: any = res ? res.pc_list : ''
  const clusterList: any = res ? res.cluster_list : ''

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
    <div>
      <table>
        <tbody>
          <tr>
            <td>empty</td>
            <td className='w-32'>&mdash;</td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  return <>{displayPc}</>
}

const Index = () => {
  return (
    <>
      <main data-theme='white' className='flex text-center items-center h-screen'>
        <div className='w-1/2'>
          <div className='text-2xl font-bold m-5'>PC LIST</div>
          <div className='flex flex-col justify-center items-center'>
            <PcList />
          </div>
        </div>
        <PcRegist />
      </main>
    </>
  )
}
export default Index
