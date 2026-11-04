/**
 * services/artifacts/webfetchRead.ts
 *
 * 2.1.316 新增：通过 WebFetch 读取 artifact 页面
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jv307fw4.js (9)
 * attribution: placement 9
 */
import { validateReadPath } from "./publishPaths.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import {
  encodeFilePath,
  describeGatewayTransient,
  getViaFrameContent,
  MAX_MOUNT_READ_BYTES,
  MAX_MOUNT_FILE_BYTES,
  contentTypeOfHeaders,
  readViaGateway,
  canReadViaFrame,
  GATEWAY_DECLINED_RESULT,
} from "./gatewayRead.js";
import { fetchArtifactBootWithProbe } from "./boot.js";
import { PUBLIC_READ_UNASKED_REASON } from "./frameFlags.js";
import {
  canReadAssets,
  buildFrameFilePath,
  classifyArtifactOwnership,
  ownerVisibleRole,
  AUDIENCE_SCOPES,
  getCurrentStoredDecl,
  getDocumentCount,
  SAFE_AUDIENCE_KEY_RE,
  isReaderRole,
  isForeignOwnership,
  isWriterRole,
  AUDIENCE_QUERY_TIMEOUT_MS,
} from "./audience.js";
import { LIVE_DOC, isMeaningfulFlag, INDEX_HTML } from "./textSanitize.js";
import {
  getShareEntry,
  ownedVerdict,
  deriveShareRole,
  triState,
  orTriState,
  typeLockedFor,
  mayBeShared,
  deriveShareStatus,
  isNotFoundProxy,
  isForbiddenProxy,
} from "./shareEntries.js";
import { parseProvenance } from "./publishSchema.js";
import { splitManifestTypeFiles } from "./publishedFiles.js";
import { firstLineOf, urlPatternToRegex } from "../../utils/stringUtils.js";
import { stripFrameCommentsScript } from "./frameComments.js";
import { SAFE_ERROR_CODE_RE } from "./frameApi.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { logForDebugging } from "../../utils/debug.js";
import { describeFrameAllowlistHint, getFrameHostPattern } from "./frameHost.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { isCancel, isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";
import { AbortError } from "../../utils/errors.js";
import { isTransportError, externalHttp } from "../http/externalHttp.js";
import {
  proxyDenialResult,
  isBlockedByProxyAllowlist,
  isAllowlistBlockedResponse,
  proxyErrorCode,
  proxyDenyReason,
  parseProxyDenial,
  ARTIFACT_PROXY_DENIAL_TEXTS,
} from "../../utils/sandbox/proxyDenial.js";
import { frameRelayActive, relayDeclined } from "./frameRelay.js";
import { ARTIFACT_MOUNT } from "./artifactMount.js";
import { findProxyError, describeHttpStatus } from "../../utils/proxy.js";
import { scrubArtifactEnvelopeTags } from "../../tools/ArtifactTool/artifactUrls.js";

//@ chunk-jv307fw4.js:42867-42966 placement
/**
 * 导出函数 `webfetchReadFile`：参数 e, n, r, s = "artifact_webfetch_read", a = "probe"…，返回 readArtifactViaWebFetch(e, n, s, e.file, r, a, l, d, h)。
 */
function webfetchReadFile(
  artifact,
  signal,
  credentials,
  feature = "artifact_webfetch_read",
  kind = "probe",
  request,
  probeToolUseId,
  readBack = false,
) {
  return readArtifactViaWebFetch(
    artifact,
    signal,
    feature,
    artifact.file,
    credentials,
    kind,
    request,
    probeToolUseId,
    readBack,
  );
}
//@ chunk-jv307fw4.js:42966-43162 placement
/**
 * 通过 WebFetch 路径读取 artifact 的某个文件：先校验路径，非法时打点并返回错误。
 */
async function readArtifactFileViaWebFetch(
  artifact,
  path,
  signal,
  credentials,
  feature = "artifact_webfetch_read",
  probeToolUseId,
) {
  let validated = validateReadPath(path);
  if ("errMsg" in validated) {
    logFeatureBad(feature, "invalid_path");
    return {
      err: `artifact read failed: ${validated.errMsg}`,
    };
  }
  return readArtifactViaWebFetch(
    artifact,
    signal,
    feature,
    validated.key,
    credentials,
    "probe",
    undefined,
    probeToolUseId,
  );
}
//@ chunk-jv307fw4.js:43162-43239 placement
/**
 * 导出函数 `webfetchProbe`：参数 e, n, r, s, a，返回 readArtifactViaWebFetch(e, r, a, void 0, s, "probe", void 0, void 0, !1, n)。
 */
