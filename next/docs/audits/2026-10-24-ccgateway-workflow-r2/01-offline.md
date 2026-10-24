# CCGateway 离线对拍（第二轮）

2026-10-25。对象：`feat/next-platform` HEAD `f12c5fb7e`（线上核心 0.1.186 / ccgateway 0.1.90 / CLI 2.1.304 `ccgateway-v26-native-assembly`），镜像 `ccgateway-app:0.1.90`。本文件只记录实测；静态结论见同目录 `03-static.md`。

**本轮官方基线（A 侧）已导出到** `artifacts/claude-2.1.304/e2e/wf-r2-2026-10-24/baseline/`（9 个文件、16 个请求、约 824 KiB；artifacts 不进 git，令牌已打码为 `Bearer REDACTED`）。格式与上一轮相同：每个文件一个场景，

```
{"scenario","source","note","captured_at","requests":[{index,method,url,headers:[[name,value],…保序],body}]}
```

| 文件 | 场景 | 请求数 |
|---|---|---|
| `01-main-text.json` | 主线程单轮 `-p` | 1 |
| `02-main-text-direct.json` | 同一对话（direct 只改投递） | 1 |
| `03-tool-two-rounds.json` | Bash 工具两轮 | 2 |
| `04-subagent.json` | 主 → Agent(L1) → Agent(L2) | 5 |
| `05-compact.json` | 首轮 + `/compact` | 2 |
| `06-turn2.json` | 同会话两轮（`--continue`） | 2 |
| `07-aux-nonessential.json` | 开非必要流量（客户端仍未发辅助请求） | 1 |
| `08-noncc-reference.json` | 官方主线程请求（非 CC 参照形状） | 1 |
| `09-apikey-shape.json` | API-key 形状客户端的 beta 表（`ANTHROPIC_AUTH_TOKEN`） | 1 |

`10-login-account` 本轮 A 侧没有请求（见 §10 覆盖缺口），导出为空文件，已删除。

---

## 0. 结论（先看这几条）

1. **4 条 FAIL 全部判定为断言写错，不是产品缺陷，也没有 v26 回归。** 逐条证据见 §6。
2. **上一轮唯一的出口缺陷 N1（出口无 `?beta=true`）已关闭**：A 36/36、B 65/65 都带 `?beta=true`（`results-verify.txt` 101 条 ok）。
3. **v25 的 beta 顺序、v26 的身份行/工具定义交回原生，实测成立**：36 个 A/B 可比场景里，公共 beta 的相对顺序 **0 处不同**；CC 请求的 `system` 除计费头 `cch`/`cc_prompt_id` 外逐字节相同；客户端工具定义 308 条断言逐字节保留、无新增字段、`strict` 不变。
4. **credit 专项成立**：9 个 credit 场景全部 200（不再 502）；3 个被跟踪的 fallback beta 会进入 credit 路径并回写 `Principal/Generation`，`server-side-fallback-2026-06-01` 仍不进入（与 `contracts/credits/prompt.go` 的 3 名单一致）；`Ready` 只在真的发放 token 时出现且等于 `sha256(token)`。
5. **无新 P1/P2**。新记录 P3：三条 verify 断言、两处语义观察（不构成缺陷）、若干覆盖缺口（§8）。

规模：55 个抓包场景（`compact-build-low` 没有 `==` 标题，因此 `all.out` 里只有 54 个场景头）/ A 侧 36 个请求 / B 侧 65 个 / 入站 66 个；断言 992/996 通过（4 FAIL）。全量运行 `EXIT=0`。

---

## 1. 执行环境与方法

- **位置/容器**：ovh，一次性容器 `docker run --rm --network none --user 1000:1000 -v /tmp/ccg-audit-wf-r2/work:/t -w /t --entrypoint sh ccgateway-app:0.1.90`。镜像 ID `4c8987b41c1b`（771 MB）。
- **二进制 sha256**（从镜像内核对）：
  - Worker `/usr/local/bin/worker` = `d11517909baa6d09f60140912b6625907d2285d28f9f341230e060bfd80bd964`
  - CLI `/opt/ccgateway/cli/2.1.304/claude` = `0d6149e00b2b73f05556d493fa6ef202296f1fcc34408a4466380dbc7078ec46`（与任务给的 v26 ELF 一致）
  - 补丁身份 `/opt/ccgateway/cli/2.1.304/ccgateway-patch.json` = `620055f31932361ed30f95d2cafde9906e852191a05e4c1c40…`，`extension=ccgateway-v26-native-assembly`
  - 官方客户端 `~/sup2api/checks/ccg-304-v12/claude-official-304` = `ea0f135784631619a7a409d07322ecec964f9cc4fd377508ed1ba3f141f27912`
