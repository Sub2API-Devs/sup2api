# CCGateway 迁移部署指南

**最后更新：** 2026-10-07  
**目标环境：** 生产环境  
**适用版本：** [待定]

---

## 概述

本文档描述如何将 CCGateway 部署到 sup2api-next 系统中。

**部署架构：**
- sup2api 核心：调度账号，调用插件
- CCGateway 插件：路由请求到 Worker
- CC Worker 容器：每个账号一个容器

---

## 前置条件

### 系统要求

**硬件要求：**
- CPU: 4 核+（每个 Worker 容器约 0.5-1 核）
- 内存: 8GB+（每个 Worker 容器约 1-2GB）
- 磁盘: 50GB+（会话历史存储）
- 网络: 稳定的互联网连接（访问 Claude API）

**软件要求：**
- Docker: 20.10+
- Docker Compose: 2.0+
- sup2api-next: [待定版本]
- Claude Code CLI: 2.1.288

### 权限要求

- Docker 操作权限
- sup2api 管理员账号
- Claude 账号（每个 Worker 需要独立授权）

---

## 部署步骤

### 1. 环境准备

#### 1.1 创建工作目录

```bash
# 在 sup2api 部署目录创建 ccgateway 子目录
cd ~/sup2api-deployment
mkdir ccgateway
cd ccgateway
```

#### 1.2 准备配置文件

**创建 `.env.ccgateway`：**

```bash
cat > .env.ccgateway << 'EOF'
# 网关 API Key（插件验证用）
CCG_API_KEY=<生成一个随机密钥>

# 管理 Key（admin 接口用）
CCG_ADMIN_KEY=<生成另一个随机密钥>

# Worker 并发数（每个容器）
CCG_CONCURRENCY=4

# 日志级别
CCG_LOG_LEVEL=info
EOF
```

**生成随机密钥：**
```bash
# Linux/Mac
CCG_API_KEY=$(openssl rand -hex 32)
CCG_ADMIN_KEY=$(openssl rand -hex 32)

# 或者 Python
CCG_API_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
```

### 2. 构建镜像

#### 2.1 构建 Worker 镜像

```bash
cd ~/sup2api/tools/ccgateway/worker
docker build -t ccgateway-worker:latest .
```

**验证镜像：**
```bash
docker images | grep ccgateway-worker
```

#### 2.2 （可选）推送到私有仓库

```bash
# 标记
docker tag ccgateway-worker:latest your-registry.com/ccgateway-worker:v1.0.0

# 推送
docker push your-registry.com/ccgateway-worker:v1.0.0
```

### 3. 部署第一个 Worker（测试）

#### 3.1 创建测试账号的 Worker

**创建 `docker-compose.test.yml`：**

```yaml
version: '3.8'

services:
  ccgateway-worker-test:
    image: ccgateway-worker:latest
    container_name: ccgateway-worker-test
    environment:
      - CCG_API_KEY=${CCG_API_KEY:?}
      - CCG_ADMIN_KEY=${CCG_ADMIN_KEY:?}
      - ANTHROPIC_API_KEY=${CC_TOKEN_TEST:?}
      - CCG_CONCURRENCY=4
      - WORKER_ID=test
      - WORKER_PORT=8788
    volumes:
      - worker-test-data:/root
    networks:
      - sup2api-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8788/health"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  worker-test-data:

networks:
  sup2api-net:
    external: true  # 连接到 sup2api 核心网络
```

#### 3.2 启动测试 Worker

```bash
# 添加测试 CC Token 到环境变量
echo "CC_TOKEN_TEST=sk-ant-api03-your-test-token" >> .env.ccgateway

# 启动
docker-compose --env-file .env.ccgateway -f docker-compose.test.yml up -d

# 查看日志
docker-compose -f docker-compose.test.yml logs -f ccgateway-worker-test
```

#### 3.3 完成 Claude 授权

```bash
# 进入容器
docker exec -it ccgateway-worker-test bash

# 授权
claude auth login

# 按照提示完成 OAuth 授权
# 复制授权链接到浏览器，完成后粘贴 code#state

# 验证授权
claude auth status

# 退出容器
exit
```

#### 3.4 测试 Worker 健康检查

```bash
# 测试健康检查端点
curl http://localhost:8788/health

# 预期输出
{"status":"ok","worker_id":"test"}
```

### 4. 在 sup2api 创建测试账号

#### 4.1 通过管理界面创建账号

1. 登录 sup2api 管理后台
2. 进入「账号管理」
3. 点击「创建账号」
4. 选择类型：`ccgateway`
5. 配置：
   ```json
   {
     "worker_id": "test",
     "worker_url": "http://ccgateway-worker-test:8788",
     "worker_container": "ccgateway-worker-test"
   }
   ```
