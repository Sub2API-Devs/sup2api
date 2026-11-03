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
async function downloadAndVerifyBinary(url, n = {}) {
  if (!isSafeArchiveUrl(url))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${ARCHIVE_URL_ERROR}: ${redactUrlsInText(url)}`,
      "plugin archive URL policy rejected",
    );
  let r = redactUrlsInText(url);
  logForDebugging(`Downloading plugin archive from ${r}`);
  let headers = n.headers ?? {};
  let headers_2 = {
    ...headers,
    "User-Agent": CLAUDE_CODE_PLUGIN_MANAGER,
  };
  let a = isAnthropicOwnedHost(url) ? publicCdnGuardedClient.get : externalHttp.get;
  let startTime = performance.now();
  let s;
  try {
    let h = await a(url, {
      timeout: COMMAND_SOURCE_DEFAULT_TIMEOUT_MS,
      responseType: "arraybuffer",
      maxRedirects: 5,
      maxContentLength: MAX_SPILL_BYTES,
      headers: headers_2,
      beforeRedirect: createArchiveRedirectGuard(url, headerNamesExceptUserAgent(headers)),
    });
    logPluginFetch("plugin_archive", url, "success", performance.now() - startTime);
    s = Buffer.from(h.data);
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
      describeArchiveFetchError(error, url, r),
      "plugin archive download failed",
    );
  }
  let actualChecksum = createHash("sha256").update(s).digest("hex");
  if (n.sha256 && n.sha256.toLowerCase() !== actualChecksum)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin archive integrity check failed for ${r}: expected sha256 ${n.sha256.toLowerCase()}, got ${actualChecksum}. The archive was not installed. Verify the sha256 in the marketplace entry, or that the URL serves the intended file.`,
      "plugin archive sha256 mismatch",
    );
  return {
    data: s,
    contentSha256: actualChecksum,
  };
}
//@ chunk-21ppfwx8.js:20569-20655 placement
/**
 * headerNamesExceptUserAgent：去掉 user-agent 的 header 名。
 */
function headerNamesExceptUserAgent(e) {
  return Object.keys(e ?? {}).filter((key) => key.toLowerCase() !== "user-agent");
}
//@ chunk-21ppfwx8.js:20655-21006 placement
/**
 * 返回一个重定向钩子：目标 URL 与原始 URL 不同源时，删除请求里属于市场声明的 header（大小写不敏感），并记调试日志。
 */
function createCrossOriginHeaderStripper(e, n, r = "plugin archive") {
  let i = new Set(n.map((o) => o.toLowerCase()));
  return (o) => {
    if (i.size === 0 || !o.headers) return;
    let a = urlFromRequestOptions(o);
    if (a && sameOrigin(e, a)) return;
    let c = 0;
    for (let key of Object.keys(o.headers))
      if (i.has(key.toLowerCase())) {
        delete o.headers[key];
        c++;
      }
    if (c > 0)
      logForDebugging(
        `Fetch of ${r} redirected to a different origin; dropped inherited marketplace headers`,
      );
  };
}
//@ chunk-21ppfwx8.js:21006-21341 placement
/**
 * 返回归档下载的重定向钩子：每一跳都必须满足归档 URL 策略，否则抛 TelemetrySafeError；通过后再调用跨源 header 剥离器。
 */
function createArchiveRedirectGuard(e, n) {
  let crossOriginHeaderStripper = createCrossOriginHeaderStripper(e, n);
  return (i) => {
    let o = urlFromRequestOptions(i);
    if (!isSafeArchiveUrl(o))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "Plugin archive redirected to a disallowed URL and was refused \u2014 " +
          `every hop must satisfy the archive URL policy (${ARCHIVE_URL_ERROR.replace(/^Archive URLs must /, "")}): ` +
          (o ? redactUrlsInText(o) : "(unparseable redirect target)"),
        "plugin archive redirect policy rejected",
      );
    crossOriginHeaderStripper(i);
  };
}
//@ chunk-21ppfwx8.js:21341-21874 placement
function checkCatalogRedirect(url, n) {
  let crossOriginHeaderStripper = createCrossOriginHeaderStripper(url, n, "marketplace catalog");
  return (i) => {
    let o = urlFromRequestOptions(i);
    if (!(
      o !== "" &&
      (sameOrigin(url, o) || (o.toLowerCase().startsWith("https:") && !isPrivateHost(urlHostname(o))))
    ))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "Marketplace catalog redirected to a disallowed URL and was refused \u2014 " +
          "a server-chosen cross-origin redirect must use https:// and must not point at a loopback, link-local, or cloud-metadata host (only a hop that stays on the origin you started from is exempt): " +
          (o ? redactUrlsInText(o) : "(unparseable redirect target)"),
        "marketplace catalog redirect policy rejected",
      );
    crossOriginHeaderStripper(i);
  };
}
//@ chunk-21ppfwx8.js:21874-22724 placement
function describeArchiveFetchError(error, n, r) {
  let i = (message) => message.replaceAll(n, () => r);
  if (isAxiosError(error)) {
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND")
      return `Could not connect to ${r}. Check your network connection and that the archive URL is correct.

Technical details: ${i(error.message)}`;
    if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED")
      return `Timed out downloading plugin archive from ${r}. The server may be slow or unreachable.

Technical details: ${i(error.message)}`;
    if (error.response) {
      let status = error.response.status;
      return `HTTP ${status} while downloading plugin archive from ${r}.${status === 401 || status === 403 ? " The server rejected the request \u2014 if it requires authentication, add `headers` to the marketplace source (they are forwarded to plugin archives on the same origin) or configure your proxy." : ""}

Technical details: ${i(error.message)}`;
    }
  }
  return `Failed to download plugin archive from ${r}: ${i(errorMessage(error))}`;
}
export { downloadAndVerifyBinary, checkCatalogRedirect, headerNamesExceptUserAgent };
