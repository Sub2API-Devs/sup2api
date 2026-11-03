/**
 * services/api/filesApi.ts
 *
 * Files API（/v1/files）客户端：上传、下载到会话 uploads 目录、删除、批量下载，带指数退避重试；第三方提供商与 HIPAA 组织禁用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/filesApi.ts
 * pieces: chunk-s61vbvea.js (18)
 * attribution: fingerprint 10, layout 6, placement 1, callgraph-fingerprint 1
 */
import * as pathModule from "path";
import * as pathModule_2 from "path";
import * as fsPromisesModule from "fs/promises";
import { randomUUID, randomUUID as randomUUID_2, randomUUID as randomUUID_3 } from "crypto";
import { getAPIProvider } from "../../utils/model/providers.js";
import { assertProviderAllowed } from "../../utils/model/allowedProviders.js";
import {
  isClaudeAISubscriber,
  isClaudeAIOAuthTokenHostInjected,
  isLoginStashedInTokenSlot,
  getClaudeAIOAuthTokens,
} from "../../utils/auth.js";
import { isStoredLoginRefused, storedLoginRefusalReason } from "../../utils/auth/storedLoginRefused.js";
import { isOauthTokenFromBgSnapshot } from "../../bootstrap/state.js";
import { StoredLoginHeldBackError } from "../oauth/storedLoginRefusal.js";
import { hasComplianceTaint } from "../policyLimits/complianceTaints.js";
import { logForDebugging } from "../../utils/debug.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import { ANTHROPIC_VERSION_2, COMBINED_BETA_HEADER } from "../../remote/tools/servedOwnerSettings.js";
import { sleep } from "../../utils/sleep.js";
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";
import { getCwd } from "../../utils/cwd.js";
import { errorMessage } from "../../utils/errors.js";
import { limitConcurrency } from "../../utils/concurrencyLimit.js";
import { count } from "../../utils/collections.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logEvent } from "../analytics/index.js";
import { lit } from "../analytics/safeMetadata.js";

/**
 * Files API 基址：ANTHROPIC_BASE_URL、CLAUDE_CODE_API_BASE_URL 或 api.anthropic.com。
 */
//@ chunk-s61vbvea.js:486519-486638 fingerprint = getDefaultApiBaseUrl (1)
function getDefaultApiBaseUrl() {
  return (
    process.env.ANTHROPIC_BASE_URL || process.env.CLAUDE_CODE_API_BASE_URL || "https://api.anthropic.com"
  );
}
/**
 * 仅第一方；校验端点与登录方式；HIPAA 组织禁用上传。
 */
//@ chunk-s61vbvea.js:486638-487018 layout
function assertFilesApiAvailable(e, n) {
  let r = e || getDefaultApiBaseUrl();
  if (getAPIProvider() !== "firstParty")
    throw Error("Files API is unavailable on third-party providers (data-residency)");
  if (
    (assertProviderAllowed("firstParty", r, "files"),
    (isClaudeAISubscriber() && isStoredLoginRefused(r, !1, !0)) ||
      (n?.isStoredLogin &&
        isStoredLoginRefused(r, !0, !0) &&
        (!isClaudeAIOAuthTokenHostInjected() ||
          isOauthTokenFromBgSnapshot() ||
          isLoginStashedInTokenSlot() ||
          getClaudeAIOAuthTokens()?.accessToken !== n.oauthToken)))
  )
    throw new StoredLoginHeldBackError(storedLoginRefusalReason());
  if (hasComplianceTaint("hipaa")) throw Error("File upload is disabled by your organization's policy.");
}
/**
 * [files-api] 错误日志。
 */
//@ chunk-s61vbvea.js:487018-487071 fingerprint = logDebugError (1)
function logDebugError(message) {
  logForDebugging(`[files-api] ${message}`, { level: "error" });
}
/**
 * [files-api] 调试日志。
 */
