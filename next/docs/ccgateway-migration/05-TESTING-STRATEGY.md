# CCGateway 迁移测试策略

**最后更新：** 2026-10-07  
**测试负责人：** [待分配]  
**目标覆盖率：** > 80%

---

## 测试目标

确保 CCGateway 迁移后：
1. **功能完整性** - 所有功能正常工作
2. **性能达标** - 响应时间和吞吐量符合要求
3. **稳定性** - 长时间运行无故障
4. **兼容性** - 与现有系统无缝集成
5. **可运维性** - 易于部署、监控、故障排查

---

## 测试环境

### 环境清单

| 环境 | 用途 | 配置 | 数据 |
|------|------|------|------|
| 开发环境 | 单元测试、集成测试 | 1 Worker | 模拟数据 |
| 测试环境 | 完整功能测试 | 2 Worker | 测试数据 |
| 预发环境 | 灰度测试 | 4 Worker | 生产镜像数据 |
| 生产环境 | 正式服务 | N Worker | 真实数据 |

### 测试数据准备

**模拟 Claude API：**
```bash
# 在测试环境使用 mock 服务
docker run -d \
  --name claude-mock \
  -p 8080:8080 \
  mock-claude-api:latest
```

**测试账号：**
- 至少 2 个测试 CC Token
- 不同的分组配置
- 不同的模型权限

---

## 测试分层

### 第一层：单元测试

**目标：** 验证各个组件的基本功能

#### 1.1 Worker 单元测试

**测试内容：**

```go
// worker/history_test.go
func TestHistoryStore_CaptureNative(t *testing.T)
func TestHistoryStore_CleanUncommitted(t *testing.T)
func TestHistoryStore_SaveFingerprintIndex(t *testing.T)
func TestHistoryStore_FindCheckpoint(t *testing.T)

// worker/runner_test.go
func TestRunner_ExecClaude(t *testing.T)
func TestRunner_StreamJSONProtocol(t *testing.T)
func TestRunner_EnvironmentVariables(t *testing.T)

// worker/mod_callback_test.go
func TestModBridge_Ready(t *testing.T)
func TestModBridge_GetSystem(t *testing.T)
func TestModBridge_VerifyAttached(t *testing.T)
```

**运行方式：**
```bash
cd tools/ccgateway/worker
go test ./... -v -cover
```

**通过标准：**
- 所有测试通过
- 覆盖率 > 80%
- 无数据竞争（`go test -race`）

#### 1.2 插件单元测试

**测试内容：**

```go
// plugins/ccgateway/plugin_test.go
func TestPlugin_GetWorkerURL(t *testing.T)
func TestPlugin_Execute(t *testing.T)
func TestPlugin_CacheInvalidation(t *testing.T)
func TestPlugin_ErrorHandling(t *testing.T)
```

**Mock 依赖：**
```go
type MockHostService struct {
    accounts map[int64]*Account
}

func (m *MockHostService) GetAccount(ctx context.Context, id int64) (*Account, error) {
    // Mock 实现
}
```

**运行方式：**
```bash
cd next/plugins/ccgateway
go test ./... -v -cover
```

**通过标准：**
- 所有测试通过
- 覆盖率 > 80%

#### 1.3 核心集成单元测试

**测试内容：**
- 账号类型注册
- Host Service 实现
- 调度器集成

**通过标准：**
- 所有测试通过
- 不影响现有测试

---

### 第二层：集成测试

**目标：** 验证组件之间的协作

#### 2.1 Worker 独立测试

**测试场景：**

**场景 1：基本请求**
```bash
# 启动 Worker（使用 mock Claude API）
docker run -d \
  --name worker-test \
  -e ANTHROPIC_BASE_URL=http://claude-mock:8080 \
  ccgateway-worker:latest

# 发送请求
curl -X POST http://worker-test:8788/v1/messages \
  -H "Authorization: Bearer test-key" \
  -d '{
    "model": "claude-opus-5-5",
    "max_tokens": 64,
    "messages": [{"role": "user", "content": "hello"}]
  }'

# 验证：
# - HTTP 200
# - 返回 SSE 流
# - 包含 message_start, content_block_delta, message_stop 事件
```

**场景 2：会话续聊**
```bash
# 请求 1：创建会话
curl ... -H "X-CCGateway-Session-ID: test-session-1"

# 请求 2：续聊（相同 session ID）
curl ... -H "X-CCGateway-Session-ID: test-session-1"

# 验证：
# - 第二次请求使用 prefix-hit
# - 日志显示 "mode: prefix-hit"
```

