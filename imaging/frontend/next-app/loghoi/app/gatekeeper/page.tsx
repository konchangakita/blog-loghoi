'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

//components
import fetchPost from '@/app/api/fetchPost'
import Navbar from '../components/navbar'

interface dict {
  [key: string]: any
}

const ClusterTab = (res: any) => {
  const searchParams = useSearchParams()
  console.log(res)
  const clusterList = res.clusterList
  const [isActive, setIsActive] = useState('')

  const cluster: string | null = searchParams.get('cluster')

  useEffect(() => {
    if (cluster) {
      setIsActive(cluster)
    }
  }, [cluster])

  const clusters = clusterList.length
    ? clusterList.map((val: dict, idx: number) => {
        return (
          <div key={idx + 1}>
            {isActive === val.name ? (
              <div className='tab tab-bordered tab-lg tab-lifted text-primary tab-active'>
                {val.name} {val.prism_ip}
              </div>
            ) : (
              <Link
                className='tab tab-bordered tab-lg tab-lifted text-white'
                href={{ query: { pcip: searchParams.get('pcip'), cluster: val.name, prism: val.prism_ip } }}
              >
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
                      query: { pcip: searchParams.get('pcip'), cluster: searchParams.get('cluster'), prism: searchParams.get('prism') },
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
                      query: { pcip: searchParams.get('pcip'), cluster: searchParams.get('cluster'), prism: searchParams.get('prism') },
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
                <h2 className='card-title text-gray-50'>Standard Log</h2>
                <div className='card-actions justify-center'>
                  <Link
                    href={{
                      pathname: 'correctlog',
                      query: { pcip: searchParams.get('pcip'), cluster: searchParams.get('cluster'), prism: searchParams.get('prism') },
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
      <main className='h-screen'>
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
