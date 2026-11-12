# 分组定价：用户组、私有分组授权、分组内模型定价（设计文档）

> 日期：2026-11-12。状态：设计已经独立审核并按结论修改（第 12 节），实现中。分支：`claude/project-thread-27oe9k`。迁移 0095、0096。契约写入 CONTRACTS §97。
> 界面已按模拟数据做完并经用户确认；接口形状以 `next/web/src/api/pricing.ts`（类型）和 `next/web/mock/pricing.ts`、`next/web/mock/pricingStore.ts`（行为）为准，后端照此实现。两者与本文不一致时，先改本文再改代码。
> 路径省略前缀 `next/`；Go 文件省略 `server/internal/`。

---

## 1. 模型（已确认）

实付 = 标价 × 倍率。两条链各自解析，先命中者生效，互不遮蔽。

- **标价**：用户组专属价（用户组 × 分组 × 模型）→ 分组内定价（分组 × 模型）→ 全局模型价格。规则两种：
  - `multiplier`：全局价 × N，全局价变化时跟着变。N 可以是 0（免费）和 1（用户组级的 ×1 表示“本组按全局价，不吃分组内定价”）。
  - `custom`：固定价，沿用全局价的计费方式（按 token：`p / c / cr / cc / cc1h`；按次：`price`）。全局价是表达式计费的模型只能用 `multiplier`。
  - 模型没有启用的全局价时不能计费，规则不生效（照旧走 `missing_price_policy`）。
  - `custom` 规则的计费方式与全局价现在的计费方式不同（全局价后来被改成了别的方式）时，这条规则失效：解析时跳过它，往下一层找；接口里这条规则带 `inactive: true`。
- **倍率**（替换，不连乘）：用户组 × 分组专属倍率 → 分组默认倍率 × 用户组全场折扣（折扣 ≠ 1 时）→ 分组默认倍率。实际倍率保留 4 位小数（四舍五入），上限 999999.9999，与 `usage_logs.rate_multiplier numeric(10,4)` 一致：首次结算、重试、对账用的是同一个数。折扣必须 > 0（免费用专属倍率 0 表达）。
- 每个用户只属于一个用户组。内置“默认”用户组：新用户进它，不能删。
- **个人专属** = 系统建的、只有这一个用户的用户组（`kind = personal`）。设为个人专属时可复制原用户组的设置或从空白开始；移回命名用户组时个人设置删除。
- 分组可见性：`public` 所有人可用；`restricted`（界面叫“私有”）只有被授权的用户组可用。
- 分组提供的模型 = 分组内未删除账号声明的模型；有账号没声明模型（不限）时再加上全部已启用全局价的模型；最后经分组模型名单过滤。

代码里用户组叫 **segment**：`user_groups` 是旧的“用户 ↔ 分组”授权表，`tier` 是价格档位，都不能再用。

## 2. 数据模型（迁移 `0095_segments.sql`、`0096_usage_base_cost.sql`）

全部是新增，不删不改旧对象；旧二进制在新库上照常工作（见 §9）。DDL 以迁移文件为准，这里只列要点。

| 对象 | 要点 |
|---|---|
| `segments` | `kind`（`named \| personal`）、`name`（命名用户组不区分大小写唯一；个人专属为空）、`description`、`discount numeric(10,4)`（> 0，默认 1）、`is_default`（至多一行）、`user_id`（个人专属的唯一成员，每个用户至多一个）、`origin_id`（个人专属原来所在的用户组） |
| `segment_groups` | 主键 `(segment_id, group_id)`；`granted`、`rate_override numeric(10,4)`（NULL = 跟随）。既没授权也没专属倍率的行不保留 |
| `price_rules` | `group_id`、`segment_id`（NULL = 分组内定价）、`model`、`kind`（`multiplier \| custom`）、`multiplier`、`mode / config / expression / expr_hash`（custom）；`(group_id, model)` 和 `(group_id, segment_id, model)` 各一个部分唯一索引 |
| `users.segment_id` | 非空，默认值 `default_segment_id()`：任何不写这一列的 `INSERT INTO users`（旧二进制、插件、测试）都进默认组 |
| `usage_logs.base_cost` | `numeric(20,8)`，原价；旧行为 NULL。单独放在 0096：0095 在事务里持有 `users` 的排他锁，不能同时去等 `usage_logs` 的锁（鉴权每次请求都连 `users`） |

