# 优化审计 Round 2 — 04: sdk / tools / 平台类插件

日期: 2026-10-24
范围: `next/sdk`、`next/tools/sub2api-plugin`、`next/plugins/{anthropic,openai,gemini,claude-oauth,moderation,guard,growth,payment,relay,volcengine}`
不在范围: `next/plugins/ccgateway`、`next/server`
性质: 只读分析，未改任何代码
输入: `/d/tmp/gometrics/all.tsv`（行数 / 最深嵌套）、`/d/tmp/static/*.sc`、`/d/tmp/static/*.dead`
（CodeGraph/Serena/WarpGrep 本会话不可用，全部结论来自 Grep/Read/git）

---

## 0. 数据面

范围内共 **941 个函数 / 16784 行**；其中 **37 个函数最深嵌套 ≥ 4**、**43 个函数 ≥ 60 行**。
staticcheck 报 6 条（1 条 ST1016、1 条 U1000、1 条 SA4000、3 条测试内 U1000）；deadcode 报 408 条 SDK "unreachable"。

**关于 `sdk.dead` 的结论（先验后删）**：deadcode 以「模块」为分析单位，SDK 是被 server/tools 跨模块引用的库，因此绝大多数条目是假阳性。逐条核对后确认 **真正未被任何地方使用**的只有：

| 符号 | 结论 |
|---|---|
| `pluginsdk.BadRequest` | 0 处调用（payment/volcengine 各自造了同名包装） |
| `classify.TypeIn` / `MessageContains` / `CodePrefix` / `FirstReset` | 0 处调用（`Any`/`All`/`CodeIn`/`Status` 有在用） |
| `pkgsig.Digest` | 0 处调用（工具链用 `Sign`/`Verify`，摘要算在 Sign 内部） |
| `apikey.Anthropic` / `apikey.Gemini` 预设 | 0 处引用（anthropic/relay 内联了等价 Validator 却没接上，gemini 干脆不校验 key 形态） |
| `check.IconNames` / `IconSource` 系列 | 仅 `ui_test.go` 使用（属于供插件测试引用的导出，保留） |

`manifest.ReadQuotaHeaders` / `NormalizeQuotaStatus` / `ValidModelID` / `SupportsBillingType` / `check.Validate` / `check.Conflicts` 等均被 `server`、`tools` 或插件测试真实使用，**不可删**。

---

## 1. 热点一览（行数 / 嵌套 → 一句诊断）

### SDK

| 文件:行 | 函数 | 行/深 | 诊断 |
|---|---|---|---|
| `sdk/manifest/check/validate.go:1327` | `ui` | 135 / 4 | 4 类对象（sections/menus/pages/slots）串在一个函数里，各段互不依赖，可整段外提 |
| `sdk/manifest/check/validate.go:517` | `endpoint` | 113 / 2 | 顺序校验流水线，深度低；长度来自检查项多，可接受 |
| `sdk/pluginsdk/apikey/apikey.go:106` | `Spec.Validate` | 91 / 3 | 字段校验 + 归一化 + 序列化三段混写；且它已是唯一正解，却有三个插件另抄了一份（见 G1） |
| `sdk/manifest/check/validate.go:435` | `platforms` | 79 / 5 | endpoint 循环里再套冲突检测/所有权检测，嵌套全在「同名函数做两件事」 |
| `sdk/manifest/check/quota.go:21` | `quota` | 76 / 3 | quota/refresh/balance 三个 schema 的规则串在一起 |
| `sdk/pluginsdk/pluginsdktest/fakehost.go:285` | `Dial` | 75 / 4 | 双向 pipe + 收帧 + 错误传播写在同一个 goroutine 体里（测试基建） |
| `sdk/pluginsdk/pluginsdktest/harness.go:59` | `Start` | 74 / 1 | 线性启动序列，深度 1，长但直白 |
| `sdk/manifest/check/usage.go:136` | `usageSource` | 71 / 2 | usage.source 各取值的规则平铺，可分段 |
| `sdk/pluginsdk/serve.go:236` | `newRuntime` | 71 / 4 | manifest 解析、能力校验、key/version 覆盖三阶段串行；可拆 3 段 |
| `sdk/manifest/check/validate.go:871` | `accountTypes` | 70 / 5 | 账户类型 + platforms 循环 + usage 规则三层嵌套 |
| `sdk/pluginsdk/execute.go:103` | `ExecuteDefault` | 56 / 4 | 任务/用量两条分支，是契约算法，**不建议拆** |
| `sdk/pluginsdk/lock.go:183` | `Lock.Keep` | 56 / 4 | 续约状态机，正确性优先，**不建议拆** |
| `sdk/pluginsdk/batch/batch.go:77` | `run` | 42 / 5 | select 内嵌 drain 循环，可把 flush/drain 提为方法 |
| `sdk/pluginsdk/http.go:33` | `Router.HandleHTTP` | 30 / 4 | 每次请求遍历全部路由做模式匹配，且匹配顺序取决于 map 迭代（不确定） |

### 插件

| 文件:行 | 函数 | 行/深 | 诊断 |
|---|---|---|---|
| `moderation/settings.go:111` | `DecodeSettings` | 152 / 5 | 网络/并发/封禁/保留四组配置在同一函数里逐字段 clamp |
| `payment/promo_service.go:77` | `ApplyPromoCode` | 108 / 2 | 锁行 → 校验 → 入账 → 记账四段串行，长度来自段数 |
| `payment/order_service.go:50` | `CreateOrder` | 94 / 1 | 线性流水线；内含 `userEmail = user_%d@example.com` 占位 |
| `volcengine/videospec.go:350` | `readVideoSpec` | 93 / 4 | 「字段缺失 vs 被预算裁掉」三态 × 6 个字段，六个几乎相同的 else-if |
| `moderation/hook.go:65` | `OnGatewayRequest` | 92 / 2 | 前置条件链 + observe/enforce 两种模式混写 |
| `payment/redeem_service.go:117` | `RedeemCode` | 92 / 2 | 与 ApplyPromoCode 同构，两处维护同一套事务流程 |
| `guard/rules.go:211` | `putRules` | 90 / 4 | 事务里再写 upsert 循环 + 存在性二次查询 |
| `moderation/routes.go:124` | `getOverview` | 87 / 2 | 4 条独立聚合查询 + 两次手工补桶，全部平铺 |
| `growth/plugin.go:260` | `recordCommission` | 86 / 2 | 同一个 `SUM(commission)` 查询写了两遍（299、314 行） |
| `guard/stats.go:126` | `getStats` | 83 / 2 | 窗口解析 / 趋势 / top 三段串在一个 handler |
| `moderation/routes.go:264` | `eventFilter` | 74 / 3 | enum/int/time 三类参数解析各写一遍 `arg()` 拼接 |
| `openai/platform.go:88` | `ValidateCredentials` | 74 / 3 | `apikey.Spec.Validate` 的手抄本（仅错误码不同） |
| `volcengine/videospec.go:595` | `estimateVideo` | 74 / 3 | 分辨率 × 帧数 × 策略的笛卡尔积展开 |
| `relay/relay.go:134` | `ValidateCredentials` | 73 / 3 | 同上，外加本地 `decodeObject/lookup/normalizeBaseURL/validAPIKey` 四个私有副本 |
| `claude-oauth/balance.go:38` | `ParseBalanceResponse` | 71 / 1 | 线性映射，尚可 |
| `anthropic/platform.go:165` | `ValidateCredentials` | 70 / 3 | 同上，且 `spec.KeyValidator` 与本地 `validAPIKey` 并存（前者从未生效） |
| `volcengine/routes.go:392` | `createGroup` | 69 / 2 | 上游创建 + 索引写入 + 补偿，与 `createAsset`(67/2) 两份镜像 |
| `claude-oauth/main.go:121` | `ClassifyError` | 55 / 4 | 手写分类，未复用 `providers/anthropic.Policy`，retry-after 只认秒数 |
| `guard/app.go:40` | `OnEvents` | 46 / 5 | 事务 → 事件循环 → 幂等插入 → 计数器更新四层 |

