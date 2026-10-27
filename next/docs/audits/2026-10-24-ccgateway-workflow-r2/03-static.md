# CCGateway 工作流静态审核（第二轮）

> 2026-10-27 清理：文中引用的本机 `artifacts/` 与 ovh 上 `~/sup2api/checks/`、旧 `release-*`、`~/sup2api-managed/{stage,backups,publish,ccgateway-images}/` 下的旧版本原始记录已删除，路径仅作出处；现存位置见 [CLI-TEST-PLAN](../../../plugins/ccgateway/docs/CLI-TEST-PLAN.md)。

2026-10-25。审核对象：`feat/next-platform` HEAD `f12c5fb7e`（线上核心 0.1.186 / ccgateway 0.1.90 / CLI 2.1.304 `ccgateway-v26-native-assembly`）。只读源码，不改代码。CodeGraph/Serena/WarpGrep 本轮不可用（ECONNREFUSED），全部用 git/grep/sed 与 `artifacts/claude-2.1.304/linux-restored`（基线源码）、`artifacts/claude-2.1.304/patched-v26`（补丁产物）交叉核对。

本轮回答两个问题：0.1.87（上一轮审核基线）之后的 0.1.88–0.1.90 是否正确、有无回归；以及当前代码下这条链路是否仍然「与官方客户端一致」。

本地测试（真跑，未跳过）：

- `next/plugins/ccgateway/companions/cli-mods`：`node --test test/*.test.mjs` → **178 pass / 0 fail / 0 skipped**（恢复源码存在，`patch-wire-preservation-304` 真实执行了补丁器）。
- `next/plugins/ccgateway/companions`：`go test ./engine/... ./contracts/...` → **全部 ok**（engine 25.8s，contracts/credits、features、httpfacts、resources 等全绿）。

---

## 0. 结论（先看这几条）

1. **上一轮唯一的 P1（带 fallback-credit beta 的普通请求：上游 200、客户端 502）在 0.1.88 被修好了，静态成立**：Worker 新增 `request_credit.go`，对核心标记（`X-CCGateway-Fallback-Credit-Track` / `-Credit`）真正做准入、签发身份、核验身份，并在响应上回写 `X-CCGateway-Fallback-Credit-Ready`；核心 `observeFallbackCredit` 需要的三样证据（Principal、Generation、Ready）现在都有生产方。**但这条修复带来两个新的可用性代价**（整段缓冲、资源授权锁被整请求持有），见 §6 P2-1/P2-2，必须实测。
2. **`?beta=true` 已两种模式都对**：build 走原生 `client.beta.messages.create(...)`（路径就是原生 `Ps.create` 的 `/v1/messages?beta=true`），direct 用补丁期 AST 从原生源码取出的同一字面量（`model-request.js:75`）。上一轮 D1 关闭。
3. **beta 顺序（0.1.89）静态成立**：新增 `request-betas.js`，顺序 = 原生模型表 `S8n` + 请求构建器 `uXn` 的 `zr.push` 顺序（补丁期 AST 读取并填入支持模块），`finalBetas` 只在「客户端没有、请求要加」时插入；模型表不可识别时**明确回退为追加**并写一条 `CCG_BETA_ORDER_UNAVAILABLE` stderr 诊断（`request-betas.js:16-24`、`request-command.js:160-163`）。上一轮 A5/R2 关闭。
4. **身份行（0.1.90）交回原生，语义与 v25 等价**：build 记录 `recordedCliPrefix`（`request-build.js:169-178`），原生 `n1n` 渲染、`PAs` 按原生位置 `[header, line, ...prompt]` 拼；补丁在 `PAs` 里 `ccgatewayCapturePrefix?.(n)` 把原生渲染出的那一行交回 build（`patch-cli-2.1.304.cjs:246`），再由 `applyIdentityLine` 写进最终 body（`request-build.js:187-204`）。静态核对：`rendered === identity.recorded`（除 vertex 情形），因此出口应逐字节等于 v25，属「换实现不换行为」，仍需 A/B 实测。
5. **`FH` 改成客户端定义逐字返回（0.1.90）**：`if(ccgIsNative(e))return structuredClone(e.ccgatewayRequestDefinition)`（`patch-cli-2.1.304.cjs:200`）。body 里的工具本来就走 `ccgatewayWireTools`（`patch-cli:209`），因此出口工具定义的键序/字段不变；变化只影响 CC 内部策略看到的定义对象（少了原生加的 `strict`/`eager_input_streaming`/`defer_loading` 之类），见 §6 P3-5。
6. **AST 定位全部 fail-closed**：`edit`/`once`/`requestBuilderBetas`/`betaMessagesPath`/`nativeSystemRecordExport`/`appendJoin`/`checkImports` 找不到唯一锚点时都抛错，不静默跳过（`patch-cli-2.1.304.cjs:62-72,96-159,256-266,306-338`）。profile 的 `extension`、`supportModules` 与 README 一致。
7. **仍有 5 类问题**（详见 §6）：被跟踪请求整段缓冲（P2-1）、credit 授权锁整请求持有（P2-2）、资源输出路径仍 502（P2-3）、事实文档大面积过期（P2-4）、以及若干 P3。**没有再发现 P1**。

---

## 1. 请求路径逐段追踪（HEAD 代码）

```
客户端 ──► 核心 gateway（pipeline.go）
             ├ passHeaders：13 个客户端头（manifest.json:81-95 / 140-154）
             ├ checkFallbackCredit（fallback_credit.go:35-88）→ 命中即 creditRequest
             ├ 账号模型映射 / 资源引用（dispatch.go:387-419）
             └ applyResourceHeaders（resource_references.go:172）→ applyCreditHeaders（fallback_credit.go:100-145）
                  · 先删掉客户端伪造的所有 x-ccgateway-fallback-credit*，再设 Tracking=1、Admission=token hash、Principal、Generation
        ──► 插件（gRPC BuildUpstreamRequest；头二次白名单，值不匹配即丢弃）
        ──► Worker：POST /v1/messages
             ├ admitRequest（request_command.go:110-129）：策略/能力/方法/版本
             ├ admitCredit（request_credit.go:54-77）：tracking 校验 → 锁 resource authority → 身份核验 → 响应上写 Principal/Generation
             ├ 请求槽位（非阻塞，满则 429；request_command.go:93-100）
             ├ prepareRequest（136-150）：读 body → admitCreditBody（token 与 admission 绑定）→ identity/agent → CLI stdin
             └ runCLI（361-401）：
                  · tracked：stdout 全部缓冲到 requestCommandOutput.body（request_credit.go:167-173）
                  · untracked：首字节即 commit 并 flush（request_command.go:586-598）
        ──► CLI（claude request --build|--direct）
             ├ direct：readInput → checkModelRequest → prepareDirect（request-command.js:190-206）→ client.post(messagesPath)（model-request.js:93）
             └ build：prepareBuild（212-221）→ buildRequest（request-build.js:211-248）→ client.beta.messages.create(body,{...}).asResponse()（model-request.js:91）
                       身份：identityBuild（metadata）+ applyIdentityLine（system 身份行）
                       betas：requestBetas 一次放置（request-command.js:160-163）→ 最终在 fetch 边界写头（request-headers.js:39-65）
             └ fetch 边界：captureErrorResponse 的 fetchOverride（model-request.js:50-68）→ authenticatedRequestHeaders
        ──► 上游（Anthropic / API-key 账号 base_url）
        ◄── 响应：CLI stdout → Worker（tracked 缓冲后 commit + Ready 头；untracked 流式）→ 核心 httpfacts 白名单 → 客户端
        ◄── 错误：CLI stderr 的 CCG_REQUEST_ERROR 帧（request-error.js）→ Worker requestErrorReader → 上游状态/正文原字节
```

