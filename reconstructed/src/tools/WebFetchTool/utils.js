/**
 * tools/WebFetchTool/utils.ts
 *
 * WebFetch 抓取实现：URL 校验、域名预检、带重定向检查的 GET、HTML→markdown、缓存、CCR 代理、次级模型调用；混入多处他用的 URL 辅助函数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/WebFetchTool/utils.ts
 * pieces: chunk-1wpnxx5r.js (1), chunk-2a8yx6fc.js (1), chunk-4j20twbf.js (1), chunk-aepeg2w5.js (1), chunk-e6aww6q8.js (36)
 * attribution: fingerprint 11, placement 3, sole-consumer 1, affinity 2, layout 13, facade-majority 10
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import {
  fetchViaCcrWorker,
  WORKER_FETCH_RESPONSE_SCHEMA,
  getWebFetchDeadlineMs,
  qTe,
} from "./ccrWorkerFetch.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { HOSTNAME_ONLY, PATH_PREFIXES, PATH_RESTRICTED_HOSTS, GITHUB_COM_ANTHROPICS } from "./preapproved.js";
import { WEBFETCH, webFetchCacheTtlMs, makeSecondaryModelPrompt, UNTRUSTED_CONTENT } from "./prompt.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { Dc } from "../../../vendor/lru-cache/dist/esm/index.min.js";
import { ec } from "../../utils/timerDelayClamp.js";
import { logForDebugging } from "../../utils/debug.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";
import { claudeCodeUserAgent, getWebFetchUserAgent } from "../../utils/http.js";
import { uniq } from "../../utils/collections.js";
import { rat, iG } from "../../utils/sandbox/proxyDenial.js";
import { mn } from "../../utils/remoteEnvironment.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  AbortError as AbortError_2,
} from "../../utils/errors.js";
import {
  recordSavedFilePath,
  isBinaryContentType,
  persistBinaryContent,
} from "../../utils/mcpOutputStorage.js";
import { PROVENANCE_REQUIRED } from "./urlProvenance.js";
import { getSettings_DEPRECATED } from "../../utils/settings/settings.js";
import { logError } from "../../utils/log.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { errorTelemetryFields } from "../../utils/accessibility/screenReader.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { Tnr } from "../../services/artifacts/rejectBreaker.js";
import { queryHaikuWithFallback } from "../../services/api/claude.js";
import { asSystemPrompt } from "../../utils/systemPromptType.js";
import { extractTextContent_2 } from "../../utils/messages.js";
import { getCcrProxyTargetUrl, BRIDGE_HOSTS, ae } from "../../services/mcp/ccrMcpUrls.js";

/**
 * 经云会话 worker 的 web-fetch 路由代抓 URL，把响应映射为正文、内容类型、最终地址与抓取时间。
 */
//@ chunk-e6aww6q8.js:2155694-2156079 placement
async function fetchViaWorkerProxy(e, n, r) {
  let s = await fetchViaCcrWorker({
    session: e,
    route: "web-fetch",
    toolName: "WebFetch",
    logLabel: "webfetch-proxy",
    targetErrorLabel: "fetch error",
    body: { url: n },
    schema: WORKER_FETCH_RESPONSE_SCHEMA(),
    signal: r,
  });
  if (!s.ok) return s;
  return {
    ok: !0,
    content: s.data.text,
    contentType: s.data.content_type || "text/plain",
    destinationUrl: s.data.destination_url || void 0,
    retrievedAt: Date.parse(s.data.retrieved_at ?? "") || void 0,
  };
}
//@ chunk-e6aww6q8.js:2156079-2156170 placement
var wir = ["text_content_token_limit", "html_extraction_method", "web_fetch_pdf_extract_text"];
//@ chunk-e6aww6q8.js:2156170-2156378 placement
function stripRetiredInputFields(e) {
  if (!isPlainObject_4(e)) return null;
  let filtered = wir.filter((s) => Object.hasOwn(e, s));
  if (filtered.length === 0) return null;
  let r = { ...e };
  for (let s of filtered) delete r[s];
  return { input: r, shapeClass: filtered.map((s) => `drop_${s}`).join(",") };
}
//@ chunk-e6aww6q8.js:2167829-2167993 sole-consumer
function isAllowedAnthropicRepoPath(e, n) {
  return e === "raw.githubusercontent.com"
    ? /^\/[^/]+\/[^/]+\/refs\/heads\/main\/./.test(n)
    : /^\/[^/]+\/[^/]+(\/?|\/(tree|blob)\/main(\/.*)?)$/.test(n);
}
/**
 * 预批准判断核心：HOSTNAME_ONLY 直接放行；PATH_PREFIXES 要求路径等于或在前缀之下，且拒绝 %2f/%5c/%2e 编码；github.com 与 raw.githubusercontent.com 还要求是 anthropics 组织或仓库根/main 分支路径。
 */
