interface dict {
  [key: string]: any
}

type ResValues = {
  pc_list: dict
  cluster_list: dict
}

export async function getPclist1() {
  const requestUrl = `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/pclist`

  return requestUrl
}
