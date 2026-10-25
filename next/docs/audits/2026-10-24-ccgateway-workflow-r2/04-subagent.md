# 子代理与嵌套子代理：实现审核 + 离线/生产实测（2026-10-25）

审核对象：线上核心 0.1.186（四节点，管理 API `http://127.0.0.1:3130/api/v1`）、ccgateway 插件 0.1.90、镜像 `ccgateway-app:0.1.90`、CLI 2.1.304 补丁 `ccgateway-v26-native-assembly`（ELF sha `0d6149e0…`）。分支 `feat/next-platform` HEAD。

问题（用户原话）：「关于子代理、子代理的子代理，我们的处理方式现在——我们的定制版 CC 和原生 CC 发送是一样的了吗？是如何实现的？」

---

## 0. 结论

**是，CC 子代理与嵌套子代理的出口请求与官方直连一致。** Worker/CLI 不自己拼请求头：它把客户端的 `request-class`/`agent-type`/`agent-id`/`parent-agent-id`/`prompt-id`（以及循环状态四类头）原值交给 CC 原生代码，由原生 `sF`（头）、`kLo`（计费头）、`zbe2`（缓存时长与 1 小时 beta）生成；system、工具、messages、metadata 由原生构建器按子代理上下文重建，ID 只映射 prompt/session。

离线对拍（真实 2.1.304 客户端 → Worker → v26 CLI → 假上游，build 与 direct，一/二/三层嵌套 + 后台通知续轮 + fork + 伪造头）：请求数、头集合与顺序、头值、body（键序/键集/值）、system 块数与文本、计费头每个字段、beta 与元数据与官方一致，只剩两类**已记录**差异（客户端对自定义 base URL 自己不发 `mid-conversation-system-clear-at-2026-08-21`；build 按设计映射 `metadata.user_id` 与 prompt-id）。

生产（31 号真实 OAuth 账号 + 真实上游）主→子→孙 6 个请求全部 200；把同日录到的入站请求在 31 号容器内用同镜像 v26 CLI 回放到假上游，出口与入站逐字段一致（含 `parent-agent-id` = 上层 `agent-id`、`cc_is_subagent=true`、`cch`、`cc_prev_req`、`task_notification` 续轮）。

未覆盖/有风险：CLI 侧对其余 request-class（`workflow`、`teammate`、`auxiliary`）只做了代码级处理，没有实测样本；非 CC 请求伪造子代理头会被**接受**并按其头构建（设计如此，但可被用来伪造 `cc_is_subagent`）。

---

## 1. 识别：Worker/CLI 怎么判断一个请求是子代理、属于第几层

### 1.1 头从客户端到 CLI 的路径

| 环节 | 位置 | 行为 |
|---|---|---|
| 核心 | `next/server/internal/gateway/pipeline.go:638` `passHeaders` | 只把清单 `passHeaders` 里列出的头交给插件，键名小写 |
| 清单 | `next/plugins/ccgateway/manifest.json:81-95`（OAuth）、`:140-154`（apikey） | 两张表相同：`anthropic-version`、`anthropic-beta`、`x-claude-code-request-class`、`-agent-id`、`-parent-agent-id`、`-agent-type`、`-prompt-id`、`-prev-tool-durations`、`x-cc-compaction-request`、`x-claude-code-compaction`、`x-cc-context-compacted`、`x-claude-code-context-compacted`、`user-agent` |
| 插件 | `next/plugins/ccgateway/internal/ccgateway/ccgateway.go:114` `headers`、`:124`、`:139` | 表来自 `contracts/features/agent_context.go:43`（`AgentContextHeaders`）+ `:65`（`ClientUserAgent`）；每个值按正则校验，形状不对的**丢弃**而不是转发 |
| Worker | `next/plugins/ccgateway/companions/engine/request_agent.go:39` `readClientAgentHeaders` | 同一张表（`features.AgentContextHeaders`），得到 `{request_class, agent_id, …}`；`user_agent` 只在 CLI 声明 `client_user_agent_v1` 时带上 |
| Worker | 同上 `:64` `resolveRequestAgent` | 组 `CCG_REQUEST_AGENT {version:1, map, key, client}`；`key` = 账号映射密钥按客户端 session 派生（`identityDigest(key,"agent-context",S)`）；`map` 仅在 build + OAuth 为 true |
| CLI | `companions/cli-mods/request-agent.js:42` `readRequestAgent` | 逐字段再校验一遍（同一套正则，`request-agent.js:19-40`），非法直接抛 `Invalid Worker agent context` |