回填（0095，幂等：只动 `segment_id IS NULL` 的用户）：

1. 建“默认”用户组，所有用户（含已软删除的）进默认组。
2. 旧授权迁成个人专属：未删除、且在 `user_groups` 里至少有一个 `restricted` 分组的用户，各建一个个人专属（`origin_id` = 默认组），这些私有分组记 `granted = true`。指向公开分组的旧授权没有意义，不迁。

0096：加 `base_cost`，重建 `usage_hourly_mark_update` 触发器（列清单加 `base_cost`）。

`user_groups` 表本次保留、不再读写，下一个版本再删。用户软删除时（`iam`）：个人专属删除，`segment_id` 改回默认组。命名用户组删除时成员回默认组；默认组不能删。

## 3. 计费链路

### 3.1 一次请求里“标价”和“倍率”各自怎么来

现状（调研见 `group-pricing-design/research/research-sup2api-next.md` §B6）：倍率只有 `groups.rate_multiplier`，在 `apikey.Service.lookup` 的一条 SQL 里读出（每次请求查库，没有缓存），经 `APIKeyPrincipal.Group.RateMultiplier` → `gateway/pipeline.go newRecord` → `UsageRecord.RateMultiplier` 进入预扣和结算；价格由 `Pricer.Resolve(ctx, model)` 给出一条全局 `core.PriceRule`，它的表达式被冻结在使用记录上（`expr_hash` + `model_price_history`）。`billing.Service.Quote` 是唯一的算钱入口：`Eval(expression) × RateMultiplier`，四舍五入到 8 位。

改动的原则：**标价 = 一条表达式 × 一个可选的常数，倍率 = 一个数**。`Quote` 和 `QuoteInputs` 不改，表达式文本不拼接、不改写。

- **倍率**：`lookup` 的 SQL 多连两张表（`segments`、`segment_groups`，都按主键），读出 `segment_id`、`segments.discount`、`segment_groups.rate_override`、`segment_groups.granted`；实际倍率由 `core.SegmentRate(groupDefault, discount, override)` 算出（全仓唯一一处写这条规则，含 4 位小数和上限）。`APIKeyPrincipal.Group.RateMultiplier` 直接放**实际倍率**，下游（`newRecord`、`/key/prices`）不用知道它是怎么来的；另加 `APIKeyPrincipal.SegmentID`、`RateSource` 供记录来源。
- **能否使用私有分组**：`GroupAvailable = visibility = 'public' OR segment_groups.granted`，同一条 SQL 里算。
- **标价**：`core.Pricer.Resolve(ctx, core.PriceQuery{Model, GroupID, SegmentID})`。`billing` 的价格快照同时载入 `price_rules`（同一个 TTL、同一个 `config:changed` 失效）。解析顺序：全局价不存在 → 照旧（报错或免费）；否则取 `(group, segment, model)` 规则，没有或失效再取 `(group, NULL, model)`，都没有就是全局价。返回的 `core.PriceRule` 多三个字段（都 `omitempty`，旧的已持久化 JSON 照常读）：
  - `Source`：`global | group | segment`。
  - `Scale *decimal.Decimal`：`multiplier` 规则的 N；表达式、`Mode`、`ExprHash` 都还是全局价的。nil = 没有倍数。
  - `Base *PriceBase`：`custom` 规则命中时的全局价（`Expression`、`ExprHash`），用来算原价。此时 `Expression / ExprHash / Mode` 是规则自己的（保存规则时由 `expr.Generate(mode, config)` 生成并存下，同时写进 `model_price_history`）；`ID` 和 `VideoOnly` 始终取全局价的（`usage_logs.price_id` 一直指全局价）。
