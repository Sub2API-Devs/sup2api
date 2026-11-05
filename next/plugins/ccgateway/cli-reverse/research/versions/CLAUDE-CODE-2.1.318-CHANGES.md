# Claude Code 2.1.316 → 2.1.318 变化清单

2026-11-05，cli-reverse 升级到 2.1.318 时整理（过程见 [`docs/process/upgrade-318.md`](../../docs/process/upgrade-318.md)）。本文只记**官方 CLI 本身的变化**；定制 CLI 怎么移植，见 sup2api 的 `next/plugins/ccgateway/docs/CLAUDE-CODE-2.1.318-MIGRATION.md`（主线程写），以及 sup2api `artifacts/claude-2.1.318/review/` 里的审查报告：`g1-query.md`（主查询与请求构建器）、`g2-core.md`（核心其余补丁点）、`sp-spec.md`（工具清单头规格）。

文中的名字分两种：`2.1.318 阅读树名`（本目录 `reconstructed/`）和 `文件:压缩名`（官方构建里的压缩名）。316 的压缩名写成 `316 文件:名`。

| 项 | 2.1.316 | 2.1.318 |
|---|---|---|
| manifest | commit `cd7ceb45…`，2026-10-30T23:47:48Z | commit `ca1fa9dea62c1027756786c841c548788644560d`，2026-11-03T19:21:35Z |
| linux-x64 ELF | `fd13c700…d824`，328,262,000 字节 | `708c77b204db30086ff6f1ed34577bda03e1be74ced80557cbf7b54249ebf0bd`，337,814,032 字节 |
| 内嵌 Bun | 1.4.4，修订 `71c9bf0ca` | 1.4.4，修订 `424a542a9`；runtimeVersion 仍为 v26.12.1 |
| 还原 | 2,880 个模块 / 2,648 个 JS | 3,100 个模块 / 2,857 个 JS，unresolved 为空 |
| 顶层声明 | 81,667 | 84,503 |
| 模块级单元（equiv） | 100,792 | 104,496 |
| 第三方 | 255 个 npm 包 | 257 个（新增 `@babel/runtime` 7.29.10、`@protobufjs/aspromise` 1.1.2，其余版本不变） |

官方最小请求：在断网容器里各抓一次 316 和 318，`official-diff` 0 差异（版本号、指纹、cch、日期先规范化）。下面列的变化都出现在这个最小请求之外。

## 0. 数据怎么来的

- 配对：`tools/versions/equiv.cjs`（带 cli-mods 种子），配上 96,886 个单元（same 94,629、changed 2,257）。`tools/versions/carry-names.mjs` 在此基础上做回退配对，最终 316 的 102,279 个单元（含不声明绑定的顶层语句）里 same 99,174、changed 2,675、冲突 220、没配上 210。配对表：`artifacts/versions/carry-316-318-pairs.jsonl`。
- 逐单元的变化：`tools/versions/changes.mjs` → `artifacts/versions/changes-316-318.jsonl`（不入库）。每行一个 changed / removed / added 单元，带两边的阅读树名、路径，以及新增、消失的字符串、属性名、全局名。
  - 一方代码：changed 2,371、added 3,903、removed 206。第三方：changed 297、added 9、removed 2。
  - **removed 不等于删掉了**。它表示 316 的单元在 318 里没配上对象，多数是重写过的函数，抽查的字符串在 318 里都还在（`/goal` 的用法提示、`/security-review` 的说明、compact 基础提示词、`resources/directory/read`……）。真正删掉的见第 1.3 节。
  - added 里有约 1,900 个单元落在阅读树的 `_unattributed/`、`_new/` 下，是 318 新增、还没归到源文件的代码，放置完成后路径会变。
- 全树字面量集合（请求头、beta、环境变量、开关、API 路径）：一次性脚本 `artifacts/tmp/upgrade-318/changes/sets.mjs`，结果在第 2 节。

