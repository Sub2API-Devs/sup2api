# CC 请求注入等级：0 / 微 / 低 / 高

2026-10-23 用户提出并确认，取代 [CC-REQUEST-LEVELS-DESIGN](CC-REQUEST-LEVELS-DESIGN.md) 第 7 节的「非 CC 请求补充」。第 8 节是用户的决定。

依据：
- 2.1.304 bundle 的 AST 分析（工具同 `artifacts/claude-2.1.304/prompt-ast/`）；
- 官方 2.1.304 的实抓请求（`prompt-ast/cap-official`、`cap-sonnet`）；
- 现有配置链路的梳理（第 9 节）。

## 1. 用户的模型

| 等级 | 包含的层 | 模式 |
|---|---|---|
| 0 注入 | 计费头 | direct：只处理开头的计费头，其余逐字节不动 |
| 微注入 | 计费头、身份行 | build |
| 低注入 | 微注入 + 环境（附件转换，缺的首轮附件补上） | build |
| 高注入 | 低注入 + 内置系统提示词 + CC 常用工具（管理员选） | build |

- 每一层：**客户端带了就保留**（按配置转换字段），**没带就按规则注入**。
- 等级就是模板：选等级决定哪些层生效，每层的细节单独配置。前端直接配置“补不补”和“用客户端还是服务端的值”。
- 「非 CC 请求补充」卡片去掉，`relay_mode` 不再单独选，由等级决定（0 → direct，其余 → build）。

## 2. 每层：怎么判断“已有”，没有时补什么（AST 核对）

“CC 请求”指 system 任一块里有计费头行（现有 `hasBilling`）。

- **CC 请求只做转换，不注入第 3–5 层。** CC 自己的辅助请求（标题生成、分类器、hook 等）本来就没有内置提示词和工具，给它们补反而不像 CC。
- **逐层判断只用于非 CC 请求。** “cc 情况下正常工作”就是这个意思：CC 请求里各层本来就齐。
- **身份行：** 微注入起，没有计费头的请求缺身份行时自适应补一句（第 8 节决定 4），不可配置；带计费头的 CC 请求不补（第 12 节）。

| 层 | 已有的判断（全部用原生文字） | 已有时 | 没有时（等级够） |
|---|---|---|---|
| 1 计费头 | `hasBilling`（`oJe` 开头的行） | `cc_version`、`cc_entrypoint` 按「客户端／服务端」转换 | 补**主线程**形状的头（第 3 节） |
| 2 身份行 | system 某块整块等于 `n1n` 三句之一（`t1n`） | 保留 | 按计费头入口自适应补一句（第 8 节决定 4） |
| 3 环境 | 消息里的环境附件：`zkt` 两行开头（`# Environment` + `You have been invoked…`）；只认消息载体（system 轮、reminder），因为动态段 `Qrr` 也用 `# Environment` 标题 | 十个字段按「客户端／服务端／擦除」转换（现有） | 补原生环境附件；另可选补 model、total_tokens、date（各自按开头判断：`Eoo2`、`<total_tokens>`、`fSt2`） |
| 4 内置提示词 | system 里有安全段 `p4n` 全文（只被主提示词三种开头引用），或子代理段 `T7t` | 保留 | `wx(最终工具, 模型)` 渲染默认提示词 |
| 5 工具 | 按工具名：客户端已有同名工具 | 保留客户端定义 | 补原生定义（`e$` 取工具对象，`FH` 生成） |

附件的载体（Opus 是第一条 user 之后的 system 轮，Sonnet 是 reminder 块）仍由原生按模型决定。v19 的探针做法保留。

## 3. AST 核对出的、v19 需要修的地方

