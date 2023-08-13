import { NextApiRequest, NextApiResponse } from 'next'

export default async (req: NextApiRequest, res: NextApiResponse) => {
  //console.log('req:', req.body)
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body),
  }
  const url = 'http://backend:7776/api/hoi/logdisplay'

  console.log('###### request url:', url, requestOptions)
  const response = await fetch(url, requestOptions)
  const data = await response.json()
  console.log('response:', data)

  res.status(response.status).json(data)
}
