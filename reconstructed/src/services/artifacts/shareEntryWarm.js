/**
 * services/artifacts/shareEntryWarm.ts
 *
 * 2.1.316 新增。预热 artifact 分享条目（分享状态探测）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hfg56cbz.js (10)
 * attribution: placement 10
 */
import {
  probeAnswered,
  getShareEntry,
  foldShareProbe,
  issuedUnderDepartedAccount,
  setShareEntry,
  stampProbeUse,
  bookShareStatusUse,
} from "./shareEntries.js";
import { AbortError } from "../../utils/errors.js";
import { othersArtifactReadConsentSurface } from "./artifactToolGates.js";
import { artifactHostAnswerAtHand, probeArtifactHostEgress } from "./hostEgressProbe.js";
import { probeArtifactAccess } from "./audience.js";
import { env } from "../../utils/env.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";

//@ chunk-hfg56cbz.js:474-485 placement
var MAX_PROBE_REUSE_MS = 1000;
//@ chunk-hfg56cbz.js:485-1294 placement
/**
 * 预热 artifact 分享条目（分享状态探测）。
 */
async function warmShareEntry(target, context, debugLabel, options) {
  if (!!context.toolUseId && probeAnswered(getShareEntry(target.slug), context.toolUseId)) return;
  let { signal } = context.abortController;
  if (signal.aborted) throw new AbortError("artifact permission check aborted");
  let otherConsent = othersArtifactReadConsentSurface();
  let shouldProbe = options?.readBack !== true;
  let shouldReuse = shouldProbe && (!otherConsent || artifactHostAnswerAtHand(target));
  let egressProbe = otherConsent ? probeArtifactHostEgress(target, signal) : undefined;
  if (shouldReuse && getReusableProbedEntry(target.slug) !== undefined) {
    await egressProbe;
    if (signal.aborted) throw new AbortError("artifact permission check aborted");
    if (reuseProbedEntry(target.slug, context.toolUseId)) return;
  }
  let probeKey = options?.readBack === true ? `${target.slug}?readback` : target.slug;
  let reusableProbeInFlight = getReusableProbeInFlight(probeKey);
  let probe = reusableProbeInFlight ?? startShareProbe(probeKey, target, context, options);
  let [read] = await Promise.all([
    reusableProbeInFlight !== undefined ? awaitProbeRead(reusableProbeInFlight, signal) : probe.read,
    egressProbe,
  ]);
  if (read === undefined) {
    if (signal.aborted) throw new AbortError("artifact permission check aborted");
    let reusableProbeInFlight_2 = getReusableProbeInFlight(probeKey);
    if (reusableProbeInFlight_2 !== undefined && reusableProbeInFlight_2 !== reusableProbeInFlight) {
      probe = reusableProbeInFlight_2;
      read = await awaitProbeRead(reusableProbeInFlight_2, signal);
    }
  }
  if (read === undefined) {
    if (shouldProbe && reuseProbedEntry(target.slug, context.toolUseId)) return;
    probe = startShareProbe(probeKey, target, context, options);
    read = await probe.read;
  }
  foldShareProbe(target.slug, read, {
    consumedByCheck: true,
    toolUseId: context.toolUseId,
    issuedAt: probe.issuedAt,
    probeId: probe.id,
    debugLabel,
  });
}
//@ chunk-hfg56cbz.js:1294-1472 placement
async function reprobeShareEntry(slug, context, debugLabel) {
  let issuedAt = Date.now();
  let result = await probeArtifactAccess(slug, context.abortController.signal, context.credentials);
  foldShareProbe(slug.slug, result, {
    consumedByCheck: false,
    toolUseId: context.toolUseId,
    issuedAt,
    debugLabel,
  });
}
//@ chunk-hfg56cbz.js:1472-1591 placement
function isProbeReusable(entry) {
  let now = Date.now();
  let min = Math.min(env.CLAUDE_CODE_ARTIFACT_SHARE_PROBE_REUSE_MS ?? MAX_PROBE_REUSE_MS, MAX_PROBE_REUSE_MS);
  return now >= entry && now - entry < min && !issuedUnderDepartedAccount(entry);
}
//@ chunk-hfg56cbz.js:1591-1711 placement
function getReusableProbedEntry(slug) {
  let shareEntry = getShareEntry(slug);
  return shareEntry?.lastProbeAt !== undefined &&
    shareEntry.lastProbeIssuedAt !== undefined &&
    isProbeReusable(shareEntry.lastProbeIssuedAt)
    ? shareEntry
    : undefined;
}
//@ chunk-hfg56cbz.js:1711-1799 placement
function clearProbeInFlight(slug, probe) {
  let { checkProbesInFlight } = getLiveState().shareStatus;
  if (checkProbesInFlight.get(slug) === probe) checkProbesInFlight.delete(slug);
}
//@ chunk-hfg56cbz.js:1799-2015 placement
/**
 * 发起分享状态探测
 */
function startShareProbe(slug, context, toolUseId, options) {
  let probe = {
    id: Symbol("share probe"),
    issuedAt: Date.now(),
    read: probeArtifactAccess(context, toolUseId.abortController.signal, toolUseId.credentials, options),
  };
  probe.read.then(
    () => clearProbeInFlight(slug, probe),
    () => clearProbeInFlight(slug, probe),
  );
  getLiveState().shareStatus.checkProbesInFlight.set(slug, probe);
  return probe;
}
//@ chunk-hfg56cbz.js:2015-2130 placement
function reuseProbedEntry(slug, toolUseId) {
  let entry = getReusableProbedEntry(slug);
  if (entry === undefined) return false;
  if (toolUseId !== undefined)
    setShareEntry(slug, {
      ...entry,
      ...stampProbeUse(entry, toolUseId, true),
    });
  bookShareStatusUse(entry, false, true);
  return true;
}
//@ chunk-hfg56cbz.js:2130-2236 placement
function getReusableProbeInFlight(slug) {
  let probe = getLiveState().shareStatus.checkProbesInFlight.get(slug);
  return probe !== undefined && isProbeReusable(probe.issuedAt) ? probe : undefined;
}
//@ chunk-hfg56cbz.js:2236-2374 placement
async function awaitProbeRead(reusableProbeInFlight, signal) {
  try {
    return await raceWithAbortSignal(
      reusableProbeInFlight.read,
      signal,
      () => new AbortError("artifact permission check aborted"),
    );
  } catch (error) {
    if (signal.aborted) throw error;
    return;
  }
}
export { warmShareEntry, reprobeShareEntry };
