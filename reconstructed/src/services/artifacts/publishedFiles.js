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
import { MAX_FRAME_RESPONSE_BYTES } from "./frameApi.js";
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
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { fetchArtifactBootWithProbe } from "./boot.js";
import {
  isFramePublicReadEnabled,
  PUBLIC_READ_UNASKED_REASON,
  PUBLIC_READ_UNASKED_WORDS,
} from "./frameFlags.js";
import { LIVE_DOC, isMeaningfulFlag } from "./textSanitize.js";
import { getShareEntry, typeLockedFor, mayBeShared, triState, isForbiddenProxy } from "./shareEntries.js";
import {
  canReadViaFrame,
  getViaFrameContent,
  getViaMountOnce,
  describeGatewayTransient,
  contentTypeOfHeaders,
  singleReadRetryBudget,
  MAX_MOUNT_FILE_BYTES,
} from "./gatewayRead.js";
import {
  isWriterRole,
  classifyArtifactOwnership,
  canReadAssets,
  isForeignOwnership,
  AUDIENCE_QUERY_TIMEOUT_MS,
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
  isAllowlistBlockedResponse,
  proxyDenyReason,
  proxyErrorCode,
  proxyDenialResult,
  logProxyDenial,
  ARTIFACT_PROXY_DENIAL_TEXTS,
} from "../../utils/sandbox/proxyDenial.js";
import { findProxyError, describeHttpStatus } from "../../utils/proxy.js";
import { isRetryableStatus } from "./liveSubscribe.js";
import { redactFrameToken } from "./webfetchRead.js";
import { firstLineOf, isWellFormedString } from "../../utils/stringUtils.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { MAX_PUBLISHED_PATH_LENGTH } from "./artifactUrl.js";
import { isServiceViewPath, validateReadPath } from "./publishPaths.js";
import { exciseFrameAssetServeBlock, splitManifestPaths } from "./pagePreparation.js";
import { MANIFEST_REQUEST_BUDGET } from "./publishInstanceFiles.js";

//@ chunk-5e92hn02.js:1232-1483 placement
/**
 * 已发布文件清单的常量：_files.json、最多 4096 个文件、读取上限 16 MB、90 s 超时、文档哈希与序号响应头及清单 schema。
 */
var FILE_LIST_NAME = "_files.json";
var MAX_LISTED_FILES = 4096;
var MAX_FILE_SIZE = MAX_FRAME_RESPONSE_BYTES;
var MAX_FILE_READ_BYTES = 16777216;
var FILE_FETCH_TIMEOUT_MS = 90000;
var X_FRAME_DOC_SHA256 = "x-frame-doc-sha256";
var X_FRAME_DOC_SEQ = "x-frame-doc-seq";
var fileListSchema = DoctorLazy(() =>
  create({
    ver: create_2(),
    files: create_20(
      create({
        sha256: create_2().regex(SHA256_HEX_RE),
        size: create_3().int().nonnegative().max(MAX_FILE_SIZE),
        contentType: create_2().regex(CONTENT_TYPE_RE),
      }),
    ),
    narrowed: create_6().optional(),
  }),
);
//@ chunk-5e92hn02.js:1483-1562 placement
function readTelemetryName(e) {
  return e === "file list" ? "artifact_file_list" : "artifact_file_read";
}
//@ chunk-5e92hn02.js:1562-1658 placement
function readError(e, s, c, h = true) {
  if (h) logFeatureBad(readTelemetryName(e), s);
  return {
    kind: "error",
    message: `${e} failed: ${c}`,
    reason: s,
  };
}
//@ chunk-5e92hn02.js:1658-1730 placement
function formatMib(e) {
  let s = e - 1;
  return s >= 1048576 ? `${s >> 20} MiB` : `${s >> 10} KiB`;
}
//@ chunk-5e92hn02.js:1730-1994 placement
/**
 * 已发布文件读取不可用的两种说明（需要本会话或带网关中继的云会话）。
 */
