/**
 * tools/WebFetchTool/utils.ts
 *
 * WebFetch 抓取实现：URL 校验、域名预检、带重定向检查的 GET、HTML→markdown、缓存、CCR 代理、次级模型调用；混入多处他用的 URL 辅助函数
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/WebFetchTool/utils.ts
 * pieces: chunk-56df17sz.js (1), chunk-5xgkngpb.js (37), chunk-exfmq47h.js (1)
 * attribution: fingerprint 10, placement 3, sole-consumer 1, affinity 2, layout 12, facade-majority 11
 */
import { randomUUID } from "crypto";
import {
  fetchViaCcrWorker,
  WORKER_FETCH_RESPONSE_SCHEMA,
  getWebFetchDeadlineMs,
  canFetchViaCcrWorker,
} from "./ccrWorkerFetch.js";
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { HOSTNAME_ONLY, PATH_PREFIXES, PATH_RESTRICTED_HOSTS, GITHUB_COM_ANTHROPICS } from "./preapproved.js";
import { WEBFETCH, webFetchCacheTtlMs, makeSecondaryModelPrompt, UNTRUSTED_CONTENT } from "./prompt.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { LRUCache } from "../../../vendor/lru-cache/dist/esm/index.min.js";
import { MAX_TIMER_DELAY_MS } from "../../utils/timerDelayClamp.js";
import { logForDebugging } from "../../utils/debug.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { claudeCodeUserAgent, getWebFetchUserAgent } from "../../utils/http.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { isBlockedByProxyAllowlist, isAllowlistBlockedResponse } from "../../utils/sandbox/proxyDenial.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
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
import { MAX_REJECT_KEY_CHARS } from "../../services/artifacts/rejectBreaker.js";
import { queryHaikuWithFallback } from "../../services/api/claude.js";
import { asSystemPrompt } from "../../utils/systemPromptType.js";
import { extractTextContent_2 } from "../../utils/messages.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:260628-260815 fingerprint (2.1.88 match: isPermittedRedirect, 0.842)
/**
 * 只有 https、无凭证、无端口的 URL 才返回主机名（去掉末尾点），否则 undefined。
 */
function getHttpsHostname(canonical) {
  if (canonical === undefined) return;
  let parsedUrl;
  try {
    parsedUrl = new URL(canonical);
  } catch {
    return;
  }
  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.username !== "" ||
    parsedUrl.password !== "" ||
    parsedUrl.port !== ""
  )
    return;
  return parsedUrl.hostname.replace(/\.$/, "");
}
//@ chunk-5xgkngpb.js:2209082-2209508 placement
/**
 * 经云会话 worker 的 web-fetch 路由代抓 URL，把响应映射为正文、内容类型、最终地址与抓取时间。
 */
async function fetchViaWorkerProxy(session, url, signal, autoModeServerCleared = false) {
  let viaCcrWorker = await fetchViaCcrWorker({
    session,
    route: "web-fetch",
    toolName: "WebFetch",
    logLabel: "webfetch-proxy",
    targetErrorLabel: "fetch error",
    body: {
      url,
      ...(autoModeServerCleared && {
        auto_mode_server_cleared: true,
      }),
    },
    schema: WORKER_FETCH_RESPONSE_SCHEMA(),
    signal,
  });
  if (!viaCcrWorker.ok) return viaCcrWorker;
  return {
    ok: true,
    content: viaCcrWorker.data.text,
    contentType: viaCcrWorker.data.content_type || "text/plain",
    destinationUrl: viaCcrWorker.data.destination_url || undefined,
    retrievedAt: Date.parse(viaCcrWorker.data.retrieved_at ?? "") || undefined,
  };
}
//@ chunk-5xgkngpb.js:2209508-2209599 placement
/**
 * WebFetch 输入里已废弃的字段名（旧版模型取用参数）。
 */