关键不变量（静态可确认）：

- **上游只可能有 CLI 自己写的头**：核心/插件/Worker 之间的私有头（policy、resource、credit、session-scope、x-request-id）不进 CLI 环境，也不进上游（`request_command.go:405-432` 只把 `anthropic-version`/`anthropic-beta` 变成参数）。
- **Worker 的 credit 头只用于准入与证据**：`request_credit.go` 只读入站头、只在响应上写 `Principal/Generation/Ready`，不写入 CLI env，因此不会泄漏到上游。
- **tracked 与 untracked 的唯一出口差异是「什么时候把字节交给客户端」**：body 字节本身对 tracked 是 `o.body.Bytes()` 原样写出（`request_credit.go:190`），对 untracked 是逐块 `writer.Write`。

---

## 2. 0.1.87 之后的改动与回归审查

提交范围：`git log --oneline 352495dd7..HEAD -- next/plugins/ccgateway`

- `a26a8f673` / `3058f764f`（插件 0.1.88）：Worker fallback-credit 回执；CLI v24 `?beta=true`。
- `5eb390030` / `8413bf913`（插件 0.1.89）：CLI v25 原生 beta 顺序 + 优雅度整理。
- `ad5914a04` / `376d35d01`（插件 0.1.90）：CLI v26 身份行/请求调用/工具定义交回原生。

### 2.1 fallback-credit 回执（0.1.88，Worker 侧）——修复成立，有代价

新增 `next/plugins/ccgateway/companions/engine/request_credit.go`（242 行）+ `request_command.go` 接线 + 296 行测试。

**准入（`request_credit.go:54-87`）**

- 无 tracking、无 admission → 不跟踪（`54-57`），untracked 路径完全不变。
- 有 tracking/admission → 必须「tracking 恰好一次且为 1」「admission 至多一次」「`credits.Enabled(Anthropic-Beta)`」（`81-87`），否则 400。这堵住了客户端伪造 tracking 的可能（核心在 `applyCreditHeaders:102-106` 也会先删客户端自带的这一类头）。
- 资源 broker 不存在 → 503（`61-63`）。

**身份核验（`92-111`）**

- 先按资源路径的顺序 lock → slot 取资源授权锁（`68-70`），用独立 slot 调 `g.resources.identity(ctx)`（`93-97`），把 `Principal/Generation` 写进响应头，再与服务账号本应绑定的值比对（`107-109`，`verifyExpectedResourceIdentity` → `resources.ValidateIdentityHeaders`）。
- 授权锁一直持有到请求结束（`serveRequestCommand:86-89` 的 `defer credit.release()`），这是「不让重授权在请求中途换 issuer」的设计，但也是 §6 P2-2 的根因。

**body 绑定（`116-139`）**

- `fallback_credit_token` 只有在 tracking 存在时才允许；有 admission 时必须等于 `sha256(token)`（`121-133`）。
- 保存 client body 与入站 betas 供回执计算（`134-137`）；核心的 `ClaimForResponse` 用的是同一份用户 body，两边一致。

**回执与缓冲（`167-213`）**

- tracked 请求的 stdout 全部进 `bytes.Buffer`（`167-173`），上限 `credits.MaxBodyBytes`（32 MiB，`contracts/credits/prompt.go:20`），超限 → 502 `credit_receipt_too_large`（`request_command.go:474-476`）。
- CLI 成功后才 `finish()`：读 `--response-meta` → 计算 claim（JSON 直接读、SSE 走 `creditPayloads`+`MessageFromEvents`）→ 有 claim 才写 `Ready` → `commit` → 写 body → flush（`177-195`）。
- `answer()` 只在 tracked 时走 `finish()`，无跟踪仍是 `start()` 后流式（`request_command.go:504-511`、`586-598`）；`TestUntrackedRequestStillStreams` 覆盖。

**与核心的契约对齐（静态核对）**

| 核心要求（`fallback_credit.go`） | Worker 生产 | 位置 |
|---|---|---|
| 响应必须有 Principal/Generation 且等于 binding | `creditIssuer` 在准入阶段就 Set 到 `w.Header()`，后续 `commit`/错误帧都不会清掉（`httpfacts.Apply` 只补白名单头） | `request_credit.go:105-106`；`request_command.go:573-584`；`request_error.go:170-202` |
| 有 claim 时 `Ready` 必须只有一条且等于 claim 的 token hash | `finish()` 只在 `receipt()` 非空时写一条 | `request_credit.go:182-184,200-213` |
| 无 claim 时不能有 `Ready` | 不写 | 同上 |
| 上游 SSE 错误事件不产生 claim | `MessageFromEvents` 失败 → `receipt()` 返回空串 | `request_credit.go:200-207` |
| `FailureHeader=storage` + 无 Ready 的语义 | Worker 不产生 FailureHeader（本实现不落存储） | — |

**结论**：上一轮 D3 的「后果 1」（上游 200、客户端 502）静态上已修复；「后果 2」（资源 outputs 需要身份头）仍只在 tracked 请求上被顺带满足，未跟踪的资源输出请求依旧 502（§6 P2-3）。

**新代价（必须实测，见 §7）**

1. tracked 请求不再流式：客户端在 CLI 完整结束前收不到任何字节（`request_credit.go:167-173`），且响应 >32 MiB 直接 502。核心的 `forwardResourceResponse` 本来也整段读，所以端到端延迟相同，但客户端侧从「逐块」变成「一次到齐」，长回答可能触碰客户端自己的流式超时。
2. 资源授权锁整个请求期间持有：同一账号 Worker 上的文件/技能操作、其它 tracked 请求都要排队。

### 2.2 `?beta=true` 两种模式（0.1.88 / 0.1.90）——修复成立