6. 保存

#### 4.2 或通过 API 创建账号

```bash
curl -X POST http://your-sup2api-host/api/v1/accounts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CCGateway Test Account",
    "type": "ccgateway",
    "group_id": 1,
    "enabled": true,
    "config": {
      "worker_id": "test",
      "worker_url": "http://ccgateway-worker-test:8788",
      "worker_container": "ccgateway-worker-test"
    }
  }'
```

### 5. 测试端到端请求

#### 5.1 获取 API Key

在 sup2api 管理后台创建或获取 API Key，确保绑定到包含测试账号的分组。

#### 5.2 发送测试请求

```bash
curl -X POST http://your-sup2api-host/v1/messages \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-opus-5-5",
    "max_tokens": 64,
    "messages": [
      {"role": "user", "content": "Hello, this is a test."}
    ]
  }'
```

#### 5.3 验证流程

- [ ] 核心接收请求
- [ ] 核心选择 CCGateway 账号
- [ ] 插件路由到 Worker
- [ ] Worker 执行请求
- [ ] 返回响应

**检查日志：**
```bash
# sup2api 核心日志
docker logs sup2api-core

# CCGateway 插件日志
docker logs sup2api-plugin-ccgateway

# Worker 日志
docker logs ccgateway-worker-test
```

### 6. 部署生产 Worker

#### 6.1 规划账号和容器

假设你需要部署 4 个 CCGateway 账号：

| 账号 ID | Worker 容器名 | CC Token | 用途 |
|---------|--------------|----------|------|
| 101 | ccgateway-worker-101 | CC_TOKEN_101 | 生产账号 1 |
| 102 | ccgateway-worker-102 | CC_TOKEN_102 | 生产账号 2 |
| 103 | ccgateway-worker-103 | CC_TOKEN_103 | 生产账号 3 |
| 104 | ccgateway-worker-104 | CC_TOKEN_104 | 生产账号 4 |

#### 6.2 准备环境变量

在 `.env.ccgateway` 中添加所有 Token：

```bash
# 生产 Worker Tokens
CC_TOKEN_101=sk-ant-api03-...
CC_TOKEN_102=sk-ant-api03-...
CC_TOKEN_103=sk-ant-api03-...
CC_TOKEN_104=sk-ant-api03-...
```

#### 6.3 创建生产 Compose 配置

**创建 `docker-compose.prod.yml`：**

```yaml
version: '3.8'

services:
  # Worker 101
  ccgateway-worker-101:
    image: ccgateway-worker:latest
    container_name: ccgateway-worker-101
    environment:
      - CCG_API_KEY=${CCG_API_KEY:?}
      - CCG_ADMIN_KEY=${CCG_ADMIN_KEY:?}
      - ANTHROPIC_API_KEY=${CC_TOKEN_101:?}
      - CCG_CONCURRENCY=${CCG_CONCURRENCY:-4}
      - WORKER_ID=101
      - WORKER_PORT=8788
    volumes:
      - worker-101-data:/root
    networks:
      - sup2api-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8788/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  # Worker 102
  ccgateway-worker-102:
    image: ccgateway-worker:latest
    container_name: ccgateway-worker-102
    environment:
      - CCG_API_KEY=${CCG_API_KEY:?}
      - CCG_ADMIN_KEY=${CCG_ADMIN_KEY:?}
      - ANTHROPIC_API_KEY=${CC_TOKEN_102:?}
      - CCG_CONCURRENCY=${CCG_CONCURRENCY:-4}
      - WORKER_ID=102
      - WORKER_PORT=8788
    volumes:
      - worker-102-data:/root
    networks:
      - sup2api-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8788/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  # Worker 103
  ccgateway-worker-103:
    image: ccgateway-worker:latest
    container_name: ccgateway-worker-103
    environment:
      - CCG_API_KEY=${CCG_API_KEY:?}
      - CCG_ADMIN_KEY=${CCG_ADMIN_KEY:?}
      - ANTHROPIC_API_KEY=${CC_TOKEN_103:?}
      - CCG_CONCURRENCY=${CCG_CONCURRENCY:-4}
      - WORKER_ID=103
      - WORKER_PORT=8788
    volumes:
      - worker-103-data:/root
    networks:
      - sup2api-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8788/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  # Worker 104
  ccgateway-worker-104:
    image: ccgateway-worker:latest
    container_name: ccgateway-worker-104
    environment:
      - CCG_API_KEY=${CCG_API_KEY:?}
      - CCG_ADMIN_KEY=${CCG_ADMIN_KEY:?}
      - ANTHROPIC_API_KEY=${CC_TOKEN_104:?}
      - CCG_CONCURRENCY=${CCG_CONCURRENCY:-4}
      - WORKER_ID=104
      - WORKER_PORT=8788
    volumes:
      - worker-104-data:/root
    networks:
      - sup2api-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8788/health"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  worker-101-data:
  worker-102-data:
  worker-103-data:
  worker-104-data:

networks:
  sup2api-net:
    external: true
```

