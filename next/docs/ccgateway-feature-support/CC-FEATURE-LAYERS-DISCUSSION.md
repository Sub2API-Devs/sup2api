# CC 特性分层配置：讨论总结

> 2026-10-27 清理：文中引用的本机 `artifacts/` 与 ovh 上 `~/sup2api/checks/`、旧 `release-*`、`~/sup2api-managed/{stage,backups,publish,ccgateway-images}/` 下的旧版本原始记录已删除，路径仅作出处；现存位置见 [CLI-TEST-PLAN](../../plugins/ccgateway/docs/CLI-TEST-PLAN.md)。

正式实现规范已整理为 [CC 特性分层配置与请求内容转换设计](CC-FEATURE-LAYERS-DESIGN.md)。本页保留讨论与调查过程；其中历史“待定”“暂定”和早期实现范围以正式设计为准。

2026-10-20。本文汇总 CCGateway「CC 特性」分层配置的需求讨论、已定决策、附件提取的调查结果和待定问题，供后续分析与实现使用。UI 设计稿：[cc-feature-layers-mockup.html](cc-feature-layers-mockup.html)（v8.2，6 个交互场景，浏览器直接打开；操作只保存在页面内存，不连接后端）。

最新范围：仅处理计费归属与环境信息；用户确认环境内的所有已知字段均可配置来源，账号邮箱退出本次范围。当前 build 只接通平台和系统版本的客户端／服务端替换，其余新增目标尚未实现。此前记录的线上版本为核心 0.1.171 / ccgateway 0.1.68，本轮未重新检查线上。

## 1. 需求

在 CCGateway 设置的「CC 特性」中：

1. 配置一份**全局默认**。
2. 可以按**分组**配置默认值。分组上有「允许账号级别覆盖」开关，默认关闭。
3. 分组允许覆盖时，账号创建后默认「跟随」（先看分组，分组没设的项再看全局），用户也可以在账号上自定义。
4. 计费归属头的 `cc_version`、`cc_entrypoint` 分别选择「客户端 / 服务端」，沿用三层逐项继承；不提供手动填写或擦除。
5. 环境完整块与环境更新块中的 10 项已知字段均开放配置，字段清单见 2.4。环境保留原稿「客户端 / 服务端 / 擦除」选项；新增字段在设计稿中默认客户端。所有操作只影响请求中的环境说明，不会迁移工具执行位置、修改客户端目录或重建容器。
6. 不根据数组下标识别目标；`system[0]` 和 `messages[0].content[0]` 只是已抓样本的位置。其他 reminder、邮箱、项目指令、工具结果与媒体不作为此次转换对象。
7. 必须兼容客户端 `--exclude-dynamic-system-prompt-sections`、自定义 `--system-prompt` 及完全缺少环境说明的请求；按实际内容识别，不依赖客户端上报启动参数，不把被移走或省略的动态信息重新塞回顶层 system。

## 2. 已定决策

### 2.1 配置随请求下发，不碰账号容器

- 核心每次请求把合并后的配置放进 `X-CCGateway-Request-Policy` 头发给 Worker（现有机制，见 `server/internal/ccgateway/client.go` 的 `WorkerRequestPolicy`）。
- 请求模式、附件来源和计费归属字段来源都在下一次请求生效，保存时不重建容器（#21/#22 账号容器绝不重建）。
- **请求模式（direct / build）改为按请求执行**：
  - 现状：Worker 只认容器环境变量 `CCG_REQUEST_MODE`，请求头里的模式与之不同时返回 409（`engine/main.go:93`）。核心还把模式写进容器的 CLI 配置，控制器发现变化会重建容器（`controller/manager.py` 约 561、603 行）。
  - 改法：Worker 按请求头里的模式执行，并校验该 CLI 版本支持这个模式（镜像清单里每个版本都列了支持的 modes）。核心给容器配置固定发 `build`，以后改模式不再触发重建。Worker 新增能力声明，核心先探测，旧 Worker 直接报错。
  - 线上全局 `relay_mode` 未设置（默认 build），所以固定发 build 不会让现有容器重建。
- **CLI 版本固定为 2.1.302，不可修改**，不参与分层。界面只显示版本号，不给说明文字。

