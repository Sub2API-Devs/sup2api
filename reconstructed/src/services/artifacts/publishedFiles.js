/**
 * services/artifacts/publishedFiles.ts
 *
 * 2.1.316 新增：读取已发布 Artifact 中的文件（_files.json 清单、/_f/ 路径），本地直连或经云会话中继/挂载
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5e92hn02.js (17), chunk-jv307fw4.js (1)
 * attribution: placement 18
 */
import { createHash } from "crypto";
import { CN } from "./frameApi.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_2, create_20, create_3, create_6 } from "../../../vendor/zod/lib/index.mjs";
import { SHA256_HEX_RE, CONTENT_TYPE_RE } from "../../tools/ArtifactTool/actions/uploadAsset.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import {
  runnerAgentMayReadFilesDirect,
  frameRelayBinds,
  frameRelayOffered,
  relayDeclined,
  agentSessionMaySendDirect,
  frameVerbRelayActive,
  BOOT_RELAY_FAMILY,
  mountHopFailedForRunner,
  mountDeclinedForRunner,
  isMountNetworkOffRefusal,
  MOUNT_NETWORK_OFF_WORDS,
  isFrameNotFoundBody,
  markRelayServed,
} from "./frameRelay.js";
import { ARTIFACT_MOUNT } from "./artifactMount.js";
import { env } from "../../utils/env.js";
import { mn } from "../../utils/remoteEnvironment.js";
import { fetchArtifactBootWithProbe } from "./boot.js";
import {
  isFramePublicReadEnabled,
  PUBLIC_READ_UNASKED_REASON,
  PUBLIC_READ_UNASKED_WORDS,
} from "./frameFlags.js";
import { LIVE_DOC, aK } from "./textSanitize.js";
import { getShareEntry, typeLockedFor, mayBeShared, triState, isForbiddenProxy } from "./shareEntries.js";
import {
  Ycn,
  getViaFrameContent,
  getViaMountOnce,
  describeGatewayTransient,
  BZe,
  UZe,
  MAX_MOUNT_FILE_BYTES,
} from "./gatewayRead.js";
import {
  isWriterRole,
  classifyArtifactOwnership,
  canReadAssets,
  isForeignOwnership,
  TFr,
  buildFrameFilePath,
} from "./audience.js";
import { artifactDocs } from "./artifactToolGates.js";
import { getFrameHost, describeFrameAllowlistHint } from "./frameHost.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { logForDebugging } from "../../utils/debug.js";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";
import { AbortError } from "../../utils/errors.js";
import { noGatewayCredentialMessage } from "../../utils/gatewayCredential.js";
import { externalHttp } from "../http/externalHttp.js";
import {
  iG,
  Cae,
  CRt,
  Aae,
  logProxyDenial,
  ARTIFACT_PROXY_DENIAL_TEXTS,
} from "../../utils/sandbox/proxyDenial.js";
import { findProxyError, describeHttpStatus } from "../../utils/proxy.js";
import { Y9 } from "./liveSubscribe.js";
import { redactFrameToken } from "./webfetchRead.js";
import { firstLineOf, isWellFormedString } from "../../utils/stringUtils.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { MAX_PUBLISHED_PATH_LENGTH } from "./artifactUrl.js";
import { gFr, validateReadPath } from "./publishPaths.js";
import { exciseFrameAssetServeBlock, splitManifestPaths } from "./pagePreparation.js";
import { MANIFEST_REQUEST_BUDGET } from "./publishInstanceFiles.js";

//@ chunk-5e92hn02.js:1232-1483 placement
var FILE_LIST_NAME = "_files.json",
  iBt = 4096,
  DDo = CN,
  X = 16777216,
  D = 90000,
  X_FRAME_DOC_SHA256 = "x-frame-doc-sha256",
  X_FRAME_DOC_SEQ = "x-frame-doc-seq",
  J = DoctorLazy(() =>
    create({
      ver: create_2(),
      files: create_20(
        create({
          sha256: create_2().regex(SHA256_HEX_RE),
          size: create_3().int().nonnegative().max(DDo),
          contentType: create_2().regex(CONTENT_TYPE_RE),
        }),
      ),
      narrowed: create_6().optional(),
    }),
  );
