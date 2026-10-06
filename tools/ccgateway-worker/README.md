# CCGateway Worker

独立的 Claude Code Messages Worker，支持容器化部署和会话历史管理。

## 架构

```
HTTP Server (Gin)
    ↓
Worker (核心逻辑)
    ├── CLI Manager (进程管理)
    ├── History Store (会话匹配)
    └── Stream Handler (事件解析)
```

## 功能特性

- ✅ HTTP API 接口 (`/v1/messages`)
- ✅ 流式响应 (SSE)
- ✅ 会话历史匹配和缓存
- ✅ Claude CLI 进程管理
- ✅ 健康检查 (`/health`)
- ✅ 优雅关闭
- ✅ 容器化部署

## 快速开始

### 本地开发

```bash
# 安装依赖
make deps

# 运行测试
make test

# 构建
make build

# 运行
export WORKER_ID=worker-1
export WORKER_PORT=8788
export WORKER_CLI_PATH=/usr/local/bin/claude
./bin/worker
```

### Docker 部署

```bash
# 构建镜像
make docker-build

# 运行容器
docker run -d \
  --name ccgateway-worker-1 \
  -e WORKER_ID=worker-1 \
  -e WORKER_PORT=8788 \
  -e WORKER_CLI_PATH=/usr/local/bin/claude \
  -e CLAUDE_CONFIG_DIR=/root/.claude \
  -p 8788:8788 \
  ccgateway-worker:latest
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `WORKER_ID` | - | Worker 唯一标识（必需） |
| `WORKER_PORT` | `8788` | HTTP 服务端口 |
| `LOG_LEVEL` | `info` | 日志级别 |
| `WORKER_CLI_PATH` | `/usr/local/bin/claude` | Claude CLI 路径 |
| `WORKER_CLI_VERSION` | `2.1.288` | CLI 版本 |
| `WORKER_PLUGIN_PATH` | `/app/mod` | Mod 插件路径 |
| `CLAUDE_CONFIG_DIR` | `/root/.claude` | 配置目录 |
| `HISTORY_DIR` | `/root/.claude/sessions` | 历史目录 |
| `CACHE_DIR` | `/var/lib/worker/cache` | 缓存目录 |
| `MAX_CACHE_SIZE` | `33554432` (32MB) | 最大缓存大小 |
| `HISTORY_RETENTION` | `24h` | 历史保留时间 |
| `REQUEST_TIMEOUT` | `10m` | 请求超时 |
| `CLI_TIMEOUT` | `15m` | CLI 超时 |
| `HEALTH_TIMEOUT` | `5s` | 健康检查超时 |

## API 接口

### POST /v1/messages

执行 Claude Messages 请求。

**请求头：**
- `Content-Type: application/json`
- `X-CCGateway-Session-ID: <session-id>` (可选)
- `X-CCGateway-Request-Policy: <policy-json>` (可选)
- `X-CCGateway-Native-Tools: <tools-csv>` (可选)

**请求体：**
```json
{
  "model": "claude-opus-5-5",
  "max_tokens": 1024,
  "messages": [
    {"role": "user", "content": "Hello"}
  ]
}
```

**响应：** SSE 流式事件

```
event: message_start
data: {"type":"message_start","message":{...}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{...}}

event: message_stop
data: {"type":"message_stop"}
```

### GET /health

健康检查。

**响应：**
```json
{
  "status": "healthy",
  "worker_id": "worker-1",
  "cli_version": "2.1.288",
  "uptime": 3600
}
```

## 测试

### 运行测试

```bash
# 运行单元测试
make test

# 运行集成测试
make test-integration

# 运行所有测试（单元 + 集成）
make test-all

# 使用测试脚本（更多选项）
bash scripts/run-tests.sh --help
```

### 覆盖率报告

```bash
# 单元测试覆盖率
make coverage

# 完整覆盖率（单元 + 集成）
make coverage-all

# 查看覆盖率
open coverage.html          # macOS
xdg-open coverage.html      # Linux
start coverage.html         # Windows
```

### 代码质量检查

```bash
# 格式化 + 静态检查 + 单元测试
make check

# 仅格式化
make fmt

# 仅静态检查
make vet

