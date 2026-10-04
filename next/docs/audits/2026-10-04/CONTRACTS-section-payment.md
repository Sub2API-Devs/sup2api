## §XX. 充值支付与兑换码插件（payment 0.1.0，2026-10-04 起草，2026-10-05 按合并后实现修正）

> 草稿，编号由主控合并时统一分配。原稿是 feat-payment worktree（agent-ad4645dea546259b0）`next/docs/CONTRACTS.md` 的 §44。本稿按合并进主干的实现（`next/plugins/payment/`）修正，与原稿不同之处都标了“修正”。

插件 `payment` 提供在线充值订单、兑换码和优惠码。余额变动全部通过核心账本 `ledger.credit`（§10/§25）完成，插件不直接改核心表。

**当前状态（必须先读）**：0.1.0 是**骨架 + 兑换码可用**。兑换码的生成、兑换、作废是真实实现。在线支付的渠道下单和回调验签**都没有实现**（pay_url 是占位地址，回调解析是写死的 mock），所以不能对外开放在线充值。没有前端，没有订单过期任务。详见 §XX.9。

### XX.1 包结构与 manifest

- 目录：`next/plugins/payment/`，已加入 `next/go.work`。`main.go`（`pluginsdk.Serve`，嵌入 manifest）+ `internal/payment/`（业务）+ `migrations/0001_payment_schema.sql`。
- 能力：只有 `http.routes.v1`。**修正**：原稿的 `events`（订阅 `user.created`）已删掉，插件没有事件处理器，也用不上这个事件。
- 数据库：`database.schema = "plg_payment"`（**修正**：原稿写的 `payment` 通不过 SDK 校验，规则要求 `plg_<key>`），`database.migrations = "migrations/"`。表都建在 search_path 指定的插件 schema 里。
- manifest 能通过 `sdk/manifest/check.Validate`（Tooling 模式），由 `manifest_test.go` 守护。

### XX.2 数据模型

插件 schema 里有这些表：

- `payment_orders`：订单。`out_trade_no` 带 `s2a_` 前缀加 UUID，有唯一索引。金额字段是 `amount`（入账金额）、`pay_amount`（加手续费后的应付金额）、`fee_rate`（百分比），类型都是 `DECIMAL(20,8)`。
- `payment_provider_instances`：支付渠道实例（`provider_key`、`config` JSONB、`limits` JSONB、启用状态）。**表已建好，但还没有读写代码。**
- `payment_audit_logs`：**表已建好，但还没有写入代码。**
- `redeem_codes`：兑换码，同时存明文 `code` 和 `code_hash`（SHA-256），两列都有唯一索引。**修正**：原稿说“哈希后存储”，实际明文也存了，管理员列表接口不返回明文。
- `promo_codes`：优惠码，明文存储，有唯一索引。`promo_code_usage` 记录每个用户对每个码的使用，有唯一约束 `(promo_code_id, user_id)`。
- `payment_config`：单行配置表（`id = 1`）。迁移会插入一行默认值：启用、金额范围 1 到 10000、超时 30 分钟、最多 3 个待支付订单、手续费率 0。

### XX.3 路由（全部在 `/api/v1/p/payment` 下）

**修正**：原稿把用户接口声明成 `routes.public`。但核心对 public 路由不做鉴权，`Caller.user_id` 恒为 0，handler 就会一直回 401。现在这些接口改成 `scope: user`，权限为 `recharge:use`。

| 方法 | 路径 | scope / 权限 | 实现状态 |
|---|---|---|---|
| POST | `/orders` | user / `recharge:use` | 创建订单：真实；渠道下单：占位 |
| GET | `/orders` | user / `recharge:use` | 真实（只返回自己的订单） |
| POST | `/redeem` | user / `recharge:use` | 真实 |
| GET | `/redeem/history` | user / `recharge:use` | 真实 |
| POST | `/webhook/:provider` | webhook（不鉴权） | **mock**，见 XX.5 |
| GET / PUT | `/config` | admin / `config:manage` | **stub**：GET 返回写死的值，PUT 不落库 |
| GET / POST | `/providers` | admin / `config:manage` | **stub**：GET 返回空数组，POST 返回 501 |
| GET / POST | `/redeem-codes` | admin / `config:manage` | 真实 |
| DELETE | `/redeem-codes/:id` | admin / `config:manage` | 真实（只能作废 `unused` 的码，状态置为 `expired`） |
| GET / POST | `/promo-codes` | admin / `config:manage` | 真实 |
| PATCH / DELETE | `/promo-codes/:id` | admin / `config:manage` | 真实 |

- 用户权限有两个：`recharge:use` 和 `config:manage`。`config:manage` 标了 `sensitive`，核心对每次 admin 调用都要求 step-up（§8）。
- **修正**：原稿的 `GET /payment-methods` 和 `POST /promo` 都没有 handler，已从 manifest 和本节删掉。优惠码目前**没有任何用户入口**（见 XX.6）。