---

## 2. 跨插件重复清单（抽象/复用/解耦的主要收益）

| 重复内容 | 出现位置 | 体量 |
|---|---|---|
| 凭证解析 + 校验 + 归一化（`decodeObject`/`lookup`/`normalizeBaseURL`/`validAPIKey`/`ValidateCredentials`） | `anthropic/platform.go:104-234`、`relay/relay.go:72-206`、`openai/platform.go:87-161` | ≈340 行，SDK 已有等价实现 `apikey.Spec.Validate` |
| `Fields["model"]` 覆盖 `meta.model` 的 JSON 解码 | anthropic:288、openai:208、relay:255、volcengine:437 | 4 份同构 |
| `BuildModelsRequest`（GET base+path、删 `content-type`、`IdsPath`） | anthropic:334、openai:261、gemini:163、relay:298 | 4 份同构 |
| Anthropic 风格请求头（`x-api-key` + `anthropic-version` + `content-type`） | anthropic:250、relay:223、volcengine:416(anthropic 分支)、claude-oauth:102/204/28/quota:105 | 5 份 |
| 协议 id 字面量 `"anthropic.messages"` / `"anthropic.count_tokens"` | anthropic:29、relay:31、volcengine:70、claude-oauth:105、`providers/volcengine:31`（值还写错了） | 5 处 |
| `2023-06-01` 与 `oauth-2025-04-20` | anthropic、relay、volcengine、claude-oauth ×3 | 7 处 |
| 一次性测试请求体（`model/max_tokens/messages:[{user,ping}]`） | anthropic:318、openai:245、relay:283、volcengine:508、claude-oauth:198 | 5 份 |
| `truncateRunes` / `truncateBytes` | `guard/rules.go:144`、`moderation/settings.go:406/415` | SDK `textutil` 已有，0 处引用 |
| `fieldString`（JSON 字符串解包） | `guard/hook.go:43`、`moderation/extract.go:188` | 2 份，语义不同（一个回落原文，一个回落空串）→ 需显式参数 |
| `p.db()`（host.DB + 前缀包装） | growth:87、guard:193、moderation:195、payment:78、volcengine:217（变体） | 4.5 份 |
| `unavailable` / `badRequest` / `notFound` / `jsonResponse` 包装 | growth:40、volcengine:71-82、payment:486，另 27 处内联 error envelope | SDK `ErrorResponse`/`Unavailable`/`BadRequest` 已有 |
| 分页列表（count + 条件分支 + 两次拼 SQL） | `payment/redeem_service.go:211`、`payment/promo_service.go:187` | ≈68 行 ×2 |

---

## 3. 优先级计划

每项格式：**目标 / 具体改动 / 行为变化 / 测试 / 风险**。
优先级：P0 = 有明显复用收益或不改会继续发酵；P1 = 结构性收益；P2 = 清理与一致化。

### 阶段 A：SDK 新增能力（下面所有插件项的前置）

**G1 — 让 `apikey.Spec` 成为凭证校验的唯一定义（P0，收益最大）**
- 目标：`anthropic`、`relay`、`openai` 三个 `ValidateCredentials` 收敛到 `apikey.Spec.Validate`，删除三份私有副本（≈340 行）。
- 具体改动：
  1. `anthropic.spec` 补 `AccountType: AccountTypeAPIKey`（现在是零值 `""`，这正是它无法调用 `Spec.Validate` 的原因）；
  2. 三个插件改为 `return spec.Validate(in), nil`；
  3. 删除各自的 `decodeObject`/`lookup`/`normalizeBaseURL`/`validAPIKey`；
  4. **KeyValidator 去留要显式决定**：anthropic 声明的 `sk-ant-`+min20、relay 声明的 `sk-relay-`+min20 目前**从未生效**（`ValidateCredentials` 手写、`FromAccount` 不校验），现有测试用的 key（`sk-ant-x1234567` 15 字符、`sk-relay-abcdef` 15 字符）都过不了 min20。建议本项**先设 `KeyValidator: nil`**（回落 8-512 printable，与今日行为逐字一致），把「是否收紧前缀校验」留作单独的产品决定；
  5. `apikey.Anthropic`/`apikey.Gemini` 预设若决定不接，删除，避免下次又有人以为它在生效。
- 行为变化：anthropic/relay 无变化（若按 4 执行）；openai 有两处**控制台可见**的文案/错误码变化：非字符串 api_key 由 `pattern`/`API key must be a string` 变为 `type`/`api_key must be a string`；`account_type` 错误文案从带 `%q` 变为通用文案。relay 的「两个字段都错」场景错误顺序由 `[base_url, api_key]` 变为 `[api_key, base_url]`。
- 测试：三个插件的 `TestValidateCredentials` 表驱动全部保留；relay 需调整 `wantFields` 顺序；openai 若在意错误码需单独固定；`next/sdk/pluginsdk/apikey` 已有单测作为契约。
- 风险：低（纯收敛），唯一实质风险是「有人依赖旧错误码/文案」；relay 的顺序变化要写进 commit message。

**G2 — 拆 `apikey.Spec.Validate`（P1）**
- 目标：91 行 / 嵌套 3 → `validateKey`、`validateBaseURL`、`rewriteObject` 三个 <30 行函数。
- 具体改动：`normalize` 闭包提为 `rewriteObject(obj, key, baseURL) string`；错误拼接保持原样。
- 行为变化：无。
- 测试：`apikey_test.go` 不动即通过（回归护栏）。
- 风险：低。

