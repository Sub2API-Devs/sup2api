# 第三阶段放置：组 0（place-g0）过程记录

范围：`analysis/segments/placement-work.json` 的 `groups[0].chunks`（227 个 chunk，约 2.2 MB 未归属代码），以及来自这些 chunk 的 18 个 `_new/*` 模块。

## 1. 结果数字

| 项 | 数 |
|---|---|
| 范围内声明 | 6,570 个（未归属 5,797 个 / 2,210,044 字节；`_new/*` 773 个 / 409,974 字节） |
| 已放置 | **6,570 个 / 2,620,018 字节（100%）** |
| 未放置 | 0 |
| 目标文件 | 393 个：新文件 300 个（5,412 个声明、2,268,807 字节），并入已有模块 93 个（1,158 个声明、351,211 字节） |
| `_new/*` 模块改路径 | 18 个，全部给出正式路径（见第 4 节） |
| 语义名 `naming/semantic-p0.jsonl` | 1,686 条（顶层名 + 部分函数参数）；改名引擎逐模块试跑 1,686 条全部生效，0 冲突、0 拒绝 |
| 说明 `naming/docs-p0.jsonl` | 552 条 |
| 模块说明 `naming/modules-p0.json` | 393 条（每个目标路径一条，新文件写明"2.1.316 新增"） |

产物全部由生成器重建：`node artifacts/tmp/p0/gen.mjs`（输入是 `artifacts/tmp/p0/spec/*.txt` 的手写放置规格、`spec/fixnames.fix`、`artifacts/tmp/p0/index.json`）。辅助脚本：`index.cjs`（建声明索引、出入边）、`dump.cjs`/`brief.cjs`/`detail.cjs`/`src.cjs`（浏览）、`check.mjs`（用 rename 引擎试跑语义名）、`multivar.mjs`（找多声明符 var 的命名问题）。

## 2. 方法

1. 按 chunk 把声明序列压缩成"连续同路径段"，看未归属段的字符串、出入边和左右已归属模块（`runs.txt`）。
2. 每个 chunk 写放置规格：`> 起始声明 目标路径 | 模块说明` 按 chunk 内顺序切段（Bun 把同一源文件的顶层语句连续放置，所以按锚点切段基本就是按文件切）；`= _new/X.ts 目标路径` 处理门面模块；逐个声明写语义名和说明。
3. 证据优先级：门面原名（如 `createAndUploadGitBundle`、`attachHandler`、`SandboxManager`）→ 日志前缀/遥测事件/错误文本（如 `[runner:session]`、`plugin eval:`、`[sandbox]`、`tengu_*`）→ 调用关系 → 旧版同名文件。
4. 语义名只在看过源码后写，置信度 0.75（参数 0.7）。

## 3. 坑

- **多声明符 var**：`var a=1,b=2,…` 这种语句的声明 id 只代表第一个绑定，我起初按"整条语句的主题"起名（如把 `jo=2000` 叫成 AGENT_INPUT_SCHEMA），102 条错位。用 `multivar.mjs` 列出后逐条按第一个声明符的初值改名（`spec/fixnames.fix`），1 条去掉。说明（docs）仍描述整条语句。
- **与领域成员重叠**：40 个绑定已被第二阶段领域成员（agents、extensions、ink、permissions、query、state、tools、ui）命名过，生成器自动让位，不再输出。
- heredoc 里写带反斜杠的正则会被吃掉（WORKLOG 里 lead 记过），改生成器用 Write/Edit。

## 4. `_new/*` 模块的正式路径

