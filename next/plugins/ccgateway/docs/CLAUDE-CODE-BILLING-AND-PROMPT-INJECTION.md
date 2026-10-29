# 计费头与内置提示词注入：现状、实测与规则

2026-10-30。对象：官方 CLI 2.1.312（sha256 `4f4178ce…`）与补丁 CLI 2.1.312 / patch `ccgateway-v38-cc-2-1-312`（本次升级的候选，待发布；第 1–3 节的实抓数字取自当时线上的 2.1.310 / `v36-content-guard`，2.1.312 的补丁逻辑与它相同，见 [CLAUDE-CODE-2.1.312-MIGRATION](CLAUDE-CODE-2.1.312-MIGRATION.md)）。所有数字都来自 ovh 一次性容器 + 假上游 + 占位令牌的实抓，不连真实上游、不登录。

> 版本说明：补丁标签用 v38 而不是 v37：`ccgateway-v37-content-guard` 已被 2.1.304 的 profile 占用（提交 3dcaddfd0），标签序号跨版本连续。

## 0. 速览

- **计费头不是"有或没有"的问题，是"带几个字段"的问题。** 客户端连自定义 URL 时仍然发 `x-anthropic-billing-header`，只是只有 `cc_version`、`cc_entrypoint` 两个字段；连官方地址时才多出 `cch`、`cc_prev_req`、`cc_prompt_id`、`cc_turn_*`，system 也从 3 块变 4 块（多一个动态分界）。
- **我们只在客户端没带计费头时自己写头。** 客户端带了的，原样保留，一个字段都不加（`cch`、`cc_prev_req`、turn 字段从来不是"补"的对象）。
- **内置提示词注入（high 等级）只在"请求没有计费头"时生效。** 已决定保持以计费头为准（第 4.1 节）。
- **我们写的头是"连官方地址"的形状**：Worker 连的就是官方 API，`_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1` 让 CLI 按真实 CC 直连官方地址的形状写头，这是对的；与真实 CC 唯一的差别是 `cch` 的值（第 4.4 节）。
- **2.1.312 / v38 起，我们写的头也带 `cc_prev_req`，续接上一次应答时 turn 字段不回退**（Worker 进程内存按会话线程记忆，第 5 节；0.1.114 起截断历史什么都不给，turn 按历史计数）。

## 1. 客户端：自定义 URL 与官方地址的差异

### 1.1 计费头原文（官方 2.1.312，`claude -p hi`）

自定义 base URL（`ANTHROPIC_BASE_URL=http://127.0.0.1:8083`，不设 first-party 假设），74 字：

```
x-anthropic-billing-header: cc_version=2.1.312.0cd; cc_entrypoint=sdk-cli;
```

