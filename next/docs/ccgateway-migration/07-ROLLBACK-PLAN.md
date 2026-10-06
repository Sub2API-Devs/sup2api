# CCGateway 迁移回滚预案

**最后更新：** 2026-10-07  
**版本：** 1.0  
**紧急联系：** [待填写]

---

## 概述

本文档描述在 CCGateway 迁移出现问题时的回滚流程。

**回滚策略：**
- 迁移采用**并行运行**策略（新旧系统同时运行）
- 灰度期间可以快速切换回旧系统
- 全量上线后，保留旧系统 7 天作为应急备份

---

## 回滚触发条件

### 必须立即回滚的情况（P0）

1. **服务不可用**
   - CCGateway 账号请求成功率 < 50%
   - 持续时间 > 5 分钟
   - 影响范围 > 50% 用户

2. **数据丢失风险**
   - 会话历史丢失
   - 账号配置损坏
   - 数据库异常

3. **安全事故**
   - 凭据泄露
   - 未授权访问
   - 严重漏洞

### 建议回滚的情况（P1）

1. **性能严重下降**
   - 平均响应时间增加 > 50%
   - 超时率 > 10%
   - 持续时间 > 30 分钟

2. **功能异常**
   - 会话续聊失败率 > 20%
   - 附件过滤错误
   - 工具调用失败

3. **稳定性问题**
   - Worker 容器频繁重启
   - 资源占用异常（CPU > 90%，内存泄漏）
   - 磁盘空间不足

### 可以继续观察的情况（P2）

1. **小范围问题**
   - 单个 Worker 故障（其他 Worker 正常）
   - 个别账号异常
   - 非关键功能异常

2. **性能轻微下降**
   - 响应时间增加 < 20%
   - 影响范围 < 10% 用户

**决策原则：**
- P0：立即回滚，无需审批
- P1：与团队沟通后回滚
- P2：修复优先，不回滚

---

## 回滚决策流程

```
发现问题
    ↓
评估严重性（P0/P1/P2）
    ↓
    ├─ P0 → 立即回滚（执行回滚）
    ├─ P1 → 团队讨论（15分钟内决策）
    └─ P2 → 继续监控，尝试修复
         ↓
     问题解决？
         ├─ 是 → 继续运行
         └─ 否 → 升级为 P1
```

---

## 回滚场景和步骤

### 场景 1：灰度期间回滚（最简单）

**前提：**
- 只有部分账号切换到 CCGateway
- 旧系统仍在运行

**步骤：**

#### 1.1 停止切换新流量
```bash
# 在 sup2api 管理后台：
# 1. 禁用所有 CCGateway 账号
# 2. 或者调整分组权重，将流量切回旧账号
```

#### 1.2 验证流量切换
```bash
# 检查核心日志，确认不再调用 CCGateway 账号
docker logs sup2api-core | grep ccgateway

# 应该看不到新的 CCGateway 请求
```

#### 1.3 等待现有请求完成
```bash
# 等待所有正在进行的 CCGateway 请求完成（约 1-2 分钟）
watch -n 5 'docker stats --no-stream ccgateway-worker-* | grep -v "0.00%"'
```

#### 1.4 停止 CCGateway 容器
```bash
cd ~/sup2api-deployment/ccgateway
docker-compose -f docker-compose.prod.yml stop

# 不删除容器和数据，保留现场用于调查
```

#### 1.5 验证旧系统正常
```bash
# 发送测试请求到旧系统
curl -X POST http://your-sup2api-host/v1/messages \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{...}'
```

**完成时间：** 5-10 分钟  
**影响：** 最小（旧系统一直在运行）

---

### 场景 2：全量上线后回滚（7天内）

**前提：**
- 所有账号已切换到 CCGateway
- 旧系统已停止，但数据保留

**步骤：**

#### 2.1 紧急通知
```bash
# 发送告警到运维群
# 标题：【紧急】CCGateway 回滚进行中
# 预计影响时间：10-15 分钟
```

#### 2.2 停止 CCGateway
```bash
cd ~/sup2api-deployment/ccgateway

# 停止所有 Worker
docker-compose -f docker-compose.prod.yml stop

# 禁用 CCGateway 插件（在 sup2api 管理后台）
# 或者停止 sup2api 核心（如果需要重新配置）
```

#### 2.3 恢复旧系统

