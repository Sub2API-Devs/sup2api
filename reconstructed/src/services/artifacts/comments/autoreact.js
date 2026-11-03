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
import { getPermissionPromptPerson } from "../../../utils/permissions/permissionPromptHost.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../analytics/featureTelemetry.js";
import { spawnOrJoinThreadAgent, isThreadAgentEnabled, hasThreadAgentForSlug } from "./backgroundAgent.js";
import {
  buildThreadAgentPrompt,
  buildThreadFollowUpPrompt,
  areAllCommentsTrusted,
  appendActivatedComments,
  isReplyDeniedByRules,
  isTrustedCommentPrompts,
  describeAutoReplyHeld,
  buildMcpThreadNotice,
  buildSourcePublishedNotice,
  replyThenResolveNote,
} from "./threadPrompts.js";
import { isAbortError } from "../../../utils/errors.js";
import { logError } from "../../../utils/log.js";
import {
  isProbedLivePage,
  isDegradedComment,
  isHumanComment,
  shouldFireActivation,
  isMadroneSpindleNewelEnabled,
  isRecentToClaudeAt,
  MAX_NEWEL_MS,
  MAX_AUX_RETRIES,
  canAutoreactWithoutPrompts,
  MAX_STAMP_AGE_MS,
  getAutoReactRateLimit,
  getMaxAutoTurns,
  getAutoEditPermissionContext,
  canAutoEditWithoutPrompt,
  autoReactCanUseTool,
  shouldFireOnStamps,
  isFastAckEnabled,
  raiseStampHighWater,
  recordJudged,
  ownAccount,
  noteDeferOnce,
  isMadroneSpindleEnabled,
  selectCommentsToJudge,
  hasToClaudeAt,
  MAX_MAIN_AGENT_RETRIES,
  isOchreBitternEnabled,
  hasCommentsFromOthers,
} from "./autoreactGates.js";
import {
  isNewelFlagOn,
  isLastAgentReplyCurrent,
  describeReplyDenial,
  canForkThreadReply,
  checkReplyPermissionSafe,
  withinHourlyTurnCap,
  canUseClassifierArbiter,
  isGussetFlagOn,
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
import {
  isToClaudeTimestamp,
  hasSummonClaim,
  hasHostClaim,
  consumeReadClaims,
  consumeSummonClaims,
  waitForSummonClaim,
} from "./autoreactState.js";
import { isBuiltInArtifactHiddenForMcp } from "../artifactsMcpTools.js";
import {
  isAutoreactArmed,
  emptyAutoReactMessage,
  postThreadReply,
  isAutoReactEnabled,
  applyPostOutcome,
} from "./postReply.js";
import { isSlugStoppedAnywhere, scanStamp, emitSummonArm } from "../summonArms.js";
import { isBusyShorterThan, isBusyAtLeast } from "../../../utils/plugins/hooksModulesLoadGate.js";
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
  autoRepliesPausedNotice,
  needsPermissionToReplyNotice,
  autoRepliedNotice,
  autoEditNeedsReviewNotice,
  autoEditedNotice,
  autoEditedReviewNotice,
} from "../../../tools/ArtifactTool/artifactNotices.js";
import { isOwnPrincipal } from "./commentAuthorship.js";
import { PREVIEW_FEATURE_PROMPT } from "../../../tools/AskUserQuestionTool/prompt.js";
import { extractJsonScriptById } from "../pageScripts.js";
import { isFixedFastAckEnabled, makeFixedAckPermissionProbe } from "./ackReplies.js";
import { preToolUseHookMayCoverArtifact } from "../hookCoverage.js";
import { ARTIFACT_COMMENTS_TOOL_NAME } from "../../../tools/ArtifactTool/constants.js";
import { selectFastAckText, composeArtifactCommentFastAck, composeThreadReply } from "./composeReply.js";
import { canAutoReply, bumpUnattendedReply } from "../../artifactComments/autoReplyNotices.js";
import {
  toStandDownReason,
  checkAutoEditEligibility,
  composeAutoEditWithTimeout,
  AUTO_EDIT_FAILURE_FOR_MODEL,
  AUTO_EDIT_FAILURE_REPLIES,
  buildAutoPostedReplyNote,
  getStandDownReasons,
  noConfirmOnlyReplyNote,
  applyAutoEdit,
  formatCommentIds,
  REPLY_ALREADY_STANDS,
  REPLY_ALREADY_STANDS_SHORT,
  STAND_DOWN_REASONS,
  PAGE_OWNS_THREADS_REASON,
  RESOLVE_AFTER_REPLY_NOTE,
} from "./autoEdit.js";
import { mayHaveForeignWriters } from "../frameComments.js";
import { isResponderDispatchEnabled, triageArtifactComment } from "./threadClassifier.js";
import { runCommentThreadAnalyst } from "./threadAnalyst.js";
import { Xqr } from "../../../../vendor/lodash-es/upperFirst.js";
import { containsBlockedChars } from "./commentMentions.js";
import { createChildAbortController } from "../../../utils/abortController.js";
import { flushAutoreactLedger } from "./autoreactLedger.js";

//@ chunk-9tgt55am.js:77626-78056 placement
async function checkReplyPermission(e) {
  let { url, thread, context, replyTool } = e;
  if (isAutoAllowedInMode(replyTool, getToolPermissionContext(context)) === "bypassPermissions")
    return (
      (await checkRuleBasedPermissions(
        replyTool,
        {
          action: "reply",
          url,
          thread_id: thread.id,
          text: "",
        },
        context,
        {
          crashIsObjection: true,
        },
      )) === null
    );
  let s = await probeReplyPermission({
    tool: replyTool,
    context,
    url,
    threadId: thread.id,
    fixedAck: false,
    rulesOnlyOrNothing: true,
  });
  return (
    !s.threw &&
    s.skipped !== true &&
    s.decision.behavior === "allow" &&
    !(s.decision.decisionReason?.type === "rule" && isArtifactActionRule(s.decision.decisionReason.rule))
  );
}
//@ chunk-9tgt55am.js:78056-78597 placement
async function handOffThreadToBackgroundAgent(e) {
  let permissionPromptPerson = getPermissionPromptPerson();
  if (permissionPromptPerson === null) {
    logFeatureSad("artifact_comments_autoreact", "fork_fallback_no_person");
    return false;
  }
  let { slug, url, thread } = e;
  try {
    return (
      (
        await spawnOrJoinThreadAgent({
          slug,
          threadId: thread.id,
          url,
          artifactName: e.artifactName,
          directive: buildThreadAgentPrompt({
            trigger: e.trigger,
            summonCount: e.summonCount,
            url,
            threadId: thread.id,
            sourcePath: e.sourcePath,
            resolved: thread.resolved,
          }),
          followUp: buildThreadFollowUpPrompt({
            url,
            threadId: thread.id,
          }),
          canUseTool: permissionPromptPerson,
          summon: {
            ...e.summon,
          },
          route: "watch",
        })
      ).outcome !== "fallback"
    );
  } catch (error) {
    if (!isAbortError(error)) {
      logError(error);
      logFeatureBad("artifact_comments_autoreact", "fork_handoff_error");
    }
    return false;
  }
}
//@ chunk-9tgt55am.js:78597-78656 placement
function getLocalSourcePath(e, t) {
  return isProbedLivePage(e) ? undefined : t.localSourcePath(e);
}
//@ chunk-9tgt55am.js:78656-78736 placement
function localSourcePathIfEditCapable(thread, slug, recordedPages) {
  return isNewelFlagOn() || (thread.editCapable === true && !thread.resolved)
    ? getLocalSourcePath(slug, recordedPages)
    : undefined;
}
//@ chunk-9tgt55am.js:78736-79281 placement
function collectPendingSummons(thread, threadState) {
  let n = [];
  let a = false;
  for (let comment of thread.comments) {
    if (isDegradedComment(comment) || !isHumanComment(comment)) continue;
    if (!threadState.seen.has(comment.id)) {
      a ||= comment.postedByArtifact !== true;
      if (comment.toClaudeAt !== undefined) n.push(comment);
    } else if (
      comment.toClaudeAt !== undefined &&
      threadState.sentToClaudeAt.has(comment.id) &&
      shouldFireActivation(threadState.sentToClaudeAt.get(comment.id) ?? null, comment.toClaudeAt).fire
    ) {
      a = true;
      n.push(comment);
    }
  }
  let activatedAt = thread.activatedAt ?? null;
  let fire =
    threadState.activatedAtObserved && shouldFireActivation(threadState.activatedAt, activatedAt).fire;
  let d =
    n.length === 0 &&
    !thread.resolved &&
    fire &&
    thread.comments.some((comment) => getCommentAuthorKind(comment) !== "agent");
  if (n.length === 0 && !d) return null;
  return {
    summons: n,
    typedGesture: a,
    activationFires: fire,
    activationPending: d,
  };
}
//@ chunk-9tgt55am.js:79281-81163 placement
/**
 * 线程被激活/有人发评论给 Claude 时，决定立即自动回复、交给后台 agent 还是排队，并发出通知。
 */
