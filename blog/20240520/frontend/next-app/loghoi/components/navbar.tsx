'use client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

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

  const [isOpen, setIsOpen] = useState(false)

  /* eslint-disable */
  const sshKey =
    'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDMgukyMIQG94wdRTucCfwtOPBXgGwQ7S4Q4jqa5dENsBRKTgfR5xNcNdyARXlRYCr0gp+5OlgD+cPxtepuFYQN0MYePDPU1lf7VdDg6VRD0iAqPrSvHerzyLUPt3CDQIprGZqc1mNAfNpC46BiJhESw6L5m9Ad0QurJanXLmv08kI0pII1rj/KhxZkFl0YlMis6/MoSRKicQONBJcYU7FkO9AKpPy3KaGe4gKnYweOx2erlmnUNKSiGNUTQGW0eDyrFPSM0YsmnVF3RP2s4BWJ8bKR0yRWYLp+EQcwDd2lW85JossuMGsBSdxvmrokSVR9vE9CnyS6qJkHWlVshkHayExMckJkkOG5L+sXLsG/f3cpR9N2AbdPxXZRlmPynPQiM0/yGZrSi9XhiHONrc6U/OEk1U/AVR08M4l6xORCB/HaU9sC6ne3rnBdBRmKXYiS9G3XTKz86HFNIok0dbQ4GeCQPdCIpnfn8AJc7V1EzT1Kufb1jzwAhtxlJPMMby0= root@ebf87c702d81'
  /* eslint-enable */

  return (
    <>
      <div className=''>
        <div className='navbar bg-neutral text-neutral-content '>
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
                  <Link href={{ pathname: 'collectlog', query: { pcip: pcip, cluster: cluster, prism: prism } }} className='hover:no-underline'>
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
          <div className='flex-auto justify-end mr-4 '>
            <button className='btn btn-neutral' onClick={() => setIsOpen(!isOpen)}>
              Open SSH KEY
            </button>
            {isOpen && (
              <div className='fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 '>
                <div className='modal-box w-11/12 max-w-5xl text-left text-wrap '>
                  <h3 className='font-bold text-gray-900 text-lg mb-2 '>Copy ssh-key setting Prism Element's Cluster Lockdown Configuration</h3>
                  <article className='break-words rounded-xl bg-gray-100 p-2'>
                    <p className='p-2 text-xs text-gray-500 text-balance select-all'>{sshKey}</p>
                  </article>
                  <div className='modal-action'>
                    <form method='dialog'>
                      {/* if there is a button in form, it will close the modal */}
                      <button className='btn' onClick={() => setIsOpen(!isOpen)}>
                        Close
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
export default Navbar
