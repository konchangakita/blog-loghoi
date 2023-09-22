import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// fontアイコンの読み込み
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBug } from '@fortawesome/free-solid-svg-icons'
import { faFileLines } from '@fortawesome/free-solid-svg-icons'
import { faGear } from '@fortawesome/free-solid-svg-icons'

const Navbar = () => {
  const searchParams = useSearchParams()
  const pcip = searchParams.get('pcip')
  const cluster = searchParams.get('cluster')
  const prism = searchParams.get('prism')

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
                  <Link href={{ pathname: 'realtimelog', query: { pcip: pcip, cluster: cluster, prism: prism } }} className='hover:no-underline'>
                    <FontAwesomeIcon icon={faFileLines} bounce style={{ fontSize: '21px' }} />
                    Realtime log
                  </Link>
                </li>
                <li>
                  <Link href={{ pathname: 'syslog', query: { pcip: pcip, cluster: cluster, prism: prism } }} className='hover:no-underline'>
                    <FontAwesomeIcon icon={faFileLines} style={{ fontSize: '21px' }} />
                    Syslog
                  </Link>
                </li>
                <li>
                  <Link href={{ pathname: 'correctlog', query: { pcip: pcip, cluster: cluster, prism: prism } }} className='hover:no-underline'>
                    <FontAwesomeIcon icon={faBug} shake style={{ fontSize: '21px' }} />
                    collect Log
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
              <Link href={{ pathname: '/gatekeeper', query: { pcip: pcip, cluster: cluster, prism: prism } }}>
                <Image src='/xplorer_logo-neg.png' alt='xplorer logo neg' width={124} height={35} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
export default Navbar
