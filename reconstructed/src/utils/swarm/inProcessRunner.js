/**
 * utils/swarm/inProcessRunner.ts
 *
 * 同进程 teammate 的运行循环：权限经 leader 中继、轮询 mailbox 等下一条指令或 shutdown、领取任务列表任务、空闲/失败通知、上下文压缩
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/inProcessRunner.ts
 * pieces: chunk-8xs34hez.js (10), chunk-phrnybk8.js (1)
 * attribution: affinity 1, fingerprint 5, layout 2, sole-consumer 1, facade-exports 1, placement 1
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
import {
  teammatePermissionContextBySessionRoot,
  safeTeammateIdleResult,
  teammateIdleResultText,
} from "./teammateIdleResult.js";
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
import { stableHashOfJson } from "../stableHash.js";
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
import { hasOtherActiveAgents, MCP_TASK_KEEPALIVE_MS, TASK_EVICTION_GRACE_MS } from "../task/framework.js";
import { isZincHarborOn } from "../../plugins/functionHooks/inputHold.js";
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
import { removeMemberByAgentId } from "./teamHelpers.js";
import { MAX_APPENDED_ENTRIES, appendBounded, appendReplacingUuid } from "../../tasks/taskKinds.js";
import { createContentReplacementState } from "../toolResultStorage.js";
import { createStickyBetaLatches } from "../../bootstrap/stateSlices.js";
import { createSignal } from "../signal.js";
import { createAbortController } from "../abortController.js";
import {
  estimateTokensWithAnchor,
  getAutoCompactThresholdTokens,
} from "../../services/compact/autoCompact.js";
import { bytesPerTokenForModel } from "../model/modelDisplay.js";
import { isEnvTruthy } from "../envUtils.js";
import { getModelContextInfo } from "../model/modelContextInfo.js";
import { withAutoCompactCeiling, runAgent } from "../../tools/AgentTool/runAgent.js";
import { identityAgentId2 } from "../agentId.js";
import { cloneFileStateCache } from "../fileStateCache.js";
import { emptyPickerState } from "../../memdir/findRelevantMemories.js";
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
import { unregisterPerfettoAgent } from "../telemetry/perfettoTracing.js";

//@ chunk-8xs34hez.js:1900-1918 affinity
var PERMISSION_POLL_INTERVAL_MS = 500;
var MAILBOX_POLL_INTERVAL_MS = 500;
//@ chunk-8xs34hez.js:1918-5490 fingerprint = createInProcessCanUseTool (0.512)
/**
 * 为同进程 teammate 生成 canUseTool：先本地判定；需询问时，有 UI 对话通道就走协调者权限处理并弹本地对话框；
 * 否则构造权限请求经 mailbox 发给 leader，并每 500ms 轮询自己的 inbox 等 permission_response（只接受 team-lead 发的）。
 */
