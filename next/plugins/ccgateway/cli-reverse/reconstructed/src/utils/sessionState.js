/**
 * utils/sessionState.ts
 *
 * 会话状态（idle/running/requires_action）变化通知。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sessionState.ts
 * pieces: chunk-v7p9necf.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { truncate } from "./format.js";
import { MAX_DESCRIPTION_CHARS } from "../constants/outputLimits.js";
import { askedInDirectoryOf } from "./sessionStateCwd.js";
import { jsonStringify } from "./slowOperations.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-v7p9necf.js:1892-2011 placement
/**
 * 取请求 id（或被抑制的请求 id）。
 */
function requestIdOf(request) {
  for (let requestId of [request?.request_id, request?.suppressed_request_id])
    if (typeof requestId === "string" && requestId.length > 0) return requestId;
  return;
}
//@ chunk-v7p9necf.js:2011-2051 placement
/**
 * MAX_PENDING_ACTION_ARGS：待决动作参数最多保留几项。
 */
var MAX_PENDING_ACTION_ARGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_SINGLE_INPUT_BYTES;
var MAX_PENDING_INPUT_BYTES;
var weakMap;
deferInit("chunk-v7p9necf.js:2011", () => {
  MAX_PENDING_ACTION_ARGS = 32;
  MAX_SINGLE_INPUT_BYTES = 4096;
  MAX_PENDING_INPUT_BYTES = 32768;
  weakMap = new WeakMap();
});
//@ chunk-v7p9necf.js:2051-2816 placement
/**
 * 生成待决动作的描述（工具名、显示名、原始命令）。
 */
function pendingActionPayload(action, withInput) {
  let { display_tool_name: displayToolName, raw_command: rawCommand } = action;
  let input = withInput ? action.input : undefined;
  return {
    tool_name: action.tool_name,
    ...(displayToolName === undefined
      ? {}
      : {
          display_tool_name: displayToolName,
        }),
    action_description: truncate(action.action_description, MAX_DESCRIPTION_CHARS),
    ...(rawCommand === undefined
      ? {}
      : {
          raw_command: input === undefined ? truncate(rawCommand, MAX_DESCRIPTION_CHARS) : rawCommand,
        }),
    tool_use_id: action.tool_use_id,
    ...(input === undefined
      ? {}
      : {
          input,
        }),
    request_id: action.request_id,
    ...(action.suppressed_request_id === undefined
      ? {}
      : {
          suppressed_request_id: action.suppressed_request_id,
        }),
    ...(action.decision_reason_type === undefined
      ? {}
      : {
          decision_reason_type: action.decision_reason_type,
        }),
    ...(action.decision_reason_code === undefined
      ? {}
      : {
          decision_reason_code: action.decision_reason_code,
        }),
    ...(action.agent_id === undefined
      ? {}
      : {
          agent_id: action.agent_id,
        }),
    ...(action.chrome_site === undefined
      ? {}
      : {
          chrome_site: action.chrome_site,
        }),
    ...(action.asked_in_directory === undefined
      ? {}
      : {
          asked_in_directory: askedInDirectoryOf(action.asked_in_directory),
        }),
  };
}
//@ chunk-v7p9necf.js:2816-3087 placement
/**
 * pendingActionRows：待决动作的展示行。
 */
function pendingActionRows(lead, rest) {
  let remainingBytes = MAX_PENDING_INPUT_BYTES;
  return [
    lead,
    ...rest.slice(0, MAX_PENDING_ACTION_ARGS - 1).map((action) => {
      if (action.input === undefined) return pendingActionPayload(action, false);
      let inputBytes = weakMap.get(action);
      if (inputBytes === undefined) {
        inputBytes = Buffer.byteLength(jsonStringify(action.input), "utf8");
        weakMap.set(action, inputBytes);
      }
      let totalBytes = inputBytes + Buffer.byteLength(action.raw_command ?? "", "utf8");
      let fits = inputBytes <= MAX_SINGLE_INPUT_BYTES && totalBytes <= remainingBytes;
      if (fits) remainingBytes -= totalBytes;
      return pendingActionPayload(action, fits);
    }),
  ];
}
//@ chunk-v7p9necf.js:3087-3163 placement
function truncateForPendingAction(text) {
  let truncated = truncate(text, MAX_DESCRIPTION_CHARS);
  return truncated.length <= 4 * MAX_DESCRIPTION_CHARS
    ? truncated
    : `${truncateToLength(truncated, 4 * MAX_DESCRIPTION_CHARS - 1)}\u2026`;
}
//@ chunk-v7p9necf.js:3163-3324 placement
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
//@ chunk-v7p9necf.js:3324-3338 placement
/**
 * SESSION_STATE_IDLE_TTL_MS：会话状态空闲有效期。
 */
