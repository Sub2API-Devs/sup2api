/**
 * services/artifacts/readObservation.ts
 *
 * 2.1.316 新增：artifact 读取版本与契约目标的观测记录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (16)
 * attribution: placement 16
 */
import { getEntrypointKind, isHostEntrypoint } from "../../utils/entrypointKinds.js";
import { isTeammate } from "../../utils/teammate.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { getLiveState, replicaKey } from "../liveReplica/liveReplica.js";
import { hasMainKey } from "../../utils/agentContext.js";
import { ARTIFACT_VERSION_SAFE_RE } from "../../tools/ArtifactTool/constants.js";
import { compareNumericPrefix } from "../../utils/textNormalize.js";
import { parseContractVersion } from "./capabilityDeclaration.js";

//@ chunk-06y4szbn.js:44928-45204 placement
function derivePublishContextFrom(e) {
  let n = getEntrypointKind(),
    r = !e.isNonInteractiveSession || n === "claude-vscode" || isHostEntrypoint(),
    s =
      e.agentType === "teammate" || isTeammate()
        ? "teammate"
        : e.agentId !== void 0
          ? "subagent"
          : isBgSession()
            ? "bg_session"
            : n === "sdk-ts" || n === "sdk-py"
              ? "sdk"
              : r
                ? "interactive"
                : "print";
  return { hasInteractiveUI: r, publishContext: s };
}
//@ chunk-06y4szbn.js:45204-45322 placement
function artifactReadObservationIn(e) {
  return (n) => {
    let r = e();
    return { ver: r.artifactReadVersions?.[n], observers: r.artifactReadObservers?.[n] };
  };
}
//@ chunk-06y4szbn.js:45322-45395 placement = getCurrentAgentInfo (0.426)
function observationStamp(e, n, r) {
  return (
    `${e ?? "main"}
${n ?? ""}` +
    (r === void 0
      ? ""
      : `
${r}`)
  );
}
//@ chunk-06y4szbn.js:45395-45423 placement
var xs = { summary: 0, source: 1 };
//@ chunk-06y4szbn.js:45423-45579 placement
function sourcelessObservation(e, n, r, s) {
  let h = getLiveState().readDeliveries.get(replicaKey(e, n));
  return h !== void 0 && s !== void 0 && s !== "" && h.ver === r && h.batch === s && h.kind !== "source"
    ? h.kind
    : void 0;
}
//@ chunk-06y4szbn.js:45579-45679 placement
function observedWithoutSource(e, n, r) {
  let s = getLiveState().readDeliveries.get(replicaKey(e, n));
  return s !== void 0 && s.ver === r && !s.sourced;
}
//@ chunk-06y4szbn.js:45679-45701 placement
var zs = "\x00own-mint";
//@ chunk-06y4szbn.js:45701-45744 placement
function ownMintStamp(e) {
  return `${e ?? "main"}
${zs}`;
}
//@ chunk-06y4szbn.js:45744-45842 placement
function versionHeldAsOwnMint(e, n) {
  return e.ver === n && e.observers !== void 0 && Object.values(e.observers).includes("");
}
//@ chunk-06y4szbn.js:45842-45944 placement
function mainObservedArtifactVersion(e, n) {
  return Vs({ ver: e.artifactReadVersions?.[n], observers: e.artifactReadObservers?.[n] });
}
//@ chunk-06y4szbn.js:45944-45996 placement
function Vs(e) {
  return hasMainKey(e.observers) ? e.ver : void 0;
}
//@ chunk-06y4szbn.js:45996-46033 placement
function makeMainObservedVersionReader(e, n) {
  return () => Vs(e(n));
}
//@ chunk-06y4szbn.js:46033-47310 placement
function makeSetArtifactReadVersion(e) {
  return (n, r, s) => {
    if (r !== void 0 && !ARTIFACT_VERSION_SAFE_RE.test(r)) return;
    let h =
        s?.indexOf(`
`) ?? -1,
      b = s === void 0 ? void 0 : s.slice(0, h),
      y = s === void 0 ? "" : s.slice(h + 1),
      index = y.indexOf(`
`),
      w = index < 0 ? y : y.slice(0, index),
      sliced = y.slice(index + 1),
      C = index < 0 ? void 0 : sliced === "summary" ? sliced : void 0,
      k = w === zs,
      V = k ? "" : w;
    if (b !== void 0) {
      let readDeliveries = getLiveState().readDeliveries,
        q = replicaKey(b, n),
        W = readDeliveries.get(q),
        G = C ?? "source",
        P = G === "source" || (W !== void 0 && W.ver === r && W.sourced);
      if (r === void 0) readDeliveries.delete(q);
      else if (W === void 0 || W.ver !== r || W.batch !== V || xs[G] > xs[W.kind])
        readDeliveries.set(q, { ver: r, batch: V, kind: G, sourced: P });
    }
    if (b !== void 0 && !k) {
      let L = getLiveState().refusedPublishBodies.get(replicaKey(b, n));
      if (L !== void 0 && L.observedFrom === void 0 && (V === "" || V !== L.batch)) L.observedFrom = V;
      if (
        L?.sourceless !== void 0 &&
        !C &&
        r !== void 0 &&
        (L.live === void 0 || r === L.live || (compareNumericPrefix(r, L.live) ?? -1) > 0)
      )
        (delete L.sourceless, (L.live ??= r));
    }
    if (b !== void 0 && r !== void 0) {
      let L = getLiveState().refusedPublishBodies.get(replicaKey(b, n));
      if (L?.withheld) delete L.withheld;
    }
    e((L) => {
      let q = L.artifactReadVersions?.[n],
        W = L.artifactReadObservers?.[n],
        G =
          r === void 0 || b === void 0
            ? void 0
            : r === q
              ? W === void 0 || Object.hasOwn(W, b)
                ? W
                : { ...W, [b]: V }
              : { [b]: V };
      if (q === r && W === G) return L;
      let { [n]: P, ...j } = L.artifactReadVersions ?? {},
        { [n]: X, ...ge } = L.artifactReadObservers ?? {};
      return {
        ...L,
        artifactReadVersions: r === void 0 ? j : { ...j, [n]: r },
        artifactReadObservers: G === void 0 ? ge : { ...ge, [n]: G },
      };
    });
  };
}
//@ chunk-06y4szbn.js:47310-47525 placement
function artifactVersionObserved(e, n, r, s) {
  let h = e?.[n];
  if (h === void 0) return { observed: !0, siblingInFlight: !1 };
  let b = r ?? "main",
    y = Object.hasOwn(h, b) ? h[b] : void 0,
    x = y !== void 0 && y !== "" && y === s;
  return { observed: y !== void 0 && !x, siblingInFlight: x };
}
//@ chunk-06y4szbn.js:47525-48003 placement
function makeSetArtifactContractTarget(e) {
  return (n, r, s) =>
    e((h) => {
      let b = parseContractVersion(r),
        y = h.artifactRefs ?? [],
        found = y.find((R) => R.slug === n),
        w = b ?? found?.pin;
      if (s?.cachePinOnly) {
        if (found !== void 0) {
          if (found.pin === w) return h;
          return {
            ...h,
            artifactRefs: y.map((R) => (R.slug === n ? { slug: n, ...(w !== void 0 && { pin: w }) } : R)),
          };
        }
        if (w === void 0) return h;
        if (y.length === 0) return h;
        return { ...h, artifactRefs: [...y, { slug: n, pin: w }] };
      }
      if (y[0]?.slug === n && y[0].pin === w) return h;
      return {
        ...h,
        artifactRefs: [{ slug: n, ...(w !== void 0 && { pin: w }) }, ...y.filter((R) => R.slug !== n)],
      };
    });
}
//@ chunk-06y4szbn.js:48003-48149 placement
function makeGetArtifactContractTarget(e) {
  return () => {
    let n = e().artifactRefs ?? [],
      r = {};
    for (let s of n) if (s.pin !== void 0) r[s.slug] = s.pin;
    return { targetSlug: n[0]?.slug, pins: r };
  };
}

export {
  observationStamp,
  ownMintStamp,
  versionHeldAsOwnMint,
  observedWithoutSource,
  derivePublishContextFrom,
  mainObservedArtifactVersion,
  makeMainObservedVersionReader,
  artifactReadObservationIn,
  artifactVersionObserved,
  sourcelessObservation,
  makeSetArtifactReadVersion,
  makeSetArtifactContractTarget,
  makeGetArtifactContractTarget,
};