官方地址形状（测试里设 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1` 复现），192 字：

```
x-anthropic-billing-header: cc_version=2.1.312.0cd; cc_entrypoint=sdk-cli; cch=081e5;
cc_prompt_id=8e41506e-3c26-496b-9d05-672bed941943; cc_turn_origin=sdk; cc_prompt_index=0; cc_turn_index=1;
```

`cch` 每次请求不同（另一条实测 `db5d7`），由官方 Bun 运行时按请求内容计算；JS 里只有占位 `00000`。会话第二次起的请求还带 `cc_prev_req=<上一次上游响应的 request-id>`（离线回归 `turn2-build-low` A 侧：`cch=…; cc_prev_req=req_ccgaudit1; cc_prompt_id=…`）。

官方字段顺序（`chunk-pdqv9ngw.js` 的 `f3o`）：`cc_version; cc_entrypoint; [cch]; [cc_workload]; [cc_is_subagent=true]; [cc_prev_req]; [cc_prompt_id]; [cc_turn_origin]; [cc_prompt_index; cc_turn_index]; [cc_gateway]; [cc_project…]`。`cch`、`cc_prev_req`、`cc_prompt_id`、turn 字段都只在 firstParty 且 `Pi()`（官方地址形状）时写。

### 1.2 同一差异也体现在 system 的分块上

| | 自定义 URL | 官方地址 |
|---|---|---|
| system 块数 | 3 | 4 |
| 计费头 | 74 字 | 192 字 |
| 身份行 | 62 字 | 62 字 |
| 静态提示词 | 与动态段合并（Opus 4.8 合计 5561） | 1171，`cache_control {ttl:1h, scope:global}` |
| 动态段 | — | 4388，`{ttl:1h}` |
| 分界符 | 无 `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__` | 有（切块后不外发） |

代码上这是 `A6()`（分界符开关）为假时 `sI` 走 `b8n(s, null)` 的结果，详见 [CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY](CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY.md) 第 12 节。

### 1.3 认证方式不影响这个差异

三种认证方式、同一个自定义 base URL，实抓结果完全一致（都是 74 字头、3 块）：

| 认证 | 请求头 |
|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | `Authorization: Bearer sk-ant-oat01-…` |
| `ANTHROPIC_AUTH_TOKEN` | `Authorization: Bearer …` |
| `ANTHROPIC_API_KEY` | `x-api-key: sk-ant-api03-…` |

差别只在认证头本身，计费头和 system 分块相同。

## 2. 我们这边：计费头是谁写的

`mergeBillingAttribution`（`companions/cli-mods/content-policy.js:429`）只管理两个字段：

```js
const billingFields = ['cc_version', 'cc_entrypoint'];   // companions/cli-mods/shared.js:18
```

`cch`、`cc_prev_req`、`cc_prompt_id`、`cc_turn_origin`、`cc_prompt_index`、`cc_turn_index` 都不在管理范围内。于是有三种情形：

### 2.1 客户端自带头（真实客户端，常见）→ 原样保留

只要头在第一块开头且能解析、两个字段都在，就一个字符都不改。实测（build 矩阵 req-004）：客户端给 `… cc_version=2.1.310.077; cc_entrypoint=cli;`，我们发出去的 system 就只有这一块，长度原封不动，**没有追加 `cch`，没有 turn 字段**。

真实 CC 客户端自己写的 `cc_prev_req` 与上游一致：Worker 把上游响应头 `request-id` 原样交回（`contracts/httpfacts`），核心也照样转给客户端（`next/server/internal/gateway/forward.go` 的 `httpfacts.Apply`），所以客户端记下的就是上游的 `req_…`。核心另设的 `X-Request-Id` 是核心自己的 ID，CC 不用它。离线回归 `turn2-build-low` B 侧（官方客户端经网关）第二轮 `cc_prev_req=req_ccgaudit1`，正是假上游给第一轮的 ID。

### 2.2 客户端没带头 → 我们写一整条

Worker 设了 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`（`engine/request_command.go` `requestCommand`），所以 CLI 写的是官方地址形状：

```
cc_version=2.1.312.<指纹>; cc_entrypoint=sdk-cli; cch=00000; [cc_prev_req=req_…;] cc_prompt_id=…; cc_turn_origin=sdk; cc_prompt_index=0; cc_turn_index=<n>;
```

其他会一起出现的：`request-class`/`agent-type`/`prompt-id` 那组请求头、静态块的 `scope:global`。`cc_prev_req` 与 turn 字段的来源见第 5 节。

### 2.3 头存在但不在第一块开头、或解析冲突

`mergeBillingAttribution` 会把原生那条放到最前面，客户端那条原地保留（上游接受两条头）；如果冲突且策略要求 Worker 提供字段，直接报错。这类请求按"客户端自带头"处理：不使用第 5 节的会话记忆。

## 3. 内置提示词注入：现在的判断逻辑

### 3.1 等级 → 策略（核心）

`features.LevelInjection(level, configured)`（`companions/contracts/features/levels.go:77`），默认等级 `low`：

| 等级 | 注入内容 |
|---|---|
| none / micro | 无（none 还是 direct） |
| low | 首轮附件：environment、model、total_tokens、date |
| high | 再加 `system_prompt: true` 与默认工具 Bash / Read / Edit / Write |

存档策略里显式写的值优先——**显式 `system_prompt: false` 会压过等级**，之后把等级调到 high 也不会恢复。

### 3.2 CLI 侧四层判断

1. **计费头闸门**（`companions/cli-mods/request-build.js:238`）
   ```js
   const layers = billing.hasBilling(initial.systemBlocks) ? null : await injectLayers(...)
   ```
   `hasBilling`（`content-policy.js:523`）= system 里任意一块能解析出 `x-anthropic-billing-header:`。为真 → 整个注入层跳过（提示词、工具、附件、身份行都不加）。

2. **补不补提示词**（`request-build.js:60`）
   ```js
   const prompt = chosen.systemPrompt
             && !clientSystem.some(block => block.text.includes(vocabulary.systemPrompt));
   ```
   `vocabulary.systemPrompt` = 原生安全段的**完整原文**（`native-environment.inc.js:200` → `native_securityParagraph`），`includes` 精确子串匹配。客户端只写半截或改写 → 匹配不上 → 仍然补。

