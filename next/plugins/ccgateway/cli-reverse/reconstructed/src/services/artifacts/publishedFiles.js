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
import { splitManifestPaths, exciseFrameAssetServeBlock } from "./pagePreparation.js";
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
import { MANIFEST_REQUEST_BUDGET } from "./publishInstanceFiles.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-jv307fw4.js:23668-23883 placement
/**
 * 把文件清单数组转成按路径索引的 manifest，拆出类型文件部分；没有类型文件或格式不对时返回 undefined。
 */
function splitManifestTypeFiles(files) {
  if (!Array.isArray(files)) return;
  let manifest = {};
  for (let file of files) {
    if (typeof file !== "object" || file === null || typeof file.path !== "string") return;
    manifest[file.path] = file;
  }
  let paths = splitManifestPaths({
    manifest,
  });
  return paths !== undefined && paths.type.length > 0 ? paths : undefined;
}
//@ chunk-5e92hn02.js:1232-1483 placement
/**
 * 已发布文件清单的常量：_files.json、最多 4096 个文件、读取上限 16 MB、90 s 超时、文档哈希与序号响应头及清单 schema。
 */
var FILE_LIST_NAME; // deferred: uses MAX_FRAME_RESPONSE_BYTES (./frameApi.js) of its import cycle while loading; runs once the cycle is complete
var MAX_LISTED_FILES;
var MAX_FILE_SIZE;
var MAX_FILE_READ_BYTES;
var FILE_FETCH_TIMEOUT_MS;
var X_FRAME_DOC_SHA256;
var X_FRAME_DOC_SEQ;
var fileListSchema;
deferInit("chunk-5e92hn02.js:1232", () => {
  FILE_LIST_NAME = "_files.json";
  MAX_LISTED_FILES = 4096;
  MAX_FILE_SIZE = MAX_FRAME_RESPONSE_BYTES;
  MAX_FILE_READ_BYTES = 16777216;
  FILE_FETCH_TIMEOUT_MS = 90000;
  X_FRAME_DOC_SHA256 = "x-frame-doc-sha256";
  X_FRAME_DOC_SEQ = "x-frame-doc-seq";
  fileListSchema = DoctorLazy(() =>
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
});
//@ chunk-5e92hn02.js:1483-1562 placement
function readTelemetryName(operation) {
  return operation === "file list" ? "artifact_file_list" : "artifact_file_read";
}
//@ chunk-5e92hn02.js:1562-1658 placement
function readError(operation, reason, message, logIt = true) {
  if (logIt) logFeatureBad(readTelemetryName(operation), reason);
  return {
    kind: "error",
    message: `${operation} failed: ${message}`,
    reason,
  };
}
//@ chunk-5e92hn02.js:1658-1730 placement
function formatMib(bytes) {
  let size = bytes - 1;
  return size >= 1048576 ? `${size >> 20} MiB` : `${size >> 10} KiB`;
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
async function fetchPublishedFileList(
  target,
  operation,
  signal,
  credentials,
  { admitPublicRead, probeToolUseId },
) {
  if (!ARTIFACT_SLUG_RE.test(target.slug))
    return readError(operation, "invalid_slug", "not a valid artifact id");
  let runnerDirect = runnerAgentMayReadFilesDirect();
  let relayBound =
    !runnerDirect && (frameRelayBinds() || (frameRelayOffered() && !relayDeclined(ARTIFACT_MOUNT)));
  if (!relayBound && !runnerDirect && env.CLAUDE_CODE_REMOTE)
    return readError(operation, "relay_unavailable", PUBLISHED_FILE_READ_UNAVAILABLE_TEXT);
  let maySendDirect = runnerDirect || (isRemoteManagedEnvironment() && agentSessionMaySendDirect());
  if (relayBound && !frameVerbRelayActive(BOOT_RELAY_FAMILY) && !maySendDirect)
    return readError(operation, "relay_not_served", RELAY_NOT_SERVED_TEXT);
  let artifactBootWithProbe = await fetchArtifactBootWithProbe(target, readTelemetryName(operation), signal, {
    gatePublicRead: false,
    relayOnly: !maySendDirect,
    credentials,
    probeToolUseId,
  });
  if (artifactBootWithProbe.err !== null) {
    let bootRelayError = artifactBootWithProbe.errorCode === "boot_relay_error";
    if (bootRelayError && (artifactBootWithProbe.status === 403 || artifactBootWithProbe.status === 404))
      return {
        kind: "error",
        reason: "relay_refused",
        message: `${operation} failed: published-file reads from a cloud session go through the session gateway's artifact relay, which is not enabled for this session yet; retrying from here will not help`,
      };
    if (bootRelayError && artifactBootWithProbe.status === 401)
      return {
        kind: "error",
        reason: "relay_unauthorized",
        message: `${operation} failed: the session gateway did not accept this session's credential for the artifact relay; retrying from here will not help`,
      };
    return {
      kind: "error",
      message: artifactBootWithProbe.err.replace(/^artifact read/, operation),
      reason: artifactBootWithProbe.errorCode,
    };
  }
  let noAssetToken = artifactBootWithProbe.assetToken === undefined;
  if (noAssetToken && !isFramePublicReadEnabled())
    return readError(
      operation,
      "tokenless",
      "this artifact is served to you as a public (non-member) reader, and its files are not readable that way",
    );
  if (noAssetToken && admitPublicRead?.() !== true) {
    logFeatureSad(readTelemetryName(operation), PUBLIC_READ_UNASKED_REASON);
    return readError(operation, PUBLIC_READ_UNASKED_REASON, PUBLIC_READ_UNASKED_WORDS, false);
  }
  let artifactState =
    artifactBootWithProbe.data.cowritten === true ||
    artifactBootWithProbe.data.artifactKind === LIVE_DOC ||
    getShareEntry(target.slug)?.cowritten === true ||
    getShareEntry(target.slug)?.artifactKind === LIVE_DOC;
  let typeLocked = typeLockedFor(target.slug, artifactBootWithProbe.data.type);
  let shared = mayBeShared(
    artifactBootWithProbe.data.perm?.role === "owner",
    triState(artifactBootWithProbe.data.outsideWriter),
    getShareEntry(target.slug)?.outsideWriter,
  );
  return {
    kind: "ok",
    target,
    ver: artifactBootWithProbe.ver,
    assetToken: artifactBootWithProbe.assetToken,
    publicRead: noAssetToken,
    relay: relayBound && !noAssetToken,
    frameContent: !relayBound && !noAssetToken && canReadViaFrame(artifactBootWithProbe.data),
    credentials,
    agentDirect: maySendDirect,
    cowritten: artifactState,
    typeLocked,
    writerClass: isWriterRole(artifactBootWithProbe.data.perm?.role),
    foreign:
      artifactBootWithProbe.data.authoredByOthers === true ||
      getShareEntry(target.slug)?.authoredByOthers === true ||
      isMeaningfulFlag(artifactBootWithProbe.data.outsidersMayHaveWritten) ||
      getShareEntry(target.slug)?.outsidersMayHaveWritten === true ||
      artifactBootWithProbe.data.perm?.role !== "owner" ||
      artifactState ||
      typeLocked ||
      shared,
    outsideOrg: shared,
    orgRelation: classifyArtifactOwnership(artifactBootWithProbe),
    livePaths: artifactDocs(artifactBootWithProbe.data).map((doc) => doc.path),
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
async function describePublishedReadError(
  publishedFileList,
  path,
  operation,
  maxBytes,
  signal,
  retryBudget,
  logIt = true,
  allowRelayOnly = false,
) {
  let fail = (reason, message) => readError(operation, reason, message, logIt);
  let statusResult = (status) => ({
    kind: "status",
    status,
  });
  let { target, assetToken, relay } = publishedFileList;
  let { host, base, headers } = getFrameHost(target);
  let egressDenied = () => {
    getLiveState().contentHostEgressDenied.add(target.env);
    return fail(
      "egress_blocked",
      `this environment's network allowlist blocks ${host}, so the file cannot be fetched (access to the artifact itself is fine). ${publishedFileList.publicRead ? `Public artifacts from outside your organization are fetched from that host directly, so it must be on this session's network allowlist. ${describeFrameAllowlistHint(target.env)}` : env.CLAUDE_CODE_REMOTE ? "This is a restriction of where this session runs; retrying from here will not help." : `To allow it, add *.frame.${target.env === "staging" ? "staging." : ""}claudeusercontent.com to the environment's allowed domains.`}`,
    );
  };
  let proxyDenied = (reason, detail) => {
    logForDebugging(`[artifact] ${operation}: egress proxy denied (${detail})`);
    return fail(
      "egress_denied",
      `artifact content fetch refused by the environment's egress proxy (${reason})`,
    );
  };
  let relayAttempted = false;
  let okResult;
  if (publishedFileList.frameContent && assetToken !== undefined) {
    try {
      okResult = await getViaFrameContent(target.slug, path, {
        token: assetToken,
        timeout: FILE_FETCH_TIMEOUT_MS,
        maxContentLength: maxBytes,
        signal,
        credentials: publishedFileList.credentials,
      });
    } catch (error) {
      if (isCancel(error) || error instanceof AbortError) throw error;
      return allowRelayOnly
        ? statusResult(0)
        : fail(
            "request_error",
            `the content fetch failed in transit, timed out, or exceeded the ${formatMib(maxBytes)} limit`,
          );
    }
    relayAttempted = okResult.kind === "answer";
  }
  let response;
  try {
    if (okResult?.kind === "answer") response = okResult;
    else if (relay) {
      if (assetToken === undefined)
        return fail(
          "internal",
          "internal error: a public artifact read was routed where it cannot be served \u2014 this is a bug in this build; do not retry",
        );
      let viaMount = await getViaMountOnce(target.slug, path, {
        token: assetToken,
        timeout: FILE_FETCH_TIMEOUT_MS,
        maxContentLength: maxBytes,
        signal,
        retryBudget,
      });
      if (!viaMount.ok)
        return fail(
          viaMount.reason.replace(/-/g, "_"),
          viaMount.reason === "no-auth"
            ? noGatewayCredentialMessage(viaMount.detail)
            : `artifact content is unreachable from this session (${viaMount.reason})`,
        );
      response = {
        status: viaMount.status,
        headers: viaMount.response.headers,
        data: viaMount.data,
      };
    } else {
      let tokenQuery = assetToken === undefined ? "" : `?__frame_t=${encodeURIComponent(assetToken)}`;
      let res = await externalHttp.get(`${base}${path}${tokenQuery}`, {
        signal,
        timeout: FILE_FETCH_TIMEOUT_MS,
        responseType: "arraybuffer",
        maxRedirects: 0,
        maxContentLength: maxBytes,
        validateStatus: () => true,
        ...(headers && {
          headers,
        }),
      });
      if (isAllowlistBlockedResponse(res.status, res.headers)) return egressDenied();
      let denyReason = proxyDenyReason(res.headers);
      if (denyReason !== undefined && (res.status < 200 || res.status >= 300))
        return proxyDenied(`HTTP ${res.status}`, denyReason);
      response = {
        status: res.status,
        headers: res.headers,
        data: res.data,
      };
    }
  } catch (error) {
    if (isCancel(error) || error instanceof AbortError) throw error;
    if (relay && !allowRelayOnly) mountHopFailedForRunner();
    let proxyError = relay ? undefined : findProxyError(error);
    if (proxyError !== undefined) {
      if (isAllowlistBlockedResponse(proxyError.connectStatus, proxyError.headers)) return egressDenied();
      let denyReason = proxyDenyReason(proxyError.headers);
      if (denyReason !== undefined)
        return proxyDenied(describeHttpStatus(proxyError.connectStatus), denyReason);
      let proxyCode = proxyErrorCode(proxyError.headers);
      if (proxyCode !== undefined)
        logForDebugging(`[artifact] ${operation}: proxy refused, marker ${proxyCode}`);
      return allowRelayOnly
        ? statusResult(0)
        : fail(
            "proxy_refused",
            `the proxy refused the connection to the artifact's content host (${describeHttpStatus(proxyError.connectStatus)})`,
          );
    }
    return allowRelayOnly
      ? statusResult(0)
      : fail(
          "request_error",
          `the content fetch failed in transit, timed out, or exceeded the ${formatMib(maxBytes)} limit`,
        );
  }
  if (allowRelayOnly && response.status !== 200) return statusResult(response.status);
  if (!relay && !relayAttempted) getLiveState().contentHostEgressDenied.delete(target.env);
  if (relay && mountDeclinedForRunner(response.status))
    return fail("relay_unavailable", PUBLISHED_FILE_READ_UNAVAILABLE_TEXT);
  if (relay && isMountNetworkOffRefusal(response.status, response.data))
    return fail("network_off", `${MOUNT_NETWORK_OFF_WORDS}; retrying from here will not help`);
  if (relay && isRetryableStatus(response.status))
    return fail(`http_${response.status}`, describeGatewayTransient(response.status));
  if (relay) mountHopFailedForRunner(response.status);
  if (response.status === 404)
    return {
      kind: "status",
      status: 404,
      frameNotFound:
        response.data !== undefined &&
        response.data.byteLength <= 256 &&
        isFrameNotFoundBody(Buffer.from(response.data).toString("utf8")),
    };
  if (
    assetToken === undefined &&
    response.status === 403 &&
    isForbiddenProxy(
      response.headers,
      proxyDenialResult(response.headers, response.data, (text) => text),
    )
  )
    return {
      kind: "status",
      status: 403,
    };
  let res = relay
    ? undefined
    : logProxyDenial({
        status: response.status,
        headers: response.headers,
        data: response.data,
        redact: (text) => redactFrameToken(text, assetToken),
        label: `[artifact] ${operation}`,
      });
  if (res !== undefined) return fail(res, ARTIFACT_PROXY_DENIAL_TEXTS[res]);
  if (response.status === 401 || response.status === 403)
    return fail(
      `http_${response.status}`,
      relay
        ? "the cloud session's artifact mount refused the read \u2014 file reads may not be enabled for this session, or the artifact was unshared or taken down"
        : "access to the artifact content was refused \u2014 the artifact may have been unshared or taken down",
    );
  if (response.status !== 200)
    return fail(
      `http_${response.status}`,
      `unexpected answer from the ${relayAttempted ? "artifact service" : "content host"} (HTTP ${response.status})`,
    );
  if (relay) markRelayServed(ARTIFACT_MOUNT);
  let headers_2 = response.headers;
  let contentType = relay || relayAttempted ? contentTypeOfHeaders(headers_2) : headers_2?.["content-type"];
  let lower = String(headers_2?.[X_FRAME_DOC_SHA256] ?? "").toLowerCase();
  let docSeq = String(headers_2?.[X_FRAME_DOC_SEQ] ?? "");
  return {
    kind: "ok",
    status: 200,
    bytes: Buffer.from(response.data ?? new ArrayBuffer(0)),
    contentType: typeof contentType === "string" ? firstLineOf(contentType, ";").trim().toLowerCase() : "",
    ...(SHA256_HEX_RE.test(lower) && {
      docSha256: lower,
    }),
    ...(/^\d{1,15}$/.test(docSeq) && {
      docSeq: Number(docSeq),
    }),
  };
}
//@ chunk-5e92hn02.js:8446-9254 placement
async function parseFileListJson(publishedFileList, operation, signal, retryBudget, logIt = true) {
  let read = await describePublishedReadError(
    publishedFileList,
    `/_f/${publishedFileList.ver}/${FILE_LIST_NAME}`,
    operation,
    MAX_FILE_READ_BYTES + 1,
    signal,
    retryBudget,
    logIt,
  );
  if (read.kind !== "ok") return read;
  let parsed;
  try {
    parsed = fileListSchema().safeParse(jsonParse(read.bytes.toString("utf8")));
  } catch {
    return readError(
      operation,
      "bad_json",
      "the artifact service answered with something other than a file list",
      logIt,
    );
  }
  if (!parsed.success || parsed.data.ver !== publishedFileList.ver)
    return readError(
      operation,
      "bad_shape",
      "the artifact service answered with a file list this version of the tool cannot read",
      logIt,
    );
  let entries = Object.entries(parsed.data.files);
  if (entries.length > MAX_LISTED_FILES)
    return readError(operation, "too_many", `the file list names more than ${MAX_LISTED_FILES} files`, logIt);
  return {
    kind: "ok",
    files: entries
      .filter(
        ([entry]) =>
          entry.length <= MAX_PUBLISHED_PATH_LENGTH &&
          !/[\p{Cc}\p{Cf}\p{Co}\p{Zl}\p{Zp}]/u.test(entry) &&
          isWellFormedString(entry) &&
          !isServiceViewPath(entry),
      )
      .map(([path, row]) => ({
        path,
        contentType: row.contentType,
        sizeBytes: row.size,
        sha256: row.sha256,
      }))
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
    narrowed: parsed.data.narrowed === true,
  };
}
//@ chunk-5e92hn02.js:9254-11318 placement
/**
 * artifact_file_list：列出已发布 Artifact 的文件。
 */
async function listArtifactFiles(target, signal, credentials, options = {}) {
  let publishedFileList = await fetchPublishedFileList(target, "file list", signal, credentials, options);
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
function readFileViaMount(publishedFileList, status, logIt = true) {
  return readError(
    "file read",
    `http_${status}`,
    publishedFileList.relay
      ? `not found through this cloud session's artifact mount \u2014 no file is published at that path in the served version, or file reads are not enabled for this session yet; action "list_files" shows the paths`
      : publishedFileList.publicRead
        ? 'this public artifact serves no file at that path to readers outside its organization \u2014 action "list_files" shows the paths it does serve (or the artifact is no longer public)'
        : 'no file is published at that path in the served version \u2014 action "list_files" shows the paths',
    logIt,
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
async function readFileViaRelay(publishedFileList, key, signal, retryBudget, fetchOnce, logIt = true) {
  let verValue = key.split("/").map(encodeURIComponent).join("/");
  let sourceRead = publishedFileList.source
    ? await describePublishedReadError(
        publishedFileList,
        buildFrameFilePath(publishedFileList.ver, verValue),
        "file read",
        MAX_MOUNT_FILE_BYTES,
        signal,
        retryBudget,
        logIt,
        true,
      )
    : undefined;
  if (sourceRead?.kind === "error") return sourceRead;
  let read =
    sourceRead?.kind === "ok"
      ? sourceRead
      : await describePublishedReadError(
          publishedFileList,
          `/_f/${publishedFileList.ver}/${verValue}`,
          "file read",
          MAX_MOUNT_FILE_BYTES,
          signal,
          retryBudget,
          logIt,
        );
  let usedSource = read === sourceRead;
  if (read.kind !== "ok") return read;
  if (!CONTENT_TYPE_RE.test(read.contentType))
    return readError(
      "file read",
      "unexpected_type",
      "the content host served the file with a type this tool does not save",
      logIt,
    );
  if (read.bytes.length >= MAX_MOUNT_FILE_BYTES)
    return readError(
      "file read",
      "size",
      `the file exceeds the ${formatMib(MAX_MOUNT_FILE_BYTES)} limit`,
      logIt,
    );
  let sha256Hex = (data) => createHash("sha256").update(data).digest("hex");
  let bytes = read.bytes;
  let digest = sha256Hex(bytes);
  let exact = true;
  let mismatchReason = "unused";
  let docVerified = false;
  let excised;
  let blockHashes;
  let included = publishedFileList.livePaths.includes(key);
  if (read.contentType === "text/html") {
    let retry = await fetchOnce();
    let sha256 = retry.kind === "ok" ? retry.files.find((file) => file.path === key)?.sha256 : undefined;
    blockHashes = sha256;
    if (sha256 === undefined) {
      mismatchReason = included ? "live" : "missing";
      exact = false;
    } else if (digest === sha256) mismatchReason = "verified";
    else {
      let result = usedSource
        ? undefined
        : exciseFrameAssetServeBlock(read.bytes, (blockHash) => sha256Hex(blockHash) === sha256);
      if (result !== undefined) {
        bytes = result;
        digest = sha256;
        mismatchReason = "verified";
      } else {
        mismatchReason = included ? "live" : "unverified";
        exact = false;
      }
    }
  }
  return {
    kind: "ok",
    path: key,
    bytes,
    contentType: read.contentType,
    sha256: digest,
    asPublished: exact,
    listing: mismatchReason,
    ...(blockHashes !== undefined && {
      listedSha256: blockHashes,
    }),
    docVerified,
    ...(excised !== undefined && {
      docSeq: excised,
    }),
    ...(usedSource && {
      source: true,
    }),
  };
}
//@ chunk-5e92hn02.js:13579-13905 placement
async function validateArtifactFilePath(target, path, signal, credentials, options = {}) {
  let validated = validateReadPath(path);
  if ("errMsg" in validated) return readError("file read", "invalid_path", validated.errMsg);
  let publishedFileList = await fetchPublishedFileList(target, "file read", signal, credentials, options);
  if (publishedFileList.kind === "error") return publishedFileList;
  let retryBudget = singleReadRetryBudget();
  let fileViaRelay = await readFileViaRelay(publishedFileList, validated.key, signal, retryBudget, () =>
    parseFileListJson(publishedFileList, "file read", signal, retryBudget, false),
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
var FILE_READ_CONCURRENCY; // deferred: uses XML_CONTENT_TYPES (./publishInstanceFiles.js) of its import cycle while loading; runs once the cycle is complete
var MANIFEST_REQUEST_BUDGET_FILES;
deferInit("chunk-5e92hn02.js:13905", () => {
  FILE_READ_CONCURRENCY = 4;
  MANIFEST_REQUEST_BUDGET_FILES = MANIFEST_REQUEST_BUDGET;
});
//@ chunk-5e92hn02.js:13921-14878 placement
/**
 * artifact_file_read：读取已发布 Artifact 中的一个文件。
 */
async function readArtifactFile(
  target,
  paths,
  signal,
  credentials,
  { byteBudget = MANIFEST_REQUEST_BUDGET_FILES, ...restOptions } = {},
) {
  let publishedFileList = await fetchPublishedFileList(target, "file read", signal, credentials, restOptions);
  if (publishedFileList.kind === "error") return publishedFileList;
  let retryBudget = singleReadRetryBudget();
  let fileListJson;
  let loadFileList = () =>
    (fileListJson ??= parseFileListJson(publishedFileList, "file read", signal, retryBudget, false).then(
      (fileListJson_2) => {
        if (fileListJson_2.kind !== "ok") fileListJson = undefined;
        return fileListJson_2;
      },
    ));
  let bytesRead = 0;
  return {
    kind: "ok",
    files: await mapWithConcurrency(paths, FILE_READ_CONCURRENCY, async (path) => {
      let validated = validateReadPath(path);
      if ("errMsg" in validated)
        return {
          ...readError("file read", "invalid_path", validated.errMsg, false),
          path,
        };
      if (bytesRead >= byteBudget)
        return {
          kind: "error",
          reason: "batch_budget",
          message: `not fetched: the files read before it in this call already hold ${Math.floor(byteBudget / 1048576)}MB, the most one read carries \u2014 read it, and any after it, in another call`,
          path: validated.key,
        };
      if (publishedFileList.livePaths.includes(validated.key))
        return {
          kind: "error",
          reason: "live_path",
          message: "this is a live file: read it by itself with `path`, which returns its current state",
          path: validated.key,
        };
      let fileViaRelay = await readFileViaRelay(
        publishedFileList,
        validated.key,
        signal,
        singleReadRetryBudget(),
        loadFileList,
        false,
      );
      if (fileViaRelay.kind === "status")
        return {
          ...readFileViaMount(publishedFileList, fileViaRelay.status, false),
          path: validated.key,
        };
      if (fileViaRelay.kind === "ok") bytesRead += fileViaRelay.bytes.length;
      return fileViaRelay.kind === "error"
        ? {
            ...fileViaRelay,
            path: validated.key,
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
async function mapWithConcurrency(items, limit, fn) {
  let out = Array(items.length);
  let next = 0;
  let worker = async () => {
    while (next < items.length) {
      let index = next++;
      out[index] = await fn(items[index]);
    }
  };
  await Promise.all(
    Array.from(
      {
        length: Math.min(limit, items.length),
      },
      () => worker(),
    ),
  );
  return out;
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
