# CCGateway 离线对拍（第三轮）

2026-10-25。对象：`feat/next-platform` HEAD `38d534d2d`，线上插件 0.1.93，镜像 `ccgateway-app:0.1.93`，CLI 2.1.304 补丁 `ccgateway-v28-cc-only-context`。本文件只记录实测；静态结论见同目录 `03-static.md`，生产链路见 `02-prod31.md`。

**本轮官方基线（A 侧）已导出到** `artifacts/claude-2.1.304/e2e/wf-r3-2026-10-25/baseline/`（12 个文件、66 个请求、约 1.5 MB；artifacts 不进 git，令牌已打码为 `Bearer REDACTED` / `REDACTED`）。格式与上一轮相同：一个文件一个场景，

```
{"scenario","source","note","captured_at","requests":[{index,method,url,headers:[[name,value],…保序],body}]}
```

| 文件 | 场景 | 请求数 |
|---|---|---|
| `01-main-text.json` | 主线程单轮 `-p` | 1 |
| `02-main-text-direct.json` | 同一对话（direct 只改投递） | 1 |
| `03-tool-two-rounds.json` | Bash 工具两轮 | 2 |
| `04-subagent-two-levels.json` | 主 → Agent(L1) → Agent(L2) | 5 |
| `05-compact.json` | 首轮 + `/compact` | 2 |
| `06-turn2.json` | 同会话两轮（`--continue`） | 2 |
| `07-aux-nonessential.json` | 开非必要流量（客户端仍未发辅助请求） | 1 |
| `08-noncc-reference.json` | 官方主线程请求（非 CC 参照形状） | 1 |
| `09-apikey-shape.json` | API-key 形状客户端的 beta 表（`ANTHROPIC_AUTH_TOKEN`） | 1 |
| `10-subagent-one-level.json` | 主 → Agent(L1) → OK | 3 |
| `11-subagent-three-levels.json` | 主 → L1 → L2 → L3（三层嵌套） | 7 |
| `12-subagent-three-levels-direct.json` | 同一三层嵌套，`relay_mode=direct` 的 A 侧（请求与 build 相同，供 31 号按 direct 回放） | 7 |

---

## 0. 结论（先看这几条）

1. **本轮 1540 条断言全部通过（0 FAIL），70 个抓包场景全绿。** r2 的 3 条错误断言（r2 报告 §6 的 FAIL-1/2/3）已按上一轮判定修正后重跑，说明它们是断言错、不是产品缺陷。
2. **0.1.93 / v28 对 CC 请求没有回归**：66 个 A/B 配对请求里，头集合、头顺序、body 键集合/键序、工具定义（380 条逐字节断言）、system[1..n] 全部一致；差异只有每次运行的随机 ID、`system[0]` 的 `cch`/`cc_prompt_id`、`metadata` 映射、附件环境值（设计）与子代理交回的 `duration_ms`。
3. **v28「非 CC 一律主线程」实测成立**：非 CC + 伪造 request-class/agent-id/parent/agent-type/prompt-id/prev-tool-durations/压缩头，出口与不带这些头的同一请求**掩码随机值后逐字节相同**（build 与 direct 都是）；v27 在这四项上都不同。
4. **v27 身份生成实测成立**：非 CC 无 `metadata.user_id` 时补账号身份；同一对话两轮 session 相同、且等于 `x-claude-code-session-id`；不同首条消息不同；`user_id: null` / `""` / 缺失都补；`{}` 与只含未知字段的对象保留原值、不补；direct 不加；客户端自带的身份仍按账号映射。
5. **0.1.91 的 credit 流式（Worker 侧）实测成立**：被跟踪的流式应答首字节 1011 ms、结束 2527 ms，分 2 块到达；带与不带 fallback-credit beta 的上游正文相同；回执 `X-CCGateway-Fallback-Credit-Ready` 在 **trailer** 里且等于 `sha256(token)`，不再出现在响应头。两个并发 tracked 请求各 2.5 s 完成（不排队）。
6. **子代理 1–3 层嵌套与 CC 出口一致**：请求数 3/5/7 与 A 相同；`request-class`/`agent-id`/`parent-agent-id`/`agent-type` 出口 = 入站原值；嵌套 parent 链正确；全部子代理 `cc_is_subagent=true`、无 `extended-cache-ttl`；掩码 agent id 与耗时后 messages 逐字节相同。
7. **无新 P1/P2。** 旧问题：r2 的 3 条断言错已关闭；400 错误信封不一致、非 CC direct 的 system 键序、API-key 形状客户端的 `extended-cache-ttl` 仍存在（均 P3，见 §7）。**追加实验（`noncc-classify`）确认「任意块计费头即为 CC」的口径正确**——我最初按「出口多出原生计费头」判成非 CC 是错的，判别信号是身份行；见 §7 P3-1。
8. **归因统计**：66 个 β 差异里 61 个是客户端没发 `mid-conversation-system-clear-at-2026-08-21`（首方路径独有）；4 例 B 多 `oauth-2025-04-20`（3 例同时多 `extended-cache-ttl`），1 例 API-key 账号按设计过滤 `oauth`；**没有任何一处能归因到「Worker 丢了」或「CLI 组装错」**。

