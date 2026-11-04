/**
 * cli/print/agentResume.ts
 *
 * 2.1.316 新增：无头模式下被中断子代理的恢复、停放的代理询问与重启提醒
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m5det47h.js (1), chunk-tyg7f3ek.js (37)
 * attribution: placement 38
 */
import { randomUUID } from "crypto";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  isThreadAgentEnabled,
  spawnOrJoinThreadAgent,
} from "../../services/artifacts/comments/backgroundAgent.js";
import { isArtifactsAvailable } from "../../services/artifacts/artifactAvailability.js";
import { artifactViewerUrlFor } from "../../tools/ArtifactTool/artifactUrls.js";
import { getLastCacheSafeParams } from "../../utils/forkedAgent.js";
import { getLocalSourcePath } from "../../services/artifacts/comments/autoreact.js";
import {
  buildThreadAgentPrompt,
  buildThreadFollowUpPrompt,
} from "../../services/artifacts/comments/threadPrompts.js";
import { emitArtifactSummonStatus } from "../../services/artifacts/artifactNotices.js";
import { logError } from "../../utils/log.js";
import { getPromptText, parseCommentNotification } from "../../services/artifacts/comments/autoreactState.js";
import { parseArtifactUrl } from "../../tools/ArtifactTool/constants.js";
import { ARTIFACT_LINE_PREFIX } from "../../services/artifacts/comments/commentNotifications.js";
import { isAgentOrTaskTool } from "../../utils/transcript/deserialize.js";
import { dedupeTasksById } from "../remoteIO/gates.js";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
import { getTaskOutputData } from "../../tools/TaskOutputTool/TaskOutputTool.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { rememberResumableAgents } from "../../tools/AgentTool/agentLaunch.js";
import { wrapInSystemReminder, createSystemMessage } from "../../utils/messages.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { sanitizeMetadataText, validateAgentMetadata } from "../../utils/agentMetadata.js";
import { requestIdOf } from "../../utils/sessionState.js";
import { CONFIRM } from "../../utils/permissions/confirmWithUser.js";
import { isSubagentToolRequest } from "../../remote/wireFrameShape.js";
import { PermissionCardAsk } from "./wakeRouter.js";
import { PERMISSION_ANSWER_WAIT_MS, MAX_PARKED_ANSWER_AGE_MS } from "./parkedPrompts.js";
import { withDeadline } from "../../utils/sleep.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { toolMatchesName } from "../../Tool.js";
import { AGENT, MAX_AGENT_FORK_DEPTH } from "../../tools/AgentTool/constants.js";
import {
  getDenyRuleForTool,
  getAskRuleForTool,
  findDenyRuleWithContent,
  findAskRuleWithContent,
  matchToolRule,
} from "../../utils/permissions/permissions.js";
import { isForegroundAgentMoveOff } from "../../tools/AgentTool/backgroundGates.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  ResumeAgentStateError,
  resumeAgentBackground,
  isResumeDenied,
  resumeAgentAtItsCall,
  isResumedInlineRunError,
  AgentResumeInProgressError,
} from "../../tools/AgentTool/resumeAgent.js";
import { isTurnHandoffResumeEnabled } from "../remoteIO/turnHandoff.js";
import { normalizeAgentIdOrNull } from "../../utils/agentId.js";
import {
  readAgentMetadata,
  updateAgentMetadata,
  getCurrentSessionBridge,
  getMaterializedSessionFile,
  clearBridgeSession,
  saveBridgeSession,
  restoreSessionMetadata,
} from "../../utils/sessionStorage.js";
import { isRestorableDefaultLaunchedAgent } from "../remoteIO/orphanAgentRestore.js";
import { WEB_FETCH_AGENT } from "../../tools/WebFetchTool/harnessNotes.js";
import { maxConcurrentSubagents } from "../../plugins/functionHooks/toolCallHooks.js";
import { createAbortController } from "../../utils/abortController.js";
import { runSafely } from "./followUpPreempt.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import {
  mainAgentId,
  getSessionId,
  onSessionSwitch,
  getHostRendersChromeSetupOffer,
  setHostRendersChromeSetupOffer,
  getIsNonInteractiveSession,
  getGatewayAuth,
} from "../../bootstrap/state.js";
import {
  formatAgentRestartFailedNotice,
  formatOrphanedAgentNotification,
  withResumeCapabilities,
} from "../../tasks/resumeOrphanedTasks.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, AbortError, isAbortError } from "../../utils/errors.js";
import { MAX_LOOP_AGE_SECONDS } from "../../utils/loop/loopWakeups.js";
import { isTeleportedSession } from "../../bridge/createSession.js";
import { getOauthAccountInfo, sameOwnerAccount } from "../../utils/auth.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { isClaudeAiChatCowork, isDesktopTopSession } from "../../utils/entrypointKinds.js";
import { isChromeSetupOfferEnabled } from "../../tools/ChromeSetupOfferTool/ChromeSetupOfferTool.js";
import { claudeInChromeSession } from "../../commands/mobile/mobile.js";
import {
  hasDisconnectedChromeAnswer,
  markNotConnectedByPriorWorker,
} from "../../utils/claudeInChrome/phoneAnswer.js";
import { processStartTuningFields, garbageCollectionFields } from "../../utils/queryProfiler.js";
import { isClaudecodeSession, hostScheduledRun } from "../../utils/sessionShape.js";
import { memoryFileLimits } from "../../utils/claudemd.js";
import { isTransportBacked } from "../transportState.js";
import { informationalSystemMessage } from "./sdkMessageStream.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-m5det47h.js:226-278 placement
function isIterativeHavenGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_iterative_haven", false);
}
//@ chunk-tyg7f3ek.js:396442-396583 placement
/**
 * 从用户消息中解析 artifact 线程回复头（带 viewer URL），仅在已声明且开关开启时返回。
 */
function readArtifactThreadHeader(message) {
  if (
    message.declared !== true ||
    !isPlainPersonMessage(message) ||
    !isThreadAgentEnabled() ||
    !isArtifactsAvailable()
  )
    return null;
  let artifactThreadMessage = parseArtifactThreadMessage(message.value);
  return artifactThreadMessage === null
    ? null
    : {
        ...artifactThreadMessage.header,
        url: artifactViewerUrlFor(artifactThreadMessage.artifact),
      };
}
//@ chunk-tyg7f3ek.js:396583-396699 placement
function classifyArtifactThreadMessage(message) {
  if (!isPlainPersonMessage(message) || parseArtifactThreadMessage(message.value) === null) return;
  if (message.declared !== true) return "unmarked";
  return isArtifactsAvailable() ? "seeded" : undefined;
}
//@ chunk-tyg7f3ek.js:396699-397362 placement
/**
 * 处理来自 artifact 评论线程的后续消息：查找持有该线程的子代理并恢复执行。
 */