查某个函数：`node tools/q.mjs find <名字>`；查 316 → 318 的配对：`grep '"old":"<316 文件:压缩名>"' artifacts/versions/carry-316-318-pairs.jsonl`。

## 1. 影响请求的变化（逐条）

### 1.1 请求组装与请求体

| 变化 | 位置 | 说明 |
|---|---|---|
| 新 beta `program-use-case-ids-2026-09-17` 和请求体字段 `program_use_case_id` | 模型 beta 表、`queryModel`（`chunk-5xgkngpb.js:Z_n`，316 `e_n`）里模型表那一行之后，用展开赋值 `It=[...It,dR]` 追加；请求构建器 `VJn`（316 `g5n`）；`getExtraBodyParams`（`zRt`）会删掉 `CLAUDE_CODE_EXTRA_BODY` 里的同名字段 | 值取自 `Pue()`：环境变量 `CLAUDE_CODE_PROGRAM_USE_CASE_ID` / `CLAUDE_CODE_PROGRAM_USE_CASE_STAMPED`、开关 `tengu_federated_possum` / `tengu_greedy_mountain`、账号凭证槽里的 `programUseCaseId`。bootstrap 接口（`fetchBootstrapAPI`、`BOOTSTRAP_RESPONSE_SCHEMA`）新增 `program_use_cases`、`program_use_case_default_id`、`program_use_case_choice`。发请求后新增 3 个处理拒绝的重试分支（`retry:program-use-case…`），对应错误码 `program_use_case_not_held`。**这个 beta 不是用 `.push(常量)` 加进去的，只扫 push 的检查发现不了**（g1 报告第 4 节） |
| 新 beta `tool-provenance-2026-10-26`（`TN`）和 `ownership_metadata` | 模型表、构建器（按 provider 删除）、新的消息后处理 `Xgn`（排在消息规整 `nRr`（316 `YSr`）之后），给 `tool_addition` 块写 `ownership_metadata` | `promptCacheBreakDetection` 的请求快照（`snapshotRequestForCacheDiff`）也开始记录 `context_management` 和 `ownership_metadata`。内部 latch `x-cc-internal-tool-provenance-server-url` 只是进程内标记，不作为请求头发出 |
| 新 beta `claude-code-side-query-2026-09-29`（`zHe`） | 构建器对 beta 列表的第 2 处 push | 只在特定 querySource 下或传了 `sendSideQueryBeta` 时才加；新 querySource `resume_cache_warm` 也会加它和 `PG` |
| 构建器 beta 列表 | `VJn` 的 `Pi`（316 `Os`） | 去重后 13 个标识符：316 的 12 个，头值和顺序都不变，新增 `zHe` 排在第 2 位 |
| 消息规整入口多一个参数 | `normalizeMessagesForRequest`（`X_n(e,n,r)`，316 `Qyn(e,n)`） | 第三个参数是规整各阶段的计时回调；新选项 `projectDocsAsRound`（压缩时把项目文档当作一轮）、`mediaTakenOut`、`perTurnParent`；返回对象的 8 个字段不变 |
| 新的查询选项 | `queryModel` | `continuesInterruptedWork`、`isEffortPinned`、`leavesLimitStateAlone`、`modelIsFallbackForThisTurn`、`noServerToolCalls`（强制 `tool_choice: none`）、`onWrittenPdfReadSent`、`sendSideQueryBeta`。不传时行为与 316 相同 |
| 每轮 effort | `perTurnEffortLevels`、新 `jhn` / `Whn` | 支持固定的 effort（`isEffortPinned` 配合 `forkPointUuid`），fork 时沿用父会话那一轮的 effort |
| 1 小时缓存 TTL | `should1hCacheTTL` | `resume_cache_warm`、`sdk` 两个 querySource 也算 |
| 恢复会话预热缓存（新） | querySource `resume_cache_warm`，环境变量 `CLAUDE_CODE_RESUME_CACHE_WARM`；`StreamFallbackWarning` 新增 `cacheWarm`、`inFlight` | `--resume` 时先发一次请求把缓存预热，主请求可以等它（`holdCapMs`、`hold_cap_reached`、`warm_done` …） |
| 增量请求体 / gzip 分块 | `checkIncrementalRequestBody`、`prepareGzipRequestBody`、`splitBodyBlocks`、`BODY_SPLIT_MARKERS` | 子代理的请求体单独缓存（`keptSubagentBodies`）；分块点新增 `,"metadata":{"user_id":"` 和"工具定义末尾"（`cutNearToolsEnd`，开关 `tengu_starry_crescent`）。这些都只影响压缩与复用，发出的 JSON 不变 |
| 请求过大时去掉媒体 | `stripExcessMediaItems`、`mediaRemovedPlaceholder`、`getAssistantMessageFromError` | 占位文字 `[media removed: request limit]` 删除；超尺寸图片的提示改为根据实际限制给出（不再写死 2000px），并建议 `/compact` 或开新会话 |

