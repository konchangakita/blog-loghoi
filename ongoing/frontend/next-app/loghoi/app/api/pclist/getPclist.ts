import { notFound } from 'next/navigation'

interface dict {
  [key: string]: any
}

type PcLists = {
  pc_list: dict
  cluster_list: dict
}

export async function getPclist() {
  //const res = await fetch('http://172.16.0.6:7776/api/pclist', { method: 'GET', cache: 'no-store' })
  const requestUrl = `${process.env.NEXT_PUBLIC_BACKEND_IP}/api/pclist`
  //const requestUrl = `http://172.16.0.6:7776/api/pclist`

  const res = await fetch(requestUrl, { method: 'GET', cache: 'no-store' })
  if (!res.ok) {
    throw new Error('Something went wrong!')
  }

  const resJson = (await res.json()) as PcLists
  if (!resJson['pc_list']) {
    // Render the closest `not-found.js` Error Boundary
    notFound()
  }

  return resJson
}
