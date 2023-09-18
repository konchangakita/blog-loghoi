'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

//components
import Laoding from './components/loading'
import fetchGet from './api/fetchGet'

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

const PcList = ({ dataPc }: any) => {
  console.log('PC LIST', dataPc)

  const pcList = dataPc.pc_list
  const clusterList = dataPc.cluster_list

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

const Index = () => {
  const [pageLoading, setPageLoading] = useState(false)

  // get PC list
  const path: string = '/api/pclist'
  const dataPc = fetchGet(path)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>()

  const onConnect: SubmitHandler<FormValues> = async (data) => {
    setPageLoading(true)
    //console.log('Form input item: ', data)

    //????????????????????
    // localhostのままでよいのか。。。？
    // サーバのIPアドレスでもいけるが。。。？
    // .env から process.env.NEXT_PUBLIC_BACKEND
    //??????????????????????????????????????????????
    const requestUrl = `${process.env.NEXT_PUBLIC_BACKEND}/api/regist`
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
    const response = await fetch(requestUrl, requestOptions)
    if (response.status === 200) {
      const res_json = await response.json()
      console.log(res_json)
      // moda ni shitai
      alert(res_json)
      location.reload()
    } else {
      alert('Failed to connect to backend')
    }
    setPageLoading(false)
  }

  return (
    <>
      {pageLoading && <Laoding />}

      <main data-theme='white' className='flex text-center items-center h-screen'>
        <div className='w-1/2'>
          <div className='text-2xl font-bold m-5'>PC LIST</div>
          <div className='flex flex-col justify-center items-center'>{dataPc ? <PcList dataPc={dataPc} /> : null}</div>
        </div>

        <div className='w-1/2 bg-primary h-screen flex justify-center items-center flex flex-col'>
          <div className='text-3xl text-white'>PC Registration</div>
          <div className='form-control'>
            <form onSubmit={handleSubmit(onConnect)}>
              <div className='flex flex-col'>
                <input {...register('prism_ip', { required: true })} type='text' placeholder='Cluster IP' className='input input-info input-bordered m-1 w-64 text-lg' />
                {errors.prism_ip && <p className='text-red-600'>required.</p>}
                <input {...register('prism_user')} type='text' placeholder='username' className='input input-info input-bordered m-1 w-64 text-lg' />
                <div className='m-1 relative'>
                  <input {...register('prism_pass')} type='password' placeholder='Password' className='input input-info input-bordered w-64 text-lg' />
                  <button type='submit' className='absolute inset-y-2 right-2 opacity-20 hover:opacity-100'>
                    <FontAwesomeIcon icon={faArrowCircleRight} size='2x' />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  )
}
export default Index