**G3 — 新增 `apikey.ModelListRequest`（P1）**
- 目标：替换 anthropic/openai/gemini/relay 四份 `BuildModelsRequest`（含 `delete(h,"content-type")`）。
- 具体改动：`apikey.ModelListRequest(cfg *Config, path, idsPath, stripPrefix string, headers map[string]string) *pluginv1.BuildModelsRequestResponse`；URL 拼接仍由各插件给（`?limit=1000` / `?pageSize=1000` 不同）。
- 行为变化：无（逐字段等价）。
- 测试：四个插件现有 `BuildModelsRequest` 测试（anthropic/openai/gemini/relay）逐一跑通。
- 风险：低。

**G4 — 新增 `pluginsdk.RequestModel(in)`（P1）**
- 目标：一处实现「`Fields["model"]` 覆盖 `meta.model`」，替换 4 份。
- 具体改动：放 `pluginsdk/execute.go` 旁（或 `apikey`），签名 `func RequestModel(in *pluginv1.BuildUpstreamRequestRequest) string`；volcengine 的 `requestModel` 直接删。
- 行为变化：无。
- 测试：anthropic/openai/relay/volcengine 的 BuildUpstreamRequest 测试。
- 风险：低。

**G5 — `providers/anthropic` 收口 Anthropic 请求面（P1）**
- 目标：协议常量 + 头构造 + 路径映射三件套集中。
- 具体改动：
  1. 在 `sdk/pluginsdk/providers/anthropic` 增 `ProtocolMessages`/`ProtocolCountTokens`/`DefaultAPIVersion`（值 `anthropic.messages` / `anthropic.count_tokens` / `2023-06-01`）；
  2. 增 `Headers(apiKey string, inbound map[string]string, forward []string, defaultVersion string) map[string]string`（x-api-key + 版本回落 + content-type + 白名单转发）；
  3. 增 `Path(protocol string) (string, error)`（`/v1/messages`、`/v1/messages/count_tokens`）。
- 行为变化：无（注意 relay 的白名单是 `PassHeaders`，anthropic 是 `forwardHeaders`，作为参数传入即可）。
- 测试：anthropic/relay/volcengine 的头与路径测试；`prefix_test.go` 的 `upstreamHeaders(ProtocolMessages,…)` 断言。
- 风险：中低——claude-oauth 的 `MessagesURL` 是全量 URL 而非 base+path，本项**只接** anthropic/relay/volcengine，claude-oauth 见 G7。

**G6 — 修正 `providers/volcengine` 的协议常量（P0，隐性 bug）**
- 目标：`ProtocolMessages = "anthropic-messages"`、`ProtocolCountTokens = "anthropic-count-tokens"` 与真实协议 id `anthropic.messages` 不一致。
- 具体改动：改为引用 G5 的常量。当前 `volcengine/classify.go:13` 的 `protocol == volcengine.ProtocolMessages` **永远为假**，`PolicyAnthropic` 从未生效——Ark 的 Anthropic 面错误一直在用 OpenAI 错误词表（`server_error` 而非 `api_error`、404 被折叠成 `invalid_request_error`）。
- 行为变化：**有**，且是修复：Anthropic 面的 404/5xx 分类会变正确。
- 测试：新增 `TestClassifyErrorAnthropicSurface`，构造 `RequestMeta{Protocol: "anthropic.messages"}` + 404/5xx/429 三个断言走 `PolicyAnthropic`；现有 `TestClassifyError` 不改（它不设 Meta.protocol，正好保持 OpenAI 面覆盖）。
- 风险：行为变化需在发布说明里点名；建议单独一个 commit。

**G7 — claude-oauth 改用共享分类策略（P1）**
- 目标：删 55 行手写 `ClassifyError`，改用 `providers/anthropic.Policy`（可用 `Policy.With(...)` 追加 OAuth 专属规则）。
- 具体改动：`return anthropic.Policy.With(<oauth 规则>).Classify(p.now(), in), nil`；`p.now` 需注入（现在用 `time.Now()`，导致该函数不可测）；`retry-after` 交给 `classify.RetryAfter`（支持 `retry-after-ms`、HTTP-date、clamp），删掉「只把字符串当秒数」的简化实现。
- 行为变化：**有**——429 的冷却会按真实 reset 计算并被 clamp 到 7 天；`ClientErrorType`/`ClientMessage` 会被填上（此前为空，核心走原样透传）；5xx/529 会冷却。这是期望行为，但属于客户端可见变化。
- 测试：`main_test.go` 现有 ClassifyError 用例重写为策略预期；新增 429 + `retry-after-ms` / 529 / HTML 403 三例。
- 风险：中——claude-oauth 是已发布插件（现 0.1.x），行为变化需按仓规同步 manifest 版本号并在发布说明里写清。

**G8 — claude-oauth 清理（P1）**
- 目标：`queryBalance`（staticcheck U1000，111 行）删除或降级为测试辅助；`bodySnippet` 与 `parseUsageTime` 与 `textutil` 对齐。
- 具体改动：删 `queryBalance`（无调用）；`bodySnippet` 保留语义但基于 `textutil.TruncateBytes`；`balance.go` 中重复的 `anthropic-version`/`oauth-2025-04-20` 改用常量。
- 行为变化：无。
- 测试：`balance_test.go`/`quota_test.go` 现有用例。
- 风险：低。

**G9 — 一次性测试请求体统一（P2）**
- 目标：5 份 `ping` 请求体。
- 具体改动：`pluginsdk/apikey`（或 `providers/*`）提供 `ChatPingBody(model string, maxTokens int) string` 与 `MessagesPingBody(model string, maxTokens int) string`。注意 volcengine 用 `max_tokens: 16`、claude-oauth 用 `"Hi"`/16，故只统一结构、参数仍由调用方给。
- 行为变化：无。
- 测试：各插件 `BuildTestRequest` 测试。
- 风险：低（其中 claude-oauth 的 `"Hi"` 若被改成 `ping` 属行为变化，本项不改它）。

**G10 — `textutil` 落地（P2）**
- 目标：SDK 已有 `textutil.TruncateRunes/TruncateBytes/Clip`，但除 `classify` 外 0 引用。
- 具体改动：删 guard/moderation 的 `truncateRunes`/`truncateBytes`，改调 `textutil`；`moderation.truncateText`（2/3 + 尾部省略）保留在插件内（语义特殊），或作为 `textutil.TruncateMiddle` 上移并加测试。
- 行为变化：无（moderation 的 `truncateRunes` 与 textutil 对 `n<=0` 处理略有差异，调用点均传正数）。
- 测试：`textutil` 现有表驱动 + moderation/guard 单测。
- 风险：低。

**G11 — 路由表预编译（P2，顺带修不确定性）**
- 目标：`Router.HandleHTTP` 现在每次请求遍历 `map` 全部路由，且**两个 pattern 同时命中时选谁取决于 map 迭代顺序**；同时它直接写回 `req.PathParams`。
- 具体改动：`Handle` 时把 `method → []{segments, handler}` 预编译为切片，按「字面量多者优先」排序；匹配时只扫同 method、同段数的项。
- 行为变化：**理论上有**——歧义路由的选择变确定（现有插件无歧义路由，故实际无变化）。
- 测试：`http_test.go` 增歧义用例（`/a/:id` 与 `/a/b`）锁定优先级。
- 风险：低。