#### 6.4 启动所有生产 Worker

```bash
# 启动
docker-compose --env-file .env.ccgateway -f docker-compose.prod.yml up -d

# 查看状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

#### 6.5 批量授权 Worker

```bash
# 创建授权脚本
cat > authorize-workers.sh << 'EOF'
#!/bin/bash
set -e

WORKERS=(101 102 103 104)

for worker_id in "${WORKERS[@]}"; do
    echo "Authorizing worker-$worker_id..."
    docker exec -it ccgateway-worker-$worker_id claude auth login
    echo "Worker-$worker_id authorized."
    echo ""
done

echo "All workers authorized!"
EOF

chmod +x authorize-workers.sh

# 执行授权（需要手动完成每个 OAuth）
./authorize-workers.sh
```

#### 6.6 创建 sup2api 账号

在 sup2api 管理后台创建 4 个账号，或使用脚本：

```bash
cat > create-accounts.sh << 'EOF'
#!/bin/bash
set -e

API_HOST="http://your-sup2api-host"
TOKEN="YOUR_ACCESS_TOKEN"
GROUP_ID=1

WORKERS=(101 102 103 104)

for worker_id in "${WORKERS[@]}"; do
    echo "Creating account for worker-$worker_id..."
    
    curl -X POST "$API_HOST/api/v1/accounts" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"name\": \"CCGateway Worker $worker_id\",
        \"type\": \"ccgateway\",
        \"group_id\": $GROUP_ID,
        \"enabled\": true,
        \"config\": {
          \"worker_id\": \"$worker_id\",
          \"worker_url\": \"http://ccgateway-worker-$worker_id:8788\",
          \"worker_container\": \"ccgateway-worker-$worker_id\"
        }
      }"
    
    echo ""
done

echo "All accounts created!"
EOF

chmod +x create-accounts.sh
./create-accounts.sh
```

### 7. 验证部署

#### 7.1 健康检查

```bash
# 检查所有 Worker 健康状态
for worker_id in 101 102 103 104; do
    echo "Checking worker-$worker_id..."
    docker exec ccgateway-worker-$worker_id curl -f http://localhost:8788/health
done
```

#### 7.2 端到端测试

```bash
# 发送多个请求，验证负载均衡
for i in {1..10}; do
    echo "Request $i..."
    curl -X POST http://your-sup2api-host/v1/messages \
      -H "Authorization: Bearer YOUR_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "model": "claude-opus-5-5",
        "max_tokens": 64,
        "messages": [{"role": "user", "content": "Test request '$i'"}]
      }'
    echo ""
done
```

#### 7.3 检查日志

```bash
# 查看 Worker 日志，确认请求分布
docker-compose -f docker-compose.prod.yml logs --tail=50
```

---

## 维护操作

### 添加新账号

```bash
# 1. 在 .env.ccgateway 添加 Token
echo "CC_TOKEN_105=sk-ant-api03-..." >> .env.ccgateway

# 2. 在 docker-compose.prod.yml 添加 Worker 定义
# （参考现有 Worker 配置）

# 3. 启动新 Worker
docker-compose --env-file .env.ccgateway -f docker-compose.prod.yml up -d ccgateway-worker-105

# 4. 授权
docker exec -it ccgateway-worker-105 claude auth login

# 5. 在 sup2api 创建账号
# （参考创建账号步骤）
```

### 删除账号

```bash
# 1. 在 sup2api 禁用或删除账号

# 2. 停止并删除 Worker 容器
docker-compose -f docker-compose.prod.yml stop ccgateway-worker-105
docker-compose -f docker-compose.prod.yml rm -f ccgateway-worker-105

# 3. （可选）删除数据卷
docker volume rm ccgateway_worker-105-data
```

### 重启 Worker

```bash
# 重启单个 Worker
docker-compose -f docker-compose.prod.yml restart ccgateway-worker-101

# 重启所有 Worker
docker-compose -f docker-compose.prod.yml restart
```

### 查看日志

```bash
# 实时日志
docker-compose -f docker-compose.prod.yml logs -f ccgateway-worker-101