//@ chunk-s61vbvea.js:487071-487108 layout = logDebugError (1)
function logFilesApiDebug(message) {
  logForDebugging(`[files-api] ${message}`);
}
//@ chunk-s61vbvea.js:487108-487233 placement = getAuthHeaders (0.76)
function getOAuthApiHeaders(e) {
  return {
    "User-Agent": claudeCodeUserAgent(),
    Authorization: `Bearer ${e.oauthToken}`,
    "anthropic-version": ANTHROPIC_VERSION_2,
    "anthropic-beta": COMBINED_BETA_HEADER,
  };
}
/**
 * 3 次、基础退避 500ms、超时 120s、最大 500MB。
 */
//@ chunk-s61vbvea.js:487233-487273 layout
var FILES_API_MAX_ATTEMPTS = 3,
  FILES_API_BASE_BACKOFF_MS = 500,
  FILES_API_TIMEOUT_MS = 120000,
  FILES_API_MAX_FILE_BYTES = 524288000;
/**
 * 最多 3 次，失败后 500ms×2^(n-1) 退避。
 */
//@ chunk-s61vbvea.js:487273-487558 fingerprint = retryWithBackoff (1)
async function retryWithBackoff(operation, attemptFn) {
  let lastError = "";
  for (let attempt = 1; attempt <= FILES_API_MAX_ATTEMPTS; attempt++) {
    let result = await attemptFn(attempt);
    if (result.done) return result.value;
    if (
      ((lastError = result.error || `${operation} failed`),
      logFilesApiDebug(`${operation} attempt ${attempt}/${FILES_API_MAX_ATTEMPTS} failed: ${lastError}`),
      attempt < FILES_API_MAX_ATTEMPTS)
    ) {
      let delayMs = FILES_API_BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
      (logFilesApiDebug(`Retrying ${operation} in ${delayMs}ms...`), await sleep(delayMs));
    }
  }
  throw Error(`${lastError} after ${FILES_API_MAX_ATTEMPTS} attempts`);
}
/**
 * 下载 /v1/files/<id>/content。
 */
//@ chunk-s61vbvea.js:487558-488276 fingerprint = downloadFile (0.875)
async function downloadFile(fileId, config) {
  let baseUrl = config.baseUrl || getDefaultApiBaseUrl();
  assertFilesApiAvailable(config.baseUrl, config);
  let url = `${baseUrl}/v1/files/${fileId}/content`,
    h = getOAuthApiHeaders(config);
  return (
    logFilesApiDebug(`Downloading file ${fileId} from ${url}`),
    retryWithBackoff(`Download file ${fileId}`, async () => {
      try {
        let response = await Dt.get(url, {
          headers: h,
          responseType: "arraybuffer",
          timeout: 60000,
          validateStatus: (status) => status < 500,
        });
        if (response.status === 200)
          return (
            logFilesApiDebug(`Downloaded file ${fileId} (${response.data.length} bytes)`),
            { done: !0, value: Buffer.from(response.data) }
          );
        if (response.status === 404) throw Error(`File not found: ${fileId}`);
        if (response.status === 401) throw Error("Authentication failed: invalid or missing API key");
        if (response.status === 403) throw Error(`Access denied to file: ${fileId}`);
        return { done: !1, error: `status ${response.status}` };
      } catch (error) {
        if (!Dt.isAxiosError(error)) throw error;
        return { done: !1, error: error.message };
      }
    })
  );
}
/**
 * 计算下载保存路径（会话 uploads 目录内，禁止 .. 越界）。
 */
