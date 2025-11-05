'use client'
import { LogCollectorProps } from '../types'

const LogCollector = ({ onCollectLogs, collecting, cvmChecked }: LogCollectorProps) => {
  const isDisabled = !cvmChecked || collecting

  return (
    <div className="flex flex-col items-center">
      <button 
        className={`btn w-48 ${isDisabled ? 'btn-disabled' : 'btn-primary'}`}
        onClick={onCollectLogs}
        disabled={isDisabled}
      >
        {collecting ? 'Collecting...' : 'Start Collect Log'}
      </button>
      
      {!cvmChecked && (
        <p className="text-xs text-warning mt-1">CVMを選択してください</p>
      )}
    </div>
  )
}

export default LogCollector
