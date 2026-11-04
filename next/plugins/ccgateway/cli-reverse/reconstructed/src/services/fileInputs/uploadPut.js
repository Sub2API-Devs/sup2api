/**
 * services/fileInputs/uploadPut.ts
 *
 * 2.1.316 新增：附件 PUT 上传与上传筛查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0c614h9c.js (7)
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

//@ chunk-0c614h9c.js:887-1151 placement
/**
 * 重试等待上限（10 秒）。
 */
var UPLOAD_PUT_CONSTANTS = new Set(["x-upload-token", "content-type"]);
var MAX_TOKEN_HEADER_CHARS = 4096;
var PUT_TIMEOUT_MS = 120000;
var MAX_CONTENT_LENGTH = 4096;
var putResultSchema = DoctorLazy(() =>
  objectSchema({
    sha256: stringSchema(),
    size: numberSchema(),
  }),
);
var PUT_STATUS_REASONS = {
  400: "put_hash_mismatch",
  403: "put_refused",
  409: "put_already_used",
  410: "put_expired",
  413: "put_size_mismatch",
  429: "put_busy",
  503: "put_busy",
};
var MAX_BUSY_RETRIES = 2;
var DEFAULT_RETRY_DELAY_MS = 2000;
var MAX_RETRY_DELAY_MS = 1e4;
//@ chunk-0c614h9c.js:1151-2402 placement
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
//@ chunk-0c614h9c.js:2402-3294 placement
function createUploadScreen({
  screen,
  maxFileBytes,
  maxTotalBytes,
  uploadPathPrefix,
  namesResolvedPaths = false,
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
        let candidate = await statUploadCandidate(path, screen, maxFileBytes);
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
        let candidate = await statUploadCandidate(path, screen, maxFileBytes);
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
//@ chunk-0c614h9c.js:3294-3512 placement
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
//@ chunk-0c614h9c.js:3512-3624 placement
function normalizeUploadPath(path) {
  return normalizeTrustedSymlink(
    identity(path.length > 1 && path.endsWith(sep) ? path.slice(0, -1) : path),
  ).replace(/^[a-z]:/, (driveLetter) => driveLetter.toUpperCase());
}
//@ chunk-0c614h9c.js:3624-3726 placement
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
//@ chunk-0c614h9c.js:3726-4443 placement
async function statUploadCandidate(path, screen, maxFileBytes, { followsLinks = false } = {}) {
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
  let _ = await uploadDisplayName(screened.realPath);
  if (BIDI_CONTROL_PATTERN.test(_))
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
  if (screened.requiredDigest !== undefined && contentHash !== screened.requiredDigest)
    return {
      path,
      code: "path_rejected",
    };
  return {
    buf: validatedFileWithin.buf,
    name: _,
    sha256: contentHash,
  };
}
export { isUploadAllowedPath, statUploadCandidate, createUploadScreen };
