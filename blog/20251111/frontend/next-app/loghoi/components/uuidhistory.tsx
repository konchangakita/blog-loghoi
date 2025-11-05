import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'

import { MouseEventHandler, useEffect, useState } from 'react'
import { parseCookies, setCookie, destroyCookie } from 'nookies'

interface dict {
  [key: string]: string
}

export default function UuidHistory(content: any) {
  const searchParams = useSearchParams()
  const pcip = searchParams.get('pcip')
  const cluster = searchParams.get('cluster')
  const uuid = content
  //const [uuidHistory, setUuidHistory] = useState<string[]>()
  const cookies = parseCookies()
  console.log('#################', cookies)

  const history: string[] = cookies['uuidHistory'] ? JSON.parse(cookies['uuidHistory']) : []
  const uniqueHistory = history.filter((item, index) => history.indexOf(item) === index)

  const [effected, setEffected] = useState(false)
  useEffect(() => {
    setEffected(true), console.log('effect!!!')
  }, [])

  const handleDesko = () => {
    destroyCookie(null, 'uuidHistory', { path: '/uuid', sameSite: true })
    location.reload()
  }

  return (
    <>
      <div className='p-2 text-primary text-lg font-bold underline'>-- Search History -- </div>

      {uniqueHistory.length && effected ? (
        uniqueHistory.map((val: string, key: number) => {
          if (val === uuid) {
            return null
          } else {
            const contentUrl = '/uuid/content/' + val
            return (
              <div className='pl-2' key={key}>
                <Link href={{ pathname: contentUrl, query: { pcip: pcip, cluster: cluster } }}>{val}</Link>
              </div>
            )
          }
        })
      ) : (
        <div>no uuid hsitory</div>
      )}
    </>
  )
}