### 1.2 请求头与传输

| 变化 | 位置 | 说明 |
|---|---|---|
| 工具清单头 `x-claude-code-sandy-plover` 改了格式 | `buildFetch`（`chunk-vn3g7zt8.js:XS`，316 `chunk-hwmsct5x.js:bw`）；序列化 `Nf → If → Dy → Ff`（316 `encodeToolsUsedHeader` / `toolsUsedHeaderBuilder`） | 316 就有这个头，而且已经是 `[{"name":…}]` 数组，规则也相同：常用内置工具挪到最后，最多 64 项、7,168 个字符，截断时把 `{"name":"unreadable-tools-used-before-summary"}` 放在第一位（316 `ey`/`ff`）。318 的序列化输入从名字列表改成对象列表：MCP 标准键改名（`tengu_marlin_thicket`，默认关）打开时，连接器工具的元素会多带 `url` / `directory_entry` / `unresolved` 三个字段；默认关时输出与 316 相同。另外新增遥测 `tengu_tools_used_header_size`，截断提示改为只报一次。值是会话级"用过的工具"集合，每次全量发送，并且会覆盖请求里原有的同名头。完整规格和 30 条实跑向量见 sup2api `artifacts/claude-2.1.318/review/sp-spec.md` |
| 客户端工厂 | `getAnthropicClient`（`chunk-vn3g7zt8.js:uF`，316 `MN`） | 新增 `sessionOwnerHold`（`session_owner`：另一个会话持有登录时的等待与报错）；末尾"重读凭证、凭证变了就重建客户端"那段逻辑与 316 相同 |
| 字节空闲看门狗 | `withByteIdleWatchdog`（`VS`） | 新增 `rearm_slack_ms`，环境变量 `CLAUDE_CODE_STREAM_TIMER_SLACK_MS` |
| CCS 发送方地址 | `attachSenderAddress` | 多记录 `turnStartedAt`、`country` |
| 新错误类型 `RouteTurnedAwayError` | 新单元 `Tl`；`formatAPIError`、`classifyAttemptError` | "the request was turned away before any work was done on it"，带 `retryAfter`；显示为 "The API is temporarily unavailable"，分类为 `turnedAwayOverloaded` |
| 新错误分类 `network_edge_blocked` | `classifyAPIError`、`getAssistantMessageFromError`、`logAPIError`；新单元 `M9e` 判断 403 且 `error.type === "forbidden"` 并带 `nonorigin_cf` | 显示 "Request blocked before it reached Anthropic's API (HTTP 403) · the network this request …"，表示请求在到达 API 之前就被网络边缘拦下 |
| 工具调用块被截断 | 新常量 `TOOL_USE_BLOCK_CUT_OFF`（`tool_use_block_cut_off`）；`logAPIError` 的 "API tool-call block cut off:" | 流式里工具调用块不完整时单独记录 |
| 远程会话传输 | `SSETransport`、`CCRClient`、`WorkerStateUploader` | SSE 增加进程睡眠检测（`onProcessSlept`），"no frame within the liveness timeout, or the process slept"，并在新的 socket 上重连；CCR 客户端增加整文件扣留、事件 POST 限速与持续失败的处理、keep-alive 单独发送 |
| CCR 请求头 | — | 新增 `x-ccr-gmail-attachments`、`x-ccr-tool-container-host-draining`；删除 `x-ccr-ticket-mcp`。只用于远程会话与工具容器，不出现在 Messages 请求里 |

