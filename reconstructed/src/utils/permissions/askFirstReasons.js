/**
 * utils/permissions/askFirstReasons.ts
 *
 * 2.1.316 新增：各"先询问"原因码的说明文本模板；远程审批未完成原因的简短说明等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7hje7pbr.js (4)
 * attribution: placement 4
 */

//@ chunk-7hje7pbr.js:191-7634 placement
/**
 * 各"先询问"原因码的说明文本模板。
 */
var ASK_FIRST_REASON_TEXTS = {
  "ask_first.host_rule"({ name: e, rules }) {
    return `A permission rule of this session (${rules}) asks before it uses ${e}'s tools.`;
  },
  "ask_first.host_rule.cannot_ask"({ name: e, rules }) {
    return `The rule ${rules} asks before this session uses ${e}, and this context cannot ask.`;
  },
  "ask_first.file_rules_unread"({ name: e, toolName, rules }) {
    return `This session cannot tell which files a ${toolName} command opens on ${e}, so it cannot check the command against its permission rules for the file tools (${rules}). Allow it only if it does nothing that those rules are there to stop.`;
  },
  "ask_first.file_rules_unread.cannot_ask"({ name: e, toolName, rules }) {
    return `This session cannot tell which files a ${toolName} command opens on ${e}, so it cannot check the command against its permission rules for the file tools (${rules}), and this context cannot ask. A file tool's call there is checked against those rules.`;
  },
  "refused.file_rules_unread.managed"({ name: e, toolName, rules }) {
    return `This session cannot tell which files a ${toolName} command opens on ${e}, so it cannot check the command against the deny rules for the file tools in its managed settings (${rules}). It sends no ${toolName} command to ${e} while those rules are set, and the user cannot approve one. A file tool's call there is checked against those rules.`;
  },
  "plan_mode.entered_while_asking"(e) {
    return `This session entered plan mode while the approval was pending; a state-changing ${e} call is not approved from plan mode.`;
  },
  "away.until"(e) {
    return e === undefined
      ? "in this turn"
      : `until a later attached-machines note says ${e} is reachable again, or the user says it is back or asks you to try again`;
  },
  "away.ending"() {
    return "Check once more only when the user says it is back or asks you to try again.";
  },
  host_unresponsive({ name: e, checks, intervalMs, whileRunning, stillConnected, returnNoted }) {
    if (stillConnected)
      return `${e} is still connected, but its reply to this command was not received (${checks} checks about ${Math.round(intervalMs / 1000)} s apart got no answer, though ${e} answered a liveness check). Its state is unknown \u2014 it may have completed, failed, or still be running; the reply may have been too large to deliver. Do not re-run non-idempotent commands on ${e} just to see the output. If the output may be large, try a narrower command (part of a file, a filter, or a smaller image); otherwise do the rest of the task without ${e}, and tell the user what you could not verify.`;
    let r = `${e} stopped answering ${whileRunning ? "while this command was running" : "after this command was sent to it"} (${checks} checks about ${Math.round(intervalMs / 1000)} s apart went unanswered). Its state is unknown \u2014 it may have completed, failed, ${whileRunning ? "or still be running" : "never started, or still be running"}.`;
    return returnNoted
      ? `${r} Do not call ${e} again ${ASK_FIRST_REASON_TEXTS["away.until"](e)}; then check what this command did before repeating it. Meanwhile do the rest of the task without ${e}, and tell the user what is blocked and what you could not verify.`
      : `${r} Do not retry non-idempotent commands on ${e} until ${e} reconnects, and do not call it again ${ASK_FIRST_REASON_TEXTS["away.until"]()}: do the rest of the task without ${e}, and tell the user what is blocked and what you could not verify. ${ASK_FIRST_REASON_TEXTS["away.ending"]()}`;
  },
  host_asleep({ name: e, whileRunning, withdrawn, returnNoted }) {
    let a = withdrawn
      ? `This session has stopped waiting for it and withdrew its request: the command will be stopped when ${e} wakes, and may have partly run. Do not repeat it without checking.`
      : "The command was not cancelled: it is paused with the machine and will most likely continue when it wakes; what it had already done stays done. This session has stopped waiting for it. Do not repeat it, here or there.";
    let o = `${e} went to sleep ${whileRunning ? "while this command was running" : "after this command was sent to it"} (it said so itself). ${a}`;
    return returnNoted
      ? `${o} Do not call ${e} again until a later attached-machines note says ${e} is reachable again, or the user says it is back or asks you to try again; then check what this command did before sending anything else to ${e}. Meanwhile do the rest of the task without ${e}, and tell the user what is paused.`
      : `${o} Do not call ${e} again in this turn: do the rest of the task without ${e}, and tell the user what is paused. Check once more only when the user says it is back or asks you to try again, and then check what this command did before sending anything else to ${e}.`;
  },
  "unverified_refusal.call_phase"({ name: e, whileRunning }) {
    return `A reply that could not be verified says this session is no longer paired with ${e}. ${whileRunning ? "It was running there; whether it finished is unknown." : "The state of this command there is unknown \u2014 it may or may not have run."} Do not retry it on ${e} until ${e} re-announces, and do not call it again in this turn; continue with what you can do without it, and tell the user you could not confirm whether it ${whileRunning ? "finished" : "ran"}.`;
  },
  approval_no_longer_covers(e) {
    return `A permission rule changed while this was waiting; nothing ran on ${e}. Ask again to get a fresh approval.`;
  },
  "in_progress.checkin"(e) {
    return `Checking on ${e} \u2014 the call is still with it\u2026`;
  },
  "ask_seat.waiting"(e) {
    return `Waiting to send to ${e} \u2014 earlier calls there still need a permission answer\u2026`;
  },
  "ask_seat.sending"(e) {
    return `Sending to ${e}\u2026`;
  },
  "reconnect_hold.waiting"({ name: e, holdMs }) {
    return `Waiting for ${e} to come back (up to ${Math.round(holdMs / 1000)} s)\u2026`;
  },
  "reconnect_hold.ended"(e) {
    return `Stopped waiting for ${e}.`;
  },
  "reconnect_hold.gave_up"({ name: e, holdMs }) {
    return `This call already waited up to ${Math.round(holdMs / 1000)} s for ${e} to come back; if this session is later told that ${e} is back, use it again from then.`;
  },
  "card.standing_unavailable"({ name: e, kind }) {
    return `Always allow isn\u2019t available for ${kind === "command" ? "commands run" : "files"} on ${e} yet \u2014 this approves once.`;
  },
  no_answer({ name: e, afterMs, waitAnnounced }) {
    let s = formatTimeoutDuration(afterMs);
    let a = `No one approved or denied this within ${s}, so it was not run on ${e}. Nothing changed there, and this session has stopped waiting for an answer to this request.`;
    let o = `Assume the user is away: a further call to ${e} that needs approval, whether this one again, another command or a file edit, would wait up to ${s} and close the same way. Finish only what needs no approval on ${e}, then stop and tell the user which calls were not run`;
    return waitAnnounced
      ? `${a} ${o} and that you will ask again when they say so.`
      : `${a} ${e} announced no wait of its own for approvals, so this session's ${s} applied. ${o}, that you will ask again when they say so, and that making sure Claude Code on ${e} is up to date (or the Claude desktop app, if that is what runs it there) may give them longer to answer.`;
  },
  "ask_ended.notice"({ name: e, toolName, reason, afterMs }) {
    return `${toolName} on ${e} was not run: ${approvalTimeoutReason(e, toolName, reason, afterMs)}.`;
  },
  withdrawn({ name: e, reason }) {
    let n = `The request to run this on ${e} was withdrawn \u2014 ${approvalTimeoutShortReason(e, reason)}; nothing ran there.`;
    switch (reason) {
      case "superseded":
      case "stale_answer":
        return `${n} Send it again once. If that request is withdrawn too, ask the user how to proceed rather than retrying.`;
      case "evicted":
        return `${n} Send it again only after some of the approvals already waiting on ${e} have been answered.`;
      case "replaced_by_retry":
        return `${n} Do not send it again: the newer copy is already asking.`;
      case "no_answer":
      case "host_withdrawn":
      case "tool_withdrawn":
      case "host_unbound":
      case "host_stopped":
      case "record_evicted":
      case "unrecognized":
        return `${n} Ask the user how to proceed rather than retrying.`;
    }
  },
};
//@ chunk-7hje7pbr.js:7634-8334 placement
/**
 * 远程审批未完成的原因说明（无人回答、主机断开等）。
 */