async function resumeArtifactThreadAgent(target, options) {
  if (options.exiting) return false;
  let { slug, threadId, url } = target;
  let summon = {
    slug,
    threadId,
    gestureAt: target.gestureAt,
    suppressed: false,
    storageV5: options.storageV5,
  };
  let toolUseContext = getLastCacheSafeParams()?.toolUseContext;
  let sourcePath =
    toolUseContext === undefined
      ? undefined
      : getLocalSourcePath(slug, toolUseContext.artifactRegistries.recordedPages);
  if (
    (
      await spawnOrJoinThreadAgent({
        slug,
        threadId,
        url,
        artifactName: `artifact ${slug.slice(0, 8)}`,
        directive: buildThreadAgentPrompt({
          trigger: "fresh",
          summonCount: 1,
          url,
          threadId,
          sourcePath,
          resolved: "unknown",
        }),
        followUp: buildThreadFollowUpPrompt({
          url,
          threadId,
        }),
        canUseTool: options.canUseTool,
        summon,
        onSettled: (lifecycleEvent) => options.onLifecycle(lifecycleEvent),
        route: "seeded",
      })
    ).outcome === "fallback"
  )
    return false;
  try {
    options.onLifecycle("queued");
    options.onLifecycle("started");
    emitArtifactSummonStatus(summon, {
      status: "working",
    });
  } catch (error) {
    logError(error);
  }
  return true;
}
//@ chunk-tyg7f3ek.js:397362-397486 placement
function isPlainPersonMessage(message) {
  return (
    message.isSynthetic !== true &&
    !message.peerDelivered &&
    message.inboundOrigin === undefined &&
    message.shouldQuery !== false &&
    !message.hasAttachments
  );
}
//@ chunk-tyg7f3ek.js:397486-397675 placement
function parseArtifactThreadMessage(message) {
  let promptText = getPromptText(message);
  let commentHeader = promptText === null ? null : parseCommentNotification(promptText);
  if (promptText === null || commentHeader === null) return null;
  let secondLine =
    promptText.split(
      `
`,
      2,
    )[1] ?? "";
  let artifactUrl = parseArtifactUrl(secondLine.slice(ARTIFACT_LINE_PREFIX.length).trim());
  return artifactUrl === null
    ? null
    : {
        header: commentHeader,
        artifact: artifactUrl,
      };
}
//@ chunk-tyg7f3ek.js:397675-397753 placement
function collectResumableAgentIds(supersededToolNames) {
  let agentIds = new Set();
  for (let [toolName, descriptor] of supersededToolNames ?? [])
    if (isAgentOrTaskTool(descriptor)) agentIds.add(toolName);
  return agentIds;
}
//@ chunk-tyg7f3ek.js:397753-397961 placement
function recordedAgentCallsFor(tasks, agentCallIds) {
  let filtered = dedupeTasksById(Array.isArray(tasks) ? tasks : []).filter(
    (task) => typeof task.tool_use_id === "string" && agentCallIds.has(task.tool_use_id),
  );
  let byToolUseId = Map.groupBy(filtered, (task) => task.tool_use_id);
  return filtered.filter((task) => byToolUseId.get(task.tool_use_id)?.length === 1);
}
//@ chunk-tyg7f3ek.js:397961-398370 placement
/**
 * 容器重启后，从转录中找出上一轮未回答的 Agent 调用，规划自动恢复。
 */
async function planRecordedAgentResumes({ recorded, agentCallIds, known, hasTool, settleFlags }) {
  let filtered = recordedAgentCallsFor(recorded, agentCallIds).filter((call) => !known.has(call.task_id));
  if (filtered.length === 0 || !hasTool(SENDMESSAGE)) return [];
  await settleFlags();
  if (!isIterativeHavenGateOn()) return [];
  let filtered_2 = filtered.filter(getTaskOutputData);
  let counts = {
    agent_calls: agentCallIds.size,
    agents_found: filtered.length,
  };
  if (filtered_2.length === 0) {
    logFeatureSad("ccr_cut_off_agents", "not_eligible", counts);
    return [];
  }
  logFeatureOk("ccr_cut_off_agents", {
    ...counts,
    agents_offered: filtered_2.length,
  });
  rememberResumableAgents(filtered_2.map((call) => call.task_id));
  return filtered_2;
}
//@ chunk-tyg7f3ek.js:398370-398791 placement
function containerRestartAgentsNote(unnamed) {
  return wrapInSystemReminder(
    `The container was restarted in the middle of a turn. Every Agent call that turn left unanswered is being resumed automatically from its saved transcript, as these agents: ${unnamed.join(", ")}. Wait for their notifications, which name each agent's task and give its result, before you do that work again. If one does not report back, send a message to its agent id with the ${SENDMESSAGE} tool to resume it.`,
  );
}
//@ chunk-tyg7f3ek.js:398791-399897 placement
/**
 * 生成"容器在一轮中途重启，以下 Agent 调用正自动从保存的转录恢复"的系统提醒。
 */
