# Memory MCP Server - Docker 部署指南

本指南介绍如何使用Docker运行优化后的Memory MCP Server。

## 🚀 快速开始

### 方法1: 使用Docker Compose（推荐）

```bash
# 构建并启动服务
docker-compose up --build -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs memory-server

# 停止服务
docker-compose down
```

### 方法2: 使用PowerShell脚本

```powershell
# Windows PowerShell
.\run-docker.ps1
```

### 方法3: 手动Docker命令

```bash
# 构建镜像
docker build -t memory-server .

# 运行容器
docker run --rm -it \
  -v "$(pwd)/docker-data:/app/data" \
  -e MEMORY_FILE_PATH="/app/data/memory.json" \
  memory-server
```

## 📁 数据持久化

- 知识图谱数据保存在 `./docker-data/memory.json`
- 容器重启后数据不会丢失
- 可以备份 `docker-data` 目录来保存数据

## 🔧 配置选项

### 环境变量

- `MEMORY_FILE_PATH`: 知识图谱数据文件路径（默认: `/app/data/memory.json`）
- `NODE_ENV`: 运行环境（默认: `production`）

### 数据卷挂载

```yaml
volumes:
  - ./docker-data:/app/data  # 数据持久化
  - ./custom-config:/app/config  # 自定义配置（可选）
```

## 🛠️ 开发模式

如果需要开发模式，可以修改 `docker-compose.yml`：

```yaml
services:
  memory-server:
    build: .
    volumes:
      - .:/app  # 挂载源代码
      - /app/node_modules  # 排除node_modules
    environment:
      - NODE_ENV=development
    command: npm run watch  # 使用watch模式
```

## 📊 性能优化

### 镜像大小优化
- 使用多阶段构建
- 基于Alpine Linux（171MB）
- 仅包含生产依赖

### 搜索性能
- 集成FlexSearch全文搜索引擎
- 支持模糊匹配和智能搜索
- 内存中索引，快速响应

## 🔍 故障排除

### 常见问题

1. **容器无法启动**
   ```bash
   docker-compose logs memory-server
   ```

2. **数据丢失**
   - 检查 `docker-data` 目录是否正确挂载
   - 确认 `MEMORY_FILE_PATH` 环境变量设置正确

3. **权限问题**
   ```bash
   # Windows
   icacls docker-data /grant Everyone:F
   
   # Linux/Mac
   chmod 755 docker-data
   ```

### 调试模式

```bash
# 进入容器调试
docker-compose exec memory-server sh

# 查看文件系统
ls -la /app/
ls -la /app/data/
```

## 🔄 更新和维护

### 更新镜像
```bash
# 重新构建镜像
docker-compose build --no-cache

# 重启服务
docker-compose up -d
```

### 备份数据
```bash
# 备份知识图谱数据
cp docker-data/memory.json backup/memory-$(date +%Y%m%d).json

# 或使用Docker卷备份
docker run --rm -v memory_docker-data:/data -v $(pwd):/backup alpine tar czf /backup/memory-backup.tar.gz -C /data .
```

## 📈 监控和日志

### 实时日志
```bash
# 跟踪日志
docker-compose logs -f memory-server

# 查看最近100行日志
docker-compose logs --tail=100 memory-server
```

### 资源使用
```bash
# 查看容器资源使用情况
docker stats memory-server
```

## 🌐 网络配置

如果需要网络访问（例如HTTP API），可以在 `docker-compose.yml` 中添加端口映射：

```yaml
ports:
  - "3000:3000"  # 映射端口
```

## 📝 注意事项

- 容器默认运行在stdio模式，适用于MCP协议通信
- 数据文件使用JSON格式存储
- 搜索索引在内存中构建，重启后自动重建
- 生产环境建议定期备份数据文件