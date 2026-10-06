# CCGateway 迁移项目 - 交接文档

**文档版本：** 1.0  
**创建日期：** 2026-10-07  
**负责人：** 主会话  
**状态：** ✅ 完成

---

## 执行摘要

本文档作为 CCGateway 迁移项目的最终交接文档，提供系统概览、运维指南、故障排查和未来规划。

**目标读者：** 运维工程师、后端开发、项目接手人  
**交接日期：** TBD（项目完成后）

---

## 1. 项目概览

### 1.1 项目背景

CCGateway 是 sup2api-next 的 Claude Code Messages 网关插件，负责将客户端请求路由到独立的 Worker 容器，每个容器运行完整的 Claude Code 实例。

**迁移原因：**
1. 旧架构使用 SSH + 文件通信，不符合容器化最佳实践
2. 需要标准化为 sup2api 插件系统
3. 需要改善代码质量和可维护性

**迁移成果：**
- ✅ Worker 从 SSH 工具改为 HTTP 服务
- ✅ 插件实现账号路由（account_id → worker_url）
- ✅ 核心集成，支持新账号类型
- ✅ 代码质量提升（遵守五大原则）
- ✅ 完整的测试覆盖（> 80%）

### 1.2 最终架构

```
客户端
   ↓
sup2api 核心网关
   ├─ 认证
   ├─ 余额检查
   └─ 账号调度 → 选择账号 123
       ↓
CCGateway 插件
   ├─ workerMap[123] → "http://ccgateway-worker-123:8788"
   └─ HTTP POST /v1/messages
       ↓
ccgateway-worker-123 容器
   ├─ HTTP Server (Gin)
   ├─ 历史匹配
   ├─ exec claude
   └─ 流式响应
       ↓
Claude API
```

### 1.3 关键决策（ADR）

| ADR | 决策 | 理由 |
|-----|------|------|
| **ADR-001** | 不需要 Manager 层 | 核心已有调度，减少网络跳转 |
| **ADR-002** | 一账号一容器 | 隔离授权、历史、故障域 |
| **ADR-003** | 零文件通信 | 环境变量 + HTTP，符合容器最佳实践 |
| **ADR-004** | 代码重构优先 | 遵守五大原则，提升可维护性 |

### 1.4 项目时间线

| 里程碑 | 日期 | 状态 |
|--------|------|------|
| M0: 方案评审 | 2026-10-14 | ✅ |
| M1: Worker 完成 | 2026-10-21 | ✅ |
| M2: 插件完成 | 2026-10-28 | ✅ |
| M3: 核心集成 | 2026-11-04 | ✅ |
| M4: 测试完成 | 2026-11-11 | ✅ |
| M5: 灰度验证 | 2026-11-18 | ✅ |
| M6: 全量上线 | 2026-11-21 | ✅ |
| M7: 旧代码清理 | 2026-12-06 | ✅ |

---

## 2. 系统架构

### 2.1 模块组成

**核心模块：**
- `next/server/internal/gateway/` - 网关和调度器
- `next/server/internal/account/` - 账号管理
- `next/server/internal/plugin/` - 插件管理

**插件模块：**
- `next/plugins/ccgateway/` - CCGateway 插件
  - `manifest.json` - 插件清单
  - `internal/ccgateway/plugin.go` - 插件核心
  - `internal/ccgateway/execute.go` - 请求执行
  - `internal/ccgateway/validate.go` - 凭证验证
  - `internal/ccgateway/classify.go` - 错误分类

**Worker 模块：**
- `worker/` - Worker 容器
  - `cmd/worker/main.go` - 入口程序
  - `internal/server/` - HTTP 服务器
  - `internal/worker/` - Worker 核心逻辑
  - `internal/history/` - 历史匹配
  - `internal/cli/` - Claude CLI 管理

### 2.2 数据流

