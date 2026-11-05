/**
 * tools/ArtifactTool/actions/watch.ts
 *
 * 2.1.316 新增：watch 动作
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xzmy9dn4.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  frameLiveArmRows,
  frameLiveWatchRows,
  knownNonEditor,
  isFrameLiveRowConnecting,
  frameLiveStoppedRows,
  unwatchFrameLive,
  pullStaleWatchLifecycleNotices,
  watchFrameLive,
  makeArtifactReadVersionReader,
} from "../../../services/artifacts/frameLive.js";
import {
  listDurableArmStates,
  hasHumanMessageContaining,
} from "../../../services/artifacts/artifactPresence.js";
import { claudeAiEnvironment } from "../../../constants/claudeAiOrigin.js";
import { artifactViewerUrlFor, classifierArtifactTargetFor, splitWatchRows } from "../artifactUrls.js";
import {
  sessionWatchRail,
  artifactCommentsPromptGateOpen,
  artifactLivePathsSchemaOpen,
} from "../../../services/artifacts/artifactToolSchema.js";
import { isAutoReactEnabled } from "../../../services/artifacts/comments/postReply.js";
import {
  AUTO_REPLIES_ARMED_TOKEN,
  AUTO_REPLIES_PAUSED_ROW,
  AUTO_REPLIES_YIELDED_ROW,
  AUTO_REPLIES_DECLINED_ROW,
  AUTO_REPLIES_DENIED_ROW,
  frameLiveSkipReasonPhrase,
  noRewatchAdvice,
  armedViaWording,
  labelledArmedVia,
  parseArmedVia,
} from "../../../services/artifacts/frameLiveWording.js";
import {
  clipUnknown,
  canonicalTargetOrPlaceholder,
  formatEpochMsIso,
  labelSuffix,
  shortLabelOrUndefined,
  numberText,
  throwUnroutedArtifactAction,
  clipLabel,
  describeLiveSubscriptionState,
  capResultRows,
  formatRowsOmittedNote,
  describeArtifactPerson,
} from "../../../services/artifacts/artifactPeople.js";
import { plural } from "../../../utils/stringUtils.js";
import {
  unexpectedWatchFailure,
  describeWatchError,
  describeWatchHttpStatus,
  durableRowFor,
  durableRowList,
  unwatchArtifactDurably,
  watchArtifactDurably,
} from "../../../services/artifacts/durableWatch.js";
import {
  censusEntry,
  censusGeneration,
  updateUnreadCounts,
  MAX_FOLDED_COUNT,
} from "../../../services/artifacts/comments/threadPrompts.js";
import { APPROVED_PATH_CHECK_MS } from "../permissions/approvedPaths.js";
import { readArtifactComments } from "../../../services/artifacts/comments/commentsRead.js";
import {
  isFrameLiveTokenLeaseEnabled,
  isFrameLiveSubscribeEnabled,
} from "../../../services/artifacts/frameFlags.js";
import { withDeadline } from "../../../utils/sleep.js";
import { REFUSED_CAPACITY_HINT, getLiveState } from "../../../services/liveReplica/liveReplica.js";
import { env } from "../../../utils/env.js";
import {
  canRearmWatchHere,
  repliesConsentWriterFor,
  CONSENT_ASK_TAG,
  WATCH_ARMS_REPLIES_TAG,
  consentPin,
  firstWatchAskReachesHuman,
  consentTargetChanged,
  consentAskReachedUser,
  repliesAskAnsweredByHuman,
  consentPinMatches,
  stampArtifactWatchConsent,
  derivePublishContext,
} from "../permissions/consentStamps.js";
import { parseArtifactUrl, ArtifactInputError } from "../constants.js";
import {
  runCommentMonitorWithIntent,
  isAutoReactWired,
  forgetSlugIntent,
  stopCommentMonitorIntent,
  forgetCommentMonitorIntents,
} from "../../../services/artifacts/commentMonitor.js";
import {
  isSlugStopped,
  isYieldResumable,
  isSlugSwept,
  stopGeneration,
  isSlugYielded,
} from "../../../services/artifacts/summonArms.js";
import {
  isUserDrivenTurn,
  isStrictHumanTurn,
  isUserDrivenHere,
  isHumanTurn,
} from "../../../utils/turnOrigin.js";
import {
  UNVERIFIED_USER_TURN_CLAUSE,
  RESUME_REASON_GRANT_YIELDED,
  RESUME_REASON_GRANT_SWEPT,
  RESUME_REASON_GRANT,
  RESUME_ASK_MESSAGE,
  RESUME_ASK_MESSAGE_YIELDED,
  RESUME_ASK_MESSAGE_SWEPT,
  RESUME_REASON_LEDE,
  RESUME_REASON_DENY,
  watchResumeAskBody,
  WATCH_ARM_REPLIES_ASK,
  watchAskBody,
  rewatchReason,
  watchArmsRepliesReason,
  watchReason,
  WATCH_PROJECTION_REPLIES_STOPPED,
  WATCH_PROJECTION_REPLIES_DECLINED,
  WATCH_PROJECTION_REPLIES_PAUSED,
  WATCH_PROJECTION_COMMENTS,
} from "../promptText.js";
import {
  planConsentMustDeny,
  getToolPermissionContext,
  consentMustDeny,
  consentAskCanReachUser,
} from "../../../utils/permissions/toolPermissionContext.js";
import { warmShareEntry } from "../../../services/artifacts/shareEntryWarm.js";
import {
  denyOtherOrgArtifact,
  validateArtifactPathInput,
  parseArtifactUrlOrThrow,
} from "../permissions/artifactPermissionRules.js";
import {
  consentEpochGuard,
  hasClassConsent,
  classifyArtifactConsent,
} from "../../../services/artifacts/consentClasses.js";
import {
  settleRepliesConsent,
  noteRepliesConsentAsk,
  repliesConsentDeclined,
  approveTakenRepliesConsent,
  resumeFrameLiveAutoReplies,
} from "../../../services/artifacts/frameLiveReplies.js";
import {
  writeKeepsFlagOffAsk,
  classFactsFor,
  decideByClass,
  classAskStands,
} from "../artifactAccessClasses.js";
import { artifactCardTitleFor } from "../permissions/ownershipConsent.js";
import {
  shareClassifierMarks,
  getShareEntry,
  shareAudienceMark,
} from "../../../services/artifacts/shareEntries.js";
import { isArtifactsAvailable } from "../../../services/artifacts/artifactAvailability.js";
import { isArtifactCommentsEnabled } from "../../../services/artifacts/comments/commentsGate.js";
import { isDelegatedObservationContext } from "../../../utils/agentContext.js";
import { logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { SAFE_ARTIFACT_PATH_RE } from "../../../services/artifacts/artifactToolGates.js";
import {
  ARTIFACT_OTHER_ORG_CAUSE,
  ARTIFACT_OTHER_ORG_REMEDY,
  PUBLIC_OUTSIDE_ORG_WATCH_CAUSE,
} from "../../../services/artifacts/orgScope.js";

//@ chunk-xzmy9dn4.js:254310-254338 placement
/**
 * 惰性注入的监视预备状态引用（当前为 null）。
 */
var watchLiveArmsRef = null;
var watchDurableArmsRef = null;
var watchStatusRef = null;
//@ chunk-xzmy9dn4.js:254338-255119 placement
/**
 * status 中的监视状态：列出 Frame live 预备行（arming/backing_off/failed/ended 及重试信息）与 durable wake 行。
 */
function watchArmsStatus(appState, sessionId) {
  let liveArms = frameLiveArmRows(appState, sessionId);
  let durableArms = listDurableArmStates(sessionId);
  if (liveArms.length === 0 && durableArms.length === 0) return {};
  let environment = claudeAiEnvironment();
  let now = Date.now();
  return {
    arms: [
      ...liveArms.map((liveArm) => ({
        url: artifactViewerUrlFor({
          slug: liveArm.slug,
          env: environment,
        }),
        state: liveArm.state,
        ...(liveArm.state === "arming" && {
          reconnect: liveArm.reconnect,
          failures: liveArm.failures,
        }),
        ...(liveArm.state === "backing_off" && {
          failures: liveArm.failures,
          max_failures: liveArm.maxFailures,
          next_in_s: Math.max(0, Math.round((liveArm.nextAt - now) / 1000)),
        }),
        ...((liveArm.state === "arming" || liveArm.state === "backing_off") &&
          liveArm.lastFailure !== undefined && {
            last_failure: liveArm.lastFailure,
          }),
        ...((liveArm.state === "failed" || liveArm.state === "ended") && {
          reason: liveArm.reason,
          at: liveArm.at,
        }),
      })),
      ...durableArms.map((durableArm) => ({
        url: artifactViewerUrlFor({
          slug: durableArm.slug,
          env: environment,
        }),
        rail: "durable_wake",
        state: durableArm.state,
        ...(durableArm.state === "failed" && {
          reason: durableArm.reason,
          ...(durableArm.detail !== undefined && {
            detail: durableArm.detail,
          }),
          ...(durableArm.serverMessage !== undefined && {
            server_message: durableArm.serverMessage,
          }),
          at: durableArm.at,
        }),
      })),
    ],
  };
}
//@ chunk-xzmy9dn4.js:255119-255167 placement
/**
 * 当前是否可能通过监视收到评论（live 通道、评论开关与自动反应都开）。
 */
