/**
 * services/artifacts/readObservation.ts
 *
 * 2.1.316 新增：artifact 读取版本与契约目标的观测记录
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-51jy8ztq.js (16)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getEntrypointKind, isHostEntrypoint } from "../../utils/entrypointKinds.js";
import { isTeammate } from "../../utils/teammate.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { getLiveState, replicaKey } from "../liveReplica/liveReplica.js";
import { hasMainKey } from "../../utils/agentContext.js";
import { ARTIFACT_VERSION_SAFE_RE } from "../../tools/ArtifactTool/constants.js";
import { compareNumericPrefix } from "../../utils/textNormalize.js";
import { parseContractVersion } from "./capabilityDeclaration.js";

//@ chunk-51jy8ztq.js:47178-47454 placement
function derivePublishContextFrom(options) {
  let entrypointKind = getEntrypointKind();
  let interactive =
    !options.isNonInteractiveSession || entrypointKind === "claude-vscode" || isHostEntrypoint();
  let publishContext =
    options.agentType === "teammate" || isTeammate()
      ? "teammate"
      : options.agentId !== undefined
        ? "subagent"
        : isBgSession()
          ? "bg_session"
          : entrypointKind === "sdk-ts" || entrypointKind === "sdk-py"
            ? "sdk"
            : interactive
              ? "interactive"
              : "print";
  return {
    hasInteractiveUI: interactive,
    publishContext,
  };
}
//@ chunk-51jy8ztq.js:47454-47572 placement
function artifactReadObservationIn(state) {
  return (handler) => {
    let map = state();
    return {
      ver: map.artifactReadVersions?.[handler],
      observers: map.artifactReadObservers?.[handler],
    };
  };
}
//@ chunk-51jy8ztq.js:47572-47645 placement (2.1.88 match: getCurrentAgentInfo, 0.426)
function observationStamp(agentId, messageId, agentArg) {
  return (
    `${agentId ?? "main"}
${messageId ?? ""}` +
    (agentArg === undefined
      ? ""
      : `
${agentArg}`)
  );
}
//@ chunk-51jy8ztq.js:47645-47673 placement
var OBSERVATION_KIND_RANK = {
  summary: 0,
  source: 1,
};
//@ chunk-51jy8ztq.js:47673-47829 placement
function sourcelessObservation(agentId, slug, ver, source) {
  let deliveries = getLiveState().readDeliveries.get(replicaKey(agentId, slug));
  return deliveries !== undefined &&
    source !== undefined &&
    source !== "" &&
    deliveries.ver === ver &&
    deliveries.batch === source &&
    deliveries.kind !== "source"
    ? deliveries.kind
    : undefined;
}
//@ chunk-51jy8ztq.js:47829-47929 placement
function observedWithoutSource(agentId, slug, ver) {
  let deliveries = getLiveState().readDeliveries.get(replicaKey(agentId, slug));
  return deliveries !== undefined && deliveries.ver === ver && !deliveries.sourced;
}
//@ chunk-51jy8ztq.js:47929-47951 placement
var OWN_MINT_SENTINEL = "\x00own-mint";
//@ chunk-51jy8ztq.js:47951-47994 placement
function ownMintStamp(agentId) {
  return `${agentId ?? "main"}
${OWN_MINT_SENTINEL}`;
}
//@ chunk-51jy8ztq.js:47994-48092 placement
function versionHeldAsOwnMint(ver, ver_2) {
  return ver.ver === ver_2 && ver.observers !== undefined && Object.values(ver.observers).includes("");
}
//@ chunk-51jy8ztq.js:48092-48194 placement
function mainObservedArtifactVersion(state, readState) {
  return observedVersion({
    ver: state.artifactReadVersions?.[readState],
    observers: state.artifactReadObservers?.[readState],
  });
}
//@ chunk-51jy8ztq.js:48194-48246 placement
function observedVersion(entry) {
  return hasMainKey(entry.observers) ? entry.ver : undefined;
}
//@ chunk-51jy8ztq.js:48246-48283 placement
function makeMainObservedVersionReader(getArtifactReadObservation, slug) {
  return () => observedVersion(getArtifactReadObservation(slug));
}
//@ chunk-51jy8ztq.js:48283-49560 placement
function makeSetArtifactReadVersion(setAppState) {
  return (slug, ver, observation) => {
    if (ver !== undefined && !ARTIFACT_VERSION_SAFE_RE.test(ver)) return;
    let firstNl =
      observation?.indexOf(`
`) ?? -1;
    let owner = observation === undefined ? undefined : observation.slice(0, firstNl);
    let rest = observation === undefined ? "" : observation.slice(firstNl + 1);
    let index = rest.indexOf(`
`);
    let batchKey = index < 0 ? rest : rest.slice(0, index);
    let sliced = rest.slice(index + 1);
    let kind = index < 0 ? undefined : sliced === "summary" ? sliced : undefined;
    let ownMint = batchKey === OWN_MINT_SENTINEL;
    let batch = ownMint ? "" : batchKey;
    if (owner !== undefined) {
      let readDeliveries = getLiveState().readDeliveries;
      let key = replicaKey(owner, slug);
      let delivery = readDeliveries.get(key);
      let deliveryKind = kind ?? "source";
      let sourced =
        deliveryKind === "source" || (delivery !== undefined && delivery.ver === ver && delivery.sourced);
      if (ver === undefined) readDeliveries.delete(key);
      else if (
        delivery === undefined ||
        delivery.ver !== ver ||
        delivery.batch !== batch ||
        OBSERVATION_KIND_RANK[deliveryKind] > OBSERVATION_KIND_RANK[delivery.kind]
      )
        readDeliveries.set(key, {
          ver,
          batch,
          kind: deliveryKind,
          sourced,
        });
    }
    if (owner !== undefined && !ownMint) {
      let refused = getLiveState().refusedPublishBodies.get(replicaKey(owner, slug));
      if (
        refused !== undefined &&
        refused.observedFrom === undefined &&
        (batch === "" || batch !== refused.batch)
      )
        refused.observedFrom = batch;
      if (
        refused?.sourceless !== undefined &&
        !kind &&
        ver !== undefined &&
        (refused.live === undefined ||
          ver === refused.live ||
          (compareNumericPrefix(ver, refused.live) ?? -1) > 0)
      ) {
        delete refused.sourceless;
        refused.live ??= ver;
      }
    }
    if (owner !== undefined && ver !== undefined) {
      let refused = getLiveState().refusedPublishBodies.get(replicaKey(owner, slug));
      if (refused?.withheld) delete refused.withheld;
    }
    setAppState((appState) => {
      let existingVer = appState.artifactReadVersions?.[slug];
      let observer = appState.artifactReadObservers?.[slug];
      let rank =
        ver === undefined || owner === undefined
          ? undefined
          : ver === existingVer
            ? observer === undefined || Object.hasOwn(observer, owner)
              ? observer
              : {
                  ...observer,
                  [owner]: batch,
                }
            : {
                [owner]: batch,
              };
      if (existingVer === ver && observer === rank) return appState;
      let { [slug]: next, ...nextObserver } = appState.artifactReadVersions ?? {};
      let { [slug]: versions, ...observers } = appState.artifactReadObservers ?? {};
      return {
        ...appState,
        artifactReadVersions:
          ver === undefined
            ? nextObserver
            : {
                ...nextObserver,
                [slug]: ver,
              },
        artifactReadObservers:
          rank === undefined
            ? observers
            : {
                ...observers,
                [slug]: rank,
              },
      };
    });
  };
}
//@ chunk-51jy8ztq.js:49560-49775 placement
function artifactVersionObserved(versions, slug, agentId, batch) {
  let byAgent = versions?.[slug];
  if (byAgent === undefined)
    return {
      observed: true,
      siblingInFlight: false,
    };
  let agentKey = agentId ?? "main";
  let recorded = Object.hasOwn(byAgent, agentKey) ? byAgent[agentKey] : undefined;
  let siblingInFlight = recorded !== undefined && recorded !== "" && recorded === batch;
  return {
    observed: recorded !== undefined && !siblingInFlight,
    siblingInFlight,
  };
}
//@ chunk-51jy8ztq.js:49775-50253 placement
function makeSetArtifactContractTarget(setAppState) {
  return (toolUseId, body, identity) =>
    setAppState((state) => {
      let contractVersion = parseContractVersion(body);
      let artifactRefs = state.artifactRefs ?? [];
      let found = artifactRefs.find((artifactRef) => artifactRef.slug === toolUseId);
      let pin = contractVersion ?? found?.pin;
      if (identity?.cachePinOnly) {
        if (found !== undefined) {
          if (found.pin === pin) return state;
          return {
            ...state,
            artifactRefs: artifactRefs.map((artifactRef) =>
              artifactRef.slug === toolUseId
                ? {
                    slug: toolUseId,
                    ...(pin !== undefined && {
                      pin,
                    }),
                  }
                : artifactRef,
            ),
          };
        }
        if (pin === undefined) return state;
        if (artifactRefs.length === 0) return state;
        return {
          ...state,
          artifactRefs: [
            ...artifactRefs,
            {
              slug: toolUseId,
              pin,
            },
          ],
        };
      }
      if (artifactRefs[0]?.slug === toolUseId && artifactRefs[0].pin === pin) return state;
      return {
        ...state,
        artifactRefs: [
          {
            slug: toolUseId,
            ...(pin !== undefined && {
              pin,
            }),
          },
          ...artifactRefs.filter((artifactRef) => artifactRef.slug !== toolUseId),
        ],
      };
    });
}
//@ chunk-51jy8ztq.js:50253-50399 placement
function makeGetArtifactContractTarget(getAppState) {
  return () => {
    let artifactRefs = getAppState().artifactRefs ?? [];
    let out = {};
    for (let artifactRef of artifactRefs)
      if (artifactRef.pin !== undefined) out[artifactRef.slug] = artifactRef.pin;
    return {
      targetSlug: artifactRefs[0]?.slug,
      pins: out,
    };
  };
}
export {
  ownMintStamp,
  artifactVersionObserved,
  versionHeldAsOwnMint,
  sourcelessObservation,
  derivePublishContextFrom,
  observationStamp,
  observedWithoutSource,
  artifactReadObservationIn,
  makeMainObservedVersionReader,
  mainObservedArtifactVersion,
  makeSetArtifactReadVersion,
  makeSetArtifactContractTarget,
  makeGetArtifactContractTarget,
};
