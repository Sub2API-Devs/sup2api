# 订阅限额功能 - 实施状态

**创建时间**：2026-10-04 23:45  
**当前状态**：✅ 核心实现完成，等待 proto 代码生成

---

## ✅ 已完成（90%）

### 1. 数据库层
- ✅ 迁移脚本：`next/migrations/0029_account_subscription_limits.sql`
- ✅ 数据访问层：`next/server/internal/store/account_limits.go`
- ✅ 测试文件：`next/server/internal/store/account_limits_test.go`

### 2. 协议定义
- ✅ Proto 定义：`next/sdk/proto/platform.proto`
  - 新增 RPC 方法：`QuerySubscriptionLimits`
  - 请求消息：`QuerySubscriptionLimitsRequest`
  - 响应消息：`QuerySubscriptionLimitsResponse`
  - 窗口定义：`SubscriptionLimitWindow`
  - 错误类型：`SubscriptionLimitErrorType`

### 3. 核心服务
- ✅ 查询服务：`next/server/internal/account/limits.go`
  - `QueryAccountLimits` - 查询限额（5分钟缓存 + 30秒防抖）
  - `ResetAccountLimits` - 重置缓存
  - `buildSnapshotFromCache` - 构建快照
  - `callPluginForLimits` - 调用插件 RPC
  - `limitsDebouncer` - 防抖机制（内存 sync.Map）

### 4. HTTP API
- ✅ Handlers：`next/server/internal/account/handlers.go`
  - `GET /api/accounts/:id/subscription/limits?force=true`
  - `POST /api/accounts/:id/subscription/limits/reset`
- ✅ 路由注册：`service.go` 中的 `RegisterRoutes`

### 5. Service 集成
- ✅ `next/server/internal/account/service.go`
  - `limitsDebouncer` 字段已添加
  - `New()` 函数中初始化 debouncer

### 6. 文档
- ✅ 设计文档：`SUBSCRIPTION_LIMITS_DESIGN.md`
- ✅ 实施计划：`SUBSCRIPTION_LIMITS_IMPLEMENTATION_PLAN.md`
- ✅ 待办事项：`SUBSCRIPTION_LIMITS_TODO.md`
- ✅ 本状态文件

---

## 🔴 阻塞问题（需要先解决）

### Proto 代码生成

**问题**：本地环境缺少 `buf` 或 `protoc` 工具

**影响**：以下 3 个编译错误
```
internal\account\limits.go:155:25: bt.Client.QuerySubscriptionLimits undefined
internal\account\limits.go:155:69: undefined: pluginv1.QuerySubscriptionLimitsRequest
internal\account\limits.go:226:56: undefined: pluginv1.QuerySubscriptionLimitsResponse
```

**解决方案 A - 安装 buf（推荐）**：
```bash
# 安装 buf
go install github.com/bufbuild/buf/cmd/buf@latest

# 生成代码
cd D:\projects\golang\sup2api\next\sdk
buf generate

# 验证生成的文件
ls gen/pluginv1/platform.pb.go
ls gen/pluginv1/platform_grpc.pb.go
```

**解决方案 B - 安装 protoc**：
```bash
# 1. 下载 protoc for Windows
# https://github.com/protocolbuffers/protobuf/releases

# 2. 安装 Go 插件
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# 3. 生成代码
cd D:\projects\golang\sup2api\next\sdk
protoc --go_out=. --go-grpc_out=. proto/platform.proto
```

**解决方案 C - 远程生成**：
```bash
# 在 ovh 服务器上生成，然后下载回来
ssh ovh "cd /path/to/sup2api/next/sdk && buf generate"
scp ovh:/path/to/sup2api/next/sdk/gen/pluginv1/* ./gen/pluginv1/
```

---

## 🟡 待完成（生成 proto 后）

### 1. 编译验证
```bash
cd next/server
go build ./internal/account
go build ./...
```

### 2. 运行迁移
```bash
# 确认迁移工具
cd next/server
# 运行 0029 迁移
```

### 3. 单元测试
```bash
cd next/server/internal/store
go test -v -run TestAccountLimits
```

