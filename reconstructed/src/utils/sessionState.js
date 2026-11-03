/**
 * utils/sessionState.ts
 *
 * 会话状态（idle/running/requires_action）变化通知。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sessionState.ts
 * pieces: chunk-achyj058.js (11), chunk-fp6aqx1j.js (1)
 * attribution: placement 11, fingerprint 1
 */
import { truncate } from "./format.js";
import { JT } from "../constants/outputLimits.js";
import { truncateToLength } from "./stringUtils.js";
import { createSignal } from "./signal.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { env } from "./env.js";
import { parkOnUser } from "./sessionActivity.js";
import { enqueueTaskNotification } from "./task/taskNotifications.js";
import { sleep } from "./sleep.js";
import { escapeXml_2 as escapeXml } from "./confusables.js";
import { T_ } from "../tools/AgentTool/backgroundGates.js";
import { isDiskless } from "../bootstrap/state.js";
import { logError } from "./log.js";

/**
 * 取请求 id（或被抑制的请求 id）。
 */
//@ chunk-achyj058.js:655-774 placement
function requestIdOf(e) {
  for (let n of [e?.request_id, e?.suppressed_request_id])
    if (typeof n === "string" && n.length > 0) return n;
  return;
}
//@ chunk-achyj058.js:774-785 placement
var g9o = 32;
/**
 * 生成待决动作的描述（工具名、显示名、原始命令）。
 */
//@ chunk-achyj058.js:785-1349 placement
function pendingActionPayload(e) {
  let { display_tool_name: display_tool_name, raw_command: raw_command } = e;
  return {
    tool_name: e.tool_name,
    ...(display_tool_name === void 0 ? {} : { display_tool_name: display_tool_name }),
    action_description: truncate(e.action_description, JT),
    ...(raw_command === void 0 ? {} : { raw_command: truncate(raw_command, JT) }),
    tool_use_id: e.tool_use_id,
    request_id: e.request_id,
    ...(e.suppressed_request_id === void 0 ? {} : { suppressed_request_id: e.suppressed_request_id }),
    ...(e.decision_reason_type === void 0 ? {} : { decision_reason_type: e.decision_reason_type }),
    ...(e.decision_reason_code === void 0 ? {} : { decision_reason_code: e.decision_reason_code }),
    ...(e.agent_id === void 0 ? {} : { agent_id: e.agent_id }),
  };
}
//@ chunk-achyj058.js:1349-1404 placement
function h9o(e, n) {
  return [e, ...n.slice(0, g9o - 1).map(pendingActionPayload)];
}
//@ chunk-achyj058.js:1404-1481 placement
function c(e) {
  let n = truncate(e, JT);
  return n.length <= 4 * JT ? n : `${truncateToLength(n, 4 * JT - 1)}\u2026`;
}
//@ chunk-achyj058.js:1481-1642 placement
function parseCrossSessionInboundCapability(e) {
  switch (e?.cross_session_inbound) {
    case "unavailable":
      return { acceptsPeerMessages: !1 };
    case "available":
      return { acceptsPeerMessages: !0 };
    default:
      return;
  }
}
//@ chunk-achyj058.js:1642-1656 placement
var i8r = 60000;
/**
 * 会话状态跟踪（运行/空闲/等待决定、待决动作、状态变化事件）。
 */
