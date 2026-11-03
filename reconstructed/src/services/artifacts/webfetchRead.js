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
  BZe,
  readViaGateway,
  Ycn,
  GATEWAY_DECLINED_RESULT,
} from "./gatewayRead.js";
import { fetchArtifactBootWithProbe } from "./boot.js";
import { PUBLIC_READ_UNASKED_REASON } from "./frameFlags.js";
import {
  canReadAssets,
  buildFrameFilePath,
  classifyArtifactOwnership,
  dt,
  Qe,
  getCurrentStoredDecl,
  getDocumentCount,
  Dt,
  isReaderRole,
  isForeignOwnership,
  isWriterRole,
  TFr,
} from "./audience.js";
import { LIVE_DOC, aK, INDEX_HTML } from "./textSanitize.js";
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
import { V6 } from "./frameApi.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { logForDebugging } from "../../utils/debug.js";
import { describeFrameAllowlistHint, getFrameHostPattern } from "./frameHost.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { isCancel, isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";
import { AbortError } from "../../utils/errors.js";
import { isTransportError, externalHttp } from "../http/externalHttp.js";
import {
  Aae,
  rat,
  iG,
  CRt,
  Cae,
  parseProxyDenial,
  ARTIFACT_PROXY_DENIAL_TEXTS,
} from "../../utils/sandbox/proxyDenial.js";
import { frameRelayActive, relayDeclined } from "./frameRelay.js";
import { ARTIFACT_MOUNT } from "./artifactMount.js";
import { findProxyError, describeHttpStatus } from "../../utils/proxy.js";
import { scrubArtifactEnvelopeTags } from "../../tools/ArtifactTool/artifactUrls.js";

//@ chunk-jv307fw4.js:42867-42966 placement
function gF(e, n, r, s = "artifact_webfetch_read", a = "probe", l, d, h = !1) {
  return readArtifactViaWebFetch(e, n, s, e.file, r, a, l, d, h);
}
/**
 * 通过 WebFetch 路径读取 artifact 的某个文件：先校验路径，非法时打点并返回错误。
 */
//@ chunk-jv307fw4.js:42966-43162 placement
async function readArtifactFileViaWebFetch(e, n, r, s, a = "artifact_webfetch_read", l) {
  let d = validateReadPath(n);
  if ("errMsg" in d) return (logFeatureBad(a, "invalid_path"), { err: `artifact read failed: ${d.errMsg}` });
  return readArtifactViaWebFetch(e, r, a, d.key, s, "probe", void 0, l);
}
//@ chunk-jv307fw4.js:43162-43239 placement
function F2s(e, n, r, s, a) {
  return readArtifactViaWebFetch(e, r, a, void 0, s, "probe", void 0, void 0, !1, n);
}
/**
 * 经 WebFetch 通道读取 artifact 文件：校验相对路径、取 boot、按受众框定内容并记录遥测。
 */
