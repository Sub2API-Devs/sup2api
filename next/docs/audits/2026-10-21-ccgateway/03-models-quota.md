# CCGateway 审核 03：账号自动模型、额度准入、错误分类

审核日期 2026-10-21，分支 `feat/next-platform`，HEAD `43d576838`。只读审核，临时测试已删除。

## 1. 范围与方法

**范围**

- A. 账号自动模型列表：模型列表从哪里来、什么时候刷新、怎么存、前端怎么展示和编辑、和网关调度怎么配合，以及订阅类型（Max/Pro/Team/API Key）和模型变体之间的差异。
- B. 插件 `internal/ccgateway` 的其他代码：`availability.go`、`quota.go`、`classify.go`、`ccgateway.go`、`lifecycle.go`；核心 `server/internal/ccgateway/usage.go` 和 engine `usage.go` 的额度查询口径；`43d576838`（卷配额、Worker 内存）。
- 测试覆盖与代码规范。

**方法**

- 读代码：插件、核心 `account`（`account_patch.go`、`handlers.go`、`quota.go`、`quota_refresh.go`）、`store/account_quota.go`、`gateway/availability.go`、`gateway/model_references.go`、`gateway/dispatch.go`，以及前端 `AccountEditor.vue`、`useModelsEditor.ts`、`AccountModelTest.vue`。
- 对照 CONTRACTS §18、§41、§44.7、§59 和以下提交：`81f7bacde`、`8cf6e4ef7`、`8ecd46996`、`43d576838`。
- 在 `companions/cli-mods/release/2.1.304/claude` 二进制里抽取字符串，核对 CLI 2.1.304 自带的模型目录。
- 临时测试（都已删除）：
  - `next/plugins/ccgateway/internal/ccgateway/zz_audit_models_test.go`：复现额度准入时间线、映射键、订阅分支、错误分类。
  - `next/server/internal/account/zz_audit_models_test.go`：只测纯函数 `quotaNextCheck`，不依赖 PG。
- 跑过的测试：插件模块 `go test ./internal/... .`，全部通过，`internal/ccgateway` 语句覆盖率 92.0%。没有跑需要 PG 的 `next/server` 测试，也没有跑前端测试。

## 2. 机制说明

### 2.1 自动模型列表的完整链路

1. **来源**
   - 模型列表只有一个来源：插件里硬编码的 `DefaultModels`（11 个，`internal/ccgateway/models.go:12-16`）。
   - Pro 订阅去掉 `claude-fable-5` 和 `claude-fable-5-1`（`models.go:19-29`）。
   - 不读上游 `/v1/models`（manifest 声明“不支持模型发现”），不读 CLI 模型目录，也不读 worker 的 feature catalog（`contracts/features/catalog.go` 里没有模型清单）。
   - manifest 里的 `defaultModels` / `defaultModelsBySubscription.pro` 只供控制台预填，由 `manifest_test.go:76,141-151` 保证和 Go 列表一致。
2. **订阅类型**
   - Worker 的 `GET /admin/status` 读凭证里的 `claudeAiOauth.subscriptionType`。
   - 核心记录到 `accounts.subscription_type`（迁移 0054），只在三个时机写入：
     - 创建时，经 `drafts.go:393` 和 `CheckAccountPreparation`；
     - 重新授权提交时（`reauth.go:94`）；
     - 控制台打开账号凭证状态时（`accounts.go:737-750`，`health` 动作）。
   - 没有后台定期刷新。
3. **生效时机**
   - 插件在 `before_create` / `before_update` 返回 `account_patch.models`（`lifecycle.go:25-27` → `models.go:33-45`）。
   - 核心经 `applyAccountPatch` 写回（`account/account_patch.go:29-56`；更新路径在 `handlers.go:1186-1207`）。
   - 订阅类型变化后，核心调用 `SubscriptionChanged` → `refreshAutoModels`（`account_patch.go:67-136`），用 `updated_at` 做乐观锁写回。
4. **开关语义**
   - 开关是 `accounts.auto_models`（迁移 0055，没有默认值、没有回填）。NULL 和 true 都按自动处理：每次保存都用内置列表覆盖用户提交的列表。
   - false 时插件不返回补丁。
   - 插件从不改模型映射（mapping）。
