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
import { hf } from "../../utils/permissions/autoModeRulesPrompt.js";
import { takePendingWatchArtifact } from "../../cli/watchArtifactArgs.js";
import { findToolByName } from "../../Tool.js";
import { Xb } from "./artifactAvailability.js";
import { mainObservedArtifactVersion } from "./readObservation.js";
import { isAbortError } from "../../utils/errors.js";

//@ chunk-18hwfzwa.js:364649-364722 placement
function sje(h, x, D, L) {
  return renameSession(h, x, D, !1, !1, L).then(
    () => {},
    (ee) => logError(ee),
  );
}
//@ chunk-18hwfzwa.js:364722-366016 placement
var ARTIFACT_WATCH_ERRORS = {
    feature_off: "Artifact watching is not available in this build.",
    fetch_gate: "Artifact watching is not available for this session.",
    arm_error: "Could not start the artifact watch.",
  },
  XBt = {
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
  },
  aje = "The artifact watch on ",
  lje = " could not be restarted \u2014 you are NOT currently watching it.";
//@ chunk-18hwfzwa.js:366016-366057 placement
function ije(h) {
  return `${aje}${h}${lje}`;
}
//@ chunk-18hwfzwa.js:366057-366460 placement
function artifactWatchStartNotice(h, x, D) {
  let L = ije(x.url),
    ee = artifactViewerUrlSpellings({ slug: x.slug, env: claudeAiEnvironment() }),
    max = Math.max(...ee.map((He) => D(ije(He))), D(WATCH_NOT_CARRIED_NOTICE)),
    metaMessage = h.metaMessage;
  if (metaMessage !== void 0) {
    let max_2 = Math.max(...ee.map((We) => D(metaMessage.replaceAll(x.url, We))));
    return max_2 !== -1 && max_2 > max ? void 0 : metaMessage;
  }
  let max_2 = Math.max(
    ...ee.map((He) =>
      D(`The user started this session watching the artifact ${He} (via claude --watch-artifact)`),
    ),
  );
  if (max_2 !== -1 && max_2 > max) return L;
  return;
}
/**
 * 恢复会话时说明：此前用 --watch-artifact 开始的监视不会延续到本会话，当前并未监视该 artifact。
 */
//@ chunk-18hwfzwa.js:366460-366782 placement
var WATCH_NOT_CARRIED_NOTICE =
  "The watch started with claude --watch-artifact earlier in this transcript does not carry into this session \u2014 you are NOT currently watching that artifact. Run claude --watch-artifact again to watch it from here. (Automatic version-change notices may still appear for artifacts this conversation worked on.)";
/**
 * 从后往前扫描提醒文本：若找到"本会话通过 --watch-artifact 监听某 artifact"的记录且与当前监听目标不同（并且之后没有已发过的提示），返回"监听不会延续到本会话"的提示。
 */
