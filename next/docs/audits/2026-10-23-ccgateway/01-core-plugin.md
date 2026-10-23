# CCGateway 审核 · 01 核心侧 + 插件进程（2026-10-23，HEAD f546fa31a）

> 只读审核，审核员 A。范围：平台界面的 CCGateway 设置如何经核心、插件进程下发到控制器与 Worker。Worker/engine/CLI 只读不审，只用来对账。

## 1. 范围与方法

**读过的代码（逐行）**
- 核心 `next/server/internal/ccgateway/`：`request_policy.go`、`feature_policy.go`、`feature_policy_http.go`、`client.go`、`request_cache.go`、`config.go`、`runtime_features.go`、`network.go`、`accounts.go`（1–630）、`runtime.go`、`direct.go`、`errors.go`、`http.go`、`request_logs.go`、`controller_config.go`、`contract_fixture_test.go`；`gateway/dispatch.go:565-605`、`gateway/helper_history_request.go:289-313`、`account/handlers.go:355-380,1280-1310`。
- 插件进程 `next/plugins/ccgateway/`：`main.go`、`manifest.json`、`internal/ccgateway/{ccgateway,availability,classify,quota,models,lifecycle}.go`、`forms/` 目录结构。
- 对账用（只读）：`companions/contracts/features/{levels,runtime,request_modes,attachments,injection,identity,identity_line,catalog}.go`、`contracts/httpfacts/*`、`contracts/requestfailure/failure.go`、`contracts/testdata/*.json`；`companions/engine/{request_policy,request_command(1-520),request_error,main(58-120)}.go`、`engine/contract_fixture_test.go`；`cli-mods/request-policy.js:1-60`。
- 前端：`web/src/views/ccgateway/requestPolicy.ts`、`RequestPolicySettings.vue:1-190`、`RemoteSettings.vue:140-250`、`GroupPolicyList.vue`（grep）、`AccountFeatureSettings.vue`（grep）。
- 文档：上一轮 `audits/2026-10-21-ccgateway/99-FINAL.md` §2/§7；`CC-REQUEST-LEVELS-DESIGN.md`、`CC-INJECTION-LEVELS-DESIGN.md`、`REQUEST-LOG-LEVELS-DESIGN.md §1-4`、`REQUEST-MODES.md`、`ACCOUNT-RUNTIME-LIFECYCLE.md`、`CONTRACTS.md §49.18/§53.11/§53.15-53.17`。`PASSTHROUGH-DESIGN.md`、`REQUEST-LOG-VIEWER-DESIGN.md`、`BILLING-IDENTITY-AUTOFILL-DESIGN.md`、`BUILD-REQUEST-COMPONENTS-DESIGN.md` 只按关键词查阅，未逐行读。

**跑过的命令（均在本机 Windows Git Bash）**

| 命令 | 结果 |
|---|---|
| `next/server`: `go vet ./internal/ccgateway/` | 通过 |
| `next/plugins/ccgateway`: `go vet ./...`、`go test ./... -count=1` | 通过（2 个包） |
| `companions`: `go test ./contracts/... -count=1` | 通过（7 个包） |
| `next/server`: `go test ./internal/ccgateway -run 'TestEditorPayloads…|TestLegacy…|TestInjection…'` | 6 个顶层测试通过（这些不依赖 PG） |
| 核心 ccgateway 包全量测试（需 PG） | **未跑**，按要求跳过 |
| node 脚本（内联）统计 >80 行或嵌套 ≥4 的函数；统计重复片段 | 结果见第 4 节 |

MCP（CodeGraph/Serena/WarpGrep）本会话不可用，全部用 Read/Grep。

## 2. 事实链路图

### 2.1 主链路（函数名 `文件:行` 均为 HEAD）

