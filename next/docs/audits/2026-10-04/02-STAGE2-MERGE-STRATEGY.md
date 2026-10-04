# 阶段 2 合并策略：核心修复

**创建时间**: 2026-10-04 21:00  
**负责子代理**: prep-stage2  
**状态**: 📝 策略分析完成

---

## 执行摘要

阶段 2 包含 3 个 worktree 的核心修复，共约 65 个文件改动，涉及资金数据层、安全加固和外壳网关。**关键风险**：`account/handlers.go` 和 `apikey/apikey.go` 存在双向冲突，需要手工合并；两个迁移脚本编号冲突需要重新编号。

**建议合并顺序**：
1. fix-money-data（资金数据层，30 文件）
2. fix-security-combined（安全修复，25 文件，需手工合并冲突）
3. fix-gateway-shell-v3（外壳网关，10 文件，独立仓库）

---

## 1. fix-money-data（资金数据层）

### 基本信息
- **Worktree**: `.claude/worktrees/agent-ac67c88cd192a58c2`
- **改动文件**: 30 个
- **迁移脚本**: `0028_performance_indexes.sql`
- **关键改动**: 15 项修复（账本幂等性、输出费用预留、批量查询优化）

### 改动清单

#### 核心逻辑（13 个文件）
```
next/server/internal/
├── billing/
│   ├── balance.go          [修改] 自助账本查询改为独立实现
│   ├── billing.go          [修改] 新增 Quote 统一计价方法
│   ├── ledger.go           [修改] 幂等性核对 user_id/amount/kind
│   ├── precharge.go        [修改] 预留输出费用防透支
│   └── settings.go         [修改] 新增 OutputReserveTokens 配置
├── usage/
│   ├── settler.go          [修改] 使用 billing.Quote
│   ├── reconcile.go        [修改] 使用 billing.Quote
│   └── api.go              [修改] 改用 keyset 分页
├── gateway/
│   ├── precharge.go        [修改] 处理 EstimateUsage Unimplemented
│   └── precharge_test.go   [新增] 输出预留测试
├── cluster/
│   └── slots.go            [修改] 新增 InUseMany 批量查询
├── account/
│   ├── handlers.go         [修改] 批量查询 InUseMany ⚠️ 冲突
│   └── account_test.go     [修改] 测试更新
└── apikey/
    └── apikey.go           [修改] 事务内检查分组 ⚠️ 冲突
```

#### 接口层（2 个文件）
```
next/server/internal/core/
├── ports_billing.go        [修改] 新增 Quoter 接口
└── ports_cluster.go        [修改] InUseMany 方法签名
```

#### 工具和测试（10 个文件）
```
next/server/internal/
├── store/
│   ├── util.go             [新增] 事务帮助函数
│   └── util_test.go        [新增]
├── x/
│   ├── x.go                [新增] Itoa64 等工具
│   └── x_test.go           [新增]
├── billing/
│   └── *_test.go           [修改] 6 个测试文件
└── usage/
    └── *_test.go           [修改] 4 个测试文件
```

#### 迁移脚本
```
next/server/internal/migrations/
└── 0028_performance_indexes.sql  [新增] 3 个索引
    - idx_usage_logs_client_request_id (部分索引)
    - idx_api_keys_group_id (部分索引)
    - idx_audit_logs_action_id
```

### 与 security-combined 的冲突分析

#### 冲突 1: `account/handlers.go`

**money-data 改动**（226-238 行）：
```go
// 批量查询槽位优化（BE-P1-13）
if s.d.Slots != nil {
    inUse, err := s.d.Slots.InUseMany(ctx, "account", ids)
    if err != nil {
        slog.WarnContext(ctx, "account: read slots", "err", err)
    } else {
        for _, v := range out {
            v.InUse = inUse[v.ID]
        }
    }
}
```