5. **调度**
   - `AccountRef.ServesModel` 用**映射前的客户端模型**精确匹配 `models`，列表为空表示全部模型（`core/ports_identity.go:119-131`，`gateway/model_references.go:112-126`）。
   - `availabilityModels` 用**映射后的模型**询问插件 `CheckModelAvailability`（`gateway/availability.go:52-68`）。
6. **前端**
   - `AccountEditor.vue:139-169,417,433,544`：自动模式下列表只读，展示按订阅取的 manifest 预设。保存时提交这份预设和 `auto_models`。
   - `mergeModels` 被拦下，只弹提示（`AccountEditor.vue:157-163`）。

### 2.2 额度准入链路

1. **采样**
   - 核心每 30 分钟主动查一次额度（`quotaFresh = quotaQueryFloor = quotaErrorTTL = 30m`，`server/internal/account/quota.go:40-46`），经容器的 `/admin/usage`（`engine/usage.go:208-282`）读 Anthropic 的 OAuth usage 接口。
   - ccgateway manifest 没有声明 `quota.headers`，所以**没有被动采样**；`ApplyAccountQuotaObservation` 也不更新 `updated_at`（`store/account_quota.go:165-181`）。
   - 快照新鲜度完全取决于主动查询。
2. **准入**
   - 插件 `evaluateQuotaAvailability`（`availability.go:53-149`）的判定规则：
     - 已知 rejected 的窗口直接返回 UNAVAILABLE；
     - 快照过期（`now - updated >= 30m`）、查询失败、allowed 窗口的 reset 时间已过、缺少 5h 窗口，都返回 UNKNOWN。
   - 核心把 UNKNOWN 当作硬拦截（`gateway/availability.go:170-182`，返回 503 `model_availability_unavailable`），粘性绑定也一并失效（§44.7）。
3. **调度时间**
   - 插件建议的下次查询时间是 reset+1s（`quota.go:459-470`）。
   - 核心 `quotaNextCheck` 把它钳到“上次查询 + 30 分钟”之后（`quota_refresh.go:83-98`）。
   - 租约的 `last_active_at` 也有 30 分钟下限（`store/account_quota.go:233-246`）。
   - 后台扫描每 5 秒一次，每批最多 64 个账号、并发 4（`quota_refresh.go:193-317`）。

### 2.3 错误分类（`classify.go`）

| 情况 | 插件判定 | 核心实际效果 |
|---|---|---|
| 带 `x-ccgateway-error-scope: request` | 原样返回客户端，`LocalFailure` | 不影响账号 |
| `code == 0`（传输错误） | 冷却 10 秒，返回客户端 502 | |
| 400 余额不足 | `DISABLE` | §42 起插件不能直接停用账号：未命中管理员规则时改为冷却 60 秒（`dispatch.go:770-784`） |
| 401 / 403 | `DISABLE` | 同上 |
| 429 | 消息为 `Gateway concurrency limit reached` 时判为本地失败；CLI 原生 Fable/Sonnet 专属额度只换号不冷却；其他按 rate-limit 头算冷却时间，managed 账号额外附自动禁用并带解除时间 | |
| 529 | 冷却 30 秒 | |
| 408 / 5xx | 冷却 10 秒 | |
| 其他 4xx | 原样返回客户端 | |

### 2.4 口径一致性

核心 `server/internal/ccgateway/usage.go` 和 engine `usage.go` 是同一条**额度查询**链路：engine 原样转发 Anthropic 的 JSON，插件 `parseUsage` 统一解析，两边口径一致。

token 计费走 `sdk/platforms/anthropic.json` 的 usage 规则（含 `cache_creation.ephemeral_1h_input_tokens` 和 `server_tool_use.web_search_requests` 等），engine `tool_search_usage.go` 负责合并隐藏搜索调用的用量。这部分只做了抽查，见第 7 节。

## 3. 发现表