- **A 侧**（官方基线）：同一个官方客户端直连假上游（TLS over unix socket，`ANTHROPIC_UNIX_SOCKET` + `NODE_TLS_REJECT_UNAUTHORIZED=0` + `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`）。
- **B 侧**（被测）：同一客户端 → 本地代理 8788/8778（模拟核心：按请求写 `x-ccgateway-request-policy`，credit 场景另加跟踪头）→ Worker 8787（OAuth 存登录）/ 8777（API-key 账号）→ v26 CLI → 同一个假上游。
- **入站 `in/`**：代理把客户端 → 核心的原始请求（保序头 + body）落盘，用于区分「客户端没发 / Worker 丢了 / CLI 错」。
- **校准**：同一套场景跑两遍（`cal1`、`cal2`），`regress-compare.cjs` 掩码随机值后 **5 个场景 / 10 个请求，0 差异**（`calib1.out`、`calib2.out` 除末行目录名外逐字节相同）。
- **日志**：`logs/worker-{w1,w3}.log` 均为 0 字节（成功路径无输出）；`logs/proxy-*.log` 只有正常转发与一次 identity 探测。
- **脚本**：`artifacts/claude-2.1.304/e2e/wf-r2-2026-10-24/`（`run.sh`、`docker.sh`、`proxy.cjs`、`fake-upstream.cjs`、`compare.cjs`、`verify.cjs`、`export-baseline.cjs`、`regress-compare.cjs`）。

---

## 2. 场景表（55 个抓包目录）

| 组 | 场景 | 结果 |
|---|---|---|
| 官方客户端 build/direct | `main-build-low`、`main-build-low-stream`、`main-build-micro`、`main-build-erase`、`main-build-high`、`main-build-billing`、`main-direct` | 通过（仅 §4 白名单差异） |
| 工具/子代理/多轮/压缩 | `tool-build-low`、`tool-direct`、`subagent-build-low`(5 请求)、`subagent-direct`(5)、`turn2-build-low`(2)、`compact-build-low`(2)、`attach-worker`、`aux-nonessential` | 通过；`aux` 客户端未发辅助请求 |
| 入口/UA | `ua-cli-client-build-low`、`ua-cli-worker-billing`、`ua-cli-entrypoint`、`ua-sdk-build-low` | 通过 |
| API-key 形状客户端经 OAuth 账号 | `apikey-shape-haiku-micro`、`apikey-shape-sonnet-micro`、`apikey-shape-opus-micro`、`apikey-shape-opus-direct` | 通过（A/B beta 差异见 §4；2 条 FAIL 属断言问题） |
| 登录态客户端 | `login-account` | 仅 B 侧（A 侧无请求，见 §10） |
| 非 CC build | `plain-build-micro`、`plain-build-low`、`plain-build-high`、`plain-nosystem-build` | 200；high 身份行为 `official_cli_sdk`（设计） |
| 非 CC direct | `plain-direct`、`plain-nosystem-direct`、`plain-tools-direct` | 200；除 system 外逐字节 |
| 非 CC 带客户端工具 | `plain-tools-micro`、`plain-tools-low`、`plain-tools-high` | 200；客户端 `Bash`/`MyTool` 原样保留 |
| 边界 | `s1-missing-result-build`(400) / `-direct`(200)；`s2-unsafe-number-build`(400) / `-direct`(200)；`s3-uppercase-session-build`、`s4-no-prompt-id-build`、`s5-two-beta-lines-build`、`s5b-two-beta-lines-build` | 与上一轮一致 |
| 上游 4xx | `err400-build`、`err400-direct` | 400，正文原样 |
| credit | `credit-beta-0701-build/-direct`、`credit-beta-0601-build`、`credit-ssf-0701-build`、`credit-ssf-0601-build/-direct`、`credit-issued-build/-direct/-stream-build` | 全部 200；详见 §5 |
| API-key 账号 | `apikey-account-client`、`apikey-account-noncc-high` | 200；`x-api-key`、无 `authorization` |

---

## 3. 22 项出口清单逐项实测

