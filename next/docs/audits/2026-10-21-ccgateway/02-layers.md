# CCGateway 审核 02：CC 配置的全局 / 分组 / 账号多层覆盖

审核日期：2026-10-21；分支 `feat/next-platform`，HEAD `43d576838`。只读审核，未改动源码、文档或配置。

## 1 范围与方法

**范围**：CC 请求策略的三层存储、合并、校验与下发，覆盖以下环节：

- Core：`next/server/internal/ccgateway/{feature_policy.go, feature_policy_http.go, config.go, request_policy.go, request_cache.go, client.go, runtime_features.go, network.go, cli_management.go}`，`account/handlers.go` 中的账号 PATCH，`gateway/dispatch.go` 中的分组传递，`group/group.go` 中的分组删除。
- 合同：`companions/contracts/features/{attachments.go, identity.go, request_modes.go, runtime.go, catalog.go}`。
- Worker/engine：`engine/{main.go, request_command.go, request_identity.go, request_policy.go, cli_pinned.go}`，`worker/internal/server/features.go`，`cli-mods/patch-cli-2.1.304.cjs` 中的能力声明。
- 前端：`web/src/views/ccgateway/{RemoteSettings.vue, RequestPolicySettings.vue, GroupPolicyList.vue, GroupPolicyDrawer.vue, AccountFeatureSettings.vue, CLISettings.vue, requestPolicy.ts}`，`views/accounts/AccountEditor.vue`。
- 最近提交：08035b19c（request identity）、83107b8ee 和 9f211dc09（可选分组策略与分组列表）、43d576838（卷配额）。

**方法**：

1. 逐个文件阅读代码，再与 CC-FEATURE-LAYERS-DESIGN / DISCUSSION、IMPLEMENTATION-GUIDE、2.1.304 实现记录第 12–13 节对照。
2. 用临时测试复现假设，结束前已全部删除，`git status --short` 中没有本审核留下的文件：
   - Go：`next/server/internal/ccgateway/zz_audit_layers_test.go`，共 5 个用例，都不依赖 DB。
   - engine：`next/plugins/ccgateway/companions/engine/zz_audit_layers_test.go`，1 个用例。
   - 前端：`next/web/src/views/ccgateway/zz-audit-layers.spec.ts`，2 个用例。
3. 复跑既有的不依赖 DB 的测试，全部通过：
   - Go 特性合并：`TestFeatureSourceInheritanceExhaustiveMatrix`、`TestFeatureScalarSettingsAcrossAllLayers` 等 10 个顶层测试。
   - 前端 5 个 spec：featurePayloadAudit、featureLayers、AccountFeatureSettings、RequestPolicySettings、requestPolicy，共 95 项。
4. 没有运行需要 PostgreSQL 的测试，也没有访问任何服务器。

工作区里的 `zz_audit_models_test.go` 和 `zz_audit_path_test.go` 属于其他审核员，本审核未触碰。

## 2 层级模型说明

### 2.1 存储与合并流程

| 层 | 存储 | 写入接口 | 并发控制 |
|---|---|---|---|
| 全局 | 加密 `settings.ccgateway_remote` 中的 `request_policy` | `PUT /system/ccgateway/remote-config`（`config.go:529` `save` → `mergeConfig`） | `feature_revision` 是全局与所有分组共用的单一计数器（`config.go:386-393`） |
| 分组 | 同一 Config 的 `cc_feature_groups`，键为分组 ID 字符串，值为 `{enabled, allow_account_override, overrides}` | 同上，整表替换 | 同上 |
| 账号 | 表 `ccgateway_account_feature_policies`（迁移 0056，账号删除时级联），存 `mode`（follow/custom）、`overrides`、`revision` | `PATCH /accounts/:id` 的 `cc_feature_policy`，与账号编辑在同一事务提交（`handlers.go:1284-1291`） | 账号 revision，不一致时返回 409 |

**合并入口**：`Config.ResolveFeaturePolicy(groupID, account)`（`feature_policy.go:170-211`）。预览接口（`feature_policy_http.go:118`）和实际请求（`feature_policy.go:253` `resolvedWorkerPolicy`）都调用它。

**合并顺序**：

1. 从 `EffectiveRequestPolicy()` 取全局值，缺键时补默认值：附件和计费为 client，身份为 replace。
2. 请求分组有配置且 `enabled=true` 时，叠加分组的稀疏覆盖。
3. `allowsAccountFeatures(groupID)` 为真且账号处于 `custom` 时，叠加账号的稀疏覆盖。
4. 判定条件（`feature_policy.go:160-166`）：没有请求分组（groupID ≤ 0）时账号覆盖无效；分组未配置、已配置但关闭、或允许账号覆盖时，账号覆盖有效。

**请求分组来源**：调度时使用 API Key 所属分组（`dispatch.go:489` 的 `ModelClientForRequest{GroupID: c.principal.Group.ID}`）。管理端账号测试走 `testreq.go:250` 的 `ModelClientFor`，分组为 0，只使用全局值。