async function handleThreadActivation(e) {
  let { slug, thread, threadState } = e;
  if (!isMadroneSpindleNewelEnabled() || !thread.claudeActivated) return;
  let pendingSummons = collectPendingSummons(thread, threadState);
  if (pendingSummons === null) return;
  let { summons, typedGesture, activationFires, activationPending } = pendingSummons;
  let activatedAt = thread.activatedAt ?? null;
  if (
    isLastAgentReplyCurrent({
      thread,
      threadState,
      trigger: activationPending ? "activation" : "fresh",
      summonsForOrdering: summons,
      activatedAt: activationPending ? activatedAt : threadState.activatedAt,
    })
  )
    return;
  let R = latestValidTimestamp(
    activationPending ? [activatedAt] : summons.map((summon) => summon.toClaudeAt),
  );
  let b = R ?? "";
  if (threadState.busyAckedGestureAt === b) return;
  let N =
    activationFires && threadState.activatedAt === null && !e.threadsDropped
      ? getCommentsAwaitingReply(thread).filter(
          (z) => isRecentToClaudeAt(z, Date.now()) && !summons.includes(z),
        )
      : [];
  let mapped = [...summons, ...N].map((z) => z.toClaudeAt);
  let w = isHostEntrypoint();
  let L;
  if (
    mapped.length > 0 &&
    mapped.every(isToClaudeTimestamp) &&
    new Set(mapped).size === mapped.length &&
    mapped.every((z) =>
      hasSummonClaim(slug, thread.id, z, {
        hostSeeded: w,
      }),
    )
  )
    L = w && mapped.every((z) => hasHostClaim(slug, thread.id, z)) ? "seeded_turn" : "read";
  if (L === "read") return;
  let busyWithheldForecast = threadState.busyWithheldForecast;
  if (
    L === undefined &&
    busyWithheldForecast?.gestureAt === b &&
    Date.now() - busyWithheldForecast.at < MAX_NEWEL_MS
  )
    return;
  let D = threadState.consecutivePipelineDenials >= MAX_AUX_RETRIES;
  let G =
    isBuiltInArtifactHiddenForMcp() ||
    localSourcePathIfEditCapable(thread, slug, e.context.artifactRegistries.recordedPages) !== undefined;
  let V = D && !G;
  let q = async () =>
    isBuiltInArtifactHiddenForMcp() &&
    (!areAllCommentsTrusted(appendActivatedComments(summons, N, thread), thread) ||
      isReplyDeniedByRules(e.context))
      ? {
          status: "declined",
          reason: "blocked",
        }
      : isBuiltInArtifactHiddenForMcp() && canAutoreactWithoutPrompts(e.context)
        ? {
            status: "declined",
            reason: "ask_mode",
          }
        : await forecastReplyPermission({
            ...e,
            handOff: G,
            latchedHandOff: D && G,
          });
  let x;
  if (L === "seeded_turn")
    x = {
      status: "working",
    };
  else if (!threadState.breakerOpen)
    x = V
      ? {
          status: "declined",
          reason: "blocked",
        }
      : await q();
  else if (
    threadState.lastAutoReplyAt !== null &&
    Date.now() - threadState.lastAutoReplyAt < MAX_STAMP_AGE_MS
  )
    x = null;
  else if (!typedGesture)
    x = {
      status: "declined",
      reason: "loop_guard",
    };
  else
    x = V
      ? {
          status: "declined",
          reason: "blocked",
        }
      : await q();
  if (
    x === null ||
    !isAutoreactArmed() ||
    isSlugStoppedAnywhere(slug) ||
    scanStamp(slug) !== e.scanGen ||
    !isBusyShorterThan(performance.now(), getAutoReactRateLimit())
  )
    return;
  if (x === "unreadable") {
    threadState.busyAckedGestureAt = b;
    return;
  }
  let Y = x.status === "working";
  if ((isHostEntrypoint() || e.suppressSummonStatus) && !Y) {
    threadState.busyWithheldForecast = {
      gestureAt: b,
      at: Date.now(),
    };
    return;
  }
  threadState.busyAckedGestureAt = b;
  threadState.busyWithheldForecast = undefined;
  emitArtifactSummonStatus(
    {
      slug,
      threadId: thread.id,
      gestureAt: R,
      suppressed: false,
      storageV5: e.context.storageV5,
    },
    x,
  );
  logFeatureOk("artifact_summon_forecast", {
    working: Y,
  });
}
//@ chunk-9tgt55am.js:81163-82635 placement
async function forecastReplyPermission(e) {
  let { tool, context, artifactState } = e;
  let now = Date.now();
  let s = (w) => now - w < 3600000;
  if (
    count(artifactState.turnTimestamps, s) >= getMaxAutoTurns() ||
    count(artifactState.forecastTimestamps, s) >= getMaxAutoTurns()
  )
    return null;
  if (getToolPermissionContext(context).mode === "plan")
    return {
      status: "declined",
      reason: "plan_mode",
    };
  if (isBuiltInArtifactHiddenForMcp())
    return {
      status: "working",
      reason: "queued",
    };
  let autoEditPermissionContext = getAutoEditPermissionContext(tool, context);
  let h = autoEditPermissionContext.mode === "auto";
  if (
    autoEditPermissionContext.avoidPrompts ||
    autoEditPermissionContext.chainOnAllow ||
    (h && !canAutoEditWithoutPrompt(autoEditPermissionContext))
  )
    return null;
  artifactState.forecastTimestamps = artifactState.forecastTimestamps.filter(s);
  artifactState.forecastTimestamps.push(now);
  let [y, recordedDecl] = await Promise.all([
    probeReplyPermission({
      tool,
      context,
      url: e.url,
      threadId: e.thread.id,
      fixedAck: false,
      rulesOnlyOrNothing: h,
    }),
    readRecordedDecl(e.slug, context),
  ]);
  if (y.threw) {
    logFeatureBad(
      "artifact_summon_forecast",
      "permission_eval_error",
      y.rulesOnlyProbe
        ? {
            rules_only: true,
          }
        : undefined,
    );
    return "unreadable";
  }
  if (y.skipped || getToolPermissionContext(context).mode === "plan") return null;
  if (y.denied !== null)
    return {
      status: "declined",
      reason: y.denied.reason,
    };
  let { decision } = y;
  let b = decision.behavior !== "allow";
  if (
    b &&
    autoReactCanUseTool(context.agentId, artifactState, {
      ask: null,
    }) === null
  )
    return {
      status: "declined",
      reason: "ask_mode",
    };
  let N =
    !b && decision.decisionReason?.type === "rule" && isArtifactActionRule(decision.decisionReason.rule);
  let S = !b && !N;
  if (
    canPageReplyDirectly({
      pageOwnsThreads: recordedDecl,
      handsOffToTurn: e.handOff && S,
      composesEdit: e.thread.claudeActivated && e.thread.editCapable === true && S && !e.thread.resolved,
      slug: e.slug,
      editRejudgedByAutoMode: alwaysFalseAutoreact(tool, context),
    })
  )
    return {
      status: "declined",
      reason: "blocked",
    };
  if (b)
    return e.latchedHandOff
      ? {
          status: "declined",
          reason: "blocked",
        }
      : {
          status: "needs_user",
          reason: "approval_required",
        };
  return e.latchedHandOff && N
    ? {
        status: "declined",
        reason: "blocked",
      }
    : {
        status: "working",
        reason: "queued",
      };
}
//@ chunk-9tgt55am.js:82635-83551 placement
async function probeReplyPermission(e) {
  let { tool, context, url, threadId } = e;
  let s = {
    action: "reply",
    url,
    thread_id: threadId,
    text: "",
  };
  let autoEditPermissionContext = getAutoEditPermissionContext(tool, context);
  let h = e.fullReadUnder === undefined && canAutoEditWithoutPrompt(autoEditPermissionContext);
  if (e.rulesOnlyOrNothing === true && !h)
    return {
      threw: false,
      skipped: true,
    };
  let y = e.fullReadUnder ?? `autoreact-${threadId}-probe-${getLiveState().autoReact.probeSeq++}`;
  let C = () => evaluateAskingNoHost(tool, s, context, emptyAutoReactMessage(threadId), y);
  try {
    if (h) {
      let b = await checkRuleBasedPermissions(
        tool,
        s,
        {
          ...context,
          toolUseId: y,
        },
        {
          crashIsObjection: true,
        },
      );
      if (b?.decisionReason?.type === "other" && b.decisionReason.reason === PERMISSION_CHECK_CRASHED_REASON)
        throw Error("artifact permission check crashed");
      if (canAutoEditWithoutPrompt(getAutoEditPermissionContext(tool, context))) {
        let N = b ?? {
          behavior: "allow",
          updatedInput: s,
        };
        return {
          threw: false,
          decision: N,
          denied: N.behavior === "deny" ? describeReplyDenial(N) : null,
          rulesOnlyVerdict: true,
          verdictPremise: e.fixedAck ? autoEditPermissionContext : null,
          probeId: y,
        };
      }
      if (e.rulesOnlyOrNothing === true)
        return {
          threw: false,
          skipped: true,
        };
    }
    let R = await C();
    return {
      threw: false,
      decision: R,
      denied: R.behavior === "deny" ? describeReplyDenial(R) : null,
      rulesOnlyVerdict: false,
      verdictPremise: null,
      probeId: y,
    };
  } catch {
    return {
      threw: true,
      rulesOnlyProbe: h,
    };
  }
}
//@ chunk-9tgt55am.js:83551-83577 placement
function alwaysFalseAutoreact(e, context) {
  return false;
}
//@ chunk-9tgt55am.js:83577-83721 placement
function canPageReplyDirectly(e) {
  if (!e.pageOwnsThreads || e.handsOffToTurn) return false;
  return (
    !e.composesEdit ||
    isProbedLivePage(e.slug) ||
    typeLockedFor(e.slug, undefined) ||
    e.editRejudgedByAutoMode
  );
}
//@ chunk-9tgt55am.js:83721-112316 placement
/**
 * 评论自动响应主流程：读取线程、去重已见评论、判断是否该回应、组织回复/编辑、处理各种降级与遥测。
 */