| # | 检查项 | 实测 |
|---|---|---|
| 1 | 请求行 | **A 36/36、B 65/65 都是 `/v1/messages?beta=true`**。上一轮 N1 关闭 |
| 2 | 头集合 | 36 个 A/B 对中**没有**「只有 A / 只有 B」的头；差异只有随机 ID、`anthropic-beta`，以及被 ignore 的 `authorization`/`x-api-key`（API-key 账号设计内） |
| 3 | 头顺序 | 36 个对比**没有一处**「头顺序 A≠B」（`compare.cjs` 逐位置比较，忽略 content-length/host/connection/accept-encoding/authorization/x-api-key） |
| 4 | user-agent | 全部相同（含 `ua-sdk-build-low` 的 `… (external, sdk-ts, agent-sdk/0.2.71)`）；`ua-cli-worker-billing`/`ua-cli-entrypoint` 两侧也相同。注意：本客户端的 `cc_version` 指纹与 Worker CLI 相同（都 `2.1.304.9a4`），该场景**无法区分** `build_billing_sources=worker`，见 §10 |
| 5 | `anthropic-beta` | 公共 beta 顺序 **0 处不同**；差异只三类：客户端未发的 `mid-conversation-system-clear-at-2026-08-21`（31+ 场景，入站 0/66 全都没有）、OAuth 账号补的 `oauth-2025-04-20`、原生 builder 补的 `extended-cache-ttl-2025-04-11`。插入位置与官方 OAuth 客户端的原生顺序一致（见 §4） |
| 6 | `anthropic-version` | `2023-06-01`（全部） |
| 7 | `x-app` | `cli`（全部） |
| 8 | `x-stainless-*` | 同容器同值：os=Linux、runtime=node、runtime-version=v26.3.0、package=0.128.0、retry-count=0 |
| 9 | `x-stainless-timeout` | `600`（抽查 build/tool/subagent/compact/plain） |
| 10 | `x-claude-code-session-id` | 38 条「session 头 = metadata」断言全过；`s3` 大写 UUID → 头与 metadata 同步换成 Worker 映射的 v4 |
| 11 | `x-claude-code-prompt-id` ↔ `cc_prompt_id` | 63 条断言全过（缺省情形见 `s4`） |
| 12 | 子代理 | `request-class: subagent`、`agent-type: general-purpose`、`agent-id`/`parent-agent-id` 形状同 A；system 3 块；子代理请求两侧都没有 `extended-cache-ttl`（req-02..04），主线程 req-01/05 两侧都有 |
| 13 | 压缩 | `request-class: compaction`、`x-cc-compaction-request: manual`、`x-claude-code-compaction: manual`、system 4 块，与 A 相同 |
| 14 | 辅助请求 | `aux-nonessential` A/B 各 1 个请求，客户端未发任何旁路请求；仍无样本 |
| 15 | 非 CC build | micro/low：`[计费头, agent_sdk, 客户端]`；**high：`[计费头, official_cli_sdk, CC 静态, CC 动态+客户端 system]`**（见 §6 FAIL-3）；客户端自行带身份行时不替换/不重复；API-key 账号不补（`apikey-account-noncc-high` 的 system 只有计费头+提示词） |
| 16 | 非 CC direct | 只在原始 JSON 文本上改 `system`（加计费头块），其余键/值逐字节；无身份行 |
| 17 | body（CC build） | 键集合、键序一致；差异只有 metadata、cch、被映射 ID、附件环境值（设计）与子代理 `duration_ms` |
| 18 | body（direct） | CC 请求逐字节相同（main 1/1、tool 2/2、subagent 5/5，共 8/8）；非 CC direct 只有 `system` 一项变化；`plain-nosystem-direct` 是唯一键序变化（`system` 插在 `messages` 后，见 §8 P3-4.6） |
| 19 | `stream` 缺省 | 非 CC 客户端没发 → 出口无 `stream` 键；CC 客户端发 `true` → 出口 `true` |
| 20 | 私有头 | 65 个出口请求中 `x-ccgateway-*` / `X-CCGateway-Request-Policy` / `x-request-id` / `x-stainless-helper` **0 次** |
| 21 | 响应侧 | 本轮代理只是核心的替身，**不实现 `httpfacts` 白名单**；credit 响应里 Worker 的 `Principal/Generation/Ready` 直接出现在 `b.hdr`，生产能否剥离只能靠静态（`contracts/httpfacts/headers.go`）与 31 号链路，见 §10 |
| 22 | 错误路径 | 400 + `Content-Type: application/json` + 正文 `{"type":"error",…"probe error <>&"}` 原样；按 `KEEP` 白名单模拟，客户端可见只有 `request-id`，`x-ccgateway-error-source`、`cache-control`、`date` 等都会被核心挡掉 |

