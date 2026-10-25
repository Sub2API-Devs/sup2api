# CCGateway 工作流静态审核（第三轮）

2026-10-25。审核对象：`feat/next-platform` HEAD `38d534d2d`（线上核心 0.1.187 / ccgateway 插件 0.1.91→0.1.93 / CLI 2.1.304 `ccgateway-v28-cc-only-context`）。只读源码，未改代码、未提交。CodeGraph / Serena / WarpGrep 本轮不可用（Serena ECONNREFUSED），全部用 git / grep / sed 与本地 Go 源码交叉核对。

本轮审查的是第二轮报告之后的改动：`7e7a19cc9`（0.1.187 + 插件 0.1.91：credit 流式回执 + 授权锁 RWMutex）、`f9093920d`（0.1.92 / CLI v27：无 `metadata.user_id` 的 build 请求给账号自己的身份）、`66511b92b`（0.1.93 / CLI v28：非 CC 请求一律按主线程构建），以及同批文档。

本地测试（真跑，未跳过）：

- `next/plugins/ccgateway/companions/cli-mods`：`node --test test/*.test.mjs` → **178 pass / 0 fail / 0 skipped**（42 s）。
- `next/plugins/ccgateway/companions`：`go test ./...`（engine 模块）→ **ok 26.1 s**。注意 `contracts` 是独立 module，`./...` 不含它。
- `next/plugins/ccgateway/companions/contracts`：`go test ./...` → **7 个包全 ok**（含 `credits`、`features`、`httpfacts`、`resources`）。
- 核心：`next/server` `go test ./internal/gateway/ -run FallbackCredit -count=1` → **ok 3.2 s**。

---

## 0. 结论（先看这几条）

1. **0.1.91 的 trailer 回执静态成立，且证据链完整**：Worker 在响应尾部用 `http.TrailerPrefix` 写 `X-CCGateway-Fallback-Credit-Ready`（`engine/request_credit.go:183-199`）；Go 服务端在 handler 结束时把这类 key 作为 chunked trailer 发出（`net/http/server.go:409-424,531-549`）；核心的 HTTP 客户端在读到 body EOF 时把未声明的 trailer 一并并入 `resp.Trailer`（`net/http/transfer.go:856-868,923-971`）。中间只有一条通道——controller 的 `ccg-tunnel` 是 101 之后**原始字节 splice**（`controller/http_api.py:326-377`），不解析 HTTP 帧，因此 trailer 与 body 一样透传。`creditTrailerEvidence` 在 EOF 后搬进 `resp.Header`，观察方两种位置都认（`credit_stream.go:35-41`）。
2. **核心扣住尾部的实现与设计一致**：SSE 事件逐块转发，从第一个含 `fallback_credit_token` 的块起扣住，回执核对并 `Record` 之后才写出；失败以一个 `error` 事件替代尾部（`credit_stream.go:50-142`）。JSON 答复与带资源输出的请求仍整段读（`credit_stream.go:26-29`、`resource_response.go:35-94`）。
3. **但「确认失败」的收尾方式值得复核**：写完 `error` 事件后返回错误，`forward()` 因此置 `abortResponse`，dispatch 以 `http.ErrAbortHandler` 切断连接（`forward.go:131-136`、`dispatch.go:147-148`）。客户端看到的是「error 事件 + 被截断的 chunked 响应」，SDK 多半当网络错误并重试（上游已计费）。见 P2-1。
4. **授权锁的 RWMutex 语义正确**：`commit`（上游开始答复）释放共享锁，`sync.Once` 防重复；handler 的 deferred release 覆盖拒绝、取消、超时与 panic 路径，没有泄漏（`request_credit.go:44-53,58-81`、`request_command.go:87-90,570-588`）。但共享锁把「冷身份核验」也并发化了（原先被独占锁串行），见 P2-2。
5. **v27 身份生成与 CLI 侧判定自洽**：Worker 只在 `mode=="replace"`（OAuth + 有映射密钥）且 `client.fields==nil`（没有 metadata、没有 user_id、null、空串）时给出 `rewrite:true, carrier:"json", session_id`；CLI 用 `hasUserID` 判同一组情况，写入账号 CLI 自己的 device/account + 该 session，其余 metadata 键保留（`request_identity.go:122-165`、`request-identity.js:60-90`）。API Key 账号（`client`）、无映射密钥（`worker`）、direct 都不生成；probe 按同一规则生成。会话由**第一条消息**的规范化 JSON 映射，同一对话后续轮次稳定；两条首条消息相同的不同对话会共用会话（设计内）。
6. **v28 的 CC/非 CC 判定与 build 的 `hasBilling` 同口径**：都走 `billing.requestBilling` / `billingCandidate`——「任意 system 文本块中有一行以计费头开头」即为 CC，不要求首块开头；direct 也用同一函数（`request-agent.js:80-115`、`request-command.js:140`、`request-build.js:229,238`、`content-policy.js:474-520`）。UA 保留逻辑名义上收紧了，实际对非 CC 请求无变化（非 CC 的 `leadingBilling` 必为 null，从前也不保留）。残留边界：客户端只要在 system 任意位置插一行计费头就重新获得「CC 待遇」，见 P3-2。
   - **读数提示（离线 01 的 billing-not-first 用例）**：CC 请求的计费头不在首块时，`mergeBillingAttribution` 会在**首位新增一块原生头**、客户端两块按原序保留（共 3 块，`content-policy.js:380-410` 的 `!target` 分支）；这与「非 CC」在出口上只差一件事——**非 CC 还会多出身份行**，CC 不会。用本地 `createBillingPolicy("x-anthropic-billing-header:").requestBilling(该 system)` 验证：返回非 null（CC），`leadingBilling` 返回 null。详见 §4 与 §7 A18。
7. **没有发现 P1**。P2 共 5 条（credit 失败收尾、冷身份核验并发、核心/Worker SSE 解析口径不一致、`held` 无上限、文档版本横幅过期），P3 若干，详见 §6。
8. **r2 的 P3-1 是误报**：`resolveAgent?.({ billing: agentNative.requestBilling(...) })` 在 `resolveAgent` 为 `undefined` 时**不会**求值实参（可选调用短路；Node 实测返回 `undefined` 不抛错），所以 direct 在 `natives={}` 时不会 TypeError。该条关闭。

---