- build：`client.beta.messages.create(options.body, {headers, signal, maxRetries:0, timeout}).asResponse()`（`model-request.js:83-96`）。原生源码 `chunk-38xgev2z.js` 的 `Ps.create` 固定 POST `/v1/messages?beta=true`，并自行处理 body 里的 `betas`（取出转 header）、`output_format` 兼容、非流式超时规则、`x-stainless-helper`（`Ho(tools,messages)`，只有带 SDK 符号的对象才产生；我们的 body 是纯 JSON，因此该头不出现）。
- direct：`messagesPath` 由补丁期 AST 从原生 `Ps.create` 的字符串字面量填入（`patch-cli:138-152`；产物 `artifacts/.../patched-v26/ccgateway-model-request.js:75` 为 `"/v1/messages?beta=true"`），`client.post(messagesPath, {body: rawBody, stream, ...})`（`model-request.js:93-95`）。SDK 的 `buildURL` 会把 `?beta=true` 原样保留。
- 超时/重试语义未变：显式 `timeout = min(--timeout-ms, 600000)`、`maxRetries: 0`，因此原生 `calculateNonstreamingTimeout`（按 `max_tokens` 上限 600s 抛错）不会触发；`x-stainless-timeout = trunc(timeout/1000) = 600`。
- 错误捕获未变：`captureErrorResponse` 的 `fetchOverride` 仍在 fetch 边界应用 `authenticatedRequestHeaders`、保留最后一条非 2xx 响应（`model-request.js:50-68,111-117`）；`.asResponse()` 不触发解析，非 2xx 由 request command 按 `writeHttpError` 原字节回传。
- 注意（P3-3）：经原生 `create` 后，body 会额外经过 `qu()`：`output_format` 会被搬进 `output_config.format`，两者同时出现会抛错；`user_profile_id`/`workspace_id` 会被从 body 移到请求头。这些字段真实 CC 不发，仅影响「客户端 parameters 里塞了这些键」的极端 build 请求。

### 2.3 beta 顺序（0.1.89）——静态成立

- `request-betas.js:16-24`：`betaOrder(model)` = `S8n(model,{isAgenticQuery:true})` 的 header 顺序 + `builderBetas`（补丁期 AST 从 `uXn` 的 `zr.push(标识符)` 收集，成员表达式 `eS.beta` 明确跳过），去重保序；异常 → 空数组 + 一条 `CCG_BETA_ORDER_UNAVAILABLE` 诊断。
- `request-command.js:160-163`：只有「要加且客户端没有」时才计算顺序并 `finalBetas` 插入；否则原样保留客户端顺序。
- `request-headers.js:18-31`：客户端 beta 保持客户端顺序；新增 beta 插在「第一个原生顺序更靠后的已有 beta」之前；顺序表里没有的 beta 追加到末尾。
- 补丁期校验：`requestBuilderBetas` 要求 `uXn` 与 `zr` 唯一、每个被 push 的标识符必须是 `chunk-rncrmfyt.js` 模块作用域的绑定，否则抛错（`patch-cli:96-117`）；`fillBetaModule` 拒绝局部声明（`118-131`）；`checkImports` 校验填入的导入名确实由目标模块导出（`306-319`）。产物里 `builderBetas` 已填入 12 个原生常量并带导入。
- 已知近似（P3-2）：`betaOrder` 固定 `isAgenticQuery: true`，而原生按 `querySource` 计算（`sdk`/`agent:*`/`hook_agent` 为 true，`compact` 为 false）。只影响 compaction 请求里「客户端没带、请求要加」的 beta 的相对位置，现有顺序表中多余项不改变其它 beta 的相对次序，影响可忽略。
- 测试覆盖：`finalBetas`/`normalizeBetas` 有单测（`test/request-options.test.mjs:70-95`），但 `betaOrder` 本身没有单测（仓库里没有 chunk 文件，导入不了），只有补丁期断言与离线 A/B 兜底（§6 P2-5）。

### 2.4 身份行交回原生（0.1.90）——语义等价

- 选择仍由 `identityLineFor`（`request-policy.js:30-36`）决定；文本由 `identityLineText` 用原生 `n1n` 的三组输入渲染（`request-build.js:147-159`）。
- `identityRequest`（`169-178`）：`apiKey`、客户端自带计费头（「CC 自己的请求」）、system 里已有原生行 → `recorded = null`（不插行）；否则记录选中行的文本。
- `options.recordedCliPrefix = identity.recorded`（`245`）→ 原生 `qmn` 里 `cW = n1n({...,recorded:J.recordedCliPrefix})` → `PAs(n,cW,...)`；补丁在 `PAs` 里把 `cW` 捕获回来（`patch-cli:246`）。
- `finishBuilt` 先 `mergeBillingAttribution`（`299`）再 `applyIdentityLine`（`305`）：system 首块是计费头时插在头后，否则放最前；系统里已有原生行、请求是 CC 自己的、API key 三种情况都不插/不重复插；`rendered` 不是原生行文本时抛错（`request-build.js:194-201`）。
- 静态结论：因为 `n1n` 在被记录时直接返回 `recorded`，捕获值与 `identity.recorded` 相同，最终 system 与 v25 的 `applyBuildCliPrefix` 结果一致（唯一差别是「找不到可插入位置时用入口的 fallback 行」这条规则现在由 `applyIdentityLine` 的 else 分支表达）。属「换实现不换行为」，必须用离线 A/B 复核。
- 机制细节（不是缺陷）：最终 body 的 system 是 `ccgatewaySystemBlocks`（客户端块），不是原生 `PAs` 拼出的数组，所以身份行只能靠捕获再插回；这也是 `native.prefix === undefined` 时回退到 `identity.recorded` 的原因（`request-build.js:305`）。

### 2.5 客户端工具定义交回原生（0.1.90）

- `FH` 对 `ccgateway` 注册的客户端工具直接返回 `structuredClone(e.ccgatewayRequestDefinition)`（`patch-cli:200`，`native-tools.js:24` 的 `isNative`）。
- body 的工具定义本来就由 `ccgatewayWireTools = wireToolDefinitions(external.tools)` 覆盖（`request-build.js:275`；`patch-cli:209`），键序/`input_schema` 原样；注入层的 CC 工具走原生 `FH`。
- 风险（P3-5）：CC 内部策略看到的客户端工具定义少掉原生会附加的 `defer_loading`/`cache_control`/`strict` 等字段；`requestTool` 仍保留 `isDeferred`，但若某处依赖 `FH` 返回对象上的 `defer_loading`（工具搜索/延迟加载判定），行为会与 v25 不同。属配置层面（客户端自定义工具带 `defer_loading`）的回归风险，需一条带 `defer_loading` 的离线用例。

### 2.6 0.1.89 整理（行为面）

