import { LearningEngine } from '../learning-engine.js';
import { ThoughtData, ThinkingPattern } from '../types.js';

describe('LearningEngine', () => {
  let learningEngine: LearningEngine;

  beforeEach(() => {
    learningEngine = new LearningEngine();
  });

  const createMockThought = (
    thought: string,
    thoughtNumber: number,
    quality?: any
  ): ThoughtData => ({
    thought,
    thoughtNumber,
    totalThoughts: 5,
    nextThoughtNeeded: true,
    timestamp: Date.now(),
    quality
  });

  const createMockPattern = (patternType: ThinkingPattern['patternType']): ThinkingPattern => ({
    patternType,
    confidence: 0.8,
    characteristics: ['test characteristic'],
    suggestedNextSteps: ['test step'],
    potentialPitfalls: ['test pitfall'],
    recommendedApproach: 'test approach'
  });

  describe('session management', () => {
    it('should start a new session', () => {
      const sessionId = learningEngine.startSession();
      
      expect(typeof sessionId).toBe('string');
      expect(sessionId).toMatch(/^session-/);
    });

    it('should record thoughts in session', () => {
      const sessionId = learningEngine.startSession();
      const thought = createMockThought('Test thought', 1);

      expect(() => learningEngine.recordThought(sessionId, thought)).not.toThrow();
    });

    it('should record patterns in session', () => {
      const sessionId = learningEngine.startSession();
      const pattern = createMockPattern('analytical');

      expect(() => learningEngine.recordPattern(sessionId, pattern)).not.toThrow();
    });

    it('should end session and generate insights', async () => {
      const sessionId = learningEngine.startSession();
      
      // Add some data to the session
      learningEngine.recordThought(sessionId, createMockThought('Test thought', 1));
      learningEngine.recordPattern(sessionId, createMockPattern('analytical'));

      const outcome = {
        type: 'success' as const,
        description: 'Test successful completion',
        factors: ['good analysis'],
        lessons: ['analytical approach works']
      };

      const insights = await learningEngine.endSession(sessionId, outcome);
      
      expect(Array.isArray(insights)).toBe(true);
    });

    it('should handle non-existent session gracefully', async () => {
      const outcome = {
        type: 'success' as const,
        description: 'Test',
        factors: [],
        lessons: []
      };

      await expect(learningEngine.endSession('non-existent', outcome))
        .rejects.toThrow('Session non-existent not found');
    });
  });

  describe('pattern analysis', () => {
    it('should analyze pattern success rates', async () => {
      // Create multiple sessions with different outcomes
      const session1 = learningEngine.startSession();
      learningEngine.recordPattern(session1, createMockPattern('analytical'));
      await learningEngine.endSession(session1, {
        type: 'success',
        description: 'Success',
        factors: [],
        lessons: []
      });

      const session2 = learningEngine.startSession();
      learningEngine.recordPattern(session2, createMockPattern('analytical'));
      await learningEngine.endSession(session2, {
        type: 'failure',
        description: 'Failure',
        factors: [],
        lessons: []
      });

      const session3 = learningEngine.startSession();
      learningEngine.recordPattern(session3, createMockPattern('creative'));
      await learningEngine.endSession(session3, {
        type: 'success',
        description: 'Success',
        factors: [],
        lessons: []
      });

      const successRates = learningEngine.analyzePatternSuccess();
      
      expect(successRates.has('analytical')).toBe(true);
      expect(successRates.has('creative')).toBe(true);
      expect(successRates.get('analytical')).toBe(0.5); // 1 success out of 2
      expect(successRates.get('creative')).toBe(1.0); // 1 success out of 1
    });
  });

  describe('improvement opportunities', () => {
    it('should identify improvement opportunities', async () => {
      // Create sessions with patterns that have low success rates
      for (let i = 0; i < 5; i++) {
        const session = learningEngine.startSession();
        learningEngine.recordPattern(session, createMockPattern('analytical'));
        await learningEngine.endSession(session, {
          type: 'failure',
          description: 'Failed',
          factors: ['poor analysis'],
          lessons: []
        });
      }

      const opportunities = learningEngine.identifyImprovementOpportunities();
      
      expect(Array.isArray(opportunities)).toBe(true);
      expect(opportunities.length).toBeGreaterThan(0);
      
      const lowSuccessRateInsight = opportunities.find(o => 
        o.message.includes('成功率较低')
      );
      expect(lowSuccessRateInsight).toBeDefined();
    });

    it('should identify common pitfalls', async () => {
      // Create multiple failed sessions with common factors
      for (let i = 0; i < 3; i++) {
        const session = learningEngine.startSession();
        await learningEngine.endSession(session, {
          type: 'failure',
          description: 'Failed',
          factors: ['rushed analysis', 'insufficient data'],
          lessons: []
        });
      }

      const opportunities = learningEngine.identifyImprovementOpportunities();
      
      const pitfallInsight = opportunities.find(o => 
        o.message.includes('常见陷阱')
      );
      expect(pitfallInsight).toBeDefined();
    });

    it('should recommend successful strategies', async () => {
      // Create successful sessions with consistent strategies
      for (let i = 0; i < 3; i++) {
        const session = learningEngine.startSession();
        learningEngine.recordPattern(session, createMockPattern('systematic'));
        await learningEngine.endSession(session, {
          type: 'success',
          description: 'Success',
          factors: ['systematic approach'],
          lessons: []
        });
      }

      const opportunities = learningEngine.identifyImprovementOpportunities();
      
      const strategyInsight = opportunities.find(o => 
        o.message.includes('推荐策略')
      );
      expect(strategyInsight).toBeDefined();
    });
  });

  describe('progress tracking', () => {
    it('should generate progress report', async () => {
      // Create some sessions
      const session1 = learningEngine.startSession();
      learningEngine.recordThought(session1, createMockThought('Thought 1', 1, {
        coherence: 0.8, depth: 0.7, breadth: 0.6, originalityScore: 0.5, relevance: 0.9
      }));
      learningEngine.recordPattern(session1, createMockPattern('analytical'));
      await learningEngine.endSession(session1, {
        type: 'success',
        description: 'Success',
        factors: [],
        lessons: []
      });

      const report = learningEngine.getProgressReport();
      
      expect(report).toHaveProperty('totalSessions');
      expect(report).toHaveProperty('averageSessionQuality');
      expect(report).toHaveProperty('improvementTrend');
      expect(report).toHaveProperty('topPatterns');
      expect(report).toHaveProperty('recentInsights');
      
      expect(typeof report.totalSessions).toBe('number');
      expect(typeof report.averageSessionQuality).toBe('number');
      expect(typeof report.improvementTrend).toBe('number');
      expect(Array.isArray(report.topPatterns)).toBe(true);
      expect(Array.isArray(report.recentInsights)).toBe(true);
    });

    it('should calculate improvement trend', async () => {
      // Create sessions with improving quality
      for (let i = 0; i < 10; i++) {
        const session = learningEngine.startSession();
        learningEngine.recordThought(session, createMockThought(`Thought ${i}`, 1, {
          coherence: 0.5 + i * 0.05, // Improving quality
          depth: 0.5 + i * 0.05,
          breadth: 0.5 + i * 0.05,
          originalityScore: 0.5 + i * 0.05,
          relevance: 0.5 + i * 0.05
        }));
        await learningEngine.endSession(session, {
          type: 'success',
          description: 'Success',
          factors: [],
          lessons: []
        });
      }

      const report = learningEngine.getProgressReport();
      
      expect(report.improvementTrend).toBeGreaterThan(0);
    });
  });

  describe('strategy prediction', () => {
    it('should predict optimal strategy', async () => {
      // Create successful sessions with specific patterns
      const session = learningEngine.startSession();
      learningEngine.recordPattern(session, createMockPattern('systematic'));
      await learningEngine.endSession(session, {
        type: 'success',
        description: 'Success with systematic approach',
        factors: [],
        lessons: []
      });

      const context = {
        problemType: 'analysis',
        complexity: 5,
        timeConstraint: 60
      };

      const prediction = learningEngine.predictOptimalStrategy(context);
      
      expect(prediction).toHaveProperty('type');
      expect(prediction).toHaveProperty('message');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('actionable');
      expect(prediction).toHaveProperty('relatedThoughts');
      
      expect(prediction.type).toBe('suggestion');
      expect(typeof prediction.message).toBe('string');
      expect(typeof prediction.confidence).toBe('number');
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    it('should provide default strategy for no history', () => {
      const context = { problemType: 'new' };
      const prediction = learningEngine.predictOptimalStrategy(context);
      
      expect(prediction.message).toContain('系统性方法');
      expect(prediction.confidence).toBe(0.5);
    });
  });

  describe('data export/import', () => {
    it('should export learning data', async () => {
      const session = learningEngine.startSession();
      learningEngine.recordThought(session, createMockThought('Test thought', 1));
      learningEngine.recordPattern(session, createMockPattern('analytical'));
      await learningEngine.endSession(session, {
        type: 'success',
        description: 'Success',
        factors: [],
        lessons: []
      });

      const exportedData = learningEngine.exportLearningData();
      
      expect(exportedData).toHaveProperty('sessions');
      expect(exportedData).toHaveProperty('patterns');
      expect(exportedData).toHaveProperty('metrics');
      
      expect(Array.isArray(exportedData.sessions)).toBe(true);
      expect(Array.isArray(exportedData.patterns)).toBe(true);
      expect(typeof exportedData.metrics).toBe('object');
    });

    it('should import learning data', () => {
      const data = {
        sessions: [],
        patterns: [],
        metrics: {
          totalThoughts: 0,
          averageQuality: 0,
          commonPatterns: [],
          improvementAreas: [],
          successfulStrategies: []
        }
      };

      expect(() => learningEngine.importLearningData(data)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty sessions gracefully', async () => {
      const sessionId = learningEngine.startSession();
      
      const insights = await learningEngine.endSession(sessionId, {
        type: 'success',
        description: 'Empty session',
        factors: [],
        lessons: []
      });

      expect(Array.isArray(insights)).toBe(true);
    });

    it('should handle sessions with no patterns', async () => {
      const sessionId = learningEngine.startSession();
      learningEngine.recordThought(sessionId, createMockThought('Thought without pattern', 1));
      
      const insights = await learningEngine.endSession(sessionId, {
        type: 'success',
        description: 'No patterns',
        factors: [],
        lessons: []
      });

      expect(Array.isArray(insights)).toBe(true);
    });

    it('should handle sessions with no thoughts', async () => {
      const sessionId = learningEngine.startSession();
      learningEngine.recordPattern(sessionId, createMockPattern('analytical'));
      
      const insights = await learningEngine.endSession(sessionId, {
        type: 'success',
        description: 'No thoughts',
        factors: [],
        lessons: []
      });

      expect(Array.isArray(insights)).toBe(true);
    });
  });
});