| ID | 严重度 | 置信度 | 标题 |
|---|---|---|---|
| F-01 | P1 | 确认 | allowed 窗口重置后，账号被准入拦截最长约 30 分钟（插件的 reset+1 建议被核心 30 分钟下限钳掉） |
| F-02 | P1 | 确认 | 一次额度查询瞬时失败，账号至少 30 分钟不可调度 |
| F-03 | P2 | 确认 | 快照有效期正好等于查询周期：每 30 分钟每个账号都有一段 UNKNOWN 空窗，粘性会话被打断 |
| F-04 | P2 | 很可能 | 老账号（`auto_models` 为 NULL）任意一次 PATCH（启停开关、行内改优先级）都会把自定义或“全部模型”列表覆盖成内置 11 个 |
| F-05 | P2 | 确认 | 自动模式下映射的请求模型永远不在列表里，映射别名不可调度 |
| F-06 | P2 | 确认 | 模型测试的“移除失败模型”在自动模式下被静默还原，界面却提示已移除 |
| F-07 | P2 | 确认 | 自动列表不随插件或 CLI 升级刷新；编辑器展示的新预设和数据库实际列表不一致 |
| F-08 | P2 | 很可能 | 内置列表缺 `claude-haiku-5-5` 和短名 `claude-haiku-4-5`，自动模式下用户也无法补上 |
| F-09 | P2 | 很可能 | 订阅类型没有后台刷新；降级后自动列表仍含 Fable，Pro 账号请求 Fable 的 403 被当作“凭证被拒”，冷却或禁用整个账号 |
| F-10 | P2 | 很可能 | `43d576838` 后，在不支持配额的存储上**重新授权**和新建草稿都会 503（README 只提到“新建账号”） |
| F-11 | P2 | 存疑 | Worker 内存从 2 GiB 降到 1 GiB，而 Worker 允许 4 个 CLI 进程并发，没有容量依据 |
| F-12 | P3 | 存疑 | team / enterprise / 未知订阅一律给全量列表（含 Fable） |
| F-13 | P3 | 很可能 | PATCH 和 `SubscriptionChanged` 并发时，PATCH 会用旧订阅算出的列表覆盖刚重算的结果 |
| F-14 | P3 | 确认 | `SubscriptionChanged` 失败或遇到冲突后不重试，订阅值已记录，后续不会再次触发 |
| F-15 | P3 | 存疑 | 529 冷却整个账号 30 秒；全局过载时会连锁冷却整组账号 |
| F-16 | P3 | 确认 | 本地并发满靠比对错误消息文字识别；所有 403 的原因文字都写成“凭证被拒” |
| F-17 | P3 | 确认 | `POST /system/ccgateway/connect` 提交的 `models` 被自动模式静默覆盖（接口仍在，控制台已不再调用） |

## 4. 发现详述

### F-01 P1 允许窗口重置后，账号被拦截最长约 30 分钟（确认，已复现）

**证据**

- `next/plugins/ccgateway/internal/ccgateway/availability.go:143-145`：allowed 窗口的 `resets_at <= now` 时返回 `quota_reset_unconfirmed:<key>`，状态为 UNKNOWN。
- `next/plugins/ccgateway/internal/ccgateway/quota.go:459-470`：插件建议下次查询时间为 `reset+1s`。
- `next/server/internal/account/quota_refresh.go:91-93`：`next.Before(now.Add(quotaQueryFloor))` 时改成 `now+30m`。
- `next/server/internal/account/quota.go:46`：`quotaQueryFloor = quotaFresh`（30 分钟）。
- `next/server/internal/store/account_quota.go:238`：租约同样要求 `last_active_at <= now-30m`。
- `next/server/internal/gateway/availability.go:170-182`：UNKNOWN 视为不可用，从候选里剔除；全部被剔除时返回 503。
- 引入提交：`8ecd46996`（查询下限从 30 秒改成 30 分钟，插件新鲜度从 3 分钟改成 30 分钟）。

**复现**

设 T 时刻查询，5h 窗口 allowed，T+10m 重置：

- 插件建议的下次查询时间是 T+10m1s，但核心 `quotaNextCheck` 返回 T+30m。
- 准入结果：T+9m 可用；T+10m2s 到 T+29m 都是 `UNKNOWN quota_reset_unconfirmed:5h`；T+30m 起变成 `quota_stale`。

**触发条件**

只要账号在用，5h 窗口每次重置都会触发（7d、7d_sonnet、7d_fable 的重置对相应模型同理）。

**影响**

- 每个活跃账号每 5 小时有平均约 15 分钟、最长约 30 分钟被硬拦截。
- 单账号分组会直接给客户端返回 503 `model availability could not be verified`。
- 多账号分组的容量下降，粘性会话被迫换号，提示缓存失效。

**修复建议（任选其一）**

