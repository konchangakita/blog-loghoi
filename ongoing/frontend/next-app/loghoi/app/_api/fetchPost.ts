import { getBackendUrl } from '../../lib/getBackendUrl'

interface Dict {
  [key: string]: unknown
}

const fetchPost = async (path: string, query: Dict): Promise<Dict | undefined> => {
  const requestUrl = `${getBackendUrl()}${path}`
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  }
  try {
    const response = await fetch(requestUrl, requestOptions)
    if (response.status === 200) {
      const data = await response.json()
      // console.log('PC List:', data)
      return data
    } else {
      alert('Failed to connect to backend')
      return undefined
    }
  } catch (error) {
    console.error('Error posting data:', error)
    return undefined
  }
}
export default fetchPost