//@ chunk-achyj058.js:1656-9513 placement
class SessionStateTracker {
  stateChanged = createSignal();
  pendingActionWritten = createSignal();
  userDecisionPendingChanged = createSignal();
  userDecisionsPending = 0;
  onStateChanged;
  getPendingActionDetails;
  leadsWithOldestCard = !1;
  slimsRefusedLead = !1;
  slimLeads = new WeakSet();
  writtenLead;
  pendingActionLeadRequestId;
  heldRequiresAction;
  onWaitingOnUserChanged;
  onTurnStarting;
  onTurnBeganBeforeInit;
  onMetadataChanged;
  onInternalMetadataChanged;
  onPermissionModeChanged;
  onProactivityLevelChanged;
  onActiveGoalChanged;
  onAutocompactInputsChanged;
  onConversationReset;
  currentState = "idle";
  hasPendingAction = !1;
  hasTaskSummary = !1;
  hasTerminalGoalSnapshot = !1;
  mainLoopRefcount = 0;
  nestedBlockedChains = Object.create(null);
  nestedBlockedChainCount = 0;
  droppedChainAgentIds = Object.create(null);
  nestedChainUnparks = Object.create(null);
  lastWaitingOnUser = !1;
  chainExcessLogged = !1;
  beginUserDecision() {
    if (((this.userDecisionsPending += 1), this.userDecisionsPending === 1))
      d(this.userDecisionPendingChanged, !0);
  }
  get userDecisionPending() {
    return this.userDecisionsPending > 0;
  }
  endUserDecision() {
    if (this.userDecisionsPending === 0) return;
    if (((this.userDecisionsPending -= 1), this.userDecisionsPending === 0))
      d(this.userDecisionPendingChanged, !1);
  }
  getState() {
    return this.currentState;
  }
  get waitingOnUser() {
    return (
      this.currentState === "requires_action" && this.mainLoopRefcount - this.nestedBlockedChainCount <= 0
    );
  }
  setMainLoopRefcount(e) {
    if (((this.mainLoopRefcount = e), e > 0 && this.resumableOrphanedAgents.length > 0))
      this.restartNoticeShown = !0;
    this.emitIfWaitingChanged();
  }
  emitIfWaitingChanged() {
    this.checkChainInvariant();
    let waitingOnUser = this.waitingOnUser;
    if (waitingOnUser !== this.lastWaitingOnUser)
      ((this.lastWaitingOnUser = waitingOnUser), this.onWaitingOnUserChanged?.(waitingOnUser));
  }
  checkChainInvariant() {
    if (this.nestedBlockedChainCount - this.mainLoopRefcount > 0) {
      if (!this.chainExcessLogged)
        ((this.chainExcessLogged = !0),
          logForDiagnosticsNoPII("warn", "nested_chain_count_exceeds_refcount", {
            nested_blocked_chain_count: this.nestedBlockedChainCount,
            main_loop_refcount: this.mainLoopRefcount,
            session_state: this.currentState,
          }));
    } else this.chainExcessLogged = !1;
  }
  reteeWaitingOnUser() {
    this.onWaitingOnUserChanged?.(this.waitingOnUser);
  }
  notifyNestedPromptBlocking(e) {
    if (env.CLAUDE_CODE_DISABLE_NESTED_CHAIN_IDLE) return;
    if (this.droppedChainAgentIds[e]) return;
    let n = this.nestedBlockedChains[e] ?? 0;
    if (((this.nestedBlockedChains[e] = n + 1), n === 0)) {
      if ((this.nestedBlockedChainCount++, this.nestedBlockedChainCount <= this.mainLoopRefcount))
        this.nestedChainUnparks[e] = parkOnUser();
    }
    this.emitIfWaitingChanged();
  }
  notifyNestedPromptUnblocking(e) {
    let n = (this.nestedBlockedChains[e] ?? 0) - 1;
    if (n > 0) this.nestedBlockedChains[e] = n;
    else if (this.nestedBlockedChains[e] !== void 0) this.removeChain(e);
    this.emitIfWaitingChanged();
  }
  removeChain(e) {
    (delete this.nestedBlockedChains[e],
      this.nestedBlockedChainCount--,
      this.nestedChainUnparks[e]?.(),
      delete this.nestedChainUnparks[e]);
  }
  dropNestedBlockedChain(e) {
    if (((this.droppedChainAgentIds[e] = !0), this.nestedBlockedChains[e] !== void 0))
      (this.removeChain(e), this.emitIfWaitingChanged());
  }
  notifyTurnStarting(e, n) {
    this.onTurnStarting?.(e, n);
  }
  notifyTurnBeganBeforeInit() {
    this.onTurnBeganBeforeInit?.();
  }
  notifyStateChanged(e, n) {
    if (
      ((this.currentState = e),
      (this.lastWaitingOnUser = this.waitingOnUser),
      this.onStateChanged?.(e, n),
      d(this.stateChanged, e, n),
      e === "requires_action" && n)
    )
      this.republishPendingAction(n);
    else if (this.hasPendingAction)
      ((this.hasPendingAction = !1),
        (this.pendingActionLeadRequestId = void 0),
        (this.writtenLead = void 0),
        this.onMetadataChanged?.({ pending_action: null, pending_actions: null }),
        d(this.pendingActionWritten, null));
    if (e === "running") this.wipeTurnScopedMetadata();
    if (e === "idle" && this.hasTaskSummary)
      ((this.hasTaskSummary = !1), this.notifyMetadataChanged({ task_summary: null }));
    if (env.CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS)
      enqueueTaskNotification({ type: "system", subtype: "session_state_changed", state: e });
    else if (env.CLAUDE_CODE_SDK_READS_SESSION_STATE)
      enqueueTaskNotification({
        type: "system",
        subtype: "session_state_changed",
        state: e,
        sdk_host_only: !0,
      });
  }
  republishPendingAction(e) {
    this.hasPendingAction = !0;
    let { lead: lead, patch: patch } = this.pendingActionPatch(e);
    (this.onMetadataChanged?.(patch), d(this.pendingActionWritten, lead));
  }
  leadRecordRefused(e) {
    let writtenLead = this.writtenLead,
      slimsRefusedLead = this.slimsRefusedLead;
    if (
      writtenLead === void 0 ||
      !(typeof slimsRefusedLead === "function" ? slimsRefusedLead(writtenLead) : slimsRefusedLead) ||
      this.slimLeads.has(writtenLead) ||
      writtenLead.tool_name.startsWith("dialog:") ||
      e.tool_use_id !== writtenLead.tool_use_id ||
      requestIdOf(e) !== requestIdOf(writtenLead)
    )
      return !1;
    return (this.slimLeads.add(writtenLead), this.republishPendingAction(writtenLead), !0);
  }
  forgetWrittenLead() {
    this.writtenLead = void 0;
  }
  isWrittenSlim(e) {
    return this.slimLeads.has(e);
  }
  pendingTurnEndSummary;
  holdTurnEndSummary(e, n) {
    let t = { promise: e, deadlineAt: n, settled: !1, superseded: !1 },
      r = () => {
        t.settled = !0;
      };
    return (e.then(r, r), (this.pendingTurnEndSummary = t), t);
  }
  turnEndSummaryOutstanding(e = performance.now()) {
    let pendingTurnEndSummary = this.pendingTurnEndSummary;
    return (
      pendingTurnEndSummary !== void 0 &&
      !pendingTurnEndSummary.settled &&
      e < pendingTurnEndSummary.deadlineAt
    );
  }
  supersedeTurnEndSummary() {
    let pendingTurnEndSummary = this.pendingTurnEndSummary;
    if (pendingTurnEndSummary !== void 0 && !pendingTurnEndSummary.settled)
      pendingTurnEndSummary.superseded = !0;
  }
  waitForTurnEndSummary() {
    let pendingTurnEndSummary = this.pendingTurnEndSummary;
    if (pendingTurnEndSummary === void 0 || !this.turnEndSummaryOutstanding()) return;
    let abortController = new AbortController();
    return Promise.race([
      pendingTurnEndSummary.promise.catch(() => {}),
      sleep(
        Math.max(0, Math.ceil(pendingTurnEndSummary.deadlineAt - performance.now()) + 1),
        abortController.signal,
      ),
    ]).finally(() => abortController.abort());
  }
  wipeTurnScopedMetadata() {
    if (
      (this.supersedeTurnEndSummary(),
      this.onMetadataChanged?.({ post_turn_summary: null, recap: null }),
      this.hasTerminalGoalSnapshot)
    )
      ((this.hasTerminalGoalSnapshot = !1), this.onMetadataChanged?.({ goal: null }));
  }
  adoptRestoredGoalSnapshot() {
    this.hasTerminalGoalSnapshot = !0;
  }
  adoptRestoredPendingAction() {
    this.hasPendingAction = !0;
  }
  pendingActionPatch(e) {
    let n = this.getPendingActionDetails?.(requestIdOf(e) ?? e.request_id) ?? [],
      t =
        (this.leadsWithOldestCard && n.includes(e)
          ? n.find((s) => s.agent_id === void 0 && !s.tool_name.startsWith("dialog:"))
          : void 0) ?? e;
    ((this.pendingActionLeadRequestId = requestIdOf(t)), (this.writtenLead = t));
    let reverse = n.filter((s) => s !== t).reverse(),
      o = this.slimLeads.has(t)
        ? {
            ...pendingActionPayload(t),
            ...(t.display_tool_name !== void 0 && { display_tool_name: c(t.display_tool_name) }),
            action_description: c(t.action_description),
            raw_command: void 0,
            ...(t.request_id && {
              request_id: "",
              suppressed_request_id: t.request_id,
              blanked_for_size: !0,
            }),
          }
        : t;
    return { lead: t, patch: { pending_action: o, pending_actions: h9o(o, reverse) } };
  }
  notifyMetadataChanged(e, n) {
    if ("post_turn_summary" in e && n?.turnEndVerdict !== !0) this.supersedeTurnEndSummary();
    if ((this.onMetadataChanged?.(e), "is_ultracode_active" in e && this.onMetadataChanged))
      ((this.ultracodeActiveSent = e.is_ultracode_active === !0), (this.ultracodeActiveWritten = !0));
    if ("goal" in e) this.hasTerminalGoalSnapshot = e.goal?.met === !0;
    if ("task_summary" in e) {
      if (e.task_summary != null) this.hasTaskSummary = !0;
      enqueueTaskNotification({ type: "system", subtype: "task_summary", detail: e.task_summary ?? null });
    }
    if ("artifacts" in e)
      enqueueTaskNotification({
        type: "system",
        subtype: "session_metadata",
        metadata: { artifacts: e.artifacts },
      });
  }
  ultracodeActiveSent = !1;
  ultracodeActiveWritten = !1;
  ultracodeActivePatch(e) {
    return e === this.ultracodeActiveSent ? {} : { is_ultracode_active: e || null };
  }
  notifyUltracodeActive(e) {
    let ultracodeActivePatch = this.ultracodeActivePatch(e);
    if ("is_ultracode_active" in ultracodeActivePatch) this.notifyMetadataChanged(ultracodeActivePatch);
  }
  settleUltracodeActive(e, n) {
    if (!this.ultracodeActiveWritten)
      this.ultracodeActiveSent = n?.readFailed === !0 ? void 0 : n?.external?.is_ultracode_active === !0;
    this.notifyUltracodeActive(e);
  }
  workerPermissionModeRecordEnabled = !1;
  get isWorkerPermissionModeRecordEnabled() {
    return this.workerPermissionModeRecordEnabled;
  }
  enableWorkerPermissionModeRecord() {
    this.workerPermissionModeRecordEnabled = !0;
  }
  notifyPermissionModeChanged(e) {
    this.onPermissionModeChanged?.(e);
  }
  notifyProactivityLevelChanged() {
    this.onProactivityLevelChanged?.();
  }
  resumableOrphanedAgents = [];
  restartNoticeShown = !1;
  markResumableOrphanedAgentsToldAtTurnEnd() {
    if (
      this.restartNoticeShown &&
      this.resumableOrphanedAgents.some((resumableOrphanedAgent) => resumableOrphanedAgent.told !== !0)
    ) {
      let mapped = this.resumableOrphanedAgents.map((resumableOrphanedAgent) => ({
        ...resumableOrphanedAgent,
        told: !0,
      }));
      ((this.resumableOrphanedAgents = mapped),
        this.notifyInternalMetadataChanged({ resumable_orphaned_agents: mapped }));
    }
  }
  notifyInternalMetadataChanged(e) {
    this.onInternalMetadataChanged?.(e);
  }
  notifyActiveGoalChanged(e) {
    this.onActiveGoalChanged?.(e);
  }
  notifyAutocompactInputsChanged() {
    this.onAutocompactInputsChanged?.();
  }
  notifyConversationReset() {
    this.onConversationReset?.();
  }
}
/**
 * 会话结束时可能被停止的长期任务类型与提示。
 */