- 核心允许插件给出的 reset 后复查时间低于 30 分钟下限：只针对“窗口刚重置”的建议，用插件建议的时间，或下限改为 30 秒。
- 或者插件改为：allowed 窗口过了 reset 时间后视为已恢复，返回 AVAILABLE，只保留 rejected 窗口的“必须确认”语义。CONTRACTS §44.7 里“仅到达 reset 不能清除已知耗尽事实”说的是 rejected 窗口，并没有要求 allowed 窗口也拦截。

### F-02 P1 一次瞬时查询失败，账号至少 30 分钟不可调度（确认，已复现）

**证据**

- `availability.go:123-126`：`snapshot.Error != ""`（`token_expired` 除外）时返回 `quota_refresh_failed`，状态 UNKNOWN。即使快照只有 1 分钟老，也照样拦截（临时测试结果为 `UNKNOWN quota_refresh_failed`）。
- `server/internal/account/quota_refresh.go:84-85`：失败后重试间隔是 `min(30m × 2^n, 30m)`，第一次失败就要等 30 分钟（临时测试结果为 T+30m）。
- `store/account_quota.go:270-290`：失败时保留 windows 和 `updated_at`，只写入 error。
- 可能的失败来源：
  - `engine/usage.go:247-273`：容器出口和代理抖动、usage 接口 429/5xx 都回 502 `upstream_error`；
  - 插件 `quota.go:309-314`：409“运行时未同步”、`usage runtime returned 502`；
  - 核心 `quota.go:288-291`：运行时不可达。

**影响**

代理一次抖动，或 usage 接口限流一次，账号就停摆 30 分钟，没有任何自动恢复，只能等下一轮查询或管理员手动强制刷新。多个账号共用同一出口时，可能整组同时失效。

**修复建议**

- 瞬时失败不要清除准入：上次成功快照仍在有效期内（或稍有过期）且没有 rejected 窗口时，保持 AVAILABLE。
- 失败重试改回短退避（例如 1、2、4 分钟），不要和 30 分钟正常周期共用一个常量。

### F-03 P2 快照有效期正好等于查询周期（确认）

**证据**

- `availability.go:127`：`now - updated >= quotaRefresh(30m)` 时为 stale。
- `quota.go:203`：插件的 `quotaRefresh = 30m`，注释写的是“与核心查询周期对齐”。
- 核心 `next_check_at` 约等于 `完成时间 + 30m`（`quota_refresh.go:182`、`:87-97`）。

**时间线**

- 快照 T+30m 过期。
- 后台扫描最晚 5 秒后才领到租约（`quotaFlushTick`），每批最多 64 个账号、并发 4、还要 `wg.Wait()`，然后再走容器 → 代理 → Anthropic。
- 查询完成前，账号一直是 UNKNOWN。

**影响**

- 每个账号每 30 分钟有几秒到几十秒的硬拦截，账号越多越长。
- 核心重启或插件版本变化后，所有账号的 `next_check_at=now`，几乎同时过期，会出现整组同时不可用。
- 粘性绑定被打断。

**修复建议**：插件有效期设为“查询周期 + 宽限”（例如 35 到 40 分钟），或者核心提前若干分钟发起查询。

### F-04 P2 老账号任意 PATCH 都会被覆盖成内置列表（很可能）

**证据**

- `next/server/internal/migrations/0055_account_auto_models.sql`：只有 `ADD COLUMN auto_models boolean`，没有回填，老账号都是 NULL。
- `models.go:33-45`：NULL 按自动处理，总是返回补丁。
- `server/internal/account/handlers.go:1186-1207`：任何 PATCH 都调用 `before_update`，补丁和当前列表不同就写入 `in.Models`。
- `account/auto_models_test.go:62-71`：只改名称的 PATCH 也把 `['claude-fable-5']` 覆盖成了插件列表。这是设计意图，测试也明确断言了这个行为。
- 前端只改单个字段的 PATCH：
  - `web/src/views/accounts/AccountsView.vue:447`（启用/停用开关）；
  - `web/src/views/accounts/AccountSchedulingCell.vue:25`（行内改优先级、权重）。

**触发条件**

0.1.69 之前建的账号，模型列表和当前内置列表不同（手工维护过、从模型测试里删过、加过映射别名，或为空表示“全部模型”）。管理员只是在列表页切一下启停，或改一下优先级。

