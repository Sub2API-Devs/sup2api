# CCGateway 迁移项目

> 将 CCGateway 从独立工具迁移为 sup2api-next 的标准插件
> 
> **状态：** 🟡 规划阶段进行中（Agent Team 自动化执行）  
> **开始时间：** 2026-10-07  
> **预计完成：** 2026-11-15 (6 周)

---

## 🎯 项目目标

将现有的 CCGateway (Claude Code Messages 网关) 迁移为 sup2api-next 生态系统中的标准插件，实现：

1. **统一账号管理** - 一个账号对应一个 Worker 容器
2. **标准插件接入** - 遵循 sup2api 插件 SDK 和生命周期
3. **精确路由** - 核心调度账号，插件路由到对应 Worker
4. **独立授权和历史** - 每个 Worker 独立的 Claude 授权和会话历史
5. **代码质量提升** - 重构而非搬运，遵守规范（抽象、复用、解耦、低嵌套、简洁）

---

## 🚀 快速开始

### 查看项目状态

```bash
# 查看 Agent Team 实时状态
cat next/docs/ccgateway-migration/AGENT-TEAM-STATUS.md

# 查看详细进度
cat next/docs/ccgateway-migration/08-PROGRESS-TRACKER.md

# 查看文档索引
cat next/docs/ccgateway-migration/00-INDEX.md
```

### 当前进度

**阶段 0：规划和设计（进行中）**

- ✅ 文档体系建立（10 个文档，3,350 行）
- ✅ 系统探索完成（system-explorer agent）
- 🟡 架构设计进行中（architect agent）
- 🟡 迁移计划待启动（migration-planner agent）
- 🟡 交接文档待启动（handoff-writer agent）

**预计：** 35 分钟内完成整个规划阶段

---

## 📚 核心架构

### 最终架构（目标）

```
┌────────────────────────────────────────────────────────┐
│  sup2api 核心                                           │
│  • 账号调度（分组/模型/负载/限流）                       │
│  • 选择账号 123                                         │
│  • 调用插件: Execute(account_id=123, body)             │
└────────────────┬───────────────────────────────────────┘
                 │
                 │ Plugin SDK (gRPC/HTTP)
                 ▼
┌────────────────────────────────────────────────────────┐
│  CCGateway 插件 (轻量路由)                              │
│  • account_id → worker_url 映射                        │
│  • HTTP 转发到对应 Worker                              │
└────────┬───────────────────────────────────────────────┘
         │
         │ HTTP (直接访问，无 Manager 层)
         │
    ┌────┼────┬────┬────┐
    │    │    │    │    │
    ▼    ▼    ▼    ▼    ▼
┌──────────────────────────────────────────────────────┐
│ ccgateway-worker-123   456   789   ...                │
│                                                        │
│ 每个 Worker = 完整的 CCGateway 实例：                  │
│  • 完整业务逻辑（历史匹配、exec claude、验证）         │
│  • 独立数据卷（授权、会话历史）                         │
│  • 独立 Claude Code 授权                               │
└──────────────────────────────────────────────────────┘
```

### 关键决策（ADR）

1. **ADR-001: 不需要 Gateway Manager 层**
   - 核心已有账号调度，插件直接路由
   
2. **ADR-002: 一账号一容器**
   - 隔离授权和历史，独立故障域
   
3. **ADR-003: 零文件通信**
   - 环境变量 + HTTP 回调，无临时文件
   
4. **ADR-004: 重构优先**
   - 代码重构而非搬运，遵守五大原则

---

## 📊 Agent Team 工作流

### 自动化规划流程

```
system-explorer (已完成)
     ↓
     ↓ 系统探索报告
     ↓
architect (运行中 5%)
     ↓
     ↓ 01-DISCOVERY.md + 02-ARCHITECTURE.md
     ↓
migration-planner (等待中 3%)
     ↓
     ↓ 03-MIGRATION-PLAN.md + 04-IMPLEMENTATION-GUIDE.md
     ↓
handoff-writer (等待中 2%)
     ↓
     ↓ 10-HANDOFF.md
     ↓
   完成 ✅
```

### 预期产出

**规划文档（5 个新增）：**
- `01-DISCOVERY.md` - 系统探索报告 (~800 行)
- `02-ARCHITECTURE.md` - 目标架构设计 (~1000 行)
- `03-MIGRATION-PLAN.md` - 迁移计划 (~700 行)
- `04-IMPLEMENTATION-GUIDE.md` - 实施指南 (~900 行)
- `10-HANDOFF.md` - 交接文档 (~900 行)

**总计：** 15 个文档，约 7,650 行，约 250 KB

---

## 🎯 项目里程碑

### 阶段 0：规划和设计 🟡 (当前)
**时间：** D+0 ~ D+7  
**目标：** 完整的技术方案和实施计划  
**状态：** 20% (Agent Team 自动执行中)