function formatRestartedAgentsReminder(agents, resuming = false) {
  let mapped = agents.map(
    (agent) =>
      `- ${escapeXml(sanitizeMetadataText(agent.description) ?? "(no description)")} (agent ${agent.task_id})`,
  );
  if (resuming)
    return wrapInSystemReminder(`The container was restarted in the middle of a turn. You launched each agent in this list in that turn, and its result never reached you. Each is being resumed automatically from its saved transcript and goes on with its task where it stopped.
${mapped.join(`
`)}
You need not launch any of them again. You get each agent's result in a notification when it is done. If one does not report back, send a message to its agent id with the ${SENDMESSAGE} tool to resume it.`);
  return wrapInSystemReminder(`The container was restarted in the middle of a turn. You launched each agent in this list in that turn. Each is now stopped, and its result never reached you.
${mapped.join(`
`)}
If you still need an agent's result, resume it rather than launch it again: send a message to its agent id with the ${SENDMESSAGE} tool. It continues from its saved transcript, which still holds its task, so it is enough to ask it to continue from where it stopped. You get its result when it is done. If the resume fails, launch the agent again.`);
}
//@ chunk-tyg7f3ek.js:399897-399990 placement
var UNDERIVABLE_AGENT_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tyg7f3ek.js:399897", () => {
  UNDERIVABLE_AGENT_REASONS = new Set([
    "underivable_no_superseded",
    "underivable_leaf_only",
    "underivable_excluded",
  ]);
});
//@ chunk-tyg7f3ek.js:399990-400673 placement
function findParkedAgentAsk(restored, bootPark, agentCallIds) {
  let pendingAction = restored?.external?.pending_action;
  let requestId = requestIdOf(pendingAction);
  let { pendingActionClass } = bootPark;
  if (
    !isIterativeHavenGateOn() ||
    !pendingAction ||
    requestId === undefined ||
    pendingAction.request_id !== requestId ||
    typeof pendingAction.tool_use_id !== "string" ||
    pendingAction.tool_use_id.startsWith(CONFIRM) ||
    typeof pendingAction.agent_id !== "string" ||
    typeof pendingAction.tool_name !== "string" ||
    !isSubagentToolRequest({
      agent_id: pendingAction.agent_id,
      tool_name: pendingAction.tool_name,
    }) ||
    typeof pendingAction.input !== "object" ||
    pendingAction.input === null ||
    Array.isArray(pendingAction.input)
  )
    return;
  let runningBackgroundTasks = restored?.internal?.running_background_tasks;
  let task = [
    ...(pendingActionClass === "underivable_adoptable"
      ? recordedAgentCallsFor(restored?.internal?.running_foreground_agents, agentCallIds)
      : []),
    ...(UNDERIVABLE_AGENT_REASONS.has(pendingActionClass) && Array.isArray(runningBackgroundTasks)
      ? dedupeTasksById(runningBackgroundTasks)
      : []),
  ].find((task) => task.task_id === pendingAction.agent_id);
  if (task === undefined || !getTaskOutputData(task)) return;
  return {
    card: {
      request_id: requestId,
      tool_use_id: pendingAction.tool_use_id,
      details: pendingAction,
    },
    agent: task,
  };
}
//@ chunk-tyg7f3ek.js:400673-401810 placement
class ParkedAgentAskHold {
  ask;
  card;
  agentId;
  io;
  ended = false;
  constructor(card, agentId, answerKind, io, answerOff) {
    this.card = card;
    this.agentId = agentId;
    this.io = io;
    this.ask = new PermissionCardAsk({
      card,
      answerKind,
      waitMs: PERMISSION_ANSWER_WAIT_MS,
      maxAnswerAgeMs: MAX_PARKED_ANSWER_AGE_MS,
      allowWithoutInputIsEcho: true,
      withdrawCard: (requestId) =>
        io.write({
          type: "control_cancel_request",
          request_id: requestId,
        }),
      unreadAnswersRead: () => {
        let answersRead = io.whenReceivedAnswersRead();
        return answersRead && withDeadline(answersRead, PERMISSION_ANSWER_WAIT_MS);
      },
      answerOff: async () => (await answerOff?.()) ?? "absent",
    });
    this.ask.startTimer();
    io.holdKeptAsk(this);
  }
  async answerFor(ask) {
    try {
      if (!ask.usable()) this.end("ask_needs_own_card");
      if (ask.toolName !== this.card.details?.tool_name) this.end("tool_differs");
      if (this.ended) return;
      let { answer, unused } = await this.ask.answerFor(ask);
      if (answer === undefined || unused !== undefined) this.end(unused ?? "no_answer");
      if (!ask.usable()) this.end("ask_needs_own_card");
      if (this.ended || answer === undefined) return;
      this.ended = true;
      this.io.holdKeptAsk(undefined);
      logFeatureOk("ccr_subagent_ask_hold", {
        answer_behavior: fromEnum(answer.behavior),
      });
      return answer;
    } catch (error) {
      logError(error);
      this.end("answer_threw");
      return;
    }
  }
  end(reason) {
    if (this.ended) return;
    this.ended = true;
    this.io.holdKeptAsk(undefined);
    this.ask.stop(reason === "stopped" || reason === "shutdown" ? reason : "not_asked");
    if (reason === "answer_threw") logFeatureBad("ccr_subagent_ask_hold", reason);
    else logFeatureSad("ccr_subagent_ask_hold", reason);
  }
}
//@ chunk-tyg7f3ek.js:401810-402136 placement
function holdParkedAgentAsk({ restored, bootPark, cutOffCallIds, planned, answerKind, io, answerOff }) {
  try {
    let parkedAgentAsk = findParkedAgentAsk(restored, bootPark, cutOffCallIds);
    if (
      parkedAgentAsk === undefined ||
      bootPark.parkedPermission !== undefined ||
      answerKind === "strict" ||
      !planned.some((plan) => plan.agentId === parkedAgentAsk.agent.task_id)
    )
      return;
    return new ParkedAgentAskHold(
      parkedAgentAsk.card,
      parkedAgentAsk.agent.task_id,
      answerKind,
      io,
      answerOff,
    );
  } catch (error) {
    logFeatureBad("ccr_subagent_ask_hold", "boot_threw");
    logError(error);
    return;
  }
}
//@ chunk-tyg7f3ek.js:402173-402417 placement
function isAgentToolAllowedByRules(tools, context, agentType, model) {
  let found = tools.find((rule) => toolMatchesName(rule, AGENT));
  return (
    found !== undefined &&
    getDenyRuleForTool(context, found) === null &&
    getAskRuleForTool(context, found) === null &&
    findDenyRuleWithContent(context, AGENT, agentType) === null &&
    findAskRuleWithContent(context, AGENT, agentType) === null &&
    (model === undefined ||
      ["deny", "ask"].every(
        (behavior) =>
          matchToolRule(
            context,
            found,
            {
              subagent_type: agentType,
              model,
              run_in_background: true,
            },
            behavior,
          ) === null,
      ))
  );
}
//@ chunk-tyg7f3ek.js:402417-402459 placement
function canResumeAgentsInBackground(tools, toolPermissionContext, agentType) {
  return !isForegroundAgentMoveOff() && isAgentToolAllowedByRules(tools, toolPermissionContext, agentType);
}
//@ chunk-tyg7f3ek.js:402459-402539 placement
function parkedAskHandle(hold) {
  return (
    hold && {
      id: hold.card.tool_use_id,
      settled: () => hold.end("not_asked"),
    }
  );
}
//@ chunk-tyg7f3ek.js:402539-402722 placement
function assertAgentResumeAllowed(context, agentType) {
  if (!canResumeAgentsInBackground(context.options.tools, getToolPermissionContext(context), agentType))
    throw new ResumeAgentStateError(
      "This session's permission rules now block this agent's type or require approval for it, or background agents are off.",
    );
}
//@ chunk-tyg7f3ek.js:402722-404055 placement
/**
 * 恢复被容器重启切断的后台 Agent 调用；检查权限规则、卡片等待与预算，逐个后台恢复。
 */