| # | 问题 | 证据 | 改法 |
|---|---|---|---|
| 1 | 非 CC 请求现在按“自定义子代理”处理（`request-agent.js`：`!claudeCode → 'subagent'`）。补的计费头带 `cc_is_subagent=true`，还会发 agent-id 头。用户要的是“没有就按主代理补” | v18 README | 非 CC 请求改为主线程：querySource `sdk`，不发 agent-id |
| 2 | 补的头只有 `cc_version; cc_entrypoint; cch`。真 CC 主线程首轮是 `…; cch=…; cc_prompt_id=<uuid>; cc_turn_origin=sdk; cc_prompt_index=0; cc_turn_index=1;` | `PAs` 由记录取 `promptId`（`OUe`→`Efr2`）、`turnOrigin`（`IBn`）、`turnPosition`（`pgn2`）；实抓 `cap-official/req-01` | 给 build 的 user 记录带上 `promptId`（与 `x-claude-code-prompt-id` 一致）和 `turnOrigin:'sdk'`，由原生 `PAs` 写出完整的头。direct 用同一组原生函数生成 |
| 3 | 注入的工具用 `getTools` 的顺序（Read 在 Edit 前）。原生主线程把内置工具按名排序，排在 MCP 和客户端工具前面 | `m4t`/`R4t`：`[...builtin.sort(Zme), ...mcp.sort(Zme)]`；实抓 `Agent,Bash,Edit,…,Read,…` | 用原生 `assembleToolPool` 的排序 |
| 4 | 日期用的是 `FUs()`。原生日期附件用 `POo()`（按 `MHr` 时区） | `ys28`：`N = POo()` | 改用 `POo` |
| 5 | 客户端 system 单独成块。原生会把追加提示词并进动态块（`r1e`→`jen`，分界后用 `\n\n` 合并） | `Zsr`/`r1e` | 见第 8 节决定 1 |
| 6 | 设计文档第 2 节说辅助请求（`WEo`）没有身份行，这是错的：`WEo` 写死 `n1n({isNonInteractive:false})`，即 `official_cli`。只有 `skipSystemPromptPrefix` 时没有 | `WEo` 源码 | 改文档 |

身份行的选择在原生里**和入口无关**，只看是否交互、有没有追加提示词（再加 Vertex 和会话快照）：

- 非交互、无追加：`agent_sdk`
- 非交互、有追加：`official_cli_sdk`
- 交互：`official_cli`

`identityLineChoices` 这张入口表是从实际客户端观察来的，继续作为“内置映射”约束下拉选项。按 AST 要补一处：`claude-desktop`、`claude-vscode` 的辅助请求和交互启动发的是 `official_cli`，表里没有这个选项。

## 4. 工具候选

2.1.304 的工具池（`getTools`）有 20 个。Glob、Grep 被 Bash 内嵌搜索替代（`Bse`）；TodoWrite 在 -p 下关；WebFetch 被 web-fetch 子代理替代。这四个在这个版本**都不存在**，选了会 400。

| 类别 | 工具 | 说明 |
|---|---|---|
| 默认勾选 | Bash、Read、Edit、Write | 内置提示词无条件点名 Read、Edit、Write，有 Bash 时点名 Bash；提示词和工具同在高注入，两者一致 |
| 可选 | Agent、WebSearch、NotebookEdit | Agent 需要“可用代理类型”附件，现在不补，两者会不一致；WebSearch、NotebookEdit 原生标了延迟加载，但没有 ToolSearch 时按完整定义发送（docker 实测） |
| 不列入候选 | ToolSearch、Skill、SendMessage、ListAgents、Workflow、Cron×3、ScheduleWakeup、TaskStop、Enter/ExitWorktree、ReportFindings | 依赖会话状态或对应的清单附件（`deferred_tools_delta`、`skill_listing`），补了内容就不对 |

所有注入工具的调用都交回客户端，客户端必须能执行。界面写明这一点。

## 5. 配置模型

新的请求策略（存储形状），全局 → 分组 → 账号逐项继承，省略即继承：

```json
{
  "level": "none | micro | low | high",
  "billing":     { "entrypoint": "sdk-cli", "sources": { "cc_version": "client|worker", "cc_entrypoint": "client|worker" } },
  "identity":    { "lines": { "<入口>": "official_cli | official_cli_sdk | agent_sdk | none" } },
  "environment": { "sources": { "<十个字段>": "client|worker|erase" },
                   "inject":  { "environment": true, "model": true, "total_tokens": true, "date": true } },
  "system_prompt": { "inject": true },
  "tools": { "Bash": true, "Read": true, "Edit": true, "Write": true }
}
```

