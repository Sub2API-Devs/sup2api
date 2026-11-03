/**
 * utils/swarm/inProcessRunner.ts
 *
 * 同进程 teammate 的运行循环：权限经 leader 中继、轮询 mailbox 等下一条指令或 shutdown、领取任务列表任务、空闲/失败通知、上下文压缩
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/inProcessRunner.ts
 * pieces: chunk-8xs34hez.js (10)
 * attribution: affinity 1, fingerprint 5, layout 2, sole-consumer 1, facade-exports 1
 */
import {
  hasPermissionsToUseToolWithSink,
  withoutGrantsForRemoteScope,
  stripWholeToolGrantsForAsk,
  makeClassifierApprovalsSetter,
} from "../permissions/permissions.js";
import { applyPermissionAnswerChanges } from "../permissions/permissionAnswer.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { forwardHostWordedAsk, isHostWordedAsk } from "../../services/tools/hostWordedAsks.js";
import {
  SUBAGENT_REJECT_MESSAGE,
  SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX,
  createUserMessage,
  API_REQUEST_ABORTED_MESSAGE,
  createApiErrorMessage,
  getTrailingApiErrorInfo,
} from "../messages.js";
import { getToolPermissionContext } from "../permissions/toolPermissionContext.js";
import { mWn, yht, R0s } from "./teammateIdleResult.js";
import { createPermissionContext } from "../../hooks/toolPermission/PermissionContext.js";
import { applyPermissionUpdates, persistPermissionUpdates } from "../permissions/PermissionUpdate.js";
import { handleCoordinatorPermission } from "../../hooks/toolPermission/handlers/coordinatorHandler.js";
import { repromptFilePermission } from "../../components/permissions/hooks.js";
import { createPermissionRequest, sendPermissionRequestViaMailbox } from "./permissionSync.js";
import {
  registerPermissionCallback,
  processMailboxPermissionResponse,
  unregisterPermissionCallback,
} from "../../hooks/useSwarmPermissionPoller.js";
import { BVt } from "../stableHash.js";
import { normalizePermissionUpdate } from "../permissions/permissionRulePayload.js";
import { logError } from "../log.js";
import {
  readMailbox,
  getInboxPath,
  isPermissionResponse,
  markSingleMessageAsRead,
  writeToMailbox,
  createIdleNotification,
  logIdleResultDeliveryOutcome,
  messageIdentityKey,
  isShutdownRequest,
  isStructuredProtocolMessage,
  markMessagesAsRead,
  isPlanApprovalResponse,
  planApprovalResumeText,
  isModeSetRequest,
  MARK_READ_FAILURE_CAP,
  formatTeammateMessage,
  UNKNOWN_SENDER,
  withShutdownReplyInstructions,
  sanitizeReceivedStructuredFrame,
  formatTeammateMessages,
} from "../teammateMailbox.js";
import { dedupeMailboxMessages, findTeammateByName } from "./teammateMessageRepair.js";
import { TEAM_LEAD } from "./constants.js";
import { logForDebugging } from "../debug.js";
import { jsonStringify } from "../slowOperations.js";
import { listTasks, claimTask, updateTask } from "../tasks.js";
import { findAvailableTask, formatTaskAsPrompt } from "../../hooks/useTaskListWatcher.js";
import { filterMailboxThroughReceiveHooks } from "./teammateMailbox.js";
import { count, uniq } from "../collections.js";
import { applyPlanApprovalResponse } from "./planApprovalResponse.js";
import { sleep } from "../sleep.js";
import { hasRunningBackgroundWorkForAgent } from "../../tasks/backgroundTaskKinds.js";
import { hasOtherActiveAgents, AP, ZEt } from "../task/framework.js";
import { tH } from "../../plugins/functionHooks/inputHold.js";
import { createAgentStatusEmitter } from "../processUserInput/processSlashCommand.js";
import { getAgentDepth } from "../agentContext.js";
import { getSystemPrompt } from "../../constants/prompts.js";
import { SYSTEM_PROMPT_DYNAMIC_BOUNDARY } from "../../entrypoints/sdk/coreSchemas.js";
import { TEAMMATE_SYSTEM_PROMPT_ADDENDUM } from "./teammatePromptAddendum.js";
import { readAgentMemoryScope } from "../../tools/AgentTool/agentMemory.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
import { TASK_CREATE_TOOL_NAME } from "../../tools/TaskCreateTool/constants.js";
import { TASK_GET_TOOL_NAME } from "../../tools/TaskGetTool/constants.js";
import { TASK_LIST_TOOL_NAME } from "../../tools/TaskListTool/constants.js";
import { TASK_UPDATE_TOOL_NAME } from "../../tools/TaskUpdateTool/constants.js";
import { permissionRuleValueFromString } from "../permissions/permissionRuleParser.js";
import { appendTeammateTranscript } from "./_new/appendTeammateTranscript.js";
import { removeMemberByAgentId } from "./teamHelpers.js";
import { AVr, appendBounded, appendReplacingUuid } from "../../tasks/taskKinds.js";
import { createContentReplacementState } from "../toolResultStorage.js";
import { createStickyBetaLatches } from "../../bootstrap/stateSlices.js";
import { createSignal } from "../signal.js";
import { createAbortController } from "../abortController.js";
import { Tp, getAutoCompactThresholdTokens } from "../../services/compact/autoCompact.js";
import { bytesPerTokenForModel } from "../model/modelDisplay.js";
import { isEnvTruthy } from "../envUtils.js";
import { getModelContextInfo } from "../model/modelContextInfo.js";
import { kLr, runAgent } from "../../tools/AgentTool/runAgent.js";
import { Mr } from "../agentId.js";
import { cloneFileStateCache } from "../fileStateCache.js";
import { efe } from "../../memdir/findRelevantMemories.js";
import {
  compactConversation,
  buildPostCompactMessages,
  COMPACTION_BLOCKED_BY_HOOK,
  applyPreservedMessages,
} from "../../services/compact/compact.js";
import { asSystemPrompt } from "../systemPromptType.js";
import {
  createProgressTracker,
  createActivityDescriptionResolver,
  applyStreamTokenEvent,
  getProgressUpdate,
  updateProgressFromMessage,
} from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { runWithTeammateContext } from "../teammate.js";
import { runWithCwdOverride } from "../cwd.js";
import { isLoggableMessage } from "../sessionStorage.js";
import { inProgressToolUpdate } from "../../state/inProgressToolUses.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { evictTaskOutput } from "../task/diskOutput.js";
import { emitTaskNotification } from "../task/taskNotifications.js";
import { xqe } from "../telemetry/perfettoTracing.js";

//@ chunk-8xs34hez.js:1900-1918 affinity
var PERMISSION_POLL_INTERVAL_MS = 500,
  MAILBOX_POLL_INTERVAL_MS = 500;
