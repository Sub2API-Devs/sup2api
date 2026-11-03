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
import { isConsentUiKind } from "./comments/repliesConsent.js";
import {
  FrameLiveWatchManager,
  monitorContextAndSignal,
  findArmedAutoReactMonitor,
  liftSweptPause,
} from "./frameLive.js";
import { artifactViewerUrlFor } from "../../tools/ArtifactTool/artifactUrls.js";
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { logError } from "../../utils/log.js";
import { isSlugStopped } from "./summonArms.js";
import { isAutoReactEnabled } from "./comments/postReply.js";
import { markAutoReactNoticePending } from "./shareEntries.js";
import { autoRepliesResumedNotice } from "../../tools/ArtifactTool/artifactNotices.js";
import { quoteArtifactName } from "./comments/threadScanner.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";

//@ chunk-aqdf5t3e.js:50541-51040 placement
function settleRepliesConsent(e, slug, toolUseId, messages) {
  let repliesConsent = getLiveState().live.repliesConsent;
  let a = repliesConsent.outstanding.get(slug);
  if (e === undefined)
    return {
      declined:
        repliesConsent.declined.has(slug) ||
        (toolUseId !== undefined && a !== undefined && a.toolUseId !== toolUseId && a.allowed !== true),
      approved: false,
    };
  if (toolUseId !== undefined && a !== undefined && a.toolUseId !== toolUseId) {
    repliesConsent.outstanding.delete(slug);
    if (a.allowed !== true)
      repliesConsent.declined.set(slug, {
        namingMessages: a.namingMessages,
      });
  }
  let d = repliesConsent.declined.get(slug);
  let b = lastHumanMessageUuidWith(messages, slug);
  if (d !== undefined && b !== null && !d.namingMessages.has(b)) repliesConsent.declined.delete(slug);
  return {
    declined: repliesConsent.declined.has(slug),
    approved: repliesConsent.approved.has(slug),
  };
}
//@ chunk-aqdf5t3e.js:51040-51105 placement
function lastHumanMessageUuidWith(messages, text) {
  let r = lastHumanMessageIndexContaining(messages, text);
  return r >= 0 ? (messages[r]?.uuid ?? null) : null;
}
//@ chunk-aqdf5t3e.js:51105-51311 placement
function noteRepliesConsentAsk(e, text, toolUseId, messages, h = false) {
  if (e === undefined) return;
  getLiveState().live.repliesConsent.outstanding.set(text, {
    toolUseId,
    ...(h && {
      allowed: true,
    }),
    namingMessages: new Set(
      findHumanMessagesContaining(messages, text).flatMap((a) =>
        messages[a]?.uuid !== undefined ? [messages[a].uuid] : [],
      ),
    ),
  });
}
//@ chunk-aqdf5t3e.js:51311-51477 placement
function takeRepliesConsentAsk(e, toolUseId) {
  if (e === undefined || toolUseId === undefined) return;
  let { outstanding } = getLiveState().live.repliesConsent;
  for (let [s, h] of outstanding)
    if (h.toolUseId === toolUseId) {
      outstanding.delete(s);
      return {
        slug: s,
      };
    }
  return;
}
//@ chunk-aqdf5t3e.js:51477-51646 placement
function approveTakenRepliesConsent(consentWriter, takenRepliesAsk, slug, s) {
  let repliesConsent = getLiveState().live.repliesConsent;
  if (consentWriter === undefined) return false;
  let a = takenRepliesAsk?.slug === slug;
  if (a && s) {
    repliesConsent.approved.add(slug);
    repliesConsent.declined.delete(slug);
  }
  return a || repliesConsent.approved.has(slug);
}
//@ chunk-aqdf5t3e.js:51646-51710 placement
function repliesConsentDeclined(e) {
  return getLiveState().live.repliesConsent.declined.has(e);
}
//@ chunk-aqdf5t3e.js:51710-51836 placement
function repliesConsentUnapproved(slug) {
  let { declined, outstanding } = getLiveState().live.repliesConsent;
  let s = outstanding.get(slug);
  return declined.has(slug) || (s !== undefined && s.allowed !== true);
}
//@ chunk-aqdf5t3e.js:51836-51944 placement
function getMcpWriteSlugState(live, n) {
  let r = live.mcpWriteSlugs.get(n);
  if (r === undefined) {
    r = {
      arming: false,
    };
    live.mcpWriteSlugs.set(n, r);
  }
  return r;
}
//@ chunk-aqdf5t3e.js:51944-52048 placement
var NON_RETRYABLE_ARM_REASONS = new Set([
  "not_found",
  "no_subscription_token",
  "publish_context",
  "invalid_slug",
  "remote",
]);
var ARM_RETRY_DELAY_MS = 5000;
//@ chunk-aqdf5t3e.js:52048-52119 placement
function markPublishInFlightWithTimer(ownPublishes, n) {
  markPublishInFlight(ownPublishes, n);
  setTimeout((r, s) => clearPublishInFlight(r, s), ARM_RETRY_DELAY_MS, ownPublishes, n).unref?.();
}
//@ chunk-aqdf5t3e.js:52119-53076 placement
async function touchFrameLiveForMcpWrite(slug, n, getKnownVer) {
  try {
    if (!ARTIFACT_SLUG_RE.test(slug)) return;
    let liveState = getLiveState();
    let live = liveState.live;
    if (live.disposed) return;
    let a = live.supervisors.get(slug);
    let ownPublishes = n.artifactRegistries.ownPublishes;
    if (a !== undefined && !a.stopped) {
      markPublishInFlightWithTimer(ownPublishes, slug);
      if (live.inFlightSubscribes.has(slug)) return;
      a.lastActivityAt = Date.now();
      if (a.timer !== undefined && a.consecutiveFailures === 0 && a.stalledSince === undefined) {
        clearTimeout(a.timer);
        a.timer = undefined;
        a.nextRewatchAt = undefined;
        rewatchSupervisor(live, slug);
      }
      return;
    }
    let mcpWriteSlugState = getMcpWriteSlugState(live, slug);
    if (live.inFlightSubscribes.has(slug)) {
      if (mcpWriteSlugState.arming) markPublishInFlightWithTimer(ownPublishes, slug);
      return;
    }
    let { publishContext } = derivePublishContextFrom({
      agentId: n.agentId,
      agentType: n.agentContext?.agentType,
      isNonInteractiveSession: n.options.isNonInteractiveSession,
    });
    if (!isConsentUiKind(publishContext)) return;
    if (mcpWriteSlugState.declinedEpoch === liveState.accountEpoch) return;
    let declinedEpoch = liveState.accountEpoch;
    mcpWriteSlugState.arming = true;
    await FrameLiveWatchManager(live, {
      slug,
      url: artifactViewerUrlFor({
        slug,
        env: claudeAiEnvironment(),
      }),
      getKnownVer,
      ownPublishes,
      ...monitorContextAndSignal(n),
      seedKnownVerFromBoot: true,
      mcpWrite: true,
    }).then(
      (R) => {
        mcpWriteSlugState.arming = false;
        if (R.outcome === "skipped" && NON_RETRYABLE_ARM_REASONS.has(R.reason))
          mcpWriteSlugState.declinedEpoch = declinedEpoch;
      },
      (error) => {
        mcpWriteSlugState.arming = false;
        logError(error);
      },
    );
  } catch (error) {
    logError(error);
  }
}
//@ chunk-aqdf5t3e.js:53076-54609 placement
async function resumeFrameLiveAutoReplies(e) {
  let { slug, url, publishContext, getKnownVer, context } = e;
  if (getLiveState().autoReact.userDisarmed)
    return {
      outcome: "refused",
      reason: "session_disarmed",
    };
  if (!isConsentUiKind(publishContext))
    return {
      outcome: "skipped",
      reason: "publish_context",
    };
  if (!e.commentVerbsInSchema)
    return {
      outcome: "skipped",
      reason: "comments_off",
    };
  if (!isSlugStopped(slug))
    return {
      outcome: "skipped",
      reason: "not_stopped",
    };
  if (!isAutoReactEnabled())
    return {
      outcome: "skipped",
      reason: "not_enabled",
    };
  let live = getLiveState().live;
  if (context.abortController.signal.aborted)
    return {
      outcome: "skipped",
      reason: "cancelled",
    };
  let id = findArmedAutoReactMonitor(context.taskRegistry, slug)?.id;
  let w = liftSweptPause(
    context.taskRegistry,
    slug,
    (S) => {
      markAutoReactNoticePending(slug);
      S.notify({
        summary: autoRepliesResumedNotice(quoteArtifactName(S.getTitle, url)),
        detail: `Auto-replies on artifact ${url} were resumed by a resume_replies request \u2014 they had been paused when the user interrupted the session (Ctrl+C or Stop). ${PAUSE_AUTO_REPLIES_HINT}`,
      });
    },
    () => {
      let S = live.supervisors.get(slug);
      if (S !== undefined && !S.stopped)
        S.autoReactWiring = mergeAutoReactWiring(
          S.autoReactWiring,
          {
            tool: e.tool,
            commentVerbsInSchema: e.commentVerbsInSchema,
            context,
            title: S.autoReactWiring?.title,
          },
          true,
        );
    },
  );
  if (w !== null && id !== undefined) {
    logFeatureOk("artifact_live_subscribe", {
      resumed_in_place: true,
    });
    if (w === "cleared") getLiveState().wakes.pendingResumeDisclosure.add(slug);
    return {
      outcome: "armed",
      taskId: id,
      inPlace: w === "lifted",
      ...(w === "cleared" && {
        connecting: true,
      }),
    };
  }
  return FrameLiveWatchManager(live, {
    slug,
    url,
    getKnownVer,
    ownPublishes: context.artifactRegistries.ownPublishes,
    ...monitorContextAndSignal(context),
    seedKnownVerFromBoot: true,
    autoReactWiring: {
      tool: e.tool,
      commentVerbsInSchema: e.commentVerbsInSchema,
      context,
      title: live.supervisors.get(slug)?.autoReactWiring?.title,
    },
    userResumeWiring: true,
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
