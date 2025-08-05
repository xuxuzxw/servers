import { ThoughtData, CompressedThought, MemoryConfig, ThoughtBranch } from './types.js';

export class MemoryManager {
  private config: MemoryConfig;
  private compressedThoughts: CompressedThought[] = [];
  private compressionQueue: ThoughtData[] = [];

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      maxThoughts: config.maxThoughts || 100,
      compressionThreshold: config.compressionThreshold || 50,
      retentionPeriod: config.retentionPeriod || 24 * 60 * 60 * 1000, // 24小时
      qualityThreshold: config.qualityThreshold || 0.3
    };
  }

  /**
   * 管理思维历史，执行清理和压缩
   */
  async manageThoughtHistory(thoughts: ThoughtData[]): Promise<ThoughtData[]> {
    // 1. 清理过期思维
    const validThoughts = this.cleanupExpiredThoughts(thoughts);
    
    // 2. 检查是否需要压缩
    if (validThoughts.length > this.config.compressionThreshold) {
      await this.compressOldThoughts(validThoughts);
      return this.getActiveThoughts(validThoughts);
    }
    
    // 3. 清理低质量思维
    return this.cleanupLowQualityThoughts(validThoughts);
  }

  /**
   * 管理分支历史
   */
  manageBranches(branches: Record<string, ThoughtBranch>): Record<string, ThoughtBranch> {
    const managedBranches: Record<string, ThoughtBranch> = {};
    
    Object.entries(branches).forEach(([branchId, branch]) => {
      // 保留活跃和高质量的分支
      if (branch.status === 'active' || branch.quality > this.config.qualityThreshold) {
        managedBranches[branchId] = {
          ...branch,
          thoughts: this.cleanupLowQualityThoughts(branch.thoughts)
        };
      }
    });
    
    return managedBranches;
  }

  /**
   * 获取内存使用统计
   */
  getMemoryStats(): {
    activeThoughts: number;
    compressedThoughts: number;
    totalMemoryUsage: number;
    compressionRatio: number;
  } {
    const activeSize = this.estimateSize(this.compressionQueue);
    const compressedSize = this.estimateSize(this.compressedThoughts);
    
    return {
      activeThoughts: this.compressionQueue.length,
      compressedThoughts: this.compressedThoughts.length,
      totalMemoryUsage: activeSize + compressedSize,
      compressionRatio: compressedSize > 0 ? activeSize / compressedSize : 1
    };
  }

  /**
   * 搜索压缩的思维
   */
  searchCompressedThoughts(query: string): CompressedThought[] {
    const queryLower = query.toLowerCase();
    return this.compressedThoughts.filter(thought => 
      thought.summary.toLowerCase().includes(queryLower) ||
      thought.keyPoints.some(point => point.toLowerCase().includes(queryLower))
    );
  }

  /**
   * 恢复压缩的思维（如果需要详细信息）
   */
  expandCompressedThought(thoughtId: string): Partial<ThoughtData> | null {
    const compressed = this.compressedThoughts.find(t => t.id === thoughtId);
    if (!compressed) return null;

    return {
      thought: compressed.summary,
      thoughtNumber: parseInt(compressed.id.split('-')[1]) || 0,
      totalThoughts: 0,
      nextThoughtNeeded: false,
      timestamp: compressed.timestamp,
      tags: compressed.keyPoints
    };
  }

  private cleanupExpiredThoughts(thoughts: ThoughtData[]): ThoughtData[] {
    const now = Date.now();
    return thoughts.filter(thought => 
      now - thought.timestamp < this.config.retentionPeriod
    );
  }

  private cleanupLowQualityThoughts(thoughts: ThoughtData[]): ThoughtData[] {
    // 保留最近的思维和高质量思维
    const recentThoughts = thoughts.slice(-10); // 保留最近10个
    const highQualityThoughts = thoughts.filter(thought => {
      if (!thought.quality) return true; // 如果没有质量评分，保留
      const avgQuality = (
        thought.quality.coherence + 
        thought.quality.depth + 
        thought.quality.breadth + 
        thought.quality.originalityScore + 
        thought.quality.relevance
      ) / 5;
      return avgQuality > this.config.qualityThreshold;
    });

    // 合并并去重
    const combined = [...recentThoughts];
    highQualityThoughts.forEach(thought => {
      if (!combined.find(t => t.thoughtNumber === thought.thoughtNumber)) {
        combined.push(thought);
      }
    });

    return combined.sort((a, b) => a.thoughtNumber - b.thoughtNumber);
  }

  private async compressOldThoughts(thoughts: ThoughtData[]): Promise<void> {
    // 选择要压缩的思维（较老的且质量不是特别高的）
    const sortedByTime = [...thoughts].sort((a, b) => a.timestamp - b.timestamp);
    const toCompress = sortedByTime.slice(0, Math.floor(thoughts.length * 0.3));
    
    for (const thought of toCompress) {
      const compressed = await this.compressThought(thought, thoughts);
      this.compressedThoughts.push(compressed);
    }

    // 清理压缩队列
    this.compressionQueue = thoughts.filter(t => 
      !toCompress.find(tc => tc.thoughtNumber === t.thoughtNumber)
    );
  }

  private async compressThought(thought: ThoughtData, context: ThoughtData[]): Promise<CompressedThought> {
    // 生成摘要
    const summary = this.generateSummary(thought);
    
    // 提取关键点
    const keyPoints = this.extractKeyPoints(thought);
    
    // 找到连接
    const connections = this.findConnections(thought, context);
    
    // 计算质量分数
    const quality = this.calculateOverallQuality(thought);

    return {
      id: `compressed-${thought.thoughtNumber}-${Date.now()}`,
      summary,
      keyPoints,
      connections,
      timestamp: thought.timestamp,
      quality
    };
  }

  private generateSummary(thought: ThoughtData): string {
    // 简单的摘要生成：取前100个字符或第一句话
    const sentences = thought.thought.split(/[。！？.!?]/);
    if (sentences.length > 0 && sentences[0].length > 0) {
      return sentences[0].trim() + '...';
    }
    return thought.thought.substring(0, 100) + '...';
  }

  private extractKeyPoints(thought: ThoughtData): string[] {
    const keyPoints: string[] = [];
    
    // 提取包含关键词的句子
    const keywordPatterns = [
      /重要的是/g,
      /关键在于/g,
      /核心问题/g,
      /主要原因/g,
      /结论是/g,
      /发现/g,
      /认为/g,
      /建议/g
    ];

    const sentences = thought.thought.split(/[。！？.!?]/);
    sentences.forEach(sentence => {
      if (keywordPatterns.some(pattern => pattern.test(sentence))) {
        keyPoints.push(sentence.trim());
      }
    });

    // 如果没有找到关键点，使用最长的句子
    if (keyPoints.length === 0 && sentences.length > 0) {
      const longestSentence = sentences.reduce((longest, current) => 
        current.length > longest.length ? current : longest
      );
      keyPoints.push(longestSentence.trim());
    }

    return keyPoints.slice(0, 3); // 最多保留3个关键点
  }

  private findConnections(thought: ThoughtData, context: ThoughtData[]): number[] {
    const connections: number[] = [];
    
    // 找到相似的思维
    context.forEach(contextThought => {
      if (contextThought.thoughtNumber !== thought.thoughtNumber) {
        const similarity = this.calculateSimilarity(thought.thought, contextThought.thought);
        if (similarity > 0.3) {
          connections.push(contextThought.thoughtNumber);
        }
      }
    });

    // 添加明确的引用
    if (thought.revisesThought) {
      connections.push(thought.revisesThought);
    }
    if (thought.branchFromThought) {
      connections.push(thought.branchFromThought);
    }

    return [...new Set(connections)]; // 去重
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private calculateOverallQuality(thought: ThoughtData): number {
    if (!thought.quality) return 0.5;
    
    return (
      thought.quality.coherence +
      thought.quality.depth +
      thought.quality.breadth +
      thought.quality.originalityScore +
      thought.quality.relevance
    ) / 5;
  }

  private getActiveThoughts(thoughts: ThoughtData[]): ThoughtData[] {
    // 返回最近的活跃思维
    return thoughts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, this.config.maxThoughts);
  }

  private estimateSize(data: any): number {
    // 简单的内存大小估算
    return JSON.stringify(data).length * 2; // 粗略估算，每个字符2字节
  }

  /**
   * 配置更新
   */
  updateConfig(newConfig: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 强制清理内存
   */
  forceCleanup(): void {
    // 清理最老的压缩思维
    if (this.compressedThoughts.length > this.config.maxThoughts) {
      this.compressedThoughts = this.compressedThoughts
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.config.maxThoughts);
    }
  }

  /**
   * 导出内存状态（用于持久化）
   */
  exportMemoryState(): {
    compressedThoughts: CompressedThought[];
    config: MemoryConfig;
  } {
    return {
      compressedThoughts: this.compressedThoughts,
      config: this.config
    };
  }

  /**
   * 导入内存状态（用于恢复）
   */
  importMemoryState(state: {
    compressedThoughts: CompressedThought[];
    config: MemoryConfig;
  }): void {
    this.compressedThoughts = state.compressedThoughts;
    this.config = state.config;
  }
}