// 完整的错误处理系统

export enum ErrorCode {
  // 输入验证错误
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FIELD_TYPE = 'INVALID_FIELD_TYPE',
  
  // 处理错误
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR',
  
  // 系统错误
  INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  
  // 学习引擎错误
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  LEARNING_DATA_CORRUPT = 'LEARNING_DATA_CORRUPT',
  
  // 异步处理错误
  TASK_QUEUE_FULL = 'TASK_QUEUE_FULL',
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  CONCURRENT_LIMIT_EXCEEDED = 'CONCURRENT_LIMIT_EXCEEDED'
}

export class SequentialThinkingError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: Record<string, any>;
  public readonly timestamp: number;
  public readonly recoverable: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    context?: Record<string, any>,
    recoverable: boolean = true
  ) {
    super(message);
    this.name = 'SequentialThinkingError';
    this.code = code;
    this.context = context;
    this.timestamp = Date.now();
    this.recoverable = recoverable;
    
    // 确保堆栈跟踪正确
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SequentialThinkingError);
    }
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      recoverable: this.recoverable,
      stack: this.stack
    };
  }
}

export class ErrorHandler {
  private errorCounts: Map<ErrorCode, number> = new Map();
  private lastErrors: SequentialThinkingError[] = [];
  private maxErrorHistory = 100;

