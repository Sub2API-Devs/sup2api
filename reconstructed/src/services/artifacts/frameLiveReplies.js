/**
 * services/artifacts/frameLiveReplies.ts
 *
 * Artifact 实时订阅回复（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aqdf5t3e.js (12)
 * attribution: placement 12
 */
import { getLiveState } from "../liveReplica/liveReplica.js";
import { lastHumanMessageIndexContaining } from "./artifactPresence.js";
import { findHumanMessagesContaining } from "./presenceTranscript.js";
import { markPublishInFlight, clearPublishInFlight } from "./ownPublishes.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { rewatchSupervisor, PAUSE_AUTO_REPLIES_HINT, mergeAutoReactWiring } from "./frameLiveWording.js";
import { derivePublishContextFrom } from "./readObservation.js";
import { B9 } from "./comments/repliesConsent.js";
import { FrameLiveWatchManager, ke, findArmedAutoReactMonitor, liftSweptPause } from "./frameLive.js";
import { artifactViewerUrlFor } from "../../tools/ArtifactTool/artifactUrls.js";
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { logError } from "../../utils/log.js";
import { isSlugStopped } from "./summonArms.js";
import { isAutoReactEnabled } from "./comments/postReply.js";
import { markAutoReactNoticePending } from "./shareEntries.js";
import { FWr } from "../../tools/ArtifactTool/artifactNotices.js";
import { quoteArtifactName } from "./comments/threadScanner.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";

//@ chunk-aqdf5t3e.js:50541-51040 placement
function settleRepliesConsent(e, n, r, s) {
  let repliesConsent = getLiveState().live.repliesConsent,
    a = repliesConsent.outstanding.get(n);
  if (e === void 0)
    return {
      declined:
        repliesConsent.declined.has(n) ||
        (r !== void 0 && a !== void 0 && a.toolUseId !== r && a.allowed !== !0),
      approved: !1,
    };
  if (r !== void 0 && a !== void 0 && a.toolUseId !== r) {
    if ((repliesConsent.outstanding.delete(n), a.allowed !== !0))
      repliesConsent.declined.set(n, { namingMessages: a.namingMessages });
  }
  let d = repliesConsent.declined.get(n),
    b = Ro(s, n);
  if (d !== void 0 && b !== null && !d.namingMessages.has(b)) repliesConsent.declined.delete(n);
  return { declined: repliesConsent.declined.has(n), approved: repliesConsent.approved.has(n) };
}
//@ chunk-aqdf5t3e.js:51040-51105 placement
function Ro(e, n) {
  let r = lastHumanMessageIndexContaining(e, n);
  return r >= 0 ? (e[r]?.uuid ?? null) : null;
}
//@ chunk-aqdf5t3e.js:51105-51311 placement
function noteRepliesConsentAsk(e, n, r, s, h = !1) {
  if (e === void 0) return;
  getLiveState().live.repliesConsent.outstanding.set(n, {
    toolUseId: r,
    ...(h && { allowed: !0 }),
    namingMessages: new Set(
      findHumanMessagesContaining(s, n).flatMap((a) => (s[a]?.uuid !== void 0 ? [s[a].uuid] : [])),
    ),
  });
}
//@ chunk-aqdf5t3e.js:51311-51477 placement
function takeRepliesConsentAsk(e, n) {
  if (e === void 0 || n === void 0) return;
  let { outstanding: outstanding } = getLiveState().live.repliesConsent;
  for (let [s, h] of outstanding) if (h.toolUseId === n) return (outstanding.delete(s), { slug: s });
  return;
}
//@ chunk-aqdf5t3e.js:51477-51646 placement
function approveTakenRepliesConsent(e, n, r, s) {
  let repliesConsent = getLiveState().live.repliesConsent;
  if (e === void 0) return !1;
  let a = n?.slug === r;
  if (a && s) (repliesConsent.approved.add(r), repliesConsent.declined.delete(r));
  return a || repliesConsent.approved.has(r);
}
//@ chunk-aqdf5t3e.js:51646-51710 placement
function repliesConsentDeclined(e) {
  return getLiveState().live.repliesConsent.declined.has(e);
}
//@ chunk-aqdf5t3e.js:51710-51836 placement
function repliesConsentUnapproved(e) {
  let { declined: declined, outstanding: outstanding } = getLiveState().live.repliesConsent,
    s = outstanding.get(e);
  return declined.has(e) || (s !== void 0 && s.allowed !== !0);
}
//@ chunk-aqdf5t3e.js:51836-51944 placement
function getMcpWriteSlugState(e, n) {
  let r = e.mcpWriteSlugs.get(n);
  if (r === void 0) ((r = { arming: !1 }), e.mcpWriteSlugs.set(n, r));
  return r;
}
//@ chunk-aqdf5t3e.js:51944-52048 placement
var NON_RETRYABLE_ARM_REASONS = new Set([
    "not_found",
    "no_subscription_token",
    "publish_context",
    "invalid_slug",
    "remote",
  ]),
  ARM_RETRY_DELAY_MS = 5000;