**下发**：`client.go:217-235` 每次请求执行以下步骤：

1. `resolvedWorkerPolicy`：每请求查一次 DB 读取账号策略；删除取值为 client 的附件和计费键；direct 模式下附件与计费置 nil。
2. `validateRequestPolicy`。
3. 当 CLI 为 2.1.304（现在总是成立）时，向 `/healthz` 做能力预检。
4. 写入请求头 `X-CCGateway-Request-Policy`。

**缓存**：

- Config 按节点缓存 30 秒；保存后通过本节点失效和总线消息 `ccgateway_features` 让各节点失效（`request_cache.go:37-52, 259-276`）。
- 账号策略不缓存，每个请求都从 DB 读取。
- 只修改策略不会触发容器 Kick。只有 `sameRuntimeConfig` 认为运行配置变化时才会 Kick 全部运行时，这包括 CLI 版本变化。

### 2.2 配置项总表

| 配置项 | 全局 | 分组 | 账号 | 默认值 | 合并规则 | 生效位置 |
|---|---|---|---|---|---|---|
| `relay_mode`（direct/build） | 可配（UI） | 可配（UI） | 可配（UI） | build；历史的 native/legacy 读取时迁移为 build | 标量，后层覆盖前层 | Worker `main.go:90-93`、`request_command.go:165-167`，按请求选择模式 |
| `build_attachment_sources.<10 字段>`（client/worker/erase） | 可配 | 可配 | 可配 | 新建配置的 platform_name/os_version 为 worker，其余为 client；历史缺键为 client | 逐字段稀疏覆盖；全局 PUT 中的非空 map 与旧值合并，`{}` 清空（`config.go:371-379`） | 仅 build：engine v2 组件交给 CLI `content-policy.js`；direct 下核心不下发 |
| `build_billing_sources.cc_version / cc_entrypoint`（client/worker） | 可配 | 可配 | 可配 | client | 同上（`config.go:362-370`） | 仅 build：CLI 计费合并 |
| `request_identity_sources.user_id`（client/worker/replace） | 可配（UI，仅 build 时显示） | 可配 | 可配 | **replace**，并且总是作为显式值下发 | 逐字段覆盖；全局 PUT 缺省时**不保留旧值**（见 F5） | build 与 **direct** 都生效（`request_command.go:202-227`）；只对 OAuth 账号生效 |
| `unknown_field`（reject/ignore） | 仅 API | 仅 API | 仅 API | reject | 标量 | **build/direct Worker 不使用**（见 F4） |
| `tool_search` | 仅 API | 仅 API | 仅 API | request | 标量 | 同上，不生效 |
| `thinking_disabled_compat`（pass/omit） | 仅 API | 仅 API | 仅 API | pass | 标量 | 同上，不生效 |
| `custom_tool_prefix` | 仅 API | 仅 API | 仅 API | ccgateway | 标量 | 同上，不生效 |
| `cli_version` | 全局（UI 只读，固定为 2.1.304） | 不可配（分组和账号覆盖被拒绝） | 不可配 | 2.1.304 | 前端保存时**强制写为 2.1.304**（见 F8） | 进入容器期望配置（`network.go:67-69`），变化会 Kick；Worker 校验版本一致 |
| `erase/replace_client_attachments`（旧 native） | 仅存量 | 无 | 无 | 空 | 原样保留 | build/direct 不生效 |
| `allow_fast` / `allow_effort` | 读取时强制为 true | 无 | 无 | true | 无 | 无 |
| `betas` | 读取时强制为内置表 | 无 | 无 | 内置 | 无 | native |
| 分组 `enabled` / `allow_account_override` | — | 可配 | — | 新增分组时为 true/true | 关闭分组只让该层失效，保存值保留 | Core 合并 |
| 账号 `mode`（follow/custom） | — | — | 可配 | follow | follow 保存时清空全部覆盖（`feature_policy.go:240-242`） | Core 合并 |

## 3 发现表