var PUBLISHED_FILE_READ_UNAVAILABLE_TEXT =
  "published-file reads run only from a local session or an Anthropic-hosted cloud session with its gateway relay enabled; retrying from here will not help";
var RELAY_NOT_SERVED_TEXT =
  "published-file reads aren't available from this kind of session; retrying from here will not help";
//@ chunk-5e92hn02.js:1994-4290 placement
/**
 * 获取 Artifact 的文件清单（校验 slug、中继不可用/拒绝/未授权等）。
 */
async function fetchPublishedFileList(e, s, c, credentials, { admitPublicRead, probeToolUseId }) {
  if (!ARTIFACT_SLUG_RE.test(e.slug)) return readError(s, "invalid_slug", "not a valid artifact id");
  let l = runnerAgentMayReadFilesDirect();
  let F = !l && (frameRelayBinds() || (frameRelayOffered() && !relayDeclined(ARTIFACT_MOUNT)));
  if (!F && !l && env.CLAUDE_CODE_REMOTE)
    return readError(s, "relay_unavailable", PUBLISHED_FILE_READ_UNAVAILABLE_TEXT);
  let a = l || (isRemoteManagedEnvironment() && agentSessionMaySendDirect());
  if (F && !frameVerbRelayActive(BOOT_RELAY_FAMILY) && !a)
    return readError(s, "relay_not_served", RELAY_NOT_SERVED_TEXT);
  let artifactBootWithProbe = await fetchArtifactBootWithProbe(e, readTelemetryName(s), c, {
    gatePublicRead: false,
    relayOnly: !a,
    credentials,
    probeToolUseId,
  });
  if (artifactBootWithProbe.err !== null) {
    let w = artifactBootWithProbe.errorCode === "boot_relay_error";
    if (w && (artifactBootWithProbe.status === 403 || artifactBootWithProbe.status === 404))
      return {
        kind: "error",
        reason: "relay_refused",
        message: `${s} failed: published-file reads from a cloud session go through the session gateway's artifact relay, which is not enabled for this session yet; retrying from here will not help`,
      };
    if (w && artifactBootWithProbe.status === 401)
      return {
        kind: "error",
        reason: "relay_unauthorized",
        message: `${s} failed: the session gateway did not accept this session's credential for the artifact relay; retrying from here will not help`,
      };
    return {
      kind: "error",
      message: artifactBootWithProbe.err.replace(/^artifact read/, s),
      reason: artifactBootWithProbe.errorCode,
    };
  }
  let y = artifactBootWithProbe.assetToken === undefined;
  if (y && !isFramePublicReadEnabled())
    return readError(
      s,
      "tokenless",
      "this artifact is served to you as a public (non-member) reader, and its files are not readable that way",
    );
  if (y && admitPublicRead?.() !== true) {
    logFeatureSad(readTelemetryName(s), PUBLIC_READ_UNASKED_REASON);
    return readError(s, PUBLIC_READ_UNASKED_REASON, PUBLIC_READ_UNASKED_WORDS, false);
  }
  let R =
    artifactBootWithProbe.data.cowritten === true ||
    artifactBootWithProbe.data.artifactKind === LIVE_DOC ||
    getShareEntry(e.slug)?.cowritten === true ||
    getShareEntry(e.slug)?.artifactKind === LIVE_DOC;
  let b = typeLockedFor(e.slug, artifactBootWithProbe.data.type);
  let k = mayBeShared(
    artifactBootWithProbe.data.perm?.role === "owner",
    triState(artifactBootWithProbe.data.outsideWriter),
    getShareEntry(e.slug)?.outsideWriter,
  );
  return {
    kind: "ok",
    target: e,
    ver: artifactBootWithProbe.ver,
    assetToken: artifactBootWithProbe.assetToken,
    publicRead: y,
    relay: F && !y,
    frameContent: !F && !y && canReadViaFrame(artifactBootWithProbe.data),
    credentials,
    agentDirect: a,
    cowritten: R,
    typeLocked: b,
    writerClass: isWriterRole(artifactBootWithProbe.data.perm?.role),
    foreign:
      artifactBootWithProbe.data.authoredByOthers === true ||
      getShareEntry(e.slug)?.authoredByOthers === true ||
      isMeaningfulFlag(artifactBootWithProbe.data.outsidersMayHaveWritten) ||
      getShareEntry(e.slug)?.outsidersMayHaveWritten === true ||
      artifactBootWithProbe.data.perm?.role !== "owner" ||
      R ||
      b ||
      k,
    outsideOrg: k,
    orgRelation: classifyArtifactOwnership(artifactBootWithProbe),
    livePaths: artifactDocs(artifactBootWithProbe.data).map((w) => w.path),
    typePaths: splitManifestTypeFiles(artifactBootWithProbe.data.files)?.type ?? [],
    source: canReadAssets(artifactBootWithProbe),
    ...(typeof artifactBootWithProbe.data.title === "string" && {
      title: artifactBootWithProbe.data.title,
    }),
    ...(artifactBootWithProbe.data.favicon !== undefined && {
      favicon: artifactBootWithProbe.data.favicon,
    }),
    ...(artifactBootWithProbe.data.publishPreconditions === true && {
      publishPreconditions: true,
    }),
    filesCounted:
      typeof artifactBootWithProbe.data.fileCount === "number" &&
      Number.isSafeInteger(artifactBootWithProbe.data.fileCount) &&
      artifactBootWithProbe.data.fileCount > 0,
    reused: artifactBootWithProbe.reused === true,
  };
}
//@ chunk-5e92hn02.js:4290-8446 placement
/**
 * 说明读取失败（出口被阻止、组织外公开 Artifact 的获取方式等，约 4 KB）。
 */
