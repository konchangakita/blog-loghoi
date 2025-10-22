import { getBackendUrl } from '../../lib/getBackendUrl'

interface Dict {
  [key: string]: unknown
}

type ResValues = {
  pc_list: Dict
  cluster_list: Dict
}

const fetchGet = async (path: string): Promise<ResValues | undefined> => {
  const requestUrl = `${getBackendUrl()}${path}`
  try {
    const response = await fetch(requestUrl, { method: 'GET' })
    const data = await response.json()
    // console.log('PC List:', data)
    return data
  } catch (error) {
    console.error('Error fetching data:', error)
    return undefined
  }
}
export default fetchGet
