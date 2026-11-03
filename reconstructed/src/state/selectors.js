/**
 * state/selectors.ts
 *
 * AppState 选择器：当前查看的队友任务、输入框指向的代理（leader/viewed/named_agent）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/state/selectors.ts
 * pieces: chunk-0e8j1zzj.js (3), chunk-18hwfzwa.js (1)
 * attribution: shared-adjacent 1, fingerprint 2, placement 1
 */
import { viewedTaskParts } from "./teammateViewHelpers.js";
import { describeAgentTask } from "../plugins/functionHooks/sessionApi.js";

//@ chunk-0e8j1zzj.js:11902-11968 shared-adjacent = getViewedTeammateTask (0.76)
function getViewedTeammateTask_2(appState) {
  return viewedTaskParts(appState.viewingAgentTaskId, appState.tasks).teammate;
}
//@ chunk-0e8j1zzj.js:11968-12141 fingerprint = getActiveAgentForInput (0.822)
/**
 * 当前输入框指向的代理：leader（主线程）、viewed（正在查看的队友）或 named_agent。
 */
function getActiveAgentForInput(appState) {
  let { teammate: viewedTask, localAgent } = viewedTaskParts(appState.viewingAgentTaskId, appState.tasks);
  if (viewedTask)
    return {
      type: "viewed",
      task: viewedTask,
    };
  if (localAgent)
    return {
      type: "named_agent",
      task: localAgent,
    };
  return {
    type: "leader",
  };
}
//@ chunk-0e8j1zzj.js:12141-12356 placement
function getActiveAgentName(o) {
  let activeAgentForInput = getActiveAgentForInput(o);
  switch (activeAgentForInput.type) {
    case "leader":
      return;
    case "viewed":
      return activeAgentForInput.task.identity.agentName;
    case "named_agent": {
      for (let [d, c] of o.agentNameRegistry) if (c === activeAgentForInput.task.id) return d;
      return activeAgentForInput.task.agentType;
    }
  }
}
//@ chunk-18hwfzwa.js:481398-481499 fingerprint = getViewedTeammateTask (1)
function getViewedTeammateTask(appState) {
  let viewingAgentTaskId = appState.viewingAgentTaskId;
  let D = viewingAgentTaskId === undefined ? undefined : appState.tasks[viewingAgentTaskId];
  return D ? describeAgentTask(D)?.id : undefined;
}
export { getViewedTeammateTask_2, getActiveAgentForInput, getViewedTeammateTask, getActiveAgentName };
