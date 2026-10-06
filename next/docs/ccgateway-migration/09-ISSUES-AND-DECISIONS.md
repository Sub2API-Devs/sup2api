# CCGateway 迁移问题和决策记录

**最后更新：** 2026-10-07

---

## 架构决策记录 (ADR)

### ADR-001: 不需要 Gateway Manager 层

**日期：** 2026-10-07  
**状态：** ✅ 已采纳  
**决策者：** 用户 + Claude

**背景：**
最初设计中考虑在插件和 Worker 之间增加一个 Manager 层，负责负载均衡、健康检查等。

**决策：**
不需要 Manager 层，插件直接访问 Worker。

**理由：**
1. sup2api 核心已经实现了账号调度逻辑（分组、模型、负载、限流）
2. 每个账号对应一个固定的 Worker 容器，无需额外负载均衡
3. Manager 层只是一个透明代理，没有业务价值
4. 减少一层网络跳转，降低延迟
5. 减少故障点，简化架构
6. 核心插件系统自带健康检查机制

**后果：**
- 插件需要实现 account_id → worker_url 映射逻辑（约 200 行代码）
- 架构更简洁，延迟更低
- 部署和运维更简单

**替代方案：**
- 方案 A（已否决）：引入 Manager 层做反向代理
  - 问题：多余的一层，无价值

---

### ADR-002: 账号与 Worker 容器一对一绑定

**日期：** 2026-10-07  
**状态：** ✅ 已采纳  
**决策者：** 用户

**背景：**
需要确定账号和 Worker 容器的映射关系。

**决策：**
每个 sup2api 账号对应一个独立的 CC Worker 容器。

**理由：**
1. 隔离性：每个账号独立的 Claude Code 授权
2. 会话管理：每个容器独立的历史文件，无并发冲突
3. 故障隔离：一个容器故障不影响其他账号
4. 扩展性：添加账号 = 启动新容器
5. 安全性：账号凭据物理隔离

**后果：**
- 容器数量 = 账号数量
- 每个容器需要独立授权
- 资源消耗较高（但可接受，LLM 请求是秒级）
- 管理容器需要自动化脚本

**替代方案：**
- 方案 A（已否决）：多个账号共享一个 Worker 容器
  - 问题：授权冲突、会话隔离复杂、故障域扩大
- 方案 B（已否决）：动态 Worker 池
  - 问题：会话管理复杂、无明显收益

---

### ADR-003: 零文件通信，使用环境变量 + HTTP 回调

**日期：** 2026-10-07  
**状态：** ✅ 已采纳  
**决策者：** 用户 + Claude

**背景：**
当前 CCGateway 使用临时文件与 Mods 通信（ready.txt, system.json 等）。

**决策：**
改用环境变量传递配置 + HTTP 回调接收 Mod 信号。

**理由：**
1. 更清晰：每个进程的环境变量天然隔离
2. 更可靠：HTTP 是同步调用，文件是异步轮询
3. 更易测试：HTTP 可以 mock，文件操作难测
4. 更现代：符合容器化最佳实践
5. 无临时文件泄漏风险

**实施：**
```javascript
// Mod 代码
const systemsJSON = await $.env.get('CCGATEWAY_SYSTEMS');
const systems = JSON.parse(systemsJSON);

await fetch('http://localhost:8787/mod-callback/ready', {
    method: 'POST',
    body: JSON.stringify({signal: 'ccgateway-v1'})
});
```

```go
// Go 代码
env["CCGATEWAY_SYSTEMS"] = mustJSON(systems)
env["CCGATEWAY_ATTACHMENT_SOURCE"] = "client"
```

**后果：**
- Mod 代码需要改造（约 50 行变化）
- Worker 需要启动 HTTP 服务监听回调
- 环境变量有长度限制（~2MB，实际够用）

**替代方案：**
- 方案 A（已否决）：继续使用临时文件
  - 问题：不够清晰，难以测试，容易泄漏

---

### ADR-004: Worker 直接操作历史文件，不引入共享存储

**日期：** 2026-10-07  
**状态：** ✅ 已采纳  
**决策者：** Claude + 用户确认

**背景：**
历史会话文件需要读写，需要确定操作主体。

**决策：**
Worker 是唯一的文件操作者，每个 Worker 有独立数据卷，不引入共享存储。

