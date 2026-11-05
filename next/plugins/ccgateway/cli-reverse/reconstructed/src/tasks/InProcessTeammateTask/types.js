/**
 * tasks/InProcessTeammateTask/types.ts
 *
 * in_process_teammate 任务类型守卫
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tasks/InProcessTeammateTask/types.ts
 * pieces: chunk-01kgd7xg.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-01kgd7xg.js:22451-22547 fingerprint (2.1.88 match: isInProcessTeammateTask, 1)
/**
 * 是否是 in_process_teammate 任务。
 */
function isInProcessTeammateTask(task) {
  return typeof task === "object" && task !== null && "type" in task && task.type === "in_process_teammate";
}
export { isInProcessTeammateTask };