```
界面
  RemoteSettings.vue save() :222-245  ──PUT /system/ccgateway/remote-config──▶  核心 Service.save config.go:530-604
      body: account_runtimes, 连接字段, request_policy(normalizeRequestPolicy), cc_feature_groups, feature_revision, images, network
  GroupPolicyDrawer/List → 同一 PUT 的 cc_feature_groups[<gid>].overrides（customizeLayer/followLayer requestPolicy.ts:416-446）
  AccountFeatureSettings.vue :42 ──POST …/accounts/:id/cc-features/preview──▶ accountFeaturePreview feature_policy_http.go:26-120（只预览）
  账号编辑器 PATCH /accounts/:id {cc_feature_policy} ──▶ account/handlers.go:1292-1297 → SaveAccountFeatures feature_policy_http.go:125-164 → SaveAccountFeaturePolicyTx feature_policy.go:322-344

存储
  全局+分组：settings 表 key=ccgateway_remote，AES 加密整段 Config（含 request_policy、cc_feature_groups、feature_revision）config.go:545-577
  账号：表 ccgateway_account_feature_policies(account_id, mode, overrides jsonb, revision) feature_policy.go:306-344
  读取：loadVersioned config.go:292-315 → decodeStored :256-283 → RequestPolicy.UnmarshalJSON :57-69（不校验内容）、FeatureOverrides.UnmarshalJSON :40-62（**校验**）

每请求（策略头）
  gateway/dispatch.go:480 ModelClientForRequest{AccountID, ProxyID, GroupID=API Key 的分组}
    → modelTransport.RoundTrip client.go:104 → forwardAttempt :143-269
      ├ requestConfig request_cache.go:95（30 s 缓存）
      ├ requestDesired :119（30 s 缓存；revision 由 desiredIn accounts.go:125-182 + desiredNetwork network.go:54-74 算出）
      ├ route :145（按 key+revision 缓存连接，无 TTL）/ fetchConnection direct.go:48
      ├ resolvedWorkerPolicy feature_policy.go:346-357：LoadAccountFeaturePolicy（**每请求查库**）→ ResolveFeaturePolicy :247-304（全局→分组→账号）→ workerPolicy :369-409（按 level 稀疏化）
      ├ validateRequestPolicy request_policy.go:185
      ├ requireRequestPolicyCapabilities runtime_features.go:66 → GET <worker>/healthz（**每请求**）比对 capabilities 与 claude_version
      └ Header X-CCGateway-Request-Policy = json(workerPolicy) client.go:243-244；x-api-key=Worker key
  插件进程只负责：BuildUpstreamRequest ccgateway.go:153-179 → 虚拟 URL、透传 anthropic-*/x-claude-code-* 头、x-ccgateway-session-scope、x-request-id（核心请求 ID）
  Worker：main.go:77-98 只读 relay_mode/cli_version 做模式/版本核对 → serveRequestCommand request_command.go:196 → buildRequestPolicy :39-49 只解析
      build_attachment_sources / build_billing_sources / build_billing_entrypoint / build_identity_lines / build_injection / request_identity_sources / relay_mode / cli_version

变更时同步（控制器 PUT config）
  save → sameRuntimeConfig config.go:34-45 判断 → configChanged request_cache.go:243 → invalidateRequests + 总线 {"type":"ccgateway"} + Kick 全部 key config.go:596-602
  Reconcile accounts.go:309-369 → desiredKey → putConfig :409-442 → PUT /accounts/<key>/config
      body accountDesired :42-66：cli{version, request_mode:"build", disable_auto_update}, network{pool,allocation}, revision, enabled, proxy|direct, auth(mode/api_key/base_url/locale/timezone)
  revision = sha256(账号字段|凭据密文|settings|…) accounts.go:135,146 再叠 network、cli network.go:66,71

Worker 本地状态（不经核心存储）
  请求日志级别：PUT /system/ccgateway/accounts/:id/request-logs → serveRequestLogs request_logs.go:34-84 → Worker admin/request-logs（级别存在 Worker 数据卷）
```

### 2.2 两类下发的归属

| 设置 | 下发方式 | 备注 |
|---|---|---|
| level → relay_mode、build_billing_sources、build_billing_entrypoint、build_attachment_sources、build_injection | 每请求策略头 | 按 level 稀疏化（workerPolicy） |
| cli_version | **两条路都走**：策略头（Worker 核对 `claude_version`）+ 控制器 config `cli.version`（决定容器里装哪个 CLI） | 来源同一字段，设计上需要两处一致 |
| network（pool/allocation）、proxy/direct、auth、locale/timezone、enabled | 控制器 config（revision 变化触发重建/重配） | — |
| `cli.request_mode` | 控制器 config，**永远 "build"**（network.go:69） | 真实模式由每请求 relay_mode 决定，这个字段已成摆设（A11） |
| 请求日志级别 | Worker 本地 | 容器重建即回默认（设计如此，§REQUEST-LOG-LEVELS §1） |
| unknown_field、allow_fast、allow_effort、tool_search、custom_tool_prefix、thinking_disabled_compat、erase_client_attachments、replace_client_attachments、betas（34 条）、schema_version | 每请求策略头 | **生产 Worker 不读**（A1） |
| build_identity_lines、request_identity_sources | 存储保留、**不下发**（workerPolicy :403,407） | 界面已去掉；Worker 仍能解析 |

