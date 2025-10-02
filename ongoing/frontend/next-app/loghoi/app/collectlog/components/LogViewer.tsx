'use client'
import { LogViewerProps } from '../types'
import React from 'react'
import LogViewer from '../../../components/shared/LogViewer'

const CollectLogViewer = ({ 
  logsInZip, 
  displayLog, 
  onLogSelect, 
  loadingDisplay, 
  selectedZip,
  selectedLogFile 
}: LogViewerProps) => {

  return (
    <LogViewer
      variant="collect"
      logsInZip={logsInZip}
      displayLog={displayLog}
      onLogSelect={onLogSelect}
      loadingDisplay={loadingDisplay}
      selectedZip={selectedZip}
      selectedLogFile={selectedLogFile}
    />
  )
}

export default CollectLogViewer