var RETIRED_INPUT_FIELDS = [
  "text_content_token_limit",
  "html_extraction_method",
  "web_fetch_pdf_extract_text",
];
//@ chunk-5xgkngpb.js:2209599-2209807 placement
function stripRetiredInputFields(input) {
  if (!isPlainObject_6(input)) return null;
  let filtered = RETIRED_INPUT_FIELDS.filter((fieldName) => Object.hasOwn(input, fieldName));
  if (filtered.length === 0) return null;
  let cleaned = {
    ...input,
  };
  for (let fieldName of filtered) delete cleaned[fieldName];
  return {
    input: cleaned,
    shapeClass: filtered.map((fieldName) => `drop_${fieldName}`).join(","),
  };
}
//@ chunk-5xgkngpb.js:2221266-2221430 sole-consumer
function isAllowedAnthropicRepoPath(hostname, pathname) {
  return hostname === "raw.githubusercontent.com"
    ? /^\/[^/]+\/[^/]+\/refs\/heads\/main\/./.test(pathname)
    : /^\/[^/]+\/[^/]+(\/?|\/(tree|blob)\/main(\/.*)?)$/.test(pathname);
}
//@ chunk-5xgkngpb.js:2221430-2221627 affinity
/**
 * 预批准判断核心：HOSTNAME_ONLY 直接放行；PATH_PREFIXES 要求路径等于或在前缀之下，且拒绝 %2f/%5c/%2e 编码；github.com 与 raw.githubusercontent.com 还要求是 anthropics 组织或仓库根/main 分支路径。
 */
function isPreapprovedHostPath(hostname, pathname) {
  if (HOSTNAME_ONLY.has(hostname)) return true;
  let prefixes = PATH_PREFIXES.get(hostname);
  if (prefixes) {
    if (/%(25)*(2f|5c|2e)/i.test(pathname)) return false;
    for (let prefix of prefixes)
      if (pathname === prefix || pathname.startsWith(prefix + "/"))
        return (
          !PATH_RESTRICTED_HOSTS.has(hostname) ||
          hostname + prefix === GITHUB_COM_ANTHROPICS ||
          isAllowedAnthropicRepoPath(hostname, pathname)
        );
  }
  return false;
}
//@ chunk-5xgkngpb.js:2221627-2221748 fingerprint (2.1.88 match: DomainBlockedError, 1)
class DomainBlockedError extends Error {
  constructor(domain) {
    super(`Claude Code is unable to fetch from ${domain}`);
    this.name = "DomainBlockedError";
  }
}
//@ chunk-5xgkngpb.js:2221748-2222370 fingerprint (2.1.88 match: DomainCheckFailedError, 0.599)
class DomainCheckFailedError extends Error {
  code;
  constructor(domain, code) {
    super(
      code === "ERATELIMIT_PREFLIGHT"
        ? `The safety check for domain ${domain} is rate-limited (too many domain checks from this network; the limit is shared and can stay exhausted for minutes). Do not retry ${WEBFETCH} in a loop or sleep to wait it out; continue without this page and report that its safety check was rate-limited. A single later attempt is fine; if that is rate-limited too, stop.`
        : `Unable to verify if domain ${domain} is safe to fetch. This may be due to network restrictions or enterprise security policies blocking claude.ai.`,
    );
    this.name = "DomainCheckFailedError";
    this.code = code;
  }
}
//@ chunk-5xgkngpb.js:2222370-2222576 fingerprint (2.1.88 match: EgressBlockedError, 0.973)
class EgressBlockedError extends Error {
  domain;
  constructor(hostname) {
    super(
      jsonStringify({
        error_type: "EGRESS_BLOCKED",
        domain: hostname,
        message: `Access to ${hostname} is blocked by the network egress proxy.`,
      }),
    );
    this.domain = hostname;
    this.name = "EgressBlockedError";
  }
}
//@ chunk-5xgkngpb.js:2222576-2222694 layout
class TooManyRedirectsError extends Error {
  constructor(maxRedirects) {
    super(`Too many redirects (exceeded ${maxRedirects})`);
    this.name = "TooManyRedirectsError";
  }
}
//@ chunk-5xgkngpb.js:2222694-2222797 facade-majority
/**
 * WebFetch 传输层错误（带 code，如 EDEADLINE），供上层区分超时与其他 axios 错误。
 */
class WebFetchTransportError extends Error {
  code;
  constructor(message, code) {
    super(message);
    this.name = "WebFetchTransportError";
    this.code = code;
  }
}
//@ chunk-5xgkngpb.js:2222797-2222814 layout
var WEB_FETCH_CACHE_MAX_BYTES = 52428800;
//@ chunk-5xgkngpb.js:2222814-2223184 facade-majority
/**
 * WebFetch 的 toolState 缓存槽：urls（按字节计的 LRU，上限 50MB，TTL 由 E7o() 决定，写入后定时 purgeStale）、domainChecks（128 项/5 分钟，域名预检通过的结果）、targetFailures（1024 项/5 分钟，目标站失败记忆）。
 */