---

## 4. `results-compare.txt` 差异全集（724 行 / 604 非空行）

36 个有 A 的场景全部被比较；19 个场景 B 侧多出（全是无官方对应物的非 CC curl / credit / 4xx / API-key 账号）。

除随机值与映射值外，**只有三类差异**：

1. **头**：`x-client-request-id`、`x-claude-code-session-id`、`x-claude-code-prompt-id`、`x-claude-code-agent-id`、`x-claude-code-parent-agent-id`、`x-claude-code-prev-tool-durations`（随机/每次运行不同），以及 `anthropic-beta`。
2. **`system[0]`**：只有计费头里的 `cch` 与 `cc_prompt_id`（各场景块长度相同）。**没有任何 `system[1..n]` 差异**——身份行、CC 静态/动态提示词、cache_control 全部逐字节一致。
3. **`messages`（6 处，均为设计或每次随机）**：
   - `attach-worker`、`main-build-erase`：环境附件块——`Primary working directory` 用 Worker 的 `/t/workdir`，并按策略删掉 `Is a git repository` 等行（`build_attachment_sources`）。
   - `subagent-*`（4 处）：子代理交回正文里的 `agentId` 与 `<usage>duration_ms`（A=69/84/33ms，B=3107/2903/1052ms，长度差 2 字节）。

**没有**：body 键集合/键序差异、tools 名单/定义差异、`cache_control` 差异、头顺序差异、系统块数差异。

`anthropic-beta` 的 36 处差异按模式分：

| 模式 | 数量 | 判定 |
|---|---|---|
| 少 `mid-conversation-system-clear-at-2026-08-21`（无新增） | 31 | **客户端没发**：66 个入站请求 0 个带它；A 有是因为 A 走 unix socket 首方路径 |
| 少它，且多 `oauth-2025-04-20` | 1（`apikey-shape-opus-direct`） | OAuth 账号在 direct 下只补登录 beta，设计 |
| 少它，且多 `oauth`+`extended-cache-ttl` | 1（`apikey-shape-opus-micro`） | build 的 builder beta + 登录 beta，设计 |
| 客户端本来就没有它，多 `oauth`+`extended-cache-ttl` | 2（haiku/sonnet micro） | 同上 |
| 少 `oauth` 与它（API-key 账号过滤登录 beta） | 1（`apikey-account-client`） | API-key 路由不发送登录 beta（`request-headers.js` `apiKeyRequestHeaders`），设计 |

**插入位置（重点）**：把 B 的新增 beta 与官方 OAuth 客户端（`main-build-*` 的 A 侧）对照——
`claude-code-20250219, oauth-2025-04-20, interleaved-thinking…, …, effort, thinking-binding-controls, extended-cache-ttl-2025-04-11, cache-diagnosis-2026-04-07`。
`apikey-shape-opus-*` 的 B 正是这个顺序；haiku/sonnet 因模型表开头不同，`oauth` 落在第 1 位，`extended-cache-ttl` 始终紧挨 `cache-diagnosis` 之前。与单测 `test/request-options.test.mjs`（2026-10-24 用 31 号 Haiku/Sonnet ref 写的两条 case）逐字一致，**符合原生顺序，无缺陷**。

---

## 5. credit 专项（`fallback-credit` 不再 502）

| 场景 | 状态 | 跟踪 | 回执 |
|---|---|---|---|
| `credit-beta-0601-build` | 200 | 是 | `Principal/Generation`，无 `Ready` |
| `credit-beta-0701-build` | 200 | 是 | 同上 |
| `credit-beta-0701-direct` | 200 | 是 | 同上 |
| `credit-ssf-0701-build` | 200 | 是 | 同上 |
| `credit-ssf-0601-build` | 200 | **否** | **无 identity 头**（与 `contracts/credits/prompt.go` 只认 3 个名字一致） |
| `credit-ssf-0601-direct` | 200 | 否 | 同上 |
| `credit-issued-build` | 200 | 是 | `Ready = sha256(token)` |
| `credit-issued-direct` | 200 | 是 | `Ready = sha256(token)` |
| `credit-issued-stream-build` | 200 (`text/event-stream`) | 是 | `Ready = sha256(token)` |

