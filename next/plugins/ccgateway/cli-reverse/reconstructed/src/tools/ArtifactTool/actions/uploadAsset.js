/**
 * tools/ArtifactTool/actions/uploadAsset.ts
 *
 * Artifact 资源上传/列表/删除/复制/读取（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f9dqjjrc.js (48), chunk-xzmy9dn4.js (17)
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
import {
  normalizeCaseForComparison_2,
  readPermissionDecisionForPath,
  READ_PATH_PROBE,
} from "../../../utils/permissions/filesystem.js";
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
import { fetchBoot } from "../../../services/artifacts/boot.js";
import { contentHostRequestBase, contentHostAllowlistRemedy } from "../../../services/artifacts/frameHost.js";
import { logForDebugging } from "../../../utils/debug.js";
import {
  frameContentRoute,
  getFromFrameContent,
  getFromArtifactMount,
  mountRetryBudget,
  mountUnavailableWords,
  passthroughContentType,
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
import { isUnavailableStatus } from "../../../services/artifacts/liveSubscribe.js";
import { redactAssetToken } from "../../../services/artifacts/webfetchRead.js";
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
import { getDenyRuleForTool, findAskRuleForTool } from "../../../utils/permissions/permissions.js";
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-f9dqjjrc.js:1494-1601 placement
/**
 * Artifact 资源功能是否开启：环境变量 CLAUDE_CODE_ARTIFACT_ASSETS 优先，否则 agent 会话可直发或服务端能力里含 assets。
 */
function isArtifactAssetsEnabled() {
  return (
    env.CLAUDE_CODE_ARTIFACT_ASSETS ??
    (agentSessionMaySendDirect() || (knownArtifactCapabilities().capabilities?.includes("assets") ?? false))
  );
}
//@ chunk-f9dqjjrc.js:1601-1704 placement
/**
 * Artifact 资源功能开关的来源：环境变量、agent 会话，或已知能力的来源。
 */
function artifactAssetsEnabledSource() {
  if (env.CLAUDE_CODE_ARTIFACT_ASSETS !== undefined) return "env";
  return agentSessionMaySendDirect() ? "agent" : knownArtifactCapabilities().source;
}
//@ chunk-f9dqjjrc.js:1704-1737 placement
/**
 * SVG MIME 类型与 SVG 资源大小上限。
 */
var SVG_MIME_TYPE = "image/svg+xml";
var MAX_SVG_BYTES = 2097152;
//@ chunk-f9dqjjrc.js:1737-1772 placement
/**
 * 按 MIME 类型给出上传大小上限（SVG 用较小上限）。
 */
function maxAssetBytesFor(mimeType) {
  return mimeType === SVG_MIME_TYPE ? MAX_SVG_BYTES : MAX_FRAME_RESPONSE_BYTES;
}
//@ chunk-f9dqjjrc.js:1772-2406 placement
var ASSET_MIME_TYPES; // deferred: uses normalizeCaseForComparison_2 (../../../utils/permissions/filesystem.js) of its import cycle while loading; runs once the cycle is complete
var flattened;
var joined;
deferInit("chunk-f9dqjjrc.js:1772", () => {
  ASSET_MIME_TYPES = new Map([
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
  flattened = normalizeCaseForComparison_2(ASSET_MIME_TYPES.values()).flatMap(
    (mimeType) => extensionForMimeType(mimeType) ?? [],
  );
  joined = [...ASSET_MIME_TYPES.keys()].map((key) => key.slice(1)).join(", ");
});
//@ chunk-f9dqjjrc.js:2406-2456 placement
/**
 * 由文件扩展名查资源的 MIME 类型。
 */
function assetMimeTypeForPath(filePath) {
  return ASSET_MIME_TYPES.get(extname(filePath).toLowerCase());
}
//@ chunk-f9dqjjrc.js:2456-2533 placement
/**
 * 可按文本处理的资源 MIME 类型集合。
 */
var TEXT_ASSET_MIME_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-f9dqjjrc.js:2456", () => {
  TEXT_ASSET_MIME_TYPES = new Set(["text/csv", "text/markdown", "application/json", "text/plain"]);
});
//@ chunk-f9dqjjrc.js:2533-2578 placement
/**
 * 判断 MIME 类型是否可按文本处理。
 */
function isTextAssetMimeType(mimeType) {
  return mimeType !== undefined && TEXT_ASSET_MIME_TYPES.has(mimeType);
}
//@ chunk-f9dqjjrc.js:2578-3151 placement
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
//@ chunk-f9dqjjrc.js:3151-3253 placement
/**
 * 上传文件过大的提示（实际 MB 与上限 MB）。
 */
function uploadTooLargeMessage(bytes, maxBytes) {
  return `too large: ${Math.ceil((Number(bytes) * 10) / 1024 / 1024) / 10}MB (max ${maxBytes / 1024 / 1024}MB)`;
}
//@ chunk-f9dqjjrc.js:3253-3499 placement
/**
 * 文件所在卷不提供文件身份（部分网络/FUSE/虚拟盘）时拒绝上传的说明，建议复制到普通本地目录。
 */
var UPLOAD_NO_FILE_IDENTITY_MESSAGE =
  "file_path is on a volume that reports no usable file identity (some network, FUSE, and virtual-disk mounts), so the approved file cannot be told apart from a replacement \u2014 copy it to an ordinary local directory and upload the copy";
//@ chunk-f9dqjjrc.js:3499-3667 placement
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
//@ chunk-f9dqjjrc.js:3667-3732 placement
/**
 * 把文件状态拼成「设备:inode:大小:mtime」的身份串，用于确认批准后未被替换。
 */
function fileIdentityOf(stats) {
  return `${stats.dev}:${stats.ino}:${stats.size}:${stats.mtimeNs}`;
}
//@ chunk-f9dqjjrc.js:3732-3842 placement
/**
 * 从"a:b:c:d"形式的文件身份串中取出设备号。
 */
function fileIdentityDev(identity) {
  let parts = identity.split(":");
  if (parts.length !== 4 || !parts.every((part) => /^\d+$/.test(part))) return;
  return Number(parts[2]);
}
//@ chunk-f9dqjjrc.js:3842-4152 placement
/**
 * upload_asset 拒绝网络路径的说明：只读本地文件，UNC 共享、/net 自动挂载、设备路径或经链接到达网络位置的需先复制到本地磁盘。
 */
var UPLOAD_NETWORK_PATH_MESSAGE =
  "upload_asset reads only local files \u2014 file_path names a network path (UNC share, /net automount, or device-style path), reaches one through a link on the way, or has a directory or link on the way that could not be examined; if the file is on a network location, copy it onto a local disk first";
//@ chunk-f9dqjjrc.js:4152-4435 placement
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
  let realPath;
  try {
    realPath = realpathSync(path);
  } catch (error) {
    return {
      kind: "unresolved",
      error,
    };
  }
  return isProtectedPath(realPath)
    ? {
        kind: "network",
      }
    : {
        kind: "resolved",
        real: realPath,
      };
}
//@ chunk-f9dqjjrc.js:4435-4584 placement
/**
 * lstat 文件得到文件身份（多硬链接时标记 linked），失败时身份为 null。
 */
