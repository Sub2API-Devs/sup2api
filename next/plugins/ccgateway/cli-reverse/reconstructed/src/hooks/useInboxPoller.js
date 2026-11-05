/**
 * hooks/useInboxPoller.ts
 *
 * 队友 inbox 轮询：读取未读消息（队友消息、权限请求/回复、计划审批、关停），按角色投递到会话或回调。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useInboxPoller.ts
 * pieces: chunk-czq1j3j2.js (6)
 * attribution: placement 2, fingerprint 2, layout 2
 */
import { randomUUID } from "crypto";
import { init_react_production, useState, useEffect } from "../../vendor/react/cjs/react.production.js";
import { isTeamLead, hasNonLeadTeammate, isTeammate, isPlanModeRequired } from "../utils/teammate.js";
import { conversationSnapshot, InboxVerdictCache } from "../utils/inboxClassification.js";
import { INVALID_TOOL_NAME_TEXT } from "../components/permissions/consentRows.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../utils/debug.js";
import { stringSchema, objectSchema, literal } from "../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../ink/components/Text.js";
import { logEvent } from "../services/analytics/index.js";
import { env } from "../utils/env.js";
import { logError } from "../utils/log.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import {
  errorMessage,
  toError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../utils/errors.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { fromEnum, lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { plural } from "../utils/stringUtils.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { dedupeMailboxMessages } from "../utils/swarm/teammateMessageRepair.js";
import {
  getInboxPath,
  isPlanApprovalResponse,
  planVerdictBinding,
  planVerdictMismatchRejection,
  messageIdentityKey,
  isPermissionRequest,
  isPermissionResponse,
  isSandboxPermissionRequest,
  isSandboxPermissionResponse,
  isShutdownRequest,
  isShutdownApproved,
  isModeSetRequest,
  isPlanApprovalRequest,
  isTeamPermissionUpdate,
  isStructuredProtocolMessage,
  planApprovalResumeText,
  formatTeammateMessages,
  readUnreadMessages,
  markMessagesAsRead,
  writeToMailbox,
} from "../utils/teammateMailbox.js";
import { TEAM_LEAD } from "../utils/swarm/constants.js";
import { swarmHostState } from "../utils/swarm/hostState.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { applyStartupPermissionMode } from "../utils/permissions/bypassPermissionsKillswitch.js";
import { syncTeammateMode } from "../utils/swarm/teamHelpers.js";
import { findTool } from "../services/api/deferredToolsState.js";
import { getAllBaseTools } from "../tools.js";
import {
  hostValidationCacheKey,
  knownHostNameOrUndefined,
  describeApprovalSubject,
  describeInvalidHost,
} from "../utils/sandbox/hostValidation.js";
import { stableHashOfJson } from "../utils/stableHash.js";
import { buildForwardedPermissionDialog } from "../remote/forwardedPermissionDialog.js";
import { createAssistantMessage } from "../utils/messages.js";
import {
  sendPermissionResponseViaMailbox,
  sendSandboxPermissionResponseViaMailbox,
} from "../utils/swarm/permissionSync.js";
import { CountedAsk } from "../utils/countedAsk.js";
import { isNotAskUserQuestionCard } from "../components/permissions/permissionCardKinds.js";
import { notifyAsync } from "../utils/terminalProbe.js";
import {
  displayLabelOrUnnamedTool,
  toApprovalLabel,
  SHORT_LABEL_WIDTH,
  labelOr,
} from "../utils/permissions/approvalPayloadSerialization.js";
import { getModeBaseBehavior } from "../utils/permissions/PermissionMode.js";
import { isClassifierSideCallRetired } from "../utils/permissions/serverClassifier/flags.js";
import { isNetworkSandboxRestricted } from "../tools/BashTool/sandboxNetwork.js";
import { classifySandboxNetworkHost } from "../utils/permissions/sandboxNetworkClassifier.js";
import { askSandboxNetworkFromWorker } from "../screens/repl/SandboxNetworkPrompts.js";
import { applyValidatedPermissionUpdate } from "../utils/permissions/PermissionUpdate.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import {
  isTeammateAwaitingPlan,
  teammateModeAfterPlan,
} from "../tools/ExitPlanModeTool/planPreconditions.js";
import { hasLeftProactivityBaseline } from "../utils/permissions/permissions.js";
import { resolveTeamName } from "../tools/AgentTool/AgentTool.js";
import { ensureBackendsRegistered, getBackendByType } from "../utils/swarm/backends/registry.js";
import { isInsideTmux } from "../utils/swarm/backends/detection.js";
import { killTeammate } from "../components/teams/TeamsDialog.js";
import { filterMailboxThroughReceiveHooks } from "../utils/swarm/teammateMailbox.js";
import { useAppStoreDirect } from "../state/AppState.js";
import { useTerminalNotification } from "../ink/useTerminalNotification.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { getSenderKind } from "../tools/SendMessageTool/SendMessageTool.js";
import {
  hasPendingSwarmPermission,
  processMailboxPermissionResponse,
  hasPendingSandboxPermission,
  processSandboxPermissionResponse,
} from "./useSwarmPermissionPoller.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1713038-1713042 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1713038", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1716193-1716436 fingerprint (2.1.88 match: getAgentNameToPoll, 0.644)
function getAgentNameToPoll(identity, store) {
  switch (identity.kind) {
    case "in-process":
      return;
    case "teammate":
      return identity.agentName;
    case "session": {
      if (isTeamLead(store.teamContext)) {
        if (!hasNonLeadTeammate(store.teamContext)) return;
        let { leadAgentId, teammates } = store.teamContext;
        return teammates[leadAgentId]?.name || "team-lead";
      }
      return;
    }
  }
}
//@ chunk-czq1j3j2.js:1716436-1716461 layout
var INBOX_POLL_DEBOUNCE_MS; // deferred: uses conversationSnapshot (../utils/inboxClassification.js) of its import cycle while loading; runs once the cycle is complete
var emptyConversationSnapshot;
deferInit("chunk-czq1j3j2.js:1716436", () => {
  INBOX_POLL_DEBOUNCE_MS = 1000;
  emptyConversationSnapshot = conversationSnapshot([]);
});
//@ chunk-czq1j3j2.js:1716461-1716745 layout
/**
 * 为 inbox 中引用的未知工具名生成最小工具桩（名字、显示名、只能渲染无参数的调用），MCP 工具名带 "(MCP)" 后缀。
 */