### 2.2 分层规则

- 取值顺序：账号自定义 → **这次请求所用 API Key 的分组** → 全局，逐项向上取值。
  - 按 API Key 的分组取，不按账号所属分组。账号属于多个分组时也没有歧义。
  - 代价：核心要把请求的分组传给 ccgateway 的 transport（现在只传账号 ID）。
- 分组上有两个开关：
  - **启用分组覆盖**（总开关）：关闭后本组账号全部使用全局默认，账号自定义也不生效；已保存的分组设置和账号自定义值都保留，重新打开后恢复。分组列表标「已关闭」。关闭不同于「移除分组配置」，移除会删掉设置。
  - **允许账号级别覆盖**：默认关闭。关闭时账号编辑页只读，显示生效值和来源；账号已保存的自定义值保留但不生效。
- 分组和账号的每一项（包括子字段）都多一个「跟随」选项，旁边写出当前继承到的值。
- 账号层保留。账号自定义只在允许覆盖的分组下生效；账号编辑页提供「按分组查看」，因为同一账号在不同分组下的生效值可能不同。
- 账号页「跟随默认 / 自定义」切换；切回跟随默认会清空本账号的全部自定义值。

### 2.3 界面细节

- 「CC 特性」页分两个子页：全局默认、分组默认（左侧分组列表 + 右侧配置）。
- **direct 模式下附件不能改**：哪一层生效的是 direct，那一层的附件区整块置灰、不可编辑，请求里也不带附件配置，Worker 原样转发。账号在 direct 分组下自定义成 build 时，附件才可改。
- **和继承值不同的项标橙色**：左侧橙色竖线，名称后写被替换的值（分组页写「全局为 …」；账号页写「全局为 …」或「分组为 …」）。值手动设置了但与继承值相同，不标。收起的附件旁显示「N 项不同」，分组列表显示每组几项不同。
- 不显示多余标记：账号页不加「账号」来源标签（选的不是「跟随」本身就说明是自定义）。只读页用「全局」「分组 · 分组名」标签说明来源。
- 选项名「Worker」统一改称「服务端」。
- 设置区单列「计费归属」与「环境信息」。环境分为运行环境（3 项）、目录与仓库（5 项）、工具与代理说明（2 项）；每项逐层继承，差异数量按字段统计。
- 账号编辑页保留按分组查看、只读来源标签；分组关闭时展示已保存的配置并禁用，而不是把保存值改成全局。
- 将“未匹配／缺字段／连续会话”的行为放入可展开说明，不把模拟命中数当成真实运行统计。原生源码、待接通状态等只放在设计说明，不进入正式产品设置流程。

### 2.4 可配置项

| 项 | 选项 | 默认 | 状态 |
|---|---|---|---|
| 请求模式 | direct / build | build | 需改 Worker 支持按请求执行 |
| 附件：环境 ▸ 平台名称 | 客户端 / 服务端 / 擦除 | 服务端 | Worker 已实现替换（`build_attachment_sources`），擦除未实现 |
| 附件：环境 ▸ 系统版本 | 客户端 / 服务端 / 擦除 | 服务端 | 同上 |
| 环境 ▸ Shell | 客户端 / 服务端 / 擦除 | 客户端（设计稿） | 原生环境结构含 shell；build 未接通 |
| 环境 ▸ 工作目录 | 客户端 / 服务端 / 擦除 | 客户端（设计稿） | workingDirectory；build 未接通 |
| 环境 ▸ 额外工作目录 | 客户端 / 服务端 / 擦除 | 客户端（设计稿） | additionalWorkingDirectories；build 未接通 |
| 环境 ▸ Git 仓库状态 | 客户端 / 服务端 / 擦除 | 客户端（设计稿） | isGitRepo；build 未接通 |
| 环境 ▸ Worktree 状态与说明 | 客户端 / 服务端 / 擦除 | 客户端（设计稿） | isWorktree；多行说明，build 未接通 |
| 环境 ▸ 临时目录 | 客户端 / 服务端 / 擦除 | 客户端（设计稿） | scratchpadDirectory；带使用说明，build 未接通 |
| 环境 ▸ GitHub 工具说明 | 客户端 / 服务端 / 擦除 | 客户端（设计稿） | githubCli；可选能力说明，build 未接通 |
| 环境 ▸ Agent 代理说明 | 客户端 / 服务端 / 擦除 | 客户端（设计稿） | agentProxy；可选能力说明，build 未接通 |
| 计费归属：cc_version | 客户端 / 服务端 | 客户端（设计稿暂定） | 未接通；原生逻辑按版本与请求内容生成 |
| 计费归属：cc_entrypoint | 客户端 / 服务端 | 客户端（设计稿暂定） | 未接通；原生逻辑从运行时入口／环境变量等取值 |

