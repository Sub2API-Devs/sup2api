/**
 * services/artifacts/watchArtifact.ts
 *
 * 2.1.316 新增。监视 Artifact 变化。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (11)
 * attribution: placement 11
 */
import { renameSession } from "../../utils/sessionTitle.js";
import { logError } from "../../utils/log.js";
import { artifactViewerUrlSpellings } from "../../tools/ArtifactTool/artifactUrls.js";
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { getUserMessageText, createUserMessage } from "../../utils/messages.js";
import {
  ARTIFACT_SLUG_RE,
  parseArtifactUrlAnyCase,
  ARTIFACT_TOOL_NAME,
} from "../../tools/ArtifactTool/constants.js";
import { isBuiltInArtifactHiddenForMcp, hiddenBuiltInArtifactTool } from "./artifactsMcpTools.js";
import { canPostReply, canAutoreactWithoutPrompts } from "./comments/autoreactGates.js";
import { watchArtifactFromStartup } from "./frameLive.js";
import { isAutoreactArmed, disarmAutoreact } from "./comments/postReply.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { isSlugStoppedAnywhere } from "./summonArms.js";
import { describeFrameDomains } from "./frameDomains.js";
import { BOXED_DIAMOND_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
import { takePendingWatchArtifact } from "../../cli/watchArtifactArgs.js";
import { findToolByName } from "../../Tool.js";
import { isArtifactsAvailable } from "./artifactAvailability.js";
import { mainObservedArtifactVersion } from "./readObservation.js";
import { isAbortError } from "../../utils/errors.js";

//@ chunk-18hwfzwa.js:364649-364722 placement
function renameSessionQuietly(h, x, storageV5, credentials) {
  return renameSession(h, x, storageV5, false, false, credentials).then(
    () => {},
    (error) => logError(error),
  );
}
//@ chunk-18hwfzwa.js:364722-366016 placement
/**
 * artifact 监听的错误文案表：功能关闭、会话不支持、按原因（flag/remote/not_found/other_org 等）的具体说明与“监听未能重启”的提示。
 */
var ARTIFACT_WATCH_ERRORS = {
  feature_off: "Artifact watching is not available in this build.",
  fetch_gate: "Artifact watching is not available for this session.",
  arm_error: "Could not start the artifact watch.",
};
var ARTIFACT_WATCH_REASON_TEXTS = {
  flag_off: "Artifact watching is not available for this account yet.",
  remote: "Artifact watching isn't supported yet from remote sessions.",
  not_found: "Artifact not found \u2014 it may have been deleted or is not shared with you.",
  other_org:
    "This Artifact is in another of your organizations. Run /login and sign in to that organization to watch it.",
  public_outside_org:
    "This is a public Artifact from outside your organization; it can be read but not watched.",
  no_subscription_token: "This artifact cannot be watched from this account.",
  boot_failed: "Could not start the watch for this artifact.",
  cp_override: "Artifact watching is disabled in this environment.",
  egress_denied: "Artifact watching is blocked by this sandbox's network policy.",
  watch_cap: "This session already watches the maximum number of artifacts.",
  ws_open_error: "Could not open the live connection to the artifact. Try again shortly.",
  sync_unavailable: "The live connection to the artifact is not available right now. Try again shortly.",
};
var WATCH_RESTART_PREFIX = "The artifact watch on ";
var WATCH_RESTART_SUFFIX = " could not be restarted \u2014 you are NOT currently watching it.";
//@ chunk-18hwfzwa.js:366016-366057 placement
function watchRestartText(h) {
  return `${WATCH_RESTART_PREFIX}${h}${WATCH_RESTART_SUFFIX}`;
}
//@ chunk-18hwfzwa.js:366057-366460 placement
function artifactWatchStartNotice(h, x, userMessageFinder) {
  let L = watchRestartText(x.url);
  let ee = artifactViewerUrlSpellings({
    slug: x.slug,
    env: claudeAiEnvironment(),
  });
  let max = Math.max(
    ...ee.map((He) => userMessageFinder(watchRestartText(He))),
    userMessageFinder(WATCH_NOT_CARRIED_NOTICE),
  );
  let metaMessage = h.metaMessage;
  if (metaMessage !== undefined) {
    let max_2 = Math.max(...ee.map((We) => userMessageFinder(metaMessage.replaceAll(x.url, We))));
    return max_2 !== -1 && max_2 > max ? undefined : metaMessage;
  }
  let max_2 = Math.max(
    ...ee.map((He) =>
      userMessageFinder(
        `The user started this session watching the artifact ${He} (via claude --watch-artifact)`,
      ),
    ),
  );
  if (max_2 !== -1 && max_2 > max) return L;
  return;
}
//@ chunk-18hwfzwa.js:366460-366782 placement
/**
 * 恢复会话时说明：此前用 --watch-artifact 开始的监视不会延续到本会话，当前并未监视该 artifact。
 */
var WATCH_NOT_CARRIED_NOTICE =
  "The watch started with claude --watch-artifact earlier in this transcript does not carry into this session \u2014 you are NOT currently watching that artifact. Run claude --watch-artifact again to watch it from here. (Automatic version-change notices may still appear for artifacts this conversation worked on.)";
//@ chunk-18hwfzwa.js:366782-367104 placement
/**
 * 从后往前扫描提醒文本：若找到"本会话通过 --watch-artifact 监听某 artifact"的记录且与当前监听目标不同（并且之后没有已发过的提示），返回"监听不会延续到本会话"的提示。
 */
function getWatchNotCarriedNotice(h, slugFromAnyText, url) {
  for (let idx = h.length - 1; idx >= 0; idx--) {
    let ee = h[idx];
    if (
      ee.startsWith(WATCH_NOT_CARRIED_NOTICE) ||
      (ee.startsWith(WATCH_RESTART_PREFIX) && ee.includes(WATCH_RESTART_SUFFIX))
    )
      return;
    let match =
      /^The user started this session watching the artifact (\S+) \(via claude --watch-artifact\)/.exec(ee);
    let Re = match === null ? null : slugFromAnyText(match[1]);
    if (Re !== null && (url === undefined || Re !== slugFromAnyText(url))) return WATCH_NOT_CARRIED_NOTICE;
  }
  return;
}
//@ chunk-18hwfzwa.js:367104-367153 placement
function userMessageTexts(h) {
  return h.flatMap((x) => getUserMessageText(x) ?? []);
}
//@ chunk-18hwfzwa.js:367153-367262 placement
function makeUserMessageFinder(h) {
  return (x) => {
    for (let idx = h.length - 1; idx >= 0; idx--)
      if ((getUserMessageText(h[idx]) ?? "").startsWith(x)) return idx;
    return -1;
  };
}
//@ chunk-18hwfzwa.js:367262-367349 placement
function slugFromAnyText(h) {
  let lower = h.toLowerCase();
  if (ARTIFACT_SLUG_RE.test(lower)) return lower;
  return parseArtifactUrlAnyCase(h)?.slug ?? null;
}
//@ chunk-18hwfzwa.js:367349-368800 placement
async function startArtifactWatch(h) {
  let { target, commentVerbsInSchema, getKnownVer, context } = h;
  let ke = isBuiltInArtifactHiddenForMcp();
  let tool =
    ke &&
    canPostReply(
      context,
      {
        slug: target.slug,
        env: claudeAiEnvironment(),
      },
      target.url,
    )
      ? undefined
      : h.tool;
  let arm = h.arm ?? watchArtifactFromStartup;
  let commentWakeGate = h.commentWakeGate ?? isAutoreactArmed;
  let We = await arm({
    slug: target.slug,
    url: target.url,
    getKnownVer,
    tool,
    commentVerbsInSchema,
    context,
  });
  if (We.outcome === "skipped") {
    (We.reason === "not_found" ||
      We.reason === "other_org" ||
      We.reason === "boot_failed" ||
      We.reason === "ws_open_error"
      ? logFeatureBad
      : logFeatureSad)("artifact_watch_startup", We.reason);
    return {
      notificationText:
        ARTIFACT_WATCH_REASON_TEXTS[We.reason] ?? `Could not start the artifact watch (${We.reason}).`,
    };
  }
  let ze =
    tool !== undefined && commentVerbsInSchema && commentWakeGate() && !isSlugStoppedAnywhere(target.slug);
  logFeatureOk("artifact_watch_startup", {
    already_watching: We.outcome === "already_watching",
    comments: ze,
  });
  let Xe =
    ze &&
    !(
      ke &&
      canAutoreactWithoutPrompts({
        ...context,
        permissionLayers: undefined,
      })
    );
  let rt = describeFrameDomains();
  return {
    notificationText:
      Xe && ke
        ? `${BOXED_DIAMOND_GLYPH} Watching artifact for new versions and comments you send to Claude.`
        : `${BOXED_DIAMOND_GLYPH} Watching artifact \u2014 Claude keeps track of new versions${Xe ? " and hears comments" : ""}.`,
    metaMessage: `The user started this session watching the artifact ${target.url} (via claude --watch-artifact). It is the current artifact of interest. ${rt.contentReadsBlocked ?? `Re-read it before editing or republishing${ke ? "" : ` (${rt.readRemedy})`}.`} A republish starts no turn${ke ? "" : "; some Artifact results open with one line saying a newer version was published"}.${Xe ? (ke ? " You will be notified when the user sends you one of its comments." : " You will be notified when it receives comments.") : ""}`,
  };
}
//@ chunk-18hwfzwa.js:368800-369774 placement
function useArtifactWatchStartup({
  initialMessages,
  transcript,
  store,
  storageV5,
  addNotification,
  artifactMountGate,
}) {
  let Re = initialMessages ?? [];
  let Be = (watchNotCarriedNotice) => {
    if (watchNotCarriedNotice === undefined) return;
    transcript.apply({
      type: "append",
      messages: [
        createUserMessage({
          content: watchNotCarriedNotice,
          isMeta: true,
        }),
      ],
    });
  };
  let He = takePendingWatchArtifact();
  if (He === null) {
    Be(getWatchNotCarriedNotice(userMessageTexts(Re), slugFromAnyText));
    return;
  }
  Be(getWatchNotCarriedNotice(userMessageTexts(Re), slugFromAnyText, He.url));
  if (He.autoReactDisarmed)
    disarmAutoreact({
      storageV5,
    });
  let We = (text) =>
    addNotification({
      key: "watch-artifact",
      kind: "feedback",
      text,
      priority: "immediate",
    });
  let userMessageFinder = makeUserMessageFinder(Re);
  let Xe = () => {
    Be(
      artifactWatchStartNotice(
        {
          notificationText: "",
        },
        He,
        userMessageFinder,
      ),
    );
  };
  artifactMountGate()
    .then(({ toolUseContext, allowed }) => {
      if (!allowed) {
        logFeatureSad("artifact_watch_startup", "fetch_gate");
        We(ARTIFACT_WATCH_ERRORS.fetch_gate);
        Xe();
        return;
      }
      let At =
        findToolByName(toolUseContext.options.tools ?? [], ARTIFACT_TOOL_NAME) ?? hiddenBuiltInArtifactTool();
      return startArtifactWatch({
        target: He,
        ...(At !== undefined && {
          tool: At,
        }),
        commentVerbsInSchema: isArtifactsAvailable(),
        getKnownVer: () => mainObservedArtifactVersion(store.getState(), He.slug),
        context: toolUseContext,
      }).then((artifactWatch) => {
        try {
          We(artifactWatch.notificationText);
          Be(artifactWatchStartNotice(artifactWatch, He, userMessageFinder));
        } catch (error) {
          if (!isAbortError(error)) logError(error);
        }
      });
    })
    .catch(() => {
      logFeatureBad("artifact_watch_startup", "arm_error");
      We(ARTIFACT_WATCH_ERRORS.arm_error);
      try {
        Xe();
      } catch (error) {
        if (!isAbortError(error)) logError(error);
      }
    });
}
export { useArtifactWatchStartup, renameSessionQuietly };