**关键点**：核心只转 `passHeaders` 里列出的头，缺任何一项该头就到不了 Worker。0.1.77 起两张账号类型都列全；`TestManifestPassesTheForwardedHeaders` 守着这条不变式（见 `SUBAGENT-REQUEST-CONTEXT-DESIGN.md` §14）。`x-claude-code-session-id` **不在清单里**：即使客户端发了也不转，session 一律由 body `metadata.user_id.session_id` 派生（build 映射、direct 原值），出口 `x-claude-code-session-id` 与出口 metadata 相等。

### 1.2 类别与层级的判定

```js
// companions/cli-mods/request-agent.js:84
const requestClass = client.request_class ?? (claudeCode && billing.cc_is_subagent === 'true' ? 'subagent' : 'main');
```

- **优先级**：客户端头 `x-claude-code-request-class` 最高；没有该头时看 body 首块计费头的 `cc_is_subagent=true`；两者都没有 → `main`（2026-10-23 起，非 CC 请求按主线程构建，不再按子代理）。
- `claudeCode` = 首块以原生计费头前缀开头（`oJe`，`request-agent.js:83`；由 `agentNative.requestBilling` 提供，`request-natives.js:48`）。
- **「第几层」不单独判断**，也没有深度字段。层级完全由客户端头携带的关系表达：
  - 一级子代理：`request-class=subagent`、有 `agent-id`、**没有** `parent-agent-id`；
  - 嵌套（孙）子代理：多一个 `parent-agent-id`，其值 = 发起者（上一层）的 `agent-id`；
  - 三层同理：`parent-agent-id` = 第二层 `agent-id`。
  - prompt-id 各级共用（父线程的 prompt 传播到所有后代）。
- **不要用 `metadata.user_id.session_id` 判层级**：同一会话里主线程和所有层级子代理的 session 相同（实测确认）。
- **system 结构不参与识别**：不数 system 块、不看身份行/提示词特征；只看客户端头与计费头。system 块数（3 块、fork 4 块）是客户端内容的结果，被测对象而不是判据。
- `agent-type`：内置代理为类型名（如 `general-purpose`、`Explore`、`fork`），自定义/缺失为 `custom`（`request-agent.js:104` 用原生 `Zoe(类型, 是否内置)` 得到 `agent:builtin:<类型>` / `agent:custom`）。

---

## 2. 组装：build 与 direct 各自怎么交给原生代码

### 2.1 build（默认）

链路：`request-command.js:133` `prepareOutgoing` → `:212` `prepareBuild` → `request-build.js:211` `buildRequest` → 原生构建器 `jOt`（补丁后 `patch-cli-2.1.304.cjs:223` 让它 `yield {type:"ccgateway_request", body:uXn(...)}` 而不发送）→ `finishBuilt`（`request-build.js:292`）→ `openClient`（`request-command.js:225`，原生 `sF`）→ 原生 create（`model-request.js:91`）。

