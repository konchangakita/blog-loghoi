import { useEffect, useState } from 'react'
import { getBackendUrl } from '../../lib/getBackendUrl'

interface dict {
  [key: string]: any
}

type ResValues = {
  pc_list: dict
  cluster_list: dict
}

const fetchGet = (path: string) => {
  const [data, setData] = useState<ResValues>()
  const requestUrl = `${getBackendUrl()}${path}`
  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch(requestUrl, { method: 'GET' })
      const responseData = await response.json()
      setData(responseData)
    }
    fetchData()
  }, [])
  // console.log('PC List:', data)
  return data
}
export default fetchGet