class WebFetchCache {
  urls = new LRUCache({
    maxSize: WEB_FETCH_CACHE_MAX_BYTES,
    ttl: webFetchCacheTtlMs(),
  });
  domainChecks = new LRUCache({
    max: 128,
    ttl: 300000,
  });
  targetFailures = new LRUCache({
    max: 1024,
    ttl: 300000,
  });
  setUrl(url, entry, size) {
    this.urls.set(url, entry, {
      size: Math.max(1, size),
    });
    setTimeout(
      (urlsRef) => urlsRef.deref()?.purgeStale(),
      Math.min(this.urls.ttl + 1, MAX_TIMER_DELAY_MS),
      new WeakRef(this.urls),
    ).unref();
  }
  clear() {
    this.urls.clear();
    this.domainChecks.clear();
    this.targetFailures.clear();
  }
}
//@ chunk-5xgkngpb.js:2223184-2223192 layout
var turndownServicePromise;
//@ chunk-5xgkngpb.js:2223192-2223341 layout
function getTurndownService() {
  return (turndownServicePromise ??= import("../../../vendor/turndown/lib/default.lazy.js").then((m) => {
    let service = new m.default();
    service.remove(["style", "script", "noscript", "iframe"]);
    return service;
  }));
}
//@ chunk-5xgkngpb.js:2223341-2223414 layout
var MAX_URL_LENGTH = 2000;
var MAX_HTTP_CONTENT_LENGTH = 10485760;
var FETCH_TIMEOUT_MS = 60000;
var DOMAIN_CHECK_TIMEOUT_MS = 1e4;
var DOMAIN_CHECK_DEADLINE_MS = 30000;
var MAX_REDIRECTS = 10;
var MAX_HTML_FOR_MARKDOWN = 1048576;
//@ chunk-5xgkngpb.js:2223414-2223679 facade-majority
/**
 * HTML 转 markdown：懒加载 turndown（移除 style/script/noscript/iframe），超过 1MB 先截断并附注；失败时记录错误并返回原 HTML。
 */