**理由：**
1. 避免并发冲突：只有一个进程写文件
2. 简单可靠：无需分布式锁
3. 性能更好：本地 I/O 比 NFS 快
4. 易于备份：每个 volume 独立备份
5. 故障隔离：一个 volume 损坏不影响其他

**后果：**
- 续聊到不同 Worker 需要导入历史（首次 ~100ms）
- 之后续聊是 prefix-hit（< 50ms）
- 无法在 Worker 之间共享会话历史

**替代方案：**
- 方案 A（已否决）：Manager 操作文件，Worker 只 exec
  - 问题：Manager 和 Worker 并发写，需要锁
- 方案 B（已否决）：共享存储（NFS/Ceph）
  - 问题：性能差、复杂、需要锁

---

## 技术问题记录

### 问题-001: Claude Code 是否支持 gRPC 模式？

**提出日期：** 2026-10-07  
**状态：** ✅ 已解决  
**提出人：** 用户

**问题描述：**
是否可以让 Claude Code CLI 以 gRPC 服务模式运行，避免每次 exec 启动进程？

**调研结果：**
Claude Code **不支持** gRPC 服务模式：
- `claude agent serve` 命令不存在
- CLI 只有 `--stream-json` 模式（stdin/stdout）
- 没有任何 gRPC、端口监听相关参数

**解决方案：**
保持 exec 模式：
- 启动成本 ~350ms
- 模型推理 5-30 秒
- 启动占比 < 2%，可接受

**参考：**
- agent: grpc-migration-architect 的完整调研报告

---

### 问题-002: 如何获取账号的 Worker URL？

**提出日期：** 2026-10-07  
**状态：** 🟡 待确认  
**提出人：** Claude

**问题描述：**
插件如何根据 account_id 获取对应的 worker_url？

**可能方案：**

**方案 A：通过 Host Service 查询账号配置**
```go
account, err := host.GetAccount(ctx, accountID)
workerURL := account.Config["worker_url"]
```
- 优点：动态，支持配置更新
- 缺点：每次查询有网络开销

**方案 B：插件启动时预加载所有映射**
```go
accounts, err := host.ListAccountsByType(ctx, "ccgateway")
for _, acc := range accounts {
    plugin.workerMap[acc.ID] = acc.Config["worker_url"]
}
```
- 优点：快速，无网络开销
- 缺点：新增账号需要重启插件

**方案 C：混合方案（推荐）**
```go
// 先查缓存
if url, ok := plugin.workerMap[accountID]; ok {
    return url
}
// 缓存未命中，查询并缓存
account, err := host.GetAccount(ctx, accountID)
plugin.workerMap[accountID] = account.Config["worker_url"]
```
- 优点：兼顾性能和动态性
- 缺点：需要缓存失效机制

**待确认：**
- Host Service 是否已提供 GetAccount / ListAccountsByType？
- 账号配置更新时，插件如何感知？
- 是否需要配置变更通知机制？

**依赖：**
等待 system-explorer agent 完成系统探索

---

### 问题-003: Worker 容器如何命名和管理？

**提出日期：** 2026-10-07  
**状态：** 🟡 待设计  
**提出人：** Claude

**问题描述：**
如何为每个账号的 Worker 容器命名？如何管理容器生命周期？

**可能方案：**

**方案 A：手动命名**
- 容器名：`ccgateway-worker-{account_id}`
- 例如：账号 123 → `ccgateway-worker-123`
- 管理：手动 docker run / docker-compose

**方案 B：自动管理**
- 提供管理脚本：`create-worker.sh 123`
- 自动生成 docker-compose 配置
- 自动启动容器

**方案 C：集成到核心**
- 账号创建时自动启动容器
- 账号删除时自动停止容器
- 需要核心访问 Docker API

**待设计：**
- 容器命名规则
- 生命周期管理方式
- 自动化程度
- 与 Kubernetes 的兼容性

---

### 问题-004: 如何处理 Worker 容器故障？

**提出日期：** 2026-10-07  
**状态：** 🟡 待设计  
**提出人：** Claude

**问题描述：**
Worker 容器崩溃或无响应时，如何处理？

**可能方案：**

**方案 A：插件层重试**
```go
resp, err := httpClient.Do(req)
if err != nil {
    // 重试 3 次
}
```
- 优点：简单
- 缺点：阻塞请求

**方案 B：核心层感知并切换**
- 插件返回错误 → 核心标记账号不可用
- 核心重新选择其他账号
- 后台任务定期检查恢复

