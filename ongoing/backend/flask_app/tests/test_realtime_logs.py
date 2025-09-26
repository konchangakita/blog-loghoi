"""
Tests for realtime log functionality
"""
import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'flaskr'))

from app_fastapi import monitor_realtime_logs


class TestRealtimeLogs:
    """Test cases for realtime log functionality"""

    @pytest.mark.asyncio
    async def test_monitor_realtime_logs_success(self, mock_stdout):
        """Test successful realtime log monitoring"""
        # Mock SSH connection
        mock_ssh = Mock()
        mock_ssh.exec_command.return_value = (Mock(), mock_stdout, Mock())
        
        # Mock SocketIO emit
        with patch('app_fastapi.sio.emit', new_callable=AsyncMock) as mock_emit:
            # Test parameters
            log_path = '/home/nutanix/data/logs/genesis.out'
            
            # Start monitoring (this will run until stdout.readline returns empty)
            await monitor_realtime_logs(mock_ssh, log_path)
            
            # Verify logs were emitted
            assert mock_emit.called
            # Should have emitted 2 log lines
            assert mock_emit.call_count == 2

    @pytest.mark.asyncio
    async def test_monitor_realtime_logs_empty_logs(self):
        """Test realtime log monitoring with no logs"""
        # Mock SSH connection with empty stdout
        mock_ssh = Mock()
        mock_stdout = Mock()
        mock_stdout.readline.return_value = ""  # Empty line immediately
        mock_ssh.exec_command.return_value = (Mock(), mock_stdout, Mock())
        
        # Mock SocketIO emit
        with patch('app_fastapi.sio.emit', new_callable=AsyncMock) as mock_emit:
            # Test parameters
            log_path = '/home/nutanix/data/logs/genesis.out'
            
            # Start monitoring
            await monitor_realtime_logs(mock_ssh, log_path)
            
            # Verify no logs were emitted
            assert not mock_emit.called

    @pytest.mark.asyncio
    async def test_monitor_realtime_logs_connection_error(self):
        """Test realtime log monitoring with connection error"""
        # Mock SSH connection that raises exception
        mock_ssh = Mock()
        mock_ssh.exec_command.side_effect = Exception("SSH connection error")
        
        # Mock SocketIO emit
        with patch('app_fastapi.sio.emit', new_callable=AsyncMock) as mock_emit:
            # Test parameters
            log_path = '/home/nutanix/data/logs/genesis.out'
            
            # Start monitoring (should handle exception gracefully)
            await monitor_realtime_logs(mock_ssh, log_path)
            
            # Verify no logs were emitted due to error
            assert not mock_emit.called

    @pytest.mark.asyncio
    async def test_monitor_realtime_logs_socketio_error(self, mock_stdout):
        """Test realtime log monitoring with SocketIO emit error"""
        # Mock SSH connection
        mock_ssh = Mock()
        mock_ssh.exec_command.return_value = (Mock(), mock_stdout, Mock())
        
        # Mock SocketIO emit that raises exception
        with patch('app_fastapi.sio.emit', new_callable=AsyncMock) as mock_emit:
            mock_emit.side_effect = Exception("SocketIO emit error")
            
            # Test parameters
            log_path = '/home/nutanix/data/logs/genesis.out'
            
            # Start monitoring (should handle SocketIO error gracefully)
            await monitor_realtime_logs(mock_ssh, log_path)
            
            # Verify emit was attempted
            assert mock_emit.called

    @pytest.mark.asyncio
    async def test_log_format(self, mock_stdout):
        """Test log format in SocketIO emission"""
        # Mock SSH connection
        mock_ssh = Mock()
        mock_ssh.exec_command.return_value = (Mock(), mock_stdout, Mock())
        
        # Mock SocketIO emit
        with patch('app_fastapi.sio.emit', new_callable=AsyncMock) as mock_emit:
            # Test parameters
            log_path = '/home/nutanix/data/logs/genesis.out'
            
            # Start monitoring
            await monitor_realtime_logs(mock_ssh, log_path)
            
            # Verify log format
            assert mock_emit.called
            calls = mock_emit.call_args_list
            
            # Check first log call
            first_call = calls[0][0]
            assert first_call[0] == 'log'  # Event name
            log_data = first_call[1]
            assert 'line' in log_data
            assert 'line_number' in log_data
            assert 'timestamp' in log_data
            assert log_data['line'] == "2025-09-21 03:26:39,776Z INFO 80801248 node_manager.py:7417 Test log line 1"
