# nm318-4：命名批次过程记录

## 范围与产出

- 输入 `artifacts/tmp/batches/nm318-4/plan.json`：364 个声明、1206 个仍压缩的绑定（plan 自报 1598，其中 392 个是 import/冻结/已由 `naming/final` 覆盖，实际待命名 1206 个），范围从 `src/_unattributed/chunk-n51jggtb/part-003.js` 到 `src/bridge/worktreeState.js`。
- 产出 `naming/semantic-nm318-4.jsonl`：1582 行，全部是偏移键、`source: "semantic"`、`confidence` 0.6–0.9。
- 计划内绑定 1206/1206 全部命名（100%），没有跳过任何条目。
- `node tools/naming/annotate.mjs check naming/semantic-nm318-4.jsonl` 输出 `0 problems, 0 suffixed by conflicts`。

## 本批覆盖的代码

按目录分四段：

1. `chunk-n51jggtb`（Code Mode / REPL 工具的剩余部分，650 条）：会话与调用状态、sealers、步数与墙钟预算、异步 eval 通道、PostToolUse 扣留、结果搬运与裁剪、工具定义 `EvalTool`、`<repl-output>` 渲染与解析、内层调用看门狗、Turn 跟踪、超时说明文案。316 的 hints 里 `sourceDir`、`cleanupDir`、`isForceKilled` 等 16 条沿用或按 318 实际代码微调（见下）。
2. `_unattributed` 其余小 chunk：Code Mode 的 opt-in 状态与各类拒绝原因文案、会话从本地搬到云的校验/文案、目录连接器查询（`--web`）、program use case 选择、`/proc` 计数与 CPU 报告、MCP 签名去重、`/project` 命令、`/clear`、脚本工具调用行组件、git 目录识别、会话标题 fork 后缀、ultrathink 判定、预览隧道帧编解码（JSON + protobuf 两套）、工作区 diff、worktree 状态采集。
3. `src/bootstrap`：`RuntimeModeSlice`/`CredentialSlots`/`RequestLatches`/`SettingsCacheStore`/`ToolsUsedSet` 等状态类的参数与局部名。
4. `src/bridge`：附件上传/落盘/预取、入站消息来源、bridge 主循环与重启 spawner、bridge 消息过滤、会话 spawner、work secret、worktree、workspace diff、preview tunnel。

## 沿用的 316 名字

`hints.jsonl` 的 16 条里，能在 318 找到同一位置的都沿用：`account`、`previousAccount`、`plan`、`response`、`sourceDir`、`toImageBlock`、`modelCopyBlock`、`shouldDropSettled`、`personOpened`、`erroredTool`、`message`、`cleanupDir`、`isForceKilled`、`timeoutMs`、`cwd`、`args`。其中 `sourceDir`（`chunk-18851qev.js`）在 318 里是 `sessionSpawner` 结果的字段名，语义不变；`timeoutMs`/`cwd`/`args` 落在 worktree 采集的一侧，按 318 的调用重新确认过。

## 命名依据

- 大量取自字符串字面量：错误串与提示串直接点出用途（`installStepBudget`、`REPL call cap reached`、`clockStop`、`withheldResultText`、`The program file this Remote Control started from is gone`），遥测事件名（`tengu_repl_inner_watchdog_fired`、`tengu_repl_script_end`、`tengu_mcp_claudeai_handoff_opened`、`tengu_bridge_message_received`），设置键与环境变量（`CLAUDE_CODE_EXPERIMENTAL_CODE_MODE`、`CLAUDE_CODE_ATTRIBUTION_PROJECT`、`CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS`）。
- 属性名与调用关系：对象字面量的键（`vmContext`、`sealers`、`steps`、`currentCall`、`pendingCalls`、`raw byConnector`）直接给同名局部；被调用方决定参数名（`refusedShareOutcome(share, ctx)`、`handleHide`）。
- protobuf 帧编解码按字段注释与两侧对称性命名（`decodeHttpRequest`/`encodeProtoFrame`、`decodeHeaderList`）。
- 无依据的极短占位函数（`return []`、`return null`、`return {}`）只给保守名（`listMoveSteps`、`createControlStub`、`buildPrepareArgs`），参数常给 `a`/`b`。

## 冲突处理

`check` 报过 30 余次同作用域/遮蔽冲突，都用换名解决，没有依赖 `_2` 后缀。几个值得记的：

- `output`、`console`、`document`、`module`、`self` 是保留字或全局名，分别改成 `strippedOutput`/`replConsole`/`pdfDocument`/`moduleNamespace`/`ownRow`。
- `chunk-n51jggtb` 里 `nu`/`Ki` 等函数内已有同名局部，参数改成 `session`、`toolList`、`allTools`。
- `check` 的冲突判定会连带 `naming/final` 里已有的名字，几次冲突只有带上 final 表才复现（`work/conflict3.mjs`），所以修完后都用它复扫了全部 55 个 chunk。

## 发现的已有错误（未改，供后续修）

1. `chunk-n51jggtb.js` 的 `cu`（`installStepBudget`）里，插值进 VM 的计数器全局名是 `${cr}Counter`，而 `cr` 在 `naming/final` 里已叫 `stepBudget` 又被复用；同一函数里 `steps` 与 `sealerContext` 命名重叠，读起来容易混。
2. `naming/final` 把 `chunk-n51jggtb.js` 里 `Pt`（`runInVm`）的第三个参数直接命名为 `importModuleDynamically`，但同 chunk 另有同名的顶层变量 `importModuleDynamically`（`@164822`），二者在阅读树里会撞名。
3. `chunk-n51jggtb.js` 的 `Lu`（`runPostToolUse`）第一个参数 `dispatchCtx` 实际是 `{dispatchCtx, replToolUseID, parentMessage, input}` 的请求对象，不是单个上下文；已按 `request` 命名，但 final 表里同名参数仍叫 `dispatchCtx`。
4. `chunk-q8dj26dj.js` 的 `helpder` 系函数（`checkMove`/`validateMove`）在 final 表里 `response`、`source` 等名字被多处复用，318 新增的参数没有区分度，已在本地用更具体的名字（`asked`、`ctx`、`refusal`）。

## 难以判断的部分

- `chunk-q8dj26dj.js` 的 `ro`、`io`、`ao`、`uo`、`co` 都是 `return;` 或 `return []` 的空实现（云搬迁的占位），只能按调用点猜出 `startPrepare`/`cancelPrepare`/`listPrepareSteps`/`listPrepareWarnings`，会后接真实实现时可能要改。
- `chunk-pfdb6yeg.js#Xdo` 恒返回 `!1`，名字只能叫 `isSomething`。
- `chunk-zmp9ej5f.js`、`chunk-5ythzcas.js#K` 等位置只剩一个形参，给了 `a`。
- `chunk-n51jggtb.js#Xn`（`prewarmScript`）函数体是空的 `return;`，两个参数按入参保留 `code`/`markName`。

## 校验

```
node --max-old-space-size=3000 tools/naming/annotate.mjs check naming/semantic-nm318-4.jsonl
1582 lines, 55 chunks, 0 problems, 0 suffixed by conflicts
```

另用 `work/cover.mjs` 按 plan 逐声明回扫，计划内 1206 个绑定全部有名字。真实偏移与 plan 给的 `start` 偶有 0–9 字节偏差（plan 记录的是声明起点，命名键要的是标识符起点），出现 8 次，都用 `bindingsOf` 与原文 slice 核对后改成标识符偏移。