- 入口拆成 3 行桩（`request-entry.inc.js:7-8`）+ 支持模块 `request-entry.js`；原生绑定集中到 `request-natives.js`。桩在 `cli.js` 的 `Ve` 里、`if(n!==void 0){` 之前，作用域内 `e = process.argv.slice(2)`、`s` = 传给 `loadFastPathPolicy` 的 settings 源，与原生 fast-path 用法一致（基线 `cli.js` 已核对）。
- `request-command.js` 用 `ctx` 收敛状态；`clearMeta` 前置；行为等价。`identity()` 在 `request-identity.js` 按环境串记忆、UA 改为纯 setter。
- 内容策略把围栏扫描合并为一次 `fencedLines`（`content-policy.js:90-101`）：逐行语义与旧实现等价（标记行与围栏内行都算 fenced），`blocked` 改为回调但规则不变。`npm test` 178 项覆盖了内容策略与直连改字节。
- `request-agent.js` 的 `keepClientUserAgent` 改名 `setClientUserAgent`（纯改名，返回值不再使用）。
- `systemRecord` 改用原生 `ile` 工厂（`request-input.js:18-45`；`patch-cli:156-159`），形状与旧的手写 record 相同（`{type, message:{role,content}, uuid, timestamp}`，基线 `chunk-rncrmfyt.js` 的 `function ile` 已核对）。

### 2.7 回归结论

- 未发现「v23 → v26 出口字节变差」的静态证据；三处改动（`?beta=true`、beta 顺序、身份行/FH）都是「修正或换实现」，但都是出口可见的，必须靠离线 A/B 与 31 号实测确认（§7 场景 5–7）。
- 唯一确定的新增失败模式是 tracked 请求的缓冲（P2-1）与 credit 授权锁（P2-2）。

---

## 3. AST 定位与 profile/README 一致性

| 定位点 | 锚点 | 找不到时 | 位置 |
|---|---|---|---|
| 入口 `Ve` | `if(n!==void 0){` 唯一 | `once` 抛错 | `patch-cli:171` |
| 根会话 `Yi` | `id:ier()??Ure()` | 抛错 | `172` |
| 资源报告 `Ali`/`V` | 各 4 个唯一片段 | 抛错 | `176-191` |
| 客户端工具 `FH` | `async function FH(e,n){` | 抛错 | `200` |
| 请求构建器 `qmn` | 8 个唯一片段（wire tools / EXTRA_BODY / betas / system / messages / fingerprint / capture / yield） | 抛错 | `201-224` |
| 传输 `sF` | 5 个唯一片段（API-key-only 分支） | 抛错 | `230-236` |
| UA `nl` | `"User-Agent":dN()` | 抛错 | `240` |
| 归因 `PAs` | `d=ki([s,n,...e].filter(Boolean));` | 抛错 | `246` |
| 环境 `_oo` | `l1(e)?ule(e):foo()` | 抛错 | `250` |
| 追加提示词连接 `pr` | 唯一且函数体含 `\n\n` | 抛错 | `256-259` |
| 构建器 beta `uXn`/`zr`/push | 唯一；非标识符 push 跳过（`eS.beta` 是 per-request 值） | 抛错 | `96-117` |
| beta Messages 路径 | `chunk-38xgev2z.js` 内唯一一条 POST 字面量 `/v1/messages?beta=true` | 抛错 | `138-147` |
| 原生 system record `ile` | 必须是 core 模块作用域绑定 | 抛错 | `156-159` |
| 模块哈希 | profile `modules` | 抛错（`Unsupported or modified baseline`） | `11-18` |
| 新增导入名 | `checkImports` 逐个核对导出 | 抛错 | `306-338` |

- profile `profiles/linux-x64-2.1.304.json`：`extension=ccgateway-v26-native-assembly`、`capabilities` 17 项、`supportModules` 21 项（含新 `request-betas`/`request-entry`/`request-natives`/`request-headers`），与 README 的版本表一致。
- 唯一「静默」的跳过是 `uXn` 里非标识符的 `zr.push(...)`（`eS.beta`），已在注释与 README 说明，属设计。
- 补丁产物核对：`artifacts/claude-2.1.304/patched-v26/ccgateway-model-request.js` 的 `messagesPath` 已被填成 `"/v1/messages?beta=true"`；`ccgateway-request-betas.js` 的 `builderBetas` 已填入 12 个原生 beta 常量并带导入。
- README 版本表（v24/v25/v26 三行）与代码一致；但设计文档多处仍是 v22 口径（§8）。
- 补丁测试 `patch-wire-preservation-304.test.mjs` 会在临时目录真实执行补丁器，并断言：12 个 builder beta、`messagesPath` 填充、`PAs` 捕获、`FH` 早退、`recordedCliPrefix`、入口桩、导入解析（该测试在恢复源码存在时不许跳过）。

---

## 4. 22 项出口检查清单（更新版）

> 与上一轮 `2026-10-24-ccgateway-workflow/03-static.md` §6.1 对齐；第 5 列写「与上一轮相比的变化」，供离线/31 号实测成员直接对照。行号均为 HEAD。

