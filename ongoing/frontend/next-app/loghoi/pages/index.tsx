import type { NextPage } from 'next'
import { useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'
import router from 'next/router'

import { SubmitHandler, useForm } from 'react-hook-form'

import MyHead from '@/components/myhead'
import ClusterList from '@/components/clusterlist'
import PcList from '@/components/pclist'
import Laoding from '@/components/loading'

//fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowCircleRight } from '@fortawesome/free-solid-svg-icons'

import { InferGetServerSidePropsType } from 'next'
type Props = InferGetServerSidePropsType<typeof getServerSideProps>

// Input value
type FormValues = {
  prism_ip: string
  prism_user: string
  prism_pass: string
}

const Index: NextPage<Props> = ({ res }) => {
  // loading
  const [pageLoading, setPageLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>()

  const onConnect: SubmitHandler<FormValues> = async (data) => {
    setPageLoading(true)

    console.log('Form input item: ', data)
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }

    const response = await fetch('/api/regist', requestOptions)
    if (response.status === 200) {
      const res_json = await response.json()
      console.log(res_json)
      // moda ni shitai
      alert(res_json)
      location.reload()
      setPageLoading(false)
    } else {
      alert('Failed to connect to backend')
      setPageLoading(false)
    }
  }

  return (
    <>
      {pageLoading && <Laoding />}

      <MyHead title='Welcome' />
      <main data-theme='white' className='flex text-center items-center h-screen'>
        <div className='w-1/2'>
          <div className='text-2xl font-bold m-5'>PC LIST</div>
          <div className='flex flex-col justify-center items-center'>{res ? <PcList res={res} /> : null}</div>
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
      <footer className='text-center text-sm'>Copyright (C) Log Xploer Team. All Rights Reserved.</footer>
    </>
  )
}

export default Index

import { GetServerSideProps } from 'next'

interface dict {
  [key: string]: string
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const requestOptions = { method: 'GET' }
  const fetchUrl = 'http://backend:7776/api/pclist'
  //const fetchUrl = 'https://a9b24a7d-3fd3-4cc5-ab8d-1127e676ad37.mock.pstmn.io/api/clusterlist'

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
