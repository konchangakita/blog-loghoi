import { NextApiRequest, NextApiResponse } from 'next'

export default async (req: NextApiRequest, res: NextApiResponse) => {
  //console.log('req:', req.body)
  const requestOptions = { method: 'GET' }

  console.log('###### request url: http://backend:7776/api/rt/taillist', requestOptions)
  const response = await fetch('http://backend:7776/api/rt/taillist', requestOptions)
  const data = await response.json()
  console.log('response:', data)

  res.status(response.status).json(data)
}
