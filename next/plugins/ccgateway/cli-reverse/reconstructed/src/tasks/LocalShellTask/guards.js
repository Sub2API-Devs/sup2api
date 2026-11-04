/**
 * tasks/LocalShellTask/guards.ts
 *
 * shell 任务类型守卫
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tasks/LocalShellTask/guards.ts
 * pieces: chunk-s61vbvea.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-s61vbvea.js:377065-377152 fingerprint (2.1.88 match: isLocalShellTask, 1)
/**
 * 是否是 local_bash 任务。
 */
function isLocalShellTask(task) {
  return typeof task === "object" && task !== null && "type" in task && task.type === "local_bash";
}
export { isLocalShellTask };
