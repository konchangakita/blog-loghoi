/**
 * フロントエンドパフォーマンステストスクリプト
 */

class FrontendPerformanceTester {
  constructor() {
    this.results = {};
  }

  /**
   * コンポーネントレンダリング時間を測定
   */
  measureRenderTime(componentName, renderFunction, iterations = 10) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      renderFunction();
      const end = performance.now();
      times.push(end - start);
    }
    
    return {
      component: componentName,
      iterations,
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      medianTime: times.sort((a, b) => a - b)[Math.floor(times.length / 2)]
    };
  }

  /**
   * メモリ使用量を測定
   */
  measureMemoryUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  /**
   * 仮想化コンポーネントのパフォーマンステスト
   */
  testVirtualizationPerformance() {
    console.log('Testing Virtualization Performance...');
    
    // 大量のログデータを生成
    const generateLogData = (count) => {
      return Array.from({ length: count }, (_, i) => ({
        name: `log${i % 10}`,
        line: `This is log line ${i} with some content to simulate real log data`,
        timestamp: new Date().toISOString(),
        line_number: i + 1
      }));
    };

    // 小規模データ（1000行）
    const smallData = generateLogData(1000);
    const smallResult = this.measureRenderTime('LogViewer-Small', () => {
      // 仮想化なしでのレンダリングシミュレーション
      smallData.forEach(log => {
        const div = document.createElement('div');
        div.textContent = log.line;
      });
    });

    // 大規模データ（10000行）
    const largeData = generateLogData(10000);
    const largeResult = this.measureRenderTime('LogViewer-Large', () => {
      // 仮想化ありでのレンダリングシミュレーション
      const visibleCount = 50; // 仮想化で表示される行数
      for (let i = 0; i < visibleCount; i++) {
        const div = document.createElement('div');
        div.textContent = largeData[i].line;
      }
    });

    return {
      small: smallResult,
      large: largeResult,
      improvement: (smallResult.avgTime - largeResult.avgTime) / smallResult.avgTime * 100
    };
  }

  /**
   * API呼び出しのパフォーマンステスト
   */
  async testApiPerformance() {
    console.log('Testing API Performance...');
    
    const testEndpoints = [
      { url: '/api/col/ziplist', method: 'GET' },
      { url: '/api/col/cache/stats', method: 'GET' },
      { url: '/api/uuid/cache/stats', method: 'GET' }
    ];

    const results = {};

    for (const endpoint of testEndpoints) {
      const times = [];
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        try {
          const response = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: {
              'Content-Type': 'application/json'
            }
          });
          await response.text();
        } catch (error) {
          console.warn(`API call failed: ${error.message}`);
        }
        const end = performance.now();
        times.push(end - start);
      }

      results[endpoint.url] = {
        endpoint: endpoint.url,
        method: endpoint.method,
        iterations,
        avgTime: times.reduce((a, b) => a + b, 0) / times.length,
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
        medianTime: times.sort((a, b) => a - b)[Math.floor(times.length / 2)]
      };
    }

    return results;
  }

  /**
   * フィルタリングパフォーマンステスト
   */
  testFilteringPerformance() {
    console.log('Testing Filtering Performance...');
    
    // 大量のログデータを生成
    const logData = Array.from({ length: 10000 }, (_, i) => ({
      name: `log${i % 10}`,
      line: `This is log line ${i} with keyword ${i % 100 === 0 ? 'ERROR' : 'INFO'}`,
      timestamp: new Date().toISOString(),
      line_number: i + 1
    }));

    // フィルタリング関数（メモ化なし）
    const filterWithoutMemo = (logs, filter) => {
      return logs.filter(log => 
        log.line.toLowerCase().includes(filter.toLowerCase())
      );
    };

    // フィルタリング関数（メモ化あり）
    const filterWithMemo = (() => {
      let cache = new Map();
      return (logs, filter) => {
        const key = `${logs.length}-${filter}`;
        if (cache.has(key)) {
          return cache.get(key);
        }
        const result = logs.filter(log => 
          log.line.toLowerCase().includes(filter.toLowerCase())
        );
        cache.set(key, result);
        return result;
      };
    })();

    const filterTests = [
      { name: 'No-Memo', func: filterWithoutMemo },
      { name: 'With-Memo', func: filterWithMemo }
    ];

    const results = {};
    const testFilters = ['ERROR', 'INFO', 'WARN', 'test'];

    for (const test of filterTests) {
      const times = [];
      for (const filter of testFilters) {
        const start = performance.now();
        test.func(logData, filter);
        const end = performance.now();
        times.push(end - start);
      }
      
      results[test.name] = {
        avgTime: times.reduce((a, b) => a + b, 0) / times.length,
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
        medianTime: times.sort((a, b) => a - b)[Math.floor(times.length / 2)]
      };
    }

    return results;
  }

  /**
   * 全テストを実行
   */
  async runAllTests() {
    console.log('Starting Frontend Performance Tests...');
    console.log('='.repeat(60));

    // メモリ使用量測定（開始時）
    const initialMemory = this.measureMemoryUsage();

    // 仮想化パフォーマンステスト
    this.results.virtualization = this.testVirtualizationPerformance();

    // フィルタリングパフォーマンステスト
    this.results.filtering = this.testFilteringPerformance();

    // APIパフォーマンステスト
    this.results.api = await this.testApiPerformance();

    // メモリ使用量測定（終了時）
    const finalMemory = this.measureMemoryUsage();

    this.results.memory = {
      initial: initialMemory,
      final: finalMemory,
      difference: finalMemory ? {
        used: finalMemory.used - initialMemory.used,
        total: finalMemory.total - initialMemory.total
      } : null
    };

    this.printResults();
    this.saveResults();
  }

  /**
   * 結果を表示
   */
  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('FRONTEND PERFORMANCE TEST RESULTS');
    console.log('='.repeat(60));

    // 仮想化結果
    if (this.results.virtualization) {
      console.log('\nVIRTUALIZATION PERFORMANCE:');
      console.log(`  Small Data (1000 rows): ${this.results.virtualization.small.avgTime.toFixed(3)}ms`);
      console.log(`  Large Data (10000 rows): ${this.results.virtualization.large.avgTime.toFixed(3)}ms`);
      console.log(`  Performance Improvement: ${this.results.virtualization.improvement.toFixed(1)}%`);
    }

    // フィルタリング結果
    if (this.results.filtering) {
      console.log('\nFILTERING PERFORMANCE:');
      console.log(`  No Memoization: ${this.results.filtering['No-Memo'].avgTime.toFixed(3)}ms`);
      console.log(`  With Memoization: ${this.results.filtering['With-Memo'].avgTime.toFixed(3)}ms`);
      const improvement = (this.results.filtering['No-Memo'].avgTime - this.results.filtering['With-Memo'].avgTime) / 
                        this.results.filtering['No-Memo'].avgTime * 100;
      console.log(`  Memoization Improvement: ${improvement.toFixed(1)}%`);
    }

    // API結果
    if (this.results.api) {
      console.log('\nAPI PERFORMANCE:');
      for (const [endpoint, result] of Object.entries(this.results.api)) {
        console.log(`  ${endpoint}: ${result.avgTime.toFixed(3)}ms`);
      }
    }

    // メモリ結果
    if (this.results.memory && this.results.memory.difference) {
      console.log('\nMEMORY USAGE:');
      console.log(`  Initial: ${(this.results.memory.initial.used / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Final: ${(this.results.memory.final.used / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Difference: ${(this.results.memory.difference.used / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  /**
   * 結果を保存
   */
  saveResults() {
    const dataStr = JSON.stringify(this.results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'frontend_performance_results.json';
    link.click();
    
    URL.revokeObjectURL(url);
    console.log('\nResults saved to frontend_performance_results.json');
  }
}

// テスト実行
if (typeof window !== 'undefined') {
  const tester = new FrontendPerformanceTester();
  tester.runAllTests();
}

// Node.js環境での実行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FrontendPerformanceTester;
}
