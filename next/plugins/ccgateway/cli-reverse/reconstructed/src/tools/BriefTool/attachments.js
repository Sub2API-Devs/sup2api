/**
 * tools/BriefTool/attachments.ts
 *
 * Brief 附件：上传通道判定、MIME 表、附件路径校验（URL/UNC/网络挂载/工作目录限制/存在性）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BriefTool/attachments.ts
 * pieces: chunk-qq39x404.js (16)
 * attribution: placement 4, callgraph-fingerprint 1, layout 10, fingerprint 1
 */
import { extname, isAbsolute, basename, join } from "path";
import { stat } from "fs/promises";
import { env } from "../../utils/env.js";
import { getSdkHostedBridgeHandle } from "../../bridge/replBridgeHandle.js";
import { isReplBridgeActive, isDiskless } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isTopHostSession } from "../../utils/sessionShape.js";
import { normalizePathForComparison, findSimilarFile } from "../../utils/file.js";
import { escapeForTag, encodeControlChars } from "../../utils/sanitization.js";
import { expandPath } from "../../utils/path.js";
import { isUncOrDevicePath } from "../../utils/pathClassification.js";
import { isNetworkOrSpecialPath, isUntouchableSpelling } from "../../utils/networkPaths.js";
import {
  getPathsForPermissionCheck,
  safeResolvePath,
  getFsImplementation,
} from "../../utils/fsOperations.js";
import { pathInAllowedWorkingPath, outsideReadBlocked } from "../../utils/permissions/filesystem.js";
import {
  getErrnoCode,
  isSyscallError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { getCwd } from "../../utils/cwd.js";
import { lastExistingIdentity } from "../../utils/fsSafety/pathRevalidation.js";
import { IMAGE_FILE_EXT_RE } from "../../utils/imagePaste.js";
import { bridgeHostState } from "../../bridge/bridgeHostState.js";
import { isTopLevelBridgeSession } from "../../utils/remoteEnvironment.js";
import { createMutex } from "../../utils/promiseQueue.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { createSemaphore, limitConcurrency } from "../../utils/concurrencyLimit.js";
import { explainUploadError, MAX_IMAGE_DIMENSION } from "../../utils/imageErrors.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-qq39x404.js:1093-1106 placement
/**
 * 附件解析时同时写项目附件目录的并发数（createSemaphore 用）。
 */
var MAX_CONCURRENT_FOLDER_WRITES = 3;
var MAX_CONCURRENT_ATTACHMENTS = 32;
//@ chunk-qq39x404.js:1106-1464 callgraph-fingerprint = resolveAttachments (0.165)
/**
 * 决定附件上传通道：CLAUDE_CODE_ATTACHMENTS_BY_PATH 时不上传；REPL bridge；CLAUDE_CODE_BRIEF_UPLOAD；CCR 环境；BYOC 远程；SDK 托管（tengu_async_goblet 控制）；否则 none。
 */
function getAttachmentUploadLane(options) {
  if (env.CLAUDE_CODE_ATTACHMENTS_BY_PATH) return "none";
  if (options.replBridgeEnabled) return "repl";
  if (env.CLAUDE_CODE_BRIEF_UPLOAD) return "env_brief_upload";
  if (env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE) return "env_ccr";
  if (env.CLAUDE_CODE_REMOTE) return "env_byoc";
  if (getSdkHostedBridgeHandle() !== null && isReplBridgeActive())
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_async_goblet", true)
      ? "sdk_hosted"
      : "sdk_hosted_disabled";
  return "none";
}
//@ chunk-qq39x404.js:1464-1510 layout
/**
 * 上传通道为 sdk_hosted 且附件只在本机渲染时为真。
 */
function isRenderedLocallyLane(attachmentUploadLane) {
  return attachmentUploadLane === "sdk_hosted" && isTopHostSession();
}
//@ chunk-qq39x404.js:1510-2503 layout
var ATTACHMENT_MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".avif": "image/avif",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".mp4": "video/mp4",
  ".m4v": "video/x-m4v",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".log": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
  ".csv": "text/csv",
  ".html": "text/html",
  ".htm": "text/html",
  ".xml": "application/xml",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".zip": "application/zip",
};
//@ chunk-qq39x404.js:2503-2548 layout
/**
 * 按扩展名取附件 MIME 类型。
 */
