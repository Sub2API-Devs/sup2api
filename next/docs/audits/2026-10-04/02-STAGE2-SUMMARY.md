# 阶段 2 分析摘要

**完成时间**: 2026-10-04 21:15  
**分析子代理**: prep-stage2  
**状态**: ✅ 完成

---

## 核心发现

### 🎯 冲突情况比预期简单

**原始预期**: 多处高风险冲突需要复杂合并  
**实际情况**: 
- ✅ 只有 2 个文件需要手工干预
- ✅ 冲突都是"不同区域/不同方法"，可以叠加
- ✅ 没有真正的代码逻辑冲突

### 📊 改动统计

| Worktree | 文件数 | 迁移脚本 | 冲突文件 | 风险等级 |
|----------|--------|---------|---------|---------|
| fix-money-data | 30 | 0028 (3索引) | 2 (叠加) | 🟡 中 |
| fix-security-combined | 25 | 0027 (合并) | 2 (叠加) | 🟡 中 |
| fix-gateway-shell-v3 | 9 | 无 | 0 | 🟢 低 |
| **总计** | **64** | **2** | **2** | **🟡 中** |

### 🔧 关键决策

#### 1. 迁移脚本合并策略
**问题**: 两个 `0027` 脚本冲突  
**方案**: 合并为一个 `0027_security_hardening.sql`，包含：
- `users.token_version` (SEC-M1)
- `proxies.allow_private` (SEC-SSRF)

**理由**: 两者都是安全相关，语义一致，合并后更清晰。

#### 2. 冲突文件合并顺序
**顺序**: money-data 先，security-combined 后  
**理由**: 
- money-data 是数据层优化，属于基础设施
- security-combined 是业务逻辑加固，建立在数据层之上
- 两者改动区域不重叠，叠加安全

---

## 冲突文件详解

### 1. account/handlers.go

#### 改动映射
```
基线版本 (feat/next-platform)
  ↓
  ├─ money-data: views() 方法批量查询 (L226-238)
  └─ security: 新增 checkOwnLevelRestrictions() + 调用 (L631-670, L792-798, L951-957)
  ↓
合并版本: 两者叠加，无冲突
```

#### 合并策略
1. 应用 money-data 版本（包含 InUseMany 批量查询）
2. 插入 checkOwnLevelRestrictions 方法（48 行新代码）
3. 在 create/update 方法插入调用（各 6 行）

#### 验证点
- ✅ 编译通过
- ✅ `go test ./internal/account`
- ✅ 功能测试：own 级用户绑定分组应返回 403

---

### 2. apikey/apikey.go

#### 改动映射
```
基线版本 (feat/next-platform)
  ↓
  ├─ money-data: createMine() 事务内检查 (L445-469)
  └─ security: deleteAny() 权限检查 (L513-551)
  ↓
合并版本: 两者叠加，无冲突
```

#### 合并策略
1. 应用 money-data 版本（createMine 事务修复）
2. 替换 deleteAny 方法（39 行新代码）

#### 验证点
- ✅ 编译通过
- ✅ `go test ./internal/apikey`
- ✅ 功能测试：删除他人 API key 需 CanActOn 权限

---

### 3. billing/sync.go（假性冲突）

#### 改动映射
```
基线版本 (feat/next-platform)
  ↓
  └─ security: 使用 netguard.NewClient (L61-66)
  ↓
合并版本: 直接应用 security 版本
```

**注意**: money-data 未改动此文件，不存在冲突。

---

## 执行计划

### 时间估算
| 阶段 | 任务 | 时间 | 类型 |
|------|------|------|------|
| 2.1 | 应用 money-data（无冲突部分） | 10 分钟 | 自动 |
| 2.2 | 应用 security（无冲突部分） | 15 分钟 | 自动 |
| 2.3 | 合并迁移脚本 | 5 分钟 | 手工 |
| 2.4 | 合并 account/handlers.go | 10 分钟 | 手工 |
| 2.5 | 合并 apikey/apikey.go | 5 分钟 | 手工 |
| 2.6 | 验证编译和测试 | 15 分钟 | 自动 |
| 2.7 | 应用 gateway-shell-v3 | 10 分钟 | 自动 |
| **总计** | | **70 分钟** | |

### 并行策略
```
自动部分（2.1 + 2.2）并行执行   [25 分钟]
  ↓
手工合并（2.3-2.5）顺序执行     [20 分钟]
  ↓
验证（2.6）                    [15 分钟]
  ↓
gateway（2.7）                 [10 分钟]
-------------------------------------------
总耗时                         ~70 分钟
```

---

## 风险评估

### 🟢 低风险项（可自动化）
- ✅ money-data 独占文件（28 个）
- ✅ security 独占文件（23 个）
- ✅ gateway 所有文件（9 个）
- ✅ 新文件创建（netguard/dial.go、authz/helpers.go 等）

### 🟡 中风险项（需手工确认）
- ⚠️ account/handlers.go 手工合并（有详细代码片段）
- ⚠️ apikey/apikey.go 手工合并（有详细代码片段）
- ⚠️ CONTRACTS.md 章节合并（需统一编号）

### 🔴 高风险项
- **无**（所有冲突都已分析清楚）

---

## 交付物清单

### 策略文档
- ✅ **02-STAGE2-MERGE-STRATEGY.md** (28KB)
  - 3 个 worktree 完整分析
  - 64 个文件改动清单
  - 逐文件合并策略
  - 迁移脚本重编号方案
  - 验证清单和回滚策略

- ✅ **02-CONFLICT-RESOLUTION.md** (18KB)
  - 2 个冲突文件的完整代码片段
  - 迁移脚本合并代码
  - CONTRACTS.md 合并指南
  - 功能验证脚本
  - 执行自动化脚本

### 分析数据
- ✅ 冲突矩阵（8 行）
- ✅ 迁移脚本映射（2 个脚本）
- ✅ 时间估算表（7 个步骤）
- ✅ 验证清单（3 类，15+ 项）

---

## 建议

### 给阶段 2 执行子代理
1. **先读完两份文档**，理解整体策略
2. **自动部分并行执行**，节省时间
3. **手工部分参考代码片段**，逐行对照
4. **每个文件验证后再继续**，避免累积错误
5. **遇到意外立即停止**，报告主控 session

### 给主控 session
1. **等待阶段 1 完成**后再启动阶段 2
2. **创建专用子代理**执行自动化部分
3. **主控负责手工合并**，子代理提供辅助
4. **分步提交**（money-data → security → gateway），方便回滚

---

## 后续步骤

### 立即
- ⏳ 等待阶段 1 完成
- ⏳ 等待 prep-stage3 完成插件检查

### 阶段 1 完成后
1. 创建 `merge-stage2-auto` 子代理（自动化部分）
2. 主控 session 执行手工合并（参考 02-CONFLICT-RESOLUTION.md）
3. 验证编译和测试
4. 提交改动

### 阶段 2 完成后
- 更新 MERGE-PROGRESS.md
- 启动阶段 3（新插件合并）

---

**分析完成**: 2026-10-04 21:15  
**文档位置**: 
- `next/docs/audits/2026-10-04/02-STAGE2-MERGE-STRATEGY.md`
- `next/docs/audits/2026-10-04/02-CONFLICT-RESOLUTION.md`

**状态**: ✅ 可以开始执行