async function convertHtmlToMarkdown(htmlContent) {
  try {
    let markdown = (await getTurndownService()).turndown(htmlContent.slice(0, MAX_HTML_FOR_MARKDOWN));
    if (htmlContent.length > MAX_HTML_FOR_MARKDOWN)
      markdown += `

[Content truncated due to length...]`;
    return markdown;
  } catch (error) {
    logForDebugging(
      `Turndown failed, falling back to raw HTML: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return htmlContent;
  }
}
//@ chunk-5xgkngpb.js:2223679-2223766 facade-majority (2.1.88 match: isPreapprovedUrl, 1)
/**
 * URL 是否在预批准文档站列表内（主机名完全匹配或主机+路径前缀匹配）；解析失败为 false。
 */
function isPreapprovedUrl(url) {
  try {
    let parsedUrl = new URL(url);
    return isPreapprovedHostPath(parsedUrl.hostname, parsedUrl.pathname);
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:2223766-2223932 fingerprint (2.1.88 match: validateURL, 1)
/**
 * URL 基本校验：长度 ≤2000、可解析、无用户名密码、主机名至少两段。
 */
function validateURL(url) {
  if (url.length > MAX_URL_LENGTH) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.username || parsed.password) return false;
  if (parsed.hostname.split(".").length < 2) return false;
  return true;
}
//@ chunk-5xgkngpb.js:2223932-2224685 fingerprint (2.1.88 match: checkDomainBlocklist, 0.671)
/**
 * 域名预检：GET api.anthropic.com/api/web/domain_info?domain=…（10 秒超时，总 30 秒），can_fetch=true 记入 domainChecks 缓存；返回 allowed/blocked/check_failed（含 HTTP 状态，429 会被翻译成限流错误）。
 */
async function checkDomainBlocklist(domain, cache, signal) {
  if (cache.domainChecks.has(domain))
    return {
      status: "allowed",
    };
  let combinedAbortSignal = createCombinedAbortSignal(signal, {
    timeoutMs: DOMAIN_CHECK_DEADLINE_MS,
    refTimer: true,
  });
  try {
    let response = await axios_default.get(
      `https://api.anthropic.com/api/web/domain_info?domain=${encodeURIComponent(domain)}`,
      {
        headers: {
          "User-Agent": claudeCodeUserAgent(),
        },
        signal: combinedAbortSignal.signal,
        timeout: DOMAIN_CHECK_TIMEOUT_MS,
      },
    );
    if (response.status === 200) {
      if (response.data.can_fetch === true) {
        cache.domainChecks.set(domain, true);
        return {
          status: "allowed",
        };
      }
      return {
        status: "blocked",
      };
    }
    return {
      status: "check_failed",
      error: Error(`Domain check returned status ${response.status}`),
      httpStatus: response.status,
    };
  } catch (error) {
    if (signal.aborted) throw error;
    logForDebugging(
      `Domain blocklist check failed for ${domain}: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return {
      status: "check_failed",
      error,
      httpStatus: axios_default.isAxiosError(error) ? error.response?.status : undefined,
    };
  } finally {
    combinedAbortSignal.cleanup();
  }
}
//@ chunk-5xgkngpb.js:2224685-2225011 layout
/**
 * 判断是否可以自动跟随重定向：协议、端口相同，无凭证，去 www 后主机相同；若原 URL 在预批准路径内，目标也必须在预批准路径内。
 */
function isPermittedRedirect(originalUrl, redirectUrl) {
  try {
    let parsedOriginal = new URL(originalUrl);
    let parsedRedirect = new URL(redirectUrl);
    if (parsedRedirect.protocol !== parsedOriginal.protocol) return false;
    let bareHost = stripWww(parsedOriginal.hostname);
    let originalHosts = normalizeCaseForComparison_2([parsedOriginal.hostname, bareHost, `www.${bareHost}`]);
    if (
      originalHosts.some((host) => isPreapprovedHostPath(host, parsedOriginal.pathname)) &&
      !originalHosts.some((host) => isPreapprovedHostPath(host, parsedRedirect.pathname))
    )
      return false;
    if (parsedRedirect.port !== parsedOriginal.port) return false;
    if (parsedRedirect.username || parsedRedirect.password) return false;
    return stripWww(parsedRedirect.hostname) === bareHost;
  } catch (_error) {
    return false;
  }
}
//@ chunk-5xgkngpb.js:2225011-2225057 layout
function stripWww(hostname) {
  return hostname.replace(/^www\./, "");
}
//@ chunk-5xgkngpb.js:2225057-2225096 layout
var REDIRECT_STATUS_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:2225057", () => {
  REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);
});
//@ chunk-5xgkngpb.js:2225096-2225337 layout
/**
 * 给抓取加整体 deadline（nte() 毫秒，0 表示不限），调用 getWithPermittedRedirects。
 */
async function getWithDeadline(upgradedUrl, signal, isPermittedRedirect, depth = 0, deadlineSignal) {
  if (deadlineSignal !== undefined)
    return getWithPermittedRedirects(upgradedUrl, signal, isPermittedRedirect, depth, deadlineSignal);
  let webFetchDeadlineMs = getWebFetchDeadlineMs();
  if (webFetchDeadlineMs === 0)
    return getWithPermittedRedirects(
      upgradedUrl,
      signal,
      isPermittedRedirect,
      depth,
      new AbortController().signal,
    );
  let combinedAbortSignal = createCombinedAbortSignal(undefined, {
    timeoutMs: webFetchDeadlineMs,
    refTimer: true,
  });
  try {
    return await getWithPermittedRedirects(
      upgradedUrl,
      signal,
      isPermittedRedirect,
      depth,
      combinedAbortSignal.signal,
    );
  } finally {
    combinedAbortSignal.cleanup();
  }
}
//@ chunk-5xgkngpb.js:2225337-2226807 fingerprint (2.1.88 match: getWithPermittedRedirects, 0.534)
/**
 * axios GET（不自动跟随重定向、arraybuffer、10MB 上限、60 秒超时、Accept 优先 markdown）。2xx 返回响应；3xx 若 redirectChecker 允许则递归（最多 10 次），否则返回 {type:"redirect"}；出口代理拦截抛 EgressBlockedError；其余返回 {type:"http_error", retryAfter?}。云会话中 ENOTFOUND 给出"需在网络设置放行"的专用提示。
 */
async function getWithPermittedRedirects(url, signal, redirectChecker, depth, deadlineSignal) {
  if (depth > MAX_REDIRECTS) throw new TooManyRedirectsError(MAX_REDIRECTS);
  let response = await axios_default
    .get(url, {
      signal: AbortSignal.any([signal, deadlineSignal]),
      timeout: FETCH_TIMEOUT_MS,
      maxRedirects: 0,
      responseType: "arraybuffer",
      maxContentLength: MAX_HTTP_CONTENT_LENGTH,
      validateStatus: () => true,
      headers: {
        Accept: "text/markdown, text/html, */*",
        "User-Agent": getWebFetchUserAgent(),
      },
    })
    .catch((error) => {
      if (isBlockedByProxyAllowlist(error)) throw new EgressBlockedError(new URL(url).hostname);
      if (axios_default.isCancel(error) && deadlineSignal.aborted && !signal.aborted)
        throw new WebFetchTransportError(
          `Fetch did not complete within the ${getWebFetchDeadlineMs() / 1000}s deadline`,
          "EDEADLINE",
        );
      if (axios_default.isAxiosError(error) && !axios_default.isCancel(error))
        throw new WebFetchTransportError(
          error.code === "ENOTFOUND" && isRemoteManagedEnvironment()
            ? `${error.message}. In this cloud session a host fails to resolve like this when it is outside the session's allowed network domains, or does not exist. If another host has failed the same way, stop trying more sites: carry on without them, and say in your answer that ${new URL(url).hostname} has to be allowed in the session's network settings. Fetch it again only once the user says it is allowed.`
            : error.message,
          error.code,
        );
      throw error;
    });
  let { status, headers } = response;
  if (status >= 200 && status < 300) return response;
  if (REDIRECT_STATUS_CODES.has(status)) {
    let redirectLocation = headers.location;
    if (typeof redirectLocation !== "string" || redirectLocation.trim() === "")
      return {
        type: "http_error",
        statusCode: status,
      };
    let redirectUrl = URL.parse(redirectLocation, url)?.toString();
    if (redirectUrl === undefined)
      return {
        type: "http_error",
        statusCode: status,
      };
    return redirectChecker(url, redirectUrl)
      ? getWithPermittedRedirects(redirectUrl, signal, redirectChecker, depth + 1, deadlineSignal)
      : {
          type: "redirect",
          originalUrl: url,
          redirectUrl,
          statusCode: status,
        };
  }
  if (isAllowlistBlockedResponse(status, headers)) throw new EgressBlockedError(new URL(url).hostname);
  let retryAfter = headers["retry-after"];
  return {
    type: "http_error",
    statusCode: status,
    ...(typeof retryAfter === "string" &&
      /^[0-9]{1,6}$/.test(retryAfter) && {
        retryAfter,
      }),
  };
}
//@ chunk-5xgkngpb.js:2226807-2226861 fingerprint (2.1.88 match: isRedirectInfo, 1)
function isRedirectInfo(response) {
  return "type" in response && response.type === "redirect";
}
//@ chunk-5xgkngpb.js:2226861-2226917 layout
function isHttpErrorInfo(response) {
  return "type" in response && response.type === "http_error";
}
//@ chunk-5xgkngpb.js:2226917-2227898 layout
var PROXY_ERROR_EVENT_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TARGET_ERROR_EVENT_CODES;
var REMEMBERED_TARGET_ERRORS;
var SITE_ANSWER_ERRORS;
deferInit("chunk-5xgkngpb.js:2226917", () => {
  PROXY_ERROR_EVENT_CODES = {
    transport: "web_fetch_proxy_transport",
    deadline: "web_fetch_proxy_deadline",
    badResponse: "web_fetch_proxy_bad_response",
    rateLimited: "web_fetch_proxy_rate_limited",
    unavailable: "web_fetch_proxy_unavailable",
    rejected: "web_fetch_proxy_rejected",
  };
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
  ]);
  REMEMBERED_TARGET_ERRORS = [
    "invalid_url",
    "url_too_long",
    "url_not_found",
    "client_error",
    "server_error",
    "robots_disallowed",
    "site_blocked",
    "permissions_error",
  ];
  SITE_ANSWER_ERRORS = ["url_not_found", "client_error", "robots_disallowed"];
});
//@ chunk-5xgkngpb.js:2227898-2227998 facade-majority
let SiteAnswerError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2227898", () => {
  SiteAnswerError = class SiteAnswerError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    errorType;
    constructor(message, eventCode, errorType) {
      super(message, "web-fetch-ccr-proxy", eventCode);
      this.errorType = errorType;
    }
  };
});
//@ chunk-5xgkngpb.js:2227998-2228051 facade-majority
function siteAnswerAsValue(error) {
  if (error instanceof SiteAnswerError) return error;
  throw error;
}
//@ chunk-5xgkngpb.js:2228051-2228110 facade-majority (2.1.88 match: getCurrentRepoHttpsUrl, 0.805)
/**
 * 把 http:// 改写为 https://。
 */
function upgradeToHttps(url) {
  return url.replace(/^http:\/\//i, "https://");
}
//@ chunk-5xgkngpb.js:2228110-2228309 facade-majority
function serverClearedUrl(permissionPhase) {
  let pipeline = permissionPhase?.pipeline;
  if (pipeline?.result.behavior !== "allow") return;
  let decisionReason = pipeline.result.decisionReason;
  let url = pipeline.input.url;
  return decisionReason?.type === "classifier" &&
    decisionReason.serverCleared === true &&
    typeof url === "string"
    ? url
    : undefined;
}
//@ chunk-5xgkngpb.js:2228309-2228686 layout
/**
 * 把 CCR 代理/目标站错误映射成遥测用错误码（web_fetch_proxy_* / web_fetch_target_*）。
 */
function proxyErrorEventCode(proxyResult) {
  if (proxyResult.source === "target")
    return (
      TARGET_ERROR_EVENT_CODES.get((proxyResult.errorType ?? "").toLowerCase()) ?? "web_fetch_target_other"
    );
  if (proxyResult.errorType === "PROXY_TRANSPORT") return PROXY_ERROR_EVENT_CODES.transport;
  if (proxyResult.errorType === "PROXY_DEADLINE") return PROXY_ERROR_EVENT_CODES.deadline;
  if (proxyResult.errorType === "PROXY_BAD_RESPONSE") return PROXY_ERROR_EVENT_CODES.badResponse;
  if (proxyResult.statusCode === 429) return PROXY_ERROR_EVENT_CODES.rateLimited;
  return proxyResult.statusCode >= 500
    ? PROXY_ERROR_EVENT_CODES.unavailable
    : PROXY_ERROR_EVENT_CODES.rejected;
}
//@ chunk-5xgkngpb.js:2228686-2232020 facade-majority (2.1.88 match: getURLMarkdownContent, 0.462)
/**
 * 抓取并转 markdown：URL 校验（无点主机名提示改用 curl）→ urls 缓存命中直接返回 → 有 CCR web-fetch 代理时走代理（处理 provenance_denied、目标站失败记忆、代理报告的最终 URL 是否允许）→ claude-code-server 无代理时报错 → 直连：http 升级 https、域名预检（settings.skipWebFetchPreflight 可跳过）、带 deadline 抓取、二进制内容另存文件、HTML 转 markdown，写入缓存。
 */
async function getURLMarkdownContent(
  session,
  url,
  abortHolder,
  cache,
  persistedToolResultFiles,
  storage,
  timing,
  priorUrl,
) {
  if (!validateURL(url)) {
    let hostname = URL.parse(url)?.hostname;
    if (hostname && !hostname.includes("."))
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
    if (cachedEntry.persistedPath !== undefined)
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
  if (canFetchViaCcrWorker(session)) {
    let httpsUrl = upgradeToHttps(url);
    let markExternal = timing?.mark("external");
    let proxyResult = await fetchViaWorkerProxy(
      session,
      httpsUrl,
      abortHolder.signal,
      priorUrl !== undefined && upgradeToHttps(priorUrl) === httpsUrl,
    ).finally(markExternal);
    cache.targetFailures.delete(httpsUrl);
    if (!proxyResult.ok) {
      if (proxyResult.source === "target" && proxyResult.errorType === PROVENANCE_REQUIRED)
        return {
          type: "provenance_denied",
          url: httpsUrl,
          errorMessage: proxyResult.errorMessage,
        };
      let lower = proxyResult.errorType?.toLowerCase();
      let rememberedKind =
        proxyResult.source === "target" ? REMEMBERED_TARGET_ERRORS.find((kind) => kind === lower) : undefined;
      if (rememberedKind)
        cache.targetFailures.set(httpsUrl, {
          errorType: rememberedKind,
          failedAt: Date.now(),
          told: new Set(),
        });
      let errorJson = jsonStringify({
        error_type: proxyResult.errorType,
        source: proxyResult.source,
        message: proxyResult.errorMessage,
      });
      let errorType =
        proxyResult.source === "target" ? SITE_ANSWER_ERRORS.find((kind) => kind === lower) : undefined;
      throw errorType
        ? new SiteAnswerError(errorJson, proxyErrorEventCode(proxyResult), errorType)
        : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            errorJson,
            "web-fetch-ccr-proxy",
            proxyErrorEventCode(proxyResult),
          );
    }
    if (proxyResult.destinationUrl !== undefined) {
      let redirectUrl = URL.parse(proxyResult.destinationUrl)?.toString();
      if (redirectUrl === undefined)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          jsonStringify({
            error_type: "PROXY_BAD_RESPONSE",
            source: "proxy",
            message: "proxy reported a destination that is not a valid URL",
          }),
          "web-fetch-ccr-proxy",
          PROXY_ERROR_EVENT_CODES.badResponse,
        );
      if (!isPermittedRedirect(httpsUrl, redirectUrl))
        return {
          type: "redirect",
          originalUrl: httpsUrl,
          redirectUrl,
          statusCode: 302,
        };
    }
    let byteSize = Buffer.byteLength(proxyResult.content, "utf8");
    let entry = {
      content: proxyResult.content,
      bytes: byteSize,
      code: 200,
      codeText: "OK",
      contentType: proxyResult.contentType,
      isExtractedText: true,
      retrievedAt: proxyResult.retrievedAt,
    };
    cache.setUrl(url, entry, byteSize);
    return entry;
  }
  if (session.host.launchOptions.ccrSessionUrl() !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "WebFetch on claude-code-server needs the CCR web-fetch proxy",
      "web-fetch-ccs-direct",
    );
  let parsedUrl;
  let upgradedUrl = url;
  try {
    parsedUrl = new URL(url);
    if (parsedUrl.protocol === "http:") {
      parsedUrl.protocol = "https:";
      upgradedUrl = parsedUrl.toString();
    }
    let hostname = parsedUrl.hostname;
    if (!getSettings_DEPRECATED().skipWebFetchPreflight) {
      let domainCheck = await checkDomainBlocklist(hostname, cache, abortHolder.signal);
      switch (domainCheck.status) {
        case "allowed":
          break;
        case "blocked":
          throw new DomainBlockedError(hostname);
        case "check_failed":
          throw new DomainCheckFailedError(
            hostname,
            axios_default.isCancel(domainCheck.error)
              ? "EDEADLINE_PREFLIGHT"
              : domainCheck.httpStatus === 429
                ? "ERATELIMIT_PREFLIGHT"
                : undefined,
          );
      }
    }
  } catch (e) {
    if (e instanceof DomainBlockedError || e instanceof DomainCheckFailedError || axios_default.isCancel(e))
      throw e;
    logError(e);
  }
  let now = Date.now();
  let transportResult = timing?.mark("external");
  let response;
  try {
    response = await getWithDeadline(upgradedUrl, abortHolder.signal, isPermittedRedirect).finally(
      transportResult,
    );
  } catch (error) {
    if (!axios_default.isCancel(error))
      logEvent("tengu_web_fetch_transport", {
        outcome: fromEnum("error"),
        httpDurationMs: Date.now() - now,
        ...errorTelemetryFields(error),
      });
    throw error;
  }
  logEvent("tengu_web_fetch_transport", {
    outcome: fromEnum(
      isRedirectInfo(response) ? "redirect" : isHttpErrorInfo(response) ? "http_error" : "ok",
    ),
    httpDurationMs: Date.now() - now,
    ...(!isRedirectInfo(response) &&
      !isHttpErrorInfo(response) && {
        bytes: response.data.byteLength,
      }),
  });
  if (isRedirectInfo(response) || isHttpErrorInfo(response)) return response;
  let rawBuffer = Buffer.from(response.data);
  response.data = null;
  let contentType = String(response.headers["content-type"] ?? "");
  let persistedPath;
  let persistedSize;
  if (isBinaryContentType(contentType)) {
    let persistId = `webfetch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let result = await persistBinaryContent(
      rawBuffer,
      contentType,
      persistId,
      persistedToolResultFiles,
      storage,
    );
    if (!("error" in result)) {
      persistedPath = result.filepath;
      persistedSize = result.size;
    }
  }
  let bytes = rawBuffer.length;
  let htmlContent = rawBuffer.toString("utf-8");
  let markdownContent;
  let contentBytes;
  if (contentType.includes("text/html")) {
    markdownContent = await convertHtmlToMarkdown(htmlContent);
    contentBytes = Buffer.byteLength(markdownContent);
  } else {
    markdownContent = htmlContent;
    contentBytes = bytes;
  }
  let entry = {
    bytes,
    code: response.status,
    codeText: response.statusText,
    content: markdownContent,
    contentType,
    persistedPath,
    persistedSize,
  };
  cache.setUrl(url, entry, contentBytes);
  return entry;
}
//@ chunk-5xgkngpb.js:2232020-2232052 facade-majority
/**
 * 把 markdown 截到 Tnr 字符上限（次级模型输入上限）。
 */
function secondaryModelHead(text) {
  return truncateToLength(text, MAX_REJECT_KEY_CHARS);
}
//@ chunk-5xgkngpb.js:2232052-2232905 facade-majority (2.1.88 match: applyPromptToMarkdown, 0.616)
/**
 * 用次级模型（querySource "web_fetch_apply"，空 system prompt）按用户 prompt 处理页面 markdown；超长截断；可选用随机 fence 包裹不可信内容；返回首个文本块，API 错误抛 TelemetrySafeError。
 */
async function applyPromptToMarkdown(prompt, markdown, options) {
  let {
    signal,
    isNonInteractiveSession,
    isPreapprovedDomain,
    agentContext,
    helperEffortFor,
    callerAnsweredQuerySource,
    credentials,
    untrustedSource,
    contentLead = "",
  } = options;
  let truncatedContent =
    markdown.length > MAX_REJECT_KEY_CHARS
      ? secondaryModelHead(markdown) +
        `

[Content truncated due to length...]`
      : markdown;
  let secondaryModelPrompt = makeSecondaryModelPrompt(
    truncatedContent,
    prompt,
    isPreapprovedDomain,
    untrustedSource === undefined
      ? undefined
      : {
          source: untrustedSource,
          fence: `${UNTRUSTED_CONTENT}-${randomUUID().replaceAll("-", "").slice(0, 12)}`,
        },
  );
  let assistantMessage = await queryHaikuWithFallback({
    systemPrompt: asSystemPrompt([]),
    userPrompt: `${contentLead}${secondaryModelPrompt}`,
    signal,
    options: {
      querySource: "web_fetch_apply",
      agents: [],
      isNonInteractiveSession,
      hasAppendSystemPrompt: false,
      mcpTools: [],
      agentContext,
      helperEffortFor,
      callerAnsweredQuerySource,
      credentials,
    },
  });
  if (signal.aborted) throw new AbortError_2();
  if (assistantMessage.isApiErrorMessage)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      extractTextContent_2(assistantMessage.message.content),
      "web-fetch-apply-api-error",
    );
  let { content } = assistantMessage.message;
  if (content.length > 0) {
    let contentBlock = content[0];
    if ("text" in contentBlock) return contentBlock.text;
  }
  return "No response from model";
}
//@ chunk-5xgkngpb.js:2368829-2368852 affinity
var DOMAIN_CACHE_MAX = 500;
var DOMAIN_CACHE_TTL_MS = 300000;
//@ chunk-5xgkngpb.js:2368852-2368900 fingerprint (2.1.88 match: DOMAIN_CHECK_CACHE, 1)
/**
 * 创建 500 项、5 分钟 TTL 的 LRU（域名类检查缓存）。
 */
function createDomainCache() {
  return new LRUCache({
    max: DOMAIN_CACHE_MAX,
    ttl: DOMAIN_CACHE_TTL_MS,
  });
}
//@ chunk-56df17sz.js:1296-1386 fingerprint (2.1.88 match: URL_CACHE, 0.376)
/**
 * 大小与待清理量是否都在上限内。
 */
function isWithinSanitizeBudget(budget) {
  return budget.size <= budget.maxSize && budget.sixteenthsToSanitize <= budget.maxSixteenthsToSanitize;
}
export {
  convertHtmlToMarkdown,
  applyPromptToMarkdown,
  isWithinSanitizeBudget,
  secondaryModelHead,
  stripRetiredInputFields,
  isPreapprovedUrl,
  WebFetchCache,
  upgradeToHttps,
  getURLMarkdownContent,
  serverClearedUrl,
  siteAnswerAsValue,
  SiteAnswerError,
  WebFetchTransportError,
  createDomainCache,
  getHttpsHostname,
};
