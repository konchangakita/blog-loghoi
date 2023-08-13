import Link from 'next/link'
import { useRouter } from 'next/router'

import { MouseEventHandler, useEffect, useState } from 'react'
import { parseCookies, setCookie, destroyCookie } from 'nookies'

interface dict {
  [key: string]: string
}

export default function UuidHistory() {
  const router = useRouter()
  const uuid = router.query.content
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
                <Link href={{ pathname: contentUrl, query: { pcip: router.query.pcip, cluster: router.query.cluster } }}>{val}</Link>
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
