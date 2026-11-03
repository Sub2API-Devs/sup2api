/**
 * services/artifacts/boot.ts
 *
 * 2.1.316 新增：artifact boot 数据请求（含缓存、分享密钥、中继）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jv307fw4.js (2)
 * attribution: placement 2
 */
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { PASSIVE } from "./pageScripts.js";
import { buildFrameHeaders, getTransportErrorProps, SAFE_ERROR_CODE_RE } from "./frameApi.js";
import {
  ACCESS_PROBE_TIMEOUT_MS,
  CROSS_ORG_SHARE_HINT,
  EMAIL_INVITE_HINT,
  isOrgMismatchBody,
  OTHER_ORG_MESSAGE,
  requestAccessSchema,
  ORG_SCOPE_CACHE_MS,
} from "./orgScope.js";
import {
  relayIsOnlyRoute,
  frameApi,
  threwOnRelayLeg,
  sandboxEgressOf,
  isFrameNoVersionBody,
  isFrameNotFoundBody,
} from "./frameRelay.js";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";
import { isTransportError } from "../http/externalHttp.js";
import { setSandboxEgress } from "./sandboxEgress.js";
import { describeArtifactAuthFailure, isFramePublicReadEnabled } from "./frameFlags.js";
import { isChatHostEntrypoint, isClaudeInTeams } from "../../utils/entrypointKinds.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import {
  BOOT_ORG_MISMATCH_CODE,
  foldBootCowritten,
  foldBootAuthoredByOthers,
  foldBootOutsidersMayHaveWritten,
  foldBootOutsideWriter,
  foldBootKind,
  foldBootDocs,
  foldBootExternal,
  foldBootOutsideOrgReader,
  foldBootTypeLocked,
  typeSlugOf,
  getShareEntry,
} from "./shareEntries.js";
import { artifactDocsOrFiles } from "./artifactToolGates.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { applyTypeAttestation } from "./typeInstances.js";
import { logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { checkBehindLive } from "./liveSubscribe.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-jv307fw4.js:27247-32307 placement
/**
 * 向 artifact 服务（或经会话网关/中继）请求 boot 数据：校验环境、处理 sk 分享密钥、版本、只走中继等选项。
 */
async function fetchArtifactBoot(
  { slug, env, sk, vanity },
  signal,
  {
    kind = "probe",
    relayOnly = false,
    agentPeer = false,
    actorId = false,
    syncLive = false,
    watchBoot = false,
    readBack = false,
    lean,
    pastVer,
    credentials,
  },
) {
  let S = claudeAiEnvironment();
  if (env !== S)
    return {
      err: `that artifact URL is for ${env} claude.ai, but this session targets ${S}`,
      errorCode: "env_mismatch",
    };
  let R =
    "via=model_read" +
    (kind === "probe" ? "&bk=probe" : "") +
    (kind === "probe" && lean !== undefined ? `&lean=${encodeURIComponent(lean)}` : "") +
    (agentPeer ? "&peer=agent" : "") +
    (actorId ? "&actor=id" : "") +
    (syncLive ? "&live=sync" : "") +
    (watchBoot || agentPeer || syncLive ? `&vn=${PASSIVE}` : "") +
    (readBack ? "&readback=1" : "") +
    (pastVer !== undefined ? `&ver=${encodeURIComponent(pastVer)}` : "");
  let K = sk === undefined ? "" : `&sk=${encodeURIComponent(sk)}`;
  let F = vanity === undefined ? "" : `&vanity=${encodeURIComponent(vanity)}`;
  let E = `/api/frame/${slug}?${R}${K}${F}`;
  let U = {
    refreshOAuth: true,
    credentials,
    headers: buildFrameHeaders(),
    timeout: ACCESS_PROBE_TIMEOUT_MS,
    signal,
  };
  let A;
  let now = Date.now();
  let startTime = performance.now();
  try {
    A = relayOnly || relayIsOnlyRoute() ? await frameApi.getRelayOnly(E, U) : await frameApi.get(E, U);
  } catch (error) {
    if (isCancel(error)) throw error;
    return {
      err: "artifact read failed (network error)",
      errorCode: "boot_request_error",
      ...(isTransportError(error) && {
        transient: true,
      }),
      request: {
        ...getTransportErrorProps(error, startTime),
        wall_elapsed_ms: Date.now() - now,
        ...(threwOnRelayLeg(error) && {
          relay: true,
        }),
      },
    };
  }
  setSandboxEgress(env, sandboxEgressOf(A));
  if (!A.ok) {
    if (A.reason === "relay-unavailable")
      return {
        err: `artifact read failed (relay unavailable${A.status ? `, HTTP ${A.status}` : ""})`,
        ...(A.status !== 0 && {
          status: A.status,
        }),
        errorCode: "boot_relay_error",
      };
    if (A.reason === "relay-not-served")
      return {
        err: "artifact read failed (the session gateway does not serve this session)",
        errorCode: "boot_relay_not_served",
      };
    return {
      err:
        A.reason === "no-auth"
          ? describeArtifactAuthFailure(A.detail)
          : `artifact read unavailable: ${A.reason}`,
      errorCode: A.reason.replace(/-/g, "_"),
    };
  }
  if (!A.fromFrame)
    return {
      err: `artifact read failed (relay HTTP ${A.status})`,
      status: A.status,
      errorCode: "boot_relay_error",
    };
  let x = isChatHostEntrypoint() ? "Slack" : isClaudeInTeams() ? "Teams" : undefined;
  let I = `${x ?? "chat"} channel`;
  let de = `add this ${I} (under "Add people, groups, or Claude Tags", paste the channel ID)`;
  let pe = `sharing with a person or service account does not reach a ${I}'s Claude \u2014 ask the owner to open Share and ${de}, or widen General access to the organization`;
  let be = `${pe}.`;
  if (A.status === 404) {
    let L = isFrameNoVersionBody(A.data);
    let fe = isRemoteManagedEnvironment() && A.route === "direct";
    return {
      err: L
        ? "this artifact exists but nothing has been published to it yet, so there is nothing to read"
        : `artifact not found \u2014 it may have been deleted, or it has not been shared with you${x === undefined ? (fe ? `. ${CROSS_ORG_SHARE_HINT}` : `. ${EMAIL_INVITE_HINT}`) : `. If it is restricted to specific people, ${pe}${fe ? `. ${CROSS_ORG_SHARE_HINT}` : ""}`}`,
      status: 404,
      ...(isFrameNotFoundBody(A.data) && {
        gone: true,
      }),
      ...(L && {
        neverPublished: true,
      }),
      errorCode: "boot_404",
    };
  }
  if (A.status === 403 && isOrgMismatchBody(A.data))
    return {
      err: OTHER_ORG_MESSAGE,
      status: 403,
      otherOrg: true,
      errorCode: BOOT_ORG_MISMATCH_CODE,
    };
  if (A.status === 403) {
    let L = requestAccessSchema().safeParse(A.data);
    if (L.success && L.data.reason === "agent_not_added")
      return {
        err: `this artifact is restricted to specific people, and this ${I}'s Claude is not one of them: ${be}`,
        status: 403,
        errorCode: "boot_403_agent_not_added",
      };
    if (L.success && L.data.reason === "agent_owned")
      return {
        err:
          x === undefined
            ? "this artifact belongs to a chat channel's Claude and has not been shared with you \u2014 ask someone in the channel it was published from to open Share on it and add you."
            : `this artifact belongs to another ${I}'s Claude and has not been shared with this one \u2014 ask someone in the channel it was published from to open Share on it and ${de}.`,
        status: 403,
        errorCode: "boot_403_agent_owned",
      };
    if (L.success && L.data.request_access)
      return {
        err: "you do not have access to this artifact. Open the link in a browser to request access from the owner.",
        status: 403,
        errorCode: "boot_403_request_access",
      };
  }
  if (A.status === 400 && pastVer !== undefined)
    return {
      err: "the server refused that version id (HTTP 400). Most likely it is not among the ones kept for this artifact: list its versions for the ids that are.",
      status: 400,
      errorCode: "boot_unknown_ver",
    };
  if (A.status < 200 || A.status >= 300)
    return {
      err: `artifact read failed (HTTP ${A.status})`,
      status: A.status,
      errorCode: "boot_failed",
    };
  let B = A.data ?? {};
  let { ver, assetToken } = B;
  let he = B.mode === "public" || B.kind === "public";
  if (!ver || (!assetToken && !he))
    return {
      err: "artifact read failed: incomplete boot response",
      errorCode: "boot_incomplete",
    };
  if (!SAFE_ERROR_CODE_RE.test(ver))
    return {
      err: "artifact read failed: malformed boot response",
      errorCode: "boot_bad_ver",
    };
  if (pastVer !== undefined) {
    foldBootCowritten(slug, B.cowritten);
    foldBootAuthoredByOthers(slug, B.authoredByOthers);
    foldBootOutsidersMayHaveWritten(slug, B.outsidersMayHaveWritten);
    if (B.outsideWriter === true) foldBootOutsideWriter(slug, true);
    if (ver !== pastVer)
      return {
        err: "artifact read failed: the server served a different version from the one asked for, so nothing was read. It does that for an account that cannot edit the artifact; for one that can, the server ignored the version asked for.",
        errorCode: "boot_past_ver_ignored",
      };
    return {
      err: null,
      data: B,
      ver,
      assetToken: assetToken || undefined,
      route: A.route,
    };
  }
  foldBootKind(slug, B.artifactKind);
  foldBootDocs(slug, artifactDocsOrFiles(B), now);
  foldBootCowritten(slug, B.cowritten);
  foldBootAuthoredByOthers(slug, B.authoredByOthers);
  foldBootOutsidersMayHaveWritten(slug, B.outsidersMayHaveWritten);
  foldBootOutsideWriter(slug, B.outsideWriter);
  let re = B.lean === true;
  let X = B.mode === "external";
  if (!re) foldBootExternal(slug, X);
  if (isFramePublicReadEnabled()) foldBootOutsideOrgReader(slug, !assetToken);
  foldBootTypeLocked(slug, B.type);
  let { probeBoots } = getLiveState().shareStatus;
  let ce = probeBoots.get(slug);
  if (ce !== undefined && ce.boot.ver !== ver) probeBoots.delete(slug);
  if (!re && !he && (!X || B.perm?.role === "writer"))
    applyTypeAttestation(slug, B.typeFacts, typeSlugOf(getShareEntry(slug)), now, {
      external: X,
    });
  return {
    err: null,
    data: B,
    ver,
    assetToken: assetToken || undefined,
    route: A.route,
  };
}
//@ chunk-jv307fw4.js:32307-34155 placement
/**
 * fetchArtifactBoot 的带缓存版本：复用同一 tool use 的探测结果，处理公开读门槛与推测性请求。
 */
async function fetchArtifactBootWithProbe(
  e,
  n,
  signal,
  {
    kind = "probe",
    gatePublicRead = true,
    relayOnly = false,
    agentPeer = false,
    actorId = false,
    syncLive = false,
    watchBoot = false,
    lean,
    speculative = false,
    readBack = false,
    pastVer,
    credentials,
    probeToolUseId,
  },
) {
  let R = speculative ? logFeatureSad : logFeatureBad;
  let K;
  if (
    probeToolUseId !== undefined &&
    !agentPeer &&
    !actorId &&
    !syncLive &&
    !watchBoot &&
    lean === undefined &&
    pastVer === undefined &&
    !speculative
  ) {
    let { probeBoots } = getLiveState().shareStatus;
    let now = Date.now();
    for (let [x, I] of probeBoots) if (now - I.issuedAt > ORG_SCOPE_CACHE_MS) probeBoots.delete(x);
    let H = probeBoots.get(e.slug);
    if (
      H !== undefined &&
      H.toolUseId === probeToolUseId &&
      (kind === "probe" || H.boot.data.typeInstance === false) &&
      !(relayOnly && isRemoteManagedEnvironment() && H.boot.route !== "relay") &&
      !checkBehindLive(e.slug, H.boot.ver).behind
    ) {
      K = {
        ...H.boot,
        reused: true,
      };
      logForDebugging(
        `[artifact] ${n}: ${kind}-kind boot served from this tool use's share probe (probe issued ${now - H.issuedAt}ms ago) slug=${e.slug}`,
      );
    }
  }
  let F = {
    kind,
    relayOnly,
    agentPeer,
    actorId,
    syncLive,
    watchBoot,
    readBack,
    pastVer,
    credentials,
  };
  let E =
    K ??
    (await fetchArtifactBoot(e, signal, {
      ...F,
      lean: lean?.version,
    }));
  if (
    lean !== undefined &&
    (E.err === null ? E.data.lean === true && !lean.mustCarry(E.data) : E.errorCode === "boot_incomplete")
  ) {
    logFeatureSad(n, "lean_boot_incomplete");
    logForDebugging(
      `[artifact] ${n}: the answer to a lean boot request was incomplete; booting in full slug=${e.slug}`,
    );
    E = await fetchArtifactBoot(e, signal, F);
  }
  if (E.err !== null) {
    let A =
      E.errorCode === "boot_request_error" || E.errorCode === "boot_failed"
        ? {
            ...E.request,
            ...(E.status !== undefined && {
              http_status: E.status,
            }),
            ...(syncLive && {
              sync_live: true,
            }),
            ...(agentPeer && {
              agent_peer: true,
            }),
            ...(relayOnly && {
              relay_only: true,
            }),
          }
        : undefined;
    if (A !== undefined) R(n, E.errorCode, A);
    else R(n, E.errorCode);
    return {
      err: E.err,
      ...(E.status !== undefined && {
        status: E.status,
      }),
      ...(E.gone && {
        gone: true,
      }),
      ...(E.neverPublished && {
        neverPublished: true,
      }),
      ...(E.otherOrg && {
        otherOrg: true,
      }),
      ...(E.transient && {
        transient: true,
      }),
      errorCode: E.errorCode,
    };
  }
  let U = E;
  if (gatePublicRead && U.assetToken === undefined && !isFramePublicReadEnabled()) {
    R(n, "public_read_disabled");
    return {
      err: "artifact read failed: this artifact is served to you as a public (non-member) reader, and reading public artifacts that way is not enabled yet",
      errorCode: "public_read_disabled",
    };
  }
  return U;
}
export { fetchArtifactBootWithProbe, fetchArtifactBoot };
