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
  Wce,
  Ov,
  formatEpochMsIso,
  Wvo,
  $Hs,
  G7,
  throwUnroutedArtifactAction,
  jvo,
  describeLiveSubscriptionState,
  capResultRows,
  formatRowsOmittedNote,
  describeArtifactPerson,
} from "../../../services/artifacts/artifactPeople.js";
import { plural } from "../../../utils/stringUtils.js";
import {
  bDr,
  describeWatchError,
  describeWatchHttpStatus,
  Hye,
  nWn,
  unwatchArtifactDurably,
  watchArtifactDurably,
} from "../../../services/artifacts/durableWatch.js";
import { kzn, bFt, updateUnreadCounts, HDr } from "../../../services/artifacts/comments/threadPrompts.js";
import { APPROVED_PATH_CHECK_MS } from "../permissions/approvedPaths.js";
import { readArtifactComments } from "../../../services/artifacts/comments/commentsRead.js";
import {
  isFrameLiveTokenLeaseEnabled,
  isFrameLiveSubscribeEnabled,
} from "../../../services/artifacts/frameFlags.js";
import { withDeadline } from "../../../utils/sleep.js";
import { FT, getLiveState } from "../../../services/liveReplica/liveReplica.js";
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
  v5,
  isAutoReactWired,
  _Us,
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
import { i5e, b3, classifyArtifactConsent } from "../../../services/artifacts/consentClasses.js";
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
import { Xb } from "../../../services/artifacts/artifactAvailability.js";
import { isArtifactCommentsEnabled } from "../../../services/artifacts/comments/commentsGate.js";
import { isDelegatedObservationContext } from "../../../utils/agentContext.js";
import { logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { eKs } from "../../../services/artifacts/artifactToolGates.js";
import {
  OTHER_ORG_PHRASE,
  LOGIN_OTHER_ORG_REMEDY,
  PUBLIC_OUTSIDE_ORG_NOTE,
} from "../../../services/artifacts/orgScope.js";

//@ chunk-8wvtd8sr.js:252085-252113 placement
var Bn = null,
  Oh = null,
  hb = null;
/**
 * status 中的监视状态：列出 Frame live 预备行（arming/backing_off/failed/ended 及重试信息）与 durable wake 行。
 */
//@ chunk-8wvtd8sr.js:252113-252894 placement
function watchArmsStatus(appState, sessionId) {
  let liveArms = frameLiveArmRows(appState, sessionId),
    durableArms = listDurableArmStates(sessionId);
  if (liveArms.length === 0 && durableArms.length === 0) return {};
  let environment = claudeAiEnvironment(),
    now = Date.now();
  return {
    arms: [
      ...liveArms.map((p) => ({
        url: artifactViewerUrlFor({ slug: p.slug, env: environment }),
        state: p.state,
        ...(p.state === "arming" && { reconnect: p.reconnect, failures: p.failures }),
        ...(p.state === "backing_off" && {
          failures: p.failures,
          max_failures: p.maxFailures,
          next_in_s: Math.max(0, Math.round((p.nextAt - now) / 1000)),
        }),
        ...((p.state === "arming" || p.state === "backing_off") &&
          p.lastFailure !== void 0 && { last_failure: p.lastFailure }),
        ...((p.state === "failed" || p.state === "ended") && { reason: p.reason, at: p.at }),
      })),
      ...durableArms.map((p) => ({
        url: artifactViewerUrlFor({ slug: p.slug, env: environment }),
        rail: "durable_wake",
        state: p.state,
        ...(p.state === "failed" && {
          reason: p.reason,
          ...(p.detail !== void 0 && { detail: p.detail }),
          ...(p.serverMessage !== void 0 && { server_message: p.serverMessage }),
          at: p.at,
        }),
      })),
    ],
  };
}
//@ chunk-8wvtd8sr.js:252894-252942 placement
function Wa() {
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
    case void 0:
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
      return ` Comments on it do NOT reach this session through this watch (auto-replies are ${Wce(e)}); read them with action "comments" when the user asks.`;
  }
}
//@ chunk-8wvtd8sr.js:256296-258905 placement
function describeUnwatchedState(e, n, s) {
  let r = Wa()
      ? "This session does not keep track of new versions of this artifact or hear comments on it"
      : "This session does not keep track of new versions of this artifact",
    mapped = e.map((R) => {
      let T = Ov(R.url),
        P = typeof R.reason === "string" ? R.reason : void 0,
        L = typeof R.failures === "number" && Number.isFinite(R.failures) ? R.failures : 0,
        V =
          L > 0 || R.last_failure !== void 0
            ? ` (${L} consecutive failed ${plural(L, "attempt")} so far${R.last_failure !== void 0 ? `; last close or error: ${Wce(R.last_failure)}` : ""})`
            : "",
        M = () => {
          let x = frameLiveSkipReasonPhrase(P ?? "unknown");
          return x !== null ? `${x}.` : `reason: ${Wce(R.reason)}.`;
        };
      if (R.rail !== void 0) {
        let x = bDr(P ?? "unknown");
        switch (R.state) {
          case "arming":
            return `- ${T} \u2014 not a wake subscription yet: its registration is in flight right now. Check status again in a few seconds before relying on it.`;
          case "failed":
            return `- ${T} \u2014 NOT subscribed: the durable wake subscription failed to register at ${formatEpochMsIso(R.at)} (${Wce(R.reason)}${Wvo(R.detail)}) \u2014 ${describeWatchError(P ?? "unknown", $Hs(R.server_message))} Nothing will wake this session about this artifact${x === null ? "" : `; ${x}`}.`;
          default:
            return `- ${T} \u2014 no wake subscription (state: ${Wce(R.state)}).`;
        }
      }
      switch (R.state) {
        case "arming":
          return R.reconnect === !0
            ? `- ${T} \u2014 reconnecting right now, so nothing reaches this session until it is connected again${V}. Check status again in a few seconds before relying on it.`
            : `- ${T} \u2014 not a watch yet: its first connection is being set up right now${V}. Check status again in a few seconds before relying on it.`;
        case "backing_off":
          return `- ${T} \u2014 not connected: the next reconnect attempt is in about ${G7(R.next_in_s)}s (as of this status)${V}; it gives up after more than ${G7(R.max_failures)} consecutive failures, retries on its own until then, and you are told if it has to stop.`;
        case "failed":
          return `- ${T} \u2014 NOT watching: the live subscription failed to arm at ${formatEpochMsIso(R.at)} \u2014 ${M()} ${r}; ${noRewatchAdvice(P) ?? 'pass action "watch" with its url if you need that'}.`;
        case "ended":
          return `- ${T} \u2014 NOT watching: the watch ended at ${formatEpochMsIso(R.at)} (${Wce(R.reason)}). ${r}; ${noRewatchAdvice(P) ?? 'pass action "watch" with its url if you need it again'}.`;
        default:
          return `- ${T} \u2014 no live connection (state: ${Wce(R.state)}).`;
      }
    }),
    y = e.length,
    any = e.some((R) => R.rail !== void 0),
    w = any ? "working" : "connected",
    A = any ? "working watch" : "live connection";
  return `${n ? `${y} more ${plural(y, "artifact")} with watch activity but no ${A}:` : s ? `No ${w} watch on that artifact in this session; its watch activity:` : `No artifact watch is ${w} in this session; ${y} ${plural(y, "artifact")} with watch activity but no ${A}:`}
${mapped.join(`
`)}`;
}
/**
 * 把 durable wake 订阅结果（subscribed / already_watching / failed / skipped）映射为 watch 结果对象与给模型的说明。
 */
