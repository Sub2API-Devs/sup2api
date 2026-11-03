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
  let entrypointKind = getEntrypointKind();
  let r = !e.isNonInteractiveSession || entrypointKind === "claude-vscode" || isHostEntrypoint();
  let publishContext =
    e.agentType === "teammate" || isTeammate()
      ? "teammate"
      : e.agentId !== undefined
        ? "subagent"
        : isBgSession()
          ? "bg_session"
          : entrypointKind === "sdk-ts" || entrypointKind === "sdk-py"
            ? "sdk"
            : r
              ? "interactive"
              : "print";
  return {
    hasInteractiveUI: r,
    publishContext,
  };
}
//@ chunk-06y4szbn.js:45204-45322 placement
function artifactReadObservationIn(e) {
  return (n) => {
    let r = e();
    return {
      ver: r.artifactReadVersions?.[n],
      observers: r.artifactReadObservers?.[n],
    };
  };
}
//@ chunk-06y4szbn.js:45322-45395 placement = getCurrentAgentInfo (0.426)
function observationStamp(agentId, messageId, r) {
  return (
    `${agentId ?? "main"}
${messageId ?? ""}` +
    (r === undefined
      ? ""
      : `
${r}`)
  );
}
//@ chunk-06y4szbn.js:45395-45423 placement
var OBSERVATION_KIND_RANK = {
  summary: 0,
  source: 1,
};
//@ chunk-06y4szbn.js:45423-45579 placement
function sourcelessObservation(e, n, r, s) {
  let h = getLiveState().readDeliveries.get(replicaKey(e, n));
  return h !== undefined && s !== undefined && s !== "" && h.ver === r && h.batch === s && h.kind !== "source"
    ? h.kind
    : undefined;
}
//@ chunk-06y4szbn.js:45579-45679 placement
function observedWithoutSource(agentId, slug, ver) {
  let s = getLiveState().readDeliveries.get(replicaKey(agentId, slug));
  return s !== undefined && s.ver === ver && !s.sourced;
}
//@ chunk-06y4szbn.js:45679-45701 placement
var OWN_MINT_SENTINEL = "\x00own-mint";
//@ chunk-06y4szbn.js:45701-45744 placement
function ownMintStamp(agentId) {
  return `${agentId ?? "main"}
${OWN_MINT_SENTINEL}`;
}
//@ chunk-06y4szbn.js:45744-45842 placement
function versionHeldAsOwnMint(e, ver) {
  return e.ver === ver && e.observers !== undefined && Object.values(e.observers).includes("");
}
//@ chunk-06y4szbn.js:45842-45944 placement
function mainObservedArtifactVersion(state, n) {
  return observedVersion({
    ver: state.artifactReadVersions?.[n],
    observers: state.artifactReadObservers?.[n],
  });
}
//@ chunk-06y4szbn.js:45944-45996 placement
function observedVersion(e) {
  return hasMainKey(e.observers) ? e.ver : undefined;
}
//@ chunk-06y4szbn.js:45996-46033 placement
function makeMainObservedVersionReader(getArtifactReadObservation, slug) {
  return () => observedVersion(getArtifactReadObservation(slug));
}
//@ chunk-06y4szbn.js:46033-47310 placement
function makeSetArtifactReadVersion(setAppState) {
  return (n, r, s) => {
    if (r !== undefined && !ARTIFACT_VERSION_SAFE_RE.test(r)) return;
    let h =
      s?.indexOf(`
`) ?? -1;
    let b = s === undefined ? undefined : s.slice(0, h);
    let y = s === undefined ? "" : s.slice(h + 1);
    let index = y.indexOf(`
`);
    let w = index < 0 ? y : y.slice(0, index);
    let sliced = y.slice(index + 1);
    let C = index < 0 ? undefined : sliced === "summary" ? sliced : undefined;
    let k = w === OWN_MINT_SENTINEL;
    let V = k ? "" : w;
    if (b !== undefined) {
      let readDeliveries = getLiveState().readDeliveries;
      let q = replicaKey(b, n);
      let W = readDeliveries.get(q);
      let G = C ?? "source";
      let sourced = G === "source" || (W !== undefined && W.ver === r && W.sourced);
      if (r === undefined) readDeliveries.delete(q);
      else if (
        W === undefined ||
        W.ver !== r ||
        W.batch !== V ||
        OBSERVATION_KIND_RANK[G] > OBSERVATION_KIND_RANK[W.kind]
      )
        readDeliveries.set(q, {
          ver: r,
          batch: V,
          kind: G,
          sourced,
        });
    }
    if (b !== undefined && !k) {
      let L = getLiveState().refusedPublishBodies.get(replicaKey(b, n));
      if (L !== undefined && L.observedFrom === undefined && (V === "" || V !== L.batch)) L.observedFrom = V;
      if (
        L?.sourceless !== undefined &&
        !C &&
        r !== undefined &&
        (L.live === undefined || r === L.live || (compareNumericPrefix(r, L.live) ?? -1) > 0)
      ) {
        delete L.sourceless;
        L.live ??= r;
      }
    }
    if (b !== undefined && r !== undefined) {
      let L = getLiveState().refusedPublishBodies.get(replicaKey(b, n));
      if (L?.withheld) delete L.withheld;
    }
    setAppState((L) => {
      let q = L.artifactReadVersions?.[n];
      let W = L.artifactReadObservers?.[n];
      let G =
        r === undefined || b === undefined
          ? undefined
          : r === q
            ? W === undefined || Object.hasOwn(W, b)
              ? W
              : {
                  ...W,
                  [b]: V,
                }
            : {
                [b]: V,
              };
      if (q === r && W === G) return L;
      let { [n]: P, ...j } = L.artifactReadVersions ?? {};
      let { [n]: X, ...ge } = L.artifactReadObservers ?? {};
      return {
        ...L,
        artifactReadVersions:
          r === undefined
            ? j
            : {
                ...j,
                [n]: r,
              },
        artifactReadObservers:
          G === undefined
            ? ge
            : {
                ...ge,
                [n]: G,
              },
      };
    });
  };
}
//@ chunk-06y4szbn.js:47310-47525 placement
function artifactVersionObserved(e, n, agentId, s) {
  let h = e?.[n];
  if (h === undefined)
    return {
      observed: true,
      siblingInFlight: false,
    };
  let b = agentId ?? "main";
  let y = Object.hasOwn(h, b) ? h[b] : undefined;
  let x = y !== undefined && y !== "" && y === s;
  return {
    observed: y !== undefined && !x,
    siblingInFlight: x,
  };
}
//@ chunk-06y4szbn.js:47525-48003 placement
function makeSetArtifactContractTarget(setAppState) {
  return (n, r, s) =>
    setAppState((h) => {
      let contractVersion = parseContractVersion(r);
      let artifactRefs = h.artifactRefs ?? [];
      let found = artifactRefs.find((artifactRef) => artifactRef.slug === n);
      let w = contractVersion ?? found?.pin;
      if (s?.cachePinOnly) {
        if (found !== undefined) {
          if (found.pin === w) return h;
          return {
            ...h,
            artifactRefs: artifactRefs.map((artifactRef) =>
              artifactRef.slug === n
                ? {
                    slug: n,
                    ...(w !== undefined && {
                      pin: w,
                    }),
                  }
                : artifactRef,
            ),
          };
        }
        if (w === undefined) return h;
        if (artifactRefs.length === 0) return h;
        return {
          ...h,
          artifactRefs: [
            ...artifactRefs,
            {
              slug: n,
              pin: w,
            },
          ],
        };
      }
      if (artifactRefs[0]?.slug === n && artifactRefs[0].pin === w) return h;
      return {
        ...h,
        artifactRefs: [
          {
            slug: n,
            ...(w !== undefined && {
              pin: w,
            }),
          },
          ...artifactRefs.filter((artifactRef) => artifactRef.slug !== n),
        ],
      };
    });
}
//@ chunk-06y4szbn.js:48003-48149 placement
function makeGetArtifactContractTarget(getAppState) {
  return () => {
    let artifactRefs = getAppState().artifactRefs ?? [];
    let r = {};
    for (let artifactRef of artifactRefs)
      if (artifactRef.pin !== undefined) r[artifactRef.slug] = artifactRef.pin;
    return {
      targetSlug: artifactRefs[0]?.slug,
      pins: r,
    };
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