function getAttachmentMimeType(path) {
  return ATTACHMENT_MIME_BY_EXT[extname(path).toLowerCase()];
}
//@ chunk-qq39x404.js:2548-2701 layout
/**
 * 判断已校验附件的上传副本（png/jpeg）是否与原扩展名类型不同（即使用了预览副本）。
 */
function hasMismatchedImageType(attachment) {
  return (
    attachment.pathValidated === true &&
    attachment.file_uuid !== undefined &&
    (attachment.media_type === "image/png" || attachment.media_type === "image/jpeg") &&
    attachment.media_type !== getAttachmentMimeType(attachment.path)
  );
}
//@ chunk-qq39x404.js:2701-2742 layout
/**
 * 附件项是否为已上传的对象（非字符串路径）。
 */
function isPreUploadedAttachment(attachment) {
  return typeof attachment !== "string";
}
//@ chunk-qq39x404.js:2742-2957 layout
async function suggestAttachmentPath(rawPath, resolvedPath, cwd) {
  let normalizedPath = await normalizePathForComparison(resolvedPath);
  if (normalizedPath) return normalizedPath;
  if (!isAbsolute(rawPath)) {
    let [firstSegment, ...restSegments] = rawPath.split(/[\\/]+/);
    if (firstSegment === basename(cwd) && restSegments.length > 0) {
      let candidatePath = join(cwd, ...restSegments);
      try {
        if ((await stat(candidatePath)).isFile()) return restSegments.join("/");
      } catch {}
    }
  }
  return await findSimilarFile(resolvedPath);
}
//@ chunk-qq39x404.js:2957-3662 layout
/**
 * 拒绝看起来是 URL、UNC 路径或位于会触发网络挂载目录下的附件路径。
 */