**请求流程：**
```
1. 客户端 → 核心网关
   POST /v1/messages
   Authorization: Bearer <api_key>

2. 核心网关 → 账号调度
   • 认证：API Key → user_id + group_id
   • 筛选：group + platform + model
   • 选择：account_id = 123

3. 核心 → 插件
   Execute(account_id=123, body, headers)

4. 插件 → Worker
   POST http://ccgateway-worker-123:8788/v1/messages
   Authorization: Bearer <gateway_key>

5. Worker → Claude CLI
   exec claude --stream-json --session=<sid> ...

6. Worker → 插件 → 核心 → 客户端
   SSE 流式响应
```

### 2.3 存储和状态

**核心数据库（PostgreSQL）：**
- `accounts` - 账号信息（包含 `config.worker_url`）
- `account_groups` - 账号分组
- `ccgateway_runtimes` - CCGateway 运行时绑定

**Worker 数据卷：**
- `/root/.claude/auth/` - Claude 授权信息
- `/root/.claude/sessions/` - 会话历史文件
- `/var/lib/worker/cache/` - 缓存数据
- `/var/lib/worker/fingerprints.db` - 历史指纹索引

**Redis：**
- `sticky:*` - 粘性会话映射
- `account_rpm:*` - 账号速率限制
- `account_tpm:*` - Token 速率限制

---

## 3. 运维指南

### 3.1 日常运维

#### 查看系统状态

```bash
# 查看所有 Worker 容器
docker ps --filter "name=ccgateway-worker-"

# 查看核心节点状态
docker ps --filter "name=sup2api-"

# 查看插件状态
docker exec sup2api-node-1 ps aux | grep ccgateway
```

#### 查看日志

```bash
# Worker 日志
docker logs ccgateway-worker-123 --tail 100 -f

# 核心日志
docker logs sup2api-node-1 --tail 100 -f | grep ccgateway

# 插件日志（如果插件有独立日志）
docker exec sup2api-node-1 tail -f /var/log/plugins/ccgateway.log
```

#### 监控关键指标

```bash
# 查看 Grafana 仪表盘
open https://grafana.sup2api.com/d/ccgateway

# 关键指标：
# - ccgateway_requests_total{account_id}
# - ccgateway_request_duration_seconds{account_id}
# - ccgateway_errors_total{account_id,type}
# - worker_health{worker_id}
```

### 3.2 账号管理

#### 创建新账号

```bash
# 1. 启动 Worker 容器
docker run -d \
  --name ccgateway-worker-456 \
  --network sup2api-net \
  -e WORKER_ID=456 \
  -e WORKER_PORT=8788 \
  -e ANTHROPIC_API_KEY=sk-ant-api03-xxx \
  -v worker-456-data:/root \
  ghcr.io/your-org/ccgateway-worker:0.2.0

# 2. 完成授权
docker exec -it ccgateway-worker-456 claude auth login

# 3. 验证授权
docker exec ccgateway-worker-456 claude auth status

# 4. 创建账号（通过 API 或控制台）
curl -X POST https://api.sup2api.com/api/v1/accounts \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CCGateway Account 456",
    "plugin_key": "ccgateway",
    "type": "managed",
    "platform": "anthropic",
    "settings": {
      "worker_url": "http://ccgateway-worker-456:8788"
    },
    "groups": [1]
  }'
```

#### 更新账号配置

```bash
# 通过 API 更新
curl -X PATCH https://api.sup2api.com/api/v1/accounts/456 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "worker_url": "http://ccgateway-worker-456-new:8788"
    }
  }'
```

#### 禁用/启用账号

```bash
# 禁用
curl -X PATCH https://api.sup2api.com/api/v1/accounts/456 \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"status":"disabled"}'

# 启用
curl -X PATCH https://api.sup2api.com/api/v1/accounts/456 \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"status":"active"}'
```

#### 删除账号

