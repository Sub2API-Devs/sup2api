# CC 请求分层：有计费头按 CC 请求处理，没有时按配置注入

2026-10-22 讨论，2026-10-23 用户决定并实施（第 7 节）：**只有计费头是必须的，其余每一层都由前端配置决定**。第 1–6 节保留讨论时的分析与现状测试。第 7 节的配置模型同日被 [注入等级设计](CC-INJECTION-LEVELS-DESIGN.md) 取代，现行规则以那份为准。

AST 工具和做法同 [CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY](../../plugins/ccgateway/docs/CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY.md)：`artifacts/claude-2.1.304/prompt-ast/`（`q.cjs show|callers|find`）。索引用的是 v17 解包出的 bundle；v18 只改了请求上下文的 mods，下面这些原生函数没有变。函数名是 Bun 重新打包后的名字（带数字后缀的就是这样）。

## 1. 用户的模型

按**有没有计费头**把请求分成两类：

- **CC 请求**（system 首块是计费头）：只做替换，不做注入。
  - 计费头两个字段按「客户端／服务端」替换（现有的 `build_billing_sources`）。
  - 附件按「保留客户端／使用服务端／擦除」转换（现有的 `build_attachment_sources`）。
  - **身份行根本不用管**：客户端有就有，没有就没有。
- **非 CC 请求**（没有计费头）：按层注入，让它像 CC 发的。

| 层 | 内容 | 是否必须 | 配置 |
|---|---|---|---|
| 1 | 计费头 | 必须 | 服务端入口（现有） |
| 2 | 身份行 | 可选 | 没有时补不补、补哪句 |
| 3 | 附件 | 可选 | 没有时补不补（补哪些） |
| 4 | 内置提示词 | 可选 | 没有时补不补 |
| 5 | 核心 CC 工具 | 可选 | 补不补、补哪些工具；定义由 CLI 在内部取得，不由 ccgateway 传入 |

## 2. 与现在的差别

| 情形 | 现在（v18） | 按新模型 |
|---|---|---|
| 有计费头、没有身份行 | 按计费头入口补一句（默认补） | 不补 |
| 没有计费头 | 补原生计费头，再按服务端入口补身份行 | 同左（第 1、2 层） |
| 非 CC 请求的附件、提示词、工具 | 不补 | 第 3–5 层，按配置补 |

“有计费头不补身份行”更像真 CC。CC 的辅助请求（标题生成、分类器、hook 等）走 `WEo`：

```js
function WEo({ messages, system, skipSystemPromptPrefix, ... }) {
  return IAs([...skipSystemPromptPrefix ? [] : [{ type: "text", text: n1n({...}) }], ...system], {...});
}
```

`IAs` 只在最前加计费头，所以这些请求是 `[计费头, …]`，没有身份行。30 号日志里 `claude-desktop-3p` 有 37 次这样的请求（见 [BILLING-IDENTITY-AUTOFILL-DESIGN](BILLING-IDENTITY-AUTOFILL-DESIGN.md) 1.2）。v17 起我们会给这类请求补一句身份行，真 CC 不会。上游接受 `[计费头, 提示]`（10-22 在 30 号实测是 200），所以不补没有风险。

改成新规则后，按入口的身份行表（六个入口各选一句）只剩“非 CC 请求”会用到。这时入口一定是服务端入口，所以**实际只有一行起作用**：界面可以简化成“非 CC 请求的身份行”一个下拉，选项跟着服务端入口走。

## 3. CC 自己怎么拼（AST）

一次主线程请求，从组装到发出：

```text
YV2 / Zsr        选提示词：默认（wx5）或 --system-prompt；--append-system-prompt 经 r1e 放在动态分界之后
  wx5(tools, model) → nin2   默认提示词：静态段 + 分界 kL2 + 动态段，内容随 tools 和模型变
e$4(permissionContext)       本次可用的工具（getTools）；cb7 是全部内置工具（getAllBaseTools）
Nwe → eIr2                   附件：environment、model、deferred_tools_delta、agent_listing_delta、skill_listing、total_tokens、日期等
MDe(attachment)              把附件渲染成 API 消息（system 轮或 <system-reminder>）
qmn2                         发请求：
  FH5(tool, opts)            每个工具的 API 定义：description = tool.prompt()，input_schema 由 zod 转换，带 defer_loading/cache_control
  PAs(system, n1n(...))      最前加 [kLo 计费头, n1n 身份行]
  Jfr2 → Fbo                 按分界切块、加 cache_control（静态段 scope global）
```