**security-combined 改动**（631-670 行 + 790-806 行 + 949-957 行）：
```go
// 新增 checkOwnLevelRestrictions 方法（48 行）
func (s *Service) checkOwnLevelRestrictions(ctx context.Context, scope *int64, in *input, isRelay bool) error {
    // H3.1: 绑定分组权限检查
    // H3.2: 调度字段限制
    // H3.3: relay 类型权限检查
}

// create 方法调用权限检查
scope := core.OwnerScope(ctx, "account:create")
if err := s.checkOwnLevelRestrictions(ctx, scope, &in, len(bt.Type.GuardedSettings) == 0); err != nil {
    httpapi.Fail(c, err)
    return
}

// update 方法调用权限检查
if err := s.checkOwnLevelRestrictions(ctx, scope, &in, isUnguarded); err != nil {
    httpapi.Fail(c, err)
    return
}
```

**冲突性质**: 无直接冲突（改动不同区域）
**合并策略**: 
1. 先应用 money-data 的批量查询优化（views 方法）
2. 再应用 security-combined 的权限检查方法（新增方法 + create/update 调用）
3. 两者独立，可直接叠加

---

#### 冲突 2: `apikey/apikey.go`

**money-data 改动**（445-469 行）：
```go
// 将分组检查移入事务内（TOCTOU 修复）
err = s.db.Tx(ctx, func(tx pgx.Tx) error {
    ok, err := groupAvailable(ctx, tx, uid, in.GroupID)
    if err != nil {
        return err
    }
    if !ok {
        return groupUnavailable(ctx)
    }
    return tx.QueryRow(ctx, `INSERT INTO api_keys ...`).Scan(&id)
})
```

**security-combined 改动**（513-551 行）：
```go
// deleteAny 新增 CanActOn 检查（SEC-H1/H2）
var ownerID int64
err := s.db.Pool.QueryRow(ctx, `SELECT user_id FROM api_keys WHERE id = $1 ...`).Scan(&ownerID)
if actorID != ownerID {
    ownerPerms, err := s.authz.PermissionSet(ctx, ownerID)
    // ... CanActOn 检查
}
if err := s.softDelete(ctx, id, nil); err != nil { ... }
```

**冲突性质**: 无直接冲突（改动不同方法）
**合并策略**:
1. createMine 方法应用 money-data 的事务修复
2. deleteAny 方法应用 security-combined 的权限检查
3. 两者独立，可直接叠加

---

### 合并步骤

#### 步骤 1: 准备工作
```bash
# 切换到主分支
git checkout feat/next-platform

# 确认阶段 1 已完成并通过验证
git log -1 --oneline

# 创建阶段 2 工作分支（如果需要）
# git checkout -b stage2-money-data
```

#### 步骤 2: 应用 money-data 改动（无冲突文件）
```bash
cd .claude/worktrees/agent-ac67c88cd192a58c2

# 复制新文件
cp next/server/internal/store/util.go /d/projects/golang/sup2api/next/server/internal/store/
cp next/server/internal/store/util_test.go /d/projects/golang/sup2api/next/server/internal/store/
mkdir -p /d/projects/golang/sup2api/next/server/internal/x
cp next/server/internal/x/*.go /d/projects/golang/sup2api/next/server/internal/x/

# 复制迁移脚本
cp next/server/internal/migrations/0028_performance_indexes.sql /d/projects/golang/sup2api/next/server/internal/migrations/

# 应用独立改动文件
for f in billing/billing.go billing/ledger.go billing/precharge.go billing/settings.go \
         usage/settler.go usage/reconcile.go usage/api.go \
         cluster/slots.go \
         gateway/precharge.go \
         core/ports_billing.go core/ports_cluster.go \
         httpapi/respond.go; do
    cp next/server/internal/$f /d/projects/golang/sup2api/next/server/internal/$f
done
```

#### 步骤 3: 手工合并冲突文件

**文件 1: `account/handlers.go`**
```bash
# 基线：当前 feat/next-platform 版本
# 改动 1：money-data 的 InUseMany 批量查询（views 方法）
# 改动 2：security-combined 的 checkOwnLevelRestrictions（后续步骤处理）

# 先应用 money-data 版本
cp next/server/internal/account/handlers.go /d/projects/golang/sup2api/next/server/internal/account/
```