async function processArtifactThread(e) {
  let { slug, url, artifactName, thread, context, notify, artifactState } = e;
  let toolByName = findToolByName(context.options.tools ?? [], commentsToolName());
  let C = isBuiltInArtifactHiddenForMcp();
  let R = {};
  let b = C
    ? undefined
    : ((toolByName?.mcpInfo === undefined ? toolByName : undefined) ??
      (isArtifactToolsetSplit() ? undefined : e.tool));
  let N;
  let S = () => {
    e.threadsDropped;
    return [];
  };
  if (!isAutoreactArmed() || isSlugStoppedAnywhere(slug)) return;
  let w = artifactState.threads.get(thread.id);
  if (thread.commentsDegraded === true) return w ? undefined : "deferred_first_sight";
  if (thread.resolvedDegraded === true) {
    logFeatureSad("artifact_comments_autoreact", "resolution_degraded");
    return w ? undefined : "deferred_first_sight";
  }
  let L = thread.activatedAtDegraded === true;
  let P = new Set();
  if (!w) {
    if (L) {
      logFeatureSad("artifact_comments_autoreact", "activation_degraded");
      return "deferred_first_sight";
    }
    let k =
      thread.claudeActivated &&
      !thread.resolved &&
      thread.comments.some((comment) => getCommentAuthorKind(comment) !== "agent");
    let re = e.actOnFirstSight && artifactState.baselined && k && !e.hintMissed;
    let ie =
      !re &&
      k &&
      !e.hintMissed &&
      artifactState.everBaselined &&
      parseTimestamp(thread.activatedAt) !== null &&
      (e.liveSightBoundary === null ||
        (artifactState.stampHighWater !== null && shouldFireOnStamps(thread, e.liveSightBoundary)));
    let de = (re || ie) && isFastAckEnabled();
    if ((de || (e.pickUpRecentSummons && !re && !ie)) && !e.threadsDropped && thread.claudeActivated) {
      let now = Date.now();
      let commentsAwaitingReply = getCommentsAwaitingReply(thread);
      P = new Set(commentsAwaitingReply.filter((ge) => isRecentToClaudeAt(ge, now)));
      if (de) {
        if (P.size > 0)
          logFeatureOk("artifact_comments_autoreact", {
            first_sight_summon: true,
          });
        else if (commentsAwaitingReply.length > 0)
          logFeatureSad("artifact_comments_autoreact", "first_sight_summon_stale");
      }
    }
    w = {
      lastAutoReplyAt: null,
      seen: new Set(thread.comments.filter((comment) => !P.has(comment)).map((comment) => comment.id)),
      sentToClaudeAt: new Map(
        thread.comments
          .filter(
            (comment) =>
              !comment.toClaudeAtDegraded &&
              (comment.toClaudeAt === undefined || parseTimestamp(comment.toClaudeAt) !== null),
          )
          .map((comment) => [comment.id, comment.toClaudeAt ?? null]),
      ),
      ownReplyIds: new Set(),
      consecutiveAuto: 0,
      breakerOpen: false,
      consecutivePipelineDenials: 0,
      deferNoticed: new Set(),
      activatedAt:
        re || ie ? null : parseTimestamp(thread.activatedAt) !== null ? (thread.activatedAt ?? null) : null,
      activatedAtObserved: thread.activatedAt === undefined || parseTimestamp(thread.activatedAt) !== null,
    };
    artifactState.threads.set(thread.id, w);
    artifactState.everHadThreads = true;
    raiseStampHighWater(artifactState, thread);
    if (re || ie) recordJudged(slug, thread.id, thread.comments, await ownAccount(context.credentials));
    else {
      let filtered = thread.comments.filter((comment) => commentTextChanged(slug, comment.id, comment.text));
      if (filtered.length > 0) recordJudged(slug, thread.id, filtered, await ownAccount(context.credentials));
      rememberCommentTexts(
        slug,
        thread.comments.filter((comment) => !P.has(comment)),
      );
      if (P.size === 0) return;
      logFeatureOk("artifact_comments_autoreact", {
        summon_pickup: true,
      });
    }
  }
  if (L) {
    logFeatureSad("artifact_comments_autoreact", "activation_degraded");
    return;
  }
  let D = !thread.claudeActivated && w.activatedAt !== null;
  noteDeferOnce(w, "activation_read_absent", D);
  if (D) return;
  let last = thread.comments.at(-1);
  let V = last !== undefined && getCommentAuthorKind(last) === "unknown";
  let any = thread.comments.some(
    (comment, re) =>
      getCommentAuthorKind(comment) === "unknown" &&
      thread.comments
        .slice(0, re)
        .some((comment) => getCommentAuthorKind(comment) === "human" && comment.toClaudeAt !== undefined),
  );
  let x = V || any;
  noteDeferOnce(w, "newest_lane_unknown", x);
  if (x) return;
  let autoReactRateLimit = getAutoReactRateLimit();
  if (
    isMadroneSpindleEnabled() &&
    isBusyShorterThan(performance.now(), autoReactRateLimit) &&
    !(
      isThreadAgentEnabled() &&
      (await canForkThreadReply({
        slug,
        url,
        thread,
        threadState: w,
        context,
        replyTool: b,
        artifactState,
      }))
    )
  ) {
    let commentsToJudge = selectCommentsToJudge(slug, thread, w);
    if (commentsToJudge.length > 0)
      recordJudged(slug, thread.id, commentsToJudge, await ownAccount(context.credentials));
    let re = new Set(commentsToJudge);
    rememberCommentTexts(
      slug,
      thread.comments.filter((comment) => w.seen.has(comment.id) && !re.has(comment)),
    );
    let ie = C ? e.tool : b;
    if (ie !== undefined)
      await handleThreadActivation({
        slug,
        url,
        thread,
        threadState: w,
        artifactState,
        tool: ie,
        context,
        scanGen: e.scanGen,
        suppressSummonStatus: e.suppressSummonStatus,
        threadsDropped: e.threadsDropped,
      });
    return "deferred_busy";
  }
  w.busyAckedGestureAt = undefined;
  w.busyWithheldForecast = undefined;
  if (!(isMadroneSpindleEnabled() && isBusyAtLeast(performance.now(), autoReactRateLimit)))
    artifactState.busyValveNoticed = false;
  else if (!artifactState.busyValveNoticed) {
    artifactState.busyValveNoticed = true;
    logFeatureSad("artifact_comments_autoreact", "foreground_busy_timeout");
  }
  raiseStampHighWater(artifactState, thread);
  let activatedAt = thread.activatedAt ?? null;
  let activatedAt_2 = w.activatedAt;
  let I = false;
  if (!w.activatedAtObserved) {
    if (activatedAt === null || parseTimestamp(activatedAt) !== null) {
      w.activatedAtObserved = true;
      w.activatedAt = activatedAt;
    }
  } else {
    let k = shouldFireActivation(w.activatedAt, activatedAt);
    I = k.fire;
    w.activatedAt = k.record;
  }
  let j = [];
  for (let comment of thread.comments) {
    if (isDegradedComment(comment)) continue;
    let toClaudeAt = comment.toClaudeAt ?? null;
    if (!w.sentToClaudeAt.has(comment.id)) {
      w.sentToClaudeAt.set(comment.id, toClaudeAt);
      continue;
    }
    let ie = w.sentToClaudeAt.get(comment.id) ?? null;
    let de = shouldFireActivation(ie, toClaudeAt);
    if (de.fire && w.seen.has(comment.id) && isHumanComment(comment)) j.push(comment);
    w.sentToClaudeAt.set(comment.id, de.record);
  }
  let any_2 = thread.comments.some((comment) => isDegradedComment(comment) && !w.seen.has(comment.id));
  noteDeferOnce(w, "fresh_trigger_degraded", any_2);
  let filtered = thread.comments.filter((comment) => !w.seen.has(comment.id) && !isDegradedComment(comment));
  let le = new Set(j);
  let filtered_2 = thread.comments.filter(
    (comment) =>
      w.seen.has(comment.id) && !le.has(comment) && commentTextChanged(slug, comment.id, comment.text),
  );
  let be = new Set(filtered_2);
  rememberCommentTexts(
    slug,
    thread.comments.filter((comment) => w.seen.has(comment.id) && !be.has(comment)),
  );
  if (filtered.length === 0 && !I && j.length === 0) {
    if (filtered_2.length > 0)
      recordJudged(slug, thread.id, filtered_2, await ownAccount(context.credentials));
    return;
  }
  let account = await ownAccount(context.credentials);
  {
    let k = [...filtered, ...j, ...filtered_2];
    let re = I ? thread.comments : k;
    if (re.length === 0) recordUnaccountedComments(slug);
    else recordJudged(slug, thread.id, re, account);
  }
  let now = Date.now();
  for (let k of filtered) w.seen.add(k.id);
  let filtered_3 = filtered.filter(isHumanComment);
  let ye = w.lastAutoReplyAt !== null && now - w.lastAutoReplyAt < MAX_STAMP_AGE_MS;
  if ((filtered_3.filter((k) => k.postedByArtifact !== true).length > 0 || j.length > 0) && !ye) {
    w.consecutiveAuto = 0;
    w.breakerOpen = false;
  }
  let filtered_4 = filtered_3.filter(hasToClaudeAt);
  let _n = I && thread.comments.some((comment) => getCommentAuthorKind(comment) !== "agent");
  let _t = thread.resolved && (filtered_4.length > 0 || j.length > 0);
  if (
    !thread.claudeActivated ||
    (thread.resolved && !_t) ||
    (filtered_4.length === 0 && !_n && j.length === 0)
  )
    return;
  let he =
    thread.anchorMovedCommentId !== undefined &&
    (filtered_4.length > 0 || j.length > 0) &&
    [...filtered_4, ...j].every((k) => k.id === thread.anchorMovedCommentId)
      ? "moved"
      : filtered_4.length > 0
        ? "fresh"
        : j.length > 0
          ? "redesignated"
          : "activation";
  let Mt = filtered_4.at(-1) ?? j.at(-1) ?? thread.comments.findLast((comment) => isHumanComment(comment));
  let Se = he === "activation" ? [] : [...filtered_4, ...j];
  let scanRowIds = new Set(thread.comments.map((comment) => comment.id));
  let se = {
    slug,
    threadId: thread.id,
    gestureAt: latestValidTimestamp(he === "activation" ? [w.activatedAt] : Se.map((k) => k.toClaudeAt)),
    suppressed: e.suppressSummonStatus,
    storageV5: context.storageV5,
  };
  let yn = (k) => {
    if (
      !isAutoreactArmed() ||
      isSlugStoppedAnywhere(slug) ||
      scanStamp(slug) !== e.scanGen ||
      (R.handsOff === false && isBuiltInArtifactHiddenForMcp())
    ) {
      logFeatureSad("artifact_comments_autoreact", `stopped_during_${k}`);
      emitArtifactSummonStatus(se, {
        status: "declined",
        reason: "auto_reply_off",
      });
      return true;
    }
    return false;
  };
  let Re = (k) => {
    if (yn(k)) return true;
    if (getToolPermissionContext(context).mode === "plan") {
      logFeatureSad("artifact_comments_autoreact", `plan_mode_during_${k}`);
      emitArtifactSummonStatus(se, {
        status: "declined",
        reason: "plan_mode",
      });
      return true;
    }
    return false;
  };
  let lastIndex = thread.comments.findLastIndex((comment) => getCommentAuthorKind(comment) === "agent");
  let it = lastIndex >= 0 ? thread.comments[lastIndex] : undefined;
  let To = [...filtered_4, ...j];
  let st = Se.length > 0 && (it === undefined || hasCommentSentAfter(To, it));
  let id =
    it !== undefined &&
    !e.threadsDropped &&
    !thread.comments.some((comment) => getCommentAuthorKind(comment) === "unknown") &&
    (w.ownReplyIds.has(it.id) || isOwnPostedReply(it.id))
      ? it.id
      : undefined;
  let continuesReplyId = !st ? id : undefined;
  if (
    isLastAgentReplyCurrent({
      thread,
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
    I && activatedAt_2 === null && !e.threadsDropped
      ? getCommentsAwaitingReply(thread).filter((k) => isRecentToClaudeAt(k, now) && !Se.includes(k))
      : [];
  let mapped = [...Se, ...Co].map((k) => k.toClaudeAt);
  if (
    mapped.length > 0 &&
    mapped.every(isToClaudeTimestamp) &&
    new Set(mapped).size === mapped.length &&
    isMadroneSpindleEnabled()
  ) {
    let k = isHostEntrypoint();
    let re = () => mapped.some((de) => hasHostClaim(slug, thread.id, de));
    if (
      mapped.every((de) =>
        hasSummonClaim(slug, thread.id, de, {
          hostSeeded: false,
        }),
      ) &&
      !re() &&
      isThreadAgentEnabled() &&
      b !== undefined &&
      localSourcePathIfEditCapable(thread, slug, context.artifactRegistries.recordedPages) !== undefined &&
      getPermissionPromptPerson() !== null &&
      (await checkReplyPermissionSafe({
        url,
        thread,
        context,
        replyTool: b,
      })) &&
      !re()
    ) {
      consumeReadClaims(slug, thread.id, mapped);
      logFeatureOk("artifact_comments_autoreact", {
        read_claim_passed_on: true,
      });
    } else {
      let de = consumeSummonClaims(slug, thread.id, mapped, {
        hostSeeded: k,
      });
      if (!de && k) {
        de =
          (await waitForSummonClaim(slug, thread.id, mapped, context.abortController.signal)) &&
          consumeSummonClaims(slug, thread.id, mapped);
        if (!de && Re("visible_handoff")) return;
      }
      if (de) {
        logFeatureSad("artifact_comments_autoreact", "stood_down_visible_turn");
        return;
      }
    }
  }
  if (w.breakerOpen) {
    logFeatureSad("artifact_comments_autoreact", "breaker_open");
    emitArtifactSummonStatus(se, {
      status: "declined",
      reason: "loop_guard",
    });
    return;
  }
  let dt = localSourcePathIfEditCapable(thread, slug, context.artifactRegistries.recordedPages);
  let Oo = w.consecutivePipelineDenials >= MAX_AUX_RETRIES;
  let Nt = isBuiltInArtifactHiddenForMcp();
  R.handsOff = Nt;
  let Eo = () => {
    if (!artifactState.pipelineDeniedNoticed) {
      artifactState.pipelineDeniedNoticed = true;
      markAutoReactNoticePending(slug);
      notify({
        summary: autoRepliesPausedNotice(artifactName),
        detail: `Automatic replies or edits on artifact ${url} are being blocked by a permission hook or content gate, or repeatedly refused by the session's configuration \u2014 recent attempts were refused or dropped after composing. Affected threads are paused; a successful auto-reply anywhere on this artifact resumes them.`,
      });
    }
    logFeatureSad("artifact_comments_autoreact", "pipeline_denied");
    emitArtifactSummonStatus(se, {
      status: "declined",
      reason: "blocked",
    });
  };
  if (Oo && dt === undefined && !Nt) {
    Eo();
    return;
  }
  if (yn("own_account")) return;
  let An =
    (filtered_4.length > 0 || I || j.length > 0) &&
    j.every(isTrustedCommentPrompts) &&
    filtered_4.every(
      (k) =>
        k.postedByArtifact !== true &&
        (k.sentByViewer === true ||
          (isOwnPrincipal(k.account, account) && k.createdAt !== undefined && k.toClaudeAt === k.createdAt)),
    ) &&
    (!I ||
      (thread.activatedBy !== undefined &&
        isOwnPrincipal(thread.activatedBy, account) &&
        !thread.comments.some(
          (comment) => comment.postedByArtifact === true && comment.toClaudeAt !== undefined,
        )));
  let Po = An && filtered_4.every(isTrustedCommentPrompts);
  let accountEpoch = getLiveState().accountEpoch;
  let Ya = () => Po && getLiveState().accountEpoch === accountEpoch;
  let ve = (k) =>
    notify(
      Ya()
        ? {
            ...k,
            ownGesture: true,
          }
        : k,
    );
  let timestamp = parseTimestamp(thread.activatedAt);
  let Ft = appendActivatedComments(Se, Co, thread);
  let Do = (k) =>
    k === undefined
      ? undefined
      : k.postedByArtifact === true
        ? "page_posted_send"
        : k.sentByViewer === false
          ? "send_by_another"
          : "send_sender_unknown";
  let za = !I
    ? undefined
    : e.threadsDropped === true ||
        thread.commentsDegraded === true ||
        timestamp === null ||
        thread.comments.some(
          (comment) =>
            isDegradedComment(comment) ||
            (getCommentAuthorKind(comment) === "agent" && parseTimestamp(comment.createdAt) === null),
        )
      ? "read_may_hide_send"
      : Do(
          getCommentsAwaitingReply(thread).find(
            (k) => (parseTimestamp(k.toClaudeAt) ?? 1 / 0) >= timestamp && !isTrustedCommentPrompts(k),
          ),
        );
  let ct = () =>
    getLiveState().accountEpoch !== accountEpoch
      ? "account_changed"
      : (za ??
        (Ft.length > 0
          ? Do(Ft.find((k) => !isTrustedCommentPrompts(k)))
          : Po
            ? undefined
            : "no_send_activation_unproven"));
  let Xa = () => ct() === undefined;
  let Ja =
    thread.commentsDegraded !== true &&
    thread.comments.every((comment) => isTrustedComment(comment, account));
  let No = false;
  let lt = [];
  let Qa;
  let Za = () =>
    (Qa ??= (async () => {
      if (
        thread.spanQuote === undefined &&
        thread.anchorLabel === undefined &&
        thread.anchorDetail === undefined &&
        thread.anchorPath === undefined &&
        thread.region !== true &&
        !thread.comments.some((comment) => comment.presence !== undefined)
      )
        return false;
      if (thread.anchorFileDegraded === true) return true;
      let k = await PREVIEW_FEATURE_PROMPT({
        slug,
        ...(thread.anchorFile !== undefined && {
          file: thread.anchorFile,
        }),
        signal: context.abortController.signal,
        credentials: context.credentials,
        feature: "artifact_autoreact_anchor_read",
        quotedToAudience: true,
      });
      return k === undefined || (await extractJsonScriptById(k, "ws-decisions")) !== null;
    })());
  let composedFromOwnWordsOnly = async () =>
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
          : isReplyDeniedByRules(context)
            ? "reply_denied"
            : canAutoreactWithoutPrompts(context)
              ? "nobody_to_ask"
              : undefined);
    if (k !== undefined) {
      logFeatureSad("artifact_comments_autoreact", `mcp_${k}`);
      emitArtifactSummonStatus(se, {
        status: "declined",
        reason: k === "nobody_to_ask" ? "ask_mode" : "blocked",
      });
      return;
    }
  }
  if (!An && !withinHourlyTurnCap(artifactState, now)) {
    logFeatureSad("artifact_comments_autoreact", "hourly_cap");
    emitArtifactSummonStatus(se, {
      status: "declined",
      reason: "hourly_cap",
    });
    if (
      artifactState.lastProbeAllowed &&
      !artifactState.capNoticed &&
      getToolPermissionContext(context).mode !== "plan"
    ) {
      artifactState.capNoticed = true;
      markAutoReactNoticePending(slug);
      ve(describeAutoReplyHeld(he, "cap", url, artifactName));
    }
    return;
  }
  if (!An) {
    if (artifactState.turnTimestamps.length === 0) {
      artifactState.capNoticed = false;
      artifactState.planModeNoticed = false;
    }
    artifactState.turnTimestamps.push(now);
  }
  if (getToolPermissionContext(context).mode === "plan") {
    artifactState.lastProbeAllowed = false;
    if (!artifactState.planModeNoticed) {
      artifactState.planModeNoticed = true;
      markAutoReactNoticePending(slug);
      ve(describeAutoReplyHeld(he, "plan", url, artifactName));
    }
    logFeatureOk("artifact_comments_autoreact", {
      plan_mode_notify: true,
    });
    emitArtifactSummonStatus(se, {
      status: "declined",
      reason: "plan_mode",
    });
    return;
  }
  if (Nt) {
    artifactState.lastProbeAllowed = true;
    artifactState.lastProbeDeniedBy = null;
    artifactState.lastReplyDeclinedByAutoMode = false;
    emitSummonArm(getLiveState().live, slug);
    se.suppressed = false;
    emitArtifactSummonStatus(se, {
      status: "working",
    });
    if (ye) {
      w.consecutiveAuto += 1;
      if (w.consecutiveAuto >= MAX_MAIN_AGENT_RETRIES) w.breakerOpen = true;
    }
    w.lastAutoReplyAt = now;
    dropStaleHandOffs(slug);
    markAutoReactNoticePending(slug);
    ve(
      buildMcpThreadNotice({
        trigger: he,
        summonCount: Se.length,
        url,
        slug,
        artifactName,
        threadId: thread.id,
        handOff: registerSummonHandOff(se),
        resolved: thread.resolved,
      }),
    );
    logFeatureOk("artifact_comments_autoreact", {
      handed_to_session: true,
      hidden_for_mcp: true,
      resolved: thread.resolved,
    });
    return;
  }
  if (b === undefined) {
    if (!artifactState.defaultModeNoticed) {
      artifactState.defaultModeNoticed = true;
      markAutoReactNoticePending(slug);
      ve(describeAutoReplyHeld(he, "reply_tool_absent", url, artifactName));
    }
    logFeatureSad("artifact_comments_autoreact", "reply_tool_absent");
    emitArtifactSummonStatus(se, {
      status: "declined",
      reason: "blocked",
    });
    return;
  }
  let Be = b;
  let wn = isFixedFastAckEnabled();
  let [Le, recordedDecl] = await Promise.all([
    probeReplyPermission({
      tool: Be,
      context,
      url,
      threadId: thread.id,
      fixedAck: wn,
    }),
    readRecordedDecl(slug, context),
  ]);
  if (Le.threw || Le.skipped) {
    logFeatureBad(
      "artifact_comments_autoreact",
      "permission_eval_error",
      Le.threw && Le.rulesOnlyProbe
        ? {
            rules_only: true,
          }
        : undefined,
    );
    emitArtifactSummonStatus(se, {
      status: "failed",
      reason: "post_failed",
    });
    return;
  }
  let Ke =
    Le.rulesOnlyVerdict &&
    Le.decision.behavior === "allow" &&
    dt === undefined &&
    thread.editCapable !== true &&
    !recordedDecl &&
    true &&
    canUseClassifierArbiter(context) &&
    !preToolUseHookMayCoverArtifact(context, ARTIFACT_COMMENTS_TOOL_NAME)
      ? await probeReplyPermission({
          tool: Be,
          context,
          url,
          threadId: thread.id,
          fixedAck: false,
          fullReadUnder: Le.probeId,
        })
      : null;
  let { decision, denied, verdictPremise } =
    Ke !== null &&
    !Ke.threw &&
    !Ke.skipped &&
    Ke.denied?.errorCode === "auto_mode_unavailable" &&
    !(
      Ke.decision.decisionReason?.type === "classifier" && Ke.decision.decisionReason.monitorBlocked === true
    ) &&
    canUseClassifierArbiter(context)
      ? Ke
      : Le;
  let { rulesOnlyVerdict } = Le;
  let $t = {
    ask: null,
  };
  let accountEpoch_2 = getLiveState().accountEpoch;
  let Te =
    denied === null && decision.behavior !== "allow"
      ? autoReactCanUseTool(context.agentId, artifactState, $t)
      : null;
  artifactState.lastProbeAllowed = decision.behavior === "allow" || Te !== null;
  let $o = denied?.errorCode === "auto_mode_unavailable";
  let ei = decision.decisionReason?.type === "classifier" && decision.decisionReason.monitorBlocked === true;
  let At = $o && !ei;
  artifactState.lastProbeDeniedBy = At ? null : (denied?.reason ?? null);
  artifactState.lastReplyDeclinedByAutoMode = At;
  emitSummonArm(getLiveState().live, slug);
  let bn =
    Te === null &&
    !(
      decision.behavior === "allow" &&
      decision.decisionReason?.type === "rule" &&
      isArtifactActionRule(decision.decisionReason.rule)
    );
  let Sn = thread.editCapable === true && bn;
  let Uo = dt !== undefined && bn;
  let Wo = thread.claudeActivated && Sn && !thread.resolved;
  if (Re("probe")) return;
  if (Oo && dt !== undefined && !bn) {
    Eo();
    return;
  }
  if (denied !== null) {
    let k =
      denied.reason === "denied_by_auto_mode" &&
      Xa() &&
      !artifactState.autoModeDeclineNoticed &&
      (!$o || (At && canUseClassifierArbiter(context) && isGussetFlagOn()));
    let re = k && At && !recordedDecl;
    if (k) {
      artifactState.autoModeDeclineNoticed = true;
      markAutoReactNoticePending(slug);
      let ie = describeAutoReplyHeld(he, "auto_mode_declined", url, artifactName);
      if (re) se.suppressed = false;
      ve(
        re
          ? {
              ...ie,
              handOff: registerSummonHandOff(se),
            }
          : ie,
      );
    }
    logFeatureSad("artifact_comments_autoreact", denied.errorCode, {
      notified: k,
      ...(rulesOnlyVerdict && {
        rules_only: true,
      }),
    });
    if (re) logFeatureOk("artifact_comments_classifier_unavailable_handoff");
    else if (At) {
      let ie = k
        ? "notified_page_owns_threads"
        : (ct() ??
          (artifactState.autoModeDeclineNoticed
            ? "already_notified"
            : (getAutoModeArbiterIssue(context) ?? "flag_off")));
      logFeatureSad("artifact_comments_classifier_unavailable_handoff", ie);
    }
    emitArtifactSummonStatus(
      se,
      re
        ? {
            status: "working",
          }
        : {
            status: "declined",
            reason: denied.reason,
          },
    );
    return;
  }
  let kn = () => {
    if (!artifactState.defaultModeNoticed) {
      artifactState.defaultModeNoticed = true;
      markAutoReactNoticePending(slug);
      let k = describeAutoReplyHeld(he, "notify_only", url, artifactName);
      ve(
        isOchreBitternEnabled() && !artifactState.heldReplyDeclined
          ? {
              ...k,
              summary: needsPermissionToReplyNotice(artifactName),
            }
          : k,
      );
      logFeatureOk("artifact_comments_autoreact", {
        notified_only: true,
        ...(rulesOnlyVerdict && {
          rules_only: true,
        }),
      });
    } else
      logFeatureOk("artifact_comments_autoreact", {
        notified_only: true,
        notice_suppressed: true,
        ...(rulesOnlyVerdict && {
          rules_only: true,
        }),
      });
    emitArtifactSummonStatus(se, {
      status: "declined",
      reason: "ask_mode",
    });
  };
  if (decision.behavior !== "allow" && Te === null) {
    kn();
    return;
  }
  let vn = alwaysFalseAutoreact(Be, context);
  if (
    canPageReplyDirectly({
      pageOwnsThreads: recordedDecl,
      handsOffToTurn: Uo,
      composesEdit: Wo,
      slug,
      editRejudgedByAutoMode: vn,
    })
  ) {
    logFeatureSad("artifact_comments_autoreact", "page_owns_threads", {
      before_working: true,
      ...(rulesOnlyVerdict && {
        rules_only: true,
      }),
    });
    emitArtifactSummonStatus(se, {
      status: "declined",
      reason: "blocked",
    });
    return;
  }
  se.suppressed = false;
  emitArtifactSummonStatus(
    se,
    Te === null
      ? {
          status: "working",
        }
      : {
          status: "needs_user",
          reason: "approval_required",
        },
  );
  if (ye) {
    w.consecutiveAuto += 1;
    if (w.consecutiveAuto >= MAX_MAIN_AGENT_RETRIES) w.breakerOpen = true;
  }
  if (Uo) {
    w.lastAutoReplyAt = now;
    markAutoReactNoticePending(slug);
    let k = isThreadAgentEnabled();
    if (k) {
      if (
        (await handOffThreadToBackgroundAgent({
          slug,
          url,
          artifactName,
          thread,
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
    ve(
      buildSourcePublishedNotice({
        trigger: he,
        summonCount: Se.length,
        url,
        artifactName,
        threadId: thread.id,
        sourcePath: dt,
        handOff: registerSummonHandOff(se),
        resolved: thread.resolved,
        agentsMayHoldThreads: k || hasThreadAgentForSlug(slug),
      }),
    );
    logFeatureOk("artifact_comments_autoreact", {
      handed_to_session: true,
      resolved: thread.resolved,
      edit_capable: thread.editCapable === true,
      ...(rulesOnlyVerdict && {
        rules_only: true,
      }),
    });
    return;
  }
  let Pe;
  let Ve = false;
  if (
    Se.length > 0 &&
    thread.claudeActivated &&
    Sn &&
    !isProbedLivePage(slug) &&
    !vn &&
    !recordedDecl &&
    !thread.resolved &&
    isFastAckEnabled()
  ) {
    let k = {
      trigger: he,
      thread,
      context,
      slug,
      summons: Se,
      scanGen: e.scanGen,
    };
    let text = wn ? await selectFastAckText(k, Sn) : await composeArtifactCommentFastAck(k);
    if (Re("fast_ack_compose")) return;
    let ie = null;
    let de = false;
    let W = {
      rode: false,
    };
    try {
      ie = await postThreadReply({
        tool: Be,
        context,
        url,
        slug,
        threadId: thread.id,
        text,
        declareAnswersSummon: st,
        continuesReplyId,
        composedFromOwnWordsOnly,
        threadTranscript: S(),
        ...(verdictPremise !== null && {
          canUseTool: makeFixedAckPermissionProbe(
            verdictPremise,
            {
              tool: Be,
              url,
              threadId: thread.id,
              text,
            },
            W,
          ),
        }),
      });
    } catch {
      de = true;
    }
    let fe = {
      fast_ack: true,
      ...(wn && {
        fast_ack_fixed: true,
      }),
      ...(W.rode && {
        fast_ack_on_probe_verdict: true,
      }),
      ...(rulesOnlyVerdict && {
        rules_only: true,
      }),
    };
    if (ie?.kind === "posted") {
      st = false;
      Ve = true;
      Pe = ie.commentId;
      continuesReplyId =
        ie.epoch === getLiveState().accountEpoch ||
        (ie.commentId !== undefined && isOwnPostedReply(ie.commentId))
          ? (ie.commentId ?? id)
          : undefined;
      recordOwnReply(w, ie);
      if (ie.commentId !== undefined) se.coversReplyId = ie.commentId;
      w.lastAutoReplyAt = Date.now();
      if (!canAutoReply()) bumpUnattendedReply(slug);
      let Ae = !isAutoReactEnabled() || isSlugStoppedAnywhere(slug) || scanStamp(slug) !== e.scanGen;
      logFeatureOk("artifact_comments_autoreact", {
        ...fe,
        ...(Ae && {
          post_stop_notice_suppressed: true,
        }),
      });
      if (Ae) return;
      let We = getToolPermissionContext(context).mode === "plan";
      markAutoReactNoticePending(slug);
      ve({
        coalesce: {
          family: "auto-replied",
          artifactName,
          threadId: thread.id,
        },
        detail: We
          ? `Acknowledgement reply posted to thread ${thread.id} on artifact ${url}; automatic replies are paused (plan mode), so the full reply comes from this session when it next acts. When posting it, set acknowledge_duplicate: true \u2014 the acknowledgement already stands as the thread's reply, so the duplicate guard refuses a plain follow-up.`
          : `Acknowledgement reply posted to thread ${thread.id} on artifact ${url}; the substantive auto-reply is still being composed and is reported separately.`,
      });
      if (We) return;
      if (se.coversReplyId !== undefined)
        emitArtifactSummonStatus(se, {
          status: "working",
        });
    } else if (ie?.kind === "unexpected_result_shape") {
      w.consecutivePipelineDenials += 1;
      logFeatureBad("artifact_comments_autoreact", "unexpected_result_shape", fe);
      emitArtifactSummonStatus(se, {
        status: "declined",
        reason: "blocked",
      });
      return;
    } else if (de) {
      w.consecutivePipelineDenials += 1;
      logFeatureBad("artifact_comments_autoreact", "fast_ack_post_threw", fe);
      emitArtifactSummonStatus(se, {
        status: "declined",
        reason: "blocked",
      });
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
        logFeatureSad("artifact_comments_autoreact", "page_owns_threads", fe);
        emitArtifactSummonStatus(se, {
          status: "declined",
          reason: "blocked",
        });
        return;
      }
      logFeatureSad("artifact_comments_autoreact", "deactivated_mid_turn", fe);
      return;
    }
  }
  let Ye;
  if (Wo) {
    let anchorSnippetMemo = {
      resolved: false,
    };
    let re = await checkAutoEditEligibility(slug, context, vn);
    if (re.read !== undefined) lt.push(re.read.html);
    if (Re("editability")) return;
    let ie = re.read !== undefined ? mayHaveForeignWriters(re.read) : undefined;
    let de = "unavailable";
    if (re.editable) {
      let W = null;
      if (isResponderDispatchEnabled() && Mt !== undefined) {
        let fe = await triageArtifactComment({
          thread,
          context,
          foreign: hasCommentsFromOthers(thread, account),
        });
        if (Re("analysis")) return;
        if (fe === "act") {
          W = await runCommentThreadAnalyst({
            context,
            url,
            slug,
            thread,
            triggerComment: Mt,
          });
          No = W !== null;
          if (Re("analysis")) return;
        }
      }
      de = await composeAutoEditWithTimeout(
        {
          trigger: he,
          thread,
          context,
          slug,
          summons: Se,
          pagesRead: lt,
          anchorSnippetMemo,
          scanGen: e.scanGen,
          pageForeign: ie,
          ...(W !== null && {
            analystBrief: W,
          }),
        },
        re,
      );
      if (Re("edit_compose")) return;
    }
    if (de === null) {
      emitArtifactSummonStatus(se, {
        status: "failed",
        reason: "compose_failed",
      });
      return;
    }
    if (de === "unavailable")
      Ye = await composeThreadReply({
        trigger: he,
        thread,
        context,
        slug,
        summons: Se,
        pagesRead: lt,
        anchorSnippetMemo,
        ...(re.read !== undefined && {
          sourceRead: re.read,
        }),
        ...(ie !== undefined && {
          pageForeign: ie,
        }),
      });
    else if (de.kind === "usage_limited") {
      emitArtifactSummonStatus(se, {
        status: "declined",
        reason: "usage_limited",
      });
      return;
    } else if (de.kind === "patch_failed" || de.kind === "timed_out") {
      let reason = de.kind === "timed_out" ? "timed_out" : de.reason;
      let fe = AUTO_EDIT_FAILURE_FOR_MODEL[reason];
      let ge;
      try {
        ge = await postThreadReply({
          tool: Be,
          context,
          url,
          slug,
          threadId: thread.id,
          text: AUTO_EDIT_FAILURE_REPLIES[reason],
          declareAnswersSummon: st,
          continuesReplyId,
          composedFromOwnWordsOnly,
          threadTranscript: S(),
          recheck: getOwnReplyInfo(w, scanRowIds),
        });
      } catch {
        logFeatureBad(
          "artifact_comments_autoreact",
          "permission_eval_error",
          rulesOnlyVerdict
            ? {
                rules_only: true,
              }
            : undefined,
        );
        emitArtifactSummonStatus(se, {
          status: "failed",
          reason: "post_failed",
        });
        return;
      }
      applyPostOutcome({
        post: ge,
        threadState: w,
        artifactState,
        slug,
        scanGen: e.scanGen,
        notify: ve,
        summon: se,
        trigger: he,
        url,
        artifactName,
        ackPosted: Ve,
        ackCommentId: Pe,
        rulesOnlyProbe: rulesOnlyVerdict,
        ownSendWithheld: ct(),
        pageOwnsThreads: recordedDecl,
        notice: {
          summary: autoRepliedNotice(artifactName),
          detail:
            `Auto-reply posted to thread ${thread.id} on artifact ${url}: ${fe}` +
            buildAutoPostedReplyNote([Pe, ge.kind === "posted" ? ge.commentId : undefined]),
        },
        replyWithheldNotice: {
          summary: autoEditNeedsReviewNotice(artifactName),
          detail:
            `Auto-reply to thread ${thread.id} on artifact ${url} was withheld: ${getStandDownReasons(ge)}. ` +
            Xqr(fe) +
            noConfirmOnlyReplyNote(ge),
        },
        allowSiblingReset: false,
      });
      return;
    } else if (de.kind === "edit") {
      if (Mt === undefined) {
        logFeatureSad("artifact_comments_autoreact", "edit_no_trigger");
        emitArtifactSummonStatus(se, {
          status: "failed",
          reason: "compose_failed",
        });
        return;
      }
      let W = await applyAutoEdit({
        tool: e.tool,
        context,
        url,
        slug,
        threadId: thread.id,
        recheck: getOwnReplyInfo(w, scanRowIds),
        declareAnswersSummon: st,
        continuesReplyId,
        triggerCommentId: Mt.id,
        content: de.content,
        reply: de.reply,
        composeTelemetry: de.telemetry,
        favicon: de.favicon,
        storedTitle: de.storedTitle,
        sourceVer: de.sourceVer,
        roundTripSignal: de.roundTripSignal,
        threadTranscript: S,
        composedFromOwnWordsOnly,
        composeReplyOnly: () =>
          composeThreadReply({
            trigger: he,
            thread,
            context,
            slug,
            summons: Se,
            pagesRead: lt,
            anchorSnippetMemo,
            sourceRead: re.read,
            ...(ie !== undefined && {
              pageForeign: ie,
            }),
          }),
        paused: Re,
      });
      if (W.outcome === "stood_down") return;
      let fe = (ge) => {
        if (isAutoReactEnabled() && !isSlugStoppedAnywhere(slug) && scanStamp(slug) === e.scanGen) {
          let Ae = Ve ? ` beyond the acknowledgement${formatCommentIds([Pe])}` : "";
          markAutoReactNoticePending(slug);
          ve({
            summary: autoEditNeedsReviewNotice(artifactName),
            detail: `A requested automatic edit on artifact ${url} (thread ${thread.id}) was refused because the thread's edit grant belongs to another user, so the artifact was NOT changed, and ${ge}${Ae}. Read the thread and make the change yourself if appropriate.`,
          });
        } else logFeatureSad("artifact_comments_autoreact", "summon_foreign_notice_suppressed");
      };
      if (W.outcome === "compose_failed") {
        emitArtifactSummonStatus(
          se,
          W.miss === "usage_limited"
            ? {
                status: "declined",
                reason: "usage_limited",
              }
            : {
                status: "failed",
                reason: "compose_failed",
              },
        );
        fe("no reply could be composed");
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
          W.outcome === "completed" || W.outcome === "completed_unresolved" || W.outcome === "reply_failed";
        let standDownReasons = getStandDownReasons(W.post);
        let We = [Pe, W.post.kind === "posted" ? W.post.commentId : undefined];
        let Go = formatCommentIds(We);
        applyPostOutcome({
          post: W.post,
          threadState: w,
          artifactState,
          slug,
          scanGen: e.scanGen,
          notify: ve,
          summon: se,
          trigger: he,
          url,
          artifactName,
          ackPosted: Ve,
          ackCommentId: Pe,
          editLanded: ge,
          rulesOnlyProbe: rulesOnlyVerdict,
          ownSendWithheld: ct(),
          pageOwnsThreads: recordedDecl,
          notice: ge
            ? W.outcome === "completed"
              ? {
                  coalesce: {
                    family: "auto-edited",
                    artifactName,
                    threadId: thread.id,
                  },
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
                  coalesce: {
                    family: "auto-replied",
                    artifactName,
                    threadId: thread.id,
                  },
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
                      ? autoEditNeedsReviewNotice(artifactName)
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
                  summary: autoEditNeedsReviewNotice(artifactName),
                  detail: `Auto-edit on artifact ${url} PUBLISHED in response to thread ${thread.id}, but its attribution to the thread's edit grant could not be verified, and the follow-up note was withheld: ${standDownReasons}. Review the change.`,
                }
              : W.failKind === "unexpected_result_shape" || W.failKind === "outcome_unknown"
                ? {
                    summary: autoEditNeedsReviewNotice(artifactName),
                    detail:
                      W.failKind === "unexpected_result_shape"
                        ? `An automatic edit attempt on artifact ${url} (thread ${thread.id}) did not return a recognizable publish result, so it is UNKNOWN whether the artifact was changed; the follow-up note was withheld because ${standDownReasons}. Review the artifact and the thread.`
                        : `An automatic edit attempt on artifact ${url} (thread ${thread.id}) could not confirm whether its publish landed, so it is UNKNOWN whether the artifact was changed; the follow-up note was withheld because ${standDownReasons}. Review the artifact and the thread.`,
                  }
                : ge
                  ? undefined
                  : {
                      summary: autoEditNeedsReviewNotice(artifactName),
                      detail:
                        `A requested automatic edit on artifact ${url} (thread ${thread.id}) was refused, so the artifact was NOT changed, and the explanatory reply was withheld: ${standDownReasons}. Read the thread and make the change yourself if appropriate.` +
                        noConfirmOnlyReplyNote(W.post),
                    },
          allowSiblingReset: ge,
        });
      } else
        emitArtifactSummonStatus(se, {
          status: "failed",
          reason: "post_failed",
        });
      if (
        (W.outcome === "publish_refused" || W.outcome === "publish_error") &&
        (W.publishDenied === true ||
          W.failKind === "pin_paused" ||
          W.failKind === "disabled" ||
          W.failKind === "unexpected_result_shape" ||
          W.failKind === "no_result")
      )
        w.consecutivePipelineDenials += 1;
      if (W.outcome === "reply_failed") {
        let ge = formatCommentIds([Pe]);
        let kind = W.post?.kind;
        let autoModeDeclined = W.post?.kind === "refused" && W.post.autoModeDeclined;
        if (isAutoReactEnabled() && !isSlugStoppedAnywhere(slug) && scanStamp(slug) === e.scanGen) {
          markAutoReactNoticePending(slug);
          ve({
            summary:
              kind === "answered_elsewhere" || kind === "answered_post_time"
                ? autoEditedNotice(artifactName)
                : autoEditedReviewNotice(artifactName),
            detail:
              kind === "answered_elsewhere" || kind === "answered_post_time"
                ? `Auto-edited artifact ${url} in response to thread ${thread.id}, but the summary reply was withheld: ${kind === "answered_elsewhere" ? REPLY_ALREADY_STANDS : REPLY_ALREADY_STANDS_SHORT}. ` +
                  "The artifact WAS changed \u2014 review the change and the thread's existing reply."
                : kind === "summon_foreign"
                  ? `Auto-edited artifact ${url} in response to thread ${thread.id}, but the summary reply was withheld: ${STAND_DOWN_REASONS}. ` +
                    "The artifact WAS changed \u2014 review the change."
                  : kind === "not_activated" && W.post?.pageOwnsThreads
                    ? `Auto-edited artifact ${url} in response to thread ${thread.id}, but the summary reply was withheld: ${PAGE_OWNS_THREADS_REASON}. ` +
                      "The artifact WAS changed \u2014 review the change; an answer belongs in the page's own thread."
                    : `Auto-edited artifact ${url} in response to thread ${thread.id}, but the summary reply ${autoModeDeclined ? "was not posted (auto mode did not approve it)" : "FAILED to post"} \u2014 ` +
                      (Ve
                        ? `the artifact WAS changed, and the only reply standing is this session's acknowledgement${ge}. Review the change, then post the promised summary reply with acknowledge_duplicate: true \u2014 the duplicate guard refuses a plain follow-up \u2014 or revert.` +
                          RESOLVE_AFTER_REPLY_NOTE()
                        : "the artifact WAS changed with no reply in the thread. Review the change and reply or revert." +
                          replyThenResolveNote()),
          });
        } else logFeatureSad("artifact_comments_autoreact", "edit_landed_notice_suppressed");
      }
      return;
    } else Ye = de.text;
  } else
    Ye = await composeThreadReply({
      trigger: he,
      thread,
      context,
      slug,
      summons: Se,
      pagesRead: lt,
    });
  if (typeof Ye !== "string") {
    emitArtifactSummonStatus(
      se,
      Ye.miss === "usage_limited"
        ? {
            status: "declined",
            reason: "usage_limited",
          }
        : {
            status: "failed",
            reason: "compose_failed",
          },
    );
    return;
  }
  if (containsBlockedChars(Ye)) {
    logFeatureSad("artifact_comments_autoreact", "compose_hidden_codepoints");
    emitArtifactSummonStatus(se, {
      status: "failed",
      reason: "compose_failed",
    });
    return;
  }
  let text = Ye;
  let Ho = async () => {
    if (Te !== null && getLiveState().accountEpoch !== accountEpoch_2) {
      logFeatureSad("artifact_comments_autoreact", "held_reply_account_changed");
      return;
    }
    if (isBuiltInArtifactHiddenForMcp()) {
      emitArtifactSummonStatus(se, {
        status: "declined",
        reason: "auto_reply_off",
      });
      return;
    }
    if (Te !== null && Re("held_reply_compose")) return;
    let k = Te === null ? null : autoReactCanUseTool(context.agentId, artifactState, $t);
    if (Te !== null && k === null) {
      logFeatureSad("artifact_comments_autoreact", "held_reply_channel_gone");
      kn();
      return;
    }
    let re;
    try {
      re = await postThreadReply({
        tool: Be,
        context:
          Te === null
            ? context
            : {
                ...context,
                abortController: createChildAbortController(context.abortController),
              },
        url,
        slug,
        threadId: thread.id,
        text,
        declareAnswersSummon: st,
        continuesReplyId,
        composedFromOwnWordsOnly,
        threadTranscript: S(),
        recheck:
          Te === null
            ? getOwnReplyInfo(w, scanRowIds)
            : {
                ownReplyIds: new Set(),
                scanRowIds,
              },
        ...(k !== null && {
          canUseTool: k,
          held: {
            admittedEpoch: accountEpoch_2,
          },
        }),
      });
    } catch {
      logFeatureBad(
        "artifact_comments_autoreact",
        "permission_eval_error",
        rulesOnlyVerdict
          ? {
              rules_only: true,
            }
          : undefined,
      );
      emitArtifactSummonStatus(se, {
        status: "failed",
        reason: "post_failed",
      });
      return;
    }
    if ($t.ask === "unanswered" && re.kind !== "account_changed") {
      if (Re("held_reply_ask")) return;
      logFeatureSad("artifact_comments_autoreact", "held_reply_channel_gone");
      kn();
      return;
    }
    applyPostOutcome({
      post: re,
      threadState: w,
      artifactState,
      slug,
      scanGen: e.scanGen,
      notify: ve,
      summon: se,
      trigger: he,
      url,
      artifactName,
      ackPosted: Ve,
      ackCommentId: Pe,
      rulesOnlyProbe: rulesOnlyVerdict,
      ownSendWithheld: ct(),
      pageOwnsThreads: recordedDecl,
      heldForPerson: $t.ask === "answered",
      notice: {
        coalesce: {
          family: "auto-replied",
          artifactName,
          threadId: thread.id,
        },
        detail:
          `Auto-replied to thread ${thread.id} on artifact ${url} \u2014 a reply only: it may answer a question, but nothing in the artifact was changed. ` +
          "If the thread asks for a change to the artifact, read the thread and make the change yourself if appropriate." +
          (thread.resolved
            ? " The acknowledgement reply is already in the thread \u2014 do NOT post another; the thread stays resolved. Do not reply only to confirm that no change was needed \u2014 the standing reply covers it."
            : buildAutoPostedReplyNote([Pe, re.kind === "posted" ? re.commentId : undefined])),
      },
      ...(Ve && {
        replyWithheldNotice: {
          summary: autoEditNeedsReviewNotice(artifactName),
          detail:
            `The promised follow-up reply to thread ${thread.id} on artifact ${url} was withheld: ${getStandDownReasons(re)}. The acknowledgement${formatCommentIds([Pe])} stands as this session's reply \u2014 review the thread; if it asks for an artifact change, make the change yourself if appropriate.` +
            noConfirmOnlyReplyNote(re),
        },
      }),
      allowSiblingReset: true,
    });
    if (Te !== null) flushAutoreactLedger();
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
export {
  processArtifactThread,
  collectPendingSummons,
  localSourcePathIfEditCapable,
  checkReplyPermission,
  getLocalSourcePath,
};