规模：70 个抓包目录 / A 侧 66 个请求 / B 侧 123 个 / 入站 122 个；断言 1540/1540；比较器覆盖 66 个 A/B 配对 + 57 个 B-only 请求；校准 19 场景 66 请求 0 差异。

---

## 1. 执行环境

- **位置/容器**：ovh，一次性容器 `docker run --rm --network none --user 1000:1000 -v /tmp/ccg-audit-r3/work:/t -w /t --entrypoint sh ccgateway-app:0.1.93`。镜像 ID `cbb3308207bc`（991 MB）。每轮运行一个容器，跑完即删；没有触碰任何运行中的容器、卷或凭证。
- **二进制 sha256**（镜像内核对）：
  - Worker `/usr/local/bin/worker` = `3bb56cd4b3123eac8e7917ac0e1d1d51b8b95ca22a963ceb26b028cf290ea6dd`
  - CLI `/opt/ccgateway/cli/2.1.304/claude`（`/usr/local/bin/claude` 是同一个 ELF）= `aedec4eb3e2dab0c4c4956cd5e272a2586934d74b9987201ac9523513796d39c`（与任务给的 v28 ELF 一致）
  - 补丁清单 `/opt/ccgateway/cli/2.1.304/ccgateway-patch.json` = `46e779e8a89aeebb62a0c7a9fff54043b3f258a65f962b1ce78022d332e3035b`，`extension=ccgateway-v28-cc-only-context`
  - 官方客户端 `~/sup2api/checks/ccg-304-v12/claude-official-304` = `ea0f135784631619a7a409d07322ecec964f9cc4fd377508ed1ba3f141f27912`（288,730,480 B）
