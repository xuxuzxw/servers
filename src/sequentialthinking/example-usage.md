# Enhanced Sequential Thinking MCP Server - 使用示例

## 功能概述

优化后的 Sequential Thinking MCP Server 提供了以下增强功能：

### 🧠 智能思维建议
- 自动识别思维模式（分析型、创意型、系统型等）
- 基于当前模式提供个性化建议
- 预测最佳思维策略

### 💾 内存管理优化
- 自动压缩历史思维记录
- 智能清理低质量思维
- 内存使用统计和监控

### ⚡ 异步处理优化
- 并行处理思维质量评估
- 后台生成洞察和建议
- 批量处理提升性能

### 📈 学习和改进
- 从历史思维模式中学习
- 识别成功策略和常见陷阱
- 提供个性化改进建议

## 使用示例

### 基本思维处理

```json
{
  "thought": "我需要分析这个复杂的技术问题，首先让我理解问题的核心",
  "thoughtNumber": 1,
  "totalThoughts": 5,
  "nextThoughtNeeded": true,
  "context": "技术问题分析",
  "tags": ["分析", "技术", "问题解决"]
}
```

**增强响应示例：**
```json
{
  "thoughtNumber": 1,
  "totalThoughts": 5,
  "nextThoughtNeeded": true,
  "pattern": {
    "type": "analytical",
    "confidence": 0.85,
    "suggestedNextSteps": [
      "深入分析关键因素",
      "寻找因果关系"
    ],
    "potentialPitfalls": [
      "过度分析导致行动瘫痪"
    ]
  },
  "insights": [
    {
      "type": "suggestion",
      "message": "建议在分析过程中设定时间边界，避免过度分析",
      "confidence": 0.7
    }
  ],
  "quality": {
    "overall": 0.75,
    "depth": 0.8,
    "coherence": 0.9
  },
  "memoryStats": {
    "activeThoughts": 1,
    "compressionRatio": 1.0
  }
}
```

### 修订思维

```json
{
  "thought": "重新考虑我之前的分析，我觉得遗漏了一个重要的安全因素",
  "thoughtNumber": 6,
  "totalThoughts": 8,
  "nextThoughtNeeded": true,
  "isRevision": true,
  "revisesThought": 3,
  "context": "安全因素补充分析"
}
```

### 分支思维

```json
{
  "thought": "让我从另一个角度探索这个问题 - 从用户体验的角度",
  "thoughtNumber": 4,
  "totalThoughts": 6,
  "nextThoughtNeeded": true,
  "branchFromThought": 2,
  "branchId": "ux-perspective",
  "context": "用户体验角度分析"
}
```

## 高级功能

### 1. 思维模式识别

系统会自动识别以下思维模式：
- **analytical**: 逻辑分析型
- **creative**: 创意发散型  
- **systematic**: 系统方法型
- **exploratory**: 探索发现型
- **iterative**: 迭代改进型

### 2. 质量评估指标

每个思维都会被评估以下维度：
- **coherence**: 连贯性 (与上下文的一致性)
- **depth**: 深度 (分析的深入程度)
- **breadth**: 广度 (考虑的范围)
- **originality**: 原创性 (新颖程度)
- **relevance**: 相关性 (与问题的相关度)

### 3. 智能建议类型

- **pattern**: 模式识别建议
- **improvement**: 改进建议
- **warning**: 警告提醒
- **suggestion**: 一般建议

### 4. 内存管理

- 自动压缩超过阈值的历史思维
- 保留高质量和最近的思维
- 提供内存使用统计

## 配置选项

### 内存管理配置
```typescript
{
  maxThoughts: 100,           // 最大活跃思维数
  compressionThreshold: 50,   // 压缩阈值
  retentionPeriod: 86400000,  // 保留期间(毫秒)
  qualityThreshold: 0.3       // 质量阈值
}
```

### 异步处理配置
```typescript
{
  maxConcurrentTasks: 3,      // 最大并发任务数
  taskTimeout: 5000,          // 任务超时时间
  maxRetries: 2               // 最大重试次数
}
```

## 最佳实践

### 1. 有效使用标签
```json
{
  "tags": ["分析", "技术", "安全", "性能"]
}
```

### 2. 提供上下文信息
```json
{
  "context": "在微服务架构中分析数据库性能问题"
}
```

### 3. 合理使用分支
- 为不同的探索方向创建分支
- 使用有意义的分支ID
- 适时合并或选择最佳分支

### 4. 关注质量反馈
- 注意质量评分，特别是深度和连贯性
- 根据建议调整思维方式
- 学习成功的思维模式

## 性能优化

### 1. 异步处理
- 质量评估在后台进行
- 洞察生成不阻塞主流程
- 批量处理提升效率

### 2. 内存优化
- 自动压缩历史数据
- 智能清理低质量内容
- 实时监控内存使用

### 3. 学习优化
- 从成功模式中学习
- 避免重复的陷阱
- 个性化建议越来越准确

## 故障排除

### 常见问题

1. **质量评估失败**
   - 检查思维内容是否完整
   - 确认网络连接正常

2. **内存使用过高**
   - 调整压缩阈值
   - 减少保留期间

3. **响应时间过长**
   - 减少并发任务数
   - 调整超时时间

### 调试模式

设置环境变量启用详细日志：
```bash
DISABLE_THOUGHT_LOGGING=false
```

这个优化版本提供了更智能、更高效的思维处理能力，帮助用户更好地进行结构化思考和问题解决。