//@ chunk-8wvtd8sr.js:258905-260320 placement
function durableWakeResult(outcome) {
  switch (outcome.outcome) {
    case "subscribed":
      return {
        watching: !0,
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
        watching: !0,
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
        watching: !1,
        outcome: "failed",
        rail: "durable_wake",
        reason: outcome.reason,
        ...(outcome.status !== void 0 && { status: outcome.status }),
        ...(failure !== void 0 && { detail: failure }),
        note: describeWatchError(outcome.reason, outcome.serverMessage),
      };
    }
    case "skipped":
      return { watching: !1, outcome: "skipped", rail: "durable_wake" };
  }
}
/**
 * 刷新标记为 dirty 的 Artifact 评论计数：在截止时间内并发读取评论（共享中止信号），成功且未降级时更新计数缓存。
 */
//@ chunk-8wvtd8sr.js:260320-260707 placement
async function refreshDirtyCommentCounts(e, n, s) {
  let filtered = e.filter((p) => kzn(p)?.dirty === !0);
  if (filtered.length === 0) return;
  let any = AbortSignal.any([n, AbortSignal.timeout(APPROVED_PATH_CHECK_MS)]),
    results = Promise.all(
      filtered.map(async (p) => {
        let w = bFt(p);
        try {
          let A = await readArtifactComments(
            { slug: p, env: claudeAiEnvironment() },
            any,
            s,
            "artifact_status_census_read",
            { skipBootProbe: isFrameLiveTokenLeaseEnabled() },
          );
          if (A.err === null && A.threadsDegraded !== !0)
            updateUnreadCounts(p, A.threads, w, A.threadsDropped === !0);
        } catch {}
      }),
    );
  await withDeadline(results, APPROVED_PATH_CHECK_MS);
}
/**
 * 状态结果中的评论计数子句：未刷新、部分无法计数，或"N 条未读普通评论 / M 条发给 Claude 待回复"，并提示用 comments 动作查看。
 */