async function resumeCutOffAgents({
  cutOff,
  unresolvedCallIds,
  findCalls,
  stopped,
  alsoResumable,
  cardWaits,
  owesATurn,
  startsSpent,
  tools,
  toolPermissionContext,
  storageV5,
}) {
  try {
    if (cardWaits || !isIterativeHavenGateOn() || !isTurnHandoffResumeEnabled() || !owesATurn()) return [];
    let candidates = [
      ...cutOff.map((agent) => ({
        agent,
        toolUseID: agent.tool_use_id,
      })),
      ...stopped
        .filter((agent) => getTaskOutputData(agent) || alsoResumable?.has(agent.task_id))
        .map((agent) => ({
          agent,
          toolUseID: undefined,
        })),
    ];
    let sliced = (
      await Promise.all(
        candidates.map(async ({ agent, toolUseID }) => {
          let agentId = normalizeAgentIdOrNull(agent.task_id);
          if (agentId === null) return;
          let metadata = await readAgentMetadata(agentId, storageV5);
          let metadata_2 = metadata ? validateAgentMetadata(metadata) : undefined;
          let restartResumes = metadata_2?.restartResumes ?? 0;
          if (
            metadata_2 === undefined ||
            !isRestorableDefaultLaunchedAgent(metadata_2) ||
            restartResumes >= MAX_AGENT_FORK_DEPTH ||
            metadata_2.agentType === WEB_FETCH_AGENT ||
            !canResumeAgentsInBackground(tools, toolPermissionContext, metadata_2.agentType)
          )
            return;
          return {
            agentId,
            agentType: metadata_2.agentType,
            description: metadata_2.description ?? agent.description,
            toolUseID,
            waitedOn: toolUseID !== undefined,
            restartResumes: restartResumes + 1,
          };
        }),
      )
    )
      .filter((entry) => entry !== undefined)
      .slice(0, maxConcurrentSubagents());
    let budgetSpent = startsSpent();
    let waitedCallIds = budgetSpent ? [] : sliced.flatMap((entry) => entry.toolUseID ?? []);
    let callsById =
      waitedCallIds.length > 0 &&
      waitedCallIds.length === unresolvedCallIds.size &&
      waitedCallIds.every((callId) => unresolvedCallIds.has(callId))
        ? await findCalls(waitedCallIds)
        : new Map();
    let allCallsFound = waitedCallIds.length > 0 && waitedCallIds.every((callId) => callsById.has(callId));
    if (waitedCallIds.length > 0 && !allCallsFound)
      logFeatureSad("ccr_recorded_agent_resume", "calls_not_run_again", {
        agent_calls: waitedCallIds.length,
        unresolved_calls: unresolvedCallIds.size,
      });
    return sliced.flatMap(({ toolUseID, ...entry }) => {
      if (toolUseID === undefined || budgetSpent) return [entry];
      let assistantMessage = allCallsFound ? callsById.get(toolUseID) : undefined;
      return assistantMessage === undefined
        ? []
        : [
            {
              ...entry,
              call: {
                toolUseID,
                assistantMessage,
              },
            },
          ];
    });
  } catch (error) {
    logFeatureBad("ccr_recorded_agent_resume", "plan_threw");
    logError(error);
    return [];
  }
}
//@ chunk-tyg7f3ek.js:404055-408941 placement
/**
 * 一次已记录 Agent 恢复的运行状态：在后台/前台恢复各调用、跟踪运行集合并在结束时汇报。
 */