**文件 2: `apikey/apikey.go`**
```bash
# 改动 1：money-data 的事务内分组检查（createMine 方法）
# 改动 2：security-combined 的 CanActOn（deleteAny 方法，后续步骤处理）

# 先应用 money-data 版本
cp next/server/internal/apikey/apikey.go /d/projects/golang/sup2api/next/server/internal/apikey/
```

#### 步骤 4: 更新测试文件
```bash
# 复制所有测试文件
for f in billing/*_test.go usage/*_test.go gateway/*_test.go account/account_test.go; do
    cp next/server/internal/$f /d/projects/golang/sup2api/next/server/internal/$f
done
```

#### 步骤 5: 验证编译
```bash
cd /d/projects/golang/sup2api/next/server
go build ./internal/billing ./internal/usage ./internal/gateway ./internal/cluster ./internal/account ./internal/apikey
```

#### 步骤 6: 运行测试
```bash
go test -short ./internal/billing ./internal/usage ./internal/gateway/... ./internal/cluster ./internal/store ./internal/x
```

### CONTRACTS.md 改动
```diff
+### 25.8 并发透支防护：输出费用预留与插件 EstimateUsage Unimplemented 处理（2026-10-04）
+
+#### 问题
+并发请求场景下，多个用户请求可能同时通过余额检查...
+
+#### 解决方案：输出费用预留
+预扣时除了输入 token 费用，还预留输出 token 的费用...
```

---

## 2. fix-security-combined（安全修复合集）

### 基本信息
- **Worktree**: `.claude/worktrees/agent-a13f229afd3455127`
- **改动文件**: 25 个
- **迁移脚本**: `0027_security_hardening.sql`、`0027_token_version.sql`（⚠️ 编号冲突）
- **关键改动**: SSRF 防护、权限模型加固、审计日志、token 版本管理

### 改动清单

#### 安全核心（12 个文件）
```
next/server/internal/
├── netguard/                [目录重写]
│   ├── netguard.go         [修改] 完整 SSRF 防护
│   ├── dial.go             [新增] DialControl + NewClient
│   └── netguard_test.go    [新增]
├── proxy/
│   ├── proxy.go            [修改] 使用 netguard.NewClient
│   ├── resolve.go          [修改] 使用 CheckHost
│   ├── dialguard.go        [删除] 合并到 netguard
│   ├── guard_test.go       [重命名] 从 dialguard_test.go
│   └── parse_test.go       [修改]
├── iam/
│   ├── users.go            [修改] 权限检查 + token_version + 审计
│   ├── service.go          [修改]
│   └── auth.go             [修改] token_version 验证
├── authz/
│   ├── roles.go            [修改] SetRolePermissions 新增 actorID 参数
│   ├── http.go             [修改] 传递 actorID
│   ├── service.go          [修改] CanActOn/CanGrant 实现
│   ├── catalog.go          [修改]
│   ├── authz_test.go       [修改]
│   ├── helpers.go          [新增] 权限检查辅助函数
│   └── helpers_test.go     [新增]
└── account/
    ├── handlers.go         [修改] checkOwnLevelRestrictions ⚠️ 冲突（待合并）
    ├── models.go           [修改]
    └── testreq.go          [修改]
```

#### 插件沙箱（5 个文件）
```
next/server/internal/plugin/
├── sandbox/
│   ├── exec.go             [修改] Landlock 集成
│   ├── exec_linux.go       [修改]
│   ├── launcher.go         [修改]
│   └── landlock_linux.go   [新增] Landlock 封装
├── egress/
│   └── egress.go           [修改] 使用 netguard
└── install/
    └── consent.go          [修改]
```

#### 其他（3 个文件）
```
next/server/internal/
├── billing/
│   └── sync.go             [修改] 使用 netguard.NewClient ⚠️ 无冲突
├── apikey/
│   └── apikey.go           [修改] deleteAny 权限检查 ⚠️ 冲突（待合并）
└── core/
    └── ports_identity.go   [修改]
```