| 门面模块 | 目标路径 | 依据 |
|---|---|---|
| `_new/SandboxManager.ts` | `utils/sandbox/sandbox-adapter.ts` | 导出对象 `SandboxManager`、`resolvePathPatternForSandbox` 等就是 2.1.88 sandbox-adapter 的导出（dom-permissions 也这样建议） |
| `_new/RESOURCE_EXHAUSTION_CODES.ts` | `utils/errors.ts` | ClaudeError/AbortError/ShellError/toError/errorMessage/getErrnoCode 都是 2.1.88 utils/errors.ts 的导出 |
| `_new/THIRD_PARTY_PROVIDER_ENV_VARS.ts` | `utils/model/providers.ts` | getAPIProvider、isFirstPartyAnthropicBaseUrl 在 2.1.88 的 providers.ts |
| `_new/resolveInboundAttachments.ts` | `bridge/inboundAttachments.ts` | resolveInboundAttachments/resolveAndPrepend 在 2.1.88 的 bridge/inboundAttachments.ts |
| `_new/createAndUploadGitBundle.ts` | `utils/teleport/gitBundle.ts` | 2.1.88 有 utils/teleport/gitBundle.ts |
| `_new/buildContextUsage.ts` | `commands/context/context-noninteractive.ts` | collectContextData、call 是 2.1.88 该文件的导出 |
| `_new/filterToolsByDenyRules.ts` | `utils/permissions/filterToolsByDenyRules.ts` | 新建；2.1.88 中 filterToolsByDenyRules 在 tools.ts，但 316 已独立成门面 |
| `_new/attachHandler.ts` | `cli/bg/bgCommands.ts` | --bg、claude attach/logs/stop/rm/respawn |
| `_new/sendToUdsSocket.ts` | `utils/udsMessaging/udsClient.ts` | 跨会话 UDS 消息客户端 |
| `_new/primeWIFProfileFiles.ts` | `utils/wifProfile.ts` | 工作负载身份联邦 profile |
| `_new/screenUnreadUpload.ts` | `utils/claudeInChrome/fileUpload.ts` | Chrome/桌面面板 file_upload |
| `_new/artifactTypeCatalogPromptParagraph.ts` | `services/artifacts/artifactToolSchema.ts` | Artifact 工具输入模式与能力开关 |
| `_new/sendOverMcp.ts` | `services/artifacts/artifactMcpWire.ts` | Artifact 操作经 MCP 线路 |
| `_new/createDeviceHookForwarder.ts` | `utils/hooks/deviceHookForwarder.ts` | 设备钩子转发 |
| `_new/waitForCoordinatorSubagentMcpServers.ts` | `coordinator/coordinatorMcpServers.ts` | 协调者 comms 角色 MCP |
| `_new/dispatchControlRequest.ts` | `cli/print/dispatchControlRequest.ts` | SDK 控制请求分发 |
| `_new/FocusManager.ts`（本组 chunk 内的 1 个声明） | `ink/hooks/use-terminal-focus.ts` | 门面 chunk-1m6xc21j 是 ink 的总导出面（2.1.88 的 `ink.ts`），跨 6 个 chunk，本组只处理 chunk-cg10fy59 内的 `Jc`（useTerminalFocus） |
| `_new/prepareSession.helpers-4ymx.ts` | `ink/colorize.ts` | chalk 级别钳制（clampForAttacher） |

## 5. 新建目录与文件（按主题）

| 主题 | 目录 / 文件 | 文件数 | 字节 |
|---|---|---|---|
| claude plugin eval（插件评测框架） | `services/pluginEval/**` | 29 | 307 K |
| 内置函数钩子插件：easel 图表、Claude Test、tips、responsive mode | `plugins/bundled/{easel,claudeTest,tips}/**`、`plugins/bundled/responsiveMode.ts` | 24 | 188 K |
| 自托管 runner | `services/selfHostedRunner/**`（12 个文件 + childArgs.ts） | 13 | 约 300 K |
| 工作树上传给云会话（git bundle、WIP stash、种子） | `utils/teleport/{gitBundle,wipStash,gitBundleVerify,gitBundleLayout,seedPaths,uploadManifestText}.ts` | 6 | 173 K |
| Artifact（数据库、共享/置顶、已发布文件、评论监视恢复、回复让出、工具模式） | `services/artifacts/**` | 11 | 160 K |
| 后台会话与守护进程 | `cli/bg/**`、`cli/daemon/**`、`commands/daemon/index.ts` | 8 | 107 K |
| 远程工具（在附着机器上执行工具调用） | `services/remoteTools/**`、`bridge/deviceRegistration.ts` | 8 | 98 K |
| SDK/headless 会话辅助（cli/print 拆出的部分） | `cli/print/**` | 13 | 83 K |
| 从 Codex/Cursor/Gemini 导入配置 | `services/agentImport/**` | 5 | 62 K |
| 函数钩子运行时（面板、surface 客户端、会话事件、宿主桥） | `plugins/functionHooks/{panes,surfaceClients,sessionEvents,hostBridge,hooksErrors}.ts` | 5 | 58 K |
| MCP 新增（客户端能力、needs-auth 缓存、文件输入、错误脱敏、工具可用性、tools/list 提前） | `services/mcp/*.ts` | 19 | 47 K |
| /plugin 界面新增（发现页、技能体检、详情、标签） | `commands/plugin/*.tsx` | 7 | 40 K |
| 模型目录与提供商缓存 | `utils/model/{modelCatalog,providerCaches,deprecatedModels,modelUnavailability,startupModelResolution}.ts` | 5 | 37 K |
| 提示词注入防护：易混淆字符 | `utils/confusables.ts` | 1 | 33 K |
| 沙箱辅助（Windows srt-win、Linux seccomp/AppArmor、错误表、设置来源） | `utils/sandbox/*.ts` | 6 | 27 K |
| 其余（OAuth 被拒登录回滚、用量积分优惠、/autofix-pr、/auto-mode-setup、ultrareview CLI、claude gateway 横幅与压测、--client-data-url、项目技术栈探测、错误追踪、跨会话消息防护等） | 分散在 `services/`、`utils/`、`commands/`、`components/`、`tools/` | 约 180 | 约 500 K |