**G12 — SDK 清理未用导出（P2）**
- 目标：`pluginsdk.BadRequest`、`classify.TypeIn/MessageContains/CodePrefix/FirstReset`、`pkgsig.Digest`。
- 具体改动：要么接线（`BadRequest` 建议在 G29 里被 payment/volcengine 用上），要么删除并在 SDK CHANGELOG 记一条（`apikey`、`classify` 是给第三方插件用的公共 API，删除需谨慎）。
- 行为变化：无。
- 测试：`go build ./...`（跨模块引用已核对为 0）。
- 风险：低。

**G13 — `manifest/check` 结构整理（P2）**
- 目标：`validate.go` 1493 行、`ui()` 135/4、`platforms()` 79/5、`accountTypes()` 70/5。
- 具体改动：`ui()` 拆 `uiSections/uiMenus/uiPages/uiSlots`；`platforms()` 把「端点冲突检测」提为 `v.endpointConflicts`；`accountTypes()` 把 `at.Platforms` 循环提为 `v.accountPlatform(...)`；`validate.go` 剩余部分按域机械分文件（platform / account / ui / routes）。**纯搬移，不改任何规则与 field 路径**。
- 行为变化：无（field 路径与 code 是契约，逐字保留）。
- 测试：`sdk/manifest/check` 全套（含 `check_test.go` 与各 `*_test.go`）；`tools/sub2api-plugin validate_test`；`next/plugins/*/manifest_test.go`（28 个测试用例都跑 `check.Validate`）。
- 风险：低（搬移量大，建议分 2-3 个 commit，纯 diff-move）。

**G14 — `serve.newRuntime` 拆分（P2）**
- 目标：71/4 → `parseManifest`、`resolveIdentity`（key/version 覆盖）、`resolveCapabilities`。
- 行为变化：无。
- 测试：`sdk_test.go`、`process_test.go`、各插件 `pluginsdktest` 启动。
- 风险：低。

**G15 — 测试基建整洁（P2）**
- 目标：`fakehost.go` ST1016（同一类型 25×`f` / 4×`h`）+ `Dial` 75/4；`harness.Start` 74 行。
- 具体改动：统一接收者名 `f`；`Dial` 拆 `dialAndOpen`、`pumpToHost`、`pumpFromHost`；`Start` 拆 `startHost`、`startPlugin`。
- 行为变化：无。
- 测试：所有用 `pluginsdktest` 的插件测试（这是它们的公共夹具，一次改动全插件受益）。
- 风险：低。

**G16 — `batch.run` 拆分（可选，P2）**
- 目标：42/5 的 select + 内层 drain。
- 具体改动：`flush()`、`drain(ctx)` 提为方法；`Stop` 里的 goroutine+timeout 保持不变。
- 行为变化：无。
- 测试：`batch_test.go`。
- 风险：低。

### 阶段 B：平台类插件（依赖 G1-G5）

**G17 — anthropic 收口（P0）**：`ValidateCredentials` → `spec.Validate`（G1）；`upstreamHeaders`/`endpointPath` → `providers/anthropic`（G5）；`BuildModelsRequest` → G3；`Fields["model"]` → G4。行为变化与测试见 G1/G3/G4/G5。风险低。
**G18 — openai 收口（P0）**：同上，另加 `upstreamHeaders` 的 `authorization` 头保留在本地（OpenAI 面不在 G5 范围）。行为变化见 G1。
**G19 — gemini 收口（P1）**：已用 `spec.Validate`，只需接 G3/G4 与 `NormalizeBaseURL`（`apikey` 已有）。行为变化无。
**G20 — relay 收口（P0）**：同 G17；另 `spec.RequireBaseURL` 已正确，`PassHeaders` 传入 G5 的 `Headers()`。行为变化见 G1。
**G21 — volcengine 协议常量 + 请求构造（P0）**：G6 修 bug；`decodeJSONObject`（assets.go:154）删掉改用 `apikey.DecodeObject`（已导出、逐字相同）；`requestModel` 删掉用 G4。行为变化见 G6。

### 阶段 C：扩展类插件

**G22 — moderation `DecodeSettings` 拆分（P0）**
- 目标：152/5 → `decodeNetwork`（mode/base_url/api_key/model/system_prompt/categories）、`decodeLimits`（max_turns…sample_rate）、`decodeBan`（ban_*）、`decodeStorage`（cache/retention/record/store）。
- 具体改动：把 `str/num/integer/boolean/strList/enum` 五个闭包移入一个 `decoder` 结构体作为方法（`settings.go` 内，不进 SDK —— 目前只有 moderation 用宽松解码，过早抽象成 SDK 包是负收益）。
- 行为变化：无（clamp 顺序不影响结果，各字段独立）。
- 测试：`unit_test.go:TestDecodeSettings` 已有，建议补表驱动：未知键、类型错、越界 clamp、null 文档。
- 风险：低。

**G23 — moderation `OnGatewayRequest` 拆分（P1）**：前置条件链提为 `gate(c, in) (allow, done bool)`；observe/enforce 各提为 `runObserve`/`runEnforce`（现在 enforce 段已相对独立）。`enforceDecision`/`finishRecord` 保持。行为变化无；测试 `hook_test.go` 448 行已覆盖。风险低。

**G24 — moderation 路由拆分（P1）**：`getOverview` 拆 `queryTotals/queryTrend/queryTopCategories/queryTopUsers` + `fillBuckets`；`eventFilter` 拆 `enumFilter/intFilter/timeFilter`（共用 `arg()`）。行为变化无；`routes` 相关测试保留。风险低。

**G25 — guard `putRules` / `getStats` / `OnEvents`（P1）**
- `putRules`：事务体抽 `replaceRules(ctx, tx, rules) error`，内部 `upsertRule` 处理「UPDATE → EXISTS → INSERT」三段（现在这三段就在循环里）；`LOCK TABLE` 保持原位置与原语义。
- `getStats`：抽 `statsWindow`（已有）/`trendPoints`/`topRules`。
- `OnEvents`：事件体抽 `applyEvent(ctx, tx, ev) (inserted bool, err error)`。
- 行为变化：无。测试：`guard_test.go`/`throttle_test.go`/`stats` 用例。风险低-中（`putRules` 有并发语义注释，搬移时把整段注释一起搬，不要改锁）。

