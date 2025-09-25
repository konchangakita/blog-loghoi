/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import LogViewer from '../app/realtimelog/realtimelog-logview'

// socket.io-clientをモック
jest.mock('socket.io-client', () => {
  return jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
    id: 'mock-socket-id'
  }))
})

// 環境変数をモック
const originalEnv = process.env

describe('SocketIO Backend URL Tests', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    
    // window.locationをモック
    Object.defineProperty(window, 'location', {
      value: {
        protocol: 'http:',
        hostname: 'localhost',
      },
      writable: true,
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('SocketIO接続でのURL使用', () => {
    it('環境変数から正しいURLでSocketIO接続を開始', async () => {
      process.env.NEXT_PUBLIC_BACKEND_URL = 'https://socket.example.com:8080'
      
      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        connected: false,
        id: 'mock-socket-id'
      }
      
      const io = require('socket.io-client')
      io.mockReturnValue(mockSocket)

      render(
        <LogViewer 
          cvmChecked="192.168.1.10" 
          tailName="genesis" 
          tailPath="/home/nutanix/data/logs/genesis.out" 
          filter="" 
        />
      )

      // ログ取得開始ボタンをクリック
      const startButton = screen.getByText('ログ取得開始')
      fireEvent.click(startButton)

      // SocketIOが正しいURLで初期化されることを確認
      expect(io).toHaveBeenCalledWith('https://socket.example.com:8080/', {
        transports: ['polling', 'websocket'],
        upgrade: true,
        rememberUpgrade: false,
        timeout: 20000,
        forceNew: true
      })
    })

    it('Kubernetes環境変数を使用してSocketIO接続', async () => {
      process.env.BACKEND_SERVICE_HOST = 'socketio-backend'
      process.env.BACKEND_SERVICE_PORT = '7776'
      process.env.BACKEND_SERVICE_PROTOCOL = 'http'
      
      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        connected: false,
        id: 'mock-socket-id'
      }
      
      const io = require('socket.io-client')
      io.mockReturnValue(mockSocket)

      render(
        <LogViewer 
          cvmChecked="192.168.1.10" 
          tailName="genesis" 
          tailPath="/home/nutanix/data/logs/genesis.out" 
          filter="" 
        />
      )

      const startButton = screen.getByText('ログ取得開始')
      fireEvent.click(startButton)

      expect(io).toHaveBeenCalledWith('http://socketio-backend:7776/', {
        transports: ['polling', 'websocket'],
        upgrade: true,
        rememberUpgrade: false,
        timeout: 20000,
        forceNew: true
      })
    })

    it('クライアントサイドでwindow.locationを使用してSocketIO接続', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'https:',
          hostname: '192.168.1.100',
        },
        writable: true,
      })

      process.env.NEXT_PUBLIC_BACKEND_PORT = '8080'
      
      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        connected: false,
        id: 'mock-socket-id'
      }
      
      const io = require('socket.io-client')
      io.mockReturnValue(mockSocket)

      render(
        <LogViewer 
          cvmChecked="192.168.1.10" 
          tailName="genesis" 
          tailPath="/home/nutanix/data/logs/genesis.out" 
          filter="" 
        />
      )

      const startButton = screen.getByText('ログ取得開始')
      fireEvent.click(startButton)

      expect(io).toHaveBeenCalledWith('https://192.168.1.100:8080/', {
        transports: ['polling', 'websocket'],
        upgrade: true,
        rememberUpgrade: false,
        timeout: 20000,
        forceNew: true
      })
    })
  })

  describe('統合開始ボタンの動作', () => {
    it('統合開始ボタンでSocketIO接続とtail -f開始', async () => {
      process.env.NEXT_PUBLIC_BACKEND_URL = 'https://api.example.com'
      
      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        connected: true,
        id: 'mock-socket-id'
      }
      
      const io = require('socket.io-client')
      io.mockReturnValue(mockSocket)

      render(
        <LogViewer 
          cvmChecked="192.168.1.10" 
          tailName="genesis" 
          tailPath="/home/nutanix/data/logs/genesis.out" 
          filter="" 
        />
      )

      const startButton = screen.getByText('ログ取得開始')
      fireEvent.click(startButton)

      // SocketIO接続が正しいURLで開始されることを確認
      expect(io).toHaveBeenCalledWith('https://api.example.com/', {
        transports: ['polling', 'websocket'],
        upgrade: true,
        rememberUpgrade: false,
        timeout: 20000,
        forceNew: true
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('SocketIO接続エラー時の処理', async () => {
      process.env.NEXT_PUBLIC_BACKEND_URL = 'https://invalid-url.com'
      
      const mockSocket = {
        on: jest.fn((event, callback) => {
          if (event === 'connect_error') {
            // 接続エラーをシミュレート
            setTimeout(() => callback(new Error('Connection failed')), 100)
          }
        }),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        connected: false,
        id: null
      }
      
      const io = require('socket.io-client')
      io.mockReturnValue(mockSocket)

      render(
        <LogViewer 
          cvmChecked="192.168.1.10" 
          tailName="genesis" 
          tailPath="/home/nutanix/data/logs/genesis.out" 
          filter="" 
        />
      )

      const startButton = screen.getByText('ログ取得開始')
      fireEvent.click(startButton)

      // エラーが発生してもコンポーネントがクラッシュしないことを確認
      await waitFor(() => {
        expect(screen.getByText('ログ取得開始')).toBeInTheDocument()
      })
    })
  })
})