| # | 检查项 | 当前代码的期望行为 | 代码位置 | 与上一轮相比 |
|---|---|---|---|---|
| 1 | 请求行 | build 与 direct 都是 `POST /v1/messages?beta=true` | `model-request.js:75,91-95`；`patch-cli:138-152` | **已变**：上一轮 `/v1/messages`，v24/v26 修复；direct 与 build 两条路径都要验 |
| 2 | 头集合 | 与官方相同的 24 个名字；只允许 `authorization`/`x-api-key`、`x-client-request-id`、被映射的 ID 头不同 | `request-headers.js:39-65`；`patch-cli:230-241`；`request-command.js:225-232` | 不变 |
| 3 | 头顺序 | 与官方一致（由原生 `sF`/`A()` 决定；anthropic-version/beta 在 fetch 边界改写但保持原位置） | 同上；`model-request.js:50-68` | 不变（v26 换 create 不改变 SDK 头合并顺序） |
| 4 | `user-agent` | CC 形状且首块计费头的 `cc_version`+`cc_entrypoint` 仍是客户端值 → 客户端 UA；否则原生 `dN()` | `request-agent.js:115-128`；`patch-cli:240`；`request-command.js:147-149` | 改名（`setClientUserAgent`），行为不变 |
| 5 | `anthropic-beta` | 客户端 beta 保持客户端顺序；登录 beta 与构建器 beta 按原生顺序插入（`S8n`+`uXn`）；原生表不可识别时追加并写 `CCG_BETA_ORDER_UNAVAILABLE` | `request-betas.js:16-24`；`request-headers.js:18-31`；`request-command.js:150-163` | **已变**（v25）：上一轮新增项追加在末尾；子代理仍应无 `extended-cache-ttl` |
| 6 | `anthropic-version` | `2023-06-01` | `request-headers.js:60-64`；`request_command.go:125-127` | 不变 |
| 7 | `x-app` | `cli`（原生 `nl()`） | `patch-cli:240` 上下文 | 不变 |
| 8 | `x-stainless-*` | 原生 SDK 生成；同容器 A/B 相同；生产上反映 Worker 容器（Linux/x64） | 基线 `chunk-38xgev2z.js`（`S5n()`/`buildHeaders`） | 不变（仍是已知边界；REQUEST-HEADERS 未点名） |
| 9 | `x-stainless-timeout` | `600`（显式 timeout=min(deadline,600s)/1000） | `model-request.js:83-88`；`request-command.js:216` | 不变（v26 显式传 timeout，原生非流式规则不触发） |
| 10 | `x-claude-code-session-id` | build+OAuth = 映射后的 session（= 出口 metadata session，同会话稳定）；direct = 客户端 v4 session，否则 CLI 自造且 metadata 同步 | `request-identity.js:35-37`；`request_identity.go:280-295`；`patch-cli:172-173` | 不变 |
| 11 | `x-claude-code-prompt-id` ↔ 计费头 `cc_prompt_id` | 两串完全相等；build+OAuth 为映射值 | `request-agent.js:86-94`；`content-policy.js:517-524` | 不变 |
| 12 | 子代理 | request-class=`subagent`；agent-id/parent/agent-type 客户端原值；system 3 块；计费头 `cc_is_subagent=true`、无 turn；beta 无 `extended-cache-ttl` | `request-agent.js:79-113`；`request-command.js:225-232` | 不变 |
| 13 | 压缩/上下文压缩 | 压缩头/`prev-tool-durations` 原值 | `request-agent.js:37-38,91-92`；`request-command.js:146` | 不变 |
| 14 | 辅助请求 | request-class 客户端值、无身份行、无注入 | `request-agent.js:108-111`；`request-build.js:169-178` | 不变（仍无实测样本） |
| 15 | 非 CC build（低/高） | system = [原生计费头, 身份行（OAuth，来自原生 `n1n`）, CC 提示词/客户端 system]；API key 不补身份行 | `request-build.js:169-204,292-318`；`content-policy.js:380-410` | **实现换法**（v26）：身份行文本改由原生渲染并捕获；期望字节不变 |
| 16 | 非 CC direct | 只在原始 JSON 文本上改 system（字符串→块数组 + 计费头），其余字节原样；无身份行 | `direct-billing.js:16-86`；`request-command.js:190-206` | 不变 |
| 17 | body（build，CC 主线程/子代理） | 键集合、键序、值与官方相同；允许差异：metadata、cch、被映射 ID | `patch-cli:209-221`；`request-input.js:242-272`；`request-parameters.js:57-76` | 期望不变；v26 走原生 create，需复核 `output_format`/`user_profile_id` 极端参数（P3-3） |
| 18 | body（direct） | 除 system 外逐字节相同 | `model-request.js:93-95`；`direct-billing.js` | 不变 |
| 19 | `stream` 缺省 | 客户端不发则出口无 `stream` 键 | `request_components.go:41-59`；`request-input.js:247-248`；`request-build.js:313-316` | 不变（文档仍写 false，见 P2-4） |
| 20 | 上游不可见私有头 | 出口不得出现 `x-ccgateway-*`、`X-CCGateway-Request-Policy`、credit 三头、`x-request-id`、`x-stainless-helper` | `request_command.go:405-432`；`request_credit.go`（只在响应写） | 不变；**新增必查**：credit 头与 `Principal/Generation/Ready` 也不得出现 |
| 21 | 响应侧 | 客户端只见 `Content-Type` + request-id/retry-after/rate-limit/fast + 核心自己的 `X-Request-Id` | `contracts/httpfacts/headers.go:10-37`；`forward.go` | 不变；**新增**：tracked 响应上 Worker 加的 `Principal/Generation/Ready` 必须在核心白名单处被剥离（它们不在白名单） |
| 22 | 错误路径 | 上游 4xx/5xx 状态、`Content-Type`、正文原字节；`X-CCGateway-Error-Source/Reason` 不外泄 | `request_error.go:170-202`；`upstream_error.go` | 不变；**新增**：credit 准入拒绝有 400/409/503 三种，均发生在 CLI 之前；tracked 响应超 32 MiB → 502 `credit_receipt_too_large` |

补充检查（本轮新增，属 credit 专项，不计入 22 项）：

| C# | 检查项 | 期望 |
|---|---|---|
| C1 | 仅带 fallback-credit beta（无 token） | 上游 200、客户端 200、正文逐字节不变；响应头里没有 `X-CCGateway-Fallback-Credit-Ready` |
| C2 | `fallback_credit_token` 兑换 | 上游返回 `stop_reason=refusal` + `stop_details.fallback_credit_token` → Worker `Ready` = `sha256(token)`，核心记录一条 credit；同一 body 再兑换成功、改动 prompt 后 404 |
| C3 | 伪造 tracking / 无 tracking 的 token / 不匹配 admission / 非本账号 issuer | 400/400/400/409，CLI 不启动 |
| C4 | untracked 请求 | 仍逐块流式（首块在 CLI 结束前到达） |
| C5 | tracked + 取消/超时 | 499（客户端取消，不提交半截）/ 504（Worker 超时） |
| C6 | tracked + 并发 | 第二个 tracked 请求在授权锁上排队；观察是否 30s 后 503（见 P2-2） |
| C7 | tracked + 文件/技能上传 | 上传是否被授权锁阻塞（见 P2-2） |

---

## 5. 与「官方一模一样」的距离（更新）

- **CC 客户端主线程/子代理/多轮/压缩**：请求行（含 `?beta=true`）、头集合与顺序、body 在 v26 之后期望与官方直连一致；与上一轮相比只剩「beta 顺序」和「身份行实现」两处需要 A/B 复核（都是「换实现不换行为」）。
- **非 CC 请求**：设计上不与任何官方客户端一致；出口差异仍集中在 `cch=00000`、原生默认的 `thinking`/`temperature`/键序。
- **传输层**（TLS、HTTP 版本、`cch`、`x-stainless-*` 的平台含义）仍不可能一致，属已知边界。
- **新增的出口侧「不像」**：tracked 请求（带 fallback-credit beta）整段缓冲，客户端看到的时序与官方不同；字节内容不变。
- **响应头**：Worker 新增的 `Principal/Generation/Ready` 只到核心，核心按 `httpfacts` 白名单转发，客户端看不到（静态确认；需实测 #21）。

---

## 6. 问题清单

> 分类：**[出口]** = 与官方客户端不一致；**[质量]** = 代码/运维质量。没有发现新的 P1。

### P1

无。（上一轮 D3 的 P1「后果 1」已由 0.1.88 修复，静态成立，但必须按 §7 场景 1/2 复测。）

### P2

**P2-1 [出口/质量] 被跟踪请求整段缓冲，且上限 32 MiB**

