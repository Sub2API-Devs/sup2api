# Claude Code 2.1.310 → 2.1.312 迁移记录（CLI v36 → v38）

2026-10-30。把账号 Worker 里的定制 CLI 从官方 2.1.310（`ccgateway-v36-content-guard`）移到官方 2.1.312，要求 `claude request --build|--direct` 与 `claude ccgateway-mgmt` 的逻辑与 v36 一样，只允许出现官方自己的变化；同时按用户要求加入会话记忆（我们写的计费头带 `cc_prev_req`、turn 字段不回退，第 5 节）。做法按 [CLI-UPGRADE-RUNBOOK](CLI-UPGRADE-RUNBOOK.md)，测试体系见 [CLI-TEST-PLAN](CLI-TEST-PLAN.md)，上一次迁移见 [CLAUDE-CODE-2.1.310-MIGRATION](CLAUDE-CODE-2.1.310-MIGRATION.md)，计费头规则见 [CLAUDE-CODE-BILLING-AND-PROMPT-INJECTION](CLAUDE-CODE-BILLING-AND-PROMPT-INJECTION.md)。

| 项 | 2.1.310 / v36 | 2.1.312 / v38 |
|---|---|---|
| 官方 manifest | 2026-10-23 构建，commit `0d2056ec` | 2026-10-27T17:16:03Z 构建，commit `f375cd85d4f70920de17ce3a4ad646e18834e833` |
| 官方 linux-x64 ELF SHA-256 | `b7367643…7df56`（291638640 字节） | `4f4178ce41d83e23341ebfbaecdbcf8ea6bf7baea0690025abe49eeec3a5d01d`（293592432 字节，与官方 manifest 一致） |
| 内嵌 Bun | 1.4.4（修订 `2c2ae6246`） | 1.4.4（修订 `0ae49f8b6`） |
| 还原 | 2801 模块 / 2551 JS | 2813 模块 / 2581 JS，`unresolved` 为空，入口 `cli.js` |
| 补丁标签 | `ccgateway-v36-content-guard` | `ccgateway-v38-cc-2-1-312`（v37 已被 2.1.304 的 `ccgateway-v37-content-guard` 占用；支持模块变了，2.1.310 / 2.1.304 的 profile 也升为 `ccgateway-v39-session-state` / `ccgateway-v40-session-state`） |
| 定制 ELF SHA-256 | `06d428b6…19fe`（线上 0.1.113） | `c66a1f056a79c55226b026de197534c97995d543b5b6b08d8d22f7a1648e9ddb`（oven/bun:1.4.4 编译，见第 6 节） |
| 能力 | 19 项 | 20 项：新增 `build_session_state_v1` |

分析中间产物在 `artifacts/claude-2.1.312/`（不进 Git）：`official-manifest.json`、`claude-linux-x64`、`linux-restored/`、`seeds.json`、`equiv-310-312.json`、`equiv.out`、`carry.json`、`closure-changes.txt`、`diffs/`（unitdiff）、`scratch/`（入口与构建器对比）、`captures/`（官方抓包）、`patched-v38/`、`release-v38/`、`worker-new`（候选 Worker）。

## 1. 下载与还原

- 官方 `2.1.312` 的 manifest 与 linux-x64 ELF 按 `artifacts/claude-2.1.304/acquire.py` 的样板下载（`HTTPS_PROXY=http://127.0.0.1:7890`），SHA-256 与字节数等于 manifest。
- `restore-bun.cjs` 还原：`binarySha256` 等于 manifest checksum，2813 个模块、2581 个 JS，`unresolved` 为空，`bunVersion` 1.4.4。profile 的 `bunVersion` 因此仍是 1.4.4，编译用 `oven/bun:1.4.4`。
- 23 个哈希绑定的 chunk 模块名在 2.1.312 里全部换了（`cli.js` 内容也变了），名字需要经 `equiv` 配对重新找。

## 2. 静态分析（equiv / unitdiff / carry-profile）

`seeds.cjs . 2.1.310` 生成 87 个种子；`equiv.cjs` 结果（`equiv-310-312.json`）：旧 97364 个单元、新 98638 个，配对 93520（same 91760、changed 1760），冲突 910（`old-reached-twice` 835、`new-claimed-twice` 75）。87 个种子里：

