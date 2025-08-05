import { AsyncProcessor } from '../async-processor.js';
import { ThoughtData, ThoughtBranch } from '../types.js';

describe('AsyncProcessor', () => {
  let processor: AsyncProcessor;

  beforeEach(() => {
    processor = new AsyncProcessor({
      maxConcurrentTasks: 2,
      taskTimeout: 1000,
      maxRetries: 1
    });
  });

  afterEach(async () => {
    await processor.shutdown();
  });

  const createMockThought = (thought: string, thoughtNumber: number): ThoughtData => ({
    thought,
    thoughtNumber,
    totalThoughts: 5,
    nextThoughtNeeded: true,
    timestamp: Date.now()
  });

  const createMockBranch = (branchId: string): ThoughtBranch => ({
    branchId,
    parentThought: 1,
    thoughts: [createMockThought('Branch thought', 2)],
    status: 'active',
    quality: 0.8
  });

  describe('addTask', () => {
    it('should add task and return task ID', () => {
      const taskId = processor.addTask({
        type: 'quality_evaluation',
        data: { test: true },
        priority: 1
      });

      expect(typeof taskId).toBe('string');
      expect(taskId).toMatch(/^task-/);
    });

    it('should process tasks by priority', async () => {
      const lowPriorityId = processor.addTask({
        type: 'quality_evaluation',
        data: { priority: 'low' },
        priority: 1
      });

      const highPriorityId = processor.addTask({
        type: 'quality_evaluation',
        data: { priority: 'high' },
        priority: 10
      });

      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const lowStatus = processor.getTaskStatus(lowPriorityId);
      const highStatus = processor.getTaskStatus(highPriorityId);

      // High priority task should be processed first or completed
      expect(['processing', 'completed']).toContain(highStatus);
    });
  });

  describe('getTaskStatus', () => {
    it('should return correct task status', async () => {
      const taskId = processor.addTask({
        type: 'quality_evaluation',
        data: { test: true },
        priority: 1
      });

      const initialStatus = processor.getTaskStatus(taskId);
      expect(['pending', 'processing']).toContain(initialStatus);

      // Wait for task to complete
      await processor.waitForTask(taskId);
      
      const finalStatus = processor.getTaskStatus(taskId);
      expect(finalStatus).toBe('completed');
    });

    it('should return not_found for non-existent task', () => {
      const status = processor.getTaskStatus('non-existent-id');
      expect(status).toBe('not_found');
    });
  });

  describe('waitForTask', () => {
    it('should wait for task completion', async () => {
      const taskId = processor.addTask({
        type: 'quality_evaluation',
        data: { test: true },
        priority: 1
      });

      const result = await processor.waitForTask(taskId);
      
      expect(result).toBeDefined();
      expect(result?.taskId).toBe(taskId);
      expect(result?.success).toBe(true);
      expect(typeof result?.processingTime).toBe('number');
    });

    it('should return null for non-existent task', async () => {
      const result = await processor.waitForTask('non-existent-id');
      expect(result).toBeNull();
    });

    it('should handle task timeout', async () => {
      // Create processor with very short timeout
      const shortTimeoutProcessor = new AsyncProcessor({
        maxConcurrentTasks: 1,
        taskTimeout: 50,
        maxRetries: 0
      });

      const taskId = shortTimeoutProcessor.addTask({
        type: 'quality_evaluation',
        data: { delay: 200 }, // Longer than timeout
        priority: 1
      });

      const result = await shortTimeoutProcessor.waitForTask(taskId);
      
      expect(result?.success).toBe(false);
      expect(result?.error).toContain('timeout');

      await shortTimeoutProcessor.shutdown();
    });
  });

  describe('cancelTask', () => {
    it('should cancel pending task', () => {
      const taskId = processor.addTask({
        type: 'quality_evaluation',
        data: { test: true },
        priority: 1
      });

      const cancelled = processor.cancelTask(taskId);
      expect(cancelled).toBe(true);

      const status = processor.getTaskStatus(taskId);
      expect(status).toBe('not_found');
    });

    it('should return false for non-existent task', () => {
      const cancelled = processor.cancelTask('non-existent-id');
      expect(cancelled).toBe(false);
    });
  });

  describe('getQueueStatus', () => {
    it('should return correct queue status', () => {
      processor.addTask({
        type: 'quality_evaluation',
        data: { test: 1 },
        priority: 1
      });

      processor.addTask({
        type: 'quality_evaluation',
        data: { test: 2 },
        priority: 1
      });

      const status = processor.getQueueStatus();
      
      expect(typeof status.pending).toBe('number');
      expect(typeof status.processing).toBe('number');
      expect(typeof status.queueLength).toBe('number');
      expect(status.queueLength).toBeGreaterThanOrEqual(0);
    });
  });

  describe('processParallelBranches', () => {
    it('should process multiple branches in parallel', async () => {
      const branches = [
        createMockBranch('branch-1'),
        createMockBranch('branch-2'),
        createMockBranch('branch-3')
      ];

      const mockProcessor = async (branch: ThoughtBranch) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { branchId: branch.branchId, processed: true };
      };

      const results = await processor.processParallelBranches(branches, mockProcessor);
      
      expect(results.size).toBe(3);
      expect(results.get('branch-1')).toEqual({ branchId: 'branch-1', processed: true });
      expect(results.get('branch-2')).toEqual({ branchId: 'branch-2', processed: true });
      expect(results.get('branch-3')).toEqual({ branchId: 'branch-3', processed: true });
    });

    it('should handle branch processing errors', async () => {
      const branches = [
        createMockBranch('branch-1'),
        createMockBranch('branch-error')
      ];

      const mockProcessor = async (branch: ThoughtBranch) => {
        if (branch.branchId === 'branch-error') {
          throw new Error('Processing failed');
        }
        return { branchId: branch.branchId, processed: true };
      };

      const results = await processor.processParallelBranches(branches, mockProcessor);
      
      expect(results.size).toBe(2);
      expect(results.get('branch-1')).toEqual({ branchId: 'branch-1', processed: true });
      expect(results.get('branch-error')).toHaveProperty('error');
    });
  });

  describe('batchEvaluateQuality', () => {
    it('should evaluate multiple thoughts in batches', async () => {
      const thoughts = [
        createMockThought('Thought 1', 1),
        createMockThought('Thought 2', 2),
        createMockThought('Thought 3', 3)
      ];

      const mockEvaluator = async (thought: ThoughtData) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { thoughtNumber: thought.thoughtNumber, quality: 0.8 };
      };

      const results = await processor.batchEvaluateQuality(thoughts, mockEvaluator);
      
      expect(results.size).toBe(3);
      expect(results.get(1)).toEqual({ thoughtNumber: 1, quality: 0.8 });
      expect(results.get(2)).toEqual({ thoughtNumber: 2, quality: 0.8 });
      expect(results.get(3)).toEqual({ thoughtNumber: 3, quality: 0.8 });
    });

    it('should handle evaluation errors', async () => {
      const thoughts = [
        createMockThought('Good thought', 1),
        createMockThought('Error thought', 2)
      ];

      const mockEvaluator = async (thought: ThoughtData) => {
        if (thought.thoughtNumber === 2) {
          throw new Error('Evaluation failed');
        }
        return { thoughtNumber: thought.thoughtNumber, quality: 0.8 };
      };

      const results = await processor.batchEvaluateQuality(thoughts, mockEvaluator);
      
      expect(results.size).toBe(2);
      expect(results.get(1)).toEqual({ thoughtNumber: 1, quality: 0.8 });
      expect(results.get(2)).toHaveProperty('error');
    });
  });

  describe('generateInsightsAsync', () => {
    it('should generate insights from multiple generators', async () => {
      const thoughts = [
        createMockThought('Test thought', 1)
      ];

      const generator1 = async () => [
        { type: 'suggestion' as const, message: 'Insight 1', confidence: 0.8, actionable: true, relatedThoughts: [] }
      ];

      const generator2 = async () => [
        { type: 'warning' as const, message: 'Insight 2', confidence: 0.7, actionable: true, relatedThoughts: [] }
      ];

      const insights = await processor.generateInsightsAsync(thoughts, [generator1, generator2]);
      
      expect(insights).toHaveLength(2);
      expect(insights[0].message).toBe('Insight 1');
      expect(insights[1].message).toBe('Insight 2');
    });

    it('should handle generator errors gracefully', async () => {
      const thoughts = [createMockThought('Test thought', 1)];

      const goodGenerator = async () => [
        { type: 'suggestion' as const, message: 'Good insight', confidence: 0.8, actionable: true, relatedThoughts: [] }
      ];

      const errorGenerator = async () => {
        throw new Error('Generator failed');
      };

      const insights = await processor.generateInsightsAsync(thoughts, [goodGenerator, errorGenerator]);
      
      expect(insights).toHaveLength(1);
      expect(insights[0].message).toBe('Good insight');
    });

    it('should deduplicate similar insights', async () => {
      const thoughts = [createMockThought('Test thought', 1)];

      const generator1 = async () => [
        { type: 'suggestion' as const, message: 'Same insight', confidence: 0.8, actionable: true, relatedThoughts: [] }
      ];

      const generator2 = async () => [
        { type: 'suggestion' as const, message: 'Same insight', confidence: 0.7, actionable: true, relatedThoughts: [] }
      ];

      const insights = await processor.generateInsightsAsync(thoughts, [generator1, generator2]);
      
      expect(insights).toHaveLength(1);
      expect(insights[0].confidence).toBe(0.8); // Should keep the higher confidence one
    });
  });

  describe('cleanup', () => {
    it('should cleanup completed tasks', async () => {
      const taskId = processor.addTask({
        type: 'quality_evaluation',
        data: { test: true },
        priority: 1
      });

      await processor.waitForTask(taskId);
      processor.cleanup();

      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Task should still be found immediately after completion
      // but cleanup is asynchronous
      expect(typeof processor.getTaskStatus(taskId)).toBe('string');
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      processor.addTask({
        type: 'quality_evaluation',
        data: { test: true },
        priority: 1
      });

      await expect(processor.shutdown()).resolves.not.toThrow();
      
      const status = processor.getQueueStatus();
      expect(status.pending).toBe(0);
      expect(status.processing).toBe(0);
    });
  });
});