要点：

- `XY3 = { getAllBaseTools: cb7, getTools: e$4, assembleToolPool: m4t2 }` 是工具目录。`e$4` 按权限上下文过滤、按开关启用，得到的就是 CC 实际发的那一组（实抓主线程：Agent、Bash、Edit、ListAgents、Read、ReportFindings、ScheduleWakeup、Skill、ToolSearch、Workflow、Write，加 `DeferredToolPlaceholder`，其余经 ToolSearch 延迟加载）。
- `FH5` 对原生工具和对客户端工具走的是两条路。build 现在把客户端工具注册成“native”（`registerNative`），走的是 `nativeDefinition`，原样输出客户端的定义。CC 自己的工具走 `CYt`（schema）和 `CVo2`（描述），描述会随模型（lean）、其他工具是否存在等条件变化。所以工具定义只能在 CLI 里按当次的模型和工具组合生成，Worker 预先抓一份传进去会对不上。
- 默认提示词依赖工具：`nin2` 的 `session_guidance` 等段按 `tools` 写，`r1e` 里 `RCr(tools)`、`QFs(tools)`、`I0s(tools)` 也按工具插段。所以第 4 层必须用最终的工具列表（客户端工具加上第 5 层注入的）来渲染，否则提示词里说的工具和实际发的不一致。
- 附件也有依赖：`deferred_tools_delta`（“The following deferred tools are now available via ToolSearch…”）、`agent_listing_delta`（可用代理类型）、`skill_listing` 都在描述工具。没有对应工具时补它们，内容就是错的。不依赖工具的是 environment（`Dvn` → `zkt`）、model（“You are powered by…”）、日期、total_tokens。
- 身份行 `n1n`：非交互且有追加提示词时是 `official_cli_sdk`（ke）。第 4 层把客户端 system 当作 `--append-system-prompt` 放在默认提示词之后，这正是 CC 自己选 ke 的情形。

Worker 现在已经有一份“工具目录”（`engine/cli_catalog_capture.go`）：它在几种配置下运行真 CLI，从发往本地假上游的请求里抓 `tools`。这份目录用来核对客户端发来的原生工具，不适合直接注入，原因见上一条第二点。界面可以用它列出可选的工具名。

## 4. 每层怎么做（build）

build 已经由原生构造器 `Kvt` → `qmn2` 出 body，所以各层都是给它更多原生输入，不在 Go 或 mods 里抄写文字：

| 层 | 做法 |
|---|---|
| 1 计费头 | 不变（`PAs` → `kLo`，服务端入口替换 `cc_entrypoint`） |
| 2 身份行 | 只在没有计费头时，按配置用 `n1n` 的三句之一，或不补 |
| 3 附件 | 用 Worker 自己的上下文（工作目录、平台、模型）调 `eIr2` 的首轮附件，经 `MDe` 渲染，放在 CC 放的位置（第一条 user 之后的 system 轮，或 reminder）。只补不依赖工具的几类；描述工具的那几类跟第 5 层一起补 |
| 4 内置提示词 | `wx5(最终工具, 模型)` 渲染默认提示词，客户端 system 作为追加提示词经 `r1e` 放在分界之后，`Jfr2` 切块和缓存标记由原生代码做 |
| 5 核心工具 | `e$4(权限上下文)` 取工具对象，按配置的名字过滤，和客户端工具一起交给 `Kvt`，由 `FH5` 生成定义 |

direct 只拼接原始 JSON（`direct-billing.js`），现在做第 1、2 层。第 3–5 层也能由 CLI 渲染后拼进去，但只有 build 能保证工具、提示词和附件三者一致。建议 direct 只做 1、2 层（第 6 节问题 3）。

## 5. 现状测试（2026-10-22，线上 Worker 0.1.77 + CLI v18）

