/**
 * tools/ArtifactTool/actions/uploadAsset.ts
 *
 * Artifact 资源上传/列表/删除/复制/读取（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (17), chunk-vn5yv2ce.js (48)
 * attribution: placement 65
 */
import { extname, basename } from "path";
import { realpathSync, lstatSync, read, constants, openSync, fstatSync, closeSync } from "fs";
import { promisify } from "util";
import { env } from "../../../utils/env.js";
import {
  agentSessionMaySendDirect,
  frameRelayOffered,
  frameRelayBinds,
  accountBotMayRelay,
  BLOBS_RELAY_FAMILY,
  relayDeclined,
  frameVerbRelayActive,
  sendRelayed,
  relayVouched,
  declineRelay,
  classifyGatewayAnswer,
  markRelayServed,
  clearRelayVouch,
  runnerAgentMayReadFilesDirect,
  mountHopFailedForRunner,
  mountDeclinedForRunner,
  isMountNetworkOffRefusal,
  MOUNT_NETWORK_OFF_WORDS,
} from "../../../services/artifacts/frameRelay.js";
import { knownArtifactCapabilities } from "../../../services/artifacts/rosterWait.js";
import { MAX_FRAME_RESPONSE_BYTES, buildFrameHeaders } from "../../../services/artifacts/frameApi.js";
import { uniq } from "../../../utils/collections.js";
import { isENOENT, getErrnoCode, AbortError, isAbortError } from "../../../utils/errors.js";
import { isProtectedPath, pathTouchesProtected } from "../../../services/artifacts/artifactUrl.js";
import {
  findIntermediateUncJunction,
  getFsImplementation,
  UNVERIFIED_ANCESTRY,
  hopCapExhausted,
  getPathsForPermissionCheck,
} from "../../../utils/fsOperations.js";
import { isSentinelInode, jsonStringify } from "../../../utils/slowOperations.js";
import { computeContentHash } from "../../../utils/commitAttribution.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  create,
  create_2,
  create_3,
  create_15,
  create_25,
  create_6,
} from "../../../../vendor/zod/lib/index.mjs";
import { ASSET_ID_RE, ARTIFACT_SLUG_RE, ArtifactInputError } from "../constants.js";
import { truncateToLength, firstLineOf, plural } from "../../../utils/stringUtils.js";
import { getLiveState } from "../../../services/liveReplica/liveReplica.js";
import { resolveContract } from "../../../services/artifacts/contract.js";
import { saveRosterToConfig } from "../../../services/artifacts/capabilityRoster.js";
import { apiClient } from "../../../services/routines/routinesApi.js";
import { isCancel } from "../../../../vendor/axios/dist/esm/axios.js";
import { parseRetryAfterMs } from "../../../bridge/debugUtils.js";
import { sleep } from "../../../utils/sleep.js";
import { findProxyError, describeHttpStatus } from "../../../utils/proxy.js";
import { noGatewayCredentialMessage } from "../../../utils/gatewayCredential.js";
import {
  describeArtifactAuthFailure,
  isFramePublicReadEnabled,
  PUBLIC_READ_UNASKED_REASON,
  PUBLIC_READ_UNASKED_WORDS,
} from "../../../services/artifacts/frameFlags.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import {
  foldBootCowritten,
  foldBootOutsideWriter,
  isForbiddenProxy,
  hasOtherCommentPending,
  ownershipAskNote,
  getShareEntry,
  otherCommentPendingSeq,
  ownedVerdict,
} from "../../../services/artifacts/shareEntries.js";
import { ARTIFACT_MOUNT } from "../../../services/artifacts/artifactMount.js";
import { fetchArtifactBootWithProbe } from "../../../services/artifacts/boot.js";
import { getFrameHost, describeFrameAllowlistHint } from "../../../services/artifacts/frameHost.js";
import { logForDebugging } from "../../../utils/debug.js";
import {
  canReadViaFrame,
  getViaFrameContent,
  getViaMountOnce,
  singleReadRetryBudget,
  describeGatewayTransient,
  contentTypeOfHeaders,
} from "../../../services/artifacts/gatewayRead.js";
import { externalHttp } from "../../../services/http/externalHttp.js";
import {
  isAllowlistBlockedResponse,
  proxyDenyReason,
  proxyErrorCode,
  proxyDenialResult,
  logProxyDenial,
  ARTIFACT_PROXY_DENIAL_TEXTS,
} from "../../../utils/sandbox/proxyDenial.js";
import { isRetryableStatus } from "../../../services/artifacts/liveSubscribe.js";
import { redactFrameToken } from "../../../services/artifacts/webfetchRead.js";
import { readUntrustedArray, UNREADABLE_ARRAY, UNREADABLE_LIST_TEXT } from "../../../utils/untrustedArray.js";
import { safeJsonQuote } from "../../../services/artifacts/contentTypes.js";
import { expandPath } from "../../../utils/path.js";
import {
  readPublishFile,
  needsReadAsk,
  describePublishPath,
  checkPublishReadPermission,
  describePathAnnotations,
} from "../../../services/artifacts/publishReadChecks.js";
import {
  getToolPermissionContext,
  planConsentMustDeny,
  consentAskCanReachUser,
} from "../../../utils/permissions/toolPermissionContext.js";
import {
  ASSET_UPLOAD_PIN_TAG,
  CONSENT_ASK_TAG,
  PLAN_CONSENT_ASK_TAG,
  USER_ONLY_CONSENT_ASK_TAG,
  ARTIFACT_DISPLAY_TARGET_TAG,
  carriesForeignPin,
  stampArtifactAssetUploadConsent,
} from "../permissions/consentStamps.js";
import { isStrictHumanTurn } from "../../../utils/turnOrigin.js";
import {
  PLAN_MODE_KEEPS_FLAG_OFF_WRITE_ASKS,
  classFactsFor,
  writeKeepsFlagOffAsk,
  decideByClass,
} from "../artifactAccessClasses.js";
import { needsHumanAssetConsent, artifactCardTitleFor } from "../permissions/ownershipConsent.js";
import { denyOtherOrgArtifact } from "../permissions/artifactPermissionRules.js";
import { warmShareEntry } from "../../../services/artifacts/shareEntryWarm.js";
import { sweptPagePath, artifactViewerUrlFor, writtenPage } from "../artifactUrls.js";
import { classifyArtifactConsent } from "../../../services/artifacts/consentClasses.js";
import {
  ASSET_UPLOAD_LIST_CARD_LEDE,
  planModeCardNote,
  ASSET_UPLOAD_COVERS_SESSION_COPIES_NOTE,
  ASSET_UPLOAD_COVERS_SESSION_NOTE,
} from "../promptText.js";
import { artifactCopyFromFrozen } from "../../../services/artifacts/artifactToolSchema.js";
import { readPermissionDecisionForPath, READ_PATH_PROBE } from "../../../utils/permissions/filesystem.js";
import { getDenyRuleForTool, getAskRuleForTool } from "../../../utils/permissions/permissions.js";
import { yieldToEventLoop } from "../../../native-ts/file-index/index.js";
import {
  jsonQuotedSweep,
  capResultRows,
  peerOrFallback,
  numberText,
  quoteSweptValue,
} from "../../../services/artifacts/artifactPeople.js";
import { pickByToolset } from "../../../services/artifacts/artifactToolGates.js";
import { ARTIFACT_DB_ACTIONS } from "./database.js";
import { ARTIFACT_PREVIEW_ACTION_HANDLER } from "./preview.js";
import { ARTIFACT_COPY_FROM_ACTION_HANDLER } from "./copyFrom.js";
import { ARTIFACT_WATCH_ACTION_HANDLER } from "./watch.js";
import { ARTIFACT_COMMENTS_ACTION_HANDLER } from "./comments.js";
import { ARTIFACT_ROOM_SEND_ACTION_HANDLER } from "./roomSend.js";
import { ARTIFACT_LIST_ACTION_HANDLER } from "./list.js";
import { ARTIFACT_LIVE_EDIT_ACTION_HANDLER } from "./liveEdit.js";
import { ARTIFACT_OPEN_ACTION_HANDLER } from "./open.js";
import { ARTIFACT_ENDPOINTS_ACTION_HANDLER } from "./endpoints.js";
import { ARTIFACT_PIN_ACTION_HANDLER } from "./pin.js";
import { ARTIFACT_QUICKSTART_ACTION_HANDLER } from "./quickstart.js";
import { ARTIFACT_SHARE_ACTION_HANDLER } from "./share.js";

//@ chunk-vn5yv2ce.js:1495-1602 placement
/**
 * Artifact 资源功能是否开启：环境变量 CLAUDE_CODE_ARTIFACT_ASSETS 优先，否则 agent 会话可直发或服务端能力里含 assets。
 */
function isArtifactAssetsEnabled() {
  return (
    env.CLAUDE_CODE_ARTIFACT_ASSETS ??
    (agentSessionMaySendDirect() || (knownArtifactCapabilities().capabilities?.includes("assets") ?? false))
  );
}
//@ chunk-vn5yv2ce.js:1602-1705 placement
/**
 * Artifact 资源功能开关的来源：环境变量、agent 会话，或已知能力的来源。
 */
function artifactAssetsEnabledSource() {
  if (env.CLAUDE_CODE_ARTIFACT_ASSETS !== undefined) return "env";
  return agentSessionMaySendDirect() ? "agent" : knownArtifactCapabilities().source;
}
//@ chunk-vn5yv2ce.js:1705-1738 placement
/**
 * SVG MIME 类型与 SVG 资源大小上限。
 */
var SVG_MIME_TYPE = "image/svg+xml";
var MAX_SVG_BYTES = 2097152;
//@ chunk-vn5yv2ce.js:1738-1773 placement
/**
 * 按 MIME 类型给出上传大小上限（SVG 用较小上限）。
 */
function maxAssetBytesFor(e) {
  return e === SVG_MIME_TYPE ? MAX_SVG_BYTES : MAX_FRAME_RESPONSE_BYTES;
}
//@ chunk-vn5yv2ce.js:1773-2407 placement
var ASSET_MIME_TYPES = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".svg", SVG_MIME_TYPE],
  [".mp4", "video/mp4"],
  [".webm", "video/webm"],
  [".pdf", "application/pdf"],
  [".woff2", "font/woff2"],
  [".woff", "font/woff"],
  [".ttf", "font/ttf"],
  [".otf", "font/otf"],
  [".csv", "text/csv"],
  [".md", "text/markdown"],
  [".markdown", "text/markdown"],
  [".json", "application/json"],
  [".txt", "text/plain"],
  [".ts", "text/plain"],
  [".css", "text/css"],
  [".js", "text/javascript"],
  [".mjs", "text/javascript"],
  [".cjs", "text/javascript"],
]);
var flattened = uniq(ASSET_MIME_TYPES.values()).flatMap((e) => extensionForMimeType(e) ?? []);
var joined = [...ASSET_MIME_TYPES.keys()].map((key) => key.slice(1)).join(", ");
//@ chunk-vn5yv2ce.js:2407-2457 placement
/**
 * 由文件扩展名查资源的 MIME 类型。
 */
function assetMimeTypeForPath(e) {
  return ASSET_MIME_TYPES.get(extname(e).toLowerCase());
}
//@ chunk-vn5yv2ce.js:2457-2534 placement
/**
 * 可按文本处理的资源 MIME 类型集合。
 */
var TEXT_ASSET_MIME_TYPES = new Set(["text/csv", "text/markdown", "application/json", "text/plain"]);
//@ chunk-vn5yv2ce.js:2534-2579 placement
/**
 * 判断 MIME 类型是否可按文本处理。
 */
function isTextAssetMimeType(e) {
  return e !== undefined && TEXT_ASSET_MIME_TYPES.has(e);
}
//@ chunk-vn5yv2ce.js:2579-3152 placement
/**
 * upload_asset 读取本地文件时的拒绝/错误文案常量：文件已变更、Read 规则阻止、符号链接需询问、不是普通文件、空文件。
 */
var UPLOAD_FILE_CHANGED_MESSAGE =
  "file_path no longer names the file that was approved (it moved, was replaced, or was rewritten) \u2014 retry the upload so it is checked again";
var UPLOAD_READ_DENIED_MESSAGE =
  "reading where file_path resolves is blocked by a Read permission rule \u2014 the upload was not attempted";
var UPLOAD_SYMLINK_ASK_MESSAGE =
  "file_path reaches its file through a symbolic link that resolves somewhere this session may not read without asking \u2014 upload the file by its resolved path, or copy it under the working directory first";