### 4. 集成测试（手工）
```bash
# 1. 启动服务
cd next/server
go run cmd/server/main.go

# 2. 测试 API Key 账号（应返回 has_limits=false）
curl http://localhost:8080/api/accounts/1/subscription/limits

# 3. 测试订阅账号（假设插件未实现，应返回 UNIMPLEMENTED 错误）
curl http://localhost:8080/api/accounts/2/subscription/limits

# 4. 测试强制刷新
curl http://localhost:8080/api/accounts/2/subscription/limits?force=true

# 5. 测试重置
curl -X POST http://localhost:8080/api/accounts/2/subscription/limits/reset \
  -H "Content-Type: application/json" \
  -d '{"clear_markers": true, "refetch": false}'

# 6. 测试防抖（30秒内重复请求应返回缓存）
curl http://localhost:8080/api/accounts/2/subscription/limits
sleep 5
curl http://localhost:8080/api/accounts/2/subscription/limits  # 应返回缓存
```

---

## 🟢 可选功能（阶段 4-6）

### 阶段 4：自动恢复
- [ ] 创建 `account/recovery.go`
- [ ] 在 `Service.Run()` 中添加定时任务（1分钟间隔）
- [ ] 实现 `recoverExhaustedAccounts()` 方法

### 阶段 5：插件实现
- [ ] Kimi 插件实现 `QuerySubscriptionLimits`
- [ ] 其他订阅类插件实现（智谱、豆包等）

### 阶段 6：前端集成
- [ ] 账号详情页添加限额展示组件
- [ ] 实现限额进度条
- [ ] 实现刷新按钮
- [ ] 实现重置按钮（管理员）

---

## 📊 代码统计

| 模块 | 文件 | 行数 | 状态 |
|------|------|------|------|
| 迁移脚本 | 1 | 35 | ✅ 完成 |
| Proto 定义 | 1 | 48 | ✅ 完成（未生成代码）|
| 数据访问层 | 1 | 201 | ✅ 完成 |
| 测试 | 1 | 94 | ✅ 完成 |
| 核心服务 | 1 | 235 | ✅ 完成 |
| HTTP Handlers | 1 | 59 | ✅ 完成 |
| **总计** | **6** | **672** | **90%** |

---

## 🎯 技术亮点

1. **独立表存储**：不污染 accounts 表，便于查询和清理
2. **5分钟缓存**：减少对上游 API 的频繁请求
3. **30秒防抖**：内存 sync.Map 防止并发滥用
4. **插件无关**：通过 RPC 协议支持任意订阅类型
5. **错误分类**：区分凭证失效和临时故障
6. **渐进实现**：核心功能先行，自动恢复可选
7. **审计日志**：记录限额重置操作

---

## 🔍 设计参考

基于 sub2api (new-api) 的实现：
- 数据结构：Window → KeyState → Snapshot
- 缓存策略：不依赖 TTL，存储在数据库
- 查询时机：403 错误、手动查询、定时恢复
- 防抖窗口：30 秒
- 自动恢复：后台定时任务（1 分钟间隔）

关键差异：
- **存储**：new-api 用 JSON 字段，sup2api-next 用独立表
- **架构**：new-api 内置 Provider，sup2api-next 用插件 RPC
- **职责**：new-api 转发层拦截 403，sup2api-next 独立查询服务

---

## 📋 验收清单

- [x] 迁移脚本已创建
- [x] Proto 协议已定义
- [ ] Proto 代码已生成（阻塞中）
- [x] 数据访问层已实现
- [x] 数据访问层测试已创建
- [x] 核心服务已实现
- [x] HTTP API 已实现
- [x] 路由已注册
- [x] Service 集成完成
- [ ] 编译通过（等待 proto）
- [ ] 迁移脚本已运行（等待 proto）
- [ ] 单元测试通过（等待 proto）
- [ ] 手工测试通过（等待 proto + 插件实现）
- [ ] 至少一个插件实现了 QuerySubscriptionLimits（阶段 5）
- [ ] 前端集成完成（阶段 6，可选）

---

## 🚀 下一步

### 立即执行
1. **生成 proto 代码**（选择上述任一方案）
2. **编译验证**
3. **运行迁移**
4. **运行测试**

### 后续规划
1. **提交代码**（核心功能完成后）
2. **实现插件**（Kimi 优先）
3. **前端集成**（可选）
4. **自动恢复**（可选）

---

**预计完成时间**：生成 proto 代码后 1-2 小时（编译、测试、集成）