//@ chunk-jv307fw4.js:43239-53256 placement
async function readArtifactViaWebFetch(e, n, r, s, a, l, d, h, b = !1, T) {
  let P = encodeFilePath(s);
  if (P === void 0)
    return (
      logFeatureBad(r, "invalid_file_path"),
      { err: "artifact file path is not a clean relative path" }
    );
  let v = await fetchArtifactBootWithProbe(e, r, n, {
    kind: l,
    readBack: b,
    pastVer: T,
    credentials: a,
    probeToolUseId: h,
  });
  if (v.err !== null) return v;
  let { ver: ver, assetToken: assetToken } = v;
  if (s !== void 0 && assetToken === void 0)
    return (
      logFeatureBad(r, "public_file"),
      {
        err: "the files of a public artifact read from outside its organization are not readable this way",
        status: 403,
        publicFile: !0,
      }
    );
  if (assetToken === void 0 && d?.() !== !0)
    return (
      logFeatureSad(r, PUBLIC_READ_UNASKED_REASON),
      {
        err: "this is a public artifact from outside your organization; its page is fetched only on a read the user approved, and this call carries no such approval \u2014 nothing was fetched",
        status: 403,
        publicUnasked: !0,
      }
    );
  let W = `/_f/${ver}/${P}`,
    S = canReadAssets(v) ? { path: buildFrameFilePath(ver, P) } : void 0,
    R = (y) => {
      let w = {
        ...(y && { source: !0 }),
        ...(!y && S?.fellBack !== void 0 && { source_fallback_status: S.fellBack }),
        ...(v.reused && { boot_reused: !0 }),
      };
      return Object.keys(w).length > 0 ? w : void 0;
    },
    { title: title, favicon: favicon, perm: perm, cowritten: cowritten } = v.data,
    A = v.data.artifactKind === LIVE_DOC || getShareEntry(e.slug)?.artifactKind === LIVE_DOC,
    j = assetToken === void 0 ? "public" : perm?.mode,
    H = classifyArtifactOwnership(v),
    x = perm?.role === "owner" ? "owner" : perm?.role === "writer" ? "writer" : "reader",
    I = ownedVerdict({ role: deriveShareRole(dt(perm?.role, assetToken === void 0)) }),
    de = perm?.assignableReadModes,
    pe =
      x === "owner" && Array.isArray(de) && de.every((y) => y === "owner" || Qe.some((w) => w === y))
        ? {
            modes: Qe.filter((y) => de.includes(y) && !(A && y === "public")),
            ...(typeof perm?.externalSharingEnabled === "boolean" && {
              externalSharing: perm.externalSharingEnabled,
            }),
            ...(typeof perm?.externalInvitesEnabled === "boolean" && {
              externalInvites: perm.externalInvitesEnabled,
            }),
          }
        : void 0,
    be = parseProvenance(v.data.origin_metadata),
    B = getCurrentStoredDecl(v.data),
    ne = splitManifestTypeFiles(v.data.files),
    ie = getDocumentCount(v.data.dbUsage),
    he =
      typeof v.data.contentStore === "string" && Dt.test(v.data.contentStore) ? v.data.contentStore : void 0,
    re = (y, w, O, q = () => logFeatureOk(r, R(O))) => {
      q();
      let C =
          s === void 0 ? "text/html" : typeof w === "string" ? firstLineOf(w, ";").trim().toLowerCase() : "",
        str = y.toString("utf-8"),
        oe = C === "text/html" ? stripFrameCommentsScript(str) : str,
        ge = triState(v.data.outsideWriter),
        Z = orTriState(ge, getShareEntry(e.slug)?.outsideWriter);
      return {
        err: null,
        html: oe,
        contentType: C,
        raw: y,
        role: x,
        ...(O && { source: !0 }),
        cowritten: cowritten === !0 || A || getShareEntry(e.slug)?.cowritten === !0,
        publicRead: assetToken === void 0,
        ...(isReaderRole(perm?.role) && { servedAudienceVersion: !0 }),
        ...(I !== void 0 && { owned: I }),
        sameChannel: perm?.sameChannel === !0 && x === "writer",
        ...(H === "external" && { external: !0 }),
        ...(isForeignOwnership(H) && { offOrgRamp: !0 }),
        typeLocked: typeLockedFor(e.slug, v.data.type),
        ...((v.data.authoredByOthers === !0 || getShareEntry(e.slug)?.authoredByOthers === !0) && {
          authoredByOthers: !0,
        }),
        ...((aK(v.data.outsidersMayHaveWritten) || getShareEntry(e.slug)?.outsidersMayHaveWritten === !0) && {
          outsidersMayHaveWritten: !0,
        }),
        ...(mayBeShared(x === "owner" && assetToken !== void 0, ge, Z) && { outsideOrg: !0 }),
        ...(Z !== void 0 && { outsideWriter: Z }),
        ...(pe !== void 0 && { shareMenu: pe }),
        ...(j !== void 0 &&
          (() => {
            let V = deriveShareStatus(j, v.data.shared),
              ft = isWriterRole(perm?.role),
              { live: live, shared: shared } = v.data,
              lt = typeof live === "string" && V6.test(live),
              Te = typeof shared === "string" && V6.test(shared) ? shared : void 0,
              pt = (lt && (shared === void 0 || shared === "")) || Te !== void 0;
            return {
              audience: V.mode,
              ...(ft &&
                pt &&
                V.mode !== "owner" && {
                  audienceView: Te === void 0 ? "live" : Te === ver ? "pinned-current" : "pinned-earlier",
                }),
            };
          })()),
        bytes: C === "text/html" ? Buffer.byteLength(oe, "utf8") : y.length,
        title: typeof title === "string" ? title : "",
        ...(favicon !== void 0 && { favicon: favicon }),
        ver: ver,
        ...(typeof v.data.fileCount === "number" &&
          Number.isSafeInteger(v.data.fileCount) &&
          v.data.fileCount > 0 && { fileCount: v.data.fileCount }),
        ...(ne !== void 0 && { manifestPaths: ne }),
        ...(ie !== void 0 && { storeDocuments: ie }),
        ...(he !== void 0 && { contentStore: he }),
        ...(be !== void 0 && { origin: be }),
        ...(B !== void 0 && { readBack: B }),
      };
    };
  if (A && s === void 0 && T === void 0) {
    let y = await getLiveState().liveReplicas.renderLevel?.(e.slug, INDEX_HTML, v.data.headSeq, n);
    if (y !== void 0) {
      logForDebugging(`[artifact] read served from the local replica at seq ${y.head} slug=${e.slug}`);
      let w = re(Buffer.from(y.html, "utf8"), "text/html", !1);
      return w.err === null ? { ...w, localReplica: { head: y.head } } : w;
    }
  }
  let X = `${e.slug}.frame.${e.env === "staging" ? "staging." : ""}claudeusercontent.com`,
    ue = describeFrameAllowlistHint(e.env),
    ce = (y, w) => {
      if (y.code === "unavailable" && y.status !== void 0)
        return (
          logFeatureBad(r, "asset_relay_unavailable", { relay_status: y.status }),
          {
            err: `${describeGatewayTransient(y.status)}. Your access to the artifact itself is fine (the permission check passed); this environment cannot reach ${X} directly, so its reads go through the gateway.`,
            status: y.status,
          }
        );
      return (
        logFeatureBad(r, "asset_egress_blocked", {
          relay: fromEnum(y.code),
          ...(y.status !== void 0 && { relay_status: y.status }),
          ...(!w && { connect: !0 }),
        }),
        {
          err: `this environment's network allowlist blocks ${X}, and the session gateway could not serve the read either (${y.why}); your access to the artifact itself is fine (the permission check passed). ${ue}`,
          status: 403,
          ...(w && { deterministic: "egress-blocked" }),
        }
      );
    },
    L = async (y) => {
      let w = (C) =>
          getViaFrameContent(e.slug, C, {
            token: y,
            timeout: TFr,
            maxContentLength: s === void 0 ? MAX_MOUNT_READ_BYTES : MAX_MOUNT_FILE_BYTES,
            signal: n,
            credentials: a,
          }),
        O;
      try {
        if (S !== void 0 && S.fellBack === void 0) {
          let C = await w(S.path).catch((G) => {
            if (isCancel(G) || G instanceof AbortError) throw G;
            return { kind: "answer", status: 0, headers: void 0, data: void 0 };
          });
          if (C.kind === "answer" && C.status === 200)
            return re(Buffer.from(C.data ?? new ArrayBuffer(0)), BZe(C.headers), !0, () =>
              logFeatureOk(r, { ...R(!0), frame_content: !0 }),
            );
          if (C.kind === "answer") S.fellBack = C.status;
        }
        O = await w(W);
      } catch (error) {
        if (isCancel(error) || error instanceof AbortError) throw error;
        logFeatureBad(r, "asset_request_error", { frame_content: !0 });
        let G = isTransportError(error),
          oe = isAxiosError(error) && /^[A-Z][A-Z0-9_]{1,48}$/.test(error.code ?? "") ? ` ${error.code}` : "";
        return {
          err: `artifact content fetch failed (${G ? `network error${oe} reaching the artifact service` : "read failed"})`,
          ...(G && { transient: !0 }),
        };
      }
      if (O.kind === "declined") {
        if (S !== void 0) S.fellBack = void 0;
        return;
      }
      if (O.status >= 200 && O.status < 300)
        return re(Buffer.from(O.data ?? new ArrayBuffer(0)), BZe(O.headers), !1, () =>
          logFeatureOk(r, { ...R(!1), frame_content: !0 }),
        );
      let q = Aae(O.headers, O.data, (C) => redactFrameToken(C, y));
      if (O.status === 404 && P !== "" && isNotFoundProxy(O.headers, q))
        return (
          logFeatureSad(r, "file_not_in_manifest"),
          { err: "this version of the artifact has no file at that path", status: 404, missingFile: !0 }
        );
      return (
        logFeatureBad(r, "asset_failed", { frame_content: !0 }),
        {
          err: `artifact content fetch failed (${describeFetchFailure(O.status, O.headers, q)})`,
          status: O.status,
          respondent: !0,
        }
      );
    },
    fe = (y, w) =>
      readViaGateway(
        {
          slug: e.slug,
          servedPath: W,
          fileRead: s !== void 0,
          feature: r,
          token: y,
          signal: n,
          ...(S !== void 0 && { source: S }),
        },
        (O, q, C) => re(O, q, C, () => logFeatureSad(r, w, R(C))),
      );
  if (assetToken !== void 0 && Ycn(v.data)) {
    let y = await L(assetToken);
    if (y !== void 0) return y;
  }
  let ae;
  if (
    assetToken !== void 0 &&
    getLiveState().contentHostEgressDenied.has(e.env) &&
    frameRelayActive() &&
    !relayDeclined(ARTIFACT_MOUNT)
  ) {
    let y = await fe(assetToken, "asset_egress_relayed");
    if (y.relayed) return y.result;
    ae = y;
  }
  let Be = void 0,
    Ee = Be ?? `https://${X}`,
    ct = assetToken === void 0 ? `${Ee}${W}` : `${Ee}${W}?__frame_t=${encodeURIComponent(assetToken)}`,
    we = async (y) => {
      getLiveState().contentHostEgressDenied.add(e.env);
      let w = frameRelayActive();
      if (assetToken !== void 0 && w) {
        if (ae !== void 0) return ce(ae, y);
        if (relayDeclined(ARTIFACT_MOUNT)) return ce(GATEWAY_DECLINED_RESULT, y);
        let O = await fe(assetToken, "asset_egress_relayed");
        return O.relayed ? O.result : ce(O, y);
      }
      return (
        logFeatureBad(r, "asset_egress_blocked", { ...(!y && { connect: !0 }) }),
        {
          err:
            assetToken === void 0 && w
              ? `this environment's network allowlist blocks ${X}, and public (tokenless) artifacts are not served through the session gateway, so the artifact's content cannot be fetched (your access to the artifact itself is fine \u2014 the permission check passed). ${ue}`
              : `this environment's network allowlist blocks ${X}, so the artifact's content cannot be fetched (your access to the artifact itself is fine \u2014 the permission check passed). ${ue}`,
          status: 403,
          ...(y && { deterministic: "egress-blocked" }),
        }
      );
    },
    Ne = (y) =>
      externalHttp.get(y, {
        signal: n,
        timeout: TFr,
        responseType: "arraybuffer",
        maxRedirects: 0,
        maxContentLength: s === void 0 ? MAX_MOUNT_READ_BYTES : MAX_MOUNT_FILE_BYTES,
        validateStatus: () => !0,
        ...(Be && { headers: { Host: `${e.slug}.frame.localhost` } }),
      });
  if (
    S !== void 0 &&
    assetToken !== void 0 &&
    S.fellBack === void 0 &&
    !getLiveState().contentHostEgressDenied.has(e.env)
  ) {
    let y;
    try {
      y = await Ne(`${Ee}${S.path}?__frame_t=${encodeURIComponent(assetToken)}`);
    } catch (error) {
      if (isCancel(error)) throw error;
      if (rat(error)) return we(!1);
    }
    if (y !== void 0 && iG(y.status, y.headers)) return we(!0);
    if (y !== void 0 && y.status === 200) return re(Buffer.from(y.data), y.headers?.["content-type"], !0);
    ((S.fellBack = y?.status ?? 0),
      logForDebugging(`[artifact] stored-source read fell back (${S.fellBack}) slug=${e.slug}`));
  }
  let D;
  try {
    D = await Ne(ct);
  } catch (error) {
    if (isCancel(error)) throw error;
    if (rat(error)) return we(!1);
    let w = findProxyError(error),
      O = w === void 0 ? void 0 : (CRt(w.headers) ?? Cae(w.headers)),
      q = isTransportError(error),
      C = isAxiosError(error) && /^[A-Z][A-Z0-9_]{1,48}$/.test(error.code ?? "") ? ` ${error.code}` : "",
      G =
        w !== void 0
          ? `proxy refused the connection: ${describeHttpStatus(w.connectStatus)}${O === void 0 ? "" : `, ${O}`}`
          : q
            ? `network error${C}: could not connect to ${X} on port 443 \u2014 the machine running Claude Code needs outbound HTTPS to ${getFrameHostPattern(e.env)} when the Artifact tool is enabled`
            : "read failed",
      oe = (V) =>
        V === void 0 ? "" : `, and the session gateway could not serve the read either (${V.why})`,
      ge = (V) =>
        V !== void 0 && { relay: fromEnum(V.code), ...(V.status !== void 0 && { relay_status: V.status }) };
    if (w !== void 0 && w.connectStatus === 407)
      return (
        logFeatureBad(r, "asset_proxy_refused", { status: w.connectStatus, ...ge(ae) }),
        {
          err: `artifact content fetch failed (${G})${oe(ae)}`,
          status: w.connectStatus,
          ...(O !== void 0 && {
            respondent: !0,
            safeErr: `artifact content fetch failed (proxy refused the connection: ${describeHttpStatus(w.connectStatus)})${oe(ae)}`,
          }),
        }
      );
    let Z = ae;
    if (assetToken !== void 0 && Z === void 0 && q && frameRelayActive())
      if (relayDeclined(ARTIFACT_MOUNT)) Z = GATEWAY_DECLINED_RESULT;
      else {
        let V = await fe(assetToken, "asset_unreachable_relayed");
        if (V.relayed) return V.result;
        Z = V;
      }
    return (
      logFeatureBad(r, "asset_request_error", { ...(w !== void 0 && { status: w.connectStatus }), ...ge(Z) }),
      {
        err: `artifact content fetch failed (${G})${oe(Z)}`,
        ...(q && w === void 0 && { transient: !0 }),
        ...(w !== void 0 && w.connectStatus !== 0 && { status: w.connectStatus }),
        ...(w !== void 0 &&
          O !== void 0 && {
            respondent: !0,
            safeErr: `artifact content fetch failed (proxy refused the connection: ${describeHttpStatus(w.connectStatus)})${oe(Z)}`,
          }),
      }
    );
  }
  if (iG(D.status, D.headers)) return we(!0);
  if ((getLiveState().contentHostEgressDenied.delete(e.env), D.status < 200 || D.status >= 300)) {
    let y = Aae(D.headers, D.data, (O) => redactFrameToken(O, assetToken));
    if (D.status === 403 && assetToken === void 0 && isForbiddenProxy(D.headers, y))
      return (
        logFeatureBad(r, "public_asset_forbidden"),
        { err: "artifact is not publicly readable at this version", status: 403 }
      );
    if (D.status === 404 && P !== "" && assetToken !== void 0 && isNotFoundProxy(D.headers, y))
      return (
        logFeatureSad(r, "file_not_in_manifest"),
        { err: "this version of the artifact has no file at that path", status: 404, missingFile: !0 }
      );
    let w = parseProxyDenial(D.status, y);
    return (
      logFeatureBad(r, w ?? "asset_failed"),
      {
        err: `artifact content fetch failed (${describeFetchFailure(D.status, D.headers, y)})`,
        status: D.status,
        respondent: !0,
        ...(w !== void 0 && { safeErr: ARTIFACT_PROXY_DENIAL_TEXTS[w], proxyDeny: w }),
      }
    );
  }
  return re(Buffer.from(D.data), D.headers?.["content-type"], !1);
}
/**
 * 描述 artifact 内容获取失败：HTTP 状态，再附响应体原因、出口代理报告或 x-proxy-error 头（清洗后），以及 x-request-id。
 */