其余附件不参与本次语义转换，保留客户端原文。现有组件提取器仍会搬运其他 reminder 的位置引用，这不代表我们识别或改写了其语义；后续应避免对无关 reminder 做无必要的拆分。

## 3. 附件在请求里的形态（调查结果）

### 3.1 请求结构

官方 2.1.302 客户端首轮请求抓包（`artifacts/attachment-probe-BMPwq4/request-1.json`，合成测试项目）：

```text
system[]
  [0] x-anthropic-billing-header: cc_version=…; cc_entrypoint=…;   计费归属头，不是附件
  [1] You are a Claude agent, built on Anthropic's Claude Agent SDK.
  [2] 主系统提示（含一个「# Environment」标题，内容是模型/产品介绍，不是环境附件）
messages[0] (user) content[]
  [0] <system-reminder>\n# Environment\nYou have been invoked in the following environment: \n - …\n</system-reminder>
  [1] <system-reminder>\nYou are powered by the model named …\n</system-reminder>
  [2] <system-reminder>\n<total_tokens>N tokens left</total_tokens>\n</system-reminder>
  [3] <system-reminder>\nCodebase and user instructions are shown below. …\n</system-reminder>
  [4] <system-reminder>\nAs you answer the user's questions, you can use the following context:\n# gitStatus\n…\n</system-reminder>
  [5] <system-reminder>\nToday's date is 2026-10-20.\n</system-reminder>\n
  [6] 用户真正的提问（带 cache_control）
```

- 每个附件单独一个 text 块，整块是一个 `<system-reminder>`。2.1.302 所有附件渲染都走同一个包装函数（`Pl` → `sd`）：`` `<system-reminder>\n${内容}\n</system-reminder>` ``，不带属性、不转义。
- 另有一种带 id 的变体 `<system-reminder id="hex">…</system-reminder id="hex">`，只用于 `queued_command`，与本文的附件无关。
- 本地 jsonl 会话文件里附件是 `"type":"attachment"` 的结构化记录，发请求时才渲染成文字。识别规则只能按 HTTP 文本写。

### 3.2 连续会话中附件何时出现

本会话 jsonl（桌面版 2.1.299，90 次提问，4 次压缩）统计：

| 附件 | 次数 | 时机 |
|---|---|---|
| 环境（完整 `# Environment`） | 5 | 首轮 + 每次压缩后；源码中平台/Shell/系统版本变化时也会重发 |
| 环境变更（`# Environment update`） | 151 | 工作目录等变化时；只列变化的字段，不含 Platform / OS Version |
| 模型说明、CLAUDE.md、会话上下文、日期 | 各 5 | 首轮 + 压缩后；变化时另发（CLAUDE.md 变更 1 次、跨天 1 次） |
| 剩余 token 提醒 | 997 | 几乎每轮 |

结论：附件不会出现在每条 user 消息里。每次应处理客户端本次实际携带的完整历史，而不是仅处理 messages[0] 或仅首轮执行。相同策略与快照下保持结果稳定；配置、快照或 CLI 变化可能改变缓存前缀，不能承诺完全不影响提示缓存。

扩展到全部环境字段后，必须把 `# Environment update` 纳入同一字段策略。原生 `Oyt` 支持工作目录（含旧值／撤回）、Worktree、Git 状态、额外目录增删、临时目录、GitHub 工具和代理变化；平台、Shell、系统版本不在这个增量字段列表中。服务端来源不能被后续客户端更新重新覆盖；同一字段的完整块和更新块需一致处理，“was”、增删和撤回语义也要处理，不能只替换冒号后的一个字符串。