| 编号 | 严重度 | 标题 | 置信度 |
|---|---|---|---|
| F1 | **P1** | 前端编辑全局 CC 策略后写入 `schema_version: 2`，核心只接受 1，保存必然失败（线上管理面必现） | 确认（已复现） |
| F2 | **P1** | 核心总是下发 `request_identity_sources.user_id=replace`；新 Worker 配合未带 identity 能力的 CLI（例如现网 v12）时，所有请求都返回 409 | 确认（已复现）；部署影响为很可能 |
| F3 | **P1** | 分组被删除后，`cc_feature_groups` 留下孤立键；每次 PUT 都重新校验该键，导致所有 remote-config 保存（连接、网络、镜像）失败，且报错不提分组 | 确认（代码路径） |
| F4 | P2 | `unknown_field`、`tool_search`、`thinking_disabled_compat`、`custom_tool_prefix` 在三层都能合并、预览并下发，但 build/direct Worker 从不使用 | 确认 |
| F5 | P2 | 全局 PUT 缺省 `request_identity_sources` 时清空已保存的值，与另外两个来源 map 的保留规则不一致 | 确认（已复现） |
| F6 | P2 | identity 在 direct 模式下也会改写正文，但 UI 在 direct 下隐藏 identity，设计文档也没有收录 | 确认 |
| F7 | P2 | 已保存的覆盖采用严格解码（未知键即失败）；版本回退或新增字段时，整个 CC 配置或账号策略无法加载，请求全部失败 | 确认 |
| F8 | P2 | 前端每次保存都把 `cli_version` 固化为 2.1.304，保存网络设置也会改写 CLI 版本并 Kick 全部运行时 | 确认（代码）；影响为存疑（现网已是 304） |
| F9 | P2 | revision 冲突后“重试”只更新版本号、保留旧草稿；只改了网络的管理员再次保存会覆盖他人的分组或全局改动 | 很可能 |
| F10 | P2 | 每个模型请求额外做一次账号策略 DB 查询和一次 Worker `/healthz` 能力预检 | 确认 |
| F11 | P3 | 代码规范：三类来源 map 各写一遍、字段清单在多处重复、计费字段没有常量 | 确认 |
| F12 | P3 | 校验不对称：全局 RequestPolicy 宽松（未知键忽略）而覆盖严格；重复 JSON 键不拒绝；前端不校验 identity；账号策略顶层未知键被接受 | 确认 |
| F13 | P3 | 账号页小问题：所有分组都禁止覆盖时无法切回 follow 清理休眠值；切到 follow 立即丢弃草稿；预览按已保存的分组成员计算，不看编辑中的 group_ids | 确认 |
| F14 | P3 | 死代码与过时文案：`RemoteSettings.vue:153` 的分支永远不会执行；前端 `newRequestPolicy` 带 schema 2；i18n 的 `group_unconfigured` 和 `group_disabled` 未使用；DISCUSSION §2.2 与当前规则相反 | 确认 |

## 4 发现详述

### F1（P1）前端编辑全局 CC 策略后写入 `schema_version: 2`，核心拒收

**证据**：

- 前端写入版本 2：`next/web/src/views/ccgateway/RequestPolicySettings.vue:50`（`applySources` 的非分层分支 `schema_version: 2`）和 `:58`（`setMode` 同样处理）。
- 前端保留并发送该值：`requestPolicy.ts:128` 的 `normalizeRequestPolicy` 原样保留 `schema_version`；`RemoteSettings.vue:235` 发送 `request_policy: normalizeRequestPolicy(...)`。
- 前端本地校验接受 1 或 2（`requestPolicy.ts:147`），所以不会在提交前拦截。
- 核心只接受 1：`next/plugins/ccgateway/companions/contracts/features/catalog.go:7` 定义 `PolicySchemaVersion = 1`。`server/internal/ccgateway/request_policy.go:41-44` 的 `RequestPolicy.UnmarshalJSON` 调用 `features.ValidatePolicySchemaJSON`（`contracts/features/runtime.go:135`），版本不为 1 时报错。因此 `httpapi.BindJSON` 解码 Config 时失败并返回 400。
- Worker 同样只声明 `[1]`（`worker/internal/server/features.go:51`）。既有测试 `runtime_features_test.go:116` 明确断言 `{"schema_version":2}` 被拒绝。

**触发条件**：在“CC 特性 → 全局默认”中修改任意来源（计费、身份、环境）或请求模式后保存。

**复现**：

- 前端：用临时 `zz-audit-layers.spec.ts` 挂载 RemoteSettings，修改 shell 来源或 relay mode 后提交。两个用例中 PUT body 的 `request_policy.schema_version` 都是 2。
- 后端：用临时 Go 测试把同样的 JSON 解码为 `Config`，返回 `unsupported request policy schema_version`。

**影响**：

- UI 无法保存全局 CC 默认值。
- 只要表单进入过脏状态（即使用户把选项改回原值，schema 也已变成 2），同一表单上的连接、网络、镜像保存也会一起失败，页面只显示通用的“保存失败”。
- 该代码从 9dfcb60b9 起就存在，现网 0.1.172/0.1.173 均受影响。管理面必现，请求面不受影响。
- 设计文档 §12.1 写明“扩展 schema_version 时核心、Worker、CLI、TS 同步更新……不能漏改”，实际只改了前端。
- 现有前端测试 mock 了 api，没有验证 schema；后端 HTTP 测试从未 PUT 过 `request_policy`，所以两边都没发现。

**修复建议**：前端删掉两处 `schema_version: 2`，`newRequestPolicy` 和 `validRequestPolicy` 只接受 `features.PolicySchemaVersion`（1）。若确实需要新版本号，按 §12.1 同步升级核心、Worker 和 CLI 校验。补充：

