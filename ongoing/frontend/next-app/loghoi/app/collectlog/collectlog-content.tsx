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
import LogViewer from './components/LogViewer'

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
  })


  // 初期化
  useEffect(() => {
    const initializeData = async () => {
      if (!ClusterName) return

      console.log('Initializing data for cluster:', ClusterName)
      setState(prev => ({ ...prev, loading: true }))
      const data = await getCvmList(ClusterName)
      
      console.log('CVM data received:', data)
      
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
        console.log('No data received, setting loading to false')
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
      // ZIP一覧を更新
      const zipList = await getZipList()
      setState(prev => ({ ...prev, zipList }))
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
      setState(prev => ({ 
        ...prev, 
        logsInZip: logsInZip.sort(), 
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

    console.log('Log selected:', { logFile, selectedZip: state.selectedZip })
    console.log('Current state before log select:', state)
    
    setState(prev => ({ ...prev, loadingDisplay: true, selectedLogFile: logFile }))
    console.log('State updated to loadingDisplay: true and selectedLogFile:', logFile)
    
    try {
      // まずファイルサイズをチェック
      const fileSizeInfo = await getLogFileSize(logFile, state.selectedZip)
      console.log('File size info:', fileSizeInfo)
      
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
      console.error('Error in handleLogSelect:', error)
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
      console.log('Log content received:', content)
      console.log('Content type:', typeof content)
      console.log('Content length:', content?.length)
      
      setState(prev => ({ 
        ...prev, 
        displayLog: content || undefined, 
        loadingDisplay: false 
      }))
      console.log('State updated with content and loadingDisplay: false')
    } catch (error) {
      console.error('Error in loadLogContent:', error)
      setState(prev => ({ 
        ...prev, 
        loadingDisplay: false 
      }))
    }
  }


  const handleDownload = (zipName: string) => {
    downloadZip(zipName)
  }

  // ZIP一覧の初期化
  useEffect(() => {
    const loadZipList = async () => {
      const zipList = await getZipList()
      setState(prev => ({ ...prev, zipList }))
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
          <LogViewer
            logsInZip={state.logsInZip}
            displayLog={state.displayLog}
            onLogSelect={handleLogSelect}
            loadingDisplay={state.loadingDisplay}
            selectedZip={state.selectedZip}
            selectedLogFile={state.selectedLogFile}
          />
        </div>
      </div>
    </>
  )
}
export default CollectlogContnet
