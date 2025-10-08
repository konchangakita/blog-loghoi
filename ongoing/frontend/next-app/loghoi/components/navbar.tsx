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
import { faFingerprint } from '@fortawesome/free-solid-svg-icons'
import { faBarsStaggered } from '@fortawesome/free-solid-svg-icons'

const Navbar = () => {
  const searchParams = useSearchParams()
  const pcip = searchParams.get('pcip')
  const cluster = searchParams.get('cluster')
  const prism = searchParams.get('prism')

  const [isOpen, setIsOpen] = useState(false)
  const [showCopied, setShowCopied] = useState(false)

  // クリップボードにコピーする関数（フォールバック対応）
  const copyToClipboard = async (text: string) => {
    try {
      // モダンブラウザのClipboard APIを試行
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        showCopiedMessage()
        return
      }
      
      // フォールバック: 古いブラウザやHTTP環境での対応
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (successful) {
        showCopiedMessage()
      } else {
        alert('クリップボードへのコピーに失敗しました。手動でコピーしてください。')
      }
    } catch (err) {
      console.error('クリップボードコピーエラー:', err)
      alert('クリップボードへのコピーに失敗しました。手動でコピーしてください。')
    }
  }

  // コピー完了メッセージを表示する関数
  const showCopiedMessage = () => {
    setShowCopied(true)
    setTimeout(() => {
      setShowCopied(false)
    }, 1000)
  }

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
                    <FontAwesomeIcon icon={faBarsStaggered} style={{ fontSize: '21px' }} />
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
                  <Link href={{ pathname: 'uuid', query: { pcip: pcip, cluster: cluster, prism: prism } }} className='hover:no-underline'>
                    <FontAwesomeIcon icon={faFingerprint} style={{ fontSize: '21px' }} />
                    UUID Explorer
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
                <Image src='/hoihoi_logo-neg.png' alt='hoihoi logo neg' width={122} height={35} />
              </Link>
            </div>
          </div>
          <div className='flex-auto justify-end mr-4 '>
            <button className='btn btn-neutral' onClick={() => setIsOpen(!isOpen)}>
              Open SSH KEY
            </button>
            {isOpen && (
              <div 
                className='fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50'
                onClick={() => setIsOpen(false)}
              >
                <div 
                  className='modal-box w-11/12 max-w-5xl text-left text-wrap'
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className='font-bold text-gray-900 text-lg mb-2 '>
                    ssh-keyをコピーして Prism ElementのクラスターロックダウンへSSH Keyを追加してください
                  </h3>
                  <article className='break-words rounded-xl bg-gray-100 p-2 relative'>
                    <p 
                      className='p-2 text-xs text-gray-500 text-balance select-all cursor-pointer hover:bg-gray-200 transition-colors'
                      onClick={() => {
                        copyToClipboard(sshKey)
                      }}
                      title='クリックしてSSHキーをコピー'
                    >
                      {sshKey}
                    </p>
                    
                    {/* Copied! ポップアップ - SSHキーの近くに表示 */}
                    {showCopied && (
                      <div className='absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out z-10'>
                        <div className='flex items-center space-x-1'>
                          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                          </svg>
                          <span className='text-sm font-medium'>Copied!</span>
                        </div>
                      </div>
                    )}
                  </article>
                  <div className='modal-action'>
                    <button 
                      className='btn btn-primary'
                      onClick={() => {
                        copyToClipboard(sshKey)
                      }}
                    >
                      キーをコピー
                    </button>
                    <form method='dialog'>
                      {/* if there is a button in form, it will close the modal */}
                      <button className='btn' onClick={() => setIsOpen(!isOpen)}>
                        閉じる
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
