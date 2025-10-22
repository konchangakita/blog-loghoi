'use client'

import { useEffect, useRef } from 'react'

interface LogFileListProps {
  logsInZip: string[]
  selectedLogFile?: string
  onLogSelect: (logFile: string) => void
  selectedZip: string | null
}

const LogFileList = ({ 
  logsInZip, 
  selectedLogFile, 
  onLogSelect, 
  selectedZip 
}: LogFileListProps) => {
  const selectedLogRef = useRef<HTMLDivElement>(null)
  
  // 選択されたログファイルにスクロール
  useEffect(() => {
    if (selectedLogFile && selectedLogRef.current) {
      selectedLogRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }, [selectedLogFile])

  if (!selectedZip) {
    return (
      <div className="w-52 text-center">
        <div className="text-primary font-semibold mb-2">File / Log List</div>
        <div className="h-96 overflow-auto flex items-center justify-center border border-base-300 rounded-lg">
          <p className="text-gray-500">ZIPファイルを選択してください</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-52 text-center">
      <div className="text-primary font-semibold mb-2">File / Log List</div>
      <div className="h-96 overflow-auto border border-base-300 rounded-lg">
        <ul className="menu break-all bg-base-100 w-48 text-left text-xs py-0.5">
          {logsInZip.map((log) => (
            <li key={log} className="mb-0">
              <div 
                ref={selectedLogFile === log ? selectedLogRef : null}
                className={`py-1 px-2 cursor-pointer rounded-md transition-all duration-200 ${
                  selectedLogFile === log 
                    ? 'bg-primary text-primary-content font-semibold shadow-md transform scale-105' 
                    : 'hover:bg-base-200 hover:shadow-sm'
                }`}
                onClick={() => onLogSelect(log)}
              >
                <span className={`break-words leading-tight ${selectedLogFile === log ? 'text-primary-content' : 'text-base-content'}`}>
                  {log}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default LogFileList
