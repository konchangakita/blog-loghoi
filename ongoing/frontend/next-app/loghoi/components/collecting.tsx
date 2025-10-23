import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBug } from '@fortawesome/free-solid-svg-icons'
import { useState, useEffect } from 'react'

interface CollectingProps {
  progress?: {
    stage: string
    current: number
    total: number
    message: string
  } | null
}

export default function Collecting({ progress: actualProgress }: CollectingProps) {
  const [fallbackProgress, setFallbackProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  // フォールバック: 進捗情報がない場合は時間ベース（120秒で100%）
  useEffect(() => {
    const startTime = Date.now()
    const duration = 120000 // 120秒

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / duration) * 100, 100)
      
      setFallbackProgress(newProgress)
      
      if (newProgress >= 100) {
        setIsComplete(true)
        clearInterval(interval)
      }
    }, 100) // 100msごとに更新

    return () => clearInterval(interval)
  }, [])
  
  // 実際の進捗を計算
  const progress = actualProgress 
    ? (actualProgress.current / actualProgress.total) * 100
    : fallbackProgress

  const filledBlocks = Math.floor(progress / 10) // 10%ごとにブロック
  const totalBlocks = 10

  return (
    <>
      <div className='fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 '>
        <div className='flex flex-col w-80 h-40 rounded-xl bg-white border-gray-200 border-2 justify-center items-center'>
          <Image className='opacity-25' src='/xplorer.ico' alt='uuid xplorer logo' width={50} height={50} />
          <div className='absolute justify-center items-center flex'>
            <FontAwesomeIcon icon={faBug} spin style={{ fontSize: '21px' }} />
            <span className='ml-1 text-lg'>Log Collecting...</span>
          </div>
          
          {/* プログレスバー */}
          <div className="w-48 mt-8">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-600 font-semibold">
                {actualProgress?.message || 'Progress'}
              </span>
              <span className="text-xs text-gray-600">{Math.round(progress)}%</span>
            </div>
            <div className="flex space-x-0.5">
              {Array.from({ length: totalBlocks }, (_, index) => (
                <div
                  key={index}
                  className={`h-3 flex-1 rounded-sm transition-all duration-300 ${
                    index < filledBlocks
                      ? 'bg-blue-500 shadow-sm'
                      : isComplete
                      ? 'bg-green-500 shadow-sm'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
