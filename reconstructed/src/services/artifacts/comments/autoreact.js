/**
 * services/artifacts/comments/autoreact.ts
 *
 * 2.1.316 新增：评论自动响应主流程（线程激活、去重、回复/编辑/交给后台 agent）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9tgt55am.js (11)
 * attribution: placement 11
 */
import { isAutoAllowedInMode } from "../../../utils/permissions/browserToolNames.js";
import { getToolPermissionContext } from "../../../utils/permissions/toolPermissionContext.js";
import {
  checkRuleBasedPermissions,
  evaluateAskingNoHost,
  PERMISSION_CHECK_CRASHED_REASON,
} from "../../../utils/permissions/permissions.js";
import { isArtifactActionRule } from "./replyPermissionRules.js";
import { zjt } from "../../../utils/permissions/permissionPromptHost.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../analytics/featureTelemetry.js";
import { spawnOrJoinThreadAgent, KQe, hasThreadAgentForSlug } from "./backgroundAgent.js";
import {
  buildThreadAgentPrompt,
  buildThreadFollowUpPrompt,
  areAllCommentsTrusted,
  appendActivatedComments,
  mn,
  Tt,
  describeAutoReplyHeld,
  buildMcpThreadNotice,
  buildSourcePublishedNotice,
  replyThenResolveNote,
} from "./threadPrompts.js";
import { isAbortError } from "../../../utils/errors.js";
import { logError } from "../../../utils/log.js";
import {
  xt,
  isDegradedComment,
  rt,
  shouldFireActivation,
  Cs,
  io,
  Rs,
  aa,
  canAutoreactWithoutPrompts,
  ua,
  getAutoReactRateLimit,
  getMaxAutoTurns,
  getAutoEditPermissionContext,
  canAutoEditWithoutPrompt,
  uo,
  zs,
  lo,
  jr,
  recordJudged,
  ft,
  noteDeferOnce,
  Xn,
  selectCommentsToJudge,
  qs,
  Kr,
  ma,
  na,
} from "./autoreactGates.js";
import {
  gd,
  isLastAgentReplyCurrent,
  describeReplyDenial,
  canForkThreadReply,
  checkReplyPermissionSafe,
  withinHourlyTurnCap,
  no,
  ba,
  getAutoModeArbiterIssue,
  recordOwnReply,
  getOwnReplyInfo,
} from "./threadScanner.js";
import {
  getCommentAuthorKind,
  getCommentsAwaitingReply,
  parseTimestamp,
  hasCommentSentAfter,
  isOwnPostedReply,
  isTrustedComment,
} from "./commentState.js";
import {
  latestValidTimestamp,
  emitArtifactSummonStatus,
  dropStaleHandOffs,
  registerSummonHandOff,
} from "../artifactNotices.js";
import { isHostEntrypoint } from "../../../utils/entrypointKinds.js";
import { Zt, St, en, Or, consumeSummonClaims, waitForSummonClaim } from "./autoreactState.js";
import { isBuiltInArtifactHiddenForMcp } from "../artifactsMcpTools.js";
import { isAutoreactArmed, Ao, postThreadReply, isAutoReactEnabled, applyPostOutcome } from "./postReply.js";
import { isSlugStoppedAnywhere, scanStamp, emitSummonArm } from "../summonArms.js";
import { nYr, bni } from "../../../utils/plugins/hooksModulesLoadGate.js";
import { count, uniq } from "../../../utils/collections.js";
import { readRecordedDecl } from "./commentReply.js";
import { getLiveState } from "../../liveReplica/liveReplica.js";
import {
  typeLockedFor,
  commentTextChanged,
  rememberCommentTexts,
  recordUnaccountedComments,
  markAutoReactNoticePending,
} from "../shareEntries.js";
import { findToolByName } from "../../../Tool.js";
import {
  commentsToolName,
  isArtifactToolsetSplit,
  pickByToolset,
  commentsToolAction,
} from "../artifactToolGates.js";
import {
  c6s,
  p6s,
  autoRepliedNotice,
  bwt,
  autoEditedNotice,
  g6s,
} from "../../../tools/ArtifactTool/artifactNotices.js";
import { isOwnPrincipal } from "./commentAuthorship.js";
import { PREVIEW_FEATURE_PROMPT } from "../../../tools/AskUserQuestionTool/prompt.js";
import { extractJsonScriptById } from "../pageScripts.js";
import { isFixedFastAckEnabled, makeFixedAckPermissionProbe } from "./ackReplies.js";
import { preToolUseHookMayCoverArtifact } from "../hookCoverage.js";
import { ARTIFACT_COMMENTS_TOOL_NAME } from "../../../tools/ArtifactTool/constants.js";
import { selectFastAckText, composeArtifactCommentFastAck, composeThreadReply } from "./composeReply.js";
import { oAe, URo } from "../../artifactComments/autoReplyNotices.js";
import {
  toStandDownReason,
  checkAutoEditEligibility,
  composeAutoEditWithTimeout,
  Qd,
  AUTO_EDIT_FAILURE_REPLIES,
  buildAutoPostedReplyNote,
  getStandDownReasons,
  noConfirmOnlyReplyNote,
  applyAutoEdit,
  formatCommentIds,
  La,
  $a,
  STAND_DOWN_REASONS,
  Ha,
  RESOLVE_AFTER_REPLY_NOTE,
} from "./autoEdit.js";
import { v_e } from "../frameComments.js";
import { isResponderDispatchEnabled, triageArtifactComment } from "./threadClassifier.js";
import { runCommentThreadAnalyst } from "./threadAnalyst.js";
import { Xqr } from "../../../../vendor/lodash-es/upperFirst.js";
import { containsBlockedChars } from "./commentMentions.js";
import { createChildAbortController } from "../../../utils/abortController.js";
import { flushAutoreactLedger } from "./autoreactLedger.js";

//@ chunk-9tgt55am.js:77626-78056 placement
async function checkReplyPermission(e) {
  let { url: url, thread: thread, context: context, replyTool: replyTool } = e;
  if (isAutoAllowedInMode(replyTool, getToolPermissionContext(context)) === "bypassPermissions")
    return (
      (await checkRuleBasedPermissions(
        replyTool,
        { action: "reply", url: url, thread_id: thread.id, text: "" },
        context,
        { crashIsObjection: !0 },
      )) === null
    );
  let s = await probeReplyPermission({
    tool: replyTool,
    context: context,
    url: url,
    threadId: thread.id,
    fixedAck: !1,
    rulesOnlyOrNothing: !0,
  });
  return (
    !s.threw &&
    s.skipped !== !0 &&
    s.decision.behavior === "allow" &&
    !(s.decision.decisionReason?.type === "rule" && isArtifactActionRule(s.decision.decisionReason.rule))
  );
}
//@ chunk-9tgt55am.js:78056-78597 placement
async function handOffThreadToBackgroundAgent(e) {
  let t = zjt();
  if (t === null) return (logFeatureSad("artifact_comments_autoreact", "fork_fallback_no_person"), !1);
  let { slug: slug, url: url, thread: thread } = e;
  try {
    return (
      (
        await spawnOrJoinThreadAgent({
          slug: slug,
          threadId: thread.id,
          url: url,
          artifactName: e.artifactName,
          directive: buildThreadAgentPrompt({
            trigger: e.trigger,
            summonCount: e.summonCount,
            url: url,
            threadId: thread.id,
            sourcePath: e.sourcePath,
            resolved: thread.resolved,
          }),
          followUp: buildThreadFollowUpPrompt({ url: url, threadId: thread.id }),
          canUseTool: t,
          summon: { ...e.summon },
          route: "watch",
        })
      ).outcome !== "fallback"
    );
  } catch (error) {
    if (!isAbortError(error))
      (logError(error), logFeatureBad("artifact_comments_autoreact", "fork_handoff_error"));
    return !1;
  }
}
//@ chunk-9tgt55am.js:78597-78656 placement
function getLocalSourcePath(e, t) {
  return xt(e) ? void 0 : t.localSourcePath(e);
}
//@ chunk-9tgt55am.js:78656-78736 placement
function dn(e, t, n) {
  return gd() || (e.editCapable === !0 && !e.resolved) ? getLocalSourcePath(t, n) : void 0;
}
//@ chunk-9tgt55am.js:78736-79281 placement
function collectPendingSummons(e, t) {
  let n = [],
    a = !1;
  for (let comment of e.comments) {
    if (isDegradedComment(comment) || !rt(comment)) continue;
    if (!t.seen.has(comment.id)) {
      if (((a ||= comment.postedByArtifact !== !0), comment.toClaudeAt !== void 0)) n.push(comment);
    } else if (
      comment.toClaudeAt !== void 0 &&
      t.sentToClaudeAt.has(comment.id) &&
      shouldFireActivation(t.sentToClaudeAt.get(comment.id) ?? null, comment.toClaudeAt).fire
    )
      ((a = !0), n.push(comment));
  }
  let r = e.activatedAt ?? null,
    s = t.activatedAtObserved && shouldFireActivation(t.activatedAt, r).fire,
    d =
      n.length === 0 &&
      !e.resolved &&
      s &&
      e.comments.some((comment) => getCommentAuthorKind(comment) !== "agent");
  if (n.length === 0 && !d) return null;
  return { summons: n, typedGesture: a, activationFires: s, activationPending: d };
}
/**
 * 线程被激活/有人发评论给 Claude 时，决定立即自动回复、交给后台 agent 还是排队，并发出通知。
 */