//@ chunk-e6aww6q8.js:2167993-2168190 affinity
function isPreapprovedHostPath(e, n) {
  if (HOSTNAME_ONLY.has(e)) return !0;
  let r = PATH_PREFIXES.get(e);
  if (r) {
    if (/%(25)*(2f|5c|2e)/i.test(n)) return !1;
    for (let s of r)
      if (n === s || n.startsWith(s + "/"))
        return (
          !PATH_RESTRICTED_HOSTS.has(e) || e + s === GITHUB_COM_ANTHROPICS || isAllowedAnthropicRepoPath(e, n)
        );
  }
  return !1;
}
//@ chunk-e6aww6q8.js:2168190-2168311 fingerprint = DomainBlockedError (1)
class DomainBlockedError extends Error {
  constructor(e) {
    super(`Claude Code is unable to fetch from ${e}`);
    this.name = "DomainBlockedError";
  }
}
//@ chunk-e6aww6q8.js:2168311-2168933 fingerprint = DomainCheckFailedError (0.599)
class DomainCheckFailedError extends Error {
  code;
  constructor(e, n) {
    super(
      n === "ERATELIMIT_PREFLIGHT"
        ? `The safety check for domain ${e} is rate-limited (too many domain checks from this network; the limit is shared and can stay exhausted for minutes). Do not retry ${WEBFETCH} in a loop or sleep to wait it out; continue without this page and report that its safety check was rate-limited. A single later attempt is fine; if that is rate-limited too, stop.`
        : `Unable to verify if domain ${e} is safe to fetch. This may be due to network restrictions or enterprise security policies blocking claude.ai.`,
    );
    ((this.name = "DomainCheckFailedError"), (this.code = n));
  }
}
//@ chunk-e6aww6q8.js:2168933-2169139 fingerprint = EgressBlockedError (0.973)
class EgressBlockedError extends Error {
  domain;
  constructor(e) {
    super(
      jsonStringify({
        error_type: "EGRESS_BLOCKED",
        domain: e,
        message: `Access to ${e} is blocked by the network egress proxy.`,
      }),
    );
    this.domain = e;
    this.name = "EgressBlockedError";
  }
}
//@ chunk-e6aww6q8.js:2169139-2169257 layout
class TooManyRedirectsError extends Error {
  constructor(e) {
    super(`Too many redirects (exceeded ${e})`);
    this.name = "TooManyRedirectsError";
  }
}
/**
 * WebFetch 传输层错误（带 code，如 EDEADLINE），供上层区分超时与其他 axios 错误。
 */
//@ chunk-e6aww6q8.js:2169257-2169360 facade-majority
class WebFetchTransportError extends Error {
  code;
  constructor(e, n) {
    super(e);
    ((this.name = "WebFetchTransportError"), (this.code = n));
  }
}
//@ chunk-e6aww6q8.js:2169360-2169377 layout
var WEB_FETCH_CACHE_MAX_BYTES = 52428800;
/**
 * WebFetch 的 toolState 缓存槽：urls（按字节计的 LRU，上限 50MB，TTL 由 E7o() 决定，写入后定时 purgeStale）、domainChecks（128 项/5 分钟，域名预检通过的结果）、targetFailures（1024 项/5 分钟，目标站失败记忆）。
 */
