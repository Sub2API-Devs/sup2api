# Payment Plugin

在线充值、兑换码与优惠码插件。

## 功能

- **在线充值**：支持支付宝、微信支付、Stripe 等主流支付渠道
- **兑换码**：批量生成、导出、作废，用户兑换一次性兑换码充值
- **优惠码**：充值时使用优惠码获得赠送，支持使用次数限制

## 架构

### 数据表

- `payment_orders`：订单表（状态机、金额、支付渠道、过期时间）
- `payment_provider_instances`：支付渠道实例配置
- `redeem_codes`：兑换码（哈希存储、金额/订阅组、使用状态）
- `promo_codes`：优惠码（充值赠送、使用次数上限）
- `promo_code_usage`：优惠码使用记录
- `payment_config`：系统配置（单行表）

### 权限申请

- `db.schema`：插件专属 schema `plg_payment`（迁移由核心按 `database.migrations` 执行）
- `ledger.credit`：通过核心账本接口入账，scope `{maxPerTx: 100000, maxPerDay: 1000000}`（幂等键 = `payment_order_{id}` / `redeem_code_{id}` / `promo_{id}_{user}`）
- `routes.user`、`routes.admin`、`routes.webhook`：HTTP 路由（用户接口需权限 `recharge:use`，管理接口需 `config:manage`）
- 前端未实现，暂不申请 `ui.menu` / `ui.native`

### 入账流程

1. 用户创建订单 → `payment_orders` 插入 `pending` 状态
2. 跳转支付渠道完成支付
3. 支付渠道回调 webhook (`/api/v1/p/payment/webhook/:provider`)
4. 插件验签、金额核对、幂等检查
5. 更新订单 `paid` → `recharging`
6. 调用 `HostService.Ledger.Credit`（幂等键 = `payment_order_{id}`）
7. 成功后订单状态 → `completed`

## 开发

### 构建

```bash
cd next/plugins/payment
go mod tidy
go build ./...
```

### 测试

需要 `TEST_DATABASE_URL` 环境变量指向 PostgreSQL：

```bash
export TEST_DATABASE_URL="postgres://user:pass@localhost:5432/testdb?sslmode=disable"
go test -v ./...   # 不设 TEST_DATABASE_URL 时集成测试跳过；go test -short ./... 只跑无库测试
```

### 打包

```bash
cd next
tools/sub2api-plugin/sub2api-plugin build --dir plugins/payment
tools/sub2api-plugin/sub2api-plugin pack --dir plugins/payment --out payment.s2plugin
```

## API

### 用户接口（`routes.user`，权限 `recharge:use`）

- `POST /api/v1/p/payment/orders`：创建充值订单
  - Body: `{amount, payment_type, order_type}`
  - Response: `{order_id, out_trade_no, pay_url, qr_code, expires_at}`

- `GET /api/v1/p/payment/orders`：查询订单列表
  - Query: `?page=1&page_size=20`

- `POST /api/v1/p/payment/redeem`：兑换码兑换
  - Body: `{code}`
  - Response: `{type, value}`

- `GET /api/v1/p/payment/redeem/history`：兑换记录

### 管理员接口（`routes.admin`，权限 `config:manage`）

- `GET /api/v1/p/payment/config`：获取系统配置
- `PUT /api/v1/p/payment/config`：更新系统配置

- `GET /api/v1/p/payment/providers`：支付渠道列表
- `POST /api/v1/p/payment/providers`：创建支付渠道

- `GET /api/v1/p/payment/redeem-codes`：兑换码列表
- `POST /api/v1/p/payment/redeem-codes`：批量生成兑换码
  - Body: `{count, type, value, group_id?, validity_days?, expires_at?, notes}`
- `DELETE /api/v1/p/payment/redeem-codes/:id`：作废兑换码

- `GET /api/v1/p/payment/promo-codes`：优惠码列表
- `POST /api/v1/p/payment/promo-codes`：创建优惠码
  - Body: `{code?, bonus_amount, max_uses, expires_at?, notes}`
- `PATCH /api/v1/p/payment/promo-codes/:id`：更新优惠码
- `DELETE /api/v1/p/payment/promo-codes/:id`：删除优惠码

### Webhook（`routes.webhook`）

- `POST /api/v1/p/payment/webhook/:provider`：支付渠道回调

## 限制与已知问题

### MVP 未实现

1. **支付渠道实现**：当前只有 mock 实现，需要移植 sub2api 的以下 provider：
   - EasyPay（易支付）
   - Alipay（支付宝直连）
   - Wxpay（微信支付）
   - Stripe
   - Airwallex（可选）

2. **渠道选择与负载均衡**：
   - `payment_provider_instances` 表已建立
   - 需要实现 `LoadBalancer`（按限额、启用状态、round-robin 选择实例）
   - 需要从 sub2api `payment/load_balancer.go` 移植

3. **订单过期清理**：需要 periodic job 或核心 cron 触发

4. **前端 UI**：
   - `ui/native/` 目录已创建
   - 需要实现充值页、订单页、兑换页、配置页（参考 moderation 插件）
   - 使用 `@sub2api/ui` 和 `@sub2api/host`

5. **用户信息获取**：当前用 mock email，需要核心提供用户查询接口

### 测试覆盖

已实现：
- ✅ 订单创建与履约
- ✅ 兑换码生成、兑换、并发兑换（幂等）
- ✅ 优惠码创建、应用、次数限制
- ✅ 金额精度（decimal.Decimal）
- ✅ 金额容差验证

未实现：
- ⏸ 支付渠道回调验签（需要真实 provider 实现）
- ⏸ 订单过期处理
- ⏸ 渠道负载均衡

## 依赖

- `github.com/shopspring/decimal`：金额精度
- `github.com/jackc/pgx/v5`：PostgreSQL 驱动
- `github.com/smartwalle/alipay/v3`：支付宝 SDK（待集成；当前未 import，go.mod 中已移除）
- `github.com/wechatpay-apiv3/wechatpay-go`：微信支付 SDK（待集成；当前未 import，go.mod 中已移除）
- `github.com/stripe/stripe-go/v85`：Stripe SDK（待集成；当前未 import，go.mod 中已移除）

## 核心需求

插件已按 CONTRACTS 规范实现以下接口：

1. ✅ 插件专属 schema（`db.schema` grant）
2. ✅ 受限账本接口（`ledger.credit`，幂等键机制）
3. ✅ HTTP 路由（user/admin/webhook）
4. ⏸ 插件 UI（manifest 暂未声明 ui，原生 Vue 组件未实现；菜单应直接挂核心 `finance` 区，插件不能自定义 id 为 finance 的 section）

插件需要核心配合：

1. **用户查询接口**：订单需要 user_email，当前用 mock
2. **普通用户权限**：插件菜单默认需要授权，需核心支持"插件权限可默认授予用户角色"

## License

MIT
