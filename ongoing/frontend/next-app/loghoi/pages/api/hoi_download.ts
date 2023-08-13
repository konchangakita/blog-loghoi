import { NextApiRequest, NextApiResponse } from 'next'

export default async (req: NextApiRequest, res: NextApiResponse) => {
  console.log('req:', req.query)
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body),
  }

  console.log('###### request url: http://backend:7776/api/hoi/download', requestOptions)
  const response = await fetch('http://backend:7776/api/hoi/download', requestOptions)
  const data = await response.arrayBuffer()
  //console.log('###### response', data)

  res.setHeader('Content-Type', response.headers.get('content-type') || '')
  res.setHeader('Content-Disposition', response.headers.get('content-disposition') || '')
  res.status(response.status)
  res.send(Buffer.from(data))
}