#### 迁移脚本（⚠️ 编号冲突）
```
next/server/internal/migrations/
├── 0027_security_hardening.sql  [新增] proxies.allow_private
└── 0027_token_version.sql       [新增] users.token_version
```

### 迁移脚本重新编号方案

**问题**: 两个脚本都使用 `0027` 编号，且当前主分支最新编号是 `0025`，money-data 已占用 `0028`。

**解决方案**: 将两个 security 脚本合并为一个，编号为 `0027`
```sql
-- 0027_security_hardening.sql（合并版）

-- SEC-M1: Token version for session invalidation
ALTER TABLE users ADD COLUMN token_version bigint NOT NULL DEFAULT 0;

-- SEC-SSRF: Private address flag for proxies
ALTER TABLE proxies ADD COLUMN allow_private boolean NOT NULL DEFAULT false;
UPDATE proxies SET allow_private = true;  -- 保持现有代理正常工作

COMMENT ON COLUMN users.token_version IS 'Incremented when password changes, user logs out all sessions, or is disabled. JWT validation compares token claim against this.';
COMMENT ON COLUMN proxies.allow_private IS 'When true, proxy may sit on private/loopback addresses (requires proxy:manage permission). Rows saved by own-level users are guarded at dial time.';
```

**文件操作**:
```bash
# 合并两个脚本
cat 0027_token_version.sql > 0027_security_hardening_combined.sql
echo "" >> 0027_security_hardening_combined.sql
cat 0027_security_hardening.sql >> 0027_security_hardening_combined.sql

# 重命名
mv 0027_security_hardening_combined.sql 0027_security_hardening.sql
```

### 与 money-data 的冲突合并

#### 合并文件 1: `account/handlers.go`

**当前状态**: money-data 版本已应用（InUseMany 批量查询）
**需要添加**: security-combined 的 checkOwnLevelRestrictions

```go
// 在 checkRefs 函数后添加（约 630 行）
// checkOwnLevelRestrictions enforces H3 restrictions for own-level users (SEC-H3).
func (s *Service) checkOwnLevelRestrictions(ctx context.Context, scope *int64, in *input, isRelay bool) error {
	if scope == nil {
		return nil // "all" level users have no restrictions
	}
	// H3.1: Binding to groups requires group:manage or account:group:bind
	if in.GroupIDs != nil && len(*in.GroupIDs) > 0 {
		if !s.can(ctx, "group:manage") && !s.can(ctx, "account:group:bind") {
			return core.ErrPermissionDenied.WithMessage(t(ctx,
				"binding accounts to groups requires group:manage or account:group:bind permission",
				"将账号绑定到分组需要 group:manage 或 account:group:bind 权限")).
				WithDetails(map[string]any{"required_permission": "group:manage or account:group:bind"})
		}
	}
	// H3.2: Scheduling fields restricted for own-level users
	if in.Priority != nil && (*in.Priority < 0 || *in.Priority > 100) {
		return core.InvalidFields(core.FieldError{Field: "priority", Code: "restricted",
			Message: t(ctx, "own-level users can only set priority between 0-100", "own 级用户只能设置 0-100 的优先级")})
	}
	if in.Weight != nil && (*in.Weight < 1 || *in.Weight > 100) {
		return core.InvalidFields(core.FieldError{Field: "weight", Code: "restricted",
			Message: t(ctx, "own-level users can only set weight between 1-100", "own 级用户只能设置 1-100 的权重")})
	}
	if in.MaxConcurrency != nil && (*in.MaxConcurrency < 1 || *in.MaxConcurrency > 1000) {
		return core.InvalidFields(core.FieldError{Field: "max_concurrency", Code: "restricted",
			Message: t(ctx, "own-level users can only set max_concurrency between 1-1000", "own 级用户只能设置 1-1000 的最大并发")})
	}
	// H3.3: Relay type accounts require account:relay permission
	if isRelay && !s.can(ctx, "account:relay") {
		return core.ErrPermissionDenied.WithMessage(t(ctx,
			"creating or managing relay accounts requires account:relay permission",
			"创建或管理中继账号需要 account:relay 权限")).
			WithDetails(map[string]any{"required_permission": "account:relay"})
	}
	return nil
}

// 在 create 方法中添加（约 792 行，checkRefs 调用后）
scope := core.OwnerScope(ctx, "account:create")
if err := s.checkOwnLevelRestrictions(ctx, scope, &in, len(bt.Type.GuardedSettings) == 0); err != nil {
	httpapi.Fail(c, err)
	return
}

// 在 update 方法中添加（约 951 行，scope 检查后）
bt, _ := s.accountType(cur.PluginKey, cur.Type)
isUnguarded := bt.Plugin.Key == "" || len(bt.Type.GuardedSettings) == 0
if err := s.checkOwnLevelRestrictions(ctx, scope, &in, isUnguarded); err != nil {
	httpapi.Fail(c, err)
	return
}
```

