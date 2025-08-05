import { ThoughtData, ThinkingPattern, ThinkingInsight, ThoughtQualityMetrics } from './types.js';

export class ThinkingAdvisor {
  private patternHistory: Map<string, number> = new Map();
  private successfulPatterns: ThinkingPattern[] = [];

  /**
   * 分析当前思维模式并提供建议
   */
  analyzeThinkingPattern(thoughts: ThoughtData[]): ThinkingPattern {
    if (thoughts.length === 0) {
      return this.getDefaultPattern();
    }

    const recentThoughts = thoughts.slice(-5); // 分析最近5个思维
    const patternType = this.identifyPatternType(recentThoughts);
    const characteristics = this.extractCharacteristics(recentThoughts);
    
    return {
      patternType,
      confidence: this.calculatePatternConfidence(recentThoughts, patternType),
      characteristics,
      suggestedNextSteps: this.generateNextSteps(patternType, recentThoughts),
      potentialPitfalls: this.identifyPitfalls(patternType, recentThoughts),
      recommendedApproach: this.recommendApproach(patternType, recentThoughts)
    };
  }

  /**
   * 评估思维质量
   */
  evaluateThoughtQuality(thought: ThoughtData, context: ThoughtData[]): ThoughtQualityMetrics {
    const coherence = this.calculateCoherence(thought, context);
    const depth = this.calculateDepth(thought);
    const breadth = this.calculateBreadth(thought, context);
    const originality = this.calculateOriginality(thought, context);
    const relevance = this.calculateRelevance(thought, context);

    return {
      coherence,
      depth,
      breadth,
      originalityScore: originality,
      relevance
    };
  }

  /**
   * 生成思维洞察
   */
  generateInsights(thoughts: ThoughtData[]): ThinkingInsight[] {
    const insights: ThinkingInsight[] = [];

    // 检测重复模式
    const repetitivePatterns = this.detectRepetitivePatterns(thoughts);
    if (repetitivePatterns.length > 0) {
      insights.push({
        type: 'warning',
        message: `检测到重复思维模式，建议尝试不同角度: ${repetitivePatterns.join(', ')}`,
        confidence: 0.8,
        actionable: true,
        relatedThoughts: this.findRelatedThoughts(thoughts, repetitivePatterns)
      });
    }

    // 检测思维深度不足
    const shallowThoughts = thoughts.filter(t => t.quality && t.quality.depth < 0.3);
    if (shallowThoughts.length > thoughts.length * 0.4) {
      insights.push({
        type: 'suggestion',
        message: '建议深入分析关键问题，增加思考深度',
        confidence: 0.7,
        actionable: true,
        relatedThoughts: shallowThoughts.map(t => t.thoughtNumber)
      });
    }

    // 检测分支机会
    const branchOpportunities = this.identifyBranchOpportunities(thoughts);
    if (branchOpportunities.length > 0) {
      insights.push({
        type: 'suggestion',
        message: `发现可以分支探索的思路: ${branchOpportunities.join(', ')}`,
        confidence: 0.6,
        actionable: true,
        relatedThoughts: []
      });
    }

    return insights;
  }

  private identifyPatternType(thoughts: ThoughtData[]): ThinkingPattern['patternType'] {
    const revisionCount = thoughts.filter(t => t.isRevision).length;
    const branchCount = thoughts.filter(t => t.branchFromThought).length;
    const avgThoughtLength = thoughts.reduce((sum, t) => sum + t.thought.length, 0) / thoughts.length;

    if (revisionCount > thoughts.length * 0.3) return 'iterative';
    if (branchCount > 0) return 'exploratory';
    if (avgThoughtLength > 200) return 'analytical';
    if (this.containsCreativeKeywords(thoughts)) return 'creative';
    return 'systematic';
  }

  private containsCreativeKeywords(thoughts: ThoughtData[]): boolean {
    const creativeKeywords = ['创新', '想象', '可能', '如果', '假设', '创意', '灵感', '突破'];
    const allText = thoughts.map(t => t.thought).join(' ').toLowerCase();
    return creativeKeywords.some(keyword => allText.includes(keyword));
  }

  private calculatePatternConfidence(thoughts: ThoughtData[], patternType: string): number {
    // 基于思维一致性和模式匹配度计算置信度
    const consistency = this.calculateConsistency(thoughts);
    const patternMatch = this.calculatePatternMatch(thoughts, patternType);
    return (consistency + patternMatch) / 2;
  }

