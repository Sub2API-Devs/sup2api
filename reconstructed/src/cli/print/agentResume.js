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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
} from "crypto";
import { KQe, spawnOrJoinThreadAgent } from "../../services/artifacts/comments/backgroundAgent.js";
import { Xb } from "../../services/artifacts/artifactAvailability.js";
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
import { mpn } from "../../utils/transcript/deserialize.js";
import { dedupeTasksById } from "../remoteIO/gates.js";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
import { getTaskOutputData } from "../../tools/TaskOutputTool/TaskOutputTool.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { Xzn } from "../../tools/AgentTool/agentLaunch.js";
import { wrapInSystemReminder, createSystemMessage } from "../../utils/messages.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { sanitizeMetadataText, validateAgentMetadata } from "../../utils/agentMetadata.js";
import { requestIdOf } from "../../utils/sessionState.js";
import { CONFIRM } from "../../utils/permissions/confirmWithUser.js";
import { isSubagentToolRequest } from "../../remote/wireFrameShape.js";
import { PermissionCardAsk } from "./wakeRouter.js";
import { PERMISSION_ANSWER_WAIT_MS, cS } from "./parkedPrompts.js";
import { withDeadline } from "../../utils/sleep.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { toolMatchesName } from "../../Tool.js";
import { AGENT, ahi } from "../../tools/AgentTool/constants.js";
import {
  getDenyRuleForTool,
  getAskRuleForTool,
  findDenyRuleWithContent,
  findAskRuleWithContent,
  matchToolRule,
} from "../../utils/permissions/permissions.js";
import { C4 } from "../../tools/AgentTool/backgroundGates.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  ResumeAgentStateError,
  resumeAgentBackground,
  isResumeDenied,
  resumeAgentAtItsCall,
  isResumedInlineRunError,
  AgentResumeInProgressError,
} from "../../tools/AgentTool/resumeAgent.js";
import { BNt } from "../remoteIO/turnHandoff.js";
import { Um } from "../../utils/agentId.js";
import {
  readAgentMetadata,
  updateAgentMetadata,
  getCurrentSessionBridge,
  getMaterializedSessionFile,
  clearBridgeSession,
  saveBridgeSession,
  restoreSessionMetadata,
} from "../../utils/sessionStorage.js";
import { $Ds } from "../remoteIO/orphanAgentRestore.js";
import { WEB_FETCH_AGENT } from "../../tools/WebFetchTool/harnessNotes.js";
import { QGt } from "../../plugins/functionHooks/toolCallHooks.js";
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
import { PQe } from "../../utils/loop/loopWakeups.js";
import { isTeleportedSession } from "../../bridge/createSession.js";
import { getOauthAccountInfo, sameOwnerAccount } from "../../utils/auth.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { isClaudeAiChatCowork, isDesktopTopSession } from "../../utils/entrypointKinds.js";
import { dIr } from "../../tools/ChromeSetupOfferTool/ChromeSetupOfferTool.js";
import { Yi } from "../../commands/mobile/mobile.js";
import { wcn, y2s } from "../../utils/claudeInChrome/phoneAnswer.js";
import { processStartTuningFields, garbageCollectionFields } from "../../utils/queryProfiler.js";
import { isClaudecodeSession, hostScheduledRun } from "../../utils/sessionShape.js";
import { n9s } from "../../utils/claudemd.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isTransportBacked } from "../transportState.js";
import { informationalSystemMessage } from "./sdkMessageStream.js";

/**
 * 从用户消息中解析 artifact 线程回复头（带 viewer URL），仅在已声明且开关开启时返回。
 */
//@ chunk-tyg7f3ek.js:396442-396583 placement
function readArtifactThreadHeader(e) {
  if (e.declared !== !0 || !isPlainPersonMessage(e) || !KQe() || !Xb()) return null;
  let n = parseArtifactThreadMessage(e.value);
  return n === null ? null : { ...n.header, url: artifactViewerUrlFor(n.artifact) };
}
//@ chunk-tyg7f3ek.js:396583-396699 placement
function classifyArtifactThreadMessage(e) {
  if (!isPlainPersonMessage(e) || parseArtifactThreadMessage(e.value) === null) return;
  if (e.declared !== !0) return "unmarked";
  return Xb() ? "seeded" : void 0;
}
/**
 * 处理来自 artifact 评论线程的后续消息：查找持有该线程的子代理并恢复执行。
 */
