/**
 * Test setup configuration
 */
import '@testing-library/jest-dom'

// Mock Socket.IO client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    connected: false,
    id: 'test-socket-id',
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
  }
  
  const mockIo = jest.fn(() => mockSocket)
  return { default: mockIo, __esModule: true }
})

// Mock Next.js router
jest.mock('next/navigation', () => ({
  usePathname: () => '/realtimelog',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock file-saver
jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}))

// Mock window.addEventListener for beforeunload
Object.defineProperty(window, 'addEventListener', {
  value: jest.fn(),
  writable: true,
})

Object.defineProperty(window, 'removeEventListener', {
  value: jest.fn(),
  writable: true,
})