### 3.3 待验证：reminder 并入 tool_result

源码函数 `i6n`：user 消息带 `tool_result` 时，其中的 reminder 文本块会被并入最后一个 `tool_result` 的 `content`（接在工具输出后，空一行）。受远程开关 `reminderFold` 控制，线上是否开启未知。首轮环境和会话上下文不受影响；工具调用之后的增量附件可能落在 `tool_result` 里。当前组件提取器会进入 tool_result，但字段转换器不改其中的文本。需要抓一份「多轮 + 工具调用 + 压缩」的真实 HTTP 请求确认，不能把任意工具输出里的环境文字当成可靠附件。

### 3.4 客户端动态 system 排除参数的兼容

已核对 2.1.302 还原源码：

- `chunk-hjb4qtaj.js:28` 注册 `--exclude-dynamic-system-prompt-sections`，默认 false；参数映射为 `excludeDynamicSections`。帮助说明是把动态内容从缓存的 system 前缀移到首条 user 消息，不是保证从整个请求中删除。
- `chunk-3tbxnwq4.js:12` 的 `iar` 在启用时把上下文合并进 `userContext`，返回空 `systemContext`；自定义 system 存在时跳过默认 prompt 和相应动态段生成。
- `chunk-8242685m.js:2272` 的 `fhs` 提供动态记忆上下文；同文件 `LIn`（第 3448 行）独立生成完整环境／更新附件，其入口条件不是该 flag。因此不能仅凭 flag 开关推断请求中的环境一定在哪，或者一定不存在。

目标兼容规则：

1. 在支持的顶层 system 文本／文本块和 user 环境 reminder 中按模板识别，不只找 `system[0]`，也不只找第一条 user。只在原载体原位修改或擦除，不把 user 环境再复制到 system。
2. 客户端已经省略某字段或整个环境块时，跳过对应环境转换；不补回完整机器环境、默认系统提示、记忆路径或 Git 状态。计费归属仍按自身“客户端不补／服务端仅补所选字段”的规则独立处理。
3. 必须先确定本次实际需要替换的环境字段，再获取所需服务端值；无目标环境字段时，不得因无关的服务端 OS／路径读取失败而使请求报错。这是目标行为，当前 Worker 先取 facts 的顺序仍需调整。
4. 续聊／恢复／压缩后，只处理本次请求实际携带的相关内容；不从之前的请求缓存中复活客户端已省略的段落。保持块顺序、角色、无关文本及 cache_control，不把客户端的跨用户缓存布局改回去。
5. UI 不新增同名开关，也不要求用户指出内容位置。在“处理规则”中说明自动兼容 system／user 位置变化和内容缺失。

验收矩阵需覆盖：参数关闭、参数开启、自定义 system、完整缺少环境、仅缺部分字段、连续会话与压缩后重发；每种都检查客户端／服务端／擦除策略。必须比较最终出站请求，确认只改目标字段、没有额外默认提示、没有重复环境；还需验证“无环境 + 服务端 facts 读取失败”仍能正常转发。本轮确认的是源码路径及设计要求，尚未完成该矩阵的真实 CLI 抓包验收。

## 4. 各附件的提取规则

### 4.1 Worker 扫描范围（现实现，`engine/build_attachments.go`）

| 结构 | 是否扫描 |
|---|---|
| 顶层 `system`（字符串或 text 块） | 扫 |
| `role: system` 消息的直接 text 块 | 扫 |
| `role: user` 的 text 块 | 仅当整块去首尾空白后恰好是一个 `<system-reminder>…</system-reminder>`，且内容以 `# Environment` 开头 |
| 用户正文中夹带的、嵌套的、标签不配对的 reminder，代码块内容 | 不扫 |
| `tool_result`、图片、文档、thinking、工具参数 | 不扫 |

### 4.2 平台名称、系统版本（已实现）

