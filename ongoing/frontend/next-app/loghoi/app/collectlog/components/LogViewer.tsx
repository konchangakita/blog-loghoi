'use client'
import { LogViewerProps } from '../types'
import React from 'react'

const LogViewer = ({ 
  logsInZip, 
  displayLog, 
  onLogSelect, 
  loadingDisplay, 
  selectedZip,
  selectedLogFile 
}: LogViewerProps) => {
  console.log('LogViewer render:', { 
    logsInZip: logsInZip?.length, 
    displayLog: displayLog?.length, 
    loadingDisplay, 
    selectedZip 
  })
  if (!selectedZip) {
    return (
      <div className="w-49 text-center">
        <div className="text-primary">File / Log List</div>
        <div className="h-96 overflow-auto flex items-center justify-center">
          <p className="text-gray-500">ZIPファイルを選択してください</p>
        </div>
      </div>
    )
  }

  // ファイルサイズが大きい場合のチェック
  const isFileTooLarge = displayLog?.startsWith('FILE_SIZE_TOO_LARGE:')
  const fileSizeMB = isFileTooLarge ? 
    (() => {
      try {
        // displayLogがundefinedの場合に備えて安全にアクセス
        return parseFloat(displayLog?.split(':')[1] ?? '') || 0
      } catch {
        return 0
      }
    })() : 0

  // 空のファイルかチェック
  const isEmptyFile = displayLog?.startsWith('EMPTY_FILE:')

  return (
    <div className="flex-1 min-w-0 max-w-full h-[650px]">
      <div className="mb-2">
        <div className="text-sm font-semibold text-primary">
          {loadingDisplay ? (
            <span className="text-gray-500">Loading...</span>
          ) : displayLog ? (
            <div>
              <span className="text-success">✓ ログ表示中: </span>
              <span className="text-info font-mono">{selectedLogFile}</span>
            </div>
          ) : (
            <span className="text-gray-500">ログファイルを選択してください</span>
          )}
        </div>
      </div>
      {isFileTooLarge ? (
        <div className="w-full h-[600px] flex items-center justify-center overflow-auto">
          <div className="alert alert-warning max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="font-bold">ファイルサイズが大きすぎます</h3>
              <div className="text-xs mt-2">
                <p>ファイルサイズ: <strong>{fileSizeMB.toFixed(2)} MB</strong></p>
                <p className="mt-2">このファイルは表示に時間がかかるため、</p>
                <p>ZIPファイルをダウンロードして確認してください。</p>
              </div>
            </div>
          </div>
        </div>
      ) : isEmptyFile ? (
        <div className="w-full h-[600px] flex items-center justify-center overflow-auto">
          <div className="alert alert-info max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold">ファイル内ログ無し</h3>
              <div className="text-xs mt-2">
                <p>選択されたファイルにはログが含まれていません。</p>
                <p className="mt-1">ファイル: <strong>{selectedLogFile}</strong></p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mockup-code w-full h-[600px] overflow-auto text-left">
          <div className="w-full">
            <pre className="px-2 whitespace-pre leading-tight" style={{ lineHeight: '1.2' }}>
              <code className="text-xs" style={{ lineHeight: '1.2' }}>
                {loadingDisplay ? (
                  <span className="text-gray-500">Loading...</span>
                ) : displayLog ? (
                  (() => {
                    console.log('Displaying log content:', displayLog.substring(0, 100) + '...')
                    return displayLog
                  })()
                ) : (
                  <span className="text-gray-500">ログファイルを選択してください</span>
                )}
              </code>
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default LogViewer
