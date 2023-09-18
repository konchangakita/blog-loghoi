import { useEffect, useState } from 'react'

interface dict {
  [key: string]: any
}

type ResValues = {
  pc_list: dict
  cluster_list: dict
}

const fetchPost = (path: string, query: dict) => {
  const [data, setData] = useState<dict>()
  const requestUrl = `${process.env.NEXT_PUBLIC_BACKEND}${path}`
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  }
  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch(requestUrl, requestOptions)
      const data = await response.json()
      setData(data)
    }
    fetchData()
  }, [])
  //console.log('PC List:', data)
  return data
}
export default fetchPost