1. 正则找环境段（`engine/environment_policy.go:10`）：`^# Environment\r?\nYou have been invoked in the following environment:[ \t]*\r?\n` 加后续连续的 ` - ` 行。
2. 按行首前缀分字段（`engine/environment_attachments.go:6`）：`- Platform:`、`- OS Version:`（另能识别 `- Primary working directory:`、`- Is a git repository:`、`- Additional working directories:` 及其缩进子行、`- Shell:`，但不替换）。
3. `Platform` 行必须正好一行，其他字段不能重复（额外目录除外），否则整段跳过。
4. 只替换冒号后的值，保留换行符和其他行。
5. 服务端值：平台 = Worker 的 `runtime.GOOS`（Linux 为 `linux`）；系统版本 = `uname -sr`，进程内缓存。
6. 能力声明 `build_attachment_sources_v1`；核心启用服务端来源时先探测。

### 4.3 账号邮箱（历史调查，已退出当前范围）

以下仅保留调查依据。最新 UI 不提供账号邮箱配置，不实现此段替换或擦除。

- 位置：会话上下文 reminder 里的 `# userEmail` 段。按 2.1.302 源码，该 reminder 为：
  ```text
  <开头句>
  # userEmail
  The user's email address is X. Use it only to identify the user, such as for authorship, attribution, or filtering their own work. Never send it to an unrelated service, …
  # attachedProject / # gitStatus / # perforceMode（有则按此顺序）
  …

  Claude Code attached this context automatically; it isn't part of the user's message. …
  ```
  开头句三种：`As you answer the user's questions, you can use the following context:`（首次）、`The session context has changed; these values replace the earlier ones:`、`The session context was re-read …; these values replace the earlier ones:`。
- 规则：整块是一个 reminder 且以上述开头之一起头；代码块外找到单独一行 `# userEmail`，下一行匹配 `^The user's email address is (.+?)\. Use it only to identify the user`。服务端：只替换 X；擦除：删除 `# userEmail` 标题与该行，其他段不动。
- 服务端值：容器内 `/work/config/.claude.json` 的 `oauthAccount.emailAddress`。线上 3 个 OAuth 账号容器均能读到；API Key 账号（#21）没有 `oauthAccount`。
- 客户端没发这一段时**不补**。本机 349 个带会话上下文的会话中仅 15 个含邮箱（客户端登录了 Claude 账号或设置 `CLAUDE_CODE_USER_EMAIL` 时才有），所以多数请求不受影响。
- 抓包样本中没有 `# userEmail`，格式只从源码确认，实现前应抓一份带邮箱的真实请求。

### 4.4 不提取的附件及原因

| 附件 | 原因 |
|---|---|
| 账号邮箱、会话上下文中的其他段 | 已退出本次范围，保留客户端内容 |
| Git 状态、项目指令（CLAUDE.md） | 项目内容，服务端没有对应值 |
| 剩余 token 提醒 | 反映客户端上下文用量，服务端不知道 |
| 模型说明 | 用户决定不提取（仅在做模型映射时才有一致性价值） |
| 当前日期、日期变更 | 用户决定不提取（只在跨时区跨天时才有差异） |
| 文件、IDE、Skill、MCP、任务、Hook 等其余附件 | 客户端执行状态，原样保留 |

工作目录、Shell 等现已由用户明确纳入可配置范围，替代此前“永远保留客户端”的决定。UI 默认客户端；选择服务端仅改变模型所见的描述，并不改变工具实际执行位置。环境中未属于已知字段的固定说明、未知行和未来扩展内容仍保持原文。

### 4.5 提取不到时

- 没有该段、格式对不上、有歧义、在代码块里或被正文引用：原样放过，请求照常。目前只在请求调试日志的 `build_attachment_transform` 事件里能看到改了 0 处。
- 客户端没发某附件：不补。
- 客户端通过排除动态 system 参数将环境移到 user 时，按实际载体处理并留在原位置；若整个请求没有环境信息，则跳过，不恢复被省略的段落。
- 服务端取不到值：当前系统版本读取失败返回 503；目标方案在实际需要服务端值时明确报告失败，不静默回退。可选字段合法缺失与读取失败必须区分，具体撤回／缺省行为待补齐。
- 旧 Worker 不支持能力：核心在发送前拦截。

### 4.6 全部环境字段的源码核对（2.1.302）