class RecordedAgentResumeRun {
  inBackground;
  running = new Set();
  inStartingTurn = false;
  unnamed = [];
  noteUuid;
  setUpAbort = createAbortController();
  planned;
  host;
  keptAsk;
  constructor(plan, host, abort, keptSubagentAsk) {
    this.planned = plan;
    this.inBackground = plan.filter((entry) => entry.call === undefined);
    this.host = host;
    this.keptAsk = keptSubagentAsk;
    if (keptSubagentAsk !== undefined) abort.then(() => keptSubagentAsk.end("shutdown"));
    for (let entry of plan)
      if (entry.call !== undefined)
        host.cutOffAgentCalls.adopt(entry.call.toolUseID, entry.agentId, (context) =>
          this.resumeAtItsCall(entry, context),
        );
  }
  async start(turnId) {
    let inBackground = this.inBackground;
    this.inBackground = [];
    this.unnamed.push(...inBackground.flatMap((entry) => (entry.call ? entry.agentId : [])));
    if (this.unnamed.length > 0 && this.noteUuid === undefined && !this.setUpAbort.signal.aborted) {
      let noteUuid = randomUUID();
      this.noteUuid = noteUuid;
      runSafely(() =>
        this.host.messageQueue.enqueuePendingNotification({
          value: formatTaskNotification({
            body: `
${containerRestartAgentsNote(this.unnamed)}`,
          }),
          uuid: noteUuid,
          agentId: mainAgentId(),
          mode: "task-notification",
          skipAttachments: true,
          priority: "next",
          shouldQuery: false,
          passive: true,
          ...(turnId !== undefined && {
            ccrTurnId: turnId,
          }),
        }),
      );
    }
    if (inBackground.length === 0) return;
    this.inStartingTurn = true;
    await this.host.connectorsJoined().catch(logError);
    await Promise.all(inBackground.map((entry) => this.resume(entry).catch(logError)));
  }
  keptAskOf(agentId) {
    return this.keptAsk?.agentId === agentId ? this.keptAsk : undefined;
  }
  async resume(entry) {
    let { agentId } = entry;
    let keptAsk = this.keptAskOf(agentId);
    let started = false;
    let context;
    try {
      if (this.setUpAbort.signal.aborted || this.host.exiting()) {
        logFeatureSad("ccr_recorded_agent_resume", this.setUpAbort.signal.aborted ? "stopped" : "exiting");
        return;
      }
      await updateAgentMetadata(
        agentId,
        {
          restartResumes: entry.restartResumes,
        },
        this.host.storageV5,
      );
      context = {
        ...(await this.host.contextForResume()),
        abortController: this.setUpAbort,
      };
      if (this.host.exiting()) {
        logFeatureSad("ccr_recorded_agent_resume", "exiting");
        return;
      }
      assertAgentResumeAllowed(context, entry.agentType);
      let outcome = await resumeAgentBackground({
        agentId,
        prompt: entry.description,
        continueInterruptedTurn: true,
        waitingToolUse: parkedAskHandle(keptAsk),
        toolUseContext: context,
        canUseTool: this.host.canUseTool,
      });
      if (isResumeDenied(outcome)) {
        logFeatureSad("ccr_recorded_agent_resume", "denied_by_plugin");
        formatAgentRestartFailedNotice(
          this.asThisSessionSeesIt(entry, context),
          outcome.deniedByPlugin,
          "starts_a_turn",
        );
      } else if (outcome.alreadyCompleted) {
        logFeatureSad("ccr_recorded_agent_resume", "already_completed");
        formatOrphanedAgentNotification(
          {
            ...this.asThisSessionSeesIt(entry, context),
            outputFile: outcome.outputFile,
          },
          context.taskRegistry,
          "starts_a_turn",
        );
      } else {
        logFeatureOk("ccr_recorded_agent_resume");
        started = true;
        this.running.add(agentId);
        if (this.setUpAbort.signal.aborted) this.host.stopAgents(new Set([agentId]));
      }
    } catch (error) {
      let outcome = reportAgentResumeOutcome(error, this.setUpAbort.signal.aborted);
      if (outcome === "refused" || outcome === "threw") {
        logForDebugging(`[recordedAgentResume] agent ${agentId} was not resumed: ${errorMessage(error)}`, {
          level: "warn",
        });
        formatAgentRestartFailedNotice(
          this.asThisSessionSeesIt(entry, context),
          errorMessage(error),
          "starts_a_turn",
        );
      }
    } finally {
      if (!started) keptAsk?.end("not_resumed");
    }
  }
  async resumeAtItsCall(entry, context) {
    let { agentId } = entry;
    let keptAsk = this.keptAskOf(agentId);
    await this.host.connectorsJoined().catch(logError);
    let aborted = context.abortController.signal.aborted || this.setUpAbort.signal.aborted;
    if (aborted || this.host.exiting()) {
      logFeatureSad("ccr_recorded_agent_resume", aborted ? "stopped" : "exiting");
      keptAsk?.end("not_resumed");
      throw aborted
        ? new AbortError()
        : new ResumeAgentStateError("The session is ending or out of budget, so the agent was not resumed.");
    }
    try {
      assertAgentResumeAllowed(context, entry.agentType);
      await updateAgentMetadata(
        agentId,
        {
          restartResumes: entry.restartResumes,
        },
        this.host.storageV5,
      );
      let outcome = await resumeAgentAtItsCall({
        agentId,
        prompt: entry.description,
        continueInterruptedTurn: true,
        waitingToolUse: parkedAskHandle(keptAsk),
        toolUseContext: context,
        canUseTool: this.host.canUseTool,
      });
      if (isResumeDenied(outcome)) {
        logFeatureSad("ccr_recorded_agent_resume", "denied_by_plugin");
        keptAsk?.end("not_resumed");
      } else if (outcome.alreadyCompleted) {
        logFeatureSad("ccr_recorded_agent_resume", "already_completed");
        keptAsk?.end("not_resumed");
      } else {
        logFeatureOk("ccr_recorded_agent_resume", {
          at_its_call: true,
        });
        if (outcome.movedRunEnded === undefined) keptAsk?.end("not_asked");
        else outcome.movedRunEnded.then(() => keptAsk?.end("not_asked")).catch(logError);
      }
      return outcome;
    } catch (error) {
      if (isResumedInlineRunError(error)) {
        logFeatureOk("ccr_recorded_agent_resume", {
          at_its_call: true,
        });
        keptAsk?.end("not_asked");
      } else {
        reportAgentResumeOutcome(error, context.abortController.signal.aborted);
        keptAsk?.end("not_resumed");
      }
      throw error;
    }
  }
  withdrawNote() {
    let noteUuid = this.noteUuid;
    if (noteUuid === undefined) return false;
    this.noteUuid = undefined;
    return this.host.messageQueue.removeByFilter((message) => message.uuid === noteUuid).length > 0;
  }
  async noteTurnEnd(deferred) {
    this.inStartingTurn = false;
    try {
      if (this.noteUuid !== undefined && !this.withdrawNote()) this.unnamed = [];
      if (
        this.host.messageQueue
          .getCommandQueueSnapshot()
          .some((queued) => queued.mode === "orphaned-permission")
      )
        return;
      let filtered = this.planned.filter(
        (entry) =>
          entry.call !== undefined &&
          this.host.cutOffAgentCalls.take(entry.call.toolUseID)?.resume !== undefined,
      );
      if (filtered.length === 0) return;
      if (deferred) this.inBackground.push(...filtered);
      let context = deferred ? undefined : await this.host.contextForResume();
      let reportFailures = !deferred && !this.setUpAbort.signal.aborted;
      for (let entry of filtered) {
        logFeatureSad("ccr_recorded_agent_resume", "call_not_reached");
        if (!deferred) this.keptAskOf(entry.agentId)?.end("not_resumed");
        if (reportFailures)
          formatAgentRestartFailedNotice(
            this.asThisSessionSeesIt(entry, context),
            "the call that was waiting on it could not be run again after the container was restarted",
            "starts_a_turn",
          );
      }
    } catch (error) {
      if (!isAbortError(error)) logError(error);
    }
  }
  asThisSessionSeesIt(entry, context) {
    let view = {
      agentId: entry.agentId,
      description: entry.description,
      isWebFetchLaunch: false,
      canReadOutputFile: context !== undefined,
      canContinueAgent: context !== undefined,
    };
    return context === undefined
      ? view
      : withResumeCapabilities(view, {
          kind: "runningPool",
          tools: context.options.tools,
        });
  }
  stop() {
    if (this.setUpAbort.signal.aborted) return;
    runSafely(() => {
      this.setUpAbort.abort();
      this.keptAsk?.end("stopped");
      this.withdrawNote();
      let agentIds = new Set(
        this.planned
          .filter(({ agentId, waitedOn }) => waitedOn && this.inStartingTurn && this.running.has(agentId))
          .map((entry) => entry.agentId),
      );
      if (agentIds.size > 0) this.host.stopAgents(agentIds);
    });
  }
}
//@ chunk-tyg7f3ek.js:408941-409147 placement
function reportAgentResumeOutcome(error, aborted) {
  let outcome =
    aborted || isAbortError(error)
      ? "stopped"
      : error instanceof AgentResumeInProgressError
        ? "in_progress"
        : error instanceof ResumeAgentStateError
          ? "refused"
          : "threw";
  if (outcome === "threw") {
    logFeatureBad("ccr_recorded_agent_resume", outcome);
    logError(error);
  } else logFeatureSad("ccr_recorded_agent_resume", outcome);
  return outcome;
}
//@ chunk-tyg7f3ek.js:409147-409164 placement
var AGENT_RESUME_WAIT_MS; // deferred: uses LOOP_WAKE_LIMITS (../../utils/loop/loopWakeups.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tyg7f3ek.js:409147", () => {
  AGENT_RESUME_WAIT_MS = MAX_LOOP_AGE_SECONDS * 1000;
});
//@ chunk-tyg7f3ek.js:409164-409196 placement
async function listResumableAgentsStub(options, host) {
  return [];
}
//@ chunk-tyg7f3ek.js:409196-409217 placement
var MAX_BRIDGE_SESSION_LOG; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var renderedDialogKinds;
deferInit("chunk-tyg7f3ek.js:409196", () => {
  MAX_BRIDGE_SESSION_LOG = 32;
  renderedDialogKinds = new Set();
});
//@ chunk-tyg7f3ek.js:409217-409261 placement
function isBridgeSessionLive(target) {
  return isTeleportedSession(target.bridgeSessionId);
}
//@ chunk-tyg7f3ek.js:409261-413645 placement
/**
 * headless 模式下 Remote Control 桥（bridge:sdk）的启停与登录变化监控；在令牌未被服务器背书或登录变化时撤下桥。
 */