| 结论 | 种子 |
|---|---|
| same（含闭包里个别 changed） | 其余 79 个，包括全部 `coreScope`、`coreImports`、`locate` 名字，`natives` 里除下面三个以外的全部 |
| changed | `m$`→`K$`（API 客户端工厂）、`NWe`→`nLe`（附件渲染）、`F9t`→`gDt`（工具池）、`RTt`→`Wkt`（日期提醒文字）、`rH`→`YH`、`rSn`→`Qmn`、`UC`→`Kk` |
| unmapped | `cli.js:Ye`（入口，新版 `Ke`，按文本与结构人工确认，见第 3 节） |

`carry-profile.cjs` 把 profile 的全部名字带到新版，`problems` 只有上面 changed 的 4 个原生（`createClient`、`renderAttachment`、`toolPool`、`renderDate`），逐个审查如下。新核心模块是 `chunk-7dmym6x9.js`（旧核心 14283 个配对单元里 13562 个落在它里面）。

### 2.1 changed 单元的审查（`unitdiff`，输出在 `artifacts/claude-2.1.312/diffs/`）

| 单元 | 变化 | 对 `claude request` 的影响 |
|---|---|---|
| `NWe`→`nLe` 附件渲染 | 新增一个分支：`file` 附件超过 token 上限且某开关打开时改渲染为 `at_mention_reference` | 无。build 只对 Worker 给出的附件引用调用它，`request-input.js` 要求渲染结果与原文逐字节相等，Worker 不产生 `file` 附件 |
| `F9t`→`gDt` 工具池 | `ri(list,"name")` 换成等价的按名去重 `Ove(list, x=>x.name)` | 无，逻辑等价（高注入等级的工具顺序在离线回归里核对） |
| `RTt`→`Wkt` 日期提醒 | 新增 `assumedUtc` 分支：“The UTC date is …”。原生只在 `Yei()`（时区假定为 UTC）且 GrowthBook 开关 `tengu_peppy_nest` 打开时给日期附件加 `assumedUtc` | 我们的注入层（`native-environment.inc.js`）只传 `{date}`，与 2.1.310 输出相同；层词表夹具逐字相同。已知边界：如果线上官方客户端开了这个开关，它发来的日期提醒是 UTC 措辞，我们的“已有判断”不认识这种措辞（只影响非 CC 请求，CC 请求带计费头不注入），列为后续观察项，不在本次改动 |
| `rH`→`YH` 工具定义 | 注册缓存后对非 MCP 工具记 `entriesBuilt.add(name)` | 无。补丁在函数开头对客户端工具直接返回，锚点 `async function YH(e,n){` 唯一 |
| `UC`→`Kk` 消息规整 | 新增 `origin.kind==="peer"` 的观察消息处理；`queued_command` 增加 `fTs` 判定；`p7(..., toolsUsed)` 多一个参数 | 无。外部记录没有 `origin`、不是 `queued_command`；锚点 `case"progress":continue;case"system":` 不变，替换文本里的局部名按新函数换（`Pr/ls/jn/dr` → `Yr/Qr/Yn/Mr`，均已核对是同一对 flush 函数与记录数组） |
| `rSn`→`Qmn` 主查询 | 局部名全部重新压缩；请求构建器 `Ceo`→`x9n` 结构相同（body 字面量键相同；服务端分类器的工具选项多一个 `judgeOnlyTools`，只在 `serverClassifier` 开时生效） | 10 处锚点按新局部名重写（第 3 节） |
| `m$`→`K$` 客户端工厂 | 传输包装 `My`→`hw` 多两个参数（query source、request class）；`ljt`→`wzt` 多一个 `x-cowork-enrollment` 头（只在 cowork 启动器给了 enrollment 时）；`w4e`→`W5e` 代理认证 helper 改为只为启动时的代理运行 | 锚点 5 处按新局部名重写；API-key-only 路线跳过的仍是同一组调用（自定义头、凭证读取、OAuth 判定、代理认证） |

传输层闭包里另外几处变化（都不改变我们出口的字节）：