//@ chunk-tyg7f3ek.js:396699-397362 placement
async function resumeArtifactThreadAgent(e, n) {
  if (n.exiting) return !1;
  let { slug: slug, threadId: threadId, url: url } = e,
    y = { slug: slug, threadId: threadId, gestureAt: e.gestureAt, suppressed: !1, storageV5: n.storageV5 },
    S = getLastCacheSafeParams()?.toolUseContext,
    R = S === void 0 ? void 0 : getLocalSourcePath(slug, S.artifactRegistries.recordedPages);
  if (
    (
      await spawnOrJoinThreadAgent({
        slug: slug,
        threadId: threadId,
        url: url,
        artifactName: `artifact ${slug.slice(0, 8)}`,
        directive: buildThreadAgentPrompt({
          trigger: "fresh",
          summonCount: 1,
          url: url,
          threadId: threadId,
          sourcePath: R,
          resolved: "unknown",
        }),
        followUp: buildThreadFollowUpPrompt({ url: url, threadId: threadId }),
        canUseTool: n.canUseTool,
        summon: y,
        onSettled: (P) => n.onLifecycle(P),
        route: "seeded",
      })
    ).outcome === "fallback"
  )
    return !1;
  try {
    (n.onLifecycle("queued"), n.onLifecycle("started"), emitArtifactSummonStatus(y, { status: "working" }));
  } catch (error) {
    logError(error);
  }
  return !0;
}
//@ chunk-tyg7f3ek.js:397362-397486 placement
function isPlainPersonMessage(e) {
  return (
    e.isSynthetic !== !0 &&
    !e.peerDelivered &&
    e.inboundOrigin === void 0 &&
    e.shouldQuery !== !1 &&
    !e.hasAttachments
  );
}
//@ chunk-tyg7f3ek.js:397486-397675 placement
function parseArtifactThreadMessage(e) {
  let n = getPromptText(e),
    r = n === null ? null : parseCommentNotification(n);
  if (n === null || r === null) return null;
  let s =
      n.split(
        `
`,
        2,
      )[1] ?? "",
    h = parseArtifactUrl(s.slice(ARTIFACT_LINE_PREFIX.length).trim());
  return h === null ? null : { header: r, artifact: h };
}
//@ chunk-tyg7f3ek.js:397675-397753 placement
function collectResumableAgentIds(e) {
  let n = new Set();
  for (let [r, s] of e ?? []) if (mpn(s)) n.add(r);
  return n;
}
//@ chunk-tyg7f3ek.js:397753-397961 placement
function recordedAgentCallsFor(e, n) {
  let filtered = dedupeTasksById(Array.isArray(e) ? e : []).filter(
      (h) => typeof h.tool_use_id === "string" && n.has(h.tool_use_id),
    ),
    groupBy = Map.groupBy(filtered, (h) => h.tool_use_id);
  return filtered.filter((h) => groupBy.get(h.tool_use_id)?.length === 1);
}
/**
 * 容器重启后，从转录中找出上一轮未回答的 Agent 调用，规划自动恢复。
 */
//@ chunk-tyg7f3ek.js:397961-398370 placement
async function planRecordedAgentResumes({
  recorded: recorded,
  agentCallIds: agentCallIds,
  known: known,
  hasTool: hasTool,
  settleFlags: settleFlags,
}) {
  let filtered = recordedAgentCallsFor(recorded, agentCallIds).filter((w) => !known.has(w.task_id));
  if (filtered.length === 0 || !hasTool(SENDMESSAGE)) return [];
  if ((await settleFlags(), !isIterativeHavenGateOn())) return [];
  let filtered_2 = filtered.filter(getTaskOutputData),
    R = { agent_calls: agentCallIds.size, agents_found: filtered.length };
  if (filtered_2.length === 0) return (logFeatureSad("ccr_cut_off_agents", "not_eligible", R), []);
  return (
    logFeatureOk("ccr_cut_off_agents", { ...R, agents_offered: filtered_2.length }),
    Xzn(filtered_2.map((w) => w.task_id)),
    filtered_2
  );
}
//@ chunk-tyg7f3ek.js:398370-398791 placement
function containerRestartAgentsNote(e) {
  return wrapInSystemReminder(
    `The container was restarted in the middle of a turn. Every Agent call that turn left unanswered is being resumed automatically from its saved transcript, as these agents: ${e.join(", ")}. Wait for their notifications, which name each agent's task and give its result, before you do that work again. If one does not report back, send a message to its agent id with the ${SENDMESSAGE} tool to resume it.`,
  );
}
/**
 * 生成"容器在一轮中途重启，以下 Agent 调用正自动从保存的转录恢复"的系统提醒。
 */