function createBridgeSdkController(options) {
  let { storageV5 } = options;
  let sessionRecord = makeRecord(getCurrentSessionBridge(), renderedDialogKinds);
  let login;
  let serverVouch;
  let activeBridge = null;
  let vetoed = false;
  let identityChangedFlag = false;
  let armedSessionId;
  let retiredRecords = [];
  function canPersist() {
    if (vetoed) return false;
    if (identityChangedFlag) return false;
    if (serverVouch && !serverVouch.holds()) {
      logForDebugging(
        "[bridge:sdk] The bearer is not one the server has vouched for \u2014 the transcript record is left as last written",
        {
          level: "warn",
        },
      );
      return false;
    }
    let oauthAccountInfo = getOauthAccountInfo();
    if (
      login?.accountUuid &&
      oauthAccountInfo?.accountUuid &&
      !sameOwnerAccount(oauthAccountInfo, login) &&
      !sameOwnerAccount(oauthAccountInfo, serverVouch?.login)
    ) {
      logForDebugging(
        "[bridge:sdk] The login changed since this bridge was enabled \u2014 its transcript record is left as last written",
        {
          level: "warn",
        },
      );
      return false;
    }
    return true;
  }
  function makeRecord(currentSessionBridge, dialogKinds) {
    return {
      sessionId: getSessionId(),
      path: getMaterializedSessionFile() ?? undefined,
      recordId: currentSessionBridge?.id,
      recordFlag: currentSessionBridge?.noHistoryBackfill === true,
      recordOwner: currentSessionBridge?.ownerAccountUuid
        ? {
            accountUuid: currentSessionBridge.ownerAccountUuid,
            organizationUuid: currentSessionBridge.ownerOrganizationUuid,
          }
        : undefined,
      dialogKinds,
    };
  }
  function currentRecord() {
    let isSameSession = sessionRecord.sessionId === getSessionId();
    if (isSameSession) sessionRecord.path = getMaterializedSessionFile() ?? sessionRecord.path;
    return isSameSession || sessionRecord.path !== undefined ? sessionRecord : null;
  }
  function currentOwner() {
    return serverVouch ? serverVouch.login : login;
  }
  function recordOwner() {
    return sessionRecord.recordOwner ?? currentOwner();
  }
  function assessRecord(suppressed, ownerClaim, label) {
    if (suppressed) {
      logForDebugging(
        `[bridge:sdk] ${label} carries a history suppression \u2014 record left in place rather than tombstoned`,
      );
      return "final";
    }
    if (
      ownerClaim &&
      !sameOwnerAccount(currentOwner(), ownerClaim) &&
      !sameOwnerAccount(serverVouch?.claim, ownerClaim)
    ) {
      let unreadableLogin = !currentOwner()?.accountUuid;
      logForDebugging(
        `[bridge:sdk] ${label} is recorded under an identity that is not ${unreadableLogin ? "verifiable with this enable\u2019s unreadable login" : "this login\u2019s"} \u2014 record left in place`,
      );
      return unreadableLogin ? "retry" : "final";
    }
    return "allow";
  }
  function clearRecord(sessionId, path) {
    clearBridgeSession(
      sessionId,
      path,
      path
        ? {
            targetExists: true,
          }
        : undefined,
      storageV5,
    );
  }
  function retireRecord(bridge, record) {
    if (
      record.sessionId === sessionRecord.sessionId ||
      sessionIdBody(record.recordId) !== sessionIdBody(bridge.bridgeSessionId)
    )
      return false;
    let verdict = assessRecord(record.suppressed, record.ownerClaim, "Cleared conversation");
    if (verdict === "allow") clearRecord(record.sessionId, record.path);
    return verdict !== "retry";
  }
  function dropStaleRecords(bridge) {
    for (let j = retiredRecords.length - 1; j >= 0; j--)
      if (retireRecord(bridge, retiredRecords[j])) retiredRecords.splice(j, 1);
  }
  function rememberRecord(record) {
    let index = retiredRecords.findIndex((entry) => entry.sessionId === record.sessionId);
    if (index !== -1) retiredRecords.splice(index, 1);
    retiredRecords.push(record);
    if (retiredRecords.length > MAX_BRIDGE_SESSION_LOG) retiredRecords.shift();
  }
  function persist(bridge) {
    let record = currentRecord();
    if (!record || !canPersist() || isBridgeSessionLive(bridge)) return;
    let suppressed = bridge.noHistoryBackfill || record.recordFlag;
    let owner = recordOwner();
    saveBridgeSession(
      record.sessionId,
      bridge.bridgeSessionId,
      bridge.getLastSequenceNum(),
      record.path,
      [...record.dialogKinds],
      bridge.sessionGroupingId,
      suppressed,
      owner,
      {
        targetExists: true,
      },
      storageV5,
    );
    record.recordId = bridge.bridgeSessionId;
    record.recordFlag = suppressed;
    record.recordOwner = owner;
  }
  let dispose = onSessionSwitch((sessionId, kind) => {
    if (kind !== "clear") {
      if (sessionId === sessionRecord.sessionId) {
        currentRecord();
        return;
      }
      if (!activeBridge) sessionRecord = makeRecord(getCurrentSessionBridge(), renderedDialogKinds);
      return;
    }
    let previous = sessionRecord;
    let path = previous.path ?? getMaterializedSessionFile() ?? undefined;
    let candidate =
      path && previous.recordId !== undefined
        ? {
            sessionId: previous.sessionId,
            path,
            recordId: previous.recordId,
            suppressed: previous.recordFlag || activeBridge?.noHistoryBackfill === true,
            ownerClaim: previous.recordOwner,
          }
        : undefined;
    let carryBridge = activeBridge !== null && canPersist() && !isBridgeSessionLive(activeBridge);
    sessionRecord = {
      sessionId,
      path: undefined,
      recordId: carryBridge ? activeBridge.bridgeSessionId : undefined,
      recordFlag: carryBridge && activeBridge.noHistoryBackfill,
      recordOwner: carryBridge ? currentOwner() : undefined,
      dialogKinds: previous.dialogKinds,
    };
    if (!carryBridge) {
      if (candidate) rememberRecord(candidate);
      return;
    }
    let bridge = activeBridge;
    if (candidate && !retireRecord(bridge, candidate)) rememberRecord(candidate);
    restoreSessionMetadata({
      bridgeSessionId: bridge.bridgeSessionId,
      bridgeLastSeq: bridge.getLastSequenceNum(),
      bridgeDialogKinds: [...sessionRecord.dialogKinds],
      bridgeSessionGroupingId: bridge.sessionGroupingId,
      bridgeNoHistoryBackfill: bridge.noHistoryBackfill || undefined,
      bridgeOwnerAccountUuid: currentOwner()?.accountUuid,
      bridgeOwnerOrganizationUuid: currentOwner()?.organizationUuid,
    });
  });
  return {
    armForEnable(dialogKinds) {
      let currentSessionBridge = getCurrentSessionBridge();
      let previous = sessionRecord;
      sessionRecord = makeRecord(currentSessionBridge, dialogKinds);
      if (
        currentSessionBridge === undefined &&
        previous.sessionId === sessionRecord.sessionId &&
        previous.recordId !== undefined
      ) {
        sessionRecord.recordId = previous.recordId;
        sessionRecord.recordFlag = previous.recordFlag;
        sessionRecord.recordOwner = previous.recordOwner;
      }
      login = undefined;
      serverVouch = undefined;
      vetoed = false;
      identityChangedFlag = false;
      armedSessionId = sessionRecord.sessionId;
      return currentSessionBridge ?? null;
    },
    setLoginIdentity(identity) {
      login = identity;
    },
    identityChanged(identity) {
      let owner = currentOwner();
      if (owner?.accountUuid && identity?.accountUuid && sameOwnerAccount(identity, owner)) return;
      identityChangedFlag = true;
      login = undefined;
      serverVouch = undefined;
    },
    armedConversationRotated() {
      return armedSessionId !== undefined && sessionRecord.sessionId !== armedSessionId;
    },
    attached(bridge) {
      activeBridge = bridge;
      armedSessionId = undefined;
      serverVouch = bridge.serverVouch;
      if (bridge.ownerVetoed) {
        vetoed = true;
        logForDebugging(
          "[bridge:sdk] Reattach was vetoed on owner identity \u2014 the transcript record is left in place; this bridge is not persisted",
          {
            level: "warn",
          },
        );
        return;
      }
      if (bridge.getWorkerBearerToken) {
        let record = canPersist() ? currentRecord() : null;
        if (
          record?.recordId !== undefined &&
          sessionIdBody(record.recordId) === sessionIdBody(bridge.bridgeSessionId) &&
          assessRecord(record.recordFlag, record.recordOwner, "Host-served record") === "allow"
        ) {
          clearRecord(record.sessionId, record.path);
          record.recordId = undefined;
          record.recordFlag = false;
          record.recordOwner = undefined;
        }
        vetoed = true;
        return;
      }
      if (!canPersist()) return;
      dropStaleRecords(bridge);
      persist(bridge);
    },
    enableFailed() {
      armedSessionId = undefined;
      login = undefined;
      serverVouch = undefined;
    },
    persist,
    noteTranscriptLocation() {
      currentRecord();
    },
    release(bridge, { keepRecord }) {
      let record = canPersist() ? currentRecord() : null;
      if (record)
        if (
          keepRecord ||
          assessRecord(
            bridge.noHistoryBackfill || record.recordFlag,
            record.recordOwner,
            "Disconnected conversation",
          ) !== "allow"
        )
          persist(bridge);
        else {
          clearRecord(record.sessionId, record.path);
          record.recordId = undefined;
          record.recordFlag = false;
          record.recordOwner = undefined;
        }
      activeBridge = null;
      vetoed = false;
      identityChangedFlag = false;
      armedSessionId = undefined;
      login = undefined;
      serverVouch = undefined;
      sessionRecord = {
        ...sessionRecord,
        dialogKinds: renderedDialogKinds,
      };
    },
    dispose,
  };
}
//@ chunk-tyg7f3ek.js:413645-413777 placement
function applyHostRendersChromeSetupOffer(rendersChromeSetupOffer, session) {
  if (rendersChromeSetupOffer !== true || getHostRendersChromeSetupOffer()) return;
  setHostRendersChromeSetupOffer(true);
  session.sessionState.notifyInternalMetadataChanged({
    host_renders_chrome_setup_offer: true,
  });
}
//@ chunk-tyg7f3ek.js:413777-413807 placement
function markHostRendersChromeSetupOffer() {
  if (isClaudeAiChatCowork()) setHostRendersChromeSetupOffer(true);
}
//@ chunk-tyg7f3ek.js:413807-414223 placement
function chromeSetupOfferKey(sessionState) {
  isChromeSetupOfferEnabled();
  let chromeState = claudeInChromeSession();
  let disconnected = hasDisconnectedChromeAnswer();
  if (chromeState.chromeSetupOfferStateUnread) return `${disconnected}:${chromeState.chromeSetupOfferArm}`;
  if (disconnected && !chromeState.notConnectedMirrored) {
    chromeState.notConnectedMirrored = true;
    sessionState.notifyInternalMetadataChanged({
      chrome_not_connected_seen: true,
    });
  }
  let chromeSetupOfferArm = chromeState.chromeSetupOfferArm;
  if (chromeSetupOfferArm !== undefined && !chromeState.chromeSetupOfferArmMirrored) {
    chromeState.chromeSetupOfferArmMirrored = true;
    sessionState.notifyInternalMetadataChanged({
      chrome_setup_offer_arm: chromeSetupOfferArm,
    });
  }
  return `${disconnected}:${chromeSetupOfferArm}`;
}
//@ chunk-tyg7f3ek.js:414223-414594 placement
function restoreChromeSetupOfferState(chromeSetupState) {
  if (chromeSetupState?.readFailed === true) {
    claudeInChromeSession().chromeSetupOfferStateUnread = true;
    return;
  }
  let internal = chromeSetupState?.internal;
  if (internal?.host_renders_chrome_setup_offer === true) setHostRendersChromeSetupOffer(true);
  let chromeState = claudeInChromeSession();
  if (internal?.chrome_not_connected_seen === true) {
    markNotConnectedByPriorWorker();
    chromeState.notConnectedMirrored = true;
  }
  let chromeSetupOfferArm = internal?.chrome_setup_offer_arm;
  if (
    (chromeSetupOfferArm === true || chromeSetupOfferArm === false) &&
    chromeState.chromeSetupOfferArm === undefined
  ) {
    chromeState.chromeSetupOfferArm = chromeSetupOfferArm;
    chromeState.chromeSetupOfferArmMirrored = true;
  }
}
//@ chunk-tyg7f3ek.js:414594-414807 placement
/**
 * 为 SDK result 消息加 result_index 与自上次结果以来的模型用量，并去重。
 */