//@ chunk-s61vbvea.js:488276-488579 fingerprint = buildDownloadPath (1)
function buildDownloadPath(basePath, sessionId, relativePath) {
  let normalized = pathModule_2.normalize(relativePath);
  if (normalized.startsWith(".."))
    return (
      logDebugError(`Invalid file path: ${relativePath}. Path must not traverse above workspace`),
      null
    );
  let uploadsBase = pathModule_2.join(basePath, sessionId, "uploads"),
    matchedPrefix = [
      pathModule_2.join(basePath, sessionId, "uploads") + pathModule_2.sep,
      pathModule_2.sep + "uploads" + pathModule_2.sep,
    ].find((R) => normalized.startsWith(R)),
    cleanPath = matchedPrefix ? normalized.slice(matchedPrefix.length) : normalized;
  return pathModule_2.join(uploadsBase, cleanPath);
}
/**
 * 下载单个文件并写盘。
 */
//@ chunk-s61vbvea.js:488579-489038 fingerprint = downloadAndSaveFile (1)
async function downloadAndSaveFile(attachment, config) {
  let { fileId: fileId, relativePath: relativePath } = attachment,
    fullPath = buildDownloadPath(getCwd(), config.sessionId, relativePath);
  if (!fullPath)
    return { fileId: fileId, path: "", success: !1, error: `Invalid file path: ${relativePath}` };
  try {
    let content = await downloadFile(fileId, config),
      parentDir = pathModule_2.dirname(fullPath);
    return (
      await fsPromisesModule.mkdir(parentDir, { recursive: !0 }),
      await fsPromisesModule.writeFile(fullPath, content),
      logFilesApiDebug(`Saved file ${fileId} to ${fullPath} (${content.length} bytes)`),
      { fileId: fileId, path: fullPath, success: !0, bytesWritten: content.length }
    );
  } catch (error) {
    return (
      logDebugError(`Failed to download file ${fileId}: ${errorMessage(error)}`),
      { fileId: fileId, path: fullPath, success: !1, error: errorMessage(error) }
    );
  }
}
/**
 * 默认下载并发 5。
 */
//@ chunk-s61vbvea.js:489038-489047 layout
var FILE_DOWNLOAD_CONCURRENCY = 5;
/**
 * 并发（默认 5）下载会话文件。
 */
//@ chunk-s61vbvea.js:489047-489463 fingerprint = downloadSessionFiles (0.739)
async function downloadSessionFiles(files, config, concurrency = FILE_DOWNLOAD_CONCURRENCY) {
  if (files.length === 0) return [];
  logFilesApiDebug(`Downloading ${files.length} file(s) for session ${config.sessionId}`);
  let startTime = Date.now(),
    results = await Promise.all(
      files.map(limitConcurrency(concurrency, (file) => downloadAndSaveFile(file, config))),
    ),
    elapsedMs = Date.now() - startTime,
    successCount = count(results, (w) => w.success);
  if (
    (logFilesApiDebug(`Downloaded ${successCount}/${files.length} file(s) in ${elapsedMs}ms`),
    successCount === files.length)
  )
    logFeatureOk("api_files_download");
  else if (successCount > 0) logFeatureSad("api_files_download", "partial_failed");
  else logFeatureBad("api_files_download", "all_failed");
  return results;
}
/**
 * 读本地文件后调用 uploadFile。
 */
//@ chunk-s61vbvea.js:489463-489731 layout
async function uploadFileFromPath(e, n, r, s) {
  (assertFilesApiAvailable(r.baseUrl, r), logFilesApiDebug(`Uploading file ${e} as ${n}`));
  let h;
  try {
    h = s?.content ?? (await fsPromisesModule.readFile(e));
  } catch (error) {
    return (
      logEvent("tengu_file_upload_failed", { error_type: lit("file_read") }),
      { path: n, error: errorMessage(error), success: !1, reason: "file_read" }
    );
  }
  return uploadFile(h, n, r, s);
}
/**
 * 上传到 /v1/files（multipart，大小上限 500MB），带重试与错误分类。
 */