//@ chunk-5e92hn02.js:1483-1562 placement
function x(e) {
  return e === "file list" ? "artifact_file_list" : "artifact_file_read";
}
//@ chunk-5e92hn02.js:1562-1658 placement
function v(e, s, c, h = !0) {
  if (h) logFeatureBad(x(e), s);
  return { kind: "error", message: `${e} failed: ${c}`, reason: s };
}
//@ chunk-5e92hn02.js:1658-1730 placement
function M(e) {
  let s = e - 1;
  return s >= 1048576 ? `${s >> 20} MiB` : `${s >> 10} KiB`;
}
//@ chunk-5e92hn02.js:1730-1994 placement
var PUBLISHED_FILE_READ_UNAVAILABLE_TEXT =
    "published-file reads run only from a local session or an Anthropic-hosted cloud session with its gateway relay enabled; retrying from here will not help",
  re = "published-file reads aren't available from this kind of session; retrying from here will not help";
/**
 * 获取 Artifact 的文件清单（校验 slug、中继不可用/拒绝/未授权等）。
 */
//@ chunk-5e92hn02.js:1994-4290 placement
async function fetchPublishedFileList(
  e,
  s,
  c,
  h,
  { admitPublicRead: admitPublicRead, probeToolUseId: probeToolUseId },
) {
  if (!ARTIFACT_SLUG_RE.test(e.slug)) return v(s, "invalid_slug", "not a valid artifact id");
  let l = runnerAgentMayReadFilesDirect(),
    F = !l && (frameRelayBinds() || (frameRelayOffered() && !relayDeclined(ARTIFACT_MOUNT)));
  if (!F && !l && env.CLAUDE_CODE_REMOTE)
    return v(s, "relay_unavailable", PUBLISHED_FILE_READ_UNAVAILABLE_TEXT);
  let a = l || (mn() && agentSessionMaySendDirect());
  if (F && !frameVerbRelayActive(BOOT_RELAY_FAMILY) && !a) return v(s, "relay_not_served", re);
  let n = await fetchArtifactBootWithProbe(e, x(s), c, {
    gatePublicRead: !1,
    relayOnly: !a,
    credentials: h,
    probeToolUseId: probeToolUseId,
  });
  if (n.err !== null) {
    let w = n.errorCode === "boot_relay_error";
    if (w && (n.status === 403 || n.status === 404))
      return {
        kind: "error",
        reason: "relay_refused",
        message: `${s} failed: published-file reads from a cloud session go through the session gateway's artifact relay, which is not enabled for this session yet; retrying from here will not help`,
      };
    if (w && n.status === 401)
      return {
        kind: "error",
        reason: "relay_unauthorized",
        message: `${s} failed: the session gateway did not accept this session's credential for the artifact relay; retrying from here will not help`,
      };
    return { kind: "error", message: n.err.replace(/^artifact read/, s), reason: n.errorCode };
  }
  let y = n.assetToken === void 0;
  if (y && !isFramePublicReadEnabled())
    return v(
      s,
      "tokenless",
      "this artifact is served to you as a public (non-member) reader, and its files are not readable that way",
    );
  if (y && admitPublicRead?.() !== !0)
    return (
      logFeatureSad(x(s), PUBLIC_READ_UNASKED_REASON),
      v(s, PUBLIC_READ_UNASKED_REASON, PUBLIC_READ_UNASKED_WORDS, !1)
    );
  let R =
      n.data.cowritten === !0 ||
      n.data.artifactKind === LIVE_DOC ||
      getShareEntry(e.slug)?.cowritten === !0 ||
      getShareEntry(e.slug)?.artifactKind === LIVE_DOC,
    b = typeLockedFor(e.slug, n.data.type),
    k = mayBeShared(
      n.data.perm?.role === "owner",
      triState(n.data.outsideWriter),
      getShareEntry(e.slug)?.outsideWriter,
    );
  return {
    kind: "ok",
    target: e,
    ver: n.ver,
    assetToken: n.assetToken,
    publicRead: y,
    relay: F && !y,
    frameContent: !F && !y && Ycn(n.data),
    credentials: h,
    agentDirect: a,
    cowritten: R,
    typeLocked: b,
    writerClass: isWriterRole(n.data.perm?.role),
    foreign:
      n.data.authoredByOthers === !0 ||
      getShareEntry(e.slug)?.authoredByOthers === !0 ||
      aK(n.data.outsidersMayHaveWritten) ||
      getShareEntry(e.slug)?.outsidersMayHaveWritten === !0 ||
      n.data.perm?.role !== "owner" ||
      R ||
      b ||
      k,
    outsideOrg: k,
    orgRelation: classifyArtifactOwnership(n),
    livePaths: artifactDocs(n.data).map((w) => w.path),
    typePaths: splitManifestTypeFiles(n.data.files)?.type ?? [],
    source: canReadAssets(n),
    ...(typeof n.data.title === "string" && { title: n.data.title }),
    ...(n.data.favicon !== void 0 && { favicon: n.data.favicon }),
    ...(n.data.publishPreconditions === !0 && { publishPreconditions: !0 }),
    filesCounted:
      typeof n.data.fileCount === "number" && Number.isSafeInteger(n.data.fileCount) && n.data.fileCount > 0,
    reused: n.reused === !0,
  };
}
/**
 * 说明读取失败（出口被阻止、组织外公开 Artifact 的获取方式等，约 4 KB）。
 */