## 1. credit 流式（0.1.187 / 插件 0.1.91）逐段审查

### 1.1 Worker 侧：回执改为 trailer

- `requestCommandOutput.Write`：`start()`（首次提交，`commit` 里释放授权共享锁）→ `keepCredit(p)` 留副本 → 写客户端并 `Flush`（`engine/request_command.go:590-601`）。所以 tracked 请求**逐块**到达客户端，这是 P2-1 的修复点。
- `finish()`（CLI 成功且无错误帧时由 `answer()` 调用）：`start()` → 未溢出时用副本算回执 → 有回执才 `Header().Set(http.TrailerPrefix+ReadyHeader, hash)` → `Flush`（`request_credit.go:183-199`、`request_command.go:504-509`）。
- `keepCredit`：超 `credits.MaxBodyBytes`（32 MiB）后丢弃副本、置 `creditOverflow`，**不再 502**（`request_credit.go:169-179`）；`receipt()` 在溢出时不调用。
- 溢出的结果：Worker 不发 Ready；核心侧 `all` 也在 32 MiB 处 `overflow`，`confirmStreamedCredit` 直接报 "incomplete or oversized stateful response"（`credit_stream.go:146-155`）。没有 token 时只写一条 warn 并正常结束；有 token 时以 error 事件收尾。
- 记账/顺序：`commit()` 先 `credit.release()` 再写头，`WriteHeader` 之后才由 `finish` 设 `Trailer:` key——这正是 `TrailerPrefix` 的用法（header 已写也能补 trailer）。

**结论**：Worker 侧静态成立。测试覆盖：`TestCreditReceiptAnswersTrackedResponse`（json/sse 无回执）、`TestCreditReceiptConfirmsIssuedCredit`（trailer 里有 hash）、`TestCreditTrackedAnswerStreams`（首块在 CLI 结束前到达）。

### 1.2 核心侧：creditStreams / 扣住尾部 / 错误事件

- 分流条件：`c.creditAccess != nil && sse && rt.conv == nil && !jsonArrayStream() && (resourceAccess==nil || !resourceAccess.outputs)`（`credit_stream.go:26-29`）。带资源输出、需要协议转换、Gemini JSON 数组流的请求仍走整段读；其余 tracked SSE 走新路径。`forward()` 的 switch 把它放在最前（`forward.go:64-68`）。
- 先验发放方：`ValidateIdentityHeaders(resp.Header, binding)` 不通过时退回 `forwardResourceResponse`（整段读 + 503/502 拒绝），客户端此前没有收到任何字节（`credit_stream.go:51-56`）。
- 扣住逻辑：逐行读，空行成块；每块先 `observeStreamEvent`（首字节时间、usage、插件 capture）、再累计 `all`（上限 `maxUsageJSONBuf`=32 MiB），`holding ||= bytes.Contains(block, "fallback_credit_token")`；未进入 holding 的块立即写并 flush，进入后进 `held`（`credit_stream.go:67-114`）。
- EOF 后：`creditTrailerEvidence(resp)` → `confirmStreamedCredit`（解析 `all`、核对 Principal/Generation/Failure/Ready、`ClaimForResponse`、`Credits.Record`）→ 成功则写出 `held`，失败则写一个 `error` 事件并返回错误（storage 错误单独返回）（`credit_stream.go:115-142,146-155,179-187`）。
- 非 holding 且回执不自洽：只记 warn，客户端拿到的字节不受影响（`credit_stream.go:117-124`）——合理，因为客户端从没见过 token。
- 错误事件的正文：storage 用 `creditStorageError.Error()`（"fallback credit state could not be recorded"），其余固定 "upstream response could not be converted"（`credit_stream.go:179-187`）。
- JSON 与资源输出路径：`forwardResourceResponse` 读完整 body → `creditTrailerEvidence` → 事件循环 → 资源改写（仅 outputs）→ `observeFallbackCredit` → 重新拼 body → `forwardSSE/forwardJSON`（`resource_response.go:35-94`）。两种回执位置都认。

**测试**：核心新增 `sse-trailer` / `sse-storage` / `sse-missing-ready` / `sse-wrong-issuer` 与 `TestFallbackCreditTrackedStreamRelaysBeforeTheEnd`；后者用真实 `httptest` 服务端 + 默认 HTTP 客户端，验证「首块在 CLI 结束前到达」。这一条同时证明了**核心客户端确实能收到 `TrailerPrefix` 形式的 trailer**（`httptest` 的 `ResponseRecorder` 也支持该前缀，`recorder.go:249-256`；而 sse-trailer 用例走的是真连接）。

### 1.3 与官方出口的差异（credit 专项）

- tracked 请求的客户端时序与官方不同：尾部（含 `message_delta` / `message_stop`）在回执确认后才到；正文逐字节不变。属设计。
- 确认失败时以 `error` 事件收尾并**中断连接**（P2-1）。
- `>32 MiB` 的 tracked SSE：无 token → 正常；有 token → 尾部换成 error 事件（不再是 502 `credit_receipt_too_large`）。

---

## 2. 授权锁（RWMutex）审查

- `authManager.mu` 改为 `sync.RWMutex`（`auth.go:51-63`）。写锁持有者：`/admin/*`（`auth.go:318-319`，45 s 超时）、资源操作非探测路径（`resource_http.go:90-99`，`resourceTimeout` = 10 min）。
- 读锁持有者：tracked 请求（`admitCredit`，`request_credit.go:72-80`）与身份探测（`identityOnly`，`resource_http.go:86-99`）。
- 释放时机：`commit()` 在**上游开始答复**时释放（`request_command.go:570-588`）；`serveRequestCommand` 的 `defer credit.release()` 覆盖拒绝/429/取消/超时/panic（`request_command.go:87-90`）；`sync.Once` 保证只 `RUnlock` 一次（`request_credit.go:46,53`）。`finish()` 不再依赖该锁（只用副本与 clientBody）。
- `resource_http.go` 等不到锁或槽位现在答 503 `api_error`，不再是空 200（`resource_http.go:94-101`）。
- 语义后果：重新授权/资源操作仍独占（正确）；tracked 之间、身份探测与 tracked 之间共享（修复 31 号 46 s 等待）。**写者等待期间 Go 的 RWMutex 会拦住新的读锁**，因此重新授权（或长资源操作）进行中，新 tracked 请求会在 30 s 后 503（`creditAdmissionTimeout`，`request_credit.go:34-36,72-74`）——这是可接受的边界，但必须实测（A10）。
- 锁顺序：两者都是「先授权锁、后槽位」，`creditIssuer` 的身份步骤另占一个槽位并在返回前归还（`request_credit.go:96-115`）。没有形成环形等待。

