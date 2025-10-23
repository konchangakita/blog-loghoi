import { useEffect, useState } from 'react'
import { getBackendUrl } from '../../lib/getBackendUrl'

interface dict {
  [key: string]: any
}


const fetchPost = (path: string, query: dict) => {
  const [data, setData] = useState<dict>()
  const requestUrl = `${getBackendUrl()}${path}`
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  }
  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch(requestUrl, requestOptions)
      if (response.status === 200) {
        const responseData = await response.json()
        setData(responseData)
      } else {
        alert('Failed to connect to backend')
      }
    }
    fetchData()
  }, [])
  // console.log('PC List:', data)
  return data
}
export default fetchPost