- **乘数只在一处合成**：`func (r *PriceRule) Multiplier(rate decimal.Decimal) decimal.Decimal`（`rate × Scale`，nil 安全）。传给 `Quote` 的 `RateMultiplier` 都经过它：`billing/additional.go quoteRecord`（预扣）和 `usage/settler.go priceOne`（结算、预留、对账）。
- 网关：`prepareBilling` 和 `prepareReferencedPrices` 两处 `Resolve` 传 `PriceQuery`；`newRecord` 把 `SegmentID`、`RateSource` 记到 `UsageRecord`。`clonePriceRule` 连同 `Scale`、`Base` 深拷贝。其余（计费方式准入、价格入参捕获）不变，因为它们只看 `rule.Mode`、`rule.VideoOnly` 和 `rule.Expression`。`custom` 规则只存在于按 token / 按次的全局价之上，全局价的表达式不读请求参数，`Base` 不需要另外捕获入参。
- 插件只读报价 `PriceModelUsage`（`billing/usage_quote.go`）仍按全局价、倍率 1。
- WebSocket 连接整个生命周期复用升级时的 principal（今天分组倍率也是这样）：连接期间用户组变化，倍率要到重连才变，标价每轮重新解析。

### 3.2 冻结与重试

使用记录写入时，主项的来源和规则冻结在 `billing_detail.inputs.pricing`：

```json
{ "segment_id": 12, "rate_source": "discount", "price_source": "segment",
  "scale": "0.8",                         // multiplier 规则
  "base": { "expression": "…", "expr_hash": "…" } }   // custom 规则：全局价
```

倍率来源是分组默认且标价是全局价时整个省略：这样的行 `billing_detail` 与今天逐字节相同。附加和替换分项（`PricedUsage`）本来就整条持久化 `Price`，新字段随它一起冻结。

结算重试（`usage/settler.go RetryPending`）和对账（`usage/reconcile.go loadReserved`）从库里重建 `pending` 时：表达式照旧按 `expr_hash` 从 `model_price_history` 取（`custom` 规则的表达式在保存规则时已写进历史表，任何版本的节点都取得到），`scale` 和 `base` 从 `inputs.pricing` 取。两条 SQL 不用改，重试不重新解析规则，规则在请求之后被改不影响这笔账。显式构造 `pendingInputs` 的两处（`settler.go` 写入和 `fromRecord`）要带上新字段。

### 3.3 三个金额

| 名称 | 含义 | 存在哪 |
|---|---|---|
| 原价 `base_cost` | 全局价 × 用量 | `usage_logs.base_cost`（新列）；`billing_detail.cost`（含义不变：倍率前、全局价） |
| 标价费用 `list_cost` | 标价 × 用量 | `billing_detail.list_cost`，只在命中规则时写 |
| 实付 `total_cost` | 标价费用 × 倍率 | `usage_logs.total_cost`（不变） |

`priceOne`（两个版本合成一个实现）对一个 `pending` 返回这三个数：

- 没有规则：原价 = 标价费用 = `res.Cost`。
- `scale`：原价 = `res.Cost`，标价费用 = `res.Cost × scale`。明细里的档位、分项、加价规则都是全局价的，不混入倍数。
- `base`：标价费用 = `res.Cost`（规则表达式），原价 = 全局表达式再求值一次（用它自己的 `Uses` 做 `Normalize`，两条表达式计价的缓存类别可能不同）。

`priceComponents` 对主项和每个附加、替换分项三个数都累加（分项的 `scale / base` 取自 `item.Price`）。`billing_detail.cost` 保持“全局价口径”是有意的：

- 账号的原始费用（`0064` 的 `account_usage_raw_cost`，优先读 `billing_detail.cost`）度量的是账号消耗了多少上游额度，不应随某个分组的售价变化。函数不用改，也不用重算历史。
- 统计里的“原价”（`standard_cost`）：`usage/stats.go standardCost` 改成 `COALESCE(u.base_cost, <旧公式>)`；旧行 `base_cost` 为 NULL，结果与今天相同，小时汇总表不用重算。导出（`usage/export.go`）的原价同样取 `base_cost`，没有再回退到旧公式。免费分组（倍率 0）的新记录从此有真实的原价（旧公式下是 0）。对普通用户，“原价”与今天的含义一致：今天分组倍率 1.2 的用户看到“原价 10、实付 12”，以后规则 ×1.2 的用户看到的也是这样。
- `usage/rollup_test.go` 里读 `0092` 触发器列清单的断言改成读最新定义该触发器的迁移。

写 `total_cost` 的五处都同步写 `base_cost`：`settler.go` 结算和预留、`reconcile.go` 对账写实际值，`reconcile.go` 关闭和 `settlements_api.go` 置免费时写 0。

`usage_logs.rate_multiplier` 的含义变成“这次实际生效的倍率”（不含规则倍数），类型不变。