### 1.3 提示词

| 变化 | 位置 | 说明 |
|---|---|---|
| `original_games` 段改写 | 默认系统提示词（`igr`，316 `dan`） | 改为 "Do build original games, games in a genre or with similar mechanics, … Don't build a recreation of a specific existing game (its name, characters, art, music, levels or look) …"。开关与 316 相同（`original_games_guidance`：模型 client data 打开，或带 opus 5.5 提示词包） |
| REPL / 脚本模式（新，默认关） | `getReplWorkingSection`（`bhr`）、`getSessionSpecificGuidanceSection`、`getSessionGuidanceFacts` | 新段 "Few, full scripts: …"；Skill 多一个 `script` 选项（"When the user types `/<skill-name>`, invoke it with `tools.Skill` from a script…"）。都受 `isReplMode` 控制，而它在 318 里只有 `ae()` 为真时才可能为真；`ae()` 默认 false。相关环境变量 `CLAUDE_CODE_EXPERIMENTAL_CODE_MODE*`，开关 `tengu_repl_*`（约 30 个） |
| compact 提示词 | `getCompactPrompt`（`zte`，316 `Fee`）；删除了 `COMPACT_PROMPT_ARMS`、`COMPACT_PROMPT_VARIANTS`、`buildLeanCompactPrompt` | 316 按实验分组选提示词变体（control / no_scratchpad / no_scratchpad_capped），318 去掉了变体表，改为看提示词文本里有没有 `<analysis>`，没有就要求 "a `<summary>` block"（`pcr`）。压缩失败新增原因 `no_summary_block`。压缩后的说明（`buildCompactArtifactNote`）重写，并在摘要包含 Remote Control 会话的文字时加一段说明 |
| 子代理被安全机制停止 | AgentTool（新单元 `ir`） | "Safeguards stopped this agent." 及后续指引；`cyber` 类别会提到 Cyber Verification Program 的 Defense Access。主线程的拒绝回退（`buildRefusalFallbackSystemMessage`）新增 `apiRefusalCyberVerification` |
| 附件文字 | `utils/messages.ts`、`generateFileAttachment` | 新增附件被删除时的提示（"A file that was attached earlier in this chat was deleted just before this message…"）；PDF 读取的撤回（`message_pdf_reads`、`message_pdf_withdrawn`）；文件附件多一个 `savedCopyFraming` |

### 1.4 计费头与身份（**没有变化**）

- 计费头构建 `chunk-7pwjpdkw.js:tyi`（316 `JXs`）、计费前缀 `yct`、`isBillingHeader` `DAi`、计费指纹 `chunk-7jxyna5q.js:Wwi`（316 `Vei`）：equiv 判为 same。盐 `59cf53e54c78`、下标 4/7/20、`sha256` 取前 3 位都不变，`cc_version` 指纹仍是 `sha256(盐 + 采样 + "2.1.318")[0:3]`。
- 身份行 `tcr`/`ecr`（316 `p7n`/`f7n`）、`requestIdentity` `f3e`、`mainAgentContext`、`modelBetas`、`betasAllowed`、`oauthBeta`、`querySourceFor`：全部 same。
- 默认工具池 `vGt`（316 `qNt`）本身是 same，没有新增默认工具。工具定义的变化见 1.5。

### 1.5 工具