- 9/9 场景 200，**没有一次 502**；上一轮 P1 的原始复现路径（只带 fallback beta、无 token）现在是 200。
- 响应头 `x-ccgateway-error-source` 在所有 credit 场景都不出现。
- 注意：`b.hdr` 是 Worker 的响应，经代理直接到达 curl；生产核心会按白名单剥掉 `Principal/Generation/Ready`（静态），离线**没有**验证这一层。
- `credit-beta-0701-build` 的入站抓包缺失（`in/` 未生成），属打点竞态，不影响断言。

---

## 6. 四条 FAIL 逐条判定

### FAIL-1 `apikey-account-client` 「API-key 账号不补身份行」——**断言写错**

- 断言 `ok(la && !lb)`：期望官方 A 有、API-key 账号 B 没有。
- 实测 A 与 B 都是 `You are a Claude agent, built on Anthropic's Claude Agent SDK.`，且 **B 的入站 `in-01.json` 第 2 个 system 块就是这句**（客户端自带），B 的 4 个 system 块与入站逐块相同（只有计费头 cch/prompt_id 变）。
- 设计如此：`build` 只对「没有身份行」的非 CC 请求补；客户端自己的行从不替换、不重复（`request-build.js:169-204` `identityRequest`/`applyIdentityLine`）。「API-key 账号不补身份行」的正确证据是 `apikey-account-noncc-high`：B 的 system = `[计费头, 提示词…]`，没有身份行。
- 证据：`results/evidence/apikey-account-client/{in,b}`、`results/evidence/apikey-account-noncc-high/b`。
- **建议**：把断言改为「B 不新增：行数与位置与入站一致；非 CC 场景（apikey-account-noncc-high）没有身份行」。

### FAIL-2 `apikey-shape-opus-direct` / `apikey-shape-opus-micro` 「beta 无缺失」——**客户端没发 + 断言错**

- 缺的是 `mid-conversation-system-clear-at-2026-08-21`；**66 个入站请求 0 个带它**（含这两个场景的 `in-01.json`）。A 有它，是因为 A 走 `ANTHROPIC_UNIX_SOCKET` 首方路径；B 走自定义 base URL，客户端自己不发。
- **不是 Worker 丢的，也不是 CLI 丢的**：CLI 只写「客户端 betas + builder/登录新增」，不会凭空造客户端的模型 beta。
- B 新增的 `oauth-2025-04-20` / `extended-cache-ttl-2025-04-11` 位置见 §4，符合原生顺序（账号是 OAuth）。
- 证据：`results/evidence/apikey-shape-opus-{direct,micro}/in`、`.../a`、`.../b`。
- **建议**：该断言应以入站为基准（或把首方路径才出现的 beta 列入白名单），不要与 A 直接比集合。

### FAIL-3 `plain-build-high` 「非 CC 补 OAuth 兜底身份行（agent_sdk）」——**断言写错（设计如此）**

- 实际 `system[1]` = `You are Claude Code, Anthropic's official CLI for Claude, running within the Claude Agent SDK.`，即 `official_cli_sdk`（`ke`），不是 `agent_sdk`（`De`）。
- 原因：high 注入会把客户端 system 当作 CC 的 `--append-system-prompt`（`layers.appended=true`），`identityLineFor` 因此选 `official_cli_sdk`——这正是 2.1.304 `n1n(isNonInteractive=true, hasAppendSystemPrompt=true)` 的选择，也是 `CC-REQUEST-LEVELS-DESIGN.md:67` 写明的行为；`request-policy.js:30-36` 自 v20 起没变，v23/v25/v26 同一条路径（v25 `finishBuilt` 同样传 `{appended}`，`applyBuildCliPrefix` 写入同一句）。
- low/micro 不注入提示词 → `appended=false` → `agent_sdk`，因此那两条通过；high 通过不了只因为断言把三档写死成 `agent_sdk`。
- 位置：`next/plugins/ccgateway/companions/cli-mods/request-build.js:169-183`（`identityRequest`）、`request-policy.js:30-36`、`patch-cli-2.1.304.cjs:246`（PAs 捕获）。**结论：不是 v26 回归。**
- 证据：`results/evidence/plain-build-high/b`（4 块：计费头 / `official_cli_sdk` / CC 静态 / CC 动态+`Answer concisely.`）、`plain-build-low/b`、`plain-build-micro/b`。
- **建议**：断言按等级期待（micro/low → `agent_sdk`；high → `official_cli_sdk`），或接受三句之一。