并入已有模块的例子：`utils/sandbox/sandbox-adapter.ts`（+307 个声明，主体是 50 KB 的配置转换 `Q0`）、`utils/errors.ts`、`bridge/inboundAttachments.ts`、`cli/transports/ccrClient.ts`、`components/Settings/{Config,Usage}.tsx`、`components/CustomSelect/select.tsx`、`utils/hooks.ts`、`utils/fileRead.ts` 等 93 个。

## 6. 发现的 2.1.316 新功能（手册素材）

1. **自托管 runner（`claude self-hosted-runner`）**：在客户机器上为 CCR 云环境跑会话。启动时把宿主 `~/.claude` 拍成快照（disk/memory 两种模式、sha256 校验、篡改即停），按会话种入配置目录；"受管 git"（git 挂载路由、GIT_SSL_CAINFO 信任包、凭据助手、推送 URL、canonical 仓库清洗）；launcher_hooks、agent_files、服务器下发的系统提示词与 auto mode 列表；仓库设置越权检查（SELF_HOSTED_RUNNER_CONFINE_REPO_SETTINGS）；SSE work-hints 唤醒轮询；大量 `SELF_HOSTED_RUNNER_*` 环境变量。另有内部工具集查看自托管环境、重排卡住会话、试运行本地 runner。
2. **`claude plugin eval` / `plugin eval init`**：插件评测框架。用例 `case.yaml`/`prompt.md`、评分器（regex、文件、工具使用/顺序、mock 调用、LLM 评分）、mocks/ 目录里的 MCP 替身（固定回答、录制回放、由代理扮演），with/without 插件对比报告；子会话在严格围栏里跑（凭据存储排除覆盖 AWS/kube/ssh/krb5/JVM/Ansible/Azure/gcloud、属主检查、沙箱网络与文件系统限制、只允许 EVAL_* 环境变量），可把结果发布为 Artifact。
3. **内置函数钩子插件**：easel（`mcp__easel__chart`，把工具结果画成终端折线/柱状/迷你图/占比条，能读 Prometheus/Datadog/Grafana/Influx 格式与 CSV/Markdown 表）、Claude Test（`/claude-test`，在本机浏览器用 Playwright MCP 测试仓库里的 Web 应用，带面板、规格起草/执行代理、修复建议）、tips（Spinner 提示改成插件）、responsive mode、plugin-authoring 技能（"Make a mod"，含分享前的 scan_secrets 工具）。
4. **远程工具 / 设备桥**：工具调用可转发到"附着的机器"执行（输入模式多一个可选机器名），含远端 ask 座席、重连保持、权限规则与分类器、设备钩子转发、无人值守执行同意（remoteTools.allowUnattendedServing）。
5. **后台会话与守护进程**：`claude --bg`、`attach/logs/stop/rm/respawn`、`claude daemon`（服务安装、scheduled 定时任务、remote-control）、预热 spare 进程池、PTY 宿主、Fleet 视图派发、退出交接（adopt.json）。
6. **工作树上传**：替代 2.1.88 的简单 git bundle，增加 WIP stash 捕获（安全读工作树、校验对象哈希）、bundle 完整性校验、检出布局与 git 配置安全检查，以及大量"为什么不上传"的说明。
7. **Artifact 扩展**：数据库（/api/frame/db/agent，集合/文档、str_replace、批量、版本冲突）、共享与置顶、版本列表、已发布文件读取、评论自动回复的多会话"让出"协调、恢复时重新武装评论监视。
8. **从其他 AI 编码代理导入**：OpenAI Codex、Cursor、Gemini CLI 的指令、规则、命令、技能、钩子、MCP 服务器，带 shell-exec 标记等安全检查；另有 claude.ai 对话导出导入（CLAUDE_IMPORT_CONVERSATIONS）。
9. **模型与提供商**：内置模型目录（含 Haiku 5.5 等、各提供商 id、能力、价格档，服务端可覆盖能力）、弃用/退役模型表、未知模型上下文窗口提示、`--client-data-url` 签名客户端配置文档、模型切换的 PreModelSwitch 钩子与服务端 model_selector_state 同步。
10. **安全加固**：易混淆字符表与伪造标签中和、子代理输出伪造标记扫描（tengu_subagent_output_flagged）、Windows 沙箱（srt-win，ACL 授权给沙箱组）、Linux AppArmor 用户命名空间检测、密钥脱敏、安全运行 git、错误栈遥测安全化。
11. **登录与额度**：被拒登录回滚（组织固定、托管设置、提供商不允许）、保存的登录被拒、WIF 联邦 profile、用量积分邀约（starry_waterfall）与限额重置授予（cedar_ember）、Fable 用量额度显示。
12. **其他**：/autofix-pr、/auto-mode-setup、/pause-memory、/workflows、claude ultrareview、claude mcp login/logout/serve、claude gateway 横幅与压测模式、MCP needs-auth 缓存与文件输入、batch_tools 拆分、"已声明工具集"与延迟工具声明、提示词缓存失效诊断、跨会话消息防护（peer-guard）。

