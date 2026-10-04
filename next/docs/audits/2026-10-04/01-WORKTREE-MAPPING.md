# Worktree 映射表

**生成时间**: 2026-10-04  
**用途**: 第一轮审计修复的 worktree 到修复项的映射

---

## 阶段 1：基础设施

### fix-stability（核心稳定性）
- **Worktree ID**: `abc888fa9a66eca86`
- **路径**: `.claude/worktrees/agent-abc888fa9a66eca86`
- **改动文件** (14 个):
  - `next/server/internal/plugin/grpcruntime/*.go`（runtime、instance、adapters、execute、monitor、poll、broadcast、tokenizer）
  - `next/server/internal/plugin/grpcruntime/*_test.go`（6 个测试文件）
  - `next/server/internal/store/db.go`
- **验证**: `cd next/server && go test -short ./internal/plugin/grpcruntime/ ./internal/store/`

### fix-plugins-sdk（插件 SDK 去重）
- **Worktree ID**: `aed00b872ad55c605`
- **路径**: `.claude/worktrees/agent-aed00b872ad55c605`
- **改动文件** (约 30 个):
  - 新增：`next/sdk/pluginsdk/{batch,classify,providers,textutil}/`
  - 修改：`next/plugins/{anthropic,ccgateway,gemini,guard,moderation,openai,relay,volcengine}/`
- **验证**: `cd next/plugins/openai && go build ./...`（所有插件）

### fix-web（前端护栏）
- **Worktree ID**: `aed26b87d127f3317`（仅 dist 改动）
- **路径**: `.claude/worktrees/agent-aed26b87d127f3317`
- **状态**: ⚠️ 主要改动（配置文件、测试）可能在主工作区或需要重新创建
- **已有文件**: `next/web/eslint.config.js`、`.prettierrc.json`、`.prettierignore`
- **验证**: `cd next/web && npm run lint && npm test && npm run build`

---

## 阶段 2：核心修复

### fix-money-data（资金数据层）
- **Worktree ID**: `ac67c88cd192a58c2`
- **路径**: `.claude/worktrees/agent-ac67c88cd192a58c2`
- **改动文件** (约 30 个):
  - `next/server/internal/{billing,usage,gateway,cluster,account,apikey}/*.go`
  - `next/server/internal/core/ports_*.go`
  - 新增：`next/server/migrations/0028_performance_indexes.sql`
- **验证**: `cd next/server && go test -short ./internal/billing ./internal/usage ./internal/gateway`

### fix-security-combined（安全修复合集）
- **Worktree ID**: `a13f229afd3455127`
- **路径**: `.claude/worktrees/agent-a13f229afd3455127`
- **改动文件** (约 25 个):
  - `next/server/internal/{iam,authz,account,billing,apikey}/*.go`
  - 可能包含：netguard、权限模型、审计日志
- **验证**: `cd next/server && go test -short ./internal/iam ./internal/authz`
- **注意**: ⚠️ 可能合并了 fix-security-ssrf、fix-security-permissions、fix-security-audit

### fix-gateway-shell-v3（外壳网关）
- **Worktree ID**: `ad33353fd21f95096`
- **路径**: `.claude/worktrees/agent-ad33353fd21f95096`
- **改动文件** (约 10 个):
  - `next/gateway/cmd/sub2api-gateway/main.go`
  - `next/gateway/internal/control/*.go`
  - `next/gateway/internal/pluginblob/*.go`
- **验证**: `cd next/gateway && go build ./...`

---

## 阶段 3：新插件

### feat-oauth-accounts（OAuth 插件）
- **Worktree ID**: `a0279196ac0dedc24`
- **路径**: `.claude/worktrees/agent-a0279196ac0dedc24`
- **新增目录**:
  - `next/plugins/claude-oauth/`
  - `next/plugins/codex-oauth/`
  - `next/plugins/gemini-oauth/`
  - `next/plugins/openai-oauth/`
- **验证**: `cd next/plugins/claude-oauth && go test -short ./...`

### feat-growth（邀请返利 + 签到）
- **Worktree ID**: `ac2c78416f9cad92d`
- **路径**: `.claude/worktrees/agent-ac2c78416f9cad92d`
- **新增目录**: `next/plugins/growth/`
- **验证**: `cd next/plugins/growth && go test -short ./...`

### feat-payment（充值支付）
- **Worktree ID**: `ad4645dea546259b0`
- **路径**: `.claude/worktrees/agent-ad4645dea546259b0`
- **新增目录**: `next/plugins/payment/`
- **验证**: `cd next/plugins/payment && go build ./...`

### feat-ops-plugins（动态权重骨架）
- **Worktree ID**: `a866de702c8127416`
- **路径**: `.claude/worktrees/agent-a866de702c8127416`
- **新增目录**: `next/plugins/dynamic-weight/`
- **验证**: 未完成，仅骨架

---

## 其他

### 未使用的 Worktree
- `a2aa64fb36667b68e`: 包含 `next/` 目录（可能是测试或临时）

---

## 使用方法

### 从 worktree 复制文件到主工作区
```bash
# 示例：复制 fix-stability 的改动
rsync -av --exclude='.git' .claude/worktrees/agent-abc888fa9a66eca86/next/server/internal/plugin/grpcruntime/ next/server/internal/plugin/grpcruntime/
rsync -av --exclude='.git' .claude/worktrees/agent-abc888fa9a66eca86/next/server/internal/store/db.go next/server/internal/store/
```

### 或使用 git 命令
```bash
# 查看 worktree 的改动
git -C .claude/worktrees/agent-abc888fa9a66eca86 diff > /tmp/fix-stability.patch
# 应用到主工作区
git apply /tmp/fix-stability.patch
```