| 工具 | 变化 |
|---|---|
| Bash | 权限检查新增：`rm` 系列（`/bin/rm`、`/usr/bin/rm`）单独处理；在文本里找到规则（`tengu_bash_rule_found_in_text`）；后台 worktree 守卫加 rsync（`RSYNC_RSH`）、ssh（`-F` 路径、jump host、用户名、带引号的选项名）等能把文本交给远端 shell 的参数检查；编辑 diff 快照（`bash_edit_diff`，开关 `tengu_humble_hartmanis`、`tengu_quiet_sextant`）；结果读取方不明时不保留原始输出 |
| Artifact | 发布范围（`outside_audience`、`NOT_PUBLIC_BY_THE_SERVERS_MARK`）；读回别人写的文档、数据库行时不存成文件；新动作 `publish_files`、`copy_file`、`create_from_type`；quickstart 按套餐（pro/max/team/enterprise）区分 |
| WebFetch | 结果可以作为可引用的 `search_result` 返回（开关 `tengu_eventual_aho`、`tengu_proud_flurry_enabled`）；只覆盖页面一部分时附带说明 |
| SendMessage | 投递转发（`send_message_delivery_forward`）；发送时说明消息要等哪一轮 |
| Agent | 团队名解析 `resolveTeamName`；交还报告（`handbackReport`）；安全机制停止的说明（见 1.3） |
| MCP 工具 | Gmail 附件、Drive 下载的保存与读取（`tengu_mcp_gmail_*`、`tengu_mcp_drive_download_*` 共 15 个事件）；标准键改名（`mcp_standard_key`、`server_key_moved`、`resumed_on_shared_key`）；条目缺少服务器名或工具名时不提供给模型（`mcp_malformed_entry_withheld`） |

### 1.6 认证与登录

| 变化 | 位置 |
|---|---|
| 登录过期的文案改为"到时间上限"：`LOGIN_EXPIRED_MESSAGE` 从 "Login expired · Please run /login" 改成 "Login reached its time limit · Please run /login"；新增 "Failed to authenticate: this login reached its time limit and cannot be renewed. Run `claude …`"、"… · Sign in again to continue"；旧的 "Login expired" 仍作为另一个常量保留 | `services/api/errors.ts` |
| `OAuthRefreshDeadError` 多了 `reachedTimeLimit`；`TERMINAL_REFRESH_ERRORS` 去掉 "Refresh token expired" | `services/oauth/` |
| `claude auth status` 输出 `loginExpiresAt` / `credential_expires_at` | `authStatus` |
| 登录 / 登出保留已存的登录（`keepStoredLogin`、`departingLoginMayRemain`）；配置文件写不进去时报 "logout could not save the config file"、"A sign-in could not take the last account or API key off the config file." | `authLogin`、`authLogout`、`installOAuthTokens`、`saveLoginOrWarn` |
| 会话所有者：另一个会话持有登录时，客户端等待或报错（`session_owner`），会话存储能区分"当前账号 / 另一个组织"，并能把会话复制到另一个账号（"Continuing this conversation in a new account shares its history …"） | `getAnthropicClient`、`utils/sessionStorage.ts`、`screens/repl` |
| Azure 凭证错误：`getCloudCredentialErrorProvider` 认 `CLAUDE_CODE_USE_FOUNDRY`；新增 Azure 身份库错误名集合（`CredentialUnavailableError`、`AuthenticationError` …） | `services/api/errors.ts` |

## 2. 全树字面量集合

| 类别 | 316 | 318 | 新增 | 删除 |
|---|---|---|---|---|
| 请求头（`x-*`、`anthropic-*`） | 333 | 335 | `x-cc-internal-tool-provenance-server-url`、`x-ccr-gmail-attachments`、`x-ccr-tool-container-host-draining` | `x-ccr-ticket-mcp` |
| beta 头值 | 52 | 55 | `claude-code-side-query-2026-09-29`、`program-use-case-ids-2026-09-17`、`tool-provenance-2026-10-26` | — |
| API 路径 | 150 | 155 | `/api/cowork/widgets_mcp`、`/api/frame/artifacts`、`/api/mcp/claude_ai`、`/v1/code/mcp/cowork`、`/v1/organizations/analytics/cost` | — |
| 环境变量 | 1,254 | 1,289 | 37 个（下面列出） | `CLAUDE_CODE_LAZY_ENV_GETTERS` |
| `tengu_*` 开关与事件 | 3,352 | 3,498 | 158 | 12 |

