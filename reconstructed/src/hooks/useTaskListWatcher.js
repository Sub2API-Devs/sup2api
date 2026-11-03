/**
 * hooks/useTaskListWatcher.ts
 *
 * 任务列表监视：找出可做任务并转成提示（"Complete all open tasks…"）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useTaskListWatcher.ts
 * pieces: chunk-8xs34hez.js (2), chunk-ag5x7vhf.js (1)
 * attribution: fingerprint 3
 */

//@ chunk-8xs34hez.js:5789-5988 fingerprint = findAvailableTask (1)
function findAvailableTask(tasks) {
  let unresolvedTaskIds = new Set(tasks.filter((t) => t.status !== "completed").map((t) => t.id));
  return tasks.find((task) => {
    if (task.status !== "pending") return false;
    if (task.owner) return false;
    return task.blockedBy.every((id) => !unresolvedTaskIds.has(id));
  });
}
//@ chunk-8xs34hez.js:5988-6128 fingerprint = formatTaskAsPrompt (1)
function formatTaskAsPrompt(task) {
  let prompt = `Complete all open tasks. Start with task #${task.id}: 

 ${task.subject}`;
  if (task.description)
    prompt += `

${task.description}`;
  return prompt;
}
//@ chunk-ag5x7vhf.js:149008-149162 fingerprint = useTaskListWatcher (0.386)
function useTaskListWatcher({ enabled, isLoading, hasToolsInProgress, hasPendingBackgroundWork }) {
  if (!enabled) return null;
  if (isLoading || hasToolsInProgress || hasPendingBackgroundWork) return "indeterminate";
  return "completed";
}
export { useTaskListWatcher, findAvailableTask, formatTaskAsPrompt };
