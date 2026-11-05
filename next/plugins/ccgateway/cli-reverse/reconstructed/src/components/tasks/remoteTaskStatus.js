/**
 * components/tasks/remoteTaskStatus.ts
 *
 * 远端后台任务/工作流的可见性与计数，用于任务区是否显示（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wjygkcr4.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isCoordinatorPanelActive } from "../../utils/transcriptDiagnostics.js";
import { isWorkflowsAvailable } from "../../utils/workflows/workflowGates.js";
import { useForceRender } from "../../hooks/useForceRender.js";
import { useAppState } from "../../state/AppState.js";
import { countNonAmbientTasks } from "./BackgroundTaskStatus.js";

//@ chunk-wjygkcr4.js:12654-12686 placement
/**
 * 远端任务区是否显示（非本地且允许远端任务）。
 */
function isRemoteWorkScreen() {
  return !isCoordinatorPanelActive() && isWorkflowsAvailable();
}
//@ chunk-wjygkcr4.js:12686-12793 placement
/**
 * 有远端后台任务或工作流且任务区可用时的状态选择器。
 */
function useHasRemoteWork() {
  useForceRender();
  return useAppState(
    (state) =>
      (state.remoteBackgroundTasks.length > 0 || state.remoteWorkflowRuns.length > 0) && isRemoteWorkScreen(),
  );
}
//@ chunk-wjygkcr4.js:12956-12997 placement
/**
 * 按数量统计某任务的子项。
 */
function countOf(a, b) {
  return countNonAmbientTasks(a, b).length;
}
export { useHasRemoteWork, isRemoteWorkScreen, countOf };
