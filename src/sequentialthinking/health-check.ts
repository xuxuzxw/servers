#!/usr/bin/env node

/**
 * Health check and monitoring tool for Enhanced Sequential Thinking MCP Server
 */

import { ThinkingAdvisor } from './thinking-advisor.js';
import { MemoryManager } from './memory-manager.js';
import { AsyncProcessor } from './async-processor.js';
import { LearningEngine } from './learning-engine.js';
import { ErrorHandler } from './error-handler.js';

interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  metrics?: Record<string, any>;
  timestamp: number;
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  components: HealthCheckResult[];
  summary: {
    healthy: number;
    warning: number;
    critical: number;
  };
  recommendations: string[];
}

export class HealthMonitor {
  private thinkingAdvisor: ThinkingAdvisor;
  private memoryManager: MemoryManager;
  private asyncProcessor: AsyncProcessor;
  private learningEngine: LearningEngine;
  private errorHandler: ErrorHandler;

  constructor() {
    this.thinkingAdvisor = new ThinkingAdvisor();
    this.memoryManager = new MemoryManager();
    this.asyncProcessor = new AsyncProcessor();
    this.learningEngine = new LearningEngine();
    this.errorHandler = new ErrorHandler();
  }

  async performHealthCheck(): Promise<SystemHealth> {
    console.log('🏥 Performing system health check...\n');

    const results: HealthCheckResult[] = [];

    // Check each component
    results.push(await this.checkThinkingAdvisor());
    results.push(await this.checkMemoryManager());
    results.push(await this.checkAsyncProcessor());
    results.push(await this.checkLearningEngine());
    results.push(await this.checkErrorHandler());
    results.push(await this.checkSystemResources());

    // Calculate overall health
    const summary = {
      healthy: results.filter(r => r.status === 'healthy').length,
      warning: results.filter(r => r.status === 'warning').length,
      critical: results.filter(r => r.status === 'critical').length
    };

    const overall = summary.critical > 0 ? 'critical' :
      summary.warning > 0 ? 'warning' : 'healthy';

    const recommendations = this.generateRecommendations(results);

    return {
      overall,
      components: results,
      summary,
      recommendations
    };
  }

  private async checkThinkingAdvisor(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();

      // Test pattern analysis
      const mockThoughts = this.generateMockThoughts(5);
      const pattern = this.thinkingAdvisor.analyzeThinkingPattern(mockThoughts);

      // Test quality evaluation
      const quality = this.thinkingAdvisor.evaluateThoughtQuality(mockThoughts[0], mockThoughts);

      // Test insight generation
      const insights = this.thinkingAdvisor.generateInsights(mockThoughts);

      const responseTime = Date.now() - startTime;

      // Validate results
      const isHealthy =
        pattern && typeof pattern.confidence === 'number' &&
        quality && typeof quality.coherence === 'number' &&
        Array.isArray(insights);

      return {
        component: 'ThinkingAdvisor',
        status: isHealthy ? (responseTime > 1000 ? 'warning' : 'healthy') : 'critical',
        message: isHealthy ?
          `All functions operational (${responseTime}ms)` :
          'Component functions not working correctly',
        metrics: {
          responseTime,
          patternConfidence: pattern?.confidence,
          qualityMetrics: quality,
          insightCount: insights?.length
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        component: 'ThinkingAdvisor',
        status: 'critical',
        message: `Component failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now()
      };
    }
  }

  private async checkMemoryManager(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();

      // Test memory management
      const mockThoughts = this.generateMockThoughts(20);
      const managedThoughts = await this.memoryManager.manageThoughtHistory(mockThoughts);

      // Test memory stats
      const stats = this.memoryManager.getMemoryStats();

      // Test search functionality
      const searchResults = this.memoryManager.searchCompressedThoughts('test');

      const responseTime = Date.now() - startTime;

      // Check memory usage
      const memoryUsage = stats.totalMemoryUsage;
      const isMemoryHealthy = memoryUsage < 100 * 1024 * 1024; // 100MB threshold

      const status = !isMemoryHealthy ? 'warning' :
        responseTime > 2000 ? 'warning' : 'healthy';

      return {
        component: 'MemoryManager',
        status,
        message: `Memory management operational (${responseTime}ms, ${(memoryUsage / 1024 / 1024).toFixed(2)}MB)`,
        metrics: {
          responseTime,
          memoryUsage,
          activeThoughts: stats.activeThoughts,
          compressedThoughts: stats.compressedThoughts,
          compressionRatio: stats.compressionRatio,
          searchResultCount: searchResults.length,
          managedThoughtCount: managedThoughts.length
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        component: 'MemoryManager',
        status: 'critical',
        message: `Memory management failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now()
      };
    }
  }