function webfetchProbe(target, pastVer, signal, credentials, targetArg) {
  return readArtifactViaWebFetch(
    target,
    signal,
    targetArg,
    undefined,
    credentials,
    "probe",
    undefined,
    undefined,
    false,
    pastVer,
  );
}
//@ chunk-jv307fw4.js:43239-53256 placement
/**
 * 经 WebFetch 通道读取 artifact 文件：校验相对路径、取 boot、按受众框定内容并记录遥测。
 */
async function readArtifactViaWebFetch(
  target,
  signal,
  feature,
  filePath,
  credentials,
  kind,
  admitPublicRead,
  probeToolUseId,
  readBack = false,
  pastVer,
) {
  let encodedPath = encodeFilePath(filePath);
  if (encodedPath === undefined) {
    logFeatureBad(feature, "invalid_file_path");
    return {
      err: "artifact file path is not a clean relative path",
    };
  }
  let artifactBootWithProbe = await fetchArtifactBootWithProbe(target, feature, signal, {
    kind,
    readBack,
    pastVer,
    credentials,
    probeToolUseId,
  });
  if (artifactBootWithProbe.err !== null) return artifactBootWithProbe;
  let { ver, assetToken } = artifactBootWithProbe;
  if (filePath !== undefined && assetToken === undefined) {
    logFeatureBad(feature, "public_file");
    return {
      err: "the files of a public artifact read from outside its organization are not readable this way",
      status: 403,
      publicFile: true,
    };
  }
  if (assetToken === undefined && admitPublicRead?.() !== true) {
    logFeatureSad(feature, PUBLIC_READ_UNASKED_REASON);
    return {
      err: "this is a public artifact from outside your organization; its page is fetched only on a read the user approved, and this call carries no such approval \u2014 nothing was fetched",
      status: 403,
      publicUnasked: true,
    };
  }
  let servedPath = `/_f/${ver}/${encodedPath}`;
  let source = canReadAssets(artifactBootWithProbe)
    ? {
        path: buildFrameFilePath(ver, encodedPath),
      }
    : undefined;
  let telemetryExtra = (fromSource) => {
    let extra = {
      ...(fromSource && {
        source: true,
      }),
      ...(!fromSource &&
        source?.fellBack !== undefined && {
          source_fallback_status: source.fellBack,
        }),
      ...(artifactBootWithProbe.reused && {
        boot_reused: true,
      }),
    };
    return Object.keys(extra).length > 0 ? extra : undefined;
  };
  let { title, favicon, perm, cowritten } = artifactBootWithProbe.data;
  let isLiveDoc =
    artifactBootWithProbe.data.artifactKind === LIVE_DOC ||
    getShareEntry(target.slug)?.artifactKind === LIVE_DOC;
  let mode = assetToken === undefined ? "public" : perm?.mode;
  let ownership = classifyArtifactOwnership(artifactBootWithProbe);
  let role = perm?.role === "owner" ? "owner" : perm?.role === "writer" ? "writer" : "reader";
  let owned = ownedVerdict({
    role: deriveShareRole(ownerVisibleRole(perm?.role, assetToken === undefined)),
  });
  let assignableReadModes = perm?.assignableReadModes;
  let shareMenu =
    role === "owner" &&
    Array.isArray(assignableReadModes) &&
    assignableReadModes.every(
      (assignableReadMode) =>
        assignableReadMode === "owner" || AUDIENCE_SCOPES.some((scope) => scope === assignableReadMode),
    )
      ? {
          modes: AUDIENCE_SCOPES.filter(
            (scope) => assignableReadModes.includes(scope) && !(isLiveDoc && scope === "public"),
          ),
          ...(typeof perm?.externalSharingEnabled === "boolean" && {
            externalSharing: perm.externalSharingEnabled,
          }),
          ...(typeof perm?.externalInvitesEnabled === "boolean" && {
            externalInvites: perm.externalInvitesEnabled,
          }),
        }
      : undefined;
  let provenance = parseProvenance(artifactBootWithProbe.data.origin_metadata);
  let currentStoredDecl = getCurrentStoredDecl(artifactBootWithProbe.data);
  let manifestPaths = splitManifestTypeFiles(artifactBootWithProbe.data.files);
  let documentCount = getDocumentCount(artifactBootWithProbe.data.dbUsage);
  let contentStore =
    typeof artifactBootWithProbe.data.contentStore === "string" &&
    SAFE_AUDIENCE_KEY_RE.test(artifactBootWithProbe.data.contentStore)
      ? artifactBootWithProbe.data.contentStore
      : undefined;
  let readResult = (
    buffer,
    contentTypeHeader,
    fromSource,
    reportSuccess = () => logFeatureOk(feature, telemetryExtra(fromSource)),
  ) => {
    reportSuccess();
    let contentType =
      filePath === undefined
        ? "text/html"
        : typeof contentTypeHeader === "string"
          ? firstLineOf(contentTypeHeader, ";").trim().toLowerCase()
          : "";
    let html = buffer.toString("utf-8");
    let html_2 = contentType === "text/html" ? stripFrameCommentsScript(html) : html;
    let outsideWriter = triState(artifactBootWithProbe.data.outsideWriter);
    let outsideWriterEffective = orTriState(outsideWriter, getShareEntry(target.slug)?.outsideWriter);
    return {
      err: null,
      html: html_2,
      contentType,
      raw: buffer,
      role,
      ...(fromSource && {
        source: true,
      }),
      cowritten: cowritten === true || isLiveDoc || getShareEntry(target.slug)?.cowritten === true,
      publicRead: assetToken === undefined,
      ...(isReaderRole(perm?.role) && {
        servedAudienceVersion: true,
      }),
      ...(owned !== undefined && {
        owned,
      }),
      sameChannel: perm?.sameChannel === true && role === "writer",
      ...(ownership === "external" && {
        external: true,
      }),
      ...(isForeignOwnership(ownership) && {
        offOrgRamp: true,
      }),
      typeLocked: typeLockedFor(target.slug, artifactBootWithProbe.data.type),
      ...((artifactBootWithProbe.data.authoredByOthers === true ||
        getShareEntry(target.slug)?.authoredByOthers === true) && {
        authoredByOthers: true,
      }),
      ...((isMeaningfulFlag(artifactBootWithProbe.data.outsidersMayHaveWritten) ||
        getShareEntry(target.slug)?.outsidersMayHaveWritten === true) && {
        outsidersMayHaveWritten: true,
      }),
      ...(mayBeShared(
        role === "owner" && assetToken !== undefined,
        outsideWriter,
        outsideWriterEffective,
      ) && {
        outsideOrg: true,
      }),
      ...(outsideWriterEffective !== undefined && {
        outsideWriter: outsideWriterEffective,
      }),
      ...(shareMenu !== undefined && {
        shareMenu,
      }),
      ...(mode !== undefined &&
        (() => {
          let shareStatus = deriveShareStatus(mode, artifactBootWithProbe.data.shared);
          let isWriter = isWriterRole(perm?.role);
          let { live, shared } = artifactBootWithProbe.data;
          let liveIsCode = typeof live === "string" && SAFE_ERROR_CODE_RE.test(live);
          let pinnedCode = typeof shared === "string" && SAFE_ERROR_CODE_RE.test(shared) ? shared : undefined;
          let pinnedBehind =
            (liveIsCode && (shared === undefined || shared === "")) || pinnedCode !== undefined;
          return {
            audience: shareStatus.mode,
            ...(isWriter &&
              pinnedBehind &&
              shareStatus.mode !== "owner" && {
                audienceView:
                  pinnedCode === undefined
                    ? "live"
                    : pinnedCode === ver
                      ? "pinned-current"
                      : "pinned-earlier",
              }),
          };
        })()),
      bytes: contentType === "text/html" ? Buffer.byteLength(html_2, "utf8") : buffer.length,
      title: typeof title === "string" ? title : "",
      ...(favicon !== undefined && {
        favicon,
      }),
      ver,
      ...(typeof artifactBootWithProbe.data.fileCount === "number" &&
        Number.isSafeInteger(artifactBootWithProbe.data.fileCount) &&
        artifactBootWithProbe.data.fileCount > 0 && {
          fileCount: artifactBootWithProbe.data.fileCount,
        }),
      ...(manifestPaths !== undefined && {
        manifestPaths,
      }),
      ...(documentCount !== undefined && {
        storeDocuments: documentCount,
      }),
      ...(contentStore !== undefined && {
        contentStore,
      }),
      ...(provenance !== undefined && {
        origin: provenance,
      }),
      ...(currentStoredDecl !== undefined && {
        readBack: currentStoredDecl,
      }),
    };
  };
  if (isLiveDoc && filePath === undefined && pastVer === undefined) {
    let replica = await getLiveState().liveReplicas.renderLevel?.(
      target.slug,
      INDEX_HTML,
      artifactBootWithProbe.data.headSeq,
      signal,
    );
    if (replica !== undefined) {
      logForDebugging(
        `[artifact] read served from the local replica at seq ${replica.head} slug=${target.slug}`,
      );
      let replicaRead = readResult(Buffer.from(replica.html, "utf8"), "text/html", false);
      return replicaRead.err === null
        ? {
            ...replicaRead,
            localReplica: {
              head: replica.head,
            },
          }
        : replicaRead;
    }
  }
  let frameHost = `${target.slug}.frame.${target.env === "staging" ? "staging." : ""}claudeusercontent.com`;
  let allowlistHint = describeFrameAllowlistHint(target.env);
  let egressFailure = (relay, deterministic) => {
    if (relay.code === "unavailable" && relay.status !== undefined) {
      logFeatureBad(feature, "asset_relay_unavailable", {
        relay_status: relay.status,
      });
      return {
        err: `${describeGatewayTransient(relay.status)}. Your access to the artifact itself is fine (the permission check passed); this environment cannot reach ${frameHost} directly, so its reads go through the gateway.`,
        status: relay.status,
      };
    }
    logFeatureBad(feature, "asset_egress_blocked", {
      relay: fromEnum(relay.code),
      ...(relay.status !== undefined && {
        relay_status: relay.status,
      }),
      ...(!deterministic && {
        connect: true,
      }),
    });
    return {
      err: `this environment's network allowlist blocks ${frameHost}, and the session gateway could not serve the read either (${relay.why}); your access to the artifact itself is fine (the permission check passed). ${allowlistHint}`,
      status: 403,
      ...(deterministic && {
        deterministic: "egress-blocked",
      }),
    };
  };
  let readViaFrameContent = async (assetToken) => {
    let fetchPath = (path) =>
      getViaFrameContent(target.slug, path, {
        token: assetToken,
        timeout: AUDIENCE_QUERY_TIMEOUT_MS,
        maxContentLength: filePath === undefined ? MAX_MOUNT_READ_BYTES : MAX_MOUNT_FILE_BYTES,
        signal,
        credentials,
      });
    let answer;
    try {
      if (source !== undefined && source.fellBack === undefined) {
        let sourceAnswer = await fetchPath(source.path).catch((error) => {
          if (isCancel(error) || error instanceof AbortError) throw error;
          return {
            kind: "answer",
            status: 0,
            headers: undefined,
            data: undefined,
          };
        });
        if (sourceAnswer.kind === "answer" && sourceAnswer.status === 200)
          return readResult(
            Buffer.from(sourceAnswer.data ?? new ArrayBuffer(0)),
            contentTypeOfHeaders(sourceAnswer.headers),
            true,
            () =>
              logFeatureOk(feature, {
                ...telemetryExtra(true),
                frame_content: true,
              }),
          );
        if (sourceAnswer.kind === "answer") source.fellBack = sourceAnswer.status;
      }
      answer = await fetchPath(servedPath);
    } catch (error) {
      if (isCancel(error) || error instanceof AbortError) throw error;
      logFeatureBad(feature, "asset_request_error", {
        frame_content: true,
      });
      let transportError = isTransportError(error);
      let codeSuffix =
        isAxiosError(error) && /^[A-Z][A-Z0-9_]{1,48}$/.test(error.code ?? "") ? ` ${error.code}` : "";
      return {
        err: `artifact content fetch failed (${transportError ? `network error${codeSuffix} reaching the artifact service` : "read failed"})`,
        ...(transportError && {
          transient: true,
        }),
      };
    }
    if (answer.kind === "declined") {
      if (source !== undefined) source.fellBack = undefined;
      return;
    }
    if (answer.status >= 200 && answer.status < 300)
      return readResult(
        Buffer.from(answer.data ?? new ArrayBuffer(0)),
        contentTypeOfHeaders(answer.headers),
        false,
        () =>
          logFeatureOk(feature, {
            ...telemetryExtra(false),
            frame_content: true,
          }),
      );
    let denial = proxyDenialResult(answer.headers, answer.data, (text) => redactFrameToken(text, assetToken));
    if (answer.status === 404 && encodedPath !== "" && isNotFoundProxy(answer.headers, denial)) {
      logFeatureSad(feature, "file_not_in_manifest");
      return {
        err: "this version of the artifact has no file at that path",
        status: 404,
        missingFile: true,
      };
    }
    logFeatureBad(feature, "asset_failed", {
      frame_content: true,
    });
    return {
      err: `artifact content fetch failed (${describeFetchFailure(answer.status, answer.headers, denial)})`,
      status: answer.status,
      respondent: true,
    };
  };
  let readViaRelay = (token, failReason) =>
    readViaGateway(
      {
        slug: target.slug,
        servedPath,
        fileRead: filePath !== undefined,
        feature,
        token,
        signal,
        ...(source !== undefined && {
          source,
        }),
      },
      (data, contentType, fromSource) =>
        readResult(data, contentType, fromSource, () =>
          logFeatureSad(feature, failReason, telemetryExtra(fromSource)),
        ),
    );
  if (assetToken !== undefined && canReadViaFrame(artifactBootWithProbe.data)) {
    let frameContent = await readViaFrameContent(assetToken);
    if (frameContent !== undefined) return frameContent;
  }
  let relayResult;
  if (
    assetToken !== undefined &&
    getLiveState().contentHostEgressDenied.has(target.env) &&
    frameRelayActive() &&
    !relayDeclined(ARTIFACT_MOUNT)
  ) {
    let relayed = await readViaRelay(assetToken, "asset_egress_relayed");
    if (relayed.relayed) return relayed.result;
    relayResult = relayed;
  }
  let baseOverride = undefined;
  let baseUrl = baseOverride ?? `https://${frameHost}`;
  let fetchUrl =
    assetToken === undefined
      ? `${baseUrl}${servedPath}`
      : `${baseUrl}${servedPath}?__frame_t=${encodeURIComponent(assetToken)}`;
  let egressBlocked = async (deterministic) => {
    getLiveState().contentHostEgressDenied.add(target.env);
    let relayOn = frameRelayActive();
    if (assetToken !== undefined && relayOn) {
      if (relayResult !== undefined) return egressFailure(relayResult, deterministic);
      if (relayDeclined(ARTIFACT_MOUNT)) return egressFailure(GATEWAY_DECLINED_RESULT, deterministic);
      let relayed = await readViaRelay(assetToken, "asset_egress_relayed");
      return relayed.relayed ? relayed.result : egressFailure(relayed, deterministic);
    }
    logFeatureBad(feature, "asset_egress_blocked", {
      ...(!deterministic && {
        connect: true,
      }),
    });
    return {
      err:
        assetToken === undefined && relayOn
          ? `this environment's network allowlist blocks ${frameHost}, and public (tokenless) artifacts are not served through the session gateway, so the artifact's content cannot be fetched (your access to the artifact itself is fine \u2014 the permission check passed). ${allowlistHint}`
          : `this environment's network allowlist blocks ${frameHost}, so the artifact's content cannot be fetched (your access to the artifact itself is fine \u2014 the permission check passed). ${allowlistHint}`,
      status: 403,
      ...(deterministic && {
        deterministic: "egress-blocked",
      }),
    };
  };
  let httpGet = (url) =>
    externalHttp.get(url, {
      signal,
      timeout: AUDIENCE_QUERY_TIMEOUT_MS,
      responseType: "arraybuffer",
      maxRedirects: 0,
      maxContentLength: filePath === undefined ? MAX_MOUNT_READ_BYTES : MAX_MOUNT_FILE_BYTES,
      validateStatus: () => true,
      ...(baseOverride && {
        headers: {
          Host: `${target.slug}.frame.localhost`,
        },
      }),
    });
  if (
    source !== undefined &&
    assetToken !== undefined &&
    source.fellBack === undefined &&
    !getLiveState().contentHostEgressDenied.has(target.env)
  ) {
    let response;
    try {
      response = await httpGet(`${baseUrl}${source.path}?__frame_t=${encodeURIComponent(assetToken)}`);
    } catch (error) {
      if (isCancel(error)) throw error;
      if (isBlockedByProxyAllowlist(error)) return egressBlocked(false);
    }
    if (response !== undefined && isAllowlistBlockedResponse(response.status, response.headers))
      return egressBlocked(true);
    if (response !== undefined && response.status === 200)
      return readResult(Buffer.from(response.data), response.headers?.["content-type"], true);
    source.fellBack = response?.status ?? 0;
    logForDebugging(`[artifact] stored-source read fell back (${source.fellBack}) slug=${target.slug}`);
  }
  let response;
  try {
    response = await httpGet(fetchUrl);
  } catch (error) {
    if (isCancel(error)) throw error;
    if (isBlockedByProxyAllowlist(error)) return egressBlocked(false);
    let proxyError = findProxyError(error);
    let proxyReason =
      proxyError === undefined
        ? undefined
        : (proxyErrorCode(proxyError.headers) ?? proxyDenyReason(proxyError.headers));
    let transportError = isTransportError(error);
    let codeSuffix =
      isAxiosError(error) && /^[A-Z][A-Z0-9_]{1,48}$/.test(error.code ?? "") ? ` ${error.code}` : "";
    let failureText =
      proxyError !== undefined
        ? `proxy refused the connection: ${describeHttpStatus(proxyError.connectStatus)}${proxyReason === undefined ? "" : `, ${proxyReason}`}`
        : transportError
          ? `network error${codeSuffix}: could not connect to ${frameHost} on port 443 \u2014 the machine running Claude Code needs outbound HTTPS to ${getFrameHostPattern(target.env)} when the Artifact tool is enabled`
          : "read failed";
    let relaySuffix = (relayInfo) =>
      relayInfo === undefined
        ? ""
        : `, and the session gateway could not serve the read either (${relayInfo.why})`;
    let relayFields = (relayInfo) =>
      relayInfo !== undefined && {
        relay: fromEnum(relayInfo.code),
        ...(relayInfo.status !== undefined && {
          relay_status: relayInfo.status,
        }),
      };
    if (proxyError !== undefined && proxyError.connectStatus === 407) {
      logFeatureBad(feature, "asset_proxy_refused", {
        status: proxyError.connectStatus,
        ...relayFields(relayResult),
      });
      return {
        err: `artifact content fetch failed (${failureText})${relaySuffix(relayResult)}`,
        status: proxyError.connectStatus,
        ...(proxyReason !== undefined && {
          respondent: true,
          safeErr: `artifact content fetch failed (proxy refused the connection: ${describeHttpStatus(proxyError.connectStatus)})${relaySuffix(relayResult)}`,
        }),
      };
    }
    let relayInfo = relayResult;
    if (assetToken !== undefined && relayInfo === undefined && transportError && frameRelayActive())
      if (relayDeclined(ARTIFACT_MOUNT)) relayInfo = GATEWAY_DECLINED_RESULT;
      else {
        let relayed = await readViaRelay(assetToken, "asset_unreachable_relayed");
        if (relayed.relayed) return relayed.result;
        relayInfo = relayed;
      }
    logFeatureBad(feature, "asset_request_error", {
      ...(proxyError !== undefined && {
        status: proxyError.connectStatus,
      }),
      ...relayFields(relayInfo),
    });
    return {
      err: `artifact content fetch failed (${failureText})${relaySuffix(relayInfo)}`,
      ...(transportError &&
        proxyError === undefined && {
          transient: true,
        }),
      ...(proxyError !== undefined &&
        proxyError.connectStatus !== 0 && {
          status: proxyError.connectStatus,
        }),
      ...(proxyError !== undefined &&
        proxyReason !== undefined && {
          respondent: true,
          safeErr: `artifact content fetch failed (proxy refused the connection: ${describeHttpStatus(proxyError.connectStatus)})${relaySuffix(relayInfo)}`,
        }),
    };
  }
  if (isAllowlistBlockedResponse(response.status, response.headers)) return egressBlocked(true);
  getLiveState().contentHostEgressDenied.delete(target.env);
  if (response.status < 200 || response.status >= 300) {
    let denial = proxyDenialResult(response.headers, response.data, (text) =>
      redactFrameToken(text, assetToken),
    );
    if (response.status === 403 && assetToken === undefined && isForbiddenProxy(response.headers, denial)) {
      logFeatureBad(feature, "public_asset_forbidden");
      return {
        err: "artifact is not publicly readable at this version",
        status: 403,
      };
    }
    if (
      response.status === 404 &&
      encodedPath !== "" &&
      assetToken !== undefined &&
      isNotFoundProxy(response.headers, denial)
    ) {
      logFeatureSad(feature, "file_not_in_manifest");
      return {
        err: "this version of the artifact has no file at that path",
        status: 404,
        missingFile: true,
      };
    }
    let proxyDenial = parseProxyDenial(response.status, denial);
    logFeatureBad(feature, proxyDenial ?? "asset_failed");
    return {
      err: `artifact content fetch failed (${describeFetchFailure(response.status, response.headers, denial)})`,
      status: response.status,
      respondent: true,
      ...(proxyDenial !== undefined && {
        safeErr: ARTIFACT_PROXY_DENIAL_TEXTS[proxyDenial],
        proxyDeny: proxyDenial,
      }),
    };
  }
  return readResult(Buffer.from(response.data), response.headers?.["content-type"], false);
}
//@ chunk-jv307fw4.js:53256-53662 placement
/**
 * 描述 artifact 内容获取失败：HTTP 状态，再附响应体原因、出口代理报告或 x-proxy-error 头（清洗后），以及 x-request-id。
 */
