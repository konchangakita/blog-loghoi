/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import PcList2 from '../components/pcList'

// fetchをモック
global.fetch = jest.fn()

// 環境変数をモック
const originalEnv = process.env

describe('Backend URL Integration Tests', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    
    // fetchをモック
    ;(global.fetch as jest.Mock).mockClear()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('PcList2コンポーネントでの使用', () => {
    it('環境変数から正しいURLでAPIを呼び出す', async () => {
      // 環境変数を設定
      process.env.NEXT_PUBLIC_BACKEND_URL = 'https://api.example.com:8080'
      
      // fetchのモックレスポンス
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pc_list: [],
          cluster_list: {}
        })
      })

      render(<PcList2 />)

      // APIが正しいURLで呼び出されることを確認
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.example.com:8080/api/pclist',
          { method: 'GET' }
        )
      })
    })

    it('Kubernetes環境変数を使用してAPIを呼び出す', async () => {
      // Kubernetes環境変数を設定
      process.env.BACKEND_SERVICE_HOST = 'backend-service'
      process.env.BACKEND_SERVICE_PORT = '7776'
      process.env.BACKEND_SERVICE_PROTOCOL = 'http'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pc_list: [],
          cluster_list: {}
        })
      })

      render(<PcList2 />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://backend-service:7776/api/pclist',
          { method: 'GET' }
        )
      })
    })

    it('クライアントサイドでwindow.locationを使用してAPIを呼び出す', async () => {
      // window.locationをモック
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'https:',
          hostname: '192.168.1.100',
        },
        writable: true,
      })

      process.env.NEXT_PUBLIC_BACKEND_PORT = '8080'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pc_list: [],
          cluster_list: {}
        })
      })

      render(<PcList2 />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'https://192.168.1.100:8080/api/pclist',
          { method: 'GET' }
        )
      })
    })
  })

  describe('環境変数の優先順位', () => {
    it('NEXT_PUBLIC_BACKEND_URLが最優先される', async () => {
      process.env.NEXT_PUBLIC_BACKEND_URL = 'https://priority.example.com'
      process.env.NEXT_PUBLIC_BACKEND_HOST = 'should-be-ignored.com'
      process.env.BACKEND_SERVICE_HOST = 'also-ignored.com'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pc_list: [],
          cluster_list: {}
        })
      })

      render(<PcList2 />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'https://priority.example.com/api/pclist',
          { method: 'GET' }
        )
      })
    })

    it('NEXT_PUBLIC_*がBACKEND_SERVICE_*より優先される', async () => {
      process.env.NEXT_PUBLIC_BACKEND_HOST = 'public.example.com'
      process.env.NEXT_PUBLIC_BACKEND_PORT = '8080'
      process.env.BACKEND_SERVICE_HOST = 'service.example.com'
      process.env.BACKEND_SERVICE_PORT = '7776'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pc_list: [],
          cluster_list: {}
        })
      })

      render(<PcList2 />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://public.example.com:8080/api/pclist',
          { method: 'GET' }
        )
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('API呼び出しが失敗した場合の処理', async () => {
      process.env.NEXT_PUBLIC_BACKEND_URL = 'https://api.example.com'
      
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      )

      render(<PcList2 />)

      // エラーが発生してもコンポーネントがクラッシュしないことを確認
      await waitFor(() => {
        expect(screen.getByText('PC LIST')).toBeInTheDocument()
      })
    })
  })
})