**影响**

- 用户配置被静默改写。
- 空列表（全部模型）会被收窄成 11 个，之前能用的模型（如 `claude-haiku-4-5`、`claude-opus-4-5`）随即变成“没有可用账号”。
- 审计里只有一条 `plugin_changed: ["models"]`，用户很难察觉。

**修复建议**

- 迁移回填：`models` 不等于当时的内置列表（含空列表）的行设为 `auto_models=false`。
- 或者只在 `changed_fields` 含 `models`、`auto_models`，或订阅变化时才应用自动补丁。

### F-05 P2 自动模式下映射别名不可调度（确认，已复现）

**证据**

- `core/ports_identity.go:119-131`：`ServesModel` 用映射前的客户端模型做精确匹配。
- `gateway/model_references.go:112-126`：候选账号必须 `ServesModel(c.model)`。
- `models.go:44`：自动列表里只有内置模型，不含 `ModelMapping` 的键。临时测试：映射 `claude-haiku-4-5 → claude-haiku-4-5-20251001` 后，自动列表不含 `claude-haiku-4-5`。
- 前端：`AccountEditor.vue:157-163` 拦下 `ModelMappingEditor` 的 `@add-models`，只弹提示；映射本身照样保存（`AccountEditor.vue:809`）。CONTRACTS §59.5 写的是“模型映射不受开关影响”。

**影响**：用户在自动模式下配的映射别名（例如 cc-switch 等客户端用的短名）全部无效，请求直接 503 `no_available_account`。界面看不出原因。

**修复建议**：插件在自动模式下把 `properties.ModelMapping` 的键并入返回列表。另外，`refreshAutoModels` 也带上映射（它已经传了 snapshot）。

### F-06 P2 “移除失败模型”在自动模式下被静默还原（确认）

**证据**

- `web/src/views/accounts/AccountModelTest.vue:69`：`removable` 没有判断 `auto_models`。
- `web/src/views/accounts/AccountModelTest.vue:176-201`：只提交 `{models: next}`，成功后提示 `modelTest.removed` 并在本地删掉这些行。
- 后端在自动模式下 `before_update` 返回完整内置列表，`handlers.go:1197-1206` 用它覆盖了 `in.Models`。

**影响**：用户以为把账号上不支持的模型删掉了，实际调度照旧，失败照旧发生。

**修复建议**：`auto_models !== false` 时隐藏这个按钮，或者确认后同时提交 `auto_models: false`。

### F-07 P2 自动列表不随插件或 CLI 升级刷新（确认）

**证据**

- 生产代码里 `before_update` 只有两处调用：`handlers.go:1189`（用户保存）和 `account_patch.go:90`（订阅变化）。插件升级、CLI 升级、manifest 换代都不会触发重算。
- `AccountEditor.vue:433`：自动账号的编辑器直接 `applyDefaults(at)`，展示的是**新 manifest** 的预设，而不是数据库里的 `a.models`。

**影响**

- 新版插件新增模型后，老的自动账号要等有人保存一次才会生效。
- 在此之前，界面显示“已含新模型”，调度却不认，排查起来很费劲。
- 这和“自动模式拥有列表”的承诺不符。

**修复建议**

- 插件代次变化时，后台对 `auto_models IS NOT FALSE` 的账号跑一遍 `refreshAutoModels`。
- 或者自动模式下调度时实时计算列表，数据库只存手动列表。
- 编辑器至少展示数据库里的实际列表，和预设不同时给出提示。

### F-08 P2 内置列表缺 `claude-haiku-5-5` 和短名 `claude-haiku-4-5`（很可能）

**证据**

- `models.go:12-16`：11 个模型里包括 5.5 代的 `claude-opus-5-5`、`claude-sonnet-5-5`、`claude-fable-5-1`，唯独没有 `claude-haiku-5-5`。
- CLI 2.1.304 二进制（`companions/cli-mods/release/2.1.304/claude`）：
  - 模型目录里有 `{ id: "claude-haiku-5-5", family: "haiku", display_name: "Haiku 5.5" ... }`；
  - 5.5 代别名表里写着 `haiku: { default: "claude-haiku-5-5", per_provider: { ..., gateway: "claude-haiku-4-5" } }`；
  - 当前在用的别名表 `provider_alias_targets` 里 haiku 默认是 `claude-haiku-4-5-20251001`。