- 一条后端 HTTP 用例：PUT 前端真实 payload，包含 `request_policy`。
- 一组 Go/TS 共用的 JSON 正反例。

### F2（P1）默认身份来源被固化为显式值，未带 identity 能力的 CLI 拒绝全部请求

**证据**：

- 核心把默认值写成显式值并下发：`server/internal/ccgateway/feature_policy.go:188-193` 中 `ResolveFeaturePolicy` 把缺省的 `user_id` 补成 `"replace"`。`resolvedWorkerPolicy`（`:263-278`）只删除附件和计费里取值为 client 的键（注释写的是“保持 wire 稀疏，让旧 Worker 收不到新引入的无操作键”），没有处理 identity，direct 模式也照样保留。临时 Go 测试确认：默认配置在 direct 下的 wire 为 `{"request_identity_sources":{"user_id":"replace"},...}`。
- engine 按“是否显式给值”判断：`engine/request_command.go:209-216` 中，CLI 不支持 `request_identity_v1` 时，如果 `policy.Identity["user_id"] != ""` 就返回 409；只有键缺失时才降级为 client。
- 核心预检不覆盖 identity：`runtime_features.go:25-45` 的 `requestPolicyCapabilities` 不含 `RequestIdentityCapability`，问题只会在 Worker 端逐请求暴露。
- 能力声明随新补丁出现：`request_identity_v1` 只由新补丁 `ccgateway-v14-account-identity` 声明（`cli-mods/patch-cli-2.1.304.cjs:47,50`）。现网 CLI 是 `ccgateway-v12-feature-policy`（SHA 138da…，见实现记录 §12），不声明该能力。

**复现**：用临时 engine 测试构造 Gateway（CLIInfo 带 `request_build/request_direct/build_content_preservation_v1`，不带 identity），请求头按核心实际格式发送。build 和 direct 都返回 `409 configuration_error "Loaded CLI does not support the requested identity source"`。

**影响**：只要出现“新 Worker（含 08035b19c 的 engine）+ 旧 CLI”的组合，该账号的所有模型请求都会失败。这种组合可能来自：

- 仍保留的 worker-only 原位更新（实现记录 §5 写明旧 worker-only 操作保留）；
- 离线账号或未完成配对升级的账号；
- 302 容器。

旧 Worker 会忽略未知键，所以“新核心 + 旧 Worker”这一侧不受影响。engine 注释（`request_command.go:206-208`）说“默认来源在不能表达的 CLI 上保持不应用，旧运行时继续服务”，核心的实现违背了这个意图。

**修复建议**：二选一或同时做：

- 核心只在某一层显式配置了 identity 时才下发该键，可利用 `Sources` 判断来源层；默认值与附件、计费一样保持稀疏。
- 显式配置非 client 时，把 `RequestIdentityCapability` 加入 `requestPolicyCapabilities`，在核心预检阶段明确失败。

另补一条“wire 默认不含 identity”的核心测试，以及“新 Worker + v12 CLI 默认策略可正常服务”的 engine 测试。

### F3（P1）删除分组后留下孤立的分组策略，阻塞全部 remote-config 保存

**证据**：

- 删除分组不清理配置：`server/internal/group/group.go:406` 直接 `DELETE FROM groups`，不碰 `ccgateway_remote.cc_feature_groups`；全仓库除 ccgateway 外没有引用 `CCFeatureGroups`。
- 前端每次保存都带上整张表：`web/src/views/ccgateway/RemoteSettings.vue:236` 发送 `cc_feature_groups: featureGroups.value`。
- 核心每次都逐个校验存在性：`server/internal/ccgateway/config.go:554-563` 对 `in.CCFeatureGroups` 的每个键执行 `SELECT EXISTS(... groups WHERE id=$1)`，不存在就返回 `Unknown CC feature group.`。
- 报错被替换成通用文案：`config.go:583-588` 只透传 conflict，其余错误都换成“请检查请求策略、beta 映射、私有 CIDR……”，完全不提分组。

**触发条件**：某个分组配置过 CC 策略，之后该分组被删除；之后在设置页做任何保存。

**影响**：

- 连接、网络、镜像、全局策略都无法保存，错误信息误导。
- 用户只能在“分组默认”子页找到显示为 `#id` 的行（`GroupPolicyList.vue:40`）并手动移除才能恢复，很难发现。
- 设计 §12.2 要求“不得为已删除 group ID 保存配置”，实现扩大成了“只要存在旧键就拒绝所有保存”。

**修复建议**：

- 只校验本次新增或修改的分组键；已存在但分组已删除的键在读取或保存时自动剔除，或在分组删除事务中同步删除对应键并递增 `feature_revision`。
- 该错误应返回明确的 reason，例如 `unknown_feature_group` 并带上 id，不要被通用文案吞掉。
- 补一条 PG 测试：配置分组 → 删除分组 → PUT 网络设置。