**G26 — growth 修重复查询 + 错误处理（P0，兼修 bug）**
- 目标：`recordCommission` 里同一个 `SUM(commission)` 查询在 299 与 314 行各写一遍；`routes.go` 有 25 处忽略 `Scan` 返回值（`rows, _ := db.Query`、`rows.Scan(...)` 不判错）。
- 具体改动：一次 `SELECT COALESCE(SUM(commission),0)` 取 existing，剩余额度 = cap − existing，两处复用；`routes.go` 全量改 `pgx.CollectRows` + `QueryRow(...).Scan` 判错，错误统一 `unavailable(err)`。
- 行为变化：**有**——以前被静默吞掉的查询错误会变成 500/503。这是修复，但属于可观测变化。
- 测试：`plugin_test.go`（480 行）现有用例 + 新增「查询失败返回 503」用例（可用一个关掉的 pool）。
- 风险：中低（错误路径以前没被走过，需确认测试里的假 host 能注入失败）。

**G27 — payment 分页/事务去重（P1，注意 payment 目前暂停）**
- `ListCodes`/`ListPromoCodes`：抽 `listPaged[T](ctx, db, countSQL, listSQL, status, limit, offset)`（用泛型 + `pgx.CollectRows`），两处共用。
- `RedeemCode`/`ApplyPromoCode`：抽 `withLockedRow`（`BeginFunc` + `FOR UPDATE` + 「不存在/不可用」映射）；错误文案表要逐条保留（它们是客户端可见的）。
- 行为变化：无（错误文案逐字保留）。
- 测试：`plugin_test.go` 445 行。
- 风险：中——payment 按既定结论暂行不推广，本项只做**不改变语义**的抽取，且不碰 G28 之外的支付渠道逻辑。

**G28 — volcengine 索引资源泛型化（P1）**
- 目标：`getGroup`/`getAsset`、`updateGroup`/`updateAsset`、`createGroup`/`createAsset`、`store.go` 的 `refresh*/apply*`、`index_tx.go` 的 `withGroup`/`withAsset` 是成对镜像。
- 具体改动：定义 `indexResource`（表名 + 上游 Action 名 + `fromResult`/`refresh`/`applyUpdate` 三个函数），`withGroup`/`withAsset` 合为 `withResource(r, ctx, db, id, fn)`；`markMissing` 已按表名参数化，沿用。
- 行为变化：无（注意 asset 多 `group_id` 输出、group 多 `title` 字段，用 per-resource 的回调差异表达）。
- 测试：`routes_db_test.go`（690 行）、`index_concurrency_test.go`（行锁/补偿语义）。
- 风险：中——这是带审计要求（凭证一次/请求）的事务代码，抽取时**不得**把 `config()` 调用挪进循环。

**G29 — 插件侧 HTTP/DB 样板统一（P2）**
- 目标：`unavailable`/`badRequest`/`notFound`/`jsonResponse` 四处包装 + payment 27 处内联 error envelope。
- 具体改动：直接用 `pluginsdk.Unavailable/ErrorResponse/FieldErrorResponse`；payment 的 `jsonResponse` 若保留，应改为转发 `pluginsdk.JSONResponse` 的单行包装并保留 `(resp, error)` 签名（40 处调用点，机械替换）。`p.db()` 的 4.5 份保留（仅 7 行，且各自错误前缀不同，抽到 SDK 收益低于耦合成本）——**明确不动**。
- 行为变化：无。
- 测试：payment/growth/volcengine 路由测试。
- 风险：低。

**G30 — volcengine `readVideoSpec` 拆分（P2）**：六个字段的「absent / gone / parsed」三态合成一个 `readCandidates(field string, gone map[string]bool, normalize func(string) (T,bool)) []T`，六个 else-if 变六行调用。`estimateVideo` 保持（笛卡尔积展开本身清晰）。行为变化无；`videospec_test.go` 640 行是强护栏。风险低。

### 阶段 D：工具链

**G31 — `tools/sub2api-plugin` 结构整理（P2）**
- 目标：`dev.go` 682 行混了 flag 解析、构建、签名、进程编排、watch、文件系统。
- 具体改动：拆 `dev.go`（编排）、`dev_core.go`（resolveCore/start/stopCore/waitReady）、`dev_watch.go`（watch/fingerprint/skipWatchDir/nativeSource/copyTree）、`dev_pack.go`（packSource/devVersion/setManifestVersion/sign）；`fingerprint` 的 37/5 嵌套用一个 `walkFiles(root, fn)` 助手打平；`checkPackage`（80/4）拆 `checkForms/checkUI/checkDatabase/checkRuntimes`。
- 行为变化：无。
- 测试：`cli_test.go`/`dev_test.go`/`pack_collision_test.go`/`validate_test.go`/`images_test.go`。
- 风险：低（纯组织）。**签名路径（`sign.go`、`pkgsig`、`index.go` 的签名行格式）一律不动**，见第 4 节。

**G32 — 测试自身的小修（P2）**：`moderation/unit_test.go:309` 的 SA4000（`cacheKey("p1","t") != cacheKey("p1","t")` 恒假）删掉；`volcengine/manifest_test.go` 的 `usageDiff`/`keys`/`union` 未用函数删除；`assets.go:80` 的 `assetSpec` 未用变量删除。

---

## 4. 不要碰的东西

1. **manifest schema 与校验契约**：`next/sdk/manifest` 的类型、json tag、`manifest.APIVersion`；`manifest/check` 的 **field 路径与 code**（CONTRACTS §4 规定 host 原样渲染到 `details.fields`）；各插件 `manifest.json`、`forms/*.schema.json`（`api_key` 的 `minLength: 8 / maxLength: 512 / pattern: ^[!-~]+$` 与后端校验必须一致）、`defaultModels`、`guardedSettings`、`passHeaders`、`capabilities` 列表。G1 决定不收紧 KeyValidator，正是因为表单契约允许 8 字符任意可见字符的 key。
2. **签名与包格式**：`sdk/pkgsig`（`ManifestFile`/`SignatureFile`/摘要格式 `sub2api-plugin-digest-v1`）、`tools/sign.go`、`tools/keygen.go`、`tools/index.go` 的 `IndexSigPrefix`/索引 JSON 结构、`dev.go` 里 `SUB2API_PLUGIN_OFFICIAL_KEYS` 与 dev 版本号规则。已发布包必须仍能验签。
3. **已发布插件的外部行为**：各 `manifest.json` 的 `key`/`version`/`hostCompat`；anthropic/relay/volcengine 的 `ForwardHeaders()` 导出函数（只为 `manifest_test.go` 断言 `passHeaders` 一致而存在，删了等于放弃那道防漂移测试）；moderation 的 deny code / 默认封禁文案 / 分类 id；guard 的 `guard_blocked`、`rules.changed` topic、5 分钟告警冷却上限（`MaxLockTTL` 约束）；growth 的 ledger 幂等键格式（`commission:<type>:<id>`、`checkin:<uid>:<date>`）；payment 的错误文案与 `out_trade_no` 前缀；claude-oauth 的 OAuth 常量、作用域字符串、`refreshUserAgent`。
4. **wire 契约**：`BuildUpstreamRequest` 产出的 URL/方法/`UpstreamModel` 语义（核心已完成模型映射）、`UsageProtocol` 取值、`pluginv1` 生成代码（`sdk/gen/**`）、`protocol.ProtocolVersion`/`HostAPIVersion` 门槛。
5. **并发正确性代码**：`pluginsdk/lock.go`（`Keep` 续约状态机）、`egress/conn.go`（Close/CloseWrite 半关闭与 5 秒宽限）、`pluginsdk/batch`（drain-on-stop）、moderation 的 singleflight/KV 缓存语义、guard 的 `LOCK TABLE … SHARE ROW EXCLUSIVE` 与 volcengine 的 `withGroup/withAsset` 行锁顺序、volcengine 的「凭证每请求最多读一次」审计约束。它们难看但不是「抽象/复用」的对象。
6. **`p.db()` 这类 7 行小助手**：抽到 SDK 需要把错误前缀参数化，收益不抵耦合（已在 G29 显式列入「不动」）。