//@ chunk-18hwfzwa.js:366782-367104 placement
function getWatchNotCarriedNotice(h, x, D) {
  for (let L = h.length - 1; L >= 0; L--) {
    let ee = h[L];
    if (ee.startsWith(WATCH_NOT_CARRIED_NOTICE) || (ee.startsWith(aje) && ee.includes(lje))) return;
    let match =
        /^The user started this session watching the artifact (\S+) \(via claude --watch-artifact\)/.exec(ee),
      Re = match === null ? null : x(match[1]);
    if (Re !== null && (D === void 0 || Re !== x(D))) return WATCH_NOT_CARRIED_NOTICE;
  }
  return;
}
//@ chunk-18hwfzwa.js:367104-367153 placement
function Vae(h) {
  return h.flatMap((x) => getUserMessageText(x) ?? []);
}
//@ chunk-18hwfzwa.js:367153-367262 placement
function makeUserMessageFinder(h) {
  return (x) => {
    for (let D = h.length - 1; D >= 0; D--) if ((getUserMessageText(h[D]) ?? "").startsWith(x)) return D;
    return -1;
  };
}
//@ chunk-18hwfzwa.js:367262-367349 placement
function Kae(h) {
  let lower = h.toLowerCase();
  if (ARTIFACT_SLUG_RE.test(lower)) return lower;
  return parseArtifactUrlAnyCase(h)?.slug ?? null;
}
//@ chunk-18hwfzwa.js:367349-368800 placement
async function startArtifactWatch(h) {
  let {
      target: target,
      commentVerbsInSchema: commentVerbsInSchema,
      getKnownVer: getKnownVer,
      context: context,
    } = h,
    ke = isBuiltInArtifactHiddenForMcp(),
    Re =
      ke && canPostReply(context, { slug: target.slug, env: claudeAiEnvironment() }, target.url)
        ? void 0
        : h.tool,
    Be = h.arm ?? watchArtifactFromStartup,
    He = h.commentWakeGate ?? isAutoreactArmed,
    We = await Be({
      slug: target.slug,
      url: target.url,
      getKnownVer: getKnownVer,
      tool: Re,
      commentVerbsInSchema: commentVerbsInSchema,
      context: context,
    });
  if (We.outcome === "skipped")
    return (
      (We.reason === "not_found" ||
        We.reason === "other_org" ||
        We.reason === "boot_failed" ||
        We.reason === "ws_open_error"
        ? logFeatureBad
        : logFeatureSad)("artifact_watch_startup", We.reason),
      { notificationText: XBt[We.reason] ?? `Could not start the artifact watch (${We.reason}).` }
    );
  let ze = Re !== void 0 && commentVerbsInSchema && He() && !isSlugStoppedAnywhere(target.slug);
  logFeatureOk("artifact_watch_startup", {
    already_watching: We.outcome === "already_watching",
    comments: ze,
  });
  let Xe = ze && !(ke && canAutoreactWithoutPrompts({ ...context, permissionLayers: void 0 })),
    rt = describeFrameDomains();
  return {
    notificationText:
      Xe && ke
        ? `${hf} Watching artifact for new versions and comments you send to Claude.`
        : `${hf} Watching artifact \u2014 Claude keeps track of new versions${Xe ? " and hears comments" : ""}.`,
    metaMessage: `The user started this session watching the artifact ${target.url} (via claude --watch-artifact). It is the current artifact of interest. ${rt.contentReadsBlocked ?? `Re-read it before editing or republishing${ke ? "" : ` (${rt.readRemedy})`}.`} A republish starts no turn${ke ? "" : "; some Artifact results open with one line saying a newer version was published"}.${Xe ? (ke ? " You will be notified when the user sends you one of its comments." : " You will be notified when it receives comments.") : ""}`,
  };
}
//@ chunk-18hwfzwa.js:368800-369774 placement
function useArtifactWatchStartup({
  initialMessages: initialMessages,
  transcript: transcript,
  store: store,
  storageV5: storageV5,
  addNotification: addNotification,
  artifactMountGate: artifactMountGate,
}) {
  let Re = initialMessages ?? [],
    Be = (rt) => {
      if (rt === void 0) return;
      transcript.apply({ type: "append", messages: [createUserMessage({ content: rt, isMeta: !0 })] });
    },
    He = takePendingWatchArtifact();
  if (He === null) {
    Be(getWatchNotCarriedNotice(Vae(Re), Kae));
    return;
  }
  if ((Be(getWatchNotCarriedNotice(Vae(Re), Kae, He.url)), He.autoReactDisarmed))
    disarmAutoreact({ storageV5: storageV5 });
  let We = (rt) =>
      addNotification({ key: "watch-artifact", kind: "feedback", text: rt, priority: "immediate" }),
    ze = makeUserMessageFinder(Re),
    Xe = () => {
      Be(artifactWatchStartNotice({ notificationText: "" }, He, ze));
    };
  artifactMountGate()
    .then(({ toolUseContext: toolUseContext, allowed: allowed }) => {
      if (!allowed) {
        (logFeatureSad("artifact_watch_startup", "fetch_gate"), We(ARTIFACT_WATCH_ERRORS.fetch_gate), Xe());
        return;
      }
      let At =
        findToolByName(toolUseContext.options.tools ?? [], ARTIFACT_TOOL_NAME) ?? hiddenBuiltInArtifactTool();
      return startArtifactWatch({
        target: He,
        ...(At !== void 0 && { tool: At }),
        commentVerbsInSchema: Xb(),
        getKnownVer: () => mainObservedArtifactVersion(store.getState(), He.slug),
        context: toolUseContext,
      }).then((It) => {
        try {
          (We(It.notificationText), Be(artifactWatchStartNotice(It, He, ze)));
        } catch (error) {
          if (!isAbortError(error)) logError(error);
        }
      });
    })
    .catch(() => {
      (logFeatureBad("artifact_watch_startup", "arm_error"), We(ARTIFACT_WATCH_ERRORS.arm_error));
      try {
        Xe();
      } catch (error) {
        if (!isAbortError(error)) logError(error);
      }
    });
}

export { useArtifactWatchStartup, sje };