  private async checkAsyncProcessor(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();

      // Test task processing
      const taskId = this.asyncProcessor.addTask({
        type: 'quality_evaluation',
        data: { healthCheck: true },
        priority: 10
      });

      const result = await this.asyncProcessor.waitForTask(taskId);
      const queueStatus = this.asyncProcessor.getQueueStatus();

      const responseTime = Date.now() - startTime;

      const isHealthy = result?.success === true;
      const isQueueHealthy = queueStatus.queueLength < 50; // Queue length threshold

      const status = !isHealthy ? 'critical' :
        !isQueueHealthy ? 'warning' :
          responseTime > 5000 ? 'warning' : 'healthy';

      return {
        component: 'AsyncProcessor',
        status,
        message: `Task processing ${isHealthy ? 'successful' : 'failed'} (${responseTime}ms)`,
        metrics: {
          responseTime,
          taskSuccess: result?.success,
          taskProcessingTime: result?.processingTime,
          queueStatus,
          queueHealthy: isQueueHealthy
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        component: 'AsyncProcessor',
        status: 'critical',
        message: `Async processing failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now()
      };
    }
  }

  private async checkLearningEngine(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();

      // Test session management
      const sessionId = this.learningEngine.startSession();

      // Add test data
      const mockThought = this.generateMockThoughts(1)[0];
      this.learningEngine.recordThought(sessionId, mockThought);

      const mockPattern = {
        patternType: 'analytical' as const,
        confidence: 0.8,
        characteristics: ['test'],
        suggestedNextSteps: ['test'],
        potentialPitfalls: ['test'],
        recommendedApproach: 'test'
      };
      this.learningEngine.recordPattern(sessionId, mockPattern);

      // Test analysis functions
      const progressReport = this.learningEngine.getProgressReport();
      const improvements = this.learningEngine.identifyImprovementOpportunities();
      const prediction = this.learningEngine.predictOptimalStrategy({});

      // End session
      await this.learningEngine.endSession(sessionId, {
        type: 'success',
        description: 'Health check session',
        factors: ['health check'],
        lessons: ['system operational']
      });

      const responseTime = Date.now() - startTime;

      const isHealthy =
        typeof progressReport.totalSessions === 'number' &&
        Array.isArray(improvements) &&
        prediction && typeof prediction.confidence === 'number';

      return {
        component: 'LearningEngine',
        status: isHealthy ? (responseTime > 3000 ? 'warning' : 'healthy') : 'critical',
        message: `Learning functions ${isHealthy ? 'operational' : 'failed'} (${responseTime}ms)`,
        metrics: {
          responseTime,
          totalSessions: progressReport.totalSessions,
          improvementCount: improvements.length,
          predictionConfidence: prediction?.confidence,
          averageQuality: progressReport.averageSessionQuality
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        component: 'LearningEngine',
        status: 'critical',
        message: `Learning engine failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now()
      };
    }
  }

  private async checkErrorHandler(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();

      // Test error handling
      const testError = new Error('Health check test error');
      const errorResponse = this.errorHandler.handleError(testError, { healthCheck: true });

      // Test input validation
      let validationWorked = false;
      try {
        this.errorHandler.validateInput({ invalid: 'input' });
      } catch (validationError) {
        validationWorked = true;
      }

      // Test resource checking
      let resourceCheckWorked = false;
      try {
        this.errorHandler.checkResourceLimits({ memoryUsage: 1000 * 1024 * 1024 });
      } catch (resourceError) {
        resourceCheckWorked = true;
      }

      // Get error stats
      const errorStats = this.errorHandler.getErrorStats();

      const responseTime = Date.now() - startTime;

      const isHealthy =
        errorResponse.isError === true &&
        validationWorked &&
        resourceCheckWorked &&
        typeof errorStats.totalErrors === 'number';

      return {
        component: 'ErrorHandler',
        status: isHealthy ? 'healthy' : 'critical',
        message: `Error handling ${isHealthy ? 'operational' : 'failed'} (${responseTime}ms)`,
        metrics: {
          responseTime,
          errorStats,
          validationWorking: validationWorked,
          resourceCheckWorking: resourceCheckWorked
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        component: 'ErrorHandler',
        status: 'critical',
        message: `Error handler failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now()
      };
    }
  }

  private async checkSystemResources(): Promise<HealthCheckResult> {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const uptime = process.uptime();

      // Memory thresholds (in bytes)
      const memoryWarningThreshold = 512 * 1024 * 1024; // 512MB
      const memoryCriticalThreshold = 1024 * 1024 * 1024; // 1GB

      const heapUsed = memoryUsage.heapUsed;
      const heapTotal = memoryUsage.heapTotal;
      const external = memoryUsage.external;

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      let message = 'System resources within normal limits';

      if (heapUsed > memoryCriticalThreshold) {
        status = 'critical';
        message = 'Critical memory usage detected';
      } else if (heapUsed > memoryWarningThreshold) {
        status = 'warning';
        message = 'High memory usage detected';
      }

      return {
        component: 'SystemResources',
        status,
        message: `${message} (${(heapUsed / 1024 / 1024).toFixed(2)}MB heap)`,
        metrics: {
          memory: {
            heapUsed: heapUsed,
            heapTotal: heapTotal,
            external: external,
            rss: memoryUsage.rss,
            heapUsedMB: heapUsed / 1024 / 1024,
            heapTotalMB: heapTotal / 1024 / 1024
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          },
          uptime: uptime,
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        component: 'SystemResources',
        status: 'critical',
        message: `System resource check failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now()
      };
    }
  }