//@ chunk-5e92hn02.js:4290-8446 placement
async function describePublishedReadError(e, s, c, h, r, d, l = !0, F = !1) {
  let a = (u, _) => v(c, u, _, l),
    n = (u) => ({ kind: "status", status: u }),
    { target: target, assetToken: assetToken, relay: relay } = e,
    { host: host, base: base, headers: headers } = getFrameHost(target),
    P = () => (
      getLiveState().contentHostEgressDenied.add(target.env),
      a(
        "egress_blocked",
        `this environment's network allowlist blocks ${host}, so the file cannot be fetched (access to the artifact itself is fine). ${e.publicRead ? `Public artifacts from outside your organization are fetched from that host directly, so it must be on this session's network allowlist. ${describeFrameAllowlistHint(target.env)}` : env.CLAUDE_CODE_REMOTE ? "This is a restriction of where this session runs; retrying from here will not help." : `To allow it, add *.frame.${target.env === "staging" ? "staging." : ""}claudeusercontent.com to the environment's allowed domains.`}`,
      )
    ),
    L = (u, _) => (
      logForDebugging(`[artifact] ${c}: egress proxy denied (${_})`),
      a("egress_denied", `artifact content fetch refused by the environment's egress proxy (${u})`)
    ),
    A = !1,
    S;
  if (e.frameContent && assetToken !== void 0) {
    try {
      S = await getViaFrameContent(target.slug, s, {
        token: assetToken,
        timeout: D,
        maxContentLength: h,
        signal: r,
        credentials: e.credentials,
      });
    } catch (error) {
      if (isCancel(error) || error instanceof AbortError) throw error;
      return F
        ? n(0)
        : a("request_error", `the content fetch failed in transit, timed out, or exceeded the ${M(h)} limit`);
    }
    A = S.kind === "answer";
  }
  let o;
  try {
    if (S?.kind === "answer") o = S;
    else if (relay) {
      if (assetToken === void 0)
        return a(
          "internal",
          "internal error: a public artifact read was routed where it cannot be served \u2014 this is a bug in this build; do not retry",
        );
      let u = await getViaMountOnce(target.slug, s, {
        token: assetToken,
        timeout: D,
        maxContentLength: h,
        signal: r,
        retryBudget: d,
      });
      if (!u.ok)
        return a(
          u.reason.replace(/-/g, "_"),
          u.reason === "no-auth"
            ? noGatewayCredentialMessage(u.detail)
            : `artifact content is unreachable from this session (${u.reason})`,
        );
      o = { status: u.status, headers: u.response.headers, data: u.data };
    } else {
      let u = assetToken === void 0 ? "" : `?__frame_t=${encodeURIComponent(assetToken)}`,
        _ = await externalHttp.get(`${base}${s}${u}`, {
          signal: r,
          timeout: D,
          responseType: "arraybuffer",
          maxRedirects: 0,
          maxContentLength: h,
          validateStatus: () => !0,
          ...(headers && { headers: headers }),
        });
      if (iG(_.status, _.headers)) return P();
      let B = Cae(_.headers);
      if (B !== void 0 && (_.status < 200 || _.status >= 300)) return L(`HTTP ${_.status}`, B);
      o = { status: _.status, headers: _.headers, data: _.data };
    }
  } catch (error) {
    if (isCancel(error) || error instanceof AbortError) throw error;
    if (relay && !F) mountHopFailedForRunner();
    let _ = relay ? void 0 : findProxyError(error);
    if (_ !== void 0) {
      if (iG(_.connectStatus, _.headers)) return P();
      let B = Cae(_.headers);
      if (B !== void 0) return L(describeHttpStatus(_.connectStatus), B);
      let W = CRt(_.headers);
      if (W !== void 0) logForDebugging(`[artifact] ${c}: proxy refused, marker ${W}`);
      return F
        ? n(0)
        : a(
            "proxy_refused",
            `the proxy refused the connection to the artifact's content host (${describeHttpStatus(_.connectStatus)})`,
          );
    }
    return F
      ? n(0)
      : a("request_error", `the content fetch failed in transit, timed out, or exceeded the ${M(h)} limit`);
  }
  if (F && o.status !== 200) return n(o.status);
  if (!relay && !A) getLiveState().contentHostEgressDenied.delete(target.env);
  if (relay && mountDeclinedForRunner(o.status))
    return a("relay_unavailable", PUBLISHED_FILE_READ_UNAVAILABLE_TEXT);
  if (relay && isMountNetworkOffRefusal(o.status, o.data))
    return a("network_off", `${MOUNT_NETWORK_OFF_WORDS}; retrying from here will not help`);
  if (relay && Y9(o.status)) return a(`http_${o.status}`, describeGatewayTransient(o.status));
  if (relay) mountHopFailedForRunner(o.status);
  if (o.status === 404)
    return {
      kind: "status",
      status: 404,
      frameNotFound:
        o.data !== void 0 &&
        o.data.byteLength <= 256 &&
        isFrameNotFoundBody(Buffer.from(o.data).toString("utf8")),
    };
  if (
    assetToken === void 0 &&
    o.status === 403 &&
    isForbiddenProxy(
      o.headers,
      Aae(o.headers, o.data, (u) => u),
    )
  )
    return { kind: "status", status: 403 };
  let E = relay
    ? void 0
    : logProxyDenial({
        status: o.status,
        headers: o.headers,
        data: o.data,
        redact: (u) => redactFrameToken(u, assetToken),
        label: `[artifact] ${c}`,
      });
  if (E !== void 0) return a(E, ARTIFACT_PROXY_DENIAL_TEXTS[E]);
  if (o.status === 401 || o.status === 403)
    return a(
      `http_${o.status}`,
      relay
        ? "the cloud session's artifact mount refused the read \u2014 file reads may not be enabled for this session, or the artifact was unshared or taken down"
        : "access to the artifact content was refused \u2014 the artifact may have been unshared or taken down",
    );
  if (o.status !== 200)
    return a(
      `http_${o.status}`,
      `unexpected answer from the ${A ? "artifact service" : "content host"} (HTTP ${o.status})`,
    );
  if (relay) markRelayServed(ARTIFACT_MOUNT);
  let headers_2 = o.headers,
    O = relay || A ? BZe(headers_2) : headers_2?.["content-type"],
    lower = String(headers_2?.[X_FRAME_DOC_SHA256] ?? "").toLowerCase(),
    Y = String(headers_2?.[X_FRAME_DOC_SEQ] ?? "");
  return {
    kind: "ok",
    status: 200,
    bytes: Buffer.from(o.data ?? new ArrayBuffer(0)),
    contentType: typeof O === "string" ? firstLineOf(O, ";").trim().toLowerCase() : "",
    ...(SHA256_HEX_RE.test(lower) && { docSha256: lower }),
    ...(/^\d{1,15}$/.test(Y) && { docSeq: Number(Y) }),
  };
}
//@ chunk-5e92hn02.js:8446-9254 placement
async function parseFileListJson(e, s, c, h, r = !0) {
  let d = await describePublishedReadError(e, `/_f/${e.ver}/${FILE_LIST_NAME}`, s, X + 1, c, h, r);
  if (d.kind !== "ok") return d;
  let l;
  try {
    l = J().safeParse(jsonParse(d.bytes.toString("utf8")));
  } catch {
    return v(s, "bad_json", "the artifact service answered with something other than a file list", r);
  }
  if (!l.success || l.data.ver !== e.ver)
    return v(
      s,
      "bad_shape",
      "the artifact service answered with a file list this version of the tool cannot read",
      r,
    );
  let entries = Object.entries(l.data.files);
  if (entries.length > iBt) return v(s, "too_many", `the file list names more than ${iBt} files`, r);
  return {
    kind: "ok",
    files: entries
      .filter(
        ([n]) =>
          n.length <= MAX_PUBLISHED_PATH_LENGTH &&
          !/[\p{Cc}\p{Cf}\p{Co}\p{Zl}\p{Zp}]/u.test(n) &&
          isWellFormedString(n) &&
          !gFr(n),
      )
      .map(([n, y]) => ({ path: n, contentType: y.contentType, sizeBytes: y.size, sha256: y.sha256 }))
      .sort((n, y) => (n.path < y.path ? -1 : n.path > y.path ? 1 : 0)),
    narrowed: l.data.narrowed === !0,
  };
}
/**
 * artifact_file_list：列出已发布 Artifact 的文件。
 */