function createInProcessCanUseTool(identity, abortController, onPermissionWait, permissionSetter, getRoster) {
  return async (tool, input, toolUseContext, assistantMessage, toolUseID, forceDecision) => {
    let decision =
      forceDecision ??
      (await hasPermissionsToUseToolWithSink(
        tool,
        input,
        {
          ...toolUseContext,
          asksNoHost: true,
        },
        assistantMessage,
        toolUseID,
        applyPermissionAnswerChanges,
        undefined,
        permissionSetter,
      ));
    if (decision.behavior !== "ask") return decision;
    if (decision.hostDisplay !== undefined) {
      logFeatureBad("permission_host_worded_ask", "teammate_lane");
      return forwardHostWordedAsk(tool.name, "a teammate's permission request", {
        hostWorded: true,
        remedy:
          "Ask the team lead to run this tool call itself. When the team lead runs it, the permission prompt shows the full disclosure.",
      });
    }
    let effectiveInput = decision.updatedInput ?? input;
    if (abortController.signal.aborted)
      return {
        behavior: "ask",
        message: SUBAGENT_REJECT_MESSAGE,
      };
    let permissionContext = getToolPermissionContext(toolUseContext);
    let reportPermissionWait = () =>
      tool.description(effectiveInput, {
        isNonInteractiveSession: toolUseContext.options.isNonInteractiveSession,
        toolPermissionContext: permissionContext,
        tools: toolUseContext.options.tools,
      });
    if (toolUseContext.requestDialog !== undefined) {
      let permissionContextSetter = teammatePermissionContextBySessionRoot.of(
        toolUseContext.session,
      ).permissionContextSetter;
      let ctx = createPermissionContext(
        tool,
        input,
        toolUseContext,
        assistantMessage,
        toolUseID,
        permissionSetter,
        (queue) => {
          permissionContextSetter?.((queue_2) =>
            applyPermissionUpdates(
              queue_2,
              queue.filter((item) => item.type !== "setMode"),
            ),
          );
        },
      );
      let T = await handleCoordinatorPermission({
        ctx,
        updatedInput: decision.updatedInput,
        suggestions: decision.suggestions,
        permissionMode: permissionContext.mode,
        askSuppressesAlwaysAllowRule: decision.suppressAlwaysAllowRule === true,
        askIsPersonOnly: decision.personOnly === true,
      });
      if (T) return T;
      if (abortController.signal.aborted)
        return {
          behavior: "ask",
          message: SUBAGENT_REJECT_MESSAGE,
        };
      let description = await reportPermissionWait();
      if (abortController.signal.aborted)
        return {
          behavior: "ask",
          message: SUBAGENT_REJECT_MESSAGE,
        };
      let now = Date.now();
      try {
        return await new Promise((resolve, reject) => {
          repromptFilePermission(
            {
              ctx,
              description,
              result: decision,
              awaitAutomatedChecksBeforeDialog: true,
            },
            resolve,
          ).catch(reject);
        });
      } finally {
        onPermissionWait(Date.now() - now);
      }
    }
    if (isHostWordedAsk(decision) || decision.forcedByCaller === true)
      return forwardHostWordedAsk(tool.name, "the teammate mailbox (a static-description wire)", {
        hostWorded: decision.hostDisplay !== undefined,
        forMcpSkill: decision.metadata?.mcpSkill !== undefined,
      });
    let description = await reportPermissionWait();
    if (abortController.signal.aborted)
      return {
        behavior: "ask",
        message: SUBAGENT_REJECT_MESSAGE,
      };
    return new Promise((resolve) => {
      let request = createPermissionRequest({
        toolName: tool.name,
        toolUseId: toolUseID,
        input: effectiveInput,
        description,
        permissionSuggestions: decision.suggestions,
        workerId: identity.agentId,
        workerName: identity.agentName,
        workerColor: identity.color,
        teamName: identity.teamName,
      });
      registerPermissionCallback({
        requestId: request.id,
        toolUseId: toolUseID,
        toolName: request.toolName,
        inputDigest: stableHashOfJson(request.toolName, effectiveInput),
        onAllow(updatedInput, permissionUpdates, _feedback, contentBlocks) {
          cleanup();
          let z = normalizePermissionUpdate(
            permissionUpdates,
            undefined,
            getToolPermissionContext(toolUseContext),
          );
          let ee =
            tool.suppressesAllPermissionUpdates?.(effectiveInput) === true
              ? withoutGrantsForRemoteScope(z)
              : tool.suppressesAlwaysAllowRule?.(effectiveInput) === true ||
                  decision.suppressAlwaysAllowRule === true
                ? stripWholeToolGrantsForAsk(z, tool, getToolPermissionContext(toolUseContext))
                : z;
          persistPermissionUpdates(ee, toolUseContext.storageV5).catch(logError);
          let finalInput =
            updatedInput && Object.keys(updatedInput).length > 0 ? updatedInput : effectiveInput;
          resolve({
            behavior: "allow",
            updatedInput: finalInput,
            userModified: false,
            ...(contentBlocks &&
              contentBlocks.length > 0 && {
                contentBlocks,
              }),
          });
        },
        onReject(feedback, contentBlocks) {
          cleanup();
          let message = feedback
            ? `${SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX}${feedback}`
            : SUBAGENT_REJECT_MESSAGE;
          resolve({
            behavior: "ask",
            message,
            contentBlocks,
          });
        },
        onRefuse(message) {
          cleanup();
          resolve({
            behavior: "ask",
            message,
          });
        },
        onUnboundVerdict() {},
      });
      sendPermissionRequestViaMailbox(request, toolUseContext.storageV5).then((d) => {
        if (!d) {
          cleanup();
          resolve({
            behavior: "ask",
            message:
              "The permission request could not be delivered to the team lead (mailbox write failed). Retry the tool call.",
          });
        }
      });
      let pollInterval = setInterval(
        async (abortController, cleanup, resolve, identity, request, store, se) => {
          if (abortController.signal.aborted) {
            cleanup();
            resolve({
              behavior: "ask",
              message: SUBAGENT_REJECT_MESSAGE,
            });
            return;
          }
          let allMessages = await readMailbox(identity.agentName, identity.teamName, store);
          let fe = dedupeMailboxMessages(
            allMessages.filter((message) => message && !message.read),
            getInboxPath(identity.agentName, identity.teamName),
            {
              roster: se(),
              isPaneTeammate: false,
            },
          );
          for (let message of allMessages)
            if (message && !message.read && fe.get(message) !== "forged") {
              let parsed = isPermissionResponse(message.text);
              if (parsed && parsed.request_id === request.id) {
                await markSingleMessageAsRead(identity.agentName, identity.teamName, message, store);
                if (message.from !== TEAM_LEAD) {
                  logForDebugging(
                    `[InProcessRunner] Ignoring permission response from non-team-lead: ${message.from}`,
                    {
                      level: "warn",
                    },
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
        resolve,
        identity,
        request,
        toolUseContext.storageV5,
        getRoster,
      );
      let onAbortListener = () => {
        cleanup();
        resolve({
          behavior: "ask",
          message: SUBAGENT_REJECT_MESSAGE,
        });
      };
      abortController.signal.addEventListener("abort", onAbortListener, {
        once: true,
      });
      function cleanup() {
        clearInterval(pollInterval);
        unregisterPermissionCallback(request.id);
        abortController.signal.removeEventListener("abort", onAbortListener);
      }
    });
  };
}
//@ chunk-8xs34hez.js:5490-5563 layout = _temp6 (0.826)
function updateInProcessTeammateTask(taskId, e, taskRegistry) {
  taskRegistry.update(taskId, (A) => (A.type === "in_process_teammate" ? e(A) : A));
}
//@ chunk-8xs34hez.js:5563-5669 fingerprint = sendMessageToLeader (1)
/**
 * 以 teammate 身份给 team-lead 的 inbox 写一条消息。
 */
async function sendMessageToLeader(fromName, text, color, teamName, storage) {
  return writeToMailbox(
    TEAM_LEAD,
    {
      from: fromName,
      text,
      timestamp: new Date().toISOString(),
      color,
    },
    teamName,
    storage,
  );
}
//@ chunk-8xs34hez.js:5669-5789 sole-consumer
async function sendIdleNotificationToLeader(agentName, color, teamName, options, storageV5) {
  let idleNotification = createIdleNotification(agentName, options);
  let p;
  try {
    p = await sendMessageToLeader(agentName, jsonStringify(idleNotification), color, teamName, storageV5);
  } finally {
    logIdleResultDeliveryOutcome(idleNotification, options?.result, p);
  }
  return p !== undefined;
}
//@ chunk-8xs34hez.js:6128-6522 fingerprint = tryClaimNextTask (1)
/**
 * 从团队任务列表找一个可领取的任务，领取并置 in_progress，返回格式化后的任务提示词。
 */
async function tryClaimNextTask(taskListId, agentName, hasTaskListTools, storage) {
  if (!hasTaskListTools) return;
  try {
    let tasks = await listTasks(taskListId, storage);
    let availableTask = findAvailableTask(tasks);
    if (!availableTask) return;
    let result = await claimTask(taskListId, availableTask.id, agentName, undefined, storage);
    if (!result.success) {
      logForDebugging(`[inProcessRunner] Failed to claim task #${availableTask.id}: ${result.reason}`);
      return;
    }
    await updateTask(
      taskListId,
      availableTask.id,
      {
        status: "in_progress",
      },
      storage,
    );
    logForDebugging(`[inProcessRunner] Claimed task #${availableTask.id}: ${availableTask.subject}`);
    return formatTaskAsPrompt(availableTask);
  } catch (err) {
    logForDebugging(`[inProcessRunner] Error checking task list: ${err}`);
    return;
  }
}
//@ chunk-8xs34hez.js:6522-10170 layout
/**
 * 读一次 teammate 的 inbox：伪造来源的消息过滤；优先处理 shutdown 请求（之前先投递被压住的普通消息）；
 * 处理协议帧（leader 的 plan_approval_response 生效、mode_set_request 一律丢弃、其余丢弃）；普通消息标已读后批量返回，标记失败时有限次重试后不标记直接投递。
 */
async function pollTeammateInbox(identity, taskId, taskRegistry, storage, pollState, roster) {
  let messages;
  try {
    messages = await readMailbox(identity.agentName, identity.teamName, storage, {
      throwOnUnknownReadError: true,
    });
    pollState.readFailures = 0;
  } catch (error) {
    pollState.readFailures++;
    logForDebugging(
      `[inProcessRunner] ${identity.agentName} could not read mailbox (${pollState.readFailures} consecutive): ${error}`,
      {
        level: "warn",
      },
    );
    return null;
  }
  let provenance = dedupeMailboxMessages(
    messages.filter((message) => message && !message.read),
    getInboxPath(identity.agentName, identity.teamName),
    {
      roster,
      isPaneTeammate: false,
    },
  );
  let isForged = (message) => provenance.get(message) === "forged";
  let D = new Set(messages.filter((message) => message && !message.read).map(messageIdentityKey));
  for (let o of pollState.consumedUnmarked) if (!D.has(o)) pollState.consumedUnmarked.delete(o);
  let V = async (o) => {
    let u = await filterMailboxThroughReceiveHooks(o, {
      provenanceOf: (T) => provenance.get(T) ?? "unverifiable",
      agentId: identity.resumableAgentId ?? identity.agentId,
    });
    let w = new Set(u.map(messageIdentityKey));
    for (let T of o) {
      let R = messageIdentityKey(T);
      if (!w.has(R)) pollState.consumedUnmarked.add(R);
    }
    return u;
  };
  let shutdownIndex = -1;
  let shutdownRequest = null;
  for (let j = 0; j < messages.length; j++) {
    let u = messages[j];
    if (u && !u.read && !isForged(u)) {
      let w = isShutdownRequest(u.text);
      let R =
        (provenance.get(u) === "verified" ||
          u.from === TEAM_LEAD ||
          findTeammateByName(u.from, roster) !== undefined) &&
        w?.from === u.from
          ? w
          : null;
      if (R) {
        shutdownIndex = j;
        shutdownRequest = R;
        break;
      }
    }
  }
  if (shutdownIndex !== -1) {
    if (pollState.count > 0) {
      let filtered = messages.filter(
        (message, R) =>
          !message.read &&
          R !== shutdownIndex &&
          (isForged(message) || !isStructuredProtocolMessage(message.text)) &&
          !pollState.deliveredUnmarked.has(messageIdentityKey(message)) &&
          !pollState.consumedUnmarked.has(messageIdentityKey(message)),
      );
      if (filtered.length > 0) {
        for (let d of filtered) pollState.deliveredUnmarked.add(messageIdentityKey(d));
        let T = await markMessagesAsRead(identity.agentName, identity.teamName, filtered, storage);
        if (T) {
          pollState.count = 0;
          pollState.reported = false;
          pollState.deliveredUnmarked.clear();
        } else if (!pollState.reported) {
          pollState.reported = true;
          logFeatureSad("swarm_inbox_poll", "worker_mark_read_failed_streak");
        }
        logForDebugging(
          `[inProcessRunner] ${identity.agentName} delivering ${filtered.length} held message(s) ahead of a shutdown_request${T ? "" : " (mark still not landed)"}`,
          {
            level: T ? "debug" : "warn",
          },
        );
        let R = await V(filtered);
        if (R.length > 0)
          return {
            type: "new_messages",
            messages: R,
          };
      }
    }
    let targetMessage = messages[shutdownIndex];
    let u = count(messages.slice(0, shutdownIndex), (w) => !w.read);
    logForDebugging(
      `[inProcessRunner] ${identity.agentName} received shutdown request from ${shutdownRequest?.from} (prioritized over ${u} unread messages)`,
    );
    await markSingleMessageAsRead(identity.agentName, identity.teamName, targetMessage, storage);
    return {
      type: "shutdown_request",
      request: shutdownRequest,
      originalMessage: targetMessage.text,
      entryFrom: targetMessage.from,
    };
  }
  let protocolFrames = [];
  let plainMessages = [];
  for (let message of messages) {
    if (!message || message.read) continue;
    if (!isForged(message) && isStructuredProtocolMessage(message.text)) protocolFrames.push(message);
    else if (!pollState.consumedUnmarked.has(messageIdentityKey(message))) plainMessages.push(message);
  }
  let planApprovalMessage = null;
  if (protocolFrames.length > 0) {
    for (let protocolFrame of protocolFrames) {
      let response = isPlanApprovalResponse(protocolFrame.text);
      if (response && protocolFrame.from === TEAM_LEAD) {
        let content = applyPlanApprovalResponse(taskId, response, taskRegistry, storage);
        if (content) {
          logForDebugging(
            `[inProcessRunner] ${identity.agentName} applied lead plan_approval_response: approved=${content.approved}`,
          );
          planApprovalMessage = planApprovalResumeText(content);
        } else
          logForDebugging(
            `[inProcessRunner] ${identity.agentName} ignoring stale plan_approval_response (not awaiting approval)`,
          );
        continue;
      }
      if (isModeSetRequest(protocolFrame.text)) {
        logForDebugging(
          `[inProcessRunner] ${identity.agentName} dropping mode_set_request message: permission mode changes are never accepted from the inbox`,
          {
            level: "warn",
          },
        );
        continue;
      }
      logForDebugging(
        `[inProcessRunner] ${identity.agentName} dropping protocol frame from ${protocolFrame.from}: ${protocolFrame.text.substring(0, 80)}`,
        {
          level: "warn",
        },
      );
    }
    if (!(await markMessagesAsRead(identity.agentName, identity.teamName, protocolFrames, storage)))
      logForDebugging(
        `[inProcessRunner] ${identity.agentName} could not mark ${protocolFrames.length} protocol frame(s) read; retrying next poll`,
        {
          level: "warn",
        },
      );
  }
  if (planApprovalMessage)
    return {
      type: "new_message",
      message: planApprovalMessage,
      from: TEAM_LEAD,
    };
  if (plainMessages.length > 0) {
    if (await markMessagesAsRead(identity.agentName, identity.teamName, plainMessages, storage)) {
      pollState.count = 0;
      pollState.reported = false;
      pollState.deliveredUnmarked.clear();
    } else {
      let w = ++pollState.count;
      if (w < MARK_READ_FAILURE_CAP) {
        logForDebugging(
          `[inProcessRunner] ${identity.agentName} could not mark ${plainMessages.length} message(s) read (${w}/${MARK_READ_FAILURE_CAP}); delivery retried next poll`,
          {
            level: "warn",
          },
        );
        return null;
      }
      logForDebugging(
        `[inProcessRunner] ${identity.agentName} could not mark ${plainMessages.length} message(s) read for ${w} poll(s); delivering the batch unmarked`,
        {
          level: "warn",
        },
      );
      if (!pollState.reported) {
        pollState.reported = true;
        logFeatureSad("swarm_inbox_poll", "worker_mark_read_failed_streak");
      }
      for (let plainMessage of plainMessages)
        pollState.deliveredUnmarked.add(messageIdentityKey(plainMessage));
    }
    logForDebugging(
      `[inProcessRunner] ${identity.agentName} draining ${plainMessages.length} message(s) from ${uniq(plainMessages.map((plainMessage) => plainMessage.from)).join(", ")}`,
    );
    let u = await V(plainMessages);
    if (u.length === 0) return null;
    return {
      type: "new_messages",
      messages: u,
    };
  }
  if (pollState.count > 0) {
    pollState.count = 0;
    pollState.reported = false;
    pollState.deliveredUnmarked.clear();
  }
  return null;
}
//@ chunk-8xs34hez.js:10170-12164 fingerprint = waitForNextPromptOrShutdown (0.676)
/**
 * 空闲后的等待循环（每 500ms）：优先取 UI 注入的用户消息；检查 abort；读 inbox；尝试领取任务；开启空闲超时时超过阈值返回 idle_timeout。
 */
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
  holdEviction = false,
  storage,
) {
  logForDebugging(
    `[inProcessRunner] ${identity.agentName} starting poll loop (abort=${abortController.signal.aborted})`,
  );
  let idleSince = Date.now();
  let q = false;
  let pollCount = 0;
  while (!abortController.signal.aborted) {
    if (pollCount > 0) await sleep(MAILBOX_POLL_INTERVAL_MS);
    pollCount++;
    let appState = getAppState();
    let C = appState.tasks[taskId];
    if (C && C.type === "in_process_teammate" && C.pendingUserMessages.length > 0) {
      let T = C.pendingUserMessages[0];
      updateInProcessTeammateTask(
        taskId,
        (prev) => ({
          ...prev,
          pendingUserMessages: prev.pendingUserMessages.slice(1),
        }),
        taskRegistry,
      );
      logForDebugging(
        `[inProcessRunner] ${identity.agentName} found pending user message (poll #${pollCount})`,
      );
      return {
        type: "new_message",
        message: T.text,
        origin: T.origin,
        from: "user",
      };
    }
    let o =
      identity.resumableAgentId !== undefined &&
      hasRunningBackgroundWorkForAgent(identity.resumableAgentId, taskRegistry);
    let u =
      holdEviction ||
      (C?.type === "in_process_teammate" && C.awaitingPlanApproval) ||
      appState.viewingAgentTaskId === taskId ||
      hasOtherActiveAgents(appState.tasks, taskId) ||
      o;
    if (u) idleSince = Date.now();
    if (holdEviction && C?.type === "in_process_teammate" && C.evictAfter !== undefined)
      updateInProcessTeammateTask(
        taskId,
        (T) => ({
          ...T,
          evictAfter: undefined,
        }),
        taskRegistry,
      );
    if (
      C?.type === "in_process_teammate" &&
      C.evictAfter !== undefined &&
      ((o && C.evictAfter <= Date.now() + MAILBOX_POLL_INTERVAL_MS) || (q && !o))
    )
      updateInProcessTeammateTask(
        taskId,
        (T) => ({
          ...T,
          evictAfter: Date.now() + MCP_TASK_KEEPALIVE_MS,
        }),
        taskRegistry,
      );
    q = o;
    if (abortController.signal.aborted) {
      logForDebugging(`[inProcessRunner] ${identity.agentName} aborted while waiting (poll #${pollCount})`);
      return {
        type: "aborted",
      };
    }
    if (standalone) {
      if (isZincHarborOn()) {
        if (!u && Date.now() - idleSince >= TASK_EVICTION_GRACE_MS) {
          logForDebugging(
            `[inProcessRunner] ${identity.agentName} idle timeout after ${TASK_EVICTION_GRACE_MS}ms (poll #${pollCount})`,
          );
          return {
            type: "idle_timeout",
          };
        }
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
        if (R?.type === "in_process_teammate" && R.evictAfter !== undefined)
          updateInProcessTeammateTask(
            taskId,
            (d) => ({
              ...d,
              evictAfter: Date.now() + MCP_TASK_KEEPALIVE_MS,
            }),
            taskRegistry,
          );
        continue;
      }
    } catch (err) {
      logForDebugging(`[inProcessRunner] ${identity.agentName} poll error: ${err}`);
    }
    let taskPrompt = await tryClaimNextTask(taskListId, identity.agentName, hasTaskListTools, storage);
    if (taskPrompt)
      return {
        type: "new_message",
        message: taskPrompt,
        from: "task-list",
      };
    if (isZincHarborOn()) {
      if (!u && Date.now() - idleSince >= TASK_EVICTION_GRACE_MS) {
        logForDebugging(
          `[inProcessRunner] ${identity.agentName} idle timeout after ${TASK_EVICTION_GRACE_MS}ms (poll #${pollCount})`,
        );
        return {
          type: "idle_timeout",
        };
      }
    }
  }
  logForDebugging(
    `[inProcessRunner] ${identity.agentName} exiting poll loop (abort=${abortController.signal.aborted}, polls=${pollCount})`,
  );
  return {
    type: "aborted",
  };
}
//@ chunk-8xs34hez.js:12164-23605 fingerprint = runInProcessTeammate (0.651)
/**
 * 同进程 teammate 主循环：构造 teammate 代理上下文与系统提示词（默认工具提示 + 自定义代理指令，可 replace/append），强制包含 SendMessage 与任务列表工具；
 * 每轮在 teammate 上下文中 runAgent，必要时先自动压缩历史；回合结束读 inbox 决定继续，否则标空闲并给 leader 发 idle_notification，再进入等待循环；结束或异常时标 completed/failed 并通知。
 */
async function runInProcessTeammate(config) {
  let {
    identity,
    taskId,
    prompt,
    description,
    spawnedAgentType,
    agentDefinition,
    teammateContext,
    toolUseContext,
    abortController,
    model,
    systemPrompt,
    systemPromptMode,
    allowedTools,
    allowPermissionPrompts,
    invokingRequestId,
    standalone = false,
    resumeMessages,
    resumeReplacementState,
    initialFrom,
  } = config;
  let { setAppState, taskRegistry } = toolUseContext;
  let retryStatus = createAgentStatusEmitter(taskId);
  let pollState = {
    count: 0,
    reported: false,
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
    isTeamLead: false,
    agentType: "teammate",
    invokingRequestId,
    invocationKind: "spawn",
    invocationEmitted: false,
    isBackgroundAgent: true,
  };
  let { tools, mainLoopModel } = toolUseContext.rootToolSurface;
  let systemPrompt_2;
  if (systemPromptMode === "replace" && systemPrompt) systemPrompt_2 = systemPrompt;
  else {
    let Q = [
      ...(
        await getSystemPrompt(tools, mainLoopModel, {
          teammate: true,
        })
      ).filter((Y) => Y !== SYSTEM_PROMPT_DYNAMIC_BOUNDARY),
      TEAMMATE_SYSTEM_PROMPT_ADDENDUM,
    ];
    if (agentDefinition) {
      let customPrompt = agentDefinition.getSystemPrompt({
        toolUseContext,
        primedAgentMemory: await readAgentMemoryScope(agentDefinition, toolUseContext.storageV5),
      });
      if (customPrompt)
        Q.push(`
# Custom Agent Instructions
${customPrompt}`);
      if (agentDefinition.memory)
        logEvent("tengu_agent_memory_loaded", {
          ...false,
          scope: fromEnum(agentDefinition.memory),
          source: lit("in-process-teammate"),
        });
    }
    if (systemPromptMode === "append" && systemPrompt) Q.push(systemPrompt);
    systemPrompt_2 = Q.join(`
`);
  }
  let hasTaskListTools = teammateContext.hasTaskListTools;
  let requiredTools = [
    SENDMESSAGE,
    ...(hasTaskListTools
      ? [TASK_CREATE_TOOL_NAME, TASK_GET_TOOL_NAME, TASK_LIST_TOOL_NAME, TASK_UPDATE_TOOL_NAME]
      : []),
  ];
  let disallowedTools = agentDefinition?.disallowedTools?.filter(
    (disallowedTool) => !requiredTools.includes(permissionRuleValueFromString(disallowedTool).toolName),
  );
  let agentDefinitionForRun = {
    agentType: identity.agentName,
    whenToUse: `In-process teammate: ${identity.agentName}`,
    getSystemPrompt: () => systemPrompt_2,
    tools: agentDefinition?.tools ? uniq([...agentDefinition.tools, ...requiredTools]) : ["*"],
    ...(disallowedTools?.length && {
      disallowedTools,
    }),
    source: "projectSettings",
    permissionMode: "default",
    ...(agentDefinition?.model && {
      model: agentDefinition.model,
    }),
    ...(agentDefinition?.effort !== undefined && {
      effort: agentDefinition.effort,
    }),
    ...(agentDefinition?.omitClaudeMd && {
      omitClaudeMd: true,
    }),
    ...(agentDefinition?.autoCompactWindow !== undefined && {
      autoCompactWindow: agentDefinition.autoCompactWindow,
    }),
  };
  let history = resumeMessages ? [...resumeMessages] : [];
  let recordedUuids = new Set(resumeMessages?.map((resumeMessage) => resumeMessage.uuid));
  let transcriptMetadata = {
    taskKind: "in_process_teammate",
    teamName: identity.teamName,
    color: identity.color,
    planModeRequired: identity.planModeRequired,
    ...(agentDefinition && {
      customAgentType: agentDefinition.agentType,
    }),
    ...(spawnedAgentType !== undefined && {
      spawnedAgentType,
    }),
    ...(model && {
      model,
    }),
  };
  let initialPrompt = formatTeammateMessage({
    from: initialFrom ?? TEAM_LEAD,
    text: prompt,
    summary: description,
  });
  let nextPrompt = initialPrompt;
  let nextOrigin = undefined;
  let shouldExit = false;
  let holdEviction = false;
  let hasProducedOutput = (resumeMessages?.length ?? 0) > 0;
  let compactBlocked = false;
  let lastDeliveredResult = resumeMessages ? safeTeammateIdleResult(resumeMessages).result : undefined;
  let workInterrupted = false;
  let handleWaitResult = async (h) => {
    switch (((holdEviction = false), h.type)) {
      case "shutdown_request":
        logForDebugging(`[inProcessRunner] ${identity.agentId} received shutdown request - passing to model`);
        nextPrompt = formatTeammateMessage({
          from: typeof h.entryFrom === "string" && h.entryFrom !== "" ? h.entryFrom : UNKNOWN_SENDER,
          text: withShutdownReplyInstructions(
            sanitizeReceivedStructuredFrame(h.originalMessage, h.entryFrom) ?? h.originalMessage,
            h.entryFrom,
          ),
        });
        nextOrigin = undefined;
        appendTeammateTranscript(
          taskId,
          createUserMessage({
            content: nextPrompt,
          }),
          taskRegistry,
        );
        break;
      case "new_message":
        logForDebugging(`[inProcessRunner] ${identity.agentId} received new message from ${h.from}`);
        if (h.from === "user") {
          nextPrompt = h.message;
          nextOrigin = h.origin;
        } else {
          nextPrompt = formatTeammateMessage({
            from: h.from,
            text: h.message,
            color: h.color,
            summary: h.summary,
          });
          nextOrigin = undefined;
          appendTeammateTranscript(
            taskId,
            createUserMessage({
              content: nextPrompt,
            }),
            taskRegistry,
          );
        }
        break;
      case "new_messages":
        logForDebugging(
          `[inProcessRunner] ${identity.agentId} received ${h.messages.length} drained message(s)`,
        );
        nextPrompt = formatTeammateMessages(h.messages, {
          recipientIsLead: false,
        });
        nextOrigin = undefined;
        appendTeammateTranscript(
          taskId,
          createUserMessage({
            content: nextPrompt,
          }),
          taskRegistry,
        );
        break;
      case "aborted":
        logForDebugging(`[inProcessRunner] ${identity.agentId} aborted while waiting`);
        shouldExit = true;
        break;
      case "idle_timeout":
        logForDebugging(`[inProcessRunner] ${identity.agentId} idle timeout \u2014 exiting loop`);
        if (!standalone) {
          toolUseContext.agentLifecycle.setTeammate(identity.agentId, undefined);
          await removeMemberByAgentId(
            identity.teamName,
            identity.agentId,
            {
              onlyIfJoinedBefore: Date.now(),
            },
            toolUseContext.storageV5,
          );
        }
        shouldExit = true;
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
      if (resumeMessages)
        for (let resumeMessage of resumeMessages.slice(-MAX_APPENDED_ENTRIES))
          messages = appendBounded(messages, resumeMessage);
      return {
        ...task,
        messages: appendBounded(
          messages,
          createUserMessage({
            content: initialPrompt,
          }),
        ),
      };
    });
    let teammateReplacementState = toolUseContext.contentReplacementState
      ? (resumeReplacementState ?? createContentReplacementState())
      : undefined;
    let currentWorkAbortController = createStickyBetaLatches();
    let signal = createSignal();
    while (!abortController.signal.aborted && !shouldExit) {
      logForDebugging(
        `[inProcessRunner] ${identity.agentId} processing prompt: ${nextPrompt.substring(0, 50)}...`,
      );
      let currentWorkAbortController_2 = createAbortController();
      currentWorkAbortController_2.signal.addEventListener("abort", () => {
        workInterrupted = true;
      });
      updateInProcessTeammateTask(
        taskId,
        (task) => ({
          ...task,
          currentWorkAbortController: currentWorkAbortController_2,
          retryWake: signal,
        }),
        taskRegistry,
      );
      let userMessage = createUserMessage({
        content: nextPrompt,
        origin: nextOrigin,
      });
      let promptMessages = [userMessage];
      let contextMessages = history;
      let tokenCount = estimateTokensWithAnchor(history, bytesPerTokenForModel(mainLoopModel));
      if (
        !isEnvTruthy(process.env.DISABLE_COMPACT) &&
        tokenCount >
          getAutoCompactThresholdTokens(
            getModelContextInfo(mainLoopModel),
            withAutoCompactCeiling(
              toolUseContext.options.autoCompactWindow,
              agentDefinitionForRun.autoCompactWindow,
            ),
          )
      ) {
        logForDebugging(`[inProcessRunner] ${identity.agentId} compacting history (${tokenCount} tokens)`);
        let isolatedContext = {
          ...toolUseContext,
          abortController,
          agentId: identity.resumableAgentId ?? identityAgentId2(identity.agentId),
          readFileState: cloneFileStateCache(toolUseContext.readFileState, {
            stripSeededFromContext: true,
          }),
          memorySelector: emptyPickerState(),
          onCompactEvent: undefined,
          onRetryStatus: retryStatus.setRetryStatus,
          compactTranscriptUnavailable: true,
        };
        try {
          let compactedSummary = await compactConversation(
            history,
            isolatedContext,
            {
              systemPrompt: asSystemPrompt([]),
              userContext: {},
              systemContext: {},
              toolUseContext: isolatedContext,
              forkContextMessages: history,
              advisorModel: isolatedContext.getAppState().advisorModel,
            },
            true,
            {
              isAutoCompact: true,
            },
          );
          contextMessages = buildPostCompactMessages(compactedSummary);
          if (teammateReplacementState) teammateReplacementState = createContentReplacementState();
          history.length = 0;
          history.push(...contextMessages);
          recordedUuids.clear();
          taskRegistry.updateTranscript(taskId, (task) => ({
            ...task,
            messages: [...contextMessages, userMessage],
          }));
        } catch (error) {
          if (error instanceof Error && error.message.startsWith(COMPACTION_BLOCKED_BY_HOOK)) {
            logForDebugging(
              `[inProcessRunner] ${identity.agentId} compaction blocked by PreCompact hook; continuing uncompacted`,
            );
            compactBlocked = true;
          } else if (
            abortController.signal.aborted ||
            (error instanceof Error && error.message === API_REQUEST_ABORTED_MESSAGE)
          ) {
            logForDebugging(`[inProcessRunner] ${identity.agentId} aborted during compaction`);
            shouldExit = true;
            break;
          } else throw error;
        }
      }
      let forkContextMessages = contextMessages.length > 0 ? [...contextMessages] : undefined;
      history.push(userMessage);
      lastDeliveredResult = undefined;
      workInterrupted = currentWorkAbortController_2.signal.aborted;
      let tracker = createProgressTracker();
      let we = taskRegistry.get(taskId);
      if (we !== undefined && "progress" in we && we.progress !== undefined)
        tracker.latestInputTokens = we.progress.tokenCount;
      let resolveActivity = createActivityDescriptionResolver(tools);
      let ge = [];
      let Ae = toolUseContext.getAppState().tasks[taskId];
      let currentPermissionMode = Ae && Ae.type === "in_process_teammate" ? Ae.permissionMode : "default";
      let iterationAgentDefinition = {
        ...agentDefinitionForRun,
        permissionMode: currentPermissionMode,
      };
      let Ue = false;
      let ne = null;
      await runWithTeammateContext(teammateContext, async () =>
        runWithCwdOverride(agentContext, async () => {
          updateInProcessTeammateTask(
            taskId,
            (task) => ({
              ...task,
              status: "running",
              isIdle: false,
              idleNotificationOwedToLead: undefined,
              evictAfter: undefined,
              evictAfterHeldBySibling: undefined,
            }),
            taskRegistry,
          );
          taskRegistry.updateTranscript(taskId, (task) => ({
            ...task,
            turnStartTime: Date.now(),
          }));
          retryStatus.setMode("responding");
          for await (let message of runAgent({
            agentDefinition: iterationAgentDefinition,
            promptMessages,
            turnPrompt: nextPrompt,
            toolUseContext,
            canUseTool: createInProcessCanUseTool(
              identity,
              currentWorkAbortController_2,
              (waitMs) => {
                updateInProcessTeammateTask(
                  taskId,
                  (task) => ({
                    ...task,
                    totalPausedMs: (task.totalPausedMs ?? 0) + waitMs,
                  }),
                  taskRegistry,
                );
              },
              makeClassifierApprovalsSetter(setAppState),
              () => toolUseContext.getAppState().teamContext?.teammates,
            ),
            isAsync: true,
            canShowPermissionPrompts: allowPermissionPrompts ?? true,
            forkContextMessages,
            querySource: "agent:custom",
            override: {
              abortController: currentWorkAbortController_2,
              agentContext,
              onRetryStatus: retryStatus.setRetryStatus,
              subscribeRetryWake: signal.subscribe,
              ...(identity.resumableAgentId && {
                agentId: identity.resumableAgentId,
              }),
            },
            ...(identity.resumableAgentId && {
              recordedUuids,
              name: identity.agentName,
              description,
              extraMetadata: {
                ...transcriptMetadata,
                permissionMode: currentPermissionMode,
              },
            }),
            onStreamTokenEstimate: (event) => {
              applyStreamTokenEvent(tracker, event);
              let progress = getProgressUpdate(tracker);
              updateInProcessTeammateTask(
                taskId,
                (task) =>
                  task.progress?.tokenCount === progress.tokenCount
                    ? task
                    : {
                        ...task,
                        progress,
                      },
                taskRegistry,
              );
            },
            model,
            preserveToolUseResults: true,
            availableTools: tools,
            allowedTools,
            contentReplacementState: teammateReplacementState,
            stickyBetas: currentWorkAbortController,
            isTeammate: true,
            teammateContext,
          })) {
            if (abortController.signal.aborted) {
              logForDebugging(`[inProcessRunner] ${identity.agentId} lifecycle aborted`);
              break;
            }
            if (currentWorkAbortController_2.signal.aborted) {
              logForDebugging(`[inProcessRunner] ${identity.agentId} current work aborted (Escape pressed)`);
              if (
                message.type === "assistant" ||
                message.type === "user" ||
                (message.type === "attachment" && isLoggableMessage(message))
              ) {
                ge.push(message);
                history.push(message);
                ne = applyPreservedMessages(history, message, ne);
              }
              Ue = true;
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
                let te = new Set(U.inProgressToolUseIDs);
                let oe = false;
                for (let id of ids) if (te.delete(id)) oe = true;
                return oe
                  ? {
                      ...U,
                      inProgressToolUseIDs: te,
                    }
                  : U;
              });
              continue;
            }
            if (message.type === "system" && message.subtype === "api_error") continue;
            ge.push(message);
            history.push(message);
            ne = applyPreservedMessages(history, message, ne);
            updateProgressFromMessage(tracker, message, resolveActivity, tools);
            let progress = getProgressUpdate(tracker);
            updateInProcessTeammateTask(
              taskId,
              (k) => ({
                ...k,
                progress,
              }),
              taskRegistry,
            );
            taskRegistry.updateTranscript(taskId, (task) => {
              let inProgressToolUseIDs = task.inProgressToolUseIDs;
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
                      be.delete(block.tool_use_id);
                      inProgressToolUseIDs = be;
                    }
                }
              }
              return {
                ...task,
                messages: appendReplacingUuid(task.messages, message),
                ...inProgressToolUpdate(task.inProgressToolUseIDs, inProgressToolUseIDs),
              };
            });
          }
          return {
            success: true,
            messages: ge,
          };
        }),
      ).finally(() => {
        if (ne) {
          history.push(...ne.preserved);
          ne = null;
        }
      });
      updateInProcessTeammateTask(
        taskId,
        (task) => ({
          ...task,
          currentWorkAbortController: undefined,
        }),
        taskRegistry,
      );
      if (abortController.signal.aborted) break;
      let le = Ue || currentWorkAbortController_2.signal.aborted;
      if (le) {
        workInterrupted = true;
        logForDebugging(`[inProcessRunner] ${identity.agentId} work interrupted, returning to idle`);
        let interruptMessage = createApiErrorMessage({
          content: API_REQUEST_ABORTED_MESSAGE,
        });
        taskRegistry.updateTranscript(taskId, (task) => ({
          ...task,
          messages: appendBounded(task.messages, interruptMessage),
        }));
      }
      hasProducedOutput ||= ge.some(
        (r) => (r.type === "assistant" && !r.isApiErrorMessage) || (r.type === "user" && !r.isMeta),
      );
      let re = !le ? getTrailingApiErrorInfo(ge) : undefined;
      holdEviction = re?.isTransient === true && !standalone && hasProducedOutput;
      if (!standalone && !le) {
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
          ) {
            await sleep(MAILBOX_POLL_INTERVAL_MS);
            r = await pollTeammateInbox(
              identity,
              taskId,
              taskRegistry,
              toolUseContext.storageV5,
              pollState,
              toolUseContext.getAppState().teamContext?.teammates,
            );
          }
        } catch (error) {
          logForDebugging(`[inProcessRunner] ${identity.agentName} turn-end mailbox check failed: ${error}`);
        }
        if (r) {
          try {
            let { result: v, summary } = safeTeammateIdleResult(history, {
              emitTelemetry: true,
            });
            if (v !== undefined || re !== undefined) {
              if (
                (await sendIdleNotificationToLeader(
                  identity.agentName,
                  identity.color,
                  identity.teamName,
                  {
                    idleReason: re !== undefined ? "failed" : undefined,
                    summary,
                    failureReason: re?.reason,
                    result: v,
                    senderReachable: true,
                  },
                  toolUseContext.storageV5,
                )) &&
                v !== undefined
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
      let qe = toolUseContext.getAppState().tasks[taskId];
      let We = !(qe?.type === "in_process_teammate" && qe.isIdle) && !standalone;
      updateInProcessTeammateTask(
        taskId,
        (task) => {
          task.onIdleCallbacks?.forEach((cb) => cb());
          return {
            ...task,
            isIdle: true,
            idleNotificationOwedToLead:
              (We && getIsNonInteractiveSession()) || task.idleNotificationOwedToLead,
            evictAfter: holdEviction ? undefined : Date.now() + MCP_TASK_KEEPALIVE_MS,
            onIdleCallbacks: [],
          };
        },
        taskRegistry,
      );
      let reason = re?.reason;
      if (We) {
        let r = safeTeammateIdleResult(history, {
          emitTelemetry: !le,
        });
        let v = le ? undefined : r.result;
        let k = await sendIdleNotificationToLeader(
          identity.agentName,
          identity.color,
          identity.teamName,
          {
            idleReason: le ? "interrupted" : reason !== undefined ? "failed" : "available",
            summary: r.summary,
            failureReason: reason,
            result: v,
            senderReachable: reason === undefined || holdEviction,
          },
          toolUseContext.storageV5,
        );
        if (v !== undefined && k) lastDeliveredResult = v;
        if (!k)
          updateInProcessTeammateTask(
            taskId,
            (U) =>
              U.idleNotificationOwedToLead
                ? {
                    ...U,
                    idleNotificationOwedToLead: undefined,
                  }
                : U,
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
    let alreadyTerminal = false;
    let toolUseId;
    updateInProcessTeammateTask(
      taskId,
      (task) => {
        if (task.status !== "running") {
          alreadyTerminal = true;
          return task;
        }
        toolUseId = task.toolUseId;
        task.onIdleCallbacks?.forEach((cb) => cb());
        return {
          ...task,
          status: "completed",
          notified: true,
          endTime: Date.now(),
          pendingUserMessages: [],
          abortController: undefined,
          currentWorkAbortController: undefined,
          retryWake: undefined,
          onIdleCallbacks: [],
        };
      },
      taskRegistry,
    );
    if (!alreadyTerminal)
      taskRegistry.updateTranscript(taskId, (M) => ({
        ...M,
        messages: M.messages.length ? [M.messages.at(-1)] : [],
        inProgressToolUseIDs: new Set(),
      }));
    evictTaskOutput(taskId);
    taskRegistry.evictTerminal(taskId);
    if (!alreadyTerminal)
      emitTaskNotification(taskId, "completed", {
        toolUseId,
        summary: identity.agentId,
      });
    unregisterPerfettoAgent(identity.agentId);
    if (compactBlocked) logFeatureSad("swarm_in_process_run", "compact_blocked_by_hook");
    else logFeatureOk("swarm_in_process_run");
    return {
      success: true,
      messages: history,
    };
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : "Unknown error";
    logForDebugging(`[inProcessRunner] Agent ${identity.agentId} failed: ${errorMessage}`);
    let alreadyTerminal = false;
    let toolUseId;
    updateInProcessTeammateTask(
      taskId,
      (task) => {
        if (task.status !== "running") {
          alreadyTerminal = true;
          return task;
        }
        toolUseId = task.toolUseId;
        task.onIdleCallbacks?.forEach((cb) => cb());
        return {
          ...task,
          status: "failed",
          notified: true,
          error: errorMessage,
          isIdle: true,
          endTime: Date.now(),
          onIdleCallbacks: [],
          pendingUserMessages: [],
          abortController: undefined,
          currentWorkAbortController: undefined,
          retryWake: undefined,
        };
      },
      taskRegistry,
    );
    if (!alreadyTerminal)
      taskRegistry.updateTranscript(taskId, (x) => ({
        ...x,
        messages: x.messages.length ? [x.messages.at(-1)] : [],
        inProgressToolUseIDs: new Set(),
      }));
    evictTaskOutput(taskId);
    taskRegistry.evictTerminal(taskId);
    if (!alreadyTerminal)
      emitTaskNotification(taskId, "failed", {
        toolUseId,
        summary: identity.agentId,
      });
    if (!standalone) {
      let x;
      try {
        x = workInterrupted ? undefined : teammateIdleResultText(history);
      } catch (error) {
        logForDebugging(`[inProcessRunner] ${identity.agentName} failed to extract partial result: ${error}`);
      }
      if (x !== undefined && x === lastDeliveredResult) x = undefined;
      await sendIdleNotificationToLeader(
        identity.agentName,
        identity.color,
        identity.teamName,
        {
          idleReason: "failed",
          completedStatus: "failed",
          failureReason: errorMessage,
          result: x,
        },
        toolUseContext.storageV5,
      );
    }
    unregisterPerfettoAgent(identity.agentId);
    logFeatureBad("swarm_in_process_run", "agent_loop_failed");
    return {
      success: false,
      error: errorMessage,
      messages: history,
    };
  }
}
//@ chunk-8xs34hez.js:23605-23719 facade-exports = startInProcessTeammate (1)
/**
 * 后台启动 runInProcessTeammate，未捕获异常只记日志。
 */
function startInProcessTeammate(config) {
  let agentId = config.identity.agentId;
  runInProcessTeammate(config).catch((error) => {
    logForDebugging(`[inProcessRunner] Unhandled error in ${agentId}: ${error}`);
  });
}
//@ chunk-phrnybk8.js:411-533 placement
function appendTeammateTranscript(taskId, userMessage, taskRegistry) {
  if (taskRegistry.get(taskId)?.status !== "running") return;
  taskRegistry.updateTranscript(taskId, (n) => ({
    ...n,
    messages: appendBounded(n.messages, userMessage),
  }));
}
export { startInProcessTeammate };