- **容器内工具**：`node v22.23.4`、`curl 7.88.1`、`openssl 3.0.22`、`x86_64`。
- **Worker 启动参数**：`WORKER_CLI_VERSION=2.1.304 CCG_CLI_SHA256=aedec4eb…3796d39c CCG_CLI_PATCH=ccgateway-v28-cc-only-context`；两个 Worker：w1（8787，OAuth 存储登录）、w3（8777，API-key 账号 + 本地 credit 跟踪模拟）。
- **A 侧**：官方客户端直连假上游（TLS over unix socket，`ANTHROPIC_UNIX_SOCKET` + `NODE_TLS_REJECT_UNAUTHORIZED=0` + `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`）。
- **B 侧**：同一客户端 → 本地代理 8788/8778（模拟核心：逐请求写 `x-ccgateway-request-policy`，credit 场景另加跟踪头与 resource identity）→ Worker → v28 CLI → 同一个假上游。两端都设 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`。
- **入站 `in/`**：代理把客户端 → 核心的原始请求落盘（保序头 + body）；r3 新增 `in/resp-N.json`：Worker 应答的状态、头、**trailer** 与首字节/结束时间（毫秒）。用于区分「客户端没发 / Worker 丢了 / CLI 错」以及验证回执位置。

---

## 2. 方法与规模

- **脚本**：`artifacts/claude-2.1.304/e2e/wf-r3-2026-10-25/`。以 r2 的 `run.sh`、`proxy.cjs`、`compare.cjs`、`verify.cjs`、`checks.cjs`、`regress-compare.cjs`、`export-baseline.cjs` 为底，只做本轮必需的增补：
  - `fake-upstream.cjs`：合并 r2 场景与子代理 `sub1/sub2/sub3/bg/fork`，新增 `credit-slow`（`CREDIT_DELAY_MS` 让首事件与拒绝事件相隔 1.5 s，用于证明流式不缓冲）。
  - `proxy.cjs`：补 trailer 透传与 `resp-N.json` 时间线（首字节/结束/块数）。
  - `extra.sh`：新增阶段（非 CC 身份、伪造上下文、嵌套子代理、credit 流式/并发）。
  - `noncc.cjs` / `noncc2.cjs`：非 CC 探针（逐条请求写策略文件，避免代理覆盖策略头）。
  - `credit-client.cjs`：credit 探针（首字节、结束、trailer）。
  - `verify.cjs`：修正 r2 的 3 条错误断言，新增 §9–§17 共 8 组断言。
- **运行**：`smoke` → `calib1` → `calib2` → `all`（70 场景）→ `extra`（新增场景重跑）→ `conc`（并发 tracked）→ `classify`（追加：计费头位置 × 伪造 CC 上下文的判定实验，3 个请求，11/11 断言）。全量 `EXIT=0`。
- **校准**：同一配置跑两遍（`cal1`、`cal2`，各 19 个场景），`regress-compare.cjs` 掩码随机值（UUID、`cch`、指纹、耗时、agent id、日期）后 **0 差异 / 66 个请求**（`results/results-calib.txt`）。
- **规模**：70 个抓包目录；A 侧 66 个请求、B 侧 123 个、入站 122 个；`verify.cjs` 1540/1540；`compare.cjs` 覆盖 70 个场景（66 个 A/B 配对，57 个无官方对应物的 B-only 请求）。
- **已知脚本噪声**（不影响结论，已在最终统计前处理）：
  - 场景重跑时入站计数从已有文件继续（`in-07…`），会留下两轮记录；本轮已按「保留最后一轮」删旧再重跑比较/断言。
  - `credit-concurrent` 的两个并发 POST 竞争入站文件名，只留下 1 份 `in-*.json`；并发结论以 `client-1.json`/`client-2.json` 的时间线为准。

---

## 3. 场景表（70 个抓包目录 + 追加判定实验 1 个）

| 组 | 场景 | 结果 |
|---|---|---|
| 官方客户端 build/direct | `main-build-low`、`-stream`、`-micro`、`-erase`、`-high`、`-billing`、`main-direct` | 通过；差异仅随机 ID、`system[0]`、`metadata`、附件（设计） |
| 工具/多轮/压缩/附件/辅助 | `tool-build-low`、`tool-direct`、`turn2-build-low`、`compact-build-low`、`attach-worker`、`aux-nonessential` | 通过；`aux` 客户端仍未发旁路请求 |
| 子代理（CC） | `subagent-build-low`/`-direct`（2 层）、`sub1-build/direct`、`sub2-build/direct`、`sub3-build/direct`（三层） | 全部通过；请求数 = A（3/5/7） |
| 入口/UA | `ua-cli-client-build-low`、`ua-cli-worker-billing`、`ua-cli-entrypoint`、`ua-sdk-build-low` | 通过 |
| API-key 形状客户端经 OAuth 账号 | `apikey-shape-{haiku,sonnet,opus}-micro`、`apikey-shape-opus-direct` | 通过（beta 差异见 §4-5） |
| API-key 账号 | `apikey-account-client`、`apikey-account-noncc-high` | 通过；后者非 CC 不补身份行 |
| 登录态客户端 | `login-account` | 仅 B 侧（A 侧客户端未发出请求，沿用 r2 缺口） |
| 非 CC build/direct | `plain-build-{micro,low,high}`、`plain-direct`、`plain-nosystem-{build,direct}`、`plain-tools-{micro,low,high,direct}` | 200；客户端工具原样保留；high 身份行 `official_cli_sdk`（设计） |
| 非 CC 上下文（新） | `noncc-context`（plain/forged/compaction/plain-direct/forged-direct）、`noncc-context2`（CC 形状 UA 无计费头、计费头不在首块）、`noncc-classify`（追加：计费头位置 × 伪造 subagent 头） | 伪造子代理/压缩头 = 不带头（非 CC）；计费头在任意块 → CC，会采用伪造的 request-class（§7 P3-1） |
| 非 CC 身份（新） | `noncc-identity`（t1/t2/other/nullid/client/direct）、`noncc-identity2`（`""`/`{}`/未知字段/同首条消息碰撞/后续轮） | 全部符合 §0-4 |
| 边界 | `s1-missing-result-{build,direct}`、`s2-unsafe-number-{build,direct}`、`s3-uppercase-session`、`s4-no-prompt-id`、`s5`/`s5b-two-beta-lines` | 与 r2 一致 |
| 上游 4xx | `err400-build`、`err400-direct` | 400 + `Content-Type: application/json` + 正文原样 |
| credit | `credit-beta-{0601,0701}-build`、`credit-beta-0701-direct`、`credit-ssf-{0601,0701}-build`、`credit-ssf-0601-direct`、`credit-issued-{build,direct,stream}`、`credit-stream-trailer-build`、`credit-json-trailer-build`、`credit-plain-vs-tracked`、`credit-concurrent` | 全部 200；回执位置见 §5 |
| Worker probe | `probe-build`（`/v1/ccgateway/probe`） | 200，按 build 生成并发出请求 |

---

## 4. 22 项出口清单逐项实测

| # | 检查项 | 实测 |
|---|---|---|
| 1 | 请求行 | **A 66/66、B 123/123 都是 `/v1/messages?beta=true`**（verify 189 条 ok） |
| 2 | 头集合 | 66 个 A/B 配对里**没有**「只有 A / 只有 B」的头（忽略 content-length/host/connection/accept-encoding/authorization/x-api-key）；差异只有随机 ID、`anthropic-beta`、`metadata` 映射 |
| 3 | 头顺序 | 66 个配对 **0 处**顺序差异（`compare.cjs` 逐位置比较） |
| 4 | user-agent | 全部相同；`ua-cli-worker-billing` 仍无法区分 `build_billing_sources=worker`（客户端与 Worker CLI 的 `cc_version` 指纹同为 `2.1.304.9a4`） |
| 5 | `anthropic-beta` | 66 个 β 差异块：**61** 仅缺 `mid-conversation-system-clear-at-2026-08-21`（150→ **入站 0 个带它**，「客户端没发」）；**4** 例 B 多 `oauth-2025-04-20`（其中 3 例同时多 `extended-cache-ttl-2025-04-11`，OAuth/build 设计）；**1** 例 `apikey-account-client` A 有 oauth、B 无（API-key 账号过滤登录 beta，设计）。120 个入站↔出口配对中客户端 beta 只在上述 1 例被过滤，**0 例 Worker 丢失** |
| 6 | `anthropic-version` | `2023-06-01`（全部，无差异） |
| 7 | `x-app` | `cli`（全部，无差异） |
| 8 | `x-stainless-*` | 同容器同值（os/runtime/package/retry-count），无差异 |
| 9 | `x-stainless-timeout` | `600`（抽查 build/tool/subagent/compact/plain，无差异） |
| 10 | `x-claude-code-session-id` | **95 条**「session 头 = metadata」断言全过；非 CC 生成身份的场景也相等；`s3` 大写 UUID 仍映射为 v4 |
| 11 | `x-claude-code-prompt-id` ↔ `cc_prompt_id` | **118 条**断言全过；`s4`（计费头无 `cc_prompt_id`）边界仍在 |
| 12 | 子代理 | 1/2/3 层请求数 3/5/7 与 A 相同；`request-class`/`agent-id`/`parent-agent-id`/`agent-type` 出口 = 入站原值；嵌套 parent 指向已出现的上层 agent-id；全部 `cc_is_subagent=true`、无 `extended-cache-ttl`；掩码 agent id 与 `duration_ms` 后 messages 逐字节相同（三层含 LEVEL3） |
| 13 | 压缩 | `compact-build-low` 与 A 相同（除随机/beta/`system[0]`/metadata） |
| 14 | 辅助请求 | `aux-nonessential` A/B 各 1 个请求，客户端仍未发旁路请求；仍无样本 |
| 15 | 非 CC build | micro/low：`[计费头, agent_sdk, 客户端]`；high：`[计费头, official_cli_sdk, CC 静态, CC 动态+客户端 system]`（注入提示词时原生选择，**设计**）；客户端自带身份行时不新增/不移动（`apikey-account-client` 与入站逐块一致）；API-key 账号的非 CC 请求不补（`apikey-account-noncc-high`） |
| 16 | 非 CC direct | 只在原始 JSON 文本上改 `system`（补计费头块），其余键/值逐字节；无身份行 |
| 17 | body（CC build） | 键集合、键序一致；差异只有 `metadata`、`cch`/`cc_prompt_id`、附件环境值（设计）与子代理 `duration_ms`；`system[1..n]` 0 差异 |
| 18 | body（direct） | CC direct 逐字节相同（main 1/1、tool 2/2、sub1 3/3、sub3 7/7）；非 CC direct 只有 `system` 一项变化 |
| 19 | `stream` 缺省 | 非 CC 客户端没发 → 出口无 `stream` 键；CC 客户端发 `true` → 出口 `true` |
| 20 | 私有头 | B 侧 **123/123** 出口无 `x-ccgateway-*` / `x-request-id` / `x-stainless-helper`；`x-ccgateway-session-scope` 不再出现 |
| 21 | 响应侧 | 代理是核心替身，**不实现 `httpfacts` 白名单**；实测 Worker 应答含 `Principal`/`Generation` 头与 `Ready` trailer（Worker 行为）。生产核心是否剥离只能靠静态与 31 号链路，见 §8 缺口 |
| 22 | 错误路径 | 400 + `Content-Type: application/json` + 正文 `{"type":"error",…"probe error <>&"}` 原样；按 `KEEP` 白名单模拟，客户端可见只有 `request-id`，`x-ccgateway-error-source`/`cache-control`/`date`/`content-length` 都会被挡掉 |

### 差异全集与归因（66 个 A/B 配对，531 条差异行）

| 差异 | 数量 | 归因 | 说明 |
|---|---|---|---|
| `x-client-request-id` / `x-claude-code-session-id` / `prompt-id` / `agent-id` / `parent-agent-id` / `prev-tool-durations` | 66 / 66 / 65 / 24 / 10 / 18 | **每次运行随机**（不是差异） | 两侧各自生成；同一侧内部一致（session 头 = metadata，95 条断言） |
| `anthropic-beta` | 66 块 | **客户端没发**（61）/ **设计如此**（5） | 见 §4-5 |
| `system[0]`（`cch`、`cc_prompt_id`） | 66 | **设计如此** | 每次请求重新计算；块长度相同，`system[1..n]` 无差异 |
| `metadata` | 66 | **设计如此** | 账号身份映射（session/device/account 换成该账号的） |
| `messages[1]`（环境附件） | 2 | **设计如此** | `attach-worker`（Worker 工作目录）、`main-build-erase`（按策略删行） |
| `messages[3]`（子代理交回正文） | 16 | **每次运行随机** | 只差交回文本里的 `duration_ms` 与 agentId；掩码后逐字节相同（`msgs-diff.cjs`） |

**没有**：body 键集合/键序差异、tools 名单/定义差异（380 条逐字节断言）、`cache_control` 差异、头顺序差异、system 块数差异、客户端 beta 丢失（除 API-key 账号按设计过滤 `oauth`）。**没有一处能归因到「Worker 丢了」或「CLI 组装错」。**

---

## 5. credit 专项（0.1.91 的 Worker 侧）

| 场景 | 状态 | 跟踪 | 回执位置与值 |
|---|---|---|---|
| `credit-beta-{0601,0701}-build`、`credit-beta-0701-direct`、`credit-ssf-0701-build` | 200 | 是 | 头 `Principal`/`Generation`；无 `Ready`（上游未发放） |
| `credit-ssf-0601-build/-direct` | 200 | **否** | 无 identity 头（与 `contracts/credits/prompt.go` 三名单一致） |
| `credit-issued-build/-direct` | 200 | 是 | **trailer** `Ready = sha256(token)` |
| `credit-issued-stream-build` | 200 (`text/event-stream`) | 是 | **trailer** `Ready = sha256(token)` |
| `credit-stream-trailer-build`（`credit-slow`，1.5 s 间隔） | 200 | 是 | 首字节 **1011 ms**、结束 **2527 ms**、2 块；trailer 回执；头里没有 `Ready` |
| `credit-json-trailer-build`（非流式 refusal） | 200 | 是 | 整段读 + trailer 回执 |
| `credit-plain-vs-tracked`（同 body，先不带 beta） | 200/200 | 否/是 | 上游正文逐字节相同；未跟踪无回执且同样流式（1025→2529 ms）；跟踪 `998→2511 ms` |
| `credit-concurrent`（两个 tracked 同时） | 200/200 | 是 | 各 2.5 s 结束、都有 trailer 回执；**没有互相排队** |

- 9 个 r2 credit 场景全部 200，**没有一次 502**；上一轮 P1 的复现路径（只带 fallback beta、无 token）仍为 200。
- 回执值 = `sha256('ccgaudit-credit-token-1')` = `c4b940fe…2aa2e97d`，出现在 `in/resp-N.json` 的 `trailers` 与（代理透传后）探针客户端的 `res.trailers` 中；响应头里不再有 `Ready`。
- **只证明 Worker 行为**：核心的「扣住含 token 的尾部、确认后再放行、失败以 error 事件收尾」不在离线范围（代理是替身）。`credit-stream-trailer-build` 的正文里 token 由假上游 `message_delta` 携带，Worker 原样转发，**核心侧是否扣住/是否恰好一次需 31 号验证**。

---

## 6. 与第二轮问题对照

| 上一轮项 | 本轮状态 | 证据 |
|---|---|---|
| N1 出口无 `?beta=true`（P2） | **已修**：A 66/66、B 123/123 | `results-verify.txt` |
| P1 fallback-credit 502 | **已修**：13 个 credit 场景全 200 | `results-verify.txt`、`evidence/credit-*` |
| P2-1 tracked 整段缓冲（Worker 侧） | **Worker 侧已修**：首字节 1011 ms vs 结束 2527 ms、2 块；同 body 带/不带 beta 正文相同 | `evidence/credit-stream-trailer-build/{client.json,in/resp-01.json,b/emit.jsonl}` |
| P2-2 credit 授权锁持整请求（Worker 侧） | **Worker 侧已修**：两个并发 tracked 各 2.5 s，第二个不排队 | `evidence/credit-concurrent/client-{1,2}.json` |
| P3-1 `verify.cjs` 三条断言写错 | **已修**（本轮按 §6 判定改脚本）；0 FAIL | `verify.cjs`、`results-verify.txt` |
| P3-2 API-key 形状客户端补 `extended-cache-ttl` 但 body 无 `ttl:1h` | **仍在**（无害，设计/记录）：`apikey-shape-*-micro` B 有该 beta，`cache_control` 与 A 相同 | `evidence/apikey-shape-opus-micro/{a,b}` |
| P3-3 两处 400 错误信封不一致 | **仍在**：`s1` 标准顺序带 `code`；`s2` 键序反转、无 `code` | `cap/s2-unsafe-number-build/b.body` |
| P3-4.6 非 CC direct 无 system 时 `system` 插在 `messages` 后 | **仍在**（键序 `model,max_tokens,messages,system`），设计/已记录 | `cap/plain-nosystem-direct/b` |
| P3-4.1 `login-account` A 侧无请求 | **仍在**（客户端 exit=1，未发出） | `cap/login-account/a`（空） |
| P3-4.4 `build_billing_sources=worker` 不可区分 | **仍在** | §4-4 |
| P2-4 事实文档过期 | **仍在**（静态确认，本轮未改文档） | `03-static.md` |
| P2-5 两份 SSE 解析实现 / beta 兜底无测试 | **仍在**（本轮未构造注释行/CRLF/无尾空行） | — |
| S4 计费头无 `cc_prompt_id` | **仍在**（已知边界） | `cap/s4-no-prompt-id-build/b` |
| 第 4 个 fallback beta 不跟踪 | **仍在**（设计，`credit-ssf-0601-*` 无 identity 头） | `results-verify.txt` |
| **新出现（预期中的新行为，非缺陷）** | v27 身份生成、v28 非 CC 一律主线程、0.1.91 回执改 trailer 与流式 | §0-3/4/5 |

---

## 7. 新问题

### P1

无。

### P2

无新增。上一轮的 P2-2（核心侧 46 s）、P2-3（资源输出 502）、P2-5（两份 SSE 解析）本轮**仍未验证**（离线范围外或未构造流量），不能因本轮全绿而关闭。

### P3

**P3-1 [已纠正的实测结论] CC / 非 CC 判定：**任意块**的计费头即为 CC（与静态一致，不是首块）**

- 我最初把 `noncc-context2/billing-not-first` 判成「非 CC」是**错的**：判据用了「出口首位多出一块原生计费头」，而这条在两种分类下都会出现——CC 且计费头不在首块时，`mergeBillingAttribution` 的 `!target` 分支必然「首位插入原生头、客户端块原序保留」（`content-policy.js:398-405`），正是看到的 3 块 `[原生头 .533/cch=00000, Answer concisely., 客户端 .9a4/cch=12abc]`。
- **正确判据是身份行**：同场景非 CC 对照 `cc-ua-no-billing` 的出口有 `You are a Claude agent, built on Anthropic's Claude Agent SDK.`；`billing-not-first` 没有 → `identityRequest` 的 own=true（CC）分支。
- **追加决定性变体**（`noncc-classify`，三个请求伪造同一组 `x-claude-code-request-class: subagent` / `agent-id` / `parent-agent-id` / `agent-type` / `prompt-id`，只改计费头位置）：