//@ chunk-s61vbvea.js:489731-492338 fingerprint = uploadFile (0.755)
async function uploadFile(filePath, relativePath, config, opts) {
  let baseUrl = config.baseUrl || getDefaultApiBaseUrl();
  assertFilesApiAvailable(config.baseUrl, config);
  let url = `${baseUrl}/v1/files`,
    S = getOAuthApiHeaders(config),
    fileSize = filePath.length;
  if (fileSize > FILES_API_MAX_FILE_BYTES)
    return (
      logEvent("tengu_file_upload_failed", { error_type: lit("file_too_large") }),
      {
        path: relativePath,
        error: `File exceeds maximum size of ${FILES_API_MAX_FILE_BYTES} bytes (actual: ${fileSize})`,
        success: !1,
        reason: "too_large",
      }
    );
  let boundary = `----FormBoundary${randomUUID_2()}`,
    x = escapeMultipartFilename(pathModule_2.basename(relativePath)),
    bodyParts = [];
  if (
    (bodyParts.push(
      Buffer.from(`--${boundary}\r
Content-Disposition: form-data; name="file"; filename="${x}"\r
Content-Type: application/octet-stream\r
\r
`),
    ),
    bodyParts.push(filePath),
    bodyParts.push(
      Buffer.from(`\r
`),
    ),
    bodyParts.push(
      Buffer.from(`--${boundary}\r
Content-Disposition: form-data; name="purpose"\r
\r
user_data\r
`),
    ),
    opts?.expiresInSeconds !== void 0)
  )
    bodyParts.push(
      Buffer.from(`--${boundary}\r
Content-Disposition: form-data; name="expires_in_seconds"\r
\r
${opts.expiresInSeconds}\r
`),
    );
  bodyParts.push(
    Buffer.from(`--${boundary}--\r
`),
  );
  let body = Buffer.concat(bodyParts);
  try {
    return await retryWithBackoff(`Upload file ${relativePath}`, async (G) => {
      if (opts?.signal?.aborted) throw new UploadNonRetriableError("Upload canceled", "canceled");
      let L = (q) => {
        if (G >= FILES_API_MAX_ATTEMPTS)
          throw (
            logEvent("tengu_file_upload_failed", { error_type: lit("server") }),
            new UploadNonRetriableError(`${q} after ${FILES_API_MAX_ATTEMPTS} attempts`, "server")
          );
        return { done: !1, error: q };
      };
      try {
        let response = await Dt.post(url, body, {
          headers: {
            ...S,
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
            "Content-Length": body.length.toString(),
          },
          timeout: opts?.timeoutMs ?? FILES_API_TIMEOUT_MS,
          signal: opts?.signal,
          validateStatus: (status) => status < 500,
        });
        if (response.status === 200 || response.status === 201) {
          let fileId = response.data?.id;
          if (!fileId) return L("Upload succeeded but no file ID returned");
          return (
            logFilesApiDebug(`Uploaded ${relativePath} (${fileSize} bytes)`),
            { done: !0, value: { path: relativePath, fileId: fileId, size: fileSize, success: !0 } }
          );
        }
        if (response.status === 401)
          throw (
            logEvent("tengu_file_upload_failed", { error_type: lit("auth") }),
            new UploadNonRetriableError("Authentication failed: invalid or missing API key", "auth")
          );
        if (response.status === 403)
          throw (
            logEvent("tengu_file_upload_failed", { error_type: lit("forbidden") }),
            new UploadNonRetriableError("Access denied for upload", "forbidden")
          );
        if (response.status === 413)
          throw (
            logEvent("tengu_file_upload_failed", { error_type: lit("size") }),
            new UploadNonRetriableError("File too large for upload", "too_large")
          );
        if (response.status === 400 || response.status === 404 || response.status === 422)
          throw (
            logEvent("tengu_file_upload_failed", { error_type: lit("server") }),
            new UploadNonRetriableError(`status ${response.status}`, "server")
          );
        return L(`status ${response.status}`);
      } catch (error) {
        if (error instanceof UploadNonRetriableError) throw error;
        if (Dt.isCancel(error)) throw new UploadNonRetriableError("Upload canceled", "canceled");
        if (Dt.isAxiosError(error)) {
          if (opts?.retryAfterTimeout === !1 && error.code === "ECONNABORTED" && error.cause === void 0)
            throw (
              logEvent("tengu_file_upload_failed", { error_type: lit("network") }),
              new UploadNonRetriableError(error.message, "network")
            );
          return { done: !1, error: error.message };
        }
        throw error;
      }
    });
  } catch (error) {
    if (error instanceof UploadNonRetriableError)
      return { path: relativePath, error: error.message, success: !1, reason: error.reason };
    return (
      logEvent("tengu_file_upload_failed", { error_type: lit("network") }),
      { path: relativePath, error: errorMessage(error), success: !1, reason: "network" }
    );
  }
}
/**
 * multipart 文件名里的 " CR LF 转义。
 */
