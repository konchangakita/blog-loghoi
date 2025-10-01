import React from 'react'
import LogViewer from '../../components/shared/LogViewer'

type ChildProps = {
  cvmChecked: string
  tailName: string
  tailPath: string
  filter: string
}

export default function RealtimeLogViewer({ cvmChecked, tailName, tailPath, filter }: ChildProps) {
  return (
    <LogViewer
      variant="realtime"
      cvmChecked={cvmChecked}
      tailName={tailName}
      tailPath={tailPath}
      filter={filter}
    />
  )
}
