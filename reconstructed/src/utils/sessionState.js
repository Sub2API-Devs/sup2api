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
import { MAX_DESCRIPTION_CHARS } from "../constants/outputLimits.js";
import { truncateToLength } from "./stringUtils.js";
import { createSignal } from "./signal.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { env } from "./env.js";
import { parkOnUser } from "./sessionActivity.js";
import { enqueueTaskNotification } from "./task/taskNotifications.js";
import { sleep } from "./sleep.js";
import { escapeXml_2 as escapeXml } from "./confusables.js";
import { hasBackgroundBashStopAfterReply } from "../tools/AgentTool/backgroundGates.js";
import { isDiskless } from "../bootstrap/state.js";
import { logError } from "./log.js";

//@ chunk-achyj058.js:655-774 placement
/**
 * 取请求 id（或被抑制的请求 id）。
 */
function requestIdOf(e) {
  for (let n of [e?.request_id, e?.suppressed_request_id])
    if (typeof n === "string" && n.length > 0) return n;
  return;
}
//@ chunk-achyj058.js:774-785 placement
/**
 * MAX_PENDING_ACTION_ARGS：待决动作参数最多保留几项。
 */
var MAX_PENDING_ACTION_ARGS = 32;
//@ chunk-achyj058.js:785-1349 placement
/**
 * 生成待决动作的描述（工具名、显示名、原始命令）。
 */
function pendingActionPayload(e) {
  let { display_tool_name: displayToolName, raw_command: rawCommand } = e;
  return {
    tool_name: e.tool_name,
    ...(displayToolName === undefined
      ? {}
      : {
          display_tool_name: displayToolName,
        }),
    action_description: truncate(e.action_description, MAX_DESCRIPTION_CHARS),
    ...(rawCommand === undefined
      ? {}
      : {
          raw_command: truncate(rawCommand, MAX_DESCRIPTION_CHARS),
        }),
    tool_use_id: e.tool_use_id,
    request_id: e.request_id,
    ...(e.suppressed_request_id === undefined
      ? {}
      : {
          suppressed_request_id: e.suppressed_request_id,
        }),
    ...(e.decision_reason_type === undefined
      ? {}
      : {
          decision_reason_type: e.decision_reason_type,
        }),
    ...(e.decision_reason_code === undefined
      ? {}
      : {
          decision_reason_code: e.decision_reason_code,
        }),
    ...(e.agent_id === undefined
      ? {}
      : {
          agent_id: e.agent_id,
        }),
  };
}
//@ chunk-achyj058.js:1349-1404 placement
/**
 * pendingActionRows：待决动作的展示行。
 */
function pendingActionRows(e, n) {
  return [e, ...n.slice(0, MAX_PENDING_ACTION_ARGS - 1).map(pendingActionPayload)];
}
//@ chunk-achyj058.js:1404-1481 placement
function truncateForPendingAction(e) {
  let n = truncate(e, MAX_DESCRIPTION_CHARS);
  return n.length <= 4 * MAX_DESCRIPTION_CHARS
    ? n
    : `${truncateToLength(n, 4 * MAX_DESCRIPTION_CHARS - 1)}\u2026`;
}
//@ chunk-achyj058.js:1481-1642 placement
function parseCrossSessionInboundCapability(externalMetadata) {
  switch (externalMetadata?.cross_session_inbound) {
    case "unavailable":
      return {
        acceptsPeerMessages: false,
      };
    case "available":
      return {
        acceptsPeerMessages: true,
      };
    default:
      return;
  }
}
//@ chunk-achyj058.js:1642-1656 placement
/**
 * SESSION_STATE_IDLE_TTL_MS：会话状态空闲有效期。
 */
var SESSION_STATE_IDLE_TTL_MS = 60000;
//@ chunk-achyj058.js:1656-9513 placement
/**
 * 会话状态跟踪（运行/空闲/等待决定、待决动作、状态变化事件）。
 */