| 请求 | 计费头位置 | 出口 request-class | agent-id / parent | `cc_is_subagent` | 身份行 | 结论 |
|---|---|---|---|---|---|---|
| `req-01` | 第 2 块 | **subagent** | `a0123456789abcdef` / `afedcba9876543210` | true | 无 | **CC**：采用客户端的上下文 |
| `req-02` | 无 | main | 无 | false | 有 | **非 CC**：按主线程（v28 丢弃） |
| `req-03` | 第 1 块 | subagent | 同上 | false | 无 | CC（对照；计费头原样保留，客户端自己没写 `cc_is_subagent`） |

- 结论：产品口径就是「任意 system 块的行首计费头即为 CC」（`hasBilling`/`requestBilling`，`content-policy.js:474-520`），与 v27 一致；**不需要改代码，也不是新问题**。`noncc-classify/req-03` 的 `request-class=subagent` 与计费头缺 `cc_is_subagent=true` 并存，是伪造样本自身矛盾、按客户端原样透传，不是网关问题。
- 证据：`results/evidence/noncc-context2/b/req-0{1,2,3}.json`、`results/evidence/noncc-classify/{in,b}`（追加运行的 3 个请求）。静态成员已在 `03-static.md` §0.6/§4/§7-A18 补了读数指引（断言无身份行，或加伪造 request-class 变体）。