# Lint（需要安装 golangci-lint）
make lint
```

### 测试覆盖率目标

| 模块 | 目标覆盖率 | 当前状态 |
|------|-----------|---------|
| `internal/worker` | ≥80% | ![badge](https://img.shields.io/badge/coverage-pending-yellow) |
| `internal/history` | ≥80% | ![badge](https://img.shields.io/badge/coverage-pending-yellow) |
| `internal/cli` | ≥70% | ![badge](https://img.shields.io/badge/coverage-pending-yellow) |
| `internal/server` | ≥75% | ![badge](https://img.shields.io/badge/coverage-pending-yellow) |
| `pkg/types` | ≥90% | ![badge](https://img.shields.io/badge/coverage-pending-yellow) |

## 开发指南

### 项目结构

```
.
├── cmd/
│   └── worker/          # 主程序入口
├── internal/
│   ├── config/          # 配置管理
│   ├── server/          # HTTP 服务器
│   ├── worker/          # 核心 Worker 逻辑
│   ├── cli/             # CLI 管理器
│   └── history/         # 历史存储
├── pkg/
│   └── types/           # 公共类型定义
├── Dockerfile           # Docker 镜像
├── Makefile            # 构建脚本
└── go.mod              # Go 模块
```

### 代码规范

遵循 [代码规范](../../next/docs/ccgateway-migration/11-CODE-CLEANUP.md)：

1. **抽象** - 定义清晰的接口
2. **复用** - 提取公共代码
3. **解耦** - 依赖注入
4. **低嵌套** - 最多 3 层
5. **简洁** - YAGNI

### 提交前检查

```bash
# 格式化
make fmt

# 静态检查
make vet

# 运行测试
make test

# Lint（需要 golangci-lint）
make lint
```

## 集成测试

集成测试验证完整的请求流程和组件交互。详见 [test/integration/README.md](test/integration/README.md)。

### 快速开始

```bash
# 使用 Docker Compose（推荐）
docker-compose -f test/integration/docker-compose.test.yml up -d
go test -tags=integration -v ./test/integration/...
docker-compose -f test/integration/docker-compose.test.yml down

# 使用自动化脚本
bash scripts/run-tests.sh

# 仅集成测试
bash scripts/run-tests.sh --integration-only
```

### 测试场景

- ✅ 健康检查端点
- ✅ 简单请求流式响应
- ✅ 带系统提示的请求
- ✅ 会话历史匹配
- ✅ 并发请求处理
- ✅ 无效请求错误处理
- ✅ 超时场景

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `TEST_WORKER_URL` | `http://localhost:8788` | Worker 服务地址 |
| `TEST_TIMEOUT` | `30s` | 测试超时时间 |
| `TEST_CLI_PATH` | `/usr/local/bin/claude` | Claude CLI 路径 |

## 故障排查

### Worker 无法启动

**症状**: Docker 容器启动失败或立即退出

**解决步骤**:

1. 检查环境变量配置:
   ```bash
   docker exec worker-1 env | grep WORKER
   ```

2. 查看详细日志:
   ```bash
   docker logs worker-1 --tail 100
   ```

3. 验证必需变量:
   ```bash
   # 必需的环境变量
   echo $WORKER_ID        # 不能为空
   echo $WORKER_PORT      # 默认 8788
   echo $WORKER_CLI_PATH  # CLI 可执行文件路径
   ```

### CLI 进程启动失败

**症状**: 请求返回 500 错误，日志显示 CLI 启动失败

**解决步骤**:

1. 验证 CLI 可用性:
   ```bash
   docker exec worker-1 /usr/local/bin/claude --version
   ```

2. 检查 Mod 插件路径:
   ```bash
   docker exec worker-1 ls -la /app/mod/
   ```

3. 测试 CLI 手动执行:
   ```bash
   docker exec -it worker-1 /bin/bash
   claude --stream-json --max-turns=1 "test message"
   ```

4. 检查权限:
   ```bash
   docker exec worker-1 stat /usr/local/bin/claude
   # 应该有执行权限 (x)
   ```

### 健康检查失败

**症状**: 容器健康检查显示 unhealthy

**解决步骤**:

1. 手动检查健康端点:
   ```bash
   curl -v http://localhost:8788/health
   ```

2. 检查端口是否被占用:
   ```bash
   # Windows
   netstat -ano | findstr :8788
   
   # Linux/Mac
   lsof -i :8788
   ```

3. 查看服务启动日志:
   ```bash
   docker logs worker-1 | grep -i "starting\|error\|failed"
   ```

4. 增加健康检查超时:
   ```yaml
   # docker-compose.yml
   healthcheck:
     timeout: 10s  # 从 3s 增加到 10s
   ```

### 请求超时

**症状**: 客户端收到超时错误

**解决步骤**:

1. 检查超时配置:
   ```bash
   docker exec worker-1 env | grep TIMEOUT
   ```

2. 调整超时时间:
   ```bash
   # 增加超时（在 docker-compose.yml 或启动命令中）
   REQUEST_TIMEOUT=15m
   CLI_TIMEOUT=20m
   ```