### 阶段 1：Worker 改造
**时间：** D+7 ~ D+14  
**目标：** Worker 代码重构，遵守规范

### 阶段 2：插件开发
**时间：** D+14 ~ D+21  
**目标：** 插件实现 account_id → worker_url 路由

### 阶段 3：核心集成
**时间：** D+21 ~ D+28  
**目标：** 账号类型、Host Service 集成

### 阶段 4：测试验证
**时间：** D+28 ~ D+35  
**目标：** 单元、集成、E2E 测试全通过

### 阶段 5：灰度部署
**时间：** D+35 ~ D+42  
**目标：** OVH 环境灰度验证

### 阶段 6：全量上线
**时间：** D+42 ~ D+45  
**目标：** 100% 流量切换

### 阶段 7：旧代码清理
**时间：** D+45 ~ D+60  
**目标：** 删除旧代码，完成交接

---

## 📋 交付清单

**52 项交付任务，8 个里程碑**

详见：[DELIVERABLES.md](./DELIVERABLES.md)

---

## 🧹 代码质量标准

### 五大原则

1. **抽象** - 定义清晰的接口
2. **复用** - 提取公共代码
3. **解耦** - 依赖注入
4. **低嵌套** - < 3 层
5. **简洁** - YAGNI

### 质量门禁

- 单元测试覆盖率 > 80%
- 圈复杂度 < 15
- 函数长度 < 50 行
- 嵌套深度 < 3 层
- 无 golangci-lint 警告

详见：[11-CODE-CLEANUP.md](./11-CODE-CLEANUP.md)

---

## 📖 文档导航

### 核心文档

- **[00-INDEX.md](./00-INDEX.md)** - 文档索引
- **[PROJECT-KICKOFF.md](./PROJECT-KICKOFF.md)** - 项目启动报告
- **[DELIVERABLES.md](./DELIVERABLES.md)** - 交付清单
- **[AGENT-TEAM-STATUS.md](./AGENT-TEAM-STATUS.md)** - Agent Team 实时状态

### 规划文档（Agent Team 产出）

- **[01-DISCOVERY.md](./01-DISCOVERY.md)** - 系统探索报告 🟡
- **[02-ARCHITECTURE.md](./02-ARCHITECTURE.md)** - 目标架构设计 🟡
- **[03-MIGRATION-PLAN.md](./03-MIGRATION-PLAN.md)** - 迁移计划 🟡
- **[04-IMPLEMENTATION-GUIDE.md](./04-IMPLEMENTATION-GUIDE.md)** - 实施指南 🟡

### 执行文档

- **[05-TESTING-STRATEGY.md](./05-TESTING-STRATEGY.md)** - 测试策略
- **[06-DEPLOYMENT-GUIDE.md](./06-DEPLOYMENT-GUIDE.md)** - 部署指南
- **[07-ROLLBACK-PLAN.md](./07-ROLLBACK-PLAN.md)** - 回滚预案
- **[08-PROGRESS-TRACKER.md](./08-PROGRESS-TRACKER.md)** - 进度跟踪
- **[09-ISSUES-AND-DECISIONS.md](./09-ISSUES-AND-DECISIONS.md)** - 问题和决策
- **[10-HANDOFF.md](./10-HANDOFF.md)** - 交接文档 🟡
- **[11-CODE-CLEANUP.md](./11-CODE-CLEANUP.md)** - 代码规范

---

## 👥 团队和角色

### Agent Team（自动化）

- **system-explorer** - 系统探索 ✅
- **architect** - 架构设计 🟡
- **migration-planner** - 迁移计划 🟡
- **handoff-writer** - 交接文档 🟡

### 人工角色（待分配）

- **架构师** - 审阅架构设计
- **后端开发** - Worker 改造、插件开发
- **测试工程师** - 测试用例编写和执行
- **运维工程师** - 部署和监控

---

## 📬 通知和沟通

### 自动通知

Agent Team 完成后会自动发送通知：
1. architect 完成（预计 10-15 分钟）
2. migration-planner 完成（预计 20-25 分钟）
3. handoff-writer 完成（预计 30-35 分钟）

### 人工沟通

- **日报** - 每日进度同步
- **周会** - 每周里程碑评审
- **问题升级** - 阻塞问题立即沟通

---

## 🔗 相关链接

- **sup2api-next 核心** - `next/`
- **现有 CCGateway** - `tools/ccgateway/`
- **插件 SDK** - `next/sdk/pluginsdk/`
- **示例插件** - `next/plugins/anthropic/`

---

## 📞 联系方式

- **项目负责人** - TBD
- **技术负责人** - TBD
- **紧急联系** - TBD

---

**最后更新：** 2026-10-07  
**文档版本：** 1.0  
**项目状态：** 🟡 规划阶段 (Agent Team 执行中)
