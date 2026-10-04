# 第一轮审计修复：合并进度跟踪

**开始时间**: 2026-10-04 20:10  
**最后更新**: 2026-10-04 20:58  
**当前阶段**: 阶段 1 执行中（等待子代理完成）

---

## 总体进度

```
阶段 1: 基础设施        [████████░░] 80% (执行中)
阶段 2: 核心修复        [██░░░░░░░░] 20% (准备中)
阶段 3: 新插件          [██░░░░░░░░] 20% (准备中)
```

**预计完成时间**: 5-7 小时  
**已用时间**: 0.5 小时

---

## 阶段 1：基础设施（3 项）

### 状态概览
- **开始时间**: 2026-10-04 20:05
- **负责子代理**: `merge-stage1` (acdadba75ac90476e)
- **当前状态**: 🔄 执行中

### 子任务进度

#### 1.1 fix-web（前端护栏）
- **状态**: 🔄 进行中
- **Worktree**: `agent-aed26b87d127f3317`
- **改动**: 13 个新增 + 8 个修改
- **进度**:
  - ✅ eslint.config.js（已创建）
  - ✅ .prettierrc.json（已创建）
  - ✅ .prettierignore（已创建）
  - ⏳ vitest.config.ts
  - ⏳ 5 个测试文件
  - ⏳ tailwind.config.js 修改
  - ⏳ package.json 修改

#### 1.2 fix-stability（核心稳定性）
- **状态**: ⏳ 等待中
- **Worktree**: `agent-abc888fa9a66eca86`
- **改动**: 14 个文件（grpcruntime 重构）
- **验证**: `go test -short ./internal/plugin/grpcruntime/`

#### 1.3 fix-plugins-sdk（插件 SDK 去重）
- **状态**: ⏳ 等待中
- **Worktree**: `agent-aed00b872ad55c605`
- **改动**: 30 个文件（新增 SDK + 7 个插件）
- **验证**: `cd next/plugins/openai && go build ./...`

---

## 阶段 2：核心修复（4 项）

### 状态概览
- **开始时间**: 未开始（等待阶段 1 完成）
- **准备子代理**: `prep-stage2` (ad314c49676eae511)
- **当前状态**: 📝 策略分析中

### 子任务规划

#### 2.1 fix-money-data（资金数据层）
- **状态**: 📝 分析中
- **Worktree**: `agent-ac67c88cd192a58c2`
- **改动**: 30 个文件
- **迁移**: `0028_performance_indexes.sql`
- **冲突**: 与 security-combined 在 `account/handlers.go`、`billing/ledger.go`

#### 2.2 fix-security-combined（安全修复合集）
- **状态**: 📝 分析中
- **Worktree**: `agent-a13f229afd3455127`
- **改动**: 25 个文件（包含 SSRF、权限、审计）
- **迁移**: `0027_security_hardening.sql`、`0027_token_version.sql`（⚠️ 编号冲突）
- **冲突**: 多处冲突需手工合并

#### 2.3 fix-gateway-shell-v3（外壳网关）
- **状态**: ⏳ 等待中
- **Worktree**: `agent-ad33353fd21f95096`
- **改动**: 10 个文件（独立仓库）
- **冲突**: 无

---

## 阶段 3：新插件（4 个插件）

### 状态概览
- **开始时间**: 未开始（等待阶段 1、2 完成）
- **准备子代理**: `prep-stage3` (aa17dbcf6e728908a)
- **当前状态**: 📝 完整性检查中

### 插件清单

#### 3.1 feat-oauth-accounts（4 个 OAuth 插件）
- **状态**: 📝 检查中
- **Worktree**: `agent-a0279196ac0dedc24`
- **插件**: claude-oauth、codex-oauth、gemini-oauth、openai-oauth
- **依赖**: 需要核心提供 `UpdateAccountCredentials` 接口

#### 3.2 feat-growth（邀请返利 + 签到）
- **状态**: 📝 检查中
- **Worktree**: `agent-ac2c78416f9cad92d`
- **插件**: growth
- **依赖**: 需要注册接口加 `referral_code` 参数

#### 3.3 feat-payment（充值支付）
- **状态**: 📝 检查中
- **Worktree**: `agent-ad4645dea546259b0`
- **插件**: payment
- **依赖**: 需要用户查询接口

#### 3.4 feat-ops-plugins（动态权重骨架）
- **状态**: 📝 检查中
- **Worktree**: `agent-a866de702c8127416`
- **插件**: dynamic-weight
- **注意**: ⚠️ 未完成，仅骨架

---

## 关键文件冲突矩阵