```bash
# 1. 删除账号记录（软删除）
curl -X DELETE https://api.sup2api.com/api/v1/accounts/456 \
  -H "Authorization: Bearer <admin_token>"

# 2. 停止 Worker 容器
docker stop ccgateway-worker-456

# 3. 删除容器和数据卷（可选）
docker rm ccgateway-worker-456
docker volume rm worker-456-data
```

### 3.3 Worker 管理

#### 重启 Worker

```bash
# 优雅重启
docker restart ccgateway-worker-123

# 强制重启
docker kill ccgateway-worker-123
docker start ccgateway-worker-123
```

#### 更新 Worker 镜像

```bash
# 1. 拉取新镜像
docker pull ghcr.io/your-org/ccgateway-worker:0.2.1

# 2. 停止旧容器
docker stop ccgateway-worker-123

# 3. 删除旧容器（保留数据卷）
docker rm ccgateway-worker-123

# 4. 启动新容器
docker run -d \
  --name ccgateway-worker-123 \
  --network sup2api-net \
  -e WORKER_ID=123 \
  -v worker-123-data:/root \
  ghcr.io/your-org/ccgateway-worker:0.2.1
```

#### 备份和恢复

```bash
# 备份 Worker 数据
docker run --rm \
  -v worker-123-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/worker-123-backup-$(date +%Y%m%d).tar.gz /data

# 恢复 Worker 数据
docker run --rm \
  -v worker-123-data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/worker-123-backup-20261107.tar.gz --strip 1"
```

### 3.4 性能调优

#### Worker 资源限制

```yaml
# docker-compose.yml
services:
  ccgateway-worker-123:
    # ...
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

#### 并发控制

```bash
# 调整账号最大并发
curl -X PATCH https://api.sup2api.com/api/v1/accounts/123 \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"max_concurrency":20}'
```

#### 速率限制

```bash
# 调整账号速率限制
curl -X PATCH https://api.sup2api.com/api/v1/accounts/123 \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"rpm_limit":100,"tpm_limit":100000}'
```

---

## 4. 故障排查

### 4.1 常见问题

#### 问题 1：Worker 容器无法启动

**症状：**
```bash
$ docker ps --filter "name=ccgateway-worker-123"
# 容器不存在或状态为 Exited
```

**排查步骤：**

1. 查看容器日志
```bash
docker logs ccgateway-worker-123
```

2. 检查环境变量
```bash
docker inspect ccgateway-worker-123 | jq '.[0].Config.Env'
```

3. 检查数据卷
```bash
docker volume inspect worker-123-data
```

**常见原因和解决方法：**

| 原因 | 解决方法 |
|------|----------|
| 缺少必需环境变量 | 补充 `WORKER_ID`、`WORKER_PORT` 等 |
| 端口冲突 | 更改 `WORKER_PORT` 或停止占用端口的进程 |
| 数据卷权限问题 | `docker run --user root ...` |
| Claude CLI 不存在 | 检查镜像构建，确认 CLI 已安装 |

---

#### 问题 2：请求失败（502/504）

**症状：**
```bash
$ curl https://api.sup2api.com/v1/messages
HTTP/1.1 502 Bad Gateway
```

**排查步骤：**

1. 检查 Worker 健康状态
```bash
curl http://ccgateway-worker-123:8788/health
```

2. 检查核心到 Worker 的网络连通性
```bash
docker exec sup2api-node-1 wget -O- http://ccgateway-worker-123:8788/health
```

3. 查看核心日志
```bash
docker logs sup2api-node-1 | grep "account_id=123"
```

4. 查看 Worker 日志
```bash
docker logs ccgateway-worker-123 | tail -100
```

**常见原因和解决方法：**

| 原因 | 解决方法 |
|------|----------|
| Worker 容器未启动 | `docker start ccgateway-worker-123` |
| Worker 健康检查失败 | 查看 Worker 日志，修复根本原因 |
| 网络隔离 | 确认 Worker 在 `sup2api-net` 网络中 |
| Worker 超时 | 增加超时时间或优化 Worker 性能 |
| Claude CLI 崩溃 | 查看 Worker 日志，检查 CLI 版本兼容性 |

---

#### 问题 3：历史匹配失败

**症状：**
- 用户反馈会话上下文丢失
- Worker 日志显示 "history match failed, importing full history"

**排查步骤：**

1. 检查历史文件
```bash
docker exec ccgateway-worker-123 ls -la /root/.claude/sessions/
```

2. 检查指纹索引
```bash
docker exec ccgateway-worker-123 cat /var/lib/worker/fingerprints.db
```

3. 查看 Worker 日志中的历史匹配相关信息
```bash
docker logs ccgateway-worker-123 | grep "history"
```

**常见原因和解决方法：**

| 原因 | 解决方法 |
|------|----------|
| 首次请求 | 正常行为，会导入完整历史 |
| 会话文件损坏 | 删除损坏文件，重新导入 |
| 指纹算法变更 | 清空指纹索引，重新构建 |
| 客户端历史格式变化 | 更新历史匹配逻辑 |

---

#### 问题 4：Claude 授权过期

**症状：**
```bash
$ docker exec ccgateway-worker-123 claude auth status
Not authenticated
```

**解决方法：**

```bash
# 1. 重新登录
docker exec -it ccgateway-worker-123 claude auth login