### XX.4 在线充值流程（目标设计；带 ⚠ 的步骤尚未实现）

1. 用户调用 `POST /orders {amount, payment_type, order_type, plan_id?}`。
2. 插件读取 `payment_config` 并校验：已启用、在金额范围内、待支付订单数未超上限。手续费为 `amount × fee_rate / 100`，四舍五入到分，`pay_amount = amount + 手续费`。然后插入一条 `pending` 订单，过期时间默认 30 分钟。
   - ⚠ 没有校验 `payment_type` 是否在 `enabled_payment_types` 里，没有执行 `daily_limit`，`order_type` 为空时也没有补默认值。
   - ⚠ `user_email` 写的是占位值 `user_{id}@example.com`（核心没有用户查询 Host 接口）。
3. ⚠ 选择渠道实例并调渠道下单：没有实现。现在返回的 `pay_url` 是 `https://pay.example.com/checkout?order=<out_trade_no>`，`qr_code` 为空。
4. 渠道回调 `POST /webhook/:provider`。
5. ⚠ 按渠道验签、解析通知：没有实现（见 XX.5）。拿到通知后的处理是真实代码：按 `out_trade_no` 找订单，已经 `completed` 或 `refunded` 的直接返回成功；金额与 `pay_amount` 核对，容差 0.01；用条件更新把订单从 `pending` 或 `expired` 改为 `paid`。
6. 履约：订单从 `paid` 改为 `recharging`，然后调用 `LedgerCredit{user_id, amount = 订单 amount, idempotency_key = "payment_order_<order id>", ref_type = "payment_order", ref_id = <order id>}`。成功后订单改为 `completed`；失败则改为 `failed` 并记录原因。
   - **修正**：SDK 的 `LedgerChange` 没有 `kind` 字段，核心统一记为 `plugin_credit`。
   - ⚠ 没有乘 `balance_recharge_multiplier`。`order_type = subscription` 的订单同样按余额入账，订阅开通没有实现。
7. ⚠ 订单过期：没有实现。manifest 没有声明 `jobs`，没有任何代码会把订单改成 `expired`。原稿里“5 分钟宽限期”的常量定义了，但没有代码使用。

状态机（目标）：`pending → paid → recharging → completed | failed`，另有 `expired`、`cancelled`、`refunding`、`refunded`。目前代码只会写出 `pending / paid / recharging / completed / failed`。

### XX.5 Webhook 安全契约

- 核心不对 webhook 路由做任何鉴权（`server/internal/plugin/routes`），原始 body（上限 1 MiB）和除被剥离头以外的请求头都原样转给插件。**验签、防重放、来源校验必须全部由插件自己完成。**
- 现状：`HandlePaymentNotification` **不验签，也不解析 body**，用的是写死的通知（`out_trade_no = "mock_out_trade_no"`，金额 100）。真实订单号都带 `s2a_` 前缀，不会命中这个 mock，所以现在调用这个接口不会给任何人入账，只会返回 `200 OK`。也正因为这样，渠道没接通之前不能声称“支持在线充值”。
- 接入真实渠道时必须满足：
  1. 按渠道验签（支付宝 RSA2、微信 APIv3 平台证书加 AES-GCM 解密、Stripe `Stripe-Signature` 的 HMAC 与时间戳容差、易支付 MD5 签名），验签失败返回 4xx，并且不能动订单；
  2. 防重放：校验通知里的时间戳或 nonce。至少要靠“订单状态条件更新 + 账本幂等键”保证同一通知重复投递只入账一次。这一点现在的代码已经满足：重复投递时 `paid` 条件更新影响 0 行，`LedgerCredit` 返回 `Duplicate`；
  3. 金额以渠道通知为准，与 `pay_amount` 核对，商户号或 app_id 必须与渠道实例配置一致；
  4. “订单不存在”现在靠匹配错误字符串返回 200，应改成哨兵错误。

### XX.6 兑换码与优惠码

**兑换码**（真实实现）：

- 生成：`POST /redeem-codes {count (1–1000), type, value, group_id?, validity_days?, expires_at?, notes?}`，在一个事务里批量插入，返回明文码。
- 兑换：`POST /redeem {code}`。先 trim 并转大写，算出 `code_hash`，然后在事务内 `SELECT … FOR UPDATE`，校验状态为 `unused` 且未过期，标记为 `used`。只有 `type = balance` 才调用 `LedgerCredit{idempotency_key = "redeem_code_<code id>", ref_type = "redeem_code"}`。并发兑换由行锁保证只有一次成功。
  - ⚠ `subscription` 和 `invitation` 类型的码会被标记为已用，但不会产生任何效果。
  - ⚠ 账本调用发生在事务提交之前。如果入账成功而提交失败，码仍然是 `unused`，别人再兑换时只会拿到 `Duplicate`（余额已经记在第一个人名下）。没有失败计数和锁定（常量 `RedeemMaxFailedAttempts` 定义了但没用上），可以被暴力枚举，只靠 128 位随机码的熵兜底。

