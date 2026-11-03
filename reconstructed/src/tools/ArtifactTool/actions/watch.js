/**
 * tools/ArtifactTool/actions/watch.ts
 *
 * 2.1.316 新增：watch 动作
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (11)
 * attribution: placement 11
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
  OTHER_ORG_PHRASE,
  LOGIN_OTHER_ORG_REMEDY,
  PUBLIC_OUTSIDE_ORG_NOTE,
} from "../../../services/artifacts/orgScope.js";

//@ chunk-8wvtd8sr.js:252085-252113 placement
/**
 * 惰性注入的监视预备状态引用（当前为 null）。
 */
var watchLiveArmsRef = null;
var watchDurableArmsRef = null;
var watchStatusRef = null;
//@ chunk-8wvtd8sr.js:252113-252894 placement
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
//@ chunk-8wvtd8sr.js:252894-252942 placement
/**
 * 当前是否可能通过监视收到评论（live 通道、评论开关与自动反应都开）。
 */
function isLiveCommentsWatchPossible() {
  return sessionWatchRail() === "live" && artifactCommentsPromptGateOpen() && isAutoReactEnabled();
}
//@ chunk-8wvtd8sr.js:252942-256296 placement
function describeWatchCommentsReach(e, n, s) {
  if (!artifactCommentsPromptGateOpen()) return "";
  if (s === "declined" && e !== "armed")
    return ' Comments on it do NOT reach this session through this watch (auto-replies for this artifact were not approved earlier in the session \u2014 declined or left unanswered \u2014 so it is watched without them); if the user wants them they can say so with the link, and the next watch asks again. Read them with action "comments" when the user asks.';
  if (s === "cannot_edit" && e !== "armed")
    return ' Comments on it do NOT reach this session through this watch (auto-replies arm only on an artifact the user can edit, and this account could not edit it when the watch last connected \u2014 if the user has since been given edit access, unwatch and watch it again to re-check); read them with action "comments" when the user asks.';
  if (s === "unattended_turn" && e !== "armed")
    return ' Comments on it do NOT reach this session through this watch (auto-replies arm only when the user asks for the watch in their own message, and no message from the user started this turn); read them with action "comments" when the user asks.';
  if (s === "not_named_by_user" && e !== "armed")
    return ' Comments on it do NOT reach this session through this watch (auto-replies arm only for an artifact whose link the user gave in their own message, and this link came from elsewhere); if the user wants its comments answered, they can say so with the link. Read them with action "comments" when the user asks.';
  switch (e) {
    case "armed":
      return ` A comment on it sent to Claude reaches this session (its status row says ${AUTO_REPLIES_ARMED_TOKEN}); plain comments never notify \u2014 read them with action "comments" when asked.`;
    case undefined:
      return n
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
      return ` Comments on it do NOT reach this session through this watch (auto-replies are ${clipUnknown(e)}); read them with action "comments" when the user asks.`;
  }
}
//@ chunk-8wvtd8sr.js:256296-258905 placement
function describeUnwatchedState(rows, n, s) {
  let r = isLiveCommentsWatchPossible()
    ? "This session does not keep track of new versions of this artifact or hear comments on it"
    : "This session does not keep track of new versions of this artifact";
  let mapped = rows.map((R) => {
    let T = canonicalTargetOrPlaceholder(R.url);
    let reason = typeof R.reason === "string" ? R.reason : undefined;
    let failures = typeof R.failures === "number" && Number.isFinite(R.failures) ? R.failures : 0;
    let V =
      failures > 0 || R.last_failure !== undefined
        ? ` (${failures} consecutive failed ${plural(failures, "attempt")} so far${R.last_failure !== undefined ? `; last close or error: ${clipUnknown(R.last_failure)}` : ""})`
        : "";
    let M = () => {
      let x = frameLiveSkipReasonPhrase(reason ?? "unknown");
      return x !== null ? `${x}.` : `reason: ${clipUnknown(R.reason)}.`;
    };
    if (R.rail !== undefined) {
      let x = unexpectedWatchFailure(reason ?? "unknown");
      switch (R.state) {
        case "arming":
          return `- ${T} \u2014 not a wake subscription yet: its registration is in flight right now. Check status again in a few seconds before relying on it.`;
        case "failed":
          return `- ${T} \u2014 NOT subscribed: the durable wake subscription failed to register at ${formatEpochMsIso(R.at)} (${clipUnknown(R.reason)}${labelSuffix(R.detail)}) \u2014 ${describeWatchError(reason ?? "unknown", shortLabelOrUndefined(R.server_message))} Nothing will wake this session about this artifact${x === null ? "" : `; ${x}`}.`;
        default:
          return `- ${T} \u2014 no wake subscription (state: ${clipUnknown(R.state)}).`;
      }
    }
    switch (R.state) {
      case "arming":
        return R.reconnect === true
          ? `- ${T} \u2014 reconnecting right now, so nothing reaches this session until it is connected again${V}. Check status again in a few seconds before relying on it.`
          : `- ${T} \u2014 not a watch yet: its first connection is being set up right now${V}. Check status again in a few seconds before relying on it.`;
      case "backing_off":
        return `- ${T} \u2014 not connected: the next reconnect attempt is in about ${numberText(R.next_in_s)}s (as of this status)${V}; it gives up after more than ${numberText(R.max_failures)} consecutive failures, retries on its own until then, and you are told if it has to stop.`;
      case "failed":
        return `- ${T} \u2014 NOT watching: the live subscription failed to arm at ${formatEpochMsIso(R.at)} \u2014 ${M()} ${r}; ${noRewatchAdvice(reason) ?? 'pass action "watch" with its url if you need that'}.`;
      case "ended":
        return `- ${T} \u2014 NOT watching: the watch ended at ${formatEpochMsIso(R.at)} (${clipUnknown(R.reason)}). ${r}; ${noRewatchAdvice(reason) ?? 'pass action "watch" with its url if you need it again'}.`;
      default:
        return `- ${T} \u2014 no live connection (state: ${clipUnknown(R.state)}).`;
    }
  });
  let y = rows.length;
  let any = rows.some((R) => R.rail !== undefined);
  let w = any ? "working" : "connected";
  let A = any ? "working watch" : "live connection";
  return `${n ? `${y} more ${plural(y, "artifact")} with watch activity but no ${A}:` : s ? `No ${w} watch on that artifact in this session; its watch activity:` : `No artifact watch is ${w} in this session; ${y} ${plural(y, "artifact")} with watch activity but no ${A}:`}
${mapped.join(`
`)}`;
}
//@ chunk-8wvtd8sr.js:258905-260320 placement
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
//@ chunk-8wvtd8sr.js:260320-260707 placement
/**
 * 刷新标记为 dirty 的 Artifact 评论计数：在截止时间内并发读取评论（共享中止信号），成功且未降级时更新计数缓存。
 */