### F4（P2）四个旧策略字段分层可配但请求模式下从不生效

**证据**：

- 三层都能配置并下发：`FeatureOverrides` 包含 `unknown_field/tool_search/thinking_disabled_compat/custom_tool_prefix`（`feature_policy.go:19-28`），由 `applyFeatureOverrides`（`:106-118`）在三层合并，在预览的 `sources` 中标注来源，并写入请求头。
- Worker 不使用：Worker 默认 `CCG_REQUEST_MODE=build`（`engine/main.go:648-651`），只要 `RequestMode != ""` 就进入 `serveRequestCommand`（`main.go:99-101`）。该路径只解析 `buildRequestPolicy`（`request_command.go:38-45`：sources/billing/identity/relay_mode/cli_version）。这四个字段只在旧 native 的 `requestPolicy()` 中使用（`engine/request_policy.go:52-117`，且要求 relay_mode 为 native）。
- 合同目录自己也写明：请求模式“不启用旧 native 的附件擦除、工具前缀或字段忽略策略”（`contracts/features/request_modes.go:43`）。
- 前端没有这四项的控件，`RequestPolicySettings.spec.ts:58-60` 断言它们被隐藏。

**影响**：

- 可以通过 API 在分组或账号层写入，预览显示“生效：group”，实际没有任何效果，属于误导性的配置面。
- 记忆中提到 10-10 线上曾开启 `thinking_disabled_compat=omit`；现在在 build/direct 下已静默失效。是否需要用其他机制替代，需要另行确认。
- `TestFeatureScalarSettingsAcrossAllLayers` 用 48 个用例证明“分层合并正确”，却没有任何断言证明它们生效，测试结论被高估。

**修复建议**：从 `FeatureOverrides` 中移除这四项，或在请求模式下拒绝非默认值；全局存量值按“只读保留”处理。若 thinking compat 在 build 下仍有需要，应在 CLI 或 engine 的 build 路径重新实现，并纳入能力声明。

### F5（P2）全局 PUT 缺省 `request_identity_sources` 时丢失已保存的值

**证据**：`config.go:357-380` 只对 `BuildBillingSources` 和 `BuildAttachmentSources` 实现“nil 保留旧值，非空与旧值合并”；`RequestIdentitySources` 没有对应分支。这类问题正好对应设计 §12.2 的要求：“PUT 缺省新字段必须保留原值，不能把旧前端不认识新字段解释成删除”。

**复现**：临时 Go 测试中，旧值 `identity={user_id:client}`、`billing={cc_version:worker}`，入参两者都为 nil。结果 billing 保留，identity 变为空（即回到默认 replace），`FeatureRevision` 从 3 增加到 4，没有触发冲突。

**影响**：

- 当前前端 `normalizeRequestPolicy` 总会带上该字段，所以 UI 不受影响。
- 旧前端（08035b19c 之前的 0.1.173 页面缓存）、脚本或第三方调用会静默把 identity 从 client 改成 replace。这会改变 `metadata.user_id`，属于上游可见的行为变化。

**修复建议**：把三类来源 map 的保留与合并抽成一个函数统一处理（见 F11），并补充用例。

### F6（P2）identity 在 direct 下仍会改写正文，UI 与文档都未体现

**证据**：

- 核心在 direct 下只清空附件和计费（`feature_policy.go:275-278`），identity 照样下发。
- engine 的 identity 处理不区分模式（`request_command.go:217-227`），既有测试 `TestRequestCommandAppliesAccountIdentityOnlyForOAuth` 也对 direct 断言了改写。
- UI 在 `resolved.relay_mode === 'direct'` 时只显示 directHint，计费、身份、环境三个矩阵全部隐藏（`RequestPolicySettings.vue:155-161`）。
- 设计 §5 和 §13 都写 “direct 不执行任何内容转换／保持既有透传行为”。CC-FEATURE-LAYERS-DESIGN 与 DISCUSSION 都没有收录 identity。

**影响**：

- direct 模式下，管理员看不到也改不了 identity，而默认的 replace 会改写 OAuth 账号请求中的 `metadata.user_id`。
- “direct 原文字节”这一验收承诺对这类请求已不成立。

**修复建议**：先明确产品规则：direct 是否也要映射身份。若要映射，UI 在 direct 下需单独显示 identity 行，并把规则写进设计文档 §3、§5、§13；若不映射，核心在 direct 下把 identity 也置 nil。

### F7（P2）存储数据严格解码，版本回退或新增字段时整层失效

**证据**：

- 分组覆盖：`FeatureOverrides.UnmarshalJSON`（`feature_policy.go:34-56`）使用 `DisallowUnknownFields` 并调用 `Validate`。解码 DB 中的 Config（`config.go:278`）和账号策略（`feature_policy.go:223`）也走这条路径。
- 临时 Go 测试确认：`cc_feature_groups.7.overrides` 中出现一个未知键，就会让整个 Config 解码失败。