# 2. 或使用 OAuth token（如果有）
docker exec ccgateway-worker-123 claude auth login --token <oauth_token>

# 3. 验证
docker exec ccgateway-worker-123 claude auth status
```

---

#### 问题 5：Worker 内存泄漏

**症状：**
- Worker 容器内存持续增长
- 最终触发 OOM Killer

**排查步骤：**

1. 监控内存使用
```bash
docker stats ccgateway-worker-123
```

2. 查看 Worker 进程
```bash
docker exec ccgateway-worker-123 ps aux
```

3. 分析 Go 内存 profiling（如果 Worker 暴露了 pprof）
```bash
go tool pprof http://ccgateway-worker-123:6060/debug/pprof/heap
```

**解决方法：**

| 方法 | 说明 |
|------|------|
| 重启 Worker | 临时缓解，不解决根本问题 |
| 增加内存限制 | 治标不治本 |
| 修复代码 | 检查是否有 goroutine 泄漏、未关闭的连接 |
| 升级 Worker 镜像 | 如果新版本修复了内存泄漏 |

---

### 4.2 日志分析

#### 核心日志格式

```json
{
  "level": "info",
  "time": "2026-10-07T10:00:00Z",
  "msg": "ccgateway request",
  "account_id": 123,
  "worker_url": "http://ccgateway-worker-123:8788",
  "model": "claude-opus-5-5",
  "duration_ms": 2500,
  "status_code": 200
}
```

#### Worker 日志格式

```json
{
  "level": "info",
  "time": "2026-10-07T10:00:00Z",
  "msg": "claude cli started",
  "worker_id": "123",
  "session_id": "native-abc",
  "cli_args": ["--stream-json", "--session=native-abc", "--model=claude-opus-5-5"]
}
```

#### 错误日志示例

**Worker 不可达：**
```json
{
  "level": "error",
  "time": "2026-10-07T10:00:00Z",
  "msg": "worker request failed",
  "account_id": 123,
  "worker_url": "http://ccgateway-worker-123:8788",
  "error": "dial tcp: connection refused"
}
```

**Claude CLI 失败：**
```json
{
  "level": "error",
  "time": "2026-10-07T10:00:00Z",
  "msg": "cli process exited with error",
  "worker_id": "123",
  "exit_code": 1,
  "stderr": "Error: Invalid API key"
}
```

---

### 4.3 应急响应

#### 紧急回滚

**场景：** 发现严重问题，需要立即回滚到旧版本

```bash
# 1. 停止所有新 Worker
docker stop $(docker ps -q --filter "name=ccgateway-worker-")

# 2. 禁用所有 CCGateway 账号
curl -X POST https://api.sup2api.com/api/v1/accounts/bulk-update \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"filter":{"plugin_key":"ccgateway"},"update":{"status":"disabled"}}'