### 2.3 继承合并在哪里算

| 层 | 实现 | 用途 |
|---|---|---|
| 核心 | `applyFeatureOverrides`/`applyLevelOverride`/`ResolveFeaturePolicy` feature_policy.go:133-304；迁移 `migrateLegacyLevel`/`keepLegacyInjection` request_policy.go:90-138 | 请求路径与预览接口的事实源 |
| contracts（Go） | `LevelInjection`/`LegacyLevel`/`RelayModeForLevel` levels.go；`BuildInjection.Merge/Effective` injection.go | 核心与 Worker 共用 |
| 前端 | `mergeFeaturePolicy`/`levelOf`/`legacyLevel`/`legacyInjection`/`levelInjection`/`mergeInjection` requestPolicy.ts:57-117,285-346 | 编辑器即时显示；**完整重写了一遍 Go 逻辑** |
| 插件进程 | 不参与（没有 RankAccounts，不读策略） | — |

默认值定义在 **4 处**：`defaultRequestPolicy`/`newRequestPolicy`（request_policy.go:71-84）、web `defaultRequestPolicy`/`newRequestPolicy`（requestPolicy.ts:202-228,325-327）、engine 的 native `defaultRequestPolicy`（engine/request_policy.go:46-48，不可达）、以及 `ResolveFeaturePolicy` 里再补一轮（client/sdk-cli/replace，feature_policy.go:253-286）。web 的默认 `betas` 是 7 条，核心是 34 条（`features.BetaRules()`），核心保存时无条件覆盖为自己的（request_policy.go:177），所以不出错，但说明这份默认值是死的。

TS 与 Go 的一致性只靠跨层夹具 `web-policy-payloads.json`（16 例，`expect` 由前端算出、核心断言）保证，覆盖 level/relay_mode/billing/attachment/injection；没有覆盖"迁移前旧策略 + 分组 relay_mode 覆盖"之外的组合，也不覆盖 `sources` 图。

## 3. 发现表

级别：P0 阻断 / P1 线上错误行为 / P2 需修 / P3 质量与隐患。"已确认"= 亲自读到并能指出执行路径；"怀疑"= 依赖未验证的外部事实。