**优惠码**：

- 管理员 CRUD 是真实实现。`ApplyPromoCode` 也实现了：行锁，校验状态、过期时间和次数，校验每用户只能用一次，然后调用 `LedgerCredit{idempotency_key = "promo_<promo id>_<user id>", ref_type = "promo_code"}`，写入使用记录，`used_count` 加一。
- ⚠ **没有任何路由或流程调用 `ApplyPromoCode`**：既没有用户接口，也没有接到充值流程里。原稿的 `POST /promo` 没有实现。

### XX.7 账本幂等键与授权

- 插件传的键会被核心加上前缀 `plugin:payment:`（`grpcruntime/host.go`），所以只要求在插件内部唯一。
- 键的列表：`payment_order_<orders.id>`、`redeem_code_<redeem_codes.id>`、`promo_<promo_codes.id>_<user_id>`。
- ⚠ 风险：这三个键都基于插件 schema 里的 BIGSERIAL。如果插件被清除数据后重装（schema 被删了重建），序列从 1 重新开始，新订单会撞上旧的账本幂等键，被当成 `Duplicate`，**不会入账但订单仍会被标成 completed**。建议改成全局唯一值：订单用 `out_trade_no`，兑换码用 `code_hash`。
- `ledger.credit` 的 scope：`{"maxPerTx": "100000", "maxPerDay": "1000000"}`。**修正**：原稿用的键是 `single_max/daily_max`，核心不认识这两个键，等于没有设上限；现在改成了核心实际读取的 `maxPerTx/maxPerDay`，由 `manifest_test.go` 守护。单日上限在 Redis 里先预占，失败或 Duplicate 时释放。

### XX.8 权限申请（修正后）

| host permission | 风险 | 用途 |
|---|---|---|
| `db.schema` | high | 插件 schema |
| `routes.user` | medium | 用户充值、订单、兑换接口 |
| `routes.admin` | medium | 配置与码管理 |
| `routes.webhook` | high | 渠道回调 |
| `ledger.credit` | critical | 入账，scope 见 XX.7 |

**修正**：原稿的 `db.migrations` 不是有效的 host permission，已删除；迁移由核心按 `database.migrations` 执行（§36）。`routes.public` 和 `events` 已删除。`ui.menu` 和 `ui.native` 在前端实现之前暂不申请（`ui.native` 是 critical 风险，没有页面却申请它就是过宽）。

### XX.9 已知缺口（按优先级）

1. 支付渠道（易支付、支付宝、微信、Stripe、Airwallex）下单和回调验签都没有实现。stripe-go、alipay、wechatpay-go 这几个依赖原来写在 go.mod 里但从未被 import，`go mod tidy` 时已移除，真正接入时再加回来。
2. 渠道选择和负载均衡没有实现（`payment_provider_instances` 没有读写代码，`/providers` 是 stub）。
3. `/config` 的读写是 stub，`payment_config` 只能直接改数据库。
4. 订单过期任务没有实现（需要声明 `jobs` + `app.jobs.v1`，并申请 `jobs` 权限）。
5. 优惠码没有用户入口。
6. 没有前端。原稿设计的菜单是：用户侧的充值、订单记录、兑换码三项放在核心 `finance` 区；管理侧的支付配置放在 `system` 区。注意插件**不能**声明 id 为 `finance` 的 `ui.sections`，`finance` 是核心保留区，直接把菜单挂到 `section: "finance"` 即可。
7. 核心缺口：没有用户查询 Host 接口（拿不到 email）；`recharge:use` 需要能默认授予普通用户角色，否则普通用户调不到充值接口（03-feature-gap.md §A4）。
8. XX.7 的幂等键风险；XX.6 里兑换码的提交顺序问题和缺少防爆破。

### XX.10 测试

- `manifest_test.go`（不需要数据库，`-short` 下也会跑）：manifest 通过核心校验；不含未知字段；`ledger.credit` scope 只包含 `maxPerTx/maxPerDay`；manifest 里的每条路由都有对应 handler。
- `internal/payment/plugin_test.go`：其中 `TestPlugin_AmountPrecision` 不需要数据库。其余的订单履约、兑换码、并发兑换、优惠码测试需要 `TEST_DATABASE_URL`，`-short` 下跳过。这些测试直接调用 service 方法，没有覆盖 webhook 解析（因为那部分还是 mock）。