class SessionStateTracker {
  stateChanged = createSignal();
  pendingActionWritten = createSignal();
  userDecisionPendingChanged = createSignal();
  userDecisionsPending = 0;
  onStateChanged;
  getPendingActionDetails;
  leadsWithOldestCard = false;
  slimsRefusedLead = false;
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
  hasPendingAction = false;
  hasTaskSummary = false;
  hasTerminalGoalSnapshot = false;
  mainLoopRefcount = 0;
  nestedBlockedChains = Object.create(null);
  nestedBlockedChainCount = 0;
  droppedChainAgentIds = Object.create(null);
  nestedChainUnparks = Object.create(null);
  lastWaitingOnUser = false;
  chainExcessLogged = false;
  beginUserDecision() {
    this.userDecisionsPending += 1;
    if (this.userDecisionsPending === 1) emitSafely(this.userDecisionPendingChanged, true);
  }
  get userDecisionPending() {
    return this.userDecisionsPending > 0;
  }
  endUserDecision() {
    if (this.userDecisionsPending === 0) return;
    this.userDecisionsPending -= 1;
    if (this.userDecisionsPending === 0) emitSafely(this.userDecisionPendingChanged, false);
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
    this.mainLoopRefcount = e;
    if (e > 0 && this.resumableOrphanedAgents.length > 0) this.restartNoticeShown = true;
    this.emitIfWaitingChanged();
  }
  emitIfWaitingChanged() {
    this.checkChainInvariant();
    let waitingOnUser = this.waitingOnUser;
    if (waitingOnUser !== this.lastWaitingOnUser) {
      this.lastWaitingOnUser = waitingOnUser;
      this.onWaitingOnUserChanged?.(waitingOnUser);
    }
  }
  checkChainInvariant() {
    if (this.nestedBlockedChainCount - this.mainLoopRefcount > 0) {
      if (!this.chainExcessLogged) {
        this.chainExcessLogged = true;
        logForDiagnosticsNoPII("warn", "nested_chain_count_exceeds_refcount", {
          nested_blocked_chain_count: this.nestedBlockedChainCount,
          main_loop_refcount: this.mainLoopRefcount,
          session_state: this.currentState,
        });
      }
    } else this.chainExcessLogged = false;
  }
  reteeWaitingOnUser() {
    this.onWaitingOnUserChanged?.(this.waitingOnUser);
  }
  notifyNestedPromptBlocking(e) {
    if (env.CLAUDE_CODE_DISABLE_NESTED_CHAIN_IDLE) return;
    if (this.droppedChainAgentIds[e]) return;
    let n = this.nestedBlockedChains[e] ?? 0;
    this.nestedBlockedChains[e] = n + 1;
    if (n === 0) {
      this.nestedBlockedChainCount++;
      if (this.nestedBlockedChainCount <= this.mainLoopRefcount) this.nestedChainUnparks[e] = parkOnUser();
    }
    this.emitIfWaitingChanged();
  }
  notifyNestedPromptUnblocking(e) {
    let n = (this.nestedBlockedChains[e] ?? 0) - 1;
    if (n > 0) this.nestedBlockedChains[e] = n;
    else if (this.nestedBlockedChains[e] !== undefined) this.removeChain(e);
    this.emitIfWaitingChanged();
  }
  removeChain(e) {
    delete this.nestedBlockedChains[e];
    this.nestedBlockedChainCount--;
    this.nestedChainUnparks[e]?.();
    delete this.nestedChainUnparks[e];
  }
  dropNestedBlockedChain(e) {
    this.droppedChainAgentIds[e] = true;
    if (this.nestedBlockedChains[e] !== undefined) {
      this.removeChain(e);
      this.emitIfWaitingChanged();
    }
  }
  notifyTurnStarting(e, n) {
    this.onTurnStarting?.(e, n);
  }
  notifyTurnBeganBeforeInit() {
    this.onTurnBeganBeforeInit?.();
  }
  notifyStateChanged(e, n) {
    this.currentState = e;
    this.lastWaitingOnUser = this.waitingOnUser;
    this.onStateChanged?.(e, n);
    emitSafely(this.stateChanged, e, n);
    if (e === "requires_action" && n) this.republishPendingAction(n);
    else if (this.hasPendingAction) {
      this.hasPendingAction = false;
      this.pendingActionLeadRequestId = undefined;
      this.writtenLead = undefined;
      this.onMetadataChanged?.({
        pending_action: null,
        pending_actions: null,
      });
      emitSafely(this.pendingActionWritten, null);
    }
    if (e === "running") this.wipeTurnScopedMetadata();
    if (e === "idle" && this.hasTaskSummary) {
      this.hasTaskSummary = false;
      this.notifyMetadataChanged({
        task_summary: null,
      });
    }
    if (env.CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS)
      enqueueTaskNotification({
        type: "system",
        subtype: "session_state_changed",
        state: e,
      });
    else if (env.CLAUDE_CODE_SDK_READS_SESSION_STATE)
      enqueueTaskNotification({
        type: "system",
        subtype: "session_state_changed",
        state: e,
        sdk_host_only: true,
      });
  }
  republishPendingAction(e) {
    this.hasPendingAction = true;
    let { lead, patch } = this.pendingActionPatch(e);
    this.onMetadataChanged?.(patch);
    emitSafely(this.pendingActionWritten, lead);
  }
  leadRecordRefused(e) {
    let writtenLead = this.writtenLead;
    let slimsRefusedLead = this.slimsRefusedLead;
    if (
      writtenLead === undefined ||
      !(typeof slimsRefusedLead === "function" ? slimsRefusedLead(writtenLead) : slimsRefusedLead) ||
      this.slimLeads.has(writtenLead) ||
      writtenLead.tool_name.startsWith("dialog:") ||
      e.tool_use_id !== writtenLead.tool_use_id ||
      requestIdOf(e) !== requestIdOf(writtenLead)
    )
      return false;
    this.slimLeads.add(writtenLead);
    this.republishPendingAction(writtenLead);
    return true;
  }
  forgetWrittenLead() {
    this.writtenLead = undefined;
  }
  isWrittenSlim(e) {
    return this.slimLeads.has(e);
  }
  pendingTurnEndSummary;
  holdTurnEndSummary(e, deadlineAt) {
    let t = {
      promise: e,
      deadlineAt,
      settled: false,
      superseded: false,
    };
    let r = () => {
      t.settled = true;
    };
    e.then(r, r);
    this.pendingTurnEndSummary = t;
    return t;
  }
  turnEndSummaryOutstanding(e = performance.now()) {
    let pendingTurnEndSummary = this.pendingTurnEndSummary;
    return (
      pendingTurnEndSummary !== undefined &&
      !pendingTurnEndSummary.settled &&
      e < pendingTurnEndSummary.deadlineAt
    );
  }
  supersedeTurnEndSummary() {
    let pendingTurnEndSummary = this.pendingTurnEndSummary;
    if (pendingTurnEndSummary !== undefined && !pendingTurnEndSummary.settled)
      pendingTurnEndSummary.superseded = true;
  }
  waitForTurnEndSummary() {
    let pendingTurnEndSummary = this.pendingTurnEndSummary;
    if (pendingTurnEndSummary === undefined || !this.turnEndSummaryOutstanding()) return;
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
    this.supersedeTurnEndSummary();
    this.onMetadataChanged?.({
      post_turn_summary: null,
      recap: null,
    });
    if (this.hasTerminalGoalSnapshot) {
      this.hasTerminalGoalSnapshot = false;
      this.onMetadataChanged?.({
        goal: null,
      });
    }
  }
  adoptRestoredGoalSnapshot() {
    this.hasTerminalGoalSnapshot = true;
  }
  adoptRestoredPendingAction() {
    this.hasPendingAction = true;
  }
  pendingActionPatch(e) {
    let n = this.getPendingActionDetails?.(requestIdOf(e) ?? e.request_id) ?? [];
    let t =
      (this.leadsWithOldestCard && n.includes(e)
        ? n.find((s) => s.agent_id === undefined && !s.tool_name.startsWith("dialog:"))
        : undefined) ?? e;
    this.pendingActionLeadRequestId = requestIdOf(t);
    this.writtenLead = t;
    let r = n.filter((s) => s !== t).reverse();
    let o = this.slimLeads.has(t)
      ? {
          ...pendingActionPayload(t),
          ...(t.display_tool_name !== undefined && {
            display_tool_name: truncateForPendingAction(t.display_tool_name),
          }),
          action_description: truncateForPendingAction(t.action_description),
          raw_command: undefined,
          ...(t.request_id && {
            request_id: "",
            suppressed_request_id: t.request_id,
            blanked_for_size: true,
          }),
        }
      : t;
    return {
      lead: t,
      patch: {
        pending_action: o,
        pending_actions: pendingActionRows(o, r),
      },
    };
  }
  notifyMetadataChanged(e, n) {
    if ("post_turn_summary" in e && n?.turnEndVerdict !== true) this.supersedeTurnEndSummary();
    this.onMetadataChanged?.(e);
    if ("is_ultracode_active" in e && this.onMetadataChanged) {
      this.ultracodeActiveSent = e.is_ultracode_active === true;
      this.ultracodeActiveWritten = true;
    }
    if ("goal" in e) this.hasTerminalGoalSnapshot = e.goal?.met === true;
    if ("task_summary" in e) {
      if (e.task_summary != null) this.hasTaskSummary = true;
      enqueueTaskNotification({
        type: "system",
        subtype: "task_summary",
        detail: e.task_summary ?? null,
      });
    }
    if ("artifacts" in e)
      enqueueTaskNotification({
        type: "system",
        subtype: "session_metadata",
        metadata: {
          artifacts: e.artifacts,
        },
      });
  }
  ultracodeActiveSent = false;
  ultracodeActiveWritten = false;
  ultracodeActivePatch(e) {
    return e === this.ultracodeActiveSent
      ? {}
      : {
          is_ultracode_active: e || null,
        };
  }
  notifyUltracodeActive(e) {
    let n = this.ultracodeActivePatch(e);
    if ("is_ultracode_active" in n) this.notifyMetadataChanged(n);
  }
  settleUltracodeActive(e, n) {
    if (!this.ultracodeActiveWritten)
      this.ultracodeActiveSent =
        n?.readFailed === true ? undefined : n?.external?.is_ultracode_active === true;
    this.notifyUltracodeActive(e);
  }
  workerPermissionModeRecordEnabled = false;
  get isWorkerPermissionModeRecordEnabled() {
    return this.workerPermissionModeRecordEnabled;
  }
  enableWorkerPermissionModeRecord() {
    this.workerPermissionModeRecordEnabled = true;
  }
  notifyPermissionModeChanged(e) {
    this.onPermissionModeChanged?.(e);
  }
  notifyProactivityLevelChanged() {
    this.onProactivityLevelChanged?.();
  }
  resumableOrphanedAgents = [];
  restartNoticeShown = false;
  markResumableOrphanedAgentsToldAtTurnEnd() {
    if (
      this.restartNoticeShown &&
      this.resumableOrphanedAgents.some((resumableOrphanedAgent) => resumableOrphanedAgent.told !== true)
    ) {
      let mapped = this.resumableOrphanedAgents.map((resumableOrphanedAgent) => ({
        ...resumableOrphanedAgent,
        told: true,
      }));
      this.resumableOrphanedAgents = mapped;
      this.notifyInternalMetadataChanged({
        resumable_orphaned_agents: mapped,
      });
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
//@ chunk-achyj058.js:9513-9954 placement
/**
 * 会话结束时可能被停止的长期任务类型与提示。
 */
var LONG_RUNNING_TASK_TYPES = new Set(["local_bash", "monitor_mcp", "monitor_ws"]);
var LONG_RUNNING_PROCESS_NOTE =
  "In this session every process left running is likely stopped a few minutes after each reply, so a command you re-create now will likely be stopped after your next reply too: run in the foreground, with a long enough `timeout`, any that must finish and can finish within the foreground maximum, and otherwise tell the user it will likely be stopped a few minutes after your reply.";
//@ chunk-achyj058.js:9954-11007 placement
/**
 * 描述仍在运行的后台进程（会话结束前提醒）。
 */
function describeRunningProcesses(e, orphanTasks, canUseTool) {
  let r = [];
  if (e.length > 0) {
    let mapped = e.map(
      (s) => `- ${escapeXml(s.description || "(no description)")} (task ${escapeXml(s.task_id)})`,
    );
    r.push(`The following background tasks were running and are now stopped:
${mapped.join(`
`)}
${canUseTool ? `${canUseTool} Re-create anything else` : "Re-create them"} if still needed.${hasBackgroundBashStopAfterReply() && e.some((s) => LONG_RUNNING_TASK_TYPES.has(s.task_type ?? "")) ? ` ${LONG_RUNNING_PROCESS_NOTE}` : ""}`);
  }
  if (orphanTasks.length > 0) {
    let mapped = orphanTasks.map((a) => (isDiskless() ? undefined : a.output_file));
    let mapped_2 = orphanTasks.map((a, p) => {
      let u = mapped[p];
      let g = u ? `output: ${escapeXml(u)}` : "no output file";
      return `- ${escapeXml(a.description || "(no description)")} (task ${escapeXml(a.task_id)}), status ${escapeXml(a.status)}, ${g}`;
    });
    let h = mapped.some(Boolean)
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
function emitSafely(e, ...n) {
  try {
    e.emit(...n);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-fp6aqx1j.js:20341-20599 fingerprint = notifySessionStateChanged (0.33)
/**
 * 通知会话状态变化（idle/running/requires_action），供 SDK/远程控制显示。
 */
function notifySessionStateChanged(state, details) {
  if (state === "requires_action")
    return {
      reported: state,
    };
  let pendingActions = details.external?.pending_actions;
  return {
    reported: state,
    pendingActionOutstanding:
      details.readFailed === true ||
      (details.external?.pending_action !== undefined && details.external.pending_action !== null) ||
      (Array.isArray(pendingActions) && pendingActions.length > 0),
  };
}
export {
  SessionStateTracker,
  describeRunningProcesses,
  requestIdOf,
  notifySessionStateChanged,
  pendingActionRows,
  parseCrossSessionInboundCapability,
  SESSION_STATE_IDLE_TTL_MS,
  MAX_PENDING_ACTION_ARGS,
};
