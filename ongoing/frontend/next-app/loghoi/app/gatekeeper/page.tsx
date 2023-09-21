'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

//components
import fetchPost from '@/app/api/fetchPost'
import Navbar from '../components/navbar'
import { SubmitHandler, useForm } from 'react-hook-form'

interface dict {
  [key: string]: any
}

// Input value
type FormValues = {
  prism_ip: string
  prism_user: string
  prism_pass: string
}

const ClusterTab = (res: any) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pcip = searchParams.get('pcip')
  const cluster: string | null = searchParams.get('cluster')
  const prism = searchParams.get('prism')

  console.log(res)
  const clusterList = res.clusterList
  const [isActive, setIsActive] = useState('')

  useEffect(() => {
    if (cluster) {
      setIsActive(cluster)
    }
  }, [cluster])

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
        cluster_name: cluster,
        prism_ip: data['prism_ip'],
        prism_user: data['prism_user'],
        prism_pass: data['prism_pass'],
      }),
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND}/api/uuid/connect`, requestOptions)
    if (response.status === 200) {
      const res_json = await response.json()
      console.log(res_json)
      alert('UUID data fetched successfully!')
    } else {
      alert('Failed to connect to backend')
    }
  }

  const clusters = clusterList.length
    ? clusterList.map((val: dict, idx: number) => {
        return (
          <div key={idx + 1}>
            {isActive === val.name ? (
              <div className='tab tab-bordered tab-lg tab-lifted text-primary tab-active'>
                {val.name} {val.prism_ip}
              </div>
            ) : (
              <Link className='tab tab-bordered tab-lg tab-lifted text-white' href={{ query: { pcip: pcip, cluster: val.name, prism: val.prism_ip } }}>
                {val.name} {val.prism_ip}
              </Link>
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
                  <Link
                    href={{
                      pathname: 'realtimelog',
                      query: { pcip: pcip, cluster: cluster, prism: prism },
                    }}
                  >
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
                  <Link
                    href={{
                      pathname: 'syslog',
                      query: { pcip: pcip, cluster: cluster, prism: prism },
                    }}
                  >
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
                <h2 className='card-title text-gray-50'>Correct Log</h2>
                <div className='card-actions justify-center'>
                  <Link
                    href={{
                      pathname: 'correctlog',
                      query: { pcip: pcip, cluster: cluster, prism: prism },
                    }}
                  >
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
                  <Link href={{ pathname: 'uuid', query: { pcip: pcip, cluster: cluster, prism: prism } }}>
                    <div className='text-white hover:no-underline'>
                      <button className='btn btn-primary'>Launch</button>
                    </div>
                  </Link>
                </div>
                <div className='card-actions justify-center p-2 px-3 mt-3 bg-purple-800 bg-opacity-30 border border-purple-900 rounded-md'>
                  <p className='text-center text-gray-300'>cluster</p>
                  <form onSubmit={handleSubmit(handleConnectUuid)}>
                    <div className='flex flex-row'>
                      <div className='flex flex-col justify-center '>
                        <input {...register('prism_ip')} value={prism || ''} type='hidden' />
                        <input
                          {...register('prism_user', { required: true })}
                          type='text'
                          placeholder='username'
                          className='input input-info input-bordered w-36 text-base h-8'
                        />
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
          </div>
        </div>
      ) : (
        <div className='h-screen text-9xl text-white text-center'>
          <p>Please click</p> <p>cluster name</p>
        </div>
      )}
    </>
  )
}

const GateKeeper = () => {
  const searchParams = useSearchParams()

  // get PC list
  const path: string = '/api/pccluster'
  const query: dict = { pcip: searchParams.get('pcip') }
  const res = fetchPost(path, query)
  //const res_j = JSON.stringify(res)

  return (
    <>
      <main className=''>
        <Navbar />
        <div className="bg-[url('/Desktop-BG-3DPurple.png')] bg-cover bg-center bg-violet-900 h-full">
          <p className='pt-5 text-5xl text-white text-center'>Welcome to PC &#34;{searchParams.get('pcip')}&#34;</p>
          {res ? <ClusterTab clusterList={res} /> : null}
        </div>
      </main>
    </>
  )
}
export default GateKeeper