3. 监控 CLI 进程:
   ```bash
   docker exec worker-1 ps aux | grep claude
   ```

4. 检查系统资源:
   ```bash
   docker stats worker-1
   ```

### 会话匹配失败

**症状**: 每次请求都创建新会话，历史未复用

**解决步骤**:

1. 检查历史目录挂载:
   ```bash
   docker exec worker-1 ls -la /root/.claude/sessions
   ```

2. 验证会话文件权限:
   ```bash
   docker exec worker-1 stat /root/.claude/sessions
   # 应该有读写权限
   ```

3. 检查缓存大小:
   ```bash
   docker exec worker-1 du -sh /var/lib/worker/cache
   ```

4. 增加缓存限制:
   ```bash
   MAX_CACHE_SIZE=67108864  # 64MB
   ```

5. 查看历史存储日志:
   ```bash
   docker logs worker-1 | grep -i "history\|match\|import"
   ```

### 流式响应中断

**症状**: SSE 流在中途断开

**解决步骤**:

1. 检查反向代理配置（如使用 Nginx）:
   ```nginx
   # 禁用缓冲
   proxy_buffering off;
   proxy_cache off;
   proxy_read_timeout 15m;
   ```

2. 验证客户端超时设置:
   ```go
   client := &http.Client{
       Timeout: 15 * time.Minute,  // 足够长
   }
   ```

3. 检查网络连接:
   ```bash
   # 测试长连接稳定性
   curl -N http://localhost:8788/v1/messages \
     -H "Content-Type: application/json" \
     -d '{"model":"claude-sonnet-4","max_tokens":1000,"messages":[...]}'
   ```

### 内存使用过高

**症状**: Worker 容器内存持续增长

**解决步骤**:

1. 监控内存使用:
   ```bash
   docker stats worker-1 --no-stream
   ```

2. 检查会话缓存数量:
   ```bash
   docker exec worker-1 find /root/.claude/sessions -type f | wc -l
   ```

3. 调整历史保留时间:
   ```bash
   HISTORY_RETENTION=12h  # 从 24h 减少到 12h
   ```

4. 限制容器内存:
   ```yaml
   # docker-compose.yml
   services:
     worker:
       mem_limit: 512m
       memswap_limit: 512m
   ```

5. 定期清理缓存:
   ```bash
   # 添加定期任务清理旧会话
   find /root/.claude/sessions -type f -mtime +1 -delete
   ```

### 测试失败

**症状**: 集成测试运行失败

**解决步骤**:

1. 检查测试环境:
   ```bash
   go test -tags=integration -v ./test/integration/... -run TestIntegration_HealthCheck
   ```

2. 验证 Worker 可达性:
   ```bash
   curl http://localhost:8788/health
   ```

3. 查看 Docker 容器状态:
   ```bash
   docker-compose -f test/integration/docker-compose.test.yml ps
   ```

4. 查看测试日志:
   ```bash
   docker-compose -f test/integration/docker-compose.test.yml logs
   ```

5. 清理测试环境后重试:
   ```bash
   docker-compose -f test/integration/docker-compose.test.yml down -v
   docker-compose -f test/integration/docker-compose.test.yml up -d
   sleep 10
   go test -tags=integration -v ./test/integration/...
   ```

### 常见错误码

| 错误码 | 原因 | 解决方案 |
|-------|------|---------|
| 400 Bad Request | 请求格式错误或缺少必需字段 | 检查 JSON 格式和必需字段 (model, max_tokens, messages) |
| 500 Internal Server Error | CLI 执行失败或内部错误 | 查看 Worker 日志，验证 CLI 可用性 |
| 503 Service Unavailable | 健康检查失败 | 检查 Worker 服务状态和资源 |
| 504 Gateway Timeout | 请求超时 | 增加超时配置，检查网络和系统资源 |

### 调试模式

启用详细日志输出:

```bash
# 设置日志级别为 debug
LOG_LEVEL=debug

# 重启容器
docker-compose restart worker-1

# 实时查看日志
docker logs -f worker-1
```

### 获取帮助

如果以上方法无法解决问题:

1. 收集诊断信息:
   ```bash
   # 系统信息
   docker version
   docker-compose version
   go version
   
   # Worker 状态
   docker ps -a | grep worker
   docker logs worker-1 > worker.log
   
   # 环境变量
   docker exec worker-1 env > worker-env.txt
   ```

2. 检查项目文档和 Issue
3. 提交详细的 Bug 报告（包含日志和环境信息）

## 性能优化

- 使用历史匹配减少重复导入
- 配置合理的缓存大小
- 调整超时时间避免过早失败
- 监控内存使用（会话缓存）

## 许可证

[Your License]