//@ chunk-achyj058.js:9513-9954 placement
var LONG_RUNNING_TASK_TYPES = new Set(["local_bash", "monitor_mcp", "monitor_ws"]),
  f =
    "In this session every process left running is likely stopped a few minutes after each reply, so a command you re-create now will likely be stopped after your next reply too: run in the foreground, with a long enough `timeout`, any that must finish and can finish within the foreground maximum, and otherwise tell the user it will likely be stopped a few minutes after your reply.";
/**
 * 描述仍在运行的后台进程（会话结束前提醒）。
 */
//@ chunk-achyj058.js:9954-11007 placement
function describeRunningProcesses(e, n, t) {
  let r = [];
  if (e.length > 0) {
    let mapped = e.map(
      (s) => `- ${escapeXml(s.description || "(no description)")} (task ${escapeXml(s.task_id)})`,
    );
    r.push(`The following background tasks were running and are now stopped:
${mapped.join(`
`)}
${t ? `${t} Re-create anything else` : "Re-create them"} if still needed.${T_() && e.some((s) => LONG_RUNNING_TASK_TYPES.has(s.task_type ?? "")) ? ` ${f}` : ""}`);
  }
  if (n.length > 0) {
    let mapped = n.map((a) => (isDiskless() ? void 0 : a.output_file)),
      mapped_2 = n.map((a, p) => {
        let u = mapped[p],
          g = u ? `output: ${escapeXml(u)}` : "no output file";
        return `- ${escapeXml(a.description || "(no description)")} (task ${escapeXml(a.task_id)}), status ${escapeXml(a.status)}, ${g}`;
      }),
      h = mapped.some(Boolean)
        ? "Read the output file to get the result (it is gone if the restart replaced the container); they cannot be stopped or messaged."
        : "No output file was recorded for them, and they cannot be stopped or messaged; re-create them if still needed.";
    r.push(`These background tasks finished before the restart, but their results were not delivered to you:
${mapped_2.join(`
`)}
${h}`);
  }
  return `<system-reminder>
The container was restarted. ${r.join(`
`)}
</system-reminder>`;
}
//@ chunk-achyj058.js:11007-11058 placement
function d(e, ...n) {
  try {
    e.emit(...n);
  } catch (error) {
    logError(error);
  }
}
/**
 * 通知会话状态变化（idle/running/requires_action），供 SDK/远程控制显示。
 */
//@ chunk-fp6aqx1j.js:20341-20599 fingerprint = notifySessionStateChanged (0.33)
function notifySessionStateChanged(state, details) {
  if (state === "requires_action") return { reported: state };
  let s = details.external?.pending_actions;
  return {
    reported: state,
    pendingActionOutstanding:
      details.readFailed === !0 ||
      (details.external?.pending_action !== void 0 && details.external.pending_action !== null) ||
      (Array.isArray(s) && s.length > 0),
  };
}

export {
  SessionStateTracker,
  describeRunningProcesses,
  notifySessionStateChanged,
  requestIdOf,
  h9o,
  parseCrossSessionInboundCapability,
  i8r,
  g9o,
};
