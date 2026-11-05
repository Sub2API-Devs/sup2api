# pl318-2 放置批次记录

批次：`pl318-2`（2.1.318 升级放置批次）。输入 `artifacts/tmp/batches/pl318-2/decls.jsonl`，6 个 chunk，325 个声明、74,838 字节。

## 结果

- 放置 325 个声明，74,838 字节，未放置 0。
- 目标 45 个：新建 19 个文件，并入 26 个已有文件。
- `check-placement.mjs` 全部三份产物一起跑：`325 placements, 45 targets, 160 docs, 19 module notes, 0 problems, 0 of 325 batch declarations unplaced`。

## 判定方法

除 `docs/process/placement-guide.md` 的证据顺序外，本批主要靠三件事：

1. **`analysis/facades/facades.json` 的导出名**。`chunk-7kayq7nc.js`、`chunk-8nzbdydx.js`、`chunk-ee72ms70.js` 的绝大多数声明都是某个门面 chunk 的导出项（`forgetRefusedProgramUseCase`、`offInCodeModeNoteForModel`、`settleCodeModeOptInAtStartup` 三份门面），所以一个 chunk 的整段就是同一个源文件，只是要给它取一个不带 `_new/` 的名字。
2. **`refs` 反查调用者**（`node tools/q.mjs callers`）。这是本批区分「同名函数该并入哪个已有文件」的主要证据，例如 `THe/wHe` 只在 `utils/messages.ts` 用、`vme/Cme` 只在 `FileEditTool`、`Swe` 只在 `GrepTool`、`OVe` 只在 `bashPermissions`、`Brn/P0o` 在 PowerShell 权限与 bash 权限两侧。
3. **chunk 内相邻的已放置声明（prev/next）**。`chunk-5xgkngpb.js` 有 12,690 个已放置声明，本批的 166 条夹在中间，prev/next 直接给出所属文件或相邻兄弟文件（例如 110–125 段夹在 `utils/Shell.ts` 与 `utils/bash/prefix.ts` 之间，全是 bash 词法）。

## 新建文件（按主题）

MCP App view 状态（`ReadWidgetContext`）：
- `tools/ReadWidgetContextTool/prompt.ts`（工具名 + 提示词，1 条 1528 B）
- `tools/ReadWidgetContextTool/ReadWidgetContextTool.ts`（schema 与执行）
- `tools/ReadWidgetContextTool/widgetState.ts`（会话级状态槽位、解析、去重、变更序号）
- `utils/widgetContext.ts`（控制消息 `tool_states` 解析、用户消息旁的 view 提醒文案、是否保留状态的开关判定）

MCP 文件卡片与工具归属：
- `services/mcp/applyArtifactFileCard.ts`（39 条 9087 B）：文件类 MCP 工具「会把会话文件发出去」的询问判定、路径越界说明、ask 决定构造、权限包装。
- `services/api/toolProvenance.ts`（31 条 6444 B）：`ownership_metadata` 与 `api_tool_provenance`，按 server 类型推导来源与 `server_url`。

bash / shell：
- `utils/bash/heredocLexing.ts`（13 条 6949 B）：heredoc、引号、注释的逐字节词法器与 tree-sitter 区间比对。
- `utils/shell/bashVersionRefusal.ts`（3 条 847 B）：bash 太旧时的拒绝文案与前置版本探针。

code mode / REPL：
- `utils/codeMode.ts`（44 条 4014 B）：引擎检查、沙箱条件、pin/unpin、定时与分片上限、关闭时的三段文案。
- `utils/codeModeOptIn.ts`（40 条 7153 B）：opt-in 前提检查、托管/本机设置来源、对话框回答、重启标记。

后台 shell 与进程族观测：
- `tasks/LocalShellTask/limitStopTelemetry.ts`（15 条 5101 B）：限时/CPU 停止与重载停止的统计上报。
- `utils/leftRunningFamilyWatch.ts`（20 条 11518 B）：cgroup 成员与 stat 采样、按 origin 归类、`left_running_family` 上报。

其它：
- `tasks/scriptLaunchedAgents.ts`（恢复脚本启动的子代理 + code mode 附注）
- `utils/programUseCase.ts`（30 条 3000 B，program use case 开关与 bootstrap 重取）
- `utils/hooks/mcpToolHook.ts`（1 条 2873 B，mcp_tool 钩子执行）
- `commands/project/index.ts`、`commands/setup-bedrock/index.ts`、`commands/setup-vertex/index.ts`、`commands/skill-doctor/index.ts`（4 个命令注册对象）

## 发现的 2.1.318 新功能

- **ReadWidgetContext**：MCP App 视图把状态交给宿主，模型按 view id 读；只在无头云 worker 且 `tengu_amber_trellis` 开着时保留状态，用户消息旁有 view 提醒。
- **文件卡片权限**：MCP 文件类工具首次调用会被判为「可能把会话文件发出去」，除本地文件卡片开关外一律询问；与 `anthropic/notPublicWhen` 元数据、钩子登记、回合位置（`joined_*`）相关。
- **工具归属 `ownership_metadata` / `api_tool_provenance`**：给工具和工具结果打 `verified:false, owner:"mcp"` 与可选 `server_url`，API 拒绝时记 `server_url_refused`。
- **code mode / REPL**：`CLAUDE_CODE_EXPERIMENTAL_CODE_MODE` 全家（引擎检查、沙箱宿主网络列表、工具名对 API 隐藏、启动期 opt-in 询问与重启标记）。
- **program use case**：`CLAUDE_CODE_PROGRAM_USE_CASE_ID` / `..._STAMPED`，`program_use_case_id` 请求字段与 `program_use_case_stamps_v1` 能力。
- **bash 版本过旧拒绝**：`__CLAUDE_CODE_DID_NOT_RUN_BASH_TOO_OLD=` 标记与改写建议。
- **后台进程族观测**：`left_running_family` / `after_heavy_stop` / `background_limit_stop|restart` 系列诊断，只在 hosted_worker 且设了诊断文件时启用。
- **脚本启动代理的恢复**：REPL 脚本起的子代理用 sidecar `.meta.json` 恢复，通知里附 SendMessage 提示。

## 存疑与注意事项

- `chunk-8nzbdydx.js` 里有 30 个声明属于**精简替换实现**（`mca`/`hca`/`gca`/`yca` 返回空串或 `false`，`qDn` 空函数），看起来是门面里被打桩的那一层；照门面主题放进 `utils/codeMode.ts`。
- `utils/codeModeOptIn.ts` 的 `o` 状态槽位在原始代码里是模块级可变对象，只有名 `o`；同文件另有保加利亚式短名（`gsa`/`_sa`/`bsa`），命名批次需要留意。
- `services/mcp/applyArtifactFileCard.ts` 里 `W`/`H`/`F`/`X` 等单字母名在原 chunk 中与其它文件混排，仅靠一个 chunk 无法确认它们与 316 的同名函数是否一一对应；按调用关系（`te`→`W`/`F`/`H`、`ce`→`de`/`C`）整段并入同一文件。
- `utils/programUseCase.ts` 每条都是 20–350 B 的小函数，测试时容易漏；它们与 `chunk-3tew89vt.js` 的「本会话 use case 由启动它的应用设置」文案同属一套。

## 未放置

无。