## 7. 判断较弱的地方

- 第三方：`chunk-heg39xxp`/`chunk-kejz1rpb` 中的 AWS SDK package.json 常量放到 `vendor/@aws-sdk/client-{sts,sso}/package.json`，其余 AWS SDK 片段并入相邻的已有 vendor 模块（键不带 `vendor/` 前缀，与 modules.json 一致）；`chunk-9q5xd4yn` 的两个声明按 lodash 的 baseFilter/reject 形状放到 `vendor/lodash-es/`；`chunk-2g090z7k` 开头 7 个空类并入 `@anthropic-ai/sdk/core/error.mjs`。
- 名字是推断的文件（旧版没有、也没有门面原名）：`services/pluginEval/**`、`plugins/bundled/{easel,claudeTest}/**`、`services/selfHostedRunner/**` 内部的切分是按 chunk 内连续段与主题做的，文件边界可能与真实源码不同。
- 一些很小的 chunk（单个声明、只有 `j()` 初始化调用）只能按左右邻居或调用方归属。

## 8. 给 lead 的建议

- `_new/SandboxManager.ts`、`_new/RESOURCE_EXHAUSTION_CODES.ts`、`_new/THIRD_PARTY_PROVIDER_ENV_VARS.ts`、`_new/resolveInboundAttachments.ts`、`_new/createAndUploadGitBundle.ts`、`_new/buildContextUsage.ts` 都对应 2.1.88 的已有文件（见第 4 节），建议切分器在门面→路径匹配里也用"导出名与旧版文件导出名的重合度"，这类门面可以直接自动落到旧版路径。
- `_new/FocusManager.ts` 门面（chunk-1m6xc21j）其实是 ink 的总导出面（2.1.88 的 `src/ink.ts`），成员散在 6 个 chunk；本组只放了 chunk-cg10fy59 的一个声明，其余 chunk 的成员需要对应组按各自文件处理，不宜全部塞进一个文件。
- 多声明符 `var a=…,b=…` 语句在 decl-path 里只有一个 id，语义命名工具最好对每个声明符单独给键（现在只能命名第一个）；其余声明符仍是压缩名。
- 本组与第二阶段领域成员有 40 个绑定重名命名，我已让位；领域成员当时把这些声明命名了但它们仍在 `_unattributed/`，说明领域文件里有一部分命名覆盖了未归属代码，合并时不需要特殊处理。