## 4. 包与职责

| 包 | 改动 |
|---|---|
| `core` | 新文件 `segment.go`：`SegmentRef`、来源常量、`SegmentRate()`、`PriceQuery`、`PricingTrace`。`ports_billing.go`：`PriceRule` 加 `Source`、`Scale`、`Base` 和 `Multiplier()`；`Pricer.Resolve` 换参数；`UsageRecord` 加 `SegmentID`、`RateSource`。`ports_identity.go`：`APIKeyPrincipal` 加 `SegmentID`、`RateSource`。 |
| `segment`（新） | 用户组的读写：CRUD、移入成员、个人专属、用户组 × 分组设置（两个方向）、供别的包用的访问条件 SQL 片段和 `Terms` 读取。只依赖 `core / httpapi / store`；分组的平台（`SegmentGroupSetting.group.platforms`）和价格快照失效由 `app` 注入函数。 |
| `billing` | `price_rules` 的存取与校验、快照与 `Resolve`、`GET/PUT /groups/:id/model-prices`、`POST /pricing/quote`、`GET /me/prices`、`GET /key/prices`。 |
| `group` | `/me/groups` 和 `/groups` 的新字段、`?model=` 筛选、导出 `ProvidedModels`、删掉 `/users/:id/groups` 两个接口。 |
| `apikey` | `lookup`、`groupAvailable`、Key 列表的 `group_status` 三处 SQL 改按用户组判断。 |
| `iam` | 用户带 `segment`、按用户组筛选、新建时可选用户组、软删除时清个人专属；去掉 `group_ids`；成员列表 `GET /segments/:id/members`（它就是带用户组条件的用户列表，行同 `GET /users`，放在 `iam` 才不成环）。 |
| `usage` | `pendingInputs` 加 `Pricing`；`priceOne` 返回三个金额、`priceComponents` 累加；写 `base_cost`；统计和导出口径。 |
| `gateway` | `Resolve` 的两处调用和 `newRecord`。 |
| `lookup` | `groupOpenTo` 改用 `segment` 的访问条件。 |
| `authz` | 权限 `segment:read`、`segment:manage`；菜单“用户组”。 |

依赖方向：`billing → group, segment`；`apikey / group / iam / lookup → segment`；`segment` 不依赖它们。没有环。

共用的三样东西各只写一处：

- 倍率规则：`core.SegmentRate(groupDefault, discount decimal.Decimal, override *decimal.Decimal) (rate decimal.Decimal, source string)`。
- 用户组在分组里的条件（能否使用、实际倍率与来源）：`segment.UserTerms / SegmentTerms(ctx, q, id, groupIDs) (map[int64]segment.Terms, error)`，批量读取时用它；`apikey.lookup` 为了一条 SQL 读完自己连表，但倍率同样只经 `core.SegmentRate`。
- 访问条件：`segment.OpenToUserSQL(groupAlias, userArg string) string`，展开为 `(g.visibility = 'public' OR EXISTS (SELECT 1 FROM segment_groups sg JOIN users su ON su.segment_id = sg.segment_id WHERE sg.group_id = g.id AND sg.granted AND su.id = <arg>))`。`apikey`（3 处）、`group`（`/me/groups`）、`billing`（`/me/prices`）、`lookup`（1 处）共 6 处旧的 `user_groups` 子查询都换成它。
- 分组提供的模型：`group.ProvidedModels(ctx, q, groupIDs []int64) (map[int64]group.Models, error)`，`Models` 带“不限模型的账号数”；与全局价、模型名单的结合在 `billing` 里一个函数完成。现有 `GET /groups/:id/models` 改为调用它。
- 规则到展示用标价（接口里的 `list_price`）：`billing` 里一个函数，按倍数缩放按次、按 token、档位可视化配置（各档单价和 `flat`，不动 `max_len` 和加价乘数）、视频模板；手写表达式不改写，原样返回（倍数在规则里）。与 mock 的 `scalePrice`（`web/mock/billing.ts`）一致。

## 5. 接口

类型见 `web/src/api/pricing.ts`，行为见 `web/mock/pricing.ts`。金额和倍率都是十进制字符串；列表接口走现有分页约定；错误走 `core.InvalidFields` / `core.ErrNotFound` / 409 `conflict`。