| # | 级别 | 位置 | 问题 | 证据 | 建议 |
|---|---|---|---|---|---|
| A1 | P2（上一轮 P2 的扩大，**未修**） | `request_policy.go:12-54,146-179`；`feature_policy.go:369-409`；`engine/request_command.go:39-49`；`engine/main.go:634-637` | 核心每请求下发 10 个无人读的字段。上一轮只列了 4 个旧字段；实际 `erase_client_attachments`、`replace_client_attachments`、`allow_fast`、`allow_effort`、`betas`（34 条规则，约 1.7 KB）、`schema_version` 同样不被生产路径解析。`g.RequestMode` 缺省 `build`（main.go:634-637）→ 一律进 `serveRequestCommand`，解析器是 `buildRequestPolicy`（只有 8 个键）；读这些字段的 `engine/requestPolicy()`（request_policy.go:52）只在不可达的 native exchange 里调用。 | 已确认。`workerPolicy` 只清空 identity 两项与 attachment（direct 时），其余原样 marshal（client.go:243）。CONTRACTS §53.11/§53.15/§53.16 仍把 thinking/erase/replace 写成生效设置。 | 核心 `workerPolicy` 改为只输出 Worker 读的 8 个键（白名单而不是黑名单）；存储结构里的旧字段标 deprecated 并在一次迁移里删除；CONTRACTS 三节改为"已下线，由 build_attachment_sources 取代"。前端 `requestPolicy.ts:118-172,174-200` 相应删除。 |
| A2 | P2 | `plugins/ccgateway/internal/ccgateway/classify.go:95-100,108-109,120-139,151-170`；`engine/request_error.go:107-125,169-171`；`engine/main.go:124,528-536,563`；`engine/native_events.go:23,42-45` | 插件分类器依赖的 4 组内部头，只有不可达的 native 路径会设置：`x-ccgateway-error-scope: request`、`x-ccgateway-error-source: cli`、`x-ccgateway-cli-error`、`x-ccgateway-cli-status/quota-type/quota-reset`。生产路径 `requestErrorFrame.write` 只发 `X-CCGateway-Error-Source ∈ {http,input,transport,timeout,interrupted,internal}`（`valid()` 枚举，`requestfailure.Source` 同），`httpfacts.Apply` 又把 `x-ccgateway-*` 全部滤掉。后果：(a) `nativeQuotaObservation` 与"按作用域窗口只切换不禁用"分支（:123-131）是死代码；(b) 任何上游 429 都走 :133-139 → 托管账号 **DISABLE 到 reset**，即使只是 `7d_fable`/`7d_sonnet` 作用域窗口用尽，其他模型也被一起停掉（**怀疑**：取决于上游 429 头里是否带作用域信息，本机无法验证）；(c) Worker 本地 400（`Invalid gateway request policy`、`build mode requires text system blocks`）没有 request 作用域标记，与上游 400 一视同仁——结果恰好相同（RETURN_TO_CLIENT），但纯属巧合。 | 已确认（死代码、枚举不交）；(b) 为怀疑 | 要么让 `requestErrorFrame` 带上 CLI 的错误分类（Worker 端把 `cli_error`/quota 类型写进 frame.Headers 并在 `write()` 显式放行），要么删掉插件里这几段并补一个"作用域 429 只切换"的替代判定（按 anthropic-ratelimit-* 头名区分）。无论哪种，先补一个插件测试：用 `X-CCGateway-Error-Source: http` + 真实 429 头喂 `ClassifyError`，断言期望。 |
| A3 | P2（潜伏） | `feature_policy.go:40-76`（`FeatureOverrides.UnmarshalJSON` 调 `Validate`）；`config.go:256-283`；`feature_policy.go:306-318`；`injection.go:29,40-55`；`CC-INJECTION-LEVELS-DESIGN.md §5` | 词表收窄时核心对已存数据零容忍。`InjectionTools` 在 d2e8080a7 从 20 收到 7，设计写"不在候选里的旧工具选择，读取时丢弃"，但只有前端做了（`knownInjection` requestPolicy.ts:273-280）。核心：分组覆盖在加密 Config 里 → `json.Unmarshal(plain,&c)` 经 `FeatureOverrides.UnmarshalJSON` → `Validate` 失败 → **整份配置解码失败** → `Load` 报错 → 所有 CCGateway 页面与请求失效；账号覆盖 → `LoadAccountFeaturePolicy` 失败 → 该账号详情 GET（account/handlers.go:366）和每个请求（client.go:219-223）都失败，界面无法打开去改。v19 未上线所以线上无存量（§11 已查），但同类收窄（`ErasableClientAttachments`、`BillingEntrypoints`、`BuildAttachmentFields`、`IdentityLineChoices`）下次仍会踩。 | 已确认（路径），无线上数据 | 解码与校验分离：`UnmarshalJSON` 只解结构，在 `ResolveFeaturePolicy` 入口做"丢弃未知项 + 记一条 warn"，保存时才严格校验。给 `Config` 解码加一条测试：存入含未知工具名的分组覆盖，`Load` 必须成功。 |
| A4 | P2（上一轮 P2，**未修**） | `request_cache.go:78-85,145-151` | 路由缓存只按 key+revision 命中，`accountRoute` 没有时间戳，不随 `requestCacheTTL` 过期。漏收 `{"type":"ccgateway"}` 的节点会一直用旧控制器地址/证书/密钥建隧道，直到该账号 revision 变化。§49.18 写"配置和期望状态另有 30 秒过期"，路由没有。 | 已确认 | 路由键加入控制器端点指纹（scheme/host/port/base_path/CA 指纹/AdminKey 哈希），或给 `accountRoute` 也加 `at` 并按 TTL 丢弃。 |
| A5 | P2（上一轮 P2，**未修**） | `config.go:583-589,555-565` | `save()` 把所有非 Conflict 错误替换成一段 200 字的通用文案：`Unknown CC feature group.`、`invalid level: x`、`invalid build_injection.tools: X`、`invalid relay_mode` 全部丢失。孤立分组键（分组删除后）仍没有清理钩子（grep `CCFeatureGroups` 无 group 删除联动），前端靠 `nameOf` 回退显示 `#id` 让人手动删（GroupPolicyList.vue:40）。 | 已确认 | `mergeConfig` 返回 `*core.Error`（已有 `core.ErrInvalidArgument.WithMessage`），`save` 直接 `httpapi.Fail(c, e)`；分组删除事务里顺手删 `cc_feature_groups[<id>]`。 |
| A6 | P3 | `client.go:219-241`；`gateway/dispatch.go:569-588`；`classify.go:101-107` | 能力预检失败、策略校验失败、`reasonError(ErrUnavailable, account_deleted/proxy_unavailable)`、"CCGateway key is not configured" 都以 `error` 从 `RoundTrip` 返回 → dispatch 当传输错误（status 0）→ 插件 10 s 冷却 + 切换 + 客户端 502 "upstream connection failed"。`required_capabilities` 细节只剩 `err.Error()` 的一句话进账号冷却原因。一次错误的策略保存会让分组内账号轮流冷却 10 s 后才给客户端 502。 | 已确认 | 配置类失败在 `forwardAttempt` 里改成构造 Anthropic 格式的本地响应（如 `notSynchronizedResponse` 那样），并用 `X-CCGateway-Error-Source: internal` 标明；真正的连接失败才返回 error。 |
| A7 | P3 | `feature_policy.go:346-357`；`runtime_features.go:66-105`；`accounts.go:410-430`；`network.go:54-66` | 每个模型请求：1 次 `LoadAccountFeaturePolicy` 查库 + 1 次 Worker `/healthz`（经隧道）+ 正文请求；§49.18 说"转发请求不再每次读库"，账号策略是例外且没写进去。`putConfig` 每次 reconcile 都先 `GET /health` 查 `cli-profile-v1`（每分钟×账号数）。`desiredIn` 之后 `desiredNetwork` 再读一次 settings 行并解密整份 Config。 | 已确认 | 账号策略进 `requestCache.desired`（revision 已含 `a.settings`，可把 feature revision 也拼进去）；`/healthz` 能力结果按 `(key, revision, worker build revision)` 缓存并由 Worker 原地更新事件失效；`cli-profile-v1` 用 `controllerHealth.has()` 读一次缓存。 |
| A8 | P3 | `server/.../contract_fixture_test.go:64-75`；`engine/contract_fixture_test.go:36-60`；`contracts/testdata/worker-cli-requests.json` | 跨层夹具少了中间一跳：核心测试算出 `wire`（workerPolicy 结果）后只做局部断言，没有写进夹具；Worker→CLI 夹具里的策略头是手写的，还包含核心已不再下发的 `request_identity_sources`、`build_identity_lines`。核心改 `workerPolicy`（例如本次去掉身份行）在 Worker 侧没有任何测试会红。 | 已确认 | 由核心测试生成 `core-worker-policies.json`（16 例的 wire 形），engine 测试读它喂 `serveRequestCommand`，断言 400/409 不出现且 components 的 `requestPolicy` 等于期望。 |
| A9 | P3 | `runtime_features.go:36-39,22-24`；`feature_policy.go:253-286`；`request_policy.go:181-183`；`direct.go:31-41` | 身份行/身份来源退役后留下的死分支：`requestPolicyCapabilities` 里 `p.RequestIdentitySources.Explicit()` 与 `len(p.BuildIdentityLines) > 0` 在 `workerPolicy` 之后恒为 false；`ResolveFeaturePolicy` 仍为六个入口填默认身份行并写 `sources`（预览接口把它们返回给前端，前端再删）。`WorkerRequestPolicy(_ int64)` 只被 legacy helper-history 用；`requireBuildAttachmentCapability`、`openAccountModel` 无生产调用。 | 已确认 | 删除；`ResolveFeaturePolicy` 的 7 段 `sources[...]="global"` 循环收成一个按 `features` 词表驱动的表。 |
| A10 | P3 | `client.go:84-95`；`feature_policy.go:346-350`；`ccgateway.go:180-192` | 账号"测试"走 `/v1/ccgateway/probe`，GroupID=0 → 不含分组/账号覆盖，Worker 强制 build。测试通过不代表该账号在其分组策略（如 level=none 或 high 注入）下可用；反之策略错了测试也不会红。设计写"probes never choose a group"，但界面没有告知。 | 已确认 | 账号测试至少按账号所属的第一个允许覆盖的分组解析一次策略，或在结果里注明"按全局策略测试"。 |
| A11 | P3 | `network.go:67-72`；`engine/main.go:86-97` | `RuntimeCLI.RequestMode` 写死 `"build"`，控制器据此设 `CCG_REQUEST_MODE`，而真实模式由每请求 `relay_mode` 决定（main.go:91 允许 header 覆盖）。同一事实两份表达，`cli_version` 也同时走 config 与策略头。 | 已确认 | 控制器 profile 去掉 `request_mode`（或改名 `default_mode`），策略头保留 `relay_mode`；`cli_version` 以控制器 profile 为准，策略头改为 Worker 回报并由核心核对。 |
| A12 | P3 | `accounts.go:148-159` vs `:206-210`；`client.go:20-21` vs `ccgateway.go:27-28`；`manifest.json` 两个 accountType 的 `passHeaders`/`defaultModels` 与 `ccgateway.go:133-146`、`models.go:12-16` | 同一事实多份：账号 settings 的 locale/timezone 在 `desiredIn` 手写 map 解析、在 `draftDesired` 用 `environment.Normalize`；虚拟 URL 常量核心与插件各一份；透传头白名单在 manifest 两份 + 插件正则表一份；默认模型列表 manifest 两份 + Go 一份（靠 `manifest_test` 对齐）。 | 已确认 | manifest 由 Go 常量生成（或 Go 从 manifest 读）；`desiredIn` 改用 `environment.Normalize`。 |

