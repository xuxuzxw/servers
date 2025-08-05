# Enhanced Sequential Thinking MCP Server - 部署指南

## 🚀 快速开始

### 1. 安装依赖

```bash
cd src/sequentialthinking
npm install
```

### 2. 构建项目

```bash
npm run build
```

### 3. 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行集成测试
npm run test:integration
```

### 4. 性能基准测试

```bash
npm run benchmark
```

### 5. 健康检查

```bash
npm run health-check
```

### 6. 启动服务器

```bash
npm start
```

## 📋 系统要求

- **Node.js**: >= 18.0.0
- **TypeScript**: >= 5.0.0
- **内存**: 建议 >= 512MB
- **操作系统**: Windows, macOS, Linux

## 🔧 配置选项

### 环境变量

```bash
# 禁用思维日志记录
DISABLE_THOUGHT_LOGGING=true

# 设置开发模式
NODE_ENV=development

# 设置日志级别
LOG_LEVEL=info
```

### 内存管理配置

```typescript
const memoryConfig = {
  maxThoughts: 100,           // 最大活跃思维数
  compressionThreshold: 50,   // 压缩阈值
  retentionPeriod: 86400000,  // 保留期间(毫秒)
  qualityThreshold: 0.3       // 质量阈值
};
```

### 异步处理配置

```typescript
const asyncConfig = {
  maxConcurrentTasks: 3,      // 最大并发任务数
  taskTimeout: 5000,          // 任务超时时间
  maxRetries: 2               // 最大重试次数
};
```

## 🐳 Docker 部署

### 1. 构建 Docker 镜像

```bash
docker build -t enhanced-sequential-thinking -f Dockerfile .
```

### 2. 运行容器

```bash
docker run -d \
  --name sequential-thinking \
  -p 3000:3000 \
  -e DISABLE_THOUGHT_LOGGING=false \
  enhanced-sequential-thinking
```

### 3. Docker Compose

```yaml
version: '3.8'
services:
  sequential-thinking:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DISABLE_THOUGHT_LOGGING=false
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "dist/health-check.js"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## 🔍 监控和维护

### 健康检查

系统提供内置的健康检查功能：

```bash
# 运行健康检查
npm run health-check

# 或直接运行
node dist/health-check.js
```

健康检查会验证：
- ThinkingAdvisor 功能
- MemoryManager 状态
- AsyncProcessor 性能
- LearningEngine 运行状态
- ErrorHandler 功能
- 系统资源使用情况

### 性能监控

```bash
# 运行性能基准测试
npm run benchmark
```

基准测试包括：
- 思维分析性能
- 内存管理效率
- 异步处理吞吐量
- 学习引擎响应时间
- 集成工作流性能

### 日志监控

系统会输出结构化日志：

```bash
# 查看实时日志
tail -f logs/sequential-thinking.log

# 使用 journalctl (systemd)
journalctl -u sequential-thinking -f
```

## 🚨 故障排除

### 常见问题

#### 1. 内存使用过高

**症状**: 系统响应缓慢，内存使用超过 500MB

**解决方案**:
```bash
# 检查内存使用
npm run health-check

# 调整内存配置
# 在代码中修改 MemoryConfig
{
  maxThoughts: 50,           // 减少最大思维数
  compressionThreshold: 25,  // 降低压缩阈值
  qualityThreshold: 0.5      // 提高质量阈值
}
```

#### 2. 任务队列堵塞

**症状**: 异步任务处理缓慢

**解决方案**:
```bash
# 检查队列状态
npm run health-check

# 调整异步处理配置
{
  maxConcurrentTasks: 5,     // 增加并发任务数
  taskTimeout: 3000,         // 减少超时时间
  maxRetries: 1              // 减少重试次数
}
```

#### 3. 学习数据损坏

**症状**: 学习引擎报错或建议质量下降

**解决方案**:
```bash
# 清理学习数据
rm -rf data/learning-*.json

# 重启服务
npm start
```

#### 4. 依赖问题

**症状**: 模块导入错误

**解决方案**:
```bash
# 清理并重新安装依赖
npm run clean
rm -rf node_modules package-lock.json
npm install

# 重新构建
npm run build
```

### 错误代码参考

| 错误代码 | 描述 | 解决方案 |
|---------|------|----------|
| INVALID_INPUT | 输入数据格式错误 | 检查输入参数格式 |
| MEMORY_ERROR | 内存不足 | 调整内存配置或重启服务 |
| TIMEOUT_ERROR | 操作超时 | 增加超时时间或优化处理逻辑 |
| RESOURCE_EXHAUSTED | 系统资源不足 | 检查系统资源使用情况 |
| TASK_QUEUE_FULL | 任务队列已满 | 增加并发处理能力 |

## 📊 性能优化

### 1. 内存优化

```typescript
// 启用积极的内存管理
const optimizedMemoryConfig = {
  maxThoughts: 50,
  compressionThreshold: 20,
  retentionPeriod: 3600000,  // 1小时
  qualityThreshold: 0.4
};
```

### 2. 处理优化

```typescript
// 提高并发处理能力
const optimizedAsyncConfig = {
  maxConcurrentTasks: 8,
  taskTimeout: 2000,
  maxRetries: 1
};
```

### 3. 缓存优化

```bash
# 启用 Node.js 优化
export NODE_OPTIONS="--max-old-space-size=1024 --optimize-for-size"
```

## 🔒 安全配置

### 1. 输入验证

系统自动验证所有输入数据，包括：
- 字段类型检查
- 数值范围验证
- 字符串长度限制
- 数组大小限制

### 2. 资源限制

```typescript
// 设置资源限制
const resourceLimits = {
  maxMemoryUsage: 512 * 1024 * 1024,  // 512MB
  maxActiveThoughts: 1000,
  maxQueueLength: 100
};
```

### 3. 错误处理

- 所有错误都被捕获和记录
- 敏感信息不会暴露给客户端
- 提供用户友好的错误消息

## 📈 扩展性

### 水平扩展

```bash
# 使用 PM2 进行集群部署
npm install -g pm2

# 启动集群
pm2 start ecosystem.config.js
```

### 负载均衡

```nginx
upstream sequential_thinking {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    listen 80;
    location / {
        proxy_pass http://sequential_thinking;
    }
}
```

## 🔄 更新和维护

### 版本更新

```bash
# 备份当前版本
cp -r src/sequentialthinking src/sequentialthinking.backup

# 更新代码
git pull origin main

# 重新构建和测试
npm run validate

# 部署新版本
npm start
```

### 数据备份

```bash
# 备份学习数据
cp -r data/ backup/data-$(date +%Y%m%d)

# 备份配置文件
cp config/*.json backup/config-$(date +%Y%m%d)
```

### 定期维护

建议每周执行：

```bash
# 运行完整验证
npm run validate

# 清理临时文件
npm run clean

# 检查系统健康
npm run health-check

# 更新依赖
npm audit fix
```

## 📞 支持和帮助

如果遇到问题：

1. 查看错误日志
2. 运行健康检查
3. 查看本文档的故障排除部分
4. 检查 GitHub Issues
5. 联系技术支持

---

**注意**: 这是一个增强版的 MCP 服务器，包含了 AI 驱动的思维分析、内存优化、异步处理和学习能力。请确保在生产环境中进行充分的测试。