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
  e,
  signal,
  credentials,
  s = "artifact_webfetch_read",
  kind = "probe",
  l,
  probeToolUseId,
  readBack = false,
) {
  return readArtifactViaWebFetch(e, signal, s, e.file, credentials, kind, l, probeToolUseId, readBack);
}
//@ chunk-jv307fw4.js:42966-43162 placement
/**
 * 通过 WebFetch 路径读取 artifact 的某个文件：先校验路径，非法时打点并返回错误。
 */
async function readArtifactFileViaWebFetch(
  e,
  n,
  signal,
  credentials,
  a = "artifact_webfetch_read",
  probeToolUseId,
) {
  let d = validateReadPath(n);
  if ("errMsg" in d) {
    logFeatureBad(a, "invalid_path");
    return {
      err: `artifact read failed: ${d.errMsg}`,
    };
  }
  return readArtifactViaWebFetch(e, signal, a, d.key, credentials, "probe", undefined, probeToolUseId);
}
//@ chunk-jv307fw4.js:43162-43239 placement
/**
 * 导出函数 `webfetchProbe`：参数 e, n, r, s, a，返回 readArtifactViaWebFetch(e, r, a, void 0, s, "probe", void 0, void 0, !1, n)。
 */
function webfetchProbe(target, version, signal, credentials, a) {
  return readArtifactViaWebFetch(
    target,
    signal,
    a,
    undefined,
    credentials,
    "probe",
    undefined,
    undefined,
    false,
    version,
  );
}
//@ chunk-jv307fw4.js:43239-53256 placement
/**
 * 经 WebFetch 通道读取 artifact 文件：校验相对路径、取 boot、按受众框定内容并记录遥测。
 */