### 5.1 docker（ovh 一次性 `--network none` 容器，镜像 `ccgateway-app:0.1.77` 自带的 Worker 和 CLI，假上游）

脚本在 `artifacts/claude-2.1.304/e2e/matrix/`（`matrix.cjs`、`run-matrix.sh`、`run-real.sh`、`real-summary.cjs`）。构造的请求带上核心那样的 `X-CCGateway-Request-Policy`，逐个检查发出的请求。

- OAuth 118/118、API Key 118/118 通过：
  - 身份行：6 个入口加 `claude-desktop-3p`、未知入口，每个可选句加“不补”，build 和 direct 都按配置。
  - 计费头：没有时补原生整行，服务端入口六选一；缺入口时补服务端入口；不在首块时最前补一个；`cc_version`、`cc_entrypoint` 的客户端／服务端两种来源都对；direct 下完整的头加身份行逐字节不变。
  - 附件：十个字段各自选服务端、擦除，以及全部客户端／服务端／擦除，都只改选中的字段；direct 不转换。
  - 身份：见 5.3。
- API Key 账号不补身份行、保留客户端身份，与设计一致。
- 官方 2.1.304 客户端（带 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`）跑主线程加两层子代理，用四种策略：默认 build、build 全部服务端加服务端入口 `claude-vscode`、build 擦除五项、direct。四次都正常结束，发出的计费头入口、环境字段、`metadata` 都和策略一致；客户端已有的身份行没被替换。

### 5.2 31 号经生产链路

31 号当时已启用（14:42 UTC 由管理员启用，不是本次操作），是分组 6 里唯一可调度的账号。在分组 6 建 ccg-audit Key，把 31 号的账号级 CC 特性依次切成四种，每种跑官方客户端两个场景（读文件、子代理）和两个构造请求（无计费头、有计费头没有身份行）。测完恢复跟随全局，删掉 Key。

| 阶段 | 策略 | 结果 |
|---|---|---|
| p0 | 跟随全局（`cc_version` 服务端，平台和系统版本服务端） | 7 次全部 200 |
| p1 | build，十个附件字段服务端，计费两字段服务端，服务端入口 `claude-vscode`，`sdk-cli`→`official_cli_sdk` | 9 次全部 200 |
| p2 | build，擦除五项，`sdk-cli`→不补 | 7 次全部 200 |
| p3 | direct，服务端入口 `cli`，`cli`→不补 | 7 次全部 200 |

Worker 日志里，核心下发的策略头与每阶段的设置一致。内容诊断也对得上：p1 是 `primary_directory:replaced`、`cc_entrypoint:replaced`；p2 五项都是 `erased`；无计费头的请求是 `cc_version:inserted`、`cc_entrypoint:inserted`。用量记录 30 条全部来自测试 Key，都是 200。

### 5.3 请求体里的 ID

| ID | build（OAuth） | build（API Key） | direct |
|---|---|---|---|
| `metadata.user_id` 的 `device_id` | 换成 HMAC 映射值 | 客户端原值 | 原值 |
| `account_uuid` | 换成 Worker 账号自己的 | 原值 | 原值 |
| `session_id` 和 `x-claude-code-session-id` | 映射，两处一致 | 原值 | 原值 |
| `x-claude-code-prompt-id` 和计费头 `cc_prompt_id` | 映射，两处一致 | 原值 | 原值 |
| 扁平载体 `user_<hex>_account_<uuid>_session_<uuid>` | 保持扁平，值替换 | 原值 | 原值 |
| 没有 `metadata` | 不加 | 不加 | 不加 |
| 不透明字符串（如 `customer-42`） | 变成 CC 的 JSON 身份串（映射的 device_id、Worker 的 account_uuid、新 session） | 原值 | 原值 |
| `x-claude-code-agent-id` / `parent-agent-id` | 客户端原值（随机生成，不含账号信息；主线程不发） | 同左 | 同左 |
| 计费头 `cch` | 客户端算的值原样保留 | 同左 | 同左 |
| 计费头 `cc_prev_req`、`diagnostics.previous_message_id` | **客户端原值** | 同左 | 同左 |

最后一行需要注意：这两个是**上游发出的** ID（上一轮的 `req_…` 和 `msg_…`）。上一轮如果在另一个账号上，这一轮就把那个账号的请求 ID 或消息 ID 带到了当前账号，上游可以据此把两个账号关联起来。`diagnostics` 原样转发是此前的决定，这里只是把风险写出来。

## 6. 需要决定

1. **有计费头不补身份行**：照第 2 节改（CLI v19 + 发版）？改完后身份行界面简化成一个下拉。
2. **第 3 层补哪些附件**：建议只补 environment、model、日期、total_tokens；deferred tools、代理类型、技能列表跟第 5 层一起补。附件里的值用服务端的（Worker 的工作目录、平台）。
3. **direct 是否也做第 3–5 层**：建议不做，只在 build 做。
4. **第 5 层的工具调用怎么办**：注入的工具客户端没有。模型调用 Bash 或 Read 时，`tool_use` 会回到客户端，而 Worker 不执行工具（工具调用都交回客户端）。选项：只在客户端能处理时开（默认关）；或者只补不会被直接调用的（如 `defer_loading` 的占位）；或者明确接受客户端收到未知工具调用。这一点不定，第 5 层没法做。
5. **第 4 层与第 2 层的关系**：补了内置提示词时，CC 自己会选 `official_cli_sdk`。用这句，还是仍按第 2 层的配置？
6. **`cc_prev_req` / `previous_message_id` 跨账号**：保持原样，还是在账号变化时去掉？

## 7. 决定与实施（2026-10-23，CLI v19 `ccgateway-v19-request-layers`，未发布）

> **已被取代**（2026-10-23 同日）：本节的配置模型由 [注入等级设计](CC-INJECTION-LEVELS-DESIGN.md) 取代（CLI v20 起），下文是 v19 的历史记录。现行规则以注入等级设计第 4–8、12 节为准，主要差别：工具候选从 20 个收窄为 7 个（`contracts/features/injection.go` `InjectionTools`）；`build_injection` 不再"默认什么都不补、只在有补充时下发"，而是由等级决定——低注入起按 `LevelInjection` 总下发等级内的默认项，所以每个带等级的策略都要求 `request_levels_v1`，低及以上按默认下发注入项时还要求 `build_injection_v1`；身份行不再按入口配置，改为 CLI 自适应；非 CC 请求按主线程而不是子代理处理。

用户：“前端配置决定，只有计费头必须的。”对第 6 节的落实：

1. **身份行**：不加“有计费头就不补”的硬规则，仍按现有的每入口配置（含「不补」）决定。
2. **第 3–5 层**都是可选项，只作用于 build 下**没有计费头**的请求（system 任一块里有计费头行，哪怕不在首块、格式不对，都算 CC 请求，不注入）。
3. **direct 不做第 3–5 层**：核心对 direct 不下发 `build_injection`，Worker 也不传。
4. **注入的工具**：由管理员选择，默认都不补；模型调用后和客户端自己的工具一样交回客户端。界面说明里写明客户端没有实现时会收到处理不了的调用。
5. 补了内置提示词时身份行仍按第 2 层配置。
6. `cc_prev_req` / `previous_message_id` 不在本次范围，维持原样。

### 7.1 配置

> 历史（v19）。候选 20 个、"什么都不补时不下发"均已失效，见本节开头的说明。

请求策略新增 `build_injection`（全局→分组→账号逐项继承，省略即继承）：

```json
{"system_prompt": true, "attachments": {"environment": true, "model": true, "total_tokens": true, "date": true}, "tools": {"Read": true, "Bash": true}}
```

- `attachments` 可选 `environment`、`model`、`total_tokens`、`date`（按 CC 的顺序）；`tools` 可选 2.1.304 工具池里的 20 个（`contracts/features/injection.go` `InjectionTools`，与 CLI `getTools` 实测一致：Agent、Bash、Read、Edit、Write、NotebookEdit、ReportFindings、WebSearch、TaskStop、Skill、EnterWorktree、ExitWorktree、SendMessage、ListAgents、Workflow、CronCreate、CronDelete、CronList、ScheduleWakeup、ToolSearch）。
- 每一项单独继承：`true` 补、`false` 不补、省略跟随上层；默认什么都不补。核心只下发为 `true` 的项，什么都不补时不下发，也就不要求新 Worker；有任何一项时要求能力 `build_injection_v1`。
- 前端：build 模式下新增「非 CC 请求补充」卡片（提示词 / 首轮附件 / Claude Code 工具三组，每行「补上 / 不补」，分组和账号层多一列「跟随」）；有补充时标题栏显示“非 CC 补 n 项”。

### 7.2 CLI 怎么做

全部由 CLI 自己生成，Worker 和核心只传名字：

- **一次原生“探针”构建**（`request-build.js` `injectLayers`）：用 CC 自己的构造器 `Kvt` → `qmn` 跑一个只有一句占位提示的会话，带上选中的工具（`getTools` 取出的工具对象，按 CC 的顺序）、内置提示词（`wx(工具, 模型)`，工具包括客户端的工具）、首轮附件（`Wkt` 环境快照、`eSt` 模型说明、`u7t` 剩余 token、`FUs` 日期，与 `eIr` 用的生产函数相同）。补丁让带 `ccgatewayNativeProbe` 的构建走原生的 system、工具和消息管线（客户端的 beta 不变），产出不发送。
- 从探针结果取：system 里除计费头和身份行外的提示词块（原生按动态分界切成静态、动态两块，不加缓存标记）；工具定义（原生 `FH` 生成，选了 ToolSearch 时由原生决定哪些延迟加载）；附件的位置（占位提示前后的块、前后的消息）。
- 套到客户端请求上：提示词块放在客户端 system 之前，CC 工具放在客户端工具之前，附件按探针的位置放在客户端**第一条** user 消息周围（Opus 是其后的一条系统轮，Sonnet 是这条消息开头的 reminder 块，都是原生按模型决定的）。之后照旧补计费头和身份行，所以结果是 `[计费头, 身份行, CC 静态, CC 动态, 客户端 system…]`。
- CLI 没有某个工具时 400，并列出它有的工具。

已知限制：选了 ToolSearch 后被延迟加载的工具只能经 ToolSearch 找到，CC 平时发的“延迟工具清单”附件（`deferred_tools_delta`）、可用代理类型、技能列表这几类依赖会话状态的附件不补。

### 7.3 测试

- 单元：cli-mods 161 项（新增 `request-injection.test.mjs`：策略校验、计费头判断、探针结果的拼接与不注入的情形）；contracts `TestBuildInjectionLayersAndEffectiveForm`；Worker `TestInjectionPolicyNeedsTheCapability`；核心 `TestInjectionResolvesPerFieldAndNeedsTheCapability` 与全部 ccgateway 测试（含 PG，无跳过）；前端 265 项与类型检查。两份跨层夹具加了注入用例并重新生成（前端编辑器 → 核心、Worker → CLI）。
- docker（ovh 一次性断网容器，新 Worker + v19 CLI，假上游）：注入 8 项 OAuth、API Key 各 8/8；原 118 项配置矩阵在新 Worker + v19 上 OAuth、API Key 各 118/118，没有回归。

| 场景 | 发出的内容 |
|---|---|
| 不注入 | `[计费头, agent_sdk, 客户端]`（API Key 没有身份行） |
| 全部（Opus） | `[计费头, agent_sdk, CC 静态, CC 动态, 客户端]`，工具 `Agent,Bash,Read`，第一条 user 后一条系统轮：环境、模型、token、日期 |
| 全部（Sonnet，客户端有工具 lookup） | 工具 `Agent,Bash,Read,lookup`；附件是第一条 user 开头的 reminder 块 |
| 历史里有 Read 的调用 | 200，附件只在第一条 user 周围 |
| 有计费头 | 什么都不注入 |
| 选 ToolSearch、NotebookEdit、CronCreate | `DeferredToolPlaceholder(defer), ToolSearch`（两个工具被原生延迟） |
| 未知工具 `Glob` | Worker 400 |
| direct | 不注入 |

- 31 号真实上游（临时 v19 CLI 放进容器、直接 `claude request --build`，测完删除）：Opus 全部、Sonnet 全部、只补 Read 并要求读文件、只补环境和日期四种都是 200；模型调用了注入的 Read（`{"file_path":"/etc/hostname"}`），也能答出注入的工作目录和日期。
