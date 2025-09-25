/**
 * @jest-environment jsdom
 */

import { getBackendUrl } from '../lib/getBackendUrl'

// 環境変数をモック
const originalEnv = process.env

describe('getBackendUrl', () => {
  beforeEach(() => {
    // 各テスト前に環境変数をリセット
    jest.resetModules()
    process.env = { ...originalEnv }
    
    // windowオブジェクトをモック
    Object.defineProperty(window, 'location', {
      value: {
        protocol: 'http:',
        hostname: 'localhost',
      },
      writable: true,
    })
  })

  afterEach(() => {
    // テスト後に環境変数を復元
    process.env = originalEnv
  })

  describe('完全なURLが環境変数で指定されている場合', () => {
    it('NEXT_PUBLIC_BACKEND_URLが設定されている場合はそれを返す', () => {
      process.env.NEXT_PUBLIC_BACKEND_URL = 'https://api.example.com:8080'
      
      const result = getBackendUrl()
      
      expect(result).toBe('https://api.example.com:8080')
    })
  })

  describe('個別の環境変数から構築', () => {
    it('NEXT_PUBLIC_BACKEND_HOSTとNEXT_PUBLIC_BACKEND_PORTが設定されている場合', () => {
      process.env.NEXT_PUBLIC_BACKEND_HOST = 'api.example.com'
      process.env.NEXT_PUBLIC_BACKEND_PORT = '8080'
      process.env.NEXT_PUBLIC_BACKEND_PROTOCOL = 'https'
      
      const result = getBackendUrl()
      
      expect(result).toBe('https://api.example.com:8080')
    })

    it('Kubernetes環境変数が設定されている場合', () => {
      process.env.BACKEND_SERVICE_HOST = 'backend-service'
      process.env.BACKEND_SERVICE_PORT = '7776'
      process.env.BACKEND_SERVICE_PROTOCOL = 'http'
      
      const result = getBackendUrl()
      
      expect(result).toBe('http://backend-service:7776')
    })

    it('デフォルトポート（80）の場合はポート番号を省略', () => {
      process.env.NEXT_PUBLIC_BACKEND_HOST = 'api.example.com'
      process.env.NEXT_PUBLIC_BACKEND_PORT = '80'
      process.env.NEXT_PUBLIC_BACKEND_PROTOCOL = 'http'
      
      const result = getBackendUrl()
      
      expect(result).toBe('http://api.example.com')
    })

    it('デフォルトポート（443）の場合はポート番号を省略', () => {
      process.env.NEXT_PUBLIC_BACKEND_HOST = 'api.example.com'
      process.env.NEXT_PUBLIC_BACKEND_PORT = '443'
      process.env.NEXT_PUBLIC_BACKEND_PROTOCOL = 'https'
      
      const result = getBackendUrl()
      
      expect(result).toBe('https://api.example.com')
    })
  })

  describe('クライアントサイドでの動作', () => {
    it('window.locationを使用してURLを構築', () => {
      // window.locationをモック
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'https:',
          hostname: '192.168.1.100',
        },
        writable: true,
      })
      
      process.env.NEXT_PUBLIC_BACKEND_PORT = '7776'
      
      const result = getBackendUrl()
      
      expect(result).toBe('https://192.168.1.100:7776')
    })

    it('ポートがデフォルト値（7776）の場合', () => {
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'http:',
          hostname: 'localhost',
        },
        writable: true,
      })
      
      const result = getBackendUrl()
      
      expect(result).toBe('http://localhost:7776')
    })
  })

  describe('サーバーサイドでの動作', () => {
    it('windowが未定義の場合は環境変数を使用', () => {
      // windowを未定義にモック
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
      })
      
      process.env.NEXT_PUBLIC_BACKEND_HOST = 'server.example.com'
      process.env.NEXT_PUBLIC_BACKEND_PORT = '8080'
      process.env.NEXT_PUBLIC_BACKEND_PROTOCOL = 'https'
      
      const result = getBackendUrl()
      
      expect(result).toBe('https://server.example.com:8080')
    })

    it('環境変数が未設定の場合はデフォルト値を使用', () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
      })
      
      const result = getBackendUrl()
      
      expect(result).toBe('http://localhost:7776')
    })
  })

  describe('優先順位のテスト', () => {
    it('NEXT_PUBLIC_BACKEND_URLが最優先', () => {
      process.env.NEXT_PUBLIC_BACKEND_URL = 'https://priority.example.com'
      process.env.NEXT_PUBLIC_BACKEND_HOST = 'should-be-ignored.com'
      process.env.BACKEND_SERVICE_HOST = 'also-ignored.com'
      
      const result = getBackendUrl()
      
      expect(result).toBe('https://priority.example.com')
    })

    it('NEXT_PUBLIC_*がBACKEND_SERVICE_*より優先', () => {
      process.env.NEXT_PUBLIC_BACKEND_HOST = 'public.example.com'
      process.env.NEXT_PUBLIC_BACKEND_PORT = '8080'
      process.env.BACKEND_SERVICE_HOST = 'service.example.com'
      process.env.BACKEND_SERVICE_PORT = '7776'
      
      const result = getBackendUrl()
      
      expect(result).toBe('http://public.example.com:8080')
    })
  })

  describe('エッジケース', () => {
    it('空文字列の環境変数は無視される', () => {
      process.env.NEXT_PUBLIC_BACKEND_HOST = ''
      process.env.NEXT_PUBLIC_BACKEND_PORT = ''
      
      const result = getBackendUrl()
      
      expect(result).toBe('http://localhost:7776')
    })

    it('undefinedの環境変数は無視される', () => {
      delete process.env.NEXT_PUBLIC_BACKEND_HOST
      delete process.env.NEXT_PUBLIC_BACKEND_PORT
      
      const result = getBackendUrl()
      
      expect(result).toBe('http://localhost:7776')
    })
  })
})