**如果旧系统是独立服务：**
```bash
cd ~/sup2api-deployment/old-ccgateway

# 检查旧系统容器状态
docker ps -a | grep old-ccgateway

# 启动旧服务
docker-compose up -d

# 等待健康检查通过
docker-compose ps
```

**如果旧系统是其他插件：**
```bash
# 在 sup2api 管理后台：
# 1. 启用旧的账号类型（如 anthropic）
# 2. 确认账号配置正确
# 3. 测试账号可用性
```

#### 2.4 在 sup2api 中切换账号

```bash
# 方案 A：禁用 CCGateway 账号，启用旧账号
# 方案 B：调整分组，将流量切回旧账号
# 方案 C：删除 CCGateway 账号（谨慎）
```

#### 2.5 验证服务恢复
```bash
# 发送多个测试请求
for i in {1..10}; do
  curl -X POST http://your-sup2api-host/v1/messages \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -d '{...}'
done

# 检查成功率
```

#### 2.6 监控观察（30 分钟）
- 请求成功率
- 响应时间
- 用户反馈

**完成时间：** 10-15 分钟  
**影响：** 中等（服务短暂中断）

---

### 场景 3：旧系统已删除（7天后）

**前提：**
- 旧系统已完全删除
- 只能回滚到其他可用账号类型

**步骤：**

#### 3.1 评估替代方案
- 是否有其他可用的账号类型？
- 是否可以快速修复 CCGateway？
- 是否可以部分恢复服务？

#### 3.2 如果有替代账号
```bash
# 在 sup2api 快速创建替代账号
# 例如：Anthropic、OpenAI 等

# 调整分组，将流量切到替代账号
```

#### 3.3 如果无替代账号
```bash
# 只能尝试修复 CCGateway
# 同时考虑：
# 1. 降级服务（关闭部分功能）
# 2. 限流（减少负载）
# 3. 用户通知（服务降级公告）
```

#### 3.4 紧急重建旧系统（最后手段）
```bash
# 从备份恢复旧系统配置
# 从 Docker 镜像仓库拉取旧版本
# 重新部署和配置

# 这可能需要 1-2 小时
```

**完成时间：** 1-2 小时（最坏情况）  
**影响：** 严重（长时间服务中断）

---

## 数据恢复

### 会话历史恢复

**场景：** Worker 数据卷损坏

**步骤：**

```bash
# 1. 从备份恢复数据卷
docker run --rm \
  -v worker-101-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/worker-101-latest.tar.gz -C /

# 2. 重启 Worker
docker-compose restart ccgateway-worker-101

# 3. 验证会话历史
docker exec ccgateway-worker-101 ls -la /root/.claude/sessions/
```

### 账号配置恢复

**场景：** sup2api 账号配置错误

**步骤：**

```bash
# 1. 从数据库备份恢复
psql -U postgres -d sup2api < backups/accounts-backup.sql

# 2. 或者通过 API 重新创建账号
./create-accounts.sh

# 3. 验证账号配置
curl http://your-sup2api-host/api/v1/accounts
```

### Claude 授权恢复

**场景：** Worker 授权失效

**步骤：**

```bash
# 1. 如果有授权备份
docker cp backups/worker-101-auth/ ccgateway-worker-101:/root/.claude/auth/

# 2. 或者重新授权
docker exec -it ccgateway-worker-101 claude auth login

# 3. 验证授权
docker exec ccgateway-worker-101 claude auth status
```

---

## 回滚验证清单

### 基础验证
- [ ] 旧系统容器运行正常
- [ ] sup2api 核心可以访问旧系统
- [ ] 健康检查通过

### 功能验证
- [ ] 简单请求成功（hello world）
- [ ] 会话续聊正常
- [ ] 工具调用正常
- [ ] 附件处理正常

### 性能验证
- [ ] 响应时间在正常范围（< 基线 + 20%）
- [ ] 并发处理能力正常
- [ ] 无明显错误日志

### 业务验证
- [ ] 发送 10 个真实用户请求
- [ ] 检查用户反馈
- [ ] 监控关键指标（30 分钟）

---

## 回滚后的行动

### 立即行动

1. **问题分析**
   - 收集所有日志（核心、插件、Worker）
   - 记录错误现象和时间线
   - 确定根本原因

2. **团队会议**
   - 召集相关人员
   - 复盘回滚过程
   - 讨论修复方案

