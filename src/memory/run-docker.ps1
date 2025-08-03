#!/usr/bin/env pwsh
# Docker运行脚本 - Memory MCP Server

Write-Host "启动Memory MCP Server Docker容器..." -ForegroundColor Green

# 检查Docker镜像是否存在
$imageExists = docker images memory-server --format "{{.Repository}}" | Select-String "memory-server"
if (-not $imageExists) {
    Write-Host "Docker镜像不存在，正在构建..." -ForegroundColor Yellow
    docker build -t memory-server .
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Docker镜像构建失败！" -ForegroundColor Red
        exit 1
    }
    Write-Host "Docker镜像构建成功！" -ForegroundColor Green
}

# 创建数据卷目录（如果不存在）
$dataDir = "$PWD\docker-data"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    Write-Host "创建数据目录: $dataDir" -ForegroundColor Cyan
}

Write-Host "启动容器..." -ForegroundColor Cyan
Write-Host "数据将保存在: $dataDir" -ForegroundColor Cyan
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Yellow
Write-Host "" 

# 运行容器，挂载数据卷
docker run --rm -it `
    -v "${dataDir}:/app/data" `
    -e MEMORY_FILE_PATH="/app/data/memory.json" `
    --name memory-server-instance `
    memory-server