**P3-2 [测试] 入站抓包在场景重跑/并发下会重名或堆积**

- 场景重跑时 `in-N.json` 从已有文件继续编号，留下两轮记录；`credit-concurrent` 两个并发 POST 竞争同一个文件名，只留 1 份。已在本轮统计前清理，不影响结论，但脚本应改成带 run 前缀或用 `O_EXCL` 递增。
- 证据：`proxy.cjs` 的 `finish()`；`results/results-calib.txt` 与 `cap/credit-concurrent/in`（1 份）。
- 建议：`proxy.cjs` 用 `Date.now()+pid` 或 `wx` 打开递增；`start_fake` 清整个 case 目录而不是只清 `b/`。

**P3-3 [沿用] 两个 400 错误信封形状不一致**（r2 P3-3）

- `s1-missing-result-build`：`{"type":"error","error":{"type":"invalid_request_error","code":"cli_invalid_request","message":…}}`。
- `s2-unsafe-number-build`：`{"error":{"message":…,"type":"invalid_request_error"},"type":"error"}`（键序反转、无 `code`）。
- 来源：`next/plugins/ccgateway/companions/engine/request_components.go` 的 `fmt.Errorf` → 通用错误序列化。建议统一为 API 标准信封。

**P3-4 [沿用] API-key 形状客户端经 OAuth 账号时 build 补 `extended-cache-ttl`，body 仍是 5 分钟缓存**（r2 P3-2）