| 文件 | 改动者 | 冲突等级 | 处理策略 |
|------|--------|---------|---------|
| `account/handlers.go` | money-data + security | 🔴 高 | 分析中 |
| `billing/ledger.go` | money-data + security | 🟡 中 | 分析中 |
| `iam/users.go` | security（独占） | 🟢 低 | 直接应用 |
| `authz/roles.go` | security（独占） | 🟢 低 | 直接应用 |
| `CONTRACTS.md` | 所有 agent | 🟡 中 | 统一编号 |
| `go.work` | 新插件 | 🟢 低 | 合并去重 |

---

## 数据库迁移脚本编号

### 当前编号方案（有冲突）
- `0028` → performance_indexes.sql (money-data)
- `0027` → security_hardening.sql (security) ⚠️
- `0027` → token_version.sql (security) ⚠️

### 重新编号方案（待确定）
- `0028` → performance_indexes.sql
- `0029` → security_hardening.sql
- `0030` → token_version.sql

---

## 并行工作的子代理

### 当前活跃
1. **merge-stage1** (acdadba75ac90476e)
   - 任务：执行阶段 1 合并
   - 状态：🔄 运行中
   - 预计完成：15-30 分钟

2. **prep-stage2** (ad314c49676eae511)
   - 任务：分析阶段 2 冲突
   - 状态：🔄 运行中
   - 预计完成：20-30 分钟

3. **prep-stage3** (aa17dbcf6e728908a)
   - 任务：检查阶段 3 插件
   - 状态：🔄 运行中
   - 预计完成：15-20 分钟

---

## 验证检查清单

### 阶段 1 验证
- [ ] 前端：`cd next/web && npm run lint && npm test && npm run build`
- [ ] 后端：`cd next/server && go test -short ./internal/plugin/grpcruntime/`
- [ ] 插件：`cd next/plugins/openai && go build ./...`

### 阶段 2 验证
- [ ] 资金：`go test -short ./internal/billing ./internal/usage`
- [ ] 安全：`go test -short ./internal/iam ./internal/authz`
- [ ] 网关：`cd next/gateway && go build ./...`

### 阶段 3 验证
- [ ] OAuth：`cd next/plugins/claude-oauth && go test ./...`
- [ ] 增长：`cd next/plugins/growth && go test ./...`
- [ ] 支付：`cd next/plugins/payment && go build ./...`

---

## 风险点和注意事项

### 🔴 高风险
1. **account/handlers.go 三方冲突**：money-data 的批量查询 + security 的权限检查
2. **迁移脚本编号冲突**：两个 0027 需要重新编号
3. **security-combined 包含多个修复**：需要仔细验证是否遗漏

### 🟡 中风险
1. **fix-web 改动可能不完整**：只有 dist 改动，配置文件需要验证
2. **插件依赖核心接口**：部分接口可能尚未实现
3. **CONTRACTS.md 合并**：多个章节需要统一编号

### 🟢 低风险
1. **新插件目录独立**：直接复制即可
2. **gateway 独立仓库**：单独合并无冲突
3. **测试文件较完整**：大部分改动有测试覆盖

---

## 下一步行动

### 立即（等待子代理完成）
1. ⏳ 等待 `merge-stage1` 完成阶段 1 合并
2. ⏳ 等待 `prep-stage2` 完成冲突分析报告
3. ⏳ 等待 `prep-stage3` 完成插件检查报告

### 阶段 1 完成后
1. 验证编译和测试
2. 提交阶段 1 改动
3. 启动阶段 2 合并子代理

### 阶段 2 完成后
1. 手工解决冲突文件
2. 重新编号迁移脚本
3. 验证核心功能测试
4. 提交阶段 2 改动

### 阶段 3 完成后
1. 复制新插件目录
2. 更新 go.work 和 CONTRACTS.md
3. 验证插件编译
4. 提交阶段 3 改动

### 最终
1. 运行完整测试套件
2. 更新 MERGE-SUMMARY.md
3. 清理 worktree
4. 推送到远程

---

## 预计时间表

| 阶段 | 任务 | 预计时间 | 状态 |
|------|------|---------|------|
| 准备 | 映射 worktree | 0.5h | ✅ 完成 |
| 1 | 基础设施合并 | 1-2h | 🔄 进行中 |
| 2 | 核心修复合并 | 2-3h | 📝 准备中 |
| 3 | 新插件合并 | 1h | 📝 准备中 |
| 验证 | 完整测试 | 1h | ⏳ 未开始 |
| **总计** | | **5.5-7.5h** | |

---

**最后更新**: 2026-10-04 20:10 by 主控 session
