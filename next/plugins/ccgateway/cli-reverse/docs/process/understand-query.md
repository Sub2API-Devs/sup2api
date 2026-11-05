# 理解小组 · query 领域过程记录（2026-11-04）

> 代号 query。负责手册 `docs/handbook/query.md`。本文件随进度写盘，未完成的部分标"进行中"。

## 进度草记（进行中）

- 已读：`reconstructed/src/query.js` 全部（`query`、`queryWithObserverTap`、`queryLoop` 1035–5975 行）、`query/deps.js`、`query/config.js`。
- 已发现的手册问题（待整理进改正清单）：
  - 4.2 第 1 步 `contextRouting = Bs(...)`：实际是 `utils/claudemd/contextRouting.js · buildContextRouting`（异步）。
  - 4.2 第 1 步 `deps = productionDeps()`：实际 deps 被三层包装：`wrapArtifactPatchTurn(withTurnStepHooks(wrapCallModelWithAttachments(productionDeps())))`。
  - 4.2 第 8 步 `promptRender = xu(...)`：实际是 `query/promptSnapshot.js · recordPromptSnapshot`；`RYs` 是 `appendSystemContextToPrompt`。
  - 4.2 第 10 步阻断上限：只在"自动压缩不可用"（`autoCompactUsable` 为假）时检查。
  - 4.2 第 12 步恢复顺序：安全监控 → PostSampling 钩子 → 中止检查 → 同模型拒答重试（`refusal_retry`）→ 反应式压缩 → max_output_tokens → 截断 → 畸形 tool_use → 仅思考 → API 错误 → Stop 钩子。手册漏了中止与 refusal_retry 两步。
  - 终止原因漏了 `prompt_too_long`（反应式压缩失败或消息太少时返回 `reason: ptlReason`）。
  - 4.1 `transcriptTap = $a(...)`：实际是 `query/presenceCheck.js · observeRunningTurn`。
  - assistant 事件"修正工具输入（Nu）"：实际是 `query/deps.js · backfillObservableInput`。