**上一轮 §7 修复表复核**（抽查与本范围相关的）：P1-1（前端 `schema_version:1`）、P1-2（`not_synchronized` 改 503 api_error，client.go:271-277，classify 走 5xx 冷却）、R1/R2/R7（identity 默认不下发、全局 PUT 省略 identity 保留 config.go:374）、C3 已在代码里确认。**未修且本轮再次确认**：A1（4 个旧字段扩大为 10 个）、A4（路由缓存键）、A5（孤立分组键与错误文案）。

## 4. 代码规范观察

扫描对象：核心 `server/internal/ccgateway/*.go`、插件 `plugins/ccgateway/**/*.go`（不含测试）。

**超过 80 行的函数（行数 / 最深嵌套）**：`controller_install.go:202 controllerInstall` 229/3；`config.go:324 mergeConfig` 155/3；`accounts.go:622 serveRuntime` 153/4；`client.go:143 forwardAttempt` 127/4；`controller_uploads.go:220 uploadLoad` 123/3；`bundle_push.go:208 runtimeBundled` 107/4；`availability.go:53 evaluateQuotaAvailability` 96/3；`feature_policy_http.go:26 accountFeaturePreview` 95/3；`request_logs.go:242 decodeRequestLogState` 95/4；`workers.go:189 updateWorkerWithOptions` 85/2；`workers.go:278 runtimeWorkers` 82/3。