新增的环境变量：`CLAUDE_CODE_AUTO_MODE_THREAD_ASK_OWN_WORK`、`CLAUDE_CODE_CCR_SLOW_SKILLS_WATCH`、`CLAUDE_CODE_CONFIG_LOCK_WAIT_MS`、`CLAUDE_CODE_DEEP_TWILIGHT`、`CLAUDE_CODE_DISABLE_AGENT_PROGRESS_SUMMARIES`、`CLAUDE_CODE_DISABLE_MCP_TASKS`、`CLAUDE_CODE_DISABLE_NESTED_SESSION_ID`、`CLAUDE_CODE_DISABLE_STOP_OF_HELD_MESSAGES`、`CLAUDE_CODE_DISABLE_SUBAGENT_HANDBACK`、`CLAUDE_CODE_DISABLE_TRANSCRIPT_READ_AHEAD`、`CLAUDE_CODE_ENABLE_WRAP_UP`、`CLAUDE_CODE_EXPERIMENTAL_CODE_MODE`（及 `_RESTART`、`_RESTARTED_FROM`）、`CLAUDE_CODE_FIZZY_GROVE`、`CLAUDE_CODE_HOST_SHORT_TEMP_DIRS`、`CLAUDE_CODE_MAIN_REPLY_HOLD_MS`、`CLAUDE_CODE_MCP_SERVE_TUNNEL_BINARY_FRAMES`、`CLAUDE_CODE_PERSONAL_HOOKS_OFF`、`CLAUDE_CODE_PLAIN_DELTA_DIRECT_WRITE`、`CLAUDE_CODE_PLAIN_DELTA_TAKE_AT_SOURCE`、`CLAUDE_CODE_PROGRAM_USE_CASE_ID`、`CLAUDE_CODE_PROGRAM_USE_CASE_STAMPED`、`CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS`、`CLAUDE_CODE_REMOTE_STALL_CHECK_INTERVAL_MS`、`CLAUDE_CODE_REPLY_GATE_POLICY`、`CLAUDE_CODE_RESUME_CACHE_WARM`、`CLAUDE_CODE_SPARE_KEEPS_BOOT_SESSION_ID`、`CLAUDE_CODE_STREAM_TIMER_SLACK_MS`、`CLAUDE_CODE_TELEPORT_MOVE`、`CLAUDE_CODE_ULTRAREVIEW_LAUNCH_RECORD`、`CLAUDE_RUNNER_SPAWN_REASON`、`MCP_INNER_TOOL_ERROR_NAME`、`OTEL_EXPORTER_OTLP_{LOGS,METRICS,TRACES}_TIMEOUT`。

删除的开关：`tengu_ccr_plugin_refresh_in_idle_enabled`、`tengu_file_read_dedup`、`tengu_read_dedup_killswitch`、`tengu_hushed_wren`、`tengu_maple_ferry`、`tengu_recursive_lobster`、`tengu_snug_mitten`、`tengu_spicy_pearl`、`tengu_tidy_lemon`、`tengu_tidy_origami`、`tengu_velvet_possum`、`tengu_wobbly_petal`（子代理摘要的 fork 策略）。

界面上可见的一处：/exit 后的恢复提示会带上启动参数，例如 `claude --permission-mode default --resume <id>`（316 是 `claude --resume <id>`）。相关的新代码有：退出处理类的 `resumeHintLaunchFlags` 字段，以及重启时传参数用的环境变量 `CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS`。本目录的运行对拍场景已经按这个改了期望（`tools/verify/scenarios.mjs` 的 `RESUME_HINT`）。

## 3. 其余变化按子系统汇总

按"新增 + 改动的规范形 token 数"排序，取前 40 个子系统（路径是 2.1.318 阅读树的路径，`_unattributed`、`_new` 是还没放置的新代码）。"主题"是从新增字符串里归纳的。

