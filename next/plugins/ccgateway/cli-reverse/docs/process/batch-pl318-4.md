# pl318-4 放置批次

## 结果

- 放置 325 个声明、76763 字节（本批全部，`unplaced` 为 0），来自 37 个 chunk。
- 目标文件 48 个：新建 34 个，并入现有模块 14 个。
- 校验：`check-placement.mjs` 报 `325 placements, 48 targets, 220 docs, 34 module notes, 0 problems, 0 of 325 batch declarations unplaced`。
- 重要声明说明 220 条（覆盖全部 186 个“导出/≥300 字节”的声明，另有一批小辅助函数一并说明）。

## 判断方法

本批几乎全是 2.1.318 新增代码，`old` 配对只有 2 条（都是 `conflict`，即同一路径上代码已改），因此主要依据：

1. **chunk 内位置**：Bun 把同一源文件连续放在 chunk 里，两侧已放置声明给出唯一的归属候选；同 chunk 的批内声明互相引用（`=` 前缀 refs）说明它们同一个源文件。
2. **跨 chunk 使用者的路径**：如 `chunk-gg17c06d.js` 的规则函数只被 `utils/permissions/permissions.ts` 调用、`chunk-y3znj513.js` 只被 `utils/permissions/editPermissionRules.ts` 调用，判定并入这两个模块。
3. **字符串主题**：遥测事件名（`tengu_mcp_drive_download_*`、`tengu_mcp_gmail_*`）、错误文案、设置键、环境变量名（`CLAUDE_CODE_EXPERIMENTAL_CODE_MODE`、`CCR_SHR_IDLE_RELEASE_DEFAULT_MINUTES`）、API 路径。

## 主要主题

- **Code 模式（Code Mode / REPL）**：本批最大的一块。`utils/codeMode/` 下：接受状态门面 `accepted.ts`（`ae`/`ic` 被上百处调用，是全树判 Code 模式的入口）、会话恢复 `sessionResume.ts`、脚本报错可读化 `scriptErrors.ts`、丢失 eval 事件 `lostEvals.ts`、待办上报 `pendingActionReport.ts`、tick 裁剪 `toolCallTicks.ts`；另有 `utils/replStateNote.ts`（压缩后保留 VM 状态的 note）、`utils/bunEngineProbe.ts`（判定引擎是否支持 pinned/无 eval 语义）、`constants/codeMode.ts`、`components/messages/ScriptSourceRow.tsx`。
- **MCP 连接器遥测与附件**：`services/mcp/googleConnectorAttachments.ts`（Drive/Gmail 附件去向遥测）、`services/mcp/claudeDocsLinks.ts`（Claude Docs 链接与读写判定）；`utils/toolResultStorage.ts` 增加 Drive 下载结果去向统计。
- **权限**：`utils/permissions/legacyWildcardRules.ts`（`(*)` 旧通配兼容）、`utils/permissions/mcpPolicyAsks.ts`（MCP 策略 ask 与 acceptEdits 放行集合）、`utils/permissions/shellRuleMatching.ts` 新增通配/`$'…'` 匹配函数、`utils/permissions/editPermissionRules.ts` 新增写入前白名单判定、`utils/permissions/permissionRulePayload.ts` 相关的 `V`/`se` 集合。
- **self-hosted runner**：`workLook.ts`（工作区是否值得保留的检查与原因）、`releaseReasons.ts`（原因文案与汇总）、`sessionTurnState.ts`、`idleRelease.ts`；`utils/git/gitDirProbe.ts` 为判定仓库目录的底层工具。
- **poll_event 与 hook 反馈（Code 模式配套）**：`utils/pollEvents/following.ts`、`utils/hooks/replHookFeedback.ts`。
- **TLS**：`utils/tlsAgentPool.ts`（开关变化时作废旧 keep-alive 连接）；`utils/caCerts.ts` 增加服务器证书补充与已知哈希。
- **上传/TLS/安装与杂项**：`utils/uploadsInPlace.ts`（就地上传记录清理）、`utils/nativeInstaller/cleanup.ts` 与 `lockFiles.ts`、`utils/embeddedResources/helperDts.ts`、内置插件 `plugins/bundled/privacyEmail/`、`commands/review/ultrareviewRun.ts`、`commands/project/projectCommand.ts`、`utils/sessionStateCwd.ts`、`services/api/connectorFields.ts`、`utils/attachments/pdf.ts`、`services/artifacts/artifactReadMarks.ts`、`services/artifacts/listArtifacts.ts`（artifact 分页列表）、`utils/betas.ts` 的三个新开关。
- **并入现有模块**：`tasks/taskKinds.ts`（`local_script` 类型判定）、`utils/toolResultStorage.ts`、`components/messages/nullRenderingAttachments.ts`、`services/artifacts/listArtifacts.ts`、`utils/caCerts.ts`、`utils/model/canonicalModelName.ts`、`utils/betas.ts`、`services/analytics/growthbook.ts`、`services/oauth/validateOauthToken.ts`、`utils/permissions/permissions.ts` 相关文件、`utils/settings/policySettings.ts`、`services/remoteManagedSettings/remoteSettingsState.ts`、`utils/auth/oauthRefreshExitWait.ts`、`services/mcp/claudeDocsLinks.ts` 以外的 `services/mcp/client.ts` 调用点。

