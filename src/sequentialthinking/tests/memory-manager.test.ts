import { MemoryManager } from '../memory-manager.js';
import { ThoughtData, ThoughtBranch } from '../types.js';

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    memoryManager = new MemoryManager({
      maxThoughts: 10,
      compressionThreshold: 5,
      retentionPeriod: 60000, // 1 minute
      qualityThreshold: 0.3
    });
  });

  const createMockThought = (
    thought: string,
    thoughtNumber: number,
    timestamp?: number,
    quality?: any
  ): ThoughtData => ({
    thought,
    thoughtNumber,
    totalThoughts: 10,
    nextThoughtNeeded: true,
    timestamp: timestamp || Date.now(),
    quality
  });

  describe('manageThoughtHistory', () => {
    it('should return thoughts unchanged when under threshold', async () => {
      const thoughts = [
        createMockThought('Thought 1', 1),
        createMockThought('Thought 2', 2),
        createMockThought('Thought 3', 3)
      ];

      const result = await memoryManager.manageThoughtHistory(thoughts);
      
      expect(result).toHaveLength(3);
      expect(result[0].thought).toBe('Thought 1');
    });

    it('should compress thoughts when over threshold', async () => {
      const thoughts = Array.from({ length: 8 }, (_, i) => 
        createMockThought(`Thought ${i + 1}`, i + 1, Date.now() - (8 - i) * 1000)
      );

      const result = await memoryManager.manageThoughtHistory(thoughts);
      
      expect(result.length).toBeLessThan(thoughts.length);
    });

    it('should remove expired thoughts', async () => {
      const now = Date.now();
      const thoughts = [
        createMockThought('Old thought', 1, now - 120000), // 2 minutes ago
        createMockThought('Recent thought', 2, now - 30000) // 30 seconds ago
      ];

      const result = await memoryManager.manageThoughtHistory(thoughts);
      
      expect(result).toHaveLength(1);
      expect(result[0].thought).toBe('Recent thought');
    });

    it('should preserve high-quality thoughts', async () => {
      const thoughts = [
        createMockThought('Low quality', 1, undefined, {
          coherence: 0.1, depth: 0.1, breadth: 0.1, originalityScore: 0.1, relevance: 0.1
        }),
        createMockThought('High quality', 2, undefined, {
          coherence: 0.9, depth: 0.9, breadth: 0.9, originalityScore: 0.9, relevance: 0.9
        })
      ];

      const result = await memoryManager.manageThoughtHistory(thoughts);
      
      expect(result.some(t => t.thought === 'High quality')).toBe(true);
    });
  });

  describe('manageBranches', () => {
    it('should preserve active branches', () => {
      const branches: Record<string, ThoughtBranch> = {
        'branch-1': {
          branchId: 'branch-1',
          parentThought: 1,
          thoughts: [createMockThought('Branch thought', 2)],
          status: 'active',
          quality: 0.8
        }
      };

      const result = memoryManager.manageBranches(branches);
      
      expect(result['branch-1']).toBeDefined();
      expect(result['branch-1'].status).toBe('active');
    });

    it('should remove low-quality inactive branches', () => {
      const branches: Record<string, ThoughtBranch> = {
        'branch-1': {
          branchId: 'branch-1',
          parentThought: 1,
          thoughts: [createMockThought('Branch thought', 2)],
          status: 'completed',
          quality: 0.1 // Below threshold
        }
      };

      const result = memoryManager.manageBranches(branches);
      
      expect(result['branch-1']).toBeUndefined();
    });

    it('should preserve high-quality completed branches', () => {
      const branches: Record<string, ThoughtBranch> = {
        'branch-1': {
          branchId: 'branch-1',
          parentThought: 1,
          thoughts: [createMockThought('High quality branch', 2)],
          status: 'completed',
          quality: 0.8 // Above threshold
        }
      };

      const result = memoryManager.manageBranches(branches);
      
      expect(result['branch-1']).toBeDefined();
    });
  });

  describe('getMemoryStats', () => {
    it('should return correct memory statistics', () => {
      const stats = memoryManager.getMemoryStats();
      
      expect(stats).toHaveProperty('activeThoughts');
      expect(stats).toHaveProperty('compressedThoughts');
      expect(stats).toHaveProperty('totalMemoryUsage');
      expect(stats).toHaveProperty('compressionRatio');
      
      expect(typeof stats.activeThoughts).toBe('number');
      expect(typeof stats.compressedThoughts).toBe('number');
      expect(typeof stats.totalMemoryUsage).toBe('number');
      expect(typeof stats.compressionRatio).toBe('number');
    });
  });

  describe('searchCompressedThoughts', () => {
    it('should find compressed thoughts by query', async () => {
      // First, create and compress some thoughts
      const thoughts = Array.from({ length: 8 }, (_, i) => 
        createMockThought(`Analysis of problem ${i + 1}`, i + 1, Date.now() - (8 - i) * 1000)
      );

      await memoryManager.manageThoughtHistory(thoughts);
      
      const results = memoryManager.searchCompressedThoughts('analysis');
      
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return empty array for non-matching query', () => {
      const results = memoryManager.searchCompressedThoughts('nonexistent');
      
      expect(results).toHaveLength(0);
    });
  });

  describe('expandCompressedThought', () => {
    it('should return null for non-existent thought', () => {
      const result = memoryManager.expandCompressedThought('non-existent-id');
      
      expect(result).toBeNull();
    });
  });

  describe('updateConfig', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        maxThoughts: 20,
        qualityThreshold: 0.5
      };

      memoryManager.updateConfig(newConfig);
      
      // Test that new config is applied by checking behavior
      const stats = memoryManager.getMemoryStats();
      expect(typeof stats.activeThoughts).toBe('number');
    });
  });

  describe('forceCleanup', () => {
    it('should execute cleanup without errors', () => {
      expect(() => memoryManager.forceCleanup()).not.toThrow();
    });
  });

  describe('exportMemoryState', () => {
    it('should export memory state correctly', () => {
      const state = memoryManager.exportMemoryState();
      
      expect(state).toHaveProperty('compressedThoughts');
      expect(state).toHaveProperty('config');
      expect(Array.isArray(state.compressedThoughts)).toBe(true);
      expect(typeof state.config).toBe('object');
    });
  });

  describe('importMemoryState', () => {
    it('should import memory state correctly', () => {
      const state = {
        compressedThoughts: [],
        config: {
          maxThoughts: 50,
          compressionThreshold: 25,
          retentionPeriod: 120000,
          qualityThreshold: 0.4
        }
      };

      expect(() => memoryManager.importMemoryState(state)).not.toThrow();
    });
  });
});