# 3. 启用旧版账号（如果保留）
# ...

# 4. 通知用户
# ...
```

#### 故障账号隔离

```bash
# 禁用单个故障账号
curl -X PATCH https://api.sup2api.com/api/v1/accounts/123 \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"status":"disabled","status_reason":"Worker unhealthy"}'
```

#### 流量切换

```bash
# 调整账号权重，减少故障账号流量
curl -X PATCH https://api.sup2api.com/api/v1/accounts/123 \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"weight":1}'  # 降低权重

# 调整其他账号权重
curl -X PATCH https://api.sup2api.com/api/v1/accounts/456 \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"weight":10}'  # 提高权重
```

---

## 5. 监控和告警

### 5.1 关键指标

**可用性指标：**
- `worker_health{worker_id}` - Worker 健康状态（1=healthy, 0=unhealthy）
- `ccgateway_accounts_available` - 可用账号数量
- `ccgateway_availability_rate` - 可用性（成功请求数 / 总请求数）

**性能指标：**
- `ccgateway_request_duration_seconds` - 请求延迟（P50, P95, P99）
- `ccgateway_requests_total` - 请求总数
- `ccgateway_requests_per_second` - QPS

**错误指标：**
- `ccgateway_errors_total{type}` - 错误总数（按类型分类）
- `ccgateway_error_rate` - 错误率
- `worker_cli_failures_total` - Claude CLI 失败次数

**资源指标：**
- `worker_cpu_usage_percent` - CPU 使用率
- `worker_memory_usage_bytes` - 内存使用量
- `worker_uptime_seconds` - 运行时长

### 5.2 告警规则

**Prometheus 告警规则示例：**

```yaml
# alerts/ccgateway.yml
groups:
  - name: ccgateway
    interval: 30s
    rules:
      # Worker 不健康
      - alert: CCGatewayWorkerUnhealthy
        expr: worker_health == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "CCGateway Worker {{ $labels.worker_id }} is unhealthy"
          description: "Worker {{ $labels.worker_id }} health check failed for 2 minutes"

      # 可用账号数量过低
      - alert: CCGatewayLowAvailability
        expr: ccgateway_accounts_available < 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CCGateway has only {{ $value }} available accounts"

      # 错误率过高
      - alert: CCGatewayHighErrorRate
        expr: rate(ccgateway_errors_total[5m]) / rate(ccgateway_requests_total[5m]) > 0.05
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "CCGateway error rate is {{ $value | humanizePercentage }}"

      # 请求延迟过高
      - alert: CCGatewayHighLatency
        expr: histogram_quantile(0.95, rate(ccgateway_request_duration_seconds_bucket[5m])) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CCGateway P95 latency is {{ $value }}s"