//@ chunk-9tgt55am.js:79281-81163 placement
async function handleThreadActivation(e) {
  let { slug: slug, thread: thread, threadState: threadState } = e;
  if (!Cs() || !thread.claudeActivated) return;
  let r = collectPendingSummons(thread, threadState);
  if (r === null) return;
  let {
      summons: summons,
      typedGesture: typedGesture,
      activationFires: activationFires,
      activationPending: activationPending,
    } = r,
    C = thread.activatedAt ?? null;
  if (
    isLastAgentReplyCurrent({
      thread: thread,
      threadState: threadState,
      trigger: activationPending ? "activation" : "fresh",
      summonsForOrdering: summons,
      activatedAt: activationPending ? C : threadState.activatedAt,
    })
  )
    return;
  let R = latestValidTimestamp(activationPending ? [C] : summons.map((z) => z.toClaudeAt)),
    b = R ?? "";
  if (threadState.busyAckedGestureAt === b) return;
  let N =
      activationFires && threadState.activatedAt === null && !e.threadsDropped
        ? getCommentsAwaitingReply(thread).filter((z) => io(z, Date.now()) && !summons.includes(z))
        : [],
    mapped = [...summons, ...N].map((z) => z.toClaudeAt),
    w = isHostEntrypoint(),
    L;
  if (
    mapped.length > 0 &&
    mapped.every(Zt) &&
    new Set(mapped).size === mapped.length &&
    mapped.every((z) => St(slug, thread.id, z, { hostSeeded: w }))
  )
    L = w && mapped.every((z) => en(slug, thread.id, z)) ? "seeded_turn" : "read";
  if (L === "read") return;
  let busyWithheldForecast = threadState.busyWithheldForecast;
  if (L === void 0 && busyWithheldForecast?.gestureAt === b && Date.now() - busyWithheldForecast.at < Rs)
    return;
  let D = threadState.consecutivePipelineDenials >= aa,
    G =
      isBuiltInArtifactHiddenForMcp() ||
      dn(thread, slug, e.context.artifactRegistries.recordedPages) !== void 0,
    V = D && !G,
    q = async () =>
      isBuiltInArtifactHiddenForMcp() &&
      (!areAllCommentsTrusted(appendActivatedComments(summons, N, thread), thread) || mn(e.context))
        ? { status: "declined", reason: "blocked" }
        : isBuiltInArtifactHiddenForMcp() && canAutoreactWithoutPrompts(e.context)
          ? { status: "declined", reason: "ask_mode" }
          : await forecastReplyPermission({ ...e, handOff: G, latchedHandOff: D && G }),
    x;
  if (L === "seeded_turn") x = { status: "working" };
  else if (!threadState.breakerOpen) x = V ? { status: "declined", reason: "blocked" } : await q();
  else if (threadState.lastAutoReplyAt !== null && Date.now() - threadState.lastAutoReplyAt < ua) x = null;
  else if (!typedGesture) x = { status: "declined", reason: "loop_guard" };
  else x = V ? { status: "declined", reason: "blocked" } : await q();
  if (
    x === null ||
    !isAutoreactArmed() ||
    isSlugStoppedAnywhere(slug) ||
    scanStamp(slug) !== e.scanGen ||
    !nYr(performance.now(), getAutoReactRateLimit())
  )
    return;
  if (x === "unreadable") {
    threadState.busyAckedGestureAt = b;
    return;
  }
  let Y = x.status === "working";
  if ((isHostEntrypoint() || e.suppressSummonStatus) && !Y) {
    threadState.busyWithheldForecast = { gestureAt: b, at: Date.now() };
    return;
  }
  ((threadState.busyAckedGestureAt = b),
    (threadState.busyWithheldForecast = void 0),
    emitArtifactSummonStatus(
      { slug: slug, threadId: thread.id, gestureAt: R, suppressed: !1, storageV5: e.context.storageV5 },
      x,
    ),
    logFeatureOk("artifact_summon_forecast", { working: Y }));
}
//@ chunk-9tgt55am.js:81163-82635 placement
async function forecastReplyPermission(e) {
  let { tool: tool, context: context, artifactState: artifactState } = e,
    now = Date.now(),
    s = (w) => now - w < 3600000;
  if (
    count(artifactState.turnTimestamps, s) >= getMaxAutoTurns() ||
    count(artifactState.forecastTimestamps, s) >= getMaxAutoTurns()
  )
    return null;
  if (getToolPermissionContext(context).mode === "plan") return { status: "declined", reason: "plan_mode" };
  if (isBuiltInArtifactHiddenForMcp()) return { status: "working", reason: "queued" };
  let d = getAutoEditPermissionContext(tool, context),
    h = d.mode === "auto";
  if (d.avoidPrompts || d.chainOnAllow || (h && !canAutoEditWithoutPrompt(d))) return null;
  ((artifactState.forecastTimestamps = artifactState.forecastTimestamps.filter(s)),
    artifactState.forecastTimestamps.push(now));
  let [y, C] = await Promise.all([
    probeReplyPermission({
      tool: tool,
      context: context,
      url: e.url,
      threadId: e.thread.id,
      fixedAck: !1,
      rulesOnlyOrNothing: h,
    }),
    readRecordedDecl(e.slug, context),
  ]);
  if (y.threw)
    return (
      logFeatureBad(
        "artifact_summon_forecast",
        "permission_eval_error",
        y.rulesOnlyProbe ? { rules_only: !0 } : void 0,
      ),
      "unreadable"
    );
  if (y.skipped || getToolPermissionContext(context).mode === "plan") return null;
  if (y.denied !== null) return { status: "declined", reason: y.denied.reason };
  let { decision: decision } = y,
    b = decision.behavior !== "allow";
  if (b && uo(context.agentId, artifactState, { ask: null }) === null)
    return { status: "declined", reason: "ask_mode" };
  let N =
      !b && decision.decisionReason?.type === "rule" && isArtifactActionRule(decision.decisionReason.rule),
    S = !b && !N;
  if (
    canPageReplyDirectly({
      pageOwnsThreads: C,
      handsOffToTurn: e.handOff && S,
      composesEdit: e.thread.claudeActivated && e.thread.editCapable === !0 && S && !e.thread.resolved,
      slug: e.slug,
      editRejudgedByAutoMode: Ta(tool, context),
    })
  )
    return { status: "declined", reason: "blocked" };
  if (b)
    return e.latchedHandOff
      ? { status: "declined", reason: "blocked" }
      : { status: "needs_user", reason: "approval_required" };
  return e.latchedHandOff && N
    ? { status: "declined", reason: "blocked" }
    : { status: "working", reason: "queued" };
}
//@ chunk-9tgt55am.js:82635-83551 placement
async function probeReplyPermission(e) {
  let { tool: tool, context: context, url: url, threadId: threadId } = e,
    s = { action: "reply", url: url, thread_id: threadId, text: "" },
    d = getAutoEditPermissionContext(tool, context),
    h = e.fullReadUnder === void 0 && canAutoEditWithoutPrompt(d);
  if (e.rulesOnlyOrNothing === !0 && !h) return { threw: !1, skipped: !0 };
  let y = e.fullReadUnder ?? `autoreact-${threadId}-probe-${getLiveState().autoReact.probeSeq++}`,
    C = () => evaluateAskingNoHost(tool, s, context, Ao(threadId), y);
  try {
    if (h) {
      let b = await checkRuleBasedPermissions(
        tool,
        s,
        { ...context, toolUseId: y },
        { crashIsObjection: !0 },
      );
      if (b?.decisionReason?.type === "other" && b.decisionReason.reason === PERMISSION_CHECK_CRASHED_REASON)
        throw Error("artifact permission check crashed");
      if (canAutoEditWithoutPrompt(getAutoEditPermissionContext(tool, context))) {
        let N = b ?? { behavior: "allow", updatedInput: s };
        return {
          threw: !1,
          decision: N,
          denied: N.behavior === "deny" ? describeReplyDenial(N) : null,
          rulesOnlyVerdict: !0,
          verdictPremise: e.fixedAck ? d : null,
          probeId: y,
        };
      }
      if (e.rulesOnlyOrNothing === !0) return { threw: !1, skipped: !0 };
    }
    let R = await C();
    return {
      threw: !1,
      decision: R,
      denied: R.behavior === "deny" ? describeReplyDenial(R) : null,
      rulesOnlyVerdict: !1,
      verdictPremise: null,
      probeId: y,
    };
  } catch {
    return { threw: !0, rulesOnlyProbe: h };
  }
}
//@ chunk-9tgt55am.js:83551-83577 placement
function Ta(e, t) {
  return !1;
}
//@ chunk-9tgt55am.js:83577-83721 placement
function canPageReplyDirectly(e) {
  if (!e.pageOwnsThreads || e.handsOffToTurn) return !1;
  return !e.composesEdit || xt(e.slug) || typeLockedFor(e.slug, void 0) || e.editRejudgedByAutoMode;
}
/**
 * 评论自动响应主流程：读取线程、去重已见评论、判断是否该回应、组织回复/编辑、处理各种降级与遥测。
 */