（第 4 个 FAIL 即 FAIL-2 的第二个场景，合计 4。）

---

## 7. 与上一轮问题对照

| 上一轮项 | 本轮状态 |
|---|---|
| N1 出口无 `?beta=true`（P2） | **已修**：A 36/36、B 65/65 |
| v25 beta 顺序（A2/A5/R2） | **已验证**：公共 beta 顺序 0 处不同；新增 beta 落在原生槽位 |
| v26 身份行交回原生 | **已验证**：CC 请求身份行与 A 逐字节相同；非 CC low/micro 仍 `agent_sdk`；high 的 `official_cli_sdk` 是设计 |
| v26 工具定义交回原生（P3-5 的 wire 部分） | **已验证**：308 条逐字节断言通过，客户端 `strict`/`cache_control` 不被增删；同名工具保留客户端定义（`plain-tools-high`：`Edit,Read,Write,Bash,MyTool`，`Bash` 是客户端那份） |
| P1 fallback-credit 502 | **已修**（0.1.88）：9/9 200，回执完整 |
| P2-1 tracked 整段缓冲 / 32 MiB | **未测**（本轮无长流、无 >32 MiB、无计时样本） |
| P2-2 credit 授权锁持整请求 | **未测**（无并发 tracked / 上传混合场景） |
| P2-3 资源输出（containers）502 | **未测**（无 container/resource outputs 请求） |
| P2-4 事实文档过期（REQUEST-MODES/REQUEST-HEADERS/LEVELS） | **仍在**（静态，未改代码） |
| P2-5 两份 SSE 解析实现 / beta 兜底无测试 | **仍在**（本轮未构造注释行/CRLF/无尾空行） |
| `account_uuid`（登录态客户端） | 部分：`login-account` 只有 B 侧；B 把 `account_uuid` 映射成 Worker 账号 UUID（设计） |
| S4「计费头无 `cc_prompt_id` 时头≠计费头」 | **仍在**（已知边界）：`s4` B 计费头无 `cc_prompt_id`，`x-claude-code-prompt-id` 是映射值 |
| 第 4 个 fallback beta `server-side-fallback-2026-06-01` 不跟踪 | **仍在**（设计/文档待统一，见 §8 P3-2） |
| TLS/h2/头大小写（传输层） | 不在离线范围（离线为明文 HTTP + 同容器） |

---

## 8. 新问题（本轮）

### P1

无。

### P2

无新增。上一轮 P2-1/P2-2/P2-3 仍**未验证**（本轮没有构造对应流量），不能因为「本轮全绿」而关闭。

### P3

**P3-1 [测试脚本] `verify.cjs` 三条断言预期写错（造成 4 条 FAIL）**

- `verify.cjs:72`：`apikey-account-client` 期望 B 无身份行；实际是客户端自带、B 原样保留 → 应比「B 未新增」，并用 `apikey-account-noncc-high` 验证「API-key 账号不补」。
- `verify.cjs:79`：`plain-build-high` 写死 `agent_sdk`；high 注入提示词时有追加提示词，native 选 `official_cli_sdk`。
- `verify.cjs`（beta 段）：`apikey-shape-*` 的「无缺失」以 A 为基准；应以入站为基准（或白名单首方路径独有的 beta）。
- 证据：`results/results-verify.txt` 第 32、101、135、597 行；建议连同场景说明一起修脚本，不必改产品。

**P3-2 [出口/文档] API-key 形状客户端经 OAuth 账号时，build 会补 `extended-cache-ttl-2025-04-11`，但 body 的 `cache_control` 仍是 5m（无 `ttl:1h`）**

- `apikey-shape-{haiku,sonnet,opus}-micro`：A（API-key 直连）无该 beta、`cache_control=5m`；B 有该 beta、标记仍 5m。
- 来源：v26 build 的 `built.betas`（native 请求构建器的 beta 列表）+ 登录 beta；`request-build.js:310`。官方 OAuth 客户端只在真的用 1h 缓存时发它。
- 影响：上游接受，无害；但「beta 与 body 语义不一致」值得记录或改为按需添加。属场景差异，不是回归（v25 同）。
- 证据：`results/evidence/apikey-shape-*/a|b`。