| 元素 | 来源 | 代码 |
|---|---|---|
| `querySource` | 子代理：内置类型 → `agent:builtin:<类型>`，否则 `agent:custom`；主线程 `sdk`；压缩 `compact`；其他 explicitClass | `request-agent.js:104,109`；`request-build.js:262`；`request-command.js:226` |
| `agentContext` | `{agentType:'subagent', agentId, parentAgentId?, parentPromptId, invocationKind:'spawn'}`；主线程 `Al()` | `request-agent.js:105`；`request-build.js:262`；`request-command.js:228` |
| `promptId` | 客户端头 prompt-id → 计费头 `cc_prompt_id` → 派生；`map` 时 HMAC 成 v4 UUID | `request-agent.js:85-88` |
| 请求头（request-class / agent-type / agent-id / parent-agent-id / prompt-id / session-id） | **原生 `sF` 按上面四项生成**，本仓库不写头 | `patch-cli:230-235`；`request-command.js:225-229` |
| 计费头 `cc_is_subagent` / `cc_prompt_id` / turn 字段 | **原生 `kLo`**（`PAs` 生成），`captureBilling` 回调把整行捕获 | `patch-cli:222,246`；`request-build.js:301` |
| 系统提示词、工具、messages、thinking 等 | **原生构建器**（`jOt`）按 `agentContext` 走子代理分支；客户端内容原样喂入（`ccgatewaySystemBlocks` / `ccgatewayWireMessages` / `ccgatewayWireTools`） | `patch-cli:205,215-217`；`request-build.js:262` 起 |
| 缓存时长与 `extended-cache-ttl` beta | 原生 `zbe2` 按 `querySource` 决定新增什么（子代理按 5 分钟规则不会新增该项）；客户端自己带的 beta 原值保留 | 实测；`CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY.md` §11 |
| 身份行 | 子代理沿用客户端 system（已带子代理提示词 + T7t 三段）；`identityRequest` 对带计费头的请求判为 `own`，`recorded=null`，不改 | `request-build.js:169-186` |
| 注入层 | 带计费头（CC 请求）→ `layers=null`，不注入 | `request-build.js:238` |
| metadata | `applyBuildMetadata`：按 Worker 身份上下文改写 `user_id`（session/device 映射） | `request-identity.js:72` |
| 循环状态头（`prev-tool-durations`、四个压缩头） | 原值透传 | `request-agent.js:37-40,91-92`；`request-command.js:146` |
| User-Agent | 保留客户端原 UA（当计费头 `cc_version`+`cc_entrypoint` 未改） | `request-agent.js:115-128`；`patch-cli:240` |

### 2.2 direct

`request-command.js:198` `prepareDirect` → `direct-billing.js`：body **逐字节**转发（改写在原始 JSON 文本上，只动 system 的计费头），请求头由原生 `sF` 用同一份 `agentContext`/`promptId` 生成（`:225-229`），prompt-id 用客户端原值（`map=false`）。计费头缺则按原生 `kLo` 补（`request-natives.js:33`，`nativeBilling` 带 `agentContext`/`promptId`/turn），`cch=00000` 是已知边界（仅非 CC）。

### 2.3 由原生决定、我们不碰的部分

请求头的**顺序**、`x-app`、`x-stainless-*`、`anthropic-dangerous-direct-browser-access`、`accept`/`accept-encoding`、`x-stainless-timeout=600`、beta 顺序（`betaOrder` 读原生 `S8n` + 构建器 `uXn` 的 push 列表，`request-betas.js` 由补丁填充）。

---

## 3. 一致性结论（按字段）

### 3.1 与官方直连一致（有实测证据）

| 字段 | build | direct | 证据 |
|---|---|---|---|
| 请求行 `POST /v1/messages?beta=true` | 一致 | 一致 | `verify-sub.cjs` 726/726 断言全过（含每条请求的行检查） |
| 头集合与顺序 | 一致 | 一致 | 离线 A/B 深比较 0 差异（掩码项之外） |
| `x-claude-code-request-class` / `-agent-type` / `-agent-id` / `-parent-agent-id` | 与客户端**逐值**相同（含嵌套） | 同 | `verify-sub.cjs`「出口 = 客户端原值（逐值）」；生产比较 0 failures |
| `x-claude-code-prompt-id` | 映射值，但与计费头 `cc_prompt_id` 相等 | 客户端原值 | 同上 |
| 计费头字段集（`cc_is_subagent`、`cc_prev_req`、`cc_turn_*`、`cch`、`cc_entrypoint`） | 与官方逐字段相同（`cc_version` 指纹按内容不同） | 同 | 深比较 + 生产比较 |
| 子代理无 `cc_turn_*` | 一致 | 一致 | 断言 |
| system 块数 3（fork 4） | 一致 | 一致 | 断言（`fork` 分支单独给 4） |
| system 文本与 cache_control | 逐字一致（除映射 ID） | 逐字节一致 | 深比较 0 差异 |
| beta 集合与顺序（子代理是否带 `extended-cache-ttl` 随客户端/场景变化，两侧一致） | 一致 | 一致 | 深比较（仅客户端侧那条 `mid-conversation-system-clear` 例外）；本轮所有子代理两侧均无该 beta，上一轮 r2 曾观察 LEVEL1 第二轮两侧都有——网关不自行增删 |
| tools（名单/顺序/定义/键序） | 逐字节保留 | 逐字节保留 | `工具 X 逐字节保留` 全过 |
| messages | 逐字一致 | 逐字节一致 | 深比较 |
| 后台通知续轮 `cc_turn_origin=task_notification` | 一致（原值保留） | 一致 | `sa-bg-*` 两侧 4+4 请求形状相同 |