var UPLOAD_NOT_REGULAR_FILE_MESSAGE = "file_path must name a regular file to upload";
var UPLOAD_EMPTY_FILE_MESSAGE = "the file is empty \u2014 nothing to upload";
//@ chunk-vn5yv2ce.js:3152-3254 placement
/**
 * 上传文件过大的提示（实际 MB 与上限 MB）。
 */
function uploadTooLargeMessage(e, r) {
  return `too large: ${Math.ceil((Number(e) * 10) / 1024 / 1024) / 10}MB (max ${r / 1024 / 1024}MB)`;
}
//@ chunk-vn5yv2ce.js:3254-3500 placement
/**
 * 文件所在卷不提供文件身份（部分网络/FUSE/虚拟盘）时拒绝上传的说明，建议复制到普通本地目录。
 */
var UPLOAD_NO_FILE_IDENTITY_MESSAGE =
  "file_path is on a volume that reports no usable file identity (some network, FUSE, and virtual-disk mounts), so the approved file cannot be told apart from a replacement \u2014 copy it to an ordinary local directory and upload the copy";
//@ chunk-vn5yv2ce.js:3500-3668 placement
function readErrorResult(error) {
  if (isENOENT(error))
    return {
      kind: "missing",
    };
  let errnoCode = getErrnoCode(error);
  return {
    kind: "error",
    reason: "read_error",
    message: `cannot read file_path (${errnoCode ?? "unexpected error"})`,
    errnoCode,
  };
}
//@ chunk-vn5yv2ce.js:3668-3733 placement
/**
 * 把文件状态拼成「设备:inode:大小:mtime」的身份串，用于确认批准后未被替换。
 */
function fileIdentityOf(e) {
  return `${e.dev}:${e.ino}:${e.size}:${e.mtimeNs}`;
}
//@ chunk-vn5yv2ce.js:3733-3843 placement
/**
 * 从"a:b:c:d"形式的文件身份串中取出设备号。
 */
function fileIdentityDev(identity) {
  let parts = identity.split(":");
  if (parts.length !== 4 || !parts.every((s) => /^\d+$/.test(s))) return;
  return Number(parts[2]);
}
//@ chunk-vn5yv2ce.js:3843-4153 placement
/**
 * upload_asset 拒绝网络路径的说明：只读本地文件，UNC 共享、/net 自动挂载、设备路径或经链接到达网络位置的需先复制到本地磁盘。
 */
var UPLOAD_NETWORK_PATH_MESSAGE =
  "upload_asset reads only local files \u2014 file_path names a network path (UNC share, /net automount, or device-style path), reaches one through a link on the way, or has a directory or link on the way that could not be examined; if the file is on a network location, copy it onto a local disk first";
//@ chunk-vn5yv2ce.js:4153-4436 placement
/**
 * 解析上传路径是否在本地：网络路径（UNC、自动挂载、中途 UNC junction）返回 network；无法解析返回 unresolved；否则返回 realpath。
 */
function resolveLocalUploadPath(path) {
  if (isProtectedPath(path))
    return {
      kind: "network",
    };
  let intermediateUncJunction = findIntermediateUncJunction(getFsImplementation(), path);
  if (intermediateUncJunction === UNVERIFIED_ANCESTRY)
    return {
      kind: "unresolved",
      error: hopCapExhausted(path),
    };
  if (
    (intermediateUncJunction !== undefined && isProtectedPath(intermediateUncJunction)) ||
    pathTouchesProtected(path)
  )
    return {
      kind: "network",
    };
  let s;
  try {
    s = realpathSync(path);
  } catch (error) {
    return {
      kind: "unresolved",
      error,
    };
  }
  return isProtectedPath(s)
    ? {
        kind: "network",
      }
    : {
        kind: "resolved",
        real: s,
      };
}
//@ chunk-vn5yv2ce.js:4436-4585 placement
/**
 * lstat 文件得到文件身份（多硬链接时标记 linked），失败时身份为 null。
 */
function statFileIdentity(real) {
  try {
    let r = lstatSync(real, {
      bigint: true,
    });
    return {
      real,
      identity: fileIdentityOf(r),
      ...(r.isFile() &&
        r.nlink > 1n && {
          linked: true,
        }),
    };
  } catch {
    return {
      real,
      identity: null,
    };
  }
}
//@ chunk-vn5yv2ce.js:4585-4698 placement
/**
 * 判断上传文件是否需要单独批准（路径或其真实路径命中特定规则，或非网络路径满足额外条件）。
 */
function isSoloApprovalFile(
  e,
  r = resolveLocalUploadPath(e),
  link = r.kind !== "network" && symlinkTargetOf(e),
) {
  return (
    isTextAssetMimeType(assetMimeTypeForPath(e)) ||
    (r.kind === "resolved" && isTextAssetMimeType(assetMimeTypeForPath(r.real))) ||
    link
  );
}
//@ chunk-vn5yv2ce.js:4698-4732 placement
/**
 * 取路径的符号链接目标。
 */
function symlinkTargetOf(e) {
  return probeSymlink(e).link;
}
//@ chunk-vn5yv2ce.js:4732-4865 placement
/**
 * 检查路径是否为符号链接；无法读取时视为链接并返回错误码。
 */
function probeSymlink(e) {
  try {
    return {
      link: lstatSync(e).isSymbolicLink(),
      unreadable: null,
    };
  } catch (error) {
    return {
      link: true,
      unreadable: getErrnoCode(error) ?? "unexpected error",
    };
  }
}
//@ chunk-vn5yv2ce.js:4865-4879 placement
var readFileHandle = promisify(read);
//@ chunk-vn5yv2ce.js:4879-7280 placement
function checkUploadFile(e, r, s, d) {
  let n = r;
  let l =
    typeof n === "object" && n !== null && typeof n.real === "string"
      ? {
          real: n.real,
          identity:
            typeof n.identity === "string" && (n.digest === undefined || typeof n.digest === "string")
              ? n.identity
              : null,
          ...(typeof n.digest === "string" && {
            digest: n.digest,
          }),
        }
      : undefined;
  let localUploadPath = resolveLocalUploadPath(e);
  if (localUploadPath.kind === "network")
    return {
      kind: "error",
      reason: "network",
      message: UPLOAD_NETWORK_PATH_MESSAGE,
    };
  if (localUploadPath.kind === "unresolved") {
    if (l !== undefined && l.identity !== null)
      return {
        kind: "error",
        reason: "changed",
        message: UPLOAD_FILE_CHANGED_MESSAGE,
      };
    let mapped = getPathsForPermissionCheck(e).slice(1).map(s);
    return mapped.includes("deny")
      ? {
          kind: "error",
          reason: "read_denied",
          message: UPLOAD_READ_DENIED_MESSAGE,
        }
      : mapped.some((b) => b !== "allow")
        ? {
            kind: "error",
            reason: "via_link",
            message: UPLOAD_SYMLINK_ASK_MESSAGE,
          }
        : readErrorResult(localUploadPath.error);
  }
  let { real } = localUploadPath;
  let u = real === e ? undefined : s(real);
  if (u === "deny")
    return {
      kind: "error",
      reason: "read_denied",
      message: UPLOAD_READ_DENIED_MESSAGE,
    };
  if (l !== undefined) {
    if (real !== l.real)
      return {
        kind: "error",
        reason: "changed",
        message: UPLOAD_FILE_CHANGED_MESSAGE,
      };
  } else if (u !== undefined && u !== "allow")
    return {
      kind: "error",
      reason: "via_link",
      message: UPLOAD_SYMLINK_ASK_MESSAGE,
    };
  let v;
  try {
    v = lstatSync(real, {
      bigint: true,
    });
  } catch (error) {
    return l !== undefined && isENOENT(error)
      ? {
          kind: "error",
          reason: "changed",
          message: UPLOAD_FILE_CHANGED_MESSAGE,
        }
      : readErrorResult(error);
  }
  if (v.isSymbolicLink())
    return {
      kind: "error",
      reason: "changed",
      message: UPLOAD_FILE_CHANGED_MESSAGE,
    };
  if (!v.isFile())
    return {
      kind: "error",
      reason: "not_a_file",
      message: UPLOAD_NOT_REGULAR_FILE_MESSAGE,
    };
  if (l === undefined && v.nlink > 1n)
    return {
      kind: "error",
      reason: "hard_link",
      message:
        "file_path is one of several hard links to its file, and this approval did not examine that \u2014 copy the file to a fresh path under the working directory and upload the copy",
    };
  let c = constants.O_NOFOLLOW | constants.O_NONBLOCK;
  let E;
  try {
    E = openSync(real, constants.O_RDONLY | c);
  } catch (error) {
    if (getErrnoCode(error) === "ELOOP")
      return {
        kind: "error",
        reason: "changed",
        message: UPLOAD_FILE_CHANGED_MESSAGE,
      };
    return readErrorResult(error);
  }
  let R = false;
  try {
    let h = fstatSync(E, {
      bigint: true,
    });
    if (!h.isFile())
      return {
        kind: "error",
        reason: "not_a_file",
        message: UPLOAD_NOT_REGULAR_FILE_MESSAGE,
      };
    if (isSentinelInode(h.ino))
      return {
        kind: "error",
        reason: "no_identity",
        message: UPLOAD_NO_FILE_IDENTITY_MESSAGE,
      };
    if (fileIdentityOf(h) !== (l !== undefined ? l.identity : fileIdentityOf(v)))
      return {
        kind: "error",
        reason: "changed",
        message: UPLOAD_FILE_CHANGED_MESSAGE,
      };
    {
      let O = null;
      try {
        O = realpathSync(`/proc/self/fd/${E}`);
      } catch {}
      if (O !== null && O !== real)
        return {
          kind: "error",
          reason: "changed",
          message: UPLOAD_FILE_CHANGED_MESSAGE,
        };
    }
    try {
      let localUploadPath = resolveLocalUploadPath(e);
      if (localUploadPath.kind !== "resolved" || localUploadPath.real !== real)
        return {
          kind: "error",
          reason: "changed",
          message: UPLOAD_FILE_CHANGED_MESSAGE,
        };
      let L = lstatSync(real, {
        bigint: true,
      });
      if (L.dev !== h.dev || L.ino !== h.ino)
        return {
          kind: "error",
          reason: "changed",
          message: UPLOAD_FILE_CHANGED_MESSAGE,
        };
    } catch {
      return {
        kind: "error",
        reason: "changed",
        message: UPLOAD_FILE_CHANGED_MESSAGE,
      };
    }
    let b = Number(h.size);
    if (b === 0 || b > d)
      return {
        kind: "error",
        reason: "size",
        message: b === 0 ? UPLOAD_EMPTY_FILE_MESSAGE : uploadTooLargeMessage(b, d),
        sizeBytes: b,
      };
    R = true;
    return {
      kind: "opened",
      fd: E,
      size: b,
      real,
      identity: fileIdentityOf(h),
      digest: l?.digest,
    };
  } catch (error) {
    return readErrorResult(error);
  } finally {
    if (!R) closeSync(E);
  }
}
//@ chunk-vn5yv2ce.js:7280-7775 placement
/**
 * 从已打开的 fd 读出整个文件：读前核对 inode 身份、读后确认长度未变且不多出字节、可选校验内容哈希；任何不一致返回 changed 错误。
 */
async function readApprovedFileBytes(opened) {
  let { fd, size, identity, digest } = opened;
  try {
    if (
      fileIdentityOf(
        fstatSync(fd, {
          bigint: true,
        }),
      ) !== identity
    )
      return {
        kind: "error",
        reason: "changed",
        message: UPLOAD_FILE_CHANGED_MESSAGE,
      };
    let l = Buffer.allocUnsafe(size);
    let a = 0;
    while (a < size) {
      let { bytesRead } = await readFileHandle(fd, l, a, size - a, a);
      if (bytesRead === 0) break;
      a += bytesRead;
    }
    let { bytesRead } = await readFileHandle(fd, Buffer.alloc(1), 0, 1, size);
    if (a !== size || bytesRead !== 0)
      return {
        kind: "error",
        reason: "changed",
        message: UPLOAD_FILE_CHANGED_MESSAGE,
      };
    if (digest !== undefined && computeContentHash(l) !== digest)
      return {
        kind: "error",
        reason: "changed",
        message: UPLOAD_FILE_CHANGED_MESSAGE,
      };
    return {
      kind: "ok",
      bytes: l,
    };
  } catch (error) {
    return readErrorResult(error);
  } finally {
    closeSync(fd);
  }
}
//@ chunk-vn5yv2ce.js:7775-7812 placement
/**
 * 静默关闭文件描述符。
 */
