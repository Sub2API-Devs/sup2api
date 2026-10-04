# 阶段 2 冲突文件解决方案

**创建时间**: 2026-10-04  
**用途**: 手工合并冲突文件的参考代码

---

## 冲突文件清单

| 文件 | 改动者 | 冲突类型 | 解决难度 |
|------|--------|---------|---------|
| `account/handlers.go` | money-data + security | 不同区域 | ⭐⭐ 中等 |
| `apikey/apikey.go` | money-data + security | 不同方法 | ⭐ 简单 |
| `billing/sync.go` | security（独占） | 无冲突 | ⭐ 简单 |

---

## 1. account/handlers.go

### 冲突分析

**money-data 改动**: 第 226-238 行，`views` 方法中的批量查询优化
**security-combined 改动**: 
- 第 631-670 行：新增 `checkOwnLevelRestrictions` 方法
- 第 792-798 行：`create` 方法调用权限检查
- 第 951-957 行：`update` 方法调用权限检查

**冲突性质**: 无直接冲突，改动在不同区域，可以叠加。

### 合并步骤

#### 步骤 1: 应用 money-data 版本作为基线
```bash
cp .claude/worktrees/agent-ac67c88cd192a58c2/next/server/internal/account/handlers.go \
   next/server/internal/account/handlers.go
```

#### 步骤 2: 添加 checkOwnLevelRestrictions 方法

在 `checkRefs` 函数之后（约 628 行）插入：

```go
// checkOwnLevelRestrictions enforces H3 restrictions for own-level users (SEC-H3).
// When the caller has only the "own" permission level (scope != nil):
// - Binding to groups requires group:manage or account:group:bind
// - Scheduling fields (priority, weight, schedulable) are restricted
// - Relay type accounts require account:relay permission
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
	// Own-level users can only set schedulable and reasonable priority/weight/max_concurrency
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
```

#### 步骤 3: 在 create 方法中添加权限检查

在 `checkRefs` 调用之后（约 790 行），`status, sched, prio, maxc, weight := ...` 之前插入：

```go
	// H3: own-level restrictions for groups, scheduling fields, and relay accounts
	scope := core.OwnerScope(ctx, "account:create")
	if err := s.checkOwnLevelRestrictions(ctx, scope, &in, len(bt.Type.GuardedSettings) == 0); err != nil {
		httpapi.Fail(c, err)
		return
	}
```

#### 步骤 4: 在 update 方法中添加权限检查

在 scope 检查之后（约 949 行），`statusChanged := ...` 之前插入：

```go
	// H3: own-level restrictions for groups, scheduling fields, and relay accounts
	bt, _ := s.accountType(cur.PluginKey, cur.Type)
	isUnguarded := bt.Plugin.Key == "" || len(bt.Type.GuardedSettings) == 0
	if err := s.checkOwnLevelRestrictions(ctx, scope, &in, isUnguarded); err != nil {
		httpapi.Fail(c, err)
		return
	}
```

### 验证
```bash
cd next/server
go build ./internal/account
go test -short ./internal/account
```

---

## 2. apikey/apikey.go

### 冲突分析

**money-data 改动**: 第 445-469 行，`createMine` 方法将分组检查移入事务
**security-combined 改动**: 第 513-551 行，`deleteAny` 方法新增权限检查

**冲突性质**: 无直接冲突，改动在不同方法。

### 合并步骤

#### 步骤 1: 应用 money-data 版本作为基线
```bash
cp .claude/worktrees/agent-ac67c88cd192a58c2/next/server/internal/apikey/apikey.go \
   next/server/internal/apikey/apikey.go
```

#### 步骤 2: 替换 deleteAny 方法

找到 `deleteAny` 方法（约 513 行），整个方法替换为：