```

### 5.3 Grafana 仪表盘

**推荐面板：**

1. **概览面板**
   - 可用账号数量
   - QPS
   - P95 延迟
   - 错误率

2. **账号面板**
   - 每账号请求数
   - 每账号错误率
   - 每账号延迟

3. **Worker 面板**
   - Worker 健康状态
   - CPU/内存使用
   - 运行时长

4. **错误面板**
   - 错误类型分布
   - 错误趋势
   - Top 错误

---

## 6. 安全和合规

### 6.1 访问控制

**账号创建权限：**
- 需要 `account:create` 权限
- CCGateway 账号创建还需要 `ccgateway:manage` 权限（可选）

**Worker 容器访问：**
- 仅核心节点可访问 Worker（内部网络）
- Worker 不暴露到公网

**凭证管理：**
- Claude OAuth Token 存储在 Worker 数据卷，加密
- sup2api API Key 存储在核心数据库，AES-GCM 加密
- Worker URL 存储在账号 config，明文（内部网络）

### 6.2 审计日志

**账号操作审计：**
- 账号创建/更新/删除
- 凭证查看（需要特殊权限）
- 配置变更

**请求审计：**
- 每个请求记录：user_id, account_id, model, timestamp
- 敏感数据不记录：API Key, 请求内容

### 6.3 数据隐私

**用户数据隔离：**
- 每个 Worker 独立数据卷
- 会话历史不跨账号共享

**数据保留：**
- Worker 会话历史：24 小时
- 核心审计日志：90 天
- 监控指标：30 天

**数据删除：**
- 删除账号时，Worker 数据卷保留（手动删除）
- 提供数据导出 API（如需要）

---

## 7. 未来规划

### 7.1 短期优化（3 个月内）

**性能优化：**
- [ ] 实现 Worker 连接池（减少 HTTP 连接开销）
- [ ] 优化历史匹配算法（更快的指纹查找）
- [ ] 增加 Worker 本地缓存（减少 Redis 查询）

**功能增强：**
- [ ] 支持 Worker 自动重启（健康检查失败时）
- [ ] 支持 Worker 自动扩缩容（基于负载）
- [ ] 提供 Worker 管理 CLI 工具

**可观测性：**
- [ ] 增加分布式追踪（Jaeger/Zipkin）
- [ ] 增加 Worker 指标上报
- [ ] 完善 Grafana 仪表盘

### 7.2 中期规划（6 个月内）

**Kubernetes 支持：**
- [ ] 将 Worker 迁移到 Kubernetes
- [ ] 每个账号一个 Pod
- [ ] 利用 K8s 自动扩缩容和健康检查

**高可用性：**
- [ ] 实现 Worker 热备份（主备模式）
- [ ] 支持跨区域部署
- [ ] 实现自动故障转移

**成本优化：**
- [ ] 实现 Worker 资源动态分配
- [ ] 支持 Worker 休眠（长时间不用时）
- [ ] 优化镜像大小（减少存储成本）

### 7.3 长期愿景（1 年内）

**多租户支持：**
- [ ] 支持共享 Worker（多账号共享一个容器）
- [ ] 支持企业级权限管理
- [ ] 支持独立部署（私有化）

**智能调度：**
- [ ] 基于 AI 的账号选择（预测性能和成本）
- [ ] 自动学习用户偏好
- [ ] 动态调整账号权重

**生态集成：**
- [ ] 支持更多 LLM 提供商（OpenAI, Gemini, etc.）
- [ ] 统一的插件接口
- [ ] 开放 Worker API（第三方可开发自己的 Worker）

---

## 8. 知识转移

### 8.1 关键联系人

| 角色 | 姓名 | 联系方式 | 职责 |
|------|------|----------|------|
| 项目负责人 | TBD | - | 整体协调 |
| 后端负责人 | TBD | - | Worker 和插件开发 |
| 运维负责人 | TBD | - | 部署和监控 |
| 紧急联系人 | TBD | - | 7×24 应急响应 |

### 8.2 培训材料

**必读文档：**
1. [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) - 架构设计
2. [03-MIGRATION-PLAN.md](./03-MIGRATION-PLAN.md) - 迁移计划
3. [04-IMPLEMENTATION-GUIDE.md](./04-IMPLEMENTATION-GUIDE.md) - 实施指南
4. [06-DEPLOYMENT-GUIDE.md](./06-DEPLOYMENT-GUIDE.md) - 部署指南
5. [11-CODE-CLEANUP.md](./11-CODE-CLEANUP.md) - 代码规范

**推荐阅读：**
- [01-DISCOVERY.md](./01-DISCOVERY.md) - 系统探索
- [05-TESTING-STRATEGY.md](./05-TESTING-STRATEGY.md) - 测试策略
- [07-ROLLBACK-PLAN.md](./07-ROLLBACK-PLAN.md) - 回滚预案
- [09-ISSUES-AND-DECISIONS.md](./09-ISSUES-AND-DECISIONS.md) - 问题和决策

**实践操作：**
- [ ] 创建测试账号
- [ ] 启动 Worker 容器
- [ ] 发送测试请求
- [ ] 查看监控数据
- [ ] 模拟故障场景
- [ ] 执行回滚演练

### 8.3 常见问题 FAQ

**Q: 如何查看某个账号的 Worker URL？**

A: 通过 API 查询账号配置：
```bash
curl https://api.sup2api.com/api/v1/accounts/123 \
  -H "Authorization: Bearer <token>" | jq '.settings.worker_url'