function closeFdQuietly(e) {
  try {
    closeSync(e.fd);
  } catch {}
}
//@ chunk-vn5yv2ce.js:7812-7893 placement
/**
 * 通过检查后读取已批准的本地文件。
 */
async function readApprovedUploadFile(e, r, s, d) {
  let opened = checkUploadFile(e, r, s, d);
  return opened.kind === "opened" ? readApprovedFileBytes(opened) : opened;
}
//@ chunk-vn5yv2ce.js:7893-8149 placement
/**
 * 资源 API 已知错误码集合，以及 _blob/<32 位十六进制> 形式的资源地址正则。
 */
var ASSET_API_ERROR_CODES = new Set([
  "invalid_request",
  "too_large",
  "unsupported_type",
  "quota_or_state",
  "rate_limited",
  "capability_disabled",
  "store_unavailable",
  "upstream_error",
  "credential_rejected",
  "not_found",
  "asset_not_found",
  "not_copyable",
]);
var ASSET_BLOB_URL_RE = /^\/?_blob\/[0-9a-f]{32}$/;
//@ chunk-vn5yv2ce.js:8149-8225 placement
/**
 * 规范化资源 blob 地址（_blob/<id> 或 /_blob/<id>）。
 */
function assetBlobUrl(opaqueId, url) {
  return url === `_blob/${opaqueId}` || url === `/_blob/${opaqueId}` ? url : `/_blob/${opaqueId}`;
}
//@ chunk-vn5yv2ce.js:8225-9311 placement
/**
 * 资源 API 的常量与响应 schema：分页上限、id/类型/时间正则、复制上限 yue、批量上传上限 qL、路径长度上限，以及上传/列表/删除/错误响应的 zod schema 与超时。
 */
var SHA256_HEX_RE = /^[0-9a-f]{64}$/;
var ASSET_LIST_PAGE_LIMIT = 50;
var MAX_CONTENT_TYPE_LENGTH = 40;
var ASSET_CURSOR_RE = /^[A-Za-z0-9_=-]{1,4096}$/;
var ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;
var CONTENT_TYPE_RE = /^[a-z0-9]{1,24}\/[a-z0-9.+-]{1,80}$/;
var MAX_COPY_ASSET_IDS = 10;
var MAX_UPLOAD_FILE_PATHS = 25;
var MAX_UPLOAD_PATH_LENGTH = 1024;
var uploadedAssetSchema = DoctorLazy(() =>
  create({
    opaque_id: create_2().regex(ASSET_ID_RE),
    url: create_2().optional().catch(undefined),
    size_bytes: create_3().int().nonnegative(),
    content_type: create_2().regex(CONTENT_TYPE_RE),
    sha256: create_2().regex(SHA256_HEX_RE).optional(),
  }),
);
var assetListSchema = DoctorLazy(() =>
  create({
    assets: create_15(
      create({
        opaque_id: create_2().regex(ASSET_ID_RE),
        url: create_2().optional().catch(undefined),
        content_type: create_2().regex(CONTENT_TYPE_RE).max(MAX_CONTENT_TYPE_LENGTH),
        size_bytes: create_3().int().nonnegative().max(MAX_FRAME_RESPONSE_BYTES),
        sha256: create_2().regex(SHA256_HEX_RE).optional(),
        created_at: create_2().regex(ISO_TIMESTAMP_RE).max(MAX_CONTENT_TYPE_LENGTH),
      }),
    ).max(1000),
    usage: create({
      files: create_3().int().nonnegative(),
      bytes: create_3().int().nonnegative(),
      max_files: create_3().int().nonnegative(),
      max_bytes: create_3().int().nonnegative(),
    }),
    next: create_2()
      .regex(ASSET_CURSOR_RE)
      .or(create_25(""))
      .nullish()
      .transform((cursor) => cursor || undefined),
    cowritten: create_25(true).optional().catch(undefined),
    outside_writer: create_6().optional().catch(undefined),
  }),
);
var assetDeleteSchema = DoctorLazy(() =>
  create({
    deleted: create_6(),
  }),
);
var assetErrorSchema = DoctorLazy(() =>
  create({
    error: create({
      code: create_2(),
      message: create_2().optional(),
    }),
  }),
);
var relayErrorSchema = DoctorLazy(() =>
  create({
    error: create_2(),
    reason: create_2(),
  }),
);
var MAX_RETRY_AFTER_MS = 20000;
var ASSET_REQUEST_TIMEOUT_MS = 30000;
var UPLOAD_TAIL_FLOOR_MS = 90000;
//@ chunk-vn5yv2ce.js:9311-9368 placement
/**
 * 资源上传接口路径。
 */
function agentUploadRoute(slug) {
  return `/api/frame/blob/${slug}/agent-upload`;
}
//@ chunk-vn5yv2ce.js:9368-9423 placement
/**
 * 资源列表接口路径。
 */
function agentListRoute(slug) {
  return `/api/frame/blob/${slug}/agent-list`;
}
//@ chunk-vn5yv2ce.js:9423-9487 placement
/**
 * 资源删除接口路径。
 */
function agentDeleteRoute(slug, id) {
  return `/api/frame/blob/${slug}/${id}/agent-delete`;
}
//@ chunk-vn5yv2ce.js:9487-9542 placement
/**
 * 资源复制接口路径。
 */
function agentCopyRoute(slug) {
  return `/api/frame/blob/${slug}/agent-copy`;
}
//@ chunk-vn5yv2ce.js:9542-10896 placement
function classifyAssetApiError(status, r) {
  let s = assetErrorSchema().safeParse(r);
  if (s.success) {
    let code = s.data.error.code;
    if (ASSET_API_ERROR_CODES.has(code)) {
      let n = s.data.error.message && sanitizeAssetMessage(s.data.error.message);
      return {
        code,
        reason: code,
        ...(n && {
          detail: n,
        }),
      };
    }
    return {
      code: "upstream_error",
      reason: "unknown_code",
    };
  }
  if (status === 403 || status === 503) {
    let d = relayErrorSchema().safeParse(r);
    if (d.success)
      return {
        code: "policy_denied",
        reason: "policy_denied",
        detail: sanitizeAssetMessage(d.data.error),
      };
  }
  if (status === 403) {
    if (typeof r === "string" && r.trim() === "not a writer")
      return {
        code: "not_writer",
        reason: "not_writer",
      };
    if (typeof r === "string" && /^\s*</.test(r))
      return {
        code: "upstream_error",
        reason: "http_403_page",
      };
    return {
      code: "credential_rejected",
      reason: "http_403",
    };
  }
  if (status === 404)
    return typeof r === "string" && r.trim() === "not found"
      ? {
          code: "not_found",
          reason: "http_404",
        }
      : {
          code: "store_unavailable",
          reason: "unrouted",
          detail:
            "this asset route is not served on this path yet (an older deployment, or a cloud session whose gateway does not relay it) \u2014 nothing changed; retry later",
        };
  if (status === 401)
    return {
      code: "upstream_auth",
      reason: "http_401",
    };
  if (status === 409)
    return {
      code: "quota_or_state",
      reason: "http_409",
    };
  if (status === 413)
    return {
      code: "too_large",
      reason: "http_413",
    };
  if (status === 415)
    return {
      code: "unsupported_type",
      reason: "http_415",
    };
  if (status === 429)
    return {
      code: "rate_limited",
      reason: "http_429",
    };
  if (status === 502 || status === 503 || status === 504)
    return {
      code: "store_unavailable",
      reason: `http_${status}`,
    };
  return {
    code: "upstream_error",
    reason: `http_${status}`,
  };
}
//@ chunk-vn5yv2ce.js:10896-10965 placement
/**
 * 去掉控制字符并截断的资产消息。
 */
function sanitizeAssetMessage(e) {
  return truncateToLength(e.replace(/[\p{Cc}\p{Cf}\p{Co}]/gu, " "), 200);
}
//@ chunk-vn5yv2ce.js:10965-13719 placement
function describeAssetFailure(e, r, s = "upload", d) {
  let n = `asset ${s} failed (${e})`;
  switch (e) {
    case "invalid_request":
      return `${n}: ${r ?? "the server could not accept the request as shaped"}`;
    case "too_large":
      return `${n}: ${r ?? "rejected as too large by the server or an intermediary although under the client limit \u2014 compress or split it"}`;
    case "unsupported_type":
      return `${n}: ${r ?? `only these file types are accepted: ${joined}`}`;
    case "quota_or_state":
      return `${n}: ${r ?? (s === "upload" || s === "copy" ? "the Artifact cannot take uploads right now \u2014 it is a live document, unpublished, retired, being deleted, or over its asset storage quota" : "the Artifact has no asset store right now \u2014 it is a live document, unpublished, retired, or being deleted")}`;
    case "rate_limited":
      return `${n}: calling too often \u2014 wait${r ? ` ${r}` : ""} before retrying, and never loop`;
    case "upstream_auth":
      return `${n}: could not authenticate \u2014 the session's credential may need a refresh; try again`;
    case "capability_disabled":
      return `${n}: the Artifact's published version does not declare the assets capability \u2014 republish it with assets: {} added to its declared capabilities, then retry`;
    case "store_unavailable":
      return `${n}: ${r ?? `the asset store is unavailable right now \u2014 retry once after a short wait${s === "upload" ? " (an upload that timed out upstream may already be stored; a duplicate costs only quota)" : ""}`}`;
    case "upstream_error":
      return `${n}: unexpected answer from the server${r ? ` (${r})` : ""}`;
    case "not_found":
      return s === "copy" && d === "not_found"
        ? `${n}: the SOURCE Artifact (from_url) does not exist, is not one this session can open, or cannot be copied from \u2014 the cases are deliberately indistinguishable; check from_url with action "list", scope "shared"`
        : `${n}: no such Artifact, or artifact assets are not available to this account or Artifact \u2014 the cases are deliberately indistinguishable; check the url with action "list"`;
    case "asset_not_found":
      return `${n}: ${r ?? "the source Artifact holds no asset with one of the given ids"} \u2014 run action "list_assets" on from_url for its current ids; nothing was copied`;
    case "not_copyable":
      return `${n}: ${r ?? "this source cannot be copied from"}; nothing was copied`;
    case "not_writer":
      return `${n}: this account can open the Artifact but not edit it \u2014 only writers can ${s === "copy" ? "copy assets into it" : `${s} assets`}`;
    case "credential_rejected":
      return `${n}: the server refused this session's credential at the asset door \u2014 not an access or existence answer; report this as a client/server integration fault${r ? ` (${r})` : ""}`;
    case "policy_denied":
      return `${n}: ${r ?? "blocked by the organization's artifact policy"}`;
    case "unavailable_to_account":
      return `${n}: artifact assets are not available to this account`;
  }
}
//@ chunk-vn5yv2ce.js:13719-13808 placement
/**
 * 生成资产错误：按错误码给出描述并记录遥测。
 */
function assetErrorFactory(e, r) {
  return (s, d, n) => {
    e(d);
    return {
      kind: "error",
      code: s,
      message: describeAssetFailure(s, n, r, d),
      reason: d,
    };
  };
}
//@ chunk-vn5yv2ce.js:13808-13995 placement
var AGENT_ASSETS_DISABLED_MESSAGE =
  "asset uploads, copies, listing, and deletes from an agent session (one with no user account) aren't enabled on the server for this organization; retrying from here will not help";
//@ chunk-vn5yv2ce.js:13995-17922 placement
/**
 * Artifact 资源上传/复制/列表/删除只能在中继可用时运行，否则给出原因
 */