3. **用户通知**
   - 如果有服务中断，向用户道歉
   - 说明问题原因和解决时间
   - 提供替代方案（如果有）

### 后续行动

1. **修复问题**
   - 根据根因制定修复方案
   - 在测试环境验证
   - 准备再次部署

2. **改进预案**
   - 更新回滚文档
   - 增加监控告警
   - 完善测试用例

3. **复盘总结**
   - 记录教训
   - 优化流程
   - 培训团队

---

## 应急联系人

### 技术团队

| 角色 | 姓名 | 联系方式 | 职责 |
|------|------|---------|------|
| 项目负责人 | [待填写] | [待填写] | 决策、协调 |
| 后端开发 | [待填写] | [待填写] | 代码修复 |
| 运维工程师 | [待填写] | [待填写] | 系统操作 |
| DBA | [待填写] | [待填写] | 数据恢复 |

### 业务团队

| 角色 | 姓名 | 联系方式 | 职责 |
|------|------|---------|------|
| 产品经理 | [待填写] | [待填写] | 业务决策 |
| 客服负责人 | [待填写] | [待填写] | 用户沟通 |

### 升级路径

1. 发现问题 → 运维工程师
2. 评估严重性 → 项目负责人
3. 决定回滚 → 项目负责人
4. 执行回滚 → 运维工程师 + 后端开发
5. 用户通知 → 产品经理 + 客服负责人

---

## 回滚演练

**建议：** 每季度进行一次回滚演练

### 演练计划

**时间：** [待定]  
**参与人员：** 技术团队全员  
**环境：** 测试环境

**演练步骤：**
1. 模拟故障场景
2. 触发回滚流程
3. 执行回滚操作
4. 验证服务恢复
5. 记录演练时间和问题
6. 总结改进

**成功标准：**
- 回滚时间 < 15 分钟
- 服务完全恢复
- 无数据丢失
- 团队熟悉流程

---

## 附录

### A. 回滚命令速查

```bash
# 停止 CCGateway
docker-compose -f docker-compose.prod.yml stop

# 启动旧系统
docker-compose -f docker-compose.old.yml up -d

# 禁用 CCGateway 账号（API）
curl -X PATCH http://your-sup2api-host/api/v1/accounts/101 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"enabled": false}'

# 启用旧账号（API）
curl -X PATCH http://your-sup2api-host/api/v1/accounts/201 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"enabled": true}'

# 检查服务状态
curl http://your-sup2api-host/health

# 发送测试请求
curl -X POST http://your-sup2api-host/v1/messages \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"model":"claude-opus-5-5","max_tokens":64,"messages":[{"role":"user","content":"test"}]}'
```

### B. 日志收集脚本

```bash
#!/bin/bash
# collect-logs.sh

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_DIR="rollback-logs-$TIMESTAMP"

mkdir -p $LOG_DIR

# 核心日志
docker logs sup2api-core > $LOG_DIR/core.log 2>&1

# 插件日志（如果有独立容器）
docker logs sup2api-plugin-ccgateway > $LOG_DIR/plugin.log 2>&1

# Worker 日志
for worker_id in 101 102 103 104; do
  docker logs ccgateway-worker-$worker_id > $LOG_DIR/worker-$worker_id.log 2>&1
done

# 容器状态
docker ps -a > $LOG_DIR/containers.txt

# 系统资源
docker stats --no-stream > $LOG_DIR/stats.txt

# 打包
tar czf $LOG_DIR.tar.gz $LOG_DIR/
echo "Logs collected: $LOG_DIR.tar.gz"
```

### C. 监控检查脚本

```bash
#!/bin/bash
# check-service.sh

API_HOST="http://your-sup2api-host"
API_KEY="YOUR_API_KEY"

echo "Checking service health..."

# 健康检查
health=$(curl -s $API_HOST/health)
echo "Health: $health"

# 发送测试请求
response=$(curl -s -X POST $API_HOST/v1/messages \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-opus-5-5",
    "max_tokens": 64,
    "messages": [{"role": "user", "content": "test"}]
  }')

if echo "$response" | grep -q "error"; then
  echo "❌ Request failed"
  echo "$response"
  exit 1
else
  echo "✅ Request succeeded"
  exit 0
fi
```

---

**最后更新：** 2026-10-07  
**版本历史：**
- v1.0 (2026-10-07): 初始版本
