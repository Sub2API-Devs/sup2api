/**
 * services/artifacts/autoOpen.ts
 *
 * 2.1.316 新增：发布后自动打开 artifact 预览
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qxvqcab6.js (5)
 * attribution: placement 5
 */
import { getLiveState } from "../liveReplica/liveReplica.js";
import { derivePublishContext } from "../../tools/ArtifactTool/permissions/consentStamps.js";
import { isDefinedHumanClientPlatform } from "../../bridge/inboundMessageOrigin.js";
import { surfacedViaForEntrypoint, trackFrameEvent } from "./publishArtifact.js";
import { detectClientSurface } from "../../utils/clientSurface.js";
import { isEnvDefinedFalsy } from "../../utils/envUtils.js";
import { env } from "../../utils/env.js";
import { openValidatedUrl } from "../../utils/browser.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-qxvqcab6.js:1955-2160 placement
/**
 * 发布后在交互界面自动打开 artifact（非子代理、账号一致、非 Remote Control 跳过等）。
 */
function maybeAutoOpenArtifact(context, url, options) {
  let liveState = getLiveState();
  if (
    url.agentId !== undefined ||
    !derivePublishContext(url).hasInteractiveUI ||
    liveState.accountEpoch !== options.account ||
    liveState.conversationEpoch !== options.conversation
  )
    return;
  liveState.deferredSurface.set(context.slug, {
    slug: context.slug,
    url: context.url,
  });
}
//@ chunk-qxvqcab6.js:2160-2430 placement
function surfaceDeferredArtifact(liveState, slug) {
  let liveState_2 = getLiveState();
  let pending = liveState_2.deferredSurface.get(slug);
  if (pending === undefined) return;
  if (
    liveState_2.remoteControlSkippedSlugs.has(slug) &&
    isDefinedHumanClientPlatform(liveState.options.messageClientPlatform)
  )
    return;
  liveState_2.deferredSurface.delete(slug);
  if (autoOpenArtifactPreview(liveState, true, pending, false) === "auto_open_skipped_remote_control")
    liveState_2.deferredSurface.set(slug, pending);
}
//@ chunk-qxvqcab6.js:2430-3311 placement
function autoOpenArtifactPreview(options, context, artifact, saved, plan) {
  if (!context) return null;
  let via = surfacedViaForEntrypoint();
  let clientSurface = detectClientSurface();
  let humanClient = isDefinedHumanClientPlatform(options.options.messageClientPlatform);
  let liveState = getLiveState();
  let detail =
    saved && !liveState.remoteControlSkippedSlugs.has(artifact.slug)
      ? "auto_open_skipped_redeploy"
      : clientSurface !== null
        ? `auto_open_skipped_${clientSurface}`
        : humanClient
          ? "auto_open_skipped_remote_control"
          : isEnvDefinedFalsy(env.CLAUDE_CODE_ARTIFACT_AUTO_OPEN)
            ? "auto_open_skipped_env"
            : null;
  if (detail !== null) {
    if (detail === "auto_open_skipped_remote_control") liveState.remoteControlSkippedSlugs.add(artifact.slug);
    trackFrameEvent("frame_surfaced", {
      slug: artifact.slug,
      via,
      mode: detail,
      credentials: options.credentials,
    });
    return detail;
  }
  liveState.remoteControlSkippedSlugs.delete(artifact.slug);
  let url = artifact.url;
  try {
    let pageUrl = new URL(artifact.url);
    pageUrl.searchParams.set("via", "auto_preview");
    url = pageUrl.toString();
  } catch {}
  openValidatedUrl(url).then((validatedUrl) => {
    if (!validatedUrl.ok)
      logForDebugging(`[artifact] auto-open failed (${validatedUrl.reason}): ${validatedUrl.detail ?? ""}`);
    plan?.(validatedUrl.ok);
    trackFrameEvent("frame_surfaced", {
      slug: artifact.slug,
      via,
      mode: validatedUrl.ok ? "auto_open_ok" : `auto_open_failed_${validatedUrl.reason}`,
      credentials: options.credentials,
    });
  });
  return null;
}
//@ chunk-qxvqcab6.js:3339-3350 placement
var AUTO_OPEN_HOOK = null;
//@ chunk-qxvqcab6.js:3350-3404 placement
function frameUrlFor(context, url) {
  return context.getAppState().frameUrls[url];
}
export {
  surfaceDeferredArtifact,
  autoOpenArtifactPreview,
  frameUrlFor,
  maybeAutoOpenArtifact,
  AUTO_OPEN_HOOK,
};