async function describePublishedReadError(e, path, c, h, signal, retryBudget, l = true, F = false) {
  let a = (u, _) => readError(c, u, _, l);
  let n = (status) => ({
    kind: "status",
    status,
  });
  let { target, assetToken, relay } = e;
  let { host, base, headers } = getFrameHost(target);
  let P = () => {
    getLiveState().contentHostEgressDenied.add(target.env);
    return a(
      "egress_blocked",
      `this environment's network allowlist blocks ${host}, so the file cannot be fetched (access to the artifact itself is fine). ${e.publicRead ? `Public artifacts from outside your organization are fetched from that host directly, so it must be on this session's network allowlist. ${describeFrameAllowlistHint(target.env)}` : env.CLAUDE_CODE_REMOTE ? "This is a restriction of where this session runs; retrying from here will not help." : `To allow it, add *.frame.${target.env === "staging" ? "staging." : ""}claudeusercontent.com to the environment's allowed domains.`}`,
    );
  };
  let L = (u, _) => {
    logForDebugging(`[artifact] ${c}: egress proxy denied (${_})`);
    return a("egress_denied", `artifact content fetch refused by the environment's egress proxy (${u})`);
  };
  let A = false;
  let S;
  if (e.frameContent && assetToken !== undefined) {
    try {
      S = await getViaFrameContent(target.slug, path, {
        token: assetToken,
        timeout: FILE_FETCH_TIMEOUT_MS,
        maxContentLength: h,
        signal,
        credentials: e.credentials,
      });
    } catch (error) {
      if (isCancel(error) || error instanceof AbortError) throw error;
      return F
        ? n(0)
        : a(
            "request_error",
            `the content fetch failed in transit, timed out, or exceeded the ${formatMib(h)} limit`,
          );
    }
    A = S.kind === "answer";
  }
  let o;
  try {
    if (S?.kind === "answer") o = S;
    else if (relay) {
      if (assetToken === undefined)
        return a(
          "internal",
          "internal error: a public artifact read was routed where it cannot be served \u2014 this is a bug in this build; do not retry",
        );
      let viaMount = await getViaMountOnce(target.slug, path, {
        token: assetToken,
        timeout: FILE_FETCH_TIMEOUT_MS,
        maxContentLength: h,
        signal,
        retryBudget,
      });
      if (!viaMount.ok)
        return a(
          viaMount.reason.replace(/-/g, "_"),
          viaMount.reason === "no-auth"
            ? noGatewayCredentialMessage(viaMount.detail)
            : `artifact content is unreachable from this session (${viaMount.reason})`,
        );
      o = {
        status: viaMount.status,
        headers: viaMount.response.headers,
        data: viaMount.data,
      };
    } else {
      let u = assetToken === undefined ? "" : `?__frame_t=${encodeURIComponent(assetToken)}`;
      let _ = await externalHttp.get(`${base}${path}${u}`, {
        signal,
        timeout: FILE_FETCH_TIMEOUT_MS,
        responseType: "arraybuffer",
        maxRedirects: 0,
        maxContentLength: h,
        validateStatus: () => true,
        ...(headers && {
          headers,
        }),
      });
      if (isAllowlistBlockedResponse(_.status, _.headers)) return P();
      let B = proxyDenyReason(_.headers);
      if (B !== undefined && (_.status < 200 || _.status >= 300)) return L(`HTTP ${_.status}`, B);
      o = {
        status: _.status,
        headers: _.headers,
        data: _.data,
      };
    }
  } catch (error) {
    if (isCancel(error) || error instanceof AbortError) throw error;
    if (relay && !F) mountHopFailedForRunner();
    let _ = relay ? undefined : findProxyError(error);
    if (_ !== undefined) {
      if (isAllowlistBlockedResponse(_.connectStatus, _.headers)) return P();
      let B = proxyDenyReason(_.headers);
      if (B !== undefined) return L(describeHttpStatus(_.connectStatus), B);
      let W = proxyErrorCode(_.headers);
      if (W !== undefined) logForDebugging(`[artifact] ${c}: proxy refused, marker ${W}`);
      return F
        ? n(0)
        : a(
            "proxy_refused",
            `the proxy refused the connection to the artifact's content host (${describeHttpStatus(_.connectStatus)})`,
          );
    }
    return F
      ? n(0)
      : a(
          "request_error",
          `the content fetch failed in transit, timed out, or exceeded the ${formatMib(h)} limit`,
        );
  }
  if (F && o.status !== 200) return n(o.status);
  if (!relay && !A) getLiveState().contentHostEgressDenied.delete(target.env);
  if (relay && mountDeclinedForRunner(o.status))
    return a("relay_unavailable", PUBLISHED_FILE_READ_UNAVAILABLE_TEXT);
  if (relay && isMountNetworkOffRefusal(o.status, o.data))
    return a("network_off", `${MOUNT_NETWORK_OFF_WORDS}; retrying from here will not help`);
  if (relay && isRetryableStatus(o.status)) return a(`http_${o.status}`, describeGatewayTransient(o.status));
  if (relay) mountHopFailedForRunner(o.status);
  if (o.status === 404)
    return {
      kind: "status",
      status: 404,
      frameNotFound:
        o.data !== undefined &&
        o.data.byteLength <= 256 &&
        isFrameNotFoundBody(Buffer.from(o.data).toString("utf8")),
    };
  if (
    assetToken === undefined &&
    o.status === 403 &&
    isForbiddenProxy(
      o.headers,
      proxyDenialResult(o.headers, o.data, (u) => u),
    )
  )
    return {
      kind: "status",
      status: 403,
    };
  let E = relay
    ? undefined
    : logProxyDenial({
        status: o.status,
        headers: o.headers,
        data: o.data,
        redact: (u) => redactFrameToken(u, assetToken),
        label: `[artifact] ${c}`,
      });
  if (E !== undefined) return a(E, ARTIFACT_PROXY_DENIAL_TEXTS[E]);
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
  let headers_2 = o.headers;
  let O = relay || A ? contentTypeOfHeaders(headers_2) : headers_2?.["content-type"];
  let lower = String(headers_2?.[X_FRAME_DOC_SHA256] ?? "").toLowerCase();
  let Y = String(headers_2?.[X_FRAME_DOC_SEQ] ?? "");
  return {
    kind: "ok",
    status: 200,
    bytes: Buffer.from(o.data ?? new ArrayBuffer(0)),
    contentType: typeof O === "string" ? firstLineOf(O, ";").trim().toLowerCase() : "",
    ...(SHA256_HEX_RE.test(lower) && {
      docSha256: lower,
    }),
    ...(/^\d{1,15}$/.test(Y) && {
      docSeq: Number(Y),
    }),
  };
}
//@ chunk-5e92hn02.js:8446-9254 placement
async function parseFileListJson(publishedFileList, s, signal, retryBudget, r = true) {
  let d = await describePublishedReadError(
    publishedFileList,
    `/_f/${publishedFileList.ver}/${FILE_LIST_NAME}`,
    s,
    MAX_FILE_READ_BYTES + 1,
    signal,
    retryBudget,
    r,
  );
  if (d.kind !== "ok") return d;
  let l;
  try {
    l = fileListSchema().safeParse(jsonParse(d.bytes.toString("utf8")));
  } catch {
    return readError(s, "bad_json", "the artifact service answered with something other than a file list", r);
  }
  if (!l.success || l.data.ver !== publishedFileList.ver)
    return readError(
      s,
      "bad_shape",
      "the artifact service answered with a file list this version of the tool cannot read",
      r,
    );
  let entries = Object.entries(l.data.files);
  if (entries.length > MAX_LISTED_FILES)
    return readError(s, "too_many", `the file list names more than ${MAX_LISTED_FILES} files`, r);
  return {
    kind: "ok",
    files: entries
      .filter(
        ([n]) =>
          n.length <= MAX_PUBLISHED_PATH_LENGTH &&
          !/[\p{Cc}\p{Cf}\p{Co}\p{Zl}\p{Zp}]/u.test(n) &&
          isWellFormedString(n) &&
          !isServiceViewPath(n),
      )
      .map(([n, y]) => ({
        path: n,
        contentType: y.contentType,
        sizeBytes: y.size,
        sha256: y.sha256,
      }))
      .sort((n, y) => (n.path < y.path ? -1 : n.path > y.path ? 1 : 0)),
    narrowed: l.data.narrowed === true,
  };
}
//@ chunk-5e92hn02.js:9254-11318 placement
/**
 * artifact_file_list：列出已发布 Artifact 的文件。
 */