- `hw`（原 `My`）新增请求头 `x-claude-code-sandy-plover`（会话里用过的工具列表），条件是 GrowthBook 开关 `tengu_snug_mitten` 且一方路线。Worker 设 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`，开关取默认 false，定制 CLI 不会发；离线抓包的官方客户端也不会发。线上官方客户端若开了这个开关会发这个头，网关目前不转发它（Worker 只转发上下文头白名单），列为后续观察项。
- `hw` 的 gzip 现在也接受 CC 自己序列化的 Buffer 正文（`CLAUDE_CODE_INCREMENTAL_REQUEST_BODY`，缺省 0 不启用）。我们的 build 在 fetch 边界要求字符串正文、direct 发原始字符串，都不受影响；gzip 阈值与末尾随机空白规则不变。
- 子代理/辅助/压缩类请求的响应可按 `CLAUDE_CODE_UNWATCHED_REPLY_HOLD_MS` 延迟交付（缺省 0）；Worker 不设。

### 2.2 入口函数（unmapped）

`cli.js` 的入口由 `Ye` 变为 `Ke`。逐语句对比（chunk 名与版本元数据规范化后）：新版在开头多了 `noteProcessStartTuning()`、`startGarbageCollectionCount()` 两个启动统计调用，后台会话分支多一个 `tengu_sable_orrery` 开关判断，其余只是局部名重排。补丁需要的三样都在：参数列表仍是 `e=process.argv.slice(2)`，快路径策略的设置来源由 `s` 变为 `r`，第一个快路径分支（GitHub stand-in）的变量由 `r` 变为 `a`；锚点 `if(a!==void 0){` 在函数内唯一。

### 2.3 依赖的其余原生

- 请求构建器的 12 个 beta 在两版里的头值与顺序完全相同（`context-1m-2025-08-07`、`dangerous-tool-use-2026-09-03`、`thinking-binding-controls-2026-08-01`、`thinking-display-updates-2026-08-18`、`thinking-resumption-2026-07-17`、`fast-mode-2026-02-01`、`afk-mode-2026-01-31`、`extended-cache-ttl-2025-04-11`、`prompt-caching-evict-2026-05-12`、`cache-diagnosis-2026-04-07`、`cache-keepalive-2026-09-03`、`message-threads-2026-08-12`），新版从 `chunk-afamv62a.js` 导入。
- SDK 模块 `chunk-yagw4eem.js` 里仍恰好一处 POST `/v1/messages?beta=true`。
- 计费指纹 `oYs`（原 `fWs`）：盐 `59cf53e54c78`、下标 4/7/20、sha256 前 3 位不变。
- 原生夹具重生成后，词表、层词表、环境段完整模板三份与 2.1.310 逐字相同（只差 `cli_version` 与 provenance）。
- `CLAUDE_CODE_EXTRA_BODY` 仍由核心里的 `jK`（原 `K2`）读取。

## 3. 补丁的迁移

- profile `profiles/linux-x64-2.1.312.json`：`natives`/`coreScope`/`coreImports`/`locate` 取自 `carry-profile` 输出（`locate.requestBuilder` `x9n`、`builderBetaList` `Hr` 人工确认）；`modules` 沿用 2.1.310 的 24 个模块按配对映射到新模块名（`chunk-k19pbtc6`→`chunk-c2txqh1z`、`chunk-r2a214y7`→`chunk-44429y21` 是只做再导出的模块，按 natives 的去向映射），哈希按新还原文本重算。
- 锚点 `patches/2.1.312.cjs` 由 `tools/upgrade/examples/derive-anchors-2.1.312.cjs` 从 2.1.310 的锚点逐条替换生成（每条替换必须恰好命中预期次数，最后检查没有旧名字残留）。13 个被改写函数：入口 `cli.js:Ke`、会话 `chunk-zpsbh0wk.js:Rt`、容器资源 `chunk-7cks3gqr.js:YOi` 与 `chunk-rjc7jjmb.js:V`、核心 `chunk-7dmym6x9.js` 的 `YH`/`Qmn`（构建器 `x9n`）/`Kmn`/`Kk`/`Xmr`/`boo`、客户端 `chunk-yagw4eem.js:K$`/`Ml`、计费 `chunk-pd06as9s.js:d2s`。与 2.1.310 相比只有名字不同，外加 `Qmn` 里一处新锚点（见 3.1）。
- 补丁器、支持模块、`native-environment.inc.js` 都没有改；`anchor-hazards`：26 处替换文本全部逐字出现在产物里、无 `$` 模式。

### 3.1 新增的一处锚点：thinking-token-count

第一次离线回归（D1）发现：非 CC 的 build 请求在 v38 上多出 beta `thinking-token-count-2026-05-13`，而且排在最前面。原因：

- 2.1.310 把它放在模型 beta 表里（`chunk-ajtyjx88.js` 的 `QH`：`{beta:aZ, when: interleavedThinking && …}`）。build 把主查询里“模型表 beta”那一行换成了客户端的 beta（锚点 `let ht=…xvn(…)` → `ccgatewayRequestBetas`），所以 v36 的非 CC 请求从来不带它；CC 客户端自己发，原样保留。
- 2.1.312 把它从模型表删掉，改在主查询里、模型表那一行之后单独 push：`if(Se(()=>CYn(vt))&&It.thinking.supported&&!ht.includes(uF))ht.push(uF);`。这一步在我们的替换点之后，于是 build 也会加上它；它不在构建器的 push 列表里，`finalBetas` 也排不出原生位置。

build 的 beta 规则是“客户端的 beta + 请求体需要的 beta”（v25/v27），thinking-token-count 属于模型能力 beta，不是请求体需要的。为了与 v36 逻辑一致，`Qmn` 里给这一处 push 加上与模型表那一行相同的 build 判断（`Q.ccgatewayBuildOnly!==true&&…`）：普通 CLI 与官方行为不变，CC 客户端自己发的照常保留，非 CC 请求与 v36 一样不加。`test/native/2.1.312/patch-wire-preservation.test.mjs` 断言了这一处。

主查询在模型表之后 push 的其余 beta（advisor、工具搜索、MCP、fallback 模型）在 2.1.310 里就是这样，没有变化。

- `test/native/2.1.312/` 由 2.1.310 那份按新名字移植（vm 桩的自由变量名用作用域分析逐个找出）；计费指纹的期望值按手算公式重算（`077→0cd`、`32c→536`、`76e→622`、`4e9→23b`），原生 oracle 与手算一致。
- 版本无关部分只动了测试辅助 `test/replay-helpers.cjs`：计费指纹事实表加 2.1.312 一行；`nativeDefaultPermitted` 认识第 4 节的官方新规则（2.1.312 起客户端没写 `output_config` 时，effort 取历史里最后一个带 `output_config.effort` 的 system 轮）。
- 新增的夹具：`official-request-2.1.312.json`（`capture-official.sh` 抓取）、`native-{vocabulary,layers,environment}-2.1.312.json`（原生生成）、`assembly-cases-2.1.312.json`（76 项）、`client-content-cases-2.1.312.json`（14 项），后两个由 `fixtures/build-*.cjs` 按 `CC_VERSION=2.1.312` 生成。

## 4. 官方 2.1.312 的变化（对我们可见的部分）

D0：`capture-official.sh` 用 `ccgateway-app:0.1.113` 镜像分别抓官方 2.1.310 与 2.1.312（同一脚本、同一镜像；2.1.310 的重抓与仓库里的 `official-request-2.1.310.json` 经 `official-diff` 0 差异，条件一致），`official-diff.cjs` 结果 3 处差异：

| 变化 | 出现在哪 | 结论 |
|---|---|---|
| 环境段 `Shell: unknown` → `Shell: bash` | 官方客户端的环境段；原生 `poo`（原 `dao`）的闭包 `moo`（原 `uao`）现在在 `SHELL` 未设置时取 PATH 上实际可用的 zsh/bash，`SHELL` 与之不同时写成 `<shell> (login shell: <SHELL>)` | 官方变化。Worker 来源的 `shell` 字段由原生渲染，所以选了 `worker` 来源时出口也会随之变化 |
| Bash 工具描述改写（`cd` 只在主会话、命令成功且停在工作目录内时带到下一次调用……） | 官方客户端的工具；我们只在“高”注入等级注入 Bash 工具时带出 | 官方变化，按原生原样 |
| 内置 `code-review` skill 的描述改写 | 官方客户端首轮的 skill 列表 | 客户端自己的内容，不经我们生成 |
| 计费头 `cc_version=2.1.312.<指纹>`、UA `claude-cli/2.1.312` | 原生计费头、UA | 官方必要变化 |
| 客户端没写 `output_config` 时，effort 取历史里最后一个带 `output_config.effort` 的 system 轮（原生 `R8e`/`Gcn`，2.1.310 没有） | build：客户端的 system 消息带 `output_config` 而顶层没有时，出口顶层 `output_config.effort` 跟随它（组装对账 `messages.system_lifecycle_between_tool_pair`：2.1.310 出 `high`，2.1.312 出 `low`） | 官方行为变化。`output_config.effort` 在客户端缺省时归原生（`nativeFields`），保持“交给原生”，不改支持模块；测试辅助的判定已按版本更新 |
| thinking-token-count 从模型 beta 表移到主查询里单独 push（第 3.1 节） | 官方客户端自己的 beta 顺序（2.1.310 在 interleaved-thinking 之后，2.1.312 在 mid-conversation-tool-changes 之后）；build 若不处理会给非 CC 请求加上这个 beta | 官方结构变化；补丁加 build 判断，出口与 v36 相同 |

离线回归 D1（同一个官方 2.1.310 客户端，基线 v36、候选 v38）在补上第 3.1 节之后剩下的差异只有原生渲染的环境段 `Shell: unknown` → `Shell: bash`（非 CC 请求注入的环境段、`worker` 来源的环境字段，共 39 个请求）：这是 `poo`/`moo` 的官方变化，规则文件用 `replace` 把候选侧的 `- Shell: bash\n` 换回再比较（证据见上表与 `artifacts/claude-2.1.312/diffs/chunk-j0tbz6ra.js_uao.diff`）。客户端自己的环境段两边都是 `unknown`，不受影响。

`cch`：用户决定保持 `00000` 占位、不处理（2026-10-30），本次没有分析官方运行时替换 `cch` 的位置与输入。

## 5. 会话记忆（cc_prev_req 与 turn 字段，新增）

用户要求：我们写的计费头与真实 CC 一致，补上 `cc_prev_req`，turn 字段不因客户端截断历史而回退；Worker 进程内存按（会话，线程）缓存，宁可少不可错。规则、启用与故意不做的情形写在 [CLAUDE-CODE-BILLING-AND-PROMPT-INJECTION](CLAUDE-CODE-BILLING-AND-PROMPT-INJECTION.md) 第 5 节，这里只记实现：

| 层 | 改动 |
|---|---|
| 契约 | 新能力 `build_session_state_v1`（`contracts/features/request_modes.go`）；`CCG_REQUEST_IDENTITY` 新增可选 `previous: {thread, request_id?, turn_position?, prompt_hash?}`；CLI 在 `--response-meta` 里写 `session: {thread, turn_position?, prompt_hash?}` |
| Worker | `engine/session_state.go`：进程内存 LRU（4096 条、闲置 24 小时），键 = 上游会话 + 线程（主线程或 `X-Claude-Code-Agent-Id`）；`attachSessionState` 只对客户端命名的会话使用记忆（派生会话被首条消息相同的对话共享，完全不用）、只在请求消息续接被记住请求的消息时交出 request-id、同一子代理线程并发时不交；`rememberSessionState` 只在 2xx 且 CLI 报告了同一线程时记住（request-id 取上游响应头 `request-id`）。`request_command.go`：接入点（`resolveRequestContext`、`runCLI`、`writeOutcome` 返回是否完整应答、meta 里读 `session`） |
| CLI | 新支持模块 `request-session.js`：`continueSession`（build：request-id 放到最后一条 assistant 记录的 `requestId`，turn 写回 prompt 记录的 `turnPosition`，原生 `mmr`/`f3o` 写字段）、`continueDirectSession`（direct：交给 `d2s` 的 `previousRequestId` 与 `turnPosition`）、`sessionTurn`（修正规则）。`request-identity.js` 校验 `previous`；`request-build.js`、`request-command.js` 只在客户端没带计费头时调用；`request-natives.js` 把 `previousRequestId` 交给原生；`native-environment.inc.js` 的 `ccgatewayPromptTurn` 另报 prompt 内容与是否为最后一条用户消息 |
| profile | 三个版本都加能力与支持模块；2.1.310、2.1.304 的标签随之升为 v39、v40（支持模块变了，旧标签的产物会与新源码不一致） |

测试：`test/request-session.test.mjs`（校验、完整历史、多轮工具循环、截断历史、同一输入重试、子代理线程、线程不符、direct）；`engine/session_state_test.go`（容量与过期、线程分开、子代理并发、失败不推进、续接判断、派生会话不用记忆、经 Worker 的完整流程、旧 CLI 不发字段）；离线回归新场景 `noncc-session`（首轮、第二轮、截断、tool_result 续发、另一会话、direct 两轮、派生会话两轮）与 `turn2-build-low` 的官方对照，断言在 `verify.cjs` 9b。

## 6. 编译与打包

本地补丁 → tar 传到 ovh `/tmp/ccg312/` → `oven/bun:1.4.4` 一次性容器里 `build.sh`（去 CR 后的副本，两个入口，`--compile --bytecode --format=esm`）→ `node:22-bookworm-slim` 容器里 `package-release.cjs`。产物 `release-v38/`：`manifest.json`（`2.1.312` → `2.1.312/claude`，SHA-256 `c66a1f05…9ddb`，补丁 `ccgateway-v38-cc-2-1-312`，modes build/direct）、`2.1.312/claude`（ELF 里两处 `Bun v1.4.4 (`）、`2.1.312/ccgateway-patch.json`。`--ccgateway-info` 报 2.1.312、v38 与 20 项能力；`--version` 为 `2.1.312 (Claude Code)`。本机副本在 `artifacts/claude-2.1.312/release-v38/`，并已放进 worktree 的 `cli-mods/release/`（不进 Git，`UPSTREAM_LICENSE.md` 保留）。

## 7. 验证

全部动态验证在 ovh 一次性容器里（`--network none`，`/tmp/ccg312/`），镜像 `ccgateway-app:0.1.113`；候选 CLI `c66a1f05…9ddb`，候选 Worker `271dcc17…307f`（本 worktree 的 engine 交叉编译）。

| 层 | 内容 | 结果 |
|---|---|---|
| 单测 + 原生对账 | `CCG_CLI_VERSION=<v> CCG_REQUIRE_ARTIFACTS=1 npm test`，2.1.312 / 2.1.310 / 2.1.304 各跑一遍 | 三版各 32 个文件、209/209，0 跳过，无 `CCG_NATIVE_TEST_SKIPPED` |
| 补丁器 | `patch-cli.cjs`、`anchor-hazards` | 成功；26 处替换文本逐字出现在产物里，无 `$` 模式 |
| 组装对账（L4） | `assembly-replay.cjs`，`assembly-cases-2.1.312.json` | 76/76，上游 64，验收门 `acceptance: pass`（v36 / 2.1.310 同条件 76/76） |
| 客户端来源 × 内容策略 | `client-content-cases-2.1.312.json` | 14/14 |
| 官方客户端实时转发（L6） | `live-official-client.cjs`，官方 2.1.312 | 10/10 |
| 官方抓包回放（L6） | `official-client-replay.cjs` | verified，0 失败 |
| 组件组合（L5） | `component-combination-replay.cjs` | 216/216 |
| Worker 策略矩阵（L7） | `worker-policy-matrix.cjs`，核心导出的矩阵（`cli_version` 换成 2.1.312） | passed，上游 98 |
| Go（Linux） | `golang:1.27-bookworm`：companions 全部（engine 等）、worker、contracts，`GOOS=linux go vet` | engine 等 245 过 0 败（16 个 SKIP 都是需要真实 CLI/ovh 的用例），contracts 59 过，worker 23 过；vet 通过 |
| 真实 CLI 用例 | `CCG_REAL_CLI` = 官方 2.1.312 / 2.1.310 跑 `^TestRealCLI` | 两版完全相同：6 过 5 败（资源管理 4 个 + 表面兼容 1 个，见第 9 节），非本次回归 |
| 断网资源回归 | `TestResourceManagementLinuxOfflineNetNone`（官方 2.1.312 / 2.1.310） | 两版通过/失败集合完全相同（24 败，原因同上），版本行 `2.1.312 (Claude Code); platform: linux` 与 SHA 核对通过 |
| 控制器 | `ccgateway-controller:0.1.113` 容器里 `python -m unittest discover -p 'test_*.py'` | 192 过 |
| TLS 指纹 | `test/e2e/tls-fingerprint.sh`：官方 2.1.310 / 2.1.312、线上 v36、候选 v38（direct 与 build 各两次） | **identical**：Messages 连接全部 JA4 `t13d1713h1_5b57614c22b0_7f527383e249`、JA3 `1523504b38f0fae0d881d4b6554aac1b`、ALPN `http/1.1`、签名算法与扩展顺序逐项相同；`tls-compare` 全部 "TLS identical"，请求头名只差请求本身是否带 beta / CC 计费头 |
| 官方请求对比（D0） | `capture-official.sh` 同镜像同脚本抓 2.1.310 与 2.1.312，`official-diff` | 3 处，全是官方变化（第 4 节）；2.1.310 重抓与仓库夹具 0 差异 |
| 离线回归：噪声 | 基线（v36）同一镜像两次 | 0 of 73 cases differ，148 个请求 |
| 离线回归 D1 | 同一个官方 2.1.310 客户端，基线 v36，候选 v38；规则：版本号两条 + Shell 一条（第 4 节） | 剩 3 个场景的差异，全部可解释：`plain-build-high`、`apikey-account-noncc-high`（高注入等级注入的 Bash 工具描述，官方改写）与 `noncc-session`（新场景，v38 写 `cc_prev_req` 与不回退的 turn，基线没有这个功能）；被规则隐藏的次数：UA 83、`cc_version` 80、Shell 46 |
| 离线回归 D2 | 官方 2.1.312 客户端经 v38；`crossversion` 对照基线 | 网关独有的差异只有：原生环境段 Shell（46 个请求）、注入的 Bash 描述（3 个）、`noncc-session` 的计费头（4 个），与 D1 一致；A 侧官方客户端自己的差异（Bash 描述、skill 列表、Shell）两边都有 |
| 定向断言 | `verify.cjs` | 候选：官方 2.1.310 客户端 1658/1658、官方 2.1.312 客户端 1662/1662；基线 v36 1654/1658，失败的 4 条正是 `noncc-session` 的会话记忆断言（v36 没有这个功能，预期如此） |
| 会话记忆 | `turn2-build-low` 与 `noncc-session` | 官方客户端（A）与经网关（B）的第二轮都带 `cc_prev_req=req_ccgaudit1`、`cc_turn_index=2`；网关写的头：second `cc_prev_req=req_ccgaudit1`/turn 2，shortened 无 `cc_prev_req`/turn 3（不回退），tool-result `cc_prev_req=req_ccgaudit3`/turn 3，另一会话 turn 1，direct 第二轮 `cc_prev_req=req_ccgaudit6`/turn 2，派生会话不用记忆；字段顺序与官方一致 |
| 其他 | `values`、`classify`、`conc`、`beta-check`、`capcheck`、`respmatch` | values 12/12；classify、conc 完成；beta-check 只有已知的 1 条（`apikey-account-client` 的登录 beta）；capcheck 148/149 条全部记录、正文一致、无泄漏；respmatch 全部配上 |

e2e 套件本身的两处修正（不影响基线可比性，基线用同一套件重跑）：假上游的非流式 JSON 回答原先不带 `request-id` 头（真实上游总带），已补上；新增 `noncc-session` 场景与 `verify.cjs` 9b。



## 8. 版本常量

插件内已改：`companions/worker/Dockerfile` 的 `ARG CLAUDE_VERSION=2.1.312`、`companions/controller/Dockerfile` 的 `ENV CCG_DEFAULT_CLI_VERSION=2.1.312`、`companions/worker/README.md` 的缺省值说明。控制器的迁移探针（`runtime_migration_probe.py`、`offline_migration_probe.py`、`offline_migrate_account.py`）写的是 2.1.302 → 2.1.304 的历史迁移与对应的固定 SHA，与当前版本无关，不改。

插件外需要合并时改（本次未动）：

| 文件 | 现值 | 改为 |
|---|---|---|
| `next/server/internal/ccgateway/cli_version.go` `PinnedCLIVersion` | `2.1.310` | `2.1.312` |
| `next/web/src/views/ccgateway/requestPolicy.ts` 默认 `cli_version` | `2.1.310` | `2.1.312` |

随之要重生成的契约夹具（核心与前端测试生成，插件里只有文件）：`companions/contracts/testdata/core-worker-policies.json`、`web-policy-payloads.json` 里的 `cli_version`（`CCG_UPDATE_CONTRACT_FIXTURES=1`，只有版本号变化）。

## 9. 手册、工具与要求里不对的地方

| 位置 | 问题 | 处理 |
|---|---|---|
| RUNBOOK §5.3、companions README "测试"、CLI-TEST-PLAN | "`TestRealCLIResource*` 与 `TestResourceManagementLinuxOfflineNetNone` 用新版官方 CLI 跑"已不可行：v34（0.1.108）起资源管理走定制 CLI 的 `claude ccgateway-mgmt`，官方 CLI 没有这个命令，这些用例在官方 2.1.310 与 2.1.312 上都以 "resource management call was refused by the CLI" 失败（两版失败集合完全相同，所以不是本次回归）；而定制 CLI 的 `auth status` 不退出，也不能直接换成定制 CLI | 手册改为如实说明，用例本身需要另行改造（不在本次范围） |
| RUNBOOK §1 | 下载样板 `acquire.py` 在本机用 `py -I` 跑会因 Python 启动失败（`No module named 'encodings'`），去掉 `-I` 才行 | 手册注明 |
| RUNBOOK §3.2b | `carry-profile` 不产出 `modules`；新 profile 的 `modules` 要按"旧绑定模块 → 新版里装着其大部分单元的模块"映射后重算哈希，只做再导出的模块（如 `setEntrypointOnRequests`、`loadFastPathPolicy` 所在）没有单元，要按 natives 的去向映射 | 手册补上 |
| RUNBOOK §3.4 | 没提醒：官方若把某个 beta 从模型表挪到主查询（我们替换模型表那一行之后），build 会开始给非 CC 请求加它（本次的 thinking-token-count）；只看 equiv 的 changed/same 发现不了，离线回归的 beta 差异才暴露 | 手册"常见坑"补上，并给出检查办法（列出主查询里模型表之后的 beta push） |
| RUNBOOK "常见坑" | 在 Git Bash 里跑 `TestResourceManagementLinuxOfflineNetNone` 时，`CCG_LINUX_RESOURCE_*` 里的 Linux 路径会被改写成 Windows 路径（`invalid volume specification`），要设 `MSYS_NO_PATHCONV=1 MSYS2_ENV_CONV_EXCL='*'` | 手册补上 |
| 任务要求"新标签用 `ccgateway-v37-...`" | v37 已被 2.1.304 的 `ccgateway-v37-content-guard`（提交 3dcaddfd0）占用，序号跨版本连续，所以用 v38 | 用 v38 |
| 任务要求"从主仓库复制 `cli-mods/release/`（manifest.json + 2.1.310/）" | 主仓库的 `cli-mods/release/` 实际是 10-20 的旧产物（2.1.302 + 2.1.304，manifest 只有这两版），没有 2.1.310；线上 v36 的 release 在 ovh `~/sup2api/release-ccgateway-0.1.113/…/cli-mods/release/`。镜像构建要的是 `CLAUDE_VERSION` 对应版本的 release，本次放的是新的 2.1.312 / v38 | worktree 的 `release/` 放 v38 |
| CLI-TEST-PLAN §2.9 / e2e README | 场景数写的是 69 / 122，现行套件是 72 个场景、139 个上游请求（本次加 `noncc-session` 后 73 / 146） | e2e README 更新 |