### 5.1 `segment` 包（新）

| 接口 | 权限 | 说明 |
|---|---|---|
| `GET /segments?q=&kind=named\|personal` | `segment:read` | 默认 `named`；`Segment[]`，含 `member_count`、`granted_groups`、`rate_override_count`、`price_rule_count`；`personal` 带 `user`、`origin` |
| `GET /segments/:id` | `segment:read` | |
| `POST /segments` `{name, description, discount}` | `segment:manage` | 名称必填、≤100、不区分大小写唯一；折扣 > 0、< 1000000、最多 4 位小数 |
| `PATCH /segments/:id` | `segment:manage` | 个人专属只能改 `discount` |
| `DELETE /segments/:id` | `segment:manage` | 默认组 409；个人专属 409（走下面的移回接口）；成员回默认组 |
| `GET /segments/:id/members?q=` | `segment:read` 且 `user:read` | 分页，行同 `GET /users`；在 `iam` 包 |
| `POST /segments/:id/members` `{user_ids}` | `segment:manage` | 只能移入命名用户组；原来是个人专属的，个人专属随之删除；返回 `{moved}` |
| `GET /segments/:id/groups` | `segment:read` | `SegmentGroupSetting[]`，每个分组一行 |
| `PUT /segments/:id/groups` `{items: [{group_id, granted?, rate_override?}]}` | `segment:manage` | 整批一个事务；`rate_override` 区分“没传（不动）/ null（跟随）/ 值”；专属倍率的校验同分组倍率；返回最新列表 |
| `GET /groups/:id/segments?include=` | `group:read` | 全部命名用户组，后跟在本分组有授权、专属倍率或专属价的个人专属，以及 `include` 点名的个人专属 |
| `PUT /groups/:id/segments?include=` `{items: [{segment_id, granted?, rate_override?}]}` | `group:manage` | 同上，另一个方向 |
| `POST /users/:id/personal-segment` `{copy}` | `segment:manage` | 已是个人专属 409；`copy` 时复制原用户组的折扣、`segment_groups`、`price_rules`；返回 `Segment` |
| `DELETE /users/:id/personal-segment?to=` | `segment:manage` | 移回命名用户组（缺省默认组），个人专属及其设置删除；204 |

倍率和授权每次请求由 `lookup` 直接读库，不经缓存，改完立即生效。只有 `price_rules` 在价格快照里：`billing` 写入后广播 `config:changed`；个人专属“复制设置”和删除、用户组删除会改 `price_rules`，由 `segment` 在**事务提交后**调用注入的 `PriceRulesChanged(ctx)`（`app` 接线时指向 `billing.Service` 的失效方法；提交前调用会让节点把旧规则再缓存一个 TTL）。

个人专属的名称是成员的邮箱。调用者没有 `user:read` 时，接口里个人专属的 `name` 给 `#<user_id>`、不带 `user`（`segment` 包一处处理），免得只有 `group:read` 或 `price:read` 的角色借此列出用户。

并发：删除用户组与并发移入成员靠行锁和外键兜底，冲突回 409；一个用户同时被两个请求设为个人专属，由 `segments_user_uq` 兜底回 409。

### 5.2 `billing` 包

| 接口 | 权限 | 说明 |
|---|---|---|
| `GET /groups/:id/model-prices?segment_id=` | `group:read` | `GroupModelPrices`：分组提供的模型（与 mock 相同，不并入分组已不提供的模型上的旧规则），每行 `base`、`group_rule`、`segment_rule`（给了 `segment_id` 时）或 `segment_rule_count`、`list_price`、`source`；失效的规则带 `inactive: true` |
| `PUT /groups/:id/model-prices?segment_id=` `{items: [{segment_id, model, rule}]}` | `group:manage` | `rule: null` 删除；校验见 mock 的 `ruleError`、`rulePatchError`，另加倍数 < 1000000、最多 4 位小数；整批一个事务；返回最新 `GroupModelPrices` |
| `POST /pricing/quote` | `price:read` | `user_id` 或 `segment_id` 二选一；分组不提供该模型 400；无全局价时 `base / list_price` 为 null、费用 "0"。金额用与真实计费同一条路径算：`Resolve` + `core.SegmentRate` + `Quote` |
| `GET /me/prices` | `apikey:self:manage` | 不带 `group_id`：全部已启用全局价 + 每行 `groups`（调用者可用且提供该模型的分组），`rate_multiplier: "1"`；带 `group_id`：该分组提供且能计费的模型，价格是规则后的标价，带 `source`、实际倍率和 `rate_source`；不可用的分组 404 |
| `GET /key/prices` | API Key | 仍是分组模型名单允许的全部已启用模型；价格换成该 Key 所有者在该分组的标价（倍数规则用现有的 `scalePrice`：配置能缩放的缩放配置，其余追加常数规则，下游能编译），`rate_multiplier` 是实际倍率 |