---

## 5. 执行顺序

**前置事实**：所有插件通过 `go.work` + `replace ... => ../../sdk` 使用本地 SDK，SDK 改动**只影响重新构建的插件二进制**，不会牵动线上已发布产物；因此「SDK 先行」没有发布耦合。

| 步 | 内容 | 门禁 |
|---|---|---|
| 1 | G2、G3、G4、G5（纯新增/内拆，无行为变化） | `sh .github/next-ci/next-check-module.sh next/sdk` |
| 2 | G6（volcengine 协议常量修复，独立 commit + 新测试） | `next/sdk` + `next/plugins/volcengine` |
| 3 | G1 + G17/G18/G20（anthropic/openai/relay 收口；同一 commit 内改插件，避免中途双实现） | 三个插件模块 + `next/sdk` |
| 4 | G19、G21（gemini、volcengine 接 G3/G4/`apikey.DecodeObject`） | gemini/volcengine |
| 5 | G7、G8（claude-oauth 分类策略 + 清理；**独立 PR**，涉及已发布插件行为变化与版本号） | claude-oauth；发布说明 |
| 6 | G10、G29（textutil + HTTP 包装一致化，跨插件机械改动，放一起减少冲突） | guard/moderation/growth/payment/volcengine |
| 7 | G22、G23、G24（moderation）、G25（guard）、G26（growth）、G27（payment） | 各模块；growth/payment/guard/moderation 的 PG 测试必须真跑（`TEST_DATABASE_URL` 或 `sdk/testpg` 常驻 PG，**不得静默跳过**） |
| 8 | G28、G30（volcengine 资源泛型 + videospec） | volcengine（`routes_db_test.go` 需 PG） |
| 9 | G11、G12、G13、G14、G15、G16（SDK 内部整理，纯搬移类优先） | `next/sdk`；G13 后跑全部 28 个 `manifest_test.go` |
| 10 | G9、G31、G32（工具链整理 + 测试小修） | `next/tools/sub2api-plugin`；`--no-test` 编译 e2e 不受影响 |

**每个模块的完成定义**：`gofmt -l`、`go vet ./...`、`go build ./...`、`go test ./...` 四条全绿（即 `next-check-module.sh`），且插件模块的 PG 测试确认执行而非跳过。

**建议的提交粒度**：G6 单独（行为修复）；G1/G17/G18/G20 合并成一个（同一抽象）；G7 单独（发布行为）；G28 单独（事务代码）；其余按「SDK 一组、每个插件一组」。

---

## 6. 处理结果（2026-10-24 执行）

范围与本文一致：`next/sdk`、`next/plugins/{anthropic,openai,gemini,claude-oauth,moderation,guard,growth,payment,relay,volcengine}`。`next/tools/sub2api-plugin` 与 `next/server`、`next/plugins/ccgateway` 未改动（G31 因此未做，见下）。

### 6.1 逐项结论