//@ chunk-e6aww6q8.js:2169377-2169747 facade-majority
class WebFetchCache {
  urls = new Dc({ maxSize: WEB_FETCH_CACHE_MAX_BYTES, ttl: webFetchCacheTtlMs() });
  domainChecks = new Dc({ max: 128, ttl: 300000 });
  targetFailures = new Dc({ max: 1024, ttl: 300000 });
  setUrl(e, n, r) {
    (this.urls.set(e, n, { size: Math.max(1, r) }),
      setTimeout(
        (s) => s.deref()?.purgeStale(),
        Math.min(this.urls.ttl + 1, ec),
        new WeakRef(this.urls),
      ).unref());
  }
  clear() {
    (this.urls.clear(), this.domainChecks.clear(), this.targetFailures.clear());
  }
}
//@ chunk-e6aww6q8.js:2169747-2169755 layout
var turndownServicePromise;
//@ chunk-e6aww6q8.js:2169755-2169904 layout
function getTurndownService() {
  return (turndownServicePromise ??= import("./chunk-vwj6ccer.js").then((e) => {
    let r = new e.default();
    return (r.remove(["style", "script", "noscript", "iframe"]), r);
  }));
}
//@ chunk-e6aww6q8.js:2169904-2169977 layout
var MAX_URL_LENGTH = 2000,
  MAX_HTTP_CONTENT_LENGTH = 10485760,
  FETCH_TIMEOUT_MS = 60000,
  DOMAIN_CHECK_TIMEOUT_MS = 1e4,
  DOMAIN_CHECK_DEADLINE_MS = 30000,
  MAX_REDIRECTS = 10,
  MAX_HTML_FOR_MARKDOWN = 1048576;
/**
 * HTML 转 markdown：懒加载 turndown（移除 style/script/noscript/iframe），超过 1MB 先截断并附注；失败时记录错误并返回原 HTML。
 */
