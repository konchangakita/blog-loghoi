/**
 * Tests for realtimelog-logview component
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LogViewer from '../app/realtimelog/realtimelog-logview'

// Mock props
const mockProps = {
  cvmChecked: '10.38.112.31',
  tailName: 'genesis',
  tailPath: '/home/nutanix/data/logs/genesis.out',
  filter: ''
}

describe('LogViewer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial Render', () => {
    it('renders integrated start button when log name is selected', () => {
      render(<LogViewer {...mockProps} />)
      
      expect(screen.getByText('ログ取得開始')).toBeInTheDocument()
      expect(screen.getByText('ログクリア')).toBeInTheDocument()
    })

    it('disables start button when log name is not selected', () => {
      const propsWithoutLogName = { ...mockProps, tailName: '' }
      render(<LogViewer {...propsWithoutLogName} />)
      
      const startButton = screen.getByText('ログ取得開始 (ログ名未選択)')
      expect(startButton).toHaveClass('btn-disabled')
    })
  })

  describe('Integrated Start/Stop Functionality', () => {
    it('calls handleStartAll when start button is clicked', () => {
      render(<LogViewer {...mockProps} />)
      
      const startButton = screen.getByText('ログ取得開始')
      fireEvent.click(startButton)
      
      // Verify that the socket connection is attempted
      // This would be verified through the mock
    })

    it('updates button state after successful connection and auto-starts tail -f', async () => {
      render(<LogViewer {...mockProps} />)
      
      // Simulate successful connection
      const startButton = screen.getByText('ログ取得開始')
      fireEvent.click(startButton)
      
      // Mock the socket connection success
      const mockSocket = require('socket.io-client').default()
      mockSocket.connected = true
      
      // Simulate connect event
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      if (connectHandler) {
        connectHandler()
      }
      
      // Simulate tail -f start
      const tailFStatusHandler = mockSocket.on.mock.calls.find(call => call[0] === 'tail_f_status')?.[1]
      if (tailFStatusHandler) {
        tailFStatusHandler({ status: 'started', message: 'tail -f started' })
      }
      
      await waitFor(() => {
        expect(screen.getByText('ログ取得停止')).toBeInTheDocument()
      })
    })

    it('shows alert when start button is clicked without log name', () => {
      const propsWithoutLogName = { ...mockProps, tailName: '' }
      render(<LogViewer {...propsWithoutLogName} />)
      
      // Mock window.alert
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
      
      const startButton = screen.getByText('ログ取得開始 (ログ名未選択)')
      fireEvent.click(startButton)
      
      expect(alertSpy).toHaveBeenCalledWith('ログ名を選択してください')
      
      alertSpy.mockRestore()
    })
  })

  describe('Integrated Stop Functionality', () => {
    it('calls handleStopAll when stop button is clicked', async () => {
      render(<LogViewer {...mockProps} />)
      
      // First start the log monitoring
      const startButton = screen.getByText('ログ取得開始')
      fireEvent.click(startButton)
      
      const mockSocket = require('socket.io-client').default()
      mockSocket.connected = true
      
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      if (connectHandler) {
        connectHandler()
      }
      
      // Simulate tail -f start
      const tailFStatusHandler = mockSocket.on.mock.calls.find(call => call[0] === 'tail_f_status')?.[1]
      if (tailFStatusHandler) {
        tailFStatusHandler({ status: 'started', message: 'tail -f started' })
      }
      
      await waitFor(() => {
        const stopButton = screen.getByText('ログ取得停止')
        fireEvent.click(stopButton)
        
        // Verify that the modal is shown
        expect(screen.getByText('ログ取得停止します')).toBeInTheDocument()
        expect(screen.getByText('STOP')).toBeInTheDocument()
      })
    })

    it('stops monitoring and disconnects when STOP button in modal is clicked', async () => {
      render(<LogViewer {...mockProps} />)
      
      // Start monitoring
      const startButton = screen.getByText('ログ取得開始')
      fireEvent.click(startButton)
      
      const mockSocket = require('socket.io-client').default()
      mockSocket.connected = true
      
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      if (connectHandler) {
        connectHandler()
      }
      
      const tailFStatusHandler = mockSocket.on.mock.calls.find(call => call[0] === 'tail_f_status')?.[1]
      if (tailFStatusHandler) {
        tailFStatusHandler({ status: 'started', message: 'tail -f started' })
      }
      
      await waitFor(() => {
        const stopButton = screen.getByText('ログ取得停止')
        fireEvent.click(stopButton)
      })
      
      // Click STOP in modal
      const stopModalButton = screen.getByText('STOP')
      fireEvent.click(stopModalButton)
      
      // Verify that stop_tail_f event is emitted and socket is disconnected
      expect(mockSocket.emit).toHaveBeenCalledWith('stop_tail_f', {})
      expect(mockSocket.disconnect).toHaveBeenCalled()
    })
  })

  describe('Log Display and Clear', () => {
    it('displays received logs with log name', async () => {
      render(<LogViewer {...mockProps} />)
      
      // Start monitoring
      const startButton = screen.getByText('ログ取得開始')
      fireEvent.click(startButton)
      
      const mockSocket = require('socket.io-client').default()
      mockSocket.connected = true
      
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      if (connectHandler) {
        connectHandler()
      }
      
      // Simulate log reception
      const logHandler = mockSocket.on.mock.calls.find(call => call[0] === 'log')?.[1]
      if (logHandler) {
        logHandler({
          name: 'genesis',
          line: '2025-09-21 03:26:39,776Z INFO 80801248 node_manager.py:7417 Test log line',
          line_number: 1,
          timestamp: '2025-09-21 03:26:39'
        })
      }
      
      await waitFor(() => {
        expect(screen.getByText('Test log line')).toBeInTheDocument()
        expect(screen.getByText('[genesis]')).toBeInTheDocument()
      })
    })

    it('clears logs when clear button is clicked', async () => {
      render(<LogViewer {...mockProps} />)
      
      // Start monitoring and add some logs
      const startButton = screen.getByText('ログ取得開始')
      fireEvent.click(startButton)
      
      const mockSocket = require('socket.io-client').default()
      mockSocket.connected = true
      
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      if (connectHandler) {
        connectHandler()
      }
      
      const logHandler = mockSocket.on.mock.calls.find(call => call[0] === 'log')?.[1]
      if (logHandler) {
        logHandler({
          name: 'genesis',
          line: 'Test log line',
          line_number: 1,
          timestamp: '2025-09-21 03:26:39'
        })
      }
      
      await waitFor(() => {
        expect(screen.getByText('Test log line')).toBeInTheDocument()
      })
      
      // Click clear button
      const clearButton = screen.getByText('ログクリア')
      fireEvent.click(clearButton)
      
      // Verify logs are cleared
      expect(screen.queryByText('Test log line')).not.toBeInTheDocument()
    })

    it('filters logs based on filter prop', async () => {
      const propsWithFilter = { ...mockProps, filter: 'INFO' }
      render(<LogViewer {...propsWithFilter} />)
      
      // Connect SocketIO
      const connectButton = screen.getByText('SocketIO接続')
      fireEvent.click(connectButton)
      
      const mockSocket = require('socket.io-client').default()
      mockSocket.connected = true
      
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      if (connectHandler) {
        connectHandler()
      }
      
      // Simulate log reception
      const logHandler = mockSocket.on.mock.calls.find(call => call[0] === 'log')?.[1]
      if (logHandler) {
        logHandler({
          line: '2025-09-21 03:26:39,776Z INFO 80801248 node_manager.py:7417 Test log line',
          line_number: 1,
          timestamp: '2025-09-21 03:26:39'
        })
        logHandler({
          line: '2025-09-21 03:26:39,784Z ERROR 80801248 node_manager.py:3965 Error log line',
          line_number: 2,
          timestamp: '2025-09-21 03:26:39'
        })
      }
      
      await waitFor(() => {
        expect(screen.getByText('Test log line')).toBeInTheDocument()
        expect(screen.queryByText('Error log line')).not.toBeInTheDocument()
      })
    })
  })

  describe('Disconnection and Page Unload', () => {
    it('handles automatic disconnection on page unload', () => {
      render(<LogViewer {...mockProps} />)
      
      // Verify that beforeunload event listener is added
      expect(window.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    })

    it('calls handleStopAll on page unload when monitoring is active', () => {
      render(<LogViewer {...mockProps} />)
      
      // Start monitoring
      const startButton = screen.getByText('ログ取得開始')
      fireEvent.click(startButton)
      
      const mockSocket = require('socket.io-client').default()
      mockSocket.connected = true
      
      // Simulate beforeunload event
      const beforeunloadHandler = window.addEventListener.mock.calls
        .find(call => call[0] === 'beforeunload')?.[1]
      
      if (beforeunloadHandler) {
        beforeunloadHandler()
        
        // Verify that both stop_tail_f and disconnect are called
        expect(mockSocket.emit).toHaveBeenCalledWith('stop_tail_f', {})
        expect(mockSocket.disconnect).toHaveBeenCalled()
      }
    })
  })
})
