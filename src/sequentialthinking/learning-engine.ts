import { ThoughtData, ThinkingPattern, ThinkingInsight, LearningMetrics } from './types.js';

export interface LearningSession {
    id: string;
    startTime: number;
    endTime?: number;
    thoughts: ThoughtData[];
    patterns: ThinkingPattern[];
    outcomes: SessionOutcome[];
    quality: number;
}

export interface SessionOutcome {
    type: 'success' | 'failure' | 'partial';
    description: string;
    factors: string[];
    lessons: string[];
}

export interface PatternEvolution {
    pattern: string;
    frequency: number;
    successRate: number;
    evolution: Array<{
        timestamp: number;
        change: string;
        impact: number;
    }>;
}

export class LearningEngine {
    private sessions: LearningSession[] = [];
    private patternEvolutions: Map<string, PatternEvolution> = new Map();
    private successfulStrategies: Map<string, number> = new Map();
    private commonPitfalls: Map<string, number> = new Map();
    private learningMetrics: LearningMetrics;

    constructor() {
        this.learningMetrics = {
            totalThoughts: 0,
            averageQuality: 0,
            commonPatterns: [],
            improvementAreas: [],
            successfulStrategies: []
        };
    }

    /**
     * 开始新的学习会话
     */
    startSession(): string {
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const session: LearningSession = {
            id: sessionId,
            startTime: Date.now(),
            thoughts: [],
            patterns: [],
            outcomes: [],
            quality: 0
        };

        this.sessions.push(session);
        return sessionId;
    }

    /**
     * 结束学习会话并分析
     */
    async endSession(sessionId: string, outcome: SessionOutcome): Promise<ThinkingInsight[]> {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        session.endTime = Date.now();
        session.outcomes.push(outcome);
        session.quality = this.calculateSessionQuality(session);

        // 分析会话并生成洞察
        const insights = await this.analyzeSession(session);

        // 更新学习指标
        this.updateLearningMetrics(session);

        // 更新模式演化
        this.updatePatternEvolutions(session);

        return insights;
    }

    /**
     * 记录思维到当前会话
     */
    recordThought(sessionId: string, thought: ThoughtData): void {
        const session = this.sessions.find(s => s.id === sessionId);
        if (session) {
            session.thoughts.push(thought);
        }
    }

    /**
     * 记录思维模式到当前会话
     */
    recordPattern(sessionId: string, pattern: ThinkingPattern): void {
        const session = this.sessions.find(s => s.id === sessionId);
        if (session) {
            session.patterns.push(pattern);
        }
    }

    /**
     * 分析思维模式的成功率
     */
    analyzePatternSuccess(): Map<string, number> {
        const patternSuccess = new Map<string, { success: number; total: number }>();

        this.sessions.forEach(session => {
            if (session.outcomes.length > 0) {
                const isSuccessful = session.outcomes.some(outcome => outcome.type === 'success');

                session.patterns.forEach(pattern => {
                    const current = patternSuccess.get(pattern.patternType) || { success: 0, total: 0 };
                    current.total++;
                    if (isSuccessful) {
                        current.success++;
                    }
                    patternSuccess.set(pattern.patternType, current);
                });
            }
        });

        // 计算成功率
        const successRates = new Map<string, number>();
        patternSuccess.forEach((stats, pattern) => {
            successRates.set(pattern, stats.success / stats.total);
        });

        return successRates;
    }

