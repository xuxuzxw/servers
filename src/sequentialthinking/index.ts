#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
// Fixed chalk import for ESM
import chalk from 'chalk';

// Import enhanced modules
import { ThoughtData, ThoughtBranch } from './types.js';
import { ThinkingAdvisor } from './thinking-advisor.js';
import { MemoryManager } from './memory-manager.js';
import { AsyncProcessor } from './async-processor.js';
import { LearningEngine } from './learning-engine.js';
import { ErrorHandler, SequentialThinkingError, ErrorCode } from './error-handler.js';

class SequentialThinkingServer {
  private thoughtHistory: ThoughtData[] = [];
  private branches: Record<string, ThoughtBranch> = {};
  private disableThoughtLogging: boolean;
  
  // Enhanced modules
  private thinkingAdvisor: ThinkingAdvisor;
  private memoryManager: MemoryManager;
  private asyncProcessor: AsyncProcessor;
  private learningEngine: LearningEngine;
  private errorHandler: ErrorHandler;
  private currentSessionId: string | null = null;

  constructor() {
    this.disableThoughtLogging = (process.env.DISABLE_THOUGHT_LOGGING || "").toLowerCase() === "true";
    
    // Initialize enhanced modules
    this.thinkingAdvisor = new ThinkingAdvisor();
    this.memoryManager = new MemoryManager({
      maxThoughts: 100,
      compressionThreshold: 50,
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      qualityThreshold: 0.3
    });
    this.asyncProcessor = new AsyncProcessor({
      maxConcurrentTasks: 3,
      taskTimeout: 5000,
      maxRetries: 2
    });
    this.learningEngine = new LearningEngine();
    this.errorHandler = new ErrorHandler();
    
    // Start a learning session
    this.currentSessionId = this.learningEngine.startSession();
  }

  private validateThoughtData(input: unknown): ThoughtData {
    // 使用错误处理器验证输入
    this.errorHandler.validateInput(input);
    
    const data = input as Record<string, unknown>;

    return {
      thought: data.thought as string,
      thoughtNumber: data.thoughtNumber as number,
      totalThoughts: data.totalThoughts as number,
      nextThoughtNeeded: data.nextThoughtNeeded as boolean,
      isRevision: data.isRevision as boolean | undefined,
      revisesThought: data.revisesThought as number | undefined,
      branchFromThought: data.branchFromThought as number | undefined,
      branchId: data.branchId as string | undefined,
      needsMoreThoughts: data.needsMoreThoughts as boolean | undefined,
      timestamp: Date.now(),
      context: data.context as string | undefined,
      tags: data.tags as string[] | undefined
    };
  }

  private calculateBranchQuality(branch: ThoughtBranch): number {
    if (branch.thoughts.length === 0) return 0;
    
    const avgQuality = branch.thoughts.reduce((sum, thought) => {
      if (!thought.quality) return sum;
      return sum + (
        thought.quality.coherence + thought.quality.depth + 
        thought.quality.breadth + thought.quality.originalityScore + 
        thought.quality.relevance
      ) / 5;
    }, 0) / branch.thoughts.length;

    return avgQuality;
  }

  /**
   * Get learning progress report
   */
  public getProgressReport(): any {
    return this.learningEngine.getProgressReport();
  }

  /**
   * Get improvement opportunities
   */
  public getImprovementOpportunities(): any {
    return this.learningEngine.identifyImprovementOpportunities();
  }

  /**
   * Predict optimal strategy for given context
   */
  public predictOptimalStrategy(context: any): any {
    return this.learningEngine.predictOptimalStrategy(context);
  }

  /**
   * End current learning session
   */
  public async endSession(outcome: any): Promise<any> {
    if (!this.currentSessionId) return [];
    
    const insights = await this.learningEngine.endSession(this.currentSessionId, outcome);
    this.currentSessionId = this.learningEngine.startSession(); // Start new session
    
    return insights;
  }