function isLiveCommentsWatchPossible() {
  return sessionWatchRail() === "live" && artifactCommentsPromptGateOpen() && isAutoReactEnabled();
}
//@ chunk-xzmy9dn4.js:255167-258521 placement
function describeWatchCommentsReach(autoReplies, connecting, notArmedReason) {
  if (!artifactCommentsPromptGateOpen()) return "";
  if (notArmedReason === "declined" && autoReplies !== "armed")
    return ' Comments on it do NOT reach this session through this watch (auto-replies for this artifact were not approved earlier in the session \u2014 declined or left unanswered \u2014 so it is watched without them); if the user wants them they can say so with the link, and the next watch asks again. Read them with action "comments" when the user asks.';
  if (notArmedReason === "cannot_edit" && autoReplies !== "armed")
    return ' Comments on it do NOT reach this session through this watch (auto-replies arm only on an artifact the user can edit, and this account could not edit it when the watch last connected \u2014 if the user has since been given edit access, unwatch and watch it again to re-check); read them with action "comments" when the user asks.';
  if (notArmedReason === "unattended_turn" && autoReplies !== "armed")
    return ' Comments on it do NOT reach this session through this watch (auto-replies arm only when the user asks for the watch in their own message, and no message from the user started this turn); read them with action "comments" when the user asks.';
  if (notArmedReason === "not_named_by_user" && autoReplies !== "armed")
    return ' Comments on it do NOT reach this session through this watch (auto-replies arm only for an artifact whose link the user gave in their own message, and this link came from elsewhere); if the user wants its comments answered, they can say so with the link. Read them with action "comments" when the user asks.';
  switch (autoReplies) {
    case "armed":
      return ` A comment on it sent to Claude reaches this session (its status row says ${AUTO_REPLIES_ARMED_TOKEN}); plain comments never notify \u2014 read them with action "comments" when asked.`;
    case undefined:
      return connecting
        ? ` It is still connecting, so whether a comment sent to Claude reaches this session through it is not settled \u2014 its \`status\` row will say (${AUTO_REPLIES_ARMED_TOKEN}, or not); plain comments never notify.`
        : ` Whether a comment sent to Claude reaches this session through it shows on its \`status\` row (${AUTO_REPLIES_ARMED_TOKEN}, or not); plain comments never notify.`;
    case "none":
      return isAutoReactEnabled()
        ? ' Comments on it do NOT reach this session through this watch (auto-replies are not armed on it); read them with action "comments" when the user asks.'
        : ' Comments on it do NOT reach this session through this watch (comment auto-replies are not on for this session); read them with action "comments" when the user asks.';
    case "stopped":
      return ' Comments on it do NOT reach this session through this watch (auto-replies are stopped \u2014 resume_replies re-enables them when the user asks); read them with action "comments" when the user asks.';
    case "paused":
      return ` Comments on it do NOT reach this session through this watch right now (${AUTO_REPLIES_PAUSED_ROW}); read them with action "comments" when the user asks.`;
    case "yielded":
      return ` Comments on it do NOT reach this session through this watch right now (${AUTO_REPLIES_YIELDED_ROW}); read them with action "comments" when the user asks.`;
    case "declined":
      return ` Comments on it sent to Claude are not answered automatically through this watch right now (${AUTO_REPLIES_DECLINED_ROW}); read them with action "comments" when the user asks.`;
    case "denied":
      return ` Comments on it do NOT reach this session through this watch right now (${AUTO_REPLIES_DENIED_ROW}); read them with action "comments" when the user asks.`;
    default:
      return ` Comments on it do NOT reach this session through this watch (auto-replies are ${clipUnknown(autoReplies)}); read them with action "comments" when the user asks.`;
  }
}
//@ chunk-xzmy9dn4.js:258521-261132 placement
function describeUnwatchedState(rows, moreWatches, singleArtifact) {
  let headline = isLiveCommentsWatchPossible()
    ? "This session does not keep track of new versions of this artifact or hear comments on it"
    : "This session does not keep track of new versions of this artifact";
  let mapped = rows.map((row) => {
    let target = canonicalTargetOrPlaceholder(row.url);
    let reason = typeof row.reason === "string" ? row.reason : undefined;
    let failures = typeof row.failures === "number" && Number.isFinite(row.failures) ? row.failures : 0;
    let failuresNote =
      failures > 0 || row.last_failure !== undefined
        ? ` (${failures} consecutive failed ${plural(failures, "attempt")} so far${row.last_failure !== undefined ? `; last close or error: ${clipUnknown(row.last_failure)}` : ""})`
        : "";
    let reasonText = () => {
      let phrase = frameLiveSkipReasonPhrase(reason ?? "unknown");
      return phrase !== null ? `${phrase}.` : `reason: ${clipUnknown(row.reason)}.`;
    };
    if (row.rail !== undefined) {
      let hint = unexpectedWatchFailure(reason ?? "unknown");
      switch (row.state) {
        case "arming":
          return `- ${target} \u2014 not a wake subscription yet: its registration is in flight right now. Check status again in a few seconds before relying on it.`;
        case "failed":
          return `- ${target} \u2014 NOT subscribed: the durable wake subscription failed to register at ${formatEpochMsIso(row.at)} (${clipUnknown(row.reason)}${labelSuffix(row.detail)}) \u2014 ${describeWatchError(reason ?? "unknown", shortLabelOrUndefined(row.server_message))} Nothing will wake this session about this artifact${hint === null ? "" : `; ${hint}`}.`;
        default:
          return `- ${target} \u2014 no wake subscription (state: ${clipUnknown(row.state)}).`;
      }
    }
    switch (row.state) {
      case "arming":
        return row.reconnect === true
          ? `- ${target} \u2014 reconnecting right now, so nothing reaches this session until it is connected again${failuresNote}. Check status again in a few seconds before relying on it.`
          : `- ${target} \u2014 not a watch yet: its first connection is being set up right now${failuresNote}. Check status again in a few seconds before relying on it.`;
      case "backing_off":
        return `- ${target} \u2014 not connected: the next reconnect attempt is in about ${numberText(row.next_in_s)}s (as of this status)${failuresNote}; it gives up after more than ${numberText(row.max_failures)} consecutive failures, retries on its own until then, and you are told if it has to stop.`;
      case "failed":
        return `- ${target} \u2014 NOT watching: the live subscription failed to arm at ${formatEpochMsIso(row.at)} \u2014 ${reasonText()} ${headline}; ${noRewatchAdvice(reason) ?? 'pass action "watch" with its url if you need that'}.`;
      case "ended":
        return `- ${target} \u2014 NOT watching: the watch ended at ${formatEpochMsIso(row.at)} (${clipUnknown(row.reason)}). ${headline}; ${noRewatchAdvice(reason) ?? 'pass action "watch" with its url if you need it again'}.`;
      default:
        return `- ${target} \u2014 no live connection (state: ${clipUnknown(row.state)}).`;
    }
  });
  let rowCount = rows.length;
  let any = rows.some((row) => row.rail !== undefined);
  let connectedWord = any ? "working" : "connected";
  let connectionNoun = any ? "working watch" : "live connection";
  return `${moreWatches ? `${rowCount} more ${plural(rowCount, "artifact")} with watch activity but no ${connectionNoun}:` : singleArtifact ? `No ${connectedWord} watch on that artifact in this session; its watch activity:` : `No artifact watch is ${connectedWord} in this session; ${rowCount} ${plural(rowCount, "artifact")} with watch activity but no ${connectionNoun}:`}
${mapped.join(`
`)}`;
}
//@ chunk-xzmy9dn4.js:261132-262547 placement
/**
 * 把 durable wake 订阅结果（subscribed / already_watching / failed / skipped）映射为 watch 结果对象与给模型的说明。
 */
function durableWakeResult(outcome) {
  switch (outcome.outcome) {
    case "subscribed":
      return {
        watching: true,
        outcome: "durable_wake_registered",
        rail: "durable_wake",
        trigger_id: outcome.triggerId,
        durable_since: outcome.since,
        events: [...outcome.events],
        note: outcome.events.includes("comment")
          ? "Durable wake subscription registered \u2014 this session will be woken by a new turn when the artifact is next published, and when a comment is sent to Claude on it. No updates are streamed; on wake, re-read the artifact (and its comments, on a comment wake)."
          : "Durable wake subscription registered \u2014 this session will be woken by a new turn when the artifact is next published. No updates are streamed; re-read the artifact on wake.",
      };
    case "already_watching":
      return {
        watching: true,
        outcome: "already_watching",
        rail: "durable_wake",
        trigger_id: outcome.triggerId,
        durable_since: outcome.since,
        events: [...outcome.events],
        note:
          (outcome.events.includes("comment")
            ? "Already holding a durable wake subscription for this artifact (publish and to-Claude comment wakes)."
            : "Already holding a durable wake subscription for this artifact (publish wakes).") +
          (outcome.restored
            ? " It was restored after this session restarted and has not been re-verified since."
            : ""),
      };
    case "failed": {
      let failure = describeWatchHttpStatus(outcome);
      return {
        watching: false,
        outcome: "failed",
        rail: "durable_wake",
        reason: outcome.reason,
        ...(outcome.status !== undefined && {
          status: outcome.status,
        }),
        ...(failure !== undefined && {
          detail: failure,
        }),
        note: describeWatchError(outcome.reason, outcome.serverMessage),
      };
    }
    case "skipped":
      return {
        watching: false,
        outcome: "skipped",
        rail: "durable_wake",
      };
  }
}
//@ chunk-xzmy9dn4.js:262547-262934 placement
/**
 * 刷新标记为 dirty 的 Artifact 评论计数：在截止时间内并发读取评论（共享中止信号），成功且未降级时更新计数缓存。
 */
async function refreshDirtyCommentCounts(slugs, signal, credentials) {
  let filtered = slugs.filter((slug) => censusEntry(slug)?.dirty === true);
  if (filtered.length === 0) return;
  let combinedSignal = AbortSignal.any([signal, AbortSignal.timeout(APPROVED_PATH_CHECK_MS)]);
  let results = Promise.all(
    filtered.map(async (slug) => {
      let generation = censusGeneration(slug);
      try {
        let artifactComments = await readArtifactComments(
          {
            slug,
            env: claudeAiEnvironment(),
          },
          combinedSignal,
          credentials,
          "artifact_status_census_read",
          {
            skipBootProbe: isFrameLiveTokenLeaseEnabled(),
          },
        );
        if (artifactComments.err === null && artifactComments.threadsDegraded !== true)
          updateUnreadCounts(
            slug,
            artifactComments.threads,
            generation,
            artifactComments.threadsDropped === true,
          );
      } catch {}
    }),
  );
  await withDeadline(results, APPROVED_PATH_CHECK_MS);
}
//@ chunk-xzmy9dn4.js:262934-263652 placement
/**
 * 状态结果中的评论计数子句：未刷新、部分无法计数，或"N 条未读普通评论 / M 条发给 Claude 待回复"，并提示用 comments 动作查看。
 */