//@ chunk-9tgt55am.js:83721-112316 placement
async function processArtifactThread(e) {
  let {
      slug: slug,
      url: url,
      artifactName: artifactName,
      thread: thread,
      context: context,
      notify: notify,
      artifactState: artifactState,
    } = e,
    y = findToolByName(context.options.tools ?? [], commentsToolName()),
    C = isBuiltInArtifactHiddenForMcp(),
    R = {},
    b = C ? void 0 : ((y?.mcpInfo === void 0 ? y : void 0) ?? (isArtifactToolsetSplit() ? void 0 : e.tool)),
    N,
    S = () => (e.threadsDropped, []);
  if (!isAutoreactArmed() || isSlugStoppedAnywhere(slug)) return;
  let w = artifactState.threads.get(thread.id);
  if (thread.commentsDegraded === !0) return w ? void 0 : "deferred_first_sight";
  if (thread.resolvedDegraded === !0)
    return (
      logFeatureSad("artifact_comments_autoreact", "resolution_degraded"),
      w ? void 0 : "deferred_first_sight"
    );
  let L = thread.activatedAtDegraded === !0,
    P = new Set();
  if (!w) {
    if (L)
      return (logFeatureSad("artifact_comments_autoreact", "activation_degraded"), "deferred_first_sight");
    let k =
        thread.claudeActivated &&
        !thread.resolved &&
        thread.comments.some((comment) => getCommentAuthorKind(comment) !== "agent"),
      re = e.actOnFirstSight && artifactState.baselined && k && !e.hintMissed,
      ie =
        !re &&
        k &&
        !e.hintMissed &&
        artifactState.everBaselined &&
        parseTimestamp(thread.activatedAt) !== null &&
        (e.liveSightBoundary === null ||
          (artifactState.stampHighWater !== null && zs(thread, e.liveSightBoundary))),
      de = (re || ie) && lo();
    if ((de || (e.pickUpRecentSummons && !re && !ie)) && !e.threadsDropped && thread.claudeActivated) {
      let now = Date.now(),
        fe = getCommentsAwaitingReply(thread);
      if (((P = new Set(fe.filter((ge) => io(ge, now)))), de)) {
        if (P.size > 0) logFeatureOk("artifact_comments_autoreact", { first_sight_summon: !0 });
        else if (fe.length > 0) logFeatureSad("artifact_comments_autoreact", "first_sight_summon_stale");
      }
    }
    if (
      ((w = {
        lastAutoReplyAt: null,
        seen: new Set(thread.comments.filter((comment) => !P.has(comment)).map((W) => W.id)),
        sentToClaudeAt: new Map(
          thread.comments
            .filter(
              (comment) =>
                !comment.toClaudeAtDegraded &&
                (comment.toClaudeAt === void 0 || parseTimestamp(comment.toClaudeAt) !== null),
            )
            .map((W) => [W.id, W.toClaudeAt ?? null]),
        ),
        ownReplyIds: new Set(),
        consecutiveAuto: 0,
        breakerOpen: !1,
        consecutivePipelineDenials: 0,
        deferNoticed: new Set(),
        activatedAt:
          re || ie ? null : parseTimestamp(thread.activatedAt) !== null ? (thread.activatedAt ?? null) : null,
        activatedAtObserved: thread.activatedAt === void 0 || parseTimestamp(thread.activatedAt) !== null,
      }),
      artifactState.threads.set(thread.id, w),
      (artifactState.everHadThreads = !0),
      jr(artifactState, thread),
      re || ie)
    )
      recordJudged(slug, thread.id, thread.comments, await ft(context.credentials));
    else {
      let filtered = thread.comments.filter((comment) => commentTextChanged(slug, comment.id, comment.text));
      if (filtered.length > 0) recordJudged(slug, thread.id, filtered, await ft(context.credentials));
      if (
        (rememberCommentTexts(
          slug,
          thread.comments.filter((comment) => !P.has(comment)),
        ),
        P.size === 0)
      )
        return;
      logFeatureOk("artifact_comments_autoreact", { summon_pickup: !0 });
    }
  }
  if (L) {
    logFeatureSad("artifact_comments_autoreact", "activation_degraded");
    return;
  }
  let D = !thread.claudeActivated && w.activatedAt !== null;
  if ((noteDeferOnce(w, "activation_read_absent", D), D)) return;
  let at = thread.comments.at(-1),
    V = at !== void 0 && getCommentAuthorKind(at) === "unknown",
    any = thread.comments.some(
      (comment, re) =>
        getCommentAuthorKind(comment) === "unknown" &&
        thread.comments
          .slice(0, re)
          .some((ie) => getCommentAuthorKind(ie) === "human" && ie.toClaudeAt !== void 0),
    ),
    x = V || any;
  if ((noteDeferOnce(w, "newest_lane_unknown", x), x)) return;
  let Y = getAutoReactRateLimit();
  if (
    Xn() &&
    nYr(performance.now(), Y) &&
    !(
      KQe() &&
      (await canForkThreadReply({
        slug: slug,
        url: url,
        thread: thread,
        threadState: w,
        context: context,
        replyTool: b,
        artifactState: artifactState,
      }))
    )
  ) {
    let k = selectCommentsToJudge(slug, thread, w);
    if (k.length > 0) recordJudged(slug, thread.id, k, await ft(context.credentials));
    let re = new Set(k);
    rememberCommentTexts(
      slug,
      thread.comments.filter((comment) => w.seen.has(comment.id) && !re.has(comment)),
    );
    let ie = C ? e.tool : b;
    if (ie !== void 0)
      await handleThreadActivation({
        slug: slug,
        url: url,
        thread: thread,
        threadState: w,
        artifactState: artifactState,
        tool: ie,
        context: context,
        scanGen: e.scanGen,
        suppressSummonStatus: e.suppressSummonStatus,
        threadsDropped: e.threadsDropped,
      });
    return "deferred_busy";
  }
  if (
    ((w.busyAckedGestureAt = void 0), (w.busyWithheldForecast = void 0), !(Xn() && bni(performance.now(), Y)))
  )
    artifactState.busyValveNoticed = !1;
  else if (!artifactState.busyValveNoticed)
    ((artifactState.busyValveNoticed = !0),
      logFeatureSad("artifact_comments_autoreact", "foreground_busy_timeout"));
  jr(artifactState, thread);
  let z = thread.activatedAt ?? null,
    activatedAt = w.activatedAt,
    I = !1;
  if (!w.activatedAtObserved) {
    if (z === null || parseTimestamp(z) !== null) ((w.activatedAtObserved = !0), (w.activatedAt = z));
  } else {
    let k = shouldFireActivation(w.activatedAt, z);
    ((I = k.fire), (w.activatedAt = k.record));
  }
  let j = [];
  for (let comment of thread.comments) {
    if (isDegradedComment(comment)) continue;
    let re = comment.toClaudeAt ?? null;
    if (!w.sentToClaudeAt.has(comment.id)) {
      w.sentToClaudeAt.set(comment.id, re);
      continue;
    }
    let ie = w.sentToClaudeAt.get(comment.id) ?? null,
      de = shouldFireActivation(ie, re);
    if (de.fire && w.seen.has(comment.id) && rt(comment)) j.push(comment);
    w.sentToClaudeAt.set(comment.id, de.record);
  }
  let any_2 = thread.comments.some((comment) => isDegradedComment(comment) && !w.seen.has(comment.id));
  noteDeferOnce(w, "fresh_trigger_degraded", any_2);
  let filtered = thread.comments.filter((comment) => !w.seen.has(comment.id) && !isDegradedComment(comment)),
    le = new Set(j),
    filtered_2 = thread.comments.filter(
      (comment) =>
        w.seen.has(comment.id) && !le.has(comment) && commentTextChanged(slug, comment.id, comment.text),
    ),
    be = new Set(filtered_2);
  if (
    (rememberCommentTexts(
      slug,
      thread.comments.filter((comment) => w.seen.has(comment.id) && !be.has(comment)),
    ),
    filtered.length === 0 && !I && j.length === 0)
  ) {
    if (filtered_2.length > 0) recordJudged(slug, thread.id, filtered_2, await ft(context.credentials));
    return;
  }
  let ue = await ft(context.credentials);
  {
    let k = [...filtered, ...j, ...filtered_2],
      re = I ? thread.comments : k;
    if (re.length === 0) recordUnaccountedComments(slug);
    else recordJudged(slug, thread.id, re, ue);
  }
  let now = Date.now();
  for (let k of filtered) w.seen.add(k.id);
  let filtered_3 = filtered.filter(rt),
    ye = w.lastAutoReplyAt !== null && now - w.lastAutoReplyAt < ua;
  if ((filtered_3.filter((k) => k.postedByArtifact !== !0).length > 0 || j.length > 0) && !ye)
    ((w.consecutiveAuto = 0), (w.breakerOpen = !1));
  let filtered_4 = filtered_3.filter(qs),
    _n = I && thread.comments.some((comment) => getCommentAuthorKind(comment) !== "agent"),
    _t = thread.resolved && (filtered_4.length > 0 || j.length > 0);
  if (
    !thread.claudeActivated ||
    (thread.resolved && !_t) ||
    (filtered_4.length === 0 && !_n && j.length === 0)
  )
    return;
  let he =
      thread.anchorMovedCommentId !== void 0 &&
      (filtered_4.length > 0 || j.length > 0) &&
      [...filtered_4, ...j].every((k) => k.id === thread.anchorMovedCommentId)
        ? "moved"
        : filtered_4.length > 0
          ? "fresh"
          : j.length > 0
            ? "redesignated"
            : "activation",
    Mt = filtered_4.at(-1) ?? j.at(-1) ?? thread.comments.findLast((k) => rt(k)),
    Se = he === "activation" ? [] : [...filtered_4, ...j],
    Dt = new Set(thread.comments.map((comment) => comment.id)),
    se = {
      slug: slug,
      threadId: thread.id,
      gestureAt: latestValidTimestamp(he === "activation" ? [w.activatedAt] : Se.map((k) => k.toClaudeAt)),
      suppressed: e.suppressSummonStatus,
      storageV5: context.storageV5,
    },
    yn = (k) => {
      if (
        !isAutoreactArmed() ||
        isSlugStoppedAnywhere(slug) ||
        scanStamp(slug) !== e.scanGen ||
        (R.handsOff === !1 && isBuiltInArtifactHiddenForMcp())
      )
        return (
          logFeatureSad("artifact_comments_autoreact", `stopped_during_${k}`),
          emitArtifactSummonStatus(se, { status: "declined", reason: "auto_reply_off" }),
          !0
        );
      return !1;
    },
    Re = (k) => {
      if (yn(k)) return !0;
      if (getToolPermissionContext(context).mode === "plan")
        return (
          logFeatureSad("artifact_comments_autoreact", `plan_mode_during_${k}`),
          emitArtifactSummonStatus(se, { status: "declined", reason: "plan_mode" }),
          !0
        );
      return !1;
    },
    lastIndex = thread.comments.findLastIndex((k) => getCommentAuthorKind(k) === "agent"),
    it = lastIndex >= 0 ? thread.comments[lastIndex] : void 0,
    To = [...filtered_4, ...j],
    st = Se.length > 0 && (it === void 0 || hasCommentSentAfter(To, it)),
    Ro =
      it !== void 0 &&
      !e.threadsDropped &&
      !thread.comments.some((comment) => getCommentAuthorKind(comment) === "unknown") &&
      (w.ownReplyIds.has(it.id) || isOwnPostedReply(it.id))
        ? it.id
        : void 0,
    yt = !st ? Ro : void 0;
  if (
    isLastAgentReplyCurrent({
      thread: thread,
      threadState: w,
      trigger: he,
      summonsForOrdering: To,
      activatedAt: w.activatedAt,
    })
  ) {
    logFeatureSad("artifact_comments_autoreact", "stood_down_answered");
    return;
  }
  let Co =
      I && activatedAt === null && !e.threadsDropped
        ? getCommentsAwaitingReply(thread).filter((k) => io(k, now) && !Se.includes(k))
        : [],
    mapped = [...Se, ...Co].map((k) => k.toClaudeAt);
  if (mapped.length > 0 && mapped.every(Zt) && new Set(mapped).size === mapped.length && Xn()) {
    let k = isHostEntrypoint(),
      re = () => mapped.some((de) => en(slug, thread.id, de));
    if (
      mapped.every((de) => St(slug, thread.id, de, { hostSeeded: !1 })) &&
      !re() &&
      KQe() &&
      b !== void 0 &&
      dn(thread, slug, context.artifactRegistries.recordedPages) !== void 0 &&
      zjt() !== null &&
      (await checkReplyPermissionSafe({ url: url, thread: thread, context: context, replyTool: b })) &&
      !re()
    )
      (Or(slug, thread.id, mapped),
        logFeatureOk("artifact_comments_autoreact", { read_claim_passed_on: !0 }));
    else {
      let de = consumeSummonClaims(slug, thread.id, mapped, { hostSeeded: k });
      if (!de && k) {
        if (
          ((de =
            (await waitForSummonClaim(slug, thread.id, mapped, context.abortController.signal)) &&
            consumeSummonClaims(slug, thread.id, mapped)),
          !de && Re("visible_handoff"))
        )
          return;
      }
      if (de) {
        logFeatureSad("artifact_comments_autoreact", "stood_down_visible_turn");
        return;
      }
    }
  }
  if (w.breakerOpen) {
    (logFeatureSad("artifact_comments_autoreact", "breaker_open"),
      emitArtifactSummonStatus(se, { status: "declined", reason: "loop_guard" }));
    return;
  }
  let dt = dn(thread, slug, context.artifactRegistries.recordedPages),
    Oo = w.consecutivePipelineDenials >= aa,
    Nt = isBuiltInArtifactHiddenForMcp();
  R.handsOff = Nt;
  let Eo = () => {
    if (!artifactState.pipelineDeniedNoticed)
      ((artifactState.pipelineDeniedNoticed = !0),
        markAutoReactNoticePending(slug),
        notify({
          summary: c6s(artifactName),
          detail: `Automatic replies or edits on artifact ${url} are being blocked by a permission hook or content gate, or repeatedly refused by the session's configuration \u2014 recent attempts were refused or dropped after composing. Affected threads are paused; a successful auto-reply anywhere on this artifact resumes them.`,
        }));
    (logFeatureSad("artifact_comments_autoreact", "pipeline_denied"),
      emitArtifactSummonStatus(se, { status: "declined", reason: "blocked" }));
  };
  if (Oo && dt === void 0 && !Nt) {
    Eo();
    return;
  }
  if (yn("own_account")) return;
  let An =
      (filtered_4.length > 0 || I || j.length > 0) &&
      j.every(Tt) &&
      filtered_4.every(
        (k) =>
          k.postedByArtifact !== !0 &&
          (k.sentByViewer === !0 ||
            (isOwnPrincipal(k.account, ue) && k.createdAt !== void 0 && k.toClaudeAt === k.createdAt)),
      ) &&
      (!I ||
        (thread.activatedBy !== void 0 &&
          isOwnPrincipal(thread.activatedBy, ue) &&
          !thread.comments.some(
            (comment) => comment.postedByArtifact === !0 && comment.toClaudeAt !== void 0,
          ))),
    Po = An && filtered_4.every(Tt),
    accountEpoch = getLiveState().accountEpoch,
    Ya = () => Po && getLiveState().accountEpoch === accountEpoch,
    ve = (k) => notify(Ya() ? { ...k, ownGesture: !0 } : k),
    Io = parseTimestamp(thread.activatedAt),
    Ft = appendActivatedComments(Se, Co, thread),
    Do = (k) =>
      k === void 0
        ? void 0
        : k.postedByArtifact === !0
          ? "page_posted_send"
          : k.sentByViewer === !1
            ? "send_by_another"
            : "send_sender_unknown",
    za = !I
      ? void 0
      : e.threadsDropped === !0 ||
          thread.commentsDegraded === !0 ||
          Io === null ||
          thread.comments.some(
            (comment) =>
              isDegradedComment(comment) ||
              (getCommentAuthorKind(comment) === "agent" && parseTimestamp(comment.createdAt) === null),
          )
        ? "read_may_hide_send"
        : Do(
            getCommentsAwaitingReply(thread).find(
              (k) => (parseTimestamp(k.toClaudeAt) ?? 1 / 0) >= Io && !Tt(k),
            ),
          ),
    ct = () =>
      getLiveState().accountEpoch !== accountEpoch
        ? "account_changed"
        : (za ?? (Ft.length > 0 ? Do(Ft.find((k) => !Tt(k))) : Po ? void 0 : "no_send_activation_unproven")),
    Xa = () => ct() === void 0,
    Ja = thread.commentsDegraded !== !0 && thread.comments.every((comment) => isTrustedComment(comment, ue)),
    No = !1,
    lt = [],
    Qa,
    Za = () =>
      (Qa ??= (async () => {
        if (
          thread.spanQuote === void 0 &&
          thread.anchorLabel === void 0 &&
          thread.anchorDetail === void 0 &&
          thread.anchorPath === void 0 &&
          thread.region !== !0 &&
          !thread.comments.some((comment) => comment.presence !== void 0)
        )
          return !1;
        if (thread.anchorFileDegraded === !0) return !0;
        let k = await PREVIEW_FEATURE_PROMPT({
          slug: slug,
          ...(thread.anchorFile !== void 0 && { file: thread.anchorFile }),
          signal: context.abortController.signal,
          credentials: context.credentials,
          feature: "artifact_autoreact_anchor_read",
          quotedToAudience: !0,
        });
        return k === void 0 || (await extractJsonScriptById(k, "ws-decisions")) !== null;
      })()),
    Lt = async () =>
      Ja &&
      !No &&
      !context.artifactRegistries.recordedPages.isWorkshopPage(slug) &&
      !(await Za()) &&
      (await Promise.all(uniq(lt).map((k) => extractJsonScriptById(k, "ws-decisions")))).every(
        (k) => k === null,
      );
  if (Nt) {
    let k =
      ct() ??
      (Ft.length === 0
        ? "no_send"
        : !areAllCommentsTrusted(Ft, thread)
          ? "thread_not_listed"
          : mn(context)
            ? "reply_denied"
            : canAutoreactWithoutPrompts(context)
              ? "nobody_to_ask"
              : void 0);
    if (k !== void 0) {
      (logFeatureSad("artifact_comments_autoreact", `mcp_${k}`),
        emitArtifactSummonStatus(se, {
          status: "declined",
          reason: k === "nobody_to_ask" ? "ask_mode" : "blocked",
        }));
      return;
    }
  }
  if (!An && !withinHourlyTurnCap(artifactState, now)) {
    if (
      (logFeatureSad("artifact_comments_autoreact", "hourly_cap"),
      emitArtifactSummonStatus(se, { status: "declined", reason: "hourly_cap" }),
      artifactState.lastProbeAllowed &&
        !artifactState.capNoticed &&
        getToolPermissionContext(context).mode !== "plan")
    )
      ((artifactState.capNoticed = !0),
        markAutoReactNoticePending(slug),
        ve(describeAutoReplyHeld(he, "cap", url, artifactName)));
    return;
  }
  if (!An) {
    if (artifactState.turnTimestamps.length === 0)
      ((artifactState.capNoticed = !1), (artifactState.planModeNoticed = !1));
    artifactState.turnTimestamps.push(now);
  }
  if (getToolPermissionContext(context).mode === "plan") {
    if (((artifactState.lastProbeAllowed = !1), !artifactState.planModeNoticed))
      ((artifactState.planModeNoticed = !0),
        markAutoReactNoticePending(slug),
        ve(describeAutoReplyHeld(he, "plan", url, artifactName)));
    (logFeatureOk("artifact_comments_autoreact", { plan_mode_notify: !0 }),
      emitArtifactSummonStatus(se, { status: "declined", reason: "plan_mode" }));
    return;
  }
  if (Nt) {
    if (
      ((artifactState.lastProbeAllowed = !0),
      (artifactState.lastProbeDeniedBy = null),
      (artifactState.lastReplyDeclinedByAutoMode = !1),
      emitSummonArm(getLiveState().live, slug),
      (se.suppressed = !1),
      emitArtifactSummonStatus(se, { status: "working" }),
      ye)
    ) {
      if (((w.consecutiveAuto += 1), w.consecutiveAuto >= Kr)) w.breakerOpen = !0;
    }
    ((w.lastAutoReplyAt = now),
      dropStaleHandOffs(slug),
      markAutoReactNoticePending(slug),
      ve(
        buildMcpThreadNotice({
          trigger: he,
          summonCount: Se.length,
          url: url,
          slug: slug,
          artifactName: artifactName,
          threadId: thread.id,
          handOff: registerSummonHandOff(se),
          resolved: thread.resolved,
        }),
      ),
      logFeatureOk("artifact_comments_autoreact", {
        handed_to_session: !0,
        hidden_for_mcp: !0,
        resolved: thread.resolved,
      }));
    return;
  }
  if (b === void 0) {
    if (!artifactState.defaultModeNoticed)
      ((artifactState.defaultModeNoticed = !0),
        markAutoReactNoticePending(slug),
        ve(describeAutoReplyHeld(he, "reply_tool_absent", url, artifactName)));
    (logFeatureSad("artifact_comments_autoreact", "reply_tool_absent"),
      emitArtifactSummonStatus(se, { status: "declined", reason: "blocked" }));
    return;
  }
  let Be = b,
    wn = isFixedFastAckEnabled(),
    [Le, qe] = await Promise.all([
      probeReplyPermission({ tool: Be, context: context, url: url, threadId: thread.id, fixedAck: wn }),
      readRecordedDecl(slug, context),
    ]);
  if (Le.threw || Le.skipped) {
    (logFeatureBad(
      "artifact_comments_autoreact",
      "permission_eval_error",
      Le.threw && Le.rulesOnlyProbe ? { rules_only: !0 } : void 0,
    ),
      emitArtifactSummonStatus(se, { status: "failed", reason: "post_failed" }));
    return;
  }
  let Ke =
      Le.rulesOnlyVerdict &&
      Le.decision.behavior === "allow" &&
      dt === void 0 &&
      thread.editCapable !== !0 &&
      !qe &&
      !0 &&
      no(context) &&
      !preToolUseHookMayCoverArtifact(context, ARTIFACT_COMMENTS_TOOL_NAME)
        ? await probeReplyPermission({
            tool: Be,
            context: context,
            url: url,
            threadId: thread.id,
            fixedAck: !1,
            fullReadUnder: Le.probeId,
          })
        : null,
    {
      decision: decision,
      denied: denied,
      verdictPremise: verdictPremise,
    } = Ke !== null &&
    !Ke.threw &&
    !Ke.skipped &&
    Ke.denied?.errorCode === "auto_mode_unavailable" &&
    !(
      Ke.decision.decisionReason?.type === "classifier" && Ke.decision.decisionReason.monitorBlocked === !0
    ) &&
    no(context)
      ? Ke
      : Le,
    { rulesOnlyVerdict: rulesOnlyVerdict } = Le,
    $t = { ask: null },
    accountEpoch_2 = getLiveState().accountEpoch,
    Te = denied === null && decision.behavior !== "allow" ? uo(context.agentId, artifactState, $t) : null;
  artifactState.lastProbeAllowed = decision.behavior === "allow" || Te !== null;
  let $o = denied?.errorCode === "auto_mode_unavailable",
    ei = decision.decisionReason?.type === "classifier" && decision.decisionReason.monitorBlocked === !0,
    At = $o && !ei;
  ((artifactState.lastProbeDeniedBy = At ? null : (denied?.reason ?? null)),
    (artifactState.lastReplyDeclinedByAutoMode = At),
    emitSummonArm(getLiveState().live, slug));
  let bn =
      Te === null &&
      !(
        decision.behavior === "allow" &&
        decision.decisionReason?.type === "rule" &&
        isArtifactActionRule(decision.decisionReason.rule)
      ),
    Sn = thread.editCapable === !0 && bn,
    Uo = dt !== void 0 && bn,
    Wo = thread.claudeActivated && Sn && !thread.resolved;
  if (Re("probe")) return;
  if (Oo && dt !== void 0 && !bn) {
    Eo();
    return;
  }
  if (denied !== null) {
    let k =
        denied.reason === "denied_by_auto_mode" &&
        Xa() &&
        !artifactState.autoModeDeclineNoticed &&
        (!$o || (At && no(context) && ba())),
      re = k && At && !qe;
    if (k) {
      ((artifactState.autoModeDeclineNoticed = !0), markAutoReactNoticePending(slug));
      let ie = describeAutoReplyHeld(he, "auto_mode_declined", url, artifactName);
      if (re) se.suppressed = !1;
      ve(re ? { ...ie, handOff: registerSummonHandOff(se) } : ie);
    }
    if (
      (logFeatureSad("artifact_comments_autoreact", denied.errorCode, {
        notified: k,
        ...(rulesOnlyVerdict && { rules_only: !0 }),
      }),
      re)
    )
      logFeatureOk("artifact_comments_classifier_unavailable_handoff");
    else if (At) {
      let ie = k
        ? "notified_page_owns_threads"
        : (ct() ??
          (artifactState.autoModeDeclineNoticed
            ? "already_notified"
            : (getAutoModeArbiterIssue(context) ?? "flag_off")));
      logFeatureSad("artifact_comments_classifier_unavailable_handoff", ie);
    }
    emitArtifactSummonStatus(se, re ? { status: "working" } : { status: "declined", reason: denied.reason });
    return;
  }
  let kn = () => {
    if (!artifactState.defaultModeNoticed) {
      ((artifactState.defaultModeNoticed = !0), markAutoReactNoticePending(slug));
      let k = describeAutoReplyHeld(he, "notify_only", url, artifactName);
      (ve(ma() && !artifactState.heldReplyDeclined ? { ...k, summary: p6s(artifactName) } : k),
        logFeatureOk("artifact_comments_autoreact", {
          notified_only: !0,
          ...(rulesOnlyVerdict && { rules_only: !0 }),
        }));
    } else
      logFeatureOk("artifact_comments_autoreact", {
        notified_only: !0,
        notice_suppressed: !0,
        ...(rulesOnlyVerdict && { rules_only: !0 }),
      });
    emitArtifactSummonStatus(se, { status: "declined", reason: "ask_mode" });
  };
  if (decision.behavior !== "allow" && Te === null) {
    kn();
    return;
  }
  let vn = Ta(Be, context);
  if (
    canPageReplyDirectly({
      pageOwnsThreads: qe,
      handsOffToTurn: Uo,
      composesEdit: Wo,
      slug: slug,
      editRejudgedByAutoMode: vn,
    })
  ) {
    (logFeatureSad("artifact_comments_autoreact", "page_owns_threads", {
      before_working: !0,
      ...(rulesOnlyVerdict && { rules_only: !0 }),
    }),
      emitArtifactSummonStatus(se, { status: "declined", reason: "blocked" }));
    return;
  }
  if (
    ((se.suppressed = !1),
    emitArtifactSummonStatus(
      se,
      Te === null ? { status: "working" } : { status: "needs_user", reason: "approval_required" },
    ),
    ye)
  ) {
    if (((w.consecutiveAuto += 1), w.consecutiveAuto >= Kr)) w.breakerOpen = !0;
  }
  if (Uo) {
    ((w.lastAutoReplyAt = now), markAutoReactNoticePending(slug));
    let k = KQe();
    if (k) {
      if (
        (await handOffThreadToBackgroundAgent({
          slug: slug,
          url: url,
          artifactName: artifactName,
          thread: thread,
          trigger: he,
          summonCount: Se.length,
          sourcePath: dt,
          summon: se,
        })) ||
        yn("fork")
      )
        return;
      markAutoReactNoticePending(slug);
    }
    (ve(
      buildSourcePublishedNotice({
        trigger: he,
        summonCount: Se.length,
        url: url,
        artifactName: artifactName,
        threadId: thread.id,
        sourcePath: dt,
        handOff: registerSummonHandOff(se),
        resolved: thread.resolved,
        agentsMayHoldThreads: k || hasThreadAgentForSlug(slug),
      }),
    ),
      logFeatureOk("artifact_comments_autoreact", {
        handed_to_session: !0,
        resolved: thread.resolved,
        edit_capable: thread.editCapable === !0,
        ...(rulesOnlyVerdict && { rules_only: !0 }),
      }));
    return;
  }
  let Pe,
    Ve = !1;
  if (Se.length > 0 && thread.claudeActivated && Sn && !xt(slug) && !vn && !qe && !thread.resolved && lo()) {
    let k = { trigger: he, thread: thread, context: context, slug: slug, summons: Se, scanGen: e.scanGen },
      re = wn ? await selectFastAckText(k, Sn) : await composeArtifactCommentFastAck(k);
    if (Re("fast_ack_compose")) return;
    let ie = null,
      de = !1,
      W = { rode: !1 };
    try {
      ie = await postThreadReply({
        tool: Be,
        context: context,
        url: url,
        slug: slug,
        threadId: thread.id,
        text: re,
        declareAnswersSummon: st,
        continuesReplyId: yt,
        composedFromOwnWordsOnly: Lt,
        threadTranscript: S(),
        ...(verdictPremise !== null && {
          canUseTool: makeFixedAckPermissionProbe(
            verdictPremise,
            { tool: Be, url: url, threadId: thread.id, text: re },
            W,
          ),
        }),
      });
    } catch {
      de = !0;
    }
    let fe = {
      fast_ack: !0,
      ...(wn && { fast_ack_fixed: !0 }),
      ...(W.rode && { fast_ack_on_probe_verdict: !0 }),
      ...(rulesOnlyVerdict && { rules_only: !0 }),
    };
    if (ie?.kind === "posted") {
      if (
        ((st = !1),
        (Ve = !0),
        (Pe = ie.commentId),
        (yt =
          ie.epoch === getLiveState().accountEpoch ||
          (ie.commentId !== void 0 && isOwnPostedReply(ie.commentId))
            ? (ie.commentId ?? Ro)
            : void 0),
        recordOwnReply(w, ie),
        ie.commentId !== void 0)
      )
        se.coversReplyId = ie.commentId;
      if (((w.lastAutoReplyAt = Date.now()), !oAe())) URo(slug);
      let Ae = !isAutoReactEnabled() || isSlugStoppedAnywhere(slug) || scanStamp(slug) !== e.scanGen;
      if (
        (logFeatureOk("artifact_comments_autoreact", {
          ...fe,
          ...(Ae && { post_stop_notice_suppressed: !0 }),
        }),
        Ae)
      )
        return;
      let We = getToolPermissionContext(context).mode === "plan";
      if (
        (markAutoReactNoticePending(slug),
        ve({
          coalesce: { family: "auto-replied", artifactName: artifactName, threadId: thread.id },
          detail: We
            ? `Acknowledgement reply posted to thread ${thread.id} on artifact ${url}; automatic replies are paused (plan mode), so the full reply comes from this session when it next acts. When posting it, set acknowledge_duplicate: true \u2014 the acknowledgement already stands as the thread's reply, so the duplicate guard refuses a plain follow-up.`
            : `Acknowledgement reply posted to thread ${thread.id} on artifact ${url}; the substantive auto-reply is still being composed and is reported separately.`,
        }),
        We)
      )
        return;
      if (se.coversReplyId !== void 0) emitArtifactSummonStatus(se, { status: "working" });
    } else if (ie?.kind === "unexpected_result_shape") {
      ((w.consecutivePipelineDenials += 1),
        logFeatureBad("artifact_comments_autoreact", "unexpected_result_shape", fe),
        emitArtifactSummonStatus(se, { status: "declined", reason: "blocked" }));
      return;
    } else if (de) {
      ((w.consecutivePipelineDenials += 1),
        logFeatureBad("artifact_comments_autoreact", "fast_ack_post_threw", fe),
        emitArtifactSummonStatus(se, { status: "declined", reason: "blocked" }));
      return;
    } else if (ie?.kind === "refused" || ie?.kind === "no_result") {
      if (ie.kind === "no_result" || ie.denial) w.consecutivePipelineDenials += 1;
      logFeatureSad("artifact_comments_autoreact", "fast_ack_post_failed", fe);
    }
    if (ie?.kind !== "posted" && Re("fast_ack")) return;
    if (
      ie?.kind === "answered_elsewhere" ||
      ie?.kind === "answered_post_time" ||
      ie?.kind === "summon_foreign"
    ) {
      logFeatureSad("artifact_comments_autoreact", toStandDownReason(ie.kind), fe);
      return;
    }
    if (ie?.kind === "not_activated") {
      if (ie.pageOwnsThreads) {
        (logFeatureSad("artifact_comments_autoreact", "page_owns_threads", fe),
          emitArtifactSummonStatus(se, { status: "declined", reason: "blocked" }));
        return;
      }
      logFeatureSad("artifact_comments_autoreact", "deactivated_mid_turn", fe);
      return;
    }
  }
  let Ye;
  if (Wo) {
    let k = { resolved: !1 },
      re = await checkAutoEditEligibility(slug, context, vn);
    if (re.read !== void 0) lt.push(re.read.html);
    if (Re("editability")) return;
    let ie = re.read !== void 0 ? v_e(re.read) : void 0,
      de = "unavailable";
    if (re.editable) {
      let W = null;
      if (isResponderDispatchEnabled() && Mt !== void 0) {
        let fe = await triageArtifactComment({ thread: thread, context: context, foreign: na(thread, ue) });
        if (Re("analysis")) return;
        if (fe === "act") {
          if (
            ((W = await runCommentThreadAnalyst({
              context: context,
              url: url,
              slug: slug,
              thread: thread,
              triggerComment: Mt,
            })),
            (No = W !== null),
            Re("analysis"))
          )
            return;
        }
      }
      if (
        ((de = await composeAutoEditWithTimeout(
          {
            trigger: he,
            thread: thread,
            context: context,
            slug: slug,
            summons: Se,
            pagesRead: lt,
            anchorSnippetMemo: k,
            scanGen: e.scanGen,
            pageForeign: ie,
            ...(W !== null && { analystBrief: W }),
          },
          re,
        )),
        Re("edit_compose"))
      )
        return;
    }
    if (de === null) {
      emitArtifactSummonStatus(se, { status: "failed", reason: "compose_failed" });
      return;
    }
    if (de === "unavailable")
      Ye = await composeThreadReply({
        trigger: he,
        thread: thread,
        context: context,
        slug: slug,
        summons: Se,
        pagesRead: lt,
        anchorSnippetMemo: k,
        ...(re.read !== void 0 && { sourceRead: re.read }),
        ...(ie !== void 0 && { pageForeign: ie }),
      });
    else if (de.kind === "usage_limited") {
      emitArtifactSummonStatus(se, { status: "declined", reason: "usage_limited" });
      return;
    } else if (de.kind === "patch_failed" || de.kind === "timed_out") {
      let W = de.kind === "timed_out" ? "timed_out" : de.reason,
        fe = Qd[W],
        ge;
      try {
        ge = await postThreadReply({
          tool: Be,
          context: context,
          url: url,
          slug: slug,
          threadId: thread.id,
          text: AUTO_EDIT_FAILURE_REPLIES[W],
          declareAnswersSummon: st,
          continuesReplyId: yt,
          composedFromOwnWordsOnly: Lt,
          threadTranscript: S(),
          recheck: getOwnReplyInfo(w, Dt),
        });
      } catch {
        (logFeatureBad(
          "artifact_comments_autoreact",
          "permission_eval_error",
          rulesOnlyVerdict ? { rules_only: !0 } : void 0,
        ),
          emitArtifactSummonStatus(se, { status: "failed", reason: "post_failed" }));
        return;
      }
      applyPostOutcome({
        post: ge,
        threadState: w,
        artifactState: artifactState,
        slug: slug,
        scanGen: e.scanGen,
        notify: ve,
        summon: se,
        trigger: he,
        url: url,
        artifactName: artifactName,
        ackPosted: Ve,
        ackCommentId: Pe,
        rulesOnlyProbe: rulesOnlyVerdict,
        ownSendWithheld: ct(),
        pageOwnsThreads: qe,
        notice: {
          summary: autoRepliedNotice(artifactName),
          detail:
            `Auto-reply posted to thread ${thread.id} on artifact ${url}: ${fe}` +
            buildAutoPostedReplyNote([Pe, ge.kind === "posted" ? ge.commentId : void 0]),
        },
        replyWithheldNotice: {
          summary: bwt(artifactName),
          detail:
            `Auto-reply to thread ${thread.id} on artifact ${url} was withheld: ${getStandDownReasons(ge)}. ` +
            Xqr(fe) +
            noConfirmOnlyReplyNote(ge),
        },
        allowSiblingReset: !1,
      });
      return;
    } else if (de.kind === "edit") {
      if (Mt === void 0) {
        (logFeatureSad("artifact_comments_autoreact", "edit_no_trigger"),
          emitArtifactSummonStatus(se, { status: "failed", reason: "compose_failed" }));
        return;
      }
      let W = await applyAutoEdit({
        tool: e.tool,
        context: context,
        url: url,
        slug: slug,
        threadId: thread.id,
        recheck: getOwnReplyInfo(w, Dt),
        declareAnswersSummon: st,
        continuesReplyId: yt,
        triggerCommentId: Mt.id,
        content: de.content,
        reply: de.reply,
        composeTelemetry: de.telemetry,
        favicon: de.favicon,
        storedTitle: de.storedTitle,
        sourceVer: de.sourceVer,
        roundTripSignal: de.roundTripSignal,
        threadTranscript: S,
        composedFromOwnWordsOnly: Lt,
        composeReplyOnly: () =>
          composeThreadReply({
            trigger: he,
            thread: thread,
            context: context,
            slug: slug,
            summons: Se,
            pagesRead: lt,
            anchorSnippetMemo: k,
            sourceRead: re.read,
            ...(ie !== void 0 && { pageForeign: ie }),
          }),
        paused: Re,
      });
      if (W.outcome === "stood_down") return;
      let fe = (ge) => {
        if (isAutoReactEnabled() && !isSlugStoppedAnywhere(slug) && scanStamp(slug) === e.scanGen) {
          let Ae = Ve ? ` beyond the acknowledgement${formatCommentIds([Pe])}` : "";
          (markAutoReactNoticePending(slug),
            ve({
              summary: bwt(artifactName),
              detail: `A requested automatic edit on artifact ${url} (thread ${thread.id}) was refused because the thread's edit grant belongs to another user, so the artifact was NOT changed, and ${ge}${Ae}. Read the thread and make the change yourself if appropriate.`,
            }));
        } else logFeatureSad("artifact_comments_autoreact", "summon_foreign_notice_suppressed");
      };
      if (W.outcome === "compose_failed") {
        (emitArtifactSummonStatus(
          se,
          W.miss === "usage_limited"
            ? { status: "declined", reason: "usage_limited" }
            : { status: "failed", reason: "compose_failed" },
        ),
          fe("no reply could be composed"));
        return;
      }
      if (
        W.failKind === "summon_foreign" &&
        W.outcome === "publish_error" &&
        W.post?.kind !== "answered_elsewhere" &&
        W.post?.kind !== "answered_post_time" &&
        W.post?.kind !== "summon_foreign"
      )
        fe("its reply was not posted");
      if (W.post !== null) {
        let ge =
            W.outcome === "completed" || W.outcome === "completed_unresolved" || W.outcome === "reply_failed",
          Ae = getStandDownReasons(W.post),
          We = [Pe, W.post.kind === "posted" ? W.post.commentId : void 0],
          Go = formatCommentIds(We);
        applyPostOutcome({
          post: W.post,
          threadState: w,
          artifactState: artifactState,
          slug: slug,
          scanGen: e.scanGen,
          notify: ve,
          summon: se,
          trigger: he,
          url: url,
          artifactName: artifactName,
          ackPosted: Ve,
          ackCommentId: Pe,
          editLanded: ge,
          rulesOnlyProbe: rulesOnlyVerdict,
          ownSendWithheld: ct(),
          pageOwnsThreads: qe,
          notice: ge
            ? W.outcome === "completed"
              ? {
                  coalesce: { family: "auto-edited", artifactName: artifactName, threadId: thread.id },
                  detail:
                    `Auto-edited artifact ${url} in response to thread ${thread.id} and posted a summary reply${Go}. ` +
                    "Review the change \u2014 if it missed the mark, edit the artifact yourself and republish.",
                }
              : {
                  summary: autoEditedNotice(artifactName),
                  detail:
                    `Auto-edited artifact ${url} in response to thread ${thread.id} and posted a summary reply${Go}. ` +
                    "Review the change \u2014 if it missed the mark, edit the artifact yourself and republish." +
                    ` The thread may not be resolved \u2014 check it (${pickByToolset('action "comments"', () => commentsToolAction("comments"))}); if the change is right and the thread is still open, resolve it (${pickByToolset('Artifact tool, action "resolve"', () => commentsToolAction("resolve"))}). Do NOT post another reply \u2014 the summary reply is already in the thread.`,
                }
            : W.failKind === "summon_foreign"
              ? {
                  coalesce: { family: "auto-replied", artifactName: artifactName, threadId: thread.id },
                  detail:
                    `Auto-replied to thread ${thread.id} on artifact ${url} \u2014 an acknowledgement only: the thread's edit grant belongs to another user, so the artifact was NOT changed. ` +
                    "If the thread asks for a change to the artifact, read the thread and make the change yourself if appropriate." +
                    buildAutoPostedReplyNote(We),
                }
              : {
                  summary:
                    W.failKind === "unexpected_result_shape" ||
                    W.failKind === "outcome_unknown" ||
                    W.failKind === "attribution_unverified"
                      ? bwt(artifactName)
                      : autoRepliedNotice(artifactName),
                  detail:
                    W.failKind === "unexpected_result_shape"
                      ? `Auto-reply posted to thread ${thread.id} on artifact ${url}: an automatic edit attempt did not return a recognizable publish result, so it is UNKNOWN whether the artifact was changed. Review the artifact and the thread.`
                      : W.failKind === "outcome_unknown"
                        ? `Auto-reply posted to thread ${thread.id} on artifact ${url}: an automatic edit attempt could not confirm whether its publish landed, so it is UNKNOWN whether the artifact was changed. Review the artifact and the thread.`
                        : W.failKind === "attribution_unverified"
                          ? `Auto-reply posted to thread ${thread.id} on artifact ${url}: an automatic edit PUBLISHED but its attribution to the thread's edit grant could not be verified. Review the change.`
                          : `Auto-reply posted to thread ${thread.id} on artifact ${url}: a requested automatic edit was refused, so the artifact was NOT changed. Read the thread and make the change yourself if appropriate.` +
                            buildAutoPostedReplyNote(We),
                },
          replyWithheldNotice:
            W.failKind === "attribution_unverified"
              ? {
                  summary: bwt(artifactName),
                  detail: `Auto-edit on artifact ${url} PUBLISHED in response to thread ${thread.id}, but its attribution to the thread's edit grant could not be verified, and the follow-up note was withheld: ${Ae}. Review the change.`,
                }
              : W.failKind === "unexpected_result_shape" || W.failKind === "outcome_unknown"
                ? {
                    summary: bwt(artifactName),
                    detail:
                      W.failKind === "unexpected_result_shape"
                        ? `An automatic edit attempt on artifact ${url} (thread ${thread.id}) did not return a recognizable publish result, so it is UNKNOWN whether the artifact was changed; the follow-up note was withheld because ${Ae}. Review the artifact and the thread.`
                        : `An automatic edit attempt on artifact ${url} (thread ${thread.id}) could not confirm whether its publish landed, so it is UNKNOWN whether the artifact was changed; the follow-up note was withheld because ${Ae}. Review the artifact and the thread.`,
                  }
                : ge
                  ? void 0
                  : {
                      summary: bwt(artifactName),
                      detail:
                        `A requested automatic edit on artifact ${url} (thread ${thread.id}) was refused, so the artifact was NOT changed, and the explanatory reply was withheld: ${Ae}. Read the thread and make the change yourself if appropriate.` +
                        noConfirmOnlyReplyNote(W.post),
                    },
          allowSiblingReset: ge,
        });
      } else emitArtifactSummonStatus(se, { status: "failed", reason: "post_failed" });
      if (
        (W.outcome === "publish_refused" || W.outcome === "publish_error") &&
        (W.publishDenied === !0 ||
          W.failKind === "pin_paused" ||
          W.failKind === "disabled" ||
          W.failKind === "unexpected_result_shape" ||
          W.failKind === "no_result")
      )
        w.consecutivePipelineDenials += 1;
      if (W.outcome === "reply_failed") {
        let ge = formatCommentIds([Pe]),
          Ae = W.post?.kind,
          We = W.post?.kind === "refused" && W.post.autoModeDeclined;
        if (isAutoReactEnabled() && !isSlugStoppedAnywhere(slug) && scanStamp(slug) === e.scanGen)
          (markAutoReactNoticePending(slug),
            ve({
              summary:
                Ae === "answered_elsewhere" || Ae === "answered_post_time"
                  ? autoEditedNotice(artifactName)
                  : g6s(artifactName),
              detail:
                Ae === "answered_elsewhere" || Ae === "answered_post_time"
                  ? `Auto-edited artifact ${url} in response to thread ${thread.id}, but the summary reply was withheld: ${Ae === "answered_elsewhere" ? La : $a}. ` +
                    "The artifact WAS changed \u2014 review the change and the thread's existing reply."
                  : Ae === "summon_foreign"
                    ? `Auto-edited artifact ${url} in response to thread ${thread.id}, but the summary reply was withheld: ${STAND_DOWN_REASONS}. ` +
                      "The artifact WAS changed \u2014 review the change."
                    : Ae === "not_activated" && W.post?.pageOwnsThreads
                      ? `Auto-edited artifact ${url} in response to thread ${thread.id}, but the summary reply was withheld: ${Ha}. ` +
                        "The artifact WAS changed \u2014 review the change; an answer belongs in the page's own thread."
                      : `Auto-edited artifact ${url} in response to thread ${thread.id}, but the summary reply ${We ? "was not posted (auto mode did not approve it)" : "FAILED to post"} \u2014 ` +
                        (Ve
                          ? `the artifact WAS changed, and the only reply standing is this session's acknowledgement${ge}. Review the change, then post the promised summary reply with acknowledge_duplicate: true \u2014 the duplicate guard refuses a plain follow-up \u2014 or revert.` +
                            RESOLVE_AFTER_REPLY_NOTE()
                          : "the artifact WAS changed with no reply in the thread. Review the change and reply or revert." +
                            replyThenResolveNote()),
            }));
        else logFeatureSad("artifact_comments_autoreact", "edit_landed_notice_suppressed");
      }
      return;
    } else Ye = de.text;
  } else
    Ye = await composeThreadReply({
      trigger: he,
      thread: thread,
      context: context,
      slug: slug,
      summons: Se,
      pagesRead: lt,
    });
  if (typeof Ye !== "string") {
    emitArtifactSummonStatus(
      se,
      Ye.miss === "usage_limited"
        ? { status: "declined", reason: "usage_limited" }
        : { status: "failed", reason: "compose_failed" },
    );
    return;
  }
  if (containsBlockedChars(Ye)) {
    (logFeatureSad("artifact_comments_autoreact", "compose_hidden_codepoints"),
      emitArtifactSummonStatus(se, { status: "failed", reason: "compose_failed" }));
    return;
  }
  let ti = Ye,
    Ho = async () => {
      if (Te !== null && getLiveState().accountEpoch !== accountEpoch_2) {
        logFeatureSad("artifact_comments_autoreact", "held_reply_account_changed");
        return;
      }
      if (isBuiltInArtifactHiddenForMcp()) {
        emitArtifactSummonStatus(se, { status: "declined", reason: "auto_reply_off" });
        return;
      }
      if (Te !== null && Re("held_reply_compose")) return;
      let k = Te === null ? null : uo(context.agentId, artifactState, $t);
      if (Te !== null && k === null) {
        (logFeatureSad("artifact_comments_autoreact", "held_reply_channel_gone"), kn());
        return;
      }
      let re;
      try {
        re = await postThreadReply({
          tool: Be,
          context:
            Te === null
              ? context
              : { ...context, abortController: createChildAbortController(context.abortController) },
          url: url,
          slug: slug,
          threadId: thread.id,
          text: ti,
          declareAnswersSummon: st,
          continuesReplyId: yt,
          composedFromOwnWordsOnly: Lt,
          threadTranscript: S(),
          recheck: Te === null ? getOwnReplyInfo(w, Dt) : { ownReplyIds: new Set(), scanRowIds: Dt },
          ...(k !== null && { canUseTool: k, held: { admittedEpoch: accountEpoch_2 } }),
        });
      } catch {
        (logFeatureBad(
          "artifact_comments_autoreact",
          "permission_eval_error",
          rulesOnlyVerdict ? { rules_only: !0 } : void 0,
        ),
          emitArtifactSummonStatus(se, { status: "failed", reason: "post_failed" }));
        return;
      }
      if ($t.ask === "unanswered" && re.kind !== "account_changed") {
        if (Re("held_reply_ask")) return;
        (logFeatureSad("artifact_comments_autoreact", "held_reply_channel_gone"), kn());
        return;
      }
      if (
        (applyPostOutcome({
          post: re,
          threadState: w,
          artifactState: artifactState,
          slug: slug,
          scanGen: e.scanGen,
          notify: ve,
          summon: se,
          trigger: he,
          url: url,
          artifactName: artifactName,
          ackPosted: Ve,
          ackCommentId: Pe,
          rulesOnlyProbe: rulesOnlyVerdict,
          ownSendWithheld: ct(),
          pageOwnsThreads: qe,
          heldForPerson: $t.ask === "answered",
          notice: {
            coalesce: { family: "auto-replied", artifactName: artifactName, threadId: thread.id },
            detail:
              `Auto-replied to thread ${thread.id} on artifact ${url} \u2014 a reply only: it may answer a question, but nothing in the artifact was changed. ` +
              "If the thread asks for a change to the artifact, read the thread and make the change yourself if appropriate." +
              (thread.resolved
                ? " The acknowledgement reply is already in the thread \u2014 do NOT post another; the thread stays resolved. Do not reply only to confirm that no change was needed \u2014 the standing reply covers it."
                : buildAutoPostedReplyNote([Pe, re.kind === "posted" ? re.commentId : void 0])),
          },
          ...(Ve && {
            replyWithheldNotice: {
              summary: bwt(artifactName),
              detail:
                `The promised follow-up reply to thread ${thread.id} on artifact ${url} was withheld: ${getStandDownReasons(re)}. The acknowledgement${formatCommentIds([Pe])} stands as this session's reply \u2014 review the thread; if it asks for an artifact change, make the change yourself if appropriate.` +
                noConfirmOnlyReplyNote(re),
            },
          }),
          allowSiblingReset: !0,
        }),
        Te !== null)
      )
        flushAutoreactLedger();
    };
  if (Te === null) {
    await Ho();
    return;
  }
  let Bo = (artifactState.heldReplyChain ?? Promise.resolve())
    .then(Ho)
    .catch(() => {
      logFeatureBad("artifact_comments_autoreact", "held_reply_error");
    })
    .finally(() => {
      if (artifactState.heldReplyChain === Bo) artifactState.heldReplyChain = null;
    });
  artifactState.heldReplyChain = Bo;
}

export { processArtifactThread, collectPendingSummons, dn, checkReplyPermission, getLocalSourcePath };