**方案 C：自动重启容器**
- Docker restart policy: unless-stopped
- 容器崩溃自动重启
- 健康检查失败触发重启

**待设计：**
- 故障检测机制
- 切换策略
- 恢复流程
- 用户通知

---

## 未解决问题

### 问题-005: 插件如何与核心插件系统集成？

**提出日期：** 2026-10-07  
**状态：** 🔴 阻塞  
**优先级：** 高  
**阻塞原因：** 等待系统探索完成

**问题描述：**
需要了解：
- 插件 SDK 的完整接口
- 插件注册和启动流程
- Host Service 提供的能力
- 插件配置管理方式

**下一步：**
等待 system-explorer agent 完成探索报告

---

### 问题-006: 现有是否已有 CCGateway 插件？

**提出日期：** 2026-10-07  
**状态：** 🔴 阻塞  
**优先级：** 高  
**阻塞原因：** 等待系统探索完成

**问题描述：**
需要确认：
- `next/plugins/ccgateway/` 是否存在？
- 如果存在，当前实现方式是什么？
- 是否需要完全重写还是可以改造？

**下一步：**
等待 system-explorer agent 完成探索报告

---

### 问题-007: 账号配置的 config 字段结构是什么？

**提出日期：** 2026-10-07  
**状态：** 🔴 阻塞  
**优先级：** 高  
**阻塞原因：** 等待系统探索完成

**问题描述：**
需要确认：
- `accounts.config` JSONB 字段的典型结构
- 现有账号类型的 config 示例
- 是否有 schema 验证
- 如何设计 CCGateway 账号的 config

**期望的 config 结构：**
```json
{
  "worker_id": "123",
  "worker_url": "http://ccgateway-worker-123:8788",
  "worker_container": "ccgateway-worker-123",
  "cc_token": "sk-ant-api03-...",  // 或者不存？
  "concurrency": 4
}
```

**下一步：**
等待 system-explorer agent 完成探索报告

---

## 已解决问题

### ✅ 问题-000: 是否需要 Gateway Manager？

**解决日期：** 2026-10-07  
**决策：** 不需要  
**参考：** ADR-001

---

## 变更请求

暂无

---

## 遗留问题

暂无

---

## 会议记录

### 会议-001: 项目启动讨论

**日期：** 2026-10-07  
**参与者：** 用户, Claude  
**议题：** CCGateway 迁移架构设计

**关键决策：**
1. 不需要 Gateway Manager 层
2. 每个账号对应一个 Worker 容器
3. 插件直接路由到 Worker
4. 使用环境变量 + HTTP 回调，不用文件

**行动项：**
- [x] 启动系统探索 agent
- [ ] 完成架构设计文档
- [ ] 完成迁移计划

---

## 知识库

### 有用的参考资料

1. **sup2api-next 系统契约**
   - 位置：`next/docs/CONTRACTS.md`
   - 内容：模块划分、API 规范、权限体系

2. **现有插件参考**
   - Anthropic 插件：`next/plugins/anthropic/`
   - Guard 插件：`next/plugins/guard/`

3. **原始 CCGateway 实现**
   - 位置：`tools/ccgateway/`
   - 重点：runner.go, mod/hooks/register.js

4. **Claude Code 文档**
   - 官方：https://code.claude.com/docs/
   - 环境变量：https://code.claude.com/docs/en/env-vars

---

## 常见问题 (FAQ)

### Q1: 为什么不用 gRPC 让 CC 常驻？
**A:** Claude Code 不支持 gRPC 服务模式，只能通过 stdin/stdout 的 stream-json 协议。每次 exec 启动成本 ~350ms，占比 < 2%，可接受。

### Q2: 为什么每个账号一个容器？
**A:** 隔离授权、隔离历史、故障隔离、易于管理。虽然资源消耗较高，但对 LLM 网关来说可接受。

### Q3: 为什么不用共享存储？
**A:** 避免并发冲突、性能更好（本地 I/O）、架构更简单、故障隔离。续聊到不同 Worker 需要导入历史，但首次成本 ~100ms 可接受。

### Q4: 插件如何知道 Worker URL？
**A:** 通过 Host Service 查询账号配置，账号的 config 字段存储 worker_url。插件会缓存映射关系。

### Q5: Worker 容器如何启动？
**A:** 账号创建后，管理员手动或通过脚本启动对应的 Worker 容器，并完成 Claude 授权。（未来可能自动化）
