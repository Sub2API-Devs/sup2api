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
import { createHash, createHash as createHash_2 } from "crypto";
import { isSafeArchiveUrl, ARCHIVE_URL_ERROR } from "./schemas.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, errorMessage } from "../errors.js";
import { redactUrlsInText } from "../redaction/urlRedaction.js";
import { logForDebugging } from "../debug.js";
import { CLAUDE_CODE_PLUGIN_MANAGER, lt, Oxe } from "./commandSource.js";
import { isAnthropicOwnedHost } from "../anthropicHosts.js";
import { t3 } from "../nativeInstaller/downloadsClient.js";
import { externalHttp } from "../../services/http/externalHttp.js";
import { logPluginFetch, classifyFetchError } from "./fetchTelemetry.js";
import { findTelemetrySafeCause, At } from "./headersHelper.js";
import { urlFromRequestOptions, sameOrigin, isPrivateHost } from "../network/privateHostCheck.js";
import { isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";

/**
 * 下载插件归档（URL 策略检查、User-Agent、arraybuffer）并校验（切分可疑：属于插件下载）。
 */
//@ chunk-21ppfwx8.js:19578-20569 placement = downloadAndVerifyBinary (0.301)
async function downloadAndVerifyBinary(e, n = {}) {
  if (!isSafeArchiveUrl(e))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${ARCHIVE_URL_ERROR}: ${redactUrlsInText(e)}`,
      "plugin archive URL policy rejected",
    );
  let r = redactUrlsInText(e);
  logForDebugging(`Downloading plugin archive from ${r}`);
  let i = n.headers ?? {},
    o = { ...i, "User-Agent": CLAUDE_CODE_PLUGIN_MANAGER },
    a = isAnthropicOwnedHost(e) ? t3.get : externalHttp.get,
    startTime = performance.now(),
    s;
  try {
    let h = await a(e, {
      timeout: lt,
      responseType: "arraybuffer",
      maxRedirects: 5,
      maxContentLength: Oxe,
      headers: o,
      beforeRedirect: createArchiveRedirectGuard(e, t6o(i)),
    });
    (logPluginFetch("plugin_archive", e, "success", performance.now() - startTime),
      (s = Buffer.from(h.data)));
  } catch (error) {
    logPluginFetch("plugin_archive", e, "failure", performance.now() - startTime, classifyFetchError(error));
    let p = findTelemetrySafeCause(error);
    if (p) throw p;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      describeArchiveFetchError(error, e, r),
      "plugin archive download failed",
    );
  }
  let actualChecksum = createHash("sha256").update(s).digest("hex");
  if (n.sha256 && n.sha256.toLowerCase() !== actualChecksum)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin archive integrity check failed for ${r}: expected sha256 ${n.sha256.toLowerCase()}, got ${actualChecksum}. The archive was not installed. Verify the sha256 in the marketplace entry, or that the URL serves the intended file.`,
      "plugin archive sha256 mismatch",
    );
  return { data: s, contentSha256: actualChecksum };
}
//@ chunk-21ppfwx8.js:20569-20655 placement
function t6o(e) {
  return Object.keys(e ?? {}).filter((n) => n.toLowerCase() !== "user-agent");
}
/**
 * 返回一个重定向钩子：目标 URL 与原始 URL 不同源时，删除请求里属于市场声明的 header（大小写不敏感），并记调试日志。
 */
//@ chunk-21ppfwx8.js:20655-21006 placement
function createCrossOriginHeaderStripper(e, n, r = "plugin archive") {
  let i = new Set(n.map((o) => o.toLowerCase()));
  return (o) => {
    if (i.size === 0 || !o.headers) return;
    let a = urlFromRequestOptions(o);
    if (a && sameOrigin(e, a)) return;
    let c = 0;
    for (let s of Object.keys(o.headers)) if (i.has(s.toLowerCase())) (delete o.headers[s], c++);
    if (c > 0)
      logForDebugging(
        `Fetch of ${r} redirected to a different origin; dropped inherited marketplace headers`,
      );
  };
}
/**
 * 返回归档下载的重定向钩子：每一跳都必须满足归档 URL 策略，否则抛 TelemetrySafeError；通过后再调用跨源 header 剥离器。
 */
//@ chunk-21ppfwx8.js:21006-21341 placement
function createArchiveRedirectGuard(e, n) {
  let r = createCrossOriginHeaderStripper(e, n);
  return (i) => {
    let o = urlFromRequestOptions(i);
    if (!isSafeArchiveUrl(o))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "Plugin archive redirected to a disallowed URL and was refused \u2014 " +
          `every hop must satisfy the archive URL policy (${ARCHIVE_URL_ERROR.replace(/^Archive URLs must /, "")}): ` +
          (o ? redactUrlsInText(o) : "(unparseable redirect target)"),
        "plugin archive redirect policy rejected",
      );
    r(i);
  };
}
//@ chunk-21ppfwx8.js:21341-21874 placement
function checkCatalogRedirect(e, n) {
  let r = createCrossOriginHeaderStripper(e, n, "marketplace catalog");
  return (i) => {
    let o = urlFromRequestOptions(i);
    if (!(o !== "" && (sameOrigin(e, o) || (o.toLowerCase().startsWith("https:") && !isPrivateHost(At(o))))))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "Marketplace catalog redirected to a disallowed URL and was refused \u2014 " +
          "a server-chosen cross-origin redirect must use https:// and must not point at a loopback, link-local, or cloud-metadata host (only a hop that stays on the origin you started from is exempt): " +
          (o ? redactUrlsInText(o) : "(unparseable redirect target)"),
        "marketplace catalog redirect policy rejected",
      );
    r(i);
  };
}
//@ chunk-21ppfwx8.js:21874-22724 placement
function describeArchiveFetchError(e, n, r) {
  let i = (o) => o.replaceAll(n, () => r);
  if (isAxiosError(e)) {
    if (e.code === "ECONNREFUSED" || e.code === "ENOTFOUND")
      return `Could not connect to ${r}. Check your network connection and that the archive URL is correct.

Technical details: ${i(e.message)}`;
    if (e.code === "ETIMEDOUT" || e.code === "ECONNABORTED")
      return `Timed out downloading plugin archive from ${r}. The server may be slow or unreachable.

Technical details: ${i(e.message)}`;
    if (e.response) {
      let status = e.response.status;
      return `HTTP ${status} while downloading plugin archive from ${r}.${status === 401 || status === 403 ? " The server rejected the request \u2014 if it requires authentication, add `headers` to the marketplace source (they are forwarded to plugin archives on the same origin) or configure your proxy." : ""}

Technical details: ${i(e.message)}`;
    }
  }
  return `Failed to download plugin archive from ${r}: ${i(errorMessage(e))}`;
}

export { downloadAndVerifyBinary, checkCatalogRedirect, t6o };
