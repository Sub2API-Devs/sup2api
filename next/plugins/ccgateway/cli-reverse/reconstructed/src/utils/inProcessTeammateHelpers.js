/**
 * utils/inProcessTeammateHelpers.ts
 *
 * 并入已有模块：进程内队友辅助。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/inProcessTeammateHelpers.ts
 * pieces: chunk-01kgd7xg.js (3), chunk-5xgkngpb.js (1)
 * attribution: placement 2, fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isIdleNotification } from "./teammateMailbox.js";

//@ chunk-01kgd7xg.js:22646-22740 placement
function isTeammateWorking(teammate) {
  return (
    teammate.status === "running" && !teammate.isIdle && teammate.currentWorkAbortController !== undefined
  );
}
//@ chunk-01kgd7xg.js:22740-22824 placement
function interruptTeammateWork(teammate) {
  if (!isTeammateWorking(teammate)) return false;
  teammate.currentWorkAbortController?.abort();
  return true;
}
//@ chunk-01kgd7xg.js:22824-22902 fingerprint (2.1.88 match: setAwaitingPlanApproval, 0.664)
/**
 * teammate 是否正在等待（计划审批中或有待处理的用户消息）。
 */
function isTeammateAwaitingInput(task) {
  return task.awaitingPlanApproval || task.pendingUserMessages.length > 0;
}
//@ chunk-5xgkngpb.js:3394874-3395208 fingerprint (2.1.88 match: findInProcessTeammateTaskId, 0.624)
/**
 * leader 看到一批消息里有 shutdown 类请求时，清掉对应 teammate 的 idleNotificationOwedToLead 标记。
 */
function clearOwedIdleNotificationsOnShutdown(messages, setAppState) {
  let notifiedSenders = new Set();
  for (let message of messages) if (isIdleNotification(message.text)) notifiedSenders.add(message.from);
  if (notifiedSenders.size === 0) return;
  setAppState((prevState) => {
    let nextTasks;
    for (let task of Object.values(prevState.tasks))
      if (
        task.type === "in_process_teammate" &&
        task.idleNotificationOwedToLead &&
        notifiedSenders.has(task.identity.agentName)
      ) {
        nextTasks ??= {
          ...prevState.tasks,
        };
        nextTasks[task.id] = {
          ...task,
          idleNotificationOwedToLead: undefined,
        };
      }
    return nextTasks
      ? {
          ...prevState,
          tasks: nextTasks,
        }
      : prevState;
  });
}
export {
  isTeammateAwaitingInput,
  clearOwedIdleNotificationsOnShutdown,
  isTeammateWorking,
  interruptTeammateWork,
};