- 位置：`engine/request_credit.go:167-173,177-195`；`engine/request_command.go:474-476,586-598`。
- 触发：请求头含 `fallback-credit-2026-06-01` / `-07-01` / `server-side-fallback-2026-07-01` 之一（有/无 token 皆可）。
- 影响：客户端在 CLI 完整结束前收不到任何字节；响应 >32 MiB → 502 `credit_receipt_too_large`（上游已计费）；长回答可能触发客户端流式超时/首字节超时。字节内容本身不变。
- 建议：这是「claim 只有完整消息才知道」的必然代价，至少要（a）写进设计文档与 REQUEST-MODES 的「已知边界」，（b）为 >32 MiB 与长回答各补一条测试，（c）评估是否对 SSE 做「先缓冲后一次性写」之外的分块转发（例如在 message_delta 里提前识别 claim 的可能性）。

**P2-2 [质量/可用性] credit 准入把资源授权锁持有整个请求**

- 位置：`engine/request_credit.go:66-77`（`lockResourceAuthority`）+ `engine/request_command.go:86-89`（`defer credit.release()`）；竞争方 `engine/resource_http.go:86-92`。
- 触发：任一 tracked 请求进行中。
- 影响：同一账号 Worker 上的文件/技能操作、其它 tracked 请求全部排队；`creditAdmissionTimeout` 只有 30s，排队超时后第二个 tracked 请求得到 503。更糟的是 `resource_http.go:86-90` 的授权等待失败只是 `return`，不写任何响应（客户端看到空 200），这条路径以前几乎不可达，现在被新代码长期持有锁后变得可达。
- 建议：(a) 只在实际需要「issuer 不变」的窗口持锁（例如身份核验 + 回执计算），不要覆盖整个上游请求；(b) 让 `resource_http.go` 的锁/槽位失败写出 503 `api_error`；(c) 为「tracked 请求进行时上传文件」与「两个 tracked 并发」各补一条测试。

**P2-3 [遗留/出口] 资源输出（containers）路径仍会 502**

- 位置：核心 `next/server/internal/gateway/resource_response.go:95-99`（`rewriteResourceEvents` 要求 Principal/Generation）；Worker 只在 credit 路径写这两个头（`engine/request_credit.go:105-106`），`applyResourceHeaders`（`resource_references.go:172-225`）发的 `X-CCGateway-Resource-Outputs` 在 engine 请求命令路径没有读取方。
- 触发：body 带 `container` 或执行类工具、`resourceInfo.Outputs=true`，且不是 tracked 请求。
- 影响：上游 200 后核心转换失败 → 客户端 502 `upstream_error`。上一轮 D3 后果 2 未变；本轮 credits 修复只顺带覆盖了「同一条请求也是 tracked」的交集。
- 建议：二选一——核心对 CCGateway 不再要求资源输出身份断言，或 engine 请求命令路径恢复读取/回写 Principal/Generation（Ready 证据仍需 Worker 支持）。

**P2-4 [文档] 事实文档大面积过期，且新增的 v24–v26 行为未进任何事实源**

- 位置与内容：
  - `next/plugins/ccgateway/docs/REQUEST-MODES.md:3`（仍写「插件 0.1.87 / CLI `ccgateway-v22-client-entrypoint`」）；`:18`（仍写「客户端没发 `stream` 时 build 发出 `"stream":false`（审核 C10）」，代码不发：`request_components.go:41-59`、`request-input.js:247-248`）；`:96`（「并发槽位…HEAD 是读完 body…」已过时，HEAD 就是先占槽）。
  - `next/plugins/ccgateway/docs/BUILD-REQUEST-COMPONENTS-DESIGN.md:3,30,254,273`（`ccgateway-v22`、`applyBuildCliPrefix`，v26 已删除）。
  - `next/docs/ccgateway-feature-support/REQUEST-HEADERS.md:3`（「没有任何一个客户端请求头是原样转发的」与同文 ③⑤ 矛盾）；`:13`（`keepClientUserAgent` 已改名 `setClientUserAgent`）；全文未提 `?beta=true`、beta 顺序（v25）、`x-stainless-*` 的平台含义。
  - `next/docs/ccgateway-feature-support/CC-REQUEST-LEVELS-DESIGN.md:64`（`registerNative`/`nativeDefinition`，v26 已删除）。
  - `CONTRACTS.md` §53.13 仍以「当前工作树」口吻描述已删除的 native 准入拒绝（上一轮 D14 未变）。
- 影响：运维/后续开发按文档会得到错误期望；本轮 v24–v26 的行为只能从 README 版本表与审计报告里找。
- 建议：以本报告 §4 的表为准，集中更新一次这几份事实文档（尤其是 REQUEST-MODES §1 与 REQUEST-HEADERS）。

**P2-5 [质量/测试] beta 顺序与 credit 回执的跨实现一致性没有自动化保障**

- `betaOrder` 依赖原生 `S8n`，仓库里无法单测（chunk 不在源码树），只有补丁期断言 + 离线 A/B；失败回退路径（`CCG_BETA_ORDER_UNAVAILABLE`）没有测试。
- Worker 的 `creditPayloads`（`request_credit.go:222-242`）与核心的 `creditPayloads`（`fallback_credit.go:201-209`）是两份独立实现：核心用已解析的事件，Worker 直接按空行切原始字节。若上游 SSE 出现注释行、`\r\n`、无结尾空行等形态，两边对「是否有 claim」的判断可能不同 → 一边有 Ready、一边 nil（或反之）→ 核心 502 `fallback credit snapshot not confirmed by Worker` / `readiness has no response token`。
- 建议：为 SSE 形态（含 `: ping` 注释、CRLF、最后一块无空行、provider error 事件）补一条跨实现的对照测试；为 `betaOrder` 的异常分支补一条 stderr 诊断断言。

### P3

**P3-1 [质量] direct 在没有原生绑定时抛 TypeError，与注释承诺的「原样转发」不符**

- `request-command.js:140` 先求值 `agentNative.requestBilling(...)` 再调 `resolveAgent?.()`；当 `runRequestCommand` 被手工/测试直接调用（`natives = {}`）且模式为 direct 时，`agentNative` 为 undefined → `Cannot read properties of undefined (reading 'requestBilling')`。生产路径（`request-entry.js` 总是传 natives）不受影响。
- 建议：改成 `agent = agentNative ? resolveAgent?.(...) : undefined`。

**P3-2 [质量] `betaOrder` 固定 `isAgenticQuery: true`**

- `request-betas.js:19`；原生按 `querySource` 判断（基线 `chunk-rncrmfyt.js` 的 `wt`：`repl_main_thread*`/`agent:*`/`sdk`/`hook_agent` 为 true，`compact` 为 false）。只影响 compaction 请求中新增 beta 的相对位置；顺序表里多一个元素不改变他人相对次序。建议按 `querySource` 传参，或在注释里写明为何固定 true。

**P3-3 [出口] build 经原生 `create` 后的 body 归一（极端参数）**

