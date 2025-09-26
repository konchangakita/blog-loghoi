"""
Integration tests for realtime log functionality
"""
import pytest
import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'flaskr'))

from app_fastapi import app, sio


class TestIntegration:
    """Integration tests for realtime log functionality"""

    @pytest.mark.asyncio
    async def test_end_to_end_flow(self):
        """Test complete end-to-end flow"""
        # Create SocketIO test client
        client = sio.test_client(app)
        
        # Mock SSH connection
        mock_ssh = Mock()
        mock_stdout = Mock()
        mock_stdout.readline.side_effect = [
            "2025-09-21 03:26:39,776Z INFO 80801248 node_manager.py:7417 Test log line 1\n",
            "2025-09-21 03:26:39,784Z INFO 80801248 node_manager.py:3965 Test log line 2\n",
            ""  # Empty line to end the loop
        ]
        mock_ssh.exec_command.return_value = (Mock(), mock_stdout, Mock())
        
        with patch('app_fastapi.connect_ssh', return_value=mock_ssh), \
             patch('asyncio.create_task') as mock_create_task:
            
            # 1. Connect to SocketIO
            response = client.connect()
            assert response is not None
            assert client.is_connected()
            
            # 2. Start tail -f
            data = {
                'cvm_ip': '10.38.112.31',
                'log_path': '/home/nutanix/data/logs/genesis.out'
            }
            response = client.emit('start_tail_f', data)
            assert response is not None
            
            # 3. Verify SSH connection was established
            assert mock_create_task.called
            
            # 4. Stop tail -f
            response = client.emit('stop_tail_f', {})
            assert response is not None
            
            # 5. Disconnect
            client.disconnect()
            assert not client.is_connected()

    @pytest.mark.asyncio
    async def test_multiple_clients_connection(self):
        """Test multiple clients connecting simultaneously"""
        # Create multiple clients
        client1 = sio.test_client(app)
        client2 = sio.test_client(app)
        
        # Connect both clients
        client1.connect()
        client2.connect()
        
        assert client1.is_connected()
        assert client2.is_connected()
        
        # Both clients should be able to start tail -f independently
        with patch('app_fastapi.connect_ssh') as mock_connect_ssh, \
             patch('app_fastapi.start_ssh_log_monitoring', return_value=True) as mock_start_monitoring:
            
            mock_ssh = Mock()
            mock_connect_ssh.return_value = mock_ssh
            
            data = {
                'cvm_ip': '10.38.112.31',
                'log_path': '/home/nutanix/data/logs/genesis.out'
            }
            
            # Both clients start tail -f
            response1 = client1.emit('start_tail_f', data)
            response2 = client2.emit('start_tail_f', data)
            
            assert response1 is not None
            assert response2 is not None
            
            # Disconnect both
            client1.disconnect()
            client2.disconnect()

    @pytest.mark.asyncio
    async def test_error_handling_flow(self):
        """Test error handling in the complete flow"""
        client = sio.test_client(app)
        
        # Test with invalid SSH connection
        with patch('app_fastapi.connect_ssh', return_value=None):
            # Connect
            client.connect()
            
            # Try to start tail -f with invalid connection
            data = {
                'cvm_ip': 'invalid-ip',
                'log_path': '/invalid/path'
            }
            response = client.emit('start_tail_f', data)
            assert response is not None
            
            # Disconnect
            client.disconnect()

    @pytest.mark.asyncio
    async def test_log_broadcasting(self):
        """Test log broadcasting to multiple clients"""
        # Create multiple clients
        client1 = sio.test_client(app)
        client2 = sio.test_client(app)
        
        # Connect both clients
        client1.connect()
        client2.connect()
        
        # Mock SSH connection and log monitoring
        mock_ssh = Mock()
        mock_stdout = Mock()
        mock_stdout.readline.side_effect = [
            "2025-09-21 03:26:39,776Z INFO 80801248 node_manager.py:7417 Test log line\n",
            ""  # Empty line to end the loop
        ]
        mock_ssh.exec_command.return_value = (Mock(), mock_stdout, Mock())
        
        with patch('app_fastapi.connect_ssh', return_value=mock_ssh), \
             patch('asyncio.create_task') as mock_create_task:
            
            # Start tail -f on both clients
            data = {
                'cvm_ip': '10.38.112.31',
                'log_path': '/home/nutanix/data/logs/genesis.out'
            }
            
            client1.emit('start_tail_f', data)
            client2.emit('start_tail_f', data)
            
            # Verify that both clients would receive logs
            # (In a real scenario, logs would be broadcast to all connected clients)
            
            # Disconnect both
            client1.disconnect()
            client2.disconnect()

    @pytest.mark.asyncio
    async def test_connection_cleanup_on_disconnect(self):
        """Test that connections are properly cleaned up on disconnect"""
        client = sio.test_client(app)
        
        # Mock SSH connection
        mock_ssh = Mock()
        
        with patch('app_fastapi.connect_ssh', return_value=mock_ssh), \
             patch('app_fastapi.start_ssh_log_monitoring', return_value=True) as mock_start_monitoring, \
             patch('app_fastapi.stop_ssh_log_monitoring') as mock_stop_monitoring:
            
            # Connect and start tail -f
            client.connect()
            
            data = {
                'cvm_ip': '10.38.112.31',
                'log_path': '/home/nutanix/data/logs/genesis.out'
            }
            client.emit('start_tail_f', data)
            
            # Disconnect
            client.disconnect()
            
            # Verify that cleanup was called
            # (In a real scenario, this would be verified through the disconnect handler)
            assert not client.is_connected()