**新风险**：共享锁让「冷身份核验」并发执行（见 P2-2）。重启或 10 分钟 TTL 过期后，两个并发 tracked 请求（或一个 tracked + 核心的身份探测）可能同时跑交互式 CLI 验证；`persistIdentity` 用的是非阻塞文件锁（`resource_lease_unix.go:10-12`），第二个会得到 `resource identity update is busy` → 503；两次并发刷新 OAuth 凭证也有轮换竞态风险。

---

## 3. 身份生成（0.1.92 / CLI v27）

- Worker：`resolveRequestIdentity` 只在 `mode=="replace"`（OAuth 且映射密钥存在）且 `client.err==nil && client.fields==nil` 时调 `generatedRequestIdentity`（`request_identity.go:122-165`）。`client.fields==nil` 覆盖：没有 metadata、没有 user_id 键、user_id 为 `null`、user_id 为 `""`。`{}` 或只有未知字段时 `identityFields` 返回非 nil 空 map，走 `mapRequestIdentity` 的 "nothing usable to map"（`rewrite:false`），不生成。
- 会话输入：`messages[0]` 反序列化成 `any` 再 `json.Marshal`（键排序、无空白）后 HMAC，取前 16 字节成 v4 UUID（`request_identity.go:143-165`、`ids.go:28-39`）。稳定性：同一对话后续轮次重复首条消息 → 同会话；两条不同对话首条消息相同 → 同会话（注释与文档已写）；首条消息被客户端改写/裁剪、或没有 messages → 会话变化（没有 messages 时退回随机 `uuid()`）。数字经 `float64` 归一，超大数会让 `json.Unmarshal` 失败 → 同样退回随机会话。
- carrier：生成时固定 `carrier:"json"`，CLI 写成 JSON 字符串（`encode(..., 'json')`），与原生 CC 的 carrier 一致；`target()` 保留账号 CLI 自己的 `device_id`/`account_uuid`，只覆盖 `session_id`（`request-identity.js:43-58,73-90`）。
- 与 metadata 其他键的合并：`metadata = { ...clientMetadata, user_id }`，其他键保留；客户端完全没有 metadata 时只写 `{user_id}`（`request-identity.js:82-88`）。
- API Key（`mode:"client"`）、无映射密钥（`mode:"worker"`）、direct（`resolveIdentity` 只处理 `building(p)`）都不生成；probe 走 build，按同一规则生成（`request_command.go:262-300`）。
- 契约夹具：`contracts/testdata/worker-cli-requests.json` 的三个 build 用例改成 `rewrite:true, session_id, carrier:"json"`，`build-unusable-identity` 仍 `rewrite:false`；Go 侧生成夹具、JS 侧消费夹具（`test/contract-fixtures.test.mjs:36-101`），两侧断言 session 与 metadata 一致。

**结论**：v27 静态正确，没有影响 direct 与 API Key 账号。剩下的都是设计边界（P3-3、P3-4）。

---

## 4. 非 CC 一律主线程（0.1.93 / CLI v28）

- `resolveAgentContext`：`claudeCode = billing !== null && billing !== undefined`；`client = claudeCode ? context.client : {}`（`request-agent.js:80-87`）。非 CC 时：`requestClass='main'`、`querySource='sdk'`、`promptId=uuidV4(derive(key,'prompt-text',prompt))`、不写 loop 头、不保留客户端 UA（`request-agent.js:90-113,124-130`）。
- 判定一致性（本轮要核的点）：build 用 `billing.requestBilling(initial.systemBlocks)`（`request-build.js:229`），direct 用 `agentNative.requestBilling(incoming.body.system)`（`request-command.js:140`），二者与 `hasBilling`（`request-build.js:238`、`content-policy.js:474-480`）都基于同一 `billingCandidate`：**任意块、任意一行以计费头开头**即命中；无法解析的头（conflict）在 `requestBilling` 里返回 `{}`（非 null）→ 同样判为 CC。因此「计费头不在首块开头（但在行首）」在两边都算 CC，口径一致。差别只在 `leadingBilling`（UA 保留、direct 入口判定要求「首块行首」），这是既有设计。
- direct 路径：`prepareDirect` 用 `main = !agent || agent.requestClass === 'main'` 决定 turn 字段；非 CC 现在恒为 main，与不带伪造头时一致（`request-command.js:190-206`）。
- UA 保留：`setClientUserAgent(agent, leadingBilling(client system), leadingBilling(sent system))`。非 CC 的 client 侧 `leadingBilling` 必为 null（定义上无计费头），即使 v27 保留 `agent.userAgent` 也不会生效；v28 只是把它从 `CCG_REQUEST_AGENT.client` 里去掉，**出口 UA 不变**。
- CC 请求（首块/任意行首计费头）完全走原路径，行为与 v27 相同。
- 边界：判定是「system 里有没有计费头行」，所以任何客户端在 system 任意位置插一行 `x-anthropic-billing-header: ...` 就重新获得 CC 待遇（可自称子代理、保留 UA、不补身份行）。这是文档所说「system 带计费头 = CC 请求」的直接推论，但 REQUEST-HEADERS 的措辞容易被读成只认首块，建议写清「任意位置」。
- **与离线 billing-not-first 实测的对账（2026-10-25，`01-offline.md`）**：离线把 `noncc-context2/billing-not-first`（system = `[Answer concisely., <计费头>]`）的出口 3 块判为「非 CC 构建」。按代码与本地复算，它是 **CC**：
  1. `createBillingPolicy("x-anthropic-billing-header:").requestBilling([{type:'text',text:'Answer concisely.'},{type:'text',text:'<计费头>' }])` 返回非 null（`hasBilling=true`），`leadingBilling` 返回 null；
  2. CC + 非首块计费头在 `mergeBillingAttribution` 的 `!target` 分支必然「首位插入原生头、客户端块原序保留」（`content-policy.js:380-410`），正是离线看到的 3 块；
  3. 判别信号是**身份行**：同一场景的非 CC 对照（`cc-ua-no-billing`，`low` 策略）出口含身份行（`results/evidence/noncc-context2/b/req-01.json` block 1 = "You are a Claude agent, built on Anthropic's Claude Agent SDK."），billing-not-first（`b/req-02.json`）没有身份行 → 它走的是 `identityRequest` 的 `own=true`（CC）分支。
  4. 结论：产品行为是「任意块的行首计费头即为 CC」，与 v27 相同；不需要改代码，也不应把「首位多出原生头」读成非 CC。
  5. **决定性复核（离线 `noncc-classify`，11/11 断言）**：三个请求都伪造 `x-claude-code-request-class: subagent`、`agent-id=a0123456789abcdef`、`parent-agent-id=afedcba9876543210`：
     - 计费头在第 2 块（`b/req-01.json`）→ 出口 request-class=`subagent`、agent-id/parent 用客户端原值、首位新增的原生头带 `cc_is_subagent=true`、**无身份行** ⇒ CC；
     - 无计费头（`b/req-02.json`）→ 出口 `main`、无 agent 头、block 1 是 `agent_sdk` 身份行 ⇒ 非 CC（v28 丢弃伪造）；
     - 计费头在第 1 块（`b/req-03.json`）→ 同样 `subagent`、单块保留 ⇒ CC。
     正确判据就是「身份行是否存在 / 伪造 request-class 是否被采用」，不是块数。产物：`results/evidence/noncc-classify/{in,b}`、`results-verify-classify.txt`、`results-compare-classify.txt`。

