'use client'
import React, { useMemo, useRef, useEffect, useState } from 'react'
import { LogEntry } from './LogViewer'

interface VirtualizedLogListProps {
  logs: LogEntry[]
  height: number
  itemHeight: number
  overscan?: number
}

const VirtualizedLogList: React.FC<VirtualizedLogListProps> = ({
  logs,
  height,
  itemHeight,
  overscan = 5
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  // 仮想化の計算
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(height / itemHeight) + overscan,
      logs.length - 1
    )
    return { startIndex: Math.max(0, startIndex), endIndex }
  }, [scrollTop, itemHeight, height, logs.length, overscan])

  // 表示するログのスライス
  const visibleLogs = useMemo(() => {
    const sliceStart = performance.now()
    const result = logs.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
    const sliceTime = performance.now() - sliceStart
    if (sliceTime > 10) {
      console.log(`🕒 [VirtualizedLogList] スライス処理: ${sliceTime.toFixed(2)}ms (総ログ数: ${logs.length}, 表示範囲: ${visibleRange.startIndex}-${visibleRange.endIndex})`)
    }
    return result
  }, [logs, visibleRange])

  // スクロールハンドラー
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }

  // 総高さ
  const totalHeight = logs.length * itemHeight

  // オフセット
  const offsetY = visibleRange.startIndex * itemHeight

  return (
    <div
      ref={containerRef}
      style={{
        height: `${height}px`,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleLogs.map((log, index) => (
            <div
              key={visibleRange.startIndex + index}
              style={{
                height: `${itemHeight}px`,
                padding: '4px 8px',
                borderBottom: '1px solid #e5e7eb',
                fontSize: '12px',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {log.line}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default VirtualizedLogList
