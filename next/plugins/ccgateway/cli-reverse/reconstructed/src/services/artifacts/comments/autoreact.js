/**
 * services/artifacts/comments/autoreact.ts
 *
 * 2.1.316 新增：评论自动响应主流程（线程激活、去重、回复/编辑/交给后台 agent）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c0pq6qyx.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { countWhere } from "../../../utils/collections.js";
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
import { normalizeCaseForComparison_2 } from "../../../utils/permissions/filesystem.js";
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
import { readMarkedForeign } from "../frameComments.js";
import { isResponderDispatchEnabled, triageArtifactComment } from "./threadClassifier.js";
import { runCommentThreadAnalyst } from "./threadAnalyst.js";
import { upperFirstAlias } from "../../../../vendor/lodash-es/upperFirst.js";
import { containsBlockedChars } from "./commentMentions.js";
import { createChildAbortController } from "../../../utils/abortController.js";
import { flushAutoreactLedger } from "./autoreactLedger.js";

//@ chunk-c0pq6qyx.js:73535-73965 placement
async function checkReplyPermission(options) {
  let { url, thread, context, replyTool } = options;
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
  let probe = await probeReplyPermission({
    tool: replyTool,
    context,
    url,
    threadId: thread.id,
    fixedAck: false,
    rulesOnlyOrNothing: true,
  });
  return (
    !probe.threw &&
    probe.skipped !== true &&
    probe.decision.behavior === "allow" &&
    !(
      probe.decision.decisionReason?.type === "rule" &&
      isArtifactActionRule(probe.decision.decisionReason.rule)
    )
  );
}
//@ chunk-c0pq6qyx.js:73965-74506 placement
async function handOffThreadToBackgroundAgent(options) {
  let permissionPromptPerson = getPermissionPromptPerson();
  if (permissionPromptPerson === null) {
    logFeatureSad("artifact_comments_autoreact", "fork_fallback_no_person");
    return false;
  }
  let { slug, url, thread } = options;
  try {
    return (
      (
        await spawnOrJoinThreadAgent({
          slug,
          threadId: thread.id,
          url,
          artifactName: options.artifactName,
          directive: buildThreadAgentPrompt({
            trigger: options.trigger,
            summonCount: options.summonCount,
            url,
            threadId: thread.id,
            sourcePath: options.sourcePath,
            resolved: thread.resolved,
          }),
          followUp: buildThreadFollowUpPrompt({
            url,
            threadId: thread.id,
          }),
          canUseTool: permissionPromptPerson,
          summon: {
            ...options.summon,
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
//@ chunk-c0pq6qyx.js:74506-74565 placement
function getLocalSourcePath(thread, slug) {
  return isProbedLivePage(thread) ? undefined : slug.localSourcePath(thread);
}
//@ chunk-c0pq6qyx.js:74565-74645 placement
function localSourcePathIfEditCapable(thread, slug, recordedPages) {
  return isNewelFlagOn() || (thread.editCapable === true && !thread.resolved)
    ? getLocalSourcePath(slug, recordedPages)
    : undefined;
}
//@ chunk-c0pq6qyx.js:74645-75190 placement
function collectPendingSummons(thread, threadState) {
  let out = [];
  let failed = false;
  for (let comment of thread.comments) {
    if (isDegradedComment(comment) || !isHumanComment(comment)) continue;
    if (!threadState.seen.has(comment.id)) {
      failed ||= comment.postedByArtifact !== true;
      if (comment.toClaudeAt !== undefined) out.push(comment);
    } else if (
      comment.toClaudeAt !== undefined &&
      threadState.sentToClaudeAt.has(comment.id) &&
      shouldFireActivation(threadState.sentToClaudeAt.get(comment.id) ?? null, comment.toClaudeAt).fire
    ) {
      failed = true;
      out.push(comment);
    }
  }
  let activatedAt = thread.activatedAt ?? null;
  let fire =
    threadState.activatedAtObserved && shouldFireActivation(threadState.activatedAt, activatedAt).fire;
  let result =
    out.length === 0 &&
    !thread.resolved &&
    fire &&
    thread.comments.some((comment) => getCommentAuthorKind(comment) !== "agent");
  if (out.length === 0 && !result) return null;
  return {
    summons: out,
    typedGesture: failed,
    activationFires: fire,
    activationPending: result,
  };
}
//@ chunk-c0pq6qyx.js:75190-77075 placement
/**
 * 线程被激活/有人发评论给 Claude 时，决定立即自动回复、交给后台 agent 还是排队，并发出通知。
 */