---

## 5. 22 项出口检查清单（第三轮更新版）

> 列 5 是「与第二轮 §4 相比的变化」。行号均为 HEAD。

| # | 检查项 | 当前代码的期望行为 | 代码位置 | 与第二轮相比 |
|---|---|---|---|---|
| 1 | 请求行 | build 与 direct 都是 `POST /v1/messages?beta=true` | `model-request.js:75,83-96`；`patch-cli-2.1.304.cjs`（AST 取路径） | 不变 |
| 2 | 头集合 | 与官方相同的 24 个名字；插件向 Worker 透传 13 个客户端头 | `manifest.json:81-95,140-154`；`request-headers.js:39-65` | **少了 `x-ccgateway-session-scope`**（插件 0.1.92 起；本来就是插件自己加的内部头，不影响上游集合） |
| 3 | 头顺序 | 原生 `sF` 决定；anthropic-version/beta 在 fetch 边界改写但保持原位置 | `model-request.js:50-68`；`request-headers.js:58-65` | 不变 |
| 4 | `user-agent` | CC 形状且首块计费头的 `cc_version`+`cc_entrypoint` 仍是客户端值 → 客户端 UA；否则原生 `dN()` | `request-agent.js:124-130`；`request-command.js:149` | v28 起非 CC 不再携带 `client.user_agent`，但非 CC 本就因 `leadingBilling==null` 不会保留 → 出口无变化 |
| 5 | `anthropic-beta` | 客户端 beta 保持客户端顺序；登录/构建 beta 按 `S8n`+`uXn` 顺序插入；表不可用时追加 + `CCG_BETA_ORDER_UNAVAILABLE` | `request-betas.js`；`request-headers.js:25-34`；`request-command.js:156-163` | 不变 |
| 6 | `anthropic-version` | `2023-06-01` | `request-headers.js:60-64`；`request_command.go:409-411` | 不变 |
| 7 | `x-app` | `cli`（原生 `nl()`） | patch 的 `nl` | 不变 |
| 8 | `x-stainless-*` | 原生 SDK 生成；反映 Worker 容器（Linux/x64） | 基线 SDK | 不变 |
| 9 | `x-stainless-timeout` | `600`（`min(timeoutMs,600000)/1000`） | `model-request.js:87` | 不变 |
| 10 | `x-claude-code-session-id` | build+OAuth = 映射后的 session（= 出口 metadata session，同会话稳定）；**v27 起无 `metadata.user_id` 的 build（OAuth+密钥）也有会话，由首条消息映射**；direct = 客户端 v4 session，否则 CLI 自造 | `request-identity.js:33-37`；`request_identity.go:143-165`；patch `Yi` | **新增**：无 metadata 的 build 现在自带账号身份与稳定会话（v27） |
| 11 | `x-claude-code-prompt-id` ↔ 计费头 `cc_prompt_id` | 两串相等；CC 请求的 build+OAuth 为映射值；**非 CC 的 prompt-id 现在恒由首条提示派生（忽略客户端送的 prompt-id）** | `request-agent.js:86-97`；`content-policy.js:517-524` | **已变**（v28）：非 CC 伪造的 prompt-id 不再采用，派生值与计费头仍一致 |
| 12 | 子代理 | CC 请求：request-class=`subagent`；agent-id/parent/agent-type 客户端原值；system 3 块；`cc_is_subagent=true`；beta 无 `extended-cache-ttl` | `request-agent.js:97-112` | **已变**（v28）：非 CC 请求不可能再成为子代理（伪造头被忽略） |
| 13 | 压缩/上下文压缩 | 压缩头、`prev-tool-durations` 原值放回 | `request-agent.js:39,93`；`request-command.js:146` | **已变**（v28）：仅对 CC 请求生效；非 CC 的这类头被丢弃 |
| 14 | 辅助请求 | CC 辅助请求（只带计费头）：request-class 客户端值、身份行 `none`、无注入 | `request-agent.js:86,110-113`；`request-build.js:169-178` | 不变 |
| 15 | 非 CC build（低/高） | system = [原生计费头, 身份行（OAuth）, 注入/客户端]；API Key 不补身份行；**v27 起 metadata 会带账号自己的 `user_id`** | `request-build.js:169-204,292-318`；`content-policy.js:380-410`；`request-identity.js:73-90` | **已变**（v27）：无身份的 OAuth build 现在有 metadata（JSON 字符串，device/account 为账号 CLI 自己的，session 为 Worker 映射值） |
| 16 | 非 CC direct | 只在原始 JSON 文本上改 system（字符串→块数组 + 计费头），其余字节原样；无身份行；不加 metadata | `direct-billing.js:16-86`；`request-command.js:186-206` | 不变（v27/v28 都明确不动 direct 的 metadata） |
| 17 | body（build，CC/子代理） | 键集合、键序、值与官方相同；允许差异：metadata、cch、被映射 ID | `patch-cli:209-221`；`request-input.js`；`request-parameters.js` | 期望不变；**非 CC 的 body 多了 metadata**（v27） |
| 18 | body（direct） | 除 system（计费头）外逐字节相同 | `model-request.js:93-95`；`direct-billing.js` | 不变 |
| 19 | `stream` 缺省 | 客户端不发则出口无 `stream` 键 | `request_components.go:41-59`；`request-build.js:313-316` | 不变 |
| 20 | 上游不可见私有头 | 出口不得出现 `x-ccgateway-*`、`x-request-id`、credit 三头、policy 头 | `request_command.go:406-432`（只把 version/beta 变成参数）；`request_credit.go`（只写响应） | **`x-ccgateway-session-scope` 已不再发送**（0.1.92）；credit 头只在 Worker→核心的响应方向 |
| 21 | 响应侧 | 客户端只见 `Content-Type` + request-id/retry-after/ratelimit/fast + 核心 `X-Request-Id` | `contracts/httpfacts/headers.go:10-37`；`forward.go:51` | **新增**：Worker 的 `Principal`/`Generation`/`Ready`/`Failure` 都在白名单外；`creditTrailerEvidence` 只写 `resp.Header`，且发生在 `httpfacts.Apply` 之后（`credit_stream.go:35-41`） |
| 22 | 错误路径 | 上游 4xx/5xx 状态、`Content-Type`、正文原字节；`X-CCGateway-Error-Source/Reason` 不外泄 | `request_error.go:170-202`；`upstream_error.go:55-66`；`writeError`（`errors.go:133-158`） | **新增**：tracked SSE 的确认失败不是 HTTP 状态，而是 `event: error` + 中断连接（见 P2-1） |