function createUnknownToolStub(toolName) {
  let displayName = typeof toolName === "string" ? toolName : INVALID_TOOL_NAME_TEXT;
  let isMcp = displayName.startsWith("mcp__");
  return {
    name: displayName,
    userFacingName: () => (isMcp ? `${displayName} (MCP)` : displayName),
    renderToolUseMessage: (input) => {
      if (input !== null && typeof input === "object" && Object.keys(input).length > 0)
        throw Error("unknown-tool stub cannot render parameters");
      return displayName;
    },
    isMcp,
  };
}
//@ chunk-czq1j3j2.js:1716745-1732342 fingerprint (2.1.88 match: useInboxPoller, 0.504)
/**
 * 队友 inbox 轮询器：定期读取未读消息，区分队友消息、权限请求与回复、计划审批（只接受 team-lead）、关停请求，投递到会话或对应回调并标记已读。
 */
class useInboxPoller {
  #e;
  #t;
  #o = false;
  #n = 0;
  #r = null;
  #s = null;
  #l = 0;
  #i = false;
  #a;
  #c = new InboxVerdictCache();
  #d = new Set();
  #u = new Set();
  #p = new Map();
  #m = 0;
  #f = false;
  constructor(deps, props) {
    this.#e = deps;
    this.#t = props;
  }
  start() {
    if (this.#o) return;
    this.#o = true;
    this.#a = this.#e.store.getState().toolPermissionContext;
    this.#r = this.#e.store.subscribe(this.#S);
    this.#x();
    this.#h();
    this.#g();
  }
  stop() {
    if (!this.#o) return;
    this.#o = false;
    this.#n++;
    this.#r?.();
    this.#r = null;
    this.#b();
    this.#i = false;
  }
  setInputs(inputs) {
    let current = this.#t;
    this.#t = inputs;
    if (!this.#o) return;
    let next =
      inputs.enabled !== current.enabled ||
      inputs.isLoading !== current.isLoading ||
      inputs.visibleDialogKind !== current.visibleDialogKind ||
      inputs.onSubmitMessage !== current.onSubmitMessage;
    if (!next && inputs.requestDialog === current.requestDialog) return;
    if (next) this.#x();
    this.#h();
    this.#g();
  }
  #S = () => {
    let { toolPermissionContext } = this.#e.store.getState();
    if (toolPermissionContext !== this.#a) {
      this.#a = toolPermissionContext;
      this.#c.clear();
    }
    this.#h();
  };
  #h() {
    let canPoll = this.#t.enabled && !!getAgentNameToPoll(this.#e.identity, this.#e.store.getState());
    if (canPoll && this.#s === null) this.#y();
    else if (!canPoll && this.#s !== null) this.#b();
  }
  #y() {
    let generation = ++this.#l;
    let tick = () => {
      this.#s = this.#e.setTimeout(() => {
        if (generation !== this.#l) return;
        try {
          this.#v();
        } finally {
          if (generation === this.#l) tick();
        }
      }, INBOX_POLL_DEBOUNCE_MS);
    };
    tick();
  }
  #b() {
    this.#l++;
    this.#s?.();
    this.#s = null;
  }
  #g() {
    if (!this.#t.enabled) return;
    if (this.#i) return;
    if (getAgentNameToPoll(this.#e.identity, this.#e.store.getState())) {
      this.#i = true;
      this.#v();
    }
  }
  #v() {
    this.#T().catch((error) => logError(toError(error)));
  }
  #C() {
    return Object.values(this.#e.store.getState().teamContext?.teammates ?? {});
  }
  async #w(unreadMessages, requestedAt) {
    if (!((await unreadMessages()) || (await unreadMessages())))
      logForDebugging(requestedAt(), {
        level: "error",
      });
  }
  async #T() {
    let deps = this.#e;
    let { store, storageV5, credentials, terminal } = deps;
    let setState = store.setState;
    let { enabled, isLoading, visibleDialogKind, onSubmitMessage, requestDialog } = this.#t;
    if (!enabled) return;
    let snapshot = this.#n;
    let state = store.getState();
    let agentNameToPoll = getAgentNameToPoll(deps.identity, state);
    if (!agentNameToPoll) return;
    let unreadMessages = await deps.readUnreadMessages(
      agentNameToPoll,
      state.teamContext?.teamName,
      storageV5,
    );
    if (snapshot !== this.#n) return;
    if (unreadMessages.length === 0) {
      this.#f = false;
      return;
    }
    logForDebugging(`[InboxPoller] Found ${unreadMessages.length} unread message(s)`);
    let provenanceByText = dedupeMailboxMessages(
      unreadMessages,
      getInboxPath(agentNameToPoll, state.teamContext?.teamName),
      {
        roster: state.teamContext?.teammates,
        isPaneTeammate: deps.identity.kind === "teammate",
      },
    );
    let isForged = (key) => provenanceByText.get(key) === "forged";
    let seen = new Set();
    let dedupe = new Map();
    if (isTeammate() && isPlanModeRequired())
      for (let message of unreadMessages) {
        let approvalResponse = isPlanApprovalResponse(message.text);
        if (!approvalResponse) continue;
        if (message.from !== TEAM_LEAD || isForged(message)) {
          logForDebugging(
            `[InboxPoller] Ignoring plan approval response from non-team-lead: ${message.from}`,
          );
          continue;
        }
        if (store.getState().toolPermissionContext.mode !== "plan") {
          logForDebugging("[InboxPoller] Ignoring plan approval response while not in plan mode");
          continue;
        }
        let swarmPermissions = swarmHostState().swarmPermissions;
        let pendingPlanApproval = swarmPermissions.pendingPlanApproval;
        let verdict = planVerdictBinding(pendingPlanApproval, approvalResponse);
        if (verdict === "already_answered") {
          logForDebugging(
            `[InboxPoller] Ignoring plan approval response ${jsonStringify(approvalResponse.requestId)}: the pending request ${jsonStringify(pendingPlanApproval?.requestId)} was already answered`,
          );
          continue;
        }
        if (pendingPlanApproval)
          swarmPermissions.pendingPlanApproval = {
            ...pendingPlanApproval,
            answered: true,
          };
        if (verdict === "mismatch") {
          logForDebugging(
            `[InboxPoller] Plan approval response ${jsonStringify(approvalResponse.requestId)} does not name the pending plan request ${jsonStringify(pendingPlanApproval?.requestId)}; resolving the wait as a rejection`,
            {
              level: "warn",
            },
          );
          logFeatureSad("plan_approval", "request_binding_mismatch");
          dedupe.set(message, planVerdictMismatchRejection(approvalResponse));
          continue;
        }
        if (verdict === "unbound") logFeatureSad("plan_approval", "verdict_unbound");
        else logFeatureOk("plan_approval");
        dedupe.set(message, approvalResponse);
        logForDebugging(
          `[InboxPoller] Received plan approval response from team-lead: approved=${approvalResponse.approved}`,
        );
        if (!approvalResponse.approved) {
          logForDebugging(
            `[InboxPoller] Plan rejected by team lead: ${approvalResponse.feedback || "No feedback provided"}`,
          );
          continue;
        }
        let permissionMode = approvalResponse.permissionMode ?? "default";
        let modeResult = applyStartupPermissionMode(permissionMode, state.toolPermissionContext, setState);
        if (!modeResult.ok) {
          logForDebugging(
            `[InboxPoller] Refusing inherited mode ${permissionMode} from plan approval: ${modeResult.error}; exiting plan mode to default`,
            {
              level: "warn",
            },
          );
          applyStartupPermissionMode("default", state.toolPermissionContext, setState);
        }
        await syncTeammateMode(
          modeResult.ok ? modeResult.mode : "default",
          state.teamContext?.teamName,
          storageV5,
        );
        logForDebugging(
          `[InboxPoller] Plan approved by team lead, exited plan mode to ${modeResult.ok ? modeResult.mode : "default"}`,
        );
      }
    let generation = ++this.#m;
    let state_2;
    let nextState = () =>
      (state_2 ??= new Promise((resolve) => {
        this.#p.set(generation, resolve);
      }));
    let onTick = () => {
      deps
        .markMessagesAsRead(agentNameToPoll, state.teamContext?.teamName, unreadMessages, storageV5)
        .catch((error) => {
          logError(error);
          return false;
        })
        .then((value) => {
          if (!value) {
            logForDebugging(
              `[InboxPoller] Could not mark ${unreadMessages.length} inbox message(s) read; they stay unread and are retried next poll`,
              {
                level: "warn",
              },
            );
            if (!this.#f) {
              this.#f = true;
              logFeatureSad("swarm_inbox_poll", "mark_read_failed");
            }
            return;
          }
          this.#f = false;
          for (let [timestamp, counter] of this.#p)
            if (timestamp <= generation) {
              counter();
              this.#p.delete(timestamp);
            }
        });
    };
    let permissionRequests = [];
    let permissionResponses = [];
    let sandboxRequests = [];
    let sandboxResponses = [];
    let shutdownRequests = [];
    let shutdownApprovals = [];
    let modeSetRequests = [];
    let leftover = [];
    for (let message of unreadMessages) {
      if (this.#u.has(messageIdentityKey(message))) continue;
      if (isForged(message)) {
        leftover.push(message);
        continue;
      }
      let permissionRequest = isPermissionRequest(message.text);
      let permissionResponse = isPermissionResponse(message.text);
      let sandboxRequest = isSandboxPermissionRequest(message.text);
      let sandboxResponse = isSandboxPermissionResponse(message.text);
      let shutdownRequest = isShutdownRequest(message.text);
      let shutdownApproved = isShutdownApproved(message.text);
      let matchingApproval = shutdownApproved?.from === message.from ? shutdownApproved : null;
      let modeSetRequest = isModeSetRequest(message.text);
      let planApprovalRequest = isPlanApprovalRequest(message.text);
      if (permissionRequest) permissionRequests.push(message);
      else if (permissionResponse) permissionResponses.push(message);
      else if (sandboxRequest) sandboxRequests.push(message);
      else if (sandboxResponse) sandboxResponses.push(message);
      else if (shutdownRequest) shutdownRequests.push(message);
      else if (matchingApproval) shutdownApprovals.push(message);
      else if (isTeamPermissionUpdate(message.text))
        logForDebugging(
          "[InboxPoller] Dropping team_permission_update message: permission rules are never accepted from the inbox",
          {
            level: "warn",
          },
        );
      else if (modeSetRequest)
        logForDebugging(
          "[InboxPoller] Dropping mode_set_request message: permission mode changes are never accepted from the inbox",
          {
            level: "warn",
          },
        );
      else if (planApprovalRequest) modeSetRequests.push(message);
      else if (isStructuredProtocolMessage(message.text)) {
        let content = dedupe.get(message);
        if (content) {
          let resumeMessage = {
            ...message,
            text: planApprovalResumeText(content),
          };
          seen.add(resumeMessage);
          leftover.push(resumeMessage);
        } else
          logForDebugging(
            `[InboxPoller] Dropping unrouted protocol frame from ${jsonStringify(message.from)}: ${jsonStringify(message.text.substring(0, 80))}`,
            {
              level: "warn",
            },
          );
      } else leftover.push(message);
    }
    if (permissionRequests.length > 0 && isTeamLead(state.teamContext)) {
      logForDebugging(`[InboxPoller] Found ${permissionRequests.length} permission request(s)`);
      let teamName = state.teamContext?.teamName;
      let items;
      for (let message of permissionRequests) {
        let request_ = isPermissionRequest(message.text);
        if (!request_) continue;
        if (request_.agent_id !== message.from) {
          logForDebugging(
            `[InboxPoller] Dropping permission request ${jsonStringify(request_.request_id)}: agent_id ${jsonStringify(request_.agent_id)} does not match sender ${jsonStringify(message.from)}`,
            {
              level: "warn",
            },
          );
          continue;
        }
        let placeholderTool =
          findTool(getAllBaseTools(), request_.tool_name) ?? createUnknownToolStub(request_.tool_name);
        let toolName = typeof request_.tool_name === "string" ? request_.tool_name : placeholderTool.name;
        let hostKey = hostValidationCacheKey(
          "tool",
          message.from,
          request_.request_id,
          typeof request_.tool_use_id === "string" ? request_.tool_use_id : undefined,
        );
        if (this.#d.has(hostKey)) continue;
        this.#d.add(hostKey);
        let setState = nextState();
        let hostLabel = knownHostNameOrUndefined(request_.agent_id, message.from, this.#C());
        let dialog;
        let descriptor;
        try {
          dialog = stableHashOfJson(toolName, request_.input);
          descriptor = await buildForwardedPermissionDialog({
            tool: placeholderTool,
            input: request_.input,
            description: request_.description,
            toolUseID: request_.tool_use_id,
            permissionResult: {
              behavior: "ask",
              message: request_.description,
            },
            assistantMessage: createAssistantMessage({
              content: "",
            }),
            theme: "dark",
            requestSource: {
              type: "subagent",
              agentName: hostLabel,
            },
            toolPermissionContext: state.toolPermissionContext,
          });
        } catch (error) {
          logError(error);
          let digest =
            dialog === undefined
              ? undefined
              : {
                  tool_use_id: request_.tool_use_id,
                  tool_name: toolName,
                  input_digest: dialog,
                };
          let failureReason = digest === undefined ? "input could not be digested" : "dialog build failed";
          this.#w(
            () =>
              sendPermissionResponseViaMailbox(
                message.from,
                {
                  decision: "rejected",
                  resolvedBy: "leader",
                  approvedRequest: digest,
                },
                request_.request_id,
                teamName,
                storageV5,
                request_.tool_use_id,
              ),
            () =>
              `[InboxPoller] Rejection for permission request ${jsonStringify(request_.request_id)} (${failureReason}) could not be delivered to ${jsonStringify(message.from)} after a retry; the worker stays parked`,
          )
            .then(() => setState)
            .finally(() => this.#d.delete(hostKey))
            .catch(logError);
          continue;
        }
        let { dialog: dialog_2, descriptor: descriptor_2 } = descriptor;
        let countedAsk = new CountedAsk();
        let approvedRequest = {
          tool_use_id: request_.tool_use_id,
          tool_name: toolName,
          input_digest: dialog,
        };
        if (!items)
          items = {
            name: hostLabel,
            tool: request_.tool_name,
          };
        let answerPromise = requestDialog(dialog_2, descriptor_2, {
          place: "under",
          armInputGrace: true,
          ...(isNotAskUserQuestionCard(dialog_2.kind) && {
            countedAsk,
          }),
        });
        countedAsk.settleWhen(answerPromise);
        answerPromise.then((answer) => {
          let resolution;
          switch (answer.behavior) {
            case "allow":
              resolution = {
                decision: "approved",
                resolvedBy: "leader",
                updatedInput: answer.updatedInput,
                permissionUpdates: answer.permissionUpdates ? [...answer.permissionUpdates] : undefined,
                approvedRequest,
              };
              break;
            case "deny":
              resolution = {
                decision: "rejected",
                resolvedBy: "leader",
                feedback: answer.feedback,
                approvedRequest,
              };
              break;
            case "cancelled":
              resolution = {
                decision: "rejected",
                resolvedBy: "leader",
                approvedRequest,
              };
              break;
          }
          let settle = () =>
            sendPermissionResponseViaMailbox(
              message.from,
              resolution,
              request_.request_id,
              teamName,
              storageV5,
              request_.tool_use_id,
            );
          this.#w(
            settle,
            () =>
              `[InboxPoller] ${resolution.decision === "approved" ? "Approval" : "Rejection"} for permission request ${jsonStringify(request_.request_id)} could not be delivered to ${jsonStringify(message.from)} after a retry; the worker stays parked`,
          )
            .then(() => setState)
            .finally(() => this.#d.delete(hostKey))
            .catch(logError);
        });
      }
      if (items && !isLoading && !visibleDialogKind)
        notifyAsync(
          {
            message: `${describeApprovalSubject(items.name)} needs permission for ${typeof items.tool === "string" ? displayLabelOrUnnamedTool(items.tool) : "(unnamed tool)"}`,
            notificationType: "worker_permission_prompt",
          },
          terminal,
          {
            storageV5,
            credentials,
          },
        );
    }
    if (permissionResponses.length > 0 && isTeammate()) {
      logForDebugging(`[InboxPoller] Found ${permissionResponses.length} permission response(s)`);
      for (let message of permissionResponses) {
        let response = isPermissionResponse(message.text);
        if (!response) continue;
        if (message.from !== TEAM_LEAD) {
          logForDebugging(
            `[InboxPoller] Ignoring permission response from non-team-lead: ${jsonStringify(message.from)}`,
            {
              level: "warn",
            },
          );
          continue;
        }
        if (deps.hasPermissionCallback(response.request_id)) {
          logForDebugging(
            `[InboxPoller] Processing permission response for ${jsonStringify(response.request_id)}: ${jsonStringify(response.subtype)}`,
          );
          if (response.subtype === "success")
            deps.processMailboxPermissionResponse({
              requestId: response.request_id,
              decision: "approved",
              updatedInput: response.response?.updated_input,
              permissionUpdates: response.response?.permission_updates,
              toolUseId: response.tool_use_id,
              approvedRequest: response.approved_request,
            });
          else
            deps.processMailboxPermissionResponse({
              requestId: response.request_id,
              decision: "rejected",
              feedback: response.error,
              toolUseId: response.tool_use_id,
              approvedRequest: response.approved_request,
            });
        }
      }
    }
    if (sandboxRequests.length > 0 && isTeamLead(state.teamContext)) {
      logForDebugging(`[InboxPoller] Found ${sandboxRequests.length} sandbox permission request(s)`);
      let teamName = state.teamContext?.teamName;
      let props = this.#c;
      async function runSandboxRequests(host) {
        let toolPermissionContext = store.getState().toolPermissionContext;
        let modeBaseBehavior = getModeBaseBehavior(
          toolPermissionContext.mode,
          toolPermissionContext.isBypassPermissionsModeAvailable,
        );
        let mode = toolPermissionContext.mode;
        switch (modeBaseBehavior) {
          case "allow":
            return {
              resolved: true,
              mode,
            };
          case "deny":
            return {
              resolved: false,
              mode,
            };
          case "classify":
            if (isClassifierSideCallRetired("forwarded_sandbox_host"))
              return {
                resolved: false,
                mode,
              };
            if (isNetworkSandboxRestricted(mode))
              return {
                resolved: false,
                mode,
              };
            return {
              resolved: await props.getOrClassify(host, undefined, emptyConversationSnapshot, () =>
                classifySandboxNetworkHost(
                  host,
                  undefined,
                  [],
                  getAllBaseTools(),
                  toolPermissionContext,
                  new AbortController().signal,
                  {
                    isSubagentLoop: false,
                    storageV5,
                    credentials,
                  },
                ),
              ),
              mode,
            };
          case "ask":
            return {
              resolved: null,
              mode,
            };
        }
      }
      let cancelled = false;
      for (let message of sandboxRequests) {
        let request = isSandboxPermissionRequest(message.text);
        if (!request) continue;
        if (typeof request.hostPattern?.host !== "string" || !request.hostPattern.host) {
          logForDebugging(
            "[InboxPoller] Invalid sandbox permission request: missing or non-string hostPattern.host",
          );
          continue;
        }
        if (request.workerName !== message.from) {
          logForDebugging(
            `[InboxPoller] Dropping sandbox request ${jsonStringify(request.requestId)}: workerName ${jsonStringify(request.workerName)} does not match sender ${jsonStringify(message.from)}`,
            {
              level: "warn",
            },
          );
          continue;
        }
        if (typeof request.workerName !== "string" || !request.workerName) {
          logForDebugging(
            "[InboxPoller] Invalid sandbox permission request: missing or non-string workerName",
          );
          continue;
        }
        let hostKey = hostValidationCacheKey(
          "sandbox",
          message.from,
          request.requestId,
          request.hostPattern.host,
        );
        let invalidHost = describeInvalidHost(request.hostPattern.host);
        if (invalidHost !== null) {
          if (this.#d.has(hostKey)) continue;
          logForDebugging(
            `[InboxPoller] Denying sandbox request ${jsonStringify(request.requestId)}: ${invalidHost} (${toApprovalLabel(request.hostPattern.host) ?? "(unshowable)"})`,
            {
              level: "warn",
            },
          );
          this.#d.add(hostKey);
          let setState = nextState();
          let onAllow = () =>
            sendSandboxPermissionResponseViaMailbox(
              message.from,
              request.requestId,
              request.hostPattern.host,
              false,
              teamName,
              storageV5,
            );
          this.#w(
            onAllow,
            () =>
              `[InboxPoller] Deny for sandbox request ${jsonStringify(request.requestId)} (${invalidHost}) could not be delivered to ${jsonStringify(message.from)} after a retry; the worker stays parked`,
          )
            .then(() => setState)
            .finally(() => this.#d.delete(hostKey))
            .catch(logError);
          continue;
        }
        if (this.#d.has(hostKey)) continue;
        let { resolved, mode } = await runSandboxRequests(request.hostPattern.host);
        if (resolved !== null) {
          if (this.#d.has(hostKey)) continue;
          this.#d.add(hostKey);
          let setState = nextState();
          logForDebugging(
            `[InboxPoller] Auto-resolving sandbox request ${jsonStringify(request.requestId)} (mode=${mode}, allow=${resolved})`,
          );
          let onDeny = () =>
            sendSandboxPermissionResponseViaMailbox(
              message.from,
              request.requestId,
              request.hostPattern.host,
              resolved,
              teamName,
              storageV5,
            );
          this.#w(
            onDeny,
            () =>
              `[InboxPoller] Auto-resolved verdict for sandbox request ${jsonStringify(request.requestId)} (allow=${resolved}) could not be delivered to ${jsonStringify(message.from)} after a retry; the worker stays parked`,
          )
            .then(() => setState)
            .finally(() => this.#d.delete(hostKey))
            .catch(logError);
          continue;
        }
        let host = request.hostPattern.host;
        if (this.#d.has(hostKey)) continue;
        this.#d.add(hostKey);
        let setState_2 = nextState();
        let workerLabel = knownHostNameOrUndefined(request.workerName, message.from, this.#C());
        askSandboxNetworkFromWorker(
          {
            host,
            workerName: workerLabel,
            requestId: request.requestId,
          },
          {
            requestDialog,
            sendResponse: (allow) =>
              sendSandboxPermissionResponseViaMailbox(
                message.from,
                request.requestId,
                host,
                allow,
                store.getState().teamContext?.teamName,
                storageV5,
              ),
            applyPermissionUpdate: (update) =>
              setState((prev) => ({
                ...prev,
                toolPermissionContext: applyValidatedPermissionUpdate(prev.toolPermissionContext, update),
              })),
          },
        )
          .then(() => setState_2)
          .finally(() => this.#d.delete(hostKey))
          .catch(logError);
        if (!cancelled && !isLoading && !visibleDialogKind) {
          cancelled = true;
          let hostText = bunStringWidth(host) <= SHORT_LABEL_WIDTH ? labelOr(host, "a host") : "a host";
          notifyAsync(
            {
              message: `${describeApprovalSubject(workerLabel)} needs network access to ${hostText}`,
              notificationType: "worker_permission_prompt",
            },
            terminal,
            {
              storageV5,
              credentials,
            },
          );
        }
      }
    }
    if (sandboxResponses.length > 0 && isTeammate()) {
      logForDebugging(`[InboxPoller] Found ${sandboxResponses.length} sandbox permission response(s)`);
      for (let message of sandboxResponses) {
        let response = isSandboxPermissionResponse(message.text);
        if (!response) continue;
        if (message.from !== TEAM_LEAD) {
          logForDebugging(
            `[InboxPoller] Ignoring sandbox permission response from non-team-lead: ${jsonStringify(message.from)}`,
            {
              level: "warn",
            },
          );
          continue;
        }
        if (deps.hasSandboxPermissionCallback(response.requestId)) {
          logForDebugging(
            `[InboxPoller] Processing sandbox permission response for ${jsonStringify(response.requestId)}: allow=${jsonStringify(response.allow)}`,
          );
          if (
            deps.processSandboxPermissionResponse({
              requestId: response.requestId,
              host: response.host,
              allow: response.allow,
            })
          )
            setState((prev) => ({
              ...prev,
              pendingSandboxRequest: null,
            }));
        }
      }
    }
    if (modeSetRequests.length > 0 && isTeamLead(state.teamContext)) {
      logForDebugging(`[InboxPoller] Found ${modeSetRequests.length} plan approval request(s)`);
      let teamName = state.teamContext?.teamName;
      for (let message of modeSetRequests) {
        let request = isPlanApprovalRequest(message.text);
        if (!request) continue;
        if (!isTeammateAwaitingPlan(message.from, store.getState().tasks)) {
          leftover.push(message);
          continue;
        }
        let state = store.getState();
        let permissionMode = teammateModeAfterPlan({
          recipientName: message.from,
          leaderMode: state.toolPermissionContext.mode,
          leaderAutoPickedByLevel: hasLeftProactivityBaseline(state.toolPermissionContext),
          proactivityLevel: state.proactivityLevel,
          tasks: state.tasks,
        });
        let label = {
          type: "plan_approval_response",
          requestId: request.requestId,
          approved: true,
          timestamp: new Date().toISOString(),
          permissionMode,
        };
        if (
          (await deps.writeToMailbox(
            message.from,
            {
              from: TEAM_LEAD,
              text: jsonStringify(label),
              timestamp: new Date().toISOString(),
            },
            teamName,
            storageV5,
          )) === undefined
        ) {
          logForDebugging(
            `[InboxPoller] FAILED to write plan approval response to ${jsonStringify(message.from)} (request ${jsonStringify(request.requestId)}) \u2014 the teammate is still awaiting approval`,
            {
              level: "error",
            },
          );
          leftover.push(message);
          continue;
        }
        logForDebugging(
          `[InboxPoller] Auto-approved plan from ${jsonStringify(message.from)} (request ${jsonStringify(request.requestId)})`,
        );
        leftover.push(message);
      }
    }
    if (shutdownRequests.length > 0 && isTeammate()) {
      logForDebugging(`[InboxPoller] Found ${shutdownRequests.length} shutdown request(s)`);
      for (let message of shutdownRequests) leftover.push(message);
    }
    if (shutdownApprovals.length > 0 && isTeamLead(state.teamContext)) {
      logForDebugging(`[InboxPoller] Found ${shutdownApprovals.length} shutdown approval(s)`);
      for (let message of shutdownApprovals) {
        let approval = isShutdownApproved(message.text);
        if (!approval) continue;
        if (await resolveTeamName(approval.from, message, state, storageV5)) {
          leftover.push(message);
          continue;
        }
        let tmuxPaneId = Object.values(state.teamContext?.teammates ?? {}).find(
          (backend) => backend.name === approval.from,
        )?.tmuxPaneId;
        if (approval.paneId && approval.backendType && approval.paneId === tmuxPaneId)
          (async () => {
            try {
              await ensureBackendsRegistered();
              let insideTmux = await isInsideTmux();
              let killResult = await getBackendByType(approval.backendType)?.killPane(
                approval.paneId,
                !insideTmux,
              );
              logForDebugging(
                `[InboxPoller] Killed pane ${jsonStringify(approval.paneId)} for ${jsonStringify(approval.from)}: ${killResult}`,
              );
            } catch (error) {
              logForDebugging(
                `[InboxPoller] Failed to kill pane for ${jsonStringify(approval.from)}: ${error}`,
              );
            }
          })();
        await killTeammate(approval.from, state, setState, storageV5);
        leftover.push(message);
      }
    }
    let mapped = leftover.map((message) => messageIdentityKey(message));
    for (let key of mapped) this.#u.add(key);
    let markSeen = () => {
      for (let key of mapped) this.#u.delete(key);
    };
    nextState().then(markSeen);
    let passedThrough;
    try {
      passedThrough = await filterMailboxThroughReceiveHooks(leftover, {
        provenanceOf: (key) => provenanceByText.get(key) ?? "unverifiable",
        agentId: undefined,
        isPassedThrough: (key) => !isForged(key) && (seen.has(key) || isStructuredProtocolMessage(key.text)),
      });
    } catch (error) {
      markSeen();
      throw error;
    }
    if (snapshot !== this.#n) {
      markSeen();
      return;
    }
    if (passedThrough.length === 0) {
      onTick();
      return;
    }
    let text = formatTeammateMessages(passedThrough, {
      recipientIsLead: isTeamLead(state.teamContext),
    });
    let cleanup = () => {
      setState((prev) => ({
        ...prev,
        inbox: {
          messages: [
            ...prev.inbox.messages,
            ...passedThrough.map((m) => ({
              id: randomUUID(),
              from: m.from,
              text: m.text,
              timestamp: m.timestamp,
              status: "pending",
              color: m.color,
              summary: m.summary,
              ...(m.provenance === "forged" && {
                provenance: m.provenance,
              }),
            })),
          ],
        },
      }));
    };
    if (!isLoading && !visibleDialogKind) {
      logForDebugging("[InboxPoller] Session idle, submitting immediately");
      if (!onSubmitMessage(text)) {
        logForDebugging("[InboxPoller] Submission rejected, queuing for later delivery");
        cleanup();
      }
    } else {
      logForDebugging("[InboxPoller] Session busy, queuing for later delivery");
      cleanup();
    }
    onTick();
  }
  #x() {
    let { store } = this.#e;
    let setAppState = store.setState;
    let { enabled, isLoading, visibleDialogKind, onSubmitMessage } = this.#t;
    if (!enabled) return;
    if (isLoading || visibleDialogKind) return;
    let currentAppState = store.getState();
    if (!getAgentNameToPoll(this.#e.identity, currentAppState)) return;
    let pendingMessages = currentAppState.inbox.messages.filter((m) => m.status === "pending");
    let processedMessages = currentAppState.inbox.messages.filter((m) => m.status === "processed");
    if (processedMessages.length > 0) {
      logForDebugging(
        `[InboxPoller] Cleaning up ${processedMessages.length} processed message(s) that were delivered mid-turn`,
      );
      let processedIds = new Set(processedMessages.map((m) => m.id));
      setAppState((prev) => ({
        ...prev,
        inbox: {
          messages: prev.inbox.messages.filter((m) => !processedIds.has(m.id)),
        },
      }));
    }
    if (pendingMessages.length === 0) return;
    logForDebugging(`[InboxPoller] Session idle, delivering ${pendingMessages.length} pending message(s)`);
    let text = formatTeammateMessages(pendingMessages, {
      recipientIsLead: isTeamLead(currentAppState.teamContext),
    });
    if (onSubmitMessage(text)) {
      let submittedIds = new Set(pendingMessages.map((m) => m.id));
      setAppState((prev) => ({
        ...prev,
        inbox: {
          messages: prev.inbox.messages.filter((m) => !submittedIds.has(m.id)),
        },
      }));
    } else logForDebugging("[InboxPoller] Submission rejected, keeping messages queued");
  }
}
//@ chunk-czq1j3j2.js:1734384-1735082 placement
/**
 * React hook：创建队友 inbox 轮询器（读未读消息、标记已读、写邮箱、处理权限/沙箱回复），挂载时启动、卸载时停止，并把 enabled/isLoading/对话框/提交回调等输入同步给它。
 */
function useInboxPollerHook(props) {
  let { enabled, isLoading, visibleDialogKind, onSubmitMessage } = props;
  let { requestDialog } = props;
  let store = useAppStoreDirect();
  let terminal = useTerminalNotification();
  let clock = useClock();
  let { storageV5, credentials } = useTheme_2();
  let [initial] = useState(
    () =>
      new useInboxPoller(
        {
          identity: getSenderKind(),
          store,
          terminal,
          storageV5,
          credentials,
          setTimeout: (fn, ms) => clock.setTimeout(fn, ms),
          readUnreadMessages: (...args) => readUnreadMessages(...args),
          markMessagesAsRead: (...args) => markMessagesAsRead(...args),
          writeToMailbox: (...args) => writeToMailbox(...args),
          hasPermissionCallback: hasPendingSwarmPermission,
          processMailboxPermissionResponse,
          hasSandboxPermissionCallback: hasPendingSandboxPermission,
          processSandboxPermissionResponse,
        },
        props,
      ),
  );
  useEffect(() => {
    initial.start();
    return () => initial.stop();
  }, [initial]);
  useEffect(() => {
    initial.setInputs({
      enabled,
      isLoading,
      visibleDialogKind,
      onSubmitMessage,
      requestDialog,
    });
  }, [initial, enabled, isLoading, visibleDialogKind, onSubmitMessage, requestDialog]);
}
export { useInboxPollerHook };
