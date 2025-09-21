#!/usr/bin/env python3
"""
Test runner script for realtime log functionality
"""
import subprocess
import sys
import os

def run_backend_tests():
    """Run backend tests"""
    print("🧪 Running backend tests...")
    
    # Change to backend directory
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    os.chdir(backend_dir)
    
    # Install test dependencies
    print("📦 Installing test dependencies...")
    subprocess.run([sys.executable, '-m', 'pip', 'install', 'pytest', 'pytest-asyncio', 'pytest-mock'], check=True)
    
    # Run tests
    print("🚀 Running pytest...")
    result = subprocess.run([sys.executable, '-m', 'pytest', 'tests/', '-v', '--tb=short'], capture_output=True, text=True)
    
    print("STDOUT:", result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    
    return result.returncode == 0

def run_frontend_tests():
    """Run frontend tests"""
    print("🧪 Running frontend tests...")
    
    # Change to frontend directory
    frontend_dir = os.path.join(os.path.dirname(__file__), 'frontend', 'next-app', 'loghoi')
    os.chdir(frontend_dir)
    
    # Install test dependencies
    print("📦 Installing test dependencies...")
    subprocess.run(['npm', 'install', '--save-dev', '@testing-library/react', '@testing-library/jest-dom', 'jest', 'jest-environment-jsdom'], check=True)
    
    # Run tests
    print("🚀 Running Jest...")
    result = subprocess.run(['npm', 'test', '--', '--watchAll=false'], capture_output=True, text=True)
    
    print("STDOUT:", result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    
    return result.returncode == 0

def main():
    """Main test runner"""
    print("🎯 Starting TDD test suite for realtime log functionality")
    print("=" * 60)
    
    # Run backend tests
    backend_success = run_backend_tests()
    
    print("\n" + "=" * 60)
    
    # Run frontend tests
    frontend_success = run_frontend_tests()
    
    print("\n" + "=" * 60)
    print("📊 Test Results Summary:")
    print(f"Backend tests: {'✅ PASSED' if backend_success else '❌ FAILED'}")
    print(f"Frontend tests: {'✅ PASSED' if frontend_success else '❌ FAILED'}")
    
    if backend_success and frontend_success:
        print("🎉 All tests passed!")
        return 0
    else:
        print("💥 Some tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