### 3.2 有差异（原因、是否客户端侧）

| 差异 | build | direct | 归因 | 是否客户端侧 |
|---|---|---|---|---|
| `metadata.user_id` 的值（device/session 映射、`account_uuid` 填账号） | 差异 | 原值 | 设计；`request-identity.js:72`、`request-identity.go:295` | 否（设计） |
| `cc_prompt_id` / `x-claude-code-prompt-id` 值 | 映射值 | 原值 | 设计（保持官方的等值关系） | 否（设计） |
| `anthropic-beta` 少 `mid-conversation-system-clear-at-2026-08-21` | 差异 | 差异 | 客户端对非 Anthropic base URL 自己不发（入站就没有） | **是** |
| `cch` 值（非 CC 请求 `00000`） | 差异 | 差异 | 已知边界，只有网关自己补计费头时出现 | 否（已知） |

### 3.3 仍未覆盖或有风险

1. **`workflow` / `teammate` / `auxiliary` 类**：`request-agent.js:95-110` 有分支（`workflow` 走子代理上下文并显式传 `requestClass:'workflow'`；其他值显式传 class），单测覆盖（`test/request-agent.test.mjs:95-98`），但**没有实测样本**——本次客户端在 `-p` + 禁非必要流量下不产生这些请求。
2. **fork 子代理**：实测通过（`sa-fork-build`/`-direct`，两侧均为 `subagent`/`fork`、system 4 块、无 parent），但 fork 的 system 是父会话提示词、命中缓存，目前只验了形状，没有逐块对比缓存标记的语义。
3. **后台代理并发顺序**：B 侧请求顺序与 A 不同（子代理与父线程交错），不影响内容；但这意味着**任何按到达顺序配对的对拍都会误报**（本次第一版就误报了 225 处）。
4. **非 CC 请求伪造子代理头**：`noncc-forged-build`/`-direct` 都**接受**了 `request-class: subagent`、`agent-type: general-purpose`、伪造的 `agent-id`/`parent-agent-id`，出口原样保留并补 `cc_is_subagent=true`。这不违反当前设计（头是客户端的数据），但意味着计费头的子代理标记可以被任意 API 调用方伪造。
5. **`child` 深度上限**：没有深度校验，也不应该有（客户端决定）；但客户端若发错（grandchild 的 parent 不是同侧已知 agent），网关不会纠正，只会原样转发。
6. **`request-class` 缺失但计费头 `cc_is_subagent=true`**：走 subagent 分支，`agent-id` 由首条提示派生（非客户端值）——这种请求的出口 agent-id 与正文里的 `agentId`（若有）会不一致。真实 CC 不会这样发。

---

## 4. 实测结果

### 4.1 docker 离线对拍（真实 CC → 代理 → Worker → v26 CLI → 假上游）