async function handleThreadActivation(request) {
  let { slug, thread, threadState } = request;
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
  let activatedAtTs = latestValidTimestamp(
    activationPending ? [activatedAt] : summons.map((summon) => summon.toClaudeAt),
  );
  let gestureAt = activatedAtTs ?? "";
  if (threadState.busyAckedGestureAt === gestureAt) return;
  let extraSummons =
    activationFires && threadState.activatedAt === null && !request.threadsDropped
      ? getCommentsAwaitingReply(thread).filter(
          (comment) => isRecentToClaudeAt(comment, Date.now()) && !summons.includes(comment),
        )
      : [];
  let mapped = [...summons, ...extraSummons].map((summon) => summon.toClaudeAt);
  let hostEntrypoint = isHostEntrypoint();
  let activationKind;
  if (
    mapped.length > 0 &&
    mapped.every(isToClaudeTimestamp) &&
    new Set(mapped).size === mapped.length &&
    mapped.every((timestamp) =>
      hasSummonClaim(slug, thread.id, timestamp, {
        hostSeeded: hostEntrypoint,
      }),
    )
  )
    activationKind =
      hostEntrypoint && mapped.every((timestamp) => hasHostClaim(slug, thread.id, timestamp))
        ? "seeded_turn"
        : "read";
  if (activationKind === "read") return;
  let busyWithheldForecast = threadState.busyWithheldForecast;
  if (
    activationKind === undefined &&
    busyWithheldForecast?.gestureAt === gestureAt &&
    Date.now() - busyWithheldForecast.at < MAX_NEWEL_MS
  )
    return;
  let denialsExhausted = threadState.consecutivePipelineDenials >= MAX_AUX_RETRIES;
  let suppressNote =
    isBuiltInArtifactHiddenForMcp() ||
    localSourcePathIfEditCapable(thread, slug, request.context.artifactRegistries.recordedPages) !==
      undefined;
  let shouldNotify = denialsExhausted && !suppressNote;
  let runTurn = async () =>
    isBuiltInArtifactHiddenForMcp() &&
    (!areAllCommentsTrusted(appendActivatedComments(summons, extraSummons, thread), thread) ||
      isReplyDeniedByRules(request.context))
      ? {
          status: "declined",
          reason: "blocked",
        }
      : isBuiltInArtifactHiddenForMcp() && canAutoreactWithoutPrompts(request.context)
        ? {
            status: "declined",
            reason: "ask_mode",
          }
        : await forecastReplyPermission({
            ...request,
            handOff: suppressNote,
            latchedHandOff: denialsExhausted && suppressNote,
          });
  let turn;
  if (activationKind === "seeded_turn")
    turn = {
      status: "working",
    };
  else if (!threadState.breakerOpen)
    turn = shouldNotify
      ? {
          status: "declined",
          reason: "blocked",
        }
      : await runTurn();
  else if (
    threadState.lastAutoReplyAt !== null &&
    Date.now() - threadState.lastAutoReplyAt < MAX_STAMP_AGE_MS
  )
    turn = null;
  else if (!typedGesture)
    turn = {
      status: "declined",
      reason: "loop_guard",
    };
  else
    turn = shouldNotify
      ? {
          status: "declined",
          reason: "blocked",
        }
      : await runTurn();
  if (
    turn === null ||
    !isAutoreactArmed() ||
    isSlugStoppedAnywhere(slug) ||
    scanStamp(slug) !== request.scanGen ||
    !isBusyShorterThan(performance.now(), getAutoReactRateLimit())
  )
    return;
  if (turn === "unreadable") {
    threadState.busyAckedGestureAt = gestureAt;
    return;
  }
  let working = turn.status === "working";
  if ((isHostEntrypoint() || request.suppressSummonStatus) && !working) {
    threadState.busyWithheldForecast = {
      gestureAt,
      at: Date.now(),
    };
    return;
  }
  threadState.busyAckedGestureAt = gestureAt;
  threadState.busyWithheldForecast = undefined;
  emitArtifactSummonStatus(
    {
      slug,
      threadId: thread.id,
      gestureAt: activatedAtTs,
      suppressed: false,
      storageV5: request.context.storageV5,
    },
    turn,
  );
  logFeatureOk("artifact_summon_forecast", {
    working,
  });
}
//@ chunk-c0pq6qyx.js:77075-78547 placement
async function forecastReplyPermission(options) {
  let { tool, context, artifactState } = options;
  let now = Date.now();
  let isRecent = (at) => now - at < 3600000;
  if (
    countWhere(artifactState.turnTimestamps, isRecent) >= getMaxAutoTurns() ||
    countWhere(artifactState.forecastTimestamps, isRecent) >= getMaxAutoTurns()
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
  let isAutoMode = autoEditPermissionContext.mode === "auto";
  if (
    autoEditPermissionContext.avoidPrompts ||
    autoEditPermissionContext.chainOnAllow ||
    (isAutoMode && !canAutoEditWithoutPrompt(autoEditPermissionContext))
  )
    return null;
  artifactState.forecastTimestamps = artifactState.forecastTimestamps.filter(isRecent);
  artifactState.forecastTimestamps.push(now);
  let [declared, recordedDecl] = await Promise.all([
    probeReplyPermission({
      tool,
      context,
      url: options.url,
      threadId: options.thread.id,
      fixedAck: false,
      rulesOnlyOrNothing: isAutoMode,
    }),
    readRecordedDecl(options.slug, context),
  ]);
  if (declared.threw) {
    logFeatureBad(
      "artifact_summon_forecast",
      "permission_eval_error",
      declared.rulesOnlyProbe
        ? {
            rules_only: true,
          }
        : undefined,
    );
    return "unreadable";
  }
  if (declared.skipped || getToolPermissionContext(context).mode === "plan") return null;
  if (declared.denied !== null)
    return {
      status: "declined",
      reason: declared.denied.reason,
    };
  let { decision } = declared;
  let notAllowed = decision.behavior !== "allow";
  if (
    notAllowed &&
    autoReactCanUseTool(context.agentId, artifactState, {
      ask: null,
    }) === null
  )
    return {
      status: "declined",
      reason: "ask_mode",
    };
  let held =
    !notAllowed &&
    decision.decisionReason?.type === "rule" &&
    isArtifactActionRule(decision.decisionReason.rule);
  let usable = !notAllowed && !held;
  if (
    canPageReplyDirectly({
      pageOwnsThreads: recordedDecl,
      handsOffToTurn: options.handOff && usable,
      composesEdit:
        options.thread.claudeActivated &&
        options.thread.editCapable === true &&
        usable &&
        !options.thread.resolved,
      slug: options.slug,
      editRejudgedByAutoMode: alwaysFalseAutoreact(tool, context),
    })
  )
    return {
      status: "declined",
      reason: "blocked",
    };
  if (notAllowed)
    return options.latchedHandOff
      ? {
          status: "declined",
          reason: "blocked",
        }
      : {
          status: "needs_user",
          reason: "approval_required",
        };
  return options.latchedHandOff && held
    ? {
        status: "declined",
        reason: "blocked",
      }
    : {
        status: "working",
        reason: "queued",
      };
}
//@ chunk-c0pq6qyx.js:78547-79463 placement
async function probeReplyPermission(options) {
  let { tool, context, url, threadId } = options;
  let input = {
    action: "reply",
    url,
    thread_id: threadId,
    text: "",
  };
  let autoEditPermissionContext = getAutoEditPermissionContext(tool, context);
  let canSkip = options.fullReadUnder === undefined && canAutoEditWithoutPrompt(autoEditPermissionContext);
  if (options.rulesOnlyOrNothing === true && !canSkip)
    return {
      threw: false,
      skipped: true,
    };
  let ruleResult =
    options.fullReadUnder ?? `autoreact-${threadId}-probe-${getLiveState().autoReact.probeSeq++}`;
  let ask = () => evaluateAskingNoHost(tool, input, context, emptyAutoReactMessage(threadId), ruleResult);
  try {
    if (canSkip) {
      let outcome = await checkRuleBasedPermissions(
        tool,
        input,
        {
          ...context,
          toolUseId: ruleResult,
        },
        {
          crashIsObjection: true,
        },
      );
      if (
        outcome?.decisionReason?.type === "other" &&
        outcome.decisionReason.reason === PERMISSION_CHECK_CRASHED_REASON
      )
        throw Error("artifact permission check crashed");
      if (canAutoEditWithoutPrompt(getAutoEditPermissionContext(tool, context))) {
        let allowed = outcome ?? {
          behavior: "allow",
          updatedInput: input,
        };
        return {
          threw: false,
          decision: allowed,
          denied: allowed.behavior === "deny" ? describeReplyDenial(allowed) : null,
          rulesOnlyVerdict: true,
          verdictPremise: options.fixedAck ? autoEditPermissionContext : null,
          probeId: ruleResult,
        };
      }
      if (options.rulesOnlyOrNothing === true)
        return {
          threw: false,
          skipped: true,
        };
    }
    let asked = await ask();
    return {
      threw: false,
      decision: asked,
      denied: asked.behavior === "deny" ? describeReplyDenial(asked) : null,
      rulesOnlyVerdict: false,
      verdictPremise: null,
      probeId: ruleResult,
    };
  } catch {
    return {
      threw: true,
      rulesOnlyProbe: canSkip,
    };
  }
}
//@ chunk-c0pq6qyx.js:79463-79489 placement
function alwaysFalseAutoreact(tool, context) {
  return false;
}
//@ chunk-c0pq6qyx.js:79489-79633 placement
function canPageReplyDirectly(options) {
  if (!options.pageOwnsThreads || options.handsOffToTurn) return false;
  return (
    !options.composesEdit ||
    isProbedLivePage(options.slug) ||
    typeLockedFor(options.slug, undefined) ||
    options.editRejudgedByAutoMode
  );
}
//@ chunk-c0pq6qyx.js:79633-108242 placement
/**
 * 评论自动响应主流程：读取线程、去重已见评论、判断是否该回应、组织回复/编辑、处理各种降级与遥测。
 */
async function processArtifactThread(input) {
  let { slug, url, artifactName, thread, context, notify, artifactState } = input;
  let toolByName = findToolByName(context.options.tools ?? [], commentsToolName());
  let hiddenForMcp = isBuiltInArtifactHiddenForMcp();
  let replyOptions = {};
  let replyTool = hiddenForMcp
    ? undefined
    : ((toolByName?.mcpInfo === undefined ? toolByName : undefined) ??
      (isArtifactToolsetSplit() ? undefined : input.tool));
  let takeover;
  let emptyTranscript = () => {
    input.threadsDropped;
    return [];
  };
  if (!isAutoreactArmed() || isSlugStoppedAnywhere(slug)) return;
  let threadState = artifactState.threads.get(thread.id);
  if (thread.commentsDegraded === true) return threadState ? undefined : "deferred_first_sight";
  if (thread.resolvedDegraded === true) {
    logFeatureSad("artifact_comments_autoreact", "resolution_degraded");
    return threadState ? undefined : "deferred_first_sight";
  }
  let activationDegraded = thread.activatedAtDegraded === true;
  let summonComments = new Set();
  if (!threadState) {
    if (activationDegraded) {
      logFeatureSad("artifact_comments_autoreact", "activation_degraded");
      return "deferred_first_sight";
    }
    let agentActivated =
      thread.claudeActivated &&
      !thread.resolved &&
      thread.comments.some((comment) => getCommentAuthorKind(comment) !== "agent");
    let actFirstSight =
      input.actOnFirstSight && artifactState.baselined && agentActivated && !input.hintMissed;
    let liveSight =
      !actFirstSight &&
      agentActivated &&
      !input.hintMissed &&
      artifactState.everBaselined &&
      parseTimestamp(thread.activatedAt) !== null &&
      (input.liveSightBoundary === null ||
        (artifactState.stampHighWater !== null && shouldFireOnStamps(thread, input.liveSightBoundary)));
    let summonFirstSight = (actFirstSight || liveSight) && isFastAckEnabled();
    if (
      (summonFirstSight || (input.pickUpRecentSummons && !actFirstSight && !liveSight)) &&
      !input.threadsDropped &&
      thread.claudeActivated
    ) {
      let now = Date.now();
      let commentsAwaitingReply = getCommentsAwaitingReply(thread);
      summonComments = new Set(commentsAwaitingReply.filter((comment) => isRecentToClaudeAt(comment, now)));
      if (summonFirstSight) {
        if (summonComments.size > 0)
          logFeatureOk("artifact_comments_autoreact", {
            first_sight_summon: true,
          });
        else if (commentsAwaitingReply.length > 0)
          logFeatureSad("artifact_comments_autoreact", "first_sight_summon_stale");
      }
    }
    threadState = {
      lastAutoReplyAt: null,
      seen: new Set(
        thread.comments.filter((comment) => !summonComments.has(comment)).map((comment) => comment.id),
      ),
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
        actFirstSight || liveSight
          ? null
          : parseTimestamp(thread.activatedAt) !== null
            ? (thread.activatedAt ?? null)
            : null,
      activatedAtObserved: thread.activatedAt === undefined || parseTimestamp(thread.activatedAt) !== null,
    };
    artifactState.threads.set(thread.id, threadState);
    artifactState.everHadThreads = true;
    raiseStampHighWater(artifactState, thread);
    if (actFirstSight || liveSight)
      recordJudged(slug, thread.id, thread.comments, await ownAccount(context.credentials));
    else {
      let filtered = thread.comments.filter((comment) => commentTextChanged(slug, comment.id, comment.text));
      if (filtered.length > 0) recordJudged(slug, thread.id, filtered, await ownAccount(context.credentials));
      rememberCommentTexts(
        slug,
        thread.comments.filter((comment) => !summonComments.has(comment)),
      );
      if (summonComments.size === 0) return;
      logFeatureOk("artifact_comments_autoreact", {
        summon_pickup: true,
      });
    }
  }
  if (activationDegraded) {
    logFeatureSad("artifact_comments_autoreact", "activation_degraded");
    return;
  }
  let activationReadAbsent = !thread.claudeActivated && threadState.activatedAt !== null;
  noteDeferOnce(threadState, "activation_read_absent", activationReadAbsent);
  if (activationReadAbsent) return;
  let last = thread.comments.at(-1);
  let newestUnknown = last !== undefined && getCommentAuthorKind(last) === "unknown";
  let any = thread.comments.some(
    (comment, index) =>
      getCommentAuthorKind(comment) === "unknown" &&
      thread.comments
        .slice(0, index)
        .some((comment) => getCommentAuthorKind(comment) === "human" && comment.toClaudeAt !== undefined),
  );
  let newestLaneUnknown = newestUnknown || any;
  noteDeferOnce(threadState, "newest_lane_unknown", newestLaneUnknown);
  if (newestLaneUnknown) return;
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
        threadState,
        context,
        replyTool,
        artifactState,
      }))
    )
  ) {
    let commentsToJudge = selectCommentsToJudge(slug, thread, threadState);
    if (commentsToJudge.length > 0)
      recordJudged(slug, thread.id, commentsToJudge, await ownAccount(context.credentials));
    let judgedSet = new Set(commentsToJudge);
    rememberCommentTexts(
      slug,
      thread.comments.filter((comment) => threadState.seen.has(comment.id) && !judgedSet.has(comment)),
    );
    let activationTool = hiddenForMcp ? input.tool : replyTool;
    if (activationTool !== undefined)
      await handleThreadActivation({
        slug,
        url,
        thread,
        threadState,
        artifactState,
        tool: activationTool,
        context,
        scanGen: input.scanGen,
        suppressSummonStatus: input.suppressSummonStatus,
        threadsDropped: input.threadsDropped,
      });
    return "deferred_busy";
  }
  threadState.busyAckedGestureAt = undefined;
  threadState.busyWithheldForecast = undefined;
  if (!(isMadroneSpindleEnabled() && isBusyAtLeast(performance.now(), autoReactRateLimit)))
    artifactState.busyValveNoticed = false;
  else if (!artifactState.busyValveNoticed) {
    artifactState.busyValveNoticed = true;
    logFeatureSad("artifact_comments_autoreact", "foreground_busy_timeout");
  }
  raiseStampHighWater(artifactState, thread);
  let activatedAt = thread.activatedAt ?? null;
  let activatedAt_2 = threadState.activatedAt;
  let activated = false;
  if (!threadState.activatedAtObserved) {
    if (activatedAt === null || parseTimestamp(activatedAt) !== null) {
      threadState.activatedAtObserved = true;
      threadState.activatedAt = activatedAt;
    }
  } else {
    let activationResult = shouldFireActivation(threadState.activatedAt, activatedAt);
    activated = activationResult.fire;
    threadState.activatedAt = activationResult.record;
  }
  let redesignated = [];
  for (let comment of thread.comments) {
    if (isDegradedComment(comment)) continue;
    let toClaudeAt = comment.toClaudeAt ?? null;
    if (!threadState.sentToClaudeAt.has(comment.id)) {
      threadState.sentToClaudeAt.set(comment.id, toClaudeAt);
      continue;
    }
    let prevToClaudeAt = threadState.sentToClaudeAt.get(comment.id) ?? null;
    let commentActivation = shouldFireActivation(prevToClaudeAt, toClaudeAt);
    if (commentActivation.fire && threadState.seen.has(comment.id) && isHumanComment(comment))
      redesignated.push(comment);
    threadState.sentToClaudeAt.set(comment.id, commentActivation.record);
  }
  let shouldDefer = thread.comments.some(
    (comment) => isDegradedComment(comment) && !threadState.seen.has(comment.id),
  );
  noteDeferOnce(threadState, "fresh_trigger_degraded", shouldDefer);
  let filtered = thread.comments.filter(
    (comment) => !threadState.seen.has(comment.id) && !isDegradedComment(comment),
  );
  let redesignatedSet = new Set(redesignated);
  let filtered_2 = thread.comments.filter(
    (comment) =>
      threadState.seen.has(comment.id) &&
      !redesignatedSet.has(comment) &&
      commentTextChanged(slug, comment.id, comment.text),
  );
  let changedSet = new Set(filtered_2);
  rememberCommentTexts(
    slug,
    thread.comments.filter((comment) => threadState.seen.has(comment.id) && !changedSet.has(comment)),
  );
  if (filtered.length === 0 && !activated && redesignated.length === 0) {
    if (filtered_2.length > 0)
      recordJudged(slug, thread.id, filtered_2, await ownAccount(context.credentials));
    return;
  }
  let account = await ownAccount(context.credentials);
  {
    let toJudge = [...filtered, ...redesignated, ...filtered_2];
    let judgedComments = activated ? thread.comments : toJudge;
    if (judgedComments.length === 0) recordUnaccountedComments(slug);
    else recordJudged(slug, thread.id, judgedComments, account);
  }
  let now = Date.now();
  for (let comment of filtered) threadState.seen.add(comment.id);
  let filtered_3 = filtered.filter(isHumanComment);
  let withinAutoWindow =
    threadState.lastAutoReplyAt !== null && now - threadState.lastAutoReplyAt < MAX_STAMP_AGE_MS;
  if (
    (filtered_3.filter((comment) => comment.postedByArtifact !== true).length > 0 ||
      redesignated.length > 0) &&
    !withinAutoWindow
  ) {
    threadState.consecutiveAuto = 0;
    threadState.breakerOpen = false;
  }
  let filtered_4 = filtered_3.filter(hasToClaudeAt);
  let activationHasOthers =
    activated && thread.comments.some((comment) => getCommentAuthorKind(comment) !== "agent");
  let resolvedWithTriggers = thread.resolved && (filtered_4.length > 0 || redesignated.length > 0);
  if (
    !thread.claudeActivated ||
    (thread.resolved && !resolvedWithTriggers) ||
    (filtered_4.length === 0 && !activationHasOthers && redesignated.length === 0)
  )
    return;
  let trigger =
    thread.anchorMovedCommentId !== undefined &&
    (filtered_4.length > 0 || redesignated.length > 0) &&
    [...filtered_4, ...redesignated].every((comment) => comment.id === thread.anchorMovedCommentId)
      ? "moved"
      : filtered_4.length > 0
        ? "fresh"
        : redesignated.length > 0
          ? "redesignated"
          : "activation";
  let triggerComment =
    filtered_4.at(-1) ??
    redesignated.at(-1) ??
    thread.comments.findLast((comment) => isHumanComment(comment));
  let summons = trigger === "activation" ? [] : [...filtered_4, ...redesignated];
  let scanRowIds = new Set(thread.comments.map((comment) => comment.id));
  let summonStatus = {
    slug,
    threadId: thread.id,
    gestureAt: latestValidTimestamp(
      trigger === "activation" ? [threadState.activatedAt] : summons.map((comment) => comment.toClaudeAt),
    ),
    suppressed: input.suppressSummonStatus,
    storageV5: context.storageV5,
  };
  let stoppedGuard = (phase) => {
    if (
      !isAutoreactArmed() ||
      isSlugStoppedAnywhere(slug) ||
      scanStamp(slug) !== input.scanGen ||
      (replyOptions.handsOff === false && isBuiltInArtifactHiddenForMcp())
    ) {
      logFeatureSad("artifact_comments_autoreact", `stopped_during_${phase}`);
      emitArtifactSummonStatus(summonStatus, {
        status: "declined",
        reason: "auto_reply_off",
      });
      return true;
    }
    return false;
  };
  let yieldGuard = (phase) => {
    if (stoppedGuard(phase)) return true;
    if (getToolPermissionContext(context).mode === "plan") {
      logFeatureSad("artifact_comments_autoreact", `plan_mode_during_${phase}`);
      emitArtifactSummonStatus(summonStatus, {
        status: "declined",
        reason: "plan_mode",
      });
      return true;
    }
    return false;
  };
  let lastIndex = thread.comments.findLastIndex((comment) => getCommentAuthorKind(comment) === "agent");
  let lastAgentComment = lastIndex >= 0 ? thread.comments[lastIndex] : undefined;
  let summonsForOrdering = [...filtered_4, ...redesignated];
  let answersSummon =
    summons.length > 0 &&
    (lastAgentComment === undefined || hasCommentSentAfter(summonsForOrdering, lastAgentComment));
  let id =
    lastAgentComment !== undefined &&
    !input.threadsDropped &&
    !thread.comments.some((comment) => getCommentAuthorKind(comment) === "unknown") &&
    (threadState.ownReplyIds.has(lastAgentComment.id) || isOwnPostedReply(lastAgentComment.id))
      ? lastAgentComment.id
      : undefined;
  let continuesReplyId = !answersSummon ? id : undefined;
  if (
    isLastAgentReplyCurrent({
      thread,
      threadState,
      trigger,
      summonsForOrdering,
      activatedAt: threadState.activatedAt,
    })
  ) {
    logFeatureSad("artifact_comments_autoreact", "stood_down_answered");
    return;
  }
  let activationComments =
    activated && activatedAt_2 === null && !input.threadsDropped
      ? getCommentsAwaitingReply(thread).filter(
          (comment) => isRecentToClaudeAt(comment, now) && !summons.includes(comment),
        )
      : [];
  let mapped = [...summons, ...activationComments].map((comment) => comment.toClaudeAt);
  if (
    mapped.length > 0 &&
    mapped.every(isToClaudeTimestamp) &&
    new Set(mapped).size === mapped.length &&
    isMadroneSpindleEnabled()
  ) {
    let hostEntrypoint = isHostEntrypoint();
    let hasHostClaimFn = () => mapped.some((toClaudeAt) => hasHostClaim(slug, thread.id, toClaudeAt));
    if (
      mapped.every((toClaudeAt) =>
        hasSummonClaim(slug, thread.id, toClaudeAt, {
          hostSeeded: false,
        }),
      ) &&
      !hasHostClaimFn() &&
      isThreadAgentEnabled() &&
      replyTool !== undefined &&
      localSourcePathIfEditCapable(thread, slug, context.artifactRegistries.recordedPages) !== undefined &&
      getPermissionPromptPerson() !== null &&
      (await checkReplyPermissionSafe({
        url,
        thread,
        context,
        replyTool,
      })) &&
      !hasHostClaimFn()
    ) {
      consumeReadClaims(slug, thread.id, mapped);
      logFeatureOk("artifact_comments_autoreact", {
        read_claim_passed_on: true,
      });
    } else {
      let claimed = consumeSummonClaims(slug, thread.id, mapped, {
        hostSeeded: hostEntrypoint,
      });
      if (!claimed && hostEntrypoint) {
        claimed =
          (await waitForSummonClaim(slug, thread.id, mapped, context.abortController.signal)) &&
          consumeSummonClaims(slug, thread.id, mapped);
        if (!claimed && yieldGuard("visible_handoff")) return;
      }
      if (claimed) {
        logFeatureSad("artifact_comments_autoreact", "stood_down_visible_turn");
        return;
      }
    }
  }
  if (threadState.breakerOpen) {
    logFeatureSad("artifact_comments_autoreact", "breaker_open");
    emitArtifactSummonStatus(summonStatus, {
      status: "declined",
      reason: "loop_guard",
    });
    return;
  }
  let sourcePath = localSourcePathIfEditCapable(thread, slug, context.artifactRegistries.recordedPages);
  let pipelineDeniedEnough = threadState.consecutivePipelineDenials >= MAX_AUX_RETRIES;
  let hiddenForMcpNow = isBuiltInArtifactHiddenForMcp();
  replyOptions.handsOff = hiddenForMcpNow;
  let notePipelineDenied = () => {
    if (!artifactState.pipelineDeniedNoticed) {
      artifactState.pipelineDeniedNoticed = true;
      markAutoReactNoticePending(slug);
      notify({
        summary: autoRepliesPausedNotice(artifactName),
        detail: `Automatic replies or edits on artifact ${url} are being blocked by a permission hook or content gate, or repeatedly refused by the session's configuration \u2014 recent attempts were refused or dropped after composing. Affected threads are paused; a successful auto-reply anywhere on this artifact resumes them.`,
      });
    }
    logFeatureSad("artifact_comments_autoreact", "pipeline_denied");
    emitArtifactSummonStatus(summonStatus, {
      status: "declined",
      reason: "blocked",
    });
  };
  if (pipelineDeniedEnough && sourcePath === undefined && !hiddenForMcpNow) {
    notePipelineDenied();
    return;
  }
  if (stoppedGuard("own_account")) return;
  let trustedSummon =
    (filtered_4.length > 0 || activated || redesignated.length > 0) &&
    redesignated.every(isTrustedCommentPrompts) &&
    filtered_4.every(
      (comment) =>
        comment.postedByArtifact !== true &&
        (comment.sentByViewer === true ||
          (isOwnPrincipal(comment.account, account) &&
            comment.createdAt !== undefined &&
            comment.toClaudeAt === comment.createdAt)),
    ) &&
    (!activated ||
      (thread.activatedBy !== undefined &&
        isOwnPrincipal(thread.activatedBy, account) &&
        !thread.comments.some(
          (comment) => comment.postedByArtifact === true && comment.toClaudeAt !== undefined,
        )));
  let trustedOnly = trustedSummon && filtered_4.every(isTrustedCommentPrompts);
  let accountEpoch = getLiveState().accountEpoch;
  let sameAccountEpoch = () => trustedOnly && getLiveState().accountEpoch === accountEpoch;
  let notifyTagged = (notice) =>
    notify(
      sameAccountEpoch()
        ? {
            ...notice,
            ownGesture: true,
          }
        : notice,
    );
  let timestamp = parseTimestamp(thread.activatedAt);
  let activatedComments = appendActivatedComments(summons, activationComments, thread);
  let sendWithheldReason = (comment) =>
    comment === undefined
      ? undefined
      : comment.postedByArtifact === true
        ? "page_posted_send"
        : comment.sentByViewer === false
          ? "send_by_another"
          : "send_sender_unknown";
  let withholdReason = !activated
    ? undefined
    : input.threadsDropped === true ||
        thread.commentsDegraded === true ||
        timestamp === null ||
        thread.comments.some(
          (comment) =>
            isDegradedComment(comment) ||
            (getCommentAuthorKind(comment) === "agent" && parseTimestamp(comment.createdAt) === null),
        )
      ? "read_may_hide_send"
      : sendWithheldReason(
          getCommentsAwaitingReply(thread).find(
            (comment) =>
              (parseTimestamp(comment.toClaudeAt) ?? 1 / 0) >= timestamp && !isTrustedCommentPrompts(comment),
          ),
        );
  let ownSendWithheld = () =>
    getLiveState().accountEpoch !== accountEpoch
      ? "account_changed"
      : (withholdReason ??
        (activatedComments.length > 0
          ? sendWithheldReason(activatedComments.find((comment) => !isTrustedCommentPrompts(comment)))
          : trustedOnly
            ? undefined
            : "no_send_activation_unproven"));
  let sendProven = () => ownSendWithheld() === undefined;
  let allTrusted =
    thread.commentsDegraded !== true &&
    thread.comments.every((comment) => isTrustedComment(comment, account));
  let analystSpoke = false;
  let pagesRead = [];
  let anchorMemo;
  let anchorReadsForeign = () =>
    (anchorMemo ??= (async () => {
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
      let pageHtml = await PREVIEW_FEATURE_PROMPT({
        slug,
        ...(thread.anchorFile !== undefined && {
          file: thread.anchorFile,
        }),
        signal: context.abortController.signal,
        credentials: context.credentials,
        feature: "artifact_autoreact_anchor_read",
        quotedToAudience: true,
      });
      return pageHtml === undefined || (await extractJsonScriptById(pageHtml, "ws-decisions")) !== null;
    })());
  let composedFromOwnWordsOnly = async () =>
    allTrusted &&
    !analystSpoke &&
    !context.artifactRegistries.recordedPages.isWorkshopPage(slug) &&
    !(await anchorReadsForeign()) &&
    (
      await Promise.all(
        normalizeCaseForComparison_2(pagesRead).map((html) => extractJsonScriptById(html, "ws-decisions")),
      )
    ).every((mark) => mark === null);
  if (hiddenForMcpNow) {
    let blockedReason =
      ownSendWithheld() ??
      (activatedComments.length === 0
        ? "no_send"
        : !areAllCommentsTrusted(activatedComments, thread)
          ? "thread_not_listed"
          : isReplyDeniedByRules(context)
            ? "reply_denied"
            : canAutoreactWithoutPrompts(context)
              ? "nobody_to_ask"
              : undefined);
    if (blockedReason !== undefined) {
      logFeatureSad("artifact_comments_autoreact", `mcp_${blockedReason}`);
      emitArtifactSummonStatus(summonStatus, {
        status: "declined",
        reason: blockedReason === "nobody_to_ask" ? "ask_mode" : "blocked",
      });
      return;
    }
  }
  if (!trustedSummon && !withinHourlyTurnCap(artifactState, now)) {
    logFeatureSad("artifact_comments_autoreact", "hourly_cap");
    emitArtifactSummonStatus(summonStatus, {
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
      notifyTagged(describeAutoReplyHeld(trigger, "cap", url, artifactName));
    }
    return;
  }
  if (!trustedSummon) {
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
      notifyTagged(describeAutoReplyHeld(trigger, "plan", url, artifactName));
    }
    logFeatureOk("artifact_comments_autoreact", {
      plan_mode_notify: true,
    });
    emitArtifactSummonStatus(summonStatus, {
      status: "declined",
      reason: "plan_mode",
    });
    return;
  }
  if (hiddenForMcpNow) {
    artifactState.lastProbeAllowed = true;
    artifactState.lastProbeDeniedBy = null;
    artifactState.lastReplyDeclinedByAutoMode = false;
    emitSummonArm(getLiveState().live, slug);
    summonStatus.suppressed = false;
    emitArtifactSummonStatus(summonStatus, {
      status: "working",
    });
    if (withinAutoWindow) {
      threadState.consecutiveAuto += 1;
      if (threadState.consecutiveAuto >= MAX_MAIN_AGENT_RETRIES) threadState.breakerOpen = true;
    }
    threadState.lastAutoReplyAt = now;
    dropStaleHandOffs(slug);
    markAutoReactNoticePending(slug);
    notifyTagged(
      buildMcpThreadNotice({
        trigger,
        summonCount: summons.length,
        url,
        slug,
        artifactName,
        threadId: thread.id,
        handOff: registerSummonHandOff(summonStatus),
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
  if (replyTool === undefined) {
    if (!artifactState.defaultModeNoticed) {
      artifactState.defaultModeNoticed = true;
      markAutoReactNoticePending(slug);
      notifyTagged(describeAutoReplyHeld(trigger, "reply_tool_absent", url, artifactName));
    }
    logFeatureSad("artifact_comments_autoreact", "reply_tool_absent");
    emitArtifactSummonStatus(summonStatus, {
      status: "declined",
      reason: "blocked",
    });
    return;
  }
  let replyToolEntry = replyTool;
  let fixedFastAck = isFixedFastAckEnabled();
  let [probe, recordedDecl] = await Promise.all([
    probeReplyPermission({
      tool: replyToolEntry,
      context,
      url,
      threadId: thread.id,
      fixedAck: fixedFastAck,
    }),
    readRecordedDecl(slug, context),
  ]);
  if (probe.threw || probe.skipped) {
    logFeatureBad(
      "artifact_comments_autoreact",
      "permission_eval_error",
      probe.threw && probe.rulesOnlyProbe
        ? {
            rules_only: true,
          }
        : undefined,
    );
    emitArtifactSummonStatus(summonStatus, {
      status: "failed",
      reason: "post_failed",
    });
    return;
  }
  let classifierProbe =
    probe.rulesOnlyVerdict &&
    probe.decision.behavior === "allow" &&
    sourcePath === undefined &&
    thread.editCapable !== true &&
    !recordedDecl &&
    true &&
    canUseClassifierArbiter(context) &&
    !preToolUseHookMayCoverArtifact(context, ARTIFACT_COMMENTS_TOOL_NAME)
      ? await probeReplyPermission({
          tool: replyToolEntry,
          context,
          url,
          threadId: thread.id,
          fixedAck: false,
          fullReadUnder: probe.probeId,
        })
      : null;
  let { decision, denied, verdictPremise } =
    classifierProbe !== null &&
    !classifierProbe.threw &&
    !classifierProbe.skipped &&
    classifierProbe.denied?.errorCode === "auto_mode_unavailable" &&
    !(
      classifierProbe.decision.decisionReason?.type === "classifier" &&
      classifierProbe.decision.decisionReason.monitorBlocked === true
    ) &&
    canUseClassifierArbiter(context)
      ? classifierProbe
      : probe;
  let { rulesOnlyVerdict } = probe;
  let askState = {
    ask: null,
  };
  let accountEpoch_2 = getLiveState().accountEpoch;
  let probeDecision =
    denied === null && decision.behavior !== "allow"
      ? autoReactCanUseTool(context.agentId, artifactState, askState)
      : null;
  artifactState.lastProbeAllowed = decision.behavior === "allow" || probeDecision !== null;
  let autoModeUnavailable = denied?.errorCode === "auto_mode_unavailable";
  let monitorBlocked =
    decision.decisionReason?.type === "classifier" && decision.decisionReason.monitorBlocked === true;
  let declinedByAutoMode = autoModeUnavailable && !monitorBlocked;
  artifactState.lastProbeDeniedBy = declinedByAutoMode ? null : (denied?.reason ?? null);
  artifactState.lastReplyDeclinedByAutoMode = declinedByAutoMode;
  emitSummonArm(getLiveState().live, slug);
  let needsPageReply =
    probeDecision === null &&
    !(
      decision.behavior === "allow" &&
      decision.decisionReason?.type === "rule" &&
      isArtifactActionRule(decision.decisionReason.rule)
    );
  let editHandOff = thread.editCapable === true && needsPageReply;
  let sourceHandOff = sourcePath !== undefined && needsPageReply;
  let autoReplyReady = thread.claudeActivated && editHandOff && !thread.resolved;
  if (yieldGuard("probe")) return;
  if (pipelineDeniedEnough && sourcePath !== undefined && !needsPageReply) {
    notePipelineDenied();
    return;
  }
  if (denied !== null) {
    let shouldNotify =
      denied.reason === "denied_by_auto_mode" &&
      sendProven() &&
      !artifactState.autoModeDeclineNoticed &&
      (!autoModeUnavailable || (declinedByAutoMode && canUseClassifierArbiter(context) && isGussetFlagOn()));
    let handOff = shouldNotify && declinedByAutoMode && !recordedDecl;
    if (shouldNotify) {
      artifactState.autoModeDeclineNoticed = true;
      markAutoReactNoticePending(slug);
      let notice = describeAutoReplyHeld(trigger, "auto_mode_declined", url, artifactName);
      if (handOff) summonStatus.suppressed = false;
      notifyTagged(
        handOff
          ? {
              ...notice,
              handOff: registerSummonHandOff(summonStatus),
            }
          : notice,
      );
    }
    logFeatureSad("artifact_comments_autoreact", denied.errorCode, {
      notified: shouldNotify,
      ...(rulesOnlyVerdict && {
        rules_only: true,
      }),
    });
    if (handOff) logFeatureOk("artifact_comments_classifier_unavailable_handoff");
    else if (declinedByAutoMode) {
      let skipReason = shouldNotify
        ? "notified_page_owns_threads"
        : (ownSendWithheld() ??
          (artifactState.autoModeDeclineNoticed
            ? "already_notified"
            : (getAutoModeArbiterIssue(context) ?? "flag_off")));
      logFeatureSad("artifact_comments_classifier_unavailable_handoff", skipReason);
    }
    emitArtifactSummonStatus(
      summonStatus,
      handOff
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
  let noteAskMode = () => {
    if (!artifactState.defaultModeNoticed) {
      artifactState.defaultModeNoticed = true;
      markAutoReactNoticePending(slug);
      let notice = describeAutoReplyHeld(trigger, "notify_only", url, artifactName);
      notifyTagged(
        isOchreBitternEnabled() && !artifactState.heldReplyDeclined
          ? {
              ...notice,
              summary: needsPermissionToReplyNotice(artifactName),
            }
          : notice,
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
    emitArtifactSummonStatus(summonStatus, {
      status: "declined",
      reason: "ask_mode",
    });
  };
  if (decision.behavior !== "allow" && probeDecision === null) {
    noteAskMode();
    return;
  }
  let autoreactSuppressed = alwaysFalseAutoreact(replyToolEntry, context);
  if (
    canPageReplyDirectly({
      pageOwnsThreads: recordedDecl,
      handsOffToTurn: sourceHandOff,
      composesEdit: autoReplyReady,
      slug,
      editRejudgedByAutoMode: autoreactSuppressed,
    })
  ) {
    logFeatureSad("artifact_comments_autoreact", "page_owns_threads", {
      before_working: true,
      ...(rulesOnlyVerdict && {
        rules_only: true,
      }),
    });
    emitArtifactSummonStatus(summonStatus, {
      status: "declined",
      reason: "blocked",
    });
    return;
  }
  summonStatus.suppressed = false;
  emitArtifactSummonStatus(
    summonStatus,
    probeDecision === null
      ? {
          status: "working",
        }
      : {
          status: "needs_user",
          reason: "approval_required",
        },
  );
  if (withinAutoWindow) {
    threadState.consecutiveAuto += 1;
    if (threadState.consecutiveAuto >= MAX_MAIN_AGENT_RETRIES) threadState.breakerOpen = true;
  }
  if (sourceHandOff) {
    threadState.lastAutoReplyAt = now;
    markAutoReactNoticePending(slug);
    let threadAgentOn = isThreadAgentEnabled();
    if (threadAgentOn) {
      if (
        (await handOffThreadToBackgroundAgent({
          slug,
          url,
          artifactName,
          thread,
          trigger,
          summonCount: summons.length,
          sourcePath,
          summon: summonStatus,
        })) ||
        stoppedGuard("fork")
      )
        return;
      markAutoReactNoticePending(slug);
    }
    notifyTagged(
      buildSourcePublishedNotice({
        trigger,
        summonCount: summons.length,
        url,
        artifactName,
        threadId: thread.id,
        sourcePath,
        handOff: registerSummonHandOff(summonStatus),
        resolved: thread.resolved,
        agentsMayHoldThreads: threadAgentOn || hasThreadAgentForSlug(slug),
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
  let ackCommentId;
  let ackPosted = false;
  if (
    summons.length > 0 &&
    thread.claudeActivated &&
    editHandOff &&
    !isProbedLivePage(slug) &&
    !autoreactSuppressed &&
    !recordedDecl &&
    !thread.resolved &&
    isFastAckEnabled()
  ) {
    let fastAckInput = {
      trigger,
      thread,
      context,
      slug,
      summons,
      scanGen: input.scanGen,
    };
    let text = fixedFastAck
      ? await selectFastAckText(fastAckInput, editHandOff)
      : await composeArtifactCommentFastAck(fastAckInput);
    if (yieldGuard("fast_ack_compose")) return;
    let ackPost = null;
    let ackThrew = false;
    let fixedProbeState = {
      rode: false,
    };
    try {
      ackPost = await postThreadReply({
        tool: replyToolEntry,
        context,
        url,
        slug,
        threadId: thread.id,
        text,
        declareAnswersSummon: answersSummon,
        continuesReplyId,
        composedFromOwnWordsOnly,
        threadTranscript: emptyTranscript(),
        ...(verdictPremise !== null && {
          canUseTool: makeFixedAckPermissionProbe(
            verdictPremise,
            {
              tool: replyToolEntry,
              url,
              threadId: thread.id,
              text,
            },
            fixedProbeState,
          ),
        }),
      });
    } catch {
      ackThrew = true;
    }
    let ackTelemetry = {
      fast_ack: true,
      ...(fixedFastAck && {
        fast_ack_fixed: true,
      }),
      ...(fixedProbeState.rode && {
        fast_ack_on_probe_verdict: true,
      }),
      ...(rulesOnlyVerdict && {
        rules_only: true,
      }),
    };
    if (ackPost?.kind === "posted") {
      answersSummon = false;
      ackPosted = true;
      ackCommentId = ackPost.commentId;
      continuesReplyId =
        ackPost.epoch === getLiveState().accountEpoch ||
        (ackPost.commentId !== undefined && isOwnPostedReply(ackPost.commentId))
          ? (ackPost.commentId ?? id)
          : undefined;
      recordOwnReply(threadState, ackPost);
      if (ackPost.commentId !== undefined) summonStatus.coversReplyId = ackPost.commentId;
      threadState.lastAutoReplyAt = Date.now();
      if (!canAutoReply()) bumpUnattendedReply(slug);
      let stoppedAfterAck =
        !isAutoReactEnabled() || isSlugStoppedAnywhere(slug) || scanStamp(slug) !== input.scanGen;
      logFeatureOk("artifact_comments_autoreact", {
        ...ackTelemetry,
        ...(stoppedAfterAck && {
          post_stop_notice_suppressed: true,
        }),
      });
      if (stoppedAfterAck) return;
      let planMode = getToolPermissionContext(context).mode === "plan";
      markAutoReactNoticePending(slug);
      notifyTagged({
        coalesce: {
          family: "auto-replied",
          artifactName,
          threadId: thread.id,
        },
        detail: planMode
          ? `Acknowledgement reply posted to thread ${thread.id} on artifact ${url}; automatic replies are paused (plan mode), so the full reply comes from this session when it next acts. When posting it, set acknowledge_duplicate: true \u2014 the acknowledgement already stands as the thread's reply, so the duplicate guard refuses a plain follow-up.`
          : `Acknowledgement reply posted to thread ${thread.id} on artifact ${url}; the substantive auto-reply is still being composed and is reported separately.`,
      });
      if (planMode) return;
      if (summonStatus.coversReplyId !== undefined)
        emitArtifactSummonStatus(summonStatus, {
          status: "working",
        });
    } else if (ackPost?.kind === "unexpected_result_shape") {
      threadState.consecutivePipelineDenials += 1;
      logFeatureBad("artifact_comments_autoreact", "unexpected_result_shape", ackTelemetry);
      emitArtifactSummonStatus(summonStatus, {
        status: "declined",
        reason: "blocked",
      });
      return;
    } else if (ackThrew) {
      threadState.consecutivePipelineDenials += 1;
      logFeatureBad("artifact_comments_autoreact", "fast_ack_post_threw", ackTelemetry);
      emitArtifactSummonStatus(summonStatus, {
        status: "declined",
        reason: "blocked",
      });
      return;
    } else if (ackPost?.kind === "refused" || ackPost?.kind === "no_result") {
      if (ackPost.kind === "no_result" || ackPost.denial) threadState.consecutivePipelineDenials += 1;
      logFeatureSad("artifact_comments_autoreact", "fast_ack_post_failed", ackTelemetry);
    }
    if (ackPost?.kind !== "posted" && yieldGuard("fast_ack")) return;
    if (
      ackPost?.kind === "answered_elsewhere" ||
      ackPost?.kind === "answered_post_time" ||
      ackPost?.kind === "summon_foreign"
    ) {
      logFeatureSad("artifact_comments_autoreact", toStandDownReason(ackPost.kind), ackTelemetry);
      return;
    }
    if (ackPost?.kind === "not_activated") {
      if (ackPost.pageOwnsThreads) {
        logFeatureSad("artifact_comments_autoreact", "page_owns_threads", ackTelemetry);
        emitArtifactSummonStatus(summonStatus, {
          status: "declined",
          reason: "blocked",
        });
        return;
      }
      logFeatureSad("artifact_comments_autoreact", "deactivated_mid_turn", ackTelemetry);
      return;
    }
  }
  let replyText;
  if (autoReplyReady) {
    let anchorSnippetMemo = {
      resolved: false,
    };
    let eligibility = await checkAutoEditEligibility(slug, context, autoreactSuppressed);
    if (eligibility.read !== undefined) pagesRead.push(eligibility.read.html);
    if (yieldGuard("editability")) return;
    let pageForeign = eligibility.read !== undefined ? readMarkedForeign(eligibility.read) : undefined;
    let composition = "unavailable";
    if (eligibility.editable) {
      let analystBrief = null;
      if (isResponderDispatchEnabled() && triggerComment !== undefined) {
        let triage = await triageArtifactComment({
          slug,
          thread,
          context,
          foreign: hasCommentsFromOthers(thread, account),
        });
        if (yieldGuard("analysis")) return;
        if (triage === "act") {
          analystBrief = await runCommentThreadAnalyst({
            context,
            url,
            slug,
            thread,
            triggerComment,
          });
          analystSpoke = analystBrief !== null;
          if (yieldGuard("analysis")) return;
        }
      }
      composition = await composeAutoEditWithTimeout(
        {
          trigger,
          thread,
          context,
          slug,
          summons,
          pagesRead,
          anchorSnippetMemo,
          scanGen: input.scanGen,
          pageForeign,
          ...(analystBrief !== null && {
            analystBrief,
          }),
        },
        eligibility,
      );
      if (yieldGuard("edit_compose")) return;
    }
    if (composition === null) {
      emitArtifactSummonStatus(summonStatus, {
        status: "failed",
        reason: "compose_failed",
      });
      return;
    }
    if (composition === "unavailable")
      replyText = await composeThreadReply({
        trigger,
        thread,
        context,
        slug,
        summons,
        pagesRead,
        anchorSnippetMemo,
        ...(eligibility.read !== undefined && {
          sourceRead: eligibility.read,
        }),
        ...(pageForeign !== undefined && {
          pageForeign,
        }),
      });
    else if (composition.kind === "usage_limited") {
      emitArtifactSummonStatus(summonStatus, {
        status: "declined",
        reason: "usage_limited",
      });
      return;
    } else if (composition.kind === "patch_failed" || composition.kind === "timed_out") {
      let reason = composition.kind === "timed_out" ? "timed_out" : composition.reason;
      let failureText = AUTO_EDIT_FAILURE_FOR_MODEL[reason];
      let post;
      try {
        post = await postThreadReply({
          tool: replyToolEntry,
          context,
          url,
          slug,
          threadId: thread.id,
          text: AUTO_EDIT_FAILURE_REPLIES[reason],
          declareAnswersSummon: answersSummon,
          continuesReplyId,
          composedFromOwnWordsOnly,
          threadTranscript: emptyTranscript(),
          recheck: getOwnReplyInfo(threadState, scanRowIds),
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
        emitArtifactSummonStatus(summonStatus, {
          status: "failed",
          reason: "post_failed",
        });
        return;
      }
      applyPostOutcome({
        post,
        threadState,
        artifactState,
        slug,
        scanGen: input.scanGen,
        notify: notifyTagged,
        summon: summonStatus,
        trigger,
        url,
        artifactName,
        ackPosted,
        ackCommentId,
        rulesOnlyProbe: rulesOnlyVerdict,
        ownSendWithheld: ownSendWithheld(),
        pageOwnsThreads: recordedDecl,
        notice: {
          summary: autoRepliedNotice(artifactName),
          detail:
            `Auto-reply posted to thread ${thread.id} on artifact ${url}: ${failureText}` +
            buildAutoPostedReplyNote([ackCommentId, post.kind === "posted" ? post.commentId : undefined]),
        },
        replyWithheldNotice: {
          summary: autoEditNeedsReviewNotice(artifactName),
          detail:
            `Auto-reply to thread ${thread.id} on artifact ${url} was withheld: ${getStandDownReasons(post)}. ` +
            upperFirstAlias(failureText) +
            noConfirmOnlyReplyNote(post),
        },
        allowSiblingReset: false,
      });
      return;
    } else if (composition.kind === "edit") {
      if (triggerComment === undefined) {
        logFeatureSad("artifact_comments_autoreact", "edit_no_trigger");
        emitArtifactSummonStatus(summonStatus, {
          status: "failed",
          reason: "compose_failed",
        });
        return;
      }
      let editResult = await applyAutoEdit({
        tool: input.tool,
        context,
        url,
        slug,
        threadId: thread.id,
        recheck: getOwnReplyInfo(threadState, scanRowIds),
        declareAnswersSummon: answersSummon,
        continuesReplyId,
        triggerCommentId: triggerComment.id,
        content: composition.content,
        reply: composition.reply,
        composeTelemetry: composition.telemetry,
        favicon: composition.favicon,
        storedTitle: composition.storedTitle,
        sourceVer: composition.sourceVer,
        roundTripSignal: composition.roundTripSignal,
        threadTranscript: emptyTranscript,
        composedFromOwnWordsOnly,
        composeReplyOnly: () =>
          composeThreadReply({
            trigger,
            thread,
            context,
            slug,
            summons,
            pagesRead,
            anchorSnippetMemo,
            sourceRead: eligibility.read,
            ...(pageForeign !== undefined && {
              pageForeign,
            }),
          }),
        paused: yieldGuard,
      });
      if (editResult.outcome === "stood_down") return;
      let noteForeignEdit = (why) => {
        if (isAutoReactEnabled() && !isSlugStoppedAnywhere(slug) && scanStamp(slug) === input.scanGen) {
          let beyondAck = ackPosted ? ` beyond the acknowledgement${formatCommentIds([ackCommentId])}` : "";
          markAutoReactNoticePending(slug);
          notifyTagged({
            summary: autoEditNeedsReviewNotice(artifactName),
            detail: `A requested automatic edit on artifact ${url} (thread ${thread.id}) was refused because the thread's edit grant belongs to another user, so the artifact was NOT changed, and ${why}${beyondAck}. Read the thread and make the change yourself if appropriate.`,
          });
        } else logFeatureSad("artifact_comments_autoreact", "summon_foreign_notice_suppressed");
      };
      if (editResult.outcome === "compose_failed") {
        emitArtifactSummonStatus(
          summonStatus,
          editResult.miss === "usage_limited"
            ? {
                status: "declined",
                reason: "usage_limited",
              }
            : {
                status: "failed",
                reason: "compose_failed",
              },
        );
        noteForeignEdit("no reply could be composed");
        return;
      }
      if (
        editResult.failKind === "summon_foreign" &&
        editResult.outcome === "publish_error" &&
        editResult.post?.kind !== "answered_elsewhere" &&
        editResult.post?.kind !== "answered_post_time" &&
        editResult.post?.kind !== "summon_foreign"
      )
        noteForeignEdit("its reply was not posted");
      if (editResult.post !== null) {
        let editLanded =
          editResult.outcome === "completed" ||
          editResult.outcome === "completed_unresolved" ||
          editResult.outcome === "reply_failed";
        let standDownReasons = getStandDownReasons(editResult.post);
        let commentIds = [
          ackCommentId,
          editResult.post.kind === "posted" ? editResult.post.commentId : undefined,
        ];
        let idsText = formatCommentIds(commentIds);
        applyPostOutcome({
          post: editResult.post,
          threadState,
          artifactState,
          slug,
          scanGen: input.scanGen,
          notify: notifyTagged,
          summon: summonStatus,
          trigger,
          url,
          artifactName,
          ackPosted,
          ackCommentId,
          editLanded,
          rulesOnlyProbe: rulesOnlyVerdict,
          ownSendWithheld: ownSendWithheld(),
          pageOwnsThreads: recordedDecl,
          notice: editLanded
            ? editResult.outcome === "completed"
              ? {
                  coalesce: {
                    family: "auto-edited",
                    artifactName,
                    threadId: thread.id,
                  },
                  detail:
                    `Auto-edited artifact ${url} in response to thread ${thread.id} and posted a summary reply${idsText}. ` +
                    "Review the change \u2014 if it missed the mark, edit the artifact yourself and republish.",
                }
              : {
                  summary: autoEditedNotice(artifactName),
                  detail:
                    `Auto-edited artifact ${url} in response to thread ${thread.id} and posted a summary reply${idsText}. ` +
                    "Review the change \u2014 if it missed the mark, edit the artifact yourself and republish." +
                    ` The thread may not be resolved \u2014 check it (${pickByToolset('action "comments"', () => commentsToolAction("comments"))}); if the change is right and the thread is still open, resolve it (${pickByToolset('Artifact tool, action "resolve"', () => commentsToolAction("resolve"))}). Do NOT post another reply \u2014 the summary reply is already in the thread.`,
                }
            : editResult.failKind === "summon_foreign"
              ? {
                  coalesce: {
                    family: "auto-replied",
                    artifactName,
                    threadId: thread.id,
                  },
                  detail:
                    `Auto-replied to thread ${thread.id} on artifact ${url} \u2014 an acknowledgement only: the thread's edit grant belongs to another user, so the artifact was NOT changed. ` +
                    "If the thread asks for a change to the artifact, read the thread and make the change yourself if appropriate." +
                    buildAutoPostedReplyNote(commentIds),
                }
              : {
                  summary:
                    editResult.failKind === "unexpected_result_shape" ||
                    editResult.failKind === "outcome_unknown" ||
                    editResult.failKind === "attribution_unverified"
                      ? autoEditNeedsReviewNotice(artifactName)
                      : autoRepliedNotice(artifactName),
                  detail:
                    editResult.failKind === "unexpected_result_shape"
                      ? `Auto-reply posted to thread ${thread.id} on artifact ${url}: an automatic edit attempt did not return a recognizable publish result, so it is UNKNOWN whether the artifact was changed. Review the artifact and the thread.`
                      : editResult.failKind === "outcome_unknown"
                        ? `Auto-reply posted to thread ${thread.id} on artifact ${url}: an automatic edit attempt could not confirm whether its publish landed, so it is UNKNOWN whether the artifact was changed. Review the artifact and the thread.`
                        : editResult.failKind === "attribution_unverified"
                          ? `Auto-reply posted to thread ${thread.id} on artifact ${url}: an automatic edit PUBLISHED but its attribution to the thread's edit grant could not be verified. Review the change.`
                          : `Auto-reply posted to thread ${thread.id} on artifact ${url}: a requested automatic edit was refused, so the artifact was NOT changed. Read the thread and make the change yourself if appropriate.` +
                            buildAutoPostedReplyNote(commentIds),
                },
          replyWithheldNotice:
            editResult.failKind === "attribution_unverified"
              ? {
                  summary: autoEditNeedsReviewNotice(artifactName),
                  detail: `Auto-edit on artifact ${url} PUBLISHED in response to thread ${thread.id}, but its attribution to the thread's edit grant could not be verified, and the follow-up note was withheld: ${standDownReasons}. Review the change.`,
                }
              : editResult.failKind === "unexpected_result_shape" || editResult.failKind === "outcome_unknown"
                ? {
                    summary: autoEditNeedsReviewNotice(artifactName),
                    detail:
                      editResult.failKind === "unexpected_result_shape"
                        ? `An automatic edit attempt on artifact ${url} (thread ${thread.id}) did not return a recognizable publish result, so it is UNKNOWN whether the artifact was changed; the follow-up note was withheld because ${standDownReasons}. Review the artifact and the thread.`
                        : `An automatic edit attempt on artifact ${url} (thread ${thread.id}) could not confirm whether its publish landed, so it is UNKNOWN whether the artifact was changed; the follow-up note was withheld because ${standDownReasons}. Review the artifact and the thread.`,
                  }
                : editLanded
                  ? undefined
                  : {
                      summary: autoEditNeedsReviewNotice(artifactName),
                      detail:
                        `A requested automatic edit on artifact ${url} (thread ${thread.id}) was refused, so the artifact was NOT changed, and the explanatory reply was withheld: ${standDownReasons}. Read the thread and make the change yourself if appropriate.` +
                        noConfirmOnlyReplyNote(editResult.post),
                    },
          allowSiblingReset: editLanded,
        });
      } else
        emitArtifactSummonStatus(summonStatus, {
          status: "failed",
          reason: "post_failed",
        });
      if (
        (editResult.outcome === "publish_refused" || editResult.outcome === "publish_error") &&
        (editResult.publishDenied === true ||
          editResult.failKind === "pin_paused" ||
          editResult.failKind === "disabled" ||
          editResult.failKind === "unexpected_result_shape" ||
          editResult.failKind === "no_result")
      )
        threadState.consecutivePipelineDenials += 1;
      if (editResult.outcome === "reply_failed") {
        let ackIds = formatCommentIds([ackCommentId]);
        let kind = editResult.post?.kind;
        let autoModeDeclined = editResult.post?.kind === "refused" && editResult.post.autoModeDeclined;
        if (isAutoReactEnabled() && !isSlugStoppedAnywhere(slug) && scanStamp(slug) === input.scanGen) {
          markAutoReactNoticePending(slug);
          notifyTagged({
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
                  : kind === "not_activated" && editResult.post?.pageOwnsThreads
                    ? `Auto-edited artifact ${url} in response to thread ${thread.id}, but the summary reply was withheld: ${PAGE_OWNS_THREADS_REASON}. ` +
                      "The artifact WAS changed \u2014 review the change; an answer belongs in the page's own thread."
                    : `Auto-edited artifact ${url} in response to thread ${thread.id}, but the summary reply ${autoModeDeclined ? "was not posted (auto mode did not approve it)" : "FAILED to post"} \u2014 ` +
                      (ackPosted
                        ? `the artifact WAS changed, and the only reply standing is this session's acknowledgement${ackIds}. Review the change, then post the promised summary reply with acknowledge_duplicate: true \u2014 the duplicate guard refuses a plain follow-up \u2014 or revert.` +
                          RESOLVE_AFTER_REPLY_NOTE()
                        : "the artifact WAS changed with no reply in the thread. Review the change and reply or revert." +
                          replyThenResolveNote()),
          });
        } else logFeatureSad("artifact_comments_autoreact", "edit_landed_notice_suppressed");
      }
      return;
    } else replyText = composition.text;
  } else
    replyText = await composeThreadReply({
      trigger,
      thread,
      context,
      slug,
      summons,
      pagesRead,
    });
  if (typeof replyText !== "string") {
    emitArtifactSummonStatus(
      summonStatus,
      replyText.miss === "usage_limited"
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
  if (containsBlockedChars(replyText)) {
    logFeatureSad("artifact_comments_autoreact", "compose_hidden_codepoints");
    emitArtifactSummonStatus(summonStatus, {
      status: "failed",
      reason: "compose_failed",
    });
    return;
  }
  let text = replyText;
  let postReply = async () => {
    if (probeDecision !== null && getLiveState().accountEpoch !== accountEpoch_2) {
      logFeatureSad("artifact_comments_autoreact", "held_reply_account_changed");
      return;
    }
    if (isBuiltInArtifactHiddenForMcp()) {
      emitArtifactSummonStatus(summonStatus, {
        status: "declined",
        reason: "auto_reply_off",
      });
      return;
    }
    if (probeDecision !== null && yieldGuard("held_reply_compose")) return;
    let heldChannel =
      probeDecision === null ? null : autoReactCanUseTool(context.agentId, artifactState, askState);
    if (probeDecision !== null && heldChannel === null) {
      logFeatureSad("artifact_comments_autoreact", "held_reply_channel_gone");
      noteAskMode();
      return;
    }
    let post;
    try {
      post = await postThreadReply({
        tool: replyToolEntry,
        context:
          probeDecision === null
            ? context
            : {
                ...context,
                abortController: createChildAbortController(context.abortController),
              },
        url,
        slug,
        threadId: thread.id,
        text,
        declareAnswersSummon: answersSummon,
        continuesReplyId,
        composedFromOwnWordsOnly,
        threadTranscript: emptyTranscript(),
        recheck:
          probeDecision === null
            ? getOwnReplyInfo(threadState, scanRowIds)
            : {
                ownReplyIds: new Set(),
                scanRowIds,
              },
        ...(heldChannel !== null && {
          canUseTool: heldChannel,
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
      emitArtifactSummonStatus(summonStatus, {
        status: "failed",
        reason: "post_failed",
      });
      return;
    }
    if (askState.ask === "unanswered" && post.kind !== "account_changed") {
      if (yieldGuard("held_reply_ask")) return;
      logFeatureSad("artifact_comments_autoreact", "held_reply_channel_gone");
      noteAskMode();
      return;
    }
    applyPostOutcome({
      post,
      threadState,
      artifactState,
      slug,
      scanGen: input.scanGen,
      notify: notifyTagged,
      summon: summonStatus,
      trigger,
      url,
      artifactName,
      ackPosted,
      ackCommentId,
      rulesOnlyProbe: rulesOnlyVerdict,
      ownSendWithheld: ownSendWithheld(),
      pageOwnsThreads: recordedDecl,
      heldForPerson: askState.ask === "answered",
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
            : buildAutoPostedReplyNote([ackCommentId, post.kind === "posted" ? post.commentId : undefined])),
      },
      ...(ackPosted && {
        replyWithheldNotice: {
          summary: autoEditNeedsReviewNotice(artifactName),
          detail:
            `The promised follow-up reply to thread ${thread.id} on artifact ${url} was withheld: ${getStandDownReasons(post)}. The acknowledgement${formatCommentIds([ackCommentId])} stands as this session's reply \u2014 review the thread; if it asks for an artifact change, make the change yourself if appropriate.` +
            noConfirmOnlyReplyNote(post),
        },
      }),
      allowSiblingReset: true,
    });
    if (probeDecision !== null) flushAutoreactLedger();
  };
  if (probeDecision === null) {
    await postReply();
    return;
  }
  let chain = (artifactState.heldReplyChain ?? Promise.resolve())
    .then(postReply)
    .catch(() => {
      logFeatureBad("artifact_comments_autoreact", "held_reply_error");
    })
    .finally(() => {
      if (artifactState.heldReplyChain === chain) artifactState.heldReplyChain = null;
    });
  artifactState.heldReplyChain = chain;
}
export {
  getLocalSourcePath,
  processArtifactThread,
  collectPendingSummons,
  localSourcePathIfEditCapable,
  checkReplyPermission,
};
