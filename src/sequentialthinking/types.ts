// Enhanced types for Sequential Thinking MCP Server

export interface ThoughtData {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;
  nextThoughtNeeded: boolean;
  timestamp: number;
  quality?: ThoughtQualityMetrics;
  context?: string;
  tags?: string[];
}

export interface ThoughtQualityMetrics {
  coherence: number;        // 思维连贯性 (0-1)
  depth: number;           // 思考深度 (0-1)
  breadth: number;         // 思考广度 (0-1)
  originalityScore: number; // 原创性评分 (0-1)
  relevance: number;       // 相关性 (0-1)
}

export interface ThinkingPattern {
  patternType: 'analytical' | 'creative' | 'systematic' | 'exploratory' | 'iterative';
  confidence: number;
  characteristics: string[];
  suggestedNextSteps: string[];
  potentialPitfalls: string[];
  recommendedApproach: string;
}

export interface ThinkingInsight {
  type: 'pattern' | 'improvement' | 'warning' | 'suggestion';
  message: string;
  confidence: number;
  actionable: boolean;
  relatedThoughts: number[];
}

export interface CompressedThought {
  id: string;
  summary: string;
  keyPoints: string[];
  connections: number[];
  timestamp: number;
  quality: number;
}

export interface ThoughtBranch {
  branchId: string;
  parentThought: number;
  thoughts: ThoughtData[];
  status: 'active' | 'completed' | 'abandoned';
  quality: number;
}

export interface MemoryConfig {
  maxThoughts: number;
  compressionThreshold: number;
  retentionPeriod: number; // in milliseconds
  qualityThreshold: number;
}

export interface LearningMetrics {
  totalThoughts: number;
  averageQuality: number;
  commonPatterns: string[];
  improvementAreas: string[];
  successfulStrategies: string[];
}