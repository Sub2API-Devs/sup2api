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
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isTransportBacked } from "../transportState.js";
import { informationalSystemMessage } from "./sdkMessageStream.js";

//@ chunk-tyg7f3ek.js:396442-396583 placement
/**
 * 从用户消息中解析 artifact 线程回复头（带 viewer URL），仅在已声明且开关开启时返回。
 */
function readArtifactThreadHeader(e) {
  if (e.declared !== true || !isPlainPersonMessage(e) || !isThreadAgentEnabled() || !isArtifactsAvailable())
    return null;
  let artifactThreadMessage = parseArtifactThreadMessage(e.value);
  return artifactThreadMessage === null
    ? null
    : {
        ...artifactThreadMessage.header,
        url: artifactViewerUrlFor(artifactThreadMessage.artifact),
      };
}
//@ chunk-tyg7f3ek.js:396583-396699 placement
function classifyArtifactThreadMessage(e) {
  if (!isPlainPersonMessage(e) || parseArtifactThreadMessage(e.value) === null) return;
  if (e.declared !== true) return "unmarked";
  return isArtifactsAvailable() ? "seeded" : undefined;
}
//@ chunk-tyg7f3ek.js:396699-397362 placement
/**
 * 处理来自 artifact 评论线程的后续消息：查找持有该线程的子代理并恢复执行。
 */
async function resumeArtifactThreadAgent(e, n) {
  if (n.exiting) return false;
  let { slug, threadId, url } = e;
  let y = {
    slug,
    threadId,
    gestureAt: e.gestureAt,
    suppressed: false,
    storageV5: n.storageV5,
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
        canUseTool: n.canUseTool,
        summon: y,
        onSettled: (P) => n.onLifecycle(P),
        route: "seeded",
      })
    ).outcome === "fallback"
  )
    return false;
  try {
    n.onLifecycle("queued");
    n.onLifecycle("started");
    emitArtifactSummonStatus(y, {
      status: "working",
    });
  } catch (error) {
    logError(error);
  }
  return true;
}
//@ chunk-tyg7f3ek.js:397362-397486 placement
function isPlainPersonMessage(e) {
  return (
    e.isSynthetic !== true &&
    !e.peerDelivered &&
    e.inboundOrigin === undefined &&
    e.shouldQuery !== false &&
    !e.hasAttachments
  );
}
//@ chunk-tyg7f3ek.js:397486-397675 placement
function parseArtifactThreadMessage(e) {
  let promptText = getPromptText(e);
  let r = promptText === null ? null : parseCommentNotification(promptText);
  if (promptText === null || r === null) return null;
  let s =
    promptText.split(
      `
`,
      2,
    )[1] ?? "";
  let artifactUrl = parseArtifactUrl(s.slice(ARTIFACT_LINE_PREFIX.length).trim());
  return artifactUrl === null
    ? null
    : {
        header: r,
        artifact: artifactUrl,
      };
}
//@ chunk-tyg7f3ek.js:397675-397753 placement
function collectResumableAgentIds(supersededToolNames) {
  let n = new Set();
  for (let [r, s] of supersededToolNames ?? []) if (isAgentOrTaskTool(s)) n.add(r);
  return n;
}
//@ chunk-tyg7f3ek.js:397753-397961 placement
function recordedAgentCallsFor(e, n) {
  let filtered = dedupeTasksById(Array.isArray(e) ? e : []).filter(
    (h) => typeof h.tool_use_id === "string" && n.has(h.tool_use_id),
  );
  let s = Map.groupBy(filtered, (h) => h.tool_use_id);
  return filtered.filter((h) => s.get(h.tool_use_id)?.length === 1);
}
//@ chunk-tyg7f3ek.js:397961-398370 placement
/**
 * 容器重启后，从转录中找出上一轮未回答的 Agent 调用，规划自动恢复。
 */