环境：ovh 一次性容器 `docker run --rm --network none --user 1000:1000 -v /tmp/ccg-audit-sub/work:/t ccgateway-app:0.1.90`。A 侧官方 2.1.304 直连假上游（TLS unix socket），B 侧同一客户端经 `proxy.cjs`（模拟核心，补策略头）→ Worker 8787 → CLI v26 → 同一假上游。两侧都设 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`。脚本在本地 `artifacts/claude-2.1.304/e2e/subagent-2026-10-25/`（`run.sh`、`docker.sh`、`fake-upstream.cjs`、`proxy.cjs`、`deepcompare.cjs`、`verify-sub.cjs`）。

**校准**：同一配置跑两遍（`cal1` / `cal2`，4 个场景各 A/B 共 42 个请求对），掩码随机值后 **0 处差异**。

**场景与请求数**（A=B，全部 exit=0）：

| 场景 | build | direct | 请求/侧 | 形状（两侧相同） |
|---|---|---|---|---|
| 主 → 子代理 | ✓ | ✓ | 3 | main×2 + subagent(general-purpose, root)×1 |
| 主 → 子 → 孙 | ✓ | ✓ | 5 | main×2 + L1 root×2 + L2(parent=L1)×1 |
| 三层嵌套 | ✓ | ✓ | 7 | main×2 + L1 root×2 + L2 parent=L1 ×2 + L3 parent=L2 ×1 |
| 后台代理 + 通知续轮 | ✓ | ✓ | 4 | main(sdk)×2 + subagent×1 + main(task_notification)×1 |
| fork 子代理 | ✓ | ✓ | 4 | main(sdk)×2 + subagent(fork, 4 块)×1 + main(task_notification)×1 |

**深比较**（46 个请求对，`deepcompare.cjs ./cap --within`）：只报 4 处，全部是 `noncc-forged-*` 的「B 侧多出 1」（这类场景按设计没有 A 侧）。**其余 44 个请求对 0 差异。**

**子代理专项断言**（`verify-sub.cjs`）：**726/726 通过**，包括：每条请求 `?beta=true`；出口无 `x-ccgateway-*`；`prompt-id` 头 = 计费头 `cc_prompt_id`；`session` 头 = metadata；request-class/agent-type/agent-id/parent-agent-id/prev-tool-durations **出口 = 客户端原值（逐值）**；子代理必有 agent-id + agent-type + `cc_is_subagent=true` + 无 turn 字段；本轮两侧子代理 beta 均无 `extended-cache-ttl`；system 3 块（fork 4）；嵌套 parent 必是同一侧已出现的 agent-id；同一 agent 各轮 prompt-id 相同；全部子代理同一 prompt-id；客户端工具定义逐字节保留。

### 4.2 31 号真实链路（真实上游）

前置核对：`GET /accounts?group_id=6` → `21/32/33 disabled`、**只有 31 `active`/`schedulable`**，未改动任何账号。

- 临时 Key（`ccg-audit-sub-20261025`，组 6，id 88）写入 0600 文件、未打印；测后 `DELETE /me/api-keys/88`。
- 31 号请求日志：`summary` → `full`（1 小时）→ 测后恢复 `summary` + `clear_full`。
- 场景：官方 ELF 指向 `http://127.0.0.1:3130`，`haiku-4-5`，「用 Agent 起子代理，再让它起孙代理」，**真实上游 6 个请求全部 200**，客户端 `is_error: false`。
- 入站记录（`/work/data/request-logs/<id>/`，full 级别）：6 个请求 = 主线程 2 + 子代理 L1 2（其中一次是 L1 的第 2 轮，带 tool_result）+ 孙代理 1（`parent` = L1 的 agent-id）+ 通知续轮 1（`cc_turn_origin=task_notification`）。`events.jsonl` 里 `request_agent` 显示 `client_headers` 含 `agent_id, agent_type, prev_tool_durations, prompt_id, request_class, user_agent`，`map=true`、`keyed=true`。
- 出口取证：生产不记 Worker→上游报文，故把录到的入站 `request-headers.json` + `build-components.json` 在 31 号容器内用**同镜像 v26 CLI** 回放到 unix socket 假上游（31 号容器回环 TCP 被出口拦截，只能用 unix socket；账号目录为一次性假令牌，未用 31 号真实登录）。
- 结果（`compare-prod.cjs`）：**0 failures**，逐请求 12 项断言全过 —— request-class / agent-type / agent-id / parent-agent-id 原值；计费头 `cc_is_subagent` / `cc_prev_req` / `cc_turn_origin` / `cc_prompt_index` / `cc_turn_index` / `cc_entrypoint` 与入站一致；`cch` 原样；出口 prompt-id = 计费头；**body 除掩码项（metadata、`cc_version` 指纹）外完全一致**；嵌套 `parent` = 上层 `agent-id`；所有子代理同一 prompt-id；请求行 `?beta=true`；子代理无 `extended-cache-ttl`；主线程有 `extended-cache-ttl`；`session` 头 = metadata。