function createResultStamper(takeUsageSinceLastResult) {
  let nextIndex = 0;
  let weakSet = new WeakSet();
  return {
    stamp(result) {
      if (weakSet.has(result)) return result;
      let usage = takeUsageSinceLastResult();
      let stamped = {
        ...result,
        result_index: nextIndex++,
        ...(usage && {
          model_usage_since_last_result: usage,
        }),
        ...processStartTuningFields(),
        ...garbageCollectionFields(),
      };
      weakSet.add(stamped);
      return stamped;
    },
    get numbered() {
      return nextIndex;
    },
  };
}
//@ chunk-tyg7f3ek.js:414881-414909 placement
var CONTEXT_INSTRUCTIONS_NOTICE_FLAG = "tengu_jolly_aurora";
//@ chunk-tyg7f3ek.js:414909-414956 placement
function isHeadlessNoticeEligible() {
  return (
    getIsNonInteractiveSession() && isDesktopTopSession() && !isClaudecodeSession() && !hostScheduledRun()
  );
}
//@ chunk-tyg7f3ek.js:414956-415179 placement
function contextInstructionsOverLimitPayload(report) {
  if (!report.totalOverLimit) return null;
  return {
    total_chars: report.totalChars,
    total_limit_chars: report.totalLimitChars,
    file_count: report.fileCount,
    ...(report.fileCount > 1 &&
      report.largestChars > report.totalLimitChars && {
        largest_chars: report.largestChars,
      }),
  };
}
//@ chunk-tyg7f3ek.js:415179-415693 placement
/**
 * headless 会话启动时检查 CLAUDE.md 等上下文指令是否超长，超出则返回提示载荷。
 */
