/**
 * hooks/useTaskListWatcher.ts
 *
 * 任务列表监视：找出可做任务并转成提示（"Complete all open tasks…"）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useTaskListWatcher.ts
 * pieces: chunk-gjfaq3rj.js (2), chunk-hnxhr3bs.js (1)
 * attribution: fingerprint 3
 */

//@ chunk-hnxhr3bs.js:153328-153482 fingerprint (2.1.88 match: useTaskListWatcher, 0.387)
function useTaskListWatcher({ enabled, isLoading, hasToolsInProgress, hasPendingBackgroundWork }) {
  if (!enabled) return null;
  if (isLoading || hasToolsInProgress || hasPendingBackgroundWork) return "indeterminate";
  return "completed";
}
//@ chunk-gjfaq3rj.js:5837-6036 fingerprint (2.1.88 match: findAvailableTask, 1)
function findAvailableTask(tasks) {
  let unresolvedTaskIds = new Set(tasks.filter((t) => t.status !== "completed").map((t) => t.id));
  return tasks.find((task) => {
    if (task.status !== "pending") return false;
    if (task.owner) return false;
    return task.blockedBy.every((id) => !unresolvedTaskIds.has(id));
  });
}
//@ chunk-gjfaq3rj.js:6036-6176 fingerprint (2.1.88 match: formatTaskAsPrompt, 1)
function formatTaskAsPrompt(task) {
  let prompt = `Complete all open tasks. Start with task #${task.id}: 

 ${task.subject}`;
  if (task.description)
    prompt += `

${task.description}`;
  return prompt;
}
export { findAvailableTask, formatTaskAsPrompt, useTaskListWatcher };