- 实现上沿用现有的键（`build_billing_*`、`build_identity_lines`、`build_attachment_sources`、`build_injection`），只新增 `level`；上面是概念形状。
- `level` 只决定哪几层生效。超出等级的层保留配置但不下发，切换等级不会丢配置。
- 等级内没选的项用默认值（`contracts/features/levels.go` 的 `LevelInjection`）：低注入四种首轮附件都补；高注入再补提示词，以及 Bash、Read、Edit、Write。
- 工具候选只有 7 个（第 4 节），`InjectionTools` 同步收窄。
- **迁移**：读取时转换，写回时用新形状（`features.LegacyLevel`，核心和前端同一套）。
  - 等级怎么定：
    - `relay_mode=direct` → `none`；退役的模式（native 等）当 build 处理。
    - build 下：补了提示词或任一工具 → `high`；有一项环境来源不是 client，或补了附件 → `low`；其余 → `micro`。
  - 旧的键原样保留：`build_attachment_sources`、`build_billing_*`、`build_identity_lines`、`build_injection`。
  - 等级内原来没补的项显式写成“不补”。迁到 low 时是四种附件；迁到 high 时再加上提示词和默认四个工具。这样 `LevelInjection` 的结果等于旧的生效值，迁移不改变行为。
  - 分组、账号里只有旧 `relay_mode` 的覆盖：
    - direct → `none`；
    - build 只在继承来的等级是 `none` 时生效，按合并后的策略算等级，否则视为跟随；
    - 显式的 `level` 总是优先。
  - 不在 7 个候选里的旧工具选择，读取时丢弃。2026-10-23 审核 A3 前只有前端这样做，核心在解码时就校验，一条旧覆盖会让整份配置解码失败；之后核心解码只看结构、解析（`ResolveFeaturePolicy`）时按层丢弃并记一条告警、保存时才严格校验（`feature_policy_sanitize.go`，CONTRACTS §53.19）。
- 线上全局现在的配置是：build，平台和系统版本用服务端的，不注入。迁移后是 `low`，四种附件为“不补”。
- 仍然会变的有两处，发布说明要写明：
  - 非 CC 请求按主线程补完整的计费头（第 3 节第 1、2 条）；
  - direct 不再补身份行。

## 6. 传递

| 段 | 形状 |
|---|---|
| 核心 → Worker | `X-CCGateway-Request-Policy`，线形是 `contracts/features.WorkerPolicy`（2026-10-23 审核 A1/C4 后唯一的线形，CONTRACTS §53.18）：`schema_version`、`relay_mode`、`cli_version`、`build_billing_sources`、`build_billing_entrypoint`、`build_attachment_sources`、`build_injection`。核心先按 `level` 算出生效的项，只发等级内的项，`relay_mode` 由等级决定（见下表） |
| Worker → CLI（build） | components 的 `requestPolicy`（`contract_version: 2`，`features.CLIPolicy`）：`build_attachment_sources`、`build_billing_sources`、`build_billing_entrypoint`、`build_injection`；不再带 `build_identity_lines` |
| Worker → CLI（direct） | `CCG_DIRECT_POLICY`：`{build_billing_entrypoint?, build_billing_sources?}`。direct 新增支持计费来源，不再带身份行 |
| 能力 | 新能力 `request_levels_v1`，Worker 和 CLI 都要声明。核心对每个带等级的策略都要求这个能力，因为旧 CLI 在 direct 下会补身份行、把非 CC 请求当子代理 |

核心按等级下发的项：

| 等级 | relay_mode | 下发 |
|---|---|---|
| none | direct | 计费入口、计费来源 |
| micro | build | 与 none 相同（身份行由 CLI 按计费头入口自适应，不是下发项） |
| low | build | 再加环境来源、`build_injection.attachments`（`LevelInjection`） |
| high | build | 再加 `build_injection.system_prompt`、`tools` |

发布顺序不变：先发 CLI 和 Worker（容器统一换新 CLI），再发核心。

## 7. CLI 流程

build（`request-build-2.1.304.js`）。等级由核心决定下发哪些项，CLI 只按收到的项做：

```text
validate(policy)
convert：环境十个字段（applyContentPolicy，低注入起才有来源），计费两个字段（mergeBillingAttribution）
agent：带计费头的按客户端（主线程 / 子代理）；不带的按主线程（querySource sdk，promptId 由首条提示派生）
主线程：最后一条提示的记录带上 promptId、turnOrigin sdk、turnPosition（第 N 条提示），原生 PAs 据此写完整计费头
if !hasBilling(system):
  tools  = 配置的工具 − 客户端已有同名的 → 原生 assembleToolPool 排序（高注入）
  prompt = 配置了提示词且 system 里没有安全段 p4n：r1e(wx(tools + 客户端工具, model), append = 客户端 system)（高注入）
  attach = 配置的附件 − 消息载体（system 轮、reminder 块）里已有开头的（低注入起）
  探针构建：取提示词块（带原生缓存标记）、工具定义、附件位置、原生为缓存标记加的 beta
  有提示词时：system = [客户端身份行…, CC 静态, CC 动态（含客户端 system）]
Kvt → qmn → PAs：没有计费头时补主线程完整计费头
缓存断点超过 4 个时，去掉注入块上的原生标记（先动态后静态）
身份行：只给没有计费头的请求补，按补上的计费头入口自适应（决定 4、第 12 节）；旧核心传来的身份行配置接受但不使用
```

