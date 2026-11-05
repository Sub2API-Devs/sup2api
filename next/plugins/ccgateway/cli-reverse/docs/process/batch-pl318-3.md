# pl318-3 批：放置记录

批次：325 个声明 / 147006 字节 / 16 个 chunk。全部放置（`unplaced` = 0，`check-placement.mjs` 0 problems）。

## 方法与依据

- 先按 chunk 内的位置排序（`artifacts/tmp/batches/pl318-3/work/order.mjs`），把每段未放置声明夹在哪些已放置行之间看清，再读 `original/<chunk>` 的对应字节确认主题。`prev`/`next` 只作辅证：本批 325 条里有 323 条两侧路径不同，单靠 prev/next 会误判。
- 判断依次用：门面导出名（`export{...}` 里的 `as 原名`）、字符串（日志消息、`tengu_*` 开关名、错误文本、UI 文案）、调用者与被调用者（`q.mjs callers`）、导入来源；第三方与旧版目录只用来定文件名。
- 本批没有 2.1.316 配对（`old` 全为 null），全部凭 2.1.318 自身证据。

## 放置结果

并入现有文件 15 个目标、新建 23 个文件。按主题：

- **print 模式主循环（0yw3taqg）**：孤儿代理唤醒判定并入 `cli/remoteIO/orphanAgentRestore.ts`；`resume_cache_warm` 一族新建 `cli/print/resumeCacheWarm.ts`；命令列表刷新节流 `cli/print/commandRefreshThrottle.ts`；被扣留消息停止开关并入 `cli/print/turnStartChecks.ts`；被中断回合的续写上下文并入 `utils/conversationRecovery.ts`；同步技能目录锚点 `utils/syncedSkillsAnchor.ts`；附件撤回补齐并入 `utils/attachments/bridgeAttachments.ts`。
- **Remote Control 脚本结果（2s9zwbhq）**：新建 `services/remoteTools/storedRemoteToolResult.ts`（25 个声明，裁剪/改写/帧生成）。
- **消息文案（5ythzcas）**：隐藏/移除图片占位句并入 `utils/messages.ts`。
- **REPL UI（czq1j3j2）**：草稿撤回提示 `screens/repl/draftCallouts.ts`；复制会话到新账号 `screens/repl/copySessionDialog.tsx`；Life Sciences 用例选择 `components/useCaseChoiceDialog.tsx`；权限提示对话框 `components/dialogs/PermissionPromptDialog.tsx` 与拒绝原因路径解析 `utils/permissions/confusableNameMarkers.ts`；首页 logo 退场 `screens/repl/logoRetire.ts`；其余并入 `hooks/useCanUseTool.tsx`、`screens/REPL.tsx`、`remote/RemoteTransport.ts`、`components/PromptInput/PromptInput.tsx`、`screens/repl/turnResult.ts`、`screens/repl/SessionController.ts`、`hooks/notifs/specs/sessionNotices.ts`。
- **新工具（fmnbrxwy）**：`ReadWidgetContextTool`（MCP App 视图状态读取）与 `WrapUpTool`（回合收尾的 recap/按钮）。
- **ultrareview eval（gsmkwtjh）**：`commands/ultrareview/ultrareviewEval.ts`，即 `claude ultrareview eval` 的非交互实现。
- **REPL 停止报告（gv3r3pqa）**：`tools/REPLTool/stopReport.ts`（脚本被打断/被拒时逐个工具调用写结局）。
- **工作区 diff（hma1b5gv）**：无仓库降级（临时 git 目录、ls-files、commit-tree 基线）并入 `bridge/workspaceDiff.ts`；目录前缀并入 `utils/workspaceDiff.ts`。
- **Gmail 附件校验（hs37d1w3）**：并入 `services/mcp/driveFileReferences.ts`。
- **REPL 脚本会话（k3zg85zg）**：`state/replSessions.ts`。
- **本地会话搬云端（mzw6m19v / q8dj26dj）**：`utils/teleport/localSessionMove.ts`（检查/读转录/导出）与 `utils/teleport/conversationMove.ts`（全流程与全部拒绝、收尾文案）。
- **foresight / Remote Control 状态（npgp1xzs）**：`utils/foresightStatus.ts`。
- **artifact 内联信封（nrv8bm0w）**：`services/artifacts/framedCopies.ts`。
- **程序级用例选择（vn3g7zt8）**：`utils/programUseCaseChoices.ts`。
- **/proc 扫描（y080jnb6）**：`utils/procScan.ts`；另有 2 条（超时包装、look 调用）并入 `entrypoints/mcpServe/cpuReport.ts`。

## 发现的 2.1.318 新功能（写版本变化清单可用）

1. **ReadWidgetContext 工具**：模型读回 MCP App 视图共享的状态，带图片预算与逐视图截断说明。
2. **Wrap up 工具**：回合结束时回传 recap、一个问题与最多两个按钮；按钮标签有严格的字符类别校验（不得像编号列表、链接、emoji、带双冒号等）。
3. **`claude ultrareview eval`**：PR 号/URL 解析、费用上限、gh 取 PR 元数据、临时浅克隆、云端审查启动与 JSON 输出；连续失败阈值与中止收尾。
4. **resume 提示缓存预热**：`CLAUDE_CODE_RESUME_CACHE_WARM` + `tengu_resume_cache_warm_config`（延迟、上下文门槛、入口白名单），只在可安全重放的前缀上重放并记录跳过原因。
5. **同步技能目录锚定**：远程读取时允许把已同步技能目录也认作可读范围，按写入者身份与 HIPAA 政策收紧。
6. **本地会话搬云端（/teleport、`claude --cloud`）**：移动前检查（登录/账号匹配/轮次/转录）、转录导出为 txt、失败归档新云会话；一大批拒绝措辞（账号已标记留在本机、历史被 Remote Control 扣留、会话在别处打开等）。
7. **Life Sciences 用例**：可选择用例（单次授权/每次确认），带选择对话框与状态行文案。
8. **REPL 脚本停止报告**：被打断或拒绝时逐条列出每个工具调用的结局，并有字符预算。
9. **附件撤回**：按文件名扫 tool_use 参数隐藏对应调用，并用 `picturesToHide` 隐藏图片。
10. **REPL 会话表 / 草稿撤回提示 / 首页 logo 退场 / 权限提示对话框改版** 等 UI 侧新增。

## 判断偏差与遗留

- **`_new` 与 `*/_new/` 前缀**：检查脚本把这两类都算作 scratch 路径，所以本批目标一律写成"稳定"路径，没有沿用 316 的 `_new/tools.helpers-fmnb.ts`、`screens/_new/REPL.helpers-czq1.ts` 等名字；同一 chunk 的兄弟声明仍在那些文件里，后续合并时会出现同一文件被拆成两处的情况（已按主题合理落位，见下）。
- 0yw3taqg 的 `sy`（命令刷新节流）与 `eI`（续写上下文）：调用者都在 print.ts 附近，但两者职责清楚（刷新节流 / 恢复上下文），分别落到独立小文件与 `utils/conversationRecovery.ts`，没有塞回 print 辅助文件。
- czq1j3j2 的 `sUt`（45 秒常量）只有一个消费方 `remote/RemoteTransport.ts`，并入该文件；`UIe` 是 `useCanUseTool` 的别名，并入 `hooks/useCanUseTool.tsx`。
- 未放置（留空）的声明：0。