async function refreshDirtyCommentCounts(e, signal, credentials) {
  let filtered = e.filter((p) => censusEntry(p)?.dirty === true);
  if (filtered.length === 0) return;
  let h = AbortSignal.any([signal, AbortSignal.timeout(APPROVED_PATH_CHECK_MS)]);
  let results = Promise.all(
    filtered.map(async (p) => {
      let w = censusGeneration(p);
      try {
        let artifactComments = await readArtifactComments(
          {
            slug: p,
            env: claudeAiEnvironment(),
          },
          h,
          credentials,
          "artifact_status_census_read",
          {
            skipBootProbe: isFrameLiveTokenLeaseEnabled(),
          },
        );
        if (artifactComments.err === null && artifactComments.threadsDegraded !== true)
          updateUnreadCounts(p, artifactComments.threads, w, artifactComments.threadsDropped === true);
      } catch {}
    }),
  );
  await withDeadline(results, APPROVED_PATH_CHECK_MS);
}
//@ chunk-8wvtd8sr.js:260707-261425 placement
/**
 * 状态结果中的评论计数子句：未刷新、部分无法计数，或"N 条未读普通评论 / M 条发给 Claude 待回复"，并提示用 comments 动作查看。
 */
function commentCountsClause(entry) {
  if (entry.comments_uncounted === true)
    return '; its comment count is not refreshed yet \u2014 action "comments" shows them';
  let clampCount = (w) =>
    typeof w === "number" && Number.isInteger(w) && w > 0 ? Math.min(w, MAX_FOLDED_COUNT) : 0;
  let unreadPlain = clampCount(entry.unread_plain_comments);
  let awaitingReply = clampCount(entry.summons_awaiting_reply);
  let partiallyCounted = entry.comments_partially_counted === true;
  if (unreadPlain === 0 && awaitingReply === 0)
    return partiallyCounted
      ? '; some of its comments could not be counted \u2014 action "comments" shows them'
      : "";
  let atLeastPrefix = partiallyCounted ? "at least " : "";
  return `; ${[unreadPlain > 0 ? `${atLeastPrefix}${unreadPlain} plain ${plural(unreadPlain, "comment")} (not sent to Claude) you have not read` : "", awaitingReply > 0 ? `${atLeastPrefix}${awaitingReply} sent to Claude still awaiting a reply` : ""].filter((w) => w !== "").join(" and ")} on this Artifact${partiallyCounted ? " (some comments could not be counted)" : ""} \u2014 action "comments" shows them`;
}
//@ chunk-8wvtd8sr.js:261425-261670 placement
function commentCountFields(slug) {
  let n = censusEntry(slug);
  if (n === undefined) return {};
  if (n.dirty)
    return {
      comments_uncounted: true,
    };
  return {
    ...(n.plain > 0 && {
      unread_plain_comments: n.plain,
    }),
    ...(n.awaiting > 0 && {
      summons_awaiting_reply: n.awaiting,
    }),
    ...(n.partial && {
      comments_partially_counted: true,
    }),
  };
}
//@ chunk-8wvtd8sr.js:261670-261964 placement
function resumeWatchNote(e) {
  return `a --resume in an interactive terminal brings back the watch on the most recently used artifact${e ? ` and every watch that was replying to comments, newest first within the ${REFUSED_CAPACITY_HINT}-watch cap, plus any watches a background handoff carried` : ""}; other clients may restore less`;
}
//@ chunk-8wvtd8sr.js:261964-295524 placement
/**
 * watch 动作处理器（监视评论与变更）。
 */
