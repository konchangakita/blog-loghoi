#!/usr/bin/env python3
"""
パフォーマンステストスクリプト
"""
import asyncio
import aiohttp
import time
import json
from typing import Dict, List, Any
import statistics

class PerformanceTester:
    def __init__(self, base_url: str = "http://localhost:7776"):
        self.base_url = base_url
        self.results = {}
    
    async def test_api_endpoint(self, endpoint: str, method: str = "GET", 
                              data: Dict = None, iterations: int = 10) -> Dict[str, Any]:
        """APIエンドポイントのパフォーマンステスト"""
        url = f"{self.base_url}{endpoint}"
        times = []
        errors = 0
        
        async with aiohttp.ClientSession() as session:
            for i in range(iterations):
                start_time = time.time()
                try:
                    if method.upper() == "GET":
                        async with session.get(url) as response:
                            await response.text()
                    elif method.upper() == "POST":
                        async with session.post(url, json=data) as response:
                            await response.text()
                    
                    end_time = time.time()
                    times.append(end_time - start_time)
                    
                except Exception as e:
                    errors += 1
                    print(f"Error in iteration {i+1}: {e}")
        
        if times:
            return {
                "endpoint": endpoint,
                "method": method,
                "iterations": iterations,
                "errors": errors,
                "avg_time": statistics.mean(times),
                "min_time": min(times),
                "max_time": max(times),
                "median_time": statistics.median(times),
                "p95_time": sorted(times)[int(len(times) * 0.95)] if len(times) > 1 else times[0],
                "success_rate": (iterations - errors) / iterations * 100
            }
        else:
            return {
                "endpoint": endpoint,
                "method": method,
                "iterations": iterations,
                "errors": errors,
                "success_rate": 0
            }
    
    async def test_collect_log_apis(self):
        """Collect Log APIのパフォーマンステスト"""
        print("Testing Collect Log APIs...")
        
        # ZIP一覧取得テスト
        zip_list_result = await self.test_api_endpoint("/api/col/ziplist", "GET", iterations=20)
        self.results["zip_list"] = zip_list_result
        
        # ログ表示テスト（ページネーション）
        log_display_data = {
            "log_file": "test.log",
            "zip_name": "test.zip",
            "page": 1,
            "page_size": 1000
        }
        log_display_result = await self.test_api_endpoint("/api/col/logdisplay", "POST", 
                                                        data=log_display_data, iterations=10)
        self.results["log_display_paginated"] = log_display_result
        
        # キャッシュ統計テスト
        cache_stats_result = await self.test_api_endpoint("/api/col/cache/stats", "GET", iterations=20)
        self.results["cache_stats"] = cache_stats_result
    
    async def test_uuid_apis(self):
        """UUID APIのパフォーマンステスト"""
        print("Testing UUID APIs...")
        
        # 最新データセット取得テスト
        latest_data = {"cluster": "test-cluster"}
        latest_result = await self.test_api_endpoint("/api/uuid/latestdataset", "POST", 
                                                   data=latest_data, iterations=10)
        self.results["latest_dataset"] = latest_result
        
        # キャッシュ統計テスト
        cache_stats_result = await self.test_api_endpoint("/api/uuid/cache/stats", "GET", iterations=20)
        self.results["uuid_cache_stats"] = cache_stats_result
    
    async def test_concurrent_requests(self, endpoint: str, method: str = "GET", 
                                     data: Dict = None, concurrent: int = 10):
        """同時リクエストのテスト"""
        print(f"Testing {concurrent} concurrent requests to {endpoint}...")
        
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()
        
        async def make_request(session):
            try:
                if method.upper() == "GET":
                    async with session.get(url) as response:
                        return await response.text()
                elif method.upper() == "POST":
                    async with session.post(url, json=data) as response:
                        return await response.text()
            except Exception as e:
                return f"Error: {e}"
        
        async with aiohttp.ClientSession() as session:
            tasks = [make_request(session) for _ in range(concurrent)]
            results = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        errors = sum(1 for r in results if isinstance(r, Exception) or "Error:" in str(r))
        
        return {
            "endpoint": endpoint,
            "concurrent_requests": concurrent,
            "total_time": total_time,
            "avg_time_per_request": total_time / concurrent,
            "requests_per_second": concurrent / total_time,
            "errors": errors,
            "success_rate": (concurrent - errors) / concurrent * 100
        }
    
    def print_results(self):
        """結果を表示"""
        print("\n" + "="*60)
        print("PERFORMANCE TEST RESULTS")
        print("="*60)
        
        for test_name, result in self.results.items():
            print(f"\n{test_name.upper()}:")
            print(f"  Endpoint: {result.get('endpoint', 'N/A')}")
            print(f"  Method: {result.get('method', 'N/A')}")
            print(f"  Iterations: {result.get('iterations', result.get('concurrent_requests', 'N/A'))}")
            print(f"  Success Rate: {result.get('success_rate', 0):.1f}%")
            
            if 'avg_time' in result:
                print(f"  Average Time: {result['avg_time']:.3f}s")
                print(f"  Min Time: {result['min_time']:.3f}s")
                print(f"  Max Time: {result['max_time']:.3f}s")
                print(f"  Median Time: {result['median_time']:.3f}s")
                print(f"  P95 Time: {result['p95_time']:.3f}s")
            
            if 'requests_per_second' in result:
                print(f"  Requests/Second: {result['requests_per_second']:.2f}")
            
            if 'errors' in result:
                print(f"  Errors: {result['errors']}")
    
    def save_results(self, filename: str = "performance_results.json"):
        """結果をJSONファイルに保存"""
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
        print(f"\nResults saved to {filename}")

async def main():
    """メイン実行関数"""
    tester = PerformanceTester()
    
    print("Starting Performance Tests...")
    print("="*60)
    
    # Collect Log APIテスト
    await tester.test_collect_log_apis()
    
    # UUID APIテスト
    await tester.test_uuid_apis()
    
    # 同時リクエストテスト
    concurrent_result = await tester.test_concurrent_requests(
        "/api/col/ziplist", "GET", concurrent=20
    )
    tester.results["concurrent_zip_list"] = concurrent_result
    
    # 結果表示
    tester.print_results()
    tester.save_results()

if __name__ == "__main__":
    asyncio.run(main())
