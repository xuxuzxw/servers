import { ErrorHandler, SequentialThinkingError, ErrorCode } from '../error-handler.js';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
  });

  describe('validateInput', () => {
    it('should validate correct input', () => {
      const validInput = {
        thought: 'Test thought',
        thoughtNumber: 1,
        totalThoughts: 5,
        nextThoughtNeeded: true
      };

      expect(() => errorHandler.validateInput(validInput)).not.toThrow();
    });

    it('should throw error for missing required fields', () => {
      const invalidInput = {
        thought: 'Test thought',
        thoughtNumber: 1
        // missing totalThoughts and nextThoughtNeeded
      };

      expect(() => errorHandler.validateInput(invalidInput)).toThrow(SequentialThinkingError);
      expect(() => errorHandler.validateInput(invalidInput)).toThrow(/Missing required field/);
    });

    it('should throw error for invalid field types', () => {
      const invalidInput = {
        thought: 123, // should be string
        thoughtNumber: 1,
        totalThoughts: 5,
        nextThoughtNeeded: true
      };

      expect(() => errorHandler.validateInput(invalidInput)).toThrow(SequentialThinkingError);
      expect(() => errorHandler.validateInput(invalidInput)).toThrow(/must be a string/);
    });

    it('should throw error for negative numbers', () => {
      const invalidInput = {
        thought: 'Test thought',
        thoughtNumber: -1, // should be positive
        totalThoughts: 5,
        nextThoughtNeeded: true
      };

      expect(() => errorHandler.validateInput(invalidInput)).toThrow(SequentialThinkingError);
    });

    it('should validate optional fields correctly', () => {
      const validInput = {
        thought: 'Test thought',
        thoughtNumber: 1,
        totalThoughts: 5,
        nextThoughtNeeded: true,
        revisesThought: 2,
        branchFromThought: 3,
        tags: ['test', 'validation']
      };

      expect(() => errorHandler.validateInput(validInput)).not.toThrow();
    });
  });

  describe('handleError', () => {
    it('should handle SequentialThinkingError correctly', () => {
      const error = new SequentialThinkingError(
        ErrorCode.INVALID_INPUT,
        'Test error message'
      );

      const result = errorHandler.handleError(error);

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.code).toBe(ErrorCode.INVALID_INPUT);
      expect(parsedContent.recoverable).toBe(true);
    });

    it('should handle regular Error correctly', () => {
      const error = new Error('Regular error');

      const result = errorHandler.handleError(error);

      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.code).toBe(ErrorCode.INTERNAL_ERROR);
    });

    it('should handle unknown error types', () => {
      const error = 'String error';

      const result = errorHandler.handleError(error);

      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.code).toBe(ErrorCode.INTERNAL_ERROR);
    });
  });

  describe('wrapAsync', () => {
    it('should execute successful async operation', async () => {
      const operation = async () => 'success';
      const result = await errorHandler.wrapAsync(operation, { test: true });
      
      expect(result).toBe('success');
    });

    it('should handle async operation failure', async () => {
      const operation = async () => {
        throw new Error('Async error');
      };

      await expect(errorHandler.wrapAsync(operation, { test: true }))
        .rejects.toThrow(SequentialThinkingError);
    });

    it('should handle timeout', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'success';
      };

      await expect(errorHandler.wrapAsync(operation, { test: true }, 100))
        .rejects.toThrow(SequentialThinkingError);
    });
  });

  describe('checkResourceLimits', () => {
    it('should pass with normal resource usage', () => {
      expect(() => errorHandler.checkResourceLimits({
        memoryUsage: 100 * 1024 * 1024, // 100MB
        activeThoughts: 50,
        queueLength: 10
      })).not.toThrow();
    });

    it('should throw error for excessive memory usage', () => {
      expect(() => errorHandler.checkResourceLimits({
        memoryUsage: 600 * 1024 * 1024 // 600MB
      })).toThrow(SequentialThinkingError);
    });

    it('should throw error for too many active thoughts', () => {
      expect(() => errorHandler.checkResourceLimits({
        activeThoughts: 1500
      })).toThrow(SequentialThinkingError);
    });

    it('should throw error for full queue', () => {
      expect(() => errorHandler.checkResourceLimits({
        queueLength: 150
      })).toThrow(SequentialThinkingError);
    });
  });

  describe('error statistics', () => {
    it('should track error counts', () => {
      const error1 = new SequentialThinkingError(ErrorCode.INVALID_INPUT, 'Error 1');
      const error2 = new SequentialThinkingError(ErrorCode.INVALID_INPUT, 'Error 2');
      const error3 = new SequentialThinkingError(ErrorCode.TIMEOUT_ERROR, 'Error 3');

      errorHandler.handleError(error1);
      errorHandler.handleError(error2);
      errorHandler.handleError(error3);

      const stats = errorHandler.getErrorStats();
      
      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByCode[ErrorCode.INVALID_INPUT]).toBe(2);
      expect(stats.errorsByCode[ErrorCode.TIMEOUT_ERROR]).toBe(1);
      expect(stats.mostCommonError).toBe(ErrorCode.INVALID_INPUT);
    });

    it('should clear error history', () => {
      const error = new SequentialThinkingError(ErrorCode.INVALID_INPUT, 'Error');
      errorHandler.handleError(error);

      let stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(1);

      errorHandler.clearErrorHistory();
      stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(0);
    });
  });
});