import type { NextPage } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { ReactElement } from 'react'
import { useRouter } from 'next/router'

// アイコンの読み込み
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBug } from '@fortawesome/free-solid-svg-icons'
import { faFileLines } from '@fortawesome/free-solid-svg-icons'
import { faGear } from '@fortawesome/free-solid-svg-icons'

type LayoutProps = Required<{
  readonly children: React.ReactNode
}>

const Layout: NextPage<LayoutProps> = ({ children }) => {
  const router = useRouter()
  const urlQuery = { ...router.query }

  return (
    <>
      <div className=''>
        <div className='navbar bg-neutral text-neutral-content'>
          <div className='w-2/6 flex'>
            <div className='dropdown'>
              <label tabIndex={0} className='btn btn-square btn-ghost'>
                <svg xmlns='http://www.w3.org/2000/svg' className='inline-block w-6 h-6 stroke-white' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M4 6h16M4 12h16M4 18h16' />
                </svg>
              </label>

              <ul tabIndex={0} className='menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52 text-black'>
                <li>
                  <Link href={{ pathname: 'realtimelog', query: { pcip: router.query.pcip, cluster: router.query.cluster } }} className='hover:no-underline'>
                    <FontAwesomeIcon icon={faFileLines} bounce style={{ fontSize: '21px' }} />
                    Realtimelog
                  </Link>
                </li>
                <li>
                  <Link href={{ pathname: 'syslog', query: { pcip: router.query.pcip, cluster: router.query.cluster } }} className='hover:no-underline'>
                    <FontAwesomeIcon icon={faFileLines} style={{ fontSize: '21px' }} />
                    Syslog
                  </Link>
                </li>
                <li>
                  <Link href={{ pathname: 'loghoi', query: { pcip: router.query.pcip, cluster: router.query.cluster } }} className='hover:no-underline'>
                    <FontAwesomeIcon icon={faBug} shake style={{ fontSize: '21px' }} />
                    Standard Log
                  </Link>
                </li>
                <li>
                  <Link href={'/'} className='hover:no-underline'>
                    <FontAwesomeIcon icon={faGear} style={{ fontSize: '21px' }} />
                    Registration
                  </Link>
                </li>
              </ul>
            </div>

            <div className='flex-none px-2'>
              <Link href={{ pathname: '/gatekeeper', query: { pcip: router.query.pcip, cluster: router.query.cluster } }}>
                <Image src='/xplorer_logo-neg.png' alt='xplorer logo neg' width={124} height={35} />
              </Link>
            </div>
          </div>
        </div>
        <div>{children}</div>
        <div className='text-center'>
          <footer className='border-t-2 text-sm text-neutral'>Copyright (C) Log-Xplorer Team. All Rights Reserved.</footer>
        </div>
      </div>
    </>
  )
}

export default Layout