### credit 专项补充清单（C1–C12）

| C# | 检查项 | 期望（HEAD 代码） |
|---|---|---|
| C1 | 只带 fallback-credit beta（无 token） | 上游 200、客户端 200；正文逐字节不变；无 `Ready`/`Principal` 泄漏；**流式**（首字节早到） |
| C2 | `fallback_credit_token` 兑换（SSE） | `message_delta` 起被扣住；回执确认后放出；核心记一条 credit；同 body 再兑换成功、改 prompt 后 404 |
| C3 | 兑换（JSON） | 整段读 + trailer 回执；同上 |
| C4 | 伪造 tracking / 无 tracking 的 token / admission 不匹配 / 非本账号 issuer | 400/400/400/409，CLI 不启动 |
| C5 | untracked 请求 | 逐块流式，字节不变 |
| C6 | tracked + 取消/超时 | 499（客户端取消，不提交半截）/ 504；授权锁释放 |
| C7 | tracked + 并发 | 两个 tracked 互不排队（共享读锁）；首字节不再等对方 |
| C8 | tracked 进行中 + 文件/技能上传 | 资源操作等写锁 → 最多 `resourceTimeout`(10 min) 后 503（不再是空 200） |
| C9 | 重新授权/`/admin` 进行中 + 新 tracked | 30 s 后 503 `Fallback credit issuer verification unavailable` |
| C10 | trailer 穿隧（只有生产链路能证） | controller 101 后原始 splice；第二次兑换成功即证明第一次的 Ready 被核心读到 |
| C11 | tracked + 记录失败 | 已提交的流以 `event: error` 结束且连接被中断；正文里没有 token |
| C12 | tracked + >32 MiB | 无 token：正常结束（仅 warn）；有 token：error 事件收尾（不再 502 `credit_receipt_too_large`） |

---

## 6. 问题清单

> 分类：**[出口]** = 与官方客户端不一致；**[质量]** = 代码/运维/测试质量。

### P1

无。

### P2

**P2-1 [出口/质量] credit 确认失败时「error 事件 + 中断连接」**
- 位置：`credit_stream.go:125-142`（写 `creditErrorEvent` 后返回 `*convertError`/`*creditStorageError`）；`forward.go:131-136`（`abortResponse = true`）；`dispatch.go:146-149`（`panic(http.ErrAbortHandler)`）。
- 影响：客户端先收到 `event: error`，随后 chunked 响应被截断（没有终止块）。官方客户端/常见 SDK 会把「流未正常结束」归类为连接错误并可能重试；上游已经计费。测试自定义了 `creditStreamRequest` 容忍 `io.ErrUnexpectedEOF`（`fallback_credit_test.go:201-217`），说明这是已知行为，但没有客户端侧证据。
- 建议：确认产品语义后二选一——(a) 写 error 事件后返回 nil（干净结束，记录 `rec.Success=false` 但不 `abortResponse`）；(b) 保持中断，但在离线/31 号验证客户端展示与是否重试，并写进 REQUEST-MODES。

**P2-2 [质量] 共享读锁把冷身份核验并发化**
- 位置：`request_credit.go:72-80`（RLock 后立即 `creditIssuer`）→ `request_credit.go:96-115`（`g.resources.identity`）；`resource_http.go:86-99`（探测用 `TryRLock`）；`resource_identity.go:57-112`（冷缓存跑 `runResource` → `initializeResourceAuthorization`，可能刷新 OAuth 凭证）；`persistIdentity` 用**非阻塞**文件锁（`resource_lease_unix.go:10-12`）。
- 影响：0.1.91 之前这些路径被独占 Mutex 串行；现在两个并发 tracked 请求、或 tracked + 核心身份探测，会在冷缓存/凭证临近过期时同时启动验证 CLI。第二个可能得到 `resource identity update is busy` → 503；并发刷新 refresh token 也有轮换竞态（两进程读到同一旧凭证）。
- 建议：给身份核验加单飞（`singleflight`/一次性 barrier），或在「缓存未命中」时才升级为独占锁。至少补一条「两个并发 tracked + 冷缓存」的测试。