  /**
   * 处理错误并返回适当的响应
   */
  handleError(error: unknown, context?: Record<string, any>): {
    content: Array<{ type: string; text: string }>;
    isError: boolean;
  } {
    let sequentialError: SequentialThinkingError;

    if (error instanceof SequentialThinkingError) {
      sequentialError = error;
    } else if (error instanceof Error) {
      sequentialError = new SequentialThinkingError(
        ErrorCode.INTERNAL_ERROR,
        error.message,
        { ...context, originalError: error.name },
        true
      );
    } else {
      sequentialError = new SequentialThinkingError(
        ErrorCode.INTERNAL_ERROR,
        String(error),
        context,
        true
      );
    }

    // 记录错误
    this.recordError(sequentialError);

    // 生成用户友好的错误响应
    const userMessage = this.generateUserMessage(sequentialError);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          error: userMessage,
          code: sequentialError.code,
          recoverable: sequentialError.recoverable,
          timestamp: sequentialError.timestamp,
          suggestions: this.getSuggestions(sequentialError.code)
        }, null, 2)
      }],
      isError: true
    };
  }

  /**
   * 验证输入数据
   */
  validateInput(input: unknown): void {
    if (!input || typeof input !== 'object') {
      throw new SequentialThinkingError(
        ErrorCode.INVALID_INPUT,
        'Input must be a valid object',
        { input: typeof input }
      );
    }

    const data = input as Record<string, unknown>;

    // 验证必需字段
    const requiredFields = ['thought', 'thoughtNumber', 'totalThoughts', 'nextThoughtNeeded'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new SequentialThinkingError(
          ErrorCode.MISSING_REQUIRED_FIELD,
          `Missing required field: ${field}`,
          { field, availableFields: Object.keys(data) }
        );
      }
    }

    // 验证字段类型
    if (typeof data.thought !== 'string') {
      throw new SequentialThinkingError(
        ErrorCode.INVALID_FIELD_TYPE,
        'Field "thought" must be a string',
        { field: 'thought', actualType: typeof data.thought, expectedType: 'string' }
      );
    }

    if (typeof data.thoughtNumber !== 'number' || data.thoughtNumber < 1) {
      throw new SequentialThinkingError(
        ErrorCode.INVALID_FIELD_TYPE,
        'Field "thoughtNumber" must be a positive number',
        { field: 'thoughtNumber', value: data.thoughtNumber }
      );
    }

    if (typeof data.totalThoughts !== 'number' || data.totalThoughts < 1) {
      throw new SequentialThinkingError(
        ErrorCode.INVALID_FIELD_TYPE,
        'Field "totalThoughts" must be a positive number',
        { field: 'totalThoughts', value: data.totalThoughts }
      );
    }

    if (typeof data.nextThoughtNeeded !== 'boolean') {
      throw new SequentialThinkingError(
        ErrorCode.INVALID_FIELD_TYPE,
        'Field "nextThoughtNeeded" must be a boolean',
        { field: 'nextThoughtNeeded', actualType: typeof data.nextThoughtNeeded }
      );
    }

    // 验证可选字段
    if (data.revisesThought !== undefined && (typeof data.revisesThought !== 'number' || data.revisesThought < 1)) {
      throw new SequentialThinkingError(
        ErrorCode.INVALID_FIELD_TYPE,
        'Field "revisesThought" must be a positive number',
        { field: 'revisesThought', value: data.revisesThought }
      );
    }

    if (data.branchFromThought !== undefined && (typeof data.branchFromThought !== 'number' || data.branchFromThought < 1)) {
      throw new SequentialThinkingError(
        ErrorCode.INVALID_FIELD_TYPE,
        'Field "branchFromThought" must be a positive number',
        { field: 'branchFromThought', value: data.branchFromThought }
      );
    }

    if (data.tags !== undefined && !Array.isArray(data.tags)) {
      throw new SequentialThinkingError(
        ErrorCode.INVALID_FIELD_TYPE,
        'Field "tags" must be an array',
        { field: 'tags', actualType: typeof data.tags }
      );
    }
  }

  /**
   * 包装异步操作以处理错误
   */
  async wrapAsync<T>(
    operation: () => Promise<T>,
    context: Record<string, any>,
    timeoutMs?: number
  ): Promise<T> {
    try {
      if (timeoutMs) {
        return await Promise.race([
          operation(),
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new SequentialThinkingError(
                ErrorCode.TIMEOUT_ERROR,
                `Operation timed out after ${timeoutMs}ms`,
                context
              ));
            }, timeoutMs);
          })
        ]);
      } else {
        return await operation();
      }
    } catch (error) {
      if (error instanceof SequentialThinkingError) {
        throw error;
      }
      
      throw new SequentialThinkingError(
        ErrorCode.PROCESSING_FAILED,
        `Async operation failed: ${error instanceof Error ? error.message : String(error)}`,
        { ...context, originalError: error }
      );
    }
  }

  /**
   * 检查系统资源状态
   */
  checkResourceLimits(context: {
    memoryUsage?: number;
    activeThoughts?: number;
    queueLength?: number;
  }): void {
    const { memoryUsage = 0, activeThoughts = 0, queueLength = 0 } = context;

    if (memoryUsage > 500 * 1024 * 1024) { // 500MB
      throw new SequentialThinkingError(
        ErrorCode.RESOURCE_EXHAUSTED,
        'Memory usage exceeded limit',
        { memoryUsage, limit: 500 * 1024 * 1024 },
        false
      );
    }

    if (activeThoughts > 1000) {
      throw new SequentialThinkingError(
        ErrorCode.RESOURCE_EXHAUSTED,
        'Too many active thoughts',
        { activeThoughts, limit: 1000 }
      );
    }

    if (queueLength > 100) {
      throw new SequentialThinkingError(
        ErrorCode.TASK_QUEUE_FULL,
        'Task queue is full',
        { queueLength, limit: 100 }
      );
    }
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCode: Record<string, number>;
    recentErrors: SequentialThinkingError[];
    mostCommonError: string | null;
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const errorsByCode: Record<string, number> = {};
    
    this.errorCounts.forEach((count, code) => {
      errorsByCode[code] = count;
    });

    const mostCommonError = this.getMostCommonError();

    return {
      totalErrors,
      errorsByCode,
      recentErrors: this.lastErrors.slice(-10),
      mostCommonError
    };
  }

  /**
   * 清理错误历史
   */
  clearErrorHistory(): void {
    this.errorCounts.clear();
    this.lastErrors = [];
  }

  private recordError(error: SequentialThinkingError): void {
    // 更新错误计数
    const currentCount = this.errorCounts.get(error.code) || 0;
    this.errorCounts.set(error.code, currentCount + 1);

    // 添加到错误历史
    this.lastErrors.push(error);
    if (this.lastErrors.length > this.maxErrorHistory) {
      this.lastErrors = this.lastErrors.slice(-this.maxErrorHistory);
    }

    // 记录到控制台（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.error('SequentialThinkingError:', error.toJSON());
    }
  }

  private generateUserMessage(error: SequentialThinkingError): string {
    const userMessages: Record<ErrorCode, string> = {
      [ErrorCode.INVALID_INPUT]: '输入数据格式不正确，请检查输入参数',
      [ErrorCode.MISSING_REQUIRED_FIELD]: '缺少必需的字段，请补充完整信息',
      [ErrorCode.INVALID_FIELD_TYPE]: '字段类型不正确，请检查数据类型',
      [ErrorCode.PROCESSING_FAILED]: '处理过程中发生错误，请稍后重试',
      [ErrorCode.TIMEOUT_ERROR]: '操作超时，请稍后重试',
      [ErrorCode.MEMORY_ERROR]: '内存不足，请减少数据量或稍后重试',
      [ErrorCode.INITIALIZATION_ERROR]: '系统初始化失败，请重启服务',
      [ErrorCode.RESOURCE_EXHAUSTED]: '系统资源不足，请稍后重试',
      [ErrorCode.INTERNAL_ERROR]: '内部错误，请联系技术支持',
      [ErrorCode.SESSION_NOT_FOUND]: '学习会话不存在，请重新开始',
      [ErrorCode.LEARNING_DATA_CORRUPT]: '学习数据损坏，已重置学习状态',
      [ErrorCode.TASK_QUEUE_FULL]: '任务队列已满，请稍后重试',
      [ErrorCode.TASK_NOT_FOUND]: '任务不存在或已完成',
      [ErrorCode.CONCURRENT_LIMIT_EXCEEDED]: '并发限制已达上限，请稍后重试'
    };

    return userMessages[error.code] || error.message;
  }

  private getSuggestions(code: ErrorCode): string[] {
    const suggestions: Partial<Record<ErrorCode, string[]>> = {
      [ErrorCode.INVALID_INPUT]: [
        '检查输入数据是否为有效的JSON对象',
        '确保所有必需字段都已提供'
      ],
      [ErrorCode.MISSING_REQUIRED_FIELD]: [
        '补充缺少的必需字段',
        '参考API文档确认字段名称'
      ],
      [ErrorCode.INVALID_FIELD_TYPE]: [
        '检查字段的数据类型',
        '确保数值字段为正数'
      ],
      [ErrorCode.PROCESSING_FAILED]: [
        '稍后重试操作',
        '检查输入数据是否正确'
      ],
      [ErrorCode.TIMEOUT_ERROR]: [
        '减少数据量',
        '稍后重试',
        '检查网络连接'
      ],
      [ErrorCode.MEMORY_ERROR]: [
        '减少思维历史长度',
        '清理不必要的数据',
        '重启服务'
      ],
      [ErrorCode.RESOURCE_EXHAUSTED]: [
        '等待系统资源释放',
        '减少并发请求',
        '清理历史数据'
      ],
      [ErrorCode.TASK_QUEUE_FULL]: [
        '等待当前任务完成',
        '减少并发请求'
      ]
    };

    return suggestions[code] || ['请联系技术支持'];
  }

  private getMostCommonError(): string | null {
    if (this.errorCounts.size === 0) return null;

    let maxCount = 0;
    let mostCommon: string | null = null;

    this.errorCounts.forEach((count, code) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = code;
      }
    });

    return mostCommon;
  }
}