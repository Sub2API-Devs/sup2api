/**
 * services/fileInputs/uploadPut.ts
 *
 * 2.1.316 新增：附件 PUT 上传与上传筛查
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hvmd1zqg.js (7)
 * attribution: placement 7
 */
import { sep, join, basename } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { httpsOrigin, apiClient } from "../routines/routinesApi.js";
import { sleep } from "../../utils/sleep.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, getErrnoCode } from "../../utils/errors.js";
import { expandPathOrNull } from "../../utils/path.js";
import { env } from "../../utils/env.js";
import { isSyncedAttachPath } from "../../utils/readFileInRange.js";
import {
  DEFAULT_OUTPUTS_ROOT,
  DEFAULT_ATTACH_OUTPUTS_ROOT,
  PROJECT_FILES_LINK,
} from "../../utils/stageFileRoots.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { normalizeTrustedSymlink } from "../../utils/permissions/filesystem.js";
import { identity } from "../../utils/pathClassification.js";
import {
  isCredentialPath,
  isSensitiveBasenameWithVariants,
  isCredentialConfigPath_2,
} from "../../utils/permissions/sensitivePaths.js";
import { sessionUploadsDir } from "../../utils/uploadsDir.js";
import { uploadDisplayName, readValidatedFileWithin } from "../../utils/claudeInChrome/fileUpload.js";
import { BIDI_CONTROL_PATTERN } from "./screenPath.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hvmd1zqg.js:887-1151 placement
/**
 * 重试等待上限（10 秒）。
 */
var UPLOAD_PUT_CONSTANTS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_TOKEN_HEADER_CHARS;
var PUT_TIMEOUT_MS;
var MAX_CONTENT_LENGTH;
var putResultSchema;
var PUT_STATUS_REASONS;
var MAX_BUSY_RETRIES;
var DEFAULT_RETRY_DELAY_MS;
var MAX_RETRY_DELAY_MS;
deferInit("chunk-hvmd1zqg.js:887", () => {
  UPLOAD_PUT_CONSTANTS = new Set(["x-upload-token", "content-type"]);
  MAX_TOKEN_HEADER_CHARS = 4096;
  PUT_TIMEOUT_MS = 120000;
  MAX_CONTENT_LENGTH = 4096;
  putResultSchema = DoctorLazy(() =>
    objectSchema({
      sha256: stringSchema(),
      size: numberSchema(),
    }),
  );
  PUT_STATUS_REASONS = {
    400: "put_hash_mismatch",
    403: "put_refused",
    409: "put_already_used",
    410: "put_expired",
    413: "put_size_mismatch",
    429: "put_busy",
    503: "put_busy",
  };
  MAX_BUSY_RETRIES = 2;
  DEFAULT_RETRY_DELAY_MS = 2000;
  MAX_RETRY_DELAY_MS = 1e4;
});
//@ chunk-hvmd1zqg.js:1151-2402 placement
/**
 * 把文件以 PUT 上传到预签名地址，校验主机、响应哈希与大小。
 */
