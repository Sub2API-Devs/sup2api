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
import "path";
import * as pathModule_2 from "path";
import * as fsPromisesModule from "fs/promises";
import { randomUUID } from "crypto";
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
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { getCwd } from "../../utils/cwd.js";
import { errorMessage } from "../../utils/errors.js";
import { limitConcurrency } from "../../utils/concurrencyLimit.js";
import { count } from "../../utils/collections.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logEvent } from "../analytics/index.js";
import { lit } from "../analytics/safeMetadata.js";

//@ chunk-s61vbvea.js:486519-486638 fingerprint (2.1.88 match: getDefaultApiBaseUrl, 1)
/**
 * Files API 基址：ANTHROPIC_BASE_URL、CLAUDE_CODE_API_BASE_URL 或 api.anthropic.com。
 */
function getDefaultApiBaseUrl() {
  return (
    process.env.ANTHROPIC_BASE_URL || process.env.CLAUDE_CODE_API_BASE_URL || "https://api.anthropic.com"
  );
}
//@ chunk-s61vbvea.js:486638-487018 layout
/**
 * 仅第一方；校验端点与登录方式；HIPAA 组织禁用上传。
 */
function assertFilesApiAvailable(baseUrl, config) {
  let base = baseUrl || getDefaultApiBaseUrl();
  if (getAPIProvider() !== "firstParty")
    throw Error("Files API is unavailable on third-party providers (data-residency)");
  assertProviderAllowed("firstParty", base, "files");
  if (
    (isClaudeAISubscriber() && isStoredLoginRefused(base, false, true)) ||
    (config?.isStoredLogin &&
      isStoredLoginRefused(base, true, true) &&
      (!isClaudeAIOAuthTokenHostInjected() ||
        isOauthTokenFromBgSnapshot() ||
        isLoginStashedInTokenSlot() ||
        getClaudeAIOAuthTokens()?.accessToken !== config.oauthToken))
  )
    throw new StoredLoginHeldBackError(storedLoginRefusalReason());
  if (hasComplianceTaint("hipaa")) throw Error("File upload is disabled by your organization's policy.");
}
//@ chunk-s61vbvea.js:487018-487071 fingerprint (2.1.88 match: logDebugError, 1)
/**
 * [files-api] 错误日志。
 */
function logDebugError(message) {
  logForDebugging(`[files-api] ${message}`, {
    level: "error",
  });
}
//@ chunk-s61vbvea.js:487071-487108 layout (2.1.88 match: logDebugError, 1)
/**
 * [files-api] 调试日志。
 */
function logFilesApiDebug(message) {
  logForDebugging(`[files-api] ${message}`);
}
//@ chunk-s61vbvea.js:487108-487233 placement (2.1.88 match: getAuthHeaders, 0.76)
function getOAuthApiHeaders(config) {
  return {
    "User-Agent": claudeCodeUserAgent(),
    Authorization: `Bearer ${config.oauthToken}`,
    "anthropic-version": ANTHROPIC_VERSION_2,
    "anthropic-beta": COMBINED_BETA_HEADER,
  };
}
//@ chunk-s61vbvea.js:487233-487273 layout
/**
 * 3 次、基础退避 500ms、超时 120s、最大 500MB。
 */
var FILES_API_MAX_ATTEMPTS = 3;
var FILES_API_BASE_BACKOFF_MS = 500;
var FILES_API_TIMEOUT_MS = 120000;
var FILES_API_MAX_FILE_BYTES = 524288000;
//@ chunk-s61vbvea.js:487273-487558 fingerprint (2.1.88 match: retryWithBackoff, 1)
/**
 * 最多 3 次，失败后 500ms×2^(n-1) 退避。
 */