检测用的原生文字都由 `ccgatewayLayerVocabulary()` 在 CLI 里渲染：附件开头、安全段、5 个循环请求头名。夹具 `test/fixtures/native-layers-2.1.304.json`，`native-vocabulary.test.mjs` 对还原源码校验。

direct（`direct-billing.js`）只处理开头的计费头：

- 有头时：按 `build_billing_sources` 换两个字段，按 `build_billing_entrypoint` 补缺的字段。
- 没有头时：补主线程形状的头（带 prompt ID 和 turn）。
- 不再补身份行，其余逐字节不动。旧 Worker 传来的身份行接受但不使用。

## 8. 决定（2026-10-23 用户）

1. **客户端 system 的位置**：补了内置提示词时，客户端的 system 并进动态块，与原生 `--append-system-prompt` 一致。客户端的分块和 `cache_control` 会随之合并。
2. **缓存标记**：与官方 CC 一致，注入的提示词块用原生的标记（静态块 `global`，动态块，TTL 由原生按账号决定）。客户端的断点加上这些超过 4 个时，原生标记从动态块开始去掉。
3. **等级划分**：0 = 计费头；微 = 再加身份行；低 = 再加环境；高 = 再加提示词和工具。提示词和工具总在一起，没有“有提示词、没工具”的等级。
4. **身份行自适应、不可配置**（2026-10-23 第二轮）：没有身份行时按计费头里的入口补，规则跟原生 `n1n` 一致，有追加提示词时才用追加那句：
   - cli → official_cli；
   - claude-desktop、claude-vscode → official_cli_sdk；
   - sdk-cli、sdk-ts、sdk-py：高注入补了内置提示词（客户端 system 成为追加提示词）时 official_cli_sdk，否则 agent_sdk；
   - 其他入口按服务端入口那一行。
   核心不再下发 `build_identity_lines`，前端去掉身份行配置。
5. **界面按层跟随**（第二轮）：分组和账号层每张卡片一个「跟随上层／自定义」，自定义时整层显式覆盖，不再逐项跟随。界面是等级分段选择、计费头、身份行（只读规则）、环境（缺少时补的勾选、十字段转换默认收起）、提示词与工具（开关和工具勾选）。

## 9. 现有链路（要改的位置）

- **前端**：`next/web/src/views/ccgateway/requestPolicy.ts`、`RequestPolicySettings.vue`、`RemoteSettings.vue`（全局）、`GroupPolicyDrawer.vue`（分组）、`AccountFeatureSettings.vue`（账号）、i18n `web/src/i18n/locales/{zh,en}/ccgateway.ts`。
- **核心**：`next/server/internal/ccgateway/` 下的 `request_policy.go`、`feature_policy.go`（覆盖、合并、解析、`resolvedWorkerPolicy`）、`config.go` `mergeConfig`、`runtime_features.go`、`client.go`。账号策略在表 `ccgateway_account_feature_policies`（`overrides` jsonb）。
- **contracts**：`features/attachments.go`、`identity_line.go`、`injection.go`、`request_modes.go`；夹具 `testdata/web-policy-payloads.json`、`worker-cli-requests.json`。
- **Worker**：`request_command.go`（`buildRequestPolicy`、direct 策略）、`cli_pinned.go`（能力）。模式仍由 `relay_mode` 决定，`main.go` 不用改。
- **CLI**：`request-policy.js`、`request-build-2.1.304.js`、`direct-billing.js`、`request-agent.js`、`content-policy.js`、`native-environment-2.1.304.inc.js`、`patch-cli-2.1.304.cjs`。
- **控制器**：`runtime_updates.py` 里写死的能力门槛。

## 10. 实施分工

一个 Go 模块同一时间只让一个代理写：