  /**
   * Get memory statistics
   */
  public getMemoryStats(): any {
    return this.memoryManager.getMemoryStats();
  }

  /**
   * Search compressed thoughts
   */
  public searchThoughts(query: string): any {
    return this.memoryManager.searchCompressedThoughts(query);
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): any {
    return this.errorHandler.getErrorStats();
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    try {
      await this.asyncProcessor.shutdown();
      this.memoryManager.forceCleanup();
      this.errorHandler.clearErrorHistory();
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  private formatThought(thoughtData: ThoughtData): string {
    const { thoughtNumber, totalThoughts, thought, isRevision, revisesThought, branchFromThought, branchId } = thoughtData;

    let prefix = '';
    let context = '';

    if (isRevision) {
      prefix = chalk.yellow('🔄 Revision');
      context = ` (revising thought ${revisesThought})`;
    } else if (branchFromThought) {
      prefix = chalk.green('🌿 Branch');
      context = ` (from thought ${branchFromThought}, ID: ${branchId})`;
    } else {
      prefix = chalk.blue('💭 Thought');
      context = '';
    }

    const header = `${prefix} ${thoughtNumber}/${totalThoughts}${context}`;
    const border = '─'.repeat(Math.max(header.length, thought.length) + 4);

    return `
┌${border}┐
│ ${header} │
├${border}┤
│ ${thought.padEnd(border.length - 2)} │
└${border}┘`;
  }

  public async processThought(input: unknown): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    try {
      // 检查资源限制
      const memoryStats = this.memoryManager.getMemoryStats();
      const queueStatus = this.asyncProcessor.getQueueStatus();
      
      this.errorHandler.checkResourceLimits({
        memoryUsage: memoryStats.totalMemoryUsage,
        activeThoughts: this.thoughtHistory.length,
        queueLength: queueStatus.queueLength
      });

      const validatedInput = this.validateThoughtData(input);

      if (validatedInput.thoughtNumber > validatedInput.totalThoughts) {
        validatedInput.totalThoughts = validatedInput.thoughtNumber;
      }

      // Add timestamp
      validatedInput.timestamp = Date.now();

      // Async quality evaluation
      const qualityTaskId = this.asyncProcessor.addTask({
        type: 'quality_evaluation',
        data: { thought: validatedInput, context: this.thoughtHistory },
        priority: 2
      });

      // Evaluate thought quality with error handling
      try {
        const qualityResult = await this.errorHandler.wrapAsync(
          () => this.asyncProcessor.waitForTask(qualityTaskId),
          { operation: 'quality_evaluation', thoughtNumber: validatedInput.thoughtNumber },
          10000 // 10秒超时
        );
        
        if (qualityResult?.success) {
          validatedInput.quality = this.thinkingAdvisor.evaluateThoughtQuality(validatedInput, this.thoughtHistory);
        }
      } catch (error) {
        console.error('Quality evaluation failed:', error);
        // 继续处理，但不设置质量评分
      }

      // Add to history
      this.thoughtHistory.push(validatedInput);

      // Record in learning engine
      if (this.currentSessionId) {
        this.learningEngine.recordThought(this.currentSessionId, validatedInput);
      }

      // Handle branches
      if (validatedInput.branchFromThought && validatedInput.branchId) {
        if (!this.branches[validatedInput.branchId]) {
          this.branches[validatedInput.branchId] = {
            branchId: validatedInput.branchId,
            parentThought: validatedInput.branchFromThought,
            thoughts: [],
            status: 'active',
            quality: 0
          };
        }
        this.branches[validatedInput.branchId].thoughts.push(validatedInput);
        this.branches[validatedInput.branchId].quality = this.calculateBranchQuality(this.branches[validatedInput.branchId]);
      }

      // Memory management
      this.thoughtHistory = await this.memoryManager.manageThoughtHistory(this.thoughtHistory);
      this.branches = this.memoryManager.manageBranches(this.branches);

      // Generate thinking pattern analysis
      const pattern = this.thinkingAdvisor.analyzeThinkingPattern(this.thoughtHistory);
      if (this.currentSessionId) {
        this.learningEngine.recordPattern(this.currentSessionId, pattern);
      }

      // Generate insights asynchronously
      const insightTaskId = this.asyncProcessor.addTask({
        type: 'insight_generation',
        data: { thoughts: this.thoughtHistory },
        priority: 1
      });

      let insights: any[] = [];
      try {
        const insightResult = await this.errorHandler.wrapAsync(
          () => this.asyncProcessor.waitForTask(insightTaskId),
          { operation: 'insight_generation', thoughtCount: this.thoughtHistory.length },
          8000 // 8秒超时
        );
        
        if (insightResult?.success) {
          insights = this.thinkingAdvisor.generateInsights(this.thoughtHistory);
        }
      } catch (error) {
        console.error('Insight generation failed:', error);
        // 继续处理，但不提供洞察
      }

      // Format and log thought
      if (!this.disableThoughtLogging) {
        const formattedThought = this.formatThought(validatedInput);
        console.error(formattedThought);
        
        // Log pattern and insights
        if (pattern.confidence > 0.7) {
          console.error(chalk.cyan(`🧠 思维模式: ${pattern.patternType} (置信度: ${(pattern.confidence * 100).toFixed(1)}%)`));
          console.error(chalk.cyan(`💡 建议: ${pattern.recommendedApproach}`));
        }
        
        if (insights.length > 0) {
          console.error(chalk.yellow(`🔍 洞察: ${insights[0].message}`));
        }
      }

      // Get memory stats
      const finalMemoryStats = this.memoryManager.getMemoryStats();

      // Prepare response
      const response = {
        thoughtNumber: validatedInput.thoughtNumber,
        totalThoughts: validatedInput.totalThoughts,
        nextThoughtNeeded: validatedInput.nextThoughtNeeded,
        branches: Object.keys(this.branches),
        thoughtHistoryLength: this.thoughtHistory.length,
        pattern: {
          type: pattern.patternType,
          confidence: pattern.confidence,
          suggestedNextSteps: pattern.suggestedNextSteps.slice(0, 2),
          potentialPitfalls: pattern.potentialPitfalls.slice(0, 2)
        },
        insights: insights.slice(0, 3).map(insight => ({
          type: insight.type,
          message: insight.message,
          confidence: insight.confidence
        })),
        quality: validatedInput.quality ? {
          overall: (validatedInput.quality.coherence + validatedInput.quality.depth + 
                   validatedInput.quality.breadth + validatedInput.quality.originalityScore + 
                   validatedInput.quality.relevance) / 5,
          depth: validatedInput.quality.depth,
          coherence: validatedInput.quality.coherence
        } : undefined,
        memoryStats: {
          activeThoughts: finalMemoryStats.activeThoughts,
          compressionRatio: finalMemoryStats.compressionRatio
        }
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(response, null, 2)
        }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error, {
        operation: 'processThought',
        inputType: typeof input,
        timestamp: Date.now()
      });
    }
  }
}

