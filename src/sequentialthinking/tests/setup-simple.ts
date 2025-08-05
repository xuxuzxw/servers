// Simplified Jest setup file

// Global test utilities
(global as any).createMockThought = (
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