# 最近 100 行
docker-compose -f docker-compose.prod.yml logs --tail=100 ccgateway-worker-101
```

### 备份数据

```bash
# 备份 Worker 数据卷
docker run --rm \
  -v worker-101-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/worker-101-$(date +%Y%m%d).tar.gz /data
```

### 恢复数据

```bash
# 恢复 Worker 数据卷
docker run --rm \
  -v worker-101-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/worker-101-20261007.tar.gz -C /
```

---

## 监控和告警

### 关键指标

1. **Worker 健康状态**
   - 端点：`/health`
   - 预期：HTTP 200

2. **请求成功率**
   - sup2api 核心指标
   - 目标：> 99%

3. **平均响应时间**
   - 包含 Worker 处理时间
   - 目标：< 10 秒（取决于模型）

4. **容器资源使用**
   - CPU: < 80%
   - 内存: < 80%
   - 磁盘: < 80%

### 告警规则

```yaml
# Prometheus 告警示例
groups:
  - name: ccgateway
    rules:
      - alert: WorkerDown
        expr: up{job="ccgateway-worker"} == 0
        for: 5m
        annotations:
          summary: "CCGateway Worker {{ $labels.instance }} is down"

      - alert: WorkerHighErrorRate
        expr: rate(ccgateway_requests_failed[5m]) > 0.1
        for: 5m
        annotations:
          summary: "CCGateway Worker {{ $labels.instance }} has high error rate"

      - alert: WorkerHighMemory
        expr: container_memory_usage_bytes{name=~"ccgateway-worker-.*"} / container_spec_memory_limit_bytes > 0.8
        for: 5m
        annotations:
          summary: "CCGateway Worker {{ $labels.name }} memory usage > 80%"
```

---

## 故障排查

### Worker 无法启动

**症状：** 容器一直重启

**检查：**
```bash
docker logs ccgateway-worker-101
```

**可能原因：**
1. 环境变量缺失
   - 解决：检查 `.env.ccgateway`
2. 网络配置错误
   - 解决：确认 `sup2api-net` 存在
3. 数据卷权限问题
   - 解决：检查 volume 挂载

### Worker 健康检查失败

**症状：** `/health` 返回非 200

**检查：**
```bash
docker exec ccgateway-worker-101 curl http://localhost:8788/health
```

**可能原因：**
1. HTTP 服务未启动
   - 解决：检查日志，重启容器
2. 端口冲突
   - 解决：检查 WORKER_PORT 配置

### 请求超时

**症状：** 客户端请求超时

**检查流程：**
1. 检查核心日志（是否到达核心）
2. 检查插件日志（是否路由到 Worker）
3. 检查 Worker 日志（是否执行请求）

**可能原因：**
1. 网络连接问题
2. Claude API 响应慢
3. Worker 并发达到上限

### Claude 授权失效

**症状：** Worker 返回 401 错误

**解决：**
```bash
docker exec -it ccgateway-worker-101 bash
claude auth logout
claude auth login
exit
```

---

## 回滚流程

参见 [07-ROLLBACK-PLAN.md](07-ROLLBACK-PLAN.md)

---

## 安全建议

1. **网络隔离**
   - Worker 容器只能被 sup2api 核心访问
   - 使用 Docker 内部网络

2. **密钥管理**
   - 不要提交 `.env.ccgateway` 到 Git
   - 定期轮换 CCG_API_KEY 和 CCG_ADMIN_KEY

3. **最小权限**
   - Worker 容器不需要 Docker socket
   - 不需要 root 权限

4. **日志脱敏**
   - 确保日志不包含 CC Token
   - 确保日志不包含用户输入（可能有敏感信息）

---

## 附录

### A. 完整环境变量清单

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| CCG_API_KEY | 是 | - | 网关 API Key |
| CCG_ADMIN_KEY | 是 | - | 管理 API Key |
| ANTHROPIC_API_KEY | 是 | - | Claude Code Token |
| CCG_CONCURRENCY | 否 | 4 | 并发槽位数 |
| WORKER_ID | 是 | - | Worker 标识 |
| WORKER_PORT | 否 | 8788 | HTTP 监听端口 |
| CCG_LOG_LEVEL | 否 | info | 日志级别 |

### B. 容器资源建议

| 资源 | 最小值 | 推荐值 | 说明 |
|------|--------|--------|------|
| CPU | 0.5 核 | 1 核 | 每个 Worker |
| 内存 | 1 GB | 2 GB | 每个 Worker |
| 磁盘 | 5 GB | 10 GB | 会话历史 |

### C. 端口清单

| 端口 | 用途 | 暴露 |
|------|------|------|
| 8788 | Worker HTTP API | 内部 |
| 8787 | （预留）Manager | - |

---

**最后更新：** 2026-10-07