1. **contracts**（先做，定形状）：新增 `features/levels.go`（等级、各层、校验、合并、生效形、迁移）以及新夹具。
2. 下面四路并行：
   - **核心**：存储迁移、继承、下发、能力；
   - **Worker**：解析、校验、传递、能力；
   - **CLI**：第 7 节，v20；
   - **前端**：等级卡片与各层配置。
3. **主控**：测试与发布。
   - 测试：跨层夹具、cli-mods 全部单测、核心含 PG 不跳过、前端单测与类型检查；docker 离线矩阵（四个等级 × OAuth/API Key × CC/非 CC × Opus/Sonnet），再在 31 号走真实上游。
   - 发布：经同意后发布。

## 11. 实施与测试（2026-10-23，CLI v20 `ccgateway-v20-request-levels`，未发布）

- **单元测试**
  - contracts：`levels_test.go`。
  - 核心：`next/server` 全部包通过，ccgateway 包没有跳过（PG 用本机嵌入式），新增 `levels_test.go`。
  - Worker：engine、worker 全部通过，跳过的都需要真实 CLI。
  - cli-mods：167 项全过。
  - 前端：66 个文件、653 项，`vue-tsc` 0 错误。
  - 两份跨层夹具已重新生成，新增注入等级用例。
- **docker 离线测试**（ovh 一次性断网容器：新 Worker + v20 CLI，假上游）：`artifacts/claude-2.1.304/e2e/levels/`，OAuth 和 API Key 各 15/15（含身份行自适应：cli、claude-desktop，以及高注入下 sdk-cli 用追加那句，旧的身份行配置被忽略）。

| 场景 | 发出的内容 |
|---|---|
| 微（非 CC） | `[计费头, agent_sdk, 客户端]`；头是主线程形状：`cc_prompt_id` 与 prompt-id 头一致，`cc_turn_origin=sdk; cc_prompt_index=0; cc_turn_index=1`；没有 `cc_is_subagent` 和 agent-id 头 |
| 微，第二轮 | `cc_turn_index=2` |
| 低 | system 不变；Opus 第一条 user 后一条系统轮（环境、模型、日期、token） |
| 高（Opus） | `[计费头, official_cli_sdk, CC 静态, CC 动态+客户端]`；工具 `Agent,Bash,Read`；缓存标记 `1h global` / `1h`；beta 加上 `prompt-caching-scope`、`extended-cache-ttl` |
| 高（Sonnet，客户端工具 lookup） | 工具 `Bash,Edit,Read,Write,lookup`；附件是第一条 user 开头的 reminder 块 |
| 已有的层 | 客户端 system 已含 CC 提示词、自己的 Read、环境系统轮：都不再补，只补缺的模型、日期、token |
| 客户端已有 3 个缓存断点 | 注入的动态块标记被去掉，只留静态块的 |
| WebSearch、NotebookEdit | 没有 ToolSearch，按完整定义发送 |
| 候选外的工具（ToolSearch） | Worker 400 |
| 带计费头的 CC 请求 | 不注入 |
| 0（direct） | `[计费头, 客户端]`，主线程形状的头；`build_billing_sources.cc_version=worker` 时只换版本 |

- **旧的 118 项配置矩阵**：API Key 118/118。OAuth 90/118，失败的 28 项都是“direct 补身份行”，按新规则 direct 不再补，属于预期。
- **线上存量**（只读查询）：
  - 全局：build，`platform_name`、`os_version` 用服务端，`cc_version` 用服务端。
  - 分组：没有覆盖。
  - 账号：只有 31 号，是跟随。
  - 结论：迁移后全局是 `low`，四种附件为“不补”；没有候选外的工具名。

- **31 号真实上游**（临时 v20 CLI 放进容器直接运行，测完删除）：10 个场景全部 200。
  - 微：Opus 首轮；Sonnet 第二轮，答出了第一轮记住的数字。
  - 低：Opus、Sonnet，模型答出了补上的工作目录、日期和模型名。
  - 高：Opus 写入缓存约 4.5k token；Sonnet 调用了补上的 Read；客户端已有 3 个断点时读到缓存约 3k token；加选 Agent、WebSearch、NotebookEdit 也是 200。
  - 0（direct）：没有计费头、旧版本号计费头换服务端版本，都是 200。

## 12. 审核修复（2026-10-23 第三轮）