**场景 3：附件过滤**
```bash
# client 模式
curl ... -H "X-CCGateway-Request-Policy: {\"attachment_source\":\"client\"}"

# 验证：
# - 请求日志中包含客户端 system
# - 不包含 environment, date, session_context

# gateway 模式
curl ... -H "X-CCGateway-Request-Policy: {\"attachment_source\":\"gateway\"}"

# 验证：
# - 请求日志中包含 environment, date
# - 不包含客户端 system
```

**场景 4：Mod 回调**
```bash
# 检查 Worker 日志
docker logs worker-test | grep "mod-callback"

# 验证：
# - Mod 发送 ready 信号
# - Mod 获取 system messages
# - Mod 确认附加数量
```

**通过标准：**
- 所有场景通过
- 无错误日志
- 会话历史正确记录

#### 2.2 插件集成测试

**测试场景：**

**场景 1：账号映射**
```go
func TestPlugin_AccountMapping(t *testing.T) {
    // 创建测试账号
    host.AddAccount(101, Account{
        ID: 101,
        Type: "ccgateway",
        Config: json.RawMessage(`{"worker_url":"http://worker-101:8788"}`),
    })
    
    // 执行请求
    resp, err := plugin.Execute(ctx, &ExecuteRequest{
        AccountID: 101,
        RequestBody: testRequest,
    })
    
    // 验证：正确路由到 worker-101
}
```

**场景 2：缓存管理**
```go
func TestPlugin_CacheManagement(t *testing.T) {
    // 第一次查询：从 Host Service 获取
    url1, _ := plugin.getWorkerURL(ctx, 101)
    
    // 第二次查询：从缓存获取
    url2, _ := plugin.getWorkerURL(ctx, 101)
    
    // 验证：第二次没有调用 Host Service
    // 验证：url1 == url2
}
```

**场景 3：错误处理**
```go
func TestPlugin_ErrorHandling(t *testing.T) {
    // 账号不存在
    _, err := plugin.Execute(ctx, &ExecuteRequest{AccountID: 999})
    assert.Error(t, err)
    
    // Worker 不可达
    _, err = plugin.Execute(ctx, &ExecuteRequest{AccountID: 101})
    assert.Error(t, err)
}
```

**通过标准：**
- 所有场景通过
- 错误处理正确
- 缓存逻辑正确

#### 2.3 端到端测试

**测试场景：**

**场景 1：完整请求流程**
```bash
# 1. 在 sup2api 创建 CCGateway 账号
curl -X POST http://sup2api/api/v1/accounts \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "name": "Test CCGateway",
    "type": "ccgateway",
    "group_id": 1,
    "config": {"worker_url": "http://worker-test:8788"}
  }'

# 2. 通过 sup2api 发送请求
curl -X POST http://sup2api/v1/messages \
  -H "Authorization: Bearer api-key" \
  -d '{
    "model": "claude-opus-5-5",
    "max_tokens": 64,
    "messages": [{"role": "user", "content": "test"}]
  }'

# 验证：
# - 核心选择 CCGateway 账号
# - 插件路由到 Worker
# - Worker 执行成功
# - 返回正确响应
```

**场景 2：多账号负载均衡**
```bash
# 1. 创建 2 个 CCGateway 账号在同一分组

# 2. 发送 10 个请求
for i in {1..10}; do
  curl ... &
done
wait

# 验证：
# - 请求分布到 2 个账号
# - 负载相对均衡
```

**场景 3：工具调用往返**
```bash
# 发送带工具的请求
curl ... -d '{
  "model": "claude-opus-5-5",
  "max_tokens": 1024,
  "tools": [{"name": "get_weather", "description": "...", ...}],
  "messages": [{"role": "user", "content": "天气如何"}]
}'

# 模型返回 tool_use
# sup2api 调用工具
# 返回 tool_result
# 模型继续推理

# 验证：
# - 工具调用被拦截（不在 Worker 执行）
# - tool_result 正确回传
# - 会话历史包含工具往返
```

**通过标准：**
- 所有场景通过
- 请求链路完整
- 日志清晰可追踪

---

### 第三层：性能测试

**目标：** 验证性能指标

#### 3.1 基准测试

**测试指标：**

| 指标 | 目标 | 测量方法 |
|------|------|----------|
| 单请求延迟 | < 进程启动 (~350ms) + 模型推理 | 时间戳对比 |
| Worker 并发能力 | 4 请求/Worker（配置的槽位数） | 压测 |
| 内存占用 | < 2GB/Worker | docker stats |
| CPU 占用 | < 1核/Worker | docker stats |