//@ chunk-5e92hn02.js:9254-11318 placement
async function listArtifactFiles(e, s, c, h = {}) {
  let r = await fetchPublishedFileList(e, "file list", s, c, h);
  if (r.kind === "error") return r;
  let d = await parseFileListJson(r, "file list", s, UZe());
  if (d.kind === "error") return d;
  if (d.kind === "status") {
    if (d.status === 404 && !r.filesCounted && (!r.relay || d.frameNotFound === !0))
      return (
        logFeatureSad("artifact_file_list", "single_page"),
        {
          kind: "error",
          reason: "single_page",
          message:
            "this artifact is a single page with no separately published files, so there is no file list; read the page itself",
          ver: r.ver,
          cowritten: r.cowritten,
          typeLocked: r.typeLocked,
        }
      );
    if (r.publicRead && d.status === 403) {
      if (await isVersionServed(r, s))
        return (
          logFeatureSad("artifact_file_list", "single_page"),
          {
            kind: "error",
            reason: "single_page",
            message:
              "this public artifact is a single page with no separately published files, so there is no file list; read the page itself",
            ver: r.ver,
            cowritten: r.cowritten,
            typeLocked: r.typeLocked,
          }
        );
      return v(
        "file list",
        "public_refused",
        "this public artifact's files are not available to readers outside its organization right now \u2014 it may no longer be public, or it was taken down",
      );
    }
    return (
      logFeatureBad("artifact_file_list", `http_${d.status}`),
      v(
        "file list",
        `http_${d.status}`,
        r.relay
          ? "not found through this cloud session's artifact mount \u2014 this artifact is a single page with no separate files, or file reads are not enabled for this session yet"
          : "the artifact has published files, but the artifact service does not offer their list yet; retrying from here will not help",
        !1,
      )
    );
  }
  return (
    logFeatureOk("artifact_file_list", {
      relay: r.relay,
      files: d.files.length,
      ...(r.agentDirect && { agent_direct: !0 }),
      ...(r.publicRead && { public: !0 }),
      ...(r.reused && { boot_reused: !0 }),
    }),
    {
      kind: "ok",
      ver: r.ver,
      files: d.files.map((file) => (r.livePaths.includes(file.path) ? { ...file, live: !0 } : file)),
      relay: r.relay,
      agentDirect: r.agentDirect,
      cowritten: r.cowritten,
      typeLocked: r.typeLocked,
      writerClass: r.writerClass,
      foreign: r.foreign,
      outsideOrg: r.outsideOrg,
      publicRead: r.publicRead,
      narrowed: r.publicRead && d.narrowed,
      ...(r.typePaths.length > 0 && { typePaths: r.typePaths }),
      ...(r.title !== void 0 && { title: r.title }),
      ...(r.favicon !== void 0 && { favicon: r.favicon }),
      ...(r.publishPreconditions === !0 && { publishPreconditions: !0 }),
    }
  );
}
/**
 * 从已发布文件的读取结果中挑出读取上下文字段（版本、中继、直接写入者、共同写入、类型锁定、外部/组织外标记、公开读取与标题等）。
 */
