/**
 * tasks/LocalShellTask/guards.ts
 *
 * shell 任务类型守卫
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tasks/LocalShellTask/guards.ts
 * pieces: chunk-7jxyna5q.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-7jxyna5q.js:302155-302242 fingerprint (2.1.88 match: isLocalShellTask, 1)
/**
 * 是否是 local_bash 任务。
 */
function isLocalShellTask(task) {
  return typeof task === "object" && task !== null && "type" in task && task.type === "local_bash";
}
export { isLocalShellTask };
