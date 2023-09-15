'use client'
import { useSearchParams } from 'next/navigation'

//components
import fetchPost from '@/app/api/fetchPost'

interface dict {
  [key: string]: any
}

const GateKeeper = () => {
  const searchParams = useSearchParams()
  // get PC list
  const path: string = '/api/pccluster'
  const query: dict = { pcip: searchParams.get('pcip') }
  const res = fetchPost(path, query)
  console.log(res)
}
export default GateKeeper