//@ chunk-s61vbvea.js:492338-492422 layout
function escapeMultipartFilename(e) {
  return e.replace(/["\r\n]/g, (n) => (n === '"' ? "%22" : n === "\r" ? "%0D" : "%0A"));
}
/**
 * 不可重试的上传错误（带原因）。
 */
//@ chunk-s61vbvea.js:492422-492529 fingerprint = UploadNonRetriableError (1)
class UploadNonRetriableError extends Error {
  reason;
  constructor(e, n) {
    super(e);
    this.reason = n;
    this.name = "UploadNonRetriableError";
  }
}
/**
 * DELETE /v1/files/<id>，返回 success 或 auth/forbidden/not_found 等原因。旧版名 listFilesCreatedAfter 为错配。
 */
//@ chunk-s61vbvea.js:492529-493170 callgraph-fingerprint = listFilesCreatedAfter (0.271)
async function deleteFile(e, n, r) {
  let s = n.baseUrl || getDefaultApiBaseUrl();
  assertFilesApiAvailable(n.baseUrl, n);
  let h = `${s}/v1/files/${encodeURIComponent(e)}`;
  try {
    let y = await Dt.delete(h, {
      headers: getOAuthApiHeaders(n),
      timeout: r.timeoutMs,
      validateStatus: () => !0,
    });
    if (y.status >= 200 && y.status < 300) return (logFilesApiDebug(`Deleted file ${e}`), { success: !0 });
    switch ((logFilesApiDebug(`Delete file ${e} failed: HTTP ${y.status}`), y.status)) {
      case 401:
        return { success: !1, reason: "auth" };
      case 403:
        return { success: !1, reason: "forbidden" };
      case 404:
        return { success: !1, reason: "not_found" };
      default:
        return { success: !1, reason: "server" };
    }
  } catch (error) {
    if (!Dt.isAxiosError(error)) throw error;
    return (
      logFilesApiDebug(`Delete file ${e} failed: ${error.message}`),
      { success: !1, reason: "network" }
    );
  }
}
/**
 * 解析 "file_id:relative_path" 文件规格列表。
 */
//@ chunk-s61vbvea.js:493170-493469 fingerprint = parseFileSpecs (1)
function parseFileSpecs(fileSpecs) {
  let files = [],
    expandedSpecs = fileSpecs.flatMap((s) => s.split(" ").filter(Boolean));
  for (let spec of expandedSpecs) {
    let colonIndex = spec.indexOf(":");
    if (colonIndex === -1) continue;
    let fileId = spec.substring(0, colonIndex),
      relativePath = spec.substring(colonIndex + 1);
    if (!fileId || !relativePath) {
      logDebugError(`Invalid file spec: ${spec}. Both file_id and path are required`);
      continue;
    }
    files.push({ fileId: fileId, relativePath: relativePath });
  }
  return files;
}

export {
  parseFileSpecs,
  downloadSessionFiles,
  FILES_API_MAX_FILE_BYTES,
  deleteFile,
  uploadFileFromPath,
  uploadFile,
  assertFilesApiAvailable,
};
