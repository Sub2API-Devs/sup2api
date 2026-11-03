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
var h = 1000;
/**
 * 预热 artifact 分享条目（分享状态探测）。
 */
//@ chunk-hfg56cbz.js:485-1294 placement
async function warmShareEntry(e, r, t, n) {
  if (!!r.toolUseId && probeAnswered(getShareEntry(e.slug), r.toolUseId)) return;
  let { signal: signal } = r.abortController;
  if (signal.aborted) throw new AbortError("artifact permission check aborted");
  let l = othersArtifactReadConsentSurface(),
    f = n?.readBack !== !0,
    w = f && (!l || artifactHostAnswerAtHand(e)),
    b = l ? probeArtifactHostEgress(e, signal) : void 0;
  if (w && getReusableProbedEntry(e.slug) !== void 0) {
    if ((await b, signal.aborted)) throw new AbortError("artifact permission check aborted");
    if (reuseProbedEntry(e.slug, r.toolUseId)) return;
  }
  let d = n?.readBack === !0 ? `${e.slug}?readback` : e.slug,
    c = getReusableProbeInFlight(d),
    a = c ?? startShareProbe(d, e, r, n),
    [s] = await Promise.all([c !== void 0 ? awaitProbeRead(c, signal) : a.read, b]);
  if (s === void 0) {
    if (signal.aborted) throw new AbortError("artifact permission check aborted");
    let u = getReusableProbeInFlight(d);
    if (u !== void 0 && u !== c) ((a = u), (s = await awaitProbeRead(u, signal)));
  }
  if (s === void 0) {
    if (f && reuseProbedEntry(e.slug, r.toolUseId)) return;
    ((a = startShareProbe(d, e, r, n)), (s = await a.read));
  }
  foldShareProbe(e.slug, s, {
    consumedByCheck: !0,
    toolUseId: r.toolUseId,
    issuedAt: a.issuedAt,
    probeId: a.id,
    debugLabel: t,
  });
}
//@ chunk-hfg56cbz.js:1294-1472 placement
async function reprobeShareEntry(e, r, t) {
  let now = Date.now(),
    o = await probeArtifactAccess(e, r.abortController.signal, r.credentials);
  foldShareProbe(e.slug, o, { consumedByCheck: !1, toolUseId: r.toolUseId, issuedAt: now, debugLabel: t });
}
//@ chunk-hfg56cbz.js:1472-1591 placement
function isProbeReusable(e) {
  let now = Date.now(),
    min = Math.min(env.CLAUDE_CODE_ARTIFACT_SHARE_PROBE_REUSE_MS ?? h, h);
  return now >= e && now - e < min && !issuedUnderDepartedAccount(e);
}
//@ chunk-hfg56cbz.js:1591-1711 placement
function getReusableProbedEntry(e) {
  let r = getShareEntry(e);
  return r?.lastProbeAt !== void 0 && r.lastProbeIssuedAt !== void 0 && isProbeReusable(r.lastProbeIssuedAt)
    ? r
    : void 0;
}
//@ chunk-hfg56cbz.js:1711-1799 placement
function m(e, r) {
  let { checkProbesInFlight: checkProbesInFlight } = getLiveState().shareStatus;
  if (checkProbesInFlight.get(e) === r) checkProbesInFlight.delete(e);
}
/**
 * 发起分享状态探测
 */
//@ chunk-hfg56cbz.js:1799-2015 placement
function startShareProbe(e, r, t, n) {
  let o = {
    id: Symbol("share probe"),
    issuedAt: Date.now(),
    read: probeArtifactAccess(r, t.abortController.signal, t.credentials, n),
  };
  return (
    o.read.then(
      () => m(e, o),
      () => m(e, o),
    ),
    getLiveState().shareStatus.checkProbesInFlight.set(e, o),
    o
  );
}
//@ chunk-hfg56cbz.js:2015-2130 placement
function reuseProbedEntry(e, r) {
  let t = getReusableProbedEntry(e);
  if (t === void 0) return !1;
  if (r !== void 0) setShareEntry(e, { ...t, ...stampProbeUse(t, r, !0) });
  return (bookShareStatusUse(t, !1, !0), !0);
}
//@ chunk-hfg56cbz.js:2130-2236 placement
function getReusableProbeInFlight(e) {
  let r = getLiveState().shareStatus.checkProbesInFlight.get(e);
  return r !== void 0 && isProbeReusable(r.issuedAt) ? r : void 0;
}
//@ chunk-hfg56cbz.js:2236-2374 placement
async function awaitProbeRead(e, r) {
  try {
    return await raceWithAbortSignal(e.read, r, () => new AbortError("artifact permission check aborted"));
  } catch (error) {
    if (r.aborted) throw error;
    return;
  }
}

export { warmShareEntry, reprobeShareEntry };
