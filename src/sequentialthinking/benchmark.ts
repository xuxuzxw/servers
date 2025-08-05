#!/usr/bin/env node

/**
 * Performance benchmark for Enhanced Sequential Thinking MCP Server
 */

import { ThinkingAdvisor } from './thinking-advisor.js';
import { MemoryManager } from './memory-manager.js';
import { AsyncProcessor } from './async-processor.js';
import { LearningEngine } from './learning-engine.js';
import { ThoughtData } from './types.js';

interface BenchmarkResult {
  name: string;
  duration: number;
  throughput: number;
  memoryUsage: number;
  success: boolean;
  details?: any;
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];

  async runAllBenchmarks(): Promise<void> {
    console.log('🚀 Starting Enhanced Sequential Thinking MCP Server Benchmarks\n');

    await this.benchmarkThinkingAdvisor();
    await this.benchmarkMemoryManager();
    await this.benchmarkAsyncProcessor();
    await this.benchmarkLearningEngine();
    await this.benchmarkIntegratedWorkflow();

    this.printResults();
  }

  private async benchmarkThinkingAdvisor(): Promise<void> {
    console.log('🧠 Benchmarking ThinkingAdvisor...');
    
    const advisor = new ThinkingAdvisor();
    const thoughts = this.generateMockThoughts(100);

    // Pattern Analysis Benchmark
    const patternStart = process.hrtime.bigint();
    const memBefore = process.memoryUsage();
    
    for (let i = 0; i < 1000; i++) {
      advisor.analyzeThinkingPattern(thoughts.slice(0, 10));
    }
    
    const patternEnd = process.hrtime.bigint();
    const memAfter = process.memoryUsage();
    
    this.results.push({
      name: 'ThinkingAdvisor - Pattern Analysis',
      duration: Number(patternEnd - patternStart) / 1000000, // Convert to ms
      throughput: 1000 / (Number(patternEnd - patternStart) / 1000000000), // ops/sec
      memoryUsage: memAfter.heapUsed - memBefore.heapUsed,
      success: true
    });

    // Quality Evaluation Benchmark
    const qualityStart = process.hrtime.bigint();
    const memBefore2 = process.memoryUsage();
    
    for (let i = 0; i < 500; i++) {
      advisor.evaluateThoughtQuality(thoughts[i % thoughts.length], thoughts);
    }
    
    const qualityEnd = process.hrtime.bigint();
    const memAfter2 = process.memoryUsage();
    
    this.results.push({
      name: 'ThinkingAdvisor - Quality Evaluation',
      duration: Number(qualityEnd - qualityStart) / 1000000,
      throughput: 500 / (Number(qualityEnd - qualityStart) / 1000000000),
      memoryUsage: memAfter2.heapUsed - memBefore2.heapUsed,
      success: true
    });

    // Insight Generation Benchmark
    const insightStart = process.hrtime.bigint();
    const memBefore3 = process.memoryUsage();
    
    for (let i = 0; i < 100; i++) {
      advisor.generateInsights(thoughts.slice(0, 20));
    }
    
    const insightEnd = process.hrtime.bigint();
    const memAfter3 = process.memoryUsage();
    
    this.results.push({
      name: 'ThinkingAdvisor - Insight Generation',
      duration: Number(insightEnd - insightStart) / 1000000,
      throughput: 100 / (Number(insightEnd - insightStart) / 1000000000),
      memoryUsage: memAfter3.heapUsed - memBefore3.heapUsed,
      success: true
    });
  }

  private async benchmarkMemoryManager(): Promise<void> {
    console.log('💾 Benchmarking MemoryManager...');
    
    const memoryManager = new MemoryManager({
      maxThoughts: 1000,
      compressionThreshold: 500,
      retentionPeriod: 60000,
      qualityThreshold: 0.3
    });

    const thoughts = this.generateMockThoughts(1000);

    // Memory Management Benchmark
    const start = process.hrtime.bigint();
    const memBefore = process.memoryUsage();
    
    const managedThoughts = await memoryManager.manageThoughtHistory(thoughts);
    
    const end = process.hrtime.bigint();
    const memAfter = process.memoryUsage();
    
    const stats = memoryManager.getMemoryStats();
    
    this.results.push({
      name: 'MemoryManager - Thought Management',
      duration: Number(end - start) / 1000000,
      throughput: thoughts.length / (Number(end - start) / 1000000000),
      memoryUsage: memAfter.heapUsed - memBefore.heapUsed,
      success: true,
      details: {
        originalCount: thoughts.length,
        managedCount: managedThoughts.length,
        compressionRatio: stats.compressionRatio,
        compressedThoughts: stats.compressedThoughts
      }
    });

    // Search Benchmark
    const searchStart = process.hrtime.bigint();
    
    for (let i = 0; i < 100; i++) {
      memoryManager.searchCompressedThoughts('分析');
    }
    
    const searchEnd = process.hrtime.bigint();
    
    this.results.push({
      name: 'MemoryManager - Search',
      duration: Number(searchEnd - searchStart) / 1000000,
      throughput: 100 / (Number(searchEnd - searchStart) / 1000000000),
      memoryUsage: 0,
      success: true
    });
  }

  private async benchmarkAsyncProcessor(): Promise<void> {
    console.log('⚡ Benchmarking AsyncProcessor...');
    
    const processor = new AsyncProcessor({
      maxConcurrentTasks: 5,
      taskTimeout: 5000,
      maxRetries: 2
    });

    // Task Processing Benchmark
    const start = process.hrtime.bigint();
    const taskIds: string[] = [];
    
    // Add 100 tasks
    for (let i = 0; i < 100; i++) {
      const taskId = processor.addTask({
        type: 'quality_evaluation',
        data: { taskNumber: i },
        priority: Math.floor(Math.random() * 10)
      });
      taskIds.push(taskId);
    }
    
    // Wait for all tasks to complete
    const results = await Promise.allSettled(
      taskIds.map(id => processor.waitForTask(id))
    );
    
    const end = process.hrtime.bigint();
    
    const successCount = results.filter(r => 
      r.status === 'fulfilled' && r.value?.success
    ).length;
    
    this.results.push({
      name: 'AsyncProcessor - Task Processing',
      duration: Number(end - start) / 1000000,
      throughput: 100 / (Number(end - start) / 1000000000),
      memoryUsage: 0,
      success: successCount === 100,
      details: {
        totalTasks: 100,
        successfulTasks: successCount,
        failedTasks: 100 - successCount
      }
    });

    // Batch Processing Benchmark
    const thoughts = this.generateMockThoughts(50);
    const batchStart = process.hrtime.bigint();
    
    const batchResults = await processor.batchEvaluateQuality(
      thoughts,
      async (thought) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { quality: Math.random() };
      }
    );
    
    const batchEnd = process.hrtime.bigint();
    
    this.results.push({
      name: 'AsyncProcessor - Batch Processing',
      duration: Number(batchEnd - batchStart) / 1000000,
      throughput: thoughts.length / (Number(batchEnd - batchStart) / 1000000000),
      memoryUsage: 0,
      success: batchResults.size === thoughts.length
    });

    await processor.shutdown();
  }

  private async benchmarkLearningEngine(): Promise<void> {
    console.log('📈 Benchmarking LearningEngine...');
    
    const learningEngine = new LearningEngine();

    // Session Management Benchmark
    const start = process.hrtime.bigint();
    const sessionIds: string[] = [];
    
    // Create 50 sessions with data
    for (let i = 0; i < 50; i++) {
      const sessionId = learningEngine.startSession();
      sessionIds.push(sessionId);
      
      // Add thoughts and patterns
      const thoughts = this.generateMockThoughts(10);
      thoughts.forEach(thought => {
        learningEngine.recordThought(sessionId, thought);
      });
      
      learningEngine.recordPattern(sessionId, {
        patternType: ['analytical', 'creative', 'systematic'][i % 3] as any,
        confidence: Math.random(),
        characteristics: ['test'],
        suggestedNextSteps: ['test'],
        potentialPitfalls: ['test'],
        recommendedApproach: 'test'
      });
    }
    
    // End all sessions
    for (const sessionId of sessionIds) {
      await learningEngine.endSession(sessionId, {
        type: Math.random() > 0.5 ? 'success' : 'failure',
        description: 'Benchmark session',
        factors: ['benchmark'],
        lessons: ['test']
      });
    }
    
    const end = process.hrtime.bigint();
    
    this.results.push({
      name: 'LearningEngine - Session Management',
      duration: Number(end - start) / 1000000,
      throughput: 50 / (Number(end - start) / 1000000000),
      memoryUsage: 0,
      success: true
    });

    // Analysis Benchmark
    const analysisStart = process.hrtime.bigint();
    
    for (let i = 0; i < 100; i++) {
      learningEngine.analyzePatternSuccess();
      learningEngine.identifyImprovementOpportunities();
      learningEngine.getProgressReport();
    }
    
    const analysisEnd = process.hrtime.bigint();
    
    this.results.push({
      name: 'LearningEngine - Analysis',
      duration: Number(analysisEnd - analysisStart) / 1000000,
      throughput: 300 / (Number(analysisEnd - analysisStart) / 1000000000), // 3 operations × 100
      memoryUsage: 0,
      success: true
    });
  }

  private async benchmarkIntegratedWorkflow(): Promise<void> {
    console.log('🔄 Benchmarking Integrated Workflow...');
    
    const advisor = new ThinkingAdvisor();
    const memoryManager = new MemoryManager();
    const processor = new AsyncProcessor();
    const learningEngine = new LearningEngine();

    const start = process.hrtime.bigint();
    const memBefore = process.memoryUsage();
    
    // Simulate 10 complete thinking sessions
    for (let session = 0; session < 10; session++) {
      const sessionId = learningEngine.startSession();
      const thoughts = this.generateMockThoughts(20);
      
      // Process each thought through the complete pipeline
      for (const thought of thoughts) {
        // Quality evaluation
        thought.quality = advisor.evaluateThoughtQuality(thought, thoughts);
        learningEngine.recordThought(sessionId, thought);
      }
      
      // Pattern analysis
      const pattern = advisor.analyzeThinkingPattern(thoughts);
      learningEngine.recordPattern(sessionId, pattern);
      
      // Generate insights
      advisor.generateInsights(thoughts);
      
      // Memory management
      await memoryManager.manageThoughtHistory(thoughts);
      
      // End session
      await learningEngine.endSession(sessionId, {
        type: 'success',
        description: `Benchmark session ${session + 1}`,
        factors: ['integrated workflow'],
        lessons: ['benchmark test']
      });
    }
    
    const end = process.hrtime.bigint();
    const memAfter = process.memoryUsage();
    
    this.results.push({
      name: 'Integrated Workflow',
      duration: Number(end - start) / 1000000,
      throughput: 200 / (Number(end - start) / 1000000000), // 20 thoughts × 10 sessions
      memoryUsage: memAfter.heapUsed - memBefore.heapUsed,
      success: true,
      details: {
        sessions: 10,
        thoughtsPerSession: 20,
        totalThoughts: 200
      }
    });

    await processor.shutdown();
  }

  private generateMockThoughts(count: number): ThoughtData[] {
    const templates = [
      '我需要分析这个问题的根本原因',
      '通过系统性的方法来解决这个挑战',
      '让我从不同的角度来思考这个情况',
      '基于已有的信息，我可以得出以下结论',
      '这个方案的优势在于其可行性和效率',
      '考虑到各种约束条件，最佳选择是',
      '通过深入分析，我发现了一个重要的模式',
      '这种方法的创新之处在于其独特的视角',
      '综合考虑所有因素后，我建议采用',
      '经过仔细评估，这个策略具有最高的成功概率'
    ];

    return Array.from({ length: count }, (_, i) => ({
      thought: templates[i % templates.length] + ` (${i + 1})`,
      thoughtNumber: i + 1,
      totalThoughts: count,
      nextThoughtNeeded: i < count - 1,
      timestamp: Date.now() - (count - i) * 1000,
      quality: {
        coherence: Math.random(),
        depth: Math.random(),
        breadth: Math.random(),
        originalityScore: Math.random(),
        relevance: Math.random()
      }
    }));
  }

  private printResults(): void {
    console.log('\n📊 Benchmark Results Summary\n');
    console.log('=' .repeat(80));
    console.log(
      'Component'.padEnd(35) +
      'Duration(ms)'.padEnd(12) +
      'Throughput(ops/s)'.padEnd(18) +
      'Memory(KB)'.padEnd(12) +
      'Status'
    );
    console.log('=' .repeat(80));

    let totalDuration = 0;
    let successCount = 0;

    this.results.forEach(result => {
      totalDuration += result.duration;
      if (result.success) successCount++;

      console.log(
        result.name.padEnd(35) +
        result.duration.toFixed(2).padEnd(12) +
        result.throughput.toFixed(2).padEnd(18) +
        (result.memoryUsage / 1024).toFixed(2).padEnd(12) +
        (result.success ? '✅ PASS' : '❌ FAIL')
      );

      if (result.details) {
        console.log('  Details:', JSON.stringify(result.details, null, 2));
      }
    });

    console.log('=' .repeat(80));
    console.log(`Total Duration: ${totalDuration.toFixed(2)}ms`);
    console.log(`Success Rate: ${successCount}/${this.results.length} (${(successCount / this.results.length * 100).toFixed(1)}%)`);
    console.log(`Average Throughput: ${(this.results.reduce((sum, r) => sum + r.throughput, 0) / this.results.length).toFixed(2)} ops/s`);
    
    const totalMemory = this.results.reduce((sum, r) => sum + r.memoryUsage, 0);
    console.log(`Total Memory Usage: ${(totalMemory / 1024).toFixed(2)} KB`);
    
    console.log('\n🎯 Performance Summary:');
    if (totalDuration < 5000) {
      console.log('✅ Excellent performance - All benchmarks completed under 5 seconds');
    } else if (totalDuration < 10000) {
      console.log('✅ Good performance - All benchmarks completed under 10 seconds');
    } else {
      console.log('⚠️  Performance needs optimization - Consider reviewing slow components');
    }

    if (successCount === this.results.length) {
      console.log('✅ All benchmarks passed successfully');
    } else {
      console.log(`❌ ${this.results.length - successCount} benchmark(s) failed`);
    }
  }
}

// Run benchmarks if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmark = new PerformanceBenchmark();
  benchmark.runAllBenchmarks().catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}