## 发现的 2.1.318 新功能（写版本变化清单用）

1. **Code 模式正式化**：出现 `CLAUDE_CODE_EXPERIMENTAL_CODE_MODE`（及 `_RESTART`、`_RESTARTED_FROM`）与产品名 "Code Mode"；配套引擎探测（Bun pinned 属性、thenable await、禁用 eval）、脚本报错修复提示、压缩后 REPL VM 状态 note、丢失 eval 的补事件、待办（requires_action）上报、transcript 里的脚本源码行。
2. **Drive/Gmail MCP 连接器**：官方 `drivemcp.googleapis.com` / `gmailmcp.googleapis.com`，按下载结果去向（保留在对话、存成文本、被裁、未读）与附件（保存/未保存）打遥测。
3. **权限规则形态变更**：`Tool(*)` / `Tool()` 的新通配形态，旧形态在 `bot_protected_tengu_amber_plover` 开关下改写成 `*`；MCP server 的策略 ask 与 acceptEdits 放行集合。
4. **self-hosted runner 的会话释放依据**：工作区未提交改动、未推送提交、stash、子模块、隐藏文件、空闲上限（`CCR_SHR_IDLE_RELEASE_DEFAULT_MINUTES`，0.1–10080 分钟）。
5. **内置插件 privacyEmail**：工具参数里出现登录账号邮箱时改为询问。
6. **/project 命令**：设置/清除 claude.ai Project 归属，支持 `--save` 写 localSettings。
7. **ultrareview 本地运行器**：轮询 launch 记录的 session id、解析 findings JSON、超时/中断的 outcome 与账单提示。
8. **文档连接器**：artifact 链接可解析成 Claude Docs id，并判定工具调用是否属于文档读写。
9. Artifact 列表新增 `rel=shared` 的 channel 帧列表与分页路径。

## 判断依据不足的部分

- `chunk-2canq4nz.js`（引擎探测）只被 `_new/settleCodeModeOptInAtStartup.ts` 使用，放在 `utils/bunEngineProbe.ts`；文件名是自取的，命名批次可改。
- `chunk-ba67dbvd.js` 的 `__cc_resource_N` 内嵌资源没有调用者，按资源名（`core.bash.*.d.ts`、`team.*.d.ts`）判定为 `utils/embeddedResources/helperDts.ts`，是推测。
- `chunk-5r0xewha.js`（REPL 状态 note）与 `chunk-fb0zsxh0.js`（丢失 eval）都在本批内自洽、外部没有调用者，靠文案主题判定到 `utils/replStateNote.ts` 与 `utils/codeMode/lostEvals.ts`。
- `chunk-8b3c8k70.js` 是独立插件 chunk（`tool.check` hook + `registerPlugin`），插件名取自遥测字符串 `tengu_wise_newt` 与描述中的隐私语义，目录名 `privacyEmail` 为自取。
- `chunk-k6jh5e6v.js` 与 `chunk-f4vx46x7.js` 都是 self-hosted runner 的 work-look 相关代码，按职责拆成 `releaseReasons.ts` 与 `workLook.ts` 两个文件，拆法可能过细。
- `chunk-rmtfpbze.js`（git 目录探测）与 `chunk-v7p9necf.js`（相对 cwd）在本批内可判定用途，但文件名是自取的。
- 没有声明写成空（未放置）——所有 325 条都找到了有依据的目标，但上面这几组的目标文件名是推测。