- `cli-mods/test/fixtures/official-request-2.1.304.json`：官方请求的系统提示词列出了 “Haiku 5.5: 'claude-haiku-5-5'”。
- 短名 `claude-haiku-4-5` 在 2026-10-15 验收时已经踩过坑（`af365a8de`，ENVIRONMENT-RUNBOOK）。

**影响**

- 用户 `/model claude-haiku-5-5`，或者 CLI 的 5.5 别名表上线后，后台小模型请求会在所有自动账号上 503。
- 自动模式又禁止用户自己补上（F-05/F-06 同一根因）。

**修复建议**：核实上游对订阅账号是否提供 `claude-haiku-5-5`，如果提供就加入 `DefaultModels`。同时考虑加入 `claude-haiku-4-5` 等常用短名，或者给出短名到带日期 ID 的预设映射并入列表（参照 volcengine 的做法，§41.4）。

**置信度**：列表和 CLI 目录不一致是确认的；上游是否可用存疑。

### F-09 P2 订阅降级后自动列表仍含 Fable（很可能）

**证据**

- 订阅类型只在三处写入：`ccgateway/accounts.go:737-750`（控制台 health）、`reauth.go:94`、`drafts.go:393`。没有后台探测。
- `classify.go:113-119`：所有 401/403 都返回 `DISABLE`，原因写成 “upstream rejected credentials (403)”。临时测试：403 “plan does not include access to this model” 也落进这个分支。
- `gateway/dispatch.go:770-784`：未命中管理员规则时冷却 60 秒；如果管理员配了 403 自动禁用规则，就会停用整个账号。
- 404/400 一律原样返回客户端，不换号（`classify.go:144-146`）。

**影响**：Max 订阅到期降成 Pro 后，没人打开凭证状态页，自动列表就一直含 Fable：

- Fable 请求打到这个账号，返回 403 时整账号冷却或被禁用，其他模型也受牵连；
- 返回 400/404 时不换号，同组的 Max 账号也帮不上。

**修复建议**

- 额度查询（每 30 分钟）顺带读取订阅类型（Worker `/admin/status` 是本地快照，很便宜），变化时触发 `SubscriptionChanged`。
- 对“模型不在套餐内”这类 403/400/404 单独分类：只换号，不冷却账号，或者记一条按模型生效的不可用事实。

### F-10 P2 卷配额要求导致重新授权失败（很可能）

**证据**

- `companions/controller/manager.py:358-386`：卷不存在时用 `driver_opts={'size': ...}` 创建；不支持配额时抛 `DiskQuotaUnavailable`，返回 503。
- `manager.py:660`：只有 `state is not None` 且是老状态时才允许 legacy。
- 重新授权的草稿是新的运行时 key（`d` 加 16 位十六进制，`docs/CCGATEWAY-REAUTH.md:20-35`），state 为 None，所以必须带配额。
- controller README（同一提交）写明当前主机是 ext4，探测结果为 `no quota support`，但部署前提只说“before deploying this controller for new account creation”。

**影响**：在存储迁移完成前部署这版 controller，不只新建账号，**已有账号的重新授权和刷新授权**也会 503，过期或被撤销的账号无法恢复。老账号的卷如果被清理过，重建时也一样。

**修复建议**：README 写明影响范围包括重新授权；或者给重新授权草稿提供明确的 legacy 选项，或允许管理员设开关、带告警降级。

### F-11 P2 Worker 内存 1 GiB 没有容量依据（存疑）

**证据**

- `manager.py:738`：`mem_limit` 从 `'2g'` 改成 `'1g'`。
- `engine/main.go:647` 和 `engine/runtime.go:160`：`Slots: make(chan struct{}, 4)`，每次请求启动一个 CLI 进程（Bun 编译的二进制约 150 MB）。
- 仓库里没有内存实测数据，提交说明里只有“163 个 controller 单测通过”。

**影响**：4 个请求并发，再加上长上下文或子代理时，可能触发 OOM kill，表现为 5xx 或连接断开，每次冷却 10 秒。容器替换后所有账号都会套用 1 GiB。

**修复建议**：上线前测 4 并发长对话的峰值 RSS；或者把内存上限和 Slots 一起设成可配置。

### F-12 P3 非 Pro 订阅都给全量列表（存疑）