const SEQUENTIAL_THINKING_TOOL: Tool = {
  name: "sequentialthinking",
  description: `An enhanced tool for intelligent, adaptive problem-solving through structured thinking.
This tool provides AI-powered insights, memory management, and learning capabilities to optimize your thinking process.

🧠 ENHANCED FEATURES:
- Intelligent thinking pattern recognition and suggestions
- Automatic quality evaluation of thoughts
- Memory optimization with compression for long sessions
- Learning from past thinking patterns
- Async processing for better performance
- Real-time insights and improvement recommendations

When to use this tool:
- Complex problem-solving requiring structured approach
- Planning and design with iterative refinement
- Analysis that benefits from pattern recognition
- Long thinking sessions that need memory management
- Learning from past thinking experiences
- Getting AI-powered suggestions for thinking improvement

🎯 INTELLIGENT CAPABILITIES:
- Pattern Analysis: Identifies your thinking style (analytical, creative, systematic, etc.)
- Quality Assessment: Evaluates coherence, depth, breadth, and originality
- Smart Suggestions: Recommends next steps based on current pattern
- Memory Management: Automatically compresses old thoughts to maintain performance
- Learning Engine: Learns from successful patterns and suggests improvements
- Insight Generation: Provides real-time feedback on thinking quality

📊 ENHANCED RESPONSE:
The tool now returns rich information including:
- Thinking pattern analysis with confidence scores
- Quality metrics for your thoughts
- Personalized suggestions for next steps
- Potential pitfalls to avoid
- Memory usage statistics
- Learning insights

Parameters (enhanced):
- thought: Your current thinking step (now with quality analysis)
- next_thought_needed: Whether to continue (with AI recommendations)
- thought_number: Current sequence number
- total_thoughts: Estimated total (dynamically adjustable)
- is_revision: Whether revising previous thinking
- revises_thought: Which thought is being reconsidered
- branch_from_thought: Branching point for exploration
- branch_id: Branch identifier for parallel thinking
- needs_more_thoughts: Request for extended thinking
- context: Optional context for better analysis
- tags: Optional tags for categorization

🚀 OPTIMIZATION FEATURES:
1. Async Processing: Quality evaluation runs in background
2. Memory Management: Automatic cleanup and compression
3. Pattern Learning: Improves suggestions over time
4. Smart Insights: Real-time thinking quality feedback
5. Performance Monitoring: Memory and processing statistics`,
  inputSchema: {
    type: "object",
    properties: {
      thought: {
        type: "string",
        description: "Your current thinking step (will be analyzed for quality and patterns)"
      },
      nextThoughtNeeded: {
        type: "boolean",
        description: "Whether another thought step is needed (AI will provide recommendations)"
      },
      thoughtNumber: {
        type: "integer",
        description: "Current thought number",
        minimum: 1
      },
      totalThoughts: {
        type: "integer",
        description: "Estimated total thoughts needed (can be adjusted based on AI suggestions)",
        minimum: 1
      },
      isRevision: {
        type: "boolean",
        description: "Whether this revises previous thinking (affects pattern analysis)"
      },
      revisesThought: {
        type: "integer",
        description: "Which thought is being reconsidered",
        minimum: 1
      },
      branchFromThought: {
        type: "integer",
        description: "Branching point thought number for parallel exploration",
        minimum: 1
      },
      branchId: {
        type: "string",
        description: "Branch identifier for organizing parallel thoughts"
      },
      needsMoreThoughts: {
        type: "boolean",
        description: "If more thoughts are needed (AI will analyze and suggest)"
      },
      context: {
        type: "string",
        description: "Optional context information for better AI analysis"
      },
      tags: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Optional tags for categorizing and organizing thoughts"
      }
    },
    required: ["thought", "nextThoughtNeeded", "thoughtNumber", "totalThoughts"]
  }
};

const server = new Server(
  {
    name: "sequential-thinking-server",
    version: "0.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const thinkingServer = new SequentialThinkingServer();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [SEQUENTIAL_THINKING_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  if (request.params.name === "sequentialthinking") {
    return await thinkingServer.processThought(request.params.arguments);
  }

  return {
    content: [{
      type: "text",
      text: `Unknown tool: ${request.params.name}`
    }],
    isError: true
  };
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Enhanced Sequential Thinking MCP Server running on stdio");
  console.error("🧠 Features: AI Pattern Analysis | Memory Management | Learning Engine | Async Processing");
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.error('Shutting down server gracefully...');
  await thinkingServer.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down server gracefully...');
  await thinkingServer.cleanup();
  process.exit(0);
});

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