**测试脚本：**

```bash
# 基准测试脚本
cat > benchmark.sh << 'EOF'
#!/bin/bash

WORKER_URL="http://worker-test:8788"
API_KEY="test-key"
CONCURRENCY=10
REQUESTS=100

# 使用 ab (Apache Bench)
ab -n $REQUESTS -c $CONCURRENCY \
  -p request.json \
  -T application/json \
  -H "Authorization: Bearer $API_KEY" \
  $WORKER_URL/v1/messages

# 或使用 wrk
wrk -t4 -c10 -d30s \
  -s request.lua \
  $WORKER_URL/v1/messages
EOF

chmod +x benchmark.sh
./benchmark.sh
```

**request.json：**
```json
{
  "model": "claude-opus-5-5",
  "max_tokens": 64,
  "messages": [{"role": "user", "content": "test"}]
}
```

**通过标准：**
- 延迟 < 目标值
- 吞吐量 >= 目标值
- 资源占用 < 阈值

#### 3.2 压力测试

**测试场景：**

**场景 1：峰值负载**
```bash
# 模拟 100 并发用户，持续 5 分钟
wrk -t10 -c100 -d300s \
  -s request.lua \
  http://sup2api/v1/messages
```

**验证：**
- 成功率 > 99%
- P99 延迟 < 15 秒
- 无 Worker 崩溃
- 无内存泄漏

**场景 2：长时间运行**
```bash
# 模拟 10 并发，持续 24 小时
wrk -t4 -c10 -d24h \
  -s request.lua \
  http://sup2api/v1/messages
```

**验证：**
- 成功率 > 99.9%
- 无性能退化
- 无资源泄漏
- 日志正常

**场景 3：突发流量**
```bash
# 正常负载（10 并发）
wrk -t4 -c10 -d60s ... &

# 等待 30 秒

# 突发流量（100 并发）
wrk -t10 -c100 -d30s ...

# 恢复正常（10 并发）
wrk -t4 -c10 -d60s ...
```

**验证：**
- 突发期间成功率 > 95%
- 恢复后无遗留问题
- Worker 自动恢复

#### 3.3 性能对比

**基线：** 当前实现（如果有）

**对比指标：**
- 平均延迟
- P95 / P99 延迟
- 吞吐量
- 资源占用

**测试方法：**
```bash
# 1. 测试当前实现
./benchmark.sh > baseline.txt

# 2. 测试新实现
./benchmark.sh > new.txt

# 3. 对比结果
diff baseline.txt new.txt
```

**通过标准：**
- 性能不退化（延迟 < 基线 + 10%）
- 或者有明确的性能提升

---

### 第四层：验收测试

**目标：** 确认满足业务需求

#### 4.1 功能验收清单

**基础功能：**
- [ ] 文本生成（单轮对话）
- [ ] 会话续聊（多轮对话）
- [ ] 流式响应（SSE）
- [ ] 非流式响应

**高级功能：**
- [ ] 客户端工具调用
- [ ] 工具往返（多次）
- [ ] 附件过滤（client/gateway/both）
- [ ] system messages（顶部、中间、待提交）
- [ ] 结构化输出
- [ ] 工具发现（ToolSearch）
- [ ] 扩展思考

**会话管理：**
- [ ] 会话创建
- [ ] 会话恢复（prefix-hit）
- [ ] 会话分支（fork）
- [ ] 会话导入（rebuild）
- [ ] 指纹索引

**错误处理：**
- [ ] 网络错误重试
- [ ] 超时处理
- [ ] 格式错误返回
- [ ] Worker 故障切换

#### 4.2 非功能验收清单

**性能：**
- [ ] 平均延迟 < 10 秒（含模型推理）
- [ ] P99 延迟 < 30 秒
- [ ] 并发能力 >= 4 请求/Worker
- [ ] 启动成本 < 500ms

**稳定性：**
- [ ] 24 小时无故障运行
- [ ] 成功率 > 99.9%
- [ ] 无内存泄漏
- [ ] 无资源泄漏

**可用性：**
- [ ] Worker 故障自动恢复
- [ ] 健康检查正常
- [ ] 日志完整清晰
- [ ] 监控指标准确

**安全性：**
- [ ] API Key 验证
- [ ] 授权隔离（每个账号独立）
- [ ] 会话历史隔离
- [ ] 无敏感信息泄漏

**可运维性：**
- [ ] 部署简单（< 30 分钟）
- [ ] 配置清晰（文档完整）
- [ ] 监控完善（关键指标）
- [ ] 故障排查容易（日志清晰）

