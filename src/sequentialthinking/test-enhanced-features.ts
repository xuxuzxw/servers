#!/usr/bin/env node

/**
 * Test script for Enhanced Sequential Thinking MCP Server
 * This script demonstrates and tests the new optimization features
 */

import { ThinkingAdvisor } from './thinking-advisor.js';
import { MemoryManager } from './memory-manager.js';
import { AsyncProcessor } from './async-processor.js';
import { LearningEngine } from './learning-engine.js';
import { ThoughtData, ThinkingPattern } from './types.js';

async function testThinkingAdvisor() {
  console.log('🧠 Testing Thinking Advisor...');
  
  const advisor = new ThinkingAdvisor();
  
  // Create sample thoughts
  const thoughts: ThoughtData[] = [
    {
      thought: "我需要分析这个复杂的技术问题，首先让我理解问题的核心",
      thoughtNumber: 1,
      totalThoughts: 5,
      nextThoughtNeeded: true,
      timestamp: Date.now() - 5000
    },
    {
      thought: "通过深入分析，我发现这个问题涉及多个系统组件的交互",
      thoughtNumber: 2,
      totalThoughts: 5,
      nextThoughtNeeded: true,
      timestamp: Date.now() - 4000
    },
    {
      thought: "让我从另一个角度考虑 - 也许问题出在数据流的处理上",
      thoughtNumber: 3,
      totalThoughts: 5,
      nextThoughtNeeded: true,
      timestamp: Date.now() - 3000
    }
  ];

  // Test pattern analysis
  const pattern = advisor.analyzeThinkingPattern(thoughts);
  console.log('Pattern Analysis:', {
    type: pattern.patternType,
    confidence: pattern.confidence,
    characteristics: pattern.characteristics,
    nextSteps: pattern.suggestedNextSteps.slice(0, 2)
  });

  // Test quality evaluation
  const quality = advisor.evaluateThoughtQuality(thoughts[1], thoughts);
  console.log('Quality Evaluation:', {
    coherence: quality.coherence.toFixed(2),
    depth: quality.depth.toFixed(2),
    breadth: quality.breadth.toFixed(2),
    originality: quality.originalityScore.toFixed(2)
  });

  // Test insights generation
  const insights = advisor.generateInsights(thoughts);
  console.log('Generated Insights:', insights.slice(0, 2).map(i => ({
    type: i.type,
    message: i.message,
    confidence: i.confidence.toFixed(2)
  })));

  console.log('✅ Thinking Advisor tests completed\n');
}

async function testMemoryManager() {
  console.log('💾 Testing Memory Manager...');
  
  const memoryManager = new MemoryManager({
    maxThoughts: 10,
    compressionThreshold: 5,
    retentionPeriod: 60000, // 1 minute for testing
    qualityThreshold: 0.3
  });

  // Create sample thoughts with quality data
  const thoughts: ThoughtData[] = [];
  for (let i = 1; i <= 12; i++) {
    thoughts.push({
      thought: `这是第${i}个思维，包含了一些分析内容和思考过程`,
      thoughtNumber: i,
      totalThoughts: 12,
      nextThoughtNeeded: i < 12,
      timestamp: Date.now() - (12 - i) * 1000,
      quality: {
        coherence: Math.random(),
        depth: Math.random(),
        breadth: Math.random(),
        originalityScore: Math.random(),
        relevance: Math.random()
      }
    });
  }

  console.log('Before management:', thoughts.length, 'thoughts');

  // Test memory management
  const managedThoughts = await memoryManager.manageThoughtHistory(thoughts);
  console.log('After management:', managedThoughts.length, 'thoughts');

  // Test memory stats
  const stats = memoryManager.getMemoryStats();
  console.log('Memory Stats:', {
    activeThoughts: stats.activeThoughts,
    compressedThoughts: stats.compressedThoughts,
    compressionRatio: stats.compressionRatio.toFixed(2)
  });

  // Test search
  const searchResults = memoryManager.searchCompressedThoughts('分析');
  console.log('Search Results:', searchResults.length, 'compressed thoughts found');

  console.log('✅ Memory Manager tests completed\n');
}