async function putUploadFile(target, buf, sha256, uploadPathPrefix, signal) {
  let origin = httpsOrigin(target.url);
  let parsedUrl = origin === undefined ? undefined : new URL(target.url);
  if (
    origin === undefined ||
    parsedUrl === undefined ||
    parsedUrl.search !== "" ||
    parsedUrl.hash !== "" ||
    !uploadPathPrefix.endsWith("/") ||
    !parsedUrl.pathname.startsWith(uploadPathPrefix) ||
    !/^[A-Za-z0-9_-]{1,256}$/.test(parsedUrl.pathname.slice(uploadPathPrefix.length))
  )
    return "put_url_refused";
  let headers = {
    "content-type": "application/octet-stream",
  };
  for (let [key, value] of Object.entries(target.headers)) {
    if (
      !UPLOAD_PUT_CONSTANTS.has(key.toLowerCase()) ||
      value.length > MAX_TOKEN_HEADER_CHARS ||
      /[^\x20-\x7e]/.test(value)
    )
      return "put_header_refused";
    headers[key.toLowerCase()] = value;
  }
  try {
    for (let j = 0; ; j++) {
      let response = await apiClient.put(`/${parsedUrl.pathname.slice(1)}`, buf, {
        auth: "none",
        baseUrl: origin,
        headers,
        maxRedirects: 0,
        maxBodyLength: buf.length,
        maxContentLength: MAX_CONTENT_LENGTH,
        timeout: PUT_TIMEOUT_MS,
        signal,
        validateStatus: () => true,
      });
      if (!response.ok)
        return response.reason === "essential-traffic-only" ? "essential_traffic" : "egress_blocked";
      if (response.status === 200) {
        let parsed = putResultSchema().safeParse(response.data);
        return parsed.success && parsed.data.sha256 === sha256 && parsed.data.size === buf.length
          ? undefined
          : "put_bad_answer";
      }
      let reason = PUT_STATUS_REASONS[response.status] ?? "put_failed";
      if (reason !== "put_busy" || j === MAX_BUSY_RETRIES) return reason;
      let retryAfter = Number(response.response.headers["retry-after"]);
      await sleep(
        Number.isFinite(retryAfter) && retryAfter >= 0
          ? Math.min(retryAfter * 1000, MAX_RETRY_DELAY_MS)
          : DEFAULT_RETRY_DELAY_MS,
        signal,
      );
      if (signal.aborted) return "canceled";
    }
  } catch (error) {
    if (signal.aborted) return "canceled";
    logForDebugging(`[file inputs] upload threw: ${errorMessage(error)}`, {
      level: "error",
    });
    return getErrnoCode(error) === "ERR_BAD_RESPONSE" ? "put_bad_answer" : "put_network";
  }
}
//@ chunk-hvmd1zqg.js:2402-3367 placement
function createUploadScreen({
  screen,
  maxFileBytes,
  maxTotalBytes,
  uploadPathPrefix,
  namesResolvedPaths = false,
  onRejectedPastScreen,
}) {
  return {
    async hash(paths, signal) {
      let results = [];
      let totalBytes = 0;
      for (let path of paths) {
        if (signal.aborted)
          return [
            ...results,
            {
              path,
              code: "canceled",
            },
          ];
        let candidate = await statUploadCandidate(path, screen, maxFileBytes, {
          onRejectedPastScreen,
        });
        if ("code" in candidate)
          return [
            ...results,
            namesResolvedPaths
              ? candidate
              : {
                  path,
                  code: candidate.code,
                },
          ];
        totalBytes += candidate.buf.length;
        if (totalBytes > maxTotalBytes)
          return [
            ...results,
            {
              path,
              code: "too_large_total",
            },
          ];
        results.push({
          path,
          name: candidate.name,
          size: candidate.buf.length,
          sha256: candidate.sha256,
        });
      }
      return results;
    },
    async put(items, signal) {
      let results = [];
      let totalBytes = 0;
      for (let { path, sha256, url, headers } of items) {
        if (signal.aborted)
          return [
            ...results,
            {
              path,
              code: "canceled",
            },
          ];
        let candidate = await statUploadCandidate(path, screen, maxFileBytes, {
          onRejectedPastScreen,
        });
        if ("code" in candidate)
          return [
            ...results,
            candidate.code === "resolves_elsewhere"
              ? {
                  path,
                  code: "changed",
                }
              : candidate,
          ];
        totalBytes += candidate.buf.length;
        if (totalBytes > maxTotalBytes)
          return [
            ...results,
            {
              path,
              code: "too_large_total",
            },
          ];
        if (candidate.sha256 !== sha256)
          return [
            ...results,
            {
              path,
              code: "changed",
            },
          ];
        let failureCode = await putUploadFile(
          {
            url,
            headers,
          },
          candidate.buf,
          sha256,
          uploadPathPrefix,
          signal,
        );
        if (failureCode !== undefined)
          return [
            ...results,
            {
              path,
              code: failureCode,
            },
          ];
        results.push({
          path,
          ok: true,
        });
      }
      return results;
    },
  };
}
//@ chunk-hvmd1zqg.js:3367-3585 placement
function isOutsideUploadRoot(path, path_2) {
  let expanded = expandPathOrNull(path);
  if (expanded === null) return true;
  return (
    path !== path_2 &&
    normalizeUploadPath(expanded) !== normalizeUploadPath(path_2) &&
    !(
      env.CLAUDE_CODE_REMOTE === true &&
      isSyncedAttachPath(expanded, path_2, {
        product: DEFAULT_OUTPUTS_ROOT,
        attach: DEFAULT_ATTACH_OUTPUTS_ROOT,
      })
    ) &&
    !(
      isRemoteManagedEnvironment() &&
      env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE !== "self_hosted" &&
      isSyncedAttachPath(expanded, path_2, PROJECT_FILES_LINK)
    )
  );
}
//@ chunk-hvmd1zqg.js:3585-3697 placement
function normalizeUploadPath(path) {
  return normalizeTrustedSymlink(
    identity(path.length > 1 && path.endsWith(sep) ? path.slice(0, -1) : path),
  ).replace(/^[a-z]:/, (driveLetter) => driveLetter.toUpperCase());
}
//@ chunk-hvmd1zqg.js:3697-3799 placement
async function isUploadAllowedPath(path, realPath, { fromChat = false } = {}) {
  return (
    (await isCredentialPath(path, realPath)) ||
    (!fromChat &&
      [path, realPath].some(
        (candidatePath) =>
          isSensitiveBasenameWithVariants(candidatePath) || isCredentialConfigPath_2(candidatePath),
      ))
  );
}
//@ chunk-hvmd1zqg.js:3799-4600 placement
async function statUploadCandidate(
  path,
  screen,
  maxFileBytes,
  { followsLinks = false, onRejectedPastScreen } = {},
) {
  let screened = await screen(path);
  if (screened === undefined)
    return {
      path,
      code: "path_rejected",
    };
  if (
    screened.requiredDigest === undefined &&
    (await isUploadAllowedPath(path, screened.realPath, screened))
  ) {
    logForDebugging("[file inputs] a path was rejected: a credential, or Claude's own");
    onRejectedPastScreen?.(path, "credential_or_own_file");
    return {
      path,
      code: "path_rejected",
    };
  }
  if (
    !followsLinks &&
    isOutsideUploadRoot(path, screened.realPath) &&
    !(
      screened.requiredDigest !== undefined &&
      expandPathOrNull(path) === join(sessionUploadsDir(), basename(screened.realPath))
    )
  )
    return {
      path,
      code: "resolves_elsewhere",
      resolved: screened.realPath,
    };
  let mime = await uploadDisplayName(screened.realPath);
  if (BIDI_CONTROL_PATTERN.test(mime))
    return {
      path,
      code: "name_direction",
    };
  let validatedFileWithin = await readValidatedFileWithin(screened.realPath, maxFileBytes);
  if (!("buf" in validatedFileWithin))
    return {
      path,
      code: validatedFileWithin.refusal,
    };
  let contentHash = computeContentHash(validatedFileWithin.buf);
  if (screened.requiredDigest !== undefined && contentHash !== screened.requiredDigest) {
    onRejectedPastScreen?.(path, "attachment_changed");
    return {
      path,
      code: "path_rejected",
    };
  }
  return {
    buf: validatedFileWithin.buf,
    name: mime,
    sha256: contentHash,
  };
}
export { createUploadScreen, isUploadAllowedPath, statUploadCandidate };
