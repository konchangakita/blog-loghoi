import { getBackendUrl } from '../../lib/getBackendUrl'

interface dict {
  [key: string]: any
}

type ResValues = {
  pc_list: dict
  cluster_list: dict
}

export async function getPclist1() {
  const requestUrl = `${getBackendUrl()}/api/pclist`

  return requestUrl
}