`POST /prices/preview` 的 `group_id` 保持原意（分组默认倍率），不改。

### 5.3 现有接口的变化

| 接口 | 变化 |
|---|---|
| `GET /groups` | 每行加 `access: {segments: SegmentRef[], personal_count}`（私有分组被授权的命名用户组和个人专属数）、`price_rule_count`、`segment_rule_count`、`model_count`；新筛选 `?model=`（只留提供该模型的分组） |
| `GET /me/groups` | 可见性按调用者的用户组；每行加 `effective_rate`、`rate_source`、`exclusive`（私有分组）。`rate_multiplier` 仍是分组默认倍率 |
| `GET /users`、`GET /users/:id` | 加 `segment: SegmentRef`（个人专属的 `name` 是用户邮箱）；去掉 `group_ids`；新筛选 `segment=<id>` 或 `segment=personal` |
| `POST /users` | 可带 `segment_id`（必须是命名用户组；需要 `segment:manage`，没带就是默认组） |
| `GET/PUT /users/:id/groups` | 删除 |
| `GET /usage/:id` 等详情 | `billing_detail` 里多 `list_cost`、`inputs.pricing`（见 §3） |
| `GET /lookup/groups?mine=` | 可见性按用户组 |

## 6. 权限与菜单

- `authz/catalog.go`：新模块 `segment`（“用户组”），`segment:read`、`segment:manage`。`admin` 自动拥有；`operator` 拥有（它只排除 `settings / sticky / plugin / publisher` 模块）；`user` 没有。
- `authz/menus.go`：`users` 段加 `{"segments", "User groups" / "用户组", "publisher", "/segments", ["segment:read"]}`，排在“用户”之后、“角色与权限”之前。
- 分组侧的授权、倍率、模型定价沿用 `group:read / group:manage`；价格试算要 `price:read`。

## 7. 前端接入

页面已做完，这次只动：

1. 使用记录详情：倍率旁显示来源（专属倍率 / 分组默认 × 全场折扣 / 分组默认），命中规则时显示标价来源、规则倍数或自定义价、“标价费用”。读 `billing_detail.inputs.pricing`、`list_cost`。
2. 清理：`User.group_ids`、mock 里的 `PUT /users/:id/groups`。
3. UI SDK：`STable` 的 `expanded / toggleExpand`、`expandToggle`、`expandSingle` 计入 **UI 3.12**（`HOST_UI_VERSION`、README 小节标题、`ui-contract.spec.ts`、vite-preset、服务端声明处一起改）。
4. 与后端对齐的四处小改：实际倍率按 4 位小数（mock `rateOf`、`pricingFormat.inheritedRate` 现在是 6 位）；专属倍率和规则倍数加 < 1000000 的校验；mock 里自定义价在没有全局价时 `list_price` 应为 null；失效规则（`inactive`）在模型定价表里标出“计费方式已变，规则未生效”。
5. 分组编辑弹窗的“授权与倍率”在新建分组时调 `GET /segments`：没有 `segment:read` 的角色不显示这个标签页。
6. 以真实后端联调，发现的契约出入以 mock 为准修后端；确属 mock 的错再改 mock 和页面。

## 8. 文档

- `docs/CONTRACTS.md`：新 §97“分组定价”（本文 §1–§6 的契约部分）；§4 权限表加 `segment`；§5 REST 表增删；§12 改写（价格解析带分组和用户组；“表达式结果 × 倍率”中的倍率是实际倍率）；§15.1 分组可用性按用户组；§17 `/key/prices`；§66 `standard_cost` 口径；§73 原始费用说明 `billing_detail.cost` 是全局价口径；§79 `/me/prices`；§90 菜单。
- `docs/ARCHITECTURE.md`：§7.1 分组（可见性与授权）、§7.3 定价范围（不再是“只按模型全局设置”）、§7.4 计费流程图加标价解析。
- `web/packages/ui/README.md`：UI 3.12 小节。