//@ chunk-5e92hn02.js:11318-11640 placement
function toReadContext(e) {
  return {
    ver: e.ver,
    relay: e.relay,
    agentDirect: e.agentDirect,
    cowritten: e.cowritten,
    typeLocked: e.typeLocked,
    writerClass: e.writerClass,
    foreign: e.foreign,
    outsideOrg: e.outsideOrg,
    ...(e.orgRelation === "external" && { external: !0 }),
    offOrgRamp: isForeignOwnership(e.orgRelation),
    publicRead: e.publicRead,
    ...(e.title !== void 0 && { title: e.title }),
  };
}
//@ chunk-5e92hn02.js:11640-12209 placement
function readFileViaMount(e, s, c = !0) {
  return v(
    "file read",
    `http_${s}`,
    e.relay
      ? `not found through this cloud session's artifact mount \u2014 no file is published at that path in the served version, or file reads are not enabled for this session yet; action "list_files" shows the paths`
      : e.publicRead
        ? 'this public artifact serves no file at that path to readers outside its organization \u2014 action "list_files" shows the paths it does serve (or the artifact is no longer public)'
        : 'no file is published at that path in the served version \u2014 action "list_files" shows the paths',
    c,
  );
}
/**
 * 对 artifact 内容主机发 HEAD /_f/<版本>/，判断该版本是否已在服务（200）；网络错误返回 false，取消时抛出。
 */