| 项 | 状态 | 内容 / 理由 | 行为变化 |
|---|---|---|---|
| G1 | **完成** | `apikey.Spec.Validate` 成为唯一实现，另加 `apikey.Texts`（`UnsupportedAccountType` / `KeyNotString` / `BaseURLRequired` / `BaseURLFormat`）保留各插件原有文案；anthropic/openai/relay 的 `ValidateCredentials` 均改为一行的 `spec.Validate(in)`，删除 `decodeObject`/`lookup`/`normalizeBaseURL`/`validAPIKey` 三份副本；`apikey.Anthropic`、`apikey.Gemini` 预设删除，`apikey.OpenAI` 注释说明为何只有它在用 | anthropic/relay 无变化；openai 非字符串 `api_key` 仍是 `pattern` + `API key must be a string`；relay「都缺」时错误顺序变为 `api_key, base_url`（测试已改） |
| G2 | **完成** | `Spec.Validate` 拆为 `validateKey` / `validateBaseURL` / `rewriteObject`，原 `normalize` 闭包外提 | 无 |
| G3 | **完成** | 新增 `apikey.ModelListRequest(cfg, path, idsPath, stripPrefix, headers)`；anthropic/openai/gemini/relay 四份 `BuildModelsRequest` 收敛（URL 与 `?limit`/`?pageSize` 仍由各插件给） | 无（逐字段等价，`content-type` 仍被删除） |
| G4 | **完成** | 新增 `pluginsdk.RequestModel(in)`（`pluginsdk/request.go`）；anthropic/openai/relay/volcengine 的 4 份内联逻辑删除，volcengine 的 `requestModel` 函数删除 | 无 |
| G5 | **完成** | `providers/anthropic` 增 `ProtocolMessages`/`ProtocolCountTokens`/`DefaultAPIVersion`/`Path()`/`Headers()`；anthropic 与 relay 改用（relay 传 `PassHeaders`） | 无 |
| G6 | **完成（修 bug）** | `providers/volcengine.ProtocolMessages/CountTokens` 改为引用 `providers/anthropic` 的常量；新增 `providers/volcengine/volcengine_test.go`（`TestAnthropicSurfaceProtocolIDs` 还断言与内置 anthropic 平台声明的协议一致）与 `plugins/volcengine/internal/volcengine/classify_test.go`（`TestClassifyErrorAnthropicSurface` 覆盖 404/500/503/429） | **有**：Ark Anthropic 面的错误分类改用 Anthropic 词表（404 → `not_found_error`，5xx → `api_error`） |
| G7 | **未做（本轮不取，原因是会改客户端可见行为）** | claude-oauth 的 `ClassifyError` 仍是手写分类（401 停用、429 冷却 60s、`invalid_request_error`/`authentication_error` 两个类型、其余 failover）。计划本身把它定为「独立 PR + 已发布插件版本号同步 + 发布说明」，本轮的执行约束是「只做保持 wire 行为不变的项」，故留待单独的发布 PR | 无（保持现状） |
| G8 | **完成（限清理部分）** | 删除未调用的 `queryBalance`；`bodySnippet` 改用 `textutil.TruncateBytes`；`balance.go`/`quota.go`/`main.go` 的 `2023-06-01`、`oauth-2025-04-20`、`anthropic.messages` 字面量改为 `AnthropicAPIVersion`/`OAuthBeta`/`anthropic.ProtocolMessages`。`parseUsageTime` **保留**：它接受的是 quota 端点自己的时间格式（含 `2006-01-02T15:04:05.000Z`），`textutil` 没有等价函数 | 无 |
| G9 | **完成** | 新增 `anthropic.MessagesPingBody(model, maxTokens)` 与 `openai.ChatPingBody(model, maxTokens)`；anthropic/relay/volcengine/openai 使用（claude-oauth 的 `"Hi"` 按计划不动） | 无 |
| G10 | **完成** | guard/moderation 的 `truncateRunes`/`truncateBytes` 删除，改调 `textutil` | 无 |
| G11 | **完成（含不确定性的修复）** | `Router.Handle` 预编译为「method → 按字面量数降序、pattern 文本升序」的切片，`HandleHTTP` 只扫同 method 的项，不再遍历 map；重复注册同一 method+path 仍是替换（与原 map 行为一致）而非留下两条。新增 `TestRouterPatternPriority`（20 轮断言 `/a/b` 恒胜 `/a/:id` 且参数路由仍可达）、`TestRouterOnlyTheMatchingMethod`、`TestRouterReregisterReplaces` | 理论上有（歧义路由的选择变确定）；现有插件无歧义路由，实际无变化 |
| G12 | **完成** | 删除 `classify.TypeIn`/`MessageContains`/`CodePrefix`/`FirstReset`、`apikey.Anthropic`/`Gemini`；`pluginsdk.BadRequest` 接线到 volcengine 的 `badRequest`。`pkgsig.Digest` **保留**：它是 `Sign`/`Verify` 的构成部分且是公开 API | 无 |
| G13 | **完成** | `ui()` 拆 `uiSections`/`uiMenus`/`uiPages`/`uiSlots`/`uiNative`，并搬进 `ui.go`；`platforms()` 的冲突检测提为 `endpointConflicts`；`accountTypes()` 的平台循环提为 `accountPlatform`；`validate.go` 按域分文件：`platforms_check.go`、`account_check.go`、`routes_check.go`（`validate.go` 1493 → 686 行）。纯搬移：全部声明逐一比对与原文件一致，field 路径与 code 未改 | 无 |
| G14 | **完成** | `newRuntime` 拆 `parseManifest` / `resolveIdentity` / `resolveCapabilities` | 无 |
| G15 | **完成** | `FakeHost` 接收者统一为 `f`（ST1016 清零）；`Dial` 拆 `dialAndOpen`/`pumpToHost`/`pumpToConn`；`harness.Start` 拆 `startHost`/`startPlugin` | 无 |
| G16 | **完成** | `batch.run` 的内层 drain 提为 `drain(batch, flush) []T`，`flush` 改为显式接收要写的切片（不再靠闭包隐式共享变量）；`Stop` 的 goroutine + 5 秒超时不变 | 无 |
| G17 | **完成** | anthropic：`spec.Validate`（G1）、`providers/anthropic` 的头/路径（G5）、`ModelListRequest`（G3）、`RequestModel`（G4）、`MessagesPingBody`（G9） | 见 G1 |
| G18 | **完成** | openai：同上（`authorization` 头按计划留在本地） | 见 G1 |
| G19 | **完成** | gemini 接 `apikey.ModelListRequest`（`NormalizeBaseURL` 原来就在 `apikey` 里）。G4 不适用于 gemini：它的模型来自路径 `…/models/{model}:…`，请求体原样透传，从不读 `Fields["model"]` | 无 |
| G20 | **完成** | relay：同 G17，`PassHeaders` 传入 `anthropic.Headers` | 见 G1 |
| G21 | **完成** | volcengine：G6 修 bug；`decodeJSONObject` 改为转发 `apikey.DecodeObject`；`requestModel` 删除改 `pluginsdk.RequestModel`（`assetSpec` 的删除归 G32） | 见 G6 |
| G22 | **完成** | `DecodeSettings` 的五个闭包改为 `decoder` 结构体方法，`DecodeSettings` 只留 `network`/`limits`/`storage`/`ban` 四组调用 | 无（各字段独立，顺序无影响） |
| G23 | **完成** | `OnGatewayRequest` 拆 `gate`（前置条件链）、`observeDecision`、`enforceInline` | 无 |
| G24 | **完成** | `getOverview` 拆 `queryTotals`/`queryTrend`/`queryTopCategories`/`queryTopUsers`；`eventFilter` 改为 `eventQuery` 结构体 + `enums`/`enum`/`ids`/`category`/`search`/`times` | 无 |
| G25 | **完成** | `putRules` 的事务体提为 `replaceRules` + `upsertRule`（`LOCK TABLE … SHARE ROW EXCLUSIVE` 与整段并发语义注释一并搬入）；`getStats` 拆 `statsTrend`/`statsTopRules`/`statsRecent`；`OnEvents` 拆 `applyEvent` | 无 |
| G26 | **完成（修 bug）** | `recordCommission` 的 `SUM(commission)` 只查一次（`credited` 复用于「已达上限」判断与剩余额度夹取）；`routes.go` 全部 `Query`/`Scan` 判错（`pgxCollectRows` 助手保留「空结果返回 null 而非 []」的响应形状），错误统一 `unavailable(err)`；`countConsecutiveDays` 改为返回 `(int, error)`；新增 `TestAdminRoutesQueryFailure`（DROP TABLE 后三个端点均 503） | **有**：以前被静默吞掉的查询错误现在返回 503 |
| G27 | **完成** | 新增 `paging.go`：`listPaged[T]`（count + page，错误前缀逐条保留）与 `withLockedRow`（`Begin` + `FOR UPDATE` + 「不存在」文案映射 + 提交）；`ListCodes`/`ListPromoCodes`/`RedeemCode`/`ApplyPromoCode` 共用；错误文案逐字保留 | 无 |
| G28 | **完成** | `index_tx.go` 改为 `indexResource[R]`（锁语句列表 + load 函数 + 404 文案）+ `withResource`；`groupResource`/`assetResource` 表达差异（asset 多一条父组 KEY SHARE 锁）；7 个调用点机械替换 | 无（锁顺序与 `withGroup`/`withAsset` 完全一致） |
| G29 | **完成（`p.db()` 按计划不动）** | growth/volcengine 的 `unavailable` 改为转发 `pluginsdk.Unavailable`；volcengine 的 `badRequest` 转发 `pluginsdk.BadRequest`；payment 27 处内联 error envelope 全部改为 `pluginsdk.ErrorResponse(...), nil`（`jsonResponse` 保留给成功响应，其转发 `pluginsdk.JSONResponse` 的单行包装不动） | 无 |
| G30 | **完成** | `readVideoSpec` 的四个「absent / gone / parsed」字段（resolution、ratio、duration、frames）合成 `readCandidates[T](path, gone, fields, zero, normalize)`，八个 else-if 变四行调用；prompt 文本与 `content.#` 的两段规则原样保留；`estimateVideo` 按计划不动 | 无 |
| G31 | **未做（超出本次范围）** | 本任务的授权范围不含 `next/tools/sub2api-plugin`，故未拆 `dev.go` | 无 |
| G32 | **完成** | `moderation/unit_test.go` 的 SA4000 改为 `cacheKey("p1","t") == ""`；`volcengine/manifest_test.go` 的 `usageDiff`/`keys`/`union` 删除；`assets.go` 的 `assetSpec` 删除。另：`next/plugins/{moderation,guard}` 有 3 个 `.go` 文件被本地以 CRLF 检出，`gofmt -l` 因此报错；转为 LF 后 blob 哈希与 HEAD 完全一致（纯检出产物，非内容改动） | 无 |