**影响**：

- 例如新核心写入了 `request_identity_sources`，回退到 0.1.173（没有该字段）后，`Load` 返回错误。所有 CCGateway 请求（`requestConfig`）、设置页和预览都会失败。
- 账号层的同类问题会让该账号的请求失败，并让账号详情 GET 失败（`account/handlers.go:364-368` 直接返回 err）。
- 设计 §12.8 要求“回退前先切回可表示的兼容快照”，这依赖人工步骤；目前代码层面直接整体失败。

**修复建议**：严格校验只用于写入接口，例如在 `mergeConfig` 和 `SaveAccountFeatures` 前单独校验；从存储读取时宽松解码（忽略未知键并记录日志），或按 `schema_version` 分支处理。

### F8（P2）前端每次保存都固化 `cli_version=2.1.304`

**证据**：

- `requestPolicy.ts:141` 的 `normalizeRequestPolicy` 总是写 `cli_version: defaults.cli_version`，不读取已保存的值。
- 核心 `sameRuntimeConfig`（`config.go:34-45`）比较 CLI 版本，版本变化即判定 `runtimeChanged`，随后 Kick 所有运行时（`config.go:595-601`）。
- `policyChanged`（`RemoteSettings.vue:69`）两侧都经过 normalize，所以版本差异不会让表单显示为已修改。

**影响**：

- 如果全局 CLI 版本因回退或迁移被设成其他值（实现记录 §11 强调“不能先改全局版本”），管理员只要在设置页保存任何内容，例如网络，就会悄悄把版本改回 304，并让全部运行时重新协调。
- 现网已经是 304，当前不会触发；影响取决于后续是否需要回退。

**修复建议**：normalize 时保留服务端返回的 `cli_version`，前端不发送该字段（核心在缺省时保留原值）；版本切换走单独的显式操作。

### F9（P2）revision 冲突后的“重试”可能覆盖他人的改动

**证据**：

- `RemoteSettings.vue:187-193` 的 `refreshFeatureRevision` 只把 `saved.feature_revision` 更新为最新值，`requestPolicy` 和 `featureGroups` 草稿保持旧快照。
- 保存时整份发送（`RemoteSettings.vue:235-237`），核心把 `feature_revision` 当作单一计数器比较（`config.go:386-389`）。

**触发条件**：管理员 A 只改了网络；B 同时改了分组或全局策略。A 保存时收到冲突，点“重试”后再保存。

**影响**：A 的旧 CC 草稿覆盖 B 的改动，而 A 从未编辑过 CC 设置。UI 虽然显示“最新保存值”供对照，但对只改了网络的人没有提示意义。

**修复建议**：冲突后对“用户未修改的部分”直接采用最新值，只保留用户实际修改过的字段；或在 CC 草稿未修改时，PUT 不发送 `request_policy` 和 `cc_feature_groups`（核心在缺省时保留原值）。

### F10（P2）每个请求额外查一次 DB、做一次健康预检

**证据**：

- `feature_policy.go:255-260`：只要分组允许账号覆盖（包括未配置分组，即大多数情况），每次请求都执行 `LoadAccountFeaturePolicy`。
- `client.go:227`：条件 `policy.CLIVersion == "2.1.304"` 恒为真，所以每次都调用 `requireRequestPolicyCapabilities` 访问 `GET /healthz`（3 秒超时，经过隧道）。
- PG 测试 `gateway/ccgateway_feature_policy_test.go:136-137` 断言 11 次请求对应 11 次健康探测，说明这是有意设计（`runtime_features.go:18-20` 注释：不跨原位更新缓存）。

**影响**：每个模型请求增加一次 DB 往返和一次 Worker 往返，与 v0.1.112 引入请求路径缓存的目标相悖；Worker 繁忙时 `/healthz` 超时会直接让请求失败。

**修复建议**：

- 账号策略按 revision 缓存，并在 `account:changed` 事件中失效。
- 能力结果按 `(route key, revision, Worker 启动标识)` 缓存，或由 Worker 在 409 时再触发重新探测。

### F11（P3）代码规范

- 三类来源 map（附件、计费、身份）在 `applyFeatureOverrides`（`feature_policy.go:119-145`）、`ResolveFeaturePolicy`（`:176-193`）、`resolvedWorkerPolicy`（`:265-278`）、`mergeConfig`（`config.go:362-379`）和 `copyPolicy` 中各写一遍。新增 identity 时漏掉了 `mergeConfig` 和 `resolvedWorkerPolicy` 的稀疏化，直接造成 F2 和 F5。建议用一个表驱动的 section 描述（名称、字段清单、默认值、wire 稀疏规则、所需能力），供合并、补默认、稀疏化和能力计算共用。
- 五个标量键的清单重复出现在 `Validate`（`:59`）、`applyFeatureOverrides`（`:107-111`）、`ResolveFeaturePolicy`（`:173`）和前端 `validFeatureOverrides`（`requestPolicy.ts:196`）。计费字段没有 `BuildBillingFields` 常量，`Validate` 中硬编码（`contracts/features/attachments.go:46`）。
- `applyFeatureOverrides` 每次调用都分配 `map[string][2]*string` 的“指针对”字面量，可读性差。
- 前端 `RequestPolicySettings.vue` 在同一组件中同时承担全局编辑（写 policy）、分层编辑（写 overrides）和只读预览（effective）三种模式，判断分支（`value`、`differs`、`showEffective`）交织。建议把“当前单元格取值、来源与默认值”收敛成一个纯函数，并单独测试。