//@ chunk-5e92hn02.js:12209-12459 placement
async function isVersionServed(e, s) {
  let { base: base, headers: headers } = getFrameHost(e.target);
  try {
    return (
      (
        await externalHttp.head(`${base}/_f/${e.ver}/`, {
          signal: s,
          timeout: TFr,
          maxRedirects: 0,
          validateStatus: () => !0,
          ...(headers && { headers: headers }),
        })
      ).status === 200
    );
  } catch (error) {
    if (isCancel(error) || error instanceof AbortError) throw error;
    return !1;
  }
}
//@ chunk-5e92hn02.js:12459-13579 placement
async function readFileViaRelay(e, s, c, h, r, d = !0) {
  let joined = s.split("/").map(encodeURIComponent).join("/"),
    F = e.source
      ? await describePublishedReadError(
          e,
          buildFrameFilePath(e.ver, joined),
          "file read",
          MAX_MOUNT_FILE_BYTES,
          c,
          h,
          d,
          !0,
        )
      : void 0;
  if (F?.kind === "error") return F;
  let a =
      F?.kind === "ok"
        ? F
        : await describePublishedReadError(
            e,
            `/_f/${e.ver}/${joined}`,
            "file read",
            MAX_MOUNT_FILE_BYTES,
            c,
            h,
            d,
          ),
    n = a === F;
  if (a.kind !== "ok") return a;
  if (!CONTENT_TYPE_RE.test(a.contentType))
    return v(
      "file read",
      "unexpected_type",
      "the content host served the file with a type this tool does not save",
      d,
    );
  if (a.bytes.length >= MAX_MOUNT_FILE_BYTES)
    return v("file read", "size", `the file exceeds the ${M(MAX_MOUNT_FILE_BYTES)} limit`, d);
  let y = (S) => createHash("sha256").update(S).digest("hex"),
    bytes = a.bytes,
    b = y(bytes),
    k = !0,
    w = "unused",
    C = !1,
    P,
    L,
    included = e.livePaths.includes(s);
  if (a.contentType === "text/html") {
    let S = await r(),
      o = S.kind === "ok" ? S.files.find((file) => file.path === s)?.sha256 : void 0;
    if (((L = o), o === void 0)) ((w = included ? "live" : "missing"), (k = !1));
    else if (b === o) w = "verified";
    else {
      let E = n ? void 0 : exciseFrameAssetServeBlock(a.bytes, (T) => y(T) === o);
      if (E !== void 0) ((bytes = E), (b = o), (w = "verified"));
      else ((w = included ? "live" : "unverified"), (k = !1));
    }
  }
  return {
    kind: "ok",
    path: s,
    bytes: bytes,
    contentType: a.contentType,
    sha256: b,
    asPublished: k,
    listing: w,
    ...(L !== void 0 && { listedSha256: L }),
    docVerified: C,
    ...(P !== void 0 && { docSeq: P }),
    ...(n && { source: !0 }),
  };
}
//@ chunk-5e92hn02.js:13579-13905 placement
async function validateArtifactFilePath(e, s, c, h, r = {}) {
  let d = validateReadPath(s);
  if ("errMsg" in d) return v("file read", "invalid_path", d.errMsg);
  let l = await fetchPublishedFileList(e, "file read", c, h, r);
  if (l.kind === "error") return l;
  let F = UZe(),
    a = await readFileViaRelay(l, d.key, c, F, () => parseFileListJson(l, "file read", c, F, !1));
  if (a.kind === "error") return a;
  if (a.kind === "status") return readFileViaMount(l, a.status);
  return { ...a, ...toReadContext(l) };
}
//@ chunk-5e92hn02.js:13905-13921 placement
var LDo = 4,
  ne = MANIFEST_REQUEST_BUDGET;