`models.go:23-29`：只有 `pro` 去掉 Fable，`team`、`enterprise`、未知值都给 11 个（临时测试已确认）。Team 标准席位等是否包含 Fable 没有核实。

**建议**：明确 team 和 enterprise 的规则，并加测试锁定。

### F-13 P3 PATCH 和订阅重算的竞态（很可能，发生概率低）

- `handlers.go:1186-1190`：在锁外读取 `cur`、用旧订阅调用插件，事务内只按 `in.Models` 写入，没有校验 `updated_at` 或 `subscription_type`。
- `refreshAutoModels` 有 `updated_at` 守卫（`account_patch.go:110-111`），但 PATCH 晚提交时，会用旧订阅算出的列表覆盖新结果。

**建议**：事务内重读 `subscription_type`，如果和调用插件时的不一致，就重新调用插件或报冲突。

### F-14 P3 SubscriptionChanged 失败不重试（确认）

- `account_patch.go:67-71`：失败只记日志。
- `account_patch.go:107-114`：`updated_at` 冲突时返回 nil，不记任何信息。
- `accounts.go:745-748`：回调用的是控制台 GET 请求的 ctx，用户关掉页面就可能中断。订阅值已经写入，后续 `IS DISTINCT FROM` 不会再判为变化。

**建议**：放进后台任务或 outbox；或者每次查看 health 时，自动账号的列表和期望不一致就补算一次。

### F-15 P3 529 冷却整个账号（存疑）

- `classify.go:140-141`：529 是 Anthropic 的全局过载，并不是账号本身的问题，但每次尝试都会把当前账号冷却 30 秒。
- 过载期间，每个账号失败一次就冷却一次，整组很快全部冷却，客户端收到 503/429。

**建议**：529 只换号不冷却，或者只冷却 1 到 5 秒。

### F-16 P3 分类实现的脆弱点（确认）

- `classify.go:121`：本地并发满靠比对字符串 `"Gateway concurrency limit reached"` 识别。engine 侧（`main.go:118`、`request_command.go:301`）一旦改措辞，就会退化成整账号冷却加自动禁用。建议改用 `x-ccgateway-error-source: gateway` 之类的头标记。
- `classify.go:113-119`：所有 403 的原因都写成 “rejected credentials”，排查时容易误导（F-09）。
- 注释 “Cooldown defaults (ARCHITECTURE 15.1)” 和 DISABLE 的语义已经被 §42 改过（插件不能直接停用账号），注释没有同步更新。

### F-17 P3 connect 接口的 models 被覆盖（确认）

`server/internal/account/ccgateway.go:138-155`：组装 payload 时没有带 `auto_models`，`create` 随后被插件覆盖成内置列表。这和 CONTRACTS §41.5 的“两者都可增删”矛盾。控制台已经不再调用这个接口，但它仍对外暴露。

**建议**：带上 `auto_models`（传了 `models` 时设为 false），或者更新文档。

## 5. 测试覆盖评估

| 区域 | 已有测试 | 覆盖情况 | 缺口 |
|---|---|---|---|
| 插件 `models.go` | `models_test.go`（9 组用例 × 2 个阶段） | 自动、手动、Pro、Max、未知订阅、API Key 都覆盖 | 映射键（F-05）、team/enterprise、内置列表和 CLI 目录的一致性检查（F-08） |
| manifest 和 Go 列表一致性 | `manifest_test.go:76,141` | 良好 | 无 |
| 核心 `account_patch.go` | `auto_models_test.go`（PG） | 更新和订阅重算主路径都覆盖 | NULL 老账号被启停、行内改值覆盖（F-04）；并发竞态（F-13）；失败不重试（F-14）；插件升级后不重算（F-07） |
| 前端编辑器 | `AccountEditor.spec.ts:323-365` | 自动开关、只读、提交 `auto_models` | 自动模式下的映射别名提示 |
| 前端模型测试 | `AccountsView.spec.ts` | 结果行展示 | 自动模式下“移除失败模型”（F-06） |
| `availability.go` | 4 个表驱动测试 | 状态组合覆盖充分 | 和核心调度时间的联动（F-01/F-02/F-03）没有任何集成测试；测试把 `allowed reset elapsed → UNKNOWN` 和 `transient → UNKNOWN` 当作期望行为锁死了 |
| `quota.go` 解析 | 6 个测试 | 原始 JSON、`limits[]`、冲突、超大响应、失败分类都覆盖 | 缺 5h 窗口的响应（例如 enterprise）会导致永久 UNKNOWN，这个情况没有测试 |
| 核心 `quotaNextCheck` | `quota_refresh_test.go:649-655` | 测试**断言了**把 reset 建议钳到 30 分钟 | 把 F-01 当成了期望行为 |
| `classify.go` | `classify_test.go` 3 个、`scoped_quota_test.go` 4 个、`ccgateway_test.go` 4 个 | 429 专属额度、本地并发满、请求作用域、计费 400 | 401/403/529/5xx 只测了 action，没测 effect 和冷却时长；没测“模型不在套餐内” |
| controller 卷配额 | `test_manager.py` 新增约 99 行 | 未运行（Python，Linux 容器） | 重新授权草稿（F-10）；内存（F-11） |
| 整体 | 插件 `internal/ccgateway` 覆盖率 92.0% | 单元层面很好 | 跨模块时间线和前后端联动缺测试 |