//@ chunk-8wvtd8sr.js:260707-261425 placement
function commentCountsClause(entry) {
  if (entry.comments_uncounted === !0)
    return '; its comment count is not refreshed yet \u2014 action "comments" shows them';
  let clampCount = (w) => (typeof w === "number" && Number.isInteger(w) && w > 0 ? Math.min(w, HDr) : 0),
    unreadPlain = clampCount(entry.unread_plain_comments),
    awaitingReply = clampCount(entry.summons_awaiting_reply),
    partiallyCounted = entry.comments_partially_counted === !0;
  if (unreadPlain === 0 && awaitingReply === 0)
    return partiallyCounted
      ? '; some of its comments could not be counted \u2014 action "comments" shows them'
      : "";
  let atLeastPrefix = partiallyCounted ? "at least " : "";
  return `; ${[unreadPlain > 0 ? `${atLeastPrefix}${unreadPlain} plain ${plural(unreadPlain, "comment")} (not sent to Claude) you have not read` : "", awaitingReply > 0 ? `${atLeastPrefix}${awaitingReply} sent to Claude still awaiting a reply` : ""].filter((w) => w !== "").join(" and ")} on this Artifact${partiallyCounted ? " (some comments could not be counted)" : ""} \u2014 action "comments" shows them`;
}
//@ chunk-8wvtd8sr.js:261425-261670 placement
function commentCountFields(e) {
  let n = kzn(e);
  if (n === void 0) return {};
  if (n.dirty) return { comments_uncounted: !0 };
  return {
    ...(n.plain > 0 && { unread_plain_comments: n.plain }),
    ...(n.awaiting > 0 && { summons_awaiting_reply: n.awaiting }),
    ...(n.partial && { comments_partially_counted: !0 }),
  };
}
//@ chunk-8wvtd8sr.js:261670-261964 placement
function resumeWatchNote(e) {
  return `a --resume in an interactive terminal brings back the watch on the most recently used artifact${e ? ` and every watch that was replying to comments, newest first within the ${FT}-watch cap, plus any watches a background handoff carried` : ""}; other clients may restore less`;
}
//@ chunk-8wvtd8sr.js:261964-295524 placement
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
              reason:
                "The session-wide auto-reply disarm is terminal \u2014 a resume is structurally a no-op",
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
        v5({ storageV5: s.storageV5 });
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
              classifierApprovable: !1,
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
                  classifierApprovable: !1,
                },
              };
            return null;
          },
          p = y();
        if (p !== null) return p;
        let w = getLiveState(),
          stopLatches = w.durable.stopLatches;
        if (s.toolUseId !== void 0)
          (w.wakes.resumeSights.note(s.toolUseId, r.slug, stopGeneration(r.slug)),
            stopLatches.noteRelatchAsk(s.toolUseId, r.slug));
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
                : " that were stopped earlier this session",
          L =
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
          suppressAlwaysAllowRule: !0,
          decisionReason:
            getToolPermissionContext(s).mode === "plan"
              ? {
                  type: "safetyCheck",
                  reason: `${RESUME_REASON_LEDE}${P} \u2014 ${L}${S}; in plan mode the approval must come from the user, not the auto-permission classifier. ${RESUME_REASON_DENY}`,
                  classifierApprovable: !1,
                }
              : {
                  type: "safetyCheck",
                  reason: `${RESUME_REASON_LEDE}${P} \u2014 ${L} for the rest of the session${S}. ${RESUME_REASON_DENY}`,
                  classifierApprovable: !0,
                },
          localDisplayOnly: !0,
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
        let r = typeof n.url === "string" ? parseArtifactUrl(n.url) : null,
          h = i5e(s.getAppState()).artifactWatchApproved === !0,
          y = r !== null && (frameLiveWatchRows(s, r.slug).length > 0 || Hye(r.slug) !== void 0),
          {
            stopLatches: stopLatches,
            liveDocRegrantSights: liveDocRegrantSights,
            firstWatchAskSights: firstWatchAskSights,
          } = getLiveState().durable;
        v5({ storageV5: s.storageV5 });
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
              classifierApprovable: !1,
            },
          };
        let R = Wa(),
          T = repliesConsentWriterFor(s),
          P =
            r !== null
              ? settleRepliesConsent(T, r.slug, s.toolUseId, s.messages)
              : { declined: !1, approved: !1 },
          L = sessionWatchRail() === "durable" && artifactCommentsPromptGateOpen(),
          V = sessionWatchRail() === "live";
        if (L && r !== null && P.declined && !b3("standing_job", r.slug))
          return {
            behavior: "deny",
            message:
              "Not starting a watch: an earlier ask in this session, to let Claude reply to this artifact's comments, wasn't approved. If the user wants it watched, their own next message with its link can ask again.",
            decisionReason: {
              type: "safetyCheck",
              reason:
                "Watching an artifact whose comment-replies ask went unapproved this session \u2014 only the user's own new message with its link may ask again",
              classifierApprovable: !1,
            },
          };
        if (r !== null && s.toolUseId !== void 0)
          (stopLatches.noteRelatchAsk(s.toolUseId, r.slug),
            liveDocRegrantSights.note(s.toolUseId, r.slug, !0));
        let M =
            r !== null &&
            R &&
            canRearmWatchHere(s) &&
            isStrictHumanTurn(s.messages) &&
            hasHumanMessageContaining(s.messages, r.slug) &&
            !P.declined &&
            !(isSlugStopped(r.slug) && !isSlugSwept(r.slug)) &&
            !knownNonEditor(r.slug) &&
            !isAutoReactWired(r.slug),
          x = M && (y || h);
        if (r !== null && !S) {
          if (
            !M &&
            !L &&
            !writeKeepsFlagOffAsk(classifyArtifactConsent(classFactsFor("standing_job", r, s)), s)
          ) {
            if (s.toolUseId !== void 0) firstWatchAskSights.note(s.toolUseId, r.slug, !1);
            return {
              behavior: "allow",
              updatedInput: {
                ...n,
                [CONSENT_ASK_TAG]: !1,
                [WATCH_ARMS_REPLIES_TAG]: !1,
                ...consentPin(n.action, r),
              },
              decisionReason: { type: "other", reason: "Watching an artifact arms no replies" },
            };
          }
          let Z = classifyArtifactConsent(classFactsFor("standing_job", r, s));
          if (!writeKeepsFlagOffAsk(Z, s)) {
            if ((await warmShareEntry(r, s, "watch"), !writeKeepsFlagOffAsk(Z, s))) {
              let ue = decideByClass({
                ruling: Z,
                input: { ...n, [WATCH_ARMS_REPLIES_TAG]: M, ...consentPin(n.action, r) },
                context: s,
                slug: r.slug,
                display: artifactCardTitleFor(r, s),
                action: "standing_job",
              });
              if ((M || L) && s.toolUseId !== void 0 && (ue.behavior === "ask" || ue.behavior === "allow"))
                noteRepliesConsentAsk(T, r.slug, s.toolUseId, s.messages, ue.behavior === "allow");
              if (s.toolUseId !== void 0)
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
          if (r !== null && s.toolUseId !== void 0) firstWatchAskSights.note(s.toolUseId, r.slug, !1);
          return {
            behavior: "allow",
            updatedInput: {
              ...n,
              [CONSENT_ASK_TAG]: !1,
              [WATCH_ARMS_REPLIES_TAG]: !1,
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
        if (r !== null && s.toolUseId !== void 0 && !S)
          firstWatchAskSights.note(s.toolUseId, r.slug, firstWatchAskReachesHuman(s));
        let re =
          isUserDrivenHere(s.messages) &&
          s.messages.some(isHumanTurn) &&
          firstWatchAskReachesHuman(s) &&
          !consentMustDeny(s) &&
          getToolPermissionContext(s).mode !== "dontAsk";
        if (r !== null && s.toolUseId !== void 0 && (M || (L && re)))
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
          suppressAlwaysAllowRule: !0,
          decisionReason: S
            ? {
                type: "safetyCheck",
                reason: rewatchReason({ live: V, replies: M, commentWake: L, coversSession: q }),
                classifierApprovable: !0,
              }
            : M
              ? {
                  type: "safetyCheck",
                  reason: x
                    ? watchArmsRepliesReason(q)
                    : watchReason({ live: V, replies: !0, commentWake: L, coversSession: q }),
                  classifierApprovable: !0,
                }
              : {
                  type: "other",
                  reason: watchReason({ live: V, replies: !1, commentWake: L, coversSession: q }),
                },
          localDisplayOnly: !0,
        };
      }
      return throwUnroutedArtifactAction("watch.checkPermissions", n);
    },
    async validateInput(e, n) {
      let { action: action, url: url } = n;
      if (action === "watch" || action === "unwatch" || action === "status" || action === "resume_replies")
        return validateArtifactPathInput(action, n, url);
      return throwUnroutedArtifactAction("watch.validateInput", n);
    },
    toAutoClassifierInput(e) {
      if (e?.action === "watch" || e?.action === "unwatch") {
        let n = classifierArtifactTargetFor(e.url, "(no artifact url)");
        if (e.action === "unwatch") return `stop watching artifact \u2192 ${n}`;
        let s = typeof e.url === "string" ? parseArtifactUrl(e.url) : null;
        v5();
        let r = s !== null && getLiveState().durable.stopLatches.isStopped(s.slug),
          h = shareClassifierMarks(s !== null ? getShareEntry(s.slug) : void 0),
          y = sessionWatchRail(),
          p =
            y === "live" && isAutoReactEnabled()
              ? s !== null && isSlugStopped(s.slug) && !isSlugSwept(s.slug)
                ? WATCH_PROJECTION_REPLIES_STOPPED
                : s !== null && repliesConsentDeclined(s.slug)
                  ? WATCH_PROJECTION_REPLIES_DECLINED
                  : s !== null && isSlugSwept(s.slug)
                    ? WATCH_PROJECTION_REPLIES_PAUSED
                    : WATCH_PROJECTION_COMMENTS
              : void 0;
        if (p !== void 0) {
          let S = ` (background connection to claude.ai for the session; notifies on republish${p})`;
          return r
            ? `resume watching an artifact whose watch was stopped earlier in this session \u2192 ${n}${S}${h}`
            : `watch artifact \u2192 ${n}${S}${h}`;
        }
        let w =
            y === "durable" && Xb() ? "republish and to-Claude comment wake-ups" : "republish notifications",
          A =
            y === "durable"
              ? " (durable wake subscription held by the artifact service)"
              : y === "live"
                ? " (background connection to claude.ai for the session)"
                : ` (watching for republishes is not available in this session; the call only reports that${Oh?.liveDocStreamGateOpen() === !0 ? Oh.NO_WATCH_RAIL_COLLAB_CONSENT_CLAUSE : ""})`;
        return r
          ? `resume watching an artifact whose watch was stopped earlier in this session (${w}) \u2192 ${n}${A}${h}`
          : `watch artifact for ${w} \u2192 ${n}${A}${h}`;
      }
      if (e?.action === "resume_replies") {
        let n = classifierArtifactTargetFor(e.url, "(no artifact url)"),
          s = typeof e.url === "string" ? parseArtifactUrl(e.url) : null,
          r = s !== null ? getShareEntry(s.slug) : void 0,
          h =
            s === null || !isSlugStopped(s.slug)
              ? "no stop is recorded, so this is a no-op"
              : isSlugSwept(s.slug)
                ? "reverses the stop from the user's Ctrl+C / Stop interrupt, also answering comments sent to Claude since then"
                : "reverses the user's earlier stop of these replies",
          y =
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
          ? `Watch a published artifact whose watch was deliberately stopped earlier this session \u2014 ${watchResumeAskBody(artifactCommentsPromptGateOpen(), Wa(), sessionWatchRail() === "live")}.`
          : `Watch a published artifact \u2014 ${watchAskBody(artifactCommentsPromptGateOpen(), Wa(), sessionWatchRail() === "live")}.`;
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
        let n = typeof e.url === "string" ? parseArtifactUrl(e.url) : null,
          s = n !== null ? getShareEntry(n.slug) : void 0,
          r = shareAudienceMark(s);
        return e.action === "watch"
          ? `watch an artifact for new versions and comments${r}`
          : `resume automatic replies to an artifact's comments${r}`;
      }
      if (e?.action === "unwatch") return "stop watching an artifact";
      if (e?.action === "status") return "list this session's artifact watches (read-only)";
      return throwUnroutedArtifactAction("watch.getToolUseSummary", e);
    },
    async call(e, n, s, r, h, { consentWriter: y, takenRepliesAsk: p }) {
      if (n.action === "status") {
        let w = n.url !== void 0 ? (parseArtifactUrl(n.url)?.slug ?? void 0) : void 0,
          A = isArtifactCommentsEnabled() && artifactCommentsPromptGateOpen();
        if (A)
          await refreshDirtyCommentCounts(
            frameLiveWatchRows(s, w)
              .filter((R) => R.connected)
              .map((R) => R.slug),
            s.abortController.signal,
            s.credentials,
          );
        return {
          data: {
            watches: [
              ...frameLiveWatchRows(s, w).map((R) => ({
                url: artifactViewerUrlFor({ slug: R.slug, env: claudeAiEnvironment() }),
                task_id: R.taskId,
                since: R.since,
                explicit: R.explicit,
                connected: R.connected,
                ...(isFrameLiveRowConnecting(R) && { connecting: !0 }),
                token_expires_at: R.tokenExpiresAt,
                auto_reply: R.autoReply,
                armed_via: R.armedVia,
                ...(A && commentCountFields(R.slug)),
              })),
              ...frameLiveStoppedRows(s, w).map((R) => ({
                url: artifactViewerUrlFor({ slug: R.slug, env: claudeAiEnvironment() }),
                rail: "live_stopped",
                ...(R.since !== void 0 && { since: R.since }),
                ...(R.explicit !== void 0 && { explicit: R.explicit }),
                ...(R.armedVia !== void 0 && { armed_via: R.armedVia }),
                auto_reply: R.autoReply,
                stop_kind: R.stopKind,
              })),
              ...nWn()
                .filter((R) => w === void 0 || R.slug === w)
                .map((R) => ({
                  url: artifactViewerUrlFor({ slug: R.slug, env: claudeAiEnvironment() }),
                  rail: "durable_wake",
                  trigger_id: R.triggerId,
                  since: R.since,
                  events: [...R.events],
                  ...(R.restored && { restored: !0 }),
                })),
            ],
            ...(w !== void 0 && {
              filter_url: artifactViewerUrlFor({ slug: w, env: claudeAiEnvironment() }),
            }),
            ...watchArmsStatus(s, w),
            ...(() => {
              let mapped = (hb?.artifactRoomStatus() ?? [])
                .filter((T) => w === void 0 || T.slug === w)
                .map((T) => ({
                  url: artifactViewerUrlFor({ slug: T.slug, env: claudeAiEnvironment() }),
                  connected: T.connected,
                  peers: T.peers,
                  ...(T.viewers.length > 0 && { viewers: T.viewers }),
                }));
              return mapped.length > 0 ? { rooms: mapped } : {};
            })(),
          },
        };
      }
      if (n.action === "unwatch") {
        let w = parseArtifactUrlOrThrow(n.url),
          { stopLatches: stopLatches, liveDocArmDeclined: liveDocArmDeclined } = getLiveState().durable,
          recordStop = stopLatches.recordStop(w.slug),
          T = _Us(w.slug, { storageV5: s.storageV5 }) !== void 0;
        if (!isSlugYielded(w.slug))
          (stopCommentMonitorIntent(w.slug, { storageV5: s.storageV5 }),
            import("./chunk-4te7h8m1.js").then((re) => re.notifyTakenOverSlugStopped(w.slug)));
        let P = !liveDocArmDeclined.has(w.slug);
        liveDocArmDeclined.add(w.slug);
        let L = unwatchFrameLive(w.slug, s, y),
          V = Bn != null && Bn.stopLiveDocCollab(w.slug),
          M = await unwatchArtifactDurably({ slug: w.slug, context: s }),
          x = M.wasWatching || L.wasWatching || V;
        recordStop.settle({ wasWatching: x, teardown: M.teardown });
        let q = !stopLatches.isStopped(w.slug);
        if (q && !T) forgetCommentMonitorIntents(w.slug, { storageV5: s.storageV5 });
        if (P && q) liveDocArmDeclined.delete(w.slug);
        return { data: { unwatch: { url: artifactViewerUrlFor(w), was_watching: x } } };
      }
      if (n.action === "watch") {
        let w = parseArtifactUrlOrThrow(n.url),
          A = artifactViewerUrlFor(w),
          durable = getLiveState().durable,
          { stopLatches: stopLatches } = durable;
        v5({ storageV5: s.storageV5 });
        let T = s.toolUseId !== void 0 ? stopLatches.takeRelatchAsk(s.toolUseId, w.slug) : void 0,
          P = s.toolUseId === void 0 || durable.liveDocRegrantSights.take(s.toolUseId, w.slug) === !0,
          L = s.toolUseId !== void 0 && durable.firstWatchAskSights.take(s.toolUseId, w.slug) === !0;
        if (consentTargetChanged(n, "watch", w.slug))
          throw new ArtifactInputError(
            "`action` or `url` no longer names the artifact watch that was approved \u2014 nothing was armed; retry so it is checked again",
            "watch_target_changed",
          );
        if (T !== void 0 && !isDelegatedObservationContext(s.agentContext) && canRearmWatchHere(s)) {
          if ((stopLatches.clearByApprovedRewatch(w.slug, T), !stopLatches.isStopped(w.slug)))
            forgetCommentMonitorIntents(w.slug, { storageV5: s.storageV5 });
        }
        if (stopLatches.isStopped(w.slug))
          return (
            logFeatureSad(
              env.CLAUDE_CODE_REMOTE ? "artifact_durable_subscribe" : "artifact_live_subscribe",
              "stop_latched",
            ),
            { data: { watch: { url: A, watching: !1, outcome: "skipped", reason: "stop_latched" } } }
          );
        let V = approveTakenRepliesConsent(
          y,
          p,
          w.slug,
          (consentAskReachedUser(n, s) && repliesAskAnsweredByHuman(s)) ||
            classAskStands(s, "standing_job", w.slug),
        );
        if (
          L &&
          firstWatchAskReachesHuman(s) &&
          !isDelegatedObservationContext(s.agentContext) &&
          canRearmWatchHere(s) &&
          isUserDrivenTurn(s.messages)
        )
          stopLatches.noteApprovedWatch(w.slug);
        if (P && !isDelegatedObservationContext(s.agentContext)) durable.liveDocArmDeclined.delete(w.slug);
        let M;
        if (env.CLAUDE_CODE_REMOTE) {
          let Oe = await watchArtifactDurably({ slug: w.slug, context: s });
          if (Oe.outcome === "subscribed" || Oe.outcome === "already_watching")
            pullStaleWatchLifecycleNotices(w.slug);
          if (Oe.outcome !== "skipped") {
            if (consentPinMatches(n, "watch", w.slug)) stampArtifactWatchConsent(n, s);
            let me =
              Bn != null && Oe.outcome !== "failed" && Bn.hasProbedLiveFile(w.slug)
                ? Bn.durableLiveDocWatchNote(Oe.events)
                : void 0;
            return {
              data: {
                watch: {
                  url: A,
                  ...durableWakeResult(Oe),
                  ...(me !== void 0 && { liveDocCollab: "remote_session", note: me }),
                },
              },
            };
          }
          M = Oe.reason;
        }
        let { publishContext: publishContext } = derivePublishContext(s),
          tool = e.tool,
          re = watchFrameLive({
            slug: w.slug,
            url: A,
            publishContext: publishContext,
            getKnownVer: makeArtifactReadVersionReader(s.getAppState, w.slug),
            context: s,
            tool: tool,
            commentVerbsInSchema: artifactCommentsPromptGateOpen(),
            repliesApproved: V,
          }),
          [Z, ue] = await Promise.all([
            Bn != null
              ? Bn.armWatchActionCollab({
                  slug: w.slug,
                  input: n,
                  livePaths: artifactLivePathsSchemaOpen(),
                  url: A,
                  context: s,
                })
              : void 0,
            re,
          ]),
          we = ue.outcome !== "skipped";
        if (sessionWatchRail() === "live" || we) {
          if (consentPinMatches(n, "watch", w.slug)) stampArtifactWatchConsent(n, s);
        }
        let Ie = we ? frameLiveWatchRows(s, w.slug)[0] : void 0,
          ie = ue.outcome !== "skipped" && Ie !== void 0 && Ie.autoReply === "none" ? ue.degraded : void 0,
          _e =
            Z ??
            (env.CLAUDE_CODE_REMOTE && Bn != null && Bn.hasProbedLiveFile(w.slug)
              ? "remote_session"
              : void 0);
        return {
          data: {
            watch: {
              url: A,
              watching: we,
              outcome: ue.outcome,
              ...(ue.outcome === "skipped" && { reason: ue.reason }),
              ...(ue.outcome === "skipped" && M !== void 0 && { durable_skip_reason: M }),
              ...(Ie && {
                task_id: Ie.taskId,
                since: Ie.since,
                token_expires_at: Ie.tokenExpiresAt,
                auto_reply: Ie.autoReply,
              }),
              ...(ie === "not_editor" && { can_edit: !1 }),
              ...(ie === "unattended_turn" && { user_turn: !1 }),
              ...(ie === "not_named_by_user" && { named_by_user: !1 }),
              ...(ie === "declined" && { replies_declined: !0 }),
              ...(_e !== void 0 && { liveDocCollab: _e }),
              ...(_e !== void 0 &&
                Bn != null &&
                artifactLivePathsSchemaOpen() &&
                Bn.livePathFrom(n) !== void 0 &&
                Bn.hasSeveralLiveFiles(w.slug) && { liveDocPath: Bn.livePathFrom(n) }),
            },
          },
        };
      }
      if (n.action === "resume_replies") {
        let w = parseArtifactUrlOrThrow(n.url),
          A = artifactViewerUrlFor(w),
          S = getLiveState(),
          stopLatches = S.durable.stopLatches,
          T = s.toolUseId === void 0 ? void 0 : stopLatches.takeRelatchAsk(s.toolUseId, w.slug),
          P = s.toolUseId === void 0 ? void 0 : S.wakes.resumeSights.take(s.toolUseId, w.slug),
          L = isDelegatedObservationContext(s.agentContext) ? void 0 : T;
        if (env.CLAUDE_CODE_REMOTE)
          return {
            data: { resume_replies: { url: A, resumed: !1, outcome: "skipped", reason: "remote_session" } },
          };
        if (!S.autoReact.userDisarmed && P !== stopGeneration(w.slug) && isSlugStopped(w.slug))
          return {
            data: { resume_replies: { url: A, resumed: !1, outcome: "skipped", reason: "stale_consent" } },
          };
        let { publishContext: publishContext } = derivePublishContext(s),
          M = isSlugSwept(w.slug),
          x = await resumeFrameLiveAutoReplies({
            slug: w.slug,
            url: A,
            publishContext: publishContext,
            getKnownVer: makeArtifactReadVersionReader(s.getAppState, w.slug),
            context: s,
            tool: e.tool,
            commentVerbsInSchema: artifactCommentsPromptGateOpen(),
            approvedRelatchGen: L,
          }),
          q = x.outcome === "armed";
        return {
          data: {
            resume_replies: {
              url: A,
              resumed: q,
              outcome: x.outcome,
              ...((x.outcome === "skipped" || x.outcome === "refused") && { reason: x.reason }),
              ...(x.outcome === "armed" && {
                task_id: x.taskId,
                stop_kind: M ? "interrupt" : "user",
                ...(x.inPlace === !0 && { in_place: !0 }),
                ...(x.connecting === !0 && { connecting: !0 }),
              }),
            },
          },
        };
      }
      return throwUnroutedArtifactAction("watch.call", n);
    },
  },
  Do = {
    watch(e, n) {
      if ("watch" in e) {
        let s = typeof e.watch === "object" && e.watch !== null ? e.watch : {};
        if (s.rail === "durable_wake") {
          let R = typeof s.liveDocCollab === "string" ? s.liveDocCollab : void 0,
            T = s.watching === !0 && Bn != null && R !== void 0 ? Bn.durableLiveDocWatchLead(Ov(s.url)) : "",
            P =
              s.watching === !0
                ? `${T}Durable wake subscription on ${Ov(s.url)} \u2014 ${jvo(s.note) ?? `this session will be woken by a new turn when the artifact is ${Array.isArray(s.events) && s.events.includes("comment") ? "republished or a comment on it is sent to Claude" : "next published"}; no live updates are streamed, so re-read the artifact on wake.`}`
                : `No durable wake subscription on ${Ov(s.url)}${typeof s.reason === "string" ? ` (${Wce(s.reason)}${Wvo(s.detail)})` : ""} \u2014 ${jvo(s.note) ?? "could not register one; publishing and reading still work."}`;
          return { tool_use_id: n, type: "tool_result", content: P };
        }
        let r =
            s.token_expires_at !== void 0
              ? " It reconnects on its own if the connection drops or its credential expires; you will be told if reconnecting has to stop."
              : "",
          liveDocPath = s.liveDocPath,
          y =
            Bn != null
              ? Bn.liveDocWatchCollabLine(
                  typeof s.liveDocCollab === "string" ? s.liveDocCollab : void 0,
                  Ov(s.url),
                  typeof liveDocPath === "string" && eKs.test(liveDocPath) ? liveDocPath : void 0,
                )
              : "",
          p =
            s.durable_skip_reason === void 0
              ? ""
              : ` This remote session's durable wake rail was skipped as well: ${s.durable_skip_reason === "no_wake_minter" ? "no wake-webhook minter is available (the session's own MCP mount was not found)" : s.durable_skip_reason === "stop_latched" ? "watching this artifact was stopped earlier in this session (do not retry on your own)" : Wce(s.durable_skip_reason)}.`,
          w = () => {
            let R = artifactCommentsPromptGateOpen();
            return `${y}Not watching ${Ov(s.url)} \u2014 watching an artifact for new versions${R ? " and comments" : ""} isn't supported yet from remote sessions, so nothing will notify this session. ${R ? "Publishing, reading comments, and replying still work here." : "Publishing still works here."} To watch it, the user can run \`claude --watch-artifact ${Ov(s.url)}\` in Claude Code on their own machine.`;
          },
          A = () => {
            let R = artifactCommentsPromptGateOpen();
            return `${y}Not watching ${Ov(s.url)} \u2014 this cloud session is bound to the desktop it was started from, and that device's trusted-device check means new versions${R ? " and comments" : ""} on the artifact can't wake it. ${R ? "Publishing, reading comments, and replying still work here." : "Publishing still works here."} To be woken, the user can publish from a Claude Code cloud session started on the web, or run \`claude --watch-artifact ${Ov(s.url)}\` in Claude Code on their own machine.`;
          },
          S =
            s.watching === !0
              ? `${y}Watching ${Ov(s.url)} \u2014 the watch is armed (\`status\` shows whether it has connected yet); this session keeps track of new versions published elsewhere; a new version starts no turn and sends no notification (watch is session-local; ${resumeWatchNote(artifactCommentsPromptGateOpen())}).${describeWatchCommentsReach(typeof s.auto_reply === "string" ? s.auto_reply : void 0, s.task_id === void 0, s.can_edit === !1 ? "cannot_edit" : s.user_turn === !1 ? "unattended_turn" : s.named_by_user === !1 ? "not_named_by_user" : s.replies_declined === !0 ? "declined" : void 0)}${r}`
              : s.durable_skip_reason === "tool_not_offered" ||
                  s.durable_skip_reason === "org_not_enabled" ||
                  s.durable_skip_reason === "relay_not_served"
                ? w()
                : s.durable_skip_reason === "session_device_bound"
                  ? A()
                  : `${y}Not watching ${Ov(s.url)} \u2014 ${describeLiveSubscriptionState(s.reason ?? s.outcome)}${p}`;
        return { tool_use_id: n, type: "tool_result", content: S };
      }
      return throwUnroutedArtifactAction("watch.watch", e);
    },
    unwatch(e, n) {
      if ("unwatch" in e) {
        let s = typeof e.unwatch === "object" && e.unwatch !== null ? e.unwatch : {},
          r =
            s.was_watching === !0
              ? `Stopped watching ${Ov(s.url)}; republishes of it will no longer be reported in this session. Do not watch it again unless the user asks.`
              : `No active watch for ${Ov(s.url)} in this session \u2014 nothing to stop.`;
        return { tool_use_id: n, type: "tool_result", content: r };
      }
      return throwUnroutedArtifactAction("watch.unwatch", e);
    },
    resume_replies(e, n) {
      if ("resume_replies" in e) {
        let s = typeof e.resume_replies === "object" && e.resume_replies !== null ? e.resume_replies : {},
          r =
            s.resumed === !0
              ? s.in_place === !0
                ? `Auto-replies resumed on ${Ov(s.url)} \u2014 the watch stayed connected, so they are back now: comments sent to Claude since the interrupt are answered in this pass, and new to-Claude comments as they arrive.`
                : s.connecting === !0
                  ? `Auto-replies resumed on ${Ov(s.url)} \u2014 the watch was still connecting, so the pause is lifted now and replies start once it opens (a notice confirms it): comments sent to Claude since the interrupt are picked up then, and new to-Claude comments as they arrive. If it fails to connect, action "status" shows the watch reconnecting; the pause stays lifted.`
                  : `Auto-replies resumed on ${Ov(s.url)} \u2014 the live watch is re-armed; the stop clears with a visible notice when the watch connects. Once connected, new to-Claude comments are answered; ${s.stop_kind === "interrupt" ? "comments sent to Claude while replies were paused (since the interrupt) are answered too" : s.stop_kind === "user" ? "comments sent to Claude while the watch was killed or unwatched stay unanswered history" : "comments sent to Claude while replies were stopped are picked up too if the stop was a session interrupt (Ctrl+C or Stop), and stay unanswered history if the watch had been killed or unwatched"}. If the watch fails to connect, this turn is interrupted before it does, or the user stops auto-replies again before it connects, the stop stays in place \u2014 check action "status" and resume again if the user still wants it.`
              : s.outcome === "already_watching"
                ? 'Auto-replies were NOT resumed: a connection for this artifact is already mid-boot (a reconnect in progress), and a resume cannot attach to it. The stop stays in place unless that connection is a fresh publish re-arming it \u2014 check action "status" first, and call resume_replies again only if it still reports stopped and the user still wants auto-replies resumed.'
                : s.reason === "session_disarmed"
                  ? "Auto-replies were NOT resumed: they are disarmed for the whole session (the user's kill-all-agents gesture). That disarm lasts for the rest of this session and cannot be reversed by a resume \u2014 a new session re-arms on publish. Do not retry."
                  : s.reason === "other_org"
                    ? `Auto-replies were NOT resumed on ${Ov(s.url)}: ${OTHER_ORG_PHRASE}. Nothing here can re-arm them until ${LOGIN_OTHER_ORG_REMEDY}; tell the user.`
                    : s.reason === "public_outside_org"
                      ? `Auto-replies were NOT resumed on ${Ov(s.url)}: ${PUBLIC_OUTSIDE_ORG_NOTE}. No account signed in outside its organization can re-arm them; tell the user, and do not retry.`
                      : s.reason === "remote_session"
                        ? 'Auto-replies were NOT resumed: this is a remote session, where comment wakes ride durable watch subscriptions \u2014 use action "watch" to re-register one.'
                        : s.reason === "not_stopped"
                          ? `Auto-replies were NOT resumed: no auto-reply stop is recorded for ${Ov(s.url)} in this session \u2014 there is nothing to resume (an interrupt's pause already lifts when the user sends a message). Whether auto-replies can arm here at all, and what is armed now, is what action "status" reports (a publish result reports the watch); do not tell the user they are on until status or a result line says so.`
                          : s.reason === "stale_consent"
                            ? "Auto-replies were NOT resumed: the approval did not cover the stop that is now recorded \u2014 either a stop landed while the approval was pending, or the approval arrived without its consent-card record. Ask the user, and call resume_replies again only if they still want auto-replies resumed."
                            : s.reason === "stop_latched"
                              ? `Auto-replies were NOT resumed: watching ${Ov(s.url)} was stopped in this session (an unwatch or a task stop) and the approval did not cover that stop \u2014 it landed after the consent card was shown, or the card never disclosed it. The stop stays in place. Ask the user, and call resume_replies again only if they still want auto-replies resumed.`
                              : s.reason === "arm_in_flight"
                                ? `Auto-replies were NOT resumed: a live-watch connection for ${Ov(s.url)} that started before the watch was stopped is still winding down, and a resume cannot attach to it \u2014 that connection ends on its own and the stop stays in place. Check action "status"; then ask the user, and call resume_replies again only if they still want auto-replies resumed.`
                                : s.reason === "cancelled"
                                  ? 'Auto-replies were NOT resumed: the request was interrupted before the live watch finished connecting, so the auto-reply stop stays in place (a connection already under way may still complete as a plain version watch \u2014 action "status" shows it). Ask the user, and call resume_replies again only if they still want auto-replies resumed.'
                                  : s.reason === "stopped_again"
                                    ? `Auto-replies were NOT resumed: the user stopped them again on ${Ov(s.url)} (or interrupted the session) while the resume was connecting. That newer stop stays in place \u2014 do not retry unless the user asks again. (The connection itself completes as a plain version watch \u2014 action "status" shows it.)`
                                    : s.reason === "not_enabled"
                                      ? "Auto-replies were NOT resumed: this session has not opted into automatic comment replies, so a resume has nothing it could re-enable. The stop was left as it was; do not retry in this session."
                                      : `Auto-replies were NOT resumed (${Wce(s.outcome)}${s.reason !== void 0 ? `: ${Wce(s.reason)}` : ""}). The live watch could not be re-armed.`;
        return { tool_use_id: n, type: "tool_result", content: r };
      }
      return throwUnroutedArtifactAction("watch.resume_replies", e);
    },
    watches(e, n) {
      if ("watches" in e) {
        if (!Array.isArray(e.watches))
          return {
            tool_use_id: n,
            type: "tool_result",
            content:
              'This record of the artifact watches is unreadable \u2014 run action "status" again for the live list.',
          };
        let s = 'run action "status" again for the live list',
          r = capResultRows(e.watches),
          rows = r.rows,
          y = rows.length === 0 && r.unreadable > 0,
          p = capResultRows(e.arms),
          rows_2 = p.rows,
          A = e.arms !== void 0 && !Array.isArray(e.arms),
          S = capResultRows(e.rooms),
          rows_3 = S.rows,
          T = e.rooms !== void 0 && !Array.isArray(e.rooms);
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
            tool_use_id: n,
            type: "tool_result",
            content:
              `No row of this record of the artifact watches could be read \u2014 ${s}.` +
              formatRowsOmittedNote({ ...r, unreadable: 0 }, "this record", s),
          };
        let any = rows.some((ie) => "rail" in ie && ie.rail === "durable_wake"),
          { watching: watching, stopped: stopped } = splitWatchRows(rows),
          M = `${watching} artifact ${plural(watching, "watch", "watches")} in this session${any ? "" : ` (session-local; ${resumeWatchNote(artifactCommentsPromptGateOpen())})`}${stopped > 0 ? `, plus ${stopped} ${plural(stopped, "artifact")} with auto-replies paused or stopped and no connection` : ""}:
`,
          x = e.filter_url !== void 0,
          q = y
            ? `No row of this record of the artifact watches could be read \u2014 ${s}.`
            : rows.length === 0
              ? x
                ? `No artifact watch on ${Ov(e.filter_url)} in this session.`
                : env.CLAUDE_CODE_REMOTE
                  ? "No artifact watches in this session. In a remote session a watch is a durable wake subscription held by the artifact service (it outlives the session); publishing normally registers one, and the publish result says whether registration began."
                  : isFrameLiveSubscribeEnabled()
                    ? `No artifact watches in this session. Publishing an artifact from this session normally arms one \u2014 the publish result says whether the watch armed, and action "status" shows whether auto-replies are on for it; watches are session-local, and ${resumeWatchNote(artifactCommentsPromptGateOpen())}.`
                    : "No artifact watches in this session. Live artifact watching is off in this session, so it does not keep track of new versions published elsewhere."
              : M +
                rows.map((ie) =>
                  !("rail" in ie)
                    ? `- ${Ov(ie.url)} \u2014 ${ie.connected ? (ie.connecting === !0 ? "connecting (handshake not finished; nothing reaches it yet)" : "connected") : "reconnecting"}, ${armedViaWording(labelledArmedVia(ie.explicit === !0, parseArmedVia(typeof ie.armed_via === "string" ? ie.armed_via : void 0))).row}${ie.auto_reply === void 0 || ie.auto_reply === "none" ? "" : ie.auto_reply === "armed" ? `, ${AUTO_REPLIES_ARMED_TOKEN}` : ie.auto_reply === "paused" ? `, ${AUTO_REPLIES_PAUSED_ROW}` : ie.auto_reply === "yielded" ? `, ${AUTO_REPLIES_YIELDED_ROW}` : ie.auto_reply === "declined" ? `, ${AUTO_REPLIES_DECLINED_ROW}` : ie.auto_reply === "denied" ? `, ${AUTO_REPLIES_DENIED_ROW}` : ie.auto_reply === "stopped" ? ", auto-replies stopped (the user can ask to resume them)" : ie.auto_reply === "disarmed" ? ", auto-replies disarmed for this session" : ""}, since ${formatEpochMsIso(ie.since)}${commentCountsClause(ie)}`
                    : ie.rail === "durable_wake"
                      ? `- ${Ov(ie.url)} \u2014 durable wake subscription (woken on ${Array.isArray(ie.events) && ie.events.includes("comment") ? "publish and to-Claude comments" : "publish"}; no live updates), since ${Wce(ie.since)}${ie.restored === !0 ? "; restored after this session restarted and not re-verified since (no action needed unless the user asks)" : ""}`
                      : `- ${Ov(ie.url)} \u2014 not connected${ie.explicit === void 0 ? "" : `, ${armedViaWording(labelledArmedVia(ie.explicit === !0, parseArmedVia(typeof ie.armed_via === "string" ? ie.armed_via : void 0))).row}`}, ${ie.auto_reply === "disarmed" ? "auto-replies disarmed for this session; no comment notifications arrive" : `${ie.stop_kind === "interrupt" ? "auto-replies paused by the user's interrupt (Ctrl+C or Stop) and the connection has since dropped \u2014 the next publish of this artifact the user asks for reconnects and resumes them, or the user can ask to resume them (comments sent to Claude meanwhile are answered then); publishing it without being asked, while handling a notification or a wake-up, leaves them paused" : ie.stop_kind === "yielded" ? "auto-replies handed to another session of this conversation, which answers the comments now \u2014 a publish of this artifact the user asks for here, or resume_replies when the user asks for it, takes them back (the user asking is not itself the take-back)" : ie.stop_kind === "user" ? "auto-replies stopped when the watch was killed or unwatched \u2014 they stay stopped: a publish does not re-arm them; the user can ask to resume them or to watch this artifact again" : "auto-replies stopped"}; no comment notifications arrive until then (do not republish or resume just to re-enable them unless the user asks)`}${ie.since === void 0 ? "" : `, watching since ${formatEpochMsIso(ie.since)}`}`,
                ).join(`
`),
          re = T
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
                    `- ${Ov(ie.url)} \u2014 ${ie.connected === !0 ? "connected" : "reconnecting"}, ${G7(ie.peers)} other ${typeof ie.peers === "number" && ie.peers === 1 ? "peer" : "peers"} seen${describeArtifactPerson(ie.viewers, s)}`,
                ).join(`
`),
          Z = A
            ? `(This record's list of other watch activity \u2014 watches connecting, reconnecting, failed or ended \u2014 is unreadable; ${s}.)`
            : rows_2.length > 0
              ? describeUnwatchedState(rows_2, rows.length > 0 || y, x)
              : p.unreadable > 0
                ? `(No row of this record's list of other watch activity could be read \u2014 ${s}.)`
                : "",
          ue = rows_2.length > 0 && rows.length === 0 && !y,
          we =
            Z === ""
              ? q
              : ue
                ? Z
                : `${q}

${Z}`,
          Ie =
            formatRowsOmittedNote(y ? { ...r, unreadable: 0 } : r, "this record", s) +
            formatRowsOmittedNote(
              rows_2.length === 0 ? { ...p, unreadable: 0 } : p,
              "this record's list of other watch activity",
              s,
            ) +
            formatRowsOmittedNote(
              rows_3.length === 0 ? { ...S, unreadable: 0 } : S,
              "this record's list of joined artifact rooms",
              s,
            );
        return { tool_use_id: n, type: "tool_result", content: we + re + Ie };
      }
      return throwUnroutedArtifactAction("watch.watches", e);
    },
  };

export { ARTIFACT_WATCH_ACTION_HANDLER, Do };