    /**
     * 识别改进机会
     */
    identifyImprovementOpportunities(): ThinkingInsight[] {
        const insights: ThinkingInsight[] = [];

        // 分析低成功率的模式
        const patternSuccess = this.analyzePatternSuccess();
        patternSuccess.forEach((successRate, pattern) => {
            if (successRate < 0.5 && this.getPatternFrequency(pattern) > 3) {
                insights.push({
                    type: 'improvement',
                    message: `思维模式 "${pattern}" 的成功率较低 (${(successRate * 100).toFixed(1)}%)，建议调整方法`,
                    confidence: 0.8,
                    actionable: true,
                    relatedThoughts: []
                });
            }
        });

        // 分析常见陷阱
        const pitfalls = this.identifyCommonPitfalls();
        pitfalls.forEach(pitfall => {
            insights.push({
                type: 'warning',
                message: `常见陷阱: ${pitfall.description}，出现频率: ${pitfall.frequency}次`,
                confidence: 0.7,
                actionable: true,
                relatedThoughts: []
            });
        });

        // 推荐成功策略
        const strategies = this.getTopSuccessfulStrategies(3);
        strategies.forEach(strategy => {
            insights.push({
                type: 'suggestion',
                message: `推荐策略: ${strategy.name}，成功率: ${(strategy.successRate * 100).toFixed(1)}%`,
                confidence: 0.9,
                actionable: true,
                relatedThoughts: []
            });
        });

        return insights.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * 获取学习进展报告
     */
    getProgressReport(): {
        totalSessions: number;
        averageSessionQuality: number;
        improvementTrend: number;
        topPatterns: Array<{ pattern: string; frequency: number; successRate: number }>;
        recentInsights: ThinkingInsight[];
    } {
        const recentSessions = this.sessions.slice(-10);
        const averageQuality = recentSessions.reduce((sum, s) => sum + s.quality, 0) / recentSessions.length;

        // 计算改进趋势
        const improvementTrend = this.calculateImprovementTrend();

        // 获取顶级模式
        const topPatterns = this.getTopPatterns(5);

        // 获取最近的洞察
        const recentInsights = this.identifyImprovementOpportunities().slice(0, 5);

        return {
            totalSessions: this.sessions.length,
            averageSessionQuality: averageQuality,
            improvementTrend,
            topPatterns,
            recentInsights
        };
    }

    /**
     * 预测最佳思维策略
     */
    predictOptimalStrategy(context: {
        problemType?: string;
        complexity?: number;
        timeConstraint?: number;
    }): ThinkingInsight {
        // 基于历史数据预测最佳策略
        const relevantSessions = this.findRelevantSessions(context);
        const successfulPatterns = relevantSessions
            .filter(s => s.outcomes.some(o => o.type === 'success'))
            .flatMap(s => s.patterns);

        if (successfulPatterns.length === 0) {
            return {
                type: 'suggestion',
                message: '建议采用系统性方法，逐步分析问题',
                confidence: 0.5,
                actionable: true,
                relatedThoughts: []
            };
        }

        // 找到最常见的成功模式
        const patternCounts = new Map<string, number>();
        successfulPatterns.forEach(pattern => {
            patternCounts.set(pattern.patternType, (patternCounts.get(pattern.patternType) || 0) + 1);
        });

        const mostSuccessfulPattern = Array.from(patternCounts.entries())
            .sort((a, b) => b[1] - a[1])[0];

        return {
            type: 'suggestion',
            message: `基于历史成功经验，建议采用 "${mostSuccessfulPattern[0]}" 思维模式`,
            confidence: Math.min(0.9, mostSuccessfulPattern[1] / successfulPatterns.length + 0.3),
            actionable: true,
            relatedThoughts: []
        };
    }

    /**
     * 导出学习数据
     */
    exportLearningData(): {
        sessions: LearningSession[];
        patterns: Array<{ pattern: string; evolution: PatternEvolution }>;
        metrics: LearningMetrics;
    } {
        return {
            sessions: this.sessions,
            patterns: Array.from(this.patternEvolutions.entries()).map(([pattern, evolution]) => ({
                pattern,
                evolution
            })),
            metrics: this.learningMetrics
        };
    }

    /**
     * 导入学习数据
     */
    importLearningData(data: {
        sessions: LearningSession[];
        patterns: Array<{ pattern: string; evolution: PatternEvolution }>;
        metrics: LearningMetrics;
    }): void {
        this.sessions = data.sessions;
        this.patternEvolutions = new Map(data.patterns.map(p => [p.pattern, p.evolution]));
        this.learningMetrics = data.metrics;
    }

    private calculateSessionQuality(session: LearningSession): number {
        if (session.thoughts.length === 0) return 0;

        // 基于思维质量和结果计算会话质量
        const thoughtQuality = session.thoughts.reduce((sum, thought) => {
            if (!thought.quality) return sum;
            return sum + (
                thought.quality.coherence +
                thought.quality.depth +
                thought.quality.breadth +
                thought.quality.originalityScore +
                thought.quality.relevance
            ) / 5;
        }, 0) / session.thoughts.length;

        // 结果质量
        const outcomeQuality = session.outcomes.reduce((sum, outcome) => {
            switch (outcome.type) {
                case 'success': return sum + 1;
                case 'partial': return sum + 0.5;
                case 'failure': return sum + 0;
                default: return sum;
            }
        }, 0) / Math.max(session.outcomes.length, 1);

        return (thoughtQuality * 0.7 + outcomeQuality * 0.3);
    }

    private async analyzeSession(session: LearningSession): Promise<ThinkingInsight[]> {
        const insights: ThinkingInsight[] = [];

        // 分析思维效率
        const duration = (session.endTime || Date.now()) - session.startTime;
        const thoughtsPerMinute = session.thoughts.length / (duration / 60000);

        if (thoughtsPerMinute < 0.5) {
            insights.push({
                type: 'improvement',
                message: '思维速度较慢，建议提高思考效率',
                confidence: 0.6,
                actionable: true,
                relatedThoughts: []
            });
        }

        // 分析思维深度变化
        const depthTrend = this.analyzeDepthTrend(session.thoughts);
        if (depthTrend < 0) {
            insights.push({
                type: 'warning',
                message: '思维深度呈下降趋势，建议保持专注',
                confidence: 0.7,
                actionable: true,
                relatedThoughts: []
            });
        }

        // 分析模式一致性
        const patternConsistency = this.analyzePatternConsistency(session.patterns);
        if (patternConsistency < 0.5) {
            insights.push({
                type: 'suggestion',
                message: '思维模式变化频繁，建议保持方法一致性',
                confidence: 0.6,
                actionable: true,
                relatedThoughts: []
            });
        }

        return insights;
    }

    private updateLearningMetrics(session: LearningSession): void {
        this.learningMetrics.totalThoughts += session.thoughts.length;

        // 更新平均质量
        const totalQuality = this.sessions.reduce((sum, s) => sum + s.quality, 0);
        this.learningMetrics.averageQuality = totalQuality / this.sessions.length;

        // 更新常见模式
        const patternCounts = new Map<string, number>();
        this.sessions.forEach(s => {
            s.patterns.forEach(p => {
                patternCounts.set(p.patternType, (patternCounts.get(p.patternType) || 0) + 1);
            });
        });

        this.learningMetrics.commonPatterns = Array.from(patternCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([pattern]) => pattern);

        // 更新成功策略
        this.updateSuccessfulStrategies(session);
    }

    private updateSuccessfulStrategies(session: LearningSession): void {
        const isSuccessful = session.outcomes.some(o => o.type === 'success');

        if (isSuccessful) {
            session.patterns.forEach(pattern => {
                const key = `${pattern.patternType}-${pattern.recommendedApproach}`;
                this.successfulStrategies.set(key, (this.successfulStrategies.get(key) || 0) + 1);
            });
        }

        // 更新学习指标中的成功策略
        this.learningMetrics.successfulStrategies = Array.from(this.successfulStrategies.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([strategy]) => strategy);
    }

    private updatePatternEvolutions(session: LearningSession): void {
        session.patterns.forEach(pattern => {
            const evolution = this.patternEvolutions.get(pattern.patternType) || {
                pattern: pattern.patternType,
                frequency: 0,
                successRate: 0,
                evolution: []
            };

            evolution.frequency++;

            const isSuccessful = session.outcomes.some(o => o.type === 'success');
            evolution.successRate = (evolution.successRate * (evolution.frequency - 1) + (isSuccessful ? 1 : 0)) / evolution.frequency;

            evolution.evolution.push({
                timestamp: Date.now(),
                change: `Used in session ${session.id}`,
                impact: isSuccessful ? 1 : -0.5
            });

            this.patternEvolutions.set(pattern.patternType, evolution);
        });
    }

    private getPatternFrequency(pattern: string): number {
        return this.patternEvolutions.get(pattern)?.frequency || 0;
    }

    private identifyCommonPitfalls(): Array<{ description: string; frequency: number }> {
        const pitfalls: Array<{ description: string; frequency: number }> = [];

        // 分析失败会话的共同特征
        const failedSessions = this.sessions.filter(s =>
            s.outcomes.some(o => o.type === 'failure')
        );

        const pitfallCounts = new Map<string, number>();
        failedSessions.forEach(session => {
            session.outcomes.forEach(outcome => {
                outcome.factors.forEach(factor => {
                    pitfallCounts.set(factor, (pitfallCounts.get(factor) || 0) + 1);
                });
            });
        });

        pitfallCounts.forEach((count, pitfall) => {
            if (count > 2) { // 至少出现3次
                pitfalls.push({ description: pitfall, frequency: count });
            }
        });

        return pitfalls.sort((a, b) => b.frequency - a.frequency);
    }

    private getTopSuccessfulStrategies(limit: number): Array<{ name: string; successRate: number }> {
        const strategies: Array<{ name: string; successRate: number }> = [];

        this.successfulStrategies.forEach((count, strategy) => {
            const totalUsage = this.getTotalStrategyUsage(strategy);
            const successRate = count / totalUsage;

            if (totalUsage > 2) { // 至少使用过3次
                strategies.push({ name: strategy, successRate });
            }
        });

        return strategies
            .sort((a, b) => b.successRate - a.successRate)
            .slice(0, limit);
    }

    private getTotalStrategyUsage(strategy: string): number {
        // 计算策略的总使用次数
        let total = 0;
        this.sessions.forEach(session => {
            session.patterns.forEach(pattern => {
                const key = `${pattern.patternType}-${pattern.recommendedApproach}`;
                if (key === strategy) {
                    total++;
                }
            });
        });
        return total;
    }

    private calculateImprovementTrend(): number {
        if (this.sessions.length < 5) return 0;

        const recentSessions = this.sessions.slice(-5);
        const olderSessions = this.sessions.slice(-10, -5);

        const recentAvg = recentSessions.reduce((sum, s) => sum + s.quality, 0) / recentSessions.length;
        const olderAvg = olderSessions.reduce((sum, s) => sum + s.quality, 0) / Math.max(olderSessions.length, 1);

        return recentAvg - olderAvg;
    }

    private getTopPatterns(limit: number): Array<{ pattern: string; frequency: number; successRate: number }> {
        return Array.from(this.patternEvolutions.entries())
            .map(([pattern, evolution]) => ({
                pattern,
                frequency: evolution.frequency,
                successRate: evolution.successRate
            }))
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, limit);
    }

    private findRelevantSessions(context: any): LearningSession[] {
        // 简单的相关性匹配，实际应用中可以更复杂
        return this.sessions.filter(session => {
            // 基于会话质量和结果筛选相关会话
            return session.quality > 0.5 && session.outcomes.length > 0;
        });
    }

    private analyzeDepthTrend(thoughts: ThoughtData[]): number {
        if (thoughts.length < 3) return 0;

        const depths = thoughts.map(t => t.quality?.depth || 0.5);
        const firstHalf = depths.slice(0, Math.floor(depths.length / 2));
        const secondHalf = depths.slice(Math.floor(depths.length / 2));

        const firstAvg = firstHalf.reduce((sum, d) => sum + d, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, d) => sum + d, 0) / secondHalf.length;

        return secondAvg - firstAvg;
    }

    private analyzePatternConsistency(patterns: ThinkingPattern[]): number {
        if (patterns.length < 2) return 1;

        const patternTypes = patterns.map(p => p.patternType);
        const uniquePatterns = new Set(patternTypes);

        return 1 - (uniquePatterns.size - 1) / (patternTypes.length - 1);
    }
}