- 基线 `chunk-38xgev2z.js` 的 `Ps.create` 先 `qu(body)`：`output_format` → `output_config.format`，两者同时存在直接抛错；随后从 body 取走 `betas`/`user_profile_id`/`workspace_id` 变成头。真实 CC 不发这些字段；只在「客户端在 parameters 里塞了这些键」的 build 请求上与 v23（raw post）不同。建议在 build 文档里写明这层归一，或把这三个键加入 `validateBuildParameters` 的保留名。

**P3-4 [质量] 非流式 `max_tokens` 超限的官方报错被跳过**

- 原生 `create` 在「非流式且未显式给 timeout」时用 `calculateNonstreamingTimeout`，超过 600s 估算会抛「Streaming is required…」；我们总是显式传 timeout，因此这条保护不生效（行为差异、非 bug）。建议在 README「超时保持现在的语义」处补一句。

**P3-5 [出口/质量] `FH` 早退可能少掉 CC 内部给客户端工具加的字段**

- `patch-cli:200` 直接返回客户端定义；`defer_loading`/`cache_control`/`strict`/`eager_input_streaming` 不再由原生附加。wire 由 `ccgatewayWireTools` 保证（客户端原本带什么就发什么），但 CC 自己的工具搜索/延迟加载策略读的是 `FH` 的返回对象。触发条件：客户端自定义工具带 `defer_loading`/`cache_control`。建议补一条离线用例，对比 v25 与 v26 的工具搜索决策与出口 tools 字节。

**P3-6 [质量] tracked 路径的错误被折叠**

- `request_command.go:474-476` 的 `overflow` 分支排在 `frame` 分支之前：CLI 已给出明确错误帧时，>32 MiB 仍报 `credit_receipt_too_large`，掩盖真实原因。
- `requestCommandOutput.finish()`（`request_credit.go:177-186`）读 meta/解析失败只返回 error，最终落到 `default` 的 502 `cli_process_error`，丢失具体原因。建议把 `answer()` 的错误并入 `localRequestError` 的 message。

**P3-7 [质量] 多值 `anthropic-version` 变成 400**

- `request_command.go:407-410` 把多个值用逗号拼成一个 `--header`，CLI 的 `addHeader`（`request-options.js:33-41`）只接受单个 `2023-06-01`，多值请求直接 400 `cli_invalid_request`。真实 CC 单值，影响面很小。

**P3-8 [文档] README v26 关于 `x-stainless-helper` 的措辞**

- 「路径、`?beta=true`、betas→头、`x-stainless-helper` 全由 SDK 给」——SDK 确实负责，但客户端工具是纯 JSON，`Ho()` 找不到带符号的对象，因此该头永远不出现。措辞容易让实测成员把「没有该头」当成缺陷，建议注明。

**P3-9 [质量] `admitCredit` 在请求槽位之前取身份**

- 冷缓存时身份核验要跑一次 CLI 并占用一个资源槽（`request_credit.go:92-97`），在 Worker 满载时最多阻塞 30s 再 503；与普通路径「满即 429」不一致。影响仅限于 tracked 请求的冷启动。

### 附：fallback beta 名单（上一轮 A2b 的现状）

`contracts/features/betas.go:18-21` 标 4 个名字可转发，`contracts/credits/prompt.go:28-38` 的 `Enabled` 只认 3 个。0.1.88 之后这不再造成 502（3 个被跟踪后也能 200），但仍造成两种行为：3 个名字 → tracked（缓冲 + 身份头 + 兑换校验），第 4 个 `server-side-fallback-2026-06-01` → untracked（正常流式、无兑换校验）。建议统一名单或写明差异（P3）。

---

## 7. 实测必须覆盖的高风险场景

按优先级排序；1–4 是本轮新增/改动的核心，5–9 是 v24–v26 出口复核。

| # | 场景 | 期望 | 为什么必须测 |
|---|---|---|---|
| 1 | **prod31：只带 `fallback-credit-2026-07-01`（无 token）的普通 Messages** | 客户端 200；正文与官方 200 的字节一致；无 `Ready`；无 `Principal/Generation` 泄漏 | 上一轮 P1 的原始复现；本轮修复的验收点 |
| 2 | 同 1，带 `fallback_credit_token` 且上游返回 `stop_reason=refusal` + `stop_details.fallback_credit_token`（JSON 与 SSE 各一次） | 核心记录 credit；第二次同 body 兑换成功；改 prompt 后 404 | credit 回执的完整闭环，跨实现解析一致性（P2-5） |
| 3 | tracked + 长 SSE（>2 分钟、含 `: ping` 注释与 CRLF） | 客户端拿到完整正文；无 502；时序符合 P2-1 的描述 | 缓冲 + 解析一致性 |
| 4 | tracked + 并发/资源混合：两个 tracked 同时发；一个 tracked 进行中上传文件 | 观察是否出现 30s 后 503、空 200、文件上传超时 | P2-2 的可达性 |
| 5 | 离线 A/B（v26 镜像）：主线程 / 子代理 / 压缩 / 多轮 | 请求行 `?beta=true`；头集合与顺序同官方；`anthropic-beta` 顺序同官方；body 同官方（允许 metadata/cch/被映射 ID） | v26 换实现（create + recordedCliPrefix + FH）的唯一出口验收 |
| 6 | 非 CC build 低/高（OAuth）与非 CC direct | system = [计费头, 原生身份行, …]；direct 字节不变；API key build 无身份行 | 身份行改由原生渲染后的字节复核 |
| 7 | 客户端自定义工具带 `defer_loading`/`cache_control`（build） | 出口 tools 与 v25 相同；工具搜索结果相同 | P3-5 |
| 8 | build 的 parameters 含 `output_format`（与 `output_config.format` 同时/单独）与 `user_profile_id` | 记录当前行为（抛错 / 搬到头），决定是否接受 | P3-3 |
| 9 | API-key 账号（若有）：build 与 direct | 无 `oauth-2025-04-20`；有 `x-api-key`、无 `authorization` | 上一轮未跑过 A/B |
| 10 | 取消与超时：untracked 与 tracked 各一次 | untracked 中断为断流；tracked 未提交；499/504 | 缓冲路径的取消语义 |
| 11 | 账号测试 `/v1/ccgateway/probe` | 200；`X-CCGateway-Test-Mode: native_build` | v26 换 create 后 probe 仍走 build |
| 12 | 未知模型 / 原生表不可用时的 beta 兜底 | 请求成功；stderr 有一条 `CCG_BETA_ORDER_UNAVAILABLE`；新增 beta 追加在末尾 | P2-5 的失败路径 |

---

## 8. 文档过期清单（本轮核对）