//@ chunk-tyg7f3ek.js:398791-399897 placement
function formatRestartedAgentsReminder(e, n = !1) {
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
function findParkedAgentAsk(e, n, r) {
  let s = e?.external?.pending_action,
    h = requestIdOf(s),
    { pendingActionClass: pendingActionClass } = n;
  if (
    !isIterativeHavenGateOn() ||
    !s ||
    h === void 0 ||
    s.request_id !== h ||
    typeof s.tool_use_id !== "string" ||
    s.tool_use_id.startsWith(CONFIRM) ||
    typeof s.agent_id !== "string" ||
    typeof s.tool_name !== "string" ||
    !isSubagentToolRequest({ agent_id: s.agent_id, tool_name: s.tool_name }) ||
    typeof s.input !== "object" ||
    s.input === null ||
    Array.isArray(s.input)
  )
    return;
  let S = e?.internal?.running_background_tasks,
    found = [
      ...(pendingActionClass === "underivable_adoptable"
        ? recordedAgentCallsFor(e?.internal?.running_foreground_agents, r)
        : []),
      ...(UNDERIVABLE_AGENT_REASONS.has(pendingActionClass) && Array.isArray(S) ? dedupeTasksById(S) : []),
    ].find((w) => w.task_id === s.agent_id);
  if (found === void 0 || !getTaskOutputData(found)) return;
  return { card: { request_id: h, tool_use_id: s.tool_use_id, details: s }, agent: found };
}
//@ chunk-tyg7f3ek.js:400673-401810 placement
class ParkedAgentAskHold {
  ask;
  card;
  agentId;
  io;
  ended = !1;
  constructor(e, n, r, s, h) {
    ((this.card = e),
      (this.agentId = n),
      (this.io = s),
      (this.ask = new PermissionCardAsk({
        card: e,
        answerKind: r,
        waitMs: PERMISSION_ANSWER_WAIT_MS,
        maxAnswerAgeMs: cS,
        allowWithoutInputIsEcho: !0,
        withdrawCard: (y) => s.write({ type: "control_cancel_request", request_id: y }),
        unreadAnswersRead: () => {
          let whenReceivedAnswersRead = s.whenReceivedAnswersRead();
          return whenReceivedAnswersRead && withDeadline(whenReceivedAnswersRead, PERMISSION_ANSWER_WAIT_MS);
        },
        answerOff: async () => (await h?.()) ?? "absent",
      })),
      this.ask.startTimer(),
      s.holdKeptAsk(this));
  }
  async answerFor(e) {
    try {
      if (!e.usable()) this.end("ask_needs_own_card");
      if (e.toolName !== this.card.details?.tool_name) this.end("tool_differs");
      if (this.ended) return;
      let { answer: answer, unused: unused } = await this.ask.answerFor(e);
      if (answer === void 0 || unused !== void 0) this.end(unused ?? "no_answer");
      if (!e.usable()) this.end("ask_needs_own_card");
      if (this.ended || answer === void 0) return;
      return (
        (this.ended = !0),
        this.io.holdKeptAsk(void 0),
        logFeatureOk("ccr_subagent_ask_hold", { answer_behavior: fromEnum(answer.behavior) }),
        answer
      );
    } catch (error) {
      (logError(error), this.end("answer_threw"));
      return;
    }
  }
  end(e) {
    if (this.ended) return;
    if (
      ((this.ended = !0),
      this.io.holdKeptAsk(void 0),
      this.ask.stop(e === "stopped" || e === "shutdown" ? e : "not_asked"),
      e === "answer_threw")
    )
      logFeatureBad("ccr_subagent_ask_hold", e);
    else logFeatureSad("ccr_subagent_ask_hold", e);
  }
}
//@ chunk-tyg7f3ek.js:401810-402136 placement
function holdParkedAgentAsk({
  restored: restored,
  bootPark: bootPark,
  cutOffCallIds: cutOffCallIds,
  planned: planned,
  answerKind: answerKind,
  io: io,
  answerOff: answerOff,
}) {
  try {
    let R = findParkedAgentAsk(restored, bootPark, cutOffCallIds);
    if (
      R === void 0 ||
      bootPark.parkedPermission !== void 0 ||
      answerKind === "strict" ||
      !planned.some((w) => w.agentId === R.agent.task_id)
    )
      return;
    return new ParkedAgentAskHold(R.card, R.agent.task_id, answerKind, io, answerOff);
  } catch (error) {
    (logFeatureBad("ccr_subagent_ask_hold", "boot_threw"), logError(error));
    return;
  }
}
//@ chunk-tyg7f3ek.js:402173-402417 placement
function isAgentToolAllowedByRules(e, n, r, s) {
  let found = e.find((y) => toolMatchesName(y, AGENT));
  return (
    found !== void 0 &&
    getDenyRuleForTool(n, found) === null &&
    getAskRuleForTool(n, found) === null &&
    findDenyRuleWithContent(n, AGENT, r) === null &&
    findAskRuleWithContent(n, AGENT, r) === null &&
    (s === void 0 ||
      ["deny", "ask"].every(
        (y) => matchToolRule(n, found, { subagent_type: r, model: s, run_in_background: !0 }, y) === null,
      ))
  );
}
//@ chunk-tyg7f3ek.js:402417-402459 placement
function canResumeAgentsInBackground(e, n, r) {
  return !C4() && isAgentToolAllowedByRules(e, n, r);
}
//@ chunk-tyg7f3ek.js:402459-402539 placement
function parkedAskHandle(e) {
  return e && { id: e.card.tool_use_id, settled: () => e.end("not_asked") };
}
//@ chunk-tyg7f3ek.js:402539-402722 placement
function assertAgentResumeAllowed(e, n) {
  if (!canResumeAgentsInBackground(e.options.tools, getToolPermissionContext(e), n))
    throw new ResumeAgentStateError(
      "This session's permission rules now block this agent's type or require approval for it, or background agents are off.",
    );
}
/**
 * 恢复被容器重启切断的后台 Agent 调用；检查权限规则、卡片等待与预算，逐个后台恢复。
 */
//@ chunk-tyg7f3ek.js:402722-404055 placement
async function resumeCutOffAgents({
  cutOff: cutOff,
  unresolvedCallIds: unresolvedCallIds,
  findCalls: findCalls,
  stopped: stopped,
  alsoResumable: alsoResumable,
  cardWaits: cardWaits,
  owesATurn: owesATurn,
  startsSpent: startsSpent,
  tools: tools,
  toolPermissionContext: toolPermissionContext,
  storageV5: storageV5,
}) {
  try {
    if (cardWaits || !isIterativeHavenGateOn() || !BNt() || !owesATurn()) return [];
    let q = [
        ...cutOff.map((ce) => ({ agent: ce, toolUseID: ce.tool_use_id })),
        ...stopped
          .filter((ce) => getTaskOutputData(ce) || alsoResumable?.has(ce.task_id))
          .map((ce) => ({ agent: ce, toolUseID: void 0 })),
      ],
      sliced = (
        await Promise.all(
          q.map(async ({ agent: agent, toolUseID: toolUseID }) => {
            let ie = Um(agent.task_id);
            if (ie === null) return;
            let Se = await readAgentMetadata(ie, storageV5),
              me = Se ? validateAgentMetadata(Se) : void 0,
              Me = me?.restartResumes ?? 0;
            if (
              me === void 0 ||
              !$Ds(me) ||
              Me >= ahi ||
              me.agentType === WEB_FETCH_AGENT ||
              !canResumeAgentsInBackground(tools, toolPermissionContext, me.agentType)
            )
              return;
            return {
              agentId: ie,
              agentType: me.agentType,
              description: me.description ?? agent.description,
              toolUseID: toolUseID,
              waitedOn: toolUseID !== void 0,
              restartResumes: Me + 1,
            };
          }),
        )
      )
        .filter((ce) => ce !== void 0)
        .slice(0, QGt()),
      Z = startsSpent(),
      re = Z ? [] : sliced.flatMap((ce) => ce.toolUseID ?? []),
      Ae =
        re.length > 0 && re.length === unresolvedCallIds.size && re.every((ce) => unresolvedCallIds.has(ce))
          ? await findCalls(re)
          : new Map(),
      Ue = re.length > 0 && re.every((ce) => Ae.has(ce));
    if (re.length > 0 && !Ue)
      logFeatureSad("ccr_recorded_agent_resume", "calls_not_run_again", {
        agent_calls: re.length,
        unresolved_calls: unresolvedCallIds.size,
      });
    return sliced.flatMap(({ toolUseID: toolUseID, ...nt }) => {
      if (toolUseID === void 0 || Z) return [nt];
      let ie = Ue ? Ae.get(toolUseID) : void 0;
      return ie === void 0 ? [] : [{ ...nt, call: { toolUseID: toolUseID, assistantMessage: ie } }];
    });
  } catch (error) {
    return (logFeatureBad("ccr_recorded_agent_resume", "plan_threw"), logError(error), []);
  }
}
/**
 * 一次已记录 Agent 恢复的运行状态：在后台/前台恢复各调用、跟踪运行集合并在结束时汇报。
 */
//@ chunk-tyg7f3ek.js:404055-408941 placement
class RecordedAgentResumeRun {
  inBackground;
  running = new Set();
  inStartingTurn = !1;
  unnamed = [];
  noteUuid;
  setUpAbort = createAbortController();
  planned;
  host;
  keptAsk;
  constructor(e, n, r, s) {
    if (
      ((this.planned = e),
      (this.inBackground = e.filter((h) => h.call === void 0)),
      (this.host = n),
      (this.keptAsk = s),
      s !== void 0)
    )
      r.then(() => s.end("shutdown"));
    for (let h of e)
      if (h.call !== void 0)
        n.cutOffAgentCalls.adopt(h.call.toolUseID, h.agentId, (y) => this.resumeAtItsCall(h, y));
  }
  async start(e) {
    let inBackground = this.inBackground;
    if (
      ((this.inBackground = []),
      this.unnamed.push(...inBackground.flatMap((r) => (r.call ? r.agentId : []))),
      this.unnamed.length > 0 && this.noteUuid === void 0 && !this.setUpAbort.signal.aborted)
    ) {
      let r = randomUUID_15();
      ((this.noteUuid = r),
        runSafely(() =>
          this.host.messageQueue.enqueuePendingNotification({
            value: formatTaskNotification({
              body: `
${containerRestartAgentsNote(this.unnamed)}`,
            }),
            uuid: r,
            agentId: mainAgentId(),
            mode: "task-notification",
            skipAttachments: !0,
            priority: "next",
            shouldQuery: !1,
            passive: !0,
            ...(e !== void 0 && { ccrTurnId: e }),
          }),
        ));
    }
    if (inBackground.length === 0) return;
    ((this.inStartingTurn = !0),
      await this.host.connectorsJoined().catch(logError),
      await Promise.all(inBackground.map((r) => this.resume(r).catch(logError))));
  }
  keptAskOf(e) {
    return this.keptAsk?.agentId === e ? this.keptAsk : void 0;
  }
  async resume(e) {
    let { agentId: agentId } = e,
      keptAskOf = this.keptAskOf(agentId),
      s = !1,
      h;
    try {
      if (this.setUpAbort.signal.aborted || this.host.exiting()) {
        logFeatureSad("ccr_recorded_agent_resume", this.setUpAbort.signal.aborted ? "stopped" : "exiting");
        return;
      }
      if (
        (await updateAgentMetadata(agentId, { restartResumes: e.restartResumes }, this.host.storageV5),
        (h = { ...(await this.host.contextForResume()), abortController: this.setUpAbort }),
        this.host.exiting())
      ) {
        logFeatureSad("ccr_recorded_agent_resume", "exiting");
        return;
      }
      assertAgentResumeAllowed(h, e.agentType);
      let y = await resumeAgentBackground({
        agentId: agentId,
        prompt: e.description,
        continueInterruptedTurn: !0,
        waitingToolUse: parkedAskHandle(keptAskOf),
        toolUseContext: h,
        canUseTool: this.host.canUseTool,
      });
      if (isResumeDenied(y))
        (logFeatureSad("ccr_recorded_agent_resume", "denied_by_plugin"),
          formatAgentRestartFailedNotice(this.asThisSessionSeesIt(e, h), y.deniedByPlugin, "starts_a_turn"));
      else if (y.alreadyCompleted)
        (logFeatureSad("ccr_recorded_agent_resume", "already_completed"),
          formatOrphanedAgentNotification(
            { ...this.asThisSessionSeesIt(e, h), outputFile: y.outputFile },
            h.taskRegistry,
            "starts_a_turn",
          ));
      else if (
        (logFeatureOk("ccr_recorded_agent_resume"),
        (s = !0),
        this.running.add(agentId),
        this.setUpAbort.signal.aborted)
      )
        this.host.stopAgents(new Set([agentId]));
    } catch (error) {
      let S = reportAgentResumeOutcome(error, this.setUpAbort.signal.aborted);
      if (S === "refused" || S === "threw")
        (logForDebugging(`[recordedAgentResume] agent ${agentId} was not resumed: ${errorMessage(error)}`, {
          level: "warn",
        }),
          formatAgentRestartFailedNotice(
            this.asThisSessionSeesIt(e, h),
            errorMessage(error),
            "starts_a_turn",
          ));
    } finally {
      if (!s) keptAskOf?.end("not_resumed");
    }
  }
  async resumeAtItsCall(e, n) {
    let { agentId: agentId } = e,
      keptAskOf = this.keptAskOf(agentId);
    await this.host.connectorsJoined().catch(logError);
    let h = n.abortController.signal.aborted || this.setUpAbort.signal.aborted;
    if (h || this.host.exiting())
      throw (
        logFeatureSad("ccr_recorded_agent_resume", h ? "stopped" : "exiting"),
        keptAskOf?.end("not_resumed"),
        h
          ? new AbortError()
          : new ResumeAgentStateError("The session is ending or out of budget, so the agent was not resumed.")
      );
    try {
      (assertAgentResumeAllowed(n, e.agentType),
        await updateAgentMetadata(agentId, { restartResumes: e.restartResumes }, this.host.storageV5));
      let y = await resumeAgentAtItsCall({
        agentId: agentId,
        prompt: e.description,
        continueInterruptedTurn: !0,
        waitingToolUse: parkedAskHandle(keptAskOf),
        toolUseContext: n,
        canUseTool: this.host.canUseTool,
      });
      if (isResumeDenied(y))
        (logFeatureSad("ccr_recorded_agent_resume", "denied_by_plugin"), keptAskOf?.end("not_resumed"));
      else if (y.alreadyCompleted)
        (logFeatureSad("ccr_recorded_agent_resume", "already_completed"), keptAskOf?.end("not_resumed"));
      else if ((logFeatureOk("ccr_recorded_agent_resume", { at_its_call: !0 }), y.movedRunEnded === void 0))
        keptAskOf?.end("not_asked");
      else y.movedRunEnded.then(() => keptAskOf?.end("not_asked")).catch(logError);
      return y;
    } catch (error) {
      if (isResumedInlineRunError(error))
        (logFeatureOk("ccr_recorded_agent_resume", { at_its_call: !0 }), keptAskOf?.end("not_asked"));
      else (reportAgentResumeOutcome(error, n.abortController.signal.aborted), keptAskOf?.end("not_resumed"));
      throw error;
    }
  }
  withdrawNote() {
    let noteUuid = this.noteUuid;
    if (noteUuid === void 0) return !1;
    return (
      (this.noteUuid = void 0),
      this.host.messageQueue.removeByFilter((n) => n.uuid === noteUuid).length > 0
    );
  }
  async noteTurnEnd(e) {
    this.inStartingTurn = !1;
    try {
      if (this.noteUuid !== void 0 && !this.withdrawNote()) this.unnamed = [];
      if (this.host.messageQueue.getCommandQueueSnapshot().some((y) => y.mode === "orphaned-permission"))
        return;
      let filtered = this.planned.filter(
        (y) => y.call !== void 0 && this.host.cutOffAgentCalls.take(y.call.toolUseID)?.resume !== void 0,
      );
      if (filtered.length === 0) return;
      if (e) this.inBackground.push(...filtered);
      let s = e ? void 0 : await this.host.contextForResume(),
        h = !e && !this.setUpAbort.signal.aborted;
      for (let y of filtered) {
        if ((logFeatureSad("ccr_recorded_agent_resume", "call_not_reached"), !e))
          this.keptAskOf(y.agentId)?.end("not_resumed");
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
      isWebFetchLaunch: !1,
      canReadOutputFile: n !== void 0,
      canContinueAgent: n !== void 0,
    };
    return n === void 0 ? r : withResumeCapabilities(r, { kind: "runningPool", tools: n.options.tools });
  }
  stop() {
    if (this.setUpAbort.signal.aborted) return;
    runSafely(() => {
      (this.setUpAbort.abort(), this.keptAsk?.end("stopped"), this.withdrawNote());
      let e = new Set(
        this.planned
          .filter(
            ({ agentId: agentId, waitedOn: waitedOn }) =>
              waitedOn && this.inStartingTurn && this.running.has(agentId),
          )
          .map((n) => n.agentId),
      );
      if (e.size > 0) this.host.stopAgents(e);
    });
  }
}
//@ chunk-tyg7f3ek.js:408941-409147 placement
function reportAgentResumeOutcome(e, n) {
  let r =
    n || isAbortError(e)
      ? "stopped"
      : e instanceof AgentResumeInProgressError
        ? "in_progress"
        : e instanceof ResumeAgentStateError
          ? "refused"
          : "threw";
  if (r === "threw") (logFeatureBad("ccr_recorded_agent_resume", r), logError(e));
  else logFeatureSad("ccr_recorded_agent_resume", r);
  return r;
}
//@ chunk-tyg7f3ek.js:409147-409164 placement
var AGENT_RESUME_WAIT_MS = PQe * 1000;
//@ chunk-tyg7f3ek.js:409164-409196 placement
async function listResumableAgentsStub(e, n) {
  return [];
}
//@ chunk-tyg7f3ek.js:409196-409217 placement
var MAX_BRIDGE_SESSION_LOG = 32,
  wS = new Set();
//@ chunk-tyg7f3ek.js:409217-409261 placement
function isBridgeSessionLive(e) {
  return isTeleportedSession(e.bridgeSessionId);
}
/**
 * headless 模式下 Remote Control 桥（bridge:sdk）的启停与登录变化监控；在令牌未被服务器背书或登录变化时撤下桥。
 */
//@ chunk-tyg7f3ek.js:409261-413645 placement
function createBridgeSdkController(e) {
  let { storageV5: storageV5 } = e,
    r = q(getCurrentSessionBridge(), wS),
    s,
    h,
    y = null,
    S = !1,
    R = !1,
    w,
    P = [];
  function L() {
    if (S) return !1;
    if (R) return !1;
    if (h && !h.holds())
      return (
        logForDebugging(
          "[bridge:sdk] The bearer is not one the server has vouched for \u2014 the transcript record is left as last written",
          { level: "warn" },
        ),
        !1
      );
    let me = getOauthAccountInfo();
    if (s?.accountUuid && me?.accountUuid && !sameOwnerAccount(me, s) && !sameOwnerAccount(me, h?.login))
      return (
        logForDebugging(
          "[bridge:sdk] The login changed since this bridge was enabled \u2014 its transcript record is left as last written",
          { level: "warn" },
        ),
        !1
      );
    return !0;
  }
  function q(me, Me) {
    return {
      sessionId: getSessionId(),
      path: getMaterializedSessionFile() ?? void 0,
      recordId: me?.id,
      recordFlag: me?.noHistoryBackfill === !0,
      recordOwner: me?.ownerAccountUuid
        ? { accountUuid: me.ownerAccountUuid, organizationUuid: me.ownerOrganizationUuid }
        : void 0,
      dialogKinds: Me,
    };
  }
  function x() {
    let me = r.sessionId === getSessionId();
    if (me) r.path = getMaterializedSessionFile() ?? r.path;
    return me || r.path !== void 0 ? r : null;
  }
  function G() {
    return h ? h.login : s;
  }
  function Z() {
    return r.recordOwner ?? G();
  }
  function re(me, Me, Ee) {
    if (me)
      return (
        logForDebugging(
          `[bridge:sdk] ${Ee} carries a history suppression \u2014 record left in place rather than tombstoned`,
        ),
        "final"
      );
    if (Me && !sameOwnerAccount(G(), Me) && !sameOwnerAccount(h?.claim, Me)) {
      let He = !G()?.accountUuid;
      return (
        logForDebugging(
          `[bridge:sdk] ${Ee} is recorded under an identity that is not ${He ? "verifiable with this enable\u2019s unreadable login" : "this login\u2019s"} \u2014 record left in place`,
        ),
        He ? "retry" : "final"
      );
    }
    return "allow";
  }
  function Ae(me, Me) {
    clearBridgeSession(me, Me, Me ? { targetExists: !0 } : void 0, storageV5);
  }
  function Ue(me, Me) {
    if (Me.sessionId === r.sessionId || sessionIdBody(Me.recordId) !== sessionIdBody(me.bridgeSessionId))
      return !1;
    let Ee = re(Me.suppressed, Me.ownerClaim, "Cleared conversation");
    if (Ee === "allow") Ae(Me.sessionId, Me.path);
    return Ee !== "retry";
  }
  function ce(me) {
    for (let Me = P.length - 1; Me >= 0; Me--) if (Ue(me, P[Me])) P.splice(Me, 1);
  }
  function nt(me) {
    let index = P.findIndex((Ee) => Ee.sessionId === me.sessionId);
    if (index !== -1) P.splice(index, 1);
    if ((P.push(me), P.length > MAX_BRIDGE_SESSION_LOG)) P.shift();
  }
  function ie(me) {
    let Me = x();
    if (!Me || !L() || isBridgeSessionLive(me)) return;
    let Ee = me.noHistoryBackfill || Me.recordFlag,
      He = Z();
    (saveBridgeSession(
      Me.sessionId,
      me.bridgeSessionId,
      me.getLastSequenceNum(),
      Me.path,
      [...Me.dialogKinds],
      me.sessionGroupingId,
      Ee,
      He,
      { targetExists: !0 },
      storageV5,
    ),
      (Me.recordId = me.bridgeSessionId),
      (Me.recordFlag = Ee),
      (Me.recordOwner = He));
  }
  let Se = onSessionSwitch((me, Me) => {
    if (Me !== "clear") {
      if (me === r.sessionId) {
        x();
        return;
      }
      if (!y) r = q(getCurrentSessionBridge(), wS);
      return;
    }
    let Ee = r,
      He = Ee.path ?? getMaterializedSessionFile() ?? void 0,
      Xe =
        He && Ee.recordId !== void 0
          ? {
              sessionId: Ee.sessionId,
              path: He,
              recordId: Ee.recordId,
              suppressed: Ee.recordFlag || y?.noHistoryBackfill === !0,
              ownerClaim: Ee.recordOwner,
            }
          : void 0,
      We = y !== null && L() && !isBridgeSessionLive(y);
    if (
      ((r = {
        sessionId: me,
        path: void 0,
        recordId: We ? y.bridgeSessionId : void 0,
        recordFlag: We && y.noHistoryBackfill,
        recordOwner: We ? G() : void 0,
        dialogKinds: Ee.dialogKinds,
      }),
      !We)
    ) {
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
      bridgeNoHistoryBackfill: St.noHistoryBackfill || void 0,
      bridgeOwnerAccountUuid: G()?.accountUuid,
      bridgeOwnerOrganizationUuid: G()?.organizationUuid,
    });
  });
  return {
    armForEnable(me) {
      let Me = getCurrentSessionBridge(),
        Ee = r;
      if (((r = q(Me, me)), Me === void 0 && Ee.sessionId === r.sessionId && Ee.recordId !== void 0))
        ((r.recordId = Ee.recordId), (r.recordFlag = Ee.recordFlag), (r.recordOwner = Ee.recordOwner));
      return ((s = void 0), (h = void 0), (S = !1), (R = !1), (w = r.sessionId), Me ?? null);
    },
    setLoginIdentity(me) {
      s = me;
    },
    identityChanged(me) {
      let Me = G();
      if (Me?.accountUuid && me?.accountUuid && sameOwnerAccount(me, Me)) return;
      ((R = !0), (s = void 0), (h = void 0));
    },
    armedConversationRotated() {
      return w !== void 0 && r.sessionId !== w;
    },
    attached(me) {
      if (((y = me), (w = void 0), (h = me.serverVouch), me.ownerVetoed)) {
        ((S = !0),
          logForDebugging(
            "[bridge:sdk] Reattach was vetoed on owner identity \u2014 the transcript record is left in place; this bridge is not persisted",
            { level: "warn" },
          ));
        return;
      }
      if (me.getWorkerBearerToken) {
        let Me = L() ? x() : null;
        if (
          Me?.recordId !== void 0 &&
          sessionIdBody(Me.recordId) === sessionIdBody(me.bridgeSessionId) &&
          re(Me.recordFlag, Me.recordOwner, "Host-served record") === "allow"
        )
          (Ae(Me.sessionId, Me.path),
            (Me.recordId = void 0),
            (Me.recordFlag = !1),
            (Me.recordOwner = void 0));
        S = !0;
        return;
      }
      if (!L()) return;
      (ce(me), ie(me));
    },
    enableFailed() {
      ((w = void 0), (s = void 0), (h = void 0));
    },
    persist: ie,
    noteTranscriptLocation() {
      x();
    },
    release(me, { keepRecord: Me }) {
      let Ee = L() ? x() : null;
      if (Ee)
        if (
          Me ||
          re(me.noHistoryBackfill || Ee.recordFlag, Ee.recordOwner, "Disconnected conversation") !== "allow"
        )
          ie(me);
        else
          (Ae(Ee.sessionId, Ee.path),
            (Ee.recordId = void 0),
            (Ee.recordFlag = !1),
            (Ee.recordOwner = void 0));
      ((y = null),
        (S = !1),
        (R = !1),
        (w = void 0),
        (s = void 0),
        (h = void 0),
        (r = { ...r, dialogKinds: wS }));
    },
    dispose: Se,
  };
}
//@ chunk-tyg7f3ek.js:413645-413777 placement
function applyHostRendersChromeSetupOffer(e, n) {
  if (e !== !0 || getHostRendersChromeSetupOffer()) return;
  (setHostRendersChromeSetupOffer(!0),
    n.sessionState.notifyInternalMetadataChanged({ host_renders_chrome_setup_offer: !0 }));
}
//@ chunk-tyg7f3ek.js:413777-413807 placement
function markHostRendersChromeSetupOffer() {
  if (isClaudeAiChatCowork()) setHostRendersChromeSetupOffer(!0);
}
//@ chunk-tyg7f3ek.js:413807-414223 placement
function chromeSetupOfferKey(e) {
  dIr();
  let n = Yi(),
    r = wcn();
  if (n.chromeSetupOfferStateUnread) return `${r}:${n.chromeSetupOfferArm}`;
  if (r && !n.notConnectedMirrored)
    ((n.notConnectedMirrored = !0), e.notifyInternalMetadataChanged({ chrome_not_connected_seen: !0 }));
  let chromeSetupOfferArm = n.chromeSetupOfferArm;
  if (chromeSetupOfferArm !== void 0 && !n.chromeSetupOfferArmMirrored)
    ((n.chromeSetupOfferArmMirrored = !0),
      e.notifyInternalMetadataChanged({ chrome_setup_offer_arm: chromeSetupOfferArm }));
  return `${r}:${chromeSetupOfferArm}`;
}
//@ chunk-tyg7f3ek.js:414223-414594 placement
function restoreChromeSetupOfferState(e) {
  if (e?.readFailed === !0) {
    Yi().chromeSetupOfferStateUnread = !0;
    return;
  }
  let n = e?.internal;
  if (n?.host_renders_chrome_setup_offer === !0) setHostRendersChromeSetupOffer(!0);
  let r = Yi();
  if (n?.chrome_not_connected_seen === !0) (y2s(), (r.notConnectedMirrored = !0));
  let s = n?.chrome_setup_offer_arm;
  if ((s === !0 || s === !1) && r.chromeSetupOfferArm === void 0)
    ((r.chromeSetupOfferArm = s), (r.chromeSetupOfferArmMirrored = !0));
}
/**
 * 为 SDK result 消息加 result_index 与自上次结果以来的模型用量，并去重。
 */
//@ chunk-tyg7f3ek.js:414594-414807 placement
function createResultStamper(e) {
  let n = 0,
    weakSet = new WeakSet();
  return {
    stamp(s) {
      if (weakSet.has(s)) return s;
      let h = e(),
        y = {
          ...s,
          result_index: n++,
          ...(h && { model_usage_since_last_result: h }),
          ...processStartTuningFields(),
          ...garbageCollectionFields(),
        };
      return (weakSet.add(y), y);
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
    ...(e.fileCount > 1 && e.largestChars > e.totalLimitChars && { largest_chars: e.largestChars }),
  };
}
/**
 * headless 会话启动时检查 CLAUDE.md 等上下文指令是否超长，超出则返回提示载荷。
 */
//@ chunk-tyg7f3ek.js:415179-415693 placement
async function checkContextInstructionsSize(e, n, r) {
  try {
    if (!isHeadlessNoticeEligible()) return null;
    let s = await e;
    if (s === void 0) return null;
    let h = n9s(s, r),
      y = contextInstructionsOverLimitPayload(h);
    if (y === null) return null;
    if (!getFeatureValue_CACHED_MAY_BE_STALE(CONTEXT_INSTRUCTIONS_NOTICE_FLAG, !1)) return null;
    return (
      logFeatureOk("context_instruction_size_warning", {
        total_chars: h.totalChars,
        total_limit_chars: h.totalLimitChars,
        limit_chars: h.limitChars,
        file_count: h.fileCount,
        files_over_limit: h.filesOverLimit,
      }),
      { type: "system", subtype: "instruction_size_warning", ...y, uuid: randomUUID_17(), session_id: n }
    );
  } catch (error) {
    if (!isAbortError(error)) (logError(error), logFeatureBad("context_instruction_size_warning", "threw"));
    return null;
  }
}
//@ chunk-tyg7f3ek.js:415693-416169 placement
function gatewayCodeTabRulesNotice(e) {
  try {
    let n = getGatewayAuth(),
      r = n?.hostVerdict;
    if (!n || !r || "unresolvedReason" in r || r.verified || r.hasCodeTabRules === !1) return null;
    if (!isHeadlessNoticeEligible() || isTransportBacked(e)) return null;
    let { origin: origin, pathname: pathname } = new URL(n.url);
    return informationalSystemMessage(
      createSystemMessage(
        `Rules your organization sets on the gateway at ${origin}${pathname.replace(/\/$/, "")}, such as blocked commands, may not apply in this session. Claude Code doesn't take settings from that gateway${r.reason ? `: ${r.reason}` : "."}`,
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
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_iterative_haven", !1);
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