  private calculateConsistency(thoughts: ThoughtData[]): number {
    if (thoughts.length < 2) return 1.0;
    
    let consistencyScore = 0;
    for (let i = 1; i < thoughts.length; i++) {
      const similarity = this.calculateSimilarity(thoughts[i-1].thought, thoughts[i].thought);
      consistencyScore += similarity;
    }
    return consistencyScore / (thoughts.length - 1);
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // 简单的文本相似度计算
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    return intersection.length / union.length;
  }

  private calculatePatternMatch(thoughts: ThoughtData[], patternType: string): number {
    // 根据模式类型计算匹配度
    switch (patternType) {
      case 'analytical':
        return this.countAnalyticalIndicators(thoughts) / thoughts.length;
      case 'creative':
        return this.countCreativeIndicators(thoughts) / thoughts.length;
      case 'systematic':
        return this.countSystematicIndicators(thoughts) / thoughts.length;
      default:
        return 0.5;
    }
  }

  private countAnalyticalIndicators(thoughts: ThoughtData[]): number {
    const indicators = ['分析', '因为', '所以', '原因', '结果', '逻辑', '推理'];
    return thoughts.reduce((count, thought) => {
      const text = thought.thought.toLowerCase();
      return count + indicators.filter(indicator => text.includes(indicator)).length;
    }, 0);
  }

  private countCreativeIndicators(thoughts: ThoughtData[]): number {
    const indicators = ['创新', '想象', '可能', '创意', '灵感', '突破', '新颖'];
    return thoughts.reduce((count, thought) => {
      const text = thought.thought.toLowerCase();
      return count + indicators.filter(indicator => text.includes(indicator)).length;
    }, 0);
  }

  private countSystematicIndicators(thoughts: ThoughtData[]): number {
    const indicators = ['步骤', '首先', '然后', '接下来', '最后', '系统', '方法'];
    return thoughts.reduce((count, thought) => {
      const text = thought.thought.toLowerCase();
      return count + indicators.filter(indicator => text.includes(indicator)).length;
    }, 0);
  }

  private extractCharacteristics(thoughts: ThoughtData[]): string[] {
    const characteristics: string[] = [];
    
    if (thoughts.some(t => t.isRevision)) {
      characteristics.push('具有反思性');
    }
    
    if (thoughts.some(t => t.branchFromThought)) {
      characteristics.push('探索多个方向');
    }
    
    const avgLength = thoughts.reduce((sum, t) => sum + t.thought.length, 0) / thoughts.length;
    if (avgLength > 150) {
      characteristics.push('思考详细深入');
    }
    
    return characteristics;
  }

  private generateNextSteps(patternType: ThinkingPattern['patternType'], _thoughts: ThoughtData[]): string[] {
    const baseSteps: Record<string, string[]> = {
      analytical: [
        '深入分析关键因素',
        '寻找因果关系',
        '验证假设',
        '考虑反例'
      ],
      creative: [
        '尝试头脑风暴',
        '寻找意外连接',
        '挑战现有假设',
        '探索极端情况'
      ],
      systematic: [
        '制定详细计划',
        '分解子问题',
        '建立检查点',
        '评估进展'
      ],
      exploratory: [
        '继续探索分支',
        '比较不同路径',
        '寻找共同点',
        '评估各选项'
      ],
      iterative: [
        '总结当前发现',
        '识别改进点',
        '制定下一轮计划',
        '验证修正结果'
      ]
    };

    return baseSteps[patternType] || baseSteps.systematic;
  }

  private identifyPitfalls(patternType: ThinkingPattern['patternType'], _thoughts: ThoughtData[]): string[] {
    const basePitfalls: Record<string, string[]> = {
      analytical: ['过度分析导致行动瘫痪', '忽视直觉和创意'],
      creative: ['缺乏实际可行性考虑', '思维过于发散'],
      systematic: ['过于僵化缺乏灵活性', '忽视意外机会'],
      exploratory: ['分支过多缺乏聚焦', '难以做出决策'],
      iterative: ['陷入无限循环', '缺乏突破性进展']
    };

    return basePitfalls[patternType] || [];
  }

  private recommendApproach(patternType: ThinkingPattern['patternType'], _thoughts: ThoughtData[]): string {
    const recommendations: Record<string, string> = {
      analytical: '继续深入分析，但注意设定分析边界，避免过度分析',
      creative: '保持创意思维，同时考虑实际约束和可行性',
      systematic: '维持系统性方法，但保持对新信息的开放性',
      exploratory: '适当收敛分支，开始评估和比较不同选项',
      iterative: '总结当前迭代成果，考虑是否需要改变方向'
    };

    return recommendations[patternType] || '保持当前思维方式，注意平衡深度和广度';
  }