#### 合并文件 2: `apikey/apikey.go`

**当前状态**: money-data 版本已应用（createMine 事务修复）
**需要添加**: security-combined 的 deleteAny 权限检查

```go
// 替换 deleteAny 方法（约 513 行）
func (s *Service) deleteAny(c *gin.Context) {
	id, ok := httpapi.BindInt64(c, "id")
	if !ok {
		return
	}
	ctx := c.Request.Context()
	actorID, _ := core.UserID(ctx)

	// SEC-H1: fetch the API key owner to check CanActOn
	var ownerID int64
	err := s.db.Pool.QueryRow(ctx, `SELECT user_id FROM api_keys WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&ownerID)
	if store.IsNoRows(err) {
		httpapi.Fail(c, notFound(ctx))
		return
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}

	// SEC-H2: actor must be able to act on the owner
	if actorID != ownerID {
		ownerPerms, err := s.authz.PermissionSet(ctx, ownerID)
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		ownerKeys := make([]string, 0, len(ownerPerms.Keys))
		for k := range ownerPerms.Keys {
			ownerKeys = append(ownerKeys, k)
		}
		if err := s.authz.CanActOn(ctx, actorID, ownerKeys); err != nil {
			httpapi.Fail(c, err)
			return
		}
	}

	if err := s.softDelete(ctx, id, nil); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c)
}
```

### 合并步骤

#### 步骤 1: 应用独立文件（无冲突）
```bash
cd .claude/worktrees/agent-a13f229afd3455127

# 复制 netguard 完整目录
rm -rf /d/projects/golang/sup2api/next/server/internal/netguard
cp -r next/server/internal/netguard /d/projects/golang/sup2api/next/server/internal/

# 复制 authz 新文件和修改
cp next/server/internal/authz/helpers.go /d/projects/golang/sup2api/next/server/internal/authz/
cp next/server/internal/authz/helpers_test.go /d/projects/golang/sup2api/next/server/internal/authz/
cp next/server/internal/authz/{roles.go,http.go,service.go,catalog.go,authz_test.go} /d/projects/golang/sup2api/next/server/internal/authz/

# 复制 iam 改动
cp next/server/internal/iam/{users.go,service.go,auth.go} /d/projects/golang/sup2api/next/server/internal/iam/

# 复制 proxy 改动
cp next/server/internal/proxy/{proxy.go,resolve.go,guard_test.go,parse_test.go} /d/projects/golang/sup2api/next/server/internal/proxy/
rm -f /d/projects/golang/sup2api/next/server/internal/proxy/dialguard.go

# 复制 plugin 改动
cp next/server/internal/plugin/sandbox/{exec.go,exec_linux.go,launcher.go,landlock_linux.go} /d/projects/golang/sup2api/next/server/internal/plugin/sandbox/
cp next/server/internal/plugin/egress/egress.go /d/projects/golang/sup2api/next/server/internal/plugin/egress/
cp next/server/internal/plugin/install/consent.go /d/projects/golang/sup2api/next/server/internal/plugin/install/