/**
 * 为同进程 teammate 生成 canUseTool：先本地判定；需询问时，有 UI 对话通道就走协调者权限处理并弹本地对话框；
 * 否则构造权限请求经 mailbox 发给 leader，并每 500ms 轮询自己的 inbox 等 permission_response（只接受 team-lead 发的）。
 */
//@ chunk-8xs34hez.js:1918-5490 fingerprint = createInProcessCanUseTool (0.512)
function createInProcessCanUseTool(identity, abortController, onPermissionWait, permissionSetter, getRoster) {
  return async (tool, input, toolUseContext, assistantMessage, toolUseID, forceDecision) => {
    let decision =
      forceDecision ??
      (await hasPermissionsToUseToolWithSink(
        tool,
        input,
        { ...toolUseContext, asksNoHost: !0 },
        assistantMessage,
        toolUseID,
        applyPermissionAnswerChanges,
        void 0,
        permissionSetter,
      ));
    if (decision.behavior !== "ask") return decision;
    if (decision.hostDisplay !== void 0)
      return (
        logFeatureBad("permission_host_worded_ask", "teammate_lane"),
        forwardHostWordedAsk(tool.name, "a teammate's permission request", {
          hostWorded: !0,
          remedy:
            "Ask the team lead to run this tool call itself. When the team lead runs it, the permission prompt shows the full disclosure.",
        })
      );
    let effectiveInput = decision.updatedInput ?? input;
    if (abortController.signal.aborted) return { behavior: "ask", message: SUBAGENT_REJECT_MESSAGE };
    let permissionContext = getToolPermissionContext(toolUseContext),
      reportPermissionWait = () =>
        tool.description(effectiveInput, {
          isNonInteractiveSession: toolUseContext.options.isNonInteractiveSession,
          toolPermissionContext: permissionContext,
          tools: toolUseContext.options.tools,
        });
    if (toolUseContext.requestDialog !== void 0) {
      let permissionContextSetter = mWn.of(toolUseContext.session).permissionContextSetter,
        w = createPermissionContext(
          tool,
          input,
          toolUseContext,
          assistantMessage,
          toolUseID,
          permissionSetter,
          (queue) => {
            permissionContextSetter?.((item) =>
              applyPermissionUpdates(
                item,
                queue.filter((queue) => queue.type !== "setMode"),
              ),
            );
          },
        ),
        T = await handleCoordinatorPermission({
          ctx: w,
          updatedInput: decision.updatedInput,
          suggestions: decision.suggestions,
          permissionMode: permissionContext.mode,
          askSuppressesAlwaysAllowRule: decision.suppressAlwaysAllowRule === !0,
          askIsPersonOnly: decision.personOnly === !0,
        });
      if (T) return T;
      if (abortController.signal.aborted) return { behavior: "ask", message: SUBAGENT_REJECT_MESSAGE };
      let R = await reportPermissionWait();
      if (abortController.signal.aborted) return { behavior: "ask", message: SUBAGENT_REJECT_MESSAGE };
      let now = Date.now();
      try {
        return await new Promise((B, j) => {
          repromptFilePermission(
            { ctx: w, description: R, result: decision, awaitAutomatedChecksBeforeDialog: !0 },
            B,
          ).catch(j);
        });
      } finally {
        onPermissionWait(Date.now() - now);
      }
    }
    if (isHostWordedAsk(decision) || decision.forcedByCaller === !0)
      return forwardHostWordedAsk(tool.name, "the teammate mailbox (a static-description wire)", {
        hostWorded: decision.hostDisplay !== void 0,
        forMcpSkill: decision.metadata?.mcpSkill !== void 0,
      });
    let C = await reportPermissionWait();
    if (abortController.signal.aborted) return { behavior: "ask", message: SUBAGENT_REJECT_MESSAGE };
    return new Promise((queue) => {
      let request = createPermissionRequest({
        toolName: tool.name,
        toolUseId: toolUseID,
        input: effectiveInput,
        description: C,
        permissionSuggestions: decision.suggestions,
        workerId: identity.agentId,
        workerName: identity.agentName,
        workerColor: identity.color,
        teamName: identity.teamName,
      });
      (registerPermissionCallback({
        requestId: request.id,
        toolUseId: toolUseID,
        toolName: request.toolName,
        inputDigest: BVt(request.toolName, effectiveInput),
        onAllow(d, B, j, W) {
          cleanup();
          let z = normalizePermissionUpdate(B, void 0, getToolPermissionContext(toolUseContext)),
            ee =
              tool.suppressesAllPermissionUpdates?.(effectiveInput) === !0
                ? withoutGrantsForRemoteScope(z)
                : tool.suppressesAlwaysAllowRule?.(effectiveInput) === !0 ||
                    decision.suppressAlwaysAllowRule === !0
                  ? stripWholeToolGrantsForAsk(z, tool, getToolPermissionContext(toolUseContext))
                  : z;
          persistPermissionUpdates(ee, toolUseContext.storageV5).catch(logError);
          let se = d && Object.keys(d).length > 0 ? d : effectiveInput;
          queue({
            behavior: "allow",
            updatedInput: se,
            userModified: !1,
            ...(W && W.length > 0 && { contentBlocks: W }),
          });
        },
        onReject(d, B) {
          cleanup();
          let j = d ? `${SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX}${d}` : SUBAGENT_REJECT_MESSAGE;
          queue({ behavior: "ask", message: j, contentBlocks: B });
        },
        onRefuse(d) {
          (cleanup(), queue({ behavior: "ask", message: d }));
        },
        onUnboundVerdict() {},
      }),
        sendPermissionRequestViaMailbox(request, toolUseContext.storageV5).then((d) => {
          if (!d)
            (cleanup(),
              queue({
                behavior: "ask",
                message:
                  "The permission request could not be delivered to the team lead (mailbox write failed). Retry the tool call.",
              }));
        }));
      let w = setInterval(
          async (d, B, j, W, z, ee, se) => {
            if (d.signal.aborted) {
              (B(), j({ behavior: "ask", message: SUBAGENT_REJECT_MESSAGE }));
              return;
            }
            let ie = await readMailbox(W.agentName, W.teamName, ee),
              fe = dedupeMailboxMessages(
                ie.filter((K) => K && !K.read),
                getInboxPath(W.agentName, W.teamName),
                { roster: se(), isPaneTeammate: !1 },
              );
            for (let K of ie)
              if (K && !K.read && fe.get(K) !== "forged") {
                let parsed = isPermissionResponse(K.text);
                if (parsed && parsed.request_id === z.id) {
                  if ((await markSingleMessageAsRead(W.agentName, W.teamName, K, ee), K.from !== TEAM_LEAD)) {
                    logForDebugging(
                      `[InProcessRunner] Ignoring permission response from non-team-lead: ${K.from}`,
                      { level: "warn" },
                    );
                    continue;
                  }
                  if (parsed.subtype === "success")
                    processMailboxPermissionResponse({
                      requestId: parsed.request_id,
                      toolUseId: parsed.tool_use_id,
                      approvedRequest: parsed.approved_request,
                      decision: "approved",
                      updatedInput: parsed.response?.updated_input,
                      permissionUpdates: parsed.response?.permission_updates,
                    });
                  else
                    processMailboxPermissionResponse({
                      requestId: parsed.request_id,
                      toolUseId: parsed.tool_use_id,
                      approvedRequest: parsed.approved_request,
                      decision: "rejected",
                      feedback: parsed.error,
                    });
                  return;
                }
              }
          },
          PERMISSION_POLL_INTERVAL_MS,
          abortController,
          cleanup,
          queue,
          identity,
          request,
          toolUseContext.storageV5,
          getRoster,
        ),
        onAbortListener = () => {
          (cleanup(), queue({ behavior: "ask", message: SUBAGENT_REJECT_MESSAGE }));
        };
      abortController.signal.addEventListener("abort", onAbortListener, { once: !0 });
      function cleanup() {
        (clearInterval(w),
          unregisterPermissionCallback(request.id),
          abortController.signal.removeEventListener("abort", onAbortListener));
      }
    });
  };
}
//@ chunk-8xs34hez.js:5490-5563 layout = _temp6 (0.826)
function G(s, e, n) {
  n.update(s, (A) => (A.type === "in_process_teammate" ? e(A) : A));
}
/**
 * 以 teammate 身份给 team-lead 的 inbox 写一条消息。
 */