> 2026-11-06 补充：放置批次合并后重跑 `changes.mjs`，`_unattributed` / `_new` 里的约 1,900 个新单元都已归到子系统。下表的"增"一列是放置之前的数，偏小，变化最大的几处如下：`tools/REPLTool` 增 454 个（2.1.318 新增的 REPL / 脚本执行工具，`asyncEval`、`runScript`、`mcpTools`、`scriptChecks` 等 30 多个文件，默认关，见 1.3 节）；`services/mcp` 增 214；`services/api` 增 179；`utils/permissions` 增 139；`utils/hooks` 增 87；`services/selfHostedRunner` 增 71；`services/artifacts` 增 64。changed / removed 两列不变。

| 子系统 | 改 | 增 | 删 | 主题 |
|---|---|---|---|---|
| `tools/ArtifactTool`、`services/artifacts` | 63 | 28 | 2 | 发布范围与对外可见、读回他人内容不落盘、列表分页失败处理 |
| `services/mcp` | 148 | 125 | 23 | 连接器变更通知、claude.ai 代理、HTTP body 溢出、连接关闭、附件留在对话里、Gmail / Drive 文件 |
| `cli/print.ts`、`cli/print` | 86 | 72 | 6 | headless 插件副本复检、宿主已经提供的插件服务器不再重复加载、PDF 读取记录、空闲后台、REPL 工具调用、录制的代理恢复计数 |
| `services/api` | 85 | 134 | 5 | 见第 1.1、1.2 节 |
| `screens/repl` | 31 | 20 | 1 | 复制会话到另一个账号、左箭头被拦截提示 |
| `utils/permissions`、`components/permissions` | 110 | 110 | 2 | 规则写入失败、路径里有符号链接、不接受规则的工具、计划模式退出后恢复自动模式、分类器放行 |
| `cli/transports` | 8 | 17 | 4 | 见第 1.2 节；SDK 状态事件 `system/status_requesting_*` |
| `tools/AgentTool`、`tools/SendMessageTool` | 30 | 12 | 0 | 见第 1.5 节 |
| `services/selfHostedRunner` | 9 | 35 | 1 | 自托管 runner：起始目录、每会话目录（非 Linux / 被脚本占用时的回退）、轮次结束延后 |
| `services/claudeGateway` | 15 | 15 | 0 | 网关成本报告参数（`starting_at`、`time_bucket_width`、`actor_ids[]` …）、Bedrock Mantle 的 `assume_role`、OIDC userinfo 回退、按 IdP 组统计花费 |
| `remote/tools`、`services/remoteTools` | 57 | 52 | 0 | 远程工具服务：会话太旧、设备策略、协议不支持；REPL 里可调用 |
| `tools/BashTool` | 38 | 89 | 0 | 见第 1.5 节 |
| `services/analytics` | 18 | 3 | 1 | 新遥测字段：bash 命令种类与程序、配置缺失读取、磁盘满退出 |
| `commands/plugin`、`utils/plugins` | 52 | 14 | 2 | MCP / LSP 服务器路径必须是插件目录内的相对路径（拒绝绝对路径和 `..`）；文件夹插件跟随 setting sources |
| `utils/hooks`、`utils/hooks.ts`、`plugins/functionHooks` | 100 | 104 | 1 | 钩子输入写入失败、输出太长截断、csh/tcsh 钩子无法核验、`plainOutputIsContext`；函数钩子新增 `ui.backdrop`、`tool.describe`、带 effort 的 prompt |
| `utils/sessionStorage.ts` | 26 | 20 | 1 | 会话所有者、另一个组织的会话、账号切换（`tengu_bubbly_fountain`、`tengu_modular_sparkle`） |
| `entrypoints/sdk`、`@anthropic-ai/claude-agent-sdk` | 36 | 9 | 1 | SDK：`reload_plugins`、钩子 `onFailure: "block"` 的确认、`/diff` 工作区差异请求、受管设置来源、UTF-8 读取标记 |
| `components/fleet` | 16 | 1 | 0 | ctrl+x 两次停止 |
| `services/tools` | 18 | 18 | 0 | 用户中断的工具调用结果文案（"The user stopped this call."）、claude.ai artifact 链接 |
| `utils/messages.ts`、`utils/messages` | 44 | 23 | 2 | 见第 1.3 节 |
| `query.ts`、`QueryEngine.ts` | 16 | 14 | 0 | 子代理设置关闭、PDF 撤回、畸形 tool_use 用尽、空消息重发；桥接附件撤回、关键 system-reminder |
| `main.tsx` | 5 | 4 | 0 | 回复闸门策略 `CLAUDE_CODE_REPLY_GATE_POLICY` |
| `services/compact` | 31 | 19 | 12 | 见第 1.3 节；自动压缩失败熔断（`failure_breaker_open`、`rapid_refill`）、空闲清理工具结果的实测 token |
| `utils/sandbox` | 22 | 24 | 0 | 沙箱新增 deny 规则、`.claude-sandbox-noreplace`（开关 `tengu_quiet_medlar`、`tengu_serene_flurry`、`tengu_riveted_lantern`） |
| `utils/settings` | 13 | 9 | 0 | 设置文件监视生效之前就已改动的检测 |
| `services/memorySync` | 11 | 11 | 0 | 多存储同步、按名删除的确认 |
| `components/PromptInput`、`components/messages` | 37 | 23 | 5 | "thinking always on for this model"、detach（会话继续运行）、运行中工具提示渲染出错 |
| `bridge/*` | 约 10 | 约 30 | 3 | Remote Control 启动它的程序文件被更新删掉时的处理、worktree 状态、项目回复闸门重写 |
| `services/tips` | 4 | 14 | 0 | Claude Security 插件提示 |
| `utils/model` | 4 | 3 | 0 | 模型目录、遮蔽 id；文件类型表新增 editorconfig、safetensors、webmanifest 等扩展名 |
| `hooks/useRemoteSession.ts`、`hooks/useReplBridge.tsx` | 2 | 27 | 0 | 云会话启动失败时已发出的消息保留在会话里 |

