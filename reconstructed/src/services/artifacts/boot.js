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
import { buildFrameHeaders, getTransportErrorProps, V6 } from "./frameApi.js";
import {
  vFr,
  CROSS_ORG_SHARE_HINT,
  EMAIL_INVITE_HINT,
  isOrgMismatchBody,
  OTHER_ORG_MESSAGE,
  Jt,
  st,
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
import { mn } from "../../utils/remoteEnvironment.js";
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

/**
 * 向 artifact 服务（或经会话网关/中继）请求 boot 数据：校验环境、处理 sk 分享密钥、版本、只走中继等选项。
 */
//@ chunk-jv307fw4.js:27247-32307 placement
async function fetchArtifactBoot(
  { slug: slug, env: env, sk: sk, vanity: vanity },
  a,
  {
    kind: kind = "probe",
    relayOnly: relayOnly = !1,
    agentPeer: agentPeer = !1,
    actorId: actorId = !1,
    syncLive: syncLive = !1,
    watchBoot: watchBoot = !1,
    readBack: readBack = !1,
    lean: lean,
    pastVer: pastVer,
    credentials: credentials,
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
      (kind === "probe" && lean !== void 0 ? `&lean=${encodeURIComponent(lean)}` : "") +
      (agentPeer ? "&peer=agent" : "") +
      (actorId ? "&actor=id" : "") +
      (syncLive ? "&live=sync" : "") +
      (watchBoot || agentPeer || syncLive ? `&vn=${PASSIVE}` : "") +
      (readBack ? "&readback=1" : "") +
      (pastVer !== void 0 ? `&ver=${encodeURIComponent(pastVer)}` : ""),
    K = sk === void 0 ? "" : `&sk=${encodeURIComponent(sk)}`,
    F = vanity === void 0 ? "" : `&vanity=${encodeURIComponent(vanity)}`,
    E = `/api/frame/${slug}?${R}${K}${F}`,
    U = { refreshOAuth: !0, credentials: credentials, headers: buildFrameHeaders(), timeout: vFr, signal: a },
    A,
    now = Date.now(),
    startTime = performance.now();
  try {
    A = relayOnly || relayIsOnlyRoute() ? await frameApi.getRelayOnly(E, U) : await frameApi.get(E, U);
  } catch (error) {
    if (isCancel(error)) throw error;
    return {
      err: "artifact read failed (network error)",
      errorCode: "boot_request_error",
      ...(isTransportError(error) && { transient: !0 }),
      request: {
        ...getTransportErrorProps(error, startTime),
        wall_elapsed_ms: Date.now() - now,
        ...(threwOnRelayLeg(error) && { relay: !0 }),
      },
    };
  }
  if ((setSandboxEgress(env, sandboxEgressOf(A)), !A.ok)) {
    if (A.reason === "relay-unavailable")
      return {
        err: `artifact read failed (relay unavailable${A.status ? `, HTTP ${A.status}` : ""})`,
        ...(A.status !== 0 && { status: A.status }),
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
  let x = isChatHostEntrypoint() ? "Slack" : isClaudeInTeams() ? "Teams" : void 0,
    I = `${x ?? "chat"} channel`,
    de = `add this ${I} (under "Add people, groups, or Claude Tags", paste the channel ID)`,
    pe = `sharing with a person or service account does not reach a ${I}'s Claude \u2014 ask the owner to open Share and ${de}, or widen General access to the organization`,
    be = `${pe}.`;
  if (A.status === 404) {
    let L = isFrameNoVersionBody(A.data),
      fe = mn() && A.route === "direct";
    return {
      err: L
        ? "this artifact exists but nothing has been published to it yet, so there is nothing to read"
        : `artifact not found \u2014 it may have been deleted, or it has not been shared with you${x === void 0 ? (fe ? `. ${CROSS_ORG_SHARE_HINT}` : `. ${EMAIL_INVITE_HINT}`) : `. If it is restricted to specific people, ${pe}${fe ? `. ${CROSS_ORG_SHARE_HINT}` : ""}`}`,
      status: 404,
      ...(isFrameNotFoundBody(A.data) && { gone: !0 }),
      ...(L && { neverPublished: !0 }),
      errorCode: "boot_404",
    };
  }
  if (A.status === 403 && isOrgMismatchBody(A.data))
    return { err: OTHER_ORG_MESSAGE, status: 403, otherOrg: !0, errorCode: BOOT_ORG_MISMATCH_CODE };
  if (A.status === 403) {
    let safeParse = Jt().safeParse(A.data);
    if (safeParse.success && safeParse.data.reason === "agent_not_added")
      return {
        err: `this artifact is restricted to specific people, and this ${I}'s Claude is not one of them: ${be}`,
        status: 403,
        errorCode: "boot_403_agent_not_added",
      };
    if (safeParse.success && safeParse.data.reason === "agent_owned")
      return {
        err:
          x === void 0
            ? "this artifact belongs to a chat channel's Claude and has not been shared with you \u2014 ask someone in the channel it was published from to open Share on it and add you."
            : `this artifact belongs to another ${I}'s Claude and has not been shared with this one \u2014 ask someone in the channel it was published from to open Share on it and ${de}.`,
        status: 403,
        errorCode: "boot_403_agent_owned",
      };
    if (safeParse.success && safeParse.data.request_access)
      return {
        err: "you do not have access to this artifact. Open the link in a browser to request access from the owner.",
        status: 403,
        errorCode: "boot_403_request_access",
      };
  }
  if (A.status === 400 && pastVer !== void 0)
    return {
      err: "the server refused that version id (HTTP 400). Most likely it is not among the ones kept for this artifact: list its versions for the ids that are.",
      status: 400,
      errorCode: "boot_unknown_ver",
    };
  if (A.status < 200 || A.status >= 300)
    return { err: `artifact read failed (HTTP ${A.status})`, status: A.status, errorCode: "boot_failed" };
  let B = A.data ?? {},
    { ver: ver, assetToken: assetToken } = B,
    he = B.mode === "public" || B.kind === "public";
  if (!ver || (!assetToken && !he))
    return { err: "artifact read failed: incomplete boot response", errorCode: "boot_incomplete" };
  if (!V6.test(ver))
    return { err: "artifact read failed: malformed boot response", errorCode: "boot_bad_ver" };
  if (pastVer !== void 0) {
    if (
      (foldBootCowritten(slug, B.cowritten),
      foldBootAuthoredByOthers(slug, B.authoredByOthers),
      foldBootOutsidersMayHaveWritten(slug, B.outsidersMayHaveWritten),
      B.outsideWriter === !0)
    )
      foldBootOutsideWriter(slug, !0);
    if (ver !== pastVer)
      return {
        err: "artifact read failed: the server served a different version from the one asked for, so nothing was read. It does that for an account that cannot edit the artifact; for one that can, the server ignored the version asked for.",
        errorCode: "boot_past_ver_ignored",
      };
    return { err: null, data: B, ver: ver, assetToken: assetToken || void 0, route: A.route };
  }
  (foldBootKind(slug, B.artifactKind),
    foldBootDocs(slug, artifactDocsOrFiles(B), now),
    foldBootCowritten(slug, B.cowritten),
    foldBootAuthoredByOthers(slug, B.authoredByOthers),
    foldBootOutsidersMayHaveWritten(slug, B.outsidersMayHaveWritten),
    foldBootOutsideWriter(slug, B.outsideWriter));
  let re = B.lean === !0,
    X = B.mode === "external";
  if (!re) foldBootExternal(slug, X);
  if (isFramePublicReadEnabled()) foldBootOutsideOrgReader(slug, !assetToken);
  foldBootTypeLocked(slug, B.type);
  let { probeBoots: probeBoots } = getLiveState().shareStatus,
    ce = probeBoots.get(slug);
  if (ce !== void 0 && ce.boot.ver !== ver) probeBoots.delete(slug);
  if (!re && !he && (!X || B.perm?.role === "writer"))
    applyTypeAttestation(slug, B.typeFacts, typeSlugOf(getShareEntry(slug)), now, { external: X });
  return { err: null, data: B, ver: ver, assetToken: assetToken || void 0, route: A.route };
}
/**
 * fetchArtifactBoot 的带缓存版本：复用同一 tool use 的探测结果，处理公开读门槛与推测性请求。
 */
//@ chunk-jv307fw4.js:32307-34155 placement
async function fetchArtifactBootWithProbe(
  e,
  n,
  r,
  {
    kind: kind = "probe",
    gatePublicRead: gatePublicRead = !0,
    relayOnly: relayOnly = !1,
    agentPeer: agentPeer = !1,
    actorId: actorId = !1,
    syncLive: syncLive = !1,
    watchBoot: watchBoot = !1,
    lean: lean,
    speculative: speculative = !1,
    readBack: readBack = !1,
    pastVer: pastVer,
    credentials: credentials,
    probeToolUseId: probeToolUseId,
  },
) {
  let R = speculative ? logFeatureSad : logFeatureBad,
    K;
  if (
    probeToolUseId !== void 0 &&
    !agentPeer &&
    !actorId &&
    !syncLive &&
    !watchBoot &&
    lean === void 0 &&
    pastVer === void 0 &&
    !speculative
  ) {
    let { probeBoots: probeBoots } = getLiveState().shareStatus,
      now = Date.now();
    for (let [x, I] of probeBoots) if (now - I.issuedAt > st) probeBoots.delete(x);
    let H = probeBoots.get(e.slug);
    if (
      H !== void 0 &&
      H.toolUseId === probeToolUseId &&
      (kind === "probe" || H.boot.data.typeInstance === !1) &&
      !(relayOnly && mn() && H.boot.route !== "relay") &&
      !checkBehindLive(e.slug, H.boot.ver).behind
    )
      ((K = { ...H.boot, reused: !0 }),
        logForDebugging(
          `[artifact] ${n}: ${kind}-kind boot served from this tool use's share probe (probe issued ${now - H.issuedAt}ms ago) slug=${e.slug}`,
        ));
  }
  let F = {
      kind: kind,
      relayOnly: relayOnly,
      agentPeer: agentPeer,
      actorId: actorId,
      syncLive: syncLive,
      watchBoot: watchBoot,
      readBack: readBack,
      pastVer: pastVer,
      credentials: credentials,
    },
    E = K ?? (await fetchArtifactBoot(e, r, { ...F, lean: lean?.version }));
  if (
    lean !== void 0 &&
    (E.err === null ? E.data.lean === !0 && !lean.mustCarry(E.data) : E.errorCode === "boot_incomplete")
  )
    (logFeatureSad(n, "lean_boot_incomplete"),
      logForDebugging(
        `[artifact] ${n}: the answer to a lean boot request was incomplete; booting in full slug=${e.slug}`,
      ),
      (E = await fetchArtifactBoot(e, r, F)));
  if (E.err !== null) {
    let A =
      E.errorCode === "boot_request_error" || E.errorCode === "boot_failed"
        ? {
            ...E.request,
            ...(E.status !== void 0 && { http_status: E.status }),
            ...(syncLive && { sync_live: !0 }),
            ...(agentPeer && { agent_peer: !0 }),
            ...(relayOnly && { relay_only: !0 }),
          }
        : void 0;
    if (A !== void 0) R(n, E.errorCode, A);
    else R(n, E.errorCode);
    return {
      err: E.err,
      ...(E.status !== void 0 && { status: E.status }),
      ...(E.gone && { gone: !0 }),
      ...(E.neverPublished && { neverPublished: !0 }),
      ...(E.otherOrg && { otherOrg: !0 }),
      ...(E.transient && { transient: !0 }),
      errorCode: E.errorCode,
    };
  }
  let U = E;
  if (gatePublicRead && U.assetToken === void 0 && !isFramePublicReadEnabled())
    return (
      R(n, "public_read_disabled"),
      {
        err: "artifact read failed: this artifact is served to you as a public (non-member) reader, and reading public artifacts that way is not enabled yet",
        errorCode: "public_read_disabled",
      }
    );
  return U;
}

export { fetchArtifactBootWithProbe, fetchArtifactBoot };
