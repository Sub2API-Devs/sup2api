# 批次 nm318r-3（第二轮）命名过程

## 范围与结果

- 范围：`src/utils/hooks/deviceHooks/shellReader.js` … `src/vim/textObjects.js`（plan 下标 0，270 个声明）。
- plan 内 `_K` 绑定 **298 个，全部命名**（覆盖率 100%），产物 `naming/semantic-nm318r-3.jsonl` 298 行。
- `check` 结果：`298 lines, 78 chunks, 0 problems, 0 suffixed by conflicts`。
- 逐绑定核对：写脚本从 `annotate.mjs show` 的全量输出里抽出每个 `_K` 绑定的原压缩名，再回 `original/` 逐偏移比对标识符，**298/298 位置一致，0 条错位**；产物里也没有 plan 之外的偏移（extra 0）。

按第二轮补充处理了顶层函数/类/常量：上一轮被误认为"已有名字"的 `async function $ge_K6480`、`function Pz_K299918`、`var fte…` 一类全部命名。

## 命名依据

hints.jsonl 的 66 条只当名字参考，偏移一律以 `show` 为准（例如 `chunk-4z1ntdgk.js#vo` 的 `analysis` 在 318 是 `@29699`，不是 316 的 `@29212`；`chunk-5xgkngpb.js#qLs` 的 `pollTrigger` 也按 318 的 `@4894883` 写）。

主要依据：

- 字符串字面量与错误文案：`SDK_HOST_REINITIALIZED_TEXT`、`MCP_TOOL_HOOK_UNREACHABLE_TEXT`、`ripgrepTimeoutText`、`hardLinkSandboxInitFailureText`、`HARDLINK_DENY_MARKERS`、`SANDBOX_NOREPLACE_SENTINEL`。
- 调用关系与返回值用法：`reportHookCallbackFailure`（→`notifyHookCallbackFailed`）、`toRewriteOutcome`/`toMcpRunOutcome`（runner 结果→结论对象）、`askContainerIfHookApplies`、`isBundleLockActive`（传给 `cleanUpBundles`）、`isCheaplyAutoAllowableInScript`（REPL 内层跳过分类器）、`rememberKnownAccount`、`findRepeatedToolUseIds`、`bridgeStoredGaps`。
- 属性名与结构：`analysis`、`originLabel`、`stalePid`/`staleCall`、`call`/`family`/`otherCall`/`filteredCall`、`replacementInput`、`permissionContext`。
- 2.1.316 里有对应代码的沿用 316 的名字：`analysis`、`hookOutput`、`PREFIX_WRAPPER_RE`（316 里没有名字，按用途起）。

## 发现的问题

1. **偏移与 316 普遍不同**：本批计划里 66 条 hint 的 `oldKey` 基本都不能直接用，逐条重新对照 `show` 才准。`chunk-4z1ntdgk.js#vo` 的 316 偏移 `@29212/@29255` 在 318 对应到的是完全不同的位置。
2. **`$$i` / `X_s` 一开始写错了偏移**（`@9084/@9172`，正确是 `@9093/@9181`），`check` 报 `no binding at this offset` 才发现。说明跨函数复制偏移很容易偏一格，命中率不能靠肉眼。
3. **`@3150390` 原名 `pre` 与已有的 `sandboxRuntimeConfig`（`@147`）同名冲突**，`check` 报 suffixed，改名 `sandboxRuntimeConfigSlot` 才对（316 里这两个是同一个惰性配置变量 `wne`/`jwn`，318 拆成了两个声明，`pre` 那个其实是 `yRn` 那个 var 的空槽位）。
4. **`isWorkflowsAvailable`（`@2397`）与已有同名函数（`@132`）冲突**，改成 `workflowsUsableNow`；两者逻辑不同：前者只看 `getWorkflowsUnavailableReason() === undefined`，后者还叠加了策略与 `CLAUDE_CODE_DISABLE_WORKFLOWS`。
5. **`payload.message` 与相邻绑定同形**（`chunk-5xgkngpb.js#NPt` 内层），保留了 `message`（外层已是 `payload`），可读性尚可但需要留意。
6. 阅读树里有若干已有名字与 318 实际行为不符（不在本批范围内，未改）：`utils/transcript/deserialize.js` 的 `Ymr`/`$It` 仍压缩，其中 `$It` 的判断逻辑是"最后是否以已应答的 no-reply 终端工具结束"；`utils/permissions/editPermissionRules.js` 的 `pt`（建目录 rename 原子化）与 vim 的 `pt`（文本对象）同名不同义，属正常。
7. plan 里 `chunk-5xgkngpb.js` 一个 chunk 占了绝大部分声明（84 个绑定都在它里面），本批的 `show` 单次输出接近 600 行上限，是按 14 个一批硬切的，没有整文件读。

## 已知局限

- 若干无字面量、只有一个调用点的纯占位函数（`tai`、`uIr`、`Kyt`、`n4o`、`bPr`、`$$i`）取名把握较低（confidence 0.6），依据写在 note 里。
- 沙箱 adapter 里成组的 GrowthBook 开关函数只按开关名起（`denyUnlistableWorktrees`、`denyLegacyRemoteDirs`、`pinGitInfoDirs`、`isCozyWillowOn`），没有更细的业务语义。
