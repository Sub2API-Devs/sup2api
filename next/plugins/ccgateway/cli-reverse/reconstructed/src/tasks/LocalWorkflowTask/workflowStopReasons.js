/**
 * tasks/LocalWorkflowTask/workflowStopReasons.ts
 *
 * 工作流被停止/失败/已结束三种终止原因文案与判定（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-64pvkb50.js (2)
 * attribution: placement 2
 */
//@ chunk-64pvkb50.js:191-399 placement
/**
 * 工作流被终止/失败/已结束的三种停止原因文案。
 */
var STOP_REASONS = {
  killed: "Stopped because the workflow was stopped",
  failed: "Stopped because the workflow failed",
  completed: "Stopped because the workflow finished without waiting for it",
};
var stopReasons = new Set(Object.values(STOP_REASONS));
//@ chunk-64pvkb50.js:399-443 placement
/**
 * 给定的停止原因是否属于工作流终止文案之一。
 */
function isStopReason(error) {
  return error !== undefined && stopReasons.has(error);
}
export { STOP_REASONS, isStopReason };