function checkAttachmentPathShape(rawPath) {
  let escapedPath = escapeForTag(rawPath);
  if (/^[a-z][a-z0-9+.-]+:\/\//i.test(rawPath))
    return {
      result: false,
      message: `Attachment "${escapedPath}" looks like a URL, not a local file path. This tool can only send files that exist on the local filesystem \u2014 download or write the content to a local file first, then pass that path.`,
      errorCode: 1,
    };
  let code = expandPath(rawPath);
  if (isUncOrDevicePath(code))
    return {
      result: false,
      message: `Attachment "${escapedPath}" is a UNC network path, which is not supported.`,
      errorCode: 1,
    };
  if (isNetworkOrSpecialPath(code))
    return {
      result: false,
      message: `Attachment "${escapedPath}" is under /net, /Network, /.vol, /.file, /.nofollow or /.resolve, which could trigger a network mount, so it is not supported. Copy the file to an ordinary local path and pass that path instead.`,
      errorCode: 1,
    };
  return;
}
//@ chunk-qq39x404.js:3662-3752 layout
/**
 * diskless 会话里附件不能是文件路径时的错误文本。
 */
var CANNOT_ATTACH_PATH_MESSAGE =
  "A file path cannot be attached here: this tool cannot read files in this session.";
//@ chunk-qq39x404.js:3752-3791 layout
/**
 * validateInput 用的附件校验入口。
 */
function validateAttachments(attachments, context) {
  return validateAttachmentPaths(attachments, context, undefined);
}
//@ chunk-qq39x404.js:3791-4046 layout
/**
 * call 时的附件校验：受限场景下同时收集被判定路径与文件身份，供上传时防止文件被替换。
 */
async function validateAttachmentsForCall(attachments, context) {
  if (!context.restricted && context.blockReadsOutsideWorkingDirectories !== true)
    return {
      verdict: await validateAttachmentPaths(attachments, context, undefined),
      judged: undefined,
    };
  let paths = [];
  let identities = new Map();
  return {
    verdict: await validateAttachmentPaths(attachments, context, {
      paths,
      identities,
    }),
    judged: {
      paths,
      identities,
      doorChannel: undefined,
    },
  };
}
//@ chunk-qq39x404.js:4046-5176 fingerprint = validateAttachmentPaths (0.493)
/**
 * 逐个校验附件路径（已上传对象跳过）：diskless 会话不允许路径；拒绝 URL/UNC/网络挂载路径；--restricted 只能发工作目录内文件；permissions.blockReadsOutsideWorkingDirectories 时拒绝外部路径；必须是存在的普通文件（不存在时给出猜测路径）。
 */
async function validateAttachmentPaths(attachments, context, judge) {
  for (let rawPath of attachments) {
    if (isPreUploadedAttachment(rawPath)) continue;
    if (isDiskless())
      return {
        result: false,
        message: CANNOT_ATTACH_PATH_MESSAGE,
        errorCode: 1,
      };
    let fullPath = checkAttachmentPathShape(rawPath);
    if (fullPath !== undefined) return fullPath;
    let escapedPath = escapeForTag(rawPath);
    let expandedPath = expandPath(rawPath);
    let permissionPaths =
      judge !== undefined || context.restricted || context.blockReadsOutsideWorkingDirectories === true
        ? getPathsForPermissionCheck(expandedPath)
        : undefined;
    if (context.restricted && !pathInAllowedWorkingPath(expandedPath, context, permissionPaths))
      return {
        result: false,
        message: `Attachment "${escapedPath}" is outside the working directory; --restricted only sends files from inside it.`,
        errorCode: 1,
      };
    if (outsideReadBlocked(expandedPath, context, permissionPaths))
      return {
        result: false,
        message: `Attachment "${escapedPath}" is outside the working directories; reads outside them are blocked (permissions.blockReadsOutsideWorkingDirectories).`,
        errorCode: 1,
      };
    try {
      if (!(await stat(expandedPath)).isFile())
        return {
          result: false,
          message: `Attachment "${escapedPath}" is not a regular file.`,
          errorCode: 1,
        };
    } catch (e) {
      let code = getErrnoCode(e);
      if (code === "ENOENT") {
        let cwd = getCwd();
        let suggestion = await suggestAttachmentPath(rawPath, expandedPath, cwd);
        let escapedSuggestion = escapeForTag(suggestion);
        return {
          result: false,
          message:
            `Attachment "${escapedPath}" does not exist. Current working directory: ${escapeForTag(cwd)}.` +
            (suggestion && escapedSuggestion === suggestion ? ` Did you mean "${escapedSuggestion}"?` : ""),
          errorCode: 1,
        };
      }
      if (isSyscallError(e))
        return {
          result: false,
          message: `Attachment "${escapedPath}" is not accessible (${code}).`,
          errorCode: 1,
        };
      throw e;
    }
    if (judge !== undefined && permissionPaths !== undefined) {
      judge.paths.push(...permissionPaths);
      judge.identities.set(expandedPath, await lastExistingIdentity(permissionPaths));
    }
  }
  return {
    result: true,
  };
}
//@ chunk-qq39x404.js:5176-8249 placement
/**
 * 处理 Brief/SendUserFile 的附件：预上传的直接记录；本地路径展开并检查（非网络路径、存在）；按通道把文件写入项目文件夹和/或上传到聊天（限并发、可缩放图片），汇总每个附件的 uuid、项目路径、缩放信息与错误。
 */
async function resolveBriefAttachments(attachments, options) {
  let resolved = [];
  let localIndexes = [];
  for (let attachment of attachments) {
    if (isPreUploadedAttachment(attachment)) {
      resolved.push({
        path: attachment.file_name,
        size: attachment.size,
        isImage: attachment.is_image,
        file_uuid: attachment.file_uuid,
        media_type: attachment.media_type ?? getAttachmentMimeType(attachment.file_name),
        pathValidated: false,
      });
      continue;
    }
    if (isDiskless())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        CANNOT_ATTACH_PATH_MESSAGE,
        "attachment path refused in a diskless session",
      );
    let expandedPath = expandPath(attachment);
    if (isUntouchableSpelling(expandedPath))
      throw Error(
        `Attachment "${escapeForTag(attachment)}" is a network path (UNC or /net autofs), which is not supported.`,
      );
    let stats = await stat(expandedPath).catch((error) => {
      if (error instanceof Error) error.message = escapeForTag(error.message);
      throw error;
    });
    localIndexes.push(resolved.length);
    resolved.push({
      path: expandedPath,
      size: stats.size,
      isImage: IMAGE_FILE_EXT_RE.test(expandedPath),
      media_type: getAttachmentMimeType(expandedPath),
      pathValidated: true,
    });
  }
  let { lane } = options;
  let door = bridgeHostState().projectFilesDoor?.() ?? null;
  let projectChannel = door !== null && door.channelId === options.projectFilesChannel ? door : null;
  let canUpload = lane !== "none" && lane !== "sdk_hosted_disabled";
  if (localIndexes.length === 0 || (projectChannel === null && !canUpload)) {
    for (let idx of localIndexes) {
      let approvedPath = approvedResolvedPath(resolved[idx].path, options.judged?.paths);
      if (typeof approvedPath !== "string")
        resolved[idx] = {
          ...resolved[idx],
          upload_error: approvedPath.error,
        };
    }
    if (isTopLevelBridgeSession())
      for (let idx of localIndexes)
        resolved[idx] = {
          ...resolved[idx],
          upload_error:
            door === null
              ? "not delivered: this session is not on a project thread, so it has nowhere to place a file"
              : "not delivered: the project folder is not written in plan mode until the plan is approved",
        };
    return resolved;
  }
  let { uploadBriefAttachment, writeAttachmentToProjectFolder } =
    await import("./uploadBriefAttachment.lazy.js");
  let copyLock = createMutex();
  let telemetry = {
    upload_lane: fromEnum(lane),
  };
  let noPreviewCopies = !getFeatureValue_CACHED_MAY_BE_STALE("tengu_playful_panda", true);
  let noScaledCopies = !getFeatureValue_CACHED_MAY_BE_STALE("tengu_level_wren", true);
  let maxPosts = getFeatureValue_CACHED_MAY_BE_STALE("tengu_zany_flask", 2);
  let resendMaxMiB = getFeatureValue_CACHED_MAY_BE_STALE("tengu_shimmying_willow", 30);
  let semaphore = createSemaphore(MAX_CONCURRENT_FOLDER_WRITES);
  let resolveAbort = () => {};
  let promise = new Promise((resolve) => {
    resolveAbort = resolve;
  });
  options.signal?.addEventListener("abort", resolveAbort, {
    once: true,
  });
  let processAttachment = limitConcurrency(MAX_CONCURRENT_ATTACHMENTS, async (attachmentIdx) => {
    let { path, size } = resolved[attachmentIdx];
    let approvedPath = approvedResolvedPath(path, options.judged?.paths);
    if (typeof approvedPath !== "string")
      return {
        folder: {
          error: approvedPath.error,
        },
        chat: undefined,
      };
    let filename = basename(path);
    let identities = options.judged?.identities;
    let identity = identities === undefined || identities.has(path) ? identities?.get(path) : null;
    let lockPromise;
    let waitForTurn = async () => {
      await Promise.race([(lockPromise ??= semaphore.acquire()), promise]);
    };
    try {
      let [folderResult, chatResult] = await Promise.allSettled([
        projectChannel
          ? writeAttachmentToProjectFolder(approvedPath, size, projectChannel, {
              filename,
              identity,
              signal: options.signal,
              telemetry,
              waitForTurn,
            })
          : undefined,
        canUpload
          ? uploadBriefAttachment(approvedPath, size, {
              lane,
              filename,
              identity,
              signal: options.signal,
              credentials: options.credentials,
              copyLock,
              waitForTurn,
              originalsOnly: options.originalsOnly,
              noPreviewCopies,
              noScaledCopies,
              maxPosts,
              resendMaxMiB,
            })
          : undefined,
      ]);
      if (folderResult.status === "rejected") throw folderResult.reason;
      if (chatResult.status === "rejected") throw chatResult.reason;
      return {
        folder: folderResult.value,
        chat: chatResult.value,
      };
    } finally {
      lockPromise?.then((release) => release());
    }
  });
  let mapped = localIndexes.map(processAttachment);
  Promise.allSettled(mapped).then(() => options.signal?.removeEventListener("abort", resolveAbort));
  let results = await Promise.all(mapped);
  localIndexes.forEach((attachmentIdx, resultIdx) => {
    let { folder, chat } = results[resultIdx];
    let attachment = {
      ...resolved[attachmentIdx],
    };
    if (typeof folder === "string") attachment.project_path = folder;
    if (chat !== undefined && !("error" in chat)) {
      attachment.file_uuid = chat.file_uuid;
      if (chat.copy !== undefined) {
        attachment.isImage = chat.copy.isImage;
        attachment.media_type = chat.copy.mediaType;
      }
      if (chat.scaled !== undefined) attachment.scaled = chat.scaled;
    }
    let folderFailed = folder !== undefined && typeof folder !== "string";
    let chatFailed = chat !== undefined && "error" in chat;
    if (attachment.project_path === undefined && attachment.file_uuid === undefined) {
      let failure = folderFailed ? folder : chatFailed ? chat : undefined;
      if (failure !== undefined) {
        attachment.upload_error = failure.error;
        if (failure.errorCode !== undefined) attachment.upload_error_code = failure.errorCode;
        if (failure.suspectedLimitBytes !== undefined)
          attachment.upload_suspected_limit_bytes = failure.suspectedLimitBytes;
      }
    } else if (folderFailed) attachment.partial_error = `not placed in the project folder (${folder.error})`;
    else if (chatFailed)
      attachment.partial_error = `not sent to the chat viewers (${explainUploadError(chat.error, chat.errorCode, true)})`;
    resolved[attachmentIdx] = attachment;
  });
  return resolved;
}
//@ chunk-qq39x404.js:8249-8403 placement
function approvedResolvedPath(path, paths) {
  let { resolvedPath } = safeResolvePath(getFsImplementation(), path);
  if (paths === undefined) return resolvedPath;
  return paths.includes(resolvedPath)
    ? resolvedPath
    : {
        error: "not sent: it now resolves to what was not approved",
      };
}
//@ chunk-qq39x404.js:8403-9266 placement
/**
 * 生成图片以缩小副本发送到聊天的说明：每张的发送尺寸与原尺寸，以及原图在项目文件夹还是本地。
 */
