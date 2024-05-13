import { useState } from 'react'
import { parseCookies, setCookie, destroyCookie } from 'nookies'

export const setLinkCookie = (uuid: string) => {
  const cookies = parseCookies()
  const history: string[] = cookies['uuidHistory'] ? JSON.parse(cookies['uuidHistory']) : []
  history.push(uuid)
  // Set Cookie
  setCookie(null, 'uuidHistory', JSON.stringify(history), {
    maxAge: 24 * 60 * 60,
    path: '/uuid',
    sameSite: true,
  })
}

export const delCookie = () => {
  destroyCookie(null, 'uuidHistory', { path: '/uuid', sameSite: true })
  location.reload()
}
