"""
Pytest configuration and fixtures for realtime log functionality tests
"""
import pytest
import asyncio
import socketio
from unittest.mock import Mock, patch, AsyncMock
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'flaskr'))

from app_fastapi import app, sio


@pytest.fixture
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_ssh_connection():
    """Mock SSH connection for testing"""
    mock_ssh = Mock()
    mock_ssh.exec_command.return_value = (
        Mock(),  # stdin
        Mock(),  # stdout
        Mock()   # stderr
    )
    return mock_ssh


@pytest.fixture
def mock_stdout():
    """Mock stdout for log reading tests"""
    mock_stdout = Mock()
    mock_stdout.readline.side_effect = [
        "2025-09-21 03:26:39,776Z INFO 80801248 node_manager.py:7417 Test log line 1\n",
        "2025-09-21 03:26:39,784Z INFO 80801248 node_manager.py:3965 Test log line 2\n",
        ""  # Empty line to end the loop
    ]
    return mock_stdout


@pytest.fixture
def socketio_client():
    """Create a SocketIO test client"""
    client = sio.test_client(app)
    return client


@pytest.fixture
def fastapi_client():
    """Create a FastAPI test client"""
    from fastapi.testclient import TestClient
    return TestClient(app)