//@ chunk-8xs34hez.js:5563-5669 fingerprint = sendMessageToLeader (1)
async function sendMessageToLeader(fromName, text, color, teamName, storage) {
  return writeToMailbox(
    TEAM_LEAD,
    { from: fromName, text: text, timestamp: new Date().toISOString(), color: color },
    teamName,
    storage,
  );
}
//@ chunk-8xs34hez.js:5669-5789 sole-consumer
async function sendIdleNotificationToLeader(s, e, n, A, i) {
  let I = createIdleNotification(s, A),
    p;
  try {
    p = await sendMessageToLeader(s, jsonStringify(I), e, n, i);
  } finally {
    logIdleResultDeliveryOutcome(I, A?.result, p);
  }
  return p !== void 0;
}
/**
 * 从团队任务列表找一个可领取的任务，领取并置 in_progress，返回格式化后的任务提示词。
 */
//@ chunk-8xs34hez.js:6128-6522 fingerprint = tryClaimNextTask (1)
async function tryClaimNextTask(taskListId, agentName, hasTaskListTools, storage) {
  if (!hasTaskListTools) return;
  try {
    let i = await listTasks(taskListId, storage),
      availableTask = findAvailableTask(i);
    if (!availableTask) return;
    let p = await claimTask(taskListId, availableTask.id, agentName, void 0, storage);
    if (!p.success) {
      logForDebugging(`[inProcessRunner] Failed to claim task #${availableTask.id}: ${p.reason}`);
      return;
    }
    return (
      await updateTask(taskListId, availableTask.id, { status: "in_progress" }, storage),
      logForDebugging(`[inProcessRunner] Claimed task #${availableTask.id}: ${availableTask.subject}`),
      formatTaskAsPrompt(availableTask)
    );
  } catch (err) {
    logForDebugging(`[inProcessRunner] Error checking task list: ${err}`);
    return;
  }
}
/**
 * 读一次 teammate 的 inbox：伪造来源的消息过滤；优先处理 shutdown 请求（之前先投递被压住的普通消息）；
 * 处理协议帧（leader 的 plan_approval_response 生效、mode_set_request 一律丢弃、其余丢弃）；普通消息标已读后批量返回，标记失败时有限次重试后不标记直接投递。
 */