**嵌套 ≥4（不足 80 行）**：`config.go:530 save` 5 层（事务闭包里再循环再 if）；`request_policy.go:90 keepLegacyInjection` 5 层；`classify.go:75 ClassifyError` 4；`sweep.go:130 sweepRetired` 4；`request_cache.go:145 route` 4；`request_log_viewer.go:112 requestLogQuery` 4；`controller_api.go:145 panelUpgrade` 4；`cli_management.go:57 decodeCLIToolCatalog` 4；`lifecycle.go:14 OnAccountLifecycle` 4；`accounts.go:461 reconcileKicked` 4。

### 抽象
- `RequestPolicy`（request_policy.go:12-54）同时是：存储形、界面形、Worker 线形、校验入口。四种用途一个结构体，导致 `workerPolicy` 要靠"把不该发的字段置 nil"来做稀疏化，一旦漏一个就多发（A1）。建议拆成 `StoredPolicy` / `WirePolicy`（后者只 8 个键，放到 `contracts/features`，Worker 的 `buildRequestPolicy` 直接复用同一类型）。
- `accountDesired`（accounts.go:42-66）既是控制器 PUT body 又是内部状态（`json:"-"` 字段 7 个）。请求路径只需要 `Key/Revision/unavailable()`，却要走整段 SQL + 解密。拆出 `runtimeIdentity{Key, Revision, Unavailable}`。
- `requestLogChange`（request_logs.go:89-94）是一个"四选一"用 4 个字段表达，`body()`/`audit()`/`parseRequestLogChange` 三处各写一遍 switch。用一个 `kind` 枚举 + 值即可。