---

## 5. 问题清单

### P1

无。

### P2

**P2-1 [观测] 生产链路无法直接看到 Worker→上游的出口报文。** 出口只能靠「录入站 + 容器内回放」重建；回放使用的映射密钥是一次性的，ID 值与生产不同（形状与关系相同）。`engine/request_log_viewer.go` 的 `logFileKind` 里 `upstream*` 只属于已删除的 legacy relay。这是本类审核的**唯一系统性取证障碍**，也是上一轮（`02-prod31.md` §5）已记录的同一条。建议在完整级别下增加「出口报文（脱敏）」或至少「出口头集合 + 计费头」记录。

**P2-2 [风险] 非 CC 请求可以任意伪造子代理身份。**（2026-10-25 已处理：CLI v28 起非 CC 请求一律按主线程构建，客户端的上下文头不用。） `noncc-forged-build` / `noncc-forged-direct` 实测：不带计费头的普通 Messages 请求，只要自己发 `x-claude-code-request-class: subagent`、`agent-type: general-purpose`、`agent-id`、`parent-agent-id`，出口就带着这些值、并补 `cc_is_subagent=true` 的计费头。当前设计把请求头当客户端的数据（`SUBAGENT-REQUEST-CONTEXT-DESIGN.md` §1），而这会让上游把调用方标注成「Claude Code 子代理」。是否需要约束（例如非 CC 请求忽略客户端伪造的 agent 头）取决于产品判断；至少应在文档里明确这是可伪造的。

### P3

**P3-1 [测试] `workflow`/`teammate`/`auxiliary` 只有单测，没有端到端样本。** `test/request-agent.test.mjs:95-98` 只断言 `explicitClass`/`querySource`/`agentContext` 三个字段，没有真实客户端请求。`CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY.md:146` 说 `workflow` 由 `workflowRunId` 决定，而我们的 CLI 只传 `requestClass`——两者是否等价未经实测。

**P3-2 [测试] fork 子代理只验形状，未验缓存标记语义。** fork 的 system 是父会话提示词（`ASSEMBLY` §4），`cache_control` 的 ttl/scope 是否与官方一致只做了块数与文本比较之外的深比较（本次深比较 0 差异，但样本只 1 个场景 2 个模式）。

**P3-3 [质量] 后台子代理使「按到达顺序配对」的对拍失效。** 本次第一版 `deepcompare` 因顺序配对报了 225 处假差异，改为按请求种类分组后才 0 差异。这类脚本（含上一轮 `wf-2026-10-24/compare.cjs`）在后台代理场景下会误报，建议后续对拍工具都按种类匹配。

**P3-4 [文档] 设计文档与实现有出入。** `SUBAGENT-REQUEST-CONTEXT-DESIGN.md` §2 的表仍写「非 CC 请求 → `agent:custom`」，但文首已注明被注入等级设计取代（现在非 CC 按主线程构建）；§10 的端到端表也还没把 v26 的 `?beta=true` 修复写进去。`REQUEST-MODES.md` 与 `BUILD-REQUEST-COMPONENTS-DESIGN.md` 仍写「发出 `stream:false`」，实际不发（上一轮已记录，仍未改）。

**P3-5 [已知边界] 非 CC 请求计费头 `cch=00000`。** 官方运行时是 5 位 hex；网关自己生成计费头时只能 `00000`。与子代理无关，但同一计费头链路上。

### 已确认无问题（明确记录）