function commentCountsClause(entry) {
  if (entry.comments_uncounted === true)
    return '; its comment count is not refreshed yet \u2014 action "comments" shows them';
  let clampCount = (value) =>
    typeof value === "number" && Number.isInteger(value) && value > 0 ? Math.min(value, MAX_FOLDED_COUNT) : 0;
  let unreadPlain = clampCount(entry.unread_plain_comments);
  let awaitingReply = clampCount(entry.summons_awaiting_reply);
  let partiallyCounted = entry.comments_partially_counted === true;
  if (unreadPlain === 0 && awaitingReply === 0)
    return partiallyCounted
      ? '; some of its comments could not be counted \u2014 action "comments" shows them'
      : "";
  let atLeastPrefix = partiallyCounted ? "at least " : "";
  return `; ${[unreadPlain > 0 ? `${atLeastPrefix}${unreadPlain} plain ${plural(unreadPlain, "comment")} (not sent to Claude) you have not read` : "", awaitingReply > 0 ? `${atLeastPrefix}${awaitingReply} sent to Claude still awaiting a reply` : ""].filter((part) => part !== "").join(" and ")} on this Artifact${partiallyCounted ? " (some comments could not be counted)" : ""} \u2014 action "comments" shows them`;
}
//@ chunk-xzmy9dn4.js:263652-263897 placement
function commentCountFields(slug) {
  let entry = censusEntry(slug);
  if (entry === undefined) return {};
  if (entry.dirty)
    return {
      comments_uncounted: true,
    };
  return {
    ...(entry.plain > 0 && {
      unread_plain_comments: entry.plain,
    }),
    ...(entry.awaiting > 0 && {
      summons_awaiting_reply: entry.awaiting,
    }),
    ...(entry.partial && {
      comments_partially_counted: true,
    }),
  };
}
//@ chunk-xzmy9dn4.js:263897-264191 placement
function resumeWatchNote(resumed) {
  return `a --resume in an interactive terminal brings back the watch on the most recently used artifact${resumed ? ` and every watch that was replying to comments, newest first within the ${REFUSED_CAPACITY_HINT}-watch cap, plus any watches a background handoff carried` : ""}; other clients may restore less`;
}
//@ chunk-xzmy9dn4.js:264191-297763 placement
/**
 * watch 动作处理器（监视评论与变更）。
 */
