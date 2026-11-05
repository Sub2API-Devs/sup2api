# pl318-1：放置批次过程记录

## 范围

- 单个 chunk：`chunk-n51jggtb.js`，336 个声明，193,669 字节，区间 16,877–211,549。
- 全部声明在 2.1.316 里没有配对（`decls.jsonl` 的 `old` 全为 null），316 的构建里也搜不到 `repl-eval`、`__replStep`、`REPL execution timed out`、`tengu_repl_*` 任何一项。

## 结论：整个 chunk 是 2.1.318 新增的 "Code Mode"（REPL/Eval）工具

证据：

1. chunk 末尾唯一的 `export{…}` 是 `export{co as EvalTool,PS as registerEvalToolSeams}`；`chunk-fmnbrxwy.js` 的 `us()` 里 `let e=require("./chunk-n51jggtb.js"); return e.registerEvalToolSeams(),e.EvalTool`，所以这就是 EvalTool 模块本体。
2. 现有的 `tools/REPLTool/constants.ts`（316 已有）导出 `REPL_TOOL_NAME="REPL"`、别名字面量 `Eval`、显示名 `Code`，与本 chunk 的 `co=ln({name:uo,aliases:[IZ],searchHint:"execute JavaScript with programmatic tool access",…})` 一一对应。
3. 代码里的自述注释直接点名同目录的兄弟源文件：`toolWrappers.ts`、`unwritableArguments.ts`、`vmHardening.ts`、`vmContextEscape.test.ts`、`lostEvals.ts`（async Output 的 `evalId` 说明）、`conversationRecovery.ts`（`keptByTurnAbort` 说明）。这些都是 `tools/REPLTool/` 下的文件。
4. 主题集中：在 `vm` 上下文里跑 JS、对 `$`/Read/Write/Edit/Glob/Grep 的包装、步数与墙钟预算、自动模式分类器对脚本的批量检查、异步 eval 通道（`<repl-output>` / `repl-eval` 事件）、PostToolUse 对输出的扣留、溢出文件读回、图片/PDF 搬运。

## 产出

- 336 个声明全部放置，42 个目标文件，全在 `tools/REPLTool/`（沿用既有目录，不新建顶层目录）。
- 按 2.1.88 的 `tools/<Name>Tool/` 与既有 `tools/REPLTool/constants.ts`、`replCallNotes.ts` 的命名惯例，文件按职责拆分，每个 3–17 个声明。

新文件按主题分四组：

- 执行引擎：`vmContext.ts`、`vmHardening.ts`、`globals.ts`、`session.ts`、`instrument.ts`、`parse.ts`、`stepBudget.ts`、`callState.ts`、`watchdog.ts`、`preludes.ts`、`runScript.ts`
- 工具调用：`toolWrappers.ts`、`hookRun.ts`、`hookArgs.ts`、`unwritableArguments.ts`、`mcpArgs.ts`、`mcpTools.ts`、`discovery.ts`、`preflightChecks.ts`、`sandboxViolations.ts`、`toolMeta.ts`
- 结果处理：`shellResult.ts`、`spillRead.ts`、`resultContent.ts`、`resultValue.ts`、`innerResults.ts`、`render.ts`、`consoleRing.ts`、`outputBudget.ts`、`virtualMessages.ts`、`serialization.ts`
- 工具定义与周边：`EvalTool.ts`、`prompt.ts`、`typePrinting.ts`、`stopReasons.ts`、`stackTrace.ts`、`scriptChecks.ts`、`scriptStatus.ts`、`sessionHelpers.ts`、`contexts.ts`、`asyncEval.ts`、`asyncSettle.ts`

## 发现的 2.1.318 新功能（写版本变化清单用）

1. **EvalTool / Code Mode**：新工具（内部名 `REPL`，别名 `Eval`，显示名 `Code`），一次调用运行一段 JS，脚本里把会话工具当全局函数调。`isEnabled()` 走 `Ni()`（Code Mode 开关），`suppressesAlwaysAllowRule`、`enablesCodeExecution`、`backgrounding:"never"`、结果上限 10 万字符。
2. **持久 VM 上下文 + 加固**：`vm.runInContext` 上做 intrinsic 捕获、把宿主值重建成 VM 领值（`constructor` 逃逸防护）、`import()` 固定拒绝、把受管全局改成不可配置时报 `VMContextPoisonedError` 并重置上下文。
3. **步数额度 + 墙钟**：`__replStep()` 插桩 + 步数 stride 发放，超限抛 RangeError；另有墙钟超时、可暂停看门狗（1.5 倍工具超时 + 5 s）。
4. **自动模式脚本检查**：未审批脚本攒到 20 个 / 20000 字符时整批交给分类器，判定后给每个脚本分别放行或阻止，分类器不可用时 30 秒冷却。
5. **异步 eval 通道**：工具调用立刻返回 `(dispatched #N)` 收据，输出以 `<repl-output eval=N>` / `<event kind="repl-eval">` 迟到送达；`asyncDispatched`、`evalId`、`late`、`keptByTurnAbort`、`neverRan` 等新字段。
6. **PostToolUse 输出扣留**：hook 可扣留脚本输出（`withheld`），或改写输出（`updatedToolOutput` 需符合 Output schema，否则忽略）。
7. **结果搬运与裁剪**：内层 Read/MCP 带回的图片（8 张上限）与 PDF（4 份上限）搬到结果块，base64 换成大小标记；溢出文件按“工具结果目录 + 单链普通文件”校验后读回。
8. **contexts API**：脚本里派生子上下文（`spawnContext`/`listContexts`/`releaseContext`），报告可被审查扣留。
9. **searchTools / describeTool**：脚本内发现工具，schema 按字符与 schema 数预算打印成 TS 声明。
10. **新的遥测事件**：`tengu_repl_mcp_error_throw`、`tengu_repl_unwritable_args_refuse`、`tengu_repl_mcp_undeclared_args_refused`、`tengu_repl_inner_executing`、`tengu_repl_inner_watchdog_fired`、`tengu_repl_tool_call_cap`、`tengu_repl_script_end`、`tengu_patient_lamport`。

## 无法判断的部分

无。336 条全部放置，`check-placement.mjs` 输出 `0 problems`，`unplaced` 为 0。

几个按主题就近归属、没有更强证据的声明：`Ko`（截断加省略号）放到 `stackTrace.ts`、`pr`（插桩额外常量）随 `Vm` 落到 `stackTrace.ts`、`Gt`/`Kr`（永不 settle 的 Promise）随在途调用计数落到 `callState.ts`、`xi`（单引号转义）随 VM 内的 shell 全局落到 `globals.ts`。名字批次可以按需调整。

合并掉的单声明文件：`schemas.ts`（只有输入/输出 schema 一个声明，并到 `EvalTool.ts`）、`contextReset.ts`（并到 `vmContext.ts`）、`spelledOutCommands.ts`（并到 `parse.ts`）、`dangerousRemoval.ts` 与 `directoryProbe.ts`（并成 `preflightChecks.ts`）。

## 给 lead 的建议

- 本 chunk 与既有的 `tools/REPLTool/constants.ts`、`replCallNotes.ts` 同目录，拆分时注意这三个文件的导入不要成环（`EvalTool.ts` 会导入几乎全部兄弟文件）。
- `@43719`（注册提示词指纹钩子 `sci(...)`）没有名字，已落到 `prompt.ts`，命名时给个 `registerPromptFingerprintSeam` 之类的名字。
- `decls.jsonl` 里 `xl`（索引 79）与 `to`（索引 301）这类纯常量单独成条，放置时已并到使用处所在文件。