  private generateRecommendations(results: HealthCheckResult[]): string[] {
    const recommendations: string[] = [];

    results.forEach(result => {
      switch (result.component) {
        case 'ThinkingAdvisor':
          if (result.status === 'warning' && result.metrics?.responseTime > 1000) {
            recommendations.push('Consider optimizing ThinkingAdvisor algorithms for better performance');
          }
          break;

        case 'MemoryManager':
          if (result.status === 'warning') {
            if (result.metrics?.memoryUsage > 50 * 1024 * 1024) {
              recommendations.push('Memory usage is high - consider reducing retention period or compression threshold');
            }
            if (result.metrics?.responseTime > 2000) {
              recommendations.push('Memory management is slow - consider optimizing compression algorithms');
            }
          }
          break;

        case 'AsyncProcessor':
          if (result.status === 'warning') {
            if (!result.metrics?.queueHealthy) {
              recommendations.push('Task queue is getting full - consider increasing concurrent task limit or processing speed');
            }
            if (result.metrics?.responseTime > 5000) {
              recommendations.push('Task processing is slow - review task timeout settings and processing logic');
            }
          }
          break;

        case 'LearningEngine':
          if (result.status === 'warning' && result.metrics?.responseTime > 3000) {
            recommendations.push('Learning engine is slow - consider optimizing analysis algorithms');
          }
          break;

        case 'SystemResources':
          if (result.status === 'warning') {
            recommendations.push('System memory usage is high - consider restarting the service or increasing available memory');
          }
          if (result.status === 'critical') {
            recommendations.push('CRITICAL: System memory usage is very high - immediate action required');
          }
          break;
      }

      if (result.status === 'critical') {
        recommendations.push(`CRITICAL: ${result.component} is not functioning properly - investigate immediately`);
      }
    });

    // General recommendations
    if (results.filter(r => r.status === 'warning').length > 2) {
      recommendations.push('Multiple components showing warnings - consider system maintenance');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is healthy - no immediate action required');
    }

    return recommendations;
  }

  private generateMockThoughts(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      thought: `Health check thought ${i + 1}`,
      thoughtNumber: i + 1,
      totalThoughts: count,
      nextThoughtNeeded: i < count - 1,
      timestamp: Date.now(),
      quality: {
        coherence: 0.8,
        depth: 0.7,
        breadth: 0.6,
        originalityScore: 0.5,
        relevance: 0.9
      }
    }));
  }

  async cleanup(): Promise<void> {
    await this.asyncProcessor.shutdown();
  }

  printHealthReport(health: SystemHealth): void {
    console.log('🏥 System Health Report');
    console.log('='.repeat(60));
    console.log(`Overall Status: ${this.getStatusEmoji(health.overall)} ${health.overall.toUpperCase()}`);
    console.log(`Components: ${health.summary.healthy} healthy, ${health.summary.warning} warning, ${health.summary.critical} critical`);
    console.log('');

    console.log('Component Details:');
    console.log('-'.repeat(60));

    health.components.forEach(component => {
      console.log(`${this.getStatusEmoji(component.status)} ${component.component.padEnd(20)} ${component.message}`);

      if (component.metrics && Object.keys(component.metrics).length > 0) {
        const importantMetrics = this.getImportantMetrics(component);
        if (importantMetrics.length > 0) {
          console.log(`   Metrics: ${importantMetrics.join(', ')}`);
        }
      }
    });

    console.log('');
    console.log('Recommendations:');
    console.log('-'.repeat(60));
    health.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });

    console.log('');
    console.log(`Report generated at: ${new Date().toISOString()}`);
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '❌';
      default: return '❓';
    }
  }

  private getImportantMetrics(component: HealthCheckResult): string[] {
    const metrics: string[] = [];

    if (component.metrics?.responseTime) {
      metrics.push(`${component.metrics.responseTime}ms`);
    }

    if (component.metrics?.memoryUsage) {
      metrics.push(`${(component.metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
    }

    if (component.metrics?.queueStatus?.queueLength !== undefined) {
      metrics.push(`queue: ${component.metrics.queueStatus.queueLength}`);
    }

    if (component.metrics?.totalSessions !== undefined) {
      metrics.push(`sessions: ${component.metrics.totalSessions}`);
    }

    return metrics;
  }
}

// Run health check if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new HealthMonitor();

  monitor.performHealthCheck()
    .then(async (health) => {
      monitor.printHealthReport(health);
      await monitor.cleanup();
      process.exit(health.overall === 'critical' ? 1 : 0);
    })
    .catch(error => {
      console.error('Health check failed:', error);
      process.exit(1);
    });
}