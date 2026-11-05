/**
 * services/artifacts/boot.ts
 *
 * 2.1.316 新增：artifact boot 数据请求（含缓存、分享密钥、中继）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-m0ks5273.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { PASSIVE } from "./pageScripts.js";
import { buildFrameHeaders, getTransportErrorProps, SAFE_ERROR_CODE_RE } from "./frameApi.js";
import {
  CONTROL_PLANE_REQUEST_TIMEOUT_MS,
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
  foldMarkReads,
  foldBootOutsideWriter,
  foldBootKind,
  foldBootDocs,
  foldBootExternal,
  foldBootOutsideOrgReader,
  foldBootTypeLocked,
  typeSlugOf,
  getShareEntry,
} from "./shareEntries.js";
import { MARKREADS } from "./textSanitize.js";
import { artifactDocsOrFiles } from "./artifactToolGates.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { applyTypeAttestation } from "./typeInstances.js";
import { logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { checkBehindLive } from "./liveSubscribe.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-m0ks5273.js:27265-32404 placement
/**
 * 向 artifact 服务（或经会话网关/中继）请求 boot 数据：校验环境、处理 sk 分享密钥、版本、只走中继等选项。
 */
async function fetchBootUngated(
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
    audienceOutside,
  },
) {
  let envName = claudeAiEnvironment();
  if (env !== envName)
    return {
      err: `that artifact URL is for ${env} claude.ai, but this session targets ${envName}`,
      errorCode: "env_mismatch",
    };
  let queryBase =
    "via=model_read" +
    (kind === "probe" ? "&bk=probe" : "") +
    (kind === "probe" && lean !== undefined ? `&lean=${encodeURIComponent(lean)}` : "") +
    (agentPeer ? "&peer=agent" : "") +
    (actorId ? "&actor=id" : "") +
    (syncLive ? "&live=sync" : "") +
    (watchBoot || agentPeer || syncLive ? `&vn=${PASSIVE}` : "") +
    (readBack ? "&readback=1" : "") +
    (audienceOutside ? "&audience=outside" : "") +
    (pastVer !== undefined ? `&ver=${encodeURIComponent(pastVer)}` : "");
  let skParam = sk === undefined ? "" : `&sk=${encodeURIComponent(sk)}`;
  let vanityParam = vanity === undefined ? "" : `&vanity=${encodeURIComponent(vanity)}`;
  let bootUrl = `/api/frame/${slug}?${queryBase}${skParam}${vanityParam}`;
  let bootOptions = {
    refreshOAuth: true,
    credentials,
    headers: buildFrameHeaders(),
    timeout: CONTROL_PLANE_REQUEST_TIMEOUT_MS,
    signal,
  };
  let boot;
  let now = Date.now();
  let startTime = performance.now();
  try {
    boot =
      relayOnly || relayIsOnlyRoute()
        ? await frameApi.getRelayOnly(bootUrl, bootOptions)
        : await frameApi.get(bootUrl, bootOptions);
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
  setSandboxEgress(env, sandboxEgressOf(boot));
  if (!boot.ok) {
    if (boot.reason === "relay-unavailable")
      return {
        err: `artifact read failed (relay unavailable${boot.status ? `, HTTP ${boot.status}` : ""})`,
        ...(boot.status !== 0 && {
          status: boot.status,
        }),
        errorCode: "boot_relay_error",
      };
    if (boot.reason === "relay-not-served")
      return {
        err: "artifact read failed (the session gateway does not serve this session)",
        errorCode: "boot_relay_not_served",
      };
    return {
      err:
        boot.reason === "no-auth"
          ? describeArtifactAuthFailure(boot.detail)
          : `artifact read unavailable: ${boot.reason}`,
      errorCode: boot.reason.replace(/-/g, "_"),
    };
  }
  if (!boot.fromFrame)
    return {
      err: `artifact read failed (relay HTTP ${boot.status})`,
      status: boot.status,
      errorCode: "boot_relay_error",
    };
  let chatHost = isChatHostEntrypoint() ? "Slack" : isClaudeInTeams() ? "Teams" : undefined;
  let channelNoun = `${chatHost ?? "chat"} channel`;
  let addStep = `add this ${channelNoun} (under "Add people, groups, or Claude Tags", paste the channel ID)`;
  let personShareNote = `sharing with a person or service account does not reach a ${channelNoun}'s Claude \u2014 ask the owner to open Share and ${addStep}, or widen General access to the organization`;
  let shareAdvice = `${personShareNote}.`;
  if (boot.status === 404) {
    let noVersionBody = isFrameNoVersionBody(boot.data);
    let remoteDirect = isRemoteManagedEnvironment() && boot.route === "direct";
    return {
      err: noVersionBody
        ? "this artifact exists but nothing has been published to it yet, so there is nothing to read"
        : `artifact not found \u2014 it may have been deleted, or it has not been shared with you${chatHost === undefined ? (remoteDirect ? `. ${CROSS_ORG_SHARE_HINT}` : `. ${EMAIL_INVITE_HINT}`) : `. If it is restricted to specific people, ${personShareNote}${remoteDirect ? `. ${CROSS_ORG_SHARE_HINT}` : ""}`}`,
      status: 404,
      ...(isFrameNotFoundBody(boot.data) && {
        gone: true,
      }),
      ...(noVersionBody && {
        neverPublished: true,
      }),
      errorCode: "boot_404",
    };
  }
  if (boot.status === 403 && isOrgMismatchBody(boot.data))
    return {
      err: OTHER_ORG_MESSAGE,
      status: 403,
      otherOrg: true,
      errorCode: BOOT_ORG_MISMATCH_CODE,
    };
  if (boot.status === 403) {
    let accessRequest = requestAccessSchema().safeParse(boot.data);
    if (accessRequest.success && accessRequest.data.reason === "agent_not_added")
      return {
        err: `this artifact is restricted to specific people, and this ${channelNoun}'s Claude is not one of them: ${shareAdvice}`,
        status: 403,
        errorCode: "boot_403_agent_not_added",
      };
    if (accessRequest.success && accessRequest.data.reason === "agent_owned")
      return {
        err:
          chatHost === undefined
            ? "this artifact belongs to a chat channel's Claude and has not been shared with you \u2014 ask someone in the channel it was published from to open Share on it and add you."
            : `this artifact belongs to another ${channelNoun}'s Claude and has not been shared with this one \u2014 ask someone in the channel it was published from to open Share on it and ${addStep}.`,
        status: 403,
        errorCode: "boot_403_agent_owned",
      };
    if (accessRequest.success && accessRequest.data.request_access)
      return {
        err: "you do not have access to this artifact. Open the link in a browser to request access from the owner.",
        status: 403,
        errorCode: "boot_403_request_access",
      };
  }
  if (boot.status === 400 && pastVer !== undefined)
    return {
      err: "the server refused that version id (HTTP 400). Most likely it is not among the ones kept for this artifact: list its versions for the ids that are.",
      status: 400,
      errorCode: "boot_unknown_ver",
    };
  if (boot.status < 200 || boot.status >= 300)
    return {
      err: `artifact read failed (HTTP ${boot.status})`,
      status: boot.status,
      errorCode: "boot_failed",
    };
  let data = boot.data ?? {};
  let { ver, assetToken } = data;
  let isPublic = data.mode === "public" || data.kind === "public";
  if (!ver || (!assetToken && !isPublic))
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
    foldBootCowritten(slug, data.cowritten);
    foldBootAuthoredByOthers(slug, data.authoredByOthers);
    foldBootOutsidersMayHaveWritten(slug, data.outsidersMayHaveWritten);
    foldMarkReads(slug, data[MARKREADS]);
    if (data.outsideWriter === true) foldBootOutsideWriter(slug, true);
    if (ver !== pastVer)
      return {
        err: "artifact read failed: the server served a different version from the one asked for, so nothing was read. It does that for an account that cannot edit the artifact; for one that can, the server ignored the version asked for.",
        errorCode: "boot_past_ver_ignored",
      };
    return {
      err: null,
      data,
      ver,
      assetToken: assetToken || undefined,
      route: boot.route,
    };
  }
  foldBootKind(slug, data.artifactKind);
  foldBootDocs(slug, artifactDocsOrFiles(data), now);
  foldBootCowritten(slug, data.cowritten);
  foldBootAuthoredByOthers(slug, data.authoredByOthers);
  foldBootOutsidersMayHaveWritten(slug, data.outsidersMayHaveWritten);
  foldMarkReads(slug, data[MARKREADS]);
  foldBootOutsideWriter(slug, data.outsideWriter);
  let leanVersion = data.lean === true;
  let external = data.mode === "external";
  if (!leanVersion) foldBootExternal(slug, external);
  if (isFramePublicReadEnabled()) foldBootOutsideOrgReader(slug, !assetToken);
  foldBootTypeLocked(slug, data.type);
  let { probeBoots } = getLiveState().shareStatus;
  let probe = probeBoots.get(slug);
  if (probe !== undefined && probe.boot.ver !== ver) probeBoots.delete(slug);
  if (!leanVersion && !isPublic && (!external || data.perm?.role === "writer"))
    applyTypeAttestation(slug, data.typeFacts, typeSlugOf(getShareEntry(slug)), now, {
      external,
    });
  return {
    err: null,
    data,
    ver,
    assetToken: assetToken || undefined,
    route: boot.route,
  };
}
//@ chunk-m0ks5273.js:32404-34252 placement
/**
 * fetchArtifactBoot 的带缓存版本：复用同一 tool use 的探测结果，处理公开读门槛与推测性请求。
 */