# 复制其他改动
cp next/server/internal/account/{models.go,testreq.go} /d/projects/golang/sup2api/next/server/internal/account/
cp next/server/internal/billing/sync.go /d/projects/golang/sup2api/next/server/internal/billing/
cp next/server/internal/core/ports_identity.go /d/projects/golang/sup2api/next/server/internal/core/
```

#### 步骤 2: 合并迁移脚本
```bash
# 合并两个 0027 脚本为一个
cd /d/projects/golang/sup2api/next/server/internal/migrations

cat > 0027_security_hardening.sql << 'EOF'
-- Security hardening (CONTRACTS §43).

-- SEC-M1: Token version for session invalidation
-- Access tokens carry the user's token_version (claim "tv"); changing or
-- resetting the password, logging out of every session and disabling the
-- user increment it, which invalidates every access token issued before.
ALTER TABLE users ADD COLUMN token_version bigint NOT NULL DEFAULT 0;

-- SEC-SSRF: Private address flag for proxies
-- A proxy may sit on a private or loopback address only when someone with
-- the full proxy:manage permission saved it last. Rows saved under the
-- "own" key are dialled through the SSRF guard. Existing rows keep working.
ALTER TABLE proxies ADD COLUMN allow_private boolean NOT NULL DEFAULT false;
UPDATE proxies SET allow_private = true;
EOF
```

#### 步骤 3: 手工合并冲突文件
```bash
# account/handlers.go: 使用 Edit 工具添加 checkOwnLevelRestrictions 方法和调用点
# apikey/apikey.go: 使用 Edit 工具替换 deleteAny 方法
# （详见上述合并代码片段）
```

#### 步骤 4: 更新 CONTRACTS.md
```bash
# 应用 security-combined 对 CONTRACTS.md 的改动
# 注意：需要与 money-data 的 §25.8 合并，避免章节编号冲突
```

#### 步骤 5: 验证编译
```bash
cd /d/projects/golang/sup2api/next/server
go build ./internal/netguard ./internal/authz ./internal/iam ./internal/proxy ./internal/account ./internal/apikey ./internal/billing ./internal/plugin/...
```

#### 步骤 6: 运行测试
```bash
go test -short ./internal/netguard ./internal/authz ./internal/iam ./internal/proxy ./internal/account ./internal/apikey
```

### CONTRACTS.md 改动

需要合并的章节：
- §4.1：权限系统新增 `user:password:reset`、`account:group:bind`、`account:relay`
- §5.2：用户管理接口权限加固
- §21.3.1：own 级用户账号创建限制（新增）
- §43：安全加固（新增，包含 token_version 和 proxy allow_private）

---

## 3. fix-gateway-shell-v3（外壳网关）

### 基本信息
- **Worktree**: `.claude/worktrees/agent-ad33353fd21f95096`
- **仓库**: `next/gateway`（独立仓库）
- **改动文件**: 9 个
- **冲突**: 无（独立仓库）

### 改动清单
```
next/gateway/
├── cmd/sub2api-gateway/
│   └── main.go                 [修改]
├── internal/control/
│   ├── engine.go               [修改] LocalReady + recordBlockedReason
│   ├── pluginblobs.go          [修改]
│   ├── schema.sql              [修改] upgrades.blocked_reason 列
│   └── store.go                [修改]
├── internal/localapi/
│   └── client.go               [修改]
├── internal/pluginblob/
│   └── pluginblob.go           [修改]
├── internal/proxy/
│   └── router.go               [修改]
└── internal/release/
    └── manager.go              [修改]
```

### 关键改动
1. **LocalReady 机制**: 路由器快速检查节点就绪状态（atomic bool）
2. **blocked_reason 记录**: 升级等待原因写入数据库（限频：每分钟一次）
3. **节点目录刷新**: 心跳时更新 nodeDirectory 快照

### 合并步骤

#### 步骤 1: 切换到 gateway 目录
```bash
cd /d/projects/golang/sup2api/next/gateway
```

#### 步骤 2: 应用所有改动
```bash
cd /d/projects/golang/sup2api/.claude/worktrees/agent-ad33353fd21f95096/next/gateway

