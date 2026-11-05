# 理解小组 · tools（2026-11-04）

> 成员代号 tools。领域：工具接口、注册、编排与内建工具。负责手册 `docs/handbook/tools.md`。
> 依据：`reconstructed/src/`（316 阅读树）；2.1.88 只作意图对照。

（进行中，分段写盘）

## 1. 核对方法与范围

- 读过的模块：`Tool.js`、`tools.js`、`services/tools/permissionCheckGuard.js`（buildTool）、`services/tools/toolOrchestration.js`、`services/tools/StreamingToolExecutor.js`、`services/tools/toolAbort.js`、`services/tools/toolExecution.js`（runToolUse、streamedCheckPermissionsAndCallTool、checkPermissionsAndCallTool 全文）、`services/tools/toolHooks.js`（权限合并三函数）、`services/tools/detachedToolCalls.js`、`utils/toolResultStorage.js`、`utils/toolSearch.js`、`tools/ToolSearchTool/prompt.js`、`utils/permissions/filterToolsByDenyRules.js`、`services/artifacts/artifactMcpSwap.js`、`remote/tools/nativeToolErrors.js`、`utils/permissions/checkRegistry.js`、`constants/outputLimits.js`。
- 用一个只读脚本扫描阅读树里全部 `buildTool({...})` 调用（89 处），列出每个工具的 name、isEnabled、shouldDefer，用来核对手册第 4 节和第 6 节的覆盖面。
- 用 `reconstructed/symbols.jsonl` 把手册里 205 个声明 id 逐个映射到现名，查出名不副实的引用。
