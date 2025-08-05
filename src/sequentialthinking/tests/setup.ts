// Jest setup file for Sequential Thinking MCP Server tests

// Global test configuration - suppress console during tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  // Suppress console.error during tests unless explicitly needed
  error: () => {},
  warn: () => {},
  log: () => {},
  info: () => {},
  debug: () => {}
};

// Global test utilities
global.createMockThought = (
  thought: string,
  thoughtNumber: number,
  options: any = {}
) => ({
  thought,
  thoughtNumber,
  totalThoughts: options.totalThoughts || 5,
  nextThoughtNeeded: options.nextThoughtNeeded !== false,
  timestamp: options.timestamp || Date.now(),
  isRevision: options.isRevision,
  revisesThought: options.revisesThought,
  branchFromThought: options.branchFromThought,
  branchId: options.branchId,
  needsMoreThoughts: options.needsMoreThoughts,
  context: options.context,
  tags: options.tags,
  quality: options.quality
});

// Extend Jest matchers (will be available when Jest runs)
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toHaveValidQualityMetrics(): R;
    }
  }
  
  function createMockThought(
    thought: string,
    thoughtNumber: number,
    options?: any
  ): any;
}

// This will be executed by Jest
if (typeof expect !== 'undefined') {
  expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toHaveValidQualityMetrics(received: any) {
    const requiredFields = ['coherence', 'depth', 'breadth', 'originalityScore', 'relevance'];
    const pass = requiredFields.every(field => 
      field in received && 
      typeof received[field] === 'number' &&
      received[field] >= 0 && 
      received[field] <= 1
    );
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to have valid quality metrics`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to have valid quality metrics`,
        pass: false,
      };
    }
  });
}