async function testAsyncProcessor() {
  console.log('⚡ Testing Async Processor...');
  
  const processor = new AsyncProcessor({
    maxConcurrentTasks: 2,
    taskTimeout: 1000,
    maxRetries: 1
  });

  // Test adding tasks
  const taskIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    const taskId = processor.addTask({
      type: 'quality_evaluation',
      data: { thoughtNumber: i + 1 },
      priority: Math.random() * 10
    });
    taskIds.push(taskId);
  }

  console.log('Added tasks:', taskIds.length);

  // Test queue status
  const queueStatus = processor.getQueueStatus();
  console.log('Queue Status:', queueStatus);

  // Wait for some tasks to complete
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test task status
  for (const taskId of taskIds.slice(0, 2)) {
    const status = processor.getTaskStatus(taskId);
    console.log(`Task ${taskId.slice(-4)}: ${status}`);
  }

  // Test batch processing
  const thoughts: ThoughtData[] = [
    { thought: "思维1", thoughtNumber: 1, totalThoughts: 3, nextThoughtNeeded: true, timestamp: Date.now() },
    { thought: "思维2", thoughtNumber: 2, totalThoughts: 3, nextThoughtNeeded: true, timestamp: Date.now() },
    { thought: "思维3", thoughtNumber: 3, totalThoughts: 3, nextThoughtNeeded: false, timestamp: Date.now() }
  ];

  const batchResults = await processor.batchEvaluateQuality(
    thoughts,
    async (thought, context) => ({ quality: Math.random(), processed: true })
  );

  console.log('Batch Results:', batchResults.size, 'thoughts processed');

  await processor.shutdown();
  console.log('✅ Async Processor tests completed\n');
}

async function testLearningEngine() {
  console.log('📈 Testing Learning Engine...');
  
  const learningEngine = new LearningEngine();

  // Start a session
  const sessionId = learningEngine.startSession();
  console.log('Started session:', sessionId.slice(-8));

  // Record some thoughts and patterns
  const thoughts: ThoughtData[] = [
    {
      thought: "系统性地分析问题的各个方面",
      thoughtNumber: 1,
      totalThoughts: 4,
      nextThoughtNeeded: true,
      timestamp: Date.now(),
      quality: {
        coherence: 0.8,
        depth: 0.7,
        breadth: 0.6,
        originalityScore: 0.5,
        relevance: 0.9
      }
    },
    {
      thought: "深入探讨技术实现的细节",
      thoughtNumber: 2,
      totalThoughts: 4,
      nextThoughtNeeded: true,
      timestamp: Date.now(),
      quality: {
        coherence: 0.9,
        depth: 0.9,
        breadth: 0.4,
        originalityScore: 0.6,
        relevance: 0.8
      }
    }
  ];

  thoughts.forEach(thought => {
    learningEngine.recordThought(sessionId, thought);
  });

  const pattern: ThinkingPattern = {
    patternType: 'analytical',
    confidence: 0.85,
    characteristics: ['深入分析', '系统性方法'],
    suggestedNextSteps: ['验证假设', '寻找证据'],
    potentialPitfalls: ['过度分析'],
    recommendedApproach: '保持分析深度，注意时间控制'
  };

  learningEngine.recordPattern(sessionId, pattern);

  // End session with successful outcome
  const insights = await learningEngine.endSession(sessionId, {
    type: 'success',
    description: '成功解决了技术问题',
    factors: ['系统性分析', '深入思考'],
    lessons: ['分析方法有效', '需要控制时间']
  });

  console.log('Session Insights:', insights.slice(0, 2).map(i => ({
    type: i.type,
    message: i.message,
    confidence: i.confidence.toFixed(2)
  })));

  // Test pattern success analysis
  const patternSuccess = learningEngine.analyzePatternSuccess();
  console.log('Pattern Success Rates:', Array.from(patternSuccess.entries()).map(([pattern, rate]) => ({
    pattern,
    successRate: (rate * 100).toFixed(1) + '%'
  })));

  // Test improvement opportunities
  const improvements = learningEngine.identifyImprovementOpportunities();
  console.log('Improvement Opportunities:', improvements.slice(0, 2).map(i => ({
    type: i.type,
    message: i.message
  })));

  // Test progress report
  const progress = learningEngine.getProgressReport();
  console.log('Progress Report:', {
    totalSessions: progress.totalSessions,
    averageQuality: progress.averageSessionQuality.toFixed(2),
    improvementTrend: progress.improvementTrend.toFixed(3)
  });

  console.log('✅ Learning Engine tests completed\n');
}

async function runAllTests() {
  console.log('🚀 Starting Enhanced Sequential Thinking MCP Server Tests\n');
  
  try {
    await testThinkingAdvisor();
    await testMemoryManager();
    await testAsyncProcessor();
    await testLearningEngine();
    
    console.log('🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}