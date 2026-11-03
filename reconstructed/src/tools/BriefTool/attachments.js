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
import { Qn } from "../../utils/pathClassification.js";
import { n_, hl } from "../../utils/networkPaths.js";
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
import { FUt } from "../../utils/imagePaste.js";
import { ao } from "../../bridge/bridgeHostState.js";
import { Ehe } from "../../utils/remoteEnvironment.js";
import { createMutex } from "../../utils/promiseQueue.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { createSemaphore, limitConcurrency } from "../../utils/concurrencyLimit.js";
import { explainUploadError, gJ } from "../../utils/imageErrors.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-qq39x404.js:1093-1106 placement
var q = 3,
  K = 32;
/**
 * 决定附件上传通道：CLAUDE_CODE_ATTACHMENTS_BY_PATH 时不上传；REPL bridge；CLAUDE_CODE_BRIEF_UPLOAD；CCR 环境；BYOC 远程；SDK 托管（tengu_async_goblet 控制）；否则 none。
 */
//@ chunk-qq39x404.js:1106-1464 callgraph-fingerprint = resolveAttachments (0.165)
function getAttachmentUploadLane(n) {
  if (env.CLAUDE_CODE_ATTACHMENTS_BY_PATH) return "none";
  if (n.replBridgeEnabled) return "repl";
  if (env.CLAUDE_CODE_BRIEF_UPLOAD) return "env_brief_upload";
  if (env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE) return "env_ccr";
  if (env.CLAUDE_CODE_REMOTE) return "env_byoc";
  if (getSdkHostedBridgeHandle() !== null && isReplBridgeActive())
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_async_goblet", !0)
      ? "sdk_hosted"
      : "sdk_hosted_disabled";
  return "none";
}
/**
 * 上传通道为 sdk_hosted 且附件只在本机渲染时为真。
 */
