/**
 * services/artifacts/frameLiveReplies.ts
 *
 * Artifact 实时订阅回复（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tsrpnscb.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tsrpnscb.js:50636-51135 placement
function settleRepliesConsent(options, slug, toolUseId, messages) {
  let repliesConsent = getLiveState().live.repliesConsent;
  let outstanding = repliesConsent.outstanding.get(slug);
  if (options === undefined)
    return {
      declined:
        repliesConsent.declined.has(slug) ||
        (toolUseId !== undefined &&
          outstanding !== undefined &&
          outstanding.toolUseId !== toolUseId &&
          outstanding.allowed !== true),
      approved: false,
    };
  if (toolUseId !== undefined && outstanding !== undefined && outstanding.toolUseId !== toolUseId) {
    repliesConsent.outstanding.delete(slug);
    if (outstanding.allowed !== true)
      repliesConsent.declined.set(slug, {
        namingMessages: outstanding.namingMessages,
      });
  }
  let declined = repliesConsent.declined.get(slug);
  let messageUuid = lastHumanMessageUuidWith(messages, slug);
  if (declined !== undefined && messageUuid !== null && !declined.namingMessages.has(messageUuid))
    repliesConsent.declined.delete(slug);
  return {
    declined: repliesConsent.declined.has(slug),
    approved: repliesConsent.approved.has(slug),
  };
}
//@ chunk-tsrpnscb.js:51135-51200 placement
function lastHumanMessageUuidWith(messages, text) {
  let index = lastHumanMessageIndexContaining(messages, text);
  return index >= 0 ? (messages[index]?.uuid ?? null) : null;
}
//@ chunk-tsrpnscb.js:51200-51406 placement
function noteRepliesConsentAsk(options, text, toolUseId, messages, all = false) {
  if (options === undefined) return;
  getLiveState().live.repliesConsent.outstanding.set(text, {
    toolUseId,
    ...(all && {
      allowed: true,
    }),
    namingMessages: new Set(
      findHumanMessagesContaining(messages, text).flatMap((message) =>
        messages[message]?.uuid !== undefined ? [messages[message].uuid] : [],
      ),
    ),
  });
}
//@ chunk-tsrpnscb.js:51406-51572 placement
function takeRepliesConsentAsk(slug, toolUseId) {
  if (slug === undefined || toolUseId === undefined) return;
  let { outstanding } = getLiveState().live.repliesConsent;
  for (let [slug, ask] of outstanding)
    if (ask.toolUseId === toolUseId) {
      outstanding.delete(slug);
      return {
        slug,
      };
    }
  return;
}
//@ chunk-tsrpnscb.js:51572-51741 placement
function approveTakenRepliesConsent(consentWriter, takenRepliesAsk, slug, toolUseId) {
  let repliesConsent = getLiveState().live.repliesConsent;
  if (consentWriter === undefined) return false;
  let matches = takenRepliesAsk?.slug === slug;
  if (matches && toolUseId) {
    repliesConsent.approved.add(slug);
    repliesConsent.declined.delete(slug);
  }
  return matches || repliesConsent.approved.has(slug);
}
//@ chunk-tsrpnscb.js:51741-51805 placement
function repliesConsentDeclined(state) {
  return getLiveState().live.repliesConsent.declined.has(state);
}
//@ chunk-tsrpnscb.js:51805-51931 placement
function repliesConsentUnapproved(slug) {
  let { declined, outstanding } = getLiveState().live.repliesConsent;
  let outstandingMap = outstanding.get(slug);
  return declined.has(slug) || (outstandingMap !== undefined && outstandingMap.allowed !== true);
}
//@ chunk-tsrpnscb.js:51931-52039 placement
function getMcpWriteSlugState(live, liveState) {
  let state = live.mcpWriteSlugs.get(liveState);
  if (state === undefined) {
    state = {
      arming: false,
    };
    live.mcpWriteSlugs.set(liveState, state);
  }
  return state;
}
//@ chunk-tsrpnscb.js:52039-52143 placement
var NON_RETRYABLE_ARM_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ARM_RETRY_DELAY_MS;
deferInit("chunk-tsrpnscb.js:52039", () => {
  NON_RETRYABLE_ARM_REASONS = new Set([
    "not_found",
    "no_subscription_token",
    "publish_context",
    "invalid_slug",
    "remote",
  ]);
  ARM_RETRY_DELAY_MS = 5000;
});
//@ chunk-tsrpnscb.js:52143-52214 placement
function markPublishInFlightWithTimer(ownPublishes, slug) {
  markPublishInFlight(ownPublishes, slug);
  setTimeout(
    (slug, token) => clearPublishInFlight(slug, token),
    ARM_RETRY_DELAY_MS,
    ownPublishes,
    slug,
  ).unref?.();
}
//@ chunk-tsrpnscb.js:52214-53171 placement
async function touchFrameLiveForMcpWrite(slug, options, getKnownVer) {
  try {
    if (!ARTIFACT_SLUG_RE.test(slug)) return;
    let liveState = getLiveState();
    let live = liveState.live;
    if (live.disposed) return;
    let existing = live.supervisors.get(slug);
    let ownPublishes = options.artifactRegistries.ownPublishes;
    if (existing !== undefined && !existing.stopped) {
      markPublishInFlightWithTimer(ownPublishes, slug);
      if (live.inFlightSubscribes.has(slug)) return;
      existing.lastActivityAt = Date.now();
      if (
        existing.timer !== undefined &&
        existing.consecutiveFailures === 0 &&
        existing.stalledSince === undefined
      ) {
        clearTimeout(existing.timer);
        existing.timer = undefined;
        existing.nextRewatchAt = undefined;
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
      agentId: options.agentId,
      agentType: options.agentContext?.agentType,
      isNonInteractiveSession: options.options.isNonInteractiveSession,
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
      ...monitorContextAndSignal(options),
      seedKnownVerFromBoot: true,
      mcpWrite: true,
    }).then(
      (result) => {
        mcpWriteSlugState.arming = false;
        if (result.outcome === "skipped" && NON_RETRYABLE_ARM_REASONS.has(result.reason))
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
//@ chunk-tsrpnscb.js:53171-54704 placement
async function resumeFrameLiveAutoReplies(options) {
  let { slug, url, publishContext, getKnownVer, context } = options;
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
  if (!options.commentVerbsInSchema)
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
  let outcome = liftSweptPause(
    context.taskRegistry,
    slug,
    (task) => {
      markAutoReactNoticePending(slug);
      task.notify({
        summary: autoRepliesResumedNotice(quoteArtifactName(task.getTitle, url)),
        detail: `Auto-replies on artifact ${url} were resumed by a resume_replies request \u2014 they had been paused when the user interrupted the session (Ctrl+C or Stop). ${PAUSE_AUTO_REPLIES_HINT}`,
      });
    },
    () => {
      let supervisor = live.supervisors.get(slug);
      if (supervisor !== undefined && !supervisor.stopped)
        supervisor.autoReactWiring = mergeAutoReactWiring(
          supervisor.autoReactWiring,
          {
            tool: options.tool,
            commentVerbsInSchema: options.commentVerbsInSchema,
            context,
            title: supervisor.autoReactWiring?.title,
          },
          true,
        );
    },
  );
  if (outcome !== null && id !== undefined) {
    logFeatureOk("artifact_live_subscribe", {
      resumed_in_place: true,
    });
    if (outcome === "cleared") getLiveState().wakes.pendingResumeDisclosure.add(slug);
    return {
      outcome: "armed",
      taskId: id,
      inPlace: outcome === "lifted",
      ...(outcome === "cleared" && {
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
      tool: options.tool,
      commentVerbsInSchema: options.commentVerbsInSchema,
      context,
      title: live.supervisors.get(slug)?.autoReactWiring?.title,
    },
    userResumeWiring: true,
    approvedRelatchGen: options.approvedRelatchGen,
  });
}
export {
  takeRepliesConsentAsk,
  repliesConsentUnapproved,
  repliesConsentDeclined,
  settleRepliesConsent,
  noteRepliesConsentAsk,
  approveTakenRepliesConsent,
  resumeFrameLiveAutoReplies,
  touchFrameLiveForMcpWrite,
};
