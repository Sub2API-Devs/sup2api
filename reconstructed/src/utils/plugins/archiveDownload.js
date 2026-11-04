/**
 * utils/plugins/archiveDownload.ts
 *
 * 插件归档下载（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-21ppfwx8.js (6)
 * attribution: placement 6
 */
import { createHash } from "crypto";
import { isSafeArchiveUrl, ARCHIVE_URL_ERROR } from "./schemas.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, errorMessage } from "../errors.js";
import { redactUrlsInText } from "../redaction/urlRedaction.js";
import { logForDebugging } from "../debug.js";
import {
  CLAUDE_CODE_PLUGIN_MANAGER,
  COMMAND_SOURCE_DEFAULT_TIMEOUT_MS,
  MAX_SPILL_BYTES,
} from "./commandSource.js";
import { isAnthropicOwnedHost } from "../anthropicHosts.js";
import { publicCdnGuardedClient } from "../nativeInstaller/downloadsClient.js";
import { externalHttp } from "../../services/http/externalHttp.js";
import { logPluginFetch, classifyFetchError } from "./fetchTelemetry.js";
import { findTelemetrySafeCause, urlHostname } from "./headersHelper.js";
import { urlFromRequestOptions, sameOrigin, isPrivateHost } from "../network/privateHostCheck.js";
import { isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";

//@ chunk-21ppfwx8.js:19578-20569 placement = downloadAndVerifyBinary (0.301)
/**
 * 下载插件归档（URL 策略检查、User-Agent、arraybuffer）并校验（切分可疑：属于插件下载）。
 */
async function downloadAndVerifyBinary(url, options = {}) {
  if (!isSafeArchiveUrl(url))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${ARCHIVE_URL_ERROR}: ${redactUrlsInText(url)}`,
      "plugin archive URL policy rejected",
    );
  let redactedUrl = redactUrlsInText(url);
  logForDebugging(`Downloading plugin archive from ${redactedUrl}`);
  let headers = options.headers ?? {};
  let headers_2 = {
    ...headers,
    "User-Agent": CLAUDE_CODE_PLUGIN_MANAGER,
  };
  let httpClient = isAnthropicOwnedHost(url) ? publicCdnGuardedClient.get : externalHttp.get;
  let startTime = performance.now();
  let archiveBytes;
  try {
    let response = await httpClient(url, {
      timeout: COMMAND_SOURCE_DEFAULT_TIMEOUT_MS,
      responseType: "arraybuffer",
      maxRedirects: 5,
      maxContentLength: MAX_SPILL_BYTES,
      headers: headers_2,
      beforeRedirect: createArchiveRedirectGuard(url, headerNamesExceptUserAgent(headers)),
    });
    logPluginFetch("plugin_archive", url, "success", performance.now() - startTime);
    archiveBytes = Buffer.from(response.data);
  } catch (error) {
    logPluginFetch(
      "plugin_archive",
      url,
      "failure",
      performance.now() - startTime,
      classifyFetchError(error),
    );
    let telemetrySafeCause = findTelemetrySafeCause(error);
    if (telemetrySafeCause) throw telemetrySafeCause;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      describeArchiveFetchError(error, url, redactedUrl),
      "plugin archive download failed",
    );
  }
  let actualChecksum = createHash("sha256").update(archiveBytes).digest("hex");
  if (options.sha256 && options.sha256.toLowerCase() !== actualChecksum)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin archive integrity check failed for ${redactedUrl}: expected sha256 ${options.sha256.toLowerCase()}, got ${actualChecksum}. The archive was not installed. Verify the sha256 in the marketplace entry, or that the URL serves the intended file.`,
      "plugin archive sha256 mismatch",
    );
  return {
    data: archiveBytes,
    contentSha256: actualChecksum,
  };
}
//@ chunk-21ppfwx8.js:20569-20655 placement
/**
 * headerNamesExceptUserAgent：去掉 user-agent 的 header 名。
 */
function headerNamesExceptUserAgent(headers) {
  return Object.keys(headers ?? {}).filter((key) => key.toLowerCase() !== "user-agent");
}
//@ chunk-21ppfwx8.js:20655-21006 placement
/**
 * 返回一个重定向钩子：目标 URL 与原始 URL 不同源时，删除请求里属于市场声明的 header（大小写不敏感），并记调试日志。
 */