- `apikey-shape-{haiku,sonnet,opus}-micro`：A 无该 beta，B 有；两侧 `cache_control` 相同（无 `ttl`）。上游接受，属语义不一致；建议按需补或记录为已知。

**P3-5 [沿用] 非 CC direct 无 system 时的键序**（r2 P3-4.6）

- `plain-nosystem-direct` 出口键序 `model,max_tokens,messages,system`；官方把 system 放在前面。`direct-billing.js` 的 `insertSystem` 已写明「CC 发送位置」，上游接受；保留为记录。

**P3-6 [沿用] 事实文档过期**（r2 P2-4）

- `REQUEST-MODES`、`REQUEST-HEADERS`、`CC-INJECTION-LEVELS-DESIGN` 的版本/行为描述未跟上 v27/v28；静态审核已列。

---

## 8. 覆盖缺口（本轮未验证，不能视为通过）

1. **核心侧 credit 语义**：扣住含 token 的尾部、确认后再放行、`Record` 失败时 `event: error` + 中断、>32 MiB 的 `keepCredit` 溢出、客户端取消/Worker 超时、重新授权期间新 tracked 的 30 s 503、冷身份核验并发（静态 A2/A5/A6/A7/A8/A10/A11）。离线代理不实现这些。
2. **A3 生产链路 trailer**：trailer 是否穿过 core → controller `ccg-tunnel` → worker（只有 31 号真实兑换能证明）。本轮只证明 Worker 发出 trailer、代理透传可见。
3. **响应侧白名单**：代理替身不剥离 `Principal/Generation/Ready`；客户端可见性需 31 号。
4. **API-key 账号 / 无映射密钥登录的身份**：API-key 账号的 build 与非 CC 已由 `apikey-account-*` 覆盖；「登录但邮箱未知（mode=worker）」未构造。
5. **`metadata.user_id` 字符串载体里的未知对象**（`"{\"foo\":\"bar\"}"`）：代码路径会把整串当 `device_id` 映射；本轮只测了对象载体（`{}`/未知字段保留原值）。
6. **长流（>2 分钟、注释行、CRLF、末事件无空行）与 P2-5 的两份 SSE 解析**未构造。
7. `UA` 的 `keepClientUserAgent`：本客户端的 UA 与原生 `dN()` 输出相同，场景无法区分（与 r2 相同）。
8. `aux-nonessential` 仍无旁路请求样本。