### F12（P3）校验不对称与缺口

- 全局 `RequestPolicy.UnmarshalJSON`（`request_policy.go:41-53`）不拒绝未知键，拼错的 `build_atachment_sources` 会被静默忽略；分组和账号覆盖则严格拒绝。
- `FeatureOverrides` 用 `map[string]json.RawMessage` 和标准解码，重复键按后者覆盖，不会拒绝；设计 §12.1 要求拒绝重复 JSON 键。
- 前端 `validRequestPolicy` 和 `validFeatureOverrides`（`requestPolicy.ts:145-202`）不校验 `request_identity_sources` 的字段和取值。
- `AccountFeaturePolicy` 顶层没有 `DisallowUnknownFields`，`{"mode":"custom","x":1}` 会被接受。
- 全局 PUT 中非空来源 map 与旧值合并（`config.go:364-378`），想删除单个键只能整体发 `{}`；这一语义与分组的整表替换不同，接口文档没有说明。

### F13（P3）账号页交互边界

- `AccountFeatureSettings.vue:24-29`：`setMode` 需要 `editable`。所选分组禁止账号覆盖时，连“切回 follow”也做不到；如果账号所有分组都禁止，休眠的 custom 值无法从 UI 清理，日后某个分组放开时会自动重新生效。
- 同一位置：切到 follow 时立即把草稿 `overrides` 置为 `{}`，即使随后切回 custom 并且尚未保存，原有覆盖也已丢失。
- 预览的分组列表取自数据库中已保存的成员关系（`feature_policy_http.go:74`），不看编辑器中尚未保存的 `group_ids`；“加入允许覆盖的分组并同时自定义”必须分两次保存。

### F14（P3）死代码与过时文档

- `RemoteSettings.vue:153` 的 `if (config.mode === 'disabled' && !config.request_policy)` 永远不会成立，因为 `Public()` 总会返回 `request_policy`（`config.go:181`）。被它调用的 `newRequestPolicy`（`requestPolicy.ts:178`）也带 `schema_version: 2`。
- i18n 的 `disabledReasons.group_unconfigured` 和 `group_disabled`（`zh/ccgateway.ts:31`）在 83107b8ee 之后已不会出现。
- `CC-FEATURE-LAYERS-DISCUSSION.md` §2.2 仍写“总开关关闭后账号自定义也不生效”和“允许账号覆盖默认关闭”，与 §13 及当前代码（新增分组默认允许、未配置或关闭的分组不限制账号）相反。§2.1 的“CLI 固定 2.1.302”也已过时。
- 设计文档、实现记录和 README 都没有 identity 的三层规则、默认 replace 及 direct 行为（见 F6）。

## 5 测试覆盖评估

图例：✔ 有直接测试；△ 只测了合并，未测生效，或只测了 mock；✘ 无测试。

