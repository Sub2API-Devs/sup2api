/**
 * state/selectors.ts
 *
 * AppState 选择器：当前查看的队友任务、输入框指向的代理（leader/viewed/named_agent）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/state/selectors.ts
 * pieces: chunk-8prszgkd.js (3), chunk-czq1j3j2.js (1)
 * attribution: shared-adjacent 1, fingerprint 2, placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { viewedTaskParts } from "./teammateViewHelpers.js";
import { describeAgentTask } from "../plugins/functionHooks/sessionApi.js";

//@ chunk-8prszgkd.js:12168-12234 shared-adjacent (2.1.88 match: getViewedTeammateTask, 0.762)
function getViewedTeammateTask_2(appState) {
  return viewedTaskParts(appState.viewingAgentTaskId, appState.tasks).teammate;
}
//@ chunk-8prszgkd.js:12234-12407 fingerprint (2.1.88 match: getActiveAgentForInput, 0.823)
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
//@ chunk-8prszgkd.js:12407-12622 placement
function getActiveAgentName(appState) {
  let activeAgentForInput = getActiveAgentForInput(appState);
  switch (activeAgentForInput.type) {
    case "leader":
      return;
    case "viewed":
      return activeAgentForInput.task.identity.agentName;
    case "named_agent": {
      for (let [registeredName, taskId] of appState.agentNameRegistry)
        if (taskId === activeAgentForInput.task.id) return registeredName;
      return activeAgentForInput.task.agentType;
    }
  }
}
//@ chunk-czq1j3j2.js:507874-507975 fingerprint (2.1.88 match: getViewedTeammateTask, 1)
function getViewedTeammateTask(appState) {
  let viewingAgentTaskId = appState.viewingAgentTaskId;
  let task = viewingAgentTaskId === undefined ? undefined : appState.tasks[viewingAgentTaskId];
  return task ? describeAgentTask(task)?.id : undefined;
}
export { getViewedTeammateTask_2, getActiveAgentForInput, getViewedTeammateTask, getActiveAgentName };