| # | 文档/位置 | 说法 | 代码事实 |
|---|---|---|---|
| D1 | `next/plugins/ccgateway/docs/REQUEST-MODES.md:3` | 插件 0.1.87 / `ccgateway-v22-client-entrypoint` | 0.1.90 / `ccgateway-v26-native-assembly` |
| D2 | `REQUEST-MODES.md:18` | 客户端没发 stream 时 build 发 `"stream":false` | 不发（`request_components.go:41-59`、`request-input.js:247-248`） |
| D3 | `REQUEST-MODES.md:96` | 「HEAD 是读完 body…才占槽」 | HEAD 已先占槽（`request_command.go:93-100`） |
| D4 | `BUILD-REQUEST-COMPONENTS-DESIGN.md:3,30,254,273` | `ccgateway-v22`、`applyBuildCliPrefix`/`prefixBuild` | v26 已删除，改原生 `recordedCliPrefix` + `PAs` 捕获 |
| D5 | `next/docs/ccgateway-feature-support/REQUEST-HEADERS.md:3` | 「没有任何一个客户端请求头是原样转发」 | 同文 ③⑤ 即反例；机制上是重写、值上不全是 |
| D6 | `REQUEST-HEADERS.md:13` | `keepClientUserAgent` | 已改名 `setClientUserAgent` |
| D7 | `REQUEST-HEADERS.md` 全文 | 无 `?beta=true`、无 beta 顺序、无 `x-stainless-*` 平台边界 | 见 §4 #1/#5/#8 |
| D8 | `next/docs/ccgateway-feature-support/CC-REQUEST-LEVELS-DESIGN.md:64` | `registerNative`/`nativeDefinition` | v26 删除，`FH` 直接返回客户端定义 |
| D9 | `CONTRACTS.md` §53.12/§53.13 | session-scope 用途；native 准入拒绝清单 | session-scope 已无消费者（`plugins/ccgateway/internal/ccgateway/ccgateway.go:162` 仍在加，engine 无读取方）；请求命令路径不实现这些拒绝（上一轮 D4/D14） |
| D10 | 本轮新增行为（credit 回执、缓冲、`?beta=true`、beta 顺序） | 无任何事实文档 | 仅 README 版本表与审计报告 |

---

## 9. 本轮代码位置速查

- CLI 传输：`next/plugins/ccgateway/companions/cli-mods/model-request.js:75,83-96,102-128`
- beta 顺序：`.../request-betas.js:1-25`；`.../request-headers.js:18-31`；`.../request-command.js:150-163`
- 身份行：`.../request-build.js:147-204,245,292-318`；`.../request-identity.js:72-107`
- 工具定义：`.../native-tools.js:10-24`；`.../request-build.js:133-138,275`
- 补丁器：`.../patch-cli-2.1.304.cjs:11-18,62-72,96-159,171-173,200-266,281-287,306-338`
- 入口/原生绑定：`.../request-entry.inc.js:7-8`；`.../request-entry.js:11-20`；`.../request-natives.js`
- Worker credit：`next/plugins/ccgateway/companions/engine/request_credit.go:34-242`；`request_command.go:78-89,136-143,474-476,504-511,524-598`
- 核心 credit：`next/server/internal/gateway/fallback_credit.go:35-198`；`forward.go:57-70`；`resource_references.go:172-225`；`resource_response.go:58-99`
- 契约：`companions/contracts/credits/{prompt.go,parameter.go}`；`contracts/features/betas.go:18-21`
- 插件头白名单：`next/plugins/ccgateway/manifest.json:81-95,140-154`
- 恢复源码/产物：`artifacts/claude-2.1.304/linux-restored/`（基线）、`artifacts/claude-2.1.304/patched-v26/`（v26 补丁产物）

---

## 处理结果（2026-10-25，工作树，未发布）

- **P2-1 已修**：被跟踪请求不再整段缓冲。Worker 照常流式转发并留一份副本，结束后用 trailer `X-CCGateway-Fallback-Credit-Ready` 回报 claim（`engine/request_credit.go` `keepCredit`/`finish`，`request_command.go` `Write`/`commit`/`writeOutcome`）；超过 32 MiB 只是不再出回执，不再 502 `credit_receipt_too_large`。核心原来也整段读，现在 SSE 改为边收边发，只扣住从第一个含 `fallback_credit_token` 的事件起的尾部，核对回执、记下 credit 后放出，失败时用 `error` 事件结束流（`server/internal/gateway/credit_stream.go`）；JSON 答复与资源输出仍走整段读的 `forwardResourceResponse`，回执两种位置都认（`creditTrailerEvidence`）。发放方不符时仍整段读完记用量再拒绝。
- **P2-2 已修**：账号授权锁改为读写锁（`auth.go` `authManager.mu`）。重新授权、`/admin/*`、资源操作独占；被跟踪请求从核验发放方到上游开始答复期间共享（`commit` 时释放），彼此不排队；核心为被跟踪请求做的资源身份探测（`GET` 身份路径）只读发放方，也改为共享（31 号实测的 46 秒等待就卡在这里，见 `02-prod31.md`）。`resource_http.go` 等不到锁或槽位时答 503，不再空 200。
- 测试：engine `TestCreditTrackingSharesTheIssuerAuthorityUntilTheAnswer`、`TestCreditTrackedAnswerStreams`、`TestResourceAnswersWhenAuthorityIsBusy`、`TestResourceIdentityProbeSharesTheAuthority`，回执断言改为 trailer；核心 `TestFallbackCreditHTTPRegistryRefusalAndNoAutomaticRetry` 增 `sse-trailer`/`sse-storage`/`sse-missing-ready`/`sse-wrong-issuer`，新增 `TestFallbackCreditTrackedStreamRelaysBeforeTheEnd`（去掉修复时确认会失败）。
- 发布顺序：需**先发核心**再发插件（旧核心只读头上的回执），已写入 `REQUEST-MODES.md` §1.5/§1.7。
- **P2-4 / §8 文档过期已处理**（2026-10-25）：D1–D3 `REQUEST-MODES.md`（版本、请求行、`stream`、占槽、请求头说法）；D4 与 `stream`/`system` 缺省 `BUILD-REQUEST-COMPONENTS-DESIGN.md`（v26 身份行走原生、客户端工具定义、beta 顺序、发送路径，删去「工作树/HEAD」对照）；D5–D7 `REQUEST-HEADERS.md`（头是生成不是透传、`setClientUserAgent`、beta 顺序、请求行、`x-stainless-*` 的平台含义与 timeout/helper、`cch` 边界改正、子代理头可伪造、实测结论）；D8 `CC-REQUEST-LEVELS-DESIGN.md`；D9 `CONTRACTS.md` §53.12/§53.13 标为历史（注明 `x-ccgateway-session-scope` 已无读取方）；`SUBAGENT-REQUEST-CONTEXT-DESIGN.md` 改表并加第 15 节现状；`cli-mods/README.md` 版本表（v23–v26 排序、状态、v26 已对拍、helper 说明）。
- **D9 的 session-scope 头已删除**（2026-10-25）：插件 `BuildUpstreamRequest` 不再加 `x-ccgateway-session-scope`（Worker 早已无读取方）；测试改为断言不发送、且不复制调用方自带的同名头；控制台 mock 同步去掉。
