'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch } from '@fortawesome/free-solid-svg-icons'

import UuidListTable from './components/UuidListTable'
import { useUuidApi } from './hooks/useUuidApi'
import Navbar from '../../components/navbar'
import Loading from '../../components/loading'
import UuidCollecting from './components/UuidCollecting'

type FormValues = {
  searchUuid: string
}

interface UuidData {
  vmlist: Record<string, any>
  vglist: Record<string, any>
  vflist: Record<string, any>
  sharelist: Record<string, any>
  sclist: Record<string, any>
}

interface UuidResponse {
  list: UuidData
  cluster_name: string
  timestamp_list: {
    local_time: string
  }
}

export default function UuidPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { fetchUuidData, loading, error } = useUuidApi()
  
  const [entity, setEntity] = useState<Record<string, any>>({})
  const [isActive, setActive] = useState('vmlist')
  const [uuidData, setUuidData] = useState<UuidResponse | null>(null)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [authData, setAuthData] = useState({ username: '', password: '' })
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isCollecting, setIsCollecting] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>()

  const tabActive = 'tab tab-bordered tab-active text-gray-800 bg-blue-100 rounded-t-md'
  const tabInactive = 'tab tab-bordered'

  // 初期データ取得
  useEffect(() => {
    const fetchData = async () => {
      const queryParams = {
        pcip: searchParams.get('pcip') || '',
        cluster: searchParams.get('cluster') || '',
        prism: searchParams.get('prism') || '',
      }
      
      try {
        const data = await fetchUuidData(queryParams)
        if (data) {
          setUuidData(data)
          setEntity(data.list.vmlist)
        }
      } catch (err) {
        console.error('Failed to fetch UUID data:', err)
      } finally {
        setIsInitialLoading(false)
      }
    }

    fetchData()
  }, [searchParams])

  const handleActive = (key: string) => {
    if (uuidData) {
      setEntity(uuidData.list[key as keyof UuidData])
      setActive(key)
    }
  }

  const handleSearch = (data: FormValues) => {
    const searchQuery = {
      pcip: searchParams.get('pcip') || '',
      cluster: searchParams.get('cluster') || '',
      prism: searchParams.get('prism') || '',
      search: data.searchUuid,
    }
    
    router.push(`/uuid/search?${new URLSearchParams(searchQuery).toString()}`)
  }

  const handleDataFetch = () => {
    setShowAuthDialog(true)
  }

  const handleAuthSubmit = async () => {
    if (!authData.username || !authData.password) {
      setAuthError('ユーザー名とパスワードを入力してください')
      return
    }

    setIsAuthenticating(true)
    setAuthError('')

    try {
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cluster_name: searchParams.get('cluster') || '',
          prism_ip: searchParams.get('prism') || '',
          prism_user: authData.username,
          prism_pass: authData.password,
        }),
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7776'
      const response = await fetch(`${backendUrl}/api/uuid/connect`, requestOptions)
      
      if (response.status === 200) {
        // 認証成功 - プログレスバーを開始
        setIsAuthenticating(false)
        setIsCollecting(true)
        setShowAuthDialog(false)
        
        // 30秒後にプログレスバーを完了
        setTimeout(() => {
          setIsCollecting(false)
          setAuthData({ username: '', password: '' })
          // データ取得後にページをリロード
          window.location.reload()
        }, 30000)
      } else {
        // 認証失敗
        setIsAuthenticating(false)
        const errorData = await response.json()
        setAuthError(`認証に失敗しました: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error fetching UUID data:', error)
      setIsAuthenticating(false)
      setAuthError('接続エラーが発生しました')
    }
  }

  if (error) {
    return (
      <div>
        <Navbar />
        <div className="alert alert-error">
          <span>データの取得に失敗しました: {error}</span>
        </div>
      </div>
    )
  }

  // 初期読み込み中またはAPI読み込み中はLoadingコンポーネントを表示
  if (isInitialLoading || loading) {
    return (
      <div>
        <Navbar />
        <Loading />
      </div>
    )
  }

  // データがない場合のみ「現在データ無し」を表示
  if (!uuidData) {
    return (
      <div>
        <Navbar />
        <div className="flex flex-col items-center justify-center h-64">
          <div className="alert alert-info">
            <span>現在データ無し</span>
          </div>
          <div className="text-center my-4">
            <button 
              onClick={handleDataFetch}
              className="btn btn-primary"
            >
              データ取得
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Navbar />
      {uuidData ? (
        <main data-theme="white" className="text-center items-center">
          <div className="p-1">
            {(() => {
              const vmlistLength = uuidData.list.vmlist ? Object.keys(uuidData.list.vmlist).length : 0
              const vglistLength = uuidData.list.vglist ? Object.keys(uuidData.list.vglist).length : 0
              const vflistLength = uuidData.list.vflist ? Object.keys(uuidData.list.vflist).length : 0
              const sharelistLength = uuidData.list.sharelist ? Object.keys(uuidData.list.sharelist).length : 0
              const sclistLength = uuidData.list.sclist ? Object.keys(uuidData.list.sclist).length : 0
              
              return (
                <>
        <p className="text-3xl text-primary p-2">UUID Xplorer - "{uuidData.cluster_name}"</p>
        <div className="flex flex-col">
          <div className="flex flex-col">
            <div className="text-center my-1">データ取得時間：{uuidData.timestamp_list.local_time}</div>
            <div className="text-center my-2">
              <button 
                onClick={handleDataFetch}
                className="btn btn-primary btn-sm"
              >
                データ取得
              </button>
            </div>
            <div className="">
              <form className="flex flex-row justify-center" onSubmit={handleSubmit(handleSearch)}>
                <div className="inline-block flex h-6">
                  <input 
                    {...register('searchUuid', { required: true })} 
                    type="text" 
                    placeholder="UUID" 
                    className="w-64 pl-2 text-gray-800 border text-xs" 
                  />
                </div>
                <div className="inline-block flex items-center">
                  <button 
                    type="submit" 
                    className="bg-primary hover:bg-primary-focus rounded-r h-6 flex items-center px-2"
                  >
                    <FontAwesomeIcon icon={faSearch} size="xs" />
                  </button>
                </div>
              </form>
              {errors.searchUuid ? <p className="text-red-600">required.</p> : <div>&nbsp;</div>}
            </div>
          </div>
          <div className="mx-auto flex flex-row">
            <div className="w-32 pt-8">
              <div className="grid-flow-row shadow-lg border-2 stats w-32">
                <div className="stat p-4 text-right">
                  <a className="cursor-pointer hover:no-underline" onClick={() => handleActive('vmlist')}>
                    <div className="stat-title text-info">VMs</div>
                    <div className="stat-value text-xl">{vmlistLength}</div>
                  </a>
                </div>
                <div className="stat p-4 text-right">
                  <a className="cursor-pointer hover:no-underline" onClick={() => handleActive('vglist')}>
                    <div className="stat-title text-success text-sm">Volume Group</div>
                    <div className="stat-value text-xl">{vglistLength}</div>
                  </a>
                </div>
                <div className="stat p-4 text-right">
                  <a className="cursor-pointer hover:no-underline" onClick={() => handleActive('vflist')}>
                    <div className="stat-title text-warning text-sm">File Server</div>
                    <div className="stat-value text-xl">{vflistLength}</div>
                  </a>
                </div>
                <div className="stat p-4 text-right">
                  <a className="cursor-pointer hover:no-underline" onClick={() => handleActive('sharelist')}>
                    <div className="stat-title text-error">Shares</div>
                    <div className="stat-value text-xl">{sharelistLength}</div>
                  </a>
                </div>
                <div className="stat p-3 text-right">
                  <a className="cursor-pointer hover:no-underline" onClick={() => handleActive('sclist')}>
                    <div className="stat-title text-secondary text-xs">StorageContainer</div>
                    <div className="stat-value text-xl">{sclistLength}</div>
                  </a>
                </div>
              </div>
            </div>
            <div className="mx-4">
              <div className="">
                <a 
                  className={isActive === 'vmlist' ? tabActive : tabInactive} 
                  onClick={() => handleActive('vmlist')}
                >
                  VM List
                </a>
                <a 
                  className={isActive === 'vglist' ? tabActive : tabInactive} 
                  onClick={() => handleActive('vglist')}
                >
                  Volume Group
                </a>
                <a 
                  className={isActive === 'vflist' ? tabActive : tabInactive} 
                  onClick={() => handleActive('vflist')}
                >
                  File Server
                </a>
                <a 
                  className={isActive === 'sharelist' ? tabActive : tabInactive} 
                  onClick={() => handleActive('sharelist')}
                >
                  Shares
                </a>
                <a 
                  className={isActive === 'sclist' ? tabActive : tabInactive} 
                  onClick={() => handleActive('sclist')}
                >
                  Storage Container
                </a>
                <div className="h-[480px] overflow-auto border-2 shadow">
                  <div className="">
                    <UuidListTable entity={entity} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
                </>
              )
            })()}
          </div>
        </main>
      ) : null}

      {/* 認証ダイアログ */}
      {showAuthDialog && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">認証情報入力</h3>
            
            {/* エラー表示 */}
            {authError && (
              <div className="alert alert-error mb-4">
                <span>{authError}</span>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">ユーザー名</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full text-black"
                  value={authData.username}
                  onChange={(e) => setAuthData({ ...authData, username: e.target.value })}
                  placeholder="admin"
                  disabled={isAuthenticating}
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">パスワード</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered w-full text-black"
                  value={authData.password}
                  onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                  placeholder="パスワードを入力"
                  disabled={isAuthenticating}
                />
              </div>
            </div>
            <div className="modal-action">
              <button
                className="btn btn-primary"
                onClick={handleAuthSubmit}
                disabled={isAuthenticating}
              >
                {isAuthenticating ? '認証中...' : 'データ取得'}
              </button>
              <button
                className="btn"
                onClick={() => {
                  setShowAuthDialog(false)
                  setAuthData({ username: '', password: '' })
                  setAuthError('')
                }}
                disabled={isAuthenticating}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading表示（認証中） */}
      {isAuthenticating && <Loading />}
      
      {/* プログレスバー表示（データ収集中） */}
      {isCollecting && <UuidCollecting />}
    </div>
  )
}
