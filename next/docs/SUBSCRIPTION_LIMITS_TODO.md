# 订阅限额功能 - 待办事项

## ✅ 已完成

1. **数据库迁移脚本** - `next/migrations/0029_account_subscription_limits.sql`
   - 创建 `account_subscription_limits` 表
   - 索引和约束

2. **Proto 协议定义** - `next/sdk/proto/platform.proto`
   - 添加 `QuerySubscriptionLimits` RPC 方法
   - 定义请求/响应消息类型
   - ⚠️ **需要生成 Go 代码**（见下方）

3. **数据访问层** - `next/server/internal/store/account_limits.go`
   - 完整的 CRUD 操作
   - 批量查询
   - 自动恢复支持
   - 测试文件：`account_limits_test.go`

4. **核心服务** - `next/server/internal/account/limits.go`
   - `QueryAccountLimits` - 查询限额（5分钟缓存 + 30秒防抖）
   - `ResetAccountLimits` - 重置缓存
   - `limitsDebouncer` - 防抖机制

5. **HTTP API** - `next/server/internal/account/handlers.go` + `service.go`
   - `GET /api/accounts/:id/subscription/limits?force=true`
   - `POST /api/accounts/:id/subscription/limits/reset`
   - 路由注册完成

---

## 🔴 待完成（必需）

### 1. 生成 Proto Go 代码

**问题**：本地环境缺少 `buf` 和 `protoc` 工具

**方案 A - 安装工具后生成**：
```bash
# 安装 buf (需要 Go 1.18+)
go install github.com/bufbuild/buf/cmd/buf@latest

# 或者安装 protoc
# Windows: 从 https://github.com/protocolbuffers/protobuf/releases 下载
# 需要 protoc-gen-go 和 protoc-gen-go-grpc
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# 生成代码
cd next/sdk
buf generate
```

**方案 B - 在有工具的环境生成**：
- 在 ovh 服务器上生成
- 或在 Docker 容器中生成

**生成后需要检查**：
- `next/sdk/gen/pluginv1/platform.pb.go` - 新增消息类型
- `next/sdk/gen/pluginv1/platform_grpc.pb.go` - 新增 RPC 方法

### 2. 运行迁移脚本

```bash
cd next/server
# 运行迁移（使用项目的迁移工具）
# 例如：go run cmd/migrate/main.go up
```

### 3. 编译验证

```bash
cd next/server
go build ./...
```

**预期编译错误**（proto 未生成前）：
- `limits.go` 中引用 `pluginv1.QuerySubscriptionLimitsRequest/Response` 未定义

### 4. 运行测试

```bash
cd next/server/internal/store
go test -v -run TestAccountLimits
```

---

## 🟡 待完成（可选 - 阶段 4）

### 自动恢复后台任务

在 `account/service.go` 的 `Run` 方法中添加：

```go
// 每分钟检查一次需要恢复的账号
recoveryTicker := time.NewTicker(1 * time.Minute)
defer recoveryTicker.Stop()

for {
    select {
    case <-recoveryTicker.C:
        s.recoverExhaustedAccounts(ctx)
    // ... 其他 case
    }
}
```

创建 `account/recovery.go`：

```go
func (s *Service) recoverExhaustedAccounts(ctx context.Context) {
    accounts, err := s.d.DB.ListAccountsDueForResume(ctx, 10)
    if err != nil {
        slog.WarnContext(ctx, "failed to list accounts for recovery", "err", err)
        return
    }
    
    for _, accountID := range accounts {
        if _, err := s.QueryAccountLimits(ctx, accountID, true); err != nil {
            slog.WarnContext(ctx, "failed to recover account", "account_id", accountID, "err", err)
        }
    }
}
```

---

## 🟢 待完成（阶段 5-6 - 插件实现）

### 5. 插件实现示例

在 `next/plugins/kimi/` 或其他插件中实现 `QuerySubscriptionLimits` RPC：

```go
func (s *Service) QuerySubscriptionLimits(
    ctx context.Context,
    req *pluginv1.QuerySubscriptionLimitsRequest,
) (*pluginv1.QuerySubscriptionLimitsResponse, error) {
    // 1. 解析凭证
    var creds struct {
        RefreshToken string `json:"refresh_token"`
    }
    json.Unmarshal([]byte(req.CredentialsJson), &creds)
    
    // 2. 调用上游 API
    // GET https://api.kimi.com/coding/v1/usages
    
    // 3. 解析响应并返回
    return &pluginv1.QuerySubscriptionLimitsResponse{
        Windows: []*pluginv1.SubscriptionLimitWindow{
            {
                Label: "5h",
                Seconds: 18000,
                Used: usage5h,
                Limit: limit5h,
                ResetAt: resetAt5h.Unix(),
            },
            // ... 其他窗口
        },
        Provider: "kimi-coding-plan",
    }, nil
}
```

### 6. 前端集成

在账号详情页添加限额展示：

```tsx
// 获取限额
const { data: limits } = useQuery(
  ['account-limits', accountId],
  () => api.getSubscriptionLimits(accountId),
  { refetchInterval: 5 * 60 * 1000 } // 5 分钟刷新
);

// 显示限额窗口
{limits?.windows.map(w => (
  <LimitBar
    key={w.label}
    label={w.label}
    used={w.used}
    limit={w.limit}
    usedPercent={w.used_percent}
    exhausted={w.exhausted}
    resetAt={w.reset_at}
  />
))}
```

---

## 📋 验收清单

- [ ] Proto 代码已生成
- [ ] 迁移脚本已运行
- [ ] 编译通过（无错误）
- [ ] 数据层测试通过
- [ ] API 手工测试（Postman/curl）
  - [ ] GET 返回 has_limits=false（API Key 账号）
  - [ ] GET 返回缓存数据（< 5 分钟）
  - [ ] GET force=true 强制刷新
  - [ ] POST reset 清除缓存
- [ ] 防抖机制验证（30 秒内重复请求返回缓存）
- [ ] 至少一个插件实现了 QuerySubscriptionLimits
- [ ] 前端集成完成（可选）

---

## 🔧 故障排查

### 编译错误：`undefined: pluginv1.QuerySubscriptionLimitsRequest`

**原因**：Proto 代码未生成

**解决**：按上方"生成 Proto Go 代码"步骤操作

### 测试失败：`relation "account_subscription_limits" does not exist`

**原因**：迁移脚本未运行

**解决**：运行 0029 迁移脚本

### API 返回 `UNIMPLEMENTED`

**原因**：插件尚未实现 QuerySubscriptionLimits RPC

**解决**：这是预期行为，插件需要单独实现此功能

---

## 📚 相关文档

- 设计文档：`next/docs/SUBSCRIPTION_LIMITS_DESIGN.md`
- 实施计划：`next/docs/SUBSCRIPTION_LIMITS_IMPLEMENTATION_PLAN.md`
- CONTRACTS.md §XX（待添加章节）

---

**创建时间**：2026-10-04  
**负责人**：待分配  
**预计完成时间**：待生成 proto 代码后 2 小时