//@ chunk-8xs34hez.js:6522-10170 layout
async function pollTeammateInbox(identity, taskId, taskRegistry, storage, pollState, roster) {
  let messages;
  try {
    ((messages = await readMailbox(identity.agentName, identity.teamName, storage, {
      throwOnUnknownReadError: !0,
    })),
      (pollState.readFailures = 0));
  } catch (error) {
    return (
      pollState.readFailures++,
      logForDebugging(
        `[inProcessRunner] ${identity.agentName} could not read mailbox (${pollState.readFailures} consecutive): ${error}`,
        { level: "warn" },
      ),
      null
    );
  }
  let provenance = dedupeMailboxMessages(
      messages.filter((o) => o && !o.read),
      getInboxPath(identity.agentName, identity.teamName),
      { roster: roster, isPaneTeammate: !1 },
    ),
    isForged = (o) => provenance.get(o) === "forged",
    D = new Set(messages.filter((o) => o && !o.read).map(messageIdentityKey));
  for (let o of pollState.consumedUnmarked) if (!D.has(o)) pollState.consumedUnmarked.delete(o);
  let V = async (o) => {
      let u = await filterMailboxThroughReceiveHooks(o, {
          provenanceOf: (T) => provenance.get(T) ?? "unverifiable",
          agentId: identity.resumableAgentId ?? identity.agentId,
        }),
        w = new Set(u.map(messageIdentityKey));
      for (let T of o) {
        let R = messageIdentityKey(T);
        if (!w.has(R)) pollState.consumedUnmarked.add(R);
      }
      return u;
    },
    shutdownIndex = -1,
    shutdownRequest = null;
  for (let o = 0; o < messages.length; o++) {
    let u = messages[o];
    if (u && !u.read && !isForged(u)) {
      let w = isShutdownRequest(u.text),
        R =
          (provenance.get(u) === "verified" ||
            u.from === TEAM_LEAD ||
            findTeammateByName(u.from, roster) !== void 0) &&
          w?.from === u.from
            ? w
            : null;
      if (R) {
        ((shutdownIndex = o), (shutdownRequest = R));
        break;
      }
    }
  }
  if (shutdownIndex !== -1) {
    if (pollState.count > 0) {
      let filtered = messages.filter(
        (T, R) =>
          !T.read &&
          R !== shutdownIndex &&
          (isForged(T) || !isStructuredProtocolMessage(T.text)) &&
          !pollState.deliveredUnmarked.has(messageIdentityKey(T)) &&
          !pollState.consumedUnmarked.has(messageIdentityKey(T)),
      );
      if (filtered.length > 0) {
        for (let d of filtered) pollState.deliveredUnmarked.add(messageIdentityKey(d));
        let T = await markMessagesAsRead(identity.agentName, identity.teamName, filtered, storage);
        if (T) ((pollState.count = 0), (pollState.reported = !1), pollState.deliveredUnmarked.clear());
        else if (!pollState.reported)
          ((pollState.reported = !0), logFeatureSad("swarm_inbox_poll", "worker_mark_read_failed_streak"));
        logForDebugging(
          `[inProcessRunner] ${identity.agentName} delivering ${filtered.length} held message(s) ahead of a shutdown_request${T ? "" : " (mark still not landed)"}`,
          { level: T ? "debug" : "warn" },
        );
        let R = await V(filtered);
        if (R.length > 0) return { type: "new_messages", messages: R };
      }
    }
    let o = messages[shutdownIndex],
      u = count(messages.slice(0, shutdownIndex), (w) => !w.read);
    return (
      logForDebugging(
        `[inProcessRunner] ${identity.agentName} received shutdown request from ${shutdownRequest?.from} (prioritized over ${u} unread messages)`,
      ),
      await markSingleMessageAsRead(identity.agentName, identity.teamName, o, storage),
      { type: "shutdown_request", request: shutdownRequest, originalMessage: o.text, entryFrom: o.from }
    );
  }
  let protocolFrames = [],
    plainMessages = [];
  for (let o of messages) {
    if (!o || o.read) continue;
    if (!isForged(o) && isStructuredProtocolMessage(o.text)) protocolFrames.push(o);
    else if (!pollState.consumedUnmarked.has(messageIdentityKey(o))) plainMessages.push(o);
  }
  let planApprovalMessage = null;
  if (protocolFrames.length > 0) {
    for (let u of protocolFrames) {
      let w = isPlanApprovalResponse(u.text);
      if (w && u.from === TEAM_LEAD) {
        let T = applyPlanApprovalResponse(taskId, w, taskRegistry, storage);
        if (T)
          (logForDebugging(
            `[inProcessRunner] ${identity.agentName} applied lead plan_approval_response: approved=${T.approved}`,
          ),
            (planApprovalMessage = planApprovalResumeText(T)));
        else
          logForDebugging(
            `[inProcessRunner] ${identity.agentName} ignoring stale plan_approval_response (not awaiting approval)`,
          );
        continue;
      }
      if (isModeSetRequest(u.text)) {
        logForDebugging(
          `[inProcessRunner] ${identity.agentName} dropping mode_set_request message: permission mode changes are never accepted from the inbox`,
          { level: "warn" },
        );
        continue;
      }
      logForDebugging(
        `[inProcessRunner] ${identity.agentName} dropping protocol frame from ${u.from}: ${u.text.substring(0, 80)}`,
        { level: "warn" },
      );
    }
    if (!(await markMessagesAsRead(identity.agentName, identity.teamName, protocolFrames, storage)))
      logForDebugging(
        `[inProcessRunner] ${identity.agentName} could not mark ${protocolFrames.length} protocol frame(s) read; retrying next poll`,
        { level: "warn" },
      );
  }
  if (planApprovalMessage) return { type: "new_message", message: planApprovalMessage, from: TEAM_LEAD };
  if (plainMessages.length > 0) {
    if (await markMessagesAsRead(identity.agentName, identity.teamName, plainMessages, storage))
      ((pollState.count = 0), (pollState.reported = !1), pollState.deliveredUnmarked.clear());
    else {
      let w = ++pollState.count;
      if (w < MARK_READ_FAILURE_CAP)
        return (
          logForDebugging(
            `[inProcessRunner] ${identity.agentName} could not mark ${plainMessages.length} message(s) read (${w}/${MARK_READ_FAILURE_CAP}); delivery retried next poll`,
            { level: "warn" },
          ),
          null
        );
      if (
        (logForDebugging(
          `[inProcessRunner] ${identity.agentName} could not mark ${plainMessages.length} message(s) read for ${w} poll(s); delivering the batch unmarked`,
          { level: "warn" },
        ),
        !pollState.reported)
      )
        ((pollState.reported = !0), logFeatureSad("swarm_inbox_poll", "worker_mark_read_failed_streak"));
      for (let T of plainMessages) pollState.deliveredUnmarked.add(messageIdentityKey(T));
    }
    logForDebugging(
      `[inProcessRunner] ${identity.agentName} draining ${plainMessages.length} message(s) from ${uniq(plainMessages.map((w) => w.from)).join(", ")}`,
    );
    let u = await V(plainMessages);
    if (u.length === 0) return null;
    return { type: "new_messages", messages: u };
  }
  if (pollState.count > 0)
    ((pollState.count = 0), (pollState.reported = !1), pollState.deliveredUnmarked.clear());
  return null;
}
/**
 * 空闲后的等待循环（每 500ms）：优先取 UI 注入的用户消息；检查 abort；读 inbox；尝试领取任务；开启空闲超时时超过阈值返回 idle_timeout。
 */
//@ chunk-8xs34hez.js:10170-12164 fingerprint = waitForNextPromptOrShutdown (0.676)
async function waitForNextPromptOrShutdown(
  identity,
  abortController,
  taskId,
  getAppState,
  taskRegistry,
  taskListId,
  standalone,
  hasTaskListTools,
  pollState,
  holdEviction = !1,
  storage,
) {
  logForDebugging(
    `[inProcessRunner] ${identity.agentName} starting poll loop (abort=${abortController.signal.aborted})`,
  );
  let idleSince = Date.now(),
    q = !1,
    pollCount = 0;
  while (!abortController.signal.aborted) {
    if (pollCount > 0) await sleep(MAILBOX_POLL_INTERVAL_MS);
    pollCount++;
    let appState = getAppState(),
      C = appState.tasks[taskId];
    if (C && C.type === "in_process_teammate" && C.pendingUserMessages.length > 0) {
      let T = C.pendingUserMessages[0];
      return (
        G(
          taskId,
          (prev) => ({ ...prev, pendingUserMessages: prev.pendingUserMessages.slice(1) }),
          taskRegistry,
        ),
        logForDebugging(
          `[inProcessRunner] ${identity.agentName} found pending user message (poll #${pollCount})`,
        ),
        { type: "new_message", message: T.text, origin: T.origin, from: "user" }
      );
    }
    let o =
        identity.resumableAgentId !== void 0 &&
        hasRunningBackgroundWorkForAgent(identity.resumableAgentId, taskRegistry),
      u =
        holdEviction ||
        (C?.type === "in_process_teammate" && C.awaitingPlanApproval) ||
        appState.viewingAgentTaskId === taskId ||
        hasOtherActiveAgents(appState.tasks, taskId) ||
        o;
    if (u) idleSince = Date.now();
    if (holdEviction && C?.type === "in_process_teammate" && C.evictAfter !== void 0)
      G(taskId, (T) => ({ ...T, evictAfter: void 0 }), taskRegistry);
    if (
      C?.type === "in_process_teammate" &&
      C.evictAfter !== void 0 &&
      ((o && C.evictAfter <= Date.now() + MAILBOX_POLL_INTERVAL_MS) || (q && !o))
    )
      G(taskId, (T) => ({ ...T, evictAfter: Date.now() + AP }), taskRegistry);
    if (((q = o), abortController.signal.aborted))
      return (
        logForDebugging(`[inProcessRunner] ${identity.agentName} aborted while waiting (poll #${pollCount})`),
        { type: "aborted" }
      );
    if (standalone) {
      if (tH()) {
        if (!u && Date.now() - idleSince >= ZEt)
          return (
            logForDebugging(
              `[inProcessRunner] ${identity.agentName} idle timeout after ${ZEt}ms (poll #${pollCount})`,
            ),
            { type: "idle_timeout" }
          );
      }
      continue;
    }
    logForDebugging(`[inProcessRunner] ${identity.agentName} poll #${pollCount}: checking mailbox`);
    try {
      let T = await pollTeammateInbox(
        identity,
        taskId,
        taskRegistry,
        storage,
        pollState,
        getAppState().teamContext?.teammates,
      );
      if (T) return T;
      if (pollState.count > 0 && pollState.readFailures < MARK_READ_FAILURE_CAP) {
        idleSince = Date.now();
        let R = getAppState().tasks[taskId];
        if (R?.type === "in_process_teammate" && R.evictAfter !== void 0)
          G(taskId, (d) => ({ ...d, evictAfter: Date.now() + AP }), taskRegistry);
        continue;
      }
    } catch (err) {
      logForDebugging(`[inProcessRunner] ${identity.agentName} poll error: ${err}`);
    }
    let w = await tryClaimNextTask(taskListId, identity.agentName, hasTaskListTools, storage);
    if (w) return { type: "new_message", message: w, from: "task-list" };
    if (tH()) {
      if (!u && Date.now() - idleSince >= ZEt)
        return (
          logForDebugging(
            `[inProcessRunner] ${identity.agentName} idle timeout after ${ZEt}ms (poll #${pollCount})`,
          ),
          { type: "idle_timeout" }
        );
    }
  }
  return (
    logForDebugging(
      `[inProcessRunner] ${identity.agentName} exiting poll loop (abort=${abortController.signal.aborted}, polls=${pollCount})`,
    ),
    { type: "aborted" }
  );
}
/**
 * 同进程 teammate 主循环：构造 teammate 代理上下文与系统提示词（默认工具提示 + 自定义代理指令，可 replace/append），强制包含 SendMessage 与任务列表工具；
 * 每轮在 teammate 上下文中 runAgent，必要时先自动压缩历史；回合结束读 inbox 决定继续，否则标空闲并给 leader 发 idle_notification，再进入等待循环；结束或异常时标 completed/failed 并通知。
 */