#### 4.3 兼容性验收

**客户端兼容：**
- [ ] Anthropic SDK (Python)
- [ ] Anthropic SDK (Node.js)
- [ ] OpenAI SDK (兼容模式)
- [ ] 原始 HTTP/SSE 客户端

**模型兼容：**
- [ ] claude-opus-5-5
- [ ] claude-sonnet-5-5
- [ ] claude-haiku-4-5
- [ ] 其他可用模型

**功能兼容：**
- [ ] 原有 API 端点不变
- [ ] 原有参数支持
- [ ] 原有错误码保持
- [ ] 原有限流逻辑不变

---

## 测试自动化

### CI/CD 集成

**GitHub Actions 配置：**

```yaml
# .github/workflows/ccgateway-test.yml
name: CCGateway Tests

on:
  push:
    paths:
      - 'tools/ccgateway/**'
      - 'next/plugins/ccgateway/**'
  pull_request:
    paths:
      - 'tools/ccgateway/**'
      - 'next/plugins/ccgateway/**'

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.27'
      
      - name: Worker Unit Tests
        run: |
          cd tools/ccgateway/worker
          go test ./... -v -cover -race
      
      - name: Plugin Unit Tests
        run: |
          cd next/plugins/ccgateway
          go test ./... -v -cover -race
  
  integration-tests:
    runs-on: ubuntu-latest
    services:
      claude-mock:
        image: mock-claude-api:latest
        ports:
          - 8080:8080
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Worker Image
        run: |
          cd tools/ccgateway/worker
          docker build -t ccgateway-worker:test .
      
      - name: Run Integration Tests
        run: |
          ./tests/integration/run-tests.sh
```

### 回归测试套件

**测试数据库：**
```bash
# tests/regression/test-cases.json
[
  {
    "name": "basic-request",
    "request": {...},
    "expected": {...}
  },
  {
    "name": "session-continuity",
    "requests": [{...}, {...}],
    "expected": {...}
  }
]
```

**执行脚本：**
```bash
# tests/regression/run.sh
#!/bin/bash

for test in tests/regression/test-cases/*.json; do
  echo "Running $(basename $test)..."
  ./test-runner.sh $test
done
```

---

## 测试报告

### 报告模板

```markdown
# CCGateway 测试报告

**日期：** YYYY-MM-DD  
**版本：** vX.Y.Z  
**测试人员：** [名字]

## 测试概要

- 执行测试：120 个
- 通过：118 个
- 失败：2 个
- 跳过：0 个

## 单元测试

- Worker: 45/45 通过，覆盖率 85%
- 插件: 32/32 通过，覆盖率 82%
- 核心集成: 15/15 通过

## 集成测试

- Worker 独立: 8/8 通过
- 插件集成: 6/6 通过
- 端到端: 10/12 通过

### 失败用例

1. **端到端-工具调用往返**
   - 现象：第二次工具调用失败
   - 原因：会话历史未正确更新
   - 状态：已修复，待验证

2. **端到端-附件过滤-gateway模式**
   - 现象：客户端 system 未被过滤
   - 原因：Mod 钩子逻辑错误
   - 状态：修复中

## 性能测试

- 平均延迟：8.2 秒 ✅
- P99 延迟：18.5 秒 ✅
- 吞吐量：4.2 请求/秒/Worker ✅
- 内存占用：1.5 GB/Worker ✅

## 验收测试

- 功能验收：30/32 项通过 (93.75%)
- 非功能验收：18/20 项通过 (90%)
- 兼容性验收：12/12 项通过 (100%)

## 遗留问题

1. [P1] 工具调用往返失败（修复中）
2. [P1] 附件过滤-gateway模式失败（修复中）
3. [P2] 长时间运行内存缓慢增长（待观察）

## 测试结论

☐ 通过，可以上线  
☑ 基本通过，修复遗留问题后可上线  
☐ 不通过，需要重大修复

## 建议

1. 修复 2 个 P1 问题
2. 补充工具调用的测试用例
3. 进行 48 小时稳定性测试
```

---

## 测试时间表

| 阶段 | 时长 | 负责人 | 依赖 |
|------|------|--------|------|
| 单元测试 | 2 天 | 开发人员 | 代码完成 |
| 集成测试 | 3 天 | 测试人员 | 单元测试通过 |
| 性能测试 | 2 天 | 测试人员 | 集成测试通过 |
| 验收测试 | 3 天 | 产品+测试 | 性能测试通过 |
| **总计** | **10 天** | | |

---

**最后更新：** 2026-10-07
