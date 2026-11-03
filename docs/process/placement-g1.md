# 放置组 1（place-g1）过程记录

范围：`analysis/segments/placement-work.json` 的 `groups[1].chunks`，共 228 个 chunk。其中所有 `_unattributed/` 声明，以及声明来自这些 chunk 的 `_new/` 模块。

## 1. 结果数字

| 项 | 数值 |
| --- | --- |
| 待放置声明 | 5,499 个 / 2,632,874 字节 |
| 已放置 | 5,499 个 / 2,632,874 字节（100%） |
| 未放置 | 0 |
| 目标文件 | 473 个（新文件 435 个；并入已有模块 38 个，如 `main.tsx`、`utils/model/modelOptions.ts`、`services/api/promptCacheBreakDetection.ts`、`utils/plugins/managedPlugins.ts`） |
| 只含 1 个声明的文件 | 58 个（多为小常量或小工具，见第 5 节） |
| semantic 名 | `naming/semantic-p1.jsonl` 688 条（全部 confidence 0.75；已跳过门面名或已有 semantic 名的键） |
| 中文说明 | `naming/docs-p1.jsonl` 148 条 |
| 模块说明 | `naming/modules-p1.json` 473 条（新文件都以"2.1.316 新增："开头） |

semantic 命名优先覆盖 ≥300 字节或被导出、且还没有好名字的声明。这类候选共 2,551 个，本轮只命名了一部分。其余仍是 auto 名，后续可以继续补。

## 2. 方法

1. 用 `artifacts/tmp/p1/dump.cjs` 把每个 chunk 的待放置声明按偏移导出：名字、字符串、调用者和被调用者。
2. 按 chunk 写切分规则（`artifacts/tmp/p1/rules/r1–r8.cjs`）。每条规则是 `[起始最小名, 目标路径]`，从这个声明开始，到下一条规则之前的声明都归入该路径。
3. `artifacts/tmp/p1/gen.cjs` 生成 `naming/placement-g1.json`。这一步用 REMAP 对齐组 4 的路径：`services/artifacts/comments/*`、`services/artifacts/artifactToolGates.ts`、`tools/ArtifactTool/permissions/*`。
4. 命名清单放在 `artifacts/tmp/p1/names/n01–n03.txt`，由 `emit-names.cjs` 转成 jsonl。门面键和已有 semantic 键会被跳过。

## 3. 新目录与新文件（按主题，字节为本组放入量）

| 主题目录 | 文件数 | 字节 |
| --- | --- | --- |
| `tools/ArtifactTool/`（含 `actions/`、`preview/`、`permissions/`） | 46 | 670,029 |
| `services/artifacts/`（含 `comments/` 评论自动响应） | 46 | 285,782 |
| `services/claudeGateway/`（`auth/`、`config/`、`store/`、`telemetry/`、`upstreams/`） | 40 | 249,029 |
| `services/daemon/`（后台守护进程） | 14 | 123,885 |
| `services/homeSeed/` | 13 | 103,922 |
| `services/workflow/`（工作流脚本） | 13 | 96,722 |
| `services/mcp/`（MCP tasks、CLI 自有客户端、Drive 引用等） | 19 | 77,080 |
| `services/projects/` + `tools/ContinueInProjectsTool/` | 16 | 101,296 |
| `utils/plugins/`（含 `validate/` 插件目录校验） | 16 | 63,504 |
| `services/api/`（拒绝回退、gzip、Foundry、请求头等） | 13 | 51,057 |
| `commands/review/`（code-review 技能） | 7 | 46,112 |
| `bridge/`（设备签名与 control request） | 6 | 34,965 |
| `cli/`、`cli/handlers/` | 13 | 33,817 |
| `utils/claudeInChrome/` | 7 | 28,321 |
| `services/design/`（Claude Design 同步） | 3 | 28,256 |
| `services/remoteTools/` | 9 | 25,353 |
| `services/plugins/accountSync/`、`pluginPublish.ts` | 6 | 21,234 |
| `plugins/bundled/mermaid/`、`plugins/bundled/diff/` | 6 | 19,682 |
| `utils/managedEnvApply.ts`、`utils/managedEnvSafety.ts` | 2 | 38,722 |
| `services/agentStatus/classifierPrompts.ts` | 1 | 37,271 |

其余是零散的新文件：`commands/{goal,loops,recap,reset-limits,skill-doctor,reload-skills}`、`components/EffortSlider.tsx`、`hooks/useWorkspaceDiff.ts`、`ink/nonBlockingStdout.ts`、`utils/crossSessionInbound/*`、`services/lowPriority/*`、`services/rateLimitCheckpoint/*`、`services/queuedNotifications/*` 等。完整清单见 `naming/modules-p1.json`。

## 4. 2.1.316 新功能