## 9. 兼容与回滚

- 迁移只新增对象。升级过程中旧节点照常读 `user_groups` 和 `groups.rate_multiplier`，行为与升级前一致；新节点读新表。
- 升级瞬间每个用户的可用分组和倍率与升级前相同：公开分组照旧；私有分组的授权逐条迁成个人专属；没有任何专属倍率、折扣和规则，实际倍率 = 分组默认倍率，标价 = 全局价。
- **所有节点升级完之前，不要改授权，也不要建规则、设折扣或专属倍率。** 旧节点不认识它们：它按分组默认倍率和全局价给新请求计费，重试时也不认 `inputs.pricing` 里的规则倍数。
- 回滚到旧二进制不需要改库，但要知道三件事：
  1. 新功能整体失效：旧二进制读 `user_groups`（冻结在迁移时刻）。升级后新做的授权它看不到，升级后撤销的授权会复活；折扣、专属倍率、规则对新请求不生效。回滚前应把这期间撤销过的授权在 `user_groups` 里同步删掉（发布清单附 SQL）。
  2. 回滚时还没结算的记录（`pending / failed / reserved`）由旧二进制结算：倍率和自定义价是对的（倍率在列里、自定义价的表达式在历史表里），按倍数的规则会被忽略，按全局价 × 倍率结算。回滚前先让待结算清空，或先删掉按倍数的规则。
  3. 旧二进制退款或关闭记录时只改 `total_cost`、不改 `base_cost`，这些记录在统计里的“原价”会停在退款前的值。
- 使用记录：新记录多 `base_cost` 和可选的 `billing_detail` 字段，旧二进制忽略它们。
- 旧授权一人迁成一个个人专属。发布前在生产备份库上数一下会有多少个；数量很大（上百）时改为按“授权集合相同”归并成命名用户组再发布。

## 10. 测试

- 单元：`core.SegmentRate` 表驱动（含 4 位小数和上限）；规则解析（三层 × 两种规则 × 无全局价 × 失效规则 × 倍数 0 和 1）；`priceOne` 的三个金额（倍数、自定义价、无规则；主项 + 引用模型命中另一条规则 + replacement 的累加）；规则校验；展示用标价的缩放。
- 数据库测试（`TEST_DATABASE_URL`）：迁移回填（默认组、旧授权 → 个人专属、公开分组的授权不迁、软删除用户）；`segment` 包各接口；`lookup` 的可用性与倍率；重试路径用冻结的规则（请求后改规则不影响）；`standard_cost` 新旧行；账号原始费用不随规则变化。
- 现有测试和夹具里用旧授权的地方同步改成用户组授权：`e2e/resources.go` 的 `SetUserGroups` 及其使用者、`gateway/internal/control/realcore_*_linux_test.go`、直接插 `user_groups` 的 `apikey / lookup / billing` 测试。
- 网关端到端（`e2e/ac08_billing_test.go` 的做法）：同一请求在三种用户组设置下的扣费。
- 前端：现有 1806 个用例 + 使用记录详情的新展示。
- 生产备份库：见发布前验证清单（另附），核对升级前后每个 Key 的可用性和倍率逐个相等、统计与账号用量不变，再演练新功能。

## 11. 任务拆分

每个任务自带测试；写完自审（抽象、复用、解耦、低嵌套、简洁、低侵入），合并前由独立审查再过一遍。