async function planRecordedAgentResumes({ recorded, agentCallIds, known, hasTool, settleFlags }) {
  let filtered = recordedAgentCallsFor(recorded, agentCallIds).filter((w) => !known.has(w.task_id));
  if (filtered.length === 0 || !hasTool(SENDMESSAGE)) return [];
  await settleFlags();
  if (!isIterativeHavenGateOn()) return [];
  let filtered_2 = filtered.filter(getTaskOutputData);
  let R = {
    agent_calls: agentCallIds.size,
    agents_found: filtered.length,
  };
  if (filtered_2.length === 0) {
    logFeatureSad("ccr_cut_off_agents", "not_eligible", R);
    return [];
  }
  logFeatureOk("ccr_cut_off_agents", {
    ...R,
    agents_offered: filtered_2.length,
  });
  rememberResumableAgents(filtered_2.map((w) => w.task_id));
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
function formatRestartedAgentsReminder(e, n = false) {
  let mapped = e.map(
    (s) => `- ${escapeXml(sanitizeMetadataText(s.description) ?? "(no description)")} (agent ${s.task_id})`,
  );
  if (n)
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
var UNDERIVABLE_AGENT_REASONS = new Set([
  "underivable_no_superseded",
  "underivable_leaf_only",
  "underivable_excluded",
]);
//@ chunk-tyg7f3ek.js:399990-400673 placement
function findParkedAgentAsk(restored, bootPark, cutOffCallIds) {
  let pendingAction = restored?.external?.pending_action;
  let h = requestIdOf(pendingAction);
  let { pendingActionClass } = bootPark;
  if (
    !isIterativeHavenGateOn() ||
    !pendingAction ||
    h === undefined ||
    pendingAction.request_id !== h ||
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
      ? recordedAgentCallsFor(restored?.internal?.running_foreground_agents, cutOffCallIds)
      : []),
    ...(UNDERIVABLE_AGENT_REASONS.has(pendingActionClass) && Array.isArray(runningBackgroundTasks)
      ? dedupeTasksById(runningBackgroundTasks)
      : []),
  ].find((w) => w.task_id === pendingAction.agent_id);
  if (task === undefined || !getTaskOutputData(task)) return;
  return {
    card: {
      request_id: h,
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
  constructor(card, agentId, answerKind, s, answerOff) {
    this.card = card;
    this.agentId = agentId;
    this.io = s;
    this.ask = new PermissionCardAsk({
      card,
      answerKind,
      waitMs: PERMISSION_ANSWER_WAIT_MS,
      maxAnswerAgeMs: MAX_PARKED_ANSWER_AGE_MS,
      allowWithoutInputIsEcho: true,
      withdrawCard: (requestId) =>
        s.write({
          type: "control_cancel_request",
          request_id: requestId,
        }),
      unreadAnswersRead: () => {
        let y = s.whenReceivedAnswersRead();
        return y && withDeadline(y, PERMISSION_ANSWER_WAIT_MS);
      },
      answerOff: async () => (await answerOff?.()) ?? "absent",
    });
    this.ask.startTimer();
    s.holdKeptAsk(this);
  }
  async answerFor(e) {
    try {
      if (!e.usable()) this.end("ask_needs_own_card");
      if (e.toolName !== this.card.details?.tool_name) this.end("tool_differs");
      if (this.ended) return;
      let { answer, unused } = await this.ask.answerFor(e);
      if (answer === undefined || unused !== undefined) this.end(unused ?? "no_answer");
      if (!e.usable()) this.end("ask_needs_own_card");
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
  end(e) {
    if (this.ended) return;
    this.ended = true;
    this.io.holdKeptAsk(undefined);
    this.ask.stop(e === "stopped" || e === "shutdown" ? e : "not_asked");
    if (e === "answer_threw") logFeatureBad("ccr_subagent_ask_hold", e);
    else logFeatureSad("ccr_subagent_ask_hold", e);
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
      !planned.some((w) => w.agentId === parkedAgentAsk.agent.task_id)
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
function isAgentToolAllowedByRules(e, context, agentType, s) {
  let found = e.find((y) => toolMatchesName(y, AGENT));
  return (
    found !== undefined &&
    getDenyRuleForTool(context, found) === null &&
    getAskRuleForTool(context, found) === null &&
    findDenyRuleWithContent(context, AGENT, agentType) === null &&
    findAskRuleWithContent(context, AGENT, agentType) === null &&
    (s === undefined ||
      ["deny", "ask"].every(
        (y) =>
          matchToolRule(
            context,
            found,
            {
              subagent_type: agentType,
              model: s,
              run_in_background: true,
            },
            y,
          ) === null,
      ))
  );
}
//@ chunk-tyg7f3ek.js:402417-402459 placement
function canResumeAgentsInBackground(tools, toolPermissionContext, r) {
  return !isForegroundAgentMoveOff() && isAgentToolAllowedByRules(tools, toolPermissionContext, r);
}
//@ chunk-tyg7f3ek.js:402459-402539 placement
function parkedAskHandle(e) {
  return (
    e && {
      id: e.card.tool_use_id,
      settled: () => e.end("not_asked"),
    }
  );
}
//@ chunk-tyg7f3ek.js:402539-402722 placement
function assertAgentResumeAllowed(e, agentType) {
  if (!canResumeAgentsInBackground(e.options.tools, getToolPermissionContext(e), agentType))
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
    let q = [
      ...cutOff.map((ce) => ({
        agent: ce,
        toolUseID: ce.tool_use_id,
      })),
      ...stopped
        .filter((ce) => getTaskOutputData(ce) || alsoResumable?.has(ce.task_id))
        .map((agent) => ({
          agent,
          toolUseID: undefined,
        })),
    ];
    let sliced = (
      await Promise.all(
        q.map(async ({ agent, toolUseID }) => {
          let ie = normalizeAgentIdOrNull(agent.task_id);
          if (ie === null) return;
          let agentMetadata = await readAgentMetadata(ie, storageV5);
          let me = agentMetadata ? validateAgentMetadata(agentMetadata) : undefined;
          let restartResumes = me?.restartResumes ?? 0;
          if (
            me === undefined ||
            !isRestorableDefaultLaunchedAgent(me) ||
            restartResumes >= MAX_AGENT_FORK_DEPTH ||
            me.agentType === WEB_FETCH_AGENT ||
            !canResumeAgentsInBackground(tools, toolPermissionContext, me.agentType)
          )
            return;
          return {
            agentId: ie,
            agentType: me.agentType,
            description: me.description ?? agent.description,
            toolUseID,
            waitedOn: toolUseID !== undefined,
            restartResumes: restartResumes + 1,
          };
        }),
      )
    )
      .filter((ce) => ce !== undefined)
      .slice(0, maxConcurrentSubagents());
    let Z = startsSpent();
    let re = Z ? [] : sliced.flatMap((ce) => ce.toolUseID ?? []);
    let Ae =
      re.length > 0 && re.length === unresolvedCallIds.size && re.every((ce) => unresolvedCallIds.has(ce))
        ? await findCalls(re)
        : new Map();
    let Ue = re.length > 0 && re.every((ce) => Ae.has(ce));
    if (re.length > 0 && !Ue)
      logFeatureSad("ccr_recorded_agent_resume", "calls_not_run_again", {
        agent_calls: re.length,
        unresolved_calls: unresolvedCallIds.size,
      });
    return sliced.flatMap(({ toolUseID, ...nt }) => {
      if (toolUseID === undefined || Z) return [nt];
      let ie = Ue ? Ae.get(toolUseID) : undefined;
      return ie === undefined
        ? []
        : [
            {
              ...nt,
              call: {
                toolUseID,
                assistantMessage: ie,
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
  constructor(e, n, r, keptSubagentAsk) {
    this.planned = e;
    this.inBackground = e.filter((h) => h.call === undefined);
    this.host = n;
    this.keptAsk = keptSubagentAsk;
    if (keptSubagentAsk !== undefined) r.then(() => keptSubagentAsk.end("shutdown"));
    for (let h of e)
      if (h.call !== undefined)
        n.cutOffAgentCalls.adopt(h.call.toolUseID, h.agentId, (y) => this.resumeAtItsCall(h, y));
  }
  async start(e) {
    let inBackground = this.inBackground;
    this.inBackground = [];
    this.unnamed.push(...inBackground.flatMap((r) => (r.call ? r.agentId : [])));
    if (this.unnamed.length > 0 && this.noteUuid === undefined && !this.setUpAbort.signal.aborted) {
      let r = randomUUID();
      this.noteUuid = r;
      runSafely(() =>
        this.host.messageQueue.enqueuePendingNotification({
          value: formatTaskNotification({
            body: `
${containerRestartAgentsNote(this.unnamed)}`,
          }),
          uuid: r,
          agentId: mainAgentId(),
          mode: "task-notification",
          skipAttachments: true,
          priority: "next",
          shouldQuery: false,
          passive: true,
          ...(e !== undefined && {
            ccrTurnId: e,
          }),
        }),
      );
    }
    if (inBackground.length === 0) return;
    this.inStartingTurn = true;
    await this.host.connectorsJoined().catch(logError);
    await Promise.all(inBackground.map((r) => this.resume(r).catch(logError)));
  }
  keptAskOf(e) {
    return this.keptAsk?.agentId === e ? this.keptAsk : undefined;
  }
  async resume(e) {
    let { agentId } = e;
    let r = this.keptAskOf(agentId);
    let s = false;
    let h;
    try {
      if (this.setUpAbort.signal.aborted || this.host.exiting()) {
        logFeatureSad("ccr_recorded_agent_resume", this.setUpAbort.signal.aborted ? "stopped" : "exiting");
        return;
      }
      await updateAgentMetadata(
        agentId,
        {
          restartResumes: e.restartResumes,
        },
        this.host.storageV5,
      );
      h = {
        ...(await this.host.contextForResume()),
        abortController: this.setUpAbort,
      };
      if (this.host.exiting()) {
        logFeatureSad("ccr_recorded_agent_resume", "exiting");
        return;
      }
      assertAgentResumeAllowed(h, e.agentType);
      let y = await resumeAgentBackground({
        agentId,
        prompt: e.description,
        continueInterruptedTurn: true,
        waitingToolUse: parkedAskHandle(r),
        toolUseContext: h,
        canUseTool: this.host.canUseTool,
      });
      if (isResumeDenied(y)) {
        logFeatureSad("ccr_recorded_agent_resume", "denied_by_plugin");
        formatAgentRestartFailedNotice(this.asThisSessionSeesIt(e, h), y.deniedByPlugin, "starts_a_turn");
      } else if (y.alreadyCompleted) {
        logFeatureSad("ccr_recorded_agent_resume", "already_completed");
        formatOrphanedAgentNotification(
          {
            ...this.asThisSessionSeesIt(e, h),
            outputFile: y.outputFile,
          },
          h.taskRegistry,
          "starts_a_turn",
        );
      } else {
        logFeatureOk("ccr_recorded_agent_resume");
        s = true;
        this.running.add(agentId);
        if (this.setUpAbort.signal.aborted) this.host.stopAgents(new Set([agentId]));
      }
    } catch (error) {
      let S = reportAgentResumeOutcome(error, this.setUpAbort.signal.aborted);
      if (S === "refused" || S === "threw") {
        logForDebugging(`[recordedAgentResume] agent ${agentId} was not resumed: ${errorMessage(error)}`, {
          level: "warn",
        });
        formatAgentRestartFailedNotice(this.asThisSessionSeesIt(e, h), errorMessage(error), "starts_a_turn");
      }
    } finally {
      if (!s) r?.end("not_resumed");
    }
  }
  async resumeAtItsCall(e, n) {
    let { agentId } = e;
    let s = this.keptAskOf(agentId);
    await this.host.connectorsJoined().catch(logError);
    let aborted = n.abortController.signal.aborted || this.setUpAbort.signal.aborted;
    if (aborted || this.host.exiting()) {
      logFeatureSad("ccr_recorded_agent_resume", aborted ? "stopped" : "exiting");
      s?.end("not_resumed");
      throw aborted
        ? new AbortError()
        : new ResumeAgentStateError("The session is ending or out of budget, so the agent was not resumed.");
    }
    try {
      assertAgentResumeAllowed(n, e.agentType);
      await updateAgentMetadata(
        agentId,
        {
          restartResumes: e.restartResumes,
        },
        this.host.storageV5,
      );
      let y = await resumeAgentAtItsCall({
        agentId,
        prompt: e.description,
        continueInterruptedTurn: true,
        waitingToolUse: parkedAskHandle(s),
        toolUseContext: n,
        canUseTool: this.host.canUseTool,
      });
      if (isResumeDenied(y)) {
        logFeatureSad("ccr_recorded_agent_resume", "denied_by_plugin");
        s?.end("not_resumed");
      } else if (y.alreadyCompleted) {
        logFeatureSad("ccr_recorded_agent_resume", "already_completed");
        s?.end("not_resumed");
      } else {
        logFeatureOk("ccr_recorded_agent_resume", {
          at_its_call: true,
        });
        if (y.movedRunEnded === undefined) s?.end("not_asked");
        else y.movedRunEnded.then(() => s?.end("not_asked")).catch(logError);
      }
      return y;
    } catch (error) {
      if (isResumedInlineRunError(error)) {
        logFeatureOk("ccr_recorded_agent_resume", {
          at_its_call: true,
        });
        s?.end("not_asked");
      } else {
        reportAgentResumeOutcome(error, n.abortController.signal.aborted);
        s?.end("not_resumed");
      }
      throw error;
    }
  }
  withdrawNote() {
    let noteUuid = this.noteUuid;
    if (noteUuid === undefined) return false;
    this.noteUuid = undefined;
    return this.host.messageQueue.removeByFilter((n) => n.uuid === noteUuid).length > 0;
  }
  async noteTurnEnd(e) {
    this.inStartingTurn = false;
    try {
      if (this.noteUuid !== undefined && !this.withdrawNote()) this.unnamed = [];
      if (this.host.messageQueue.getCommandQueueSnapshot().some((y) => y.mode === "orphaned-permission"))
        return;
      let filtered = this.planned.filter(
        (y) =>
          y.call !== undefined && this.host.cutOffAgentCalls.take(y.call.toolUseID)?.resume !== undefined,
      );
      if (filtered.length === 0) return;
      if (e) this.inBackground.push(...filtered);
      let s = e ? undefined : await this.host.contextForResume();
      let h = !e && !this.setUpAbort.signal.aborted;
      for (let y of filtered) {
        logFeatureSad("ccr_recorded_agent_resume", "call_not_reached");
        if (!e) this.keptAskOf(y.agentId)?.end("not_resumed");
        if (h)
          formatAgentRestartFailedNotice(
            this.asThisSessionSeesIt(y, s),
            "the call that was waiting on it could not be run again after the container was restarted",
            "starts_a_turn",
          );
      }
    } catch (error) {
      if (!isAbortError(error)) logError(error);
    }
  }
  asThisSessionSeesIt(e, n) {
    let r = {
      agentId: e.agentId,
      description: e.description,
      isWebFetchLaunch: false,
      canReadOutputFile: n !== undefined,
      canContinueAgent: n !== undefined,
    };
    return n === undefined
      ? r
      : withResumeCapabilities(r, {
          kind: "runningPool",
          tools: n.options.tools,
        });
  }
  stop() {
    if (this.setUpAbort.signal.aborted) return;
    runSafely(() => {
      this.setUpAbort.abort();
      this.keptAsk?.end("stopped");
      this.withdrawNote();
      let e = new Set(
        this.planned
          .filter(({ agentId, waitedOn }) => waitedOn && this.inStartingTurn && this.running.has(agentId))
          .map((n) => n.agentId),
      );
      if (e.size > 0) this.host.stopAgents(e);
    });
  }
}
//@ chunk-tyg7f3ek.js:408941-409147 placement
function reportAgentResumeOutcome(error, aborted) {
  let r =
    aborted || isAbortError(error)
      ? "stopped"
      : error instanceof AgentResumeInProgressError
        ? "in_progress"
        : error instanceof ResumeAgentStateError
          ? "refused"
          : "threw";
  if (r === "threw") {
    logFeatureBad("ccr_recorded_agent_resume", r);
    logError(error);
  } else logFeatureSad("ccr_recorded_agent_resume", r);
  return r;
}
//@ chunk-tyg7f3ek.js:409147-409164 placement
var AGENT_RESUME_WAIT_MS = MAX_LOOP_AGE_SECONDS * 1000;
//@ chunk-tyg7f3ek.js:409164-409196 placement
async function listResumableAgentsStub(e, n) {
  return [];
}
//@ chunk-tyg7f3ek.js:409196-409217 placement
var MAX_BRIDGE_SESSION_LOG = 32;
var renderedDialogKinds = new Set();
//@ chunk-tyg7f3ek.js:409217-409261 placement
function isBridgeSessionLive(e) {
  return isTeleportedSession(e.bridgeSessionId);
}
//@ chunk-tyg7f3ek.js:409261-413645 placement
/**
 * headless 模式下 Remote Control 桥（bridge:sdk）的启停与登录变化监控；在令牌未被服务器背书或登录变化时撤下桥。
 */
function createBridgeSdkController(e) {
  let { storageV5 } = e;
  let r = q(getCurrentSessionBridge(), renderedDialogKinds);
  let s;
  let h;
  let y = null;
  let S = false;
  let R = false;
  let w;
  let P = [];
  function L() {
    if (S) return false;
    if (R) return false;
    if (h && !h.holds()) {
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
      s?.accountUuid &&
      oauthAccountInfo?.accountUuid &&
      !sameOwnerAccount(oauthAccountInfo, s) &&
      !sameOwnerAccount(oauthAccountInfo, h?.login)
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
  function q(currentSessionBridge, dialogKinds) {
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
  function x() {
    let me = r.sessionId === getSessionId();
    if (me) r.path = getMaterializedSessionFile() ?? r.path;
    return me || r.path !== undefined ? r : null;
  }
  function G() {
    return h ? h.login : s;
  }
  function Z() {
    return r.recordOwner ?? G();
  }
  function re(me, Me, Ee) {
    if (me) {
      logForDebugging(
        `[bridge:sdk] ${Ee} carries a history suppression \u2014 record left in place rather than tombstoned`,
      );
      return "final";
    }
    if (Me && !sameOwnerAccount(G(), Me) && !sameOwnerAccount(h?.claim, Me)) {
      let He = !G()?.accountUuid;
      logForDebugging(
        `[bridge:sdk] ${Ee} is recorded under an identity that is not ${He ? "verifiable with this enable\u2019s unreadable login" : "this login\u2019s"} \u2014 record left in place`,
      );
      return He ? "retry" : "final";
    }
    return "allow";
  }
  function Ae(sessionId, path) {
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
  function Ue(me, Me) {
    if (Me.sessionId === r.sessionId || sessionIdBody(Me.recordId) !== sessionIdBody(me.bridgeSessionId))
      return false;
    let Ee = re(Me.suppressed, Me.ownerClaim, "Cleared conversation");
    if (Ee === "allow") Ae(Me.sessionId, Me.path);
    return Ee !== "retry";
  }
  function ce(me) {
    for (let j = P.length - 1; j >= 0; j--) if (Ue(me, P[j])) P.splice(j, 1);
  }
  function nt(me) {
    let index = P.findIndex((Ee) => Ee.sessionId === me.sessionId);
    if (index !== -1) P.splice(index, 1);
    P.push(me);
    if (P.length > MAX_BRIDGE_SESSION_LOG) P.shift();
  }
  function ie(me) {
    let Me = x();
    if (!Me || !L() || isBridgeSessionLive(me)) return;
    let Ee = me.noHistoryBackfill || Me.recordFlag;
    let He = Z();
    saveBridgeSession(
      Me.sessionId,
      me.bridgeSessionId,
      me.getLastSequenceNum(),
      Me.path,
      [...Me.dialogKinds],
      me.sessionGroupingId,
      Ee,
      He,
      {
        targetExists: true,
      },
      storageV5,
    );
    Me.recordId = me.bridgeSessionId;
    Me.recordFlag = Ee;
    Me.recordOwner = He;
  }
  let dispose = onSessionSwitch((me, Me) => {
    if (Me !== "clear") {
      if (me === r.sessionId) {
        x();
        return;
      }
      if (!y) r = q(getCurrentSessionBridge(), renderedDialogKinds);
      return;
    }
    let Ee = r;
    let He = Ee.path ?? getMaterializedSessionFile() ?? undefined;
    let Xe =
      He && Ee.recordId !== undefined
        ? {
            sessionId: Ee.sessionId,
            path: He,
            recordId: Ee.recordId,
            suppressed: Ee.recordFlag || y?.noHistoryBackfill === true,
            ownerClaim: Ee.recordOwner,
          }
        : undefined;
    let We = y !== null && L() && !isBridgeSessionLive(y);
    r = {
      sessionId: me,
      path: undefined,
      recordId: We ? y.bridgeSessionId : undefined,
      recordFlag: We && y.noHistoryBackfill,
      recordOwner: We ? G() : undefined,
      dialogKinds: Ee.dialogKinds,
    };
    if (!We) {
      if (Xe) nt(Xe);
      return;
    }
    let St = y;
    if (Xe && !Ue(St, Xe)) nt(Xe);
    restoreSessionMetadata({
      bridgeSessionId: St.bridgeSessionId,
      bridgeLastSeq: St.getLastSequenceNum(),
      bridgeDialogKinds: [...r.dialogKinds],
      bridgeSessionGroupingId: St.sessionGroupingId,
      bridgeNoHistoryBackfill: St.noHistoryBackfill || undefined,
      bridgeOwnerAccountUuid: G()?.accountUuid,
      bridgeOwnerOrganizationUuid: G()?.organizationUuid,
    });
  });
  return {
    armForEnable(dialogKinds) {
      let currentSessionBridge = getCurrentSessionBridge();
      let Ee = r;
      r = q(currentSessionBridge, dialogKinds);
      if (currentSessionBridge === undefined && Ee.sessionId === r.sessionId && Ee.recordId !== undefined) {
        r.recordId = Ee.recordId;
        r.recordFlag = Ee.recordFlag;
        r.recordOwner = Ee.recordOwner;
      }
      s = undefined;
      h = undefined;
      S = false;
      R = false;
      w = r.sessionId;
      return currentSessionBridge ?? null;
    },
    setLoginIdentity(me) {
      s = me;
    },
    identityChanged(me) {
      let Me = G();
      if (Me?.accountUuid && me?.accountUuid && sameOwnerAccount(me, Me)) return;
      R = true;
      s = undefined;
      h = undefined;
    },
    armedConversationRotated() {
      return w !== undefined && r.sessionId !== w;
    },
    attached(me) {
      y = me;
      w = undefined;
      h = me.serverVouch;
      if (me.ownerVetoed) {
        S = true;
        logForDebugging(
          "[bridge:sdk] Reattach was vetoed on owner identity \u2014 the transcript record is left in place; this bridge is not persisted",
          {
            level: "warn",
          },
        );
        return;
      }
      if (me.getWorkerBearerToken) {
        let Me = L() ? x() : null;
        if (
          Me?.recordId !== undefined &&
          sessionIdBody(Me.recordId) === sessionIdBody(me.bridgeSessionId) &&
          re(Me.recordFlag, Me.recordOwner, "Host-served record") === "allow"
        ) {
          Ae(Me.sessionId, Me.path);
          Me.recordId = undefined;
          Me.recordFlag = false;
          Me.recordOwner = undefined;
        }
        S = true;
        return;
      }
      if (!L()) return;
      ce(me);
      ie(me);
    },
    enableFailed() {
      w = undefined;
      s = undefined;
      h = undefined;
    },
    persist: ie,
    noteTranscriptLocation() {
      x();
    },
    release(me, { keepRecord }) {
      let Ee = L() ? x() : null;
      if (Ee)
        if (
          keepRecord ||
          re(me.noHistoryBackfill || Ee.recordFlag, Ee.recordOwner, "Disconnected conversation") !== "allow"
        )
          ie(me);
        else {
          Ae(Ee.sessionId, Ee.path);
          Ee.recordId = undefined;
          Ee.recordFlag = false;
          Ee.recordOwner = undefined;
        }
      y = null;
      S = false;
      R = false;
      w = undefined;
      s = undefined;
      h = undefined;
      r = {
        ...r,
        dialogKinds: renderedDialogKinds,
      };
    },
    dispose,
  };
}
//@ chunk-tyg7f3ek.js:413645-413777 placement
function applyHostRendersChromeSetupOffer(rendersChromeSetupOffer, n) {
  if (rendersChromeSetupOffer !== true || getHostRendersChromeSetupOffer()) return;
  setHostRendersChromeSetupOffer(true);
  n.sessionState.notifyInternalMetadataChanged({
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
  let n = claudeInChromeSession();
  let r = hasDisconnectedChromeAnswer();
  if (n.chromeSetupOfferStateUnread) return `${r}:${n.chromeSetupOfferArm}`;
  if (r && !n.notConnectedMirrored) {
    n.notConnectedMirrored = true;
    sessionState.notifyInternalMetadataChanged({
      chrome_not_connected_seen: true,
    });
  }
  let chromeSetupOfferArm = n.chromeSetupOfferArm;
  if (chromeSetupOfferArm !== undefined && !n.chromeSetupOfferArmMirrored) {
    n.chromeSetupOfferArmMirrored = true;
    sessionState.notifyInternalMetadataChanged({
      chrome_setup_offer_arm: chromeSetupOfferArm,
    });
  }
  return `${r}:${chromeSetupOfferArm}`;
}
//@ chunk-tyg7f3ek.js:414223-414594 placement
function restoreChromeSetupOfferState(restoredWorkerState) {
  if (restoredWorkerState?.readFailed === true) {
    claudeInChromeSession().chromeSetupOfferStateUnread = true;
    return;
  }
  let internal = restoredWorkerState?.internal;
  if (internal?.host_renders_chrome_setup_offer === true) setHostRendersChromeSetupOffer(true);
  let r = claudeInChromeSession();
  if (internal?.chrome_not_connected_seen === true) {
    markNotConnectedByPriorWorker();
    r.notConnectedMirrored = true;
  }
  let chromeSetupOfferArm = internal?.chrome_setup_offer_arm;
  if (
    (chromeSetupOfferArm === true || chromeSetupOfferArm === false) &&
    r.chromeSetupOfferArm === undefined
  ) {
    r.chromeSetupOfferArm = chromeSetupOfferArm;
    r.chromeSetupOfferArmMirrored = true;
  }
}
//@ chunk-tyg7f3ek.js:414594-414807 placement
/**
 * 为 SDK result 消息加 result_index 与自上次结果以来的模型用量，并去重。
 */
function createResultStamper(takeUsageSinceLastResult) {
  let n = 0;
  let weakSet = new WeakSet();
  return {
    stamp(s) {
      if (weakSet.has(s)) return s;
      let h = takeUsageSinceLastResult();
      let y = {
        ...s,
        result_index: n++,
        ...(h && {
          model_usage_since_last_result: h,
        }),
        ...processStartTuningFields(),
        ...garbageCollectionFields(),
      };
      weakSet.add(y);
      return y;
    },
    get numbered() {
      return n;
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
function contextInstructionsOverLimitPayload(e) {
  if (!e.totalOverLimit) return null;
  return {
    total_chars: e.totalChars,
    total_limit_chars: e.totalLimitChars,
    file_count: e.fileCount,
    ...(e.fileCount > 1 &&
      e.largestChars > e.totalLimitChars && {
        largest_chars: e.largestChars,
      }),
  };
}
//@ chunk-tyg7f3ek.js:415179-415693 placement
/**
 * headless 会话启动时检查 CLAUDE.md 等上下文指令是否超长，超出则返回提示载荷。
 */
async function checkContextInstructionsSize(e, sessionId, r) {
  try {
    if (!isHeadlessNoticeEligible()) return null;
    let s = await e;
    if (s === undefined) return null;
    let h = memoryFileLimits(s, r);
    let y = contextInstructionsOverLimitPayload(h);
    if (y === null) return null;
    if (!getFeatureValue_CACHED_MAY_BE_STALE(CONTEXT_INSTRUCTIONS_NOTICE_FLAG, false)) return null;
    logFeatureOk("context_instruction_size_warning", {
      total_chars: h.totalChars,
      total_limit_chars: h.totalLimitChars,
      limit_chars: h.limitChars,
      file_count: h.fileCount,
      files_over_limit: h.filesOverLimit,
    });
    return {
      type: "system",
      subtype: "instruction_size_warning",
      ...y,
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
var chromeSetupModule = require("./chunk-1cnesc1e.js");
//@ chunk-m5det47h.js:226-278 placement
function isIterativeHavenGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_iterative_haven", false);
}
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