async function listArtifactFiles(e, signal, credentials, h = {}) {
  let publishedFileList = await fetchPublishedFileList(e, "file list", signal, credentials, h);
  if (publishedFileList.kind === "error") return publishedFileList;
  let fileListJson = await parseFileListJson(publishedFileList, "file list", signal, singleReadRetryBudget());
  if (fileListJson.kind === "error") return fileListJson;
  if (fileListJson.kind === "status") {
    if (
      fileListJson.status === 404 &&
      !publishedFileList.filesCounted &&
      (!publishedFileList.relay || fileListJson.frameNotFound === true)
    ) {
      logFeatureSad("artifact_file_list", "single_page");
      return {
        kind: "error",
        reason: "single_page",
        message:
          "this artifact is a single page with no separately published files, so there is no file list; read the page itself",
        ver: publishedFileList.ver,
        cowritten: publishedFileList.cowritten,
        typeLocked: publishedFileList.typeLocked,
      };
    }
    if (publishedFileList.publicRead && fileListJson.status === 403) {
      if (await isVersionServed(publishedFileList, signal)) {
        logFeatureSad("artifact_file_list", "single_page");
        return {
          kind: "error",
          reason: "single_page",
          message:
            "this public artifact is a single page with no separately published files, so there is no file list; read the page itself",
          ver: publishedFileList.ver,
          cowritten: publishedFileList.cowritten,
          typeLocked: publishedFileList.typeLocked,
        };
      }
      return readError(
        "file list",
        "public_refused",
        "this public artifact's files are not available to readers outside its organization right now \u2014 it may no longer be public, or it was taken down",
      );
    }
    logFeatureBad("artifact_file_list", `http_${fileListJson.status}`);
    return readError(
      "file list",
      `http_${fileListJson.status}`,
      publishedFileList.relay
        ? "not found through this cloud session's artifact mount \u2014 this artifact is a single page with no separate files, or file reads are not enabled for this session yet"
        : "the artifact has published files, but the artifact service does not offer their list yet; retrying from here will not help",
      false,
    );
  }
  logFeatureOk("artifact_file_list", {
    relay: publishedFileList.relay,
    files: fileListJson.files.length,
    ...(publishedFileList.agentDirect && {
      agent_direct: true,
    }),
    ...(publishedFileList.publicRead && {
      public: true,
    }),
    ...(publishedFileList.reused && {
      boot_reused: true,
    }),
  });
  return {
    kind: "ok",
    ver: publishedFileList.ver,
    files: fileListJson.files.map((file) =>
      publishedFileList.livePaths.includes(file.path)
        ? {
            ...file,
            live: true,
          }
        : file,
    ),
    relay: publishedFileList.relay,
    agentDirect: publishedFileList.agentDirect,
    cowritten: publishedFileList.cowritten,
    typeLocked: publishedFileList.typeLocked,
    writerClass: publishedFileList.writerClass,
    foreign: publishedFileList.foreign,
    outsideOrg: publishedFileList.outsideOrg,
    publicRead: publishedFileList.publicRead,
    narrowed: publishedFileList.publicRead && fileListJson.narrowed,
    ...(publishedFileList.typePaths.length > 0 && {
      typePaths: publishedFileList.typePaths,
    }),
    ...(publishedFileList.title !== undefined && {
      title: publishedFileList.title,
    }),
    ...(publishedFileList.favicon !== undefined && {
      favicon: publishedFileList.favicon,
    }),
    ...(publishedFileList.publishPreconditions === true && {
      publishPreconditions: true,
    }),
  };
}
//@ chunk-5e92hn02.js:11318-11640 placement
/**
 * 从已发布文件的读取结果中挑出读取上下文字段（版本、中继、直接写入者、共同写入、类型锁定、外部/组织外标记、公开读取与标题等）。
 */
