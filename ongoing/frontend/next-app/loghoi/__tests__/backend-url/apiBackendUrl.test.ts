/**
 * @jest-environment node
 */

import { getPclist } from '../app/_api/pclist/getPclist'

// fetchをモック
global.fetch = jest.fn()

// 環境変数をモック
const originalEnv = process.env

describe('API Backend URL Tests', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    ;(global.fetch as jest.Mock).mockClear()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getPclist API', () => {
    it('環境変数から正しいURLでAPIを呼び出す', async () => {
      process.env.NEXT_PUBLIC_BACKEND_URL = 'https://api.example.com:8080'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pc_list: [{ prism_ip: '192.168.1.1' }],
          cluster_list: {}
        })
      })

      const result = await getPclist()

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com:8080/api/pclist',
        { method: 'GET', cache: 'no-store' }
      )
      expect(result).toEqual({
        pc_list: [{ prism_ip: '192.168.1.1' }],
        cluster_list: {}
      })
    })

    it('Kubernetes環境変数を使用してAPIを呼び出す', async () => {
      process.env.BACKEND_SERVICE_HOST = 'backend-service'
      process.env.BACKEND_SERVICE_PORT = '7776'
      process.env.BACKEND_SERVICE_PROTOCOL = 'http'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pc_list: [{ prism_ip: '192.168.1.1' }],
          cluster_list: {}
        })
      })

      const result = await getPclist()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://backend-service:7776/api/pclist',
        { method: 'GET', cache: 'no-store' }
      )
      expect(result).toEqual({
        pc_list: [{ prism_ip: '192.168.1.1' }],
        cluster_list: {}
      })
    })

    it('個別環境変数を使用してAPIを呼び出す', async () => {
      process.env.NEXT_PUBLIC_BACKEND_HOST = 'api.example.com'
      process.env.NEXT_PUBLIC_BACKEND_PORT = '8080'
      process.env.NEXT_PUBLIC_BACKEND_PROTOCOL = 'https'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pc_list: [{ prism_ip: '192.168.1.1' }],
          cluster_list: {}
        })
      })

      const result = await getPclist()

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com:8080/api/pclist',
        { method: 'GET', cache: 'no-store' }
      )
      expect(result).toEqual({
        pc_list: [{ prism_ip: '192.168.1.1' }],
        cluster_list: {}
      })
    })

    it('デフォルト値を使用してAPIを呼び出す', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pc_list: [{ prism_ip: '192.168.1.1' }],
          cluster_list: {}
        })
      })

      const result = await getPclist()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:7776/api/pclist',
        { method: 'GET', cache: 'no-store' }
      )
      expect(result).toEqual({
        pc_list: [{ prism_ip: '192.168.1.1' }],
        cluster_list: {}
      })
    })

    it('API呼び出しが失敗した場合のエラーハンドリング', async () => {
      process.env.NEXT_PUBLIC_BACKEND_URL = 'https://api.example.com'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expect(getPclist()).rejects.toThrow('Something went wrong!')
    })

    it('pc_listが空の場合のnotFound処理', async () => {
      process.env.NEXT_PUBLIC_BACKEND_URL = 'https://api.example.com'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cluster_list: {}
          // pc_listが存在しない
        })
      })

      // notFoundが呼び出されることを確認するためにモック
      const notFound = require('next/navigation').notFound
      jest.spyOn(require('next/navigation'), 'notFound').mockImplementation(() => {
        throw new Error('notFound called')
      })

      await expect(getPclist()).rejects.toThrow('notFound called')
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
          pc_list: [{ prism_ip: '192.168.1.1' }],
          cluster_list: {}
        })
      })

      await getPclist()

      expect(global.fetch).toHaveBeenCalledWith(
        'https://priority.example.com/api/pclist',
        { method: 'GET', cache: 'no-store' }
      )
    })

    it('NEXT_PUBLIC_*がBACKEND_SERVICE_*より優先される', async () => {
      process.env.NEXT_PUBLIC_BACKEND_HOST = 'public.example.com'
      process.env.NEXT_PUBLIC_BACKEND_PORT = '8080'
      process.env.BACKEND_SERVICE_HOST = 'service.example.com'
      process.env.BACKEND_SERVICE_PORT = '7776'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pc_list: [{ prism_ip: '192.168.1.1' }],
          cluster_list: {}
        })
      })

      await getPclist()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://public.example.com:8080/api/pclist',
        { method: 'GET', cache: 'no-store' }
      )
    })
  })

  describe('ポート番号の処理', () => {
    it('デフォルトポート（80）の場合はポート番号を省略', async () => {
      process.env.NEXT_PUBLIC_BACKEND_HOST = 'api.example.com'
      process.env.NEXT_PUBLIC_BACKEND_PORT = '80'
      process.env.NEXT_PUBLIC_BACKEND_PROTOCOL = 'http'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pc_list: [{ prism_ip: '192.168.1.1' }],
          cluster_list: {}
        })
      })

      await getPclist()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://api.example.com/api/pclist',
        { method: 'GET', cache: 'no-store' }
      )
    })

    it('デフォルトポート（443）の場合はポート番号を省略', async () => {
      process.env.NEXT_PUBLIC_BACKEND_HOST = 'api.example.com'
      process.env.NEXT_PUBLIC_BACKEND_PORT = '443'
      process.env.NEXT_PUBLIC_BACKEND_PROTOCOL = 'https'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pc_list: [{ prism_ip: '192.168.1.1' }],
          cluster_list: {}
        })
      })

      await getPclist()

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/pclist',
        { method: 'GET', cache: 'no-store' }
      )
    })
  })
})