//@ chunk-e6aww6q8.js:2169977-2170242 facade-majority
async function convertHtmlToMarkdown(e) {
  try {
    let turndown = (await getTurndownService()).turndown(e.slice(0, MAX_HTML_FOR_MARKDOWN));
    if (e.length > MAX_HTML_FOR_MARKDOWN)
      turndown += `

[Content truncated due to length...]`;
    return turndown;
  } catch (error) {
    return (
      logForDebugging(
        `Turndown failed, falling back to raw HTML: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      e
    );
  }
}
/**
 * URL 是否在预批准文档站列表内（主机名完全匹配或主机+路径前缀匹配）；解析失败为 false。
 */
//@ chunk-e6aww6q8.js:2170242-2170329 facade-majority = isPreapprovedUrl (1)
function isPreapprovedUrl(url) {
  try {
    let parsedUrl = new URL(url);
    return isPreapprovedHostPath(parsedUrl.hostname, parsedUrl.pathname);
  } catch {
    return !1;
  }
}
/**
 * URL 基本校验：长度 ≤2000、可解析、无用户名密码、主机名至少两段。
 */
//@ chunk-e6aww6q8.js:2170329-2170495 layout = validateURL (1)
function validateURL(url) {
  if (url.length > MAX_URL_LENGTH) return !1;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return !1;
  }
  if (parsed.username || parsed.password) return !1;
  if (parsed.hostname.split(".").length < 2) return !1;
  return !0;
}
/**
 * 域名预检：GET api.anthropic.com/api/web/domain_info?domain=…（10 秒超时，总 30 秒），can_fetch=true 记入 domainChecks 缓存；返回 allowed/blocked/check_failed（含 HTTP 状态，429 会被翻译成限流错误）。
 */
//@ chunk-e6aww6q8.js:2170495-2171248 fingerprint = checkDomainBlocklist (0.672)
async function checkDomainBlocklist(e, n, r) {
  if (n.domainChecks.has(e)) return { status: "allowed" };
  let s = createCombinedAbortSignal(r, { timeoutMs: DOMAIN_CHECK_DEADLINE_MS, refTimer: !0 });
  try {
    let response = await Dt.get(
      `https://api.anthropic.com/api/web/domain_info?domain=${encodeURIComponent(e)}`,
      {
        headers: { "User-Agent": claudeCodeUserAgent() },
        signal: s.signal,
        timeout: DOMAIN_CHECK_TIMEOUT_MS,
      },
    );
    if (response.status === 200) {
      if (response.data.can_fetch === !0) return (n.domainChecks.set(e, !0), { status: "allowed" });
      return { status: "blocked" };
    }
    return {
      status: "check_failed",
      error: Error(`Domain check returned status ${response.status}`),
      httpStatus: response.status,
    };
  } catch (error) {
    if (r.aborted) throw error;
    return (
      logForDebugging(
        `Domain blocklist check failed for ${e}: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      {
        status: "check_failed",
        error: error,
        httpStatus: Dt.isAxiosError(error) ? error.response?.status : void 0,
      }
    );
  } finally {
    s.cleanup();
  }
}
/**
 * 判断是否可以自动跟随重定向：协议、端口相同，无凭证，去 www 后主机相同；若原 URL 在预批准路径内，目标也必须在预批准路径内。
 */
//@ chunk-e6aww6q8.js:2171248-2171574 layout
function isPermittedRedirect(e, n) {
  try {
    let r = new URL(e),
      s = new URL(n);
    if (s.protocol !== r.protocol) return !1;
    let h = stripWww(r.hostname),
      y = uniq([r.hostname, h, `www.${h}`]);
    if (
      y.some((S) => isPreapprovedHostPath(S, r.pathname)) &&
      !y.some((S) => isPreapprovedHostPath(S, s.pathname))
    )
      return !1;
    if (s.port !== r.port) return !1;
    if (s.username || s.password) return !1;
    return stripWww(s.hostname) === h;
  } catch (error) {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:2171574-2171620 layout
function stripWww(e) {
  return e.replace(/^www\./, "");
}
//@ chunk-e6aww6q8.js:2171620-2171659 layout
var REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);
/**
 * 给抓取加整体 deadline（nte() 毫秒，0 表示不限），调用 getWithPermittedRedirects。
 */
//@ chunk-e6aww6q8.js:2171659-2171900 layout
async function getWithDeadline(e, n, r, s = 0, h) {
  if (h !== void 0) return getWithPermittedRedirects(e, n, r, s, h);
  let y = getWebFetchDeadlineMs();
  if (y === 0) return getWithPermittedRedirects(e, n, r, s, new AbortController().signal);
  let S = createCombinedAbortSignal(void 0, { timeoutMs: y, refTimer: !0 });
  try {
    return await getWithPermittedRedirects(e, n, r, s, S.signal);
  } finally {
    S.cleanup();
  }
}
/**
 * axios GET（不自动跟随重定向、arraybuffer、10MB 上限、60 秒超时、Accept 优先 markdown）。2xx 返回响应；3xx 若 redirectChecker 允许则递归（最多 10 次），否则返回 {type:"redirect"}；出口代理拦截抛 EgressBlockedError；其余返回 {type:"http_error", retryAfter?}。云会话中 ENOTFOUND 给出"需在网络设置放行"的专用提示。
 */
//@ chunk-e6aww6q8.js:2171900-2173370 fingerprint = getWithPermittedRedirects (0.534)
async function getWithPermittedRedirects(url, signal, redirectChecker, depth, deadlineSignal) {
  if (depth > MAX_REDIRECTS) throw new TooManyRedirectsError(MAX_REDIRECTS);
  let response = await Dt.get(url, {
      signal: AbortSignal.any([signal, deadlineSignal]),
      timeout: FETCH_TIMEOUT_MS,
      maxRedirects: 0,
      responseType: "arraybuffer",
      maxContentLength: MAX_HTTP_CONTENT_LENGTH,
      validateStatus: () => !0,
      headers: { Accept: "text/markdown, text/html, */*", "User-Agent": getWebFetchUserAgent() },
    }).catch((G) => {
      if (rat(G)) throw new EgressBlockedError(new URL(url).hostname);
      if (Dt.isCancel(G) && deadlineSignal.aborted && !signal.aborted)
        throw new WebFetchTransportError(
          `Fetch did not complete within the ${getWebFetchDeadlineMs() / 1000}s deadline`,
          "EDEADLINE",
        );
      if (Dt.isAxiosError(G) && !Dt.isCancel(G))
        throw new WebFetchTransportError(
          G.code === "ENOTFOUND" && mn()
            ? `${G.message}. In this cloud session a host fails to resolve like this when it is outside the session's allowed network domains, or does not exist. If another host has failed the same way, stop trying more sites: carry on without them, and say in your answer that ${new URL(url).hostname} has to be allowed in the session's network settings. Fetch it again only once the user says it is allowed.`
            : G.message,
          G.code,
        );
      throw G;
    }),
    { status: status, headers: headers } = response;
  if (status >= 200 && status < 300) return response;
  if (REDIRECT_STATUS_CODES.has(status)) {
    let redirectLocation = headers.location;
    if (typeof redirectLocation !== "string" || redirectLocation.trim() === "")
      return { type: "http_error", statusCode: status };
    let redirectUrl = URL.parse(redirectLocation, url)?.toString();
    if (redirectUrl === void 0) return { type: "http_error", statusCode: status };
    return redirectChecker(url, redirectUrl)
      ? getWithPermittedRedirects(redirectUrl, signal, redirectChecker, depth + 1, deadlineSignal)
      : { type: "redirect", originalUrl: url, redirectUrl: redirectUrl, statusCode: status };
  }
  if (iG(status, headers)) throw new EgressBlockedError(new URL(url).hostname);
  let L = headers["retry-after"];
  return {
    type: "http_error",
    statusCode: status,
    ...(typeof L === "string" && /^[0-9]{1,6}$/.test(L) && { retryAfter: L }),
  };
}
//@ chunk-e6aww6q8.js:2173370-2173424 fingerprint = isRedirectInfo (1)
function isRedirectInfo(response) {
  return "type" in response && response.type === "redirect";
}
//@ chunk-e6aww6q8.js:2173424-2173480 layout
function isHttpErrorInfo(e) {
  return "type" in e && e.type === "http_error";
}
//@ chunk-e6aww6q8.js:2173480-2174461 layout
var PROXY_ERROR_EVENT_CODES = {
    transport: "web_fetch_proxy_transport",
    deadline: "web_fetch_proxy_deadline",
    badResponse: "web_fetch_proxy_bad_response",
    rateLimited: "web_fetch_proxy_rate_limited",
    unavailable: "web_fetch_proxy_unavailable",
    rejected: "web_fetch_proxy_rejected",
  },
  TARGET_ERROR_EVENT_CODES = new Map([
    ["invalid_url", "web_fetch_target_invalid_url"],
    ["url_too_long", "web_fetch_target_url_too_long"],
    ["url_not_found", "web_fetch_target_url_not_found"],
    ["client_error", "web_fetch_target_client_error"],
    ["server_error", "web_fetch_target_server_error"],
    ["robots_disallowed", "web_fetch_target_robots_disallowed"],
    ["site_blocked", "web_fetch_target_site_blocked"],
    ["permissions_error", "web_fetch_target_permissions_error"],
    ["rate_limit_exceeded", "web_fetch_target_rate_limit_exceeded"],
    ["unknown_error", "web_fetch_target_unknown_error"],
  ]),
  REMEMBERED_TARGET_ERRORS = [
    "invalid_url",
    "url_too_long",
    "url_not_found",
    "client_error",
    "server_error",
    "robots_disallowed",
    "site_blocked",
    "permissions_error",
  ],
  SITE_ANSWER_ERRORS = ["url_not_found", "client_error", "robots_disallowed"];
//@ chunk-e6aww6q8.js:2174461-2174561 facade-majority
class SiteAnswerError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  errorType;
  constructor(e, n, r) {
    super(e, "web-fetch-ccr-proxy", n);
    this.errorType = r;
  }
}
//@ chunk-e6aww6q8.js:2174561-2174614 facade-majority
function siteAnswerAsValue(e) {
  if (e instanceof SiteAnswerError) return e;
  throw e;
}
/**
 * 把 http:// 改写为 https://。
 */
//@ chunk-e6aww6q8.js:2174614-2174673 facade-majority = getCurrentRepoHttpsUrl (0.803)
function upgradeToHttps(e) {
  return e.replace(/^http:\/\//i, "https://");
}
/**
 * 把 CCR 代理/目标站错误映射成遥测用错误码（web_fetch_proxy_* / web_fetch_target_*）。
 */
//@ chunk-e6aww6q8.js:2174673-2175050 layout
function proxyErrorEventCode(e) {
  if (e.source === "target")
    return TARGET_ERROR_EVENT_CODES.get((e.errorType ?? "").toLowerCase()) ?? "web_fetch_target_other";
  if (e.errorType === "PROXY_TRANSPORT") return PROXY_ERROR_EVENT_CODES.transport;
  if (e.errorType === "PROXY_DEADLINE") return PROXY_ERROR_EVENT_CODES.deadline;
  if (e.errorType === "PROXY_BAD_RESPONSE") return PROXY_ERROR_EVENT_CODES.badResponse;
  if (e.statusCode === 429) return PROXY_ERROR_EVENT_CODES.rateLimited;
  return e.statusCode >= 500 ? PROXY_ERROR_EVENT_CODES.unavailable : PROXY_ERROR_EVENT_CODES.rejected;
}
/**
 * 抓取并转 markdown：URL 校验（无点主机名提示改用 curl）→ urls 缓存命中直接返回 → 有 CCR web-fetch 代理时走代理（处理 provenance_denied、目标站失败记忆、代理报告的最终 URL 是否允许）→ claude-code-server 无代理时报错 → 直连：http 升级 https、域名预检（settings.skipWebFetchPreflight 可跳过）、带 deadline 抓取、二进制内容另存文件、HTML 转 markdown，写入缓存。
 */
//@ chunk-e6aww6q8.js:2175050-2178353 facade-majority = getURLMarkdownContent (0.463)
async function getURLMarkdownContent(
  session,
  url,
  abortHolder,
  cache,
  persistedToolResultFiles,
  storage,
  timing,
) {
  if (!validateURL(url)) {
    let Je = URL.parse(url)?.hostname;
    if (Je && !Je.includes("."))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "WebFetch cannot fetch localhost or other hostnames without a dot. To reach a local server, use Bash with curl instead.",
        "web-fetch-dotless-host",
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Invalid URL",
      "web-fetch-invalid-url",
    );
  }
  let cachedEntry = cache.urls.get(url);
  if (cachedEntry) {
    if (cachedEntry.persistedPath !== void 0)
      recordSavedFilePath(persistedToolResultFiles, cachedEntry.persistedPath);
    return {
      bytes: cachedEntry.bytes,
      code: cachedEntry.code,
      codeText: cachedEntry.codeText,
      content: cachedEntry.content,
      contentType: cachedEntry.contentType,
      isExtractedText: cachedEntry.isExtractedText,
      persistedPath: cachedEntry.persistedPath,
      persistedSize: cachedEntry.persistedSize,
      retrievedAt: cachedEntry.retrievedAt,
    };
  }
  if (qTe(session)) {
    let Je = upgradeToHttps(url),
      nt = timing?.mark("external"),
      proxyResult = await fetchViaWorkerProxy(session, Je, abortHolder.signal).finally(nt);
    if ((cache.targetFailures.delete(Je), !proxyResult.ok)) {
      if (proxyResult.source === "target" && proxyResult.errorType === PROVENANCE_REQUIRED)
        return { type: "provenance_denied", url: Je, errorMessage: proxyResult.errorMessage };
      let gt = proxyResult.errorType?.toLowerCase(),
        At = proxyResult.source === "target" ? REMEMBERED_TARGET_ERRORS.find((qt) => qt === gt) : void 0;
      if (At) cache.targetFailures.set(Je, { errorType: At, failedAt: Date.now(), told: new Set() });
      let It = jsonStringify({
          error_type: proxyResult.errorType,
          source: proxyResult.source,
          message: proxyResult.errorMessage,
        }),
        Yt = proxyResult.source === "target" ? SITE_ANSWER_ERRORS.find((qt) => qt === gt) : void 0;
      throw Yt
        ? new SiteAnswerError(It, proxyErrorEventCode(proxyResult), Yt)
        : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            It,
            "web-fetch-ccr-proxy",
            proxyErrorEventCode(proxyResult),
          );
    }
    if (proxyResult.destinationUrl !== void 0) {
      let gt = URL.parse(proxyResult.destinationUrl)?.toString();
      if (gt === void 0)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          jsonStringify({
            error_type: "PROXY_BAD_RESPONSE",
            source: "proxy",
            message: "proxy reported a destination that is not a valid URL",
          }),
          "web-fetch-ccr-proxy",
          PROXY_ERROR_EVENT_CODES.badResponse,
        );
      if (!isPermittedRedirect(Je, gt))
        return { type: "redirect", originalUrl: Je, redirectUrl: gt, statusCode: 302 };
    }
    let byteLength = Buffer.byteLength(proxyResult.content, "utf8"),
      yt = {
        content: proxyResult.content,
        bytes: byteLength,
        code: 200,
        codeText: "OK",
        contentType: proxyResult.contentType,
        isExtractedText: !0,
        retrievedAt: proxyResult.retrievedAt,
      };
    return (cache.setUrl(url, yt, byteLength), yt);
  }
  if (session.host.launchOptions.ccrSessionUrl() !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "WebFetch on claude-code-server needs the CCR web-fetch proxy",
      "web-fetch-ccs-direct",
    );
  let L,
    upgradedUrl = url;
  try {
    if (((L = new URL(url)), L.protocol === "http:")) ((L.protocol = "https:"), (upgradedUrl = L.toString()));
    let hostname = L.hostname;
    if (!getSettings_DEPRECATED().skipWebFetchPreflight) {
      let pt = await checkDomainBlocklist(hostname, cache, abortHolder.signal);
      switch (pt.status) {
        case "allowed":
          break;
        case "blocked":
          throw new DomainBlockedError(hostname);
        case "check_failed":
          throw new DomainCheckFailedError(
            hostname,
            Dt.isCancel(pt.error)
              ? "EDEADLINE_PREFLIGHT"
              : pt.httpStatus === 429
                ? "ERATELIMIT_PREFLIGHT"
                : void 0,
          );
      }
    }
  } catch (error) {
    if (error instanceof DomainBlockedError || error instanceof DomainCheckFailedError || Dt.isCancel(error))
      throw error;
    logError(error);
  }
  let now = Date.now(),
    Z = timing?.mark("external"),
    response;
  try {
    response = await getWithDeadline(upgradedUrl, abortHolder.signal, isPermittedRedirect).finally(Z);
  } catch (error) {
    if (!Dt.isCancel(error))
      logEvent("tengu_web_fetch_transport", {
        outcome: fromEnum("error"),
        httpDurationMs: Date.now() - now,
        ...errorTelemetryFields(error),
      });
    throw error;
  }
  if (
    (logEvent("tengu_web_fetch_transport", {
      outcome: fromEnum(
        isRedirectInfo(response) ? "redirect" : isHttpErrorInfo(response) ? "http_error" : "ok",
      ),
      httpDurationMs: Date.now() - now,
      ...(!isRedirectInfo(response) && !isHttpErrorInfo(response) && { bytes: response.data.byteLength }),
    }),
    isRedirectInfo(response) || isHttpErrorInfo(response))
  )
    return response;
  let rawBuffer = Buffer.from(response.data);
  response.data = null;
  let contentType = String(response.headers["content-type"] ?? ""),
    Ee,
    Ae;
  if (isBinaryContentType(contentType)) {
    let persistId = `webfetch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      nt = await persistBinaryContent(rawBuffer, contentType, persistId, persistedToolResultFiles, storage);
    if (!("error" in nt)) ((Ee = nt.filepath), (Ae = nt.size));
  }
  let bytes = rawBuffer.length,
    htmlContent = rawBuffer.toString("utf-8"),
    We,
    ze;
  if (contentType.includes("text/html"))
    ((We = await convertHtmlToMarkdown(htmlContent)), (ze = Buffer.byteLength(We)));
  else ((We = htmlContent), (ze = bytes));
  let entry = {
    bytes: bytes,
    code: response.status,
    codeText: response.statusText,
    content: We,
    contentType: contentType,
    persistedPath: Ee,
    persistedSize: Ae,
  };
  return (cache.setUrl(url, entry, ze), entry);
}
/**
 * 把 markdown 截到 Tnr 字符上限（次级模型输入上限）。
 */
//@ chunk-e6aww6q8.js:2178353-2178386 facade-majority
function secondaryModelHead(e) {
  return truncateToLength(e, Tnr);
}
/**
 * 用次级模型（querySource "web_fetch_apply"，空 system prompt）按用户 prompt 处理页面 markdown；超长截断；可选用随机 fence 包裹不可信内容；返回首个文本块，API 错误抛 TelemetrySafeError。
 */
//@ chunk-e6aww6q8.js:2178386-2179237 facade-majority = applyPromptToMarkdown (0.616)
async function applyPromptToMarkdown(prompt, markdown, options) {
  let {
      signal: signal,
      isNonInteractiveSession: isNonInteractiveSession,
      isPreapprovedDomain: isPreapprovedDomain,
      agentContext: agentContext,
      helperEffortFor: helperEffortFor,
      callerAnsweredQuerySource: callerAnsweredQuerySource,
      credentials: credentials,
      untrustedSource: untrustedSource,
      contentLead: contentLead = "",
    } = options,
    truncatedContent =
      markdown.length > Tnr
        ? secondaryModelHead(markdown) +
          `

[Content truncated due to length...]`
        : markdown,
    ke = makeSecondaryModelPrompt(
      truncatedContent,
      prompt,
      isPreapprovedDomain,
      untrustedSource === void 0
        ? void 0
        : {
            source: untrustedSource,
            fence: `${UNTRUSTED_CONTENT}-${randomUUID_26().replaceAll("-", "").slice(0, 12)}`,
          },
    ),
    assistantMessage = await queryHaikuWithFallback({
      systemPrompt: asSystemPrompt([]),
      userPrompt: `${contentLead}${ke}`,
      signal: signal,
      options: {
        querySource: "web_fetch_apply",
        agents: [],
        isNonInteractiveSession: isNonInteractiveSession,
        hasAppendSystemPrompt: !1,
        mcpTools: [],
        agentContext: agentContext,
        helperEffortFor: helperEffortFor,
        callerAnsweredQuerySource: callerAnsweredQuerySource,
        credentials: credentials,
      },
    });
  if (signal.aborted) throw new AbortError_2();
  if (assistantMessage.isApiErrorMessage)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      extractTextContent_2(assistantMessage.message.content),
      "web-fetch-apply-api-error",
    );
  let { content: content } = assistantMessage.message;
  if (content.length > 0) {
    let contentBlock = content[0];
    if ("text" in contentBlock) return contentBlock.text;
  }
  return "No response from model";
}
//@ chunk-e6aww6q8.js:2313429-2313452 affinity
var DOMAIN_CACHE_MAX = 500,
  DOMAIN_CACHE_TTL_MS = 300000;
/**
 * 创建 500 项、5 分钟 TTL 的 LRU（域名类检查缓存）。
 */
//@ chunk-e6aww6q8.js:2313452-2313500 fingerprint = DOMAIN_CHECK_CACHE (1)
function createDomainCache() {
  return new Dc({ max: DOMAIN_CACHE_MAX, ttl: DOMAIN_CACHE_TTL_MS });
}
/**
 * 解包 CCR 代理 URL 后判断是否为某个已知端点（主机在集合内且路径相符）；被 MCP 配置使用。
 */
//@ chunk-1wpnxx5r.js:15809-15931 fingerprint = isPreapprovedUrl (1)
function isKnownProxyEndpointUrl(url) {
  let r = getCcrProxyTargetUrl(url);
  if (!r) return !1;
  try {
    let parsedUrl = new URL(r);
    return BRIDGE_HOSTS.has(parsedUrl.hostname) && parsedUrl.pathname === ae;
  } catch {
    return !1;
  }
}
/**
 * 从 URL 安全地提取主机名：防止 user@host 形式伪装，非法时返回 null。
 */
//@ chunk-2a8yx6fc.js:24186-24598 fingerprint = validateURL (1)
function extractSafeHostname(url) {
  let replaced = url.replace(/^https?:\/\//i, "");
  if (!replaced.includes("@")) return replaced.match(/^([a-zA-Z0-9.][a-zA-Z0-9.-]*)/)?.[1] ?? null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.username !== "" || parsed.password !== "") {
    let match = replaced.match(/[/?#]/);
    if (
      (match?.index === void 0 ? "" : replaced.slice(match.index + 1)).includes("@") ||
      !parsed.hostname.includes(".")
    )
      return null;
  }
  return parsed.hostname && /^[a-zA-Z0-9.][a-zA-Z0-9.-]*$/.test(parsed.hostname) ? parsed.hostname : null;
}
/**
 * 大小与待清理量是否都在上限内。
 */
//@ chunk-4j20twbf.js:1240-1330 fingerprint = URL_CACHE (0.376)
function isWithinSanitizeBudget(e) {
  return e.size <= e.maxSize && e.sixteenthsToSanitize <= e.maxSixteenthsToSanitize;
}
/**
 * 只有 https、无凭证、无端口的 URL 才返回主机名（去掉末尾点），否则 undefined。
 */
//@ chunk-aepeg2w5.js:251114-251301 fingerprint = isPermittedRedirect (0.842)
function getHttpsHostname(e) {
  if (e === void 0) return;
  let n;
  try {
    n = new URL(e);
  } catch {
    return;
  }
  if (n.protocol !== "https:" || n.username !== "" || n.password !== "" || n.port !== "") return;
  return n.hostname.replace(/\.$/, "");
}

export {
  isKnownProxyEndpointUrl,
  extractSafeHostname,
  isWithinSanitizeBudget,
  convertHtmlToMarkdown,
  applyPromptToMarkdown,
  getHttpsHostname,
  secondaryModelHead,
  stripRetiredInputFields,
  isPreapprovedUrl,
  WebFetchCache,
  upgradeToHttps,
  getURLMarkdownContent,
  siteAnswerAsValue,
  SiteAnswerError,
  WebFetchTransportError,
  createDomainCache,
};