function describeFetchFailure(status, headers, httpStatus) {
  let parts = [`HTTP ${status}`];
  let reason = proxyDenyReason(headers);
  if (reason === undefined && httpStatus.reason !== undefined)
    parts.push(`response body: "${scrubArtifactEnvelopeTags(httpStatus.reason.replaceAll('"', "'"))}"`);
  else if (reason !== undefined) parts.push(`the environment's egress proxy reported: ${reason}`);
  else if (httpStatus.proxyError !== undefined)
    parts.push(
      `x-proxy-error header: "${scrubArtifactEnvelopeTags(httpStatus.proxyError.replaceAll('"', "'"))}"`,
    );
  if (httpStatus.requestId !== undefined) parts.push(`x-request-id: ${httpStatus.requestId}`);
  return parts.join("; ");
}
//@ chunk-jv307fw4.js:53662-53775 placement
/**
 * 取出读取失败的显示文本：有响应时用安全错误消息或 HTTP 状态，否则用原始错误。
 */
function getFetchErrorText(error) {
  return error.respondent
    ? (error.safeErr ?? `artifact content fetch failed (HTTP ${error.status ?? "error"})`)
    : error.err;
}
//@ chunk-jv307fw4.js:53775-54009 placement
/**
 * 在文本里遮盖 __frame_t 访问令牌参数（含各种 URL 编码形式），以及给定令牌的原文与 URL 编码形式。
 */