- **Artifact 工具**：发布、列出、读取、版本、固定、分享、打开、实时编辑、预览（headless Chrome CDP）、模拟器 look、room_send、endpoints、upload_asset、copy_from、quickstart、设计系统、持久关注（durable wake/watch）。另有 `/artifacts` 对话框和 `--watch-artifact`。
- **Artifact 评论自动响应**：线程扫描、确认回复、自动编辑（补丁决策与应用）、台账、后台 agent 接手、线程分析器。
- **`claude gateway` 自托管网关**：OIDC/设备流、CRI JWT、Google 组、Bedrock/Vertex/Google/mantle 上游、Bedrock guardrails、花费限额与共享预算（Postgres 加迁移）、OTEL 扇出、托管策略、Desktop 设置下发，以及内置协议文档。
- **工作流脚本**：沙箱 VM、日志与恢复、agent 调用上限和预算、用量限额等待、子工作流。
- **code-review 内置技能**：`/review` 等级、审查角度、GitHub/GitLab 发帖、`--fix`、`--max-findings`。
- **Continue in Projects**：`/continue`、channels API、项目记忆、设置提案与校验。
- **后台守护进程**：bg-pty 宿主、spare 池、名册、任务状态、租约协议、云会话参数（`--cloud/--environment/--pool`）、`claude --desktop` 交接。
- **home seed**：把本地设置、CLAUDE.md、钩子、规则转发到云会话。
- **插件**：目录校验（`claude plugin validate`）、目录绑定、账号插件同步、插件发布、托管插件座席。
- **Claude in Chrome**：安装推广、权限、遥测。
- **API 层**：安全拒绝后的备用模型回退与 safeguard 文案、低优先级模式、请求体 gzip 分块、Foundry 能力剥离、提示缓存打破检测、无人观看时暂存回复、签名发布的模型目录。
- **Claude Design**：同步工具、OAuth、审批对话框。
- **内置 mermaid 插件**：在终端把 mermaid 渲染成框线字符图（流程图、时序图）。
- **新命令与界面**：`/goal`、`/loops`、`/effort` 滑块与 Ultracode、`/reset-limits`、`/recap`、`/skill-doctor`、`/reload-skills`、`/diff` 工作区侧栏、`/fast`、wellbeing 设置、自动压缩窗口对话框、组织记忆项目选择、远程 `/memory`。
- **Remote Control**：入站事件的设备签名判定与 control request 记账，REPL 桥控制请求分发，会话标题写回合并。
- **其他**：远程工具宿主拒绝、排队通知、跨会话入站门槛与寻址（SendMessage）、MCP tasks 持久化、CLI 自有 MCP 客户端、连接器建议、`mcp serve --transport http`、限流检查点提交、`self-hosted-runner setup` 向导、后台 agent 状态分类器提示词、ProposeGoal/ProposeSkills/ListAgents/SendUserFile/PushNotification 工具、非阻塞 stdout、托管环境变量安全（PROJECT_SCOPE_BLOCKED_ENV_VARS）、自动模式设置、设备钩子模板、函数钩子匹配器。

## 5. 不确定的部分

- `services/api/wigglyDove.ts`：81 个小桩函数，代号来自开关名，用途不明，只是按位置聚在一起。
- `components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.ts`：内容是 ui.render 插件渲染钩子注册表。放在这里是因为所在 chunk 附近是这个组件，更合适的位置可能是 `plugins/` 或 `utils/` 下。
- 很小的状态或工具文件（`utils/hostScoped.ts`、`utils/randomId.ts`、`state/sliceHelpers.ts`、`utils/fsFlags.ts`、`tools/MonitorTool/constants.ts` 等）：路径只根据少量线索推定，可信度较低。
- 并入 `commands/install-github-app/*`、`keybindings/*` 等已有模块、大小只有 4 字节的条目：这些是 chunk 边界残片（导出别名或空声明）。

## 6. 给 lead 的建议

1. `_new/engineMergeRead.ts` 的门面导出 `serverFilePresenceSlot`（chunk-czx62zen#ZYt）本组暂放在 `services/remoteManagedSettings/seating.ts`。这个门面文件的主体在组 2 的 chunk-s61vbvea，建议合并到组 2 给它定的文件。
2. `_new/isDeferredToolInConversation.ts` 本组放在 `tools/ToolSearchTool/deferredTools.ts`。chunk-nt81pzj6 里还有 1 个同模块声明（不属于本组），需要统一路径。
3. 三处疑似第三方代码：chunk-e7naa6k8 → `vendor/_unknown/anthropic-google-cloud-client.js`（Anthropic Google Cloud SDK 客户端），chunk-chabsk0s → `vendor/lodash-es/chunk.js`，chunk-9yfhnw1m → `vendor/mermaid/mermaid.min.js`。建议在 vendor 识别里补上这三条。
4. chunk-1ny7cxrt 前约 1.3 MB 是已归属的 vendor（openid-client、zod 等），只有尾部是网关代码。如果以后重切，可以按这个边界切。
5. 本组已和组 4 的 `placement-g4.json` 对齐：`services/artifacts/*`、`services/artifacts/comments/*`、`tools/ArtifactTool/permissions/*`，chunk-99h01h55 的 2 个 listArtifacts 门面声明放在 `services/artifacts/frameFlags.ts`。`_new/listArtifacts.ts` 和 `_new/ArtifactTool.ts` 已全部重新安置。