- 头的**名称、顺序、值**；`user-agent`（含 `agent-sdk/…` 限定段）；`x-app`；`x-stainless-*`（timeout 600）；`accept`/`accept-encoding`；`anthropic-version`；`anthropic-dangerous-direct-browser-access`；
- body 的键集、**键序**、每个值；`system` 块数/文本/`cache_control`（含 `ttl:1h`、`scope:global`）；`messages`；`tools`（含子代理少 `ScheduleWakeup`/`Workflow`、fork 的 4 块 system）；`thinking`；`context_management`；`output_config`；`diagnostics`；`stream` 缺省；
- 跨请求关系：同一 agent 各轮 agent-id 相同；嵌套 parent = 上层 agent-id；所有子代理同 prompt-id；prompt-id 头 = 计费头 `cc_prompt_id`；session 头 = metadata；`map=true` 时 prompt/session 按账号派生且会话内稳定；
- 后台通知续轮（`cc_turn_origin=task_notification`，`cc_prompt_index=0`、`cc_turn_index=2`）在两侧逐字段相同；
- 请求行 `?beta=true`（v24/v26 已修，direct 与 build 两条路径都验过）。

---

## 6. 清理确认

- 一次性容器：`docker run --rm`（`ccgateway-app:0.1.90`）已自行退出；`docker ps -a | grep ccg-audit` → **无**。
- 主机目录 `/tmp/ccg-audit-sub`（含 `work/` 的 `cap/`、`cal1/`、`cal2/`、`prod/`、证书、日志）—— 见下方「清理执行」。
- 31 号容器内 `/tmp/ccg-audit-sub31`（回放脚本、录制副本、一次性账号目录、假上游、证书）：**已 `rm -rf`**。
- 测试 Key `ccg-audit-sub-20261025`（id 88）：**已删除**，`GET /me/api-keys` 无 `ccg-audit-sub` 残留。
- 31 号请求日志：`level=summary`、`full_until=null`，`clear_full` 已执行（`full_bytes` 归零）。
- 账号状态：21/32/33 `disabled`、31 `active`/`schedulable`，与测试前相同；未重启、未修改任何运行中的生产容器。
- 仓库：未改源码、未提交；新增脚本只在本地 `artifacts/claude-2.1.304/e2e/subagent-2026-10-25/`（不进 git）。
- 本地报告：本文件。

---

## 附：关键代码位置速查

| 主题 | 位置 |
|---|---|
| 类别/层级判定 | `companions/cli-mods/request-agent.js:79-113`（`:84` 判定，`:95` 子代理分支，`:104-107` querySource/agentContext/explicitClass） |
| Worker 上下文 | `companions/engine/request_agent.go:39,64,82` |
| 头契约表 | `companions/contracts/features/agent_context.go:11,43,65` |
| 插件转发 + 校验 | `internal/ccgateway/ccgateway.go:114-139` |
| 核心转发清单 | `manifest.json:81-95,140-154`；`server/internal/gateway/pipeline.go:638` |
| build 交给原生 | `companions/cli-mods/request-build.js:211-262,292-318`；`request-natives.js:28-52` |
| 原生构建器接管 | `patch-cli-2.1.304.cjs:205-223`（`ccgatewayBuildOnly`、`ccgateway_request`） |
| 原生 sF / 计费头捕获 | `patch-cli-2.1.304.cjs:222,230-235,246` |
| direct | `companions/cli-mods/request-command.js:190-206`；`direct-billing.js:16-86` |
| 计费头合并/改写 | `companions/cli-mods/content-policy.js:380,503,517` |
| metadata | `companions/cli-mods/request-identity.js:72`；`companions/engine/request_identity.go:295-340` |
| 文档 | `plugins/ccgateway/docs/SUBAGENT-REQUEST-CONTEXT-DESIGN.md`；`plugins/ccgateway/docs/CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY.md` §4,§10,§11 |
| 本轮脚本 | `artifacts/claude-2.1.304/e2e/subagent-2026-10-25/{run.sh,docker.sh,deepcompare.cjs,verify-sub.cjs,replay31.cjs,stage31.sh,prod-sub.py,compare-prod.cjs}` |