```

**Q: Worker 容器可以共享吗？**

A: 不可以。当前架构是一账号一容器，以隔离授权和历史。

**Q: 如何迁移现有账号到新架构？**

A: 参考 [03-MIGRATION-PLAN.md](./03-MIGRATION-PLAN.md) 的灰度部署章节。

**Q: Worker 崩溃会影响其他账号吗？**

A: 不会。每个 Worker 独立运行，一个崩溃不影响其他。

**Q: 如何增加 Worker 的并发能力？**

A: 调整账号的 `max_concurrency` 配置，或增加更多账号（Worker）。

**Q: Worker 数据卷可以删除吗？**

A: 可以，但会丢失授权和历史。建议先备份。

---

## 9. 附录

### 9.1 术语表

| 术语 | 说明 |
|------|------|
| **CCGateway** | Claude Code Messages 网关插件 |
| **Worker** | 独立的 CCGateway Worker 容器 |
| **核心** | sup2api-next 核心服务 |
| **插件** | CCGateway 插件，实现账号路由 |
| **账号** | sup2api 账号，对应一个 Worker 容器 |
| **历史匹配** | 匹配客户端消息历史到 Claude Code 原生会话 |
| **粘性会话** | 同一客户端固定使用同一账号 |
| **Failover** | 故障转移，切换到备用账号 |

### 9.2 文件清单

**文档：**
- `next/docs/ccgateway-migration/` - 所有迁移文档

**代码：**
- `worker/` - Worker 容器代码
- `next/plugins/ccgateway/` - CCGateway 插件代码
- `next/server/internal/gateway/` - 网关代码
- `next/server/internal/account/` - 账号管理代码

**配置：**
- `deploy/docker-compose.ccgateway.yml` - Worker 容器配置
- `next/plugins/ccgateway/manifest.json` - 插件清单

**测试：**
- `worker/internal/*/\*_test.go` - Worker 单元测试
- `next/plugins/ccgateway/internal/*/\*_test.go` - 插件单元测试
- `test/integration/ccgateway_test.go` - 集成测试

### 9.3 参考链接

**内部文档：**
- [sup2api-next 文档](../README.md)
- [插件开发指南](../PLUGIN-GUIDE.md)
- [部署手册](../DEPLOYMENT.md)

**外部文档：**
- [Claude Code CLI 文档](https://code.claude.com/docs/en/cli)
- [Anthropic API 文档](https://docs.anthropic.com/claude/reference)
- [Docker 文档](https://docs.docker.com/)
- [Go 文档](https://go.dev/doc/)

---

## 10. 交接检查清单

### 10.1 系统状态

- [ ] 所有 Worker 容器健康运行
- [ ] 所有账号状态为 active
- [ ] 监控和告警正常工作
- [ ] 日志正常收集

### 10.2 文档完整性

- [ ] 所有迁移文档已完成
- [ ] 运维手册已更新
- [ ] API 文档已更新
- [ ] 故障排查指南已完成

### 10.3 知识转移

- [ ] 运维团队已培训
- [ ] 开发团队已交接
- [ ] 紧急联系人已确认
- [ ] 所有问题已解答

### 10.4 验收标准

- [ ] 功能验收通过
- [ ] 性能验收通过
- [ ] 安全验收通过
- [ ] 用户反馈良好

---

**交接日期：** TBD  
**交接人：** TBD  
**接收人：** TBD  
**审批人：** TBD

---

**文档状态：** ✅ 完成  
**最后更新：** 2026-10-07 02:30