async function checkContextInstructionsSize(limitsPromise, sessionId, options) {
  try {
    if (!isHeadlessNoticeEligible()) return null;
    let limits = await limitsPromise;
    if (limits === undefined) return null;
    let report = memoryFileLimits(limits, options);
    let payload = contextInstructionsOverLimitPayload(report);
    if (payload === null) return null;
    if (!getFeatureValue_CACHED_MAY_BE_STALE(CONTEXT_INSTRUCTIONS_NOTICE_FLAG, false)) return null;
    logFeatureOk("context_instruction_size_warning", {
      total_chars: report.totalChars,
      total_limit_chars: report.totalLimitChars,
      limit_chars: report.limitChars,
      file_count: report.fileCount,
      files_over_limit: report.filesOverLimit,
    });
    return {
      type: "system",
      subtype: "instruction_size_warning",
      ...payload,
      uuid: randomUUID(),
      session_id: sessionId,
    };
  } catch (error) {
    if (!isAbortError(error)) {
      logError(error);
      logFeatureBad("context_instruction_size_warning", "threw");
    }
    return null;
  }
}
//@ chunk-tyg7f3ek.js:415693-416169 placement
function gatewayCodeTabRulesNotice(session) {
  try {
    let gatewayAuth = getGatewayAuth();
    let hostVerdict = gatewayAuth?.hostVerdict;
    if (
      !gatewayAuth ||
      !hostVerdict ||
      "unresolvedReason" in hostVerdict ||
      hostVerdict.verified ||
      hostVerdict.hasCodeTabRules === false
    )
      return null;
    if (!isHeadlessNoticeEligible() || isTransportBacked(session)) return null;
    let { origin, pathname } = new URL(gatewayAuth.url);
    return informationalSystemMessage(
      createSystemMessage(
        `Rules your organization sets on the gateway at ${origin}${pathname.replace(/\/$/, "")}, such as blocked commands, may not apply in this session. Claude Code doesn't take settings from that gateway${hostVerdict.reason ? `: ${hostVerdict.reason}` : "."}`,
        "warning",
      ),
    );
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return null;
  }
}
//@ chunk-tyg7f3ek.js:416169-416207 placement
var chromeSetupModule; // deferred: loads other modules while loading; runs once its import cycle is complete
deferInit("chunk-tyg7f3ek.js:416169", () => {
  chromeSetupModule = require("../../services/teleport/relayState.js");
});
export {
  isIterativeHavenGateOn,
  createResultStamper,
  collectResumableAgentIds,
  planRecordedAgentResumes,
  resumeCutOffAgents,
  formatRestartedAgentsReminder,
  listResumableAgentsStub,
  restoreChromeSetupOfferState,
  markHostRendersChromeSetupOffer,
  holdParkedAgentAsk,
  createBridgeSdkController,
  chromeSetupOfferKey,
  RecordedAgentResumeRun,
  classifyArtifactThreadMessage,
  resumeArtifactThreadAgent,
  readArtifactThreadHeader,
  applyHostRendersChromeSetupOffer,
  chromeSetupModule,
  checkContextInstructionsSize,
  gatewayCodeTabRulesNotice,
};
