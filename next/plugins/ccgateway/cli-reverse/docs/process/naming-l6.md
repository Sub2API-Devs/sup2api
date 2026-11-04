# 第 6 组（naming-round4d 下标 6）后半段续做：参数/局部变量命名

## 接手状态

- 清单 `analysis/segments/naming-round4d.json` 的 `[6]`：`src/plugins/hooksModules .. src/services/analytics`，731 个声明、3,506 个压缩绑定（已按接手时进度重算）。名字表 `artifacts/tmp/lead/final6`。
- 接手时 `naming/semantic-l6.jsonl` **8,030 行**（`check` 0 problems）。前任 name-l6 / name-l6c 没有留下 `docs/process/naming-l6.md`，也没有 WORKLOG 行。

## 本次续写

- 接手时用 final6 + 前任 8,030 行合并重算，本组仍有 **3,422 个 `_K` 绑定、681 个声明**（清单里的 3,506 是清单生成时的数；只按 final6 算是 3,426，差额来自前任那 2 个重叠键）。**全部命名，0 个跳过**；最终复核 `remaining bindings: 0, decls: 0 of 731`。
- 分 91 批（`artifacts/tmp/l6d/batch*.jsonl`，多为 10–80 行/批）用 `cat 批次文件 >> naming/semantic-l6.jsonl` 追加，**共追加 3,473 行 / 3,424 个唯一键**（其中 49 行是对自己先前写法的改名重写），净新增 3,422 个键；文件 8,030 → 11,503 行。
- 最终 `node tools/naming/annotate.mjs check naming/semantic-l6.jsonl`：`11503 lines, 66 chunks, 0 problems, 13 suffixed by conflicts`；13 处 suffixed **全部来自前任行**，单独统计本表（`confmine.mjs`，并入 final6 重跑 rename）本表引起冲突 **0**（过程中出现 34 处 `_2` 撞名，已逐轮改名消除）。
- 2 个键与前任重叠（`chunk-f2w97cfp.js@989`、`chunk-ad2e1aj6.js@27148`），按"不改已有名字"的规则保留前任写法（`self` / `document`），最后两条写的正是这两个旧名。
- 本组代码面：`src/plugins/hooksModules` 尾部 → `src/remote`（RemoteSessionManager、SessionsV2Client、sdkMessageAdapter、remote/tools 全套、TransportPermissionDispatcher）、`src/screens/repl` 的 REPL/BackgroundGesture/PromptSubmitController/ReplSessionScope/TranscriptStream/TranscriptView/TurnController 等大件、`src/selfHostedRunner`（git 准备与 fetch、lifecycleHooks、processTable、stdioWriter、decodeToken）、`src/services/agentImport/*`、`agentObserver`、`agentStatus`、`AgentSummary`、`services/analytics/*`（增长书客户端、1P 事件日志导出器、metadata/sanitizers、datadog、sink 等）。
- 置信度分布：0.85 居多，0.6–0.7 共 60 条（多为空实现/占位分支的参数，如 `remoteCommandNoticeStub(args)`、`emptyStatusText(context, lacks)`、`alwaysFalseToolHost(state)`）。

## 发现的问题（未改，仅记录）

1. **明显的退化实现 / 空壳**
   - `src/remote/tools/foregroundToolHost.js`：`emptyStatusText`、`cloudFolderUseStatusText` 直接 `return ""`，`alwaysFalseToolHost` 恒 `!1`；参数只有占位意义。
   - `src/remote/RemoteTransport.js#I0t`：`function remoteCommandNoticeStub(h){ return; }` 空函数。
   - `src/screens/repl/ComposerChrome.js` 的 `showExitCostReport` 里有一个 `const isScreenReaderEnabled` 被后来同名 `let` 变量遮蔽（压缩名不同），容易误读。
   - `src/services/analytics/growthbookClient.js`：`getEnvironmentOverrides()` / `readConfigOverrides()` / `setConfigOverride()` / `clearConfigOverrides()` 全是空实现（返回 null/undefined），但上层 `hasOverride` 仍按"可能有效"的分支写了。
2. **名实不符（已有名字，不动）**
   - `src/selfHostedRunner/lifecycleHooks.js#Guo` 的 `runCheckoutHook`：`s_K45477` 是"aborted"、`c_K45482` 是"timedOut"但两者语义在 finish 回调里互换使用过一次（见 `if (s_K45477) reject("checkout hook aborted")` 前先判 `c_K45482`），本次按用途命名，未改逻辑。
   - `src/services/analytics/growthbookClient.js#Rl`（GrowthBookClientHolder）里的 `generation` 同时用于"client 重建代数"和 `reset()` 失效判定，命名容易误解为 UI 渲染代数。
   - `src/selfHostedRunner/git/repoPrepare.js#Qt` 的 `classifyRepoAccessFailure` 用 `exitCode` 是否为真区分两套匹配，参数名 `exitCode` 实为布尔。
3. **同一份逻辑的多份副本**
   - `src/services/analytics/growthbook.js` 末尾有 10 余个 `readXxxFlag((key, fallback) => ({...getFeatureValueWithSource..., defaultHost: !hasGrowthBookUsedNonDefaultHost()}))` 注册器，函数体逐字相同，只有注册器名不同。
   - `src/services/analytics/metadata.js` 的 `copyCcrMarks` / `copyOwnServerMarks` / `markCcrInjectedConfig` 三份"把 CLI 自有的 config 对象标记搬到新对象"逻辑高度相似。
4. **按 chunk 找声明容易踩坑**
   - 本组很多文件（如 `src/services/analytics/metadata.js`）的声明分散在 `chunk-aepeg2w5.js`、`chunk-6vnxsn99.js`、`chunk-0wqny7vr.js`、`chunk-12wyw8h8.js` 等多个 chunk；写条目必须先看 `show` 输出头部的 `file chunk-xxx.js`（前任坑：按路径猜 chunk 会得到 "no binding at this offset"）。
5. **本组剩下未命名的只有"只声明不使用"的局部**
   - `src/query.js#xc` 的最外层生成器（4,485 行）没有任何剩余的 `_K`；此前 `ut_K161386` 一类"..._K"名是上一轮自动化产物，不属于本轮范围。

## 交付

- `naming/semantic-l6.jsonl`：11,503 行，`check` 0 problems（13 suffixed 全为前任既有行；本表 0）。
- 批次文件、`show2/show3/show4/uses/usesN/usesR/remaining2/confmine` 等临时脚本在 `artifacts/tmp/l6d/`。
- 未 commit、未跑 pipeline、未派生子代理。