//@ chunk-jv307fw4.js:53256-53662 placement
function describeFetchFailure(e, n, r) {
  let s = [`HTTP ${e}`],
    a = Cae(n);
  if (a === void 0 && r.reason !== void 0)
    s.push(`response body: "${scrubArtifactEnvelopeTags(r.reason.replaceAll('"', "'"))}"`);
  else if (a !== void 0) s.push(`the environment's egress proxy reported: ${a}`);
  else if (r.proxyError !== void 0)
    s.push(`x-proxy-error header: "${scrubArtifactEnvelopeTags(r.proxyError.replaceAll('"', "'"))}"`);
  if (r.requestId !== void 0) s.push(`x-request-id: ${r.requestId}`);
  return s.join("; ");
}
/**
 * 取出读取失败的显示文本：有响应时用安全错误消息或 HTTP 状态，否则用原始错误。
 */
//@ chunk-jv307fw4.js:53662-53775 placement
function getFetchErrorText(e) {
  return e.respondent ? (e.safeErr ?? `artifact content fetch failed (HTTP ${e.status ?? "error"})`) : e.err;
}
/**
 * 在文本里遮盖 __frame_t 访问令牌参数（含各种 URL 编码形式），以及给定令牌的原文与 URL 编码形式。
 */
//@ chunk-jv307fw4.js:53775-54009 placement
function redactFrameToken(e, n) {
  let replaced = e.replace(
    /(?:_|%(?:25)*5f){2}frame(?:_|%(?:25)*5f)t(?:=|%(?:25)*3d)["']?[^\s&"'<>]*/gi,
    "__frame_t=[redacted]",
  );
  if (n !== void 0 && n !== "") {
    replaced = redactTokenFragments(replaced, n, "g");
    let s = encodeURIComponent(n);
    if (s !== n) replaced = redactTokenFragments(replaced, s, "gi");
  }
  return replaced;
}
//@ chunk-jv307fw4.js:54009-54041 placement
var Oe = 16,
  nt = /[A-Za-z0-9._~%-]/;
/**
 * 在文本中遮蔽令牌：短令牌直接替换；长令牌按固定长度的所有片段生成正则，连同相邻的令牌字符一起替换为 [redacted]。
 */
//@ chunk-jv307fw4.js:54041-54405 placement
function redactTokenFragments(e, n, r) {
  if (n.length <= Oe) return e.replaceAll(n, "[redacted]");
  let s = new Set();
  for (let h = 0; h + Oe <= n.length; h++) s.add(urlPatternToRegex(n.slice(h, h + Oe)));
  let regExp = new RegExp(`(?:${[...s].join("|")})${nt.source}*`, r),
    l = "",
    d = 0;
  for (let h of e.matchAll(regExp)) {
    let index = h.index;
    while (index > d && nt.test(e.charAt(index - 1))) index--;
    ((l += `${e.slice(d, index)}[redacted]`), (d = h.index + h[0].length));
  }
  return l + e.slice(d);
}

export { gF, getFetchErrorText, redactFrameToken, readArtifactFileViaWebFetch, F2s };