function toReadContext(publishedFileList) {
  return {
    ver: publishedFileList.ver,
    relay: publishedFileList.relay,
    agentDirect: publishedFileList.agentDirect,
    cowritten: publishedFileList.cowritten,
    typeLocked: publishedFileList.typeLocked,
    writerClass: publishedFileList.writerClass,
    foreign: publishedFileList.foreign,
    outsideOrg: publishedFileList.outsideOrg,
    ...(publishedFileList.orgRelation === "external" && {
      external: true,
    }),
    offOrgRamp: isForeignOwnership(publishedFileList.orgRelation),
    publicRead: publishedFileList.publicRead,
    ...(publishedFileList.title !== undefined && {
      title: publishedFileList.title,
    }),
  };
}
//@ chunk-5e92hn02.js:11640-12209 placement
function readFileViaMount(publishedFileList, status, c = true) {
  return readError(
    "file read",
    `http_${status}`,
    publishedFileList.relay
      ? `not found through this cloud session's artifact mount \u2014 no file is published at that path in the served version, or file reads are not enabled for this session yet; action "list_files" shows the paths`
      : publishedFileList.publicRead
        ? 'this public artifact serves no file at that path to readers outside its organization \u2014 action "list_files" shows the paths it does serve (or the artifact is no longer public)'
        : 'no file is published at that path in the served version \u2014 action "list_files" shows the paths',
    c,
  );
}
//@ chunk-5e92hn02.js:12209-12459 placement
/**
 * 对 artifact 内容主机发 HEAD /_f/<版本>/，判断该版本是否已在服务（200）；网络错误返回 false，取消时抛出。
 */