async function fetchBoot(
  target,
  options,
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
  let logBad = speculative ? logFeatureSad : logFeatureBad;
  let bootResult;
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
    for (let [slug, boot] of probeBoots)
      if (now - boot.issuedAt > ORG_SCOPE_CACHE_MS) probeBoots.delete(slug);
    let probe = probeBoots.get(target.slug);
    if (
      probe !== undefined &&
      probe.toolUseId === probeToolUseId &&
      (kind === "probe" || probe.boot.data.typeInstance === false) &&
      !(relayOnly && isRemoteManagedEnvironment() && probe.boot.route !== "relay") &&
      !checkBehindLive(target.slug, probe.boot.ver).behind
    ) {
      bootResult = {
        ...probe.boot,
        reused: true,
      };
      logForDebugging(
        `[artifact] ${options}: ${kind}-kind boot served from this tool use's share probe (probe issued ${now - probe.issuedAt}ms ago) slug=${target.slug}`,
      );
    }
  }
  let fetchOptions = {
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
  let result =
    bootResult ??
    (await fetchBootUngated(target, signal, {
      ...fetchOptions,
      lean: lean?.version,
    }));
  if (
    lean !== undefined &&
    (result.err === null
      ? result.data.lean === true && !lean.mustCarry(result.data)
      : result.errorCode === "boot_incomplete")
  ) {
    logFeatureSad(options, "lean_boot_incomplete");
    logForDebugging(
      `[artifact] ${options}: the answer to a lean boot request was incomplete; booting in full slug=${target.slug}`,
    );
    result = await fetchBootUngated(target, signal, fetchOptions);
  }
  if (result.err !== null) {
    let reason =
      result.errorCode === "boot_request_error" || result.errorCode === "boot_failed"
        ? {
            ...result.request,
            ...(result.status !== undefined && {
              http_status: result.status,
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
    if (reason !== undefined) logBad(options, result.errorCode, reason);
    else logBad(options, result.errorCode);
    return {
      err: result.err,
      ...(result.status !== undefined && {
        status: result.status,
      }),
      ...(result.gone && {
        gone: true,
      }),
      ...(result.neverPublished && {
        neverPublished: true,
      }),
      ...(result.otherOrg && {
        otherOrg: true,
      }),
      ...(result.transient && {
        transient: true,
      }),
      errorCode: result.errorCode,
    };
  }
  let booted = result;
  if (gatePublicRead && booted.assetToken === undefined && !isFramePublicReadEnabled()) {
    logBad(options, "public_read_disabled");
    return {
      err: "artifact read failed: this artifact is served to you as a public (non-member) reader, and reading public artifacts that way is not enabled yet",
      errorCode: "public_read_disabled",
    };
  }
  return booted;
}
export { fetchBoot, fetchBootUngated };