第三方：包版本都没变。`@modelcontextprotocol/core` 的 175 个 changed 单元，是 zod schema 被包进 `j(()=>…)`（一个 `new Proxy({build, schema})` 懒求值包装）；`@grpc/grpc-js` 的 65 个、`protobufjs` 的 25 个只差 Bun 运行时助手的名字（`x` → `I`）。gRPC 那个 chunk 里有直接 `eval`，作用域分析把助手当成了全局名，所以显示为 changed。

## 4. 复现

```bash
node --max-old-space-size=12000 tools/versions/carry-names.mjs --old-tree artifacts/versions/2.1.316-original --new-tree original --equiv <equiv-316-318.json> --old-naming artifacts/versions/2.1.316-naming --out naming --old-scan artifacts/versions/2.1.316-analysis/scan/decls.jsonl --new-scan analysis/scan/decls.jsonl --report artifacts/versions/carry-316-318.json --carry-conflicts same
```

```bash
node --max-old-space-size=8000 tools/versions/changes.mjs --old-tree artifacts/versions/2.1.316-original --new-tree original --pairs artifacts/versions/carry-316-318-pairs.jsonl --old-names artifacts/versions/2.1.316-naming/final/top.json --new-names naming/final/top.json --old-paths artifacts/versions/2.1.316-analysis/segments/decl-path.jsonl --new-paths analysis/segments/decl-path.jsonl --old-scan artifacts/versions/2.1.316-analysis/scan/decls.jsonl --new-scan analysis/scan/decls.jsonl --out artifacts/versions/changes-316-318.jsonl
```

第 3 节的数字用的是放置批次完成之前的阅读树路径。批次合并后重新运行 `changes.mjs`，`_unattributed` / `_new` 那两行会分摊到各个子系统。