function createCrossOriginHeaderStripper(originUrl, headerNames, label = "plugin archive") {
  let headerNameSet = new Set(headerNames.map((headerName) => headerName.toLowerCase()));
  return (requestOptions) => {
    if (headerNameSet.size === 0 || !requestOptions.headers) return;
    let targetUrl = urlFromRequestOptions(requestOptions);
    if (targetUrl && sameOrigin(originUrl, targetUrl)) return;
    let droppedCount = 0;
    for (let key of Object.keys(requestOptions.headers))
      if (headerNameSet.has(key.toLowerCase())) {
        delete requestOptions.headers[key];
        droppedCount++;
      }
    if (droppedCount > 0)
      logForDebugging(
        `Fetch of ${label} redirected to a different origin; dropped inherited marketplace headers`,
      );
  };
}
//@ chunk-21ppfwx8.js:21006-21341 placement
/**
 * 返回归档下载的重定向钩子：每一跳都必须满足归档 URL 策略，否则抛 TelemetrySafeError；通过后再调用跨源 header 剥离器。
 */
function createArchiveRedirectGuard(originUrl, headerNames) {
  let crossOriginHeaderStripper = createCrossOriginHeaderStripper(originUrl, headerNames);
  return (requestOptions) => {
    let targetUrl = urlFromRequestOptions(requestOptions);
    if (!isSafeArchiveUrl(targetUrl))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "Plugin archive redirected to a disallowed URL and was refused \u2014 " +
          `every hop must satisfy the archive URL policy (${ARCHIVE_URL_ERROR.replace(/^Archive URLs must /, "")}): ` +
          (targetUrl ? redactUrlsInText(targetUrl) : "(unparseable redirect target)"),
        "plugin archive redirect policy rejected",
      );
    crossOriginHeaderStripper(requestOptions);
  };
}
//@ chunk-21ppfwx8.js:21341-21874 placement
function checkCatalogRedirect(originUrl, headerNames) {
  let crossOriginHeaderStripper = createCrossOriginHeaderStripper(
    originUrl,
    headerNames,
    "marketplace catalog",
  );
  return (requestOptions) => {
    let targetUrl = urlFromRequestOptions(requestOptions);
    if (!(
      targetUrl !== "" &&
      (sameOrigin(originUrl, targetUrl) ||
        (targetUrl.toLowerCase().startsWith("https:") && !isPrivateHost(urlHostname(targetUrl))))
    ))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "Marketplace catalog redirected to a disallowed URL and was refused \u2014 " +
          "a server-chosen cross-origin redirect must use https:// and must not point at a loopback, link-local, or cloud-metadata host (only a hop that stays on the origin you started from is exempt): " +
          (targetUrl ? redactUrlsInText(targetUrl) : "(unparseable redirect target)"),
        "marketplace catalog redirect policy rejected",
      );
    crossOriginHeaderStripper(requestOptions);
  };
}
//@ chunk-21ppfwx8.js:21874-22724 placement
function describeArchiveFetchError(error, rawUrl, redactedUrl) {
  let redactMessage = (message) => message.replaceAll(rawUrl, () => redactedUrl);
  if (isAxiosError(error)) {
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND")
      return `Could not connect to ${redactedUrl}. Check your network connection and that the archive URL is correct.

Technical details: ${redactMessage(error.message)}`;
    if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED")
      return `Timed out downloading plugin archive from ${redactedUrl}. The server may be slow or unreachable.

Technical details: ${redactMessage(error.message)}`;
    if (error.response) {
      let status = error.response.status;
      return `HTTP ${status} while downloading plugin archive from ${redactedUrl}.${status === 401 || status === 403 ? " The server rejected the request \u2014 if it requires authentication, add `headers` to the marketplace source (they are forwarded to plugin archives on the same origin) or configure your proxy." : ""}

Technical details: ${redactMessage(error.message)}`;
    }
  }
  return `Failed to download plugin archive from ${redactedUrl}: ${redactMessage(errorMessage(error))}`;
}
export { downloadAndVerifyBinary, checkCatalogRedirect, headerNamesExceptUserAgent };