//@ chunk-qq39x404.js:1464-1510 layout
function isRenderedLocallyLane(n) {
  return n === "sdk_hosted" && isTopHostSession();
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
/**
 * 按扩展名取附件 MIME 类型。
 */
//@ chunk-qq39x404.js:2503-2548 layout
function getAttachmentMimeType(n) {
  return ATTACHMENT_MIME_BY_EXT[extname(n).toLowerCase()];
}
/**
 * 判断已校验附件的上传副本（png/jpeg）是否与原扩展名类型不同（即使用了预览副本）。
 */
//@ chunk-qq39x404.js:2548-2701 layout
function hasMismatchedImageType(n) {
  return (
    n.pathValidated === !0 &&
    n.file_uuid !== void 0 &&
    (n.media_type === "image/png" || n.media_type === "image/jpeg") &&
    n.media_type !== getAttachmentMimeType(n.path)
  );
}
/**
 * 附件项是否为已上传的对象（非字符串路径）。
 */
//@ chunk-qq39x404.js:2701-2742 layout
function isPreUploadedAttachment(n) {
  return typeof n !== "string";
}
//@ chunk-qq39x404.js:2742-2957 layout
async function suggestAttachmentPath(n, e, t) {
  let o = await normalizePathForComparison(e);
  if (o) return o;
  if (!isAbsolute(n)) {
    let [a, ...d] = n.split(/[\\/]+/);
    if (a === basename(t) && d.length > 0) {
      let p = join(t, ...d);
      try {
        if ((await stat(p)).isFile()) return d.join("/");
      } catch {}
    }
  }
  return await findSimilarFile(e);
}
/**
 * 拒绝看起来是 URL、UNC 路径或位于会触发网络挂载目录下的附件路径。
 */
//@ chunk-qq39x404.js:2957-3662 layout
function checkAttachmentPathShape(n) {
  let e = escapeForTag(n);
  if (/^[a-z][a-z0-9+.-]+:\/\//i.test(n))
    return {
      result: !1,
      message: `Attachment "${e}" looks like a URL, not a local file path. This tool can only send files that exist on the local filesystem \u2014 download or write the content to a local file first, then pass that path.`,
      errorCode: 1,
    };
  let t = expandPath(n);
  if (Qn(t))
    return {
      result: !1,
      message: `Attachment "${e}" is a UNC network path, which is not supported.`,
      errorCode: 1,
    };
  if (n_(t))
    return {
      result: !1,
      message: `Attachment "${e}" is under /net, /Network, /.vol, /.file, /.nofollow or /.resolve, which could trigger a network mount, so it is not supported. Copy the file to an ordinary local path and pass that path instead.`,
      errorCode: 1,
    };
  return;
}
/**
 * diskless 会话里附件不能是文件路径时的错误文本。
 */
//@ chunk-qq39x404.js:3662-3752 layout
var CANNOT_ATTACH_PATH_MESSAGE =
  "A file path cannot be attached here: this tool cannot read files in this session.";
/**
 * validateInput 用的附件校验入口。
 */
//@ chunk-qq39x404.js:3752-3791 layout
function validateAttachments(n, e) {
  return validateAttachmentPaths(n, e, void 0);
}
/**
 * call 时的附件校验：受限场景下同时收集被判定路径与文件身份，供上传时防止文件被替换。
 */
//@ chunk-qq39x404.js:3791-4046 layout
async function validateAttachmentsForCall(n, e) {
  if (!e.restricted && e.blockReadsOutsideWorkingDirectories !== !0)
    return { verdict: await validateAttachmentPaths(n, e, void 0), judged: void 0 };
  let t = [],
    o = new Map();
  return {
    verdict: await validateAttachmentPaths(n, e, { paths: t, identities: o }),
    judged: { paths: t, identities: o, doorChannel: void 0 },
  };
}
/**
 * 逐个校验附件路径（已上传对象跳过）：diskless 会话不允许路径；拒绝 URL/UNC/网络挂载路径；--restricted 只能发工作目录内文件；permissions.blockReadsOutsideWorkingDirectories 时拒绝外部路径；必须是存在的普通文件（不存在时给出猜测路径）。
 */
//@ chunk-qq39x404.js:4046-5176 fingerprint = validateAttachmentPaths (0.493)
async function validateAttachmentPaths(n, e, t) {
  for (let rawPath of n) {
    if (isPreUploadedAttachment(rawPath)) continue;
    if (isDiskless()) return { result: !1, message: CANNOT_ATTACH_PATH_MESSAGE, errorCode: 1 };
    let fullPath = checkAttachmentPathShape(rawPath);
    if (fullPath !== void 0) return fullPath;
    let d = escapeForTag(rawPath),
      p = expandPath(rawPath),
      h =
        t !== void 0 || e.restricted || e.blockReadsOutsideWorkingDirectories === !0
          ? getPathsForPermissionCheck(p)
          : void 0;
    if (e.restricted && !pathInAllowedWorkingPath(p, e, h))
      return {
        result: !1,
        message: `Attachment "${d}" is outside the working directory; --restricted only sends files from inside it.`,
        errorCode: 1,
      };
    if (outsideReadBlocked(p, e, h))
      return {
        result: !1,
        message: `Attachment "${d}" is outside the working directories; reads outside them are blocked (permissions.blockReadsOutsideWorkingDirectories).`,
        errorCode: 1,
      };
    try {
      if (!(await stat(p)).isFile())
        return { result: !1, message: `Attachment "${d}" is not a regular file.`, errorCode: 1 };
    } catch (error) {
      let code = getErrnoCode(error);
      if (code === "ENOENT") {
        let P = getCwd(),
          y = await suggestAttachmentPath(rawPath, p, P),
          b = escapeForTag(y);
        return {
          result: !1,
          message:
            `Attachment "${d}" does not exist. Current working directory: ${escapeForTag(P)}.` +
            (y && b === y ? ` Did you mean "${b}"?` : ""),
          errorCode: 1,
        };
      }
      if (isSyscallError(error))
        return { result: !1, message: `Attachment "${d}" is not accessible (${code}).`, errorCode: 1 };
      throw error;
    }
    if (t !== void 0 && h !== void 0)
      (t.paths.push(...h), t.identities.set(p, await lastExistingIdentity(h)));
  }
  return { result: !0 };
}
/**
 * 处理 Brief/SendUserFile 的附件：预上传的直接记录；本地路径展开并检查（非网络路径、存在）；按通道把文件写入项目文件夹和/或上传到聊天（限并发、可缩放图片），汇总每个附件的 uuid、项目路径、缩放信息与错误。
 */
//@ chunk-qq39x404.js:5176-8249 placement
async function resolveBriefAttachments(attachments, options) {
  let t = [],
    o = [];
  for (let r of attachments) {
    if (isPreUploadedAttachment(r)) {
      t.push({
        path: r.file_name,
        size: r.size,
        isImage: r.is_image,
        file_uuid: r.file_uuid,
        media_type: r.media_type ?? getAttachmentMimeType(r.file_name),
        pathValidated: !1,
      });
      continue;
    }
    if (isDiskless())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        CANNOT_ATTACH_PATH_MESSAGE,
        "attachment path refused in a diskless session",
      );
    let u = expandPath(r);
    if (hl(u))
      throw Error(
        `Attachment "${escapeForTag(r)}" is a network path (UNC or /net autofs), which is not supported.`,
      );
    let m = await stat(u).catch((s) => {
      if (s instanceof Error) s.message = escapeForTag(s.message);
      throw s;
    });
    (o.push(t.length),
      t.push({
        path: u,
        size: m.size,
        isImage: FUt.test(u),
        media_type: getAttachmentMimeType(u),
        pathValidated: !0,
      }));
  }
  let { lane: lane } = options,
    d = ao().projectFilesDoor?.() ?? null,
    p = d !== null && d.channelId === options.projectFilesChannel ? d : null,
    h = lane !== "none" && lane !== "sdk_hosted_disabled";
  if (o.length === 0 || (p === null && !h)) {
    for (let r of o) {
      let u = approvedResolvedPath(t[r].path, options.judged?.paths);
      if (typeof u !== "string") t[r] = { ...t[r], upload_error: u.error };
    }
    if (Ehe())
      for (let r of o)
        t[r] = {
          ...t[r],
          upload_error:
            d === null
              ? "not delivered: this session is not on a project thread, so it has nowhere to place a file"
              : "not delivered: the project folder is not written in plan mode until the plan is approved",
        };
    return t;
  }
  let {
      uploadBriefAttachment: uploadBriefAttachment,
      writeAttachmentToProjectFolder: writeAttachmentToProjectFolder,
    } = await import("./chunk-7kpfrhzn.js"),
    P = createMutex(),
    y = { upload_lane: fromEnum(lane) },
    b = !getFeatureValue_CACHED_MAY_BE_STALE("tengu_playful_panda", !0),
    N = !getFeatureValue_CACHED_MAY_BE_STALE("tengu_level_wren", !0),
    M = getFeatureValue_CACHED_MAY_BE_STALE("tengu_zany_flask", 2),
    z = getFeatureValue_CACHED_MAY_BE_STALE("tengu_shimmying_willow", 30),
    H = createSemaphore(q),
    R = () => {},
    promise = new Promise((r) => {
      R = r;
    });
  options.signal?.addEventListener("abort", R, { once: !0 });
  let V = limitConcurrency(K, async (r) => {
      let { path: path, size: size } = t[r],
        s = approvedResolvedPath(path, options.judged?.paths);
      if (typeof s !== "string") return { folder: { error: s.error }, chat: void 0 };
      let l = basename(path),
        _ = options.judged?.identities,
        w = _ === void 0 || _.has(path) ? _?.get(path) : null,
        f,
        x = async () => {
          await Promise.race([(f ??= H.acquire()), promise]);
        };
      try {
        let [A, j] = await Promise.allSettled([
          p
            ? writeAttachmentToProjectFolder(s, size, p, {
                filename: l,
                identity: w,
                signal: options.signal,
                telemetry: y,
                waitForTurn: x,
              })
            : void 0,
          h
            ? uploadBriefAttachment(s, size, {
                lane: lane,
                filename: l,
                identity: w,
                signal: options.signal,
                credentials: options.credentials,
                copyLock: P,
                waitForTurn: x,
                originalsOnly: options.originalsOnly,
                noPreviewCopies: b,
                noScaledCopies: N,
                maxPosts: M,
                resendMaxMiB: z,
              })
            : void 0,
        ]);
        if (A.status === "rejected") throw A.reason;
        if (j.status === "rejected") throw j.reason;
        return { folder: A.value, chat: j.value };
      } finally {
        f?.then((A) => A());
      }
    }),
    mapped = o.map(V);
  Promise.allSettled(mapped).then(() => options.signal?.removeEventListener("abort", R));
  let results = await Promise.all(mapped);
  return (
    o.forEach((r, u) => {
      let { folder: folder, chat: chat } = results[u],
        l = { ...t[r] };
      if (typeof folder === "string") l.project_path = folder;
      if (chat !== void 0 && !("error" in chat)) {
        if (((l.file_uuid = chat.file_uuid), chat.copy !== void 0))
          ((l.isImage = chat.copy.isImage), (l.media_type = chat.copy.mediaType));
        if (chat.scaled !== void 0) l.scaled = chat.scaled;
      }
      let _ = folder !== void 0 && typeof folder !== "string",
        w = chat !== void 0 && "error" in chat;
      if (l.project_path === void 0 && l.file_uuid === void 0) {
        let f = _ ? folder : w ? chat : void 0;
        if (f !== void 0) {
          if (((l.upload_error = f.error), f.errorCode !== void 0)) l.upload_error_code = f.errorCode;
          if (f.suspectedLimitBytes !== void 0) l.upload_suspected_limit_bytes = f.suspectedLimitBytes;
        }
      } else if (_) l.partial_error = `not placed in the project folder (${folder.error})`;
      else if (w)
        l.partial_error = `not sent to the chat viewers (${explainUploadError(chat.error, chat.errorCode, !0)})`;
      t[r] = l;
    }),
    t
  );
}
//@ chunk-qq39x404.js:8249-8403 placement
function approvedResolvedPath(n, e) {
  let { resolvedPath: resolvedPath } = safeResolvePath(getFsImplementation(), n);
  if (e === void 0) return resolvedPath;
  return e.includes(resolvedPath)
    ? resolvedPath
    : { error: "not sent: it now resolves to what was not approved" };
}
/**
 * 生成图片以缩小副本发送到聊天的说明：每张的发送尺寸与原尺寸，以及原图在项目文件夹还是本地。
 */
//@ chunk-qq39x404.js:8403-9266 placement
function scaledImagesNote(n) {
  let flattened = n.flatMap(({ path: path, scaled: scaled, project_path: project_path }) =>
      scaled === void 0
        ? []
        : [{ path: encodeControlChars(path), scaled: scaled, inFolder: project_path !== void 0 }],
    ),
    count = flattened.length;
  if (count === 0) return;
  return (
    `${count} ${plural(count, "image was sent to the chat as a scaled-down copy", "images were sent to the chat as scaled-down copies")}, because the server accepts images at most ${gJ} pixels wide or tall:
` +
    flattened.map(
      ({ path: path, scaled: scaled, inFolder: inFolder }) =>
        `  ${path}: sent at ${scaled.width}\xD7${scaled.height} pixels; the original (${scaled.original_width}\xD7${scaled.original_height}) is ${inFolder ? "in the project folder" : "unchanged on disk"}`,
    ).join(`
`) +
    `
Tell the user they are seeing ${plural(count, "a scaled-down copy", "scaled-down copies")}; ` +
    (flattened.every((o) => o.inFolder)
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