function redactFrameToken(token, token_2) {
  let text = token.replace(
    /(?:_|%(?:25)*5f){2}frame(?:_|%(?:25)*5f)t(?:=|%(?:25)*3d)["']?[^\s&"'<>]*/gi,
    "__frame_t=[redacted]",
  );
  if (token_2 !== undefined && token_2 !== "") {
    text = redactTokenFragments(text, token_2, "g");
    let encoded = encodeURIComponent(token_2);
    if (encoded !== token_2) text = redactTokenFragments(text, encoded, "gi");
  }
  return text;
}
//@ chunk-jv307fw4.js:54009-54041 placement
var TOKEN_FRAGMENT_LEN = 16;
var TOKEN_CHAR_RE = /[A-Za-z0-9._~%-]/;
//@ chunk-jv307fw4.js:54041-54405 placement
/**
 * 在文本中遮蔽令牌：短令牌直接替换；长令牌按固定长度的所有片段生成正则，连同相邻的令牌字符一起替换为 [redacted]。
 */
function redactTokenFragments(text, token, flags) {
  if (token.length <= TOKEN_FRAGMENT_LEN) return text.replaceAll(token, "[redacted]");
  let fragments = new Set();
  for (let j = 0; j + TOKEN_FRAGMENT_LEN <= token.length; j++)
    fragments.add(urlPatternToRegex(token.slice(j, j + TOKEN_FRAGMENT_LEN)));
  let regExp = new RegExp(`(?:${[...fragments].join("|")})${TOKEN_CHAR_RE.source}*`, flags);
  let out = "";
  let cursor = 0;
  for (let match of text.matchAll(regExp)) {
    let index = match.index;
    while (index > cursor && TOKEN_CHAR_RE.test(text.charAt(index - 1))) index--;
    out += `${text.slice(cursor, index)}[redacted]`;
    cursor = match.index + match[0].length;
  }
  return out + text.slice(cursor);
}
export { webfetchReadFile, getFetchErrorText, redactFrameToken, readArtifactFileViaWebFetch, webfetchProbe };
