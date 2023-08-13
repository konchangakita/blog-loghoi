import type { NextPage } from 'next'
import Link from 'next/link'
import Image from 'next/image'

import { useRouter } from 'next/router'
import { MouseEventHandler, useEffect, useState } from 'react'
import { ReactElement, useCallback } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'

import MyHead from '@/components/myhead'
import Layout from '@/components/layout'

import { InferGetServerSidePropsType } from 'next'
type Props = InferGetServerSidePropsType<typeof getServerSideProps>
import { GetServerSideProps } from 'next'

// Input value
type FormValues = {
  prism_ip: string
  prism_user: string
  prism_pass: string
}

interface dict {
  [key: string]: string
}

const ClusterTab = ({ clusterList }: Props) => {
  console.log(clusterList)
  const router = useRouter()
  const [isActive, setIsActive] = useState('')
  const [prismIp, setPrismIp] = useState('')

  //const handleClick: MouseEventHandler<HTMLAnchorElement> = (e) => {
  const handleClick = (Name: string, ip: string) => {
    //let _key = e.currentTarget.rel
    setIsActive(Name)
    setPrismIp(ip)
    router.push({
      query: {
        pcip: router.query.pcip,
        cluster: Name,
      },
    })
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>()

  const handleConnectUuid: SubmitHandler<FormValues> = async (data) => {
    console.log('Form input item: ', data)
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cluster_name: router.query.cluster,
        prism_ip: data['prism_ip'],
        prism_user: data['prism_user'],
        prism_pass: data['prism_pass'],
      }),
    }

    const response = await fetch('/api/uuid_connect', requestOptions)
    if (response.status === 200) {
      const res_json = await response.json()
      console.log(res_json)
      router.push({
        pathname: '/uuid',
        query: {
          pcip: router.query.pcip,
          cluster: router.query.cluster,
        },
      })
    } else {
      alert('Failed to connect to backend')
    }
  }

  const clusters = clusterList.length
    ? clusterList.map((val: dict, idx: number) => {
        return (
          <div key={idx + 1}>
            {isActive === val.name ? (
              <a className='tab tab-bordered tab-lg tab-lifted text-primary tab-active' onClick={() => handleClick(val.name, val.prism_ip)} rel={val.name}>
                {val.name} {val.prism_ip}
              </a>
            ) : (
              <a className='tab tab-bordered tab-lg tab-lifted text-primary' onClick={() => handleClick(val.name, val.prism_ip)} rel={val.name}>
                {val.name}
              </a>
            )}
          </div>
        )
      })
    : null

  return (
    <>
      <div className='tabs flex justify-center text-white pt-4' key='test'>
        {clusters}
      </div>

      {isActive ? (
        <div>
          <div className='flex justify-center '>
            <div className='card w-64 glass m-8 p-4'>
              <figure>
                <Image src={'/xplorer.png'} width={80} height={80} alt={''} />
              </figure>
              <div className='card-body flex items-center'>
                <h2 className='card-title text-gray-50'>Realtime Log</h2>
                <div className='card-actions justify-center'>
                  <Link href={{ pathname: 'realtimelog', query: { pcip: router.query.pcip, cluster: router.query.cluster } }}>
                    <div className='text-white hover:no-underline'>
                      <button className='btn btn-primary'>Launch</button>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            <div className='card w-64 glass m-8 p-4'>
              <figure>
                <Image src={'/xplorer.png'} width={80} height={80} alt={''} />
              </figure>
              <div className='card-body flex items-center'>
                <h2 className='card-title text-gray-50'>Syslog</h2>
                <div className='card-actions justify-center'>
                  <Link href={{ pathname: 'syslog', query: { pcip: router.query.pcip, cluster: router.query.cluster } }}>
                    <div className='text-white hover:no-underline'>
                      <button className='btn btn-primary'>Launch</button>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            <div className='card w-64 glass m-8 p-4'>
              <figure>
                <Image src={'/xplorer.png'} width={80} height={80} alt={''} />
              </figure>
              <div className='card-body flex items-center'>
                <h2 className='card-title text-gray-50'>Standard Log</h2>
                <div className='card-actions justify-center'>
                  <Link href={{ pathname: 'loghoi', query: { pcip: router.query.pcip, cluster: router.query.cluster } }}>
                    <div className='text-white hover:no-underline'>
                      <button className='btn btn-primary'>Launch</button>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className='flex justify-center'>
            <div className='card w-64 glass m-8 p-4 pb-0'>
              <figure>
                <Image src={'/xplorer.png'} width={80} height={80} alt={''} />
              </figure>
              <div className='card-body flex items-center'>
                <h2 className='card-title text-gray-50'>UUID</h2>
                <div className='card-actions justify-center'>
                  <Link href={{ pathname: 'uuid', query: { pcip: router.query.pcip, cluster: router.query.cluster } }}>
                    <div className='text-white hover:no-underline'>
                      <button className='btn btn-primary'>Launch</button>
                    </div>
                  </Link>
                </div>{' '}
                <div className='card-actions justify-center p-2 px-3 mt-3 bg-purple-800 bg-opacity-30 border border-purple-900 rounded-md'>
                  <form onSubmit={handleSubmit(handleConnectUuid)}>
                    <div className='flex flex-row'>
                      <div className='flex flex-col justify-center '>
                        <input {...register('prism_ip')} value={prismIp} type='hidden' />
                        <input {...register('prism_user', { required: true })} type='text' placeholder='username' className='input input-info input-bordered w-36 text-base h-8' />
                        {errors.prism_user && <p className='text-red-600'>required.</p>}
                        <input
                          {...register('prism_pass', { required: true })}
                          type='password'
                          placeholder='Password'
                          className='input input-info input-bordered w-36 text-base h-8 mt-2'
                        />
                        {errors.prism_pass && <p className='text-red-600'>required.</p>}
                      </div>
                      <div className='pl-2'>
                        <div className='text-white flex justify-center py-2'>
                          <button type='submit' className='btn btn-primary w-12 h-[60px] text-xs py-3'>
                            <p>data</p>
                            <p>fetch</p>
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <div className='card w-64 glass m-8 p-4'>
              <figure>
                <Image src={'/xplorer.png'} width={80} height={80} alt={''} />
              </figure>
              <div className='card-body flex items-center'>
                <h2 className='card-title text-gray-50'>Support Portal</h2>
                <div className='card-actions justify-center'>
                  <Link href={{ pathname: 'https://portal.nutanix.com/page/home' }} target='_blank'>
                    <button className='btn btn-primary'>Launch</button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className='h-screen text-9xl text-white text-center'> Please click cluster name </div>
      )}
    </>
  )
}

const GateKeeper: NextPage<Props> = ({ res }) => {
  console.log('/api/pcluster: ', res)
  const router = useRouter()

  return (
    <>
      <MyHead title='gatekeeper' />
      <Layout>
        <div className="bg-[url('/Desktop-BG-3DPurple.png')] bg-cover bg-center h-fit bg-violet-900">
          <p className='pt-5 text-5xl text-white text-center'>Welcome to PC &#34;{router.query.pcip}&#34;</p>

          {res ? <ClusterTab clusterList={res} /> : null}
        </div>
      </Layout>
    </>
  )
}
export default GateKeeper

export const getServerSideProps: GetServerSideProps = async (context) => {
  const fetchUrl = 'http://backend:7776/api/pccluster'
  //const fetchUrl = 'https://a9b24a7d-3fd3-4cc5-ab8d-1127e676ad37.mock.pstmn.io/api/clusterlist'

  const keyword = context.query
  console.log('context query', keyword)
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
    console.log('connection error')
    return { props: {} }
  }
}