- `artifacts/claude-2.1.302/linux-restored/chunk-8242685m.js:38` 的 `aNe` 定义上表 10 项结构；`Ryt` 收集环境快照，可能从宿主快照返回，不能假设每个账号都具备所有可选能力。
- 同文件 `pZn/xyt` 生成完整环境块；`Oyt`（第 40 行）生成更新块；`lNe` 是更新字段集合。`isWorktree` 输出多行说明，`scratchpadDirectory` 带长说明，`githubCli/agentProxy` 是可选能力文案，不能全部简化成单行 `Key: value`。
- 当前 `contracts/features/attachments.go:18` 的 build 白名单只有 `platform_name/os_version`，来源只接受 client/worker。旧擦除／替换代码在另一条 native 入口，不能视为当前 build 已支持全部字段。
- 原生生成器可以复用，但它不会自动从任意客户端 HTTP 文本中提取字段并按三层策略合并。必须接入目标识别、服务端快照、字段替换、更新块一致性处理及最终保真验证。
- 服务端工作目录和临时目录来源需要明确账号／会话上下文；不应无意使用每次 request 创建的随机临时目录，导致历史描述每轮漂移。

## 5. 计费归属头（新增来源配置）

- `system[0]` 的 `x-anthropic-billing-header: cc_version=…; cc_entrypoint=…;` 是 Anthropic 的计费归属头，不是附件。build 模式下客户端 system 块原样交给 Worker 的 CLI 发出（`cli-mods/patch-cli-2.1.302.cjs:63`），因此上游看到的是客户端自己的版本和入口。
- 线上客户端实际发送：多数 `2.1.299.* / claude-desktop-3p`，少量 `2.1.300.* / sdk-ts`、`2.1.303.* / cli`；容器 CLI 为 2.1.302。
- 最新决定替代原「不做」决策：**`cc_version`、`cc_entrypoint` 分别选择客户端或服务端**，不提供手动填写或擦除。示例：`x-anthropic-billing-header: cc_version=2.1.302.b50; cc_entrypoint=sdk-cli;`。
- 客户端：保留请求中对应字段的原值。服务端：复用 Worker 实际运行的 CLI 逻辑，按本次请求生成。源码已确认 `cc_version` 的三位后缀是用户消息内容参与计算的指纹，不是固定构建号；入口来自运行时设置及环境变量等回退来源。不得把示例 `2.1.302.b50 / sdk-cli` 硬编码为服务端值。
- 两个字段逐项沿用「账号自定义 → 本次请求 API Key 的分组 → 全局」继承，以及分组两个开关的规则。分组、账号层增加「跟随」选项。账号切回「跟随默认」时也清空这两个字段的自定义来源。
- 界面单列「计费归属」区，两个字段仅展示「客户端 / 服务端」来源选项；继承提示、橙色差异标记、只读来源标签与其他配置一致。差异比较的是配置的来源选项，不是某次请求里的实际字符串。
- 修改对象是请求正文 `system` 中的计费归属文本块。仅替换目标字段值，保留其他字段及内容；这不改变容器实际安装的 CLI 版本，也不要求重建容器。
- 设计稿暂定：全局默认客户端；direct 下该区置灰且不执行改写，已有来源设置保留，build 下才生效。此处是延续原样转发约束的设计假设，尚待确认。
- 目标流程：环境转换完成后，在一次 CLI build 的 system 组装处取原生服务端字段，按来源合并到客户端原块，仅输出一份最终计费归属。不得在原块之外再追加完整服务端 system。普通外部请求的 system 字符串和数组需统一保真路径，内部 probe 的原生提示组装语义单独保留。
- 没有匹配的处理：确认字段缺失且选择服务端时补对应字段，确认整个块不存在才新增；客户端来源不补。疑似目标存在但格式异常、重复或有歧义时保留原文、不追加，记录跳过原因。需要的服务端值生成失败时明确报错。
- 环境与计费归属都要求幂等：同一请求重复处理不会多出附件。诊断至少区分未找到、格式不支持、有歧义、无需变化、已替换、已擦除、已补齐；命中统计界面是否加入正式产品仍待决定。

