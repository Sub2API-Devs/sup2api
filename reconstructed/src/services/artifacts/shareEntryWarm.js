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
async function warmShareEntry(e, r, debugLabel, n) {
  if (!!r.toolUseId && probeAnswered(getShareEntry(e.slug), r.toolUseId)) return;
  let { signal } = r.abortController;
  if (signal.aborted) throw new AbortError("artifact permission check aborted");
  let l = othersArtifactReadConsentSurface();
  let f = n?.readBack !== true;
  let w = f && (!l || artifactHostAnswerAtHand(e));
  let b = l ? probeArtifactHostEgress(e, signal) : undefined;
  if (w && getReusableProbedEntry(e.slug) !== undefined) {
    await b;
    if (signal.aborted) throw new AbortError("artifact permission check aborted");
    if (reuseProbedEntry(e.slug, r.toolUseId)) return;
  }
  let d = n?.readBack === true ? `${e.slug}?readback` : e.slug;
  let reusableProbeInFlight = getReusableProbeInFlight(d);
  let a = reusableProbeInFlight ?? startShareProbe(d, e, r, n);
  let [s] = await Promise.all([
    reusableProbeInFlight !== undefined ? awaitProbeRead(reusableProbeInFlight, signal) : a.read,
    b,
  ]);
  if (s === undefined) {
    if (signal.aborted) throw new AbortError("artifact permission check aborted");
    let reusableProbeInFlight_2 = getReusableProbeInFlight(d);
    if (reusableProbeInFlight_2 !== undefined && reusableProbeInFlight_2 !== reusableProbeInFlight) {
      a = reusableProbeInFlight_2;
      s = await awaitProbeRead(reusableProbeInFlight_2, signal);
    }
  }
  if (s === undefined) {
    if (f && reuseProbedEntry(e.slug, r.toolUseId)) return;
    a = startShareProbe(d, e, r, n);
    s = await a.read;
  }
  foldShareProbe(e.slug, s, {
    consumedByCheck: true,
    toolUseId: r.toolUseId,
    issuedAt: a.issuedAt,
    probeId: a.id,
    debugLabel,
  });
}
//@ chunk-hfg56cbz.js:1294-1472 placement
async function reprobeShareEntry(e, r, debugLabel) {
  let issuedAt = Date.now();
  let o = await probeArtifactAccess(e, r.abortController.signal, r.credentials);
  foldShareProbe(e.slug, o, {
    consumedByCheck: false,
    toolUseId: r.toolUseId,
    issuedAt,
    debugLabel,
  });
}
//@ chunk-hfg56cbz.js:1472-1591 placement
function isProbeReusable(e) {
  let now = Date.now();
  let min = Math.min(env.CLAUDE_CODE_ARTIFACT_SHARE_PROBE_REUSE_MS ?? MAX_PROBE_REUSE_MS, MAX_PROBE_REUSE_MS);
  return now >= e && now - e < min && !issuedUnderDepartedAccount(e);
}
//@ chunk-hfg56cbz.js:1591-1711 placement
function getReusableProbedEntry(e) {
  let shareEntry = getShareEntry(e);
  return shareEntry?.lastProbeAt !== undefined &&
    shareEntry.lastProbeIssuedAt !== undefined &&
    isProbeReusable(shareEntry.lastProbeIssuedAt)
    ? shareEntry
    : undefined;
}
//@ chunk-hfg56cbz.js:1711-1799 placement
function clearProbeInFlight(e, r) {
  let { checkProbesInFlight } = getLiveState().shareStatus;
  if (checkProbesInFlight.get(e) === r) checkProbesInFlight.delete(e);
}
//@ chunk-hfg56cbz.js:1799-2015 placement
/**
 * 发起分享状态探测
 */
function startShareProbe(e, r, t, n) {
  let o = {
    id: Symbol("share probe"),
    issuedAt: Date.now(),
    read: probeArtifactAccess(r, t.abortController.signal, t.credentials, n),
  };
  o.read.then(
    () => clearProbeInFlight(e, o),
    () => clearProbeInFlight(e, o),
  );
  getLiveState().shareStatus.checkProbesInFlight.set(e, o);
  return o;
}
//@ chunk-hfg56cbz.js:2015-2130 placement
function reuseProbedEntry(slug, toolUseId) {
  let reusableProbedEntry = getReusableProbedEntry(slug);
  if (reusableProbedEntry === undefined) return false;
  if (toolUseId !== undefined)
    setShareEntry(slug, {
      ...reusableProbedEntry,
      ...stampProbeUse(reusableProbedEntry, toolUseId, true),
    });
  bookShareStatusUse(reusableProbedEntry, false, true);
  return true;
}
//@ chunk-hfg56cbz.js:2130-2236 placement
function getReusableProbeInFlight(e) {
  let r = getLiveState().shareStatus.checkProbesInFlight.get(e);
  return r !== undefined && isProbeReusable(r.issuedAt) ? r : undefined;
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