补做（不在 G 列表但属 V 项与本轮门禁要求）：

- **V17** — `next/sdk/manifest/manifest.go` 的 `AccountDeletion.RetentionDays` 字段旁注明取值范围 1..`MaxRetentionDays` 及被拒时的 field/code。
- **新增 SDK 单测** — `pluginsdk/request_test.go`（`RequestModel` 的 7 种输入）、`apikey/apikey_test.go` 增 `TestModelListRequest` 与 `TestTextsKeepShippedWording`（含 relay 的错误顺序）。

### 6.2 测试结果

每个模块均通过仓内门禁 `sh .github/next-ci/next-check-module.sh <module>`（gofmt -l / go vet / go build / go test 四条全绿），并额外跑 `GOOS=linux go vet ./...` 与 `staticcheck ./...`：

| 模块 | gofmt | build | GOOS=linux vet | staticcheck | go test |
|---|---|---|---|---|---|
| next/sdk | 干净 | OK | OK | 手写代码仅 `egress.go` 的 2 条 SA1019（`Transport.Dial`/`DialTLS` 弃用，既有代码，未在本轮范围）；`gen/pluginv1` 另有 144 条 SA1019（protobuf 生成代码，不属手写范围） | 11 包全 ok |
| next/plugins/anthropic | 干净 | OK | OK | 干净 | ok（10 个 PASS，0 SKIP） |
| next/plugins/openai | 干净 | OK | OK | 干净 | ok（10 个 PASS，0 SKIP） |
| next/plugins/gemini | 干净 | OK | OK | 干净 | ok（9 个 PASS，0 SKIP） |
| next/plugins/claude-oauth | 干净 | OK | OK | 干净 | ok（17 个 PASS，0 SKIP） |
| next/plugins/moderation | 干净 | OK | OK | 干净 | ok（40 个 PASS，0 SKIP） |
| next/plugins/guard | 干净 | OK | OK | 干净 | ok（18 个 PASS，0 SKIP） |
| next/plugins/growth | 干净 | OK | OK | 干净 | ok（17 个 PASS，0 SKIP） |
| next/plugins/payment | 干净 | OK | OK | 干净 | ok（9 个 PASS，0 SKIP；PG 用例实跑，含 `TestPlugin_RedeemCodeConcurrency`） |
| next/plugins/relay | 干净 | OK | OK | 干净 | ok（9 个 PASS，0 SKIP） |
| next/plugins/volcengine | 干净 | OK | OK | 干净 | ok（112 个 PASS，0 SKIP） |

只读复核（未改这些模块）：`next/server`、`next/plugins/ccgateway`、`next/e2e`、`next/gateway`、`next/tools/sub2api-plugin`、`next/runtime-contract`、`next/protocol-codec`、`next/deploy/mock-upstream` 均 `go build` 成功，`next/server`/`next/plugins/ccgateway` 的门禁四条全绿 —— SDK 的新增与删除都保持了对它们的向后兼容。

PG 测试未静默跳过：`pluginsdktest.NewSchema` 走 `sdk/testpg`（`TEST_DATABASE_URL` 或本机常驻 PG，`SUB2API_TESTPG=off` 才会 skip），本轮环境未设 `SUB2API_TESTPG`，各 PG 用例均实际执行；`-v` 统计的 `--- SKIP` 数为 0。

### 6.3 需要注意的行为变化（发布说明请照抄）

1. **volcengine（G6）** — Ark 的 Anthropic 面（`anthropic.messages` / `anthropic.count_tokens`）错误分类从 OpenAI 词表切到 Anthropic 词表：404 由 `invalid_request_error` 变 `not_found_error`，5xx 由 `server_error` 变 `api_error`。客户端可见。
2. **relay（G1）** — `api_key` 与 `base_url` 都缺时，`details.fields` 的顺序由 `[base_url, api_key]` 变为 `[api_key, base_url]`。
3. **growth（G26）** — 查询失败从「静默返回 0/空」变为 503。
4. **SDK Router（G11）** — 两个 pattern 同时命中时选择变确定（字面量多者优先，其次 pattern 文本升序）。现有插件无歧义路由，实际无影响，但第三方插件若曾依赖 map 迭代顺序会感知到。
5. **openai（G1，复核轮补录）** — 显式提交 `base_url: ""` 由「`format` 错误」变为「归一化为默认地址」（CONTRACTS §21.3：空值由插件归一化为默认），与 anthropic/gemini 一致。控制台清空输入时不发该键，故影响限于直接提交空串的 API 调用方。

无变化但值得记录的确认项：openai 非字符串 `api_key` 仍是 `code: "pattern"` + `API key must be a string`；所有字段错误文案（含中英双语）逐字保留；payment 的错误文案与 `out_trade_no` 前缀未动；manifest 的 field 路径与 code 未动；签名路径（`pkgsig`、`tools/sign.go`、索引 JSON）未动；claude-oauth 的 `ClassifyError` 与 quota/balance 响应形状未动（G7 推迟）。

### 6.4 未做项与后续

| 项 | 原因 | 建议 |
|---|---|---|
| G7（claude-oauth 分类策略） | 会改已发布插件的客户端可见行为（冷却、`ClientErrorType`、5xx 冷却），计划本身要求独立 PR + manifest 版本号 + 发布说明；本轮约束是「只做保持 wire 行为不变的项」 | 单独一个 PR：`anthropic.Policy.With(oauth 规则)` + `classify.RetryAfter`，同步升 claude-oauth 版本号 |
| G31（`tools/sub2api-plugin` 拆分） | 本任务授权范围不含 `next/tools` | 交给工具链的负责方 |
| `pkgsig.Digest` 删除 | `Sign`/`Verify` 内部依赖它，且是公开 API，删除无收益 | 保留（已在 G12 说明） |

