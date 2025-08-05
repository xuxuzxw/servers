import { ThoughtData, ThoughtBranch, ThinkingInsight } from './types.js';

export interface ProcessingTask {
  id: string;
  type: 'quality_evaluation' | 'pattern_analysis' | 'insight_generation' | 'compression';
  data: any;
  priority: number;
  timestamp: number;
  retries: number;
}

export interface ProcessingResult {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
  processingTime: number;
}

export class AsyncProcessor {
  private taskQueue: ProcessingTask[] = [];
  private processingTasks: Map<string, Promise<ProcessingResult>> = new Map();
  private maxConcurrentTasks: number;
  private taskTimeout: number;
  private maxRetries: number;

  constructor(options: {
    maxConcurrentTasks?: number;
    taskTimeout?: number;
    maxRetries?: number;
  } = {}) {
    this.maxConcurrentTasks = options.maxConcurrentTasks || 3;
    this.taskTimeout = options.taskTimeout || 5000; // 5秒超时
    this.maxRetries = options.maxRetries || 2;
  }

  /**
   * 添加处理任务到队列
   */
  addTask(task: Omit<ProcessingTask, 'id' | 'timestamp' | 'retries'>): string {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const fullTask: ProcessingTask = {
      ...task,
      id: taskId,
      timestamp: Date.now(),
      retries: 0
    };

    this.taskQueue.push(fullTask);
    this.taskQueue.sort((a, b) => b.priority - a.priority); // 高优先级在前

    // 立即尝试处理任务
    this.processNextTasks();

    return taskId;
  }