## 6. 代码规范观察

- **重复声明**：`DefaultModels` 在 manifest 里写了两遍（managed 和 apikey），Go 里又写了一遍，靠测试保证一致，可以接受。Pro 预设的推导逻辑在 Go、manifest、前端 `useModelsEditor.ts:40` 各有一份，以后新增订阅规则要改三处。
- **import 分组**：`ccgateway.go:3-16` 把标准库的 `net/url`、`strings`、`time` 放在第三方包之后，不符合 goimports 分组；gofmt 不会报。
- **字符串协议**：`availability.go` 用 `strings.HasPrefix(snapshot.Error, "auth_rejected:")` / `"transient: token_expired:"` 解析核心拼出来的错误字符串，属于跨模块的隐式协议，建议在 proto 里加 `error_type` 和 `error_code` 字段。`classify.go:121` 的消息比对同理（F-16）。
- **常量耦合**：`quotaRefresh` 和 `quotaRetry` 是同一个值（`quota.go:203-204`）；核心 `quotaFresh`、`quotaErrorTTL`、`quotaQueryFloor` 三者也是同一个值（`server/internal/account/quota.go:40-46`）。语义不同的常量绑在一起，正是 F-01 到 F-03 的根源。
- **语义说明分散**：`models.go` 的 `subscriptionModels` 只靠一句注释说明“NULL 等于自动”，迁移 0055 的注释也一样，没有在任何地方讲清对老账号的影响（F-04）。
- **测试锁定了值得商榷的行为**：`availability_test.go` 的 “allowed reset elapsed”、“other transient failure”，以及核心 `quota_refresh_test.go:651` 的钳制断言。修 F-01/F-02 时需要同时改这些测试。

## 7. 未能验证的范围

- **上游真实行为**：没有调用真实 Anthropic，所以以下问题都未核实：
  - Pro 订阅请求 Fable、`claude-haiku-5-5`、1M 上下文 beta 时，上游返回什么状态码和错误体（影响 F-08、F-09 的严重度）；
  - Team/Enterprise 是否有 Fable、usage 接口是否总返回 `five_hour`；
  - `/api/oauth/usage` 的限流频率。
- **生产状态**：没有访问生产，不清楚线上老账号里有多少 `auto_models` 为 NULL 且自定义了列表或列表为空（F-04 的实际影响面），也不清楚线上 Docker 存储（F-10）和 Worker 峰值内存（F-11）。
- **未跑的测试**：需要 PG 的 `next/server` 测试（如 `auto_models_test.go`、`quota_refresh_test.go` 的 PG 部分）、前端 vitest、controller 的 Python 测试都没有跑。
- **token 计费**：只确认了 `sdk/platforms/anthropic.json` 读取 `cache_creation.ephemeral_1h_input_tokens` 和 `server_tool_use.*`；engine `tool_search_usage.go` 合并隐藏搜索用量后，与核心 `exclusive` 语义（message_start 和 message_delta 字段覆盖）是否一致，没有逐条验证。建议由分层审核（02-layers）或计费专项复核。
- **CLI 别名**：2.1.304 二进制里有多张别名表（`provider_alias_targets` 和 5.5 代表），哪张在运行时生效（远程配置或实验开关）没有动态验证。