### 复用
- 同一段校验写了三份：核心 `validateRequestPolicy`（request_policy.go:185-235）、engine `requestPolicy()`（engine/request_policy.go:52-117）、前端 `validRequestPolicy`（requestPolicy.ts:289-308）；`^auto:(0|[1-9][0-9]?|100)$` 与 `^[A-Za-z0-9_-]{1,32}$` 各出现 3 次。前两者都能从 `contracts/features` 调。
- `"2.1.304"` 字面量：`request_policy.go:72,175`、`runtime_features.go:32,46`、`workers.go:73`、`requestPolicy.ts:217`、`RuntimeInstall.vue:177`、`engine/cli_pinned.go`。应只在 `contracts/features`（或 CLI profile）定义一处，核心按能力判断（上一轮 §6 已提）。
- `&http.Client{Transport: …, CheckRedirect: func(…) error { return http.ErrUseLastResponse }}` 7 处（client.go:47,62,73,93；request_cache.go:165；direct.go:106 等）→ `newNoRedirectClient(tr)`。
- `io.ReadAll(io.LimitReader(res.Body, N+1)); len(raw) > N` 29 处（runtime_features.go:86,130,165；request_logs.go:66；direct.go:77…）→ `readBounded(r, N)`。
- `SELECT value FROM settings WHERE key=$1` + `s.decode(raw)` 3 处（config.go:297、network.go:56、feature_policy_http.go:132）→ `s.loadIn(ctx, q)`。
- `applyFeatureOverrides`（feature_policy.go:158-197）四段几乎相同的 map 覆盖循环 + `ResolveFeaturePolicy`（:250-286）七段 `sources[...]="global"` 循环：定义一张 `[]layerField{name, get, set, defaultValue}` 表后两处各一个循环。
- 插件 `headers()`（ccgateway.go:113-129）白名单与 manifest `passHeaders`（两份）三处同步。

### 解耦
- `client.go:forwardAttempt` 一个函数里做：读配置、读期望状态、模式分支（legacy/ssh/local/controller）、路由、策略解析、能力预检、改头、发请求、401 善后。legacy 分支（`!cfg.AccountRuntimes`）按 §53.9 已不可配置却仍在热路径里占 30 行。拆成 `resolveRoute()` / `attachPolicy()` / `send()` 三步，legacy 整段删除。
- `config.go:save` 的事务闭包里做分组存在性 SQL（:555-565），应在 `mergeConfig` 之外、事务之内单独一步，闭包只做 merge+encrypt。
- 插件 `classify.go` 耦合于 engine 的 native 内部头（A2）：契约应只认 `contracts/requestfailure` 与 `httpfacts` 两个包导出的常量，`"cli"`、`x-ccgateway-cli-error` 这类字面量不该出现在插件里。

### 简洁 / 死代码
- 核心：`requireBuildAttachmentCapability`、`openAccountModel`、`WorkerRequestPolicy`、`requestPolicyCapabilities` 的 identity 两支、`ResolveFeaturePolicy` 的身份行默认填充（A9）。
- 前端 `requestPolicy.ts:118-172`（`attachmentGroups/attachmentRows/erasableAttachments/attachmentAction/setAttachmentAction`）没有任何 `.vue` 引用，只被 spec 养着；`RemoteSettings.vue:153` 的 `!config.request_policy` 分支不可达（核心 `Public()` 总返回 `request_policy`）。i18n `attachmentAction_*` 三个键同理。
- `mergeConfig:357-359` 对 `RelayMode` 的预检与 `validateRequestPolicy:222-224` 重复。

### 嵌套
- `save`（config.go:530）5 层：`Tx(func){ UpdateSettingJSONTx(func){ for key := range { if err := QueryRow … } } }`。把分组存在性检查提成 `ensureGroupsExist(ctx, tx, keys)`，闭包回到 2 层。
- `keepLegacyInjection`（request_policy.go:90）5 层：两个 `for` 各含 `if !added[...] { if out.X == nil {…} }`。先 `out.Attachments = cloneOrNew(...)` 再循环，可降到 2 层。
- `forwardAttempt`、`serveRuntime` 用 `fail := func…` 闭包替代 early return，读起来每个分支都要回看闭包副作用（`cancel()`/`finish()`）。