async function isVersionServed(publishedFileList, signal) {
  let { base, headers } = getFrameHost(publishedFileList.target);
  try {
    return (
      (
        await externalHttp.head(`${base}/_f/${publishedFileList.ver}/`, {
          signal,
          timeout: AUDIENCE_QUERY_TIMEOUT_MS,
          maxRedirects: 0,
          validateStatus: () => true,
          ...(headers && {
            headers,
          }),
        })
      ).status === 200
    );
  } catch (error) {
    if (isCancel(error) || error instanceof AbortError) throw error;
    return false;
  }
}
//@ chunk-5e92hn02.js:12459-13579 placement
async function readFileViaRelay(publishedFileList, key, signal, retryBudget, r, d = true) {
  let joined = key.split("/").map(encodeURIComponent).join("/");
  let F = publishedFileList.source
    ? await describePublishedReadError(
        publishedFileList,
        buildFrameFilePath(publishedFileList.ver, joined),
        "file read",
        MAX_MOUNT_FILE_BYTES,
        signal,
        retryBudget,
        d,
        true,
      )
    : undefined;
  if (F?.kind === "error") return F;
  let a =
    F?.kind === "ok"
      ? F
      : await describePublishedReadError(
          publishedFileList,
          `/_f/${publishedFileList.ver}/${joined}`,
          "file read",
          MAX_MOUNT_FILE_BYTES,
          signal,
          retryBudget,
          d,
        );
  let n = a === F;
  if (a.kind !== "ok") return a;
  if (!CONTENT_TYPE_RE.test(a.contentType))
    return readError(
      "file read",
      "unexpected_type",
      "the content host served the file with a type this tool does not save",
      d,
    );
  if (a.bytes.length >= MAX_MOUNT_FILE_BYTES)
    return readError("file read", "size", `the file exceeds the ${formatMib(MAX_MOUNT_FILE_BYTES)} limit`, d);
  let y = (S) => createHash("sha256").update(S).digest("hex");
  let bytes = a.bytes;
  let b = y(bytes);
  let k = true;
  let w = "unused";
  let docVerified = false;
  let P;
  let L;
  let included = publishedFileList.livePaths.includes(key);
  if (a.contentType === "text/html") {
    let S = await r();
    let sha256 = S.kind === "ok" ? S.files.find((file) => file.path === key)?.sha256 : undefined;
    L = sha256;
    if (sha256 === undefined) {
      w = included ? "live" : "missing";
      k = false;
    } else if (b === sha256) w = "verified";
    else {
      let E = n ? undefined : exciseFrameAssetServeBlock(a.bytes, (T) => y(T) === sha256);
      if (E !== undefined) {
        bytes = E;
        b = sha256;
        w = "verified";
      } else {
        w = included ? "live" : "unverified";
        k = false;
      }
    }
  }
  return {
    kind: "ok",
    path: key,
    bytes,
    contentType: a.contentType,
    sha256: b,
    asPublished: k,
    listing: w,
    ...(L !== undefined && {
      listedSha256: L,
    }),
    docVerified,
    ...(P !== undefined && {
      docSeq: P,
    }),
    ...(n && {
      source: true,
    }),
  };
}
//@ chunk-5e92hn02.js:13579-13905 placement
async function validateArtifactFilePath(e, path, signal, credentials, r = {}) {
  let d = validateReadPath(path);
  if ("errMsg" in d) return readError("file read", "invalid_path", d.errMsg);
  let publishedFileList = await fetchPublishedFileList(e, "file read", signal, credentials, r);
  if (publishedFileList.kind === "error") return publishedFileList;
  let F = singleReadRetryBudget();
  let fileViaRelay = await readFileViaRelay(publishedFileList, d.key, signal, F, () =>
    parseFileListJson(publishedFileList, "file read", signal, F, false),
  );
  if (fileViaRelay.kind === "error") return fileViaRelay;
  if (fileViaRelay.kind === "status") return readFileViaMount(publishedFileList, fileViaRelay.status);
  return {
    ...fileViaRelay,
    ...toReadContext(publishedFileList),
  };
}
//@ chunk-5e92hn02.js:13905-13921 placement
/**
 * 导出常量或表 `FILE_READ_CONCURRENCY`：值为 4, ne = MANIFEST_REQUEST_BUDGET。
 */
