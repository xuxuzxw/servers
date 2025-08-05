import { ThinkingAdvisor } from '../thinking-advisor.js';
import { ThoughtData } from '../types.js';

describe('ThinkingAdvisor', () => {
  let advisor: ThinkingAdvisor;

  beforeEach(() => {
    advisor = new ThinkingAdvisor();
  });

  const createMockThought = (
    thought: string,
    thoughtNumber: number,
    options: Partial<ThoughtData> = {}
  ): ThoughtData => ({
    thought,
    thoughtNumber,
    totalThoughts: 5,
    nextThoughtNeeded: true,
    timestamp: Date.now(),
    ...options
  });

  describe('analyzeThinkingPattern', () => {
    it('should return default pattern for empty thoughts', () => {
      const pattern = advisor.analyzeThinkingPattern([]);
      
      expect(pattern.patternType).toBe('systematic');
      expect(pattern.confidence).toBe(0.5);
      expect(pattern.characteristics).toContain('开始阶段');
    });

    it('should identify analytical pattern', () => {
      const thoughts = [
        createMockThought('我需要分析这个问题的原因', 1),
        createMockThought('通过逻辑推理，我发现因为A所以B', 2),
        createMockThought('让我深入分析各个因素的影响', 3)
      ];

      const pattern = advisor.analyzeThinkingPattern(thoughts);
      
      expect(pattern.patternType).toBe('analytical');
      expect(pattern.confidence).toBeGreaterThan(0);
      expect(pattern.suggestedNextSteps).toContain('深入分析关键因素');
    });

    it('should identify creative pattern', () => {
      const thoughts = [
        createMockThought('让我想象一个创新的解决方案', 1),
        createMockThought('如果我们突破传统思维', 2),
        createMockThought('这个创意可能带来灵感', 3)
      ];

      const pattern = advisor.analyzeThinkingPattern(thoughts);
      
      expect(pattern.patternType).toBe('creative');
      expect(pattern.suggestedNextSteps).toContain('尝试头脑风暴');
    });

    it('should identify iterative pattern', () => {
      const thoughts = [
        createMockThought('第一次尝试', 1),
        createMockThought('修正之前的想法', 2, { isRevision: true, revisesThought: 1 }),
        createMockThought('再次修正', 3, { isRevision: true, revisesThought: 2 })
      ];

      const pattern = advisor.analyzeThinkingPattern(thoughts);
      
      expect(pattern.patternType).toBe('iterative');
      expect(pattern.characteristics).toContain('具有反思性');
    });

    it('should identify exploratory pattern', () => {
      const thoughts = [
        createMockThought('主要思路', 1),
        createMockThought('分支探索A', 2, { branchFromThought: 1, branchId: 'branch-a' }),
        createMockThought('分支探索B', 3, { branchFromThought: 1, branchId: 'branch-b' })
      ];

      const pattern = advisor.analyzeThinkingPattern(thoughts);
      
      expect(pattern.patternType).toBe('exploratory');
      expect(pattern.characteristics).toContain('探索多个方向');
    });
  });

  describe('evaluateThoughtQuality', () => {
    it('should evaluate thought quality correctly', () => {
      const thought = createMockThought('这是一个深入分析问题的详细思考过程，我需要考虑多个方面', 1);
      const context = [
        createMockThought('相关的背景思考', 0)
      ];

      const quality = advisor.evaluateThoughtQuality(thought, context);

      expect(quality.coherence).toBeGreaterThanOrEqual(0);
      expect(quality.coherence).toBeLessThanOrEqual(1);
      expect(quality.depth).toBeGreaterThanOrEqual(0);
      expect(quality.depth).toBeLessThanOrEqual(1);
      expect(quality.breadth).toBeGreaterThanOrEqual(0);
      expect(quality.breadth).toBeLessThanOrEqual(1);
      expect(quality.originalityScore).toBeGreaterThanOrEqual(0);
      expect(quality.originalityScore).toBeLessThanOrEqual(1);
      expect(quality.relevance).toBeGreaterThanOrEqual(0);
      expect(quality.relevance).toBeLessThanOrEqual(1);
    });

    it('should give high coherence for similar thoughts', () => {
      const thought = createMockThought('分析问题的解决方案', 2);
      const context = [
        createMockThought('分析问题的根本原因', 1)
      ];

      const quality = advisor.evaluateThoughtQuality(thought, context);
      
      expect(quality.coherence).toBeGreaterThan(0.3);
    });

    it('should give high originality for unique thoughts', () => {
      const thought = createMockThought('完全不同的独特想法', 2);
      const context = [
        createMockThought('常规的分析方法', 1)
      ];

      const quality = advisor.evaluateThoughtQuality(thought, context);
      
      expect(quality.originalityScore).toBeGreaterThan(0.5);
    });
  });

  describe('generateInsights', () => {
    it('should detect repetitive patterns', () => {
      const thoughts = [
        createMockThought('分析问题分析问题', 1),
        createMockThought('继续分析问题', 2),
        createMockThought('深入分析问题', 3)
      ];

      const insights = advisor.generateInsights(thoughts);
      
      const repetitiveInsight = insights.find(i => i.type === 'warning' && i.message.includes('重复思维模式'));
      expect(repetitiveInsight).toBeDefined();
    });

    it('should suggest depth improvement for shallow thoughts', () => {
      const thoughts = [
        createMockThought('好', 1, { 
          quality: { coherence: 0.5, depth: 0.1, breadth: 0.5, originalityScore: 0.5, relevance: 0.5 }
        }),
        createMockThought('不错', 2, { 
          quality: { coherence: 0.5, depth: 0.2, breadth: 0.5, originalityScore: 0.5, relevance: 0.5 }
        }),
        createMockThought('可以', 3, { 
          quality: { coherence: 0.5, depth: 0.1, breadth: 0.5, originalityScore: 0.5, relevance: 0.5 }
        })
      ];

      const insights = advisor.generateInsights(thoughts);
      
      const depthInsight = insights.find(i => i.type === 'suggestion' && i.message.includes('增加思考深度'));
      expect(depthInsight).toBeDefined();
    });

    it('should identify branch opportunities', () => {
      const thoughts = [
        createMockThought('我们可以考虑方案A，或者也可以尝试方案B', 1),
        createMockThought('如果采用不同的方法', 2)
      ];

      const insights = advisor.generateInsights(thoughts);
      
      const branchInsight = insights.find(i => i.type === 'suggestion' && i.message.includes('分支探索'));
      expect(branchInsight).toBeDefined();
    });

    it('should return empty insights for high-quality thoughts', () => {
      const thoughts = [
        createMockThought('高质量的独特分析', 1, {
          quality: { coherence: 0.9, depth: 0.8, breadth: 0.7, originalityScore: 0.8, relevance: 0.9 }
        })
      ];

      const insights = advisor.generateInsights(thoughts);
      
      expect(insights.length).toBe(0);
    });
  });

  describe('pattern confidence calculation', () => {
    it('should have higher confidence for consistent patterns', () => {
      const analyticalThoughts = [
        createMockThought('分析原因：因为A所以B', 1),
        createMockThought('逻辑推理：结果表明C', 2),
        createMockThought('深入分析：影响因素包括D', 3)
      ];

      const pattern = advisor.analyzeThinkingPattern(analyticalThoughts);
      
      expect(pattern.confidence).toBeGreaterThan(0.6);
    });

    it('should have lower confidence for mixed patterns', () => {
      const mixedThoughts = [
        createMockThought('分析问题', 1),
        createMockThought('创意想法', 2),
        createMockThought('系统方法', 3)
      ];

      const pattern = advisor.analyzeThinkingPattern(mixedThoughts);
      
      expect(pattern.confidence).toBeLessThan(0.8);
    });
  });
});