  private calculateCoherence(thought: ThoughtData, context: ThoughtData[]): number {
    if (context.length === 0) return 1.0;
    
    const recentContext = context.slice(-3);
    let coherenceScore = 0;
    
    for (const contextThought of recentContext) {
      coherenceScore += this.calculateSimilarity(thought.thought, contextThought.thought);
    }
    
    return coherenceScore / recentContext.length;
  }

  private calculateDepth(thought: ThoughtData): number {
    const depthIndicators = ['因为', '由于', '导致', '影响', '原因', '结果', '深入', '详细'];
    const text = thought.thought.toLowerCase();
    const indicatorCount = depthIndicators.filter(indicator => text.includes(indicator)).length;
    const lengthScore = Math.min(thought.thought.length / 200, 1);
    
    return (indicatorCount * 0.3 + lengthScore * 0.7);
  }

  private calculateBreadth(thought: ThoughtData, context: ThoughtData[]): number {
    const breadthIndicators = ['另外', '此外', '同时', '另一方面', '不同', '多种', '各种'];
    const text = thought.thought.toLowerCase();
    const indicatorCount = breadthIndicators.filter(indicator => text.includes(indicator)).length;
    
    // 检查是否引入新概念
    const newConcepts = this.countNewConcepts(thought, context);
    
    return Math.min((indicatorCount * 0.4 + newConcepts * 0.6) / 3, 1);
  }

  private calculateOriginality(thought: ThoughtData, context: ThoughtData[]): number {
    if (context.length === 0) return 1.0;
    
    let maxSimilarity = 0;
    for (const contextThought of context) {
      const similarity = this.calculateSimilarity(thought.thought, contextThought.thought);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    
    return 1 - maxSimilarity;
  }

  private calculateRelevance(thought: ThoughtData, context: ThoughtData[]): number {
    if (context.length === 0) return 1.0;
    
    // 基于与上下文的相关性计算
    const recentContext = context.slice(-2);
    let relevanceScore = 0;
    
    for (const contextThought of recentContext) {
      relevanceScore += this.calculateSimilarity(thought.thought, contextThought.thought);
    }
    
    return relevanceScore / recentContext.length;
  }

  private countNewConcepts(thought: ThoughtData, context: ThoughtData[]): number {
    const thoughtWords = new Set(thought.thought.toLowerCase().split(/\s+/));
    const contextWords = new Set();
    
    context.forEach(t => {
      t.thought.toLowerCase().split(/\s+/).forEach(word => contextWords.add(word));
    });
    
    let newWords = 0;
    thoughtWords.forEach(word => {
      if (!contextWords.has(word) && word.length > 3) {
        newWords++;
      }
    });
    
    return newWords;
  }

  private detectRepetitivePatterns(thoughts: ThoughtData[]): string[] {
    const patterns: string[] = [];
    const wordFreq = new Map<string, number>();
    
    thoughts.forEach(thought => {
      const words = thought.thought.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) {
          wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }
      });
    });
    
    wordFreq.forEach((count, word) => {
      if (count > thoughts.length * 0.3) {
        patterns.push(word);
      }
    });
    
    return patterns;
  }

  private findRelatedThoughts(thoughts: ThoughtData[], patterns: string[]): number[] {
    return thoughts
      .filter(thought => 
        patterns.some(pattern => 
          thought.thought.toLowerCase().includes(pattern)
        )
      )
      .map(thought => thought.thoughtNumber);
  }

  private identifyBranchOpportunities(thoughts: ThoughtData[]): string[] {
    const opportunities: string[] = [];
    const branchKeywords = ['或者', '另一种', '也可以', '可能', '假如', '如果'];
    
    thoughts.forEach(thought => {
      const text = thought.thought.toLowerCase();
      branchKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          opportunities.push(`思维 ${thought.thoughtNumber}: ${keyword}`);
        }
      });
    });
    
    return opportunities;
  }

  private getDefaultPattern(): ThinkingPattern {
    return {
      patternType: 'systematic',
      confidence: 0.5,
      characteristics: ['开始阶段'],
      suggestedNextSteps: ['明确问题', '收集信息', '制定方法'],
      potentialPitfalls: ['目标不明确', '信息不足'],
      recommendedApproach: '先明确问题和目标，然后系统性地分析'
    };
  }
}