| 编号 | 内容 | 主要文件 | 依赖 |
|---|---|---|---|
| B0 | 迁移 0095、0096 与回填；迁移测试 | `migrations/0095_segments.sql`、`0096_usage_base_cost.sql`、`migrations/*_db_test.go` | 无 |
| B1 | `core` 类型与规则函数；`Pricer` 接口换参（先让全仓编译通过，调用处传只有 `Model` 的查询） | `core/segment.go`、`core/ports_billing.go`、`core/ports_identity.go`、各调用处 | 无 |
| B2 | `segment` 包：CRUD、成员、个人专属、两个方向的设置、`OpenToUserSQL`、`Terms` | `segment/*.go`、`app/phases.go` | B0、B1 |
| B3 | `billing`：`price_rules` 存取校验、快照与 `Resolve`、`model-prices`、`quote`、`/me/prices`、`/key/prices` | `billing/rules.go`、`pricer.go`、`group_prices.go`、`quote_api.go`、`my_prices.go`、`sync.go`、`usage_quote.go` | B0、B1；`ProvidedModels`（B5）和 `Terms`（B2）先按签名约定 |
| B4 | 鉴权与网关：`apikey` 三处 SQL、`gateway` 两处 `Resolve` 和 `newRecord`、`lookup` | `apikey/apikey.go`、`gateway/pipeline.go`、`gateway/model_references.go`、`lookup/entities.go` | B0、B1；`OpenToUserSQL`（B2） |
| B5 | `group`：列表新字段、`?model=`、`/me/groups`、`ProvidedModels`、删旧接口；`iam`：`segment` 字段、筛选、新建、软删除、成员列表 | `group/group.go`、`group/models.go`、`iam/users.go`、`iam/http.go` | B0、B1；B2 |
| B6 | `usage`：冻结、三个金额、`base_cost`、统计与导出 | `usage/settler.go`、`additional.go`、`reconcile.go`、`settlements_api.go`、`stats.go`、`export.go`、`api.go` | B0、B1 |
| B7 | `authz`：权限与菜单；控制台保留路径 | `authz/catalog.go`、`authz/menus.go`、`sdk/manifest/routes.go` | 无 |
| F1 | 前端接入四项（§7） | `web/src/views/usage/**`、`web/src/api/types.ts`、`web/mock/**`、`web/packages/ui/**` | B6 的字段名 |
| D1 | CONTRACTS、ARCHITECTURE、README | `docs/*.md` | 全部定稿后 |
| T1 | 网关端到端与联调 | `e2e/*`、mock 对照 | B2–B6 |

执行顺序：B0、B1、B7 先行（B1 由主线程做，保证接口一次定准）；B2、B3、B4、B5、B6、F1 并行；随后 T1、D1；最后独立审查、修复、生产备份库验证。

## 12. 独立审核后的修改

设计初稿由独立审核对照代码核查（5 处必须改、13 处应该改）。采纳的结论：

| 审核结论 | 修改 |
|---|---|
| 把倍数规则拼进表达式文本不可靠：表达式带含引号的注释时追加的规则会被当成字符串，静默按全局价扣费；明细里还会多一条假的加价规则 | 不改写表达式。规则倍数作为数字放在 `PriceRule.Scale`，经 `Multiplier()` 进入 `Quote`（§3.1） |
| ×1 的规则有意义（用户组不吃分组内定价），不能拒绝 | 接受 0 和 1（§1） |
| 分组倍率 × 折扣可到 8 位小数，超出 `usage_logs.rate_multiplier numeric(10,4)`：首次结算和重试用的倍率不同，超范围时写入失败 | 实际倍率取 4 位小数并封顶，mock 和前端同步（§1、§7） |
| 冻结的规则在旧节点和回滚后会丢 | 自定义价的表达式在保存规则时写历史表，任何版本都取得到；倍数规则的限制写进 §9 |
| 附加、替换分项没有原价，汇总口径混在一起 | `priceOne` 返回三个金额，`priceComponents` 都累加（§3.3） |
| 迁移在一个事务里先后拿 `users` 和 `usage_logs` 的排他锁 | 拆成 0095、0096（§2） |
| 自定义价与全局价的计费方式后来不一致时没有定义 | 规则失效并标出（§1） |
| 删旧授权接口会打断端到端夹具 | 同步改夹具（§10） |
| 展示用标价对分档模型会退化成“按规则计费” | 单独的配置缩放函数（§4） |
| `segment` 包的两个接口会让依赖成环 | 成员列表放 `iam`，平台由 `app` 注入（§4） |
| 只有 `segment:read / group:read` 的角色能借个人专属的名称列出用户邮箱 | 没有 `user:read` 时不给邮箱（§5.1） |
| 折扣为 0 的校验与页面不一致 | 统一为 > 0（§1） |
| 回滚说明不完整 | §9 |

没有采纳的：`default_segment_id()` 函数体写死 `public.` 模式（部署可能不在 `public` 模式）；给新增写接口加审计日志（同类的分组、价格写接口都没有，保持一致）。