/**
 * artifact_file_read：读取已发布 Artifact 中的一个文件。
 */
//@ chunk-5e92hn02.js:13921-14878 placement
async function readArtifactFile(e, s, c, h, { byteBudget: r = ne, ...d } = {}) {
  let l = await fetchPublishedFileList(e, "file read", c, h, d);
  if (l.kind === "error") return l;
  let F = UZe(),
    a,
    n = () =>
      (a ??= parseFileListJson(l, "file read", c, F, !1).then((b) => {
        if (b.kind !== "ok") a = void 0;
        return b;
      })),
    y = 0;
  return {
    kind: "ok",
    files: await mapWithConcurrency(s, LDo, async (b) => {
      let k = validateReadPath(b);
      if ("errMsg" in k) return { ...v("file read", "invalid_path", k.errMsg, !1), path: b };
      if (y >= r)
        return {
          kind: "error",
          reason: "batch_budget",
          message: `not fetched: the files read before it in this call already hold ${Math.floor(r / 1048576)}MB, the most one read carries \u2014 read it, and any after it, in another call`,
          path: k.key,
        };
      if (l.livePaths.includes(k.key))
        return {
          kind: "error",
          reason: "live_path",
          message: "this is a live file: read it by itself with `path`, which returns its current state",
          path: k.key,
        };
      let w = await readFileViaRelay(l, k.key, c, UZe(), n, !1);
      if (w.kind === "status") return { ...readFileViaMount(l, w.status, !1), path: k.key };
      if (w.kind === "ok") y += w.bytes.length;
      return w.kind === "error" ? { ...w, path: k.key } : w;
    }),
    ...toReadContext(l),
  };
}
/**
 * 以给定并发数依次对数组元素执行异步函数，按原顺序返回结果。
 */
//@ chunk-5e92hn02.js:14878-15068 placement
async function mapWithConcurrency(e, s, c) {
  let h = Array(e.length),
    r = 0,
    d = async () => {
      while (r < e.length) {
        let l = r++;
        h[l] = await c(e[l]);
      }
    };
  return (await Promise.all(Array.from({ length: Math.min(s, e.length) }, () => d())), h);
}
/**
 * 把文件清单数组转成按路径索引的 manifest，拆出类型文件部分；没有类型文件或格式不对时返回 undefined。
 */
//@ chunk-jv307fw4.js:23668-23883 placement
function splitManifestTypeFiles(e) {
  if (!Array.isArray(e)) return;
  let n = {};
  for (let s of e) {
    if (typeof s !== "object" || s === null || typeof s.path !== "string") return;
    n[s.path] = s;
  }
  let r = splitManifestPaths({ manifest: n });
  return r !== void 0 && r.type.length > 0 ? r : void 0;
}

export {
  DDo,
  iBt,
  listArtifactFiles,
  validateArtifactFilePath,
  LDo,
  readArtifactFile,
  splitManifestTypeFiles,
};
