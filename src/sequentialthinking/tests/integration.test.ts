import { ThinkingAdvisor } from '../thinking-advisor.js';
import { MemoryManager } from '../memory-manager.js';
import { AsyncProcessor } from '../async-processor.js';
import { LearningEngine } from '../learning-engine.js';
import { ErrorHandler } from '../error-handler.js';
import { ThoughtData } from '../types.js';

describe('Integration Tests', () => {
  let thinkingAdvisor: ThinkingAdvisor;
  let memoryManager: MemoryManager;
  let asyncProcessor: AsyncProcessor;
  let learningEngine: LearningEngine;
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    thinkingAdvisor = new ThinkingAdvisor();
    memoryManager = new MemoryManager({
      maxThoughts: 20,
      compressionThreshold: 10,
      retentionPeriod: 60000,
      qualityThreshold: 0.3
    });
    asyncProcessor = new AsyncProcessor({
      maxConcurrentTasks: 3,
      taskTimeout: 5000,
      maxRetries: 2
    });
    learningEngine = new LearningEngine();
    errorHandler = new ErrorHandler();
  });

  afterEach(async () => {
    await asyncProcessor.shutdown();
  });

  const createMockThought = (
    thought: string,
    thoughtNumber: number,
    options: Partial<ThoughtData> = {}
  ): ThoughtData => ({
    thought,
    thoughtNumber,
    totalThoughts: 10,
    nextThoughtNeeded: true,
    timestamp: Date.now(),
    ...options
  });

  describe('Complete Thinking Workflow', () => {
    it('should process a complete thinking session', async () => {
      const sessionId = learningEngine.startSession();
      const thoughts: ThoughtData[] = [];

      // Step 1: Create initial thoughts
      for (let i = 1; i <= 5; i++) {
        const thought = createMockThought(
          `这是第${i}个思维步骤，我正在分析问题的不同方面`,
          i
        );
        thoughts.push(thought);
      }

      // Step 2: Evaluate quality for each thought
      for (const thought of thoughts) {
        const quality = thinkingAdvisor.evaluateThoughtQuality(thought, thoughts);
        thought.quality = quality;
        learningEngine.recordThought(sessionId, thought);
      }

      // Step 3: Analyze thinking patterns
      const pattern = thinkingAdvisor.analyzeThinkingPattern(thoughts);
      learningEngine.recordPattern(sessionId, pattern);

      // Step 4: Generate insights
      const insights = thinkingAdvisor.generateInsights(thoughts);

      // Step 5: Manage memory
      const managedThoughts = await memoryManager.manageThoughtHistory(thoughts);

      // Step 6: End learning session
      const sessionInsights = await learningEngine.endSession(sessionId, {
        type: 'success',
        description: '成功完成思维分析',
        factors: ['系统性分析', '质量评估'],
        lessons: ['分析方法有效']
      });

      // Assertions
      expect(pattern.patternType).toBeDefined();
      expect(pattern.confidence).toBeGreaterThan(0);
      expect(Array.isArray(insights)).toBe(true);
      expect(managedThoughts.length).toBeGreaterThan(0);
      expect(Array.isArray(sessionInsights)).toBe(true);

      // Verify quality metrics
      thoughts.forEach(thought => {
        expect(thought.quality).toBeDefined();
        expect(thought.quality!.coherence).toBeGreaterThanOrEqual(0);
        expect(thought.quality!.depth).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle branching thoughts correctly', async () => {
      const sessionId = learningEngine.startSession();
      const thoughts: ThoughtData[] = [];

      // Main thought
      const mainThought = createMockThought('主要思路：分析问题A', 1);
      thoughts.push(mainThought);

      // Branch thoughts
      const branch1 = createMockThought('分支1：从角度X分析', 2, {
        branchFromThought: 1,
        branchId: 'branch-x'
      });
      const branch2 = createMockThought('分支2：从角度Y分析', 3, {
        branchFromThought: 1,
        branchId: 'branch-y'
      });

      thoughts.push(branch1, branch2);

      // Process all thoughts
      for (const thought of thoughts) {
        const quality = thinkingAdvisor.evaluateThoughtQuality(thought, thoughts);
        thought.quality = quality;
        learningEngine.recordThought(sessionId, thought);
      }

      const pattern = thinkingAdvisor.analyzeThinkingPattern(thoughts);
      expect(pattern.patternType).toBe('exploratory');
      expect(pattern.characteristics).toContain('探索多个方向');
    });

    it('should handle revision thoughts correctly', async () => {
      const sessionId = learningEngine.startSession();
      const thoughts: ThoughtData[] = [];

      // Original thought
      const original = createMockThought('初始想法：方案A是最好的', 1);
      thoughts.push(original);

      // Revision thought
      const revision = createMockThought('修正：重新考虑后，方案B可能更合适', 2, {
        isRevision: true,
        revisesThought: 1
      });
      thoughts.push(revision);

      // Process thoughts
      for (const thought of thoughts) {
        const quality = thinkingAdvisor.evaluateThoughtQuality(thought, thoughts);
        thought.quality = quality;
        learningEngine.recordThought(sessionId, thought);
      }

      const pattern = thinkingAdvisor.analyzeThinkingPattern(thoughts);
      expect(pattern.patternType).toBe('iterative');
      expect(pattern.characteristics).toContain('具有反思性');
    });
  });

  describe('Async Processing Integration', () => {
    it('should handle concurrent quality evaluations', async () => {
      const thoughts = Array.from({ length: 10 }, (_, i) =>
        createMockThought(`并发处理的思维 ${i + 1}`, i + 1)
      );

      const evaluator = async (thought: ThoughtData, context: ThoughtData[]) => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 50));
        return thinkingAdvisor.evaluateThoughtQuality(thought, context);
      };

      const results = await asyncProcessor.batchEvaluateQuality(thoughts, evaluator);

      expect(results.size).toBe(10);
      for (let i = 1; i <= 10; i++) {
        expect(results.has(i)).toBe(true);
        const result = results.get(i);
        expect(result).toHaveProperty('coherence');
        expect(result).toHaveProperty('depth');
      }
    });

    it('should handle task timeouts gracefully', async () => {
      const shortTimeoutProcessor = new AsyncProcessor({
        maxConcurrentTasks: 1,
        taskTimeout: 100,
        maxRetries: 0
      });

      const taskId = shortTimeoutProcessor.addTask({
        type: 'quality_evaluation',
        data: { slowTask: true },
        priority: 1
      });

      const result = await shortTimeoutProcessor.waitForTask(taskId);

      expect(result?.success).toBe(false);
      expect(result?.error).toContain('timeout');

      await shortTimeoutProcessor.shutdown();
    });
  });

  describe('Memory Management Integration', () => {
    it('should compress thoughts when threshold is exceeded', async () => {
      const smallMemoryManager = new MemoryManager({
        maxThoughts: 5,
        compressionThreshold: 3,
        retentionPeriod: 60000,
        qualityThreshold: 0.3
      });

      const thoughts = Array.from({ length: 6 }, (_, i) =>
        createMockThought(`思维 ${i + 1}`, i + 1, {
          timestamp: Date.now() - (6 - i) * 1000,
          quality: {
            coherence: 0.5,
            depth: 0.5,
            breadth: 0.5,
            originalityScore: 0.5,
            relevance: 0.5
          }
        })
      );

      const managedThoughts = await smallMemoryManager.manageThoughtHistory(thoughts);
      const stats = smallMemoryManager.getMemoryStats();

      expect(managedThoughts.length).toBeLessThan(thoughts.length);
      expect(stats.compressedThoughts).toBeGreaterThan(0);
    });

    it('should preserve high-quality thoughts during compression', async () => {
      const thoughts = [
        createMockThought('低质量思维', 1, {
          quality: {
            coherence: 0.1, depth: 0.1, breadth: 0.1, 
            originalityScore: 0.1, relevance: 0.1
          }
        }),
        createMockThought('高质量思维', 2, {
          quality: {
            coherence: 0.9, depth: 0.9, breadth: 0.9, 
            originalityScore: 0.9, relevance: 0.9
          }
        })
      ];

      const managedThoughts = await memoryManager.manageThoughtHistory(thoughts);
      
      expect(managedThoughts.some(t => t.thought === '高质量思维')).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid input gracefully', () => {
      const invalidInputs = [
        null,
        undefined,
        'string',
        123,
        [],
        {},
        { thought: 'missing required fields' },
        { thought: 123, thoughtNumber: 1, totalThoughts: 5, nextThoughtNeeded: true }
      ];

      invalidInputs.forEach(input => {
        const result = errorHandler.handleError(
          () => errorHandler.validateInput(input),
          { input: typeof input }
        );

        expect(result.isError).toBe(true);
        expect(result.content).toHaveLength(1);
        
        const parsedContent = JSON.parse(result.content[0].text);
        expect(parsedContent).toHaveProperty('error');
        expect(parsedContent).toHaveProperty('code');
      });
    });

    it('should track error statistics correctly', () => {
      // Generate various errors
      try {
        errorHandler.validateInput(null);
      } catch (error) {
        errorHandler.handleError(error);
      }

      try {
        errorHandler.validateInput({ thought: 123 });
      } catch (error) {
        errorHandler.handleError(error);
      }

      try {
        errorHandler.checkResourceLimits({ memoryUsage: 1000 * 1024 * 1024 });
      } catch (error) {
        errorHandler.handleError(error);
      }

      const stats = errorHandler.getErrorStats();
      
      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(Object.keys(stats.errorsByCode).length).toBeGreaterThan(0);
      expect(stats.recentErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Learning Engine Integration', () => {
    it('should learn from multiple sessions and improve recommendations', async () => {
      // Create multiple successful sessions with analytical pattern
      for (let i = 0; i < 3; i++) {
        const sessionId = learningEngine.startSession();
        
        const thoughts = [
          createMockThought(`分析步骤${i + 1}：识别问题`, 1),
          createMockThought(`分析步骤${i + 1}：寻找原因`, 2),
          createMockThought(`分析步骤${i + 1}：制定解决方案`, 3)
        ];

        thoughts.forEach(thought => {
          thought.quality = thinkingAdvisor.evaluateThoughtQuality(thought, thoughts);
          learningEngine.recordThought(sessionId, thought);
        });

        const pattern = thinkingAdvisor.analyzeThinkingPattern(thoughts);
        learningEngine.recordPattern(sessionId, pattern);

        await learningEngine.endSession(sessionId, {
          type: 'success',
          description: '分析方法成功',
          factors: ['系统性分析', '逻辑清晰'],
          lessons: ['分析方法有效']
        });
      }

      // Test pattern success analysis
      const successRates = learningEngine.analyzePatternSuccess();
      expect(successRates.size).toBeGreaterThan(0);

      // Test strategy prediction
      const prediction = learningEngine.predictOptimalStrategy({
        problemType: 'analysis',
        complexity: 5
      });

      expect(prediction.confidence).toBeGreaterThan(0.5);
      expect(prediction.message).toContain('分析');
    });

    it('should generate comprehensive progress report', async () => {
      // Create sessions with varying quality
      const qualities = [0.3, 0.5, 0.7, 0.8, 0.9];
      
      for (let i = 0; i < qualities.length; i++) {
        const sessionId = learningEngine.startSession();
        
        const thought = createMockThought(`质量测试思维 ${i + 1}`, 1, {
          quality: {
            coherence: qualities[i],
            depth: qualities[i],
            breadth: qualities[i],
            originalityScore: qualities[i],
            relevance: qualities[i]
          }
        });

        learningEngine.recordThought(sessionId, thought);
        
        await learningEngine.endSession(sessionId, {
          type: 'success',
          description: `会话 ${i + 1}`,
          factors: [],
          lessons: []
        });
      }

      const report = learningEngine.getProgressReport();
      
      expect(report.totalSessions).toBe(5);
      expect(report.averageSessionQuality).toBeGreaterThan(0);
      expect(report.improvementTrend).toBeGreaterThan(0); // Should show improvement
      expect(Array.isArray(report.topPatterns)).toBe(true);
      expect(Array.isArray(report.recentInsights)).toBe(true);
    });
  });

  describe('Performance Integration', () => {
    it('should handle large number of thoughts efficiently', async () => {
      const startTime = Date.now();
      
      // Create a large number of thoughts
      const thoughts = Array.from({ length: 100 }, (_, i) =>
        createMockThought(`大量思维测试 ${i + 1}`, i + 1)
      );

      // Process them through the system
      const sessionId = learningEngine.startSession();
      
      for (const thought of thoughts) {
        thought.quality = thinkingAdvisor.evaluateThoughtQuality(thought, thoughts.slice(0, 10)); // Limit context for performance
        learningEngine.recordThought(sessionId, thought);
      }

      const pattern = thinkingAdvisor.analyzeThinkingPattern(thoughts.slice(-10)); // Analyze recent thoughts
      const insights = thinkingAdvisor.generateInsights(thoughts.slice(-20)); // Generate insights from recent thoughts
      const managedThoughts = await memoryManager.manageThoughtHistory(thoughts);

      await learningEngine.endSession(sessionId, {
        type: 'success',
        description: '大量数据处理测试',
        factors: [],
        lessons: []
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Assertions
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(pattern).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
      expect(managedThoughts.length).toBeGreaterThan(0);
      expect(managedThoughts.length).toBeLessThanOrEqual(thoughts.length);
    });
  });
});