var ARTIFACT_WATCH_ACTION_HANDLER = {
  actions: ["watch", "unwatch", "status", "resume_replies"],
  async checkPermissions(tool, input, context) {
    if (input.action === "resume_replies") {
      if (env.CLAUDE_CODE_REMOTE)
        return {
          behavior: "deny",
          message:
            'Resuming auto-replies is a live-session action; in a remote session comment wakes ride durable watch subscriptions \u2014 use action "watch" to re-register one. Nothing here needs approval.',
          decisionReason: {
            type: "other",
            reason:
              "Remote sessions have no live-rail stop latch \u2014 a resume is structurally a no-op there",
          },
        };
      if (getLiveState().autoReact.userDisarmed)
        return {
          behavior: "deny",
          message:
            "Auto-replies are disarmed for this whole session (the kill-all-agents gesture) and a resume cannot reverse that \u2014 a new session re-arms on publish. Nothing here needs approval; do not retry in this session.",
          decisionReason: {
            type: "other",
            reason: "The session-wide auto-reply disarm is terminal \u2014 a resume is structurally a no-op",
          },
        };
      if (!isAutoReactEnabled())
        return {
          behavior: "deny",
          message:
            "This session has not opted into automatic comment replies, so there is nothing a resume could re-enable. Nothing here needs approval; do not retry in this session.",
          decisionReason: {
            type: "other",
            reason:
              "The auto-react opt-in is session-terminal and off \u2014 a resume is structurally a no-op",
          },
        };
      if (!canRearmWatchHere(context))
        return {
          behavior: "deny",
          message:
            "Resuming auto-replies needs the session that holds the live watch; this session type cannot hold one. Nothing here needs approval; the user can resume from their interactive session.",
          decisionReason: {
            type: "other",
            reason:
              "This session shape cannot hold the live socket a resume re-arms \u2014 structurally a no-op",
          },
        };
      let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
      runCommentMonitorWithIntent({
        storageV5: context.storageV5,
      });
      let stoppedKind =
        artifactUrl === null || !isSlugStopped(artifactUrl.slug)
          ? null
          : isYieldResumable(artifactUrl.slug)
            ? "yielded"
            : isSlugSwept(artifactUrl.slug)
              ? "swept"
              : "killed";
      if (artifactUrl === null || stoppedKind === null) {
        if (artifactUrl !== null && getLiveState().durable.stopLatches.isStopped(artifactUrl.slug))
          return {
            behavior: "deny",
            message:
              "Automatic replies are off for this artifact because watching it was stopped earlier in this session \u2014 there is no separate auto-reply stop to resume. If the user wants them back, call the watch action for this artifact (which may ask before re-arming the watch); replies return with the next publish after that. Nothing here needs approval.",
            decisionReason: {
              type: "other",
              reason:
                "The replies are held by the artifact's watch stop, which only an approved re-watch clears \u2014 a resume is a no-op",
            },
          };
        return {
          behavior: "deny",
          message:
            "No auto-reply stop or pause is recorded for this artifact in this session, so there is nothing to resume (an interrupt's pause lifts on its own when the user sends a message). Nothing here needs approval.",
          decisionReason: {
            type: "other",
            reason: "No auto-reply stop is recorded for this artifact \u2014 a resume is a no-op",
          },
        };
      }
      if (!isUserDrivenTurn(context.messages))
        return {
          behavior: "deny",
          message: `Auto-replies were NOT resumed: ${UNVERIFIED_USER_TURN_CLAUSE}, so there is no consent to reverse the stop. Raise it with the user; if they do want auto-replies back, their own next message can ask for it. Do not retry it in this turn, and do not reply to the comments yourself in this turn either \u2014 list them for the user.`,
          decisionReason: {
            type: "safetyCheck",
            reason:
              "Resuming auto-replies reverses a stop \u2014 only a request made in a turn the user started may ask for it",
            classifierApprovable: false,
          },
        };
      let planConsentRefusal = () => {
        if (planConsentMustDeny(context))
          return {
            behavior: "deny",
            message:
              "Resuming auto-replies from plan mode needs a consent surface, and no one can answer the prompt in this session. Raise the resume with the user in chat; do not retry it in this session.",
            decisionReason: {
              type: "safetyCheck",
              reason: "Reversing a user stop from plan mode requires a live human consent surface",
              classifierApprovable: false,
            },
          };
        return null;
      };
      let planRefusal = planConsentRefusal();
      if (planRefusal !== null) return planRefusal;
      let liveState = getLiveState();
      let stopLatches = liveState.durable.stopLatches;
      if (context.toolUseId !== undefined) {
        liveState.wakes.resumeSights.note(
          context.toolUseId,
          artifactUrl.slug,
          stopGeneration(artifactUrl.slug),
        );
        stopLatches.noteRelatchAsk(context.toolUseId, artifactUrl.slug);
      }
      let relatchNote = stopLatches.isStopped(artifactUrl.slug)
        ? ", and re-arms the live watch of this artifact (stopped earlier this session)"
        : "";
      await warmShareEntry(artifactUrl, context, "resume_replies");
      let outsideOrgDenial = denyOtherOrgArtifact(artifactUrl, "Auto-replies were not resumed");
      if (outsideOrgDenial !== null) return outsideOrgDenial;
      let planRefusalAgain = planConsentRefusal();
      if (planRefusalAgain !== null) return planRefusalAgain;
      if (
        stoppedKind === "yielded" &&
        isYieldResumable(artifactUrl.slug) &&
        !stopLatches.isStopped(artifactUrl.slug) &&
        getToolPermissionContext(context).mode !== "plan"
      )
        return {
          behavior: "allow",
          updatedInput: input,
          decisionReason: {
            type: "other",
            reason:
              "Taking automatic comment replies back from another session of this conversation, in a turn the user started",
          },
        };
      let stoppedClause =
        stoppedKind === "yielded"
          ? " that another session of this conversation took over"
          : stoppedKind === "swept"
            ? " that were paused when the user interrupted the session (Ctrl+C or Stop)"
            : " that were stopped earlier this session";
      let grantReason =
        stoppedKind === "yielded"
          ? RESUME_REASON_GRANT_YIELDED
          : stoppedKind === "swept"
            ? RESUME_REASON_GRANT_SWEPT
            : RESUME_REASON_GRANT;
      return {
        behavior: "ask",
        message:
          stoppedKind === "killed"
            ? RESUME_ASK_MESSAGE
            : stoppedKind === "yielded"
              ? RESUME_ASK_MESSAGE_YIELDED
              : RESUME_ASK_MESSAGE_SWEPT,
        updatedInput: input,
        suppressAlwaysAllowRule: true,
        decisionReason:
          getToolPermissionContext(context).mode === "plan"
            ? {
                type: "safetyCheck",
                reason: `${RESUME_REASON_LEDE}${stoppedClause} \u2014 ${grantReason}${relatchNote}; in plan mode the approval must come from the user, not the auto-permission classifier. ${RESUME_REASON_DENY}`,
                classifierApprovable: false,
              }
            : {
                type: "safetyCheck",
                reason: `${RESUME_REASON_LEDE}${stoppedClause} \u2014 ${grantReason} for the rest of the session${relatchNote}. ${RESUME_REASON_DENY}`,
                classifierApprovable: true,
              },
        localDisplayOnly: true,
      };
    }
    if (input.action === "unwatch" || input.action === "status")
      return {
        behavior: "allow",
        updatedInput: input,
        decisionReason: {
          type: "other",
          reason:
            input.action === "status"
              ? "Reading this session's own artifact watches"
              : "Stopping a watch this session armed",
        },
      };
    if (input.action === "watch") {
      let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
      let watchApproved = consentEpochGuard(context.getAppState()).artifactWatchApproved === true;
      let stopLatches =
        artifactUrl !== null &&
        (frameLiveWatchRows(context, artifactUrl.slug).length > 0 ||
          durableRowFor(artifactUrl.slug) !== undefined);
      let { stopLatches: stopLatches_2, liveDocRegrantSights, firstWatchAskSights } = getLiveState().durable;
      runCommentMonitorWithIntent({
        storageV5: context.storageV5,
      });
      let isStopped = artifactUrl !== null && stopLatches_2.isStopped(artifactUrl.slug);
      if (isStopped && !canRearmWatchHere(context))
        return {
          behavior: "deny",
          message:
            "Not watching: watching this artifact was stopped earlier in this session, and re-arming it needs the session that holds the live watch \u2014 this session type (a sub-agent, teammate or print session) cannot hold one. Nothing here needs approval; the user can ask for it from the main conversation. Do not reply to its comments yourself in this turn either \u2014 list them for the user.",
          decisionReason: {
            type: "other",
            reason:
              "This session shape cannot hold the live socket a re-watch re-arms \u2014 clearing the stop here would arm nothing",
          },
        };
      if (isStopped && !isUserDrivenTurn(context.messages))
        return {
          behavior: "deny",
          message: `Not watching: watching this artifact was stopped earlier in this session, and ${UNVERIFIED_USER_TURN_CLAUSE}. Raise it with the user; if they want it watched again, their own next message can ask for it. Do not reply to its comments yourself in this turn either \u2014 list them for the user.`,
          decisionReason: {
            type: "safetyCheck",
            reason:
              "Re-watching an artifact whose watch was stopped this session \u2014 only a request made in a turn the user started may ask for it",
            classifierApprovable: false,
          },
        };
      let liveCommentsPossible = isLiveCommentsWatchPossible();
      let consentWriter = repliesConsentWriterFor(context);
      let refusal =
        artifactUrl !== null
          ? settleRepliesConsent(consentWriter, artifactUrl.slug, context.toolUseId, context.messages)
          : {
              declined: false,
              approved: false,
            };
      let durableRail = sessionWatchRail() === "durable" && artifactCommentsPromptGateOpen();
      let liveRail = sessionWatchRail() === "live";
      if (
        durableRail &&
        artifactUrl !== null &&
        refusal.declined &&
        !hasClassConsent("standing_job", artifactUrl.slug)
      )
        return {
          behavior: "deny",
          message:
            "Not starting a watch: an earlier ask in this session, to let Claude reply to this artifact's comments, wasn't approved. If the user wants it watched, their own next message with its link can ask again.",
          decisionReason: {
            type: "safetyCheck",
            reason:
              "Watching an artifact whose comment-replies ask went unapproved this session \u2014 only the user's own new message with its link may ask again",
            classifierApprovable: false,
          },
        };
      if (artifactUrl !== null && context.toolUseId !== undefined) {
        stopLatches_2.noteRelatchAsk(context.toolUseId, artifactUrl.slug);
        liveDocRegrantSights.note(context.toolUseId, artifactUrl.slug, true);
      }
      let consentFacts =
        artifactUrl !== null &&
        liveCommentsPossible &&
        canRearmWatchHere(context) &&
        isStrictHumanTurn(context.messages) &&
        hasHumanMessageContaining(context.messages, artifactUrl.slug) &&
        !refusal.declined &&
        !(isSlugStopped(artifactUrl.slug) && !isSlugSwept(artifactUrl.slug)) &&
        !knownNonEditor(artifactUrl.slug) &&
        !isAutoReactWired(artifactUrl.slug);
      let needsConsent = consentFacts && (stopLatches || watchApproved);
      if (artifactUrl !== null && !isStopped) {
        if (
          !consentFacts &&
          !durableRail &&
          !writeKeepsFlagOffAsk(
            classifyArtifactConsent(classFactsFor("standing_job", artifactUrl, context)),
            context,
          )
        ) {
          if (context.toolUseId !== undefined)
            firstWatchAskSights.note(context.toolUseId, artifactUrl.slug, false);
          return {
            behavior: "allow",
            updatedInput: {
              ...input,
              [CONSENT_ASK_TAG]: false,
              [WATCH_ARMS_REPLIES_TAG]: false,
              ...consentPin(input.action, artifactUrl),
            },
            decisionReason: {
              type: "other",
              reason: "Watching an artifact arms no replies",
            },
          };
        }
        let consentClass = classifyArtifactConsent(classFactsFor("standing_job", artifactUrl, context));
        if (!writeKeepsFlagOffAsk(consentClass, context)) {
          await warmShareEntry(artifactUrl, context, "watch");
          if (!writeKeepsFlagOffAsk(consentClass, context)) {
            let decision = decideByClass({
              ruling: consentClass,
              input: {
                ...input,
                [WATCH_ARMS_REPLIES_TAG]: consentFacts,
                ...consentPin(input.action, artifactUrl),
              },
              context,
              slug: artifactUrl.slug,
              display: artifactCardTitleFor(artifactUrl, context),
              action: "standing_job",
            });
            if (
              (consentFacts || durableRail) &&
              context.toolUseId !== undefined &&
              (decision.behavior === "ask" || decision.behavior === "allow")
            )
              noteRepliesConsentAsk(
                consentWriter,
                artifactUrl.slug,
                context.toolUseId,
                context.messages,
                decision.behavior === "allow",
              );
            if (context.toolUseId !== undefined)
              firstWatchAskSights.note(
                context.toolUseId,
                artifactUrl.slug,
                decision.behavior === "ask" && firstWatchAskReachesHuman(context),
              );
            return decision;
          }
        }
      }
      let needsWatchConsent = !watchApproved;
      if ((stopLatches || watchApproved) && !isStopped && (!consentFacts || refusal.approved)) {
        if (artifactUrl !== null && context.toolUseId !== undefined)
          firstWatchAskSights.note(context.toolUseId, artifactUrl.slug, false);
        return {
          behavior: "allow",
          updatedInput: {
            ...input,
            [CONSENT_ASK_TAG]: false,
            [WATCH_ARMS_REPLIES_TAG]: false,
            ...consentPin(input.action, artifactUrl),
          },
          decisionReason: {
            type: "other",
            reason: stopLatches
              ? "Already watching this artifact in this session"
              : "Artifact watching already approved this session",
          },
        };
      }
      if (artifactUrl !== null && context.toolUseId !== undefined && !isStopped)
        firstWatchAskSights.note(context.toolUseId, artifactUrl.slug, firstWatchAskReachesHuman(context));
      let consentReply =
        isUserDrivenHere(context.messages) &&
        context.messages.some(isHumanTurn) &&
        firstWatchAskReachesHuman(context) &&
        !consentMustDeny(context) &&
        getToolPermissionContext(context).mode !== "dontAsk";
      if (
        artifactUrl !== null &&
        context.toolUseId !== undefined &&
        (consentFacts || (durableRail && consentReply))
      )
        noteRepliesConsentAsk(consentWriter, artifactUrl.slug, context.toolUseId, context.messages);
      return {
        behavior: "ask",
        message: isStopped
          ? `Claude wants to watch an artifact whose watch was deliberately stopped earlier this session \u2014 ${watchResumeAskBody(artifactCommentsPromptGateOpen(), liveCommentsPossible && !refusal.declined, liveRail)}`
          : needsConsent
            ? WATCH_ARM_REPLIES_ASK
            : `Claude wants to watch an artifact \u2014 ${watchAskBody(artifactCommentsPromptGateOpen(), liveCommentsPossible && !refusal.declined, liveRail)}`,
        updatedInput: {
          ...input,
          [CONSENT_ASK_TAG]: consentAskCanReachUser(context),
          [WATCH_ARMS_REPLIES_TAG]: consentFacts,
          ...consentPin(input.action, artifactUrl),
        },
        suppressAlwaysAllowRule: true,
        decisionReason: isStopped
          ? {
              type: "safetyCheck",
              reason: rewatchReason({
                live: liveRail,
                replies: consentFacts,
                commentWake: durableRail,
                coversSession: needsWatchConsent,
              }),
              classifierApprovable: true,
            }
          : consentFacts
            ? {
                type: "safetyCheck",
                reason: needsConsent
                  ? watchArmsRepliesReason(needsWatchConsent)
                  : watchReason({
                      live: liveRail,
                      replies: true,
                      commentWake: durableRail,
                      coversSession: needsWatchConsent,
                    }),
                classifierApprovable: true,
              }
            : {
                type: "other",
                reason: watchReason({
                  live: liveRail,
                  replies: false,
                  commentWake: durableRail,
                  coversSession: needsWatchConsent,
                }),
              },
        localDisplayOnly: true,
      };
    }
    return throwUnroutedArtifactAction("watch.checkPermissions", input);
  },
  async validateInput(tool, input) {
    let { action, url } = input;
    if (action === "watch" || action === "unwatch" || action === "status" || action === "resume_replies")
      return validateArtifactPathInput(action, input, url);
    return throwUnroutedArtifactAction("watch.validateInput", input);
  },
  toAutoClassifierInput(input) {
    if (input?.action === "watch" || input?.action === "unwatch") {
      let target = classifierArtifactTargetFor(input.url, "(no artifact url)");
      if (input.action === "unwatch") return `stop watching artifact \u2192 ${target}`;
      let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
      runCommentMonitorWithIntent();
      let isStopped = artifactUrl !== null && getLiveState().durable.stopLatches.isStopped(artifactUrl.slug);
      let shareMarks = shareClassifierMarks(
        artifactUrl !== null ? getShareEntry(artifactUrl.slug) : undefined,
      );
      let rail = sessionWatchRail();
      let railSuffix =
        rail === "live" && isAutoReactEnabled()
          ? artifactUrl !== null && isSlugStopped(artifactUrl.slug) && !isSlugSwept(artifactUrl.slug)
            ? WATCH_PROJECTION_REPLIES_STOPPED
            : artifactUrl !== null && repliesConsentDeclined(artifactUrl.slug)
              ? WATCH_PROJECTION_REPLIES_DECLINED
              : artifactUrl !== null && isSlugSwept(artifactUrl.slug)
                ? WATCH_PROJECTION_REPLIES_PAUSED
                : WATCH_PROJECTION_COMMENTS
          : undefined;
      if (railSuffix !== undefined) {
        let railNote = ` (background connection to claude.ai for the session; notifies on republish${railSuffix})`;
        return isStopped
          ? `resume watching an artifact whose watch was stopped earlier in this session \u2192 ${target}${railNote}${shareMarks}`
          : `watch artifact \u2192 ${target}${railNote}${shareMarks}`;
      }
      let verb =
        rail === "durable" && isArtifactsAvailable()
          ? "republish and to-Claude comment wake-ups"
          : "republish notifications";
      let noun =
        rail === "durable"
          ? " (durable wake subscription held by the artifact service)"
          : rail === "live"
            ? " (background connection to claude.ai for the session)"
            : ` (watching for republishes is not available in this session; the call only reports that${watchDurableArmsRef?.liveDocStreamGateOpen() === true ? watchDurableArmsRef.NO_WATCH_RAIL_COLLAB_CONSENT_CLAUSE : ""})`;
      return isStopped
        ? `resume watching an artifact whose watch was stopped earlier in this session (${verb}) \u2192 ${target}${noun}${shareMarks}`
        : `watch artifact for ${verb} \u2192 ${target}${noun}${shareMarks}`;
    }
    if (input?.action === "resume_replies") {
      let target = classifierArtifactTargetFor(input.url, "(no artifact url)");
      let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
      let shareEntry = artifactUrl !== null ? getShareEntry(artifactUrl.slug) : undefined;
      let stoppedNote =
        artifactUrl === null || !isSlugStopped(artifactUrl.slug)
          ? "no stop is recorded, so this is a no-op"
          : isSlugSwept(artifactUrl.slug)
            ? "reverses the stop from the user's Ctrl+C / Stop interrupt, also answering comments sent to Claude since then"
            : "reverses the user's earlier stop of these replies";
      let audienceNote =
        artifactUrl !== null &&
        isSlugStopped(artifactUrl.slug) &&
        getLiveState().durable.stopLatches.isStopped(artifactUrl.slug)
          ? "; also resumes watching the artifact, whose watch was stopped earlier in this session"
          : "";
      return `resume unattended auto-replies to comments on artifact \u2192 ${target} (${stoppedNote}${audienceNote})${shareClassifierMarks(shareEntry)}`;
    }
    if (input?.action === "status") return "read this session's artifact watches (local state)";
    return throwUnroutedArtifactAction("watch.toAutoClassifierInput", input);
  },
  async description(tool, input) {
    if (input?.action === "watch") {
      let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
      return artifactUrl !== null && getLiveState().durable.stopLatches.isStopped(artifactUrl.slug)
        ? `Watch a published artifact whose watch was deliberately stopped earlier this session \u2014 ${watchResumeAskBody(artifactCommentsPromptGateOpen(), isLiveCommentsWatchPossible(), sessionWatchRail() === "live")}.`
        : `Watch a published artifact \u2014 ${watchAskBody(artifactCommentsPromptGateOpen(), isLiveCommentsWatchPossible(), sessionWatchRail() === "live")}.`;
    }
    if (input?.action === "unwatch")
      return sessionWatchRail() === "live"
        ? "Stop watching a published artifact \u2014 ends this session's watch of it (it stops keeping track of new versions published elsewhere; automatic replies to its comments stop too); nothing is published or read."
        : "Stop watching a published artifact \u2014 ends this session's watch of it (republish notifications and, in cloud sessions, comment wakes; automatic replies to its comments stop too); nothing is published or read.";
    if (input?.action === "status")
      return "List this session's own artifact watches and their unread-comment counts (read-only).";
    if (input?.action === "resume_replies") {
      let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
      return artifactUrl !== null && isSlugSwept(artifactUrl.slug)
        ? RESUME_ASK_MESSAGE_SWEPT
        : RESUME_ASK_MESSAGE;
    }
    return throwUnroutedArtifactAction("watch.description", input);
  },
  getToolUseSummary(input) {
    if (input?.action === "watch" || input?.action === "resume_replies") {
      let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
      let shareEntry = artifactUrl !== null ? getShareEntry(artifactUrl.slug) : undefined;
      let audienceMark = shareAudienceMark(shareEntry);
      return input.action === "watch"
        ? `watch an artifact for new versions and comments${audienceMark}`
        : `resume automatic replies to an artifact's comments${audienceMark}`;
    }
    if (input?.action === "unwatch") return "stop watching an artifact";
    if (input?.action === "status") return "list this session's artifact watches (read-only)";
    return throwUnroutedArtifactAction("watch.getToolUseSummary", input);
  },
  async call(tool, input, context, canUseTool, options, { consentWriter, takenRepliesAsk }) {
    if (input.action === "status") {
      let targetSlug = input.url !== undefined ? (parseArtifactUrl(input.url)?.slug ?? undefined) : undefined;
      let commentsEnabled = isArtifactCommentsEnabled() && artifactCommentsPromptGateOpen();
      if (commentsEnabled)
        await refreshDirtyCommentCounts(
          frameLiveWatchRows(context, targetSlug)
            .filter((row) => row.connected)
            .map((row) => row.slug),
          context.abortController.signal,
          context.credentials,
        );
      return {
        data: {
          watches: [
            ...frameLiveWatchRows(context, targetSlug).map((row) => ({
              url: artifactViewerUrlFor({
                slug: row.slug,
                env: claudeAiEnvironment(),
              }),
              task_id: row.taskId,
              since: row.since,
              explicit: row.explicit,
              connected: row.connected,
              ...(isFrameLiveRowConnecting(row) && {
                connecting: true,
              }),
              token_expires_at: row.tokenExpiresAt,
              auto_reply: row.autoReply,
              armed_via: row.armedVia,
              ...(commentsEnabled && commentCountFields(row.slug)),
            })),
            ...frameLiveStoppedRows(context, targetSlug).map((row) => ({
              url: artifactViewerUrlFor({
                slug: row.slug,
                env: claudeAiEnvironment(),
              }),
              rail: "live_stopped",
              ...(row.since !== undefined && {
                since: row.since,
              }),
              ...(row.explicit !== undefined && {
                explicit: row.explicit,
              }),
              ...(row.armedVia !== undefined && {
                armed_via: row.armedVia,
              }),
              auto_reply: row.autoReply,
              stop_kind: row.stopKind,
            })),
            ...durableRowList()
              .filter((row) => targetSlug === undefined || row.slug === targetSlug)
              .map((row) => ({
                url: artifactViewerUrlFor({
                  slug: row.slug,
                  env: claudeAiEnvironment(),
                }),
                rail: "durable_wake",
                trigger_id: row.triggerId,
                since: row.since,
                events: [...row.events],
                ...(row.restored && {
                  restored: true,
                }),
              })),
          ],
          ...(targetSlug !== undefined && {
            filter_url: artifactViewerUrlFor({
              slug: targetSlug,
              env: claudeAiEnvironment(),
            }),
          }),
          ...watchArmsStatus(context, targetSlug),
          ...(() => {
            let mapped = (watchStatusRef?.artifactRoomStatus() ?? [])
              .filter((row) => targetSlug === undefined || row.slug === targetSlug)
              .map((row) => ({
                url: artifactViewerUrlFor({
                  slug: row.slug,
                  env: claudeAiEnvironment(),
                }),
                connected: row.connected,
                peers: row.peers,
                ...(row.viewers.length > 0 && {
                  viewers: row.viewers,
                }),
              }));
            return mapped.length > 0
              ? {
                  rooms: mapped,
                }
              : {};
          })(),
        },
      };
    }
    if (input.action === "unwatch") {
      let artifactUrlOrThrow = parseArtifactUrlOrThrow(input.url);
      let { stopLatches, liveDocArmDeclined } = getLiveState().durable;
      let stopReceipt = stopLatches.recordStop(artifactUrlOrThrow.slug);
      let hadIntent =
        forgetSlugIntent(artifactUrlOrThrow.slug, {
          storageV5: context.storageV5,
        }) !== undefined;
      if (!isSlugYielded(artifactUrlOrThrow.slug)) {
        stopCommentMonitorIntent(artifactUrlOrThrow.slug, {
          storageV5: context.storageV5,
        });
        import("../../../services/artifacts/replyYieldHolder.js").then((artifactSlugModule) =>
          artifactSlugModule.notifyTakenOverSlugStopped(artifactUrlOrThrow.slug),
        );
      }
      let armNotDeclined = !liveDocArmDeclined.has(artifactUrlOrThrow.slug);
      liveDocArmDeclined.add(artifactUrlOrThrow.slug);
      let frameLiveResult = unwatchFrameLive(artifactUrlOrThrow.slug, context, consentWriter);
      let docStopped =
        watchLiveArmsRef != null && watchLiveArmsRef.stopLiveDocCollab(artifactUrlOrThrow.slug);
      let durableResult = await unwatchArtifactDurably({
        slug: artifactUrlOrThrow.slug,
        context,
      });
      let wasWatching = durableResult.wasWatching || frameLiveResult.wasWatching || docStopped;
      stopReceipt.settle({
        wasWatching,
        teardown: durableResult.teardown,
      });
      let stillStopped = !stopLatches.isStopped(artifactUrlOrThrow.slug);
      if (stillStopped && !hadIntent)
        forgetCommentMonitorIntents(artifactUrlOrThrow.slug, {
          storageV5: context.storageV5,
        });
      if (armNotDeclined && stillStopped) liveDocArmDeclined.delete(artifactUrlOrThrow.slug);
      return {
        data: {
          unwatch: {
            url: artifactViewerUrlFor(artifactUrlOrThrow),
            was_watching: wasWatching,
          },
        },
      };
    }
    if (input.action === "watch") {
      let artifactUrlOrThrow = parseArtifactUrlOrThrow(input.url);
      let url = artifactViewerUrlFor(artifactUrlOrThrow);
      let durable = getLiveState().durable;
      let { stopLatches } = durable;
      runCommentMonitorWithIntent({
        storageV5: context.storageV5,
      });
      let relatchAsk =
        context.toolUseId !== undefined
          ? stopLatches.takeRelatchAsk(context.toolUseId, artifactUrlOrThrow.slug)
          : undefined;
      let docRegranted =
        context.toolUseId === undefined ||
        durable.liveDocRegrantSights.take(context.toolUseId, artifactUrlOrThrow.slug) === true;
      let repliesApproved =
        context.toolUseId !== undefined &&
        durable.firstWatchAskSights.take(context.toolUseId, artifactUrlOrThrow.slug) === true;
      if (consentTargetChanged(input, "watch", artifactUrlOrThrow.slug))
        throw new ArtifactInputError(
          "`action` or `url` no longer names the artifact watch that was approved \u2014 nothing was armed; retry so it is checked again",
          "watch_target_changed",
        );
      if (
        relatchAsk !== undefined &&
        !isDelegatedObservationContext(context.agentContext) &&
        canRearmWatchHere(context)
      ) {
        stopLatches.clearByApprovedRewatch(artifactUrlOrThrow.slug, relatchAsk);
        if (!stopLatches.isStopped(artifactUrlOrThrow.slug))
          forgetCommentMonitorIntents(artifactUrlOrThrow.slug, {
            storageV5: context.storageV5,
          });
      }
      if (stopLatches.isStopped(artifactUrlOrThrow.slug)) {
        logFeatureSad(
          env.CLAUDE_CODE_REMOTE ? "artifact_durable_subscribe" : "artifact_live_subscribe",
          "stop_latched",
        );
        return {
          data: {
            watch: {
              url,
              watching: false,
              outcome: "skipped",
              reason: "stop_latched",
            },
          },
        };
      }
      let repliesApproved_2 = approveTakenRepliesConsent(
        consentWriter,
        takenRepliesAsk,
        artifactUrlOrThrow.slug,
        (consentAskReachedUser(input, context) && repliesAskAnsweredByHuman(context)) ||
          classAskStands(context, "standing_job", artifactUrlOrThrow.slug),
      );
      if (
        repliesApproved &&
        firstWatchAskReachesHuman(context) &&
        !isDelegatedObservationContext(context.agentContext) &&
        canRearmWatchHere(context) &&
        isUserDrivenTurn(context.messages)
      )
        stopLatches.noteApprovedWatch(artifactUrlOrThrow.slug);
      if (docRegranted && !isDelegatedObservationContext(context.agentContext))
        durable.liveDocArmDeclined.delete(artifactUrlOrThrow.slug);
      let durableSkipReason;
      if (env.CLAUDE_CODE_REMOTE) {
        let outcome = await watchArtifactDurably({
          slug: artifactUrlOrThrow.slug,
          context,
        });
        if (outcome.outcome === "subscribed" || outcome.outcome === "already_watching")
          pullStaleWatchLifecycleNotices(artifactUrlOrThrow.slug);
        if (outcome.outcome !== "skipped") {
          if (consentPinMatches(input, "watch", artifactUrlOrThrow.slug))
            stampArtifactWatchConsent(input, context);
          let liveDocNote =
            watchLiveArmsRef != null &&
            outcome.outcome !== "failed" &&
            watchLiveArmsRef.hasProbedLiveFile(artifactUrlOrThrow.slug)
              ? watchLiveArmsRef.durableLiveDocWatchNote(outcome.events)
              : undefined;
          return {
            data: {
              watch: {
                url,
                ...durableWakeResult(outcome),
                ...(liveDocNote !== undefined && {
                  liveDocCollab: "remote_session",
                  note: liveDocNote,
                }),
              },
            },
          };
        }
        durableSkipReason = outcome.reason;
      }
      let { publishContext } = derivePublishContext(context);
      let tool_2 = tool.tool;
      let frameLiveArm = watchFrameLive({
        slug: artifactUrlOrThrow.slug,
        url,
        publishContext,
        getKnownVer: makeArtifactReadVersionReader(context.getAppState, artifactUrlOrThrow.slug),
        context,
        tool: tool_2,
        commentVerbsInSchema: artifactCommentsPromptGateOpen(),
        repliesApproved: repliesApproved_2,
      });
      let [docArmResult, frameLiveResult] = await Promise.all([
        watchLiveArmsRef != null
          ? watchLiveArmsRef.armWatchActionCollab({
              slug: artifactUrlOrThrow.slug,
              input,
              livePaths: artifactLivePathsSchemaOpen(),
              url,
              context,
            })
          : undefined,
        frameLiveArm,
      ]);
      let isWatching = frameLiveResult.outcome !== "skipped";
      if (sessionWatchRail() === "live" || isWatching) {
        if (consentPinMatches(input, "watch", artifactUrlOrThrow.slug))
          stampArtifactWatchConsent(input, context);
      }
      let watchRow = isWatching ? frameLiveWatchRows(context, artifactUrlOrThrow.slug)[0] : undefined;
      let degraded =
        frameLiveResult.outcome !== "skipped" && watchRow !== undefined && watchRow.autoReply === "none"
          ? frameLiveResult.degraded
          : undefined;
      let liveDocCollab =
        docArmResult ??
        (env.CLAUDE_CODE_REMOTE &&
        watchLiveArmsRef != null &&
        watchLiveArmsRef.hasProbedLiveFile(artifactUrlOrThrow.slug)
          ? "remote_session"
          : undefined);
      return {
        data: {
          watch: {
            url,
            watching: isWatching,
            outcome: frameLiveResult.outcome,
            ...(frameLiveResult.outcome === "skipped" && {
              reason: frameLiveResult.reason,
            }),
            ...(frameLiveResult.outcome === "skipped" &&
              durableSkipReason !== undefined && {
                durable_skip_reason: durableSkipReason,
              }),
            ...(watchRow && {
              task_id: watchRow.taskId,
              since: watchRow.since,
              token_expires_at: watchRow.tokenExpiresAt,
              auto_reply: watchRow.autoReply,
            }),
            ...(degraded === "not_editor" && {
              can_edit: false,
            }),
            ...(degraded === "unattended_turn" && {
              user_turn: false,
            }),
            ...(degraded === "not_named_by_user" && {
              named_by_user: false,
            }),
            ...(degraded === "declined" && {
              replies_declined: true,
            }),
            ...(liveDocCollab !== undefined && {
              liveDocCollab,
            }),
            ...(liveDocCollab !== undefined &&
              watchLiveArmsRef != null &&
              artifactLivePathsSchemaOpen() &&
              watchLiveArmsRef.livePathFrom(input) !== undefined &&
              watchLiveArmsRef.hasSeveralLiveFiles(artifactUrlOrThrow.slug) && {
                liveDocPath: watchLiveArmsRef.livePathFrom(input),
              }),
          },
        },
      };
    }
    if (input.action === "resume_replies") {
      let artifactUrlOrThrow = parseArtifactUrlOrThrow(input.url);
      let url = artifactViewerUrlFor(artifactUrlOrThrow);
      let liveState = getLiveState();
      let stopLatches = liveState.durable.stopLatches;
      let relatchAsk =
        context.toolUseId === undefined
          ? undefined
          : stopLatches.takeRelatchAsk(context.toolUseId, artifactUrlOrThrow.slug);
      let resumeSight =
        context.toolUseId === undefined
          ? undefined
          : liveState.wakes.resumeSights.take(context.toolUseId, artifactUrlOrThrow.slug);
      let approvedRelatchGen = isDelegatedObservationContext(context.agentContext) ? undefined : relatchAsk;
      if (env.CLAUDE_CODE_REMOTE)
        return {
          data: {
            resume_replies: {
              url,
              resumed: false,
              outcome: "skipped",
              reason: "remote_session",
            },
          },
        };
      if (
        !liveState.autoReact.userDisarmed &&
        resumeSight !== stopGeneration(artifactUrlOrThrow.slug) &&
        isSlugStopped(artifactUrlOrThrow.slug)
      )
        return {
          data: {
            resume_replies: {
              url,
              resumed: false,
              outcome: "skipped",
              reason: "stale_consent",
            },
          },
        };
      let { publishContext } = derivePublishContext(context);
      let isSwept = isSlugSwept(artifactUrlOrThrow.slug);
      let resumeResult = await resumeFrameLiveAutoReplies({
        slug: artifactUrlOrThrow.slug,
        url,
        publishContext,
        getKnownVer: makeArtifactReadVersionReader(context.getAppState, artifactUrlOrThrow.slug),
        context,
        tool: tool.tool,
        commentVerbsInSchema: artifactCommentsPromptGateOpen(),
        approvedRelatchGen,
      });
      let resumed = resumeResult.outcome === "armed";
      return {
        data: {
          resume_replies: {
            url,
            resumed,
            outcome: resumeResult.outcome,
            ...((resumeResult.outcome === "skipped" || resumeResult.outcome === "refused") && {
              reason: resumeResult.reason,
            }),
            ...(resumeResult.outcome === "armed" && {
              task_id: resumeResult.taskId,
              stop_kind: isSwept ? "interrupt" : "user",
              ...(resumeResult.inPlace === true && {
                in_place: true,
              }),
              ...(resumeResult.connecting === true && {
                connecting: true,
              }),
            }),
          },
        },
      };
    }
    return throwUnroutedArtifactAction("watch.call", input);
  },
};
var ARTIFACT_WATCH_ACTION_HANDLER_VALUE = {
  watch(toolResult, toolUseId) {
    if ("watch" in toolResult) {
      let watch = typeof toolResult.watch === "object" && toolResult.watch !== null ? toolResult.watch : {};
      if (watch.rail === "durable_wake") {
        let liveDocCollab = typeof watch.liveDocCollab === "string" ? watch.liveDocCollab : undefined;
        let lead =
          watch.watching === true && watchLiveArmsRef != null && liveDocCollab !== undefined
            ? watchLiveArmsRef.durableLiveDocWatchLead(canonicalTargetOrPlaceholder(watch.url))
            : "";
        let content =
          watch.watching === true
            ? `${lead}Durable wake subscription on ${canonicalTargetOrPlaceholder(watch.url)} \u2014 ${clipLabel(watch.note) ?? `this session will be woken by a new turn when the artifact is ${Array.isArray(watch.events) && watch.events.includes("comment") ? "republished or a comment on it is sent to Claude" : "next published"}; no live updates are streamed, so re-read the artifact on wake.`}`
            : `No durable wake subscription on ${canonicalTargetOrPlaceholder(watch.url)}${typeof watch.reason === "string" ? ` (${clipUnknown(watch.reason)}${labelSuffix(watch.detail)})` : ""} \u2014 ${clipLabel(watch.note) ?? "could not register one; publishing and reading still work."}`;
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content,
        };
      }
      let reconnectNote =
        watch.token_expires_at !== undefined
          ? " It reconnects on its own if the connection drops or its credential expires; you will be told if reconnecting has to stop."
          : "";
      let liveDocPath = watch.liveDocPath;
      let liveDocLine =
        watchLiveArmsRef != null
          ? watchLiveArmsRef.liveDocWatchCollabLine(
              typeof watch.liveDocCollab === "string" ? watch.liveDocCollab : undefined,
              canonicalTargetOrPlaceholder(watch.url),
              typeof liveDocPath === "string" && SAFE_ARTIFACT_PATH_RE.test(liveDocPath)
                ? liveDocPath
                : undefined,
            )
          : "";
      let durableSkipNote =
        watch.durable_skip_reason === undefined
          ? ""
          : ` This remote session's durable wake rail was skipped as well: ${watch.durable_skip_reason === "no_wake_minter" ? "no wake-webhook minter is available (the session's own MCP mount was not found)" : watch.durable_skip_reason === "stop_latched" ? "watching this artifact was stopped earlier in this session (do not retry on your own)" : clipUnknown(watch.durable_skip_reason)}.`;
      let remoteUnsupportedText = () => {
        let commentsOn = artifactCommentsPromptGateOpen();
        return `${liveDocLine}Not watching ${canonicalTargetOrPlaceholder(watch.url)} \u2014 watching an artifact for new versions${commentsOn ? " and comments" : ""} isn't supported yet from remote sessions, so nothing will notify this session. ${commentsOn ? "Publishing, reading comments, and replying still work here." : "Publishing still works here."} To watch it, the user can run \`claude --watch-artifact ${canonicalTargetOrPlaceholder(watch.url)}\` in Claude Code on their own machine.`;
      };
      let deviceBoundText = () => {
        let commentsOn = artifactCommentsPromptGateOpen();
        return `${liveDocLine}Not watching ${canonicalTargetOrPlaceholder(watch.url)} \u2014 this cloud session is bound to the desktop it was started from, and that device's trusted-device check means new versions${commentsOn ? " and comments" : ""} on the artifact can't wake it. ${commentsOn ? "Publishing, reading comments, and replying still work here." : "Publishing still works here."} To be woken, the user can publish from a Claude Code cloud session started on the web, or run \`claude --watch-artifact ${canonicalTargetOrPlaceholder(watch.url)}\` in Claude Code on their own machine.`;
      };
      let content =
        watch.watching === true
          ? `${liveDocLine}Watching ${canonicalTargetOrPlaceholder(watch.url)} \u2014 the watch is armed (\`status\` shows whether it has connected yet); this session keeps track of new versions published elsewhere; a new version starts no turn and sends no notification (watch is session-local; ${resumeWatchNote(artifactCommentsPromptGateOpen())}).${describeWatchCommentsReach(typeof watch.auto_reply === "string" ? watch.auto_reply : undefined, watch.task_id === undefined, watch.can_edit === false ? "cannot_edit" : watch.user_turn === false ? "unattended_turn" : watch.named_by_user === false ? "not_named_by_user" : watch.replies_declined === true ? "declined" : undefined)}${reconnectNote}`
          : watch.durable_skip_reason === "tool_not_offered" ||
              watch.durable_skip_reason === "org_not_enabled" ||
              watch.durable_skip_reason === "relay_not_served"
            ? remoteUnsupportedText()
            : watch.durable_skip_reason === "session_device_bound"
              ? deviceBoundText()
              : `${liveDocLine}Not watching ${canonicalTargetOrPlaceholder(watch.url)} \u2014 ${describeLiveSubscriptionState(watch.reason ?? watch.outcome)}${durableSkipNote}`;
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content,
      };
    }
    return throwUnroutedArtifactAction("watch.watch", toolResult);
  },
  unwatch(toolResult, toolUseId) {
    if ("unwatch" in toolResult) {
      let unwatch =
        typeof toolResult.unwatch === "object" && toolResult.unwatch !== null ? toolResult.unwatch : {};
      let content =
        unwatch.was_watching === true
          ? `Stopped watching ${canonicalTargetOrPlaceholder(unwatch.url)}; republishes of it will no longer be reported in this session. Do not watch it again unless the user asks.`
          : `No active watch for ${canonicalTargetOrPlaceholder(unwatch.url)} in this session \u2014 nothing to stop.`;
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content,
      };
    }
    return throwUnroutedArtifactAction("watch.unwatch", toolResult);
  },
  resume_replies(toolResult, toolUseId) {
    if ("resume_replies" in toolResult) {
      let resumeReplies =
        typeof toolResult.resume_replies === "object" && toolResult.resume_replies !== null
          ? toolResult.resume_replies
          : {};
      let content =
        resumeReplies.resumed === true
          ? resumeReplies.in_place === true
            ? `Auto-replies resumed on ${canonicalTargetOrPlaceholder(resumeReplies.url)} \u2014 the watch stayed connected, so they are back now: comments sent to Claude since the interrupt are answered in this pass, and new to-Claude comments as they arrive.`
            : resumeReplies.connecting === true
              ? `Auto-replies resumed on ${canonicalTargetOrPlaceholder(resumeReplies.url)} \u2014 the watch was still connecting, so the pause is lifted now and replies start once it opens (a notice confirms it): comments sent to Claude since the interrupt are picked up then, and new to-Claude comments as they arrive. If it fails to connect, action "status" shows the watch reconnecting; the pause stays lifted.`
              : `Auto-replies resumed on ${canonicalTargetOrPlaceholder(resumeReplies.url)} \u2014 the live watch is re-armed; the stop clears with a visible notice when the watch connects. Once connected, new to-Claude comments are answered; ${resumeReplies.stop_kind === "interrupt" ? "comments sent to Claude while replies were paused (since the interrupt) are answered too" : resumeReplies.stop_kind === "user" ? "comments sent to Claude while the watch was killed or unwatched stay unanswered history" : "comments sent to Claude while replies were stopped are picked up too if the stop was a session interrupt (Ctrl+C or Stop), and stay unanswered history if the watch had been killed or unwatched"}. If the watch fails to connect, this turn is interrupted before it does, or the user stops auto-replies again before it connects, the stop stays in place \u2014 check action "status" and resume again if the user still wants it.`
          : resumeReplies.outcome === "already_watching"
            ? 'Auto-replies were NOT resumed: a connection for this artifact is already mid-boot (a reconnect in progress), and a resume cannot attach to it. The stop stays in place unless that connection is a fresh publish re-arming it \u2014 check action "status" first, and call resume_replies again only if it still reports stopped and the user still wants auto-replies resumed.'
            : resumeReplies.reason === "session_disarmed"
              ? "Auto-replies were NOT resumed: they are disarmed for the whole session (the user's kill-all-agents gesture). That disarm lasts for the rest of this session and cannot be reversed by a resume \u2014 a new session re-arms on publish. Do not retry."
              : resumeReplies.reason === "other_org"
                ? `Auto-replies were NOT resumed on ${canonicalTargetOrPlaceholder(resumeReplies.url)}: ${ARTIFACT_OTHER_ORG_CAUSE}. Nothing here can re-arm them until ${ARTIFACT_OTHER_ORG_REMEDY}; tell the user.`
                : resumeReplies.reason === "public_outside_org"
                  ? `Auto-replies were NOT resumed on ${canonicalTargetOrPlaceholder(resumeReplies.url)}: ${PUBLIC_OUTSIDE_ORG_WATCH_CAUSE}. No account signed in outside its organization can re-arm them; tell the user, and do not retry.`
                  : resumeReplies.reason === "remote_session"
                    ? 'Auto-replies were NOT resumed: this is a remote session, where comment wakes ride durable watch subscriptions \u2014 use action "watch" to re-register one.'
                    : resumeReplies.reason === "not_stopped"
                      ? `Auto-replies were NOT resumed: no auto-reply stop is recorded for ${canonicalTargetOrPlaceholder(resumeReplies.url)} in this session \u2014 there is nothing to resume (an interrupt's pause already lifts when the user sends a message). Whether auto-replies can arm here at all, and what is armed now, is what action "status" reports (a publish result reports the watch); do not tell the user they are on until status or a result line says so.`
                      : resumeReplies.reason === "stale_consent"
                        ? "Auto-replies were NOT resumed: the approval did not cover the stop that is now recorded \u2014 either a stop landed while the approval was pending, or the approval arrived without its consent-card record. Ask the user, and call resume_replies again only if they still want auto-replies resumed."
                        : resumeReplies.reason === "stop_latched"
                          ? `Auto-replies were NOT resumed: watching ${canonicalTargetOrPlaceholder(resumeReplies.url)} was stopped in this session (an unwatch or a task stop) and the approval did not cover that stop \u2014 it landed after the consent card was shown, or the card never disclosed it. The stop stays in place. Ask the user, and call resume_replies again only if they still want auto-replies resumed.`
                          : resumeReplies.reason === "arm_in_flight"
                            ? `Auto-replies were NOT resumed: a live-watch connection for ${canonicalTargetOrPlaceholder(resumeReplies.url)} that started before the watch was stopped is still winding down, and a resume cannot attach to it \u2014 that connection ends on its own and the stop stays in place. Check action "status"; then ask the user, and call resume_replies again only if they still want auto-replies resumed.`
                            : resumeReplies.reason === "cancelled"
                              ? 'Auto-replies were NOT resumed: the request was interrupted before the live watch finished connecting, so the auto-reply stop stays in place (a connection already under way may still complete as a plain version watch \u2014 action "status" shows it). Ask the user, and call resume_replies again only if they still want auto-replies resumed.'
                              : resumeReplies.reason === "stopped_again"
                                ? `Auto-replies were NOT resumed: the user stopped them again on ${canonicalTargetOrPlaceholder(resumeReplies.url)} (or interrupted the session) while the resume was connecting. That newer stop stays in place \u2014 do not retry unless the user asks again. (The connection itself completes as a plain version watch \u2014 action "status" shows it.)`
                                : resumeReplies.reason === "not_enabled"
                                  ? "Auto-replies were NOT resumed: this session has not opted into automatic comment replies, so a resume has nothing it could re-enable. The stop was left as it was; do not retry in this session."
                                  : `Auto-replies were NOT resumed (${clipUnknown(resumeReplies.outcome)}${resumeReplies.reason !== undefined ? `: ${clipUnknown(resumeReplies.reason)}` : ""}). The live watch could not be re-armed.`;
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content,
      };
    }
    return throwUnroutedArtifactAction("watch.resume_replies", toolResult);
  },
  watches(toolResult, toolUseId) {
    if ("watches" in toolResult) {
      if (!Array.isArray(toolResult.watches))
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content:
            'This record of the artifact watches is unreadable \u2014 run action "status" again for the live list.',
        };
      let retryHint = 'run action "status" again for the live list';
      let watchRows = capResultRows(toolResult.watches);
      let rows = watchRows.rows;
      let allUnreadable = rows.length === 0 && watchRows.unreadable > 0;
      let armRows = capResultRows(toolResult.arms);
      let rows_2 = armRows.rows;
      let armsUnreadable = toolResult.arms !== undefined && !Array.isArray(toolResult.arms);
      let roomRows = capResultRows(toolResult.rooms);
      let rows_3 = roomRows.rows;
      let roomsUnreadable = toolResult.rooms !== undefined && !Array.isArray(toolResult.rooms);
      if (
        allUnreadable &&
        rows_2.length === 0 &&
        !armsUnreadable &&
        armRows.unreadable === 0 &&
        rows_3.length === 0 &&
        !roomsUnreadable &&
        roomRows.unreadable === 0
      )
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content:
            `No row of this record of the artifact watches could be read \u2014 ${retryHint}.` +
            formatRowsOmittedNote(
              {
                ...watchRows,
                unreadable: 0,
              },
              "this record",
              retryHint,
            ),
        };
      let any = rows.some((row) => "rail" in row && row.rail === "durable_wake");
      let { watching, stopped } = splitWatchRows(rows);
      let headline = `${watching} artifact ${plural(watching, "watch", "watches")} in this session${any ? "" : ` (session-local; ${resumeWatchNote(artifactCommentsPromptGateOpen())})`}${stopped > 0 ? `, plus ${stopped} ${plural(stopped, "artifact")} with auto-replies paused or stopped and no connection` : ""}:
`;
      let hasFilterUrl = toolResult.filter_url !== undefined;
      let noReadableRows = allUnreadable
        ? `No row of this record of the artifact watches could be read \u2014 ${retryHint}.`
        : rows.length === 0
          ? hasFilterUrl
            ? `No artifact watch on ${canonicalTargetOrPlaceholder(toolResult.filter_url)} in this session.`
            : env.CLAUDE_CODE_REMOTE
              ? "No artifact watches in this session. In a remote session a watch is a durable wake subscription held by the artifact service (it outlives the session); publishing normally registers one, and the publish result says whether registration began."
              : isFrameLiveSubscribeEnabled()
                ? `No artifact watches in this session. Publishing an artifact from this session normally arms one \u2014 the publish result says whether the watch armed, and action "status" shows whether auto-replies are on for it; watches are session-local, and ${resumeWatchNote(artifactCommentsPromptGateOpen())}.`
                : "No artifact watches in this session. Live artifact watching is off in this session, so it does not keep track of new versions published elsewhere."
          : headline +
            rows.map((row) =>
              !("rail" in row)
                ? `- ${canonicalTargetOrPlaceholder(row.url)} \u2014 ${row.connected ? (row.connecting === true ? "connecting (handshake not finished; nothing reaches it yet)" : "connected") : "reconnecting"}, ${armedViaWording(labelledArmedVia(row.explicit === true, parseArmedVia(typeof row.armed_via === "string" ? row.armed_via : undefined))).row}${row.auto_reply === undefined || row.auto_reply === "none" ? "" : row.auto_reply === "armed" ? `, ${AUTO_REPLIES_ARMED_TOKEN}` : row.auto_reply === "paused" ? `, ${AUTO_REPLIES_PAUSED_ROW}` : row.auto_reply === "yielded" ? `, ${AUTO_REPLIES_YIELDED_ROW}` : row.auto_reply === "declined" ? `, ${AUTO_REPLIES_DECLINED_ROW}` : row.auto_reply === "denied" ? `, ${AUTO_REPLIES_DENIED_ROW}` : row.auto_reply === "stopped" ? ", auto-replies stopped (the user can ask to resume them)" : row.auto_reply === "disarmed" ? ", auto-replies disarmed for this session" : ""}, since ${formatEpochMsIso(row.since)}${commentCountsClause(row)}`
                : row.rail === "durable_wake"
                  ? `- ${canonicalTargetOrPlaceholder(row.url)} \u2014 durable wake subscription (woken on ${Array.isArray(row.events) && row.events.includes("comment") ? "publish and to-Claude comments" : "publish"}; no live updates), since ${clipUnknown(row.since)}${row.restored === true ? "; restored after this session restarted and not re-verified since (no action needed unless the user asks)" : ""}`
                  : `- ${canonicalTargetOrPlaceholder(row.url)} \u2014 not connected${row.explicit === undefined ? "" : `, ${armedViaWording(labelledArmedVia(row.explicit === true, parseArmedVia(typeof row.armed_via === "string" ? row.armed_via : undefined))).row}`}, ${row.auto_reply === "disarmed" ? "auto-replies disarmed for this session; no comment notifications arrive" : `${row.stop_kind === "interrupt" ? "auto-replies paused by the user's interrupt (Ctrl+C or Stop) and the connection has since dropped \u2014 the next publish of this artifact the user asks for reconnects and resumes them, or the user can ask to resume them (comments sent to Claude meanwhile are answered then); publishing it without being asked, while handling a notification or a wake-up, leaves them paused" : row.stop_kind === "yielded" ? "auto-replies handed to another session of this conversation, which answers the comments now \u2014 a publish of this artifact the user asks for here, or resume_replies when the user asks for it, takes them back (the user asking is not itself the take-back)" : row.stop_kind === "user" ? "auto-replies stopped when the watch was killed or unwatched \u2014 they stay stopped: a publish does not re-arm them; the user can ask to resume them or to watch this artifact again" : "auto-replies stopped"}; no comment notifications arrive until then (do not republish or resume just to re-enable them unless the user asks)`}${row.since === undefined ? "" : `, watching since ${formatEpochMsIso(row.since)}`}`,
            ).join(`
`);
      let roomsNote = roomsUnreadable
        ? `
(This record's list of the artifact rooms joined as an agent is unreadable \u2014 ${retryHint}.)`
        : rows_3.length === 0
          ? roomRows.unreadable > 0
            ? `
(No row of this record's list of joined artifact rooms could be read \u2014 ${retryHint}.)`
            : ""
          : `
${rows_3.length} artifact ${plural(rows_3.length, "room")} joined as an agent:
` +
            rows_3.map(
              (row) =>
                `- ${canonicalTargetOrPlaceholder(row.url)} \u2014 ${row.connected === true ? "connected" : "reconnecting"}, ${numberText(row.peers)} other ${typeof row.peers === "number" && row.peers === 1 ? "peer" : "peers"} seen${describeArtifactPerson(row.viewers, retryHint)}`,
            ).join(`
`);
      let armsNote = armsUnreadable
        ? `(This record's list of other watch activity \u2014 watches connecting, reconnecting, failed or ended \u2014 is unreadable; ${retryHint}.)`
        : rows_2.length > 0
          ? describeUnwatchedState(rows_2, rows.length > 0 || allUnreadable, hasFilterUrl)
          : armRows.unreadable > 0
            ? `(No row of this record's list of other watch activity could be read \u2014 ${retryHint}.)`
            : "";
      let onlyArmsReadable = rows_2.length > 0 && rows.length === 0 && !allUnreadable;
      let nextStep =
        armsNote === ""
          ? noReadableRows
          : onlyArmsReadable
            ? armsNote
            : `${noReadableRows}

${armsNote}`;
      let tail =
        formatRowsOmittedNote(
          allUnreadable
            ? {
                ...watchRows,
                unreadable: 0,
              }
            : watchRows,
          "this record",
          retryHint,
        ) +
        formatRowsOmittedNote(
          rows_2.length === 0
            ? {
                ...armRows,
                unreadable: 0,
              }
            : armRows,
          "this record's list of other watch activity",
          retryHint,
        ) +
        formatRowsOmittedNote(
          rows_3.length === 0
            ? {
                ...roomRows,
                unreadable: 0,
              }
            : roomRows,
          "this record's list of joined artifact rooms",
          retryHint,
        );
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: nextStep + roomsNote + tail,
      };
    }
    return throwUnroutedArtifactAction("watch.watches", toolResult);
  },
};
export { ARTIFACT_WATCH_ACTION_HANDLER, ARTIFACT_WATCH_ACTION_HANDLER_VALUE };
