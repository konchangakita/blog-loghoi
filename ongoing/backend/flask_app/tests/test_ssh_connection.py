"""
Tests for SSH connection management in realtime log functionality
"""
import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'flaskr'))

from app_fastapi import start_ssh_log_monitoring, stop_ssh_log_monitoring, get_ssh_connection, set_ssh_connection


class TestSSHConnection:
    """Test cases for SSH connection management"""

    @pytest.mark.asyncio
    async def test_start_ssh_log_monitoring_success(self, mock_ssh_connection):
        """Test successful SSH log monitoring start"""
        with patch('app_fastapi.connect_ssh', return_value=mock_ssh_connection), \
             patch('asyncio.create_task') as mock_create_task:
            
            # Test parameters
            cvm_ip = '10.38.112.31'
            log_path = '/home/nutanix/data/logs/genesis.out'
            
            # Start monitoring
            result = await start_ssh_log_monitoring(cvm_ip, log_path)
            
            # Verify success
            assert result is True
            assert get_ssh_connection() is not None
            assert mock_create_task.called

    @pytest.mark.asyncio
    async def test_start_ssh_log_monitoring_connection_failure(self):
        """Test SSH log monitoring start with connection failure"""
        with patch('app_fastapi.connect_ssh', return_value=None):
            # Test parameters
            cvm_ip = '10.38.112.31'
            log_path = '/home/nutanix/data/logs/genesis.out'
            
            # Start monitoring
            result = await start_ssh_log_monitoring(cvm_ip, log_path)
            
            # Verify failure
            assert result is False
            assert get_ssh_connection() is None

    @pytest.mark.asyncio
    async def test_start_ssh_log_monitoring_existing_connection(self, mock_ssh_connection):
        """Test SSH log monitoring start with existing connection"""
        # Set existing connection
        set_ssh_connection(mock_ssh_connection)
        
        with patch('app_fastapi.connect_ssh', return_value=mock_ssh_connection), \
             patch('asyncio.create_task') as mock_create_task:
            
            # Test parameters
            cvm_ip = '10.38.112.31'
            log_path = '/home/nutanix/data/logs/genesis.out'
            
            # Start monitoring (should cleanup existing connection)
            result = await start_ssh_log_monitoring(cvm_ip, log_path)
            
            # Verify success
            assert result is True
            assert get_ssh_connection() is not None

    @pytest.mark.asyncio
    async def test_stop_ssh_log_monitoring(self, mock_ssh_connection):
        """Test SSH log monitoring stop"""
        # Set existing connection
        set_ssh_connection(mock_ssh_connection)
        
        with patch('asyncio.create_task') as mock_create_task:
            # Create a mock task
            mock_task = Mock()
            mock_create_task.return_value = mock_task
            
            # Stop monitoring
            await stop_ssh_log_monitoring()
            
            # Verify connection is closed
            assert get_ssh_connection() is None
            mock_ssh_connection.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_ssh_connection_cleanup(self, mock_ssh_connection):
        """Test SSH connection cleanup"""
        # Set existing connection
        set_ssh_connection(mock_ssh_connection)
        
        # Verify connection exists
        assert get_ssh_connection() is not None
        
        # Cleanup
        set_ssh_connection(None)
        
        # Verify connection is cleaned up
        assert get_ssh_connection() is None