function approvalTimeoutReason(e, toolName, reason, afterMs) {
  switch (reason) {
    case "no_answer":
      return `nobody answered the approval within ${formatTimeoutDuration(afterMs)}`;
    case "host_withdrawn":
      return `${e} disconnected`;
    case "superseded":
      return `Claude Code on ${e} restarted`;
    case "evicted":
      return `${e} had too many approvals waiting`;
    case "tool_withdrawn":
      return `${e} stopped offering ${toolName}`;
    case "host_unbound":
      return `${e} is no longer available to this session`;
    case "host_stopped":
      return `Claude Code on ${e} quit`;
    case "stale_answer":
      return `the answer reached ${e} too late`;
    case "record_evicted":
      return `${e} no longer had a record of the approval`;
    case "replaced_by_retry":
      return "a newer copy of the request replaced this one";
    case "unrecognized":
      return `${e} ended the approval`;
  }
}
//@ chunk-7hje7pbr.js:8334-8419 placement
function formatTimeoutDuration(e) {
  let rounded = Math.round(e / 1000);
  return rounded >= 60 && rounded % 60 === 0 ? `${rounded / 60} min` : `${rounded} s`;
}
//@ chunk-7hje7pbr.js:8419-9222 placement
/**
 * 远程审批未完成原因的简短说明。
 */
function approvalTimeoutShortReason(e, reason) {
  switch (reason) {
    case "no_answer":
      return "no one answered it in time";
    case "host_withdrawn":
      return `Claude Code on ${e} left the session`;
    case "superseded":
      return `a newer Claude Code on ${e} took over from the one that asked`;
    case "evicted":
      return `too many requests were already waiting on ${e}`;
    case "tool_withdrawn":
      return `${e} stopped serving this tool`;
    case "host_unbound":
      return `${e} is no longer bound to this session`;
    case "host_stopped":
      return `Claude Code on ${e} was shutting down`;
    case "stale_answer":
      return `an answer was given but reached ${e} too late to count`;
    case "record_evicted":
      return `${e} no longer had a record of it`;
    case "replaced_by_retry":
      return "a newer copy of this request now carries the question";
    case "unrecognized":
      return `${e} let it go for a reason this build does not know`;
  }
}
export { ASK_FIRST_REASON_TEXTS };