var FILE_READ_CONCURRENCY = 4;
var MANIFEST_REQUEST_BUDGET_FILES = MANIFEST_REQUEST_BUDGET;
//@ chunk-5e92hn02.js:13921-14878 placement
/**
 * artifact_file_read：读取已发布 Artifact 中的一个文件。
 */
async function readArtifactFile(
  e,
  s,
  signal,
  credentials,
  { byteBudget: r = MANIFEST_REQUEST_BUDGET_FILES, ...d } = {},
) {
  let publishedFileList = await fetchPublishedFileList(e, "file read", signal, credentials, d);
  if (publishedFileList.kind === "error") return publishedFileList;
  let F = singleReadRetryBudget();
  let a;
  let n = () =>
    (a ??= parseFileListJson(publishedFileList, "file read", signal, F, false).then((fileListJson) => {
      if (fileListJson.kind !== "ok") a = undefined;
      return fileListJson;
    }));
  let y = 0;
  return {
    kind: "ok",
    files: await mapWithConcurrency(s, FILE_READ_CONCURRENCY, async (b) => {
      let k = validateReadPath(b);
      if ("errMsg" in k)
        return {
          ...readError("file read", "invalid_path", k.errMsg, false),
          path: b,
        };
      if (y >= r)
        return {
          kind: "error",
          reason: "batch_budget",
          message: `not fetched: the files read before it in this call already hold ${Math.floor(r / 1048576)}MB, the most one read carries \u2014 read it, and any after it, in another call`,
          path: k.key,
        };
      if (publishedFileList.livePaths.includes(k.key))
        return {
          kind: "error",
          reason: "live_path",
          message: "this is a live file: read it by itself with `path`, which returns its current state",
          path: k.key,
        };
      let fileViaRelay = await readFileViaRelay(
        publishedFileList,
        k.key,
        signal,
        singleReadRetryBudget(),
        n,
        false,
      );
      if (fileViaRelay.kind === "status")
        return {
          ...readFileViaMount(publishedFileList, fileViaRelay.status, false),
          path: k.key,
        };
      if (fileViaRelay.kind === "ok") y += fileViaRelay.bytes.length;
      return fileViaRelay.kind === "error"
        ? {
            ...fileViaRelay,
            path: k.key,
          }
        : fileViaRelay;
    }),
    ...toReadContext(publishedFileList),
  };
}
//@ chunk-5e92hn02.js:14878-15068 placement
/**
 * 以给定并发数依次对数组元素执行异步函数，按原顺序返回结果。
 */
async function mapWithConcurrency(e, s, c) {
  let h = Array(e.length);
  let r = 0;
  let d = async () => {
    while (r < e.length) {
      let l = r++;
      h[l] = await c(e[l]);
    }
  };
  await Promise.all(
    Array.from(
      {
        length: Math.min(s, e.length),
      },
      () => d(),
    ),
  );
  return h;
}
//@ chunk-jv307fw4.js:23668-23883 placement
/**
 * 把文件清单数组转成按路径索引的 manifest，拆出类型文件部分；没有类型文件或格式不对时返回 undefined。
 */
function splitManifestTypeFiles(files) {
  if (!Array.isArray(files)) return;
  let n = {};
  for (let s of files) {
    if (typeof s !== "object" || s === null || typeof s.path !== "string") return;
    n[s.path] = s;
  }
  let r = splitManifestPaths({
    manifest: n,
  });
  return r !== undefined && r.type.length > 0 ? r : undefined;
}
export {
  MAX_FILE_SIZE,
  MAX_LISTED_FILES,
  listArtifactFiles,
  validateArtifactFilePath,
  FILE_READ_CONCURRENCY,
  readArtifactFile,
  splitManifestTypeFiles,
};