# 复制所有改动文件
for f in cmd/sub2api-gateway/main.go \
         internal/control/{engine.go,pluginblobs.go,schema.sql,store.go} \
         internal/localapi/client.go \
         internal/pluginblob/pluginblob.go \
         internal/proxy/router.go \
         internal/release/manager.go; do
    cp $f /d/projects/golang/sup2api/next/gateway/$f
done
```

#### 步骤 3: 验证编译
```bash
cd /d/projects/golang/sup2api/next/gateway
go build ./...
```

#### 步骤 4: 运行测试
```bash
go test ./internal/control ./internal/proxy
```

---

## 合并执行计划

### 总体顺序
```
1. fix-money-data      [先执行，建立数据层基础]
   ↓
2. fix-security-combined [手工合并冲突]
   ↓
3. fix-gateway-shell-v3  [独立仓库，无冲突]
```

### 详细时间表

| 步骤 | 任务 | 预计时间 | 负责 |
|------|------|---------|------|
| 2.1 | 应用 money-data（无冲突文件） | 15 分钟 | 自动化 |
| 2.2 | 验证 money-data 编译和测试 | 10 分钟 | 自动化 |
| 2.3 | 应用 security（无冲突文件） | 20 分钟 | 自动化 |
| 2.4 | 合并迁移脚本（0027） | 5 分钟 | 手工 |
| 2.5 | 手工合并 account/handlers.go | 15 分钟 | 手工 |
| 2.6 | 手工合并 apikey/apikey.go | 10 分钟 | 手工 |
| 2.7 | 合并 CONTRACTS.md | 15 分钟 | 手工 |
| 2.8 | 验证 security 编译和测试 | 15 分钟 | 自动化 |
| 2.9 | 应用 gateway-shell-v3 | 10 分钟 | 自动化 |
| 2.10 | 验证 gateway 编译和测试 | 10 分钟 | 自动化 |
| **总计** | | **2-2.5 小时** | |

---

## 验证检查清单

### 编译验证
- [ ] `go build ./internal/billing ./internal/usage`
- [ ] `go build ./internal/gateway/...`
- [ ] `go build ./internal/cluster ./internal/account ./internal/apikey`
- [ ] `go build ./internal/netguard ./internal/authz ./internal/iam ./internal/proxy`
- [ ] `go build ./internal/plugin/...`
- [ ] `cd next/gateway && go build ./...`

### 测试验证
- [ ] `go test -short ./internal/billing ./internal/usage`
- [ ] `go test -short ./internal/gateway/...`
- [ ] `go test -short ./internal/cluster ./internal/store ./internal/x`
- [ ] `go test -short ./internal/netguard ./internal/authz ./internal/iam`
- [ ] `go test -short ./internal/proxy ./internal/account ./internal/apikey`
- [ ] `cd next/gateway && go test ./internal/control ./internal/proxy`

### 功能验证
- [ ] 启动服务器，检查日志无错误
- [ ] 测试账本幂等性（重复提交相同 idempotency_key）
- [ ] 测试输出费用预留（提交未指定 max_tokens 的请求）
- [ ] 测试权限检查（own 级用户创建账号并绑定分组）
- [ ] 测试 token_version（修改密码后旧 token 失效）
- [ ] 测试 SSRF 防护（代理 URL 检查）
- [ ] 测试网关 LocalReady（节点状态快速检查）

### 迁移验证
- [ ] 检查迁移脚本编号连续性（0025 → 0026 → 0027 → 0028）
- [ ] 在测试环境应用迁移脚本
- [ ] 确认索引创建成功（CONCURRENTLY 不阻塞）

---

## 风险点和注意事项

### 🔴 高风险
1. **account/handlers.go 手工合并**
   - 两处改动（InUseMany + checkOwnLevelRestrictions）必须正确组合
   - 建议先应用 money-data，再用 Edit 工具添加 security 部分
   - 合并后必须运行 `go test ./internal/account`

2. **迁移脚本合并**
   - 两个 0027 脚本必须合并为一个，且保留两者的所有 ALTER 语句
   - `users.token_version` 默认值必须是 0（不能是 NULL）
   - `proxies.allow_private` 必须 UPDATE 现有行为 true（向后兼容）

3. **billing.sync.go 改动冲突**
   - money-data 未改动此文件
   - security-combined 改为使用 `netguard.NewClient`
   - 直接应用 security 版本即可，但需确认 netguard 包已复制

### 🟡 中风险
1. **CONTRACTS.md 章节编号**
   - §25.8（money-data）和 §43（security）需要统一编号
   - 建议保持两者独立，不合并章节

2. **authz.SetRolePermissions 签名变更**
   - 新增 `actorID` 参数会影响所有调用点
   - 已确认只有 `authz/http.go` 和测试文件调用，改动已包含

3. **InUseMany 批量查询**
   - 新方法可能影响 Redis pipeline 性能
   - 需要在生产环境监控 Redis 延迟

### 🟢 低风险
1. **gateway 独立仓库**
   - 无依赖冲突，直接应用即可

2. **新增文件**
   - `netguard/dial.go`、`authz/helpers.go`、`x/x.go` 等新文件无冲突

3. **测试覆盖**
   - 所有关键改动都有对应测试文件
   - 验证时运行测试即可发现问题

---

## 回滚策略

### 如果合并失败
1. **阶段 2.1（money-data）失败**
   ```bash
   git reset --hard HEAD
   # 重新从阶段 1 完成状态开始
   ```

2. **阶段 2.2（security）手工合并失败**
   ```bash
   # 保留 money-data 改动，回滚 security 改动
   git checkout HEAD -- next/server/internal/account/handlers.go
   git checkout HEAD -- next/server/internal/apikey/apikey.go
   # 重新执行手工合并
   ```

3. **阶段 2.3（gateway）失败**
   ```bash
   cd next/gateway
   git reset --hard HEAD
   # gateway 独立，不影响 server
   ```

### 分步提交建议
```bash
# 提交 1: money-data（无冲突部分）
git add next/server/internal/{billing,usage,gateway,cluster,store,x,core,httpapi}
git add next/server/internal/migrations/0028_performance_indexes.sql
git commit -m "fix(money): ledger idempotency, output reserve, batch queries (BE-P1-13, BE-C1-4)"