  /**
   * 并行处理多个思维分支
   */
  async processParallelBranches(
    branches: ThoughtBranch[],
    processor: (branch: ThoughtBranch) => Promise<any>
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const promises = branches.map(async (branch) => {
      try {
        const result = await this.withTimeout(
          processor(branch),
          this.taskTimeout,
          `Branch ${branch.branchId} processing timeout`
        );
        results.set(branch.branchId, result);
      } catch (error) {
        console.error(`Error processing branch ${branch.branchId}:`, error);
        results.set(branch.branchId, { error: error instanceof Error ? error.message : String(error) });
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * 批量处理思维质量评估
   */
  async batchEvaluateQuality(
    thoughts: ThoughtData[],
    evaluator: (thought: ThoughtData, context: ThoughtData[]) => Promise<any>
  ): Promise<Map<number, any>> {
    const results = new Map<number, any>();
    const batches = this.createBatches(thoughts, this.maxConcurrentTasks);

    for (const batch of batches) {
      const batchPromises = batch.map(async (thought) => {
        try {
          const result = await this.withTimeout(
            evaluator(thought, thoughts),
            this.taskTimeout,
            `Quality evaluation timeout for thought ${thought.thoughtNumber}`
          );
          results.set(thought.thoughtNumber, result);
        } catch (error) {
          console.error(`Error evaluating thought ${thought.thoughtNumber}:`, error);
          results.set(thought.thoughtNumber, { 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      });

      await Promise.allSettled(batchPromises);
    }

    return results;
  }

  /**
   * 异步生成洞察
   */
  async generateInsightsAsync(
    thoughts: ThoughtData[],
    insightGenerators: Array<(thoughts: ThoughtData[]) => Promise<ThinkingInsight[]>>
  ): Promise<ThinkingInsight[]> {
    const allInsights: ThinkingInsight[] = [];

    const promises = insightGenerators.map(async (generator) => {
      try {
        const insights = await this.withTimeout(
          generator(thoughts),
          this.taskTimeout,
          'Insight generation timeout'
        );
        return insights;
      } catch (error) {
        console.error('Error generating insights:', error);
        return [];
      }
    });

    const results = await Promise.allSettled(promises);
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allInsights.push(...result.value);
      }
    });

    // 去重和排序
    return this.deduplicateInsights(allInsights);
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): 'pending' | 'processing' | 'completed' | 'not_found' {
    if (this.processingTasks.has(taskId)) {
      return 'processing';
    }
    if (this.taskQueue.find(task => task.id === taskId)) {
      return 'pending';
    }
    return 'not_found';
  }

  /**
   * 等待任务完成
   */
  async waitForTask(taskId: string): Promise<ProcessingResult | null> {
    const processingPromise = this.processingTasks.get(taskId);
    if (processingPromise) {
      return await processingPromise;
    }

    // 如果任务在队列中，等待它被处理
    const task = this.taskQueue.find(t => t.id === taskId);
    if (task) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const promise = this.processingTasks.get(taskId);
          if (promise) {
            clearInterval(checkInterval);
            promise.then(resolve);
          }
        }, 100);

        // 超时处理
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve({
            taskId,
            success: false,
            error: 'Task wait timeout',
            processingTime: 0
          });
        }, this.taskTimeout * 2);
      });
    }

    return null;
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): boolean {
    const queueIndex = this.taskQueue.findIndex(task => task.id === taskId);
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1);
      return true;
    }
    return false;
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): {
    pending: number;
    processing: number;
    queueLength: number;
  } {
    return {
      pending: this.taskQueue.length,
      processing: this.processingTasks.size,
      queueLength: this.taskQueue.length
    };
  }

  /**
   * 清理完成的任务
   */
  cleanup(): void {
    // 清理已完成的任务
    const completedTasks: string[] = [];
    this.processingTasks.forEach((promise, taskId) => {
      promise.then(() => {
        completedTasks.push(taskId);
      }).catch(() => {
        completedTasks.push(taskId);
      });
    });

    // 延迟清理，给调用者时间获取结果
    setTimeout(() => {
      completedTasks.forEach(taskId => {
        this.processingTasks.delete(taskId);
      });
    }, 1000);
  }

  private async processNextTasks(): Promise<void> {
    while (this.processingTasks.size < this.maxConcurrentTasks && this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (!task) break;

      const promise = this.processTask(task);
      this.processingTasks.set(task.id, promise);

      // 任务完成后从处理中移除
      promise.finally(() => {
        setTimeout(() => {
          this.processingTasks.delete(task.id);
          this.processNextTasks(); // 继续处理下一个任务
        }, 100);
      });
    }
  }

  private async processTask(task: ProcessingTask): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      let result: any;

      switch (task.type) {
        case 'quality_evaluation':
          result = await this.processQualityEvaluation(task.data);
          break;
        case 'pattern_analysis':
          result = await this.processPatternAnalysis(task.data);
          break;
        case 'insight_generation':
          result = await this.processInsightGeneration(task.data);
          break;
        case 'compression':
          result = await this.processCompression(task.data);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      return {
        taskId: task.id,
        success: true,
        result,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      // 重试逻辑
      if (task.retries < this.maxRetries) {
        task.retries++;
        this.taskQueue.unshift(task); // 重新加入队列头部
        return this.processTask(task);
      }

      return {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime
      };
    }
  }

  private async processQualityEvaluation(_data: any): Promise<any> {
    // 模拟质量评估处理
    await this.delay(Math.random() * 100 + 50); // 50-150ms
    return { quality: Math.random(), processed: true };
  }

  private async processPatternAnalysis(_data: any): Promise<any> {
    // 模拟模式分析处理
    await this.delay(Math.random() * 200 + 100); // 100-300ms
    return { pattern: 'analytical', confidence: Math.random() };
  }

  private async processInsightGeneration(_data: any): Promise<any> {
    // 模拟洞察生成处理
    await this.delay(Math.random() * 300 + 200); // 200-500ms
    return { insights: [], processed: true };
  }

  private async processCompression(_data: any): Promise<any> {
    // 模拟压缩处理
    await this.delay(Math.random() * 150 + 100); // 100-250ms
    return { compressed: true, ratio: Math.random() };
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private deduplicateInsights(insights: ThinkingInsight[]): ThinkingInsight[] {
    const seen = new Set<string>();
    return insights.filter(insight => {
      const key = `${insight.type}-${insight.message}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    }).sort((a, b) => b.confidence - a.confidence);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 优雅关闭处理器
   */
  async shutdown(): Promise<void> {
    // 等待所有正在处理的任务完成
    const processingPromises = Array.from(this.processingTasks.values());
    await Promise.allSettled(processingPromises);
    
    // 清空队列
    this.taskQueue = [];
    this.processingTasks.clear();
  }
}