async function assetRelayUnavailableReason(e, r) {
  let { verb, route, body, contentType, marks, fail } = e;
  let u = (failure) => ({
    replied: false,
    failure,
  });
  let v = agentSessionMaySendDirect();
  if (v) marks.agent_direct = true;
  let c = frameRelayOffered() || (frameRelayBinds() && accountBotMayRelay(BLOBS_RELAY_FAMILY));
  let E = !v && c && !relayDeclined(BLOBS_RELAY_FAMILY);
  let R = (!v && !c && frameRelayBinds()) || E;
  let h = () =>
    u(
      fail(
        "store_unavailable",
        "relay_unavailable",
        "asset uploads, copies, listing, and deletes run only from a local session or an Anthropic-hosted cloud session with its gateway relay enabled; retrying from here will not help",
      ),
    );
  if (!R && !v && env.CLAUDE_CODE_REMOTE) return h();
  if (R && !frameVerbRelayActive(BLOBS_RELAY_FAMILY))
    return u(
      fail(
        "store_unavailable",
        "relay_not_served",
        "asset uploads, copies, listing, and deletes aren't available from this kind of session; retrying from here will not help",
      ),
    );
  let liveState = getLiveState();
  if (!liveState.assetsOnRoster) {
    let epoch = liveState.accountEpoch;
    let x = liveState.roster === undefined;
    let T =
      liveState.roster ??
      (await resolveContract({
        timeoutMs: 5000,
        signal: r,
        credentials: e.credentials,
      }));
    if ("err" in T) marks[`roster_${T.cause}`] = true;
    else if (
      x &&
      !saveRosterToConfig({
        session: liveState,
        epoch,
        roster: T,
        storageV5: undefined,
      }).adopted
    )
      marks.roster_outlived = true;
    else if (!T.capabilities.includes("assets"))
      if (!R) return u(fail("unavailable_to_account", "roster_no_assets"));
      else marks.roster_no_assets = true;
  }
  let O = {
    maxRedirects: 0,
    headers: {
      ...buildFrameHeaders(),
      "Content-Type": contentType,
      Accept: "application/json",
    },
    ...(e.verb === "upload"
      ? {
          streamUpload: {
            tailFloorMs: () => UPLOAD_TAIL_FLOOR_MS,
            onSettled: (F) => {
              if (F.stalled) marks.stalled = true;
            },
          },
        }
      : {
          timeout: e.timeoutMs,
        }),
    ...(e.maxBodyLength !== undefined && {
      maxBodyLength: e.maxBodyLength,
    }),
    maxContentLength: 262144,
    validateStatus: () => true,
    signal: r,
  };
  let L = async () =>
    R
      ? (await sendRelayed("POST", route, body, O, BLOBS_RELAY_FAMILY)).res
      : apiClient.post(route, body, {
          ...O,
          host: "frame",
          auth: "claude-ai-oauth",
          refreshOAuth: true,
          credentials: e.credentials,
        });
  let S;
  try {
    if (E && e.verb === "upload" && !relayVouched(BLOBS_RELAY_FAMILY)) {
      let x;
      try {
        x = (
          await sendRelayed(
            "POST",
            e.probeRoute,
            jsonStringify({
              limit: 1,
            }),
            {
              maxRedirects: 0,
              headers: {
                ...buildFrameHeaders(),
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              timeout: ASSET_REQUEST_TIMEOUT_MS,
              maxContentLength: 262144,
              validateStatus: () => true,
              signal: r,
            },
            BLOBS_RELAY_FAMILY,
          )
        ).res;
      } catch (error) {
        if (isCancel(error) || error instanceof AbortError) throw error;
        declineRelay(BLOBS_RELAY_FAMILY, true);
        return u(
          fail(
            "store_unavailable",
            "probe_request_error",
            "the session gateway did not answer; nothing was uploaded \u2014 one retry is safe",
          ),
        );
      }
      let T = classifyGatewayAnswer(x);
      if (T.refused) {
        declineRelay(BLOBS_RELAY_FAMILY);
        return h();
      }
      if (!T.vouched) {
        if (!x.ok || x.status >= 500 || x.status === 499) declineRelay(BLOBS_RELAY_FAMILY, true);
        return u(
          fail(
            "store_unavailable",
            "probe_unvouched",
            "the session gateway could not confirm the asset route; nothing was uploaded \u2014 retry later",
          ),
        );
      }
      markRelayServed(BLOBS_RELAY_FAMILY);
    }
    let F = (x) => {
      if (!E) return false;
      let T = classifyGatewayAnswer(x);
      if (T.refused && !(x.ok && x.status === 413)) {
        declineRelay(BLOBS_RELAY_FAMILY);
        clearRelayVouch(BLOBS_RELAY_FAMILY);
        return true;
      }
      if (T.vouched) markRelayServed(BLOBS_RELAY_FAMILY);
      else if (!relayVouched(BLOBS_RELAY_FAMILY) && (!x.ok || x.status >= 500 || x.status === 499))
        declineRelay(BLOBS_RELAY_FAMILY, true);
      return false;
    };
    S = await L();
    if (F(S)) return h();
    if (
      S.ok &&
      (S.status === 429 || S.status === 503) &&
      classifyAssetApiError(S.status, S.data).code !== "policy_denied"
    ) {
      let x = S.response.headers?.["retry-after"];
      let retryAfterMs = parseRetryAfterMs(typeof x === "string" ? x : undefined);
      if (retryAfterMs !== undefined && retryAfterMs <= MAX_RETRY_AFTER_MS) {
        await sleep(retryAfterMs, r);
        if (r.aborted) throw new AbortError();
        marks.retried = true;
        S = await L();
        if (F(S)) return h();
      }
    }
  } catch (error) {
    if (isCancel(error) || error instanceof AbortError) throw error;
    if (E && !relayVouched(BLOBS_RELAY_FAMILY)) declineRelay(BLOBS_RELAY_FAMILY, true);
    if (findProxyError(error) !== undefined)
      return u(
        fail(
          "store_unavailable",
          "proxy_refused",
          "a network proxy refused the connection; nothing was sent \u2014 one retry is safe",
        ),
      );
    return u(
      fail(
        "store_unavailable",
        "request_error",
        verb === "upload"
          ? "the request failed in transit or timed out \u2014 a timed-out upload may already be stored; one retry is safe (a duplicate costs only quota)"
          : verb === "copy"
            ? 'the request failed in transit or timed out \u2014 a timed-out copy may already have landed; run action "list_assets" on the destination before retrying, or the assets may be copied twice'
            : "the request failed in transit or timed out \u2014 one retry is safe",
      ),
    );
  }
  if (!S.ok)
    return u({
      ...fail("store_unavailable", S.reason.replace(/-/g, "_")),
      message:
        S.reason === "no-auth"
          ? R
            ? noGatewayCredentialMessage(S.detail)
            : describeArtifactAuthFailure(S.detail)
          : `asset ${verb} unavailable: ${S.reason}`,
    });
  if (v && S.status === 403 && classifyAssetApiError(S.status, S.data).reason === "credential_rejected")
    return u({
      ...fail("credential_rejected", "agent_not_enabled"),
      message: `asset ${verb} failed (credential_rejected): ${AGENT_ASSETS_DISABLED_MESSAGE}`,
    });
  return {
    replied: true,
    status: S.status,
    data: S.data,
    retryAfter: S.response.headers?.["retry-after"],
  };
}
//@ chunk-vn5yv2ce.js:17922-18147 placement
/**
 * 把资源 API 的 HTTP 失败按 classifyAssetApiError 分类，并用回调 r 生成错误（rate_limited 附重试秒数，upstream_error 附 HTTP 状态）。
 */
function assetApiFailure(e, r) {
  let { code, reason, detail } = classifyAssetApiError(e.status, e.data);
  let retryAfterMs = parseRetryAfterMs(e.retryAfter);
  return r(
    code,
    reason,
    code === "rate_limited"
      ? retryAfterMs !== undefined
        ? `${Math.max(1, Math.ceil(retryAfterMs / 1000))}s`
        : undefined
      : code === "upstream_error" && detail === undefined
        ? `HTTP ${e.status}`
        : detail,
  );
}
//@ chunk-vn5yv2ce.js:18147-19528 placement
async function uploadArtifactAsset(e, signal) {
  let { slug, bytes, contentType } = e;
  let l = {};
  let a = assetErrorFactory((E) => logFeatureBad("artifact_asset_upload", E, l), "upload");
  if (!ARTIFACT_SLUG_RE.test(slug)) return a("invalid_request", "invalid_slug", "not a valid artifact id");
  let o = maxAssetBytesFor(contentType);
  if (bytes.length === 0 || bytes.length > o)
    return bytes.length === 0
      ? a("invalid_request", "size", "the file is empty")
      : a(
          "too_large",
          "size",
          contentType === SVG_MIME_TYPE
            ? `the SVG exceeds the ${o >> 20} MiB limit for SVG assets \u2014 simplify or rasterize it`
            : `the file exceeds the ${o >> 20} MiB per-asset limit \u2014 compress or split it`,
        );
  let u = await assetRelayUnavailableReason(
    {
      verb: "upload",
      route: agentUploadRoute(slug),
      probeRoute: agentListRoute(slug),
      body: bytes,
      contentType,
      maxBodyLength: MAX_FRAME_RESPONSE_BYTES + 4096,
      marks: l,
      fail: a,
      credentials: e.credentials,
    },
    signal,
  );
  let v = (E) =>
    l.retried === true
      ? {
          ...E,
          resent: true,
        }
      : E;
  if (!u.replied) return v(u.failure);
  if (u.status !== 200) return v(assetApiFailure(u, a));
  let c = uploadedAssetSchema().safeParse(u.data);
  if (
    !c.success ||
    c.data.content_type !== contentType ||
    (contentType === SVG_MIME_TYPE
      ? c.data.size_bytes === 0 || c.data.size_bytes > MAX_FRAME_RESPONSE_BYTES
      : c.data.size_bytes !== bytes.length)
  )
    return v(
      a(
        "upstream_error",
        "malformed_echo",
        "the upload probably succeeded but the reply was unreadable \u2014 retry at most once; if it repeats, stop and report it",
      ),
    );
  getLiveState().assetsOnRoster = true;
  logFeatureOk("artifact_asset_upload", {
    ...l,
    size_bytes: c.data.size_bytes,
  });
  return {
    kind: "ok",
    id: c.data.opaque_id,
    url: assetBlobUrl(c.data.opaque_id, c.data.url),
    sizeBytes: c.data.size_bytes,
    contentType: c.data.content_type,
    ...(c.data.sha256 !== undefined && {
      sha256: c.data.sha256,
    }),
    ...(l.retried === true && {
      resent: true,
    }),
  };
}
//@ chunk-vn5yv2ce.js:19528-20821 placement
async function listArtifactAssets(e, signal) {
  let { slug, after } = e;
  let n = {};
  let l = assetErrorFactory((u) => logFeatureBad("artifact_asset_list", u, n), "list");
  if (!ARTIFACT_SLUG_RE.test(slug)) return l("invalid_request", "invalid_slug", "not a valid artifact id");
  if (after !== undefined && !ASSET_CURSOR_RE.test(after))
    return l(
      "invalid_request",
      "invalid_cursor",
      "after must be the next value from an earlier list_assets result",
    );
  let a = await assetRelayUnavailableReason(
    {
      verb: "list",
      route: agentListRoute(slug),
      body: jsonStringify({
        ...(after !== undefined && {
          after,
        }),
        limit: ASSET_LIST_PAGE_LIMIT,
      }),
      contentType: "application/json",
      timeoutMs: ASSET_REQUEST_TIMEOUT_MS,
      marks: n,
      fail: l,
      credentials: e.credentials,
    },
    signal,
  );
  if (!a.replied) return a.failure;
  if (a.status !== 200) return assetApiFailure(a, l);
  let o = assetListSchema().safeParse(a.data);
  if (!o.success) return l("upstream_error", "malformed_reply", "the listing was unreadable");
  getLiveState().assetsOnRoster = true;
  foldBootCowritten(slug, o.data.cowritten);
  foldBootOutsideWriter(slug, o.data.outside_writer);
  logFeatureOk("artifact_asset_list", {
    ...n,
    count: o.data.assets.length,
  });
  return {
    kind: "ok",
    assets: o.data.assets.map((asset) => ({
      id: asset.opaque_id,
      url: assetBlobUrl(asset.opaque_id, asset.url),
      contentType: asset.content_type,
      sizeBytes: asset.size_bytes,
      ...(asset.sha256 !== undefined && {
        sha256: asset.sha256,
      }),
      createdAt: sanitizeAssetMessage(asset.created_at),
    })),
    usage: {
      files: o.data.usage.files,
      bytes: o.data.usage.bytes,
      maxFiles: o.data.usage.max_files,
      maxBytes: o.data.usage.max_bytes,
    },
    ...(o.data.next !== undefined && {
      next: o.data.next,
    }),
    ...(o.data.cowritten && {
      cowritten: true,
    }),
    ...(o.data.outside_writer !== undefined && {
      outsideWriter: o.data.outside_writer,
    }),
  };
}
//@ chunk-vn5yv2ce.js:20821-21590 placement
async function deleteArtifactAsset(e, signal) {
  let { slug, id } = e;
  let n = {};
  let l = assetErrorFactory((u) => logFeatureBad("artifact_asset_delete", u, n), "delete");
  if (!ARTIFACT_SLUG_RE.test(slug)) return l("invalid_request", "invalid_slug", "not a valid artifact id");
  if (!ASSET_ID_RE.test(id)) return l("invalid_request", "invalid_id", "not a valid asset id");
  let a = await assetRelayUnavailableReason(
    {
      verb: "delete",
      route: agentDeleteRoute(slug, id),
      body: "{}",
      contentType: "application/json",
      timeoutMs: ASSET_REQUEST_TIMEOUT_MS,
      marks: n,
      fail: l,
      credentials: e.credentials,
    },
    signal,
  );
  if (!a.replied) return a.failure;
  if (a.status !== 200) return assetApiFailure(a, l);
  let o = assetDeleteSchema().safeParse(a.data);
  if (!o.success)
    return l(
      "upstream_error",
      "malformed_reply",
      "the delete may have succeeded but the reply was unreadable \u2014 list the assets to check",
    );
  getLiveState().assetsOnRoster = true;
  logFeatureOk("artifact_asset_delete", {
    ...n,
    deleted: o.data.deleted,
  });
  return {
    kind: "ok",
    deleted: o.data.deleted,
  };
}
//@ chunk-vn5yv2ce.js:21590-21678 placement
/**
 * 复制资源的响应 schema 与请求超时。
 */
var copyAssetsResponseSchema = DoctorLazy(() =>
  create({
    assets: create_15(
      uploadedAssetSchema().extend({
        from_id: create_2().regex(ASSET_ID_RE),
      }),
    ).max(MAX_COPY_ASSET_IDS),
  }),
);
var COPY_ASSETS_TIMEOUT_MS = 120000;
//@ chunk-vn5yv2ce.js:21678-23321 placement
async function copyArtifactAsset(e, signal) {
  let { slug, fromSlug, ids } = e;
  let l = e.crossOrgOk === true;
  let a = {};
  let o = assetErrorFactory((c) => logFeatureBad("artifact_asset_copy", c, a), "copy");
  if (!ARTIFACT_SLUG_RE.test(slug) || !ARTIFACT_SLUG_RE.test(fromSlug))
    return o("invalid_request", "invalid_slug", "not a valid artifact id");
  if (slug === fromSlug)
    return o(
      "invalid_request",
      "same_artifact",
      "from_url names the destination itself \u2014 its assets are already there",
    );
  if (
    ids.length === 0 ||
    ids.length > MAX_COPY_ASSET_IDS ||
    !ids.every((id) => ASSET_ID_RE.test(id)) ||
    new Set(ids).size !== ids.length
  )
    return o(
      "invalid_request",
      "invalid_ids",
      `asset_ids must be 1\u2013${MAX_COPY_ASSET_IDS} distinct asset ids`,
    );
  let u = await assetRelayUnavailableReason(
    {
      verb: "copy",
      route: agentCopyRoute(slug),
      body: jsonStringify({
        from: fromSlug,
        ids,
        ...(l && {
          cross_org_ok: true,
        }),
      }),
      contentType: "application/json",
      timeoutMs: COPY_ASSETS_TIMEOUT_MS,
      marks: a,
      fail: o,
      credentials: e.credentials,
    },
    signal,
  );
  if (!u.replied) return u.failure;
  if (u.status !== 200)
    return l && u.status === 400 && classifyAssetApiError(400, u.data).detail === "invalid request body"
      ? o(
          "not_copyable",
          "predates_cross_org",
          "this server doesn't support copying from another organization's artifact yet, so don't retry the copy, and tell the user cross-organization copies aren't supported yet",
        )
      : assetApiFailure(u, o);
  let v = copyAssetsResponseSchema().safeParse(u.data);
  if (
    !v.success ||
    v.data.assets.length !== ids.length ||
    v.data.assets.some((asset, E) => asset.from_id !== ids[E])
  )
    return o(
      "upstream_error",
      "malformed_reply",
      'the copy probably succeeded but the reply was unreadable \u2014 run action "list_assets" on the destination before retrying, or the assets may be copied twice',
    );
  getLiveState().assetsOnRoster = true;
  logFeatureOk("artifact_asset_copy", {
    ...a,
    count: ids.length,
  });
  return {
    kind: "ok",
    assets: v.data.assets.map((asset) => ({
      fromId: asset.from_id,
      id: asset.opaque_id,
      url: assetBlobUrl(asset.opaque_id, asset.url),
      sizeBytes: asset.size_bytes,
      contentType: asset.content_type,
      ...(asset.sha256 !== undefined && {
        sha256: asset.sha256,
      }),
    })),
  };
}
//@ chunk-vn5yv2ce.js:23321-23333 placement
var ASSET_LIST_TIMEOUT_MS = 90000;
//@ chunk-vn5yv2ce.js:23333-23391 placement
/**
 * 由 MIME 类型反查扩展名。
 */
function extensionForMimeType(e) {
  for (let [r, s] of ASSET_MIME_TYPES) if (s === e) return r;
  return;
}
//@ chunk-vn5yv2ce.js:23391-23544 placement
var ASSET_READ_UNAVAILABLE_MESSAGE =
  "asset reads run only from a local session or an Anthropic-hosted cloud session with its gateway relay enabled; retrying from here will not help";
//@ chunk-vn5yv2ce.js:23544-29129 placement
/**
 * 读取 Artifact 资源（artifact_asset_read）
 */
async function readArtifactAsset(
  e,
  assetId,
  signal,
  credentials,
  { admitPublicRead: n, probeToolUseId: l } = {},
) {
  let a = (y, w) => {
    logFeatureBad("artifact_asset_read", y);
    return {
      kind: "error",
      message: `asset read failed: ${w}`,
      reason: y,
    };
  };
  if (!ARTIFACT_SLUG_RE.test(e.slug)) return a("invalid_slug", "not a valid artifact id");
  if (!ASSET_ID_RE.test(assetId)) return a("invalid_id", "not a valid asset id");
  let o = runnerAgentMayReadFilesDirect();
  let agentDirect = agentSessionMaySendDirect();
  let v = !o && (frameRelayBinds() || (frameRelayOffered() && !relayDeclined(ARTIFACT_MOUNT)));
  if (!v && !o && env.CLAUDE_CODE_REMOTE) return a("relay_unavailable", ASSET_READ_UNAVAILABLE_MESSAGE);
  let artifactBootWithProbe = await fetchArtifactBootWithProbe(e, "artifact_asset_read", signal, {
    gatePublicRead: false,
    credentials,
    probeToolUseId: l,
  });
  if (artifactBootWithProbe.err !== null)
    return {
      kind: "error",
      message: artifactBootWithProbe.err.replace(/^artifact read/, "asset read"),
      reason: artifactBootWithProbe.status === 404 ? "boot_404" : "boot",
    };
  let { ver, assetToken } = artifactBootWithProbe;
  let h = assetToken === undefined;
  if (h && !isFramePublicReadEnabled())
    return a(
      "tokenless",
      "this artifact is served to you as a public (non-member) reader, and assets are not readable that way",
    );
  if (h && n?.() !== true) {
    logFeatureSad("artifact_asset_read", PUBLIC_READ_UNASKED_REASON);
    return {
      kind: "error",
      reason: PUBLIC_READ_UNASKED_REASON,
      message: `asset read failed: ${PUBLIC_READ_UNASKED_WORDS}`,
    };
  }
  let b = v && !h;
  let path = `/_f/${ver}/_blob/${assetId}`;
  let L = `frame.${e.env === "staging" ? "staging." : ""}claudeusercontent.com`;
  let { host, base, headers } = getFrameHost(e);
  let T = () => {
    getLiveState().contentHostEgressDenied.add(e.env);
    return a(
      "egress_blocked",
      `this environment's network allowlist blocks ${host}, so the asset cannot be fetched (access to the artifact itself is fine). ${h ? `Public artifacts from outside your organization are fetched from that host directly, so it must be on this session's network allowlist. ${describeFrameAllowlistHint(e.env)}` : env.CLAUDE_CODE_REMOTE ? "This is a restriction of where this session runs; retrying from here will not help." : `To allow it, add *.${L} to the network allowlist this session runs behind (the sandbox's allowed domains, or the Claude desktop app's network settings).`}`,
    );
  };
  let D = (y, w) => {
    logForDebugging(`[artifact] asset fetch: egress proxy denied (${w})`);
    return a(
      "egress_denied",
      `artifact content fetch refused by the environment's egress proxy (${describeHttpStatus(y)})`,
    );
  };
  let ye = (connectStatus, w) => {
    if (w !== undefined) logForDebugging(`[artifact] asset fetch: proxy refused, marker ${w}`);
    return a(
      "proxy_refused",
      `the proxy refused the connection to the artifact's content host (${describeHttpStatus(connectStatus)})`,
    );
  };
  let B = false;
  let N;
  if (!b && assetToken !== undefined && canReadViaFrame(artifactBootWithProbe.data)) {
    try {
      N = await getViaFrameContent(e.slug, path, {
        token: assetToken,
        timeout: ASSET_LIST_TIMEOUT_MS,
        maxContentLength: MAX_FRAME_RESPONSE_BYTES + 1,
        signal,
        credentials,
      });
    } catch (error) {
      if (isCancel(error) || error instanceof AbortError) throw error;
      return a(
        "request_error",
        `the content fetch failed in transit, timed out, or exceeded the ${MAX_FRAME_RESPONSE_BYTES >> 20} MiB limit`,
      );
    }
    B = N.kind === "answer";
  }
  let A;
  try {
    if (N?.kind === "answer") A = N;
    else if (b) {
      if (assetToken === undefined)
        return a(
          "internal",
          "internal error: a public artifact read was routed where it cannot be served \u2014 this is a bug in this build; do not retry",
        );
      let viaMount = await getViaMountOnce(e.slug, path, {
        token: assetToken,
        timeout: ASSET_LIST_TIMEOUT_MS,
        maxContentLength: MAX_FRAME_RESPONSE_BYTES + 1,
        signal,
        retryBudget: singleReadRetryBudget(),
      });
      if (!viaMount.ok)
        return a(
          viaMount.reason.replace(/-/g, "_"),
          viaMount.reason === "no-auth"
            ? noGatewayCredentialMessage(viaMount.detail)
            : `artifact content is unreachable from this session (${viaMount.reason})`,
        );
      A = {
        status: viaMount.status,
        headers: viaMount.response.headers,
        data: viaMount.data,
      };
    } else {
      let y = assetToken === undefined ? "" : `?__frame_t=${encodeURIComponent(assetToken)}`;
      let w = await externalHttp.get(`${base}${path}${y}`, {
        signal,
        timeout: ASSET_LIST_TIMEOUT_MS,
        responseType: "arraybuffer",
        maxRedirects: 0,
        maxContentLength: MAX_FRAME_RESPONSE_BYTES + 1,
        validateStatus: () => true,
        ...(headers && {
          headers,
        }),
      });
      if (isAllowlistBlockedResponse(w.status, w.headers)) return T();
      let M = proxyDenyReason(w.headers);
      if (M !== undefined && (w.status < 200 || w.status >= 300)) return D(w.status, M);
      getLiveState().contentHostEgressDenied.delete(e.env);
      A = {
        status: w.status,
        headers: w.headers,
        data: w.data,
      };
    }
  } catch (error) {
    if (isCancel(error) || error instanceof AbortError) throw error;
    if (b) mountHopFailedForRunner();
    let w = b ? undefined : findProxyError(error);
    if (w !== undefined) {
      if (isAllowlistBlockedResponse(w.connectStatus, w.headers)) return T();
      let M = proxyDenyReason(w.headers);
      if (M !== undefined) return D(w.connectStatus, M);
      return ye(w.connectStatus, proxyErrorCode(w.headers));
    }
    return a(
      "request_error",
      `the content fetch failed in transit, timed out, or exceeded the ${MAX_FRAME_RESPONSE_BYTES >> 20} MiB limit`,
    );
  }
  if (b && mountDeclinedForRunner(A.status)) return a("relay_unavailable", ASSET_READ_UNAVAILABLE_MESSAGE);
  if (b && isMountNetworkOffRefusal(A.status, A.data))
    return a("network_off", `${MOUNT_NETWORK_OFF_WORDS}; retrying from here will not help`);
  if (b && isRetryableStatus(A.status)) return a(`http_${A.status}`, describeGatewayTransient(A.status));
  if (b) mountHopFailedForRunner(A.status);
  if (A.status === 404)
    return a(
      "http_404",
      b
        ? `not found through this cloud session's artifact mount \u2014 no asset has that id, or asset reads are not enabled for this session yet; a writer of the artifact can tell which with action "list_assets"`
        : 'no asset with that id in this artifact (it may have been deleted) \u2014 a writer of the artifact can check the id with action "list_assets"',
    );
  if (
    h &&
    A.status === 403 &&
    isForbiddenProxy(
      A.headers,
      proxyDenialResult(A.headers, A.data, (y) => y),
    )
  )
    return a(
      "public_refused",
      "this public artifact serves no asset with that id to readers outside its organization, or it is no longer public",
    );
  let X = b
    ? undefined
    : logProxyDenial({
        status: A.status,
        headers: A.headers,
        data: A.data,
        redact: (y) => redactFrameToken(y, assetToken),
        label: "[artifact] asset fetch",
      });
  if (X !== undefined) return a(X, ARTIFACT_PROXY_DENIAL_TEXTS[X]);
  if (A.status === 401 || A.status === 403)
    return a(
      `http_${A.status}`,
      b
        ? "the cloud session's artifact mount refused the read \u2014 asset reads may not be enabled for this session, or the artifact was unshared or taken down"
        : "access to the artifact content was refused \u2014 the artifact may have been unshared or taken down since the id was listed",
    );
  if (A.status !== 200)
    return a(
      `http_${A.status}`,
      `unexpected answer from the ${B ? "artifact service" : "content host"} (HTTP ${A.status})`,
    );
  if (b) markRelayServed(ARTIFACT_MOUNT);
  let headers_2 = A.headers;
  let oe = b || B ? contentTypeOfHeaders(headers_2) : headers_2?.["content-type"];
  let ie = typeof oe === "string" ? firstLineOf(oe, ";").trim().toLowerCase() : "";
  if (extensionForMimeType(ie) === undefined)
    return a(
      "unexpected_type",
      `the ${B ? "artifact service" : "content host"} served a type this tool does not save`,
    );
  let buffer = Buffer.from(A.data ?? new ArrayBuffer(0));
  if (buffer.length === 0 || buffer.length > MAX_FRAME_RESPONSE_BYTES)
    return a(
      "size",
      buffer.length === 0
        ? "the asset is empty"
        : `the asset exceeds the ${MAX_FRAME_RESPONSE_BYTES >> 20} MiB limit`,
    );
  return {
    kind: "ok",
    bytes: buffer,
    contentType: ie,
    relay: b,
    agentDirect,
    publicRead: h,
  };
}
//@ chunk-8wvtd8sr.js:295557-295627 placement
var FILE_PATHS_LIST_MESSAGE = `\`file_paths\` must be a list of 1 to ${MAX_UPLOAD_FILE_PATHS} local file paths`;
//@ chunk-8wvtd8sr.js:295627-296324 placement
/**
 * 解析 upload_asset 的 file_path / file_paths：单个、列表或 invalid（缺参数、两者同传、列表为空或超过 qL、元素非字符串）。
 */
function parseUploadPaths(e) {
  let n = e;
  let { file_path: filePath, file_paths: filePaths } = n;
  if (filePaths === undefined)
    return typeof filePath === "string"
      ? {
          kind: "single",
          paths: [filePath],
        }
      : {
          kind: "invalid",
          problem: 'action "upload_asset" requires `file_path` \u2014 the local file to upload.',
        };
  if (filePath !== undefined)
    return {
      kind: "invalid",
      problem: 'action "upload_asset" takes `file_path` (one file) or `file_paths` (several), not both.',
    };
  let untrustedArray = readUntrustedArray(filePaths);
  if (untrustedArray === undefined || untrustedArray === UNREADABLE_ARRAY || untrustedArray.length === 0)
    return {
      kind: "invalid",
      problem: `${FILE_PATHS_LIST_MESSAGE}.`,
    };
  if (untrustedArray.length > MAX_UPLOAD_FILE_PATHS)
    return {
      kind: "invalid",
      problem: `${FILE_PATHS_LIST_MESSAGE} \u2014 ${untrustedArray.length} were given; send the rest in further calls.`,
    };
  let y = [];
  for (let untrusted of untrustedArray) {
    if (typeof untrusted !== "string" || untrusted === "")
      return {
        kind: "invalid",
        problem: `${FILE_PATHS_LIST_MESSAGE}.`,
      };
    y.push(untrusted);
  }
  return {
    kind: "list",
    paths: y,
  };
}
//@ chunk-8wvtd8sr.js:296324-296755 placement
/**
 * 资源上传失败分类：单个文件即判定失败的代码、终止整次上传的代码、relay 不可用原因，以及上传结果行的长度与失败行数上限。
 */
var SINGLE_UPLOAD_FAILURE_CODES = new Set(["invalid_request", "too_large", "unsupported_type"]);
var FINAL_UPLOAD_FAILURE_CODES = new Set([
  "invalid_request",
  "too_large",
  "unsupported_type",
  "quota_or_state",
  "rate_limited",
  "upstream_auth",
  "capability_disabled",
  "not_found",
  "not_writer",
  "credential_rejected",
  "policy_denied",
  "unavailable_to_account",
]);
var RELAY_UNAVAILABLE_REASONS = new Set([
  "relay_unavailable",
  "relay_not_served",
  "probe_request_error",
  "probe_unvouched",
  "proxy_refused",
  "unrouted",
  "no_auth",
]);
var UPLOAD_LINE_MAX = 1300;
var MAX_UPLOAD_FAILURE_LINES = 6;
//@ chunk-8wvtd8sr.js:296755-296806 placement
/**
 * 拼出「file_paths[i] "路径"」标签。
 */
function filePathIndexLabel(e, n) {
  return `file_paths[${e}] ${safeJsonQuote(n)}`;
}
//@ chunk-8wvtd8sr.js:296806-296985 placement
var UPLOAD_RATE_LIMITED_MESSAGE =
  "the store is rate limiting this artifact \u2014 wait a minute before sending the rest";
var FILE_PATHS_FROM_SCRIPT_MESSAGE =
  "`file_paths` cannot be used from a script \u2014 pass one `file_path` per call";
//@ chunk-8wvtd8sr.js:296985-297896 placement
/**
 * 逐个校验批量上传路径：不能含 NUL、类型受支持、文本类文件须单独上传、路径长度上限、不重复、解析为本地路径；返回 {sources} 或首个出错的 {index, message, errorCode}。
 */
function vetUploadPathList(paths) {
  let fail = (index, message, errorCode) => ({
    index,
    message,
    errorCode,
  });
  let s = new Set();
  let r = [];
  for (let [h, y] of paths.entries()) {
    if (y.includes("\x00")) return fail(h, "a path cannot hold a NUL character", 8);
    let p = assetMimeTypeForPath(y);
    if (p === undefined) return fail(h, `unsupported asset type: upload_asset takes ${joined}.`, 1);
    if (isTextAssetMimeType(p))
      return fail(
        h,
        "a CSV, Markdown, JSON or plain-text file is approved on its own \u2014 upload it in its own call with `file_path`; the other files can go together.",
        8,
      );
    let w = expandPath(y);
    if (y.length > MAX_UPLOAD_PATH_LENGTH || w.length > MAX_UPLOAD_PATH_LENGTH)
      return fail(
        h,
        `this path is longer than ${MAX_UPLOAD_PATH_LENGTH} characters, as written or as an absolute path, which is more than an approval can show in full \u2014 upload that file by itself with \`file_path\`.`,
        8,
      );
    if (s.has(w)) return fail(h, "names the same file as an earlier entry \u2014 list each file once.", 8);
    s.add(w);
    let localUploadPath = resolveLocalUploadPath(w);
    if (localUploadPath.kind === "network") return fail(h, `${UPLOAD_NETWORK_PATH_MESSAGE}.`, 17);
    r.push({
      written: y,
      sourcePath: w,
      source: localUploadPath,
    });
  }
  return {
    sources: r,
  };
}
//@ chunk-8wvtd8sr.js:297896-297938 placement
/**
 * 拼出「路径标签: 错误」一行。
 */
var filePathErrorLine = (paths, n, message) => `${filePathIndexLabel(n, paths[n] ?? "")}: ${message}`;
//@ chunk-8wvtd8sr.js:297938-298643 placement
/**
 * upload_asset 的 validateInput：解析路径列表、拒绝脚本里使用 file_paths、逐个校验并用 readPublishFile 预读（大小上限、身份、空文件）。
 */
function validateUploadAssetInput(context, input, options) {
  let uploadPaths = parseUploadPaths(input);
  if (uploadPaths.kind !== "list")
    return {
      result: false,
      message:
        uploadPaths.kind === "invalid"
          ? uploadPaths.problem
          : 'action "upload_asset" takes `file_path` (one file) or `file_paths` (several), not both.',
      errorCode: 7,
    };
  if (options.publishSourceSha256 !== undefined)
    return {
      result: false,
      message: `${FILE_PATHS_FROM_SCRIPT_MESSAGE}.`,
      errorCode: 8,
    };
  let h = vetUploadPathList(uploadPaths.paths);
  if (!("sources" in h))
    return {
      result: false,
      message: filePathErrorLine(uploadPaths.paths, h.index, h.message),
      errorCode: h.errorCode,
    };
  for (let [y, p] of h.sources.entries()) {
    if (p.source.kind === "network") continue;
    let publishFile = readPublishFile(
      context,
      {
        ...input,
        file_path: p.written,
      },
      p.sourcePath,
      p.source,
      options,
      {
        maxBytes: maxAssetBytesFor(assetMimeTypeForPath(p.written)),
        notAFile: UPLOAD_NOT_REGULAR_FILE_MESSAGE,
        empty: UPLOAD_EMPTY_FILE_MESSAGE,
        noIdentity: UPLOAD_NO_FILE_IDENTITY_MESSAGE,
        tooLarge: uploadTooLargeMessage,
      },
    );
    if (publishFile.result === false)
      return {
        ...publishFile,
        message: filePathErrorLine(uploadPaths.paths, y, publishFile.message),
      };
  }
  return {
    result: true,
  };
}
//@ chunk-8wvtd8sr.js:298643-298726 placement
/**
 * 生成 deny 权限决策（原因类型 other）。
 */
var denyDecision = (message, reason) => ({
  behavior: "deny",
  message,
  decisionReason: {
    type: "other",
    reason,
  },
});
//@ chunk-8wvtd8sr.js:298726-299009 placement
function soloApprovalReason(e, n, s) {
  if (!needsReadAsk(n, s)) return;
  if (!n.spelledInside && n.readAsks) return "outside this session\u2019s allowed read paths";
  let r = "a file that is always approved on its own";
  if (n.readAsks) return r;
  let { linkNote } = describePublishPath(e.sourcePath, n);
  return linkNote !== "" ? linkNote.trim().replace(/^\(|\)$/g, "") : r;
}
//@ chunk-8wvtd8sr.js:299009-303211 placement
async function checkUploadAssetPermissions(e, n, s, r) {
  let uploadPaths = parseUploadPaths(n);
  if (uploadPaths.kind !== "list")
    return denyDecision(
      uploadPaths.kind === "invalid"
        ? uploadPaths.problem
        : 'action "upload_asset" takes `file_path` (one file) or `file_paths` (several), not both.',
      "Asset upload input names its files in both fields, or in a list that cannot be read",
    );
  let y = vetUploadPathList(uploadPaths.paths);
  if (!("sources" in y))
    return denyDecision(
      filePathErrorLine(uploadPaths.paths, y.index, y.message),
      "Asset upload list holds an entry a list may not carry",
    );
  let { sources } = y;
  let mapped = sources.map((source) =>
    isSoloApprovalFile(source.sourcePath, source.source, probeSymlink(source.sourcePath).link),
  );
  let A = (toolPermissionContext, se) => {
    let B = [];
    for (let [U, he] of sources.entries()) {
      let $e = checkPublishReadPermission(
        e,
        {
          ...n,
          file_path: he.written,
        },
        he.sourcePath,
        he.source,
        toolPermissionContext,
        se?.[U],
        "Uploading an asset reads file contents",
      );
      if ($e.refused !== undefined)
        return {
          refused:
            $e.refused.behavior === "deny"
              ? {
                  ...$e.refused,
                  message: filePathErrorLine(uploadPaths.paths, U, $e.refused.message),
                }
              : $e.refused,
        };
      B.push($e);
    }
    return {
      judged: B,
    };
  };
  let S = (judged) => {
    let filtered = judged
      .map((U, he) => {
        let $e = soloApprovalReason(sources[he], U, mapped[he]);
        return $e === undefined ? undefined : `${filePathIndexLabel(he, sources[he].written)} (${$e})`;
      })
      .filter((U) => U !== undefined);
    let B = filtered.length === 1;
    return filtered.length === 0
      ? undefined
      : denyDecision(
          `${B ? "One file" : `${filtered.length} files`} in \`file_paths\` ${B ? "needs" : "need"} an approval of ${B ? "its" : "their"} own, so nothing was uploaded: ${filtered.join("; ")}. Upload ${B ? "it" : "each of those"} in its own call with \`file_path\`; the other files can go together in one \`file_paths\` call.`,
          "An upload list carries only files that need no approval of their own",
        );
  };
  let R = (judged) => {
    let se = new Set();
    for (let [B, U] of judged.entries()) {
      let he = U.sourcePin?.real ?? sources[B].sourcePath;
      if (se.has(he))
        return denyDecision(
          filePathErrorLine(
            uploadPaths.paths,
            B,
            "names the same file as an earlier entry \u2014 list each file once",
          ),
          "Asset upload list names one file twice",
        );
      se.add(he);
    }
    return;
  };
  let T = A(getToolPermissionContext(s));
  if ("refused" in T) return T.refused;
  let P = S(T.judged) ?? R(T.judged);
  if (P !== undefined) return P;
  let mapped_2 = T.judged.map((He) => He.sourcePin);
  let V = () => hasOtherCommentPending(r.slug);
  let M = (He, se) => ({
    [ASSET_UPLOAD_PIN_TAG]: {
      slug: r.slug,
      batch: sources.map(
        (source, U) =>
          He[U] ?? {
            real: source.sourcePath,
            identity: null,
          },
      ),
      ...(se !== undefined && {
        otherCommentSeq: se,
      }),
    },
  });
  if (
    getToolPermissionContext(s).mode !== "auto" &&
    !V() &&
    (!isStrictHumanTurn(s.messages) ||
      (PLAN_MODE_KEEPS_FLAG_OFF_WRITE_ASKS && getToolPermissionContext(s).mode === "plan")) &&
    needsHumanAssetConsent(s, r.slug)
  ) {
    let He = denyOtherOrgArtifact(r, "Nothing was uploaded");
    if (He !== null) return He;
    return {
      behavior: "allow",
      updatedInput: {
        ...n,
        ...M(mapped_2),
        [CONSENT_ASK_TAG]: false,
        [PLAN_CONSENT_ASK_TAG]: false,
      },
      decisionReason: {
        type: "other",
        reason: "Asset uploads to this artifact already approved this session",
      },
    };
  }
  await warmShareEntry(r, s, "upload_asset");
  let x = denyOtherOrgArtifact(r, "Nothing was uploaded");
  if (x !== null) return x;
  let q = A(getToolPermissionContext(s), mapped_2);
  if ("refused" in q) return q.refused;
  let re = S(q.judged) ?? R(q.judged);
  if (re !== undefined) return re;
  let mapped_3 = q.judged.map((He) => He.sourcePin);
  let mode = q.judged[0].mode;
  let we = mode !== "auto";
  let joined = sources
    .map((source) => `"${sweptPagePath(source.sourcePath) || "(unprintable path)"}"`)
    .join(", ");
  let ie = ` The ${sources.length} ${plural(sources.length, "file")}: ${joined}.`;
  let _e = classifyArtifactConsent(classFactsFor("write", r, s));
  if (!writeKeepsFlagOffAsk(_e, s) && !V()) {
    let He = artifactCardTitleFor(r, s);
    let se = decideByClass({
      ruling: _e,
      input: {
        ...n,
        ...M(mapped_3),
        [PLAN_CONSENT_ASK_TAG]: false,
        [USER_ONLY_CONSENT_ASK_TAG]: false,
        [ARTIFACT_DISPLAY_TARGET_TAG]: He,
      },
      context: s,
      slug: r.slug,
      display: He,
      action: "write",
    });
    let decisionReason = se.decisionReason;
    return se.behavior === "ask" &&
      decisionReason !== undefined &&
      "reason" in decisionReason &&
      typeof decisionReason.reason === "string"
      ? {
          ...se,
          message: `${se.message}${ie}`,
          decisionReason: {
            ...decisionReason,
            reason: `${decisionReason.reason}${ie}`,
          },
        }
      : se;
  }
  if (planConsentMustDeny(s))
    return {
      behavior: "deny",
      message:
        "Asset uploads from plan mode need a consent surface, and no one can answer the prompt in this session. Keep planning in the plan file and raise the upload with the user in chat; do not retry this upload in this session.",
      decisionReason: {
        type: "safetyCheck",
        reason: "Plan-mode artifact asset uploads require a live human consent surface",
        classifierApprovable: false,
      },
    };
  let Oe = mode === "plan";
  let me = ownershipAskNote(getShareEntry(r.slug), "their artifact");
  let ge = V() && needsHumanAssetConsent(s, r.slug);
  let reason = `${ASSET_UPLOAD_LIST_CARD_LEDE}${ie}${Oe ? planModeCardNote(true) : ""}${me}${we && !ge ? (artifactCopyFromFrozen() ? ASSET_UPLOAD_COVERS_SESSION_COPIES_NOTE : ASSET_UPLOAD_COVERS_SESSION_NOTE) : ""}`;
  return {
    behavior: "ask",
    message:
      `Claude wants to upload ${sources.length} local ${plural(sources.length, "file")} into the asset store of ${artifactViewerUrlFor(r)}: ${joined} \u2014 everyone who can open the artifact can load them` +
      (!we
        ? "; each such upload asks again."
        : `; approving covers further uploads ${artifactCopyFromFrozen() ? "to (and copies of other artifacts' assets into) " : "to "}this artifact ${ge ? "until someone else comments on it again" : "for the rest of this session"}.`) +
      me,
    updatedInput: {
      ...n,
      ...M(mapped_3, otherCommentPendingSeq(r.slug)),
      [CONSENT_ASK_TAG]: we && consentAskCanReachUser(s),
      [PLAN_CONSENT_ASK_TAG]: Oe,
      [USER_ONLY_CONSENT_ASK_TAG]: false,
      [ARTIFACT_DISPLAY_TARGET_TAG]: artifactCardTitleFor(r, s),
    },
    suppressAlwaysAllowRule: true,
    decisionReason: Oe
      ? {
          type: "safetyCheck",
          reason,
          classifierApprovable: false,
        }
      : {
          type: "other",
          reason,
        },
    localDisplayOnly: true,
  };
}
//@ chunk-8wvtd8sr.js:303211-304298 placement
/**
 * 生成批量上传权限询问的描述：列出每个 file_paths[i] 及其解析后的绝对路径与链接提示，超出数量时汇总。
 */
function describeUploadListAsk(input, card) {
  let s = `upload a list of local files into an artifact's asset store${card.marksBeforeTarget} \u2192 ${card.target}${card.marksAfterTarget}`;
  let untrustedArray = readUntrustedArray(input.file_paths);
  if (untrustedArray === undefined || untrustedArray === UNREADABLE_ARRAY)
    return `${s}: ${UNREADABLE_LIST_TEXT} of paths`;
  let mapped = untrustedArray.slice(0, MAX_UPLOAD_FILE_PATHS).map((untrusted, S) => {
    let R = `file_paths[${S}]`;
    if (typeof untrusted !== "string")
      return {
        text: `${R} (not a path)`,
        noted: true,
      };
    try {
      let T = expandPath(untrusted);
      let P = describePathAnnotations(T);
      return {
        text: `${R} ${T === untrusted ? card.quote(untrusted) : `${card.quote(untrusted)} (at ${card.quote(T)})`}${P}`,
        noted: P !== "",
      };
    } catch {
      return {
        text: `${R} ${card.quote(untrusted)} [could not resolve this path]`,
        noted: true,
      };
    }
  });
  let filtered = mapped.filter((A) => A.noted);
  let p = untrustedArray.length - mapped.length;
  let w =
    input.file_path !== undefined
      ? `; also names \`file_path\`${typeof input.file_path === "string" ? ` ${card.quote(input.file_path)}` : ""}, and a call naming both is refused`
      : "";
  return `${s} (${untrustedArray.length} ${plural(untrustedArray.length, "file")}, one approval covers them all${filtered.length > 0 ? `; ${filtered.length} ${filtered.length === 1 ? "has a note in [brackets] and is" : "have a note in [brackets] and are"} listed first` : ""}): ${[...filtered, ...mapped.filter((A) => !A.noted)].map((A) => A.text).join("; ")}${p > 0 ? `; and ${p} more, past the ${MAX_UPLOAD_FILE_PATHS} one call may name, not shown` : ""}${w}`;
}
//@ chunk-8wvtd8sr.js:304298-304443 placement
/**
 * 本地文件列表无法显示时的描述（路径数量或占位）。
 */
function describeUploadListFallback(e) {
  let untrustedArray = readUntrustedArray(e.file_paths);
  return `a list of local files (${untrustedArray === undefined || untrustedArray === UNREADABLE_ARRAY ? UNREADABLE_LIST_TEXT : `${untrustedArray.length} paths`}, none of which could be shown)`;
}
//@ chunk-8wvtd8sr.js:304443-304500 placement
/**
 * 判断上传失败是否可重试（非终态错误码、非中继不可用）。
 */
function isRetryableUploadFailure(e) {
  return !(FINAL_UPLOAD_FAILURE_CODES.has(e.code) || RELAY_UNAVAILABLE_REASONS.has(e.reason));
}
//@ chunk-8wvtd8sr.js:304500-309621 placement
async function runUploadAsset(e, n, s) {
  let uploadPaths = parseUploadPaths(e);
  if (uploadPaths.kind !== "list")
    throw new ArtifactInputError(
      uploadPaths.kind === "invalid"
        ? uploadPaths.problem
        : 'action "upload_asset" takes `file_path` (one file) or `file_paths` (several), not both.',
      "asset_upload_missing_field",
    );
  if (n.publishSourceSha256 !== undefined)
    throw new ArtifactInputError(FILE_PATHS_FROM_SCRIPT_MESSAGE, "asset_upload_missing_field");
  let { paths } = uploadPaths;
  let y = vetUploadPathList(paths);
  if (!("sources" in y))
    throw new ArtifactInputError(
      filePathErrorLine(paths, y.index, y.message),
      "asset_upload_list_entry_refused",
    );
  let p = e[ASSET_UPLOAD_PIN_TAG];
  let batch = p?.batch;
  let A = Array.isArray(batch) ? batch : undefined;
  if (carriesForeignPin(e, ASSET_UPLOAD_PIN_TAG) || (p !== undefined && p?.slug !== s.slug))
    throw new ArtifactInputError(
      "`action` or `url` no longer names the artifact upload that was approved \u2014 retry so it is checked again",
      "asset_upload_target_changed",
    );
  if (
    p !== undefined &&
    p !== null &&
    (A === undefined ||
      A.length !== paths.length ||
      !A.every((re) => {
        let Z = re;
        return typeof Z?.real === "string" && typeof Z.identity === "string";
      }))
  )
    throw new ArtifactInputError(
      "the call no longer names the files that were approved (one file where a list was approved, a list of another length, or a file whose identity was not recorded) \u2014 retry so it is checked again",
      "asset_upload_pin_mismatch",
    );
  let S = (re) => {
    let toolPermissionContext = getToolPermissionContext(n);
    let ue = assetMimeTypeForPath(re);
    if (ue === undefined)
      throw new ArtifactInputError(
        `unsupported asset type: upload_asset takes ${joined}`,
        "asset_upload_unsupported_type",
      );
    let we = expandPath(re);
    if (
      readPermissionDecisionForPath(we, toolPermissionContext).behavior === "deny" ||
      getDenyRuleForTool(toolPermissionContext, READ_PATH_PROBE) !== null
    )
      throw new ArtifactInputError(
        "reading this file is blocked by a Read permission rule \u2014 the upload was not attempted",
        "asset_upload_read_denied",
      );
    let Ie = getAskRuleForTool(toolPermissionContext, READ_PATH_PROBE) !== null;
    return {
      contentType: ue,
      path: we,
      readVerdict: (ie) => {
        let behavior = readPermissionDecisionForPath(ie, toolPermissionContext).behavior;
        return behavior === "allow" && Ie ? "ask" : behavior;
      },
    };
  };
  let R = [];
  let T = () => {
    for (let [re, Z] of R.entries())
      if (Z !== undefined) {
        closeFdQuietly(Z);
        R[re] = undefined;
      }
  };
  let P = [];
  try {
    for (let [re, Z] of paths.entries()) {
      let ue = S(Z);
      let we = checkUploadFile(ue.path, A?.[re], ue.readVerdict, maxAssetBytesFor(ue.contentType));
      if (we.kind !== "opened")
        throw new ArtifactInputError(
          `${we.kind === "missing" ? "the file was not found" : we.message.replaceAll("file_path", "this file").replace(/[.\s]+$/, "")}. Nothing was sent.`,
          we.kind === "missing"
            ? "asset_upload_file_not_found"
            : we.reason === "network"
              ? "asset_upload_network_path"
              : `asset_upload_${we.reason}`,
        );
      if (R.some((Ie) => Ie?.real === we.real)) {
        closeFdQuietly(we);
        throw new ArtifactInputError(
          "names the same file as an earlier entry \u2014 list each file once. Nothing was sent.",
          "asset_upload_list_entry_refused",
        );
      }
      R.push(we);
      P.push(ue.contentType);
      await yieldToEventLoop();
      if (n.abortController.signal.aborted) throw new AbortError();
    }
  } catch (error) {
    T();
    throw error instanceof ArtifactInputError
      ? new ArtifactInputError(filePathErrorLine(paths, R.length, error.message), error.reasonCode)
      : error;
  }
  let L = A === undefined;
  let V = () => {
    if (L) return;
    L = true;
    let otherCommentSeq = p.otherCommentSeq;
    stampArtifactAssetUploadConsent(
      e,
      n,
      s.slug,
      typeof otherCommentSeq === "number" ? otherCommentSeq : undefined,
    );
  };
  let M = [];
  let x;
  let q = 0;
  try {
    for (let [re, Z] of paths.entries()) {
      if (x !== undefined) {
        M.push({
          file_path: Z,
          status: "not_attempted",
          reason: "stopped",
          message: `the call stopped at ${x}`,
        });
        continue;
      }
      let ue = false;
      let we = (Ie) => {
        M.push({
          file_path: Z,
          status: "failed",
          ...Ie,
        });
        x = filePathIndexLabel(re, Z);
      };
      try {
        if (q > 0)
          await sleep(UPLOAD_LINE_MAX, n.abortController.signal, {
            abortError: () => new AbortError(),
          });
        let opened = R[re];
        if (S(Z).readVerdict(opened.real) === "deny")
          throw new ArtifactInputError(
            "reading this file is blocked by a Read permission rule \u2014 the upload was not attempted",
            "asset_upload_read_denied",
          );
        R[re] = undefined;
        let approvedFileBytes = await readApprovedFileBytes(opened);
        if (approvedFileBytes.kind !== "ok") {
          we({
            reason:
              approvedFileBytes.kind === "missing"
                ? "asset_upload_file_not_found"
                : `asset_upload_${approvedFileBytes.reason}`,
            message:
              approvedFileBytes.kind === "missing"
                ? "the file could not be read"
                : approvedFileBytes.message.replaceAll("file_path", "this file"),
          });
          continue;
        }
        V();
        ue = true;
        let _e = await uploadArtifactAsset(
          {
            slug: s.slug,
            bytes: approvedFileBytes.bytes,
            contentType: P[re],
            credentials: n.credentials,
          },
          n.abortController.signal,
        );
        if (n.abortController.signal.aborted) throw new AbortError();
        if (_e.resent === true) q += 1;
        if (_e.kind === "error") {
          let Oe = {
            reason: `asset_upload_${_e.reason}`,
            message: _e.message,
            ...(isRetryableUploadFailure(_e) && {
              may_be_stored: true,
            }),
          };
          let me = SINGLE_UPLOAD_FAILURE_CODES.has(_e.code) && _e.reason !== "invalid_slug";
          if (me && q < MAX_UPLOAD_FAILURE_LINES)
            M.push({
              file_path: Z,
              status: "failed",
              ...Oe,
            });
          else {
            we(Oe);
            if (me) x = `${filePathIndexLabel(re, Z)} (${UPLOAD_RATE_LIMITED_MESSAGE})`;
          }
          continue;
        }
        M.push({
          file_path: Z,
          status: "uploaded",
          id: _e.id,
          url: _e.url,
          size_bytes: _e.sizeBytes,
          content_type: _e.contentType,
          ...(_e.sha256 !== undefined && {
            sha256: _e.sha256,
          }),
          file_name: basename(expandPath(Z)),
        });
        if (q >= MAX_UPLOAD_FAILURE_LINES)
          x = `${filePathIndexLabel(re, Z)} (stored; ${UPLOAD_RATE_LIMITED_MESSAGE})`;
      } catch (error) {
        if (n.abortController.signal.aborted) throw isAbortError(error) ? error : new AbortError();
        let ie = error instanceof ArtifactInputError ? error : undefined;
        we({
          reason: ie?.reasonCode ?? "asset_upload_unexpected",
          message:
            ie?.message ??
            (ue
              ? "an unexpected error stopped this upload before the store answered \u2014 whether this file was stored is unknown; list the assets to check"
              : "an unexpected error stopped this upload before anything was sent"),
          ...(ie === undefined &&
            ue && {
              may_be_stored: true,
            }),
        });
      }
    }
  } finally {
    T();
  }
  if (!M.some((re) => re.status === "uploaded")) {
    let filtered = M.filter((ue) => ue.status !== "uploaded");
    let filtered_2 = filtered.filter((ue) => ue.may_be_stored !== true);
    throw new ArtifactInputError(
      `No file is confirmed stored. ${filtered.map((ue, we) => `${filePathIndexLabel(we, ue.file_path)}: ${ue.status === "not_attempted" ? "not attempted, " : ue.may_be_stored === true ? "failed, but may be stored, " : ""}${ue.message.slice(0, 300)}`).join("; ")}.${filtered_2.length === filtered.length ? "" : filtered_2.length === 0 ? " Before sending again, list the assets to see what is stored." : ` Before sending again, list the assets to see what is stored; only these are known not to be: [${filtered_2.map((ue) => jsonQuotedSweep(ue.file_path, MAX_UPLOAD_PATH_LENGTH)).join(", ")}].`}`,
      "asset_upload_none_stored",
      {
        maxErrorChars: MAX_UPLOAD_FILE_PATHS * (2 * MAX_UPLOAD_PATH_LENGTH + 500),
      },
    );
  }
  return {
    data: {
      ...writtenPage(s, ownedVerdict(getShareEntry(s.slug))),
      asset_uploads: {
        url: artifactViewerUrlFor(s),
        results: M,
      },
    },
  };
}
//@ chunk-8wvtd8sr.js:309621-311311 placement
/**
 * 渲染批量上传结果：已上传（大小、类型、url、id）与失败/未尝试（可能已存储）分组列出，附后续操作提示。
 */
var renderAssetUploadsResult = (e, toolUseId) => {
  let assetUploads = e.asset_uploads;
  let r =
    typeof assetUploads === "object" && assetUploads !== null && !Array.isArray(assetUploads)
      ? assetUploads
      : {};
  let h = capResultRows(r.results, MAX_UPLOAD_FILE_PATHS);
  let y = [];
  let p = [];
  let w = [];
  for (let R of h.rows) {
    let T = jsonQuotedSweep(R.file_path, MAX_UPLOAD_PATH_LENGTH);
    if (R.status === "uploaded") {
      let P = peerOrFallback(R.url, ASSET_BLOB_URL_RE, "");
      y.push(
        `- ${T} (${numberText(R.size_bytes)} bytes, ${peerOrFallback(R.content_type, CONTENT_TYPE_RE, "unrecognized content type")}) \u2192 ${P === "" ? "stored, but this record's copy of its url is unreadable" : `${jsonStringify(P)} (id ${peerOrFallback(R.id, ASSET_ID_RE, "unreadable")})`}`,
      );
    } else {
      p.push(
        `- ${T}: ${R.status === "not_attempted" ? "not attempted" : R.may_be_stored === true ? "failed, but may be stored" : "failed"} \u2014 ${quoteSweptValue(R.message, 1024)}`,
      );
      if (R.may_be_stored !== true) w.push(T);
    }
  }
  let A = h.unreadable + h.pastCap;
  let S = h.rows.length + A;
  return {
    tool_use_id: toolUseId,
    type: "tool_result",
    content:
      `Assets uploaded: ${y.length} of ${S} ${plural(S, "file")} ${y.length === 1 ? "is" : "are"} now stored in the artifact.` +
      (y.length > 0
        ? ` Reference each from the page by its url verbatim \u2014 e.g. <img src="\u2026the url\u2026"> \u2014 which resolves in every view of the artifact; store the id in the artifact's database if rows need to point at it.
${y.join(`
`)}`
        : "") +
      (p.length > 0
        ? `
Not stored, or not known to be (each line says why; do not reference these):
${p.join(`
`)}`
        : "") +
      (w.length > 0
        ? `
To upload the rest, fix what stopped them, then call again with only these in \`file_paths\`: [${w.join(", ")}]. None of them is stored, so nothing is stored twice.`
        : "") +
      (A > 0
        ? `
${A} more ${plural(A, "entry", "entries")} of this record could not be read; ${pickByToolset('action "list_assets"', () => 'action "list" with `scope: "assets"`')} shows what the artifact holds.`
        : "") +
      `
Everyone who can open the artifact can load the stored files; each is durable until deleted with action "delete_asset".`,
  };
};
//@ chunk-8wvtd8sr.js:311311-311415 placement
/**
 * 全部 Artifact 动作处理器列表，以及动作名 → 处理器的映射表 $b。
 */
var ARTIFACT_ACTION_HANDLERS = [
  ARTIFACT_DB_ACTIONS,
  ARTIFACT_PREVIEW_ACTION_HANDLER,
  ARTIFACT_COPY_FROM_ACTION_HANDLER,
  ARTIFACT_WATCH_ACTION_HANDLER,
  ARTIFACT_COMMENTS_ACTION_HANDLER,
  ARTIFACT_ROOM_SEND_ACTION_HANDLER,
  ARTIFACT_LIST_ACTION_HANDLER,
  ARTIFACT_LIVE_EDIT_ACTION_HANDLER,
  ARTIFACT_OPEN_ACTION_HANDLER,
  ARTIFACT_ENDPOINTS_ACTION_HANDLER,
  ARTIFACT_PIN_ACTION_HANDLER,
  ARTIFACT_QUICKSTART_ACTION_HANDLER,
  ARTIFACT_SHARE_ACTION_HANDLER,
];
var ACTION_HANDLER_BY_NAME = new Map(
  ARTIFACT_ACTION_HANDLERS.flatMap((e) => e.actions.map((action) => [action, e])),
);
export {
  SHA256_HEX_RE,
  ASSET_BLOB_URL_RE,
  CONTENT_TYPE_RE,
  MAX_UPLOAD_FILE_PATHS,
  MAX_CONTENT_TYPE_LENGTH,
  ASSET_CURSOR_RE,
  MAX_COPY_ASSET_IDS,
  statFileIdentity,
  resolveLocalUploadPath,
  fileIdentityDev,
  fileIdentityOf,
  probeSymlink,
  readApprovedUploadFile,
  copyArtifactAsset,
  ACTION_HANDLER_BY_NAME,
  renderAssetUploadsResult,
  checkUploadAssetPermissions,
  UPLOAD_NETWORK_PATH_MESSAGE,
  isSoloApprovalFile,
  isTextAssetMimeType,
  assetMimeTypeForPath,
  flattened,
  describeUploadListAsk,
  describeUploadListFallback,
  parseUploadPaths,
  validateUploadAssetInput,
  joined,
  maxAssetBytesFor,
  UPLOAD_NOT_REGULAR_FILE_MESSAGE,
  UPLOAD_EMPTY_FILE_MESSAGE,
  UPLOAD_NO_FILE_IDENTITY_MESSAGE,
  uploadTooLargeMessage,
  ISO_TIMESTAMP_RE,
  runUploadAsset,
  uploadArtifactAsset,
  listArtifactAssets,
  deleteArtifactAsset,
  readArtifactAsset,
  extensionForMimeType,
  isArtifactAssetsEnabled,
  artifactAssetsEnabledSource,
  MAX_UPLOAD_PATH_LENGTH,
};