# 提交 2: security（无冲突部分）
git add next/server/internal/{netguard,authz,iam,proxy,plugin}
git add next/server/internal/migrations/0027_security_hardening.sql
git commit -m "fix(security): SSRF guard, permission model, token version (SEC-H1, SEC-H2, SEC-M1, SEC-SSRF)"

# 提交 3: 冲突文件手工合并
git add next/server/internal/account/handlers.go
git add next/server/internal/apikey/apikey.go
git add next/server/internal/billing/sync.go
git commit -m "fix: merge money-data and security-combined conflicts"

# 提交 4: CONTRACTS 更新
git add next/docs/CONTRACTS.md
git commit -m "docs: update CONTRACTS for §25.8 and §43"

# 提交 5: gateway
cd next/gateway
git add .
git commit -m "fix(gateway): LocalReady atomic check and blocked_reason recording"
```

---

## 下一步行动

### 等待阶段 1 完成
- ⏳ 等待 `merge-stage1` 子代理完成基础设施合并
- ⏳ 确认阶段 1 编译和测试通过

### 阶段 2 执行
1. 创建新的合并子代理执行自动化部分
2. 主控 session 负责手工合并冲突文件
3. 逐项验证编译和测试

### 完成后
- 更新 `MERGE-PROGRESS.md` 标记阶段 2 完成
- 通知阶段 3 准备开始
- 记录实际执行时间和遇到的问题

---

**文档创建**: 2026-10-04 21:00  
**最后更新**: 2026-10-04 21:00  
**创建者**: prep-stage2 子代理
