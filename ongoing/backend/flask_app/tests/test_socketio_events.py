"""
Tests for SocketIO event handlers in realtime log functionality
"""
import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'flaskr'))

from app_fastapi import sio


class TestSocketIOEvents:
    """Test cases for SocketIO event handlers"""

    @pytest.mark.asyncio
    async def test_connect_event(self, socketio_client):
        """Test connect event handler"""
        # Connect to SocketIO
        response = socketio_client.connect()
        assert response is not None
        
        # Check if connection is established
        assert socketio_client.is_connected()
        
        # Disconnect
        socketio_client.disconnect()

    @pytest.mark.asyncio
    async def test_disconnect_event(self, socketio_client):
        """Test disconnect event handler"""
        # Connect first
        socketio_client.connect()
        assert socketio_client.is_connected()
        
        # Disconnect
        socketio_client.disconnect()
        assert not socketio_client.is_connected()

    @pytest.mark.asyncio
    async def test_start_tail_f_event_success(self, socketio_client):
        """Test start_tail_f event with successful SSH connection"""
        with patch('app_fastapi.connect_ssh') as mock_connect_ssh, \
             patch('app_fastapi.start_ssh_log_monitoring', return_value=True) as mock_start_monitoring:
            
            # Mock SSH connection
            mock_ssh = Mock()
            mock_connect_ssh.return_value = mock_ssh
            
            # Connect to SocketIO
            socketio_client.connect()
            
            # Send start_tail_f event with required log_name
            data = {
                'cvm_ip': '10.38.112.31',
                'log_path': '/home/nutanix/data/logs/genesis.out',
                'log_name': 'genesis'
            }
            
            # Mock the async function call
            with patch('asyncio.create_task'):
                response = socketio_client.emit('start_tail_f', data)
            
            # Verify the event was sent
            assert response is not None
            
            # Disconnect
            socketio_client.disconnect()

    @pytest.mark.asyncio
    async def test_start_tail_f_event_missing_log_name(self, socketio_client):
        """Test start_tail_f event with missing log_name"""
        # Connect to SocketIO
        socketio_client.connect()
        
        # Send start_tail_f event without log_name
        data = {
            'cvm_ip': '10.38.112.31',
            'log_path': '/home/nutanix/data/logs/genesis.out'
            # log_name is missing
        }
        
        response = socketio_client.emit('start_tail_f', data)
        assert response is not None
        
        # Disconnect
        socketio_client.disconnect()

    @pytest.mark.asyncio
    async def test_start_tail_f_event_invalid_params(self, socketio_client):
        """Test start_tail_f event with invalid parameters"""
        # Connect to SocketIO
        socketio_client.connect()
        
        # Send start_tail_f event with invalid data
        data = {
            'cvm_ip': '',  # Invalid IP
            'log_path': '',  # Invalid path
            'log_name': 'test'
        }
        
        response = socketio_client.emit('start_tail_f', data)
        assert response is not None
        
        # Disconnect
        socketio_client.disconnect()

    @pytest.mark.asyncio
    async def test_stop_tail_f_event(self, socketio_client):
        """Test stop_tail_f event"""
        with patch('app_fastapi.stop_ssh_log_monitoring') as mock_stop_monitoring:
            # Connect to SocketIO
            socketio_client.connect()
            
            # Send stop_tail_f event
            data = {}
            response = socketio_client.emit('stop_tail_f', data)
            
            # Verify the event was sent
            assert response is not None
            
            # Disconnect
            socketio_client.disconnect()

    @pytest.mark.asyncio
    async def test_multiple_connections(self, socketio_client):
        """Test handling of multiple SocketIO connections"""
        # Create multiple clients
        client1 = sio.test_client(app)
        client2 = sio.test_client(app)
        
        # Connect both clients
        client1.connect()
        client2.connect()
        
        assert client1.is_connected()
        assert client2.is_connected()
        
        # Disconnect both
        client1.disconnect()
        client2.disconnect()
        
        assert not client1.is_connected()
        assert not client2.is_connected()