async function readArtifactViaWebFetch(
  e,
  n,
  r,
  s,
  credentials,
  kind,
  d,
  probeToolUseId,
  readBack = false,
  T,
) {
  let P = encodeFilePath(s);
  if (P === undefined) {
    logFeatureBad(r, "invalid_file_path");
    return {
      err: "artifact file path is not a clean relative path",
    };
  }
  let artifactBootWithProbe = await fetchArtifactBootWithProbe(e, r, n, {
    kind,
    readBack,
    pastVer: T,
    credentials,
    probeToolUseId,
  });
  if (artifactBootWithProbe.err !== null) return artifactBootWithProbe;
  let { ver, assetToken } = artifactBootWithProbe;
  if (s !== undefined && assetToken === undefined) {
    logFeatureBad(r, "public_file");
    return {
      err: "the files of a public artifact read from outside its organization are not readable this way",
      status: 403,
      publicFile: true,
    };
  }
  if (assetToken === undefined && d?.() !== true) {
    logFeatureSad(r, PUBLIC_READ_UNASKED_REASON);
    return {
      err: "this is a public artifact from outside your organization; its page is fetched only on a read the user approved, and this call carries no such approval \u2014 nothing was fetched",
      status: 403,
      publicUnasked: true,
    };
  }
  let W = `/_f/${ver}/${P}`;
  let S = canReadAssets(artifactBootWithProbe)
    ? {
        path: buildFrameFilePath(ver, P),
      }
    : undefined;
  let R = (y) => {
    let w = {
      ...(y && {
        source: true,
      }),
      ...(!y &&
        S?.fellBack !== undefined && {
          source_fallback_status: S.fellBack,
        }),
      ...(artifactBootWithProbe.reused && {
        boot_reused: true,
      }),
    };
    return Object.keys(w).length > 0 ? w : undefined;
  };
  let { title, favicon, perm, cowritten } = artifactBootWithProbe.data;
  let A =
    artifactBootWithProbe.data.artifactKind === LIVE_DOC || getShareEntry(e.slug)?.artifactKind === LIVE_DOC;
  let mode = assetToken === undefined ? "public" : perm?.mode;
  let H = classifyArtifactOwnership(artifactBootWithProbe);
  let x = perm?.role === "owner" ? "owner" : perm?.role === "writer" ? "writer" : "reader";
  let I = ownedVerdict({
    role: deriveShareRole(ownerVisibleRole(perm?.role, assetToken === undefined)),
  });
  let assignableReadModes = perm?.assignableReadModes;
  let pe =
    x === "owner" &&
    Array.isArray(assignableReadModes) &&
    assignableReadModes.every(
      (assignableReadMode) =>
        assignableReadMode === "owner" || AUDIENCE_SCOPES.some((w) => w === assignableReadMode),
    )
      ? {
          modes: AUDIENCE_SCOPES.filter((y) => assignableReadModes.includes(y) && !(A && y === "public")),
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
  let ne = splitManifestTypeFiles(artifactBootWithProbe.data.files);
  let documentCount = getDocumentCount(artifactBootWithProbe.data.dbUsage);
  let contentStore =
    typeof artifactBootWithProbe.data.contentStore === "string" &&
    SAFE_AUDIENCE_KEY_RE.test(artifactBootWithProbe.data.contentStore)
      ? artifactBootWithProbe.data.contentStore
      : undefined;
  let re = (y, w, O, q = () => logFeatureOk(r, R(O))) => {
    q();
    let C =
      s === undefined ? "text/html" : typeof w === "string" ? firstLineOf(w, ";").trim().toLowerCase() : "";
    let str = y.toString("utf-8");
    let oe = C === "text/html" ? stripFrameCommentsScript(str) : str;
    let ge = triState(artifactBootWithProbe.data.outsideWriter);
    let Z = orTriState(ge, getShareEntry(e.slug)?.outsideWriter);
    return {
      err: null,
      html: oe,
      contentType: C,
      raw: y,
      role: x,
      ...(O && {
        source: true,
      }),
      cowritten: cowritten === true || A || getShareEntry(e.slug)?.cowritten === true,
      publicRead: assetToken === undefined,
      ...(isReaderRole(perm?.role) && {
        servedAudienceVersion: true,
      }),
      ...(I !== undefined && {
        owned: I,
      }),
      sameChannel: perm?.sameChannel === true && x === "writer",
      ...(H === "external" && {
        external: true,
      }),
      ...(isForeignOwnership(H) && {
        offOrgRamp: true,
      }),
      typeLocked: typeLockedFor(e.slug, artifactBootWithProbe.data.type),
      ...((artifactBootWithProbe.data.authoredByOthers === true ||
        getShareEntry(e.slug)?.authoredByOthers === true) && {
        authoredByOthers: true,
      }),
      ...((isMeaningfulFlag(artifactBootWithProbe.data.outsidersMayHaveWritten) ||
        getShareEntry(e.slug)?.outsidersMayHaveWritten === true) && {
        outsidersMayHaveWritten: true,
      }),
      ...(mayBeShared(x === "owner" && assetToken !== undefined, ge, Z) && {
        outsideOrg: true,
      }),
      ...(Z !== undefined && {
        outsideWriter: Z,
      }),
      ...(pe !== undefined && {
        shareMenu: pe,
      }),
      ...(mode !== undefined &&
        (() => {
          let shareStatus = deriveShareStatus(mode, artifactBootWithProbe.data.shared);
          let ft = isWriterRole(perm?.role);
          let { live, shared } = artifactBootWithProbe.data;
          let lt = typeof live === "string" && SAFE_ERROR_CODE_RE.test(live);
          let Te = typeof shared === "string" && SAFE_ERROR_CODE_RE.test(shared) ? shared : undefined;
          let pt = (lt && (shared === undefined || shared === "")) || Te !== undefined;
          return {
            audience: shareStatus.mode,
            ...(ft &&
              pt &&
              shareStatus.mode !== "owner" && {
                audienceView: Te === undefined ? "live" : Te === ver ? "pinned-current" : "pinned-earlier",
              }),
          };
        })()),
      bytes: C === "text/html" ? Buffer.byteLength(oe, "utf8") : y.length,
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
      ...(ne !== undefined && {
        manifestPaths: ne,
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
  if (A && s === undefined && T === undefined) {
    let y = await getLiveState().liveReplicas.renderLevel?.(
      e.slug,
      INDEX_HTML,
      artifactBootWithProbe.data.headSeq,
      n,
    );
    if (y !== undefined) {
      logForDebugging(`[artifact] read served from the local replica at seq ${y.head} slug=${e.slug}`);
      let w = re(Buffer.from(y.html, "utf8"), "text/html", false);
      return w.err === null
        ? {
            ...w,
            localReplica: {
              head: y.head,
            },
          }
        : w;
    }
  }
  let X = `${e.slug}.frame.${e.env === "staging" ? "staging." : ""}claudeusercontent.com`;
  let ue = describeFrameAllowlistHint(e.env);
  let ce = (y, w) => {
    if (y.code === "unavailable" && y.status !== undefined) {
      logFeatureBad(r, "asset_relay_unavailable", {
        relay_status: y.status,
      });
      return {
        err: `${describeGatewayTransient(y.status)}. Your access to the artifact itself is fine (the permission check passed); this environment cannot reach ${X} directly, so its reads go through the gateway.`,
        status: y.status,
      };
    }
    logFeatureBad(r, "asset_egress_blocked", {
      relay: fromEnum(y.code),
      ...(y.status !== undefined && {
        relay_status: y.status,
      }),
      ...(!w && {
        connect: true,
      }),
    });
    return {
      err: `this environment's network allowlist blocks ${X}, and the session gateway could not serve the read either (${y.why}); your access to the artifact itself is fine (the permission check passed). ${ue}`,
      status: 403,
      ...(w && {
        deterministic: "egress-blocked",
      }),
    };
  };
  let L = async (assetToken) => {
    let w = (path) =>
      getViaFrameContent(e.slug, path, {
        token: assetToken,
        timeout: AUDIENCE_QUERY_TIMEOUT_MS,
        maxContentLength: s === undefined ? MAX_MOUNT_READ_BYTES : MAX_MOUNT_FILE_BYTES,
        signal: n,
        credentials,
      });
    let O;
    try {
      if (S !== undefined && S.fellBack === undefined) {
        let C = await w(S.path).catch((error) => {
          if (isCancel(error) || error instanceof AbortError) throw error;
          return {
            kind: "answer",
            status: 0,
            headers: undefined,
            data: undefined,
          };
        });
        if (C.kind === "answer" && C.status === 200)
          return re(Buffer.from(C.data ?? new ArrayBuffer(0)), contentTypeOfHeaders(C.headers), true, () =>
            logFeatureOk(r, {
              ...R(true),
              frame_content: true,
            }),
          );
        if (C.kind === "answer") S.fellBack = C.status;
      }
      O = await w(W);
    } catch (error) {
      if (isCancel(error) || error instanceof AbortError) throw error;
      logFeatureBad(r, "asset_request_error", {
        frame_content: true,
      });
      let G = isTransportError(error);
      let oe = isAxiosError(error) && /^[A-Z][A-Z0-9_]{1,48}$/.test(error.code ?? "") ? ` ${error.code}` : "";
      return {
        err: `artifact content fetch failed (${G ? `network error${oe} reaching the artifact service` : "read failed"})`,
        ...(G && {
          transient: true,
        }),
      };
    }
    if (O.kind === "declined") {
      if (S !== undefined) S.fellBack = undefined;
      return;
    }
    if (O.status >= 200 && O.status < 300)
      return re(Buffer.from(O.data ?? new ArrayBuffer(0)), contentTypeOfHeaders(O.headers), false, () =>
        logFeatureOk(r, {
          ...R(false),
          frame_content: true,
        }),
      );
    let q = proxyDenialResult(O.headers, O.data, (C) => redactFrameToken(C, assetToken));
    if (O.status === 404 && P !== "" && isNotFoundProxy(O.headers, q)) {
      logFeatureSad(r, "file_not_in_manifest");
      return {
        err: "this version of the artifact has no file at that path",
        status: 404,
        missingFile: true,
      };
    }
    logFeatureBad(r, "asset_failed", {
      frame_content: true,
    });
    return {
      err: `artifact content fetch failed (${describeFetchFailure(O.status, O.headers, q)})`,
      status: O.status,
      respondent: true,
    };
  };
  let fe = (token, w) =>
    readViaGateway(
      {
        slug: e.slug,
        servedPath: W,
        fileRead: s !== undefined,
        feature: r,
        token,
        signal: n,
        ...(S !== undefined && {
          source: S,
        }),
      },
      (O, q, C) => re(O, q, C, () => logFeatureSad(r, w, R(C))),
    );
  if (assetToken !== undefined && canReadViaFrame(artifactBootWithProbe.data)) {
    let y = await L(assetToken);
    if (y !== undefined) return y;
  }
  let ae;
  if (
    assetToken !== undefined &&
    getLiveState().contentHostEgressDenied.has(e.env) &&
    frameRelayActive() &&
    !relayDeclined(ARTIFACT_MOUNT)
  ) {
    let y = await fe(assetToken, "asset_egress_relayed");
    if (y.relayed) return y.result;
    ae = y;
  }
  let Be = undefined;
  let Ee = Be ?? `https://${X}`;
  let ct = assetToken === undefined ? `${Ee}${W}` : `${Ee}${W}?__frame_t=${encodeURIComponent(assetToken)}`;
  let we = async (y) => {
    getLiveState().contentHostEgressDenied.add(e.env);
    let w = frameRelayActive();
    if (assetToken !== undefined && w) {
      if (ae !== undefined) return ce(ae, y);
      if (relayDeclined(ARTIFACT_MOUNT)) return ce(GATEWAY_DECLINED_RESULT, y);
      let O = await fe(assetToken, "asset_egress_relayed");
      return O.relayed ? O.result : ce(O, y);
    }
    logFeatureBad(r, "asset_egress_blocked", {
      ...(!y && {
        connect: true,
      }),
    });
    return {
      err:
        assetToken === undefined && w
          ? `this environment's network allowlist blocks ${X}, and public (tokenless) artifacts are not served through the session gateway, so the artifact's content cannot be fetched (your access to the artifact itself is fine \u2014 the permission check passed). ${ue}`
          : `this environment's network allowlist blocks ${X}, so the artifact's content cannot be fetched (your access to the artifact itself is fine \u2014 the permission check passed). ${ue}`,
      status: 403,
      ...(y && {
        deterministic: "egress-blocked",
      }),
    };
  };
  let Ne = (y) =>
    externalHttp.get(y, {
      signal: n,
      timeout: AUDIENCE_QUERY_TIMEOUT_MS,
      responseType: "arraybuffer",
      maxRedirects: 0,
      maxContentLength: s === undefined ? MAX_MOUNT_READ_BYTES : MAX_MOUNT_FILE_BYTES,
      validateStatus: () => true,
      ...(Be && {
        headers: {
          Host: `${e.slug}.frame.localhost`,
        },
      }),
    });
  if (
    S !== undefined &&
    assetToken !== undefined &&
    S.fellBack === undefined &&
    !getLiveState().contentHostEgressDenied.has(e.env)
  ) {
    let y;
    try {
      y = await Ne(`${Ee}${S.path}?__frame_t=${encodeURIComponent(assetToken)}`);
    } catch (error) {
      if (isCancel(error)) throw error;
      if (isBlockedByProxyAllowlist(error)) return we(false);
    }
    if (y !== undefined && isAllowlistBlockedResponse(y.status, y.headers)) return we(true);
    if (y !== undefined && y.status === 200)
      return re(Buffer.from(y.data), y.headers?.["content-type"], true);
    S.fellBack = y?.status ?? 0;
    logForDebugging(`[artifact] stored-source read fell back (${S.fellBack}) slug=${e.slug}`);
  }
  let D;
  try {
    D = await Ne(ct);
  } catch (error) {
    if (isCancel(error)) throw error;
    if (isBlockedByProxyAllowlist(error)) return we(false);
    let proxyError = findProxyError(error);
    let O =
      proxyError === undefined
        ? undefined
        : (proxyErrorCode(proxyError.headers) ?? proxyDenyReason(proxyError.headers));
    let q = isTransportError(error);
    let C = isAxiosError(error) && /^[A-Z][A-Z0-9_]{1,48}$/.test(error.code ?? "") ? ` ${error.code}` : "";
    let G =
      proxyError !== undefined
        ? `proxy refused the connection: ${describeHttpStatus(proxyError.connectStatus)}${O === undefined ? "" : `, ${O}`}`
        : q
          ? `network error${C}: could not connect to ${X} on port 443 \u2014 the machine running Claude Code needs outbound HTTPS to ${getFrameHostPattern(e.env)} when the Artifact tool is enabled`
          : "read failed";
    let oe = (V) =>
      V === undefined ? "" : `, and the session gateway could not serve the read either (${V.why})`;
    let ge = (V) =>
      V !== undefined && {
        relay: fromEnum(V.code),
        ...(V.status !== undefined && {
          relay_status: V.status,
        }),
      };
    if (proxyError !== undefined && proxyError.connectStatus === 407) {
      logFeatureBad(r, "asset_proxy_refused", {
        status: proxyError.connectStatus,
        ...ge(ae),
      });
      return {
        err: `artifact content fetch failed (${G})${oe(ae)}`,
        status: proxyError.connectStatus,
        ...(O !== undefined && {
          respondent: true,
          safeErr: `artifact content fetch failed (proxy refused the connection: ${describeHttpStatus(proxyError.connectStatus)})${oe(ae)}`,
        }),
      };
    }
    let Z = ae;
    if (assetToken !== undefined && Z === undefined && q && frameRelayActive())
      if (relayDeclined(ARTIFACT_MOUNT)) Z = GATEWAY_DECLINED_RESULT;
      else {
        let V = await fe(assetToken, "asset_unreachable_relayed");
        if (V.relayed) return V.result;
        Z = V;
      }
    logFeatureBad(r, "asset_request_error", {
      ...(proxyError !== undefined && {
        status: proxyError.connectStatus,
      }),
      ...ge(Z),
    });
    return {
      err: `artifact content fetch failed (${G})${oe(Z)}`,
      ...(q &&
        proxyError === undefined && {
          transient: true,
        }),
      ...(proxyError !== undefined &&
        proxyError.connectStatus !== 0 && {
          status: proxyError.connectStatus,
        }),
      ...(proxyError !== undefined &&
        O !== undefined && {
          respondent: true,
          safeErr: `artifact content fetch failed (proxy refused the connection: ${describeHttpStatus(proxyError.connectStatus)})${oe(Z)}`,
        }),
    };
  }
  if (isAllowlistBlockedResponse(D.status, D.headers)) return we(true);
  getLiveState().contentHostEgressDenied.delete(e.env);
  if (D.status < 200 || D.status >= 300) {
    let y = proxyDenialResult(D.headers, D.data, (O) => redactFrameToken(O, assetToken));
    if (D.status === 403 && assetToken === undefined && isForbiddenProxy(D.headers, y)) {
      logFeatureBad(r, "public_asset_forbidden");
      return {
        err: "artifact is not publicly readable at this version",
        status: 403,
      };
    }
    if (D.status === 404 && P !== "" && assetToken !== undefined && isNotFoundProxy(D.headers, y)) {
      logFeatureSad(r, "file_not_in_manifest");
      return {
        err: "this version of the artifact has no file at that path",
        status: 404,
        missingFile: true,
      };
    }
    let proxyDenial = parseProxyDenial(D.status, y);
    logFeatureBad(r, proxyDenial ?? "asset_failed");
    return {
      err: `artifact content fetch failed (${describeFetchFailure(D.status, D.headers, y)})`,
      status: D.status,
      respondent: true,
      ...(proxyDenial !== undefined && {
        safeErr: ARTIFACT_PROXY_DENIAL_TEXTS[proxyDenial],
        proxyDeny: proxyDenial,
      }),
    };
  }
  return re(Buffer.from(D.data), D.headers?.["content-type"], false);
}
//@ chunk-jv307fw4.js:53256-53662 placement
/**
 * 描述 artifact 内容获取失败：HTTP 状态，再附响应体原因、出口代理报告或 x-proxy-error 头（清洗后），以及 x-request-id。
 */
function describeFetchFailure(status, headers, r) {
  let s = [`HTTP ${status}`];
  let a = proxyDenyReason(headers);
  if (a === undefined && r.reason !== undefined)
    s.push(`response body: "${scrubArtifactEnvelopeTags(r.reason.replaceAll('"', "'"))}"`);
  else if (a !== undefined) s.push(`the environment's egress proxy reported: ${a}`);
  else if (r.proxyError !== undefined)
    s.push(`x-proxy-error header: "${scrubArtifactEnvelopeTags(r.proxyError.replaceAll('"', "'"))}"`);
  if (r.requestId !== undefined) s.push(`x-request-id: ${r.requestId}`);
  return s.join("; ");
}
//@ chunk-jv307fw4.js:53662-53775 placement
/**
 * 取出读取失败的显示文本：有响应时用安全错误消息或 HTTP 状态，否则用原始错误。
 */
function getFetchErrorText(e) {
  return e.respondent ? (e.safeErr ?? `artifact content fetch failed (HTTP ${e.status ?? "error"})`) : e.err;
}
//@ chunk-jv307fw4.js:53775-54009 placement
/**
 * 在文本里遮盖 __frame_t 访问令牌参数（含各种 URL 编码形式），以及给定令牌的原文与 URL 编码形式。
 */
function redactFrameToken(e, assetToken) {
  let replaced = e.replace(
    /(?:_|%(?:25)*5f){2}frame(?:_|%(?:25)*5f)t(?:=|%(?:25)*3d)["']?[^\s&"'<>]*/gi,
    "__frame_t=[redacted]",
  );
  if (assetToken !== undefined && assetToken !== "") {
    replaced = redactTokenFragments(replaced, assetToken, "g");
    let encoded = encodeURIComponent(assetToken);
    if (encoded !== assetToken) replaced = redactTokenFragments(replaced, encoded, "gi");
  }
  return replaced;
}
//@ chunk-jv307fw4.js:54009-54041 placement
var TOKEN_FRAGMENT_LEN = 16;
var TOKEN_CHAR_RE = /[A-Za-z0-9._~%-]/;
//@ chunk-jv307fw4.js:54041-54405 placement
/**
 * 在文本中遮蔽令牌：短令牌直接替换；长令牌按固定长度的所有片段生成正则，连同相邻的令牌字符一起替换为 [redacted]。
 */
function redactTokenFragments(e, n, r) {
  if (n.length <= TOKEN_FRAGMENT_LEN) return e.replaceAll(n, "[redacted]");
  let s = new Set();
  for (let j = 0; j + TOKEN_FRAGMENT_LEN <= n.length; j++)
    s.add(urlPatternToRegex(n.slice(j, j + TOKEN_FRAGMENT_LEN)));
  let regExp = new RegExp(`(?:${[...s].join("|")})${TOKEN_CHAR_RE.source}*`, r);
  let l = "";
  let d = 0;
  for (let h of e.matchAll(regExp)) {
    let index = h.index;
    while (index > d && TOKEN_CHAR_RE.test(e.charAt(index - 1))) index--;
    l += `${e.slice(d, index)}[redacted]`;
    d = h.index + h[0].length;
  }
  return l + e.slice(d);
}
export { webfetchReadFile, getFetchErrorText, redactFrameToken, readArtifactFileViaWebFetch, webfetchProbe };
