import { useEffect, useState } from 'react'

interface dict {
  [key: string]: any
}

type ResValues = {
  pc_list: dict
  cluster_list: dict
}

const fetchGet = (path: string) => {
  const [data, setData] = useState<ResValues>()
  const requestUrl = `${process.env.NEXT_PUBLIC_BACKEND}${path}`
  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch(requestUrl, { method: 'GET' })
      const data = await response.json()
      setData(data)
    }
    fetchData()
  }, [])
  //console.log('PC List:', data)
  return data
}
export default fetchGet