## 6. 待定问题

1. 可选环境字段（临时目录、GitHub 工具、代理说明等）服务端合法缺失时的撤回／保留规则；与采集失败分开定义。工作目录、Git、Worktree 等字段混合来源时的一致性校验。
2. 提取不到时是否需要在设置页展示每项的命中/未命中次数，或在响应里加诊断头？
3. 需要补抓的真实 HTTP 样本：
   - 多轮 + 工具调用 + 压缩（验证 reminder 是否并入 `tool_result`、增量附件的位置）；
   - 工作目录、额外目录增删、Worktree、可选能力撤回等连续会话更新；
   - `--exclude-dynamic-system-prompt-sections` 开／关、自定义 `--system-prompt`、无环境及部分缺字段请求，覆盖续聊和压缩；
   - Windows 客户端是否发 `\r\n`（规则已兼容，无样本）；
   - Worker 发往上游的实际 HTTP 头（User-Agent 等），目前日志只记录客户端到 Worker 一段。
4. 计费归属：确认全局默认来源及 direct 是否保持原文（设计稿暂定客户端、direct 不改写）。服务端原生生成位置已定位，仍需实现合并并抓取最终出站请求验收。
5. 扩展字段的模板识别及最终保真：修复 null 文本重复注入、原生工具配对在中间 system 存在时丢失结果、错误工具结果媒体规范化等已发现边界；不要仅凭组件层还原成功宣称完整出站无损。

## 7. 实现范围（待确认后开始）

- **核心**：三层配置的存储与合并（全局在 `ccgateway_remote` 设置的 `request_policy`；分组配置与两个开关；账号自定义）；把请求所用 API Key 的分组传到 ccgateway transport；`WorkerRequestPolicy` 按账号与分组合并；容器 CLI 配置固定发 build；能力探测。
- **Worker / CLI**：请求模式按请求执行并校验版本支持的 modes；10 个环境字段的识别、按来源替换与擦除；完整块和增量块一致处理；复用原生快照与渲染，不引入额外模型调用；能力声明与最终出站保真校验。账号邮箱不在范围内。
- **前端**：CC 特性页「全局默认 / 分组默认」两个子页；计费归属 2 项、环境 10 项；账号编辑页新增「CC 特性」区（跟随默认 / 自定义、按分组查看、只读态）；橙色差异标记；direct 置灰；分组总开关；未匹配与连续会话说明。
- **计费归属新增范围**：核心存储、合并并下发两个字段的来源；Worker 获取服务端值并按策略替换对应字段，补充能力探测；前端在全局、分组、账号各态增加「计费归属」区。仅来源选择和三层继承已确定，其余边界见第 5、6 节。

## 8. 依据

- 官方 2.1.302 首轮 HTTP 抓包：`artifacts/attachment-probe-BMPwq4/request-1.json`。
- 2.1.302 还原源码：`artifacts/claude-2.1.302/linux-restored/`（附件渲染表、`session_context` 拼装、环境完整块与 update 的生成条件、`i6n` 折叠逻辑）。
- 本机 jsonl 会话（2.1.299 等）：字段结构与出现频率。
- 线上只读检查：账号容器 `/work/config/.claude.json` 的邮箱字段是否存在；Worker 请求日志中客户端计费头的版本与入口分布。未修改任何容器。
- 研究文档：`plugins/ccgateway/docs/BUILD-ATTACHMENT-TRANSFORM-DESIGN.md`（附件 131 类清单与 build 转换实现）。
- 本次源码核对：`chunk-8242685m.js` 的 `aNe/lNe/Ryt/pZn/xyt/Oyt`；计费归属 `chunk-dy1pvfkh.js` 的 `GPo`、`chunk-fgk2rzb0.js` 的 `VAs`，以及项目的 `patch-cli-2.1.302.cjs`。本地 patched-v11 核心文件哈希与其补丁清单一致，未重新确认线上产物。
- 动态 system 参数：`chunk-hjb4qtaj.js:28` 的参数声明、`chunk-3tbxnwq4.js:12` 的 `iar`、`chunk-8242685m.js:2272` 的 `fhs` 与第 3448 行的 `LIn`。