---

## 9. 结果与证据文件

- `artifacts/claude-2.1.304/e2e/wf-r3-2026-10-25/results/results-compare.txt`（70 场景 / 531 条差异行，全部属 §4 的已知类别）
- `.../results/results-verify.txt`（1540/1540，含 §9–§17 的新断言）
- `.../results/results-checks.txt`（逐请求的类别/计费头/session/工具/键序）
- `.../results/results-calib.txt`（19 场景 66 请求，0 差异）
- `.../results/results-beta.txt`（入站↔出口 beta 对账：120 请求，客户端 beta 缺 1 例（API-key 过滤 oauth），新增 beta 5 种）
- `.../results/results-verify-classify.txt`（追加判定实验 11/11）、`.../results/results-compare-classify.txt`（B-only，3 个请求）
- `.../results/{all.out,extra.out,smoke.log,calib1.out,calib2.out}`
- `.../results/evidence/`（20 个目录、230 个文件、2.1 MB）：非 CC 身份/上下文、判定实验（`noncc-classify`）、probe、credit 四例（含 `in/resp-N.json`、`b/resp-N.json`、`emit.jsonl`、`client*.json`）、子代理 1/3 层、`apikey-account-*`、`plain-build-*`、`s4`、`err400`。
- `.../baseline/`（12 文件、66 请求，§0 的格式）。

---

## 10. 清理与局限

- 服务器 `/tmp/ccg-audit-r3`（脚本、证书、`cap/`、`ev`、`results/`、`baseline/`、`cal*`、日志）已整个删除；删除前已把基线、结果与证据拷回本地。`docker ps -a` 过滤 `ccgateway-app:0.1.93` 无残留容器；本轮没有触碰任何运行中的容器、卷或凭证，没有访问真实上游，没有读/打印任何真实令牌（全部为 `ccgaudit-*` 假令牌）。
- 局限：离线用代理替身模拟核心，响应侧白名单、credit 扣尾/记录、隧道、缓存失效均不在本轮证据内；传输层（TLS/h2/头大小写）本来就无法一致；`login-account` A 侧仍缺。