**P2-3 [质量] 核心与 Worker 的 SSE 解析口径不一致（tracked 时后果变重）**
- 位置：核心 `credit_stream.go:146-155` → `resource_response.go:130-171`（每个 data 必须是合法 JSON、`event:` 名必须等于 `data.type`、`message_stop`/`error` 之后只允许 ping、必须 `start == len(raw)`，即最后一个事件必须有结尾空行）；Worker `engine/request_credit.go:204-217,226-246`（按 `\n\n` 切、忽略非 data 行、对结尾更宽松）。
- 影响：0.1.90 之前这是「一边有 Ready、一边算不出 claim」→ 502；现在 tracked SSE 会变成**客户端尾部被换成 error 事件、credit 不记录**（fail-closed 但用户可见、上游已计费）。真实 Anthropic 流通常满足严格口径，但代理/中间层去掉结尾空行、或出现 `data:` 之后的事件都会命中。
- 建议：用同一份录制的 provider SSE（含 CRLF、`: ping` 注释、无结尾空行、error 事件）做跨实现对照测试；或让核心改用与 `credits.MessageFromEvents` 同源的宽松解析。

**P2-4 [质量/内存] tracked SSE 的双份缓冲，`held` 无上限**
- 位置：`credit_stream.go:66-91`（`all` 上限 32 MiB，`held` 只增不减）；`:80`（用 `bytes.Contains(block, "fallback_credit_token")` 判 holding）。
- 影响：(a) 每个 tracked SSE 在核心保留最多 32 MiB 用于算 claim（与 0.1.90 的整段缓冲同量级，但不再影响首字节）；(b) 一旦 holding，尾部进 `held` 且无上限；overflow 后 `all` 被丢弃，`held` 仍继续增长（这是真正的无界点）；(c) 如果模型输出里恰好出现字面量 `fallback_credit_token`（不是 claim），该块起全部被扣住到流末尾，可能造成事件乱序（被扣住的 delta 在 `message_stop` 之后才到）。
- 建议：overflow 置位后停止 holding（此时回执必然不会来）；`held` 加上限；holding 判定改为「块内 JSON 有 `stop_details.fallback_credit_token`」而不是字节包含。

**P2-5 [文档] 当前契约的版本横幅过期（与代码/线上不一致）**
- `next/plugins/ccgateway/docs/REQUEST-MODES.md:3`：仍写「插件 0.1.91 / CLI `ccgateway-v26-native-assembly`」；线上是 0.1.93 / v28。
- `next/plugins/ccgateway/docs/BUILD-REQUEST-COMPONENTS-DESIGN.md:3`：同上。
- `next/plugins/ccgateway/docs/SUBAGENT-REQUEST-CONTEXT-DESIGN.md:5,195`：标题仍写「CLI v26 / 插件 0.1.91」，而第 15 节正文已经写了 v28 规则（同一节内自相矛盾）。
- `next/docs/ccgateway-feature-support/REQUEST-HEADERS.md:1`：标题仍写 `ccgateway-v26-native-assembly`。
- 影响：运维/后续审核按标题会以 v26 为当前；这三份事实文档都是「正文更新了、版本没更新」。
- 建议：发布时把横幅改成「以代码为准：插件 0.1.93 / CLI v28」，或在标题去掉版本号。

### P3

**P3-1 [质量] 写者等待时新 tracked 请求 30 s 后 503**
- `resource_http.go:90-99` 的非探测路径独占写锁最长 10 分钟（`resourceTimeout`），`auth.go:318-319` 的管理面独占 45 s；Go RWMutex 在有写者等待时阻塞新的 `RLock`，所以此期间 tracked 请求 `TryRLock` 失败并在 `creditAdmissionTimeout`(30 s) 后 503（`request_credit.go:34-36,72-74`）。可接受，但要文档化并在 31 号观察（场景 A10）。

**P3-2 [出口/设计] 「非 CC」= system 任意位置有一行计费头**
- `requestBilling`/`hasBilling` 都扫描所有文本块（`content-policy.js:474-520`），所以客户端插入一行 `x-anthropic-billing-header: ...` 就能切回 CC 待遇（采用 agent/loop 头、保留 UA、不补身份行）。这是 v28 边界，而非 bug。
- **已由离线决定性实测定性（`noncc-classify`，11/11）**：计费头在第 2 块 → 出口采用客户端伪造的 `request-class: subagent`/agent-id/parent、原生头带 `cc_is_subagent=true`、无身份行；无计费头 → `main` + 身份行。即**投放一行计费头即可自称子代理**，与 v27 相同（v28 只挡住「没有计费头还自称」的情况）。
- 建议：REQUEST-HEADERS 把「system 带计费头」写清为「任意位置的行首计费头行」，并写明这等于「谁能写 system 谁就能自称 CC 请求」这一边界；是否需要更严的判定（例如要求首块）由产品决定，本轮不建议改代码。

**P3-3 [出口] v27 会话映射的输入只有第一条消息**
- `request_identity.go:143-165`：首条消息相同的不同对话共用 session；客户端若在后续轮次改写/裁剪首条消息（或首条消息里有随机值），会话会中途变化；没有 messages 或数值超出 float64 → 随机会话。建议离线补「首条消息被改写」与「无 messages」两个用例，并在文档写明。

**P3-4 [质量] `metadata.user_id: {}` 被当作「没有可用字段」而不是「没有身份」**
- `clientIdentityFields` 对 `{}` 返回非 nil 空 map → 不进生成分支（`request_identity.go:259-270,326-341`）。文档只列了「没有键/null/空串」（`BUILD-REQUEST-COMPONENTS-DESIGN.md:312`）。行为自洽（CLI 也保留客户端值），但值得在文档补一句。

**P3-5 [质量] 每个 tracked 请求仍要打一次身份探测**
- `fallback_credit.go:110-125` 在无资源时调 `ResourceTransport.Identity`（`ccgateway/resources.go:27-52`），一次额外 HTTP（隧道）+ Worker 槽位 + 共享锁；Worker 侧有 10 分钟缓存（`resource_identity.go:23-28`）。0.1.88 起如此，不是本轮引入；但与 P2-2 叠加时冷缓存会放大。

**P3-6 [质量] 32 MiB 边界的计数口径略有差异**
- Worker 按 `creditCopy.Len()+len(p)` 判断（`request_credit.go:172-179`），核心按「块累加」判断（`credit_stream.go:75-79`）。恰在 32 MiB 附近时，两侧可能一个溢出、一个不溢出（Worker 无回执、核心仍算 claim）→ "snapshot not confirmed" → error 事件。极端场景，记录备查。