用户要求查清“各层注入是否都由 CLI 内部按计费头提取、没有写死”。AST 审核结论是**部分是**：注入的正文和定义全部来自原生，但有 5 个 bug。用户决定全部修，并把 system 统一成数组。

| # | 问题 | 修法 |
|---|---|---|
| 1 | 只要补了内置提示词，sdk-* 就用追加那句；客户端没有 system 时并没有追加提示词 | 按客户端 system 是否非空判断（`layers.appended`），与 `n1n` 一致 |
| 2 | CC 自己的辅助请求（只有计费头、没有身份行）被补了身份行 | 带计费头的请求不补身份行（`line: 'none'`） |
| 3 | direct 直接调 `kLo`，少了 `attributionProject` | direct 改调原生 `PAs([], undefined, {...})`，与 build 主路径同一个函数 |
| 4 | turn 来源写死 `sdk`，turn 位置是自己算的 | 改用原生 `iws`、`h0n`、`pde`、`a3e`（`ccgatewayMarkTurns`）：cli 入口是 `human`，并按原生递增 promptIndex；其他入口是 `sdk`。build 和 direct 共用 |
| 5 | 计费头不在首块时，`hasBilling`（算 CC 请求）和 `leadingBilling`（算非 CC）不一致 | 新增 `requestBilling`：首块的头，否则任意位置的第一个头。请求类型、ID、入口都从它取，与 `hasBilling` 同口径 |
| — | direct 下字符串 system 被拼成“计费头\n原文”的字符串；官方 CC 一律发 text 块数组（`Jfr`；`WEo`→`IAs` 也会把字符串包成块） | 字符串改成数组：开头的计费头行单独一块，其余一块 |

测试：

- **单元测试**：cli-mods 168 项。新增在还原源码上直接运行原生 `iws`/`h0n` 的测试：sdk 第二轮是 `{0,2}`，human 第二轮是 `{2,2}`。
- **docker**：OAuth、API Key 各 20/20。新增 5 项：CC 请求不补身份行、计费头不在首块、高注入但客户端没有 system、direct 字符串变数组、cli 入口是 human turn。
- **旧 118 项矩阵**：API Key 117/118，唯一失败是“direct 字符串 system 保持字符串”；OAuth 67/118。失败项都属于三类有意变化：direct 不补身份行、CC 请求不补身份行、字符串变数组。
- **31 号真实上游**：14 个场景全部 200，包括 CC 辅助请求只带计费头不带身份行、direct 字符串 system、cli 入口的 human turn。

## 13. 写死改成原生提取（2026-10-23，CLI v21 `ccgateway-v21-native-layers`，插件 0.1.80）

审核表里列出的写死项，改法如下：

| 原来 | 现在 |
|---|---|
| 手写的权限上下文对象（少两个字段） | 原生 `gd()`，工具池和构建选项都用它 |
| 客户端 system 用 `'\n\n'` 拼接，交给 `r1e` 作追加提示词（交互路径） | 按非交互主线程 `xh` 组装：`r1e(wx(...), {appendSystemPrompt: undefined})` 之后接追加提示词。客户端各块用 CLI 自己拼接两段追加提示词的函数（主模块 `chunk-wt08cjq1` 的 `pr`，用于 `--append-system-prompt-file` 加 `--append-system-prompt`）拼接；补丁按 AST 从哈希绑定的模块原样复制并改名为 `ccgatewayJoinAppend`，该模块本身不改 |
| 剩余 token 自己算，扣减用探针记录 | 直接调原生 `JDr(session, 客户端记录, model, …)` |
| 环境附件开头写成 `PNe + '\n' + ooo` | 取 `zkt` 渲染结果中字段之前的部分 |
| 剩余 token 开头用 `replace('0', mark)` | 取 `u7t` 两次渲染的公共前缀 |
| turn 位置自己算 | 第 12 节已改为原生 `iws`/`h0n` |

测试：
- cli-mods 169 项。新增断言：补丁输出里的 `ccgatewayJoinAppend` 行为与原生一致，主模块未被改动。
- 层词表夹具无变化，说明两个开头的推导结果和原来相同。
- docker：OAuth、API Key 各 20/20。
- 31 号真实上游：14 个场景全部 200。高注入的几次请求读到的缓存，正好等于 v20 当时写入的量（4509、10627、6697、4492），说明发出的提示词与 v20 逐字节相同。
