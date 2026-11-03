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
function maybeAutoOpenArtifact(e, n, r) {
  let liveState = getLiveState();
  if (
    n.agentId !== undefined ||
    !derivePublishContext(n).hasInteractiveUI ||
    liveState.accountEpoch !== r.account ||
    liveState.conversationEpoch !== r.conversation
  )
    return;
  liveState.deferredSurface.set(e.slug, {
    slug: e.slug,
    url: e.url,
  });
}
//@ chunk-qxvqcab6.js:2160-2430 placement
function surfaceDeferredArtifact(e, slug) {
  let liveState = getLiveState();
  let o = liveState.deferredSurface.get(slug);
  if (o === undefined) return;
  if (
    liveState.remoteControlSkippedSlugs.has(slug) &&
    isDefinedHumanClientPlatform(e.options.messageClientPlatform)
  )
    return;
  liveState.deferredSurface.delete(slug);
  if (autoOpenArtifactPreview(e, true, o, false) === "auto_open_skipped_remote_control")
    liveState.deferredSurface.set(slug, o);
}
//@ chunk-qxvqcab6.js:2430-3311 placement
function autoOpenArtifactPreview(e, n, r, o, s) {
  if (!n) return null;
  let via = surfacedViaForEntrypoint();
  let clientSurface = detectClientSurface();
  let l = isDefinedHumanClientPlatform(e.options.messageClientPlatform);
  let liveState = getLiveState();
  let p =
    o && !liveState.remoteControlSkippedSlugs.has(r.slug)
      ? "auto_open_skipped_redeploy"
      : clientSurface !== null
        ? `auto_open_skipped_${clientSurface}`
        : l
          ? "auto_open_skipped_remote_control"
          : isEnvDefinedFalsy(env.CLAUDE_CODE_ARTIFACT_AUTO_OPEN)
            ? "auto_open_skipped_env"
            : null;
  if (p !== null) {
    if (p === "auto_open_skipped_remote_control") liveState.remoteControlSkippedSlugs.add(r.slug);
    trackFrameEvent("frame_surfaced", {
      slug: r.slug,
      via,
      mode: p,
      credentials: e.credentials,
    });
    return p;
  }
  liveState.remoteControlSkippedSlugs.delete(r.slug);
  let url = r.url;
  try {
    let c = new URL(r.url);
    c.searchParams.set("via", "auto_preview");
    url = c.toString();
  } catch {}
  openValidatedUrl(url).then((validatedUrl) => {
    if (!validatedUrl.ok)
      logForDebugging(`[artifact] auto-open failed (${validatedUrl.reason}): ${validatedUrl.detail ?? ""}`);
    s?.(validatedUrl.ok);
    trackFrameEvent("frame_surfaced", {
      slug: r.slug,
      via,
      mode: validatedUrl.ok ? "auto_open_ok" : `auto_open_failed_${validatedUrl.reason}`,
      credentials: e.credentials,
    });
  });
  return null;
}
//@ chunk-qxvqcab6.js:3339-3350 placement
var AUTO_OPEN_HOOK = null;
//@ chunk-qxvqcab6.js:3350-3404 placement
function frameUrlFor(context, n) {
  return context.getAppState().frameUrls[n];
}
export {
  surfaceDeferredArtifact,
  autoOpenArtifactPreview,
  frameUrlFor,
  maybeAutoOpenArtifact,
  AUTO_OPEN_HOOK,
};