**P3-3 [质量] 两处 400 错误信封不一致**

- `s1-missing-result-build`：`{"type":"error","error":{"type":"invalid_request_error","code":"cli_invalid_request","message":…}}`（标准顺序，含 code）。
- `s2-unsafe-number-build`：`{"error":{"message":…,"type":"invalid_request_error"},"type":"error"}`（键序反转、无 code）。
- 后者来自 Worker Go：`next/plugins/ccgateway/companions/engine/request_components.go:365` 的 `fmt.Errorf` → 通用错误序列化；前者来自 CLI 帧。建议统一为 API 的标准信封（type 在前、补 code），便于客户端按官方错误模型解析。

**P3-4 [覆盖] 本轮未覆盖 / 证据不足（不影响结论，但不能算已验证）**

1. `login-account` 的 A 侧无请求（客户端 exit=1，未发出）；`baseline/10-login-account.json` 因此为空并已删除。登录态客户端的 A/B 对照缺失。
2. `credit-beta-0701-build` 的入站抓包缺失（`in/` 未生成）。
3. 响应侧核心白名单只用 `KEEP` 模拟；credit 的 `Principal/Generation/Ready` 到达客户端与否、核心 `X-Request-Id` 与 Worker `Request-Id` 的取舍，需 31 号生产链路确认。
4. `build_billing_sources=worker` 在本客户端上不可区分（官方客户端与 Worker CLI 的 `cc_version` 指纹同为 `2.1.304.9a4`、入口同为 `sdk-cli`）；本轮只能证明 200 与字段形状，不能证明替换发生过。
5. P2-1/P2-2/P2-3 对应的长流、并发、资源输出均未构造。
6. 非 CC direct 在**没有 system** 时按 `direct-billing.js` 的 `insertSystem` 把 `system` 插到 `messages` 之后（键序 `model,max_tokens,messages,system`）；这是代码写明的「CC 发送位置」，上游接受，仅记录。

---

## 9. 结果与证据文件

- `artifacts/claude-2.1.304/e2e/wf-r2-2026-10-24/results/results-compare.txt`（604 行，§4 的全部差异）
- `.../results/results-verify.txt`（992/996，含 4 条 FAIL 原文）
- `.../results/all.out`（55 场景的客户端输出/状态、抓包计数、`EXIT=0`）
- `.../results/calib1.out`、`calib2.out`（两次校准，10 请求 0 差异）
- `.../results/evidence/`（29 个文件，1.1 MB）：`apikey-account-client/{in,b}`、`apikey-account-noncc-high/{in,b}`、`apikey-shape-{opus-direct,opus-micro}/{a,in,b}`、`apikey-shape-{haiku,sonnet}-micro/{a,b}`、`plain-build-{low,micro,high}/b`、`plain-build-high/in`、`plain-nosystem-direct/b`、`main-build-low/{a,b}`、`main-build-low-stream/b`、`main-direct/{a,b}`、`credit-*/b.hdr`、`err400-build/client.{hdr,body}`。用于 4 条 FAIL 与 §4/§5 的复核。
- `.../baseline/`（9 个文件，16 个请求，§0 的格式）。

---

## 10. 清理与局限

- 服务器 `/tmp/ccg-audit-wf-r2`（含容器写入的 `cap/`、`logs/`、`data-*`、`acct*` 等）已删除；删除前确认本报告所需结果、基线与 29 个证据文件都已拷回本地。**没有**创建或恢复 `/tmp/ccg-audit-wf-baseline`。
- `docker ps -a` 过滤 `ccgateway-app:0.1.90`：本审核**没有**留下任何容器。另有一个同时运行中的 `clever_blackwell`（挂载 `/tmp/ccg-audit-sub/work`，属另一条工作流）与 `ccg-controller`，均未触碰；运行中的 `ccg-*` 生产容器（0.1.66/0.1.67/0.1.70）同样未触碰。
- `/tmp` 下仍存在的 `ccg-audit-sub`、`ccg-boundary-*`、`ccg-dispatch-audit-*`、`ccg-tlslab-*` 等目录不属于本轮，未删除。
- 局限：离线用代理替身模拟核心，因此响应侧白名单、隧道、缓存失效等核心行为不在本轮证据内；传输层（TLS/h2/头大小写）本来就无法一致；`aux-nonessential` 仍无旁路请求样本。