| 配置项 | 全局层 | 分组层 | 账号层 | 前端提交 | 前端→后端 JSON 合同 | Worker 生效 | 备注 |
|---|---|---|---|---|---|---|---|
| relay_mode | ✔ Go `TestFeatureScalarSettingsAcrossAllLayers`、`representativeFeatureCases` | ✔ | ✔ | ✔ RequestPolicySettings.spec / featurePayloadAudit（mock） | ✘（漏掉 F1） | ✔ engine 按请求模式；PG gateway 测试 | |
| build_attachment_sources ×10 | ✔ 4,128 组合矩阵 | ✔ | ✔ | ✔ 126 次选择（mock） | ✘（漏掉 F1） | ✔ CLI 内容矩阵、87 项 Worker 矩阵（据实现记录） | 全局 map 合并语义只有 billing 被测（`TestFeatureConfigRevisionAndOmission`） |
| build_billing_sources ×2 | ✔ | ✔ | ✔ | ✔ | ✘ | ✔ | |
| request_identity_sources.user_id | ✘ | ✘ | ✘ | ✘（featurePayloadAudit 只覆盖 12 个字段） | ✘ | △ engine `TestRequestCommandAppliesAccountIdentityOnlyForOAuth`（直接构造能力），旧 CLI 降级未测（F2） | 核心与前端零覆盖 |
| unknown_field / tool_search / thinking_disabled_compat / custom_tool_prefix | △ 只测合并 | △ | △ PG `TestAccountFeaturePolicyRevisionAndClear` 只测存取 | ✘（无控件） | ✘ | ✘ 请求模式不使用（F4） | 测试证明“能合并”，不证明“能生效” |
| cli_version | ✔ `sameRuntimeConfig`；覆盖层拒绝该键 `TestFeatureOverridesRejectUnsupportedAndEmpty` | 不适用 | 不适用 | ✔ pinned | ✘（前端强制值，F8） | ✔ Worker 版本校验 | |
| 分组 enabled / allow_account_override | 不适用 | ✔ 矩阵 4×；PG `account/feature_policy_test.go` | ✔ | ✔ GroupPolicyDrawer 相关 spec | △ | 不适用 | |
| 未配置分组 / 无请求分组 | 不适用 | ✔ `TestFeatureMissingGroupPolicy...`（196） | ✔ | ✔ | — | ✔ PG gateway（6 个分组） | |
| 分组删除后的孤立键 | 不适用 | ✘ | ✘ | ✘ | ✘ | 不适用 | F3 |
| 账号 follow/custom、revision | 不适用 | 不适用 | ✔ PG 测试 | ✔ AccountEditor.spec、AccountFeatureSettings.spec | △ | ✔ PG gateway “follow 清空立即生效” | |
| feature_revision 冲突 | ✔ `TestFeatureConfigRevisionAndOmission`、PG HTTP | ✔ | 不适用 | △ 只测提示 | ✘ 冲突后重试覆盖（F9） | 不适用 | |
| 全局 PUT 缺省字段保留 | △ 只测 billing | ✔ groups | 不适用 | — | ✘ identity（F5） | 不适用 | |
| 存储解码兼容与回退 | ✘ | ✘ | ✘ | — | — | — | F7 |
| 多节点缓存失效 | △ `request_cache_test.go`（未细审） | △ | 不适用（不缓存） | — | — | — | 总线消息丢失时依赖 30 秒 TTL |

总体来看，合并器本身（纯函数）的组合测试很充分；但在以下四个边界上存在空白，本次的 P1 都落在这些空白里：

- **前端→后端 JSON 合同**：前端测试全部 mock 了 api；后端 HTTP 测试没有使用前端的真实 payload。
- **新增字段（identity）**：核心与前端零覆盖。
- **配置“能合并”与“能生效”之间**：四个旧字段只验证了合并。
- **配置生命周期**：分组删除、版本回退都没有测试。

## 6 代码规范观察

- **优点**：
  - 合并器是纯函数，预览与运行共用，并有不可变性断言（`feature_policy_matrix_test.go:113-114`）。
  - 账号策略与账号 PATCH 原子提交，并在父行锁内序列化首次插入。
  - 稀疏覆盖用“缺键”表示跟随，拒绝空字符串和 null，语义清楚。
  - 前端预览带序号和 AbortController，防止过期响应覆盖新结果。
- **问题**：
  - 三类来源 map 的处理逻辑多处复制，新增字段时容易漏改（F11、F2、F5 的共同根因）。
  - 默认值由核心补齐（`ResolveFeaturePolicy` 写 client/replace）和由 Worker 推断（键缺失即默认）两种约定混用，导致“显式与默认”在 wire 上无法区分（F2）。
  - 配置模型中“请求级”与“历史 native 级”字段混在同一个 `RequestPolicy` 结构里，没有类型层面的区分（F4）。
  - `config.go` 的 `save` 用一条通用错误文案吞掉所有非冲突错误，排障困难（F3）。
  - `client.go:227` 的预检条件很长，其中 `CLIVersion == "2.1.304"` 使其余条件失去意义，应简化或改为能力缓存（F10）。

## 7 未能验证的范围

- 需要 PostgreSQL 的测试未运行：PG HTTP 保存、账号 PATCH、gateway 分组链路、group 删除后的实际报错。F3 的结论来自代码路径，没有端到端复现。
- 未在真实浏览器中操作设置页；F1 的结论来自组件测试加 Go 解码测试，两段拼接得出，没有实际发出 HTTP 请求。
- 未确认现网存储的全局策略中 `thinking_disabled_compat` 等旧字段的实际值，也未确认 304 build 路径对 `thinking: disabled` 的实际处理，因此 F4 的业务影响只能判断为很可能。
- 未确认现网是否存在“新 Worker + v12 CLI”的组合，以及后续的发布顺序；F2 的触发依赖部署方式。
- 卷配额（43d576838）只涉及控制器环境变量 `CCG_ACCOUNT_DISK_GIB`，不属于三层配置，本报告未审核其正确性。
- `request_cache_test.go` 和多节点总线失效未深入审查，只确认了失效路径存在。
- `CLISettings.vue` 和 `cli_management.go`（按账号设置 CLI 自动更新与渠道）不属于分层配置，只确认它不参与合并，没有深入审核。