function scaledImagesNote(attachments) {
  let flattened = attachments.flatMap(({ path, scaled, project_path: projectPath }) =>
    scaled === undefined
      ? []
      : [
          {
            path: encodeControlChars(path),
            scaled,
            inFolder: projectPath !== undefined,
          },
        ],
  );
  let count = flattened.length;
  if (count === 0) return;
  return (
    `${count} ${plural(count, "image was sent to the chat as a scaled-down copy", "images were sent to the chat as scaled-down copies")}, because the server accepts images at most ${MAX_IMAGE_DIMENSION} pixels wide or tall:
` +
    flattened.map(
      ({ path, scaled, inFolder }) =>
        `  ${path}: sent at ${scaled.width}\xD7${scaled.height} pixels; the original (${scaled.original_width}\xD7${scaled.original_height}) is ${inFolder ? "in the project folder" : "unchanged on disk"}`,
    ).join(`
`) +
    `
Tell the user they are seeing ${plural(count, "a scaled-down copy", "scaled-down copies")}; ` +
    (flattened.every((scaledImage) => scaledImage.inFolder)
      ? `the project folder has ${plural(count, "the full-size original", "the full-size originals")}.`
      : `if they need ${plural(count, "the full-size original", "a full-size original")}, offer to send it inside a .zip.`)
  );
}
export {
  checkAttachmentPathShape,
  getAttachmentMimeType,
  hasMismatchedImageType,
  scaledImagesNote,
  validateAttachments,
  getAttachmentUploadLane,
  resolveBriefAttachments,
  isRenderedLocallyLane,
  validateAttachmentsForCall,
};