//@ chunk-8xs34hez.js:12164-23605 fingerprint = runInProcessTeammate (0.651)
async function runInProcessTeammate(config) {
  let {
      identity: identity,
      taskId: taskId,
      prompt: prompt,
      description: description,
      spawnedAgentType: spawnedAgentType,
      agentDefinition: agentDefinition,
      teammateContext: teammateContext,
      toolUseContext: toolUseContext,
      abortController: abortController,
      model: model,
      systemPrompt: systemPrompt,
      systemPromptMode: systemPromptMode,
      allowedTools: allowedTools,
      allowPermissionPrompts: allowPermissionPrompts,
      invokingRequestId: invokingRequestId,
      standalone: standalone = !1,
      resumeMessages: resumeMessages,
      resumeReplacementState: resumeReplacementState,
      initialFrom: initialFrom,
    } = config,
    { setAppState: setAppState, taskRegistry: taskRegistry } = toolUseContext,
    retryStatus = createAgentStatusEmitter(taskId),
    pollState = {
      count: 0,
      reported: !1,
      deliveredUnmarked: new Set(),
      consumedUnmarked: new Set(),
      readFailures: 0,
    };
  logForDebugging(`[inProcessRunner] Starting agent loop for ${identity.agentId}`);
  let agentContext = {
      agentId: identity.agentId,
      parentAgentId: toolUseContext.agentId,
      depth: getAgentDepth(toolUseContext.agentContext),
      parentSessionId: identity.parentSessionId,
      agentName: identity.agentName,
      teamName: identity.teamName,
      agentColor: identity.color,
      planModeRequired: identity.planModeRequired,
      isTeamLead: !1,
      agentType: "teammate",
      invokingRequestId: invokingRequestId,
      invocationKind: "spawn",
      invocationEmitted: !1,
      isBackgroundAgent: !0,
    },
    { tools: tools, mainLoopModel: mainLoopModel } = toolUseContext.rootToolSurface,
    systemPrompt_2;
  if (systemPromptMode === "replace" && systemPrompt) systemPrompt_2 = systemPrompt;
  else {
    let Q = [
      ...(await getSystemPrompt(tools, mainLoopModel, { teammate: !0 })).filter(
        (Y) => Y !== SYSTEM_PROMPT_DYNAMIC_BOUNDARY,
      ),
      TEAMMATE_SYSTEM_PROMPT_ADDENDUM,
    ];
    if (agentDefinition) {
      let systemPrompt = agentDefinition.getSystemPrompt({
        toolUseContext: toolUseContext,
        primedAgentMemory: await readAgentMemoryScope(agentDefinition, toolUseContext.storageV5),
      });
      if (systemPrompt)
        Q.push(`
# Custom Agent Instructions
${systemPrompt}`);
      if (agentDefinition.memory)
        logEvent("tengu_agent_memory_loaded", {
          ...!1,
          scope: fromEnum(agentDefinition.memory),
          source: lit("in-process-teammate"),
        });
    }
    if (systemPromptMode === "append" && systemPrompt) Q.push(systemPrompt);
    systemPrompt_2 = Q.join(`
`);
  }
  let hasTaskListTools = teammateContext.hasTaskListTools,
    requiredTools = [
      SENDMESSAGE,
      ...(hasTaskListTools
        ? [TASK_CREATE_TOOL_NAME, TASK_GET_TOOL_NAME, TASK_LIST_TOOL_NAME, TASK_UPDATE_TOOL_NAME]
        : []),
    ],
    disallowedTools = agentDefinition?.disallowedTools?.filter(
      (h) => !requiredTools.includes(permissionRuleValueFromString(h).toolName),
    ),
    agentDefinitionForRun = {
      agentType: identity.agentName,
      whenToUse: `In-process teammate: ${identity.agentName}`,
      getSystemPrompt: () => systemPrompt_2,
      tools: agentDefinition?.tools ? uniq([...agentDefinition.tools, ...requiredTools]) : ["*"],
      ...(disallowedTools?.length && { disallowedTools: disallowedTools }),
      source: "projectSettings",
      permissionMode: "default",
      ...(agentDefinition?.model && { model: agentDefinition.model }),
      ...(agentDefinition?.effort !== void 0 && { effort: agentDefinition.effort }),
      ...(agentDefinition?.omitClaudeMd && { omitClaudeMd: !0 }),
      ...(agentDefinition?.autoCompactWindow !== void 0 && {
        autoCompactWindow: agentDefinition.autoCompactWindow,
      }),
    },
    history = resumeMessages ? [...resumeMessages] : [],
    recordedUuids = new Set(resumeMessages?.map((h) => h.uuid)),
    transcriptMetadata = {
      taskKind: "in_process_teammate",
      teamName: identity.teamName,
      color: identity.color,
      planModeRequired: identity.planModeRequired,
      ...(agentDefinition && { customAgentType: agentDefinition.agentType }),
      ...(spawnedAgentType !== void 0 && { spawnedAgentType: spawnedAgentType }),
      ...(model && { model: model }),
    },
    initialPrompt = formatTeammateMessage({
      from: initialFrom ?? TEAM_LEAD,
      text: prompt,
      summary: description,
    }),
    nextPrompt = initialPrompt,
    nextOrigin = void 0,
    shouldExit = !1,
    holdEviction = !1,
    hasProducedOutput = (resumeMessages?.length ?? 0) > 0,
    compactBlocked = !1,
    lastDeliveredResult = resumeMessages ? yht(resumeMessages).result : void 0,
    workInterrupted = !1,
    handleWaitResult = async (h) => {
      switch (((holdEviction = !1), h.type)) {
        case "shutdown_request":
          (logForDebugging(
            `[inProcessRunner] ${identity.agentId} received shutdown request - passing to model`,
          ),
            (nextPrompt = formatTeammateMessage({
              from: typeof h.entryFrom === "string" && h.entryFrom !== "" ? h.entryFrom : UNKNOWN_SENDER,
              text: withShutdownReplyInstructions(
                sanitizeReceivedStructuredFrame(h.originalMessage, h.entryFrom) ?? h.originalMessage,
                h.entryFrom,
              ),
            })),
            (nextOrigin = void 0),
            appendTeammateTranscript(taskId, createUserMessage({ content: nextPrompt }), taskRegistry));
          break;
        case "new_message":
          if (
            (logForDebugging(`[inProcessRunner] ${identity.agentId} received new message from ${h.from}`),
            h.from === "user")
          )
            ((nextPrompt = h.message), (nextOrigin = h.origin));
          else
            ((nextPrompt = formatTeammateMessage({
              from: h.from,
              text: h.message,
              color: h.color,
              summary: h.summary,
            })),
              (nextOrigin = void 0),
              appendTeammateTranscript(taskId, createUserMessage({ content: nextPrompt }), taskRegistry));
          break;
        case "new_messages":
          (logForDebugging(
            `[inProcessRunner] ${identity.agentId} received ${h.messages.length} drained message(s)`,
          ),
            (nextPrompt = formatTeammateMessages(h.messages, { recipientIsLead: !1 })),
            (nextOrigin = void 0),
            appendTeammateTranscript(taskId, createUserMessage({ content: nextPrompt }), taskRegistry));
          break;
        case "aborted":
          (logForDebugging(`[inProcessRunner] ${identity.agentId} aborted while waiting`), (shouldExit = !0));
          break;
        case "idle_timeout":
          if (
            (logForDebugging(`[inProcessRunner] ${identity.agentId} idle timeout \u2014 exiting loop`),
            !standalone)
          )
            (toolUseContext.agentLifecycle.setTeammate(identity.agentId, void 0),
              await removeMemberByAgentId(
                identity.teamName,
                identity.agentId,
                { onlyIfJoinedBefore: Date.now() },
                toolUseContext.storageV5,
              ));
          shouldExit = !0;
          break;
      }
    };
  if (!standalone)
    await tryClaimNextTask(
      identity.parentSessionId,
      identity.agentName,
      hasTaskListTools,
      toolUseContext.storageV5,
    );
  try {
    taskRegistry.updateTranscript(taskId, (task) => {
      let messages = task.messages;
      if (resumeMessages) for (let ve of resumeMessages.slice(-AVr)) messages = appendBounded(messages, ve);
      return { ...task, messages: appendBounded(messages, createUserMessage({ content: initialPrompt })) };
    });
    let h = toolUseContext.contentReplacementState
        ? (resumeReplacementState ?? createContentReplacementState())
        : void 0,
      currentWorkAbortController = createStickyBetaLatches(),
      Y = createSignal();
    while (!abortController.signal.aborted && !shouldExit) {
      logForDebugging(
        `[inProcessRunner] ${identity.agentId} processing prompt: ${nextPrompt.substring(0, 50)}...`,
      );
      let M = createAbortController();
      (M.signal.addEventListener("abort", () => {
        workInterrupted = !0;
      }),
        G(taskId, (task) => ({ ...task, currentWorkAbortController: M, retryWake: Y }), taskRegistry));
      let userMessage = createUserMessage({ content: nextPrompt, origin: nextOrigin }),
        promptMessages = [userMessage],
        ce = history,
        $e = Tp(history, bytesPerTokenForModel(mainLoopModel));
      if (
        !isEnvTruthy(process.env.DISABLE_COMPACT) &&
        $e >
          getAutoCompactThresholdTokens(
            getModelContextInfo(mainLoopModel),
            kLr(toolUseContext.options.autoCompactWindow, agentDefinitionForRun.autoCompactWindow),
          )
      ) {
        logForDebugging(`[inProcessRunner] ${identity.agentId} compacting history (${$e} tokens)`);
        let r = {
          ...toolUseContext,
          abortController: abortController,
          agentId: identity.resumableAgentId ?? Mr(identity.agentId),
          readFileState: cloneFileStateCache(toolUseContext.readFileState, { stripSeededFromContext: !0 }),
          memorySelector: efe(),
          onCompactEvent: void 0,
          onRetryStatus: retryStatus.setRetryStatus,
          compactTranscriptUnavailable: !0,
        };
        try {
          let v = await compactConversation(
            history,
            r,
            {
              systemPrompt: asSystemPrompt([]),
              userContext: {},
              systemContext: {},
              toolUseContext: r,
              forkContextMessages: history,
              advisorModel: r.getAppState().advisorModel,
            },
            !0,
            { isAutoCompact: !0 },
          );
          if (((ce = buildPostCompactMessages(v)), h)) h = createContentReplacementState();
          ((history.length = 0),
            history.push(...ce),
            recordedUuids.clear(),
            taskRegistry.updateTranscript(taskId, (task) => ({ ...task, messages: [...ce, userMessage] })));
        } catch (error) {
          if (error instanceof Error && error.message.startsWith(COMPACTION_BLOCKED_BY_HOOK))
            (logForDebugging(
              `[inProcessRunner] ${identity.agentId} compaction blocked by PreCompact hook; continuing uncompacted`,
            ),
              (compactBlocked = !0));
          else if (
            abortController.signal.aborted ||
            (error instanceof Error && error.message === API_REQUEST_ABORTED_MESSAGE)
          ) {
            (logForDebugging(`[inProcessRunner] ${identity.agentId} aborted during compaction`),
              (shouldExit = !0));
            break;
          } else throw error;
        }
      }
      let je = ce.length > 0 ? [...ce] : void 0;
      (history.push(userMessage), (lastDeliveredResult = void 0), (workInterrupted = M.signal.aborted));
      let tracker = createProgressTracker(),
        we = taskRegistry.get(taskId);
      if (we !== void 0 && "progress" in we && we.progress !== void 0)
        tracker.latestInputTokens = we.progress.tokenCount;
      let resolveActivity = createActivityDescriptionResolver(tools),
        ge = [],
        Ae = toolUseContext.getAppState().tasks[taskId],
        xe = Ae && Ae.type === "in_process_teammate" ? Ae.permissionMode : "default",
        iterationAgentDefinition = { ...agentDefinitionForRun, permissionMode: xe },
        Ue = !1,
        ne = null;
      if (
        (await runWithTeammateContext(teammateContext, async () =>
          runWithCwdOverride(agentContext, async () => {
            (G(
              taskId,
              (r) => ({
                ...r,
                status: "running",
                isIdle: !1,
                idleNotificationOwedToLead: void 0,
                evictAfter: void 0,
                evictAfterHeldBySibling: void 0,
              }),
              taskRegistry,
            ),
              taskRegistry.updateTranscript(taskId, (task) => ({ ...task, turnStartTime: Date.now() })),
              retryStatus.setMode("responding"));
            for await (let message of runAgent({
              agentDefinition: iterationAgentDefinition,
              promptMessages: promptMessages,
              turnPrompt: nextPrompt,
              toolUseContext: toolUseContext,
              canUseTool: createInProcessCanUseTool(
                identity,
                M,
                (waitMs) => {
                  G(
                    taskId,
                    (task) => ({ ...task, totalPausedMs: (task.totalPausedMs ?? 0) + waitMs }),
                    taskRegistry,
                  );
                },
                makeClassifierApprovalsSetter(setAppState),
                () => toolUseContext.getAppState().teamContext?.teammates,
              ),
              isAsync: !0,
              canShowPermissionPrompts: allowPermissionPrompts ?? !0,
              forkContextMessages: je,
              querySource: "agent:custom",
              override: {
                abortController: M,
                agentContext: agentContext,
                onRetryStatus: retryStatus.setRetryStatus,
                subscribeRetryWake: Y.subscribe,
                ...(identity.resumableAgentId && { agentId: identity.resumableAgentId }),
              },
              ...(identity.resumableAgentId && {
                recordedUuids: recordedUuids,
                name: identity.agentName,
                description: description,
                extraMetadata: { ...transcriptMetadata, permissionMode: xe },
              }),
              onStreamTokenEstimate: (v) => {
                applyStreamTokenEvent(tracker, v);
                let progress = getProgressUpdate(tracker);
                G(
                  taskId,
                  (task) =>
                    task.progress?.tokenCount === progress.tokenCount
                      ? task
                      : { ...task, progress: progress },
                  taskRegistry,
                );
              },
              model: model,
              preserveToolUseResults: !0,
              availableTools: tools,
              allowedTools: allowedTools,
              contentReplacementState: h,
              stickyBetas: currentWorkAbortController,
              isTeammate: !0,
              teammateContext: teammateContext,
            })) {
              if (abortController.signal.aborted) {
                logForDebugging(`[inProcessRunner] ${identity.agentId} lifecycle aborted`);
                break;
              }
              if (M.signal.aborted) {
                if (
                  (logForDebugging(
                    `[inProcessRunner] ${identity.agentId} current work aborted (Escape pressed)`,
                  ),
                  message.type === "assistant" ||
                    message.type === "user" ||
                    (message.type === "attachment" && isLoggableMessage(message)))
                )
                  (ge.push(message),
                    history.push(message),
                    (ne = applyPreservedMessages(history, message, ne)));
                Ue = !0;
                break;
              }
              if (message.type === "spinner_mode") {
                retryStatus.setMode(message.mode);
                continue;
              }
              if (message.type === "api_metrics") continue;
              if (message.type === "query_model_change") continue;
              if (message.type === "set_in_progress_tool_use_ids") {
                if (message.op.action !== "remove") continue;
                let ids = message.op.ids;
                taskRegistry.updateTranscript(taskId, (U) => {
                  let te = new Set(U.inProgressToolUseIDs),
                    oe = !1;
                  for (let be of ids) if (te.delete(be)) oe = !0;
                  return oe ? { ...U, inProgressToolUseIDs: te } : U;
                });
                continue;
              }
              if (message.type === "system" && message.subtype === "api_error") continue;
              (ge.push(message),
                history.push(message),
                (ne = applyPreservedMessages(history, message, ne)),
                updateProgressFromMessage(tracker, message, resolveActivity, tools));
              let v = getProgressUpdate(tracker);
              (G(taskId, (k) => ({ ...k, progress: v }), taskRegistry),
                taskRegistry.updateTranscript(taskId, (k) => {
                  let inProgressToolUseIDs = k.inProgressToolUseIDs;
                  if (message.type === "assistant") {
                    for (let block of message.message.content)
                      if (block.type === "tool_use")
                        inProgressToolUseIDs = new Set([...inProgressToolUseIDs, block.id]);
                  } else if (message.type === "user") {
                    let content = message.message.content;
                    if (Array.isArray(content)) {
                      for (let block of content)
                        if (typeof block === "object" && "type" in block && block.type === "tool_result") {
                          let be = new Set(inProgressToolUseIDs);
                          (be.delete(block.tool_use_id), (inProgressToolUseIDs = be));
                        }
                    }
                  }
                  return {
                    ...k,
                    messages: appendReplacingUuid(k.messages, message),
                    ...inProgressToolUpdate(k.inProgressToolUseIDs, inProgressToolUseIDs),
                  };
                }));
            }
            return { success: !0, messages: ge };
          }),
        ).finally(() => {
          if (ne) (history.push(...ne.preserved), (ne = null));
        }),
        G(taskId, (task) => ({ ...task, currentWorkAbortController: void 0 }), taskRegistry),
        abortController.signal.aborted)
      )
        break;
      let le = Ue || M.signal.aborted;
      if (le) {
        ((workInterrupted = !0),
          logForDebugging(`[inProcessRunner] ${identity.agentId} work interrupted, returning to idle`));
        let interruptMessage = createApiErrorMessage({ content: API_REQUEST_ABORTED_MESSAGE });
        taskRegistry.updateTranscript(taskId, (task) => ({
          ...task,
          messages: appendBounded(task.messages, interruptMessage),
        }));
      }
      hasProducedOutput ||= ge.some(
        (r) => (r.type === "assistant" && !r.isApiErrorMessage) || (r.type === "user" && !r.isMeta),
      );
      let re = !le ? getTrailingApiErrorInfo(ge) : void 0;
      if (((holdEviction = re?.isTransient === !0 && !standalone && hasProducedOutput), !standalone && !le)) {
        let r = null;
        try {
          r = await pollTeammateInbox(
            identity,
            taskId,
            taskRegistry,
            toolUseContext.storageV5,
            pollState,
            toolUseContext.getAppState().teamContext?.teammates,
          );
          while (
            r === null &&
            pollState.count > 0 &&
            pollState.readFailures < MARK_READ_FAILURE_CAP &&
            !abortController.signal.aborted
          )
            (await sleep(MAILBOX_POLL_INTERVAL_MS),
              (r = await pollTeammateInbox(
                identity,
                taskId,
                taskRegistry,
                toolUseContext.storageV5,
                pollState,
                toolUseContext.getAppState().teamContext?.teammates,
              )));
        } catch (error) {
          logForDebugging(`[inProcessRunner] ${identity.agentName} turn-end mailbox check failed: ${error}`);
        }
        if (r) {
          try {
            let { result: v, summary: summary } = yht(history, { emitTelemetry: !0 });
            if (v !== void 0 || re !== void 0) {
              if (
                (await sendIdleNotificationToLeader(
                  identity.agentName,
                  identity.color,
                  identity.teamName,
                  {
                    idleReason: re !== void 0 ? "failed" : void 0,
                    summary: summary,
                    failureReason: re?.reason,
                    result: v,
                    senderReachable: !0,
                  },
                  toolUseContext.storageV5,
                )) &&
                v !== void 0
              )
                lastDeliveredResult = v;
            }
          } catch (error) {
            logForDebugging(
              `[inProcessRunner] ${identity.agentName} turn-end result delivery failed: ${error}`,
            );
          }
          await handleWaitResult(r);
          continue;
        }
      }
      if (re?.isTransient)
        logEvent("tengu_teammate_transient_turn_failure", {
          error_kind: fromEnum(re.errorKind ?? "unknown"),
          hold_evict: holdEviction,
        });
      let qe = toolUseContext.getAppState().tasks[taskId],
        We = !(qe?.type === "in_process_teammate" && qe.isIdle) && !standalone;
      G(
        taskId,
        (task) => (
          task.onIdleCallbacks?.forEach((cb) => cb()),
          {
            ...task,
            isIdle: !0,
            idleNotificationOwedToLead:
              (We && getIsNonInteractiveSession()) || task.idleNotificationOwedToLead,
            evictAfter: holdEviction ? void 0 : Date.now() + AP,
            onIdleCallbacks: [],
          }
        ),
        taskRegistry,
      );
      let he = re?.reason;
      if (We) {
        let r = yht(history, { emitTelemetry: !le }),
          v = le ? void 0 : r.result,
          k = await sendIdleNotificationToLeader(
            identity.agentName,
            identity.color,
            identity.teamName,
            {
              idleReason: le ? "interrupted" : he !== void 0 ? "failed" : "available",
              summary: r.summary,
              failureReason: he,
              result: v,
              senderReachable: he === void 0 || holdEviction,
            },
            toolUseContext.storageV5,
          );
        if (v !== void 0 && k) lastDeliveredResult = v;
        if (!k)
          G(
            taskId,
            (U) => (U.idleNotificationOwedToLead ? { ...U, idleNotificationOwedToLead: void 0 } : U),
            taskRegistry,
          );
      } else
        logForDebugging(`[inProcessRunner] Skipping duplicate idle notification for ${identity.agentName}`);
      logForDebugging(`[inProcessRunner] ${identity.agentId} finished prompt, waiting for next`);
      let Ve = await waitForNextPromptOrShutdown(
        identity,
        abortController,
        taskId,
        toolUseContext.getAppState,
        taskRegistry,
        identity.parentSessionId,
        standalone,
        hasTaskListTools,
        pollState,
        holdEviction,
        toolUseContext.storageV5,
      );
      await handleWaitResult(Ve);
    }
    let de = !1,
      x;
    if (
      (G(
        taskId,
        (task) => {
          if (task.status !== "running") return ((de = !0), task);
          return (
            (x = task.toolUseId),
            task.onIdleCallbacks?.forEach((cb) => cb()),
            {
              ...task,
              status: "completed",
              notified: !0,
              endTime: Date.now(),
              pendingUserMessages: [],
              abortController: void 0,
              currentWorkAbortController: void 0,
              retryWake: void 0,
              onIdleCallbacks: [],
            }
          );
        },
        taskRegistry,
      ),
      !de)
    )
      taskRegistry.updateTranscript(taskId, (M) => ({
        ...M,
        messages: M.messages.length ? [M.messages.at(-1)] : [],
        inProgressToolUseIDs: new Set(),
      }));
    if ((evictTaskOutput(taskId), taskRegistry.evictTerminal(taskId), !de))
      emitTaskNotification(taskId, "completed", { toolUseId: x, summary: identity.agentId });
    if ((xqe(identity.agentId), compactBlocked))
      logFeatureSad("swarm_in_process_run", "compact_blocked_by_hook");
    else logFeatureOk("swarm_in_process_run");
    return { success: !0, messages: history };
  } catch (error) {
    let Q = error instanceof Error ? error.message : "Unknown error";
    logForDebugging(`[inProcessRunner] Agent ${identity.agentId} failed: ${Q}`);
    let Y = !1,
      de;
    if (
      (G(
        taskId,
        (task) => {
          if (task.status !== "running") return ((Y = !0), task);
          return (
            (de = task.toolUseId),
            task.onIdleCallbacks?.forEach((cb) => cb()),
            {
              ...task,
              status: "failed",
              notified: !0,
              error: Q,
              isIdle: !0,
              endTime: Date.now(),
              onIdleCallbacks: [],
              pendingUserMessages: [],
              abortController: void 0,
              currentWorkAbortController: void 0,
              retryWake: void 0,
            }
          );
        },
        taskRegistry,
      ),
      !Y)
    )
      taskRegistry.updateTranscript(taskId, (x) => ({
        ...x,
        messages: x.messages.length ? [x.messages.at(-1)] : [],
        inProgressToolUseIDs: new Set(),
      }));
    if ((evictTaskOutput(taskId), taskRegistry.evictTerminal(taskId), !Y))
      emitTaskNotification(taskId, "failed", { toolUseId: de, summary: identity.agentId });
    if (!standalone) {
      let x;
      try {
        x = workInterrupted ? void 0 : R0s(history);
      } catch (error) {
        logForDebugging(`[inProcessRunner] ${identity.agentName} failed to extract partial result: ${error}`);
      }
      if (x !== void 0 && x === lastDeliveredResult) x = void 0;
      await sendIdleNotificationToLeader(
        identity.agentName,
        identity.color,
        identity.teamName,
        { idleReason: "failed", completedStatus: "failed", failureReason: Q, result: x },
        toolUseContext.storageV5,
      );
    }
    return (
      xqe(identity.agentId),
      logFeatureBad("swarm_in_process_run", "agent_loop_failed"),
      { success: !1, error: Q, messages: history }
    );
  }
}
/**
 * 后台启动 runInProcessTeammate，未捕获异常只记日志。
 */
//@ chunk-8xs34hez.js:23605-23719 facade-exports = startInProcessTeammate (1)
function startInProcessTeammate(config) {
  let agentId = config.identity.agentId;
  runInProcessTeammate(config).catch((error) => {
    logForDebugging(`[inProcessRunner] Unhandled error in ${agentId}: ${error}`);
  });
}

export { startInProcessTeammate };
