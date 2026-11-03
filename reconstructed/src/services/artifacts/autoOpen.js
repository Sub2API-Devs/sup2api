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
import { Die } from "../../bridge/inboundMessageOrigin.js";
import { surfacedViaForEntrypoint, trackFrameEvent } from "./publishArtifact.js";
import { detectClientSurface } from "../../utils/clientSurface.js";
import { isEnvDefinedFalsy } from "../../utils/envUtils.js";
import { env } from "../../utils/env.js";
import { openValidatedUrl } from "../../utils/browser.js";
import { logForDebugging } from "../../utils/debug.js";

/**
 * 发布后在交互界面自动打开 artifact（非子代理、账号一致、非 Remote Control 跳过等）。
 */
//@ chunk-qxvqcab6.js:1955-2160 placement
function maybeAutoOpenArtifact(e, n, r) {
  let o = getLiveState();
  if (
    n.agentId !== void 0 ||
    !derivePublishContext(n).hasInteractiveUI ||
    o.accountEpoch !== r.account ||
    o.conversationEpoch !== r.conversation
  )
    return;
  o.deferredSurface.set(e.slug, { slug: e.slug, url: e.url });
}
//@ chunk-qxvqcab6.js:2160-2430 placement
function surfaceDeferredArtifact(e, n) {
  let r = getLiveState(),
    o = r.deferredSurface.get(n);
  if (o === void 0) return;
  if (r.remoteControlSkippedSlugs.has(n) && Die(e.options.messageClientPlatform)) return;
  if (
    (r.deferredSurface.delete(n),
    autoOpenArtifactPreview(e, !0, o, !1) === "auto_open_skipped_remote_control")
  )
    r.deferredSurface.set(n, o);
}
//@ chunk-qxvqcab6.js:2430-3311 placement
function autoOpenArtifactPreview(e, n, r, o, s) {
  if (!n) return null;
  let u = surfacedViaForEntrypoint(),
    a = detectClientSurface(),
    l = Die(e.options.messageClientPlatform),
    d = getLiveState(),
    p =
      o && !d.remoteControlSkippedSlugs.has(r.slug)
        ? "auto_open_skipped_redeploy"
        : a !== null
          ? `auto_open_skipped_${a}`
          : l
            ? "auto_open_skipped_remote_control"
            : isEnvDefinedFalsy(env.CLAUDE_CODE_ARTIFACT_AUTO_OPEN)
              ? "auto_open_skipped_env"
              : null;
  if (p !== null) {
    if (p === "auto_open_skipped_remote_control") d.remoteControlSkippedSlugs.add(r.slug);
    return (
      trackFrameEvent("frame_surfaced", { slug: r.slug, via: u, mode: p, credentials: e.credentials }),
      p
    );
  }
  d.remoteControlSkippedSlugs.delete(r.slug);
  let url = r.url;
  try {
    let c = new URL(r.url);
    (c.searchParams.set("via", "auto_preview"), (url = c.toString()));
  } catch {}
  return (
    openValidatedUrl(url).then((c) => {
      if (!c.ok) logForDebugging(`[artifact] auto-open failed (${c.reason}): ${c.detail ?? ""}`);
      (s?.(c.ok),
        trackFrameEvent("frame_surfaced", {
          slug: r.slug,
          via: u,
          mode: c.ok ? "auto_open_ok" : `auto_open_failed_${c.reason}`,
          credentials: e.credentials,
        }));
    }),
    null
  );
}
//@ chunk-qxvqcab6.js:3339-3350 placement
var AUTO_OPEN_HOOK = null;
//@ chunk-qxvqcab6.js:3350-3404 placement
function frameUrlFor(e, n) {
  return e.getAppState().frameUrls[n];
}

export {
  surfaceDeferredArtifact,
  autoOpenArtifactPreview,
  frameUrlFor,
  maybeAutoOpenArtifact,
  AUTO_OPEN_HOOK,
};