3. **工具与附件**：按选中的名字/类别补，客户端已带的不重复（工具按名字，附件按载体开头 `opensWith`）。

4. **身份行**（`request-build.js:165`）：`own = clientBilling !== null`（请求自带计费头）→ `line:'none'`，不加身份行；否则按 entrypoint 选（`cli`→`official_cli`，`sdk-cli`→`agent_sdk`，有追加提示词时→`official_cli_sdk`）。

补提示词时走 `ccgatewayDefaultPrompt`（`native-environment.inc.js:135`）：原生 `sI` 出段 → `L2e` 加工具相关段 → 客户端 system 里非身份行的部分追加在最后 → 切块。

### 3.3 归纳

| 请求 | 会补提示词吗 |
|---|---|
| 自带计费头（任何真实 CC 客户端） | **永不** |
| 无计费头 + high + system 不含完整安全段原文 | 会 |
| 无计费头 + system 含完整安全段原文 | 不补提示词（工具/附件照补） |
| low 等级 / 显式 `system_prompt:false` | 不补 |

### 3.4 实测矩阵（补丁 CLI 2.1.310 / v36，`request --build`）

| 场景 | system 块 | 长度 |
|---|---|---|
| high，客户端无 system | 4 | 141 / 62 / **1171** / **4223** |
| high，客户端带 system | 4 | 141 / 94 / 1171 / 4253（客户端原文接在最后） |
| high，模型是别名 `claude-sonnet-4-5-20250929` | 4 | 141 / 62 / **10617** / **15693** |
| high，客户端 system 含半截安全段 | 4 | 141 / 94 / 1171 / 4368 |
| **high，客户端自带计费头** | **1** | 客户端自己的头，无注入 |
| low | 2 | 141 / 62 |

能力门控不是问题：CLI 声明了 `build_injection_v1` 与 `request_levels_v1`（`--ccgateway-info` 可查）。

## 4. 已决定的事项

### 4.1 计费头仍是"要不要补"的总开关（已决定：保持以计费头为准）

`hasBilling` 同时决定"这条请求是不是 CC 自己的"和注入层是否执行：请求里只要有计费头，哪怕 system 只剩头和身份行，也不补提示词。曾提议把它降级为只管计费归属、按内容判定是否补提示词；**用户已否决（2026-10-30："还是以计费头为准"）**，保持现状。

### 4.2 "已带提示词"的判据（已决定：不改）

只认安全段完整原文的 `includes`：客户端写了改版/截断的安全段会被判为"没有"而补出第二份；客户端把 system 清空则检测不到"它本来该有"。这两点已知，随 4.1 一并保持现状。

### 4.3 按内容判定的方案（已撤回）

原先建议的"含 CC 静态段特征则不补、只有计费头 + 身份行则补"等内容判定规则，随 4.1 的决定撤回，不实施。

### 4.4 `cch=00000`（已决定：保持占位，不处理）

