'use client'

import { useState, useEffect } from 'react'
import { parseCookies, setCookie, destroyCookie } from 'nookies'

interface UuidHistoryItem {
  uuid: string
  timestamp: string
}

export default function UuidHistory() {
  const [history, setHistory] = useState<UuidHistoryItem[]>([])

  useEffect(() => {
    const cookies = parseCookies()
    const historyCookie = cookies.uuidHistory
    
    if (historyCookie) {
      try {
        const parsedHistory = JSON.parse(historyCookie)
        setHistory(parsedHistory)
      } catch (error) {
        console.error('Failed to parse UUID history:', error)
      }
    }
  }, [])

  const addToHistory = (uuid: string) => {
    const newItem: UuidHistoryItem = {
      uuid,
      timestamp: new Date().toLocaleString('ja-JP'),
    }

    const updatedHistory = [newItem, ...history.slice(0, 9)] // Keep last 10 items
    setHistory(updatedHistory)
    
    // Save to cookie
    setCookie(null, 'uuidHistory', JSON.stringify(updatedHistory), {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })
  }

  const clearHistory = () => {
    setHistory([])
    destroyCookie(null, 'uuidHistory', { path: '/' })
  }

  if (history.length === 0) {
    return null
  }

  return (
    <div className="mt-4 p-4 bg-base-200 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">UUID History</h3>
        <button 
          onClick={clearHistory}
          className="btn btn-sm btn-outline btn-error"
        >
          Clear
        </button>
      </div>
      <div className="space-y-2">
        {history.map((item, index) => (
          <div key={index} className="flex justify-between items-center p-2 bg-base-100 rounded">
            <span className="font-mono text-sm">{item.uuid}</span>
            <span className="text-xs text-gray-500">{item.timestamp}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