## 5. 对设计文档的异议

1. **CC-INJECTION-LEVELS-DESIGN §6 表**写"micro：再加身份行"下发，与同文档 §8.4"核心不再下发 build_identity_lines"及代码 `workerPolicy:403` 矛盾。§6 应改为"micro 与 none 的线形相同，只是 relay_mode=build"。
2. **CC-INJECTION-LEVELS-DESIGN §5**"不在 7 个候选里的旧工具选择，读取时丢弃"——核心没有实现（A3），只有前端实现。文档应写明"前端丢弃、核心拒绝"，或者把核心改成文档说的那样。
3. **CC-REQUEST-LEVELS-DESIGN §7.1**仍说工具候选 20 个、"核心只下发为 true 的项，什么都不补时不下发"。前者已被 §INJECTION §4 收窄为 7；后者在 levels 之后不成立：low/high 级别总是下发 `LevelInjection` 的默认项（`workerPolicy:400`），所以 low 及以上**总是**要求 `build_injection_v1`。文档该标注"被 INJECTION-LEVELS 取代"。
4. **REQUEST-MODES.md**整篇停留在 CLI 2.1.302 / v17："direct…补按入口配置的身份行"、"Core 缺省配置为 build / CLI 2.1.302"、"CLI v16 起 direct 为纯透传：不补计费头"。三句都与现状（v21：direct 补主线程计费头、不补身份行；CLI 2.1.304）相反。要么重写，要么顶部声明只保留历史发布记录。
5. **CONTRACTS §53.15/§53.16/§53.11**把 `erase_client_attachments`、`replace_client_attachments`、`thinking_disabled_compat` 写成当前有效设置；§53.17 说 `build_attachment_sources`"仅允许 platform_name、os_version 两个键，值为 client/worker"。现状是 10 个键、三个值（含 erase），且前三者在 build/direct 下无效。契约文档与代码不一致，且这正是上一轮 P2"线上开的 thinking omit 已失效"没人注意到的原因。
6. **CONTRACTS §49.18**"转发请求不再每次读库"——账号策略 `LoadAccountFeaturePolicy` 每请求一次查库（A7），§49.18 没有写这个例外；另外"配置和期望状态另有 30 秒过期"没有包括路由（A4）。
7. **REQUEST-LOG-LEVELS §1**"开关状态存在 Worker 数据卷里"是现状描述，但没有说明容器重建（原地重新授权不重建，删除重建会）后级别回到默认摘要、且核心不记录各账号级别——多节点界面显示只能靠逐个查 Worker。建议在 §4 写明这是有意为之。
8. **ACCOUNT-RUNTIME-LIFECYCLE** 与 **REQUEST-MODES** 都没有提"核心对每个带等级的策略都要求 `request_levels_v1`，老 Worker 一律 409→502"。这是发布顺序（先插件后核心）的硬约束，应进 CONTRACTS 而不是只在设计文档 §6 一句话。

## 6. 未能验证的范围

- 核心 `internal/ccgateway` 需要 PG 的测试（上一轮口径 4460 项）未运行；只跑了 6 个不依赖 PG 的顶层测试。
- A2(b) 的实际后果取决于上游对作用域窗口 429 返回的 `anthropic-ratelimit-*` 头形状，本机无法构造真实上游；需在 30 号账号上触发或抓一条历史 429 的头来判定。
- 控制器（Python）如何使用 `cli.request_mode`、`cli-profile-v1`，以及 Worker 的 `/healthz` 能力列表怎样由 CLI 版本推出（`engine/cli_pinned.go`）未读；A11 的"摆设"结论基于核心侧写死 `"build"` 与 Worker 侧按请求头覆盖这两点。
- `web/src/views/accounts/AccountEditor.vue` 保存 `cc_feature_policy` 的具体载荷未读（不在本范围），只确认了核心侧入口 `account/handlers.go:1292`。
- 多节点总线丢消息的概率没有数据，A4 的实际暴露面无法量化。
- 没有运行前端测试或 `vue-tsc`。