async function retryWithBackoff(operation, attemptFn) {
  let lastError = "";
  for (let attempt = 1; attempt <= FILES_API_MAX_ATTEMPTS; attempt++) {
    let result = await attemptFn(attempt);
    if (result.done) return result.value;
    lastError = result.error || `${operation} failed`;
    logFilesApiDebug(`${operation} attempt ${attempt}/${FILES_API_MAX_ATTEMPTS} failed: ${lastError}`);
    if (attempt < FILES_API_MAX_ATTEMPTS) {
      let delayMs = FILES_API_BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
      logFilesApiDebug(`Retrying ${operation} in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }
  throw Error(`${lastError} after ${FILES_API_MAX_ATTEMPTS} attempts`);
}
//@ chunk-s61vbvea.js:487558-488276 fingerprint (2.1.88 match: downloadFile, 0.875)
/**
 * 下载 /v1/files/<id>/content。
 */
async function downloadFile(fileId, config) {
  let baseUrl = config.baseUrl || getDefaultApiBaseUrl();
  assertFilesApiAvailable(config.baseUrl, config);
  let url = `${baseUrl}/v1/files/${fileId}/content`;
  let headers = getOAuthApiHeaders(config);
  logFilesApiDebug(`Downloading file ${fileId} from ${url}`);
  return retryWithBackoff(`Download file ${fileId}`, async () => {
    try {
      let response = await axios_default.get(url, {
        headers,
        responseType: "arraybuffer",
        timeout: 60000,
        validateStatus: (status) => status < 500,
      });
      if (response.status === 200) {
        logFilesApiDebug(`Downloaded file ${fileId} (${response.data.length} bytes)`);
        return {
          done: true,
          value: Buffer.from(response.data),
        };
      }
      if (response.status === 404) throw Error(`File not found: ${fileId}`);
      if (response.status === 401) throw Error("Authentication failed: invalid or missing API key");
      if (response.status === 403) throw Error(`Access denied to file: ${fileId}`);
      return {
        done: false,
        error: `status ${response.status}`,
      };
    } catch (error) {
      if (!axios_default.isAxiosError(error)) throw error;
      return {
        done: false,
        error: error.message,
      };
    }
  });
}
//@ chunk-s61vbvea.js:488276-488579 fingerprint (2.1.88 match: buildDownloadPath, 1)
/**
 * 计算下载保存路径（会话 uploads 目录内，禁止 .. 越界）。
 */
function buildDownloadPath(basePath, sessionId, relativePath) {
  let normalized = pathModule_2.normalize(relativePath);
  if (normalized.startsWith("..")) {
    logDebugError(`Invalid file path: ${relativePath}. Path must not traverse above workspace`);
    return null;
  }
  let uploadsBase = pathModule_2.join(basePath, sessionId, "uploads");
  let matchedPrefix = [
    pathModule_2.join(basePath, sessionId, "uploads") + pathModule_2.sep,
    pathModule_2.sep + "uploads" + pathModule_2.sep,
  ].find((prefix) => normalized.startsWith(prefix));
  let cleanPath = matchedPrefix ? normalized.slice(matchedPrefix.length) : normalized;
  return pathModule_2.join(uploadsBase, cleanPath);
}
//@ chunk-s61vbvea.js:488579-489038 fingerprint (2.1.88 match: downloadAndSaveFile, 1)
/**
 * 下载单个文件并写盘。
 */
async function downloadAndSaveFile(attachment, config) {
  let { fileId, relativePath } = attachment;
  let fullPath = buildDownloadPath(getCwd(), config.sessionId, relativePath);
  if (!fullPath)
    return {
      fileId,
      path: "",
      success: false,
      error: `Invalid file path: ${relativePath}`,
    };
  try {
    let content = await downloadFile(fileId, config);
    let parentDir = pathModule_2.dirname(fullPath);
    await fsPromisesModule.mkdir(parentDir, {
      recursive: true,
    });
    await fsPromisesModule.writeFile(fullPath, content);
    logFilesApiDebug(`Saved file ${fileId} to ${fullPath} (${content.length} bytes)`);
    return {
      fileId,
      path: fullPath,
      success: true,
      bytesWritten: content.length,
    };
  } catch (error) {
    logDebugError(`Failed to download file ${fileId}: ${errorMessage(error)}`);
    return {
      fileId,
      path: fullPath,
      success: false,
      error: errorMessage(error),
    };
  }
}
//@ chunk-s61vbvea.js:489038-489047 layout
/**
 * 默认下载并发 5。
 */
var FILE_DOWNLOAD_CONCURRENCY = 5;
//@ chunk-s61vbvea.js:489047-489463 fingerprint (2.1.88 match: downloadSessionFiles, 0.739)
/**
 * 并发（默认 5）下载会话文件。
 */
async function downloadSessionFiles(files, config, concurrency = FILE_DOWNLOAD_CONCURRENCY) {
  if (files.length === 0) return [];
  logFilesApiDebug(`Downloading ${files.length} file(s) for session ${config.sessionId}`);
  let startTime = Date.now();
  let results = await Promise.all(
    files.map(limitConcurrency(concurrency, (file) => downloadAndSaveFile(file, config))),
  );
  let elapsedMs = Date.now() - startTime;
  let successCount = count(results, (result) => result.success);
  logFilesApiDebug(`Downloaded ${successCount}/${files.length} file(s) in ${elapsedMs}ms`);
  if (successCount === files.length) logFeatureOk("api_files_download");
  else if (successCount > 0) logFeatureSad("api_files_download", "partial_failed");
  else logFeatureBad("api_files_download", "all_failed");
  return results;
}
//@ chunk-s61vbvea.js:489463-489731 layout
/**
 * 读本地文件后调用 uploadFile。
 */
async function uploadFileFromPath(path, relativePath, config, opts) {
  assertFilesApiAvailable(config.baseUrl, config);
  logFilesApiDebug(`Uploading file ${path} as ${relativePath}`);
  let filePath;
  try {
    filePath = opts?.content ?? (await fsPromisesModule.readFile(path));
  } catch (error) {
    logEvent("tengu_file_upload_failed", {
      error_type: lit("file_read"),
    });
    return {
      path: relativePath,
      error: errorMessage(error),
      success: false,
      reason: "file_read",
    };
  }
  return uploadFile(filePath, relativePath, config, opts);
}
//@ chunk-s61vbvea.js:489731-492338 fingerprint (2.1.88 match: uploadFile, 0.755)
/**
 * 上传到 /v1/files（multipart，大小上限 500MB），带重试与错误分类。
 */
async function uploadFile(filePath, relativePath, config, opts) {
  let baseUrl = config.baseUrl || getDefaultApiBaseUrl();
  assertFilesApiAvailable(config.baseUrl, config);
  let url = `${baseUrl}/v1/files`;
  let headers = getOAuthApiHeaders(config);
  let fileSize = filePath.length;
  if (fileSize > FILES_API_MAX_FILE_BYTES) {
    logEvent("tengu_file_upload_failed", {
      error_type: lit("file_too_large"),
    });
    return {
      path: relativePath,
      error: `File exceeds maximum size of ${FILES_API_MAX_FILE_BYTES} bytes (actual: ${fileSize})`,
      success: false,
      reason: "too_large",
    };
  }
  let boundary = `----FormBoundary${randomUUID()}`;
  let filename = escapeMultipartFilename(pathModule_2.basename(relativePath));
  let bodyParts = [];
  bodyParts.push(
    Buffer.from(`--${boundary}\r
Content-Disposition: form-data; name="file"; filename="${filename}"\r
Content-Type: application/octet-stream\r
\r
`),
  );
  bodyParts.push(filePath);
  bodyParts.push(
    Buffer.from(`\r
`),
  );
  bodyParts.push(
    Buffer.from(`--${boundary}\r
Content-Disposition: form-data; name="purpose"\r
\r
user_data\r
`),
  );
  if (opts?.expiresInSeconds !== undefined)
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
    return await retryWithBackoff(`Upload file ${relativePath}`, async (attempt) => {
      if (opts?.signal?.aborted) throw new UploadNonRetriableError("Upload canceled", "canceled");
      let retryOnFailure = (reason) => {
        if (attempt >= FILES_API_MAX_ATTEMPTS) {
          logEvent("tengu_file_upload_failed", {
            error_type: lit("server"),
          });
          throw new UploadNonRetriableError(`${reason} after ${FILES_API_MAX_ATTEMPTS} attempts`, "server");
        }
        return {
          done: false,
          error: reason,
        };
      };
      try {
        let response = await axios_default.post(url, body, {
          headers: {
            ...headers,
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
            "Content-Length": body.length.toString(),
          },
          timeout: opts?.timeoutMs ?? FILES_API_TIMEOUT_MS,
          signal: opts?.signal,
          validateStatus: (status) => status < 500,
        });
        if (response.status === 200 || response.status === 201) {
          let fileId = response.data?.id;
          if (!fileId) return retryOnFailure("Upload succeeded but no file ID returned");
          logFilesApiDebug(`Uploaded ${relativePath} (${fileSize} bytes)`);
          return {
            done: true,
            value: {
              path: relativePath,
              fileId,
              size: fileSize,
              success: true,
            },
          };
        }
        if (response.status === 401) {
          logEvent("tengu_file_upload_failed", {
            error_type: lit("auth"),
          });
          throw new UploadNonRetriableError("Authentication failed: invalid or missing API key", "auth");
        }
        if (response.status === 403) {
          logEvent("tengu_file_upload_failed", {
            error_type: lit("forbidden"),
          });
          throw new UploadNonRetriableError("Access denied for upload", "forbidden");
        }
        if (response.status === 413) {
          logEvent("tengu_file_upload_failed", {
            error_type: lit("size"),
          });
          throw new UploadNonRetriableError("File too large for upload", "too_large");
        }
        if (response.status === 400 || response.status === 404 || response.status === 422) {
          logEvent("tengu_file_upload_failed", {
            error_type: lit("server"),
          });
          throw new UploadNonRetriableError(`status ${response.status}`, "server");
        }
        return retryOnFailure(`status ${response.status}`);
      } catch (error) {
        if (error instanceof UploadNonRetriableError) throw error;
        if (axios_default.isCancel(error)) throw new UploadNonRetriableError("Upload canceled", "canceled");
        if (axios_default.isAxiosError(error)) {
          if (
            opts?.retryAfterTimeout === false &&
            error.code === "ECONNABORTED" &&
            error.cause === undefined
          ) {
            logEvent("tengu_file_upload_failed", {
              error_type: lit("network"),
            });
            throw new UploadNonRetriableError(error.message, "network");
          }
          return {
            done: false,
            error: error.message,
          };
        }
        throw error;
      }
    });
  } catch (error) {
    if (error instanceof UploadNonRetriableError)
      return {
        path: relativePath,
        error: error.message,
        success: false,
        reason: error.reason,
      };
    logEvent("tengu_file_upload_failed", {
      error_type: lit("network"),
    });
    return {
      path: relativePath,
      error: errorMessage(error),
      success: false,
      reason: "network",
    };
  }
}
//@ chunk-s61vbvea.js:492338-492422 layout
/**
 * multipart 文件名里的 " CR LF 转义。
 */
function escapeMultipartFilename(filename) {
  return filename.replace(/["\r\n]/g, (ch) => (ch === '"' ? "%22" : ch === "\r" ? "%0D" : "%0A"));
}
//@ chunk-s61vbvea.js:492422-492529 fingerprint (2.1.88 match: UploadNonRetriableError, 1)
/**
 * 不可重试的上传错误（带原因）。
 */
class UploadNonRetriableError extends Error {
  reason;
  constructor(message, reason) {
    super(message);
    this.reason = reason;
    this.name = "UploadNonRetriableError";
  }
}
//@ chunk-s61vbvea.js:492529-493170 callgraph-fingerprint (2.1.88 match: listFilesCreatedAfter, 0.271)
/**
 * DELETE /v1/files/<id>，返回 success 或 auth/forbidden/not_found 等原因。旧版名 listFilesCreatedAfter 为错配。
 */
async function deleteFile(fileId, config, opts) {
  let baseUrl = config.baseUrl || getDefaultApiBaseUrl();
  assertFilesApiAvailable(config.baseUrl, config);
  let url = `${baseUrl}/v1/files/${encodeURIComponent(fileId)}`;
  try {
    let response = await axios_default.delete(url, {
      headers: getOAuthApiHeaders(config),
      timeout: opts.timeoutMs,
      validateStatus: () => true,
    });
    if (response.status >= 200 && response.status < 300) {
      logFilesApiDebug(`Deleted file ${fileId}`);
      return {
        success: true,
      };
    }
    switch ((logFilesApiDebug(`Delete file ${fileId} failed: HTTP ${response.status}`), response.status)) {
      case 401:
        return {
          success: false,
          reason: "auth",
        };
      case 403:
        return {
          success: false,
          reason: "forbidden",
        };
      case 404:
        return {
          success: false,
          reason: "not_found",
        };
      default:
        return {
          success: false,
          reason: "server",
        };
    }
  } catch (error) {
    if (!axios_default.isAxiosError(error)) throw error;
    logFilesApiDebug(`Delete file ${fileId} failed: ${error.message}`);
    return {
      success: false,
      reason: "network",
    };
  }
}
//@ chunk-s61vbvea.js:493170-493469 fingerprint (2.1.88 match: parseFileSpecs, 1)
/**
 * 解析 "file_id:relative_path" 文件规格列表。
 */
function parseFileSpecs(fileSpecs) {
  let files = [];
  let expandedSpecs = fileSpecs.flatMap((fileSpec) => fileSpec.split(" ").filter(Boolean));
  for (let spec of expandedSpecs) {
    let colonIndex = spec.indexOf(":");
    if (colonIndex === -1) continue;
    let fileId = spec.substring(0, colonIndex);
    let relativePath = spec.substring(colonIndex + 1);
    if (!fileId || !relativePath) {
      logDebugError(`Invalid file spec: ${spec}. Both file_id and path are required`);
      continue;
    }
    files.push({
      fileId,
      relativePath,
    });
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