var SESSION_STATE_IDLE_TTL_MS = 60000;
//@ chunk-v7p9necf.js:3338-11684 placement
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
  storedAnswerStands = new WeakSet();
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
  setMainLoopRefcount(refcount) {
    this.mainLoopRefcount = refcount;
    if (refcount > 0 && this.resumableOrphanedAgents.length > 0) this.restartNoticeShown = true;
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
  notifyNestedPromptBlocking(agentId) {
    if (env.CLAUDE_CODE_DISABLE_NESTED_CHAIN_IDLE) return;
    if (this.droppedChainAgentIds[agentId]) return;
    let previous = this.nestedBlockedChains[agentId] ?? 0;
    this.nestedBlockedChains[agentId] = previous + 1;
    if (previous === 0) {
      this.nestedBlockedChainCount++;
      if (this.nestedBlockedChainCount <= this.mainLoopRefcount)
        this.nestedChainUnparks[agentId] = parkOnUser();
    }
    this.emitIfWaitingChanged();
  }
  notifyNestedPromptUnblocking(agentId) {
    let remaining = (this.nestedBlockedChains[agentId] ?? 0) - 1;
    if (remaining > 0) this.nestedBlockedChains[agentId] = remaining;
    else if (this.nestedBlockedChains[agentId] !== undefined) this.removeChain(agentId);
    this.emitIfWaitingChanged();
  }
  removeChain(agentId) {
    delete this.nestedBlockedChains[agentId];
    this.nestedBlockedChainCount--;
    this.nestedChainUnparks[agentId]?.();
    delete this.nestedChainUnparks[agentId];
  }
  dropNestedBlockedChain(agentId) {
    this.droppedChainAgentIds[agentId] = true;
    if (this.nestedBlockedChains[agentId] !== undefined) {
      this.removeChain(agentId);
      this.emitIfWaitingChanged();
    }
  }
  notifyTurnStarting(state, detail) {
    this.onTurnStarting?.(state, detail);
  }
  notifyTurnBeganBeforeInit() {
    this.onTurnBeganBeforeInit?.();
  }
  notifyStateChanged(state, detail) {
    this.currentState = state;
    this.lastWaitingOnUser = this.waitingOnUser;
    this.onStateChanged?.(state, detail);
    emitSafely(this.stateChanged, state, detail);
    if (state === "requires_action" && detail) this.republishPendingAction(detail);
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
    if (state === "running") this.wipeTurnScopedMetadata();
    if (state === "idle" && this.hasTaskSummary) {
      this.hasTaskSummary = false;
      this.notifyMetadataChanged({
        task_summary: null,
      });
    }
    if (env.CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS)
      enqueueTaskNotification({
        type: "system",
        subtype: "session_state_changed",
        state,
      });
    else if (env.CLAUDE_CODE_SDK_READS_SESSION_STATE)
      enqueueTaskNotification({
        type: "system",
        subtype: "session_state_changed",
        state,
        sdk_host_only: true,
      });
  }
  republishPendingAction(lead) {
    this.hasPendingAction = true;
    let { lead: lead_2, patch } = this.pendingActionPatch(lead);
    this.onMetadataChanged?.(patch);
    emitSafely(this.pendingActionWritten, lead_2);
  }
  leadRecordRefused(lead) {
    let writtenLead = this.writtenLead;
    let slimsRefusedLead = this.slimsRefusedLead;
    if (
      writtenLead === undefined ||
      lead.tool_use_id !== writtenLead.tool_use_id ||
      requestIdOf(lead) !== requestIdOf(writtenLead)
    )
      return false;
    this.storedAnswerStands.delete(writtenLead);
    if (
      !(typeof slimsRefusedLead === "function" ? slimsRefusedLead(writtenLead) : slimsRefusedLead) ||
      this.slimLeads.has(writtenLead) ||
      writtenLead.tool_name.startsWith("dialog:")
    )
      return false;
    this.slimLeads.add(writtenLead);
    this.republishPendingAction(writtenLead);
    return true;
  }
  forgetWrittenLead() {
    this.writtenLead = undefined;
  }
  noteStoredAnswerStands(lead) {
    this.storedAnswerStands.add(lead);
  }
  doesStoredAnswerStand(lead) {
    return this.storedAnswerStands.has(lead);
  }
  isWrittenSlim(lead) {
    return this.slimLeads.has(lead);
  }
  pendingTurnEndSummary;
  holdTurnEndSummary(promise, deadlineAt) {
    let heldSummary = {
      promise,
      deadlineAt,
      settled: false,
      superseded: false,
      endedAt: undefined,
      ended: Promise.withResolvers(),
    };
    let markSettled = () => {
      heldSummary.settled = true;
    };
    promise.then(markSettled, markSettled);
    this.pendingTurnEndSummary = heldSummary;
    return heldSummary;
  }
  turnEndSummaryOutstanding(now = performance.now()) {
    let pendingTurnEndSummary = this.pendingTurnEndSummary;
    return (
      pendingTurnEndSummary !== undefined &&
      !pendingTurnEndSummary.settled &&
      pendingTurnEndSummary.endedAt === undefined &&
      now < pendingTurnEndSummary.deadlineAt
    );
  }
  endTurnEndSummaryHold() {
    let pendingTurnEndSummary = this.pendingTurnEndSummary;
    if (pendingTurnEndSummary !== undefined && this.turnEndSummaryOutstanding()) {
      pendingTurnEndSummary.superseded = true;
      pendingTurnEndSummary.endedAt = performance.now();
      pendingTurnEndSummary.ended.resolve();
    }
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
      pendingTurnEndSummary.ended.promise,
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
  pendingActionPatch(action) {
    let details = this.getPendingActionDetails?.(requestIdOf(action) ?? action.request_id) ?? [];
    let lead =
      (this.leadsWithOldestCard && details.includes(action)
        ? details.find((detail) => detail.agent_id === undefined && !detail.tool_name.startsWith("dialog:"))
        : undefined) ?? action;
    this.pendingActionLeadRequestId = requestIdOf(lead);
    this.writtenLead = lead;
    let others = details.filter((detail) => detail !== lead).reverse();
    let leadPayload = this.slimLeads.has(lead)
      ? {
          ...pendingActionPayload(lead, false),
          ...(lead.display_tool_name !== undefined && {
            display_tool_name: truncateForPendingAction(lead.display_tool_name),
          }),
          action_description: truncateForPendingAction(lead.action_description),
          raw_command: undefined,
          input: undefined,
          ...(lead.request_id && {
            request_id: "",
            suppressed_request_id: lead.request_id,
            blanked_for_size: true,
          }),
        }
      : lead;
    return {
      lead,
      patch: {
        pending_action: leadPayload,
        pending_actions: pendingActionRows(
          leadPayload,
          leadPayload === lead
            ? others
            : others.map((detail) => ({
                ...detail,
                input: undefined,
              })),
        ),
      },
    };
  }
  notifyMetadataChanged(patch) {
    if ("post_turn_summary" in patch) this.supersedeTurnEndSummary();
    this.onMetadataChanged?.(patch);
    if ("is_ultracode_active" in patch && this.onMetadataChanged) {
      this.ultracodeActiveSent = patch.is_ultracode_active === true;
      this.ultracodeActiveWritten = true;
    }
    if ("goal" in patch) this.hasTerminalGoalSnapshot = patch.goal?.met === true;
    if ("task_summary" in patch) {
      if (patch.task_summary != null) this.hasTaskSummary = true;
      enqueueTaskNotification({
        type: "system",
        subtype: "task_summary",
        detail: patch.task_summary ?? null,
      });
    }
    if ("artifacts" in patch)
      enqueueTaskNotification({
        type: "system",
        subtype: "session_metadata",
        metadata: {
          artifacts: patch.artifacts,
        },
      });
  }
  ultracodeActiveSent = false;
  ultracodeActiveWritten = false;
  ultracodeActivePatch(active) {
    return active === this.ultracodeActiveSent
      ? {}
      : {
          is_ultracode_active: active || null,
        };
  }
  notifyUltracodeActive(active) {
    let patch = this.ultracodeActivePatch(active);
    if ("is_ultracode_active" in patch) this.notifyMetadataChanged(patch);
  }
  settleUltracodeActive(active, read) {
    if (!this.ultracodeActiveWritten)
      this.ultracodeActiveSent =
        read?.readFailed === true ? undefined : read?.external?.is_ultracode_active === true;
    this.notifyUltracodeActive(active);
  }
  workerPermissionModeRecordEnabled = false;
  get isWorkerPermissionModeRecordEnabled() {
    return this.workerPermissionModeRecordEnabled;
  }
  enableWorkerPermissionModeRecord() {
    this.workerPermissionModeRecordEnabled = true;
  }
  notifyPermissionModeChanged(mode) {
    this.onPermissionModeChanged?.(mode);
  }
  notifyProactivityLevelChanged() {
    this.onProactivityLevelChanged?.();
  }
  resumableOrphanedAgents = [];
  picturesToHide;
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
  notifyInternalMetadataChanged(patch) {
    this.onInternalMetadataChanged?.(patch);
  }
  notifyActiveGoalChanged(goal) {
    this.onActiveGoalChanged?.(goal);
  }
  notifyAutocompactInputsChanged() {
    this.onAutocompactInputsChanged?.();
  }
  notifyConversationReset() {
    this.onConversationReset?.();
  }
}
//@ chunk-v7p9necf.js:11684-12125 placement
/**
 * 会话结束时可能被停止的长期任务类型与提示。
 */
var LONG_RUNNING_TASK_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var LONG_RUNNING_PROCESS_NOTE;
deferInit("chunk-v7p9necf.js:11684", () => {
  LONG_RUNNING_TASK_TYPES = new Set(["local_bash", "monitor_mcp", "monitor_ws"]);
  LONG_RUNNING_PROCESS_NOTE =
    "In this session every process left running is likely stopped a few minutes after each reply, so a command you re-create now will likely be stopped after your next reply too: run in the foreground, with a long enough `timeout`, any that must finish and can finish within the foreground maximum, and otherwise tell the user it will likely be stopped a few minutes after your reply.";
});
//@ chunk-v7p9necf.js:12125-13178 placement
/**
 * 描述仍在运行的后台进程（会话结束前提醒）。
 */
function describeRunningProcesses(stoppedTasks, orphanTasks, recreateHint) {
  let sections = [];
  if (stoppedTasks.length > 0) {
    let mapped = stoppedTasks.map(
      (task) => `- ${escapeXml(task.description || "(no description)")} (task ${escapeXml(task.task_id)})`,
    );
    sections.push(`The following background tasks were running and are now stopped:
${mapped.join(`
`)}
${recreateHint ? `${recreateHint} Re-create anything else` : "Re-create them"} if still needed.${hasBackgroundBashStopAfterReply() && stoppedTasks.some((task) => LONG_RUNNING_TASK_TYPES.has(task.task_type ?? "")) ? ` ${LONG_RUNNING_PROCESS_NOTE}` : ""}`);
  }
  if (orphanTasks.length > 0) {
    let mapped = orphanTasks.map((task) => (isDiskless() ? undefined : task.output_file));
    let mapped_2 = orphanTasks.map((task, index) => {
      let outputPath = mapped[index];
      let outputText = outputPath ? `output: ${escapeXml(outputPath)}` : "no output file";
      return `- ${escapeXml(task.description || "(no description)")} (task ${escapeXml(task.task_id)}), status ${escapeXml(task.status)}, ${outputText}`;
    });
    let hint = mapped.some(Boolean)
      ? "Read the output file to get the result (it is gone if the restart replaced the container); they cannot be stopped or messaged."
      : "No output file was recorded for them, and they cannot be stopped or messaged; re-create them if still needed.";
    sections.push(`These background tasks finished before the restart, but their results were not delivered to you:
${mapped_2.join(`
`)}
${hint}`);
  }
  return `<system-reminder>
The container was restarted. ${sections.join(`
`)}
</system-reminder>`;
}
//@ chunk-v7p9necf.js:13178-13229 placement
function emitSafely(signal, ...args) {
  try {
    signal.emit(...args);
  } catch (error) {
    logError(error);
  }
}
export {
  describeRunningProcesses,
  SessionStateTracker,
  MAX_PENDING_ACTION_ARGS,
  requestIdOf,
  pendingActionRows,
  parseCrossSessionInboundCapability,
  SESSION_STATE_IDLE_TTL_MS,
};
