'use client'
import { useEffect } from 'react'

// コンポーネント内で型定義
declare global {
  interface Window {
    plugSDK: {
      init: (config: { app_id: string }) => void
    }
  }
}

export default function DevRevWidget() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://plug-platform.devrev.ai/static/plug.js'
    script.async = true
    document.head.appendChild(script)

    script.onload = () => {
      window.plugSDK.init({
        app_id: 'DvRvStPZG9uOmNvcmU6ZHZydi11cy0xOmRldm8vMVlIQUxyTFpJSTpwbHVnX3NldHRpbmcvMV9ffHxfXzIwMjUtMTAtMTQgMDc6MjQ6MzYuMDkzNzcxNjYxICswMDAwIFVUQw==xlxendsDvRv',
      })
    }
  }, [])

  return null
}

