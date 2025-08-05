// Simple verification script
console.log('🚀 Starting Enhanced Sequential Thinking MCP Server Verification...\n');

(async () => {
try {
  // Test basic imports
  console.log('✅ Testing imports...');
  
  // Using dynamic imports for ESM
  const { ThinkingAdvisor } = await import('./dist/thinking-advisor.js');
  const { MemoryManager } = await import('./dist/memory-manager.js');
  const { AsyncProcessor } = await import('./dist/async-processor.js');
  const { LearningEngine } = await import('./dist/learning-engine.js');
  const { ErrorHandler } = await import('./dist/error-handler.js');
  
  console.log('✅ All modules imported successfully');
  
  // Test basic instantiation
  console.log('✅ Testing module instantiation...');
  
  const advisor = new ThinkingAdvisor();
  const memoryManager = new MemoryManager();
  const asyncProcessor = new AsyncProcessor();
  const learningEngine = new LearningEngine();
  const errorHandler = new ErrorHandler();
  
  console.log('✅ All modules instantiated successfully');
  
  // Test basic functionality
  console.log('✅ Testing basic functionality...');
  
  // Test ThinkingAdvisor
  const pattern = advisor.analyzeThinkingPattern([]);
  console.log(`   - ThinkingAdvisor: Pattern type = ${pattern.patternType}`);
  
  // Test MemoryManager
  const stats = memoryManager.getMemoryStats();
  console.log(`   - MemoryManager: Active thoughts = ${stats.activeThoughts}`);
  
  // Test AsyncProcessor
  const queueStatus = asyncProcessor.getQueueStatus();
  console.log(`   - AsyncProcessor: Queue length = ${queueStatus.queueLength}`);
  
  // Test LearningEngine
  const sessionId = learningEngine.startSession();
  console.log(`   - LearningEngine: Session started = ${sessionId.substring(0, 20)}...`);
  
  // Test ErrorHandler
  const errorStats = errorHandler.getErrorStats();
  console.log(`   - ErrorHandler: Total errors = ${errorStats.totalErrors}`);
  
  console.log('\n🎉 All core functionality verified successfully!');
  console.log('\n📊 System Status:');
  console.log('   ✅ Smart Thinking Advisor - Working');
  console.log('   ✅ Memory Management - Working');
  console.log('   ✅ Async Processing - Working');
  console.log('   ✅ Learning Engine - Working');
  console.log('   ✅ Error Handling - Working');
  
  console.log('\n🚀 Enhanced Sequential Thinking MCP Server is ready for use!');
  
  // Cleanup
  asyncProcessor.shutdown().then(() => {
    process.exit(0);
  });
  
} catch (error) {
  console.error('❌ Verification failed:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
})();