**P3-7 [质量] 关闭 r2 P3-1（误报）**
- `resolveAgent?.({ billing: agentNative.requestBilling(...) })`：`resolveAgent` 为 nullish 时实参不求值（Node 实测 `f?.({a:null.x})` 返回 undefined 不抛错）；且 `agentResolver()` 在 `agentNative` 为空时必返回 undefined。direct 在 `natives={}` 下不会 TypeError。r2 P3-1 应关闭。真正的手工调用边界是「没有 natives 时 direct 原样转发」，符合注释。

**P3-8 [文档] 其余仍过期的地方**
- `next/docs/ccgateway-feature-support/SYSTEM-PREFIX-INJECTION-DESIGN.md:13,23`：「`metadata.user_id` 客户端有就替换，没有不加」——v27 起会加。
- `next/docs/ccgateway-feature-support/REQUEST-LOG-VIEWER-DESIGN.md:214`：仍把 `x-ccgateway-session-scope` 说成「事件和请求头里有」——插件 0.1.92 起不再发送。
- `next/docs/CONTRACTS.md:3951`：「2026-10-25 起插件不再发送（随下一个插件版本生效）」——0.1.92 已发布，后半句过期。
- `next/plugins/ccgateway/docs/SUBAGENT-REQUEST-CONTEXT-DESIGN.md:3`：历史横幅里「客户端请求头自己写明类别时除外」在 v28 已不再成立（正文第 15 节已写，但横幅没改）。

### 已关闭/确认无问题的点

- 0.1.91 的 trailer 经 ccg-tunnel 可达（`controller/http_api.py:326-377` 原始 splice；Go 客户端解析未声明 trailer，`transfer.go:923-971`）。
- `sync.Once` + `defer` 覆盖取消/超时/panic，授权锁无泄漏（`request_credit.go:46-53`、`request_command.go:87-90`）。
- `commit` 释放读锁后 `finish` 不再依赖锁（只用副本与 `clientBody`）。
- JSON/资源输出仍整段读；两者都认 header/trailer 两种回执。
- v27/v28 的 Worker ↔ CLI 契约夹具同步更新，且 Go/JS 两侧都消费它。

---

## 7. 实测必须覆盖的高风险场景

> 给离线（wf-offline）与 31 号成员；按优先级。A 组是本轮改动核心（0.1.91/0.1.92/0.1.93），B 组是出口复核。
>
> **进行状态（2026-10-25 晚）**：离线 `01-offline.md` 已完成 70 场景 / 1540 断言，A1、A2、A4、A9、A12–A19、A21 通过（tracked 首字节 1011 ms/结束 2527 ms、Ready 在 trailer、两个并发各 2.5 s、非 CC 身份与 v28 主线程符合预期、伪造头出口与不带头逐字节相同）。A18 另由 `noncc-classify`（3 请求、11/11）决定性确认：计费头在任意块 → 伪造 `request-class: subagent` 被采用且无身份行；无计费头 → `main` + 身份行。**离线拍不到、必须 31 号完成**：A3（trailer 穿隧）、A5/A6/A7/A8/A10/A11（核心扣尾/error 收尾/32 MiB/取消/超时/写锁争用）以及 E3（核心剥离 Principal/Generation/Ready——离线的代理替身会把这些头直传客户端，只能证明 Worker 发出了 trailer）。

| # | 场景 | 期望 | 归因 / 为什么必须测 |
|---|---|---|---|
| A1 | tracked SSE（只带 fallback-credit beta，无 token） | 首字节在 CLI 结束前到达；正文与不带 beta 时逐字节相同；客户端无 `Principal`/`Generation`/`Ready` | 核心 `creditStreams` + 逐块转发（P2-1 修复验收） |
| A2 | tracked SSE + refusal（`message_delta` 带 `fallback_credit_token`） | `content_block_stop` 前的字节立即可见；`message_delta`/`message_stop` 在回执确认后放行；token 恰好一次；随后同 body 可再兑换、改 prompt 404 | 核心扣尾部 + Worker trailer + `Record` |
| A3 | **生产链路**：31 号真实上游一次 token 兑换，再用同一 body 兑换第二次 | 第二次成功 = 第一次的 Ready trailer 穿过了 controller 隧道并被核心读到；若第一次 200 而第二次 404/409，说明 trailer 丢在生产链路 | 只有真实链路能证明 P2-1 修复的最后一跳 |
| A4 | tracked JSON（非流式）兑换 | 整段读 + trailer 回执；客户端无 Ready 泄漏 | `forwardResourceResponse` + `creditTrailerEvidence` |
| A5 | 模拟记录失败（registry 报错） | 客户端收到错误前面的字节 + 一个 `event: error`，连接随后中断（P2-1 语义）；正文无 token | `creditErrorEvent` + `abortResponse`；同时记录客户端展示与是否重试 |
| A6 | tracked + >32 MiB 回答（有/无 token） | 无 token：正常结束（仅核心 warn）；有 token：error 事件收尾，不再 502 `credit_receipt_too_large` | Worker `keepCredit` 溢出 + 核心 `overflow` |
| A7 | tracked + 长流（>2 分钟，含 `: ping` 注释、CRLF、末事件无结尾空行） | 记录客户端实际拿到的事件序列；观察是否因核心严格解析（P2-3）出现尾部被替换为 error 事件 | 跨实现解析一致性 |
| A8 | tracked + 客户端取消 / Worker 超时 | 499 / 504；随后同一 Worker 的文件上传可执行（锁已释放） | `sync.Once` 释放路径 |
| A9 | 两个 tracked 并发 | 不再互相排队（首字节不再等对方 46 s）；授权锁在各自上游开始答复后释放 | RWMutex + `commit` 释放 |
| A10 | tracked 进行中（首字节前）+ 文件/技能上传；或重新授权进行中 + 新 tracked | 资源操作等不到锁 → 最终 503 `api_error`（不是空 200）；新 tracked 30 s 后 503 | `resource_http.go` 503 / RWMutex 写者优先（P3-1） |
| A11 | 重启后（或 10 分钟 TTL 过期）两个并发 tracked | 观察是否出现 `resource identity update is busy` / 身份核验 503（P2-2）；记录冷启动首字节 | 共享读锁下的冷身份核验并发 |
| A12 | 非 CC build 无 metadata（OAuth） | `metadata.user_id` 是 JSON 字符串；`device_id`/`account_uuid` = 账号 CLI 自己的；`session_id` == `x-claude-code-session-id`；其他 metadata 键保留 | v27 生成身份 |
| A13 | 同一对话两轮（首条消息相同）；不同首条消息；两条对话首条消息相同 | 前者 session 相同；中者不同；后者相同（设计内碰撞，记录） | v27 会话映射 |
| A14 | `user_id: null` / `""` / 缺失 / `{}` / 只有未知字段 | 前三种补账号身份；`{}` 与未知字段不补（客户端原值保留） | v27 判定边界（P3-4） |
| A15 | API Key 账号 build / 无映射密钥登录 / direct / probe | 前三者不加 metadata；direct 不加；probe 按同一规则生成 | v27 非影响面 |
| A16 | 非 CC build/direct + 伪造 request-class/agent-id/parent/agent-type/prompt-id/prev-tool-durations/compaction 头 | 出口与不带这些头的同一请求**逐字节相同**（v27 会不同） | v28 `resolveAgentContext` |
| A17 | 真 CC 主线程 / 子代理 1–3 层 / 压缩 / 辅助请求 | 与 v27 出口 0 差异（含 UA、loop 头、`cc_is_subagent`、prompt-id） | v28 不影响 CC 路径 |
| A18 | 非 CC 且 system 任意位置含计费头行（不在首块） | **判为 CC**（`requestBilling` 口径）：出口 = [首位新增的原生头, 客户端块原序]（3 块），**无身份行**；非 CC 对照（无计费头）会多出身份行、且伪造 request-class 不会被采用 | P3-2 设计边界；离线 `noncc-classify` 已决定性确认（11/11）：billing-in-block-2 → `subagent`+`cc_is_subagent=true`+无身份行；no-billing → `main`+身份行；billing-first → `subagent`（`results/evidence/noncc-classify/`） |
| A19 | 非 CC 且带 CC 形状 UA、无计费头 | UA 仍走原生 `dN()`（与 v27 相同） | v28 UA 逻辑 |
| A20 | tracked 响应 + 资源输出（container） | 仍整段缓冲 + 资源改写；issuer 头缺失时 502（P2-3 遗留） | `creditStreams` 排除 outputs |
| A21 | 官方客户端全量场景（沿用 wf-r2 的 55 场景） | 出口与 v27/官方逐字节一致（除 metadata 新增与 v28 收紧） | 回归基线 |

