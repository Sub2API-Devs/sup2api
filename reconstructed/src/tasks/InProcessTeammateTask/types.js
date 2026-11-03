/**
 * tasks/InProcessTeammateTask/types.ts
 *
 * in_process_teammate 任务类型守卫
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tasks/InProcessTeammateTask/types.ts
 * pieces: chunk-6vnxsn99.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-6vnxsn99.js:22659-22755 fingerprint = isInProcessTeammateTask (1)
/**
 * 是否是 in_process_teammate 任务。
 */
function isInProcessTeammateTask(task) {
  return typeof task === "object" && task !== null && "type" in task && task.type === "in_process_teammate";
}
export { isInProcessTeammateTask };