function statFileIdentity(real) {
  try {
    let stats = lstatSync(real, {
      bigint: true,
    });
    return {
      real,
      identity: fileIdentityOf(stats),
      ...(stats.isFile() &&
        stats.nlink > 1n && {
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
//@ chunk-f9dqjjrc.js:4584-4697 placement
/**
 * 判断上传文件是否需要单独批准（路径或其真实路径命中特定规则，或非网络路径满足额外条件）。
 */
function isSoloApprovalFile(
  filePath,
  uploadPath = resolveLocalUploadPath(filePath),
  link = uploadPath.kind !== "network" && symlinkTargetOf(filePath),
) {
  return (
    isTextAssetMimeType(assetMimeTypeForPath(filePath)) ||
    (uploadPath.kind === "resolved" && isTextAssetMimeType(assetMimeTypeForPath(uploadPath.real))) ||
    link
  );
}
//@ chunk-f9dqjjrc.js:4697-4731 placement
/**
 * 取路径的符号链接目标。
 */
function symlinkTargetOf(filePath) {
  return probeSymlink(filePath).link;
}
//@ chunk-f9dqjjrc.js:4731-4864 placement
/**
 * 检查路径是否为符号链接；无法读取时视为链接并返回错误码。
 */
function probeSymlink(filePath) {
  try {
    return {
      link: lstatSync(filePath).isSymbolicLink(),
      unreadable: null,
    };
  } catch (error) {
    return {
      link: true,
      unreadable: getErrnoCode(error) ?? "unexpected error",
    };
  }
}
//@ chunk-f9dqjjrc.js:4864-4878 placement
var readFileHandle; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-f9dqjjrc.js:4864", () => {
  readFileHandle = promisify(read);
});
//@ chunk-f9dqjjrc.js:4878-7279 placement
function checkUploadFile(filePath, pinned, checkSpelling, maxBytes) {
  let pin = pinned;
  let pinnedFile =
    typeof pin === "object" && pin !== null && typeof pin.real === "string"
      ? {
          real: pin.real,
          identity:
            typeof pin.identity === "string" && (pin.digest === undefined || typeof pin.digest === "string")
              ? pin.identity
              : null,
          ...(typeof pin.digest === "string" && {
            digest: pin.digest,
          }),
        }
      : undefined;
  let localUploadPath = resolveLocalUploadPath(filePath);
  if (localUploadPath.kind === "network")
    return {
      kind: "error",
      reason: "network",
      message: UPLOAD_NETWORK_PATH_MESSAGE,
    };
  if (localUploadPath.kind === "unresolved") {
    if (pinnedFile !== undefined && pinnedFile.identity !== null)
      return {
        kind: "error",
        reason: "changed",
        message: UPLOAD_FILE_CHANGED_MESSAGE,
      };
    let mapped = getPathsForPermissionCheck(filePath).slice(1).map(checkSpelling);
    return mapped.includes("deny")
      ? {
          kind: "error",
          reason: "read_denied",
          message: UPLOAD_READ_DENIED_MESSAGE,
        }
      : mapped.some((decision) => decision !== "allow")
        ? {
            kind: "error",
            reason: "via_link",
            message: UPLOAD_SYMLINK_ASK_MESSAGE,
          }
        : readErrorResult(localUploadPath.error);
  }
  let { real } = localUploadPath;
  let realDecision = real === filePath ? undefined : checkSpelling(real);
  if (realDecision === "deny")
    return {
      kind: "error",
      reason: "read_denied",
      message: UPLOAD_READ_DENIED_MESSAGE,
    };
  if (pinnedFile !== undefined) {
    if (real !== pinnedFile.real)
      return {
        kind: "error",
        reason: "changed",
        message: UPLOAD_FILE_CHANGED_MESSAGE,
      };
  } else if (realDecision !== undefined && realDecision !== "allow")
    return {
      kind: "error",
      reason: "via_link",
      message: UPLOAD_SYMLINK_ASK_MESSAGE,
    };
  let stats;
  try {
    stats = lstatSync(real, {
      bigint: true,
    });
  } catch (error) {
    return pinnedFile !== undefined && isENOENT(error)
      ? {
          kind: "error",
          reason: "changed",
          message: UPLOAD_FILE_CHANGED_MESSAGE,
        }
      : readErrorResult(error);
  }
  if (stats.isSymbolicLink())
    return {
      kind: "error",
      reason: "changed",
      message: UPLOAD_FILE_CHANGED_MESSAGE,
    };
  if (!stats.isFile())
    return {
      kind: "error",
      reason: "not_a_file",
      message: UPLOAD_NOT_REGULAR_FILE_MESSAGE,
    };
  if (pinnedFile === undefined && stats.nlink > 1n)
    return {
      kind: "error",
      reason: "hard_link",
      message:
        "file_path is one of several hard links to its file, and this approval did not examine that \u2014 copy the file to a fresh path under the working directory and upload the copy",
    };
  let openFlags = constants.O_NOFOLLOW | constants.O_NONBLOCK;
  let fd;
  try {
    fd = openSync(real, constants.O_RDONLY | openFlags);
  } catch (error) {
    if (getErrnoCode(error) === "ELOOP")
      return {
        kind: "error",
        reason: "changed",
        message: UPLOAD_FILE_CHANGED_MESSAGE,
      };
    return readErrorResult(error);
  }
  let fdKept = false;
  try {
    let fdStats = fstatSync(fd, {
      bigint: true,
    });
    if (!fdStats.isFile())
      return {
        kind: "error",
        reason: "not_a_file",
        message: UPLOAD_NOT_REGULAR_FILE_MESSAGE,
      };
    if (isSentinelInode(fdStats.ino))
      return {
        kind: "error",
        reason: "no_identity",
        message: UPLOAD_NO_FILE_IDENTITY_MESSAGE,
      };
    if (fileIdentityOf(fdStats) !== (pinnedFile !== undefined ? pinnedFile.identity : fileIdentityOf(stats)))
      return {
        kind: "error",
        reason: "changed",
        message: UPLOAD_FILE_CHANGED_MESSAGE,
      };
    {
      let procPath = null;
      try {
        procPath = realpathSync(`/proc/self/fd/${fd}`);
      } catch {}
      if (procPath !== null && procPath !== real)
        return {
          kind: "error",
          reason: "changed",
          message: UPLOAD_FILE_CHANGED_MESSAGE,
        };
    }
    try {
      let localUploadPath = resolveLocalUploadPath(filePath);
      if (localUploadPath.kind !== "resolved" || localUploadPath.real !== real)
        return {
          kind: "error",
          reason: "changed",
          message: UPLOAD_FILE_CHANGED_MESSAGE,
        };
      let recheckStats = lstatSync(real, {
        bigint: true,
      });
      if (recheckStats.dev !== fdStats.dev || recheckStats.ino !== fdStats.ino)
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
    let size = Number(fdStats.size);
    if (size === 0 || size > maxBytes)
      return {
        kind: "error",
        reason: "size",
        message: size === 0 ? UPLOAD_EMPTY_FILE_MESSAGE : uploadTooLargeMessage(size, maxBytes),
        sizeBytes: size,
      };
    fdKept = true;
    return {
      kind: "opened",
      fd,
      size,
      real,
      identity: fileIdentityOf(fdStats),
      digest: pinnedFile?.digest,
    };
  } catch (error) {
    return readErrorResult(error);
  } finally {
    if (!fdKept) closeSync(fd);
  }
}
//@ chunk-f9dqjjrc.js:7279-7774 placement
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
    let buffer = Buffer.allocUnsafe(size);
    let total = 0;
    while (total < size) {
      let { bytesRead } = await readFileHandle(fd, buffer, total, size - total, total);
      if (bytesRead === 0) break;
      total += bytesRead;
    }
    let { bytesRead } = await readFileHandle(fd, Buffer.alloc(1), 0, 1, size);
    if (total !== size || bytesRead !== 0)
      return {
        kind: "error",
        reason: "changed",
        message: UPLOAD_FILE_CHANGED_MESSAGE,
      };
    if (digest !== undefined && computeContentHash(buffer) !== digest)
      return {
        kind: "error",
        reason: "changed",
        message: UPLOAD_FILE_CHANGED_MESSAGE,
      };
    return {
      kind: "ok",
      bytes: buffer,
    };
  } catch (error) {
    return readErrorResult(error);
  } finally {
    closeSync(fd);
  }
}
//@ chunk-f9dqjjrc.js:7774-7811 placement
/**
 * 静默关闭文件描述符。
 */
function closeFdQuietly(opened) {
  try {
    closeSync(opened.fd);
  } catch {}
}
//@ chunk-f9dqjjrc.js:7811-7892 placement
/**
 * 通过检查后读取已批准的本地文件。
 */
async function readApprovedUploadFile(filePath, pinned, checkSpelling, maxBytes) {
  let opened = checkUploadFile(filePath, pinned, checkSpelling, maxBytes);
  return opened.kind === "opened" ? readApprovedFileBytes(opened) : opened;
}
//@ chunk-f9dqjjrc.js:7892-8148 placement
/**
 * 资源 API 已知错误码集合，以及 _blob/<32 位十六进制> 形式的资源地址正则。
 */
var ASSET_API_ERROR_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ASSET_BLOB_URL_RE;
deferInit("chunk-f9dqjjrc.js:7892", () => {
  ASSET_API_ERROR_CODES = new Set([
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
  ASSET_BLOB_URL_RE = /^\/?_blob\/[0-9a-f]{32}$/;
});
//@ chunk-f9dqjjrc.js:8148-8224 placement
/**
 * 规范化资源 blob 地址（_blob/<id> 或 /_blob/<id>）。
 */
function assetBlobUrl(opaqueId, url) {
  return url === `_blob/${opaqueId}` || url === `/_blob/${opaqueId}` ? url : `/_blob/${opaqueId}`;
}
//@ chunk-f9dqjjrc.js:8224-9310 placement
/**
 * 资源 API 的常量与响应 schema：分页上限、id/类型/时间正则、复制上限 yue、批量上传上限 qL、路径长度上限，以及上传/列表/删除/错误响应的 zod schema 与超时。
 */
var SHA256_HEX_RE; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ASSET_LIST_PAGE_LIMIT;
var MAX_CONTENT_TYPE_LENGTH;
var ASSET_CURSOR_RE;
var ISO_TIMESTAMP_RE;
var CONTENT_TYPE_RE;
var MAX_COPY_ASSET_IDS;
var MAX_UPLOAD_FILE_PATHS;
var MAX_UPLOAD_PATH_LENGTH;
var uploadedAssetSchema;
var assetListSchema;
var assetDeleteSchema;
var assetErrorSchema;
var relayErrorSchema;
var MAX_RETRY_AFTER_MS;
var ASSET_REQUEST_TIMEOUT_MS;
var UPLOAD_TAIL_FLOOR_MS;
deferInit("chunk-f9dqjjrc.js:8224", () => {
  SHA256_HEX_RE = /^[0-9a-f]{64}$/;
  ASSET_LIST_PAGE_LIMIT = 50;
  MAX_CONTENT_TYPE_LENGTH = 40;
  ASSET_CURSOR_RE = /^[A-Za-z0-9_=-]{1,4096}$/;
  ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;
  CONTENT_TYPE_RE = /^[a-z0-9]{1,24}\/[a-z0-9.+-]{1,80}$/;
  MAX_COPY_ASSET_IDS = 10;
  MAX_UPLOAD_FILE_PATHS = 25;
  MAX_UPLOAD_PATH_LENGTH = 1024;
  uploadedAssetSchema = DoctorLazy(() =>
    create({
      opaque_id: create_2().regex(ASSET_ID_RE),
      url: create_2().optional().catch(undefined),
      size_bytes: create_3().int().nonnegative(),
      content_type: create_2().regex(CONTENT_TYPE_RE),
      sha256: create_2().regex(SHA256_HEX_RE).optional(),
    }),
  );
  assetListSchema = DoctorLazy(() =>
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
  assetDeleteSchema = DoctorLazy(() =>
    create({
      deleted: create_6(),
    }),
  );
  assetErrorSchema = DoctorLazy(() =>
    create({
      error: create({
        code: create_2(),
        message: create_2().optional(),
      }),
    }),
  );
  relayErrorSchema = DoctorLazy(() =>
    create({
      error: create_2(),
      reason: create_2(),
    }),
  );
  MAX_RETRY_AFTER_MS = 20000;
  ASSET_REQUEST_TIMEOUT_MS = 30000;
  UPLOAD_TAIL_FLOOR_MS = 90000;
});
//@ chunk-f9dqjjrc.js:9310-9367 placement
/**
 * 资源上传接口路径。
 */
function agentUploadRoute(slug) {
  return `/api/frame/blob/${slug}/agent-upload`;
}
//@ chunk-f9dqjjrc.js:9367-9422 placement
/**
 * 资源列表接口路径。
 */
function agentListRoute(slug) {
  return `/api/frame/blob/${slug}/agent-list`;
}
//@ chunk-f9dqjjrc.js:9422-9486 placement
/**
 * 资源删除接口路径。
 */
function agentDeleteRoute(slug, id) {
  return `/api/frame/blob/${slug}/${id}/agent-delete`;
}
//@ chunk-f9dqjjrc.js:9486-9541 placement
/**
 * 资源复制接口路径。
 */
function agentCopyRoute(slug) {
  return `/api/frame/blob/${slug}/agent-copy`;
}
//@ chunk-f9dqjjrc.js:9541-10897 placement
function classifyAssetApiError(status, data) {
  let parsed = assetErrorSchema().safeParse(data);
  if (parsed.success) {
    let code = parsed.data.error.code;
    if (ASSET_API_ERROR_CODES.has(code)) {
      let detailText = parsed.data.error.message && sanitizeAssetMessage(parsed.data.error.message);
      return {
        code,
        reason: code,
        ...(detailText && {
          detail: detailText,
        }),
      };
    }
    return {
      code: "upstream_error",
      reason: "unknown_code",
    };
  }
  if (status === 403 || status === 503) {
    let relayParsed = relayErrorSchema().safeParse(data);
    if (relayParsed.success)
      return {
        code: "policy_denied",
        reason: "policy_denied",
        detail: sanitizeAssetMessage(relayParsed.data.error),
      };
  }
  if (status === 403) {
    if (typeof data === "string" && data.trim() === "not a writer")
      return {
        code: "not_writer",
        reason: "not_writer",
      };
    if (typeof data === "string" && /^\s*</.test(data))
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
    return typeof data === "string" && data.trim() === "not found"
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
//@ chunk-f9dqjjrc.js:10897-10966 placement
/**
 * 去掉控制字符并截断的资产消息。
 */
function sanitizeAssetMessage(message) {
  return truncateToLength(message.replace(/[\p{Cc}\p{Cf}\p{Co}]/gu, " "), 200);
}
//@ chunk-f9dqjjrc.js:10966-13720 placement
function describeAssetFailure(code, detail, verb = "upload", cause) {
  let lead = `asset ${verb} failed (${code})`;
  switch (code) {
    case "invalid_request":
      return `${lead}: ${detail ?? "the server could not accept the request as shaped"}`;
    case "too_large":
      return `${lead}: ${detail ?? "rejected as too large by the server or an intermediary although under the client limit \u2014 compress or split it"}`;
    case "unsupported_type":
      return `${lead}: ${detail ?? `only these file types are accepted: ${joined}`}`;
    case "quota_or_state":
      return `${lead}: ${detail ?? (verb === "upload" || verb === "copy" ? "the Artifact cannot take uploads right now \u2014 it is a live document, unpublished, retired, being deleted, or over its asset storage quota" : "the Artifact has no asset store right now \u2014 it is a live document, unpublished, retired, or being deleted")}`;
    case "rate_limited":
      return `${lead}: calling too often \u2014 wait${detail ? ` ${detail}` : ""} before retrying, and never loop`;
    case "upstream_auth":
      return `${lead}: could not authenticate \u2014 the session's credential may need a refresh; try again`;
    case "capability_disabled":
      return `${lead}: the Artifact's published version does not declare the assets capability \u2014 republish it with assets: {} added to its declared capabilities, then retry`;
    case "store_unavailable":
      return `${lead}: ${detail ?? `the asset store is unavailable right now \u2014 retry once after a short wait${verb === "upload" ? " (an upload that timed out upstream may already be stored; a duplicate costs only quota)" : ""}`}`;
    case "upstream_error":
      return `${lead}: unexpected answer from the server${detail ? ` (${detail})` : ""}`;
    case "not_found":
      return verb === "copy" && cause === "not_found"
        ? `${lead}: the SOURCE Artifact (from_url) does not exist, is not one this session can open, or cannot be copied from \u2014 the cases are deliberately indistinguishable; check from_url with action "list", scope "shared"`
        : `${lead}: no such Artifact, or artifact assets are not available to this account or Artifact \u2014 the cases are deliberately indistinguishable; check the url with action "list"`;
    case "asset_not_found":
      return `${lead}: ${detail ?? "the source Artifact holds no asset with one of the given ids"} \u2014 run action "list_assets" on from_url for its current ids; nothing was copied`;
    case "not_copyable":
      return `${lead}: ${detail ?? "this source cannot be copied from"}; nothing was copied`;
    case "not_writer":
      return `${lead}: this account can open the Artifact but not edit it \u2014 only writers can ${verb === "copy" ? "copy assets into it" : `${verb} assets`}`;
    case "credential_rejected":
      return `${lead}: the server refused this session's credential at the asset door \u2014 not an access or existence answer; report this as a client/server integration fault${detail ? ` (${detail})` : ""}`;
    case "policy_denied":
      return `${lead}: ${detail ?? "blocked by the organization's artifact policy"}`;
    case "unavailable_to_account":
      return `${lead}: artifact assets are not available to this account`;
  }
}
//@ chunk-f9dqjjrc.js:13720-13809 placement
/**
 * 生成资产错误：按错误码给出描述并记录遥测。
 */
function assetErrorFactory(log, verb) {
  return (code, reason, detail) => {
    log(reason);
    return {
      kind: "error",
      code,
      message: describeAssetFailure(code, detail, verb, reason),
      reason,
    };
  };
}
//@ chunk-f9dqjjrc.js:13809-13996 placement
var AGENT_ASSETS_DISABLED_MESSAGE =
  "asset uploads, copies, listing, and deletes from an agent session (one with no user account) aren't enabled on the server for this organization; retrying from here will not help";
//@ chunk-f9dqjjrc.js:13996-17923 placement
/**
 * Artifact 资源上传/复制/列表/删除只能在中继可用时运行，否则给出原因
 */
async function assetRelayUnavailableReason(request, signal) {
  let { verb, route, body, contentType, marks, fail } = request;
  let replied = (failure) => ({
    replied: false,
    failure,
  });
  let maySendDirect = agentSessionMaySendDirect();
  if (maySendDirect) marks.agent_direct = true;
  let relayOffered = frameRelayOffered() || (frameRelayBinds() && accountBotMayRelay(BLOBS_RELAY_FAMILY));
  let relayEligible = !maySendDirect && relayOffered && !relayDeclined(BLOBS_RELAY_FAMILY);
  let needsRelay = (!maySendDirect && !relayOffered && frameRelayBinds()) || relayEligible;
  let relayRefusal = () =>
    replied(
      fail(
        "store_unavailable",
        "relay_unavailable",
        "asset uploads, copies, listing, and deletes run only from a local session or an Anthropic-hosted cloud session with its gateway relay enabled; retrying from here will not help",
      ),
    );
  if (!needsRelay && !maySendDirect && env.CLAUDE_CODE_REMOTE) return relayRefusal();
  if (needsRelay && !frameVerbRelayActive(BLOBS_RELAY_FAMILY))
    return replied(
      fail(
        "store_unavailable",
        "relay_not_served",
        "asset uploads, copies, listing, and deletes aren't available from this kind of session; retrying from here will not help",
      ),
    );
  let liveState = getLiveState();
  if (!liveState.assetsOnRoster) {
    let epoch = liveState.accountEpoch;
    let rosterMissing = liveState.roster === undefined;
    let roster =
      liveState.roster ??
      (await resolveContract({
        timeoutMs: 5000,
        signal,
        credentials: request.credentials,
      }));
    if ("err" in roster) marks[`roster_${roster.cause}`] = true;
    else if (
      rosterMissing &&
      !saveRosterToConfig({
        session: liveState,
        epoch,
        roster,
        storageV5: undefined,
      }).adopted
    )
      marks.roster_outlived = true;
    else if (!roster.capabilities.includes("assets"))
      if (!needsRelay) return replied(fail("unavailable_to_account", "roster_no_assets"));
      else marks.roster_no_assets = true;
  }
  let fetchOptions = {
    maxRedirects: 0,
    headers: {
      ...buildFrameHeaders(),
      "Content-Type": contentType,
      Accept: "application/json",
    },
    ...(request.verb === "upload"
      ? {
          streamUpload: {
            tailFloorMs: () => UPLOAD_TAIL_FLOOR_MS,
            onSettled: (settlement) => {
              if (settlement.stalled) marks.stalled = true;
            },
          },
        }
      : {
          timeout: request.timeoutMs,
        }),
    ...(request.maxBodyLength !== undefined && {
      maxBodyLength: request.maxBodyLength,
    }),
    maxContentLength: 262144,
    validateStatus: () => true,
    signal,
  };
  let send = async () =>
    needsRelay
      ? (await sendRelayed("POST", route, body, fetchOptions, BLOBS_RELAY_FAMILY)).res
      : apiClient.post(route, body, {
          ...fetchOptions,
          host: "frame",
          auth: "claude-ai-oauth",
          refreshOAuth: true,
          credentials: request.credentials,
        });
  let response;
  try {
    if (relayEligible && request.verb === "upload" && !relayVouched(BLOBS_RELAY_FAMILY)) {
      let probeResponse;
      try {
        probeResponse = (
          await sendRelayed(
            "POST",
            request.probeRoute,
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
              signal,
            },
            BLOBS_RELAY_FAMILY,
          )
        ).res;
      } catch (error) {
        if (isCancel(error) || error instanceof AbortError) throw error;
        declineRelay(BLOBS_RELAY_FAMILY, true);
        return replied(
          fail(
            "store_unavailable",
            "probe_request_error",
            "the session gateway did not answer; nothing was uploaded \u2014 one retry is safe",
          ),
        );
      }
      let verdict = classifyGatewayAnswer(probeResponse);
      if (verdict.refused) {
        declineRelay(BLOBS_RELAY_FAMILY);
        return relayRefusal();
      }
      if (!verdict.vouched) {
        if (!probeResponse.ok || probeResponse.status >= 500 || probeResponse.status === 499)
          declineRelay(BLOBS_RELAY_FAMILY, true);
        return replied(
          fail(
            "store_unavailable",
            "probe_unvouched",
            "the session gateway could not confirm the asset route; nothing was uploaded \u2014 retry later",
          ),
        );
      }
      markRelayServed(BLOBS_RELAY_FAMILY);
    }
    let handleResponse = (res) => {
      if (!relayEligible) return false;
      let verdict = classifyGatewayAnswer(res);
      if (verdict.refused && !(res.ok && res.status === 413)) {
        declineRelay(BLOBS_RELAY_FAMILY);
        clearRelayVouch(BLOBS_RELAY_FAMILY);
        return true;
      }
      if (verdict.vouched) markRelayServed(BLOBS_RELAY_FAMILY);
      else if (!relayVouched(BLOBS_RELAY_FAMILY) && (!res.ok || res.status >= 500 || res.status === 499))
        declineRelay(BLOBS_RELAY_FAMILY, true);
      return false;
    };
    response = await send();
    if (handleResponse(response)) return relayRefusal();
    if (
      response.ok &&
      (response.status === 429 || response.status === 503) &&
      classifyAssetApiError(response.status, response.data).code !== "policy_denied"
    ) {
      let retryAfterHeader = response.response.headers?.["retry-after"];
      let retryAfterMs = parseRetryAfterMs(
        typeof retryAfterHeader === "string" ? retryAfterHeader : undefined,
      );
      if (retryAfterMs !== undefined && retryAfterMs <= MAX_RETRY_AFTER_MS) {
        await sleep(retryAfterMs, signal);
        if (signal.aborted) throw new AbortError();
        marks.retried = true;
        response = await send();
        if (handleResponse(response)) return relayRefusal();
      }
    }
  } catch (error) {
    if (isCancel(error) || error instanceof AbortError) throw error;
    if (relayEligible && !relayVouched(BLOBS_RELAY_FAMILY)) declineRelay(BLOBS_RELAY_FAMILY, true);
    if (findProxyError(error) !== undefined)
      return replied(
        fail(
          "store_unavailable",
          "proxy_refused",
          "a network proxy refused the connection; nothing was sent \u2014 one retry is safe",
        ),
      );
    return replied(
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
  if (!response.ok)
    return replied({
      ...fail("store_unavailable", response.reason.replace(/-/g, "_")),
      message:
        response.reason === "no-auth"
          ? needsRelay
            ? noGatewayCredentialMessage(response.detail)
            : describeArtifactAuthFailure(response.detail)
          : `asset ${verb} unavailable: ${response.reason}`,
    });
  if (
    maySendDirect &&
    response.status === 403 &&
    classifyAssetApiError(response.status, response.data).reason === "credential_rejected"
  )
    return replied({
      ...fail("credential_rejected", "agent_not_enabled"),
      message: `asset ${verb} failed (credential_rejected): ${AGENT_ASSETS_DISABLED_MESSAGE}`,
    });
  return {
    replied: true,
    status: response.status,
    data: response.data,
    retryAfter: response.response.headers?.["retry-after"],
  };
}
//@ chunk-f9dqjjrc.js:17923-18148 placement
/**
 * 把资源 API 的 HTTP 失败按 classifyAssetApiError 分类，并用回调 r 生成错误（rate_limited 附重试秒数，upstream_error 附 HTTP 状态）。
 */
function assetApiFailure(response, makeError) {
  let { code, reason, detail } = classifyAssetApiError(response.status, response.data);
  let retryAfterMs = parseRetryAfterMs(response.retryAfter);
  return makeError(
    code,
    reason,
    code === "rate_limited"
      ? retryAfterMs !== undefined
        ? `${Math.max(1, Math.ceil(retryAfterMs / 1000))}s`
        : undefined
      : code === "upstream_error" && detail === undefined
        ? `HTTP ${response.status}`
        : detail,
  );
}
//@ chunk-f9dqjjrc.js:18148-19529 placement
async function uploadArtifactAsset(request, signal) {
  let { slug, bytes, contentType } = request;
  let telemetry = {};
  let fail = assetErrorFactory(
    (reason) => logFeatureBad("artifact_asset_upload", reason, telemetry),
    "upload",
  );
  if (!ARTIFACT_SLUG_RE.test(slug)) return fail("invalid_request", "invalid_slug", "not a valid artifact id");
  let maxBytes = maxAssetBytesFor(contentType);
  if (bytes.length === 0 || bytes.length > maxBytes)
    return bytes.length === 0
      ? fail("invalid_request", "size", "the file is empty")
      : fail(
          "too_large",
          "size",
          contentType === SVG_MIME_TYPE
            ? `the SVG exceeds the ${maxBytes >> 20} MiB limit for SVG assets \u2014 simplify or rasterize it`
            : `the file exceeds the ${maxBytes >> 20} MiB per-asset limit \u2014 compress or split it`,
        );
  let relayUnavailable = await assetRelayUnavailableReason(
    {
      verb: "upload",
      route: agentUploadRoute(slug),
      probeRoute: agentListRoute(slug),
      body: bytes,
      contentType,
      maxBodyLength: MAX_FRAME_RESPONSE_BYTES + 4096,
      marks: telemetry,
      fail,
      credentials: request.credentials,
    },
    signal,
  );
  let withResent = (failure) =>
    telemetry.retried === true
      ? {
          ...failure,
          resent: true,
        }
      : failure;
  if (!relayUnavailable.replied) return withResent(relayUnavailable.failure);
  if (relayUnavailable.status !== 200) return withResent(assetApiFailure(relayUnavailable, fail));
  let parsed = uploadedAssetSchema().safeParse(relayUnavailable.data);
  if (
    !parsed.success ||
    parsed.data.content_type !== contentType ||
    (contentType === SVG_MIME_TYPE
      ? parsed.data.size_bytes === 0 || parsed.data.size_bytes > MAX_FRAME_RESPONSE_BYTES
      : parsed.data.size_bytes !== bytes.length)
  )
    return withResent(
      fail(
        "upstream_error",
        "malformed_echo",
        "the upload probably succeeded but the reply was unreadable \u2014 retry at most once; if it repeats, stop and report it",
      ),
    );
  getLiveState().assetsOnRoster = true;
  logFeatureOk("artifact_asset_upload", {
    ...telemetry,
    size_bytes: parsed.data.size_bytes,
  });
  return {
    kind: "ok",
    id: parsed.data.opaque_id,
    url: assetBlobUrl(parsed.data.opaque_id, parsed.data.url),
    sizeBytes: parsed.data.size_bytes,
    contentType: parsed.data.content_type,
    ...(parsed.data.sha256 !== undefined && {
      sha256: parsed.data.sha256,
    }),
    ...(telemetry.retried === true && {
      resent: true,
    }),
  };
}
//@ chunk-f9dqjjrc.js:19529-20823 placement
async function listArtifactAssets(request, signal) {
  let { slug, after } = request;
  let telemetry = {};
  let fail = assetErrorFactory((code) => logFeatureBad("artifact_asset_list", code, telemetry), "list");
  if (!ARTIFACT_SLUG_RE.test(slug)) return fail("invalid_request", "invalid_slug", "not a valid artifact id");
  if (after !== undefined && !ASSET_CURSOR_RE.test(after))
    return fail(
      "invalid_request",
      "invalid_cursor",
      "after must be the next value from an earlier list_assets result",
    );
  let response = await assetRelayUnavailableReason(
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
      marks: telemetry,
      fail,
      credentials: request.credentials,
    },
    signal,
  );
  if (!response.replied) return response.failure;
  if (response.status !== 200) return assetApiFailure(response, fail);
  let parsed = assetListSchema().safeParse(response.data);
  if (!parsed.success) return fail("upstream_error", "malformed_reply", "the listing was unreadable");
  getLiveState().assetsOnRoster = true;
  foldBootCowritten(slug, parsed.data.cowritten);
  foldBootOutsideWriter(slug, parsed.data.outside_writer);
  logFeatureOk("artifact_asset_list", {
    ...telemetry,
    count: parsed.data.assets.length,
  });
  return {
    kind: "ok",
    assets: parsed.data.assets.map((asset) => ({
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
      files: parsed.data.usage.files,
      bytes: parsed.data.usage.bytes,
      maxFiles: parsed.data.usage.max_files,
      maxBytes: parsed.data.usage.max_bytes,
    },
    ...(parsed.data.next !== undefined && {
      next: parsed.data.next,
    }),
    ...(parsed.data.cowritten && {
      cowritten: true,
    }),
    ...(parsed.data.outside_writer !== undefined && {
      outsideWriter: parsed.data.outside_writer,
    }),
  };
}
//@ chunk-f9dqjjrc.js:20823-21592 placement
async function deleteArtifactAsset(request, signal) {
  let { slug, id } = request;
  let telemetry = {};
  let fail = assetErrorFactory((code) => logFeatureBad("artifact_asset_delete", code, telemetry), "delete");
  if (!ARTIFACT_SLUG_RE.test(slug)) return fail("invalid_request", "invalid_slug", "not a valid artifact id");
  if (!ASSET_ID_RE.test(id)) return fail("invalid_request", "invalid_id", "not a valid asset id");
  let response = await assetRelayUnavailableReason(
    {
      verb: "delete",
      route: agentDeleteRoute(slug, id),
      body: "{}",
      contentType: "application/json",
      timeoutMs: ASSET_REQUEST_TIMEOUT_MS,
      marks: telemetry,
      fail,
      credentials: request.credentials,
    },
    signal,
  );
  if (!response.replied) return response.failure;
  if (response.status !== 200) return assetApiFailure(response, fail);
  let parsed = assetDeleteSchema().safeParse(response.data);
  if (!parsed.success)
    return fail(
      "upstream_error",
      "malformed_reply",
      "the delete may have succeeded but the reply was unreadable \u2014 list the assets to check",
    );
  getLiveState().assetsOnRoster = true;
  logFeatureOk("artifact_asset_delete", {
    ...telemetry,
    deleted: parsed.data.deleted,
  });
  return {
    kind: "ok",
    deleted: parsed.data.deleted,
  };
}
//@ chunk-f9dqjjrc.js:21592-21680 placement
/**
 * 复制资源的响应 schema 与请求超时。
 */
var copyAssetsResponseSchema; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var COPY_ASSETS_TIMEOUT_MS;
deferInit("chunk-f9dqjjrc.js:21592", () => {
  copyAssetsResponseSchema = DoctorLazy(() =>
    create({
      assets: create_15(
        uploadedAssetSchema().extend({
          from_id: create_2().regex(ASSET_ID_RE),
        }),
      ).max(MAX_COPY_ASSET_IDS),
    }),
  );
  COPY_ASSETS_TIMEOUT_MS = 120000;
});
//@ chunk-f9dqjjrc.js:21680-23323 placement
async function copyArtifactAsset(request, signal) {
  let { slug, fromSlug, ids } = request;
  let crossOrg = request.crossOrgOk === true;
  let telemetry = {};
  let fail = assetErrorFactory((code) => logFeatureBad("artifact_asset_copy", code, telemetry), "copy");
  if (!ARTIFACT_SLUG_RE.test(slug) || !ARTIFACT_SLUG_RE.test(fromSlug))
    return fail("invalid_request", "invalid_slug", "not a valid artifact id");
  if (slug === fromSlug)
    return fail(
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
    return fail(
      "invalid_request",
      "invalid_ids",
      `asset_ids must be 1\u2013${MAX_COPY_ASSET_IDS} distinct asset ids`,
    );
  let response = await assetRelayUnavailableReason(
    {
      verb: "copy",
      route: agentCopyRoute(slug),
      body: jsonStringify({
        from: fromSlug,
        ids,
        ...(crossOrg && {
          cross_org_ok: true,
        }),
      }),
      contentType: "application/json",
      timeoutMs: COPY_ASSETS_TIMEOUT_MS,
      marks: telemetry,
      fail,
      credentials: request.credentials,
    },
    signal,
  );
  if (!response.replied) return response.failure;
  if (response.status !== 200)
    return crossOrg &&
      response.status === 400 &&
      classifyAssetApiError(400, response.data).detail === "invalid request body"
      ? fail(
          "not_copyable",
          "predates_cross_org",
          "this server doesn't support copying from another organization's artifact yet, so don't retry the copy, and tell the user cross-organization copies aren't supported yet",
        )
      : assetApiFailure(response, fail);
  let parsed = copyAssetsResponseSchema().safeParse(response.data);
  if (
    !parsed.success ||
    parsed.data.assets.length !== ids.length ||
    parsed.data.assets.some((asset, result) => asset.from_id !== ids[result])
  )
    return fail(
      "upstream_error",
      "malformed_reply",
      'the copy probably succeeded but the reply was unreadable \u2014 run action "list_assets" on the destination before retrying, or the assets may be copied twice',
    );
  getLiveState().assetsOnRoster = true;
  logFeatureOk("artifact_asset_copy", {
    ...telemetry,
    count: ids.length,
  });
  return {
    kind: "ok",
    assets: parsed.data.assets.map((asset) => ({
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
//@ chunk-f9dqjjrc.js:23323-23335 placement
var ASSET_LIST_TIMEOUT_MS = 90000;
//@ chunk-f9dqjjrc.js:23335-23393 placement
/**
 * 由 MIME 类型反查扩展名。
 */
function extensionForMimeType(mimeType) {
  for (let [extension, typeForExt] of ASSET_MIME_TYPES) if (typeForExt === mimeType) return extension;
  return;
}
//@ chunk-f9dqjjrc.js:23393-23546 placement
var ASSET_READ_UNAVAILABLE_MESSAGE =
  "asset reads run only from a local session or an Anthropic-hosted cloud session with its gateway relay enabled; retrying from here will not help";
//@ chunk-f9dqjjrc.js:23546-29131 placement
/**
 * 读取 Artifact 资源（artifact_asset_read）
 */
async function readArtifactAsset(
  target,
  assetId,
  signal,
  credentials,
  { admitPublicRead, probeToolUseId } = {},
) {
  let failAssetRead = (reason, detail) => {
    logFeatureBad("artifact_asset_read", reason);
    return {
      kind: "error",
      message: `asset read failed: ${detail}`,
      reason,
    };
  };
  if (!ARTIFACT_SLUG_RE.test(target.slug)) return failAssetRead("invalid_slug", "not a valid artifact id");
  if (!ASSET_ID_RE.test(assetId)) return failAssetRead("invalid_id", "not a valid asset id");
  let runnerDirect = runnerAgentMayReadFilesDirect();
  let agentDirect = agentSessionMaySendDirect();
  let needsRelay =
    !runnerDirect && (frameRelayBinds() || (frameRelayOffered() && !relayDeclined(ARTIFACT_MOUNT)));
  if (!needsRelay && !runnerDirect && env.CLAUDE_CODE_REMOTE)
    return failAssetRead("relay_unavailable", ASSET_READ_UNAVAILABLE_MESSAGE);
  let boot = await fetchBoot(target, "artifact_asset_read", signal, {
    gatePublicRead: false,
    credentials,
    probeToolUseId,
  });
  if (boot.err !== null)
    return {
      kind: "error",
      message: boot.err.replace(/^artifact read/, "asset read"),
      reason: boot.status === 404 ? "boot_404" : "boot",
    };
  let { ver, assetToken } = boot;
  let tokenless = assetToken === undefined;
  if (tokenless && !isFramePublicReadEnabled())
    return failAssetRead(
      "tokenless",
      "this artifact is served to you as a public (non-member) reader, and assets are not readable that way",
    );
  if (tokenless && admitPublicRead?.() !== true) {
    logFeatureSad("artifact_asset_read", PUBLIC_READ_UNASKED_REASON);
    return {
      kind: "error",
      reason: PUBLIC_READ_UNASKED_REASON,
      message: `asset read failed: ${PUBLIC_READ_UNASKED_WORDS}`,
    };
  }
  let viaMountRelay = needsRelay && !tokenless;
  let path = `/_f/${ver}/_blob/${assetId}`;
  let contentHostName = `frame.${target.env === "staging" ? "staging." : ""}claudeusercontent.com`;
  let { host, base, headers } = contentHostRequestBase(target);
  let egressBlocked = () => {
    getLiveState().contentHostEgressDenied.add(target.env);
    return failAssetRead(
      "egress_blocked",
      `this environment's network allowlist blocks ${host}, so the asset cannot be fetched (access to the artifact itself is fine). ${tokenless ? `Public artifacts from outside your organization are fetched from that host directly, so it must be on this session's network allowlist. ${contentHostAllowlistRemedy(target.env)}` : env.CLAUDE_CODE_REMOTE ? "This is a restriction of where this session runs; retrying from here will not help." : `To allow it, add *.${contentHostName} to the network allowlist this session runs behind (the sandbox's allowed domains, or the Claude desktop app's network settings).`}`,
    );
  };
  let egressProxyDenied = (status, denialReason) => {
    logForDebugging(`[artifact] asset fetch: egress proxy denied (${denialReason})`);
    return failAssetRead(
      "egress_denied",
      `artifact content fetch refused by the environment's egress proxy (${describeHttpStatus(status)})`,
    );
  };
  let proxyRefused = (connectStatus, marker) => {
    if (marker !== undefined) logForDebugging(`[artifact] asset fetch: proxy refused, marker ${marker}`);
    return failAssetRead(
      "proxy_refused",
      `the proxy refused the connection to the artifact's content host (${describeHttpStatus(connectStatus)})`,
    );
  };
  let answeredViaFrame = false;
  let frameResponse;
  if (!viaMountRelay && assetToken !== undefined && frameContentRoute(boot.data)) {
    try {
      frameResponse = await getFromFrameContent(target.slug, path, {
        token: assetToken,
        timeout: ASSET_LIST_TIMEOUT_MS,
        maxContentLength: MAX_FRAME_RESPONSE_BYTES + 1,
        signal,
        credentials,
      });
    } catch (error) {
      if (isCancel(error) || error instanceof AbortError) throw error;
      return failAssetRead(
        "request_error",
        `the content fetch failed in transit, timed out, or exceeded the ${MAX_FRAME_RESPONSE_BYTES >> 20} MiB limit`,
      );
    }
    answeredViaFrame = frameResponse.kind === "answer";
  }
  let response;
  try {
    if (frameResponse?.kind === "answer") response = frameResponse;
    else if (viaMountRelay) {
      if (assetToken === undefined)
        return failAssetRead(
          "internal",
          "internal error: a public artifact read was routed where it cannot be served \u2014 this is a bug in this build; do not retry",
        );
      let uploadResult = await getFromArtifactMount(target.slug, path, {
        token: assetToken,
        timeout: ASSET_LIST_TIMEOUT_MS,
        maxContentLength: MAX_FRAME_RESPONSE_BYTES + 1,
        signal,
        retryBudget: mountRetryBudget(),
      });
      if (!uploadResult.ok)
        return failAssetRead(
          uploadResult.reason.replace(/-/g, "_"),
          uploadResult.reason === "no-auth"
            ? noGatewayCredentialMessage(uploadResult.detail)
            : `artifact content is unreachable from this session (${uploadResult.reason})`,
        );
      response = {
        status: uploadResult.status,
        headers: uploadResult.response.headers,
        data: uploadResult.data,
      };
    } else {
      let tokenQuery = assetToken === undefined ? "" : `?__frame_t=${encodeURIComponent(assetToken)}`;
      let httpResponse = await externalHttp.get(`${base}${path}${tokenQuery}`, {
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
      if (isAllowlistBlockedResponse(httpResponse.status, httpResponse.headers)) return egressBlocked();
      let denyReason = proxyDenyReason(httpResponse.headers);
      if (denyReason !== undefined && (httpResponse.status < 200 || httpResponse.status >= 300))
        return egressProxyDenied(httpResponse.status, denyReason);
      getLiveState().contentHostEgressDenied.delete(target.env);
      response = {
        status: httpResponse.status,
        headers: httpResponse.headers,
        data: httpResponse.data,
      };
    }
  } catch (error) {
    if (isCancel(error) || error instanceof AbortError) throw error;
    if (viaMountRelay) mountHopFailedForRunner();
    let proxyError = viaMountRelay ? undefined : findProxyError(error);
    if (proxyError !== undefined) {
      if (isAllowlistBlockedResponse(proxyError.connectStatus, proxyError.headers)) return egressBlocked();
      let catchDenyReason = proxyDenyReason(proxyError.headers);
      if (catchDenyReason !== undefined) return egressProxyDenied(proxyError.connectStatus, catchDenyReason);
      return proxyRefused(proxyError.connectStatus, proxyErrorCode(proxyError.headers));
    }
    return failAssetRead(
      "request_error",
      `the content fetch failed in transit, timed out, or exceeded the ${MAX_FRAME_RESPONSE_BYTES >> 20} MiB limit`,
    );
  }
  if (viaMountRelay && mountDeclinedForRunner(response.status))
    return failAssetRead("relay_unavailable", ASSET_READ_UNAVAILABLE_MESSAGE);
  if (viaMountRelay && isMountNetworkOffRefusal(response.status, response.data))
    return failAssetRead("network_off", `${MOUNT_NETWORK_OFF_WORDS}; retrying from here will not help`);
  if (viaMountRelay && isUnavailableStatus(response.status))
    return failAssetRead(`http_${response.status}`, mountUnavailableWords(response.status));
  if (viaMountRelay) mountHopFailedForRunner(response.status);
  if (response.status === 404)
    return failAssetRead(
      "http_404",
      viaMountRelay
        ? `not found through this cloud session's artifact mount \u2014 no asset has that id, or asset reads are not enabled for this session yet; a writer of the artifact can tell which with action "list_assets"`
        : 'no asset with that id in this artifact (it may have been deleted) \u2014 a writer of the artifact can check the id with action "list_assets"',
    );
  if (
    tokenless &&
    response.status === 403 &&
    isForbiddenProxy(
      response.headers,
      proxyDenialResult(response.headers, response.data, (value) => value),
    )
  )
    return failAssetRead(
      "public_refused",
      "this public artifact serves no asset with that id to readers outside its organization, or it is no longer public",
    );
  let denialCode = viaMountRelay
    ? undefined
    : logProxyDenial({
        status: response.status,
        headers: response.headers,
        data: response.data,
        redact: (text) => redactAssetToken(text, assetToken),
        label: "[artifact] asset fetch",
      });
  if (denialCode !== undefined) return failAssetRead(denialCode, ARTIFACT_PROXY_DENIAL_TEXTS[denialCode]);
  if (response.status === 401 || response.status === 403)
    return failAssetRead(
      `http_${response.status}`,
      viaMountRelay
        ? "the cloud session's artifact mount refused the read \u2014 asset reads may not be enabled for this session, or the artifact was unshared or taken down"
        : "access to the artifact content was refused \u2014 the artifact may have been unshared or taken down since the id was listed",
    );
  if (response.status !== 200)
    return failAssetRead(
      `http_${response.status}`,
      `unexpected answer from the ${answeredViaFrame ? "artifact service" : "content host"} (HTTP ${response.status})`,
    );
  if (viaMountRelay) markRelayServed(ARTIFACT_MOUNT);
  let headers_2 = response.headers;
  let contentTypeHeader =
    viaMountRelay || answeredViaFrame ? passthroughContentType(headers_2) : headers_2?.["content-type"];
  let contentType =
    typeof contentTypeHeader === "string" ? firstLineOf(contentTypeHeader, ";").trim().toLowerCase() : "";
  if (extensionForMimeType(contentType) === undefined)
    return failAssetRead(
      "unexpected_type",
      `the ${answeredViaFrame ? "artifact service" : "content host"} served a type this tool does not save`,
    );
  let buffer = Buffer.from(response.data ?? new ArrayBuffer(0));
  if (buffer.length === 0 || buffer.length > MAX_FRAME_RESPONSE_BYTES)
    return failAssetRead(
      "size",
      buffer.length === 0
        ? "the asset is empty"
        : `the asset exceeds the ${MAX_FRAME_RESPONSE_BYTES >> 20} MiB limit`,
    );
  return {
    kind: "ok",
    bytes: buffer,
    contentType,
    relay: viaMountRelay,
    agentDirect,
    publicRead: tokenless,
  };
}
//@ chunk-xzmy9dn4.js:297796-297866 placement
var FILE_PATHS_LIST_MESSAGE; // deferred: uses SHA256_HEX_RE of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xzmy9dn4.js:297796", () => {
  FILE_PATHS_LIST_MESSAGE = `\`file_paths\` must be a list of 1 to ${MAX_UPLOAD_FILE_PATHS} local file paths`;
});
//@ chunk-xzmy9dn4.js:297866-298563 placement
/**
 * 解析 upload_asset 的 file_path / file_paths：单个、列表或 invalid（缺参数、两者同传、列表为空或超过 qL、元素非字符串）。
 */
function parseUploadPaths(input) {
  let record = input;
  let { file_path: filePath, file_paths: filePaths } = record;
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
  let paths = [];
  for (let untrusted of untrustedArray) {
    if (typeof untrusted !== "string" || untrusted === "")
      return {
        kind: "invalid",
        problem: `${FILE_PATHS_LIST_MESSAGE}.`,
      };
    paths.push(untrusted);
  }
  return {
    kind: "list",
    paths,
  };
}
//@ chunk-xzmy9dn4.js:298563-298994 placement
/**
 * 资源上传失败分类：单个文件即判定失败的代码、终止整次上传的代码、relay 不可用原因，以及上传结果行的长度与失败行数上限。
 */
var SINGLE_UPLOAD_FAILURE_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var FINAL_UPLOAD_FAILURE_CODES;
var RELAY_UNAVAILABLE_REASONS;
var UPLOAD_LINE_MAX;
var MAX_UPLOAD_FAILURE_LINES;
deferInit("chunk-xzmy9dn4.js:298563", () => {
  SINGLE_UPLOAD_FAILURE_CODES = new Set(["invalid_request", "too_large", "unsupported_type"]);
  FINAL_UPLOAD_FAILURE_CODES = new Set([
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
  RELAY_UNAVAILABLE_REASONS = new Set([
    "relay_unavailable",
    "relay_not_served",
    "probe_request_error",
    "probe_unvouched",
    "proxy_refused",
    "unrouted",
    "no_auth",
  ]);
  UPLOAD_LINE_MAX = 1300;
  MAX_UPLOAD_FAILURE_LINES = 6;
});
//@ chunk-xzmy9dn4.js:298994-299045 placement
/**
 * 拼出「file_paths[i] "路径"」标签。
 */
function filePathIndexLabel(index, path) {
  return `file_paths[${index}] ${safeJsonQuote(path)}`;
}
//@ chunk-xzmy9dn4.js:299045-299224 placement
var UPLOAD_RATE_LIMITED_MESSAGE =
  "the store is rate limiting this artifact \u2014 wait a minute before sending the rest";
var FILE_PATHS_FROM_SCRIPT_MESSAGE =
  "`file_paths` cannot be used from a script \u2014 pass one `file_path` per call";
//@ chunk-xzmy9dn4.js:299224-300135 placement
/**
 * 逐个校验批量上传路径：不能含 NUL、类型受支持、文本类文件须单独上传、路径长度上限、不重复、解析为本地路径；返回 {sources} 或首个出错的 {index, message, errorCode}。
 */
function vetUploadPathList(paths) {
  let fail = (index, message, errorCode) => ({
    index,
    message,
    errorCode,
  });
  let seenPaths = new Set();
  let sources = [];
  for (let [index, path] of paths.entries()) {
    if (path.includes("\x00")) return fail(index, "a path cannot hold a NUL character", 8);
    let mimeType = assetMimeTypeForPath(path);
    if (mimeType === undefined)
      return fail(index, `unsupported asset type: upload_asset takes ${joined}.`, 1);
    if (isTextAssetMimeType(mimeType))
      return fail(
        index,
        "a CSV, Markdown, JSON or plain-text file is approved on its own \u2014 upload it in its own call with `file_path`; the other files can go together.",
        8,
      );
    let absolutePath = expandPath(path);
    if (path.length > MAX_UPLOAD_PATH_LENGTH || absolutePath.length > MAX_UPLOAD_PATH_LENGTH)
      return fail(
        index,
        `this path is longer than ${MAX_UPLOAD_PATH_LENGTH} characters, as written or as an absolute path, which is more than an approval can show in full \u2014 upload that file by itself with \`file_path\`.`,
        8,
      );
    if (seenPaths.has(absolutePath))
      return fail(index, "names the same file as an earlier entry \u2014 list each file once.", 8);
    seenPaths.add(absolutePath);
    let localUploadPath = resolveLocalUploadPath(absolutePath);
    if (localUploadPath.kind === "network") return fail(index, `${UPLOAD_NETWORK_PATH_MESSAGE}.`, 17);
    sources.push({
      written: path,
      sourcePath: absolutePath,
      source: localUploadPath,
    });
  }
  return {
    sources,
  };
}
//@ chunk-xzmy9dn4.js:300135-300177 placement
/**
 * 拼出「路径标签: 错误」一行。
 */
var filePathErrorLine = (paths, index, message) =>
  `${filePathIndexLabel(index, paths[index] ?? "")}: ${message}`;
//@ chunk-xzmy9dn4.js:300177-300882 placement
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
  let vetResult = vetUploadPathList(uploadPaths.paths);
  if (!("sources" in vetResult))
    return {
      result: false,
      message: filePathErrorLine(uploadPaths.paths, vetResult.index, vetResult.message),
      errorCode: vetResult.errorCode,
    };
  for (let [index, source] of vetResult.sources.entries()) {
    if (source.source.kind === "network") continue;
    let publishFile = readPublishFile(
      context,
      {
        ...input,
        file_path: source.written,
      },
      source.sourcePath,
      source.source,
      options,
      {
        maxBytes: maxAssetBytesFor(assetMimeTypeForPath(source.written)),
        notAFile: UPLOAD_NOT_REGULAR_FILE_MESSAGE,
        empty: UPLOAD_EMPTY_FILE_MESSAGE,
        noIdentity: UPLOAD_NO_FILE_IDENTITY_MESSAGE,
        tooLarge: uploadTooLargeMessage,
      },
    );
    if (publishFile.result === false)
      return {
        ...publishFile,
        message: filePathErrorLine(uploadPaths.paths, index, publishFile.message),
      };
  }
  return {
    result: true,
  };
}
//@ chunk-xzmy9dn4.js:300882-300965 placement
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
//@ chunk-xzmy9dn4.js:300965-301248 placement
function soloApprovalReason(source, check, isSolo) {
  if (!needsReadAsk(check, isSolo)) return;
  if (!check.spelledInside && check.readAsks) return "outside this session\u2019s allowed read paths";
  let alwaysReason = "a file that is always approved on its own";
  if (check.readAsks) return alwaysReason;
  let { linkNote } = describePublishPath(source.sourcePath, check);
  return linkNote !== "" ? linkNote.trim().replace(/^\(|\)$/g, "") : alwaysReason;
}
//@ chunk-xzmy9dn4.js:301248-305453 placement
async function checkUploadAssetPermissions(tool, input, context, artifactUrl) {
  let uploadPaths = parseUploadPaths(input);
  if (uploadPaths.kind !== "list")
    return denyDecision(
      uploadPaths.kind === "invalid"
        ? uploadPaths.problem
        : 'action "upload_asset" takes `file_path` (one file) or `file_paths` (several), not both.',
      "Asset upload input names its files in both fields, or in a list that cannot be read",
    );
  let pathList = vetUploadPathList(uploadPaths.paths);
  if (!("sources" in pathList))
    return denyDecision(
      filePathErrorLine(uploadPaths.paths, pathList.index, pathList.message),
      "Asset upload list holds an entry a list may not carry",
    );
  let { sources } = pathList;
  let mapped = sources.map((source) =>
    isSoloApprovalFile(source.sourcePath, source.source, probeSymlink(source.sourcePath).link),
  );
  let checkReads = (toolPermissionContext, pins) => {
    let checks = [];
    for (let [index, source] of sources.entries()) {
      let readCheck = checkPublishReadPermission(
        tool,
        {
          ...input,
          file_path: source.written,
        },
        source.sourcePath,
        source.source,
        toolPermissionContext,
        pins?.[index],
        "Uploading an asset reads file contents",
      );
      if (readCheck.refused !== undefined)
        return {
          refused:
            readCheck.refused.behavior === "deny"
              ? {
                  ...readCheck.refused,
                  message: filePathErrorLine(uploadPaths.paths, index, readCheck.refused.message),
                }
              : readCheck.refused,
        };
      checks.push(readCheck);
    }
    return {
      judged: checks,
    };
  };
  let soloDeny = (judged) => {
    let filtered = judged
      .map((check, index) => {
        let soloReason = soloApprovalReason(sources[index], check, mapped[index]);
        return soloReason === undefined
          ? undefined
          : `${filePathIndexLabel(index, sources[index].written)} (${soloReason})`;
      })
      .filter((entry) => entry !== undefined);
    let single = filtered.length === 1;
    return filtered.length === 0
      ? undefined
      : denyDecision(
          `${single ? "One file" : `${filtered.length} files`} in \`file_paths\` ${single ? "needs" : "need"} an approval of ${single ? "its" : "their"} own, so nothing was uploaded: ${filtered.join("; ")}. Upload ${single ? "it" : "each of those"} in its own call with \`file_path\`; the other files can go together in one \`file_paths\` call.`,
          "An upload list carries only files that need no approval of their own",
        );
  };
  let dupDeny = (judged) => {
    let seenPaths = new Set();
    for (let [index, check] of judged.entries()) {
      let realPath = check.sourcePin?.real ?? sources[index].sourcePath;
      if (seenPaths.has(realPath))
        return denyDecision(
          filePathErrorLine(
            uploadPaths.paths,
            index,
            "names the same file as an earlier entry \u2014 list each file once",
          ),
          "Asset upload list names one file twice",
        );
      seenPaths.add(realPath);
    }
    return;
  };
  let checksResult = checkReads(getToolPermissionContext(context));
  if ("refused" in checksResult) return checksResult.refused;
  let problem = soloDeny(checksResult.judged) ?? dupDeny(checksResult.judged);
  if (problem !== undefined) return problem;
  let pins = checksResult.judged.map((check) => check.sourcePin);
  let hasOtherComment = () => hasOtherCommentPending(artifactUrl.slug);
  let pinBuilder = (pins, otherSeq) => ({
    [ASSET_UPLOAD_PIN_TAG]: {
      slug: artifactUrl.slug,
      batch: sources.map(
        (source, index) =>
          pins[index] ?? {
            real: source.sourcePath,
            identity: null,
          },
      ),
      ...(otherSeq !== undefined && {
        otherCommentSeq: otherSeq,
      }),
    },
  });
  if (
    getToolPermissionContext(context).mode !== "auto" &&
    !hasOtherComment() &&
    (!isStrictHumanTurn(context.messages) ||
      (PLAN_MODE_KEEPS_FLAG_OFF_WRITE_ASKS && getToolPermissionContext(context).mode === "plan")) &&
    needsHumanAssetConsent(context, artifactUrl.slug)
  ) {
    let otherOrgDeny = denyOtherOrgArtifact(artifactUrl, "Nothing was uploaded");
    if (otherOrgDeny !== null) return otherOrgDeny;
    return {
      behavior: "allow",
      updatedInput: {
        ...input,
        ...pinBuilder(pins),
        [CONSENT_ASK_TAG]: false,
        [PLAN_CONSENT_ASK_TAG]: false,
      },
      decisionReason: {
        type: "other",
        reason: "Asset uploads to this artifact already approved this session",
      },
    };
  }
  await warmShareEntry(artifactUrl, context, "upload_asset");
  let otherOrgDeny = denyOtherOrgArtifact(artifactUrl, "Nothing was uploaded");
  if (otherOrgDeny !== null) return otherOrgDeny;
  let checksResultSecond = checkReads(getToolPermissionContext(context), pins);
  if ("refused" in checksResultSecond) return checksResultSecond.refused;
  let problemSecond = soloDeny(checksResultSecond.judged) ?? dupDeny(checksResultSecond.judged);
  if (problemSecond !== undefined) return problemSecond;
  let pins_2 = checksResultSecond.judged.map((pins) => pins.sourcePin);
  let mode = checksResultSecond.judged[0].mode;
  let coversSession = mode !== "auto";
  let joined = sources
    .map((source) => `"${sweptPagePath(source.sourcePath) || "(unprintable path)"}"`)
    .join(", ");
  let fileListNote = ` The ${sources.length} ${plural(sources.length, "file")}: ${joined}.`;
  let writeRuling = classifyArtifactConsent(classFactsFor("write", artifactUrl, context));
  if (!writeKeepsFlagOffAsk(writeRuling, context) && !hasOtherComment()) {
    let cardTitle = artifactCardTitleFor(artifactUrl, context);
    let classDecision = decideByClass({
      ruling: writeRuling,
      input: {
        ...input,
        ...pinBuilder(pins_2),
        [PLAN_CONSENT_ASK_TAG]: false,
        [USER_ONLY_CONSENT_ASK_TAG]: false,
        [ARTIFACT_DISPLAY_TARGET_TAG]: cardTitle,
      },
      context,
      slug: artifactUrl.slug,
      display: cardTitle,
      action: "write",
    });
    let decisionReason = classDecision.decisionReason;
    return classDecision.behavior === "ask" &&
      decisionReason !== undefined &&
      "reason" in decisionReason &&
      typeof decisionReason.reason === "string"
      ? {
          ...classDecision,
          message: `${classDecision.message}${fileListNote}`,
          decisionReason: {
            ...decisionReason,
            reason: `${decisionReason.reason}${fileListNote}`,
          },
        }
      : classDecision;
  }
  if (planConsentMustDeny(context))
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
  let isPlanMode = mode === "plan";
  let ownershipNote = ownershipAskNote(getShareEntry(artifactUrl.slug), "their artifact");
  let askedAgain = hasOtherComment() && needsHumanAssetConsent(context, artifactUrl.slug);
  let reason = `${ASSET_UPLOAD_LIST_CARD_LEDE}${fileListNote}${isPlanMode ? planModeCardNote(true) : ""}${ownershipNote}${coversSession && !askedAgain ? (artifactCopyFromFrozen() ? ASSET_UPLOAD_COVERS_SESSION_COPIES_NOTE : ASSET_UPLOAD_COVERS_SESSION_NOTE) : ""}`;
  return {
    behavior: "ask",
    message:
      `Claude wants to upload ${sources.length} local ${plural(sources.length, "file")} into the asset store of ${artifactViewerUrlFor(artifactUrl)}: ${joined} \u2014 everyone who can open the artifact can load them` +
      (!coversSession
        ? "; each such upload asks again."
        : `; approving covers further uploads ${artifactCopyFromFrozen() ? "to (and copies of other artifacts' assets into) " : "to "}this artifact ${askedAgain ? "until someone else comments on it again" : "for the rest of this session"}.`) +
      ownershipNote,
    updatedInput: {
      ...input,
      ...pinBuilder(pins_2, otherCommentPendingSeq(artifactUrl.slug)),
      [CONSENT_ASK_TAG]: coversSession && consentAskCanReachUser(context),
      [PLAN_CONSENT_ASK_TAG]: isPlanMode,
      [USER_ONLY_CONSENT_ASK_TAG]: false,
      [ARTIFACT_DISPLAY_TARGET_TAG]: artifactCardTitleFor(artifactUrl, context),
    },
    suppressAlwaysAllowRule: true,
    decisionReason: isPlanMode
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
//@ chunk-xzmy9dn4.js:305453-306540 placement
/**
 * 生成批量上传权限询问的描述：列出每个 file_paths[i] 及其解析后的绝对路径与链接提示，超出数量时汇总。
 */
function describeUploadListAsk(input, card) {
  let lead = `upload a list of local files into an artifact's asset store${card.marksBeforeTarget} \u2192 ${card.target}${card.marksAfterTarget}`;
  let untrustedArray = readUntrustedArray(input.file_paths);
  if (untrustedArray === undefined || untrustedArray === UNREADABLE_ARRAY)
    return `${lead}: ${UNREADABLE_LIST_TEXT} of paths`;
  let mapped = untrustedArray.slice(0, MAX_UPLOAD_FILE_PATHS).map((untrusted, index) => {
    let label = `file_paths[${index}]`;
    if (typeof untrusted !== "string")
      return {
        text: `${label} (not a path)`,
        noted: true,
      };
    try {
      let absolutePath = expandPath(untrusted);
      let annotations = describePathAnnotations(absolutePath);
      return {
        text: `${label} ${absolutePath === untrusted ? card.quote(untrusted) : `${card.quote(untrusted)} (at ${card.quote(absolutePath)})`}${annotations}`,
        noted: annotations !== "",
      };
    } catch {
      return {
        text: `${label} ${card.quote(untrusted)} [could not resolve this path]`,
        noted: true,
      };
    }
  });
  let filtered = mapped.filter((entry) => entry.noted);
  let hiddenCount = untrustedArray.length - mapped.length;
  let bothFieldsNote =
    input.file_path !== undefined
      ? `; also names \`file_path\`${typeof input.file_path === "string" ? ` ${card.quote(input.file_path)}` : ""}, and a call naming both is refused`
      : "";
  return `${lead} (${untrustedArray.length} ${plural(untrustedArray.length, "file")}, one approval covers them all${filtered.length > 0 ? `; ${filtered.length} ${filtered.length === 1 ? "has a note in [brackets] and is" : "have a note in [brackets] and are"} listed first` : ""}): ${[...filtered, ...mapped.filter((entry) => !entry.noted)].map((entry) => entry.text).join("; ")}${hiddenCount > 0 ? `; and ${hiddenCount} more, past the ${MAX_UPLOAD_FILE_PATHS} one call may name, not shown` : ""}${bothFieldsNote}`;
}
//@ chunk-xzmy9dn4.js:306540-306685 placement
/**
 * 本地文件列表无法显示时的描述（路径数量或占位）。
 */
function describeUploadListFallback(input) {
  let untrustedArray = readUntrustedArray(input.file_paths);
  return `a list of local files (${untrustedArray === undefined || untrustedArray === UNREADABLE_ARRAY ? UNREADABLE_LIST_TEXT : `${untrustedArray.length} paths`}, none of which could be shown)`;
}
//@ chunk-xzmy9dn4.js:306685-306742 placement
/**
 * 判断上传失败是否可重试（非终态错误码、非中继不可用）。
 */
function isRetryableUploadFailure(failure) {
  return !(FINAL_UPLOAD_FAILURE_CODES.has(failure.code) || RELAY_UNAVAILABLE_REASONS.has(failure.reason));
}
//@ chunk-xzmy9dn4.js:306742-311891 placement
async function runUploadAsset(input, context, artifactUrl) {
  let uploadPaths = parseUploadPaths(input);
  if (uploadPaths.kind !== "list")
    throw new ArtifactInputError(
      uploadPaths.kind === "invalid"
        ? uploadPaths.problem
        : 'action "upload_asset" takes `file_path` (one file) or `file_paths` (several), not both.',
      "asset_upload_missing_field",
    );
  if (context.publishSourceSha256 !== undefined)
    throw new ArtifactInputError(FILE_PATHS_FROM_SCRIPT_MESSAGE, "asset_upload_missing_field");
  let { paths } = uploadPaths;
  let pathList = vetUploadPathList(paths);
  if (!("sources" in pathList))
    throw new ArtifactInputError(
      filePathErrorLine(paths, pathList.index, pathList.message),
      "asset_upload_list_entry_refused",
    );
  let targetPin = input[ASSET_UPLOAD_PIN_TAG];
  let batch = targetPin?.batch;
  let approvedBatch = Array.isArray(batch) ? batch : undefined;
  if (
    carriesForeignPin(input, ASSET_UPLOAD_PIN_TAG) ||
    (targetPin !== undefined && targetPin?.slug !== artifactUrl.slug)
  )
    throw new ArtifactInputError(
      "`action` or `url` no longer names the artifact upload that was approved \u2014 retry so it is checked again",
      "asset_upload_target_changed",
    );
  if (
    targetPin !== undefined &&
    targetPin !== null &&
    (approvedBatch === undefined ||
      approvedBatch.length !== paths.length ||
      !approvedBatch.every((pinEntry) => {
        let pin = pinEntry;
        return typeof pin?.real === "string" && typeof pin.identity === "string";
      }))
  )
    throw new ArtifactInputError(
      "the call no longer names the files that were approved (one file where a list was approved, a list of another length, or a file whose identity was not recorded) \u2014 retry so it is checked again",
      "asset_upload_pin_mismatch",
    );
  let vetPath = (rawPath) => {
    let toolPermissionContext = getToolPermissionContext(context);
    let contentType = assetMimeTypeForPath(rawPath);
    if (contentType === undefined)
      throw new ArtifactInputError(
        `unsupported asset type: upload_asset takes ${joined}`,
        "asset_upload_unsupported_type",
      );
    let absPath = expandPath(rawPath);
    if (
      readPermissionDecisionForPath(absPath, toolPermissionContext).behavior === "deny" ||
      getDenyRuleForTool(toolPermissionContext, READ_PATH_PROBE) !== null
    )
      throw new ArtifactInputError(
        "reading this file is blocked by a Read permission rule \u2014 the upload was not attempted",
        "asset_upload_read_denied",
      );
    let hasAskRule = findAskRuleForTool(toolPermissionContext, READ_PATH_PROBE) !== null;
    return {
      contentType,
      path: absPath,
      readVerdict: (realPath) => {
        let behavior = readPermissionDecisionForPath(realPath, toolPermissionContext).behavior;
        return behavior === "allow" && hasAskRule ? "ask" : behavior;
      },
    };
  };
  let opened = [];
  let closeAll = () => {
    for (let [index, handle] of opened.entries())
      if (handle !== undefined) {
        closeFdQuietly(handle);
        opened[index] = undefined;
      }
  };
  let contentTypes = [];
  try {
    for (let [index, path] of paths.entries()) {
      let vetted = vetPath(path);
      let openedFile = checkUploadFile(
        vetted.path,
        approvedBatch?.[index],
        vetted.readVerdict,
        maxAssetBytesFor(vetted.contentType),
      );
      if (openedFile.kind !== "opened")
        throw new ArtifactInputError(
          `${openedFile.kind === "missing" ? "the file was not found" : openedFile.message.replaceAll("file_path", "this file").replace(/[.\s]+$/, "")}. Nothing was sent.`,
          openedFile.kind === "missing"
            ? "asset_upload_file_not_found"
            : openedFile.reason === "network"
              ? "asset_upload_network_path"
              : `asset_upload_${openedFile.reason}`,
        );
      if (opened.some((priorFile) => priorFile?.real === openedFile.real)) {
        closeFdQuietly(openedFile);
        throw new ArtifactInputError(
          "names the same file as an earlier entry \u2014 list each file once. Nothing was sent.",
          "asset_upload_list_entry_refused",
        );
      }
      opened.push(openedFile);
      contentTypes.push(vetted.contentType);
      await yieldToEventLoop();
      if (context.abortController.signal.aborted) throw new AbortError();
    }
  } catch (error) {
    closeAll();
    throw error instanceof ArtifactInputError
      ? new ArtifactInputError(filePathErrorLine(paths, opened.length, error.message), error.reasonCode)
      : error;
  }
  let pinConsumed = approvedBatch === undefined;
  let consumePin = () => {
    if (pinConsumed) return;
    pinConsumed = true;
    let otherCommentSeq = targetPin.otherCommentSeq;
    stampArtifactAssetUploadConsent(
      input,
      context,
      artifactUrl.slug,
      typeof otherCommentSeq === "number" ? otherCommentSeq : undefined,
    );
  };
  let rows = [];
  let stoppedAt;
  let resentCount = 0;
  try {
    for (let [index, path] of paths.entries()) {
      if (stoppedAt !== undefined) {
        rows.push({
          file_path: path,
          status: "not_attempted",
          reason: "stopped",
          message: `the call stopped at ${stoppedAt}`,
        });
        continue;
      }
      let done = false;
      let failRow = (failure) => {
        rows.push({
          file_path: path,
          status: "failed",
          ...failure,
        });
        stoppedAt = filePathIndexLabel(index, path);
      };
      try {
        if (resentCount > 0)
          await sleep(UPLOAD_LINE_MAX, context.abortController.signal, {
            abortError: () => new AbortError(),
          });
        let opened_2 = opened[index];
        if (vetPath(path).readVerdict(opened_2.real) === "deny")
          throw new ArtifactInputError(
            "reading this file is blocked by a Read permission rule \u2014 the upload was not attempted",
            "asset_upload_read_denied",
          );
        opened[index] = undefined;
        let approvedFileBytes = await readApprovedFileBytes(opened_2);
        if (approvedFileBytes.kind !== "ok") {
          failRow({
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
        consumePin();
        done = true;
        let uploadResult = await uploadArtifactAsset(
          {
            slug: artifactUrl.slug,
            bytes: approvedFileBytes.bytes,
            contentType: contentTypes[index],
            credentials: context.credentials,
          },
          context.abortController.signal,
        );
        if (context.abortController.signal.aborted) throw new AbortError();
        if (uploadResult.resent === true) resentCount += 1;
        if (uploadResult.kind === "error") {
          let failureRow = {
            reason: `asset_upload_${uploadResult.reason}`,
            message: uploadResult.message,
            ...(isRetryableUploadFailure(uploadResult) && {
              may_be_stored: true,
            }),
          };
          let rateLimited =
            SINGLE_UPLOAD_FAILURE_CODES.has(uploadResult.code) && uploadResult.reason !== "invalid_slug";
          if (rateLimited && resentCount < MAX_UPLOAD_FAILURE_LINES)
            rows.push({
              file_path: path,
              status: "failed",
              ...failureRow,
            });
          else {
            failRow(failureRow);
            if (rateLimited)
              stoppedAt = `${filePathIndexLabel(index, path)} (${UPLOAD_RATE_LIMITED_MESSAGE})`;
          }
          continue;
        }
        rows.push({
          file_path: path,
          status: "uploaded",
          id: uploadResult.id,
          url: uploadResult.url,
          size_bytes: uploadResult.sizeBytes,
          content_type: uploadResult.contentType,
          ...(uploadResult.sha256 !== undefined && {
            sha256: uploadResult.sha256,
          }),
          file_name: basename(expandPath(path)),
        });
        if (resentCount >= MAX_UPLOAD_FAILURE_LINES)
          stoppedAt = `${filePathIndexLabel(index, path)} (stored; ${UPLOAD_RATE_LIMITED_MESSAGE})`;
      } catch (error) {
        if (context.abortController.signal.aborted) throw isAbortError(error) ? error : new AbortError();
        let inputError = error instanceof ArtifactInputError ? error : undefined;
        failRow({
          reason: inputError?.reasonCode ?? "asset_upload_unexpected",
          message:
            inputError?.message ??
            (done
              ? "an unexpected error stopped this upload before the store answered \u2014 whether this file was stored is unknown; list the assets to check"
              : "an unexpected error stopped this upload before anything was sent"),
          ...(inputError === undefined &&
            done && {
              may_be_stored: true,
            }),
        });
      }
    }
  } finally {
    closeAll();
  }
  if (!rows.some((row) => row.status === "uploaded")) {
    let filtered = rows.filter((failedRows) => failedRows.status !== "uploaded");
    let filtered_2 = filtered.filter((unconfirmedRows) => unconfirmedRows.may_be_stored !== true);
    throw new ArtifactInputError(
      `No file is confirmed stored. ${filtered.map((row, rowIndex) => `${filePathIndexLabel(rowIndex, row.file_path)}: ${row.status === "not_attempted" ? "not attempted, " : row.may_be_stored === true ? "failed, but may be stored, " : ""}${row.message.slice(0, 300)}`).join("; ")}.${filtered_2.length === filtered.length ? "" : filtered_2.length === 0 ? " Before sending again, list the assets to see what is stored." : ` Before sending again, list the assets to see what is stored; only these are known not to be: [${filtered_2.map((row) => jsonQuotedSweep(row.file_path, MAX_UPLOAD_PATH_LENGTH)).join(", ")}].`}`,
      "asset_upload_none_stored",
      {
        maxErrorChars: MAX_UPLOAD_FILE_PATHS * (2 * MAX_UPLOAD_PATH_LENGTH + 500),
      },
    );
  }
  return {
    data: {
      ...writtenPage(artifactUrl, ownedVerdict(getShareEntry(artifactUrl.slug))),
      asset_uploads: {
        url: artifactViewerUrlFor(artifactUrl),
        results: rows,
      },
    },
  };
}
//@ chunk-xzmy9dn4.js:311891-313582 placement
/**
 * 渲染批量上传结果：已上传（大小、类型、url、id）与失败/未尝试（可能已存储）分组列出，附后续操作提示。
 */
var renderAssetUploadsResult = (toolResult, toolUseId) => {
  let assetUploads = toolResult.asset_uploads;
  let record =
    typeof assetUploads === "object" && assetUploads !== null && !Array.isArray(assetUploads)
      ? assetUploads
      : {};
  let capped = capResultRows(record.results, MAX_UPLOAD_FILE_PATHS);
  let uploadedLines = [];
  let failedLines = [];
  let retryPaths = [];
  for (let row of capped.rows) {
    let quotedPath = jsonQuotedSweep(row.file_path, MAX_UPLOAD_PATH_LENGTH);
    if (row.status === "uploaded") {
      let assetUrl = peerOrFallback(row.url, ASSET_BLOB_URL_RE, "");
      uploadedLines.push(
        `- ${quotedPath} (${numberText(row.size_bytes)} bytes, ${peerOrFallback(row.content_type, CONTENT_TYPE_RE, "unrecognized content type")}) \u2192 ${assetUrl === "" ? "stored, but this record's copy of its url is unreadable" : `${jsonStringify(assetUrl)} (id ${peerOrFallback(row.id, ASSET_ID_RE, "unreadable")})`}`,
      );
    } else {
      failedLines.push(
        `- ${quotedPath}: ${row.status === "not_attempted" ? "not attempted" : row.may_be_stored === true ? "failed, but may be stored" : "failed"} \u2014 ${quoteSweptValue(row.message, 1024)}`,
      );
      if (row.may_be_stored !== true) retryPaths.push(quotedPath);
    }
  }
  let unreadCount = capped.unreadable + capped.pastCap;
  let totalCount = capped.rows.length + unreadCount;
  return {
    tool_use_id: toolUseId,
    type: "tool_result",
    content:
      `Assets uploaded: ${uploadedLines.length} of ${totalCount} ${plural(totalCount, "file")} ${uploadedLines.length === 1 ? "is" : "are"} now stored in the artifact.` +
      (uploadedLines.length > 0
        ? ` Reference each from the page by its url verbatim \u2014 e.g. <img src="\u2026the url\u2026"> \u2014 which resolves in every view of the artifact; store the id in the artifact's database if rows need to point at it.
${uploadedLines.join(`
`)}`
        : "") +
      (failedLines.length > 0
        ? `
Not stored, or not known to be (each line says why; do not reference these):
${failedLines.join(`
`)}`
        : "") +
      (retryPaths.length > 0
        ? `
To upload the rest, fix what stopped them, then call again with only these in \`file_paths\`: [${retryPaths.join(", ")}]. None of them is stored, so nothing is stored twice.`
        : "") +
      (unreadCount > 0
        ? `
${unreadCount} more ${plural(unreadCount, "entry", "entries")} of this record could not be read; ${pickByToolset('action "list_assets"', () => 'action "list" with `scope: "assets"`')} shows what the artifact holds.`
        : "") +
      `
Everyone who can open the artifact can load the stored files; each is durable until deleted with action "delete_asset".`,
  };
};
//@ chunk-xzmy9dn4.js:313582-313686 placement
/**
 * 全部 Artifact 动作处理器列表，以及动作名 → 处理器的映射表 $b。
 */
var ARTIFACT_ACTION_HANDLERS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ACTION_HANDLER_BY_NAME;
deferInit("chunk-xzmy9dn4.js:313582", () => {
  ARTIFACT_ACTION_HANDLERS = [
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
  ACTION_HANDLER_BY_NAME = new Map(
    ARTIFACT_ACTION_HANDLERS.flatMap((handler) => handler.actions.map((action) => [action, handler])),
  );
});
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
  MAX_UPLOAD_PATH_LENGTH,
  isArtifactAssetsEnabled,
  artifactAssetsEnabledSource,
  copyArtifactAsset,
  ACTION_HANDLER_BY_NAME,
  renderAssetUploadsResult,
};