---

## 8. 本轮代码位置速查

- 核心 credit：`next/server/internal/gateway/credit_stream.go:26-29,35-41,50-142,146-155,179-187`；`fallback_credit.go:35-88,100-145,149-198`；`forward.go:50-75,405-425`；`resource_response.go:35-94,130-171`；`dispatch.go:146-149`。
- Worker credit：`next/plugins/ccgateway/companions/engine/request_credit.go:34-53,55-81,93-115,117-143,169-217`；`request_command.go:71-104,450-509,522-601`。
- 授权锁：`engine/auth.go:51-63,318-319`；`engine/resource_http.go:63-115,159-175`；`engine/resource_concurrency.go:8-36`；`engine/resource_identity.go:57-129`；`engine/resource_lease_unix.go:10-12`。
- 身份（v27）：`engine/request_identity.go:116-165,171-180,259-341`；`cli-mods/request-identity.js:1-90`；patch `chunk-dxktn51d.js` 的 `Yi`。
- 请求类别（v28）：`cli-mods/request-agent.js:41-130`；`request-command.js:133-171,186-206,208-221`；`request-build.js:205-253,292-320`；`content-policy.js:380-410,474-520`。
- 传输/回执：`model-request.js:46-120`；`request-headers.js:21-65`；`patch-cli-2.1.304.cjs:160-215`。
- 插件出口：`next/plugins/ccgateway/internal/ccgateway/ccgateway.go:150-175`；`manifest.json:81-95,140-154`；`contracts/httpfacts/headers.go:10-37`。
- 隧道（证明 trailer 透传）：`next/server/internal/ccgateway/controller_tunnel.go:27-110`；`next/plugins/ccgateway/companions/controller/http_api.py:326-377`。
- 契约夹具：`next/plugins/ccgateway/companions/contracts/testdata/worker-cli-requests.json`；`engine/contract_fixture_test.go`；`cli-mods/test/contract-fixtures.test.mjs`。

---

## 处理结果（2026-10-25，工作树，未发布）

- **P2-1 已修**：确认或记录失败时，核心写出 `error` 事件后正常结束流（`credit_stream.go` `streamEndedError`，`forward.go` 对它不再 `abortResponse`），失败仍记入用量记录。测试 `TestFallbackCreditUnconfirmedStreamEndsCleanly`；`creditStreamRequest` 不再容忍截断。
- **P2-2 已修**：Worker 的资源身份核验在缓存未命中时单飞（`resource_identity.go` `verifying` 锁 + 拿锁后再查一次缓存），等候者直接用刚核验出的身份，不再并发起核验 CLI、并发刷新凭证或抢身份文件锁。测试 `TestColdIdentityIsVerifiedOnce`。
- **P2-3 已修**：读流算 claim 的函数移到契约 `credits.EventPayloads`，Worker 与核心的流式路径共用（核心不再对 tracked 流用严格的 `resourceResponseEvents`）；CRLF、注释行、末事件无结尾空行都一致。测试 `TestEventPayloadsReadsEveryStreamForm`、`TestFallbackCreditStreamFormsMatchTheWorker`。整段读的 JSON/资源输出路径不变。
- **P2-4 已修**：是否扣住改为 `credits.EventCarriesToken`（按 claim 的读法：`message_delta.delta` 或 `message_start.message` 里非 null 的 `stop_details.fallback_credit_token`，重复键同样按解码结果），回答里提到这个词不再扣住；超过 32 MiB 后扣住的部分丢弃，`held` 有界。测试 `TestEventCarriesToken`、`TestFallbackCreditStreamHoldsOnlyAToken`。
- **P2-5 已修**：REQUEST-MODES、BUILD-REQUEST-COMPONENTS-DESIGN、SUBAGENT-REQUEST-CONTEXT-DESIGN、REQUEST-HEADERS 的版本横幅改为「以代码为准，版本见 cli-mods README 版本表」，不再写死版本；REQUEST-MODES §1.5 写明上述新语义。
- 新测试都在旧代码上确认会失败。companions、contracts、cli-mods（178）、插件模块、核心全量（49 个包）测试通过。