```go
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

### 验证
```bash
cd next/server
go build ./internal/apikey
go test -short ./internal/apikey
```

---

## 3. billing/sync.go

### 冲突分析

**money-data 改动**: 无
**security-combined 改动**: 第 61-66 行，使用 `netguard.NewClient` 替代 `http.Client`

**冲突性质**: 无冲突，security 独占。

### 合并步骤

#### 步骤 1: 直接应用 security-combined 版本
```bash
cp .claude/worktrees/agent-a13f229afd3455127/next/server/internal/billing/sync.go \
   next/server/internal/billing/sync.go
```

#### 步骤 2: 确认 netguard 包已复制
```bash
ls -la next/server/internal/netguard/
# 应该包含: netguard.go, dial.go, netguard_test.go
```

### 验证
```bash
cd next/server
go build ./internal/billing
go test -short ./internal/billing
```

---

## 迁移脚本合并

### 问题
两个脚本都使用 `0027` 编号：
- `0027_security_hardening.sql`（proxies.allow_private）
- `0027_token_version.sql`（users.token_version）

### 解决方案：合并为一个脚本

#### 创建合并后的 0027_security_hardening.sql

```bash
cd next/server/internal/migrations

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

#### 验证迁移编号连续性
```bash
ls -1 next/server/internal/migrations/*.sql | tail -5
# 应该显示:
# 0024_plugin_history.sql
# 0025_request_precharges.sql
# 0027_security_hardening.sql      <- 新合并的
# 0028_performance_indexes.sql     <- money-data
```

---

## CONTRACTS.md 合并

### 需要合并的章节

#### 1. §4.1 权限清单（security-combined）

在 `account` 行添加新权限：
```markdown
| account | ... `account:settings:custom`（§21） `account:group:bind` `account:relay` |
```

在 `user` 行添加新权限：
```markdown
| user | `user:read` `user:create` `user:update` `user:delete`🔐 `user:password:reset`🔐 |
```

#### 2. §5.2 用户管理接口（security-combined）

替换以下行：
```markdown
| POST `/users` ... | `user:create`；授予的 role_keys 必须是操作者持有权限的子集；指定非默认角色另需 `role:manage` + step-up |
| GET/PATCH `/users/:id` | `user:read` / `user:update`；更新他人时目标用户权限集不得超出操作者；修改他人密码需 `user:password:reset`🔐；修改影响认证的字段（密码、status、禁用）会递增 `token_version` 使旧 token 失效 |
| DELETE `/users/:id` | `user:delete`；目标用户权限集不得超出操作者 |
| PUT `/roles/:id/permissions` ... | `role:manage`；授予的 permission_keys 必须是操作者持有权限的子集 |
```

#### 3. §21.3.1 own 级用户限制（security-combined，新增）

在 §21.3 后添加：
```markdown
### 21.3.1 own 级用户的账号创建限制

own 级用户（只有 `account:own:create` / `account:own:update`，无全部级 key）在创建和修改账号时受以下限制：

1. **分组绑定**：绑定账号到分组（`group_ids` 非空）需要 `group:manage` 或 `account:group:bind` 权限...
2. **调度字段限制**：...
3. **不受限账号类型**：...
```

#### 4. §25.8 输出费用预留（money-data，新增）

在 §25.7 后添加：
```markdown
### 25.8 并发透支防护：输出费用预留与插件 EstimateUsage Unimplemented 处理（2026-10-04）

#### 问题
并发请求场景下，多个用户请求可能同时通过余额检查...

#### 解决方案：输出费用预留
预扣时除了输入 token 费用，还预留输出 token 的费用...
```

#### 5. §43 安全加固（security-combined，新增）

在文档末尾添加：
```markdown
## 43. 安全加固（2026-10-04）

### 43.1 Token 版本管理（SEC-M1）

`users.token_version` 列（bigint，默认 0）：用户修改密码、注销所有会话或被禁用时递增...

### 43.2 代理私有地址标记（SEC-SSRF）

`proxies.allow_private` 列（boolean，默认 false）：...

### 43.3 SSRF 防护统一入口（SEC-SSRF）

`netguard` 包提供统一的地址检查...
```

