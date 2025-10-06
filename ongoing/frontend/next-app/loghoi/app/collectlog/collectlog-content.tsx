'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

// components
import Loading from '@/components/loading'
import Collecting from '@/components/collecting'
import CvmSelector from './components/CvmSelector'
import LogCollector from './components/LogCollector'
import ZipManager from './components/ZipManager'
import LogFileList from './components/LogFileList'
import CollectLogViewer from './components/LogViewer'

// hooks
import { useCollectLogApi } from './hooks/useCollectLogApi'

// types
import { CollectLogState, ClusterData } from './types'

const CollectlogContnet = () => {
  const searchParams = useSearchParams()
  const ClusterName = searchParams.get('cluster')
  const PrismIp = searchParams.get('prism')

  // API フック
  const {
    error,
    clearError,
    getCvmList,
    collectLogs,
    getZipList,
    getLogsInZip,
    getLogFileSize,
    getLogContent,
    getLogContentRange,
    downloadZip,
  } = useCollectLogApi()

  // 状態管理
  const [state, setState] = useState<CollectLogState>({
    loading: true,
    collecting: false,
    loadingZip: false,
    loadingDisplay: false,
    prismLeader: '',
    cvmChecked: '',
    zipList: [],
    selectedZip: null,
    logsInZip: [],
    displayLog: undefined,
    selectedLogFile: undefined,
    // 追加読み込み用の現在までの読み込みバイト数
    loadedBytes: 0,
  })
  const [appendTick, setAppendTick] = useState(0)


  // 初期化
  useEffect(() => {
    const initializeData = async () => {
      if (!ClusterName) return

      setState(prev => ({ ...prev, loading: true }))
      const data = await getCvmList(ClusterName)
      
      if (data) {
        setState(prev => ({
          ...prev,
          clusterData: data,
          prismLeader: data.prism_leader || '',
          cvmChecked: data.prism_leader || '',
          loading: false,
        }))

        if (!data.prism_leader) {
          alert(`ssh key を cluster [${PrismIp}] の Prism Element で設定してください`)
        }
      } else {
        setState(prev => ({ ...prev, loading: false }))
      }
    }

    initializeData()
  }, [ClusterName, PrismIp, getCvmList])

  // イベントハンドラー
  const handleCvmChange = (cvm: string) => {
    setState(prev => ({ ...prev, cvmChecked: cvm }))
  }

  const handleCollectLogs = async () => {
    if (!state.cvmChecked) return

    setState(prev => ({ ...prev, collecting: true }))
    const result = await collectLogs(state.cvmChecked)
    
    if (result) {
      // ZIP一覧を更新（新しい日時が上になるようソート）
      const zipList = await getZipList()
      const sorted = [...zipList].sort((a, b) => {
        const ta = (a.match(/_(\d{8})_(\d{6})/) || [])[0]
        const tb = (b.match(/_(\d{8})_(\d{6})/) || [])[0]
        const va = ta ? ta.replace(/\D/g, '') : '0'
        const vb = tb ? tb.replace(/\D/g, '') : '0'
        // 降順（新しいものが上）
        return vb.localeCompare(va)
      })
      setState(prev => ({ ...prev, zipList: sorted }))
    }
    
    setState(prev => ({ ...prev, collecting: false }))
  }

  const handleZipSelect = async (zipName: string) => {
    setState(prev => ({ 
      ...prev, 
      selectedZip: zipName, 
      loadingZip: true,
      // ビュワー画面を初期状態にリセット
      displayLog: undefined,
      selectedLogFile: undefined,
      loadingDisplay: false
    }))
    
    if (zipName) {
      const logsInZip = await getLogsInZip(zipName)
      const sortedLogs = [...logsInZip].sort((a, b) => {
        // 末尾の _YYYYMMDD_HHMMSS を比較。なければ文字列比較。
        const ra = a.match(/_(\d{8})_(\d{6})/)
        const rb = b.match(/_(\d{8})_(\d{6})/)
        if (ra && rb) {
          const va = `${ra[1]}${ra[2]}`
          const vb = `${rb[1]}${rb[2]}`
          return vb.localeCompare(va) // 降順
        }
        return a.localeCompare(b)
      })
      setState(prev => ({ 
        ...prev, 
        logsInZip: sortedLogs, 
        loadingZip: false 
      }))
    } else {
      setState(prev => ({ 
        ...prev, 
        logsInZip: [], 
        loadingZip: false 
      }))
    }
  }

  const handleLogSelect = async (logFile: string) => {
    if (!state.selectedZip) return

    setState(prev => ({ ...prev, loadingDisplay: true, selectedLogFile: logFile }))
    
    try {
      // まずファイルサイズをチェック
      const fileSizeInfo = await getLogFileSize(logFile, state.selectedZip)
      
      if (fileSizeInfo) {
        const { file_size_mb } = fileSizeInfo
        
        // 1MB以上の場合は表示をブロック
        if (file_size_mb > 1) {
          setState(prev => ({ 
            ...prev, 
            loadingDisplay: false,
            displayLog: `FILE_SIZE_TOO_LARGE:${file_size_mb}` // 特別な値でファイルサイズを渡す
          }))
          return
        }
      }
      
      // ファイルサイズが小さいか、サイズ取得に失敗した場合は直接表示
      await loadLogContent(logFile)
    } catch (error) {
      console.error('ログ選択エラー:', error)
      setState(prev => ({ 
        ...prev, 
        loadingDisplay: false 
      }))
    }
  }

  const loadLogContent = async (logFile: string) => {
    if (!state.selectedZip) return
    
    try {
      const content = await getLogContent(logFile, state.selectedZip)
      
      setState(prev => ({ 
        ...prev, 
        displayLog: content || undefined, 
        loadingDisplay: false,
        loadedBytes: content ? new TextEncoder().encode(content).length : 0
      }))
    } catch (error) {
      console.error('ログ内容読み込みエラー:', error)
      setState(prev => ({ 
        ...prev, 
        loadingDisplay: false 
      }))
    }
  }

  // 追加読み込み（段階読み）
  const handleLoadMore = async () => {
    if (!state.selectedZip || !state.selectedLogFile) return
    try {
      // 追記前にスクロール位置スナップショットをトリガー
      setAppendTick((t) => t + 1)
      setState(prev => ({ ...prev, loadingDisplay: true }))
      const chunkSize = 5000
      const result = await getLogContentRange(state.selectedLogFile, state.selectedZip, state.loadedBytes || 0, chunkSize)
      const nextText = result?.content || ''
      setState(prev => ({
        ...prev,
        displayLog: (prev.displayLog || '') + nextText,
        loadingDisplay: false,
        loadedBytes: (prev.loadedBytes || 0) + (result?.range.length || 0)
      }))
    } catch (e) {
      console.error('追加読み込みエラー:', e)
      setState(prev => ({ ...prev, loadingDisplay: false }))
    }
  }


  const handleDownload = (zipName: string) => {
    downloadZip(zipName)
  }

  // ZIP一覧の初期化
  useEffect(() => {
    const loadZipList = async () => {
      const zipList = await getZipList()
      const sorted = [...zipList].sort((a, b) => {
        const ta = (a.match(/_(\d{8})_(\d{6})/) || [])[0]
        const tb = (b.match(/_(\d{8})_(\d{6})/) || [])[0]
        const va = ta ? ta.replace(/\D/g, '') : '0'
        const vb = tb ? tb.replace(/\D/g, '') : '0'
        return vb.localeCompare(va)
      })
      setState(prev => ({ ...prev, zipList: sorted }))
    }
    loadZipList()
  }, [getZipList])

  return (
    <>
      {state.collecting && <Collecting />}
      {state.loading && <Loading />}
      
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
          <button className="btn btn-sm" onClick={clearError}>×</button>
        </div>
      )}

      
      <div className='flex flex-row h-full min-h-0'>
        <div className='flex flex-col items-center flex-shrink-0'>
          <LogCollector
            onCollectLogs={handleCollectLogs}
            collecting={state.collecting}
            cvmChecked={state.cvmChecked}
          />
          
          <ZipManager
            zipList={state.zipList}
            selectedZip={state.selectedZip}
            onZipSelect={handleZipSelect}
            loadingZip={state.loadingZip}
            onDownload={handleDownload}
          />

          <LogFileList
            logsInZip={state.logsInZip}
            selectedLogFile={state.selectedLogFile}
            onLogSelect={handleLogSelect}
            selectedZip={state.selectedZip}
          />

          <CvmSelector
            cvmsIp={state.clusterData?.cvms_ip || []}
            prismLeader={state.prismLeader}
            cvmChecked={state.cvmChecked}
            onCvmChange={handleCvmChange}
            loading={state.loading}
          />
        </div>
        
        <div className="flex-1 min-w-0 max-w-full overflow-hidden">
          <CollectLogViewer
            logsInZip={state.logsInZip}
            displayLog={state.displayLog}
            onLogSelect={handleLogSelect}
            loadingDisplay={state.loadingDisplay}
            selectedZip={state.selectedZip}
            selectedLogFile={state.selectedLogFile}
            appendTick={appendTick}
          />
          {state.selectedZip && state.selectedLogFile && (
            <div className="mt-2 flex justify-start">
              <button className="btn btn-sm" onClick={handleLoadMore} disabled={state.loadingDisplay}>続きを読む</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
export default CollectlogContnet