Worker 连的是官方 API，应当对齐"真实 CC 直连官方地址"的形状，所以 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1` 是对的，不该去掉（去掉后是"自定义地址"形状，反而与真实 CC 直连官方时不同）。我们写的头与真实 CC 唯一的差别是 `cch` 的值：官方二进制在发送前由 Bun 运行时把 JS 里的占位 `00000` 换成按请求计算的值（[CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY](CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY.md) 第 7 节），我们用 oven/bun 编译的 CLI 不做这一步。**用户决定 cch 保持 `00000` 占位、不处理**（2026-10-30）。客户端自带头里的 `cch` 是客户端自己算的，原样保留。

## 5. 会话记忆：`cc_prev_req` 与 turn 字段（v38 起）

真实 CC 从自己的 transcript 读两件事：上一次应答的请求（最后一条 assistant 消息的 `requestId`，`mmr`）与本轮的位置（最后一个 prompt 的 `turnPosition`，`vKn` 按之前的 prompt 计数）。客户端发来的是对话消息而不是 CC 的 transcript：没有 request-id，历史还可能被截断或压缩。所以对**我们写的头**，Worker 按会话线程记住这两件事，CLI 把它们放回 CC 自己读的位置，由原生 `f3o` 写字段（不拼字符串）。

### 5.1 规则

| 项 | 规则 |
|---|---|
| 作用范围 | 只对客户端没带计费头、由我们写头的请求（build 与 direct 都是）；客户端自带头的请求（含真实 CC 的子代理）不读也不写记忆。Worker 先做一道便宜的闸门：system 首块以 `x-anthropic-billing-header:` 开头的请求在算消息摘要之前就跳过；头在别处的由 CLI 判定（它保留客户端的头、不报告 `session`，Worker 不存） |
| 存什么 | 每个（上游会话 U，线程）一条：最后一次**成功**上游响应的 `request-id`、该请求的消息摘要（逐条规范 JSON 的 sha256），主线程另存 CLI 报告的 turn 位置与 prompt 哈希 |
| 会话键 U | Worker 交给 CLI 的上游会话（`CCG_REQUEST_IDENTITY.session_id`），且只用于客户端自己命名的会话（metadata 带 `session_id`，映射后作为 U）。选 U 而不是客户端会话 S：U 是上游看到的会话，S 经账号密钥映射成 U，一一对应 |
| 线程 | 主线程，或子代理的 agent ID（请求头 `X-Claude-Code-Agent-Id`）。`X-Claude-Code-Request-Class` 是 `subagent`/`workflow` 却没有 agent ID 的请求分不出线程，Worker 不用记忆。CLI 只在 Worker 查的线程与它实际构建的线程一致时才用，并在响应元数据里报告线程；不一致则不用、不存 |
| `cc_prev_req` | CLI 把记住的 request-id 放到最后一条 assistant 记录的 `requestId`（direct 传给原生 `d2s` 的 `previousRequestId`）。只有本次请求的最后一条 assistant 正是被记住请求的应答时，Worker 才交出记忆：消息以被记住请求的消息开头，其后第一条是 assistant（那次的应答），再往后没有别的 assistant。否则整条记忆都不交（不带 `cc_prev_req`，turn 也按历史计数）；首轮、换对话、截断历史、客户端插入或多出 assistant 都是这样 |
| turn 字段 | 仍先按历史由原生计数（`ccgatewayMarkTurns`）。拿到记忆时（上一行的续接成立）修正：最后一条用户消息是新输入（不是 tool_result 续发，且 prompt 哈希不同）→ `turnIndex = max(历史值, 记忆+1)`，`promptIndex = max(历史值, 记忆 + (cli 入口 ? 1 : 0))`；tool_result 续发或同一输入重试 → 取 `max(历史值, 记忆值)`；超出原生上限（1e7）或不合 `$3` 校验则用历史值。结果写回 prompt 记录的 `turnPosition`，由原生写字段 |
| 派生会话 | 客户端没命名会话时，Worker 按对话首条消息派生会话；首条消息相同的不同对话共享它（离线回归 `noncc-identity2`：对话 A 的后续轮会拿到对话 B 的 request-id），所以派生会话**完全不用记忆**，`cc_prev_req` 不带、turn 按历史计数（派生会话的历史必然从首条消息开始，原生计数本身就对） |
| 子代理线程 | 只存 request-id，不存也不写 turn（官方子代理的头没有 turn 字段） |
| 并发 | 主线程与子代理线程同一机制：同一（会话，线程）已有请求在途时，后来的请求不读记忆；这些重叠的请求（包括先到的那个）都不写记忆，因为不知道对话接着哪一次应答往下走 |
| 失败 | 只有完整成功（2xx 且流完整）的请求才更新记忆；失败、开始输出后中断或被取消都不推进。整条记住或不记：request-id 不合法、主线程的 turn 或 prompt 哈希不合法时记忆保持原样，没有可记的也不新建条目 |
| 容量与过期 | 每个 Worker 最多 4096 条，按最近应答淘汰；闲置 24 小时过期。理由：一个 Worker 只服务一个账号、同时只有几个请求，一天内活跃的会话线程远少于 4096；24 小时覆盖当天续聊，更久的续聊回到按历史计数。只在进程内存，不落盘：Worker 重启或淘汰后视为新会话 |
| 能力 | `build_session_state_v1`：Worker 只对声明了它的 CLI 发 `previous`（旧 CLI 会拒绝未知字段） |

### 5.2 实际启用的情形与故意不做的情形

| 情形 | 是否使用记忆 | 原因 |
|---|---|---|
| 非 CC 请求（无计费头），客户端命名会话，主线程，带完整历史 | 是：`cc_prev_req` 有；turn 原生计数本就正确 | 我们写头 |
| 同上，只发最后一轮 / 压缩过的历史 | 否：`cc_prev_req` 不带，turn 按历史计数（0.1.114 起；此前 turn 会按记忆修正） | 不能证明是同一段历史时宁可不带 |
| 同上，tool_result 续发 | 是：`cc_prev_req` 与本轮 turn | 消息接着上一次请求 |
| 非 CC 请求，派生会话（metadata 不带会话） | 否：不带 `cc_prev_req`，turn 按历史 | 首条消息相同的对话共享派生会话，无法区分 |
| 客户端自带计费头（真实 CC，含主线程与子代理） | 否 | 客户端自己的头原样保留；真实 CC 自己写的 `cc_prev_req` 已与上游一致（2.1 节） |
| 带子代理头但没有计费头的请求 | 否 | v28 起这类请求一律按主线程构建，Worker 查的是子代理线程，线程不一致，CLI 不用、Worker 不存 |
| 子代理请求没有 agent ID（`X-Claude-Code-Request-Class: subagent`/`workflow`，Worker 的 `sessionThread` 判定）、同一线程（主线程或子代理）并发、fork/compact | 否 | 无法确定是哪个线程的哪一次请求 |
| 控制台账号测试（probe） | 否 | 网关自己的请求，不属于对话 |

所以在当前规则下，子代理线程的记忆实际不会被写入：没有计费头的请求总是主线程。键与线程校验仍按（会话，线程）实现并有单测覆盖。CLI `request-session.js` 里 `continueSession`/`continueDirectSession` 的子代理分支因此不可达；这段代码在 CLI（ELF）里，不为删它重编，测试照旧。

## 6. 复现方法

容器：ovh，`node:22-bookworm-slim`（跑官方 ELF 与假上游）或 `ccgateway-app:0.1.113`（跑补丁 CLI，路径 `/opt/ccgateway/cli/2.1.310/claude`）。挂载目录 `~/cc312`。

| 脚本（`artifacts/claude-2.1.312/container-test/`） | 作用 |
|---|---|
| `run.sh` | 官方 CLI，自定义 URL 形状（3 块） |
| `run-fp.sh` | 官方 CLI + `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`（4 块） |
| `run-auth.sh` | 三种认证方式的对照 |
| `run-build.sh` | 补丁 CLI + `request --build`，high/带 system/别名/带计费头/半截安全段/low |
| `run-build-nofp.sh` | 同上但不设 first-party 假设（看生成的头怎么变） |
| `fake-upstream.cjs` | 记录每个请求并把最小合法响应回给 CLI |

抓回的 body：`captures-fp/`（官方 4 块）、`captures-auth/`（三种认证）、`captures-build/`（补丁 CLI 矩阵）、`captures-nofp/`（不设假设）。

命令示例：

```bash
ssh ovh 'docker run --rm -v /home/debian/cc312:/t -w /t --entrypoint bash ccgateway-app:0.1.113 /t/run-build.sh'
```

会话记忆（第 5 节）的端到端验证在离线回归里：`cli-mods/test/e2e` 的 `noncc-session` 场景与 `turn2-build-low`，断言在 `verify.cjs` 9b。

## 7. 代码索引

| 位置 | 内容 |
|---|---|
| `companions/contracts/features/levels.go:77` | `LevelInjection`：等级 → 注入项 |
| `companions/cli-mods/request-build.js:238` | 计费头闸门（`hasBilling ? null`） |
| `companions/cli-mods/request-build.js:60` | 提示词"已带"判据（安全段子串） |
| `companions/cli-mods/request-build.js:165` | `identityRequest`（own → 不加身份行） |
| `companions/cli-mods/request-build.js:231` | 我们写头时接上会话记忆（`continueSession`） |
| `companions/cli-mods/content-policy.js:523` | `hasBilling` |
| `companions/cli-mods/content-policy.js:429` | `mergeBillingAttribution`（只管 `cc_version`/`cc_entrypoint`） |
| `companions/cli-mods/shared.js:18` | `billingFields` |
| `companions/cli-mods/native-environment.inc.js:135` | `ccgatewayDefaultPrompt` |
| `companions/cli-mods/native-environment.inc.js:200` | `vocabulary.systemPrompt` = 原生安全段原文 |
| `companions/cli-mods/request-session.js:39` | `sessionTurn`：turn 修正规则 |
| `companions/cli-mods/request-session.js:68` | `continueSession`：request-id 与 turn 放回记录 |
| `companions/engine/session_state.go:262` | `attachSessionState`：按（会话，线程）交出记忆，消息续接与命名会话的校验 |
| `companions/engine/session_state.go:294` | `rememberSessionState`：成功后按 CLI 报告记住 |
| `next/server/internal/ccgateway/runtime_features.go:46` | 核心侧的注入能力预检 |
| `next/plugins/ccgateway/companions/engine/request_command.go:240` | Worker 侧的同名能力门控 |
| `next/server/internal/gateway/forward.go:51` | 核心把上游 `request-id` 等响应头转给客户端 |