### 合并建议

使用 Edit 工具分段合并，每次合并一个章节，避免一次性改动过大。

---

## 完整执行脚本

```bash
#!/bin/bash
# 阶段 2 冲突解决自动化脚本（需要手工确认关键步骤）

set -e

echo "=== 阶段 2.1: 应用 money-data 基线 ==="
cd /d/projects/golang/sup2api

# 复制 money-data 冲突文件
cp .claude/worktrees/agent-ac67c88cd192a58c2/next/server/internal/account/handlers.go \
   next/server/internal/account/handlers.go
cp .claude/worktrees/agent-ac67c88cd192a58c2/next/server/internal/apikey/apikey.go \
   next/server/internal/apikey/apikey.go

echo "✅ money-data 基线已应用"
echo "⚠️  下一步：使用 Edit 工具手工添加 security-combined 改动"
echo ""
echo "需要编辑的文件："
echo "  1. next/server/internal/account/handlers.go"
echo "     - 添加 checkOwnLevelRestrictions 方法"
echo "     - 在 create/update 方法中调用"
echo "  2. next/server/internal/apikey/apikey.go"
echo "     - 替换 deleteAny 方法"
echo ""
echo "参考文档: next/docs/audits/2026-10-04/02-CONFLICT-RESOLUTION.md"
```

---

## 验证清单

### 编译验证
```bash
cd next/server

# 验证冲突文件编译
go build ./internal/account
go build ./internal/apikey
go build ./internal/billing

# 验证全部编译
go build ./...
```

### 测试验证
```bash
# 运行受影响模块的测试
go test -short ./internal/account
go test -short ./internal/apikey
go test -short ./internal/billing
go test -short ./internal/authz
go test -short ./internal/iam
```

### 功能验证

#### 1. 账本幂等性（money-data）
```bash
# 使用相同 idempotency_key 重复提交应返回原记录
curl -X POST http://localhost:3130/admin/balance/adjust \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "user_id": 1,
    "amount": "10.0",
    "credit": true,
    "idempotency_key": "test-idem-001"
  }'

# 第二次提交相同 key 但不同金额应返回 409 Conflict
```

#### 2. 输出费用预留（money-data）
```bash
# 未指定 max_tokens 的请求应预留默认 4000 tokens 的输出费用
# 检查日志中的预扣金额
```

#### 3. own 级用户限制（security-combined）
```bash
# own 级用户绑定分组应返回 403（无 account:group:bind 权限）
curl -X POST http://localhost:3130/accounts \
  -H "Authorization: Bearer $OWN_USER_TOKEN" \
  -d '{
    "plugin_key": "openai",
    "type": "key",
    "group_ids": [1]
  }'

# 应返回: 403 permission_denied
```

#### 4. Token 版本管理（security-combined）
```bash
# 修改密码后，旧 token 应失效
# 1. 登录获取 token
TOKEN=$(curl -X POST http://localhost:3130/login -d '{"email":"test@example.com","password":"old"}' | jq -r .token)

# 2. 修改密码
curl -X PATCH http://localhost:3130/users/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"password": "new"}'

# 3. 使用旧 token 应返回 401
curl -H "Authorization: Bearer $TOKEN" http://localhost:3130/me
# 应返回: 401 Unauthorized
```

#### 5. SSRF 防护（security-combined）
```bash
# 代理 URL 指向私有地址应被拒绝（own 级用户）
curl -X POST http://localhost:3130/proxies \
  -H "Authorization: Bearer $OWN_USER_TOKEN" \
  -d '{
    "name": "test",
    "url": "http://127.0.0.1:8080"
  }'

# 应返回: 400 private address not allowed
```

---

**文档创建**: 2026-10-04 21:15  
**用途**: 阶段 2 手工合并参考  
**创建者**: prep-stage2 子代理
