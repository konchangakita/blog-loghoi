// ログコレクト機能の型定義

export interface ClusterData {
  block_serial_number: string
  cvms_ip: string[]
  hypervisor: string
  name: string
  pc_ip: string
  prism_ip: string
  prism_leader: string
  timestamp: string
  uuid: string
}

export interface LogCollectionRequest {
  cvm: string
}

export interface LogCollectionResponse {
  message: string
  status?: 'success' | 'error'
}

export interface ZipListResponse {
  zip_list: string[]
}

export interface LogsInZipResponse {
  logs: string[]
}

export interface LogDisplayRequest {
  log_file: string
  zip_name: string
}

export interface LogDisplayResponse {
  status: 'success' | 'error'
  message: string
  data?: string | { empty: boolean; message: string }
  error?: string
}

export interface LogSizeResponse {
  status: 'success' | 'error'
  message: string
  data?: {
    file_size: number
    file_size_mb: number
    file_path: string
  }
  error?: string
}

export interface CollectLogState {
  // ローディング状態
  loading: boolean
  collecting: boolean
  loadingZip: boolean
  loadingDisplay: boolean
  
  // データ
  clusterData?: ClusterData
  prismLeader: string
  cvmChecked: string
  zipList: string[]
  selectedZip: string | null
  logsInZip: string[]
  displayLog?: string
  selectedLogFile?: string
  // 追加読み込み: 読み込み済みバイト数
  loadedBytes?: number
  
  // キャッシュ統計
  cacheStats?: {
    total_items: number
    expired_items: number
    active_items: number
    keys: string[]
  }
  
  // エラー
  error?: string
}

export interface CvmSelectorProps {
  cvmsIp: string[]
  prismLeader: string
  cvmChecked: string
  onCvmChange: (cvm: string) => void
  loading: boolean
}

export interface LogCollectorProps {
  onCollectLogs: () => Promise<void>
  collecting: boolean
  cvmChecked: string
}

export interface ZipManagerProps {
  zipList: string[]
  selectedZip: string | null
  onZipSelect: (zipName: string) => void
  loadingZip: boolean
  onDownload: (zipName: string) => void
}

export interface LogViewerProps {
  logsInZip: string[]
  displayLog?: string
  onLogSelect: (logFile: string) => void
  loadingDisplay: boolean
  selectedZip: string | null
  selectedLogFile?: string
  // 追記前スナップショット（親→子）
  appendTick?: number
  // ビュワー最終行のヒント表示
  footerHint?: string
  // ヒント押下時のアクション（続きを読むなど）
  footerAction?: () => void
}