var ARTIFACT_WATCH_ACTION_HANDLER = {
  actions: ["watch", "unwatch", "status", "resume_replies"],
  async checkPermissions(e, n, s) {
    if (n.action === "resume_replies") {
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
      if (!canRearmWatchHere(s))
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
      let r = typeof n.url === "string" ? parseArtifactUrl(n.url) : null;
      runCommentMonitorWithIntent({
        storageV5: s.storageV5,
      });
      let h =
        r === null || !isSlugStopped(r.slug)
          ? null
          : isYieldResumable(r.slug)
            ? "yielded"
            : isSlugSwept(r.slug)
              ? "swept"
              : "killed";
      if (r === null || h === null) {
        if (r !== null && getLiveState().durable.stopLatches.isStopped(r.slug))
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
      if (!isUserDrivenTurn(s.messages))
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
      let y = () => {
        if (planConsentMustDeny(s))
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
      let p = y();
      if (p !== null) return p;
      let liveState = getLiveState();
      let stopLatches = liveState.durable.stopLatches;
      if (s.toolUseId !== undefined) {
        liveState.wakes.resumeSights.note(s.toolUseId, r.slug, stopGeneration(r.slug));
        stopLatches.noteRelatchAsk(s.toolUseId, r.slug);
      }
      let S = stopLatches.isStopped(r.slug)
        ? ", and re-arms the live watch of this artifact (stopped earlier this session)"
        : "";
      await warmShareEntry(r, s, "resume_replies");
      let R = denyOtherOrgArtifact(r, "Auto-replies were not resumed");
      if (R !== null) return R;
      let T = y();
      if (T !== null) return T;
      if (
        h === "yielded" &&
        isYieldResumable(r.slug) &&
        !stopLatches.isStopped(r.slug) &&
        getToolPermissionContext(s).mode !== "plan"
      )
        return {
          behavior: "allow",
          updatedInput: n,
          decisionReason: {
            type: "other",
            reason:
              "Taking automatic comment replies back from another session of this conversation, in a turn the user started",
          },
        };
      let P =
        h === "yielded"
          ? " that another session of this conversation took over"
          : h === "swept"
            ? " that were paused when the user interrupted the session (Ctrl+C or Stop)"
            : " that were stopped earlier this session";
      let L =
        h === "yielded"
          ? RESUME_REASON_GRANT_YIELDED
          : h === "swept"
            ? RESUME_REASON_GRANT_SWEPT
            : RESUME_REASON_GRANT;
      return {
        behavior: "ask",
        message:
          h === "killed"
            ? RESUME_ASK_MESSAGE
            : h === "yielded"
              ? RESUME_ASK_MESSAGE_YIELDED
              : RESUME_ASK_MESSAGE_SWEPT,
        updatedInput: n,
        suppressAlwaysAllowRule: true,
        decisionReason:
          getToolPermissionContext(s).mode === "plan"
            ? {
                type: "safetyCheck",
                reason: `${RESUME_REASON_LEDE}${P} \u2014 ${L}${S}; in plan mode the approval must come from the user, not the auto-permission classifier. ${RESUME_REASON_DENY}`,
                classifierApprovable: false,
              }
            : {
                type: "safetyCheck",
                reason: `${RESUME_REASON_LEDE}${P} \u2014 ${L} for the rest of the session${S}. ${RESUME_REASON_DENY}`,
                classifierApprovable: true,
              },
        localDisplayOnly: true,
      };
    }
    if (n.action === "unwatch" || n.action === "status")
      return {
        behavior: "allow",
        updatedInput: n,
        decisionReason: {
          type: "other",
          reason:
            n.action === "status"
              ? "Reading this session's own artifact watches"
              : "Stopping a watch this session armed",
        },
      };
    if (n.action === "watch") {
      let r = typeof n.url === "string" ? parseArtifactUrl(n.url) : null;
      let h = consentEpochGuard(s.getAppState()).artifactWatchApproved === true;
      let y = r !== null && (frameLiveWatchRows(s, r.slug).length > 0 || durableRowFor(r.slug) !== undefined);
      let { stopLatches, liveDocRegrantSights, firstWatchAskSights } = getLiveState().durable;
      runCommentMonitorWithIntent({
        storageV5: s.storageV5,
      });
      let S = r !== null && stopLatches.isStopped(r.slug);
      if (S && !canRearmWatchHere(s))
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
      if (S && !isUserDrivenTurn(s.messages))
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
      let R = isLiveCommentsWatchPossible();
      let T = repliesConsentWriterFor(s);
      let P =
        r !== null
          ? settleRepliesConsent(T, r.slug, s.toolUseId, s.messages)
          : {
              declined: false,
              approved: false,
            };
      let L = sessionWatchRail() === "durable" && artifactCommentsPromptGateOpen();
      let V = sessionWatchRail() === "live";
      if (L && r !== null && P.declined && !hasClassConsent("standing_job", r.slug))
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
      if (r !== null && s.toolUseId !== undefined) {
        stopLatches.noteRelatchAsk(s.toolUseId, r.slug);
        liveDocRegrantSights.note(s.toolUseId, r.slug, true);
      }
      let M =
        r !== null &&
        R &&
        canRearmWatchHere(s) &&
        isStrictHumanTurn(s.messages) &&
        hasHumanMessageContaining(s.messages, r.slug) &&
        !P.declined &&
        !(isSlugStopped(r.slug) && !isSlugSwept(r.slug)) &&
        !knownNonEditor(r.slug) &&
        !isAutoReactWired(r.slug);
      let x = M && (y || h);
      if (r !== null && !S) {
        if (
          !M &&
          !L &&
          !writeKeepsFlagOffAsk(classifyArtifactConsent(classFactsFor("standing_job", r, s)), s)
        ) {
          if (s.toolUseId !== undefined) firstWatchAskSights.note(s.toolUseId, r.slug, false);
          return {
            behavior: "allow",
            updatedInput: {
              ...n,
              [CONSENT_ASK_TAG]: false,
              [WATCH_ARMS_REPLIES_TAG]: false,
              ...consentPin(n.action, r),
            },
            decisionReason: {
              type: "other",
              reason: "Watching an artifact arms no replies",
            },
          };
        }
        let Z = classifyArtifactConsent(classFactsFor("standing_job", r, s));
        if (!writeKeepsFlagOffAsk(Z, s)) {
          await warmShareEntry(r, s, "watch");
          if (!writeKeepsFlagOffAsk(Z, s)) {
            let ue = decideByClass({
              ruling: Z,
              input: {
                ...n,
                [WATCH_ARMS_REPLIES_TAG]: M,
                ...consentPin(n.action, r),
              },
              context: s,
              slug: r.slug,
              display: artifactCardTitleFor(r, s),
              action: "standing_job",
            });
            if ((M || L) && s.toolUseId !== undefined && (ue.behavior === "ask" || ue.behavior === "allow"))
              noteRepliesConsentAsk(T, r.slug, s.toolUseId, s.messages, ue.behavior === "allow");
            if (s.toolUseId !== undefined)
              firstWatchAskSights.note(
                s.toolUseId,
                r.slug,
                ue.behavior === "ask" && firstWatchAskReachesHuman(s),
              );
            return ue;
          }
        }
      }
      let q = !h;
      if ((y || h) && !S && (!M || P.approved)) {
        if (r !== null && s.toolUseId !== undefined) firstWatchAskSights.note(s.toolUseId, r.slug, false);
        return {
          behavior: "allow",
          updatedInput: {
            ...n,
            [CONSENT_ASK_TAG]: false,
            [WATCH_ARMS_REPLIES_TAG]: false,
            ...consentPin(n.action, r),
          },
          decisionReason: {
            type: "other",
            reason: y
              ? "Already watching this artifact in this session"
              : "Artifact watching already approved this session",
          },
        };
      }
      if (r !== null && s.toolUseId !== undefined && !S)
        firstWatchAskSights.note(s.toolUseId, r.slug, firstWatchAskReachesHuman(s));
      let re =
        isUserDrivenHere(s.messages) &&
        s.messages.some(isHumanTurn) &&
        firstWatchAskReachesHuman(s) &&
        !consentMustDeny(s) &&
        getToolPermissionContext(s).mode !== "dontAsk";
      if (r !== null && s.toolUseId !== undefined && (M || (L && re)))
        noteRepliesConsentAsk(T, r.slug, s.toolUseId, s.messages);
      return {
        behavior: "ask",
        message: S
          ? `Claude wants to watch an artifact whose watch was deliberately stopped earlier this session \u2014 ${watchResumeAskBody(artifactCommentsPromptGateOpen(), R && !P.declined, V)}`
          : x
            ? WATCH_ARM_REPLIES_ASK
            : `Claude wants to watch an artifact \u2014 ${watchAskBody(artifactCommentsPromptGateOpen(), R && !P.declined, V)}`,
        updatedInput: {
          ...n,
          [CONSENT_ASK_TAG]: consentAskCanReachUser(s),
          [WATCH_ARMS_REPLIES_TAG]: M,
          ...consentPin(n.action, r),
        },
        suppressAlwaysAllowRule: true,
        decisionReason: S
          ? {
              type: "safetyCheck",
              reason: rewatchReason({
                live: V,
                replies: M,
                commentWake: L,
                coversSession: q,
              }),
              classifierApprovable: true,
            }
          : M
            ? {
                type: "safetyCheck",
                reason: x
                  ? watchArmsRepliesReason(q)
                  : watchReason({
                      live: V,
                      replies: true,
                      commentWake: L,
                      coversSession: q,
                    }),
                classifierApprovable: true,
              }
            : {
                type: "other",
                reason: watchReason({
                  live: V,
                  replies: false,
                  commentWake: L,
                  coversSession: q,
                }),
              },
        localDisplayOnly: true,
      };
    }
    return throwUnroutedArtifactAction("watch.checkPermissions", n);
  },
  async validateInput(e, n) {
    let { action, url } = n;
    if (action === "watch" || action === "unwatch" || action === "status" || action === "resume_replies")
      return validateArtifactPathInput(action, n, url);
    return throwUnroutedArtifactAction("watch.validateInput", n);
  },
  toAutoClassifierInput(e) {
    if (e?.action === "watch" || e?.action === "unwatch") {
      let n = classifierArtifactTargetFor(e.url, "(no artifact url)");
      if (e.action === "unwatch") return `stop watching artifact \u2192 ${n}`;
      let s = typeof e.url === "string" ? parseArtifactUrl(e.url) : null;
      runCommentMonitorWithIntent();
      let r = s !== null && getLiveState().durable.stopLatches.isStopped(s.slug);
      let h = shareClassifierMarks(s !== null ? getShareEntry(s.slug) : undefined);
      let y = sessionWatchRail();
      let p =
        y === "live" && isAutoReactEnabled()
          ? s !== null && isSlugStopped(s.slug) && !isSlugSwept(s.slug)
            ? WATCH_PROJECTION_REPLIES_STOPPED
            : s !== null && repliesConsentDeclined(s.slug)
              ? WATCH_PROJECTION_REPLIES_DECLINED
              : s !== null && isSlugSwept(s.slug)
                ? WATCH_PROJECTION_REPLIES_PAUSED
                : WATCH_PROJECTION_COMMENTS
          : undefined;
      if (p !== undefined) {
        let S = ` (background connection to claude.ai for the session; notifies on republish${p})`;
        return r
          ? `resume watching an artifact whose watch was stopped earlier in this session \u2192 ${n}${S}${h}`
          : `watch artifact \u2192 ${n}${S}${h}`;
      }
      let w =
        y === "durable" && isArtifactsAvailable()
          ? "republish and to-Claude comment wake-ups"
          : "republish notifications";
      let A =
        y === "durable"
          ? " (durable wake subscription held by the artifact service)"
          : y === "live"
            ? " (background connection to claude.ai for the session)"
            : ` (watching for republishes is not available in this session; the call only reports that${watchDurableArmsRef?.liveDocStreamGateOpen() === true ? watchDurableArmsRef.NO_WATCH_RAIL_COLLAB_CONSENT_CLAUSE : ""})`;
      return r
        ? `resume watching an artifact whose watch was stopped earlier in this session (${w}) \u2192 ${n}${A}${h}`
        : `watch artifact for ${w} \u2192 ${n}${A}${h}`;
    }
    if (e?.action === "resume_replies") {
      let n = classifierArtifactTargetFor(e.url, "(no artifact url)");
      let s = typeof e.url === "string" ? parseArtifactUrl(e.url) : null;
      let r = s !== null ? getShareEntry(s.slug) : undefined;
      let h =
        s === null || !isSlugStopped(s.slug)
          ? "no stop is recorded, so this is a no-op"
          : isSlugSwept(s.slug)
            ? "reverses the stop from the user's Ctrl+C / Stop interrupt, also answering comments sent to Claude since then"
            : "reverses the user's earlier stop of these replies";
      let y =
        s !== null && isSlugStopped(s.slug) && getLiveState().durable.stopLatches.isStopped(s.slug)
          ? "; also resumes watching the artifact, whose watch was stopped earlier in this session"
          : "";
      return `resume unattended auto-replies to comments on artifact \u2192 ${n} (${h}${y})${shareClassifierMarks(r)}`;
    }
    if (e?.action === "status") return "read this session's artifact watches (local state)";
    return throwUnroutedArtifactAction("watch.toAutoClassifierInput", e);
  },
  async description(e, n) {
    if (n?.action === "watch") {
      let s = typeof n.url === "string" ? parseArtifactUrl(n.url) : null;
      return s !== null && getLiveState().durable.stopLatches.isStopped(s.slug)
        ? `Watch a published artifact whose watch was deliberately stopped earlier this session \u2014 ${watchResumeAskBody(artifactCommentsPromptGateOpen(), isLiveCommentsWatchPossible(), sessionWatchRail() === "live")}.`
        : `Watch a published artifact \u2014 ${watchAskBody(artifactCommentsPromptGateOpen(), isLiveCommentsWatchPossible(), sessionWatchRail() === "live")}.`;
    }
    if (n?.action === "unwatch")
      return sessionWatchRail() === "live"
        ? "Stop watching a published artifact \u2014 ends this session's watch of it (it stops keeping track of new versions published elsewhere; automatic replies to its comments stop too); nothing is published or read."
        : "Stop watching a published artifact \u2014 ends this session's watch of it (republish notifications and, in cloud sessions, comment wakes; automatic replies to its comments stop too); nothing is published or read.";
    if (n?.action === "status")
      return "List this session's own artifact watches and their unread-comment counts (read-only).";
    if (n?.action === "resume_replies") {
      let s = typeof n.url === "string" ? parseArtifactUrl(n.url) : null;
      return s !== null && isSlugSwept(s.slug) ? RESUME_ASK_MESSAGE_SWEPT : RESUME_ASK_MESSAGE;
    }
    return throwUnroutedArtifactAction("watch.description", n);
  },
  getToolUseSummary(e) {
    if (e?.action === "watch" || e?.action === "resume_replies") {
      let n = typeof e.url === "string" ? parseArtifactUrl(e.url) : null;
      let s = n !== null ? getShareEntry(n.slug) : undefined;
      let r = shareAudienceMark(s);
      return e.action === "watch"
        ? `watch an artifact for new versions and comments${r}`
        : `resume automatic replies to an artifact's comments${r}`;
    }
    if (e?.action === "unwatch") return "stop watching an artifact";
    if (e?.action === "status") return "list this session's artifact watches (read-only)";
    return throwUnroutedArtifactAction("watch.getToolUseSummary", e);
  },
  async call(e, n, appState, r, h, { consentWriter, takenRepliesAsk }) {
    if (n.action === "status") {
      let sessionId = n.url !== undefined ? (parseArtifactUrl(n.url)?.slug ?? undefined) : undefined;
      let A = isArtifactCommentsEnabled() && artifactCommentsPromptGateOpen();
      if (A)
        await refreshDirtyCommentCounts(
          frameLiveWatchRows(appState, sessionId)
            .filter((R) => R.connected)
            .map((R) => R.slug),
          appState.abortController.signal,
          appState.credentials,
        );
      return {
        data: {
          watches: [
            ...frameLiveWatchRows(appState, sessionId).map((R) => ({
              url: artifactViewerUrlFor({
                slug: R.slug,
                env: claudeAiEnvironment(),
              }),
              task_id: R.taskId,
              since: R.since,
              explicit: R.explicit,
              connected: R.connected,
              ...(isFrameLiveRowConnecting(R) && {
                connecting: true,
              }),
              token_expires_at: R.tokenExpiresAt,
              auto_reply: R.autoReply,
              armed_via: R.armedVia,
              ...(A && commentCountFields(R.slug)),
            })),
            ...frameLiveStoppedRows(appState, sessionId).map((R) => ({
              url: artifactViewerUrlFor({
                slug: R.slug,
                env: claudeAiEnvironment(),
              }),
              rail: "live_stopped",
              ...(R.since !== undefined && {
                since: R.since,
              }),
              ...(R.explicit !== undefined && {
                explicit: R.explicit,
              }),
              ...(R.armedVia !== undefined && {
                armed_via: R.armedVia,
              }),
              auto_reply: R.autoReply,
              stop_kind: R.stopKind,
            })),
            ...durableRowList()
              .filter((R) => sessionId === undefined || R.slug === sessionId)
              .map((R) => ({
                url: artifactViewerUrlFor({
                  slug: R.slug,
                  env: claudeAiEnvironment(),
                }),
                rail: "durable_wake",
                trigger_id: R.triggerId,
                since: R.since,
                events: [...R.events],
                ...(R.restored && {
                  restored: true,
                }),
              })),
          ],
          ...(sessionId !== undefined && {
            filter_url: artifactViewerUrlFor({
              slug: sessionId,
              env: claudeAiEnvironment(),
            }),
          }),
          ...watchArmsStatus(appState, sessionId),
          ...(() => {
            let mapped = (watchStatusRef?.artifactRoomStatus() ?? [])
              .filter((T) => sessionId === undefined || T.slug === sessionId)
              .map((T) => ({
                url: artifactViewerUrlFor({
                  slug: T.slug,
                  env: claudeAiEnvironment(),
                }),
                connected: T.connected,
                peers: T.peers,
                ...(T.viewers.length > 0 && {
                  viewers: T.viewers,
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
    if (n.action === "unwatch") {
      let artifactUrlOrThrow = parseArtifactUrlOrThrow(n.url);
      let { stopLatches, liveDocArmDeclined } = getLiveState().durable;
      let R = stopLatches.recordStop(artifactUrlOrThrow.slug);
      let T =
        forgetSlugIntent(artifactUrlOrThrow.slug, {
          storageV5: appState.storageV5,
        }) !== undefined;
      if (!isSlugYielded(artifactUrlOrThrow.slug)) {
        stopCommentMonitorIntent(artifactUrlOrThrow.slug, {
          storageV5: appState.storageV5,
        });
        import("./chunk-4te7h8m1.js").then((re) => re.notifyTakenOverSlugStopped(artifactUrlOrThrow.slug));
      }
      let P = !liveDocArmDeclined.has(artifactUrlOrThrow.slug);
      liveDocArmDeclined.add(artifactUrlOrThrow.slug);
      let L = unwatchFrameLive(artifactUrlOrThrow.slug, appState, consentWriter);
      let V = watchLiveArmsRef != null && watchLiveArmsRef.stopLiveDocCollab(artifactUrlOrThrow.slug);
      let M = await unwatchArtifactDurably({
        slug: artifactUrlOrThrow.slug,
        context: appState,
      });
      let x = M.wasWatching || L.wasWatching || V;
      R.settle({
        wasWatching: x,
        teardown: M.teardown,
      });
      let q = !stopLatches.isStopped(artifactUrlOrThrow.slug);
      if (q && !T)
        forgetCommentMonitorIntents(artifactUrlOrThrow.slug, {
          storageV5: appState.storageV5,
        });
      if (P && q) liveDocArmDeclined.delete(artifactUrlOrThrow.slug);
      return {
        data: {
          unwatch: {
            url: artifactViewerUrlFor(artifactUrlOrThrow),
            was_watching: x,
          },
        },
      };
    }
    if (n.action === "watch") {
      let artifactUrlOrThrow = parseArtifactUrlOrThrow(n.url);
      let url = artifactViewerUrlFor(artifactUrlOrThrow);
      let durable = getLiveState().durable;
      let { stopLatches } = durable;
      runCommentMonitorWithIntent({
        storageV5: appState.storageV5,
      });
      let T =
        appState.toolUseId !== undefined
          ? stopLatches.takeRelatchAsk(appState.toolUseId, artifactUrlOrThrow.slug)
          : undefined;
      let P =
        appState.toolUseId === undefined ||
        durable.liveDocRegrantSights.take(appState.toolUseId, artifactUrlOrThrow.slug) === true;
      let L =
        appState.toolUseId !== undefined &&
        durable.firstWatchAskSights.take(appState.toolUseId, artifactUrlOrThrow.slug) === true;
      if (consentTargetChanged(n, "watch", artifactUrlOrThrow.slug))
        throw new ArtifactInputError(
          "`action` or `url` no longer names the artifact watch that was approved \u2014 nothing was armed; retry so it is checked again",
          "watch_target_changed",
        );
      if (
        T !== undefined &&
        !isDelegatedObservationContext(appState.agentContext) &&
        canRearmWatchHere(appState)
      ) {
        stopLatches.clearByApprovedRewatch(artifactUrlOrThrow.slug, T);
        if (!stopLatches.isStopped(artifactUrlOrThrow.slug))
          forgetCommentMonitorIntents(artifactUrlOrThrow.slug, {
            storageV5: appState.storageV5,
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
      let repliesApproved = approveTakenRepliesConsent(
        consentWriter,
        takenRepliesAsk,
        artifactUrlOrThrow.slug,
        (consentAskReachedUser(n, appState) && repliesAskAnsweredByHuman(appState)) ||
          classAskStands(appState, "standing_job", artifactUrlOrThrow.slug),
      );
      if (
        L &&
        firstWatchAskReachesHuman(appState) &&
        !isDelegatedObservationContext(appState.agentContext) &&
        canRearmWatchHere(appState) &&
        isUserDrivenTurn(appState.messages)
      )
        stopLatches.noteApprovedWatch(artifactUrlOrThrow.slug);
      if (P && !isDelegatedObservationContext(appState.agentContext))
        durable.liveDocArmDeclined.delete(artifactUrlOrThrow.slug);
      let M;
      if (env.CLAUDE_CODE_REMOTE) {
        let outcome = await watchArtifactDurably({
          slug: artifactUrlOrThrow.slug,
          context: appState,
        });
        if (outcome.outcome === "subscribed" || outcome.outcome === "already_watching")
          pullStaleWatchLifecycleNotices(artifactUrlOrThrow.slug);
        if (outcome.outcome !== "skipped") {
          if (consentPinMatches(n, "watch", artifactUrlOrThrow.slug)) stampArtifactWatchConsent(n, appState);
          let me =
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
                ...(me !== undefined && {
                  liveDocCollab: "remote_session",
                  note: me,
                }),
              },
            },
          };
        }
        M = outcome.reason;
      }
      let { publishContext } = derivePublishContext(appState);
      let tool = e.tool;
      let re = watchFrameLive({
        slug: artifactUrlOrThrow.slug,
        url,
        publishContext,
        getKnownVer: makeArtifactReadVersionReader(appState.getAppState, artifactUrlOrThrow.slug),
        context: appState,
        tool,
        commentVerbsInSchema: artifactCommentsPromptGateOpen(),
        repliesApproved,
      });
      let [Z, ue] = await Promise.all([
        watchLiveArmsRef != null
          ? watchLiveArmsRef.armWatchActionCollab({
              slug: artifactUrlOrThrow.slug,
              input: n,
              livePaths: artifactLivePathsSchemaOpen(),
              url,
              context: appState,
            })
          : undefined,
        re,
      ]);
      let we = ue.outcome !== "skipped";
      if (sessionWatchRail() === "live" || we) {
        if (consentPinMatches(n, "watch", artifactUrlOrThrow.slug)) stampArtifactWatchConsent(n, appState);
      }
      let Ie = we ? frameLiveWatchRows(appState, artifactUrlOrThrow.slug)[0] : undefined;
      let degraded =
        ue.outcome !== "skipped" && Ie !== undefined && Ie.autoReply === "none" ? ue.degraded : undefined;
      let _e =
        Z ??
        (env.CLAUDE_CODE_REMOTE &&
        watchLiveArmsRef != null &&
        watchLiveArmsRef.hasProbedLiveFile(artifactUrlOrThrow.slug)
          ? "remote_session"
          : undefined);
      return {
        data: {
          watch: {
            url,
            watching: we,
            outcome: ue.outcome,
            ...(ue.outcome === "skipped" && {
              reason: ue.reason,
            }),
            ...(ue.outcome === "skipped" &&
              M !== undefined && {
                durable_skip_reason: M,
              }),
            ...(Ie && {
              task_id: Ie.taskId,
              since: Ie.since,
              token_expires_at: Ie.tokenExpiresAt,
              auto_reply: Ie.autoReply,
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
            ...(_e !== undefined && {
              liveDocCollab: _e,
            }),
            ...(_e !== undefined &&
              watchLiveArmsRef != null &&
              artifactLivePathsSchemaOpen() &&
              watchLiveArmsRef.livePathFrom(n) !== undefined &&
              watchLiveArmsRef.hasSeveralLiveFiles(artifactUrlOrThrow.slug) && {
                liveDocPath: watchLiveArmsRef.livePathFrom(n),
              }),
          },
        },
      };
    }
    if (n.action === "resume_replies") {
      let artifactUrlOrThrow = parseArtifactUrlOrThrow(n.url);
      let url = artifactViewerUrlFor(artifactUrlOrThrow);
      let liveState = getLiveState();
      let stopLatches = liveState.durable.stopLatches;
      let T =
        appState.toolUseId === undefined
          ? undefined
          : stopLatches.takeRelatchAsk(appState.toolUseId, artifactUrlOrThrow.slug);
      let P =
        appState.toolUseId === undefined
          ? undefined
          : liveState.wakes.resumeSights.take(appState.toolUseId, artifactUrlOrThrow.slug);
      let approvedRelatchGen = isDelegatedObservationContext(appState.agentContext) ? undefined : T;
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
        P !== stopGeneration(artifactUrlOrThrow.slug) &&
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
      let { publishContext } = derivePublishContext(appState);
      let M = isSlugSwept(artifactUrlOrThrow.slug);
      let x = await resumeFrameLiveAutoReplies({
        slug: artifactUrlOrThrow.slug,
        url,
        publishContext,
        getKnownVer: makeArtifactReadVersionReader(appState.getAppState, artifactUrlOrThrow.slug),
        context: appState,
        tool: e.tool,
        commentVerbsInSchema: artifactCommentsPromptGateOpen(),
        approvedRelatchGen,
      });
      let resumed = x.outcome === "armed";
      return {
        data: {
          resume_replies: {
            url,
            resumed,
            outcome: x.outcome,
            ...((x.outcome === "skipped" || x.outcome === "refused") && {
              reason: x.reason,
            }),
            ...(x.outcome === "armed" && {
              task_id: x.taskId,
              stop_kind: M ? "interrupt" : "user",
              ...(x.inPlace === true && {
                in_place: true,
              }),
              ...(x.connecting === true && {
                connecting: true,
              }),
            }),
          },
        },
      };
    }
    return throwUnroutedArtifactAction("watch.call", n);
  },
};
var ARTIFACT_WATCH_ACTION_HANDLER_VALUE = {
  watch(e, toolUseId) {
    if ("watch" in e) {
      let watch = typeof e.watch === "object" && e.watch !== null ? e.watch : {};
      if (watch.rail === "durable_wake") {
        let liveDocCollab = typeof watch.liveDocCollab === "string" ? watch.liveDocCollab : undefined;
        let T =
          watch.watching === true && watchLiveArmsRef != null && liveDocCollab !== undefined
            ? watchLiveArmsRef.durableLiveDocWatchLead(canonicalTargetOrPlaceholder(watch.url))
            : "";
        let content =
          watch.watching === true
            ? `${T}Durable wake subscription on ${canonicalTargetOrPlaceholder(watch.url)} \u2014 ${clipLabel(watch.note) ?? `this session will be woken by a new turn when the artifact is ${Array.isArray(watch.events) && watch.events.includes("comment") ? "republished or a comment on it is sent to Claude" : "next published"}; no live updates are streamed, so re-read the artifact on wake.`}`
            : `No durable wake subscription on ${canonicalTargetOrPlaceholder(watch.url)}${typeof watch.reason === "string" ? ` (${clipUnknown(watch.reason)}${labelSuffix(watch.detail)})` : ""} \u2014 ${clipLabel(watch.note) ?? "could not register one; publishing and reading still work."}`;
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content,
        };
      }
      let r =
        watch.token_expires_at !== undefined
          ? " It reconnects on its own if the connection drops or its credential expires; you will be told if reconnecting has to stop."
          : "";
      let liveDocPath = watch.liveDocPath;
      let y =
        watchLiveArmsRef != null
          ? watchLiveArmsRef.liveDocWatchCollabLine(
              typeof watch.liveDocCollab === "string" ? watch.liveDocCollab : undefined,
              canonicalTargetOrPlaceholder(watch.url),
              typeof liveDocPath === "string" && SAFE_ARTIFACT_PATH_RE.test(liveDocPath)
                ? liveDocPath
                : undefined,
            )
          : "";
      let p =
        watch.durable_skip_reason === undefined
          ? ""
          : ` This remote session's durable wake rail was skipped as well: ${watch.durable_skip_reason === "no_wake_minter" ? "no wake-webhook minter is available (the session's own MCP mount was not found)" : watch.durable_skip_reason === "stop_latched" ? "watching this artifact was stopped earlier in this session (do not retry on your own)" : clipUnknown(watch.durable_skip_reason)}.`;
      let w = () => {
        let R = artifactCommentsPromptGateOpen();
        return `${y}Not watching ${canonicalTargetOrPlaceholder(watch.url)} \u2014 watching an artifact for new versions${R ? " and comments" : ""} isn't supported yet from remote sessions, so nothing will notify this session. ${R ? "Publishing, reading comments, and replying still work here." : "Publishing still works here."} To watch it, the user can run \`claude --watch-artifact ${canonicalTargetOrPlaceholder(watch.url)}\` in Claude Code on their own machine.`;
      };
      let A = () => {
        let R = artifactCommentsPromptGateOpen();
        return `${y}Not watching ${canonicalTargetOrPlaceholder(watch.url)} \u2014 this cloud session is bound to the desktop it was started from, and that device's trusted-device check means new versions${R ? " and comments" : ""} on the artifact can't wake it. ${R ? "Publishing, reading comments, and replying still work here." : "Publishing still works here."} To be woken, the user can publish from a Claude Code cloud session started on the web, or run \`claude --watch-artifact ${canonicalTargetOrPlaceholder(watch.url)}\` in Claude Code on their own machine.`;
      };
      let content =
        watch.watching === true
          ? `${y}Watching ${canonicalTargetOrPlaceholder(watch.url)} \u2014 the watch is armed (\`status\` shows whether it has connected yet); this session keeps track of new versions published elsewhere; a new version starts no turn and sends no notification (watch is session-local; ${resumeWatchNote(artifactCommentsPromptGateOpen())}).${describeWatchCommentsReach(typeof watch.auto_reply === "string" ? watch.auto_reply : undefined, watch.task_id === undefined, watch.can_edit === false ? "cannot_edit" : watch.user_turn === false ? "unattended_turn" : watch.named_by_user === false ? "not_named_by_user" : watch.replies_declined === true ? "declined" : undefined)}${r}`
          : watch.durable_skip_reason === "tool_not_offered" ||
              watch.durable_skip_reason === "org_not_enabled" ||
              watch.durable_skip_reason === "relay_not_served"
            ? w()
            : watch.durable_skip_reason === "session_device_bound"
              ? A()
              : `${y}Not watching ${canonicalTargetOrPlaceholder(watch.url)} \u2014 ${describeLiveSubscriptionState(watch.reason ?? watch.outcome)}${p}`;
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content,
      };
    }
    return throwUnroutedArtifactAction("watch.watch", e);
  },
  unwatch(e, toolUseId) {
    if ("unwatch" in e) {
      let unwatch = typeof e.unwatch === "object" && e.unwatch !== null ? e.unwatch : {};
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
    return throwUnroutedArtifactAction("watch.unwatch", e);
  },
  resume_replies(e, toolUseId) {
    if ("resume_replies" in e) {
      let resumeReplies =
        typeof e.resume_replies === "object" && e.resume_replies !== null ? e.resume_replies : {};
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
                ? `Auto-replies were NOT resumed on ${canonicalTargetOrPlaceholder(resumeReplies.url)}: ${OTHER_ORG_PHRASE}. Nothing here can re-arm them until ${LOGIN_OTHER_ORG_REMEDY}; tell the user.`
                : resumeReplies.reason === "public_outside_org"
                  ? `Auto-replies were NOT resumed on ${canonicalTargetOrPlaceholder(resumeReplies.url)}: ${PUBLIC_OUTSIDE_ORG_NOTE}. No account signed in outside its organization can re-arm them; tell the user, and do not retry.`
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
    return throwUnroutedArtifactAction("watch.resume_replies", e);
  },
  watches(e, toolUseId) {
    if ("watches" in e) {
      if (!Array.isArray(e.watches))
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content:
            'This record of the artifact watches is unreadable \u2014 run action "status" again for the live list.',
        };
      let s = 'run action "status" again for the live list';
      let r = capResultRows(e.watches);
      let rows = r.rows;
      let y = rows.length === 0 && r.unreadable > 0;
      let p = capResultRows(e.arms);
      let rows_2 = p.rows;
      let A = e.arms !== undefined && !Array.isArray(e.arms);
      let S = capResultRows(e.rooms);
      let rows_3 = S.rows;
      let T = e.rooms !== undefined && !Array.isArray(e.rooms);
      if (
        y &&
        rows_2.length === 0 &&
        !A &&
        p.unreadable === 0 &&
        rows_3.length === 0 &&
        !T &&
        S.unreadable === 0
      )
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content:
            `No row of this record of the artifact watches could be read \u2014 ${s}.` +
            formatRowsOmittedNote(
              {
                ...r,
                unreadable: 0,
              },
              "this record",
              s,
            ),
        };
      let any = rows.some((ie) => "rail" in ie && ie.rail === "durable_wake");
      let { watching, stopped } = splitWatchRows(rows);
      let M = `${watching} artifact ${plural(watching, "watch", "watches")} in this session${any ? "" : ` (session-local; ${resumeWatchNote(artifactCommentsPromptGateOpen())})`}${stopped > 0 ? `, plus ${stopped} ${plural(stopped, "artifact")} with auto-replies paused or stopped and no connection` : ""}:
`;
      let x = e.filter_url !== undefined;
      let q = y
        ? `No row of this record of the artifact watches could be read \u2014 ${s}.`
        : rows.length === 0
          ? x
            ? `No artifact watch on ${canonicalTargetOrPlaceholder(e.filter_url)} in this session.`
            : env.CLAUDE_CODE_REMOTE
              ? "No artifact watches in this session. In a remote session a watch is a durable wake subscription held by the artifact service (it outlives the session); publishing normally registers one, and the publish result says whether registration began."
              : isFrameLiveSubscribeEnabled()
                ? `No artifact watches in this session. Publishing an artifact from this session normally arms one \u2014 the publish result says whether the watch armed, and action "status" shows whether auto-replies are on for it; watches are session-local, and ${resumeWatchNote(artifactCommentsPromptGateOpen())}.`
                : "No artifact watches in this session. Live artifact watching is off in this session, so it does not keep track of new versions published elsewhere."
          : M +
            rows.map((ie) =>
              !("rail" in ie)
                ? `- ${canonicalTargetOrPlaceholder(ie.url)} \u2014 ${ie.connected ? (ie.connecting === true ? "connecting (handshake not finished; nothing reaches it yet)" : "connected") : "reconnecting"}, ${armedViaWording(labelledArmedVia(ie.explicit === true, parseArmedVia(typeof ie.armed_via === "string" ? ie.armed_via : undefined))).row}${ie.auto_reply === undefined || ie.auto_reply === "none" ? "" : ie.auto_reply === "armed" ? `, ${AUTO_REPLIES_ARMED_TOKEN}` : ie.auto_reply === "paused" ? `, ${AUTO_REPLIES_PAUSED_ROW}` : ie.auto_reply === "yielded" ? `, ${AUTO_REPLIES_YIELDED_ROW}` : ie.auto_reply === "declined" ? `, ${AUTO_REPLIES_DECLINED_ROW}` : ie.auto_reply === "denied" ? `, ${AUTO_REPLIES_DENIED_ROW}` : ie.auto_reply === "stopped" ? ", auto-replies stopped (the user can ask to resume them)" : ie.auto_reply === "disarmed" ? ", auto-replies disarmed for this session" : ""}, since ${formatEpochMsIso(ie.since)}${commentCountsClause(ie)}`
                : ie.rail === "durable_wake"
                  ? `- ${canonicalTargetOrPlaceholder(ie.url)} \u2014 durable wake subscription (woken on ${Array.isArray(ie.events) && ie.events.includes("comment") ? "publish and to-Claude comments" : "publish"}; no live updates), since ${clipUnknown(ie.since)}${ie.restored === true ? "; restored after this session restarted and not re-verified since (no action needed unless the user asks)" : ""}`
                  : `- ${canonicalTargetOrPlaceholder(ie.url)} \u2014 not connected${ie.explicit === undefined ? "" : `, ${armedViaWording(labelledArmedVia(ie.explicit === true, parseArmedVia(typeof ie.armed_via === "string" ? ie.armed_via : undefined))).row}`}, ${ie.auto_reply === "disarmed" ? "auto-replies disarmed for this session; no comment notifications arrive" : `${ie.stop_kind === "interrupt" ? "auto-replies paused by the user's interrupt (Ctrl+C or Stop) and the connection has since dropped \u2014 the next publish of this artifact the user asks for reconnects and resumes them, or the user can ask to resume them (comments sent to Claude meanwhile are answered then); publishing it without being asked, while handling a notification or a wake-up, leaves them paused" : ie.stop_kind === "yielded" ? "auto-replies handed to another session of this conversation, which answers the comments now \u2014 a publish of this artifact the user asks for here, or resume_replies when the user asks for it, takes them back (the user asking is not itself the take-back)" : ie.stop_kind === "user" ? "auto-replies stopped when the watch was killed or unwatched \u2014 they stay stopped: a publish does not re-arm them; the user can ask to resume them or to watch this artifact again" : "auto-replies stopped"}; no comment notifications arrive until then (do not republish or resume just to re-enable them unless the user asks)`}${ie.since === undefined ? "" : `, watching since ${formatEpochMsIso(ie.since)}`}`,
            ).join(`
`);
      let re = T
        ? `
(This record's list of the artifact rooms joined as an agent is unreadable \u2014 ${s}.)`
        : rows_3.length === 0
          ? S.unreadable > 0
            ? `
(No row of this record's list of joined artifact rooms could be read \u2014 ${s}.)`
            : ""
          : `
${rows_3.length} artifact ${plural(rows_3.length, "room")} joined as an agent:
` +
            rows_3.map(
              (ie) =>
                `- ${canonicalTargetOrPlaceholder(ie.url)} \u2014 ${ie.connected === true ? "connected" : "reconnecting"}, ${numberText(ie.peers)} other ${typeof ie.peers === "number" && ie.peers === 1 ? "peer" : "peers"} seen${describeArtifactPerson(ie.viewers, s)}`,
            ).join(`
`);
      let Z = A
        ? `(This record's list of other watch activity \u2014 watches connecting, reconnecting, failed or ended \u2014 is unreadable; ${s}.)`
        : rows_2.length > 0
          ? describeUnwatchedState(rows_2, rows.length > 0 || y, x)
          : p.unreadable > 0
            ? `(No row of this record's list of other watch activity could be read \u2014 ${s}.)`
            : "";
      let ue = rows_2.length > 0 && rows.length === 0 && !y;
      let we =
        Z === ""
          ? q
          : ue
            ? Z
            : `${q}

${Z}`;
      let Ie =
        formatRowsOmittedNote(
          y
            ? {
                ...r,
                unreadable: 0,
              }
            : r,
          "this record",
          s,
        ) +
        formatRowsOmittedNote(
          rows_2.length === 0
            ? {
                ...p,
                unreadable: 0,
              }
            : p,
          "this record's list of other watch activity",
          s,
        ) +
        formatRowsOmittedNote(
          rows_3.length === 0
            ? {
                ...S,
                unreadable: 0,
              }
            : S,
          "this record's list of joined artifact rooms",
          s,
        );
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: we + re + Ie,
      };
    }
    return throwUnroutedArtifactAction("watch.watches", e);
  },
};
export { ARTIFACT_WATCH_ACTION_HANDLER, ARTIFACT_WATCH_ACTION_HANDLER_VALUE };