//@ chunk-aqdf5t3e.js:52048-52119 placement
function vr(e, n) {
  (markPublishInFlight(e, n),
    setTimeout((r, s) => clearPublishInFlight(r, s), ARM_RETRY_DELAY_MS, e, n).unref?.());
}
//@ chunk-aqdf5t3e.js:52119-53076 placement
async function touchFrameLiveForMcpWrite(e, n, r) {
  try {
    if (!ARTIFACT_SLUG_RE.test(e)) return;
    let s = getLiveState(),
      live = s.live;
    if (live.disposed) return;
    let a = live.supervisors.get(e),
      ownPublishes = n.artifactRegistries.ownPublishes;
    if (a !== void 0 && !a.stopped) {
      if ((vr(ownPublishes, e), live.inFlightSubscribes.has(e))) return;
      if (
        ((a.lastActivityAt = Date.now()),
        a.timer !== void 0 && a.consecutiveFailures === 0 && a.stalledSince === void 0)
      )
        (clearTimeout(a.timer), (a.timer = void 0), (a.nextRewatchAt = void 0), rewatchSupervisor(live, e));
      return;
    }
    let b = getMcpWriteSlugState(live, e);
    if (live.inFlightSubscribes.has(e)) {
      if (b.arming) vr(ownPublishes, e);
      return;
    }
    let { publishContext: publishContext } = derivePublishContextFrom({
      agentId: n.agentId,
      agentType: n.agentContext?.agentType,
      isNonInteractiveSession: n.options.isNonInteractiveSession,
    });
    if (!B9(publishContext)) return;
    if (b.declinedEpoch === s.accountEpoch) return;
    let accountEpoch = s.accountEpoch;
    ((b.arming = !0),
      await FrameLiveWatchManager(live, {
        slug: e,
        url: artifactViewerUrlFor({ slug: e, env: claudeAiEnvironment() }),
        getKnownVer: r,
        ownPublishes: ownPublishes,
        ...ke(n),
        seedKnownVerFromBoot: !0,
        mcpWrite: !0,
      }).then(
        (R) => {
          if (((b.arming = !1), R.outcome === "skipped" && NON_RETRYABLE_ARM_REASONS.has(R.reason)))
            b.declinedEpoch = accountEpoch;
        },
        (R) => {
          ((b.arming = !1), logError(R));
        },
      ));
  } catch (error) {
    logError(error);
  }
}
//@ chunk-aqdf5t3e.js:53076-54609 placement
async function resumeFrameLiveAutoReplies(e) {
  let {
    slug: slug,
    url: url,
    publishContext: publishContext,
    getKnownVer: getKnownVer,
    context: context,
  } = e;
  if (getLiveState().autoReact.userDisarmed) return { outcome: "refused", reason: "session_disarmed" };
  if (!B9(publishContext)) return { outcome: "skipped", reason: "publish_context" };
  if (!e.commentVerbsInSchema) return { outcome: "skipped", reason: "comments_off" };
  if (!isSlugStopped(slug)) return { outcome: "skipped", reason: "not_stopped" };
  if (!isAutoReactEnabled()) return { outcome: "skipped", reason: "not_enabled" };
  let live = getLiveState().live;
  if (context.abortController.signal.aborted) return { outcome: "skipped", reason: "cancelled" };
  let b = findArmedAutoReactMonitor(context.taskRegistry, slug)?.id,
    w = liftSweptPause(
      context.taskRegistry,
      slug,
      (S) => {
        (markAutoReactNoticePending(slug),
          S.notify({
            summary: FWr(quoteArtifactName(S.getTitle, url)),
            detail: `Auto-replies on artifact ${url} were resumed by a resume_replies request \u2014 they had been paused when the user interrupted the session (Ctrl+C or Stop). ${PAUSE_AUTO_REPLIES_HINT}`,
          }));
      },
      () => {
        let S = live.supervisors.get(slug);
        if (S !== void 0 && !S.stopped)
          S.autoReactWiring = mergeAutoReactWiring(
            S.autoReactWiring,
            {
              tool: e.tool,
              commentVerbsInSchema: e.commentVerbsInSchema,
              context: context,
              title: S.autoReactWiring?.title,
            },
            !0,
          );
      },
    );
  if (w !== null && b !== void 0) {
    if ((logFeatureOk("artifact_live_subscribe", { resumed_in_place: !0 }), w === "cleared"))
      getLiveState().wakes.pendingResumeDisclosure.add(slug);
    return {
      outcome: "armed",
      taskId: b,
      inPlace: w === "lifted",
      ...(w === "cleared" && { connecting: !0 }),
    };
  }
  return FrameLiveWatchManager(live, {
    slug: slug,
    url: url,
    getKnownVer: getKnownVer,
    ownPublishes: context.artifactRegistries.ownPublishes,
    ...ke(context),
    seedKnownVerFromBoot: !0,
    autoReactWiring: {
      tool: e.tool,
      commentVerbsInSchema: e.commentVerbsInSchema,
      context: context,
      title: live.supervisors.get(slug)?.autoReactWiring?.title,
    },
    userResumeWiring: !0,
    approvedRelatchGen: e.approvedRelatchGen,
  });
}

export {
  repliesConsentDeclined,
  settleRepliesConsent,
  noteRepliesConsentAsk,
  approveTakenRepliesConsent,
  resumeFrameLiveAutoReplies,
  takeRepliesConsentAsk,
  repliesConsentUnapproved,
};
