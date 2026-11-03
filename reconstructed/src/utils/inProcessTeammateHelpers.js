/**
 * utils/inProcessTeammateHelpers.ts
 *
 * 并入已有模块：进程内队友辅助。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/inProcessTeammateHelpers.ts
 * pieces: chunk-6vnxsn99.js (3), chunk-e6aww6q8.js (1)
 * attribution: placement 2, fingerprint 2
 */
import { isIdleNotification } from "./teammateMailbox.js";

//@ chunk-6vnxsn99.js:22854-22948 placement
function isTeammateWorking(e) {
  return e.status === "running" && !e.isIdle && e.currentWorkAbortController !== void 0;
}
//@ chunk-6vnxsn99.js:22948-23032 placement
function interruptTeammateWork(e) {
  if (!isTeammateWorking(e)) return !1;
  return (e.currentWorkAbortController?.abort(), !0);
}
/**
 * teammate 是否正在等待（计划审批中或有待处理的用户消息）。
 */
//@ chunk-6vnxsn99.js:23032-23110 fingerprint = setAwaitingPlanApproval (0.664)
function isTeammateAwaitingInput(task) {
  return task.awaitingPlanApproval || task.pendingUserMessages.length > 0;
}
/**
 * leader 看到一批消息里有 shutdown 类请求时，清掉对应 teammate 的 idleNotificationOwedToLead 标记。
 */
//@ chunk-e6aww6q8.js:3309765-3310099 fingerprint = findInProcessTeammateTaskId (0.623)
function clearOwedIdleNotificationsOnShutdown(messages, setAppState) {
  let r = new Set();
  for (let s of messages) if (isIdleNotification(s.text)) r.add(s.from);
  if (r.size === 0) return;
  setAppState((s) => {
    let h;
    for (let task of Object.values(s.tasks))
      if (
        task.type === "in_process_teammate" &&
        task.idleNotificationOwedToLead &&
        r.has(task.identity.agentName)
      )
        ((h ??= { ...s.tasks }), (h[task.id] = { ...task, idleNotificationOwedToLead: void 0 }));
    return h ? { ...s, tasks: h } : s;
  });
}

export {
  isTeammateAwaitingInput,
  interruptTeammateWork,
  isTeammateWorking,
  clearOwedIdleNotificationsOnShutdown,
};
