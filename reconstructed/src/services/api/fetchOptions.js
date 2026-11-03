/**
 * services/api/fetchOptions.ts
 *
 * 2.1.316 新增：一方 API 请求的 Bun fetch 扩展选项判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (11)
 * attribution: placement 11
 */
import { hasSeenTrustOverride, isRuntimeStoreCABundle } from "../../utils/caCerts.js";
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { stripAnyVersatileSuffix } from "../../utils/model/modelIds.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-hwmsct5x.js:183031-183200 placement
var weakSet = new WeakSet();
var ALLOWED_FETCH_OPTION_KEYS = new Set([
  "method",
  "headers",
  "body",
  "signal",
  "duplex",
  "compress",
  "proxy",
  "keepalive",
  "timeout",
  "tls",
]);
var ALLOWED_TLS_OPTION_KEYS = new Set(["ca", "cert", "key", "passphrase"]);
//@ chunk-hwmsct5x.js:183200-183571 placement
/**
 * 判断请求是否走一方 API 主机的 https 直连（用于启用 Bun fetch 的 tls/compress 等扩展选项）。
 */
function shouldUseFirstPartyFetchOptions({ provider, routedProvider, url, init }) {
  if (hasSeenTrustOverride() || provider !== "firstParty" || routedProvider !== "firstParty") return false;
  let h;
  try {
    h = new URL(url);
  } catch {
    return false;
  }
  if (
    h.protocol !== "https:" ||
    h.port !== "" ||
    h.username !== "" ||
    h.password !== "" ||
    !isFirstPartyAnthropicHost(h.href)
  )
    return false;
  if (init === undefined || !hasOnlyKeys(init, ALLOWED_FETCH_OPTION_KEYS) || !("tls" in init)) return false;
  let { tls } = init;
  return (
    tls !== null &&
    typeof tls === "object" &&
    hasOnlyKeys(tls, ALLOWED_TLS_OPTION_KEYS) &&
    "ca" in tls &&
    isRuntimeStoreCABundle(tls.ca)
  );
}
//@ chunk-hwmsct5x.js:183571-183712 placement
function hasOnlyKeys(e, n) {
  if (Object.getPrototypeOf(e) !== Object.prototype) return false;
  return Reflect.ownKeys(e).every((r) => typeof r === "string" && n.has(r));
}
//@ chunk-hwmsct5x.js:183712-183788 placement
function isSameUnredirectedUrl(e, n) {
  try {
    return !e.redirected && urlWithoutHash(e.url) === urlWithoutHash(n);
  } catch {
    return false;
  }
}
//@ chunk-hwmsct5x.js:183788-183844 placement
function urlWithoutHash(e) {
  let n = new URL(e);
  n.hash = "";
  return n.href;
}
//@ chunk-hwmsct5x.js:183844-183869 placement
function markFirstPartyFetch(headers) {
  weakSet.add(headers);
}
//@ chunk-hwmsct5x.js:183869-183979 placement
function classifyFirstPartyRequest(e, n) {
  return e?.headers !== undefined &&
    weakSet.has(e.headers) &&
    (!isInvalidRequestError(e) || isKnownInvalidRequestBody(e)) &&
    !mentionsModel(n)
    ? "first_party"
    : undefined;
}
//@ chunk-hwmsct5x.js:183979-184139 placement
function mentionsModel({ model, text }) {
  let lower = text.toLowerCase();
  let s = stripAnyVersatileSuffix(model);
  return [model, s, jsonStringify(s).slice(1, -1)].some((h) => {
    let lower_2 = h.trim().toLowerCase();
    return lower_2 !== "" && lower.includes(lower_2);
  });
}
//@ chunk-hwmsct5x.js:184139-184645 placement
/**
 * 已知的无效请求错误消息模式（提示过长、max_tokens 超限、图片类型、余额不足）以及错误信封允许的键集合。
 */
var KNOWN_INVALID_REQUEST_PATTERNS = [
  /^prompt is too long: \d+ tokens > \d+ maximum$/,
  /^max_tokens: \d+ > \d+, which is the maximum allowed number of output tokens for this model$/,
  /^messages\.\d+\.content\.\d+\.image\.source\.base64\.media_type: Input should be 'image\/jpeg', 'image\/png', 'image\/gif' or 'image\/webp'$/,
  /^Your credit balance is too low to access the Anthropic API\. Please go to Plans & Billing to upgrade or purchase credits\.$/,
];
var INVALID_REQUEST_ENVELOPE_KEYS = new Set(["type", "error", "request_id"]);
var INVALID_REQUEST_ERROR_KEYS = new Set(["type", "message", "details"]);
//@ chunk-hwmsct5x.js:184645-184732 placement
function isInvalidRequestError(e) {
  return e.status === 400 || e.status === 422 || e.type === "invalid_request_error";
}
//@ chunk-hwmsct5x.js:184732-185012 placement
function isKnownInvalidRequestBody({ error }) {
  if (
    typeof error !== "object" ||
    error === null ||
    !hasOnlyKeys(error, INVALID_REQUEST_ENVELOPE_KEYS) ||
    !("error" in error)
  )
    return false;
  let { error: error_2 } = error;
  if (
    typeof error_2 !== "object" ||
    error_2 === null ||
    !hasOnlyKeys(error_2, INVALID_REQUEST_ERROR_KEYS) ||
    !("message" in error_2) ||
    ("details" in error_2 && error_2.details !== null)
  )
    return false;
  let { message } = error_2;
  return typeof message === "string" && KNOWN_INVALID_REQUEST_PATTERNS.some((s) => s.test(message));
}
export {
  classifyFirstPartyRequest,
  shouldUseFirstPartyFetchOptions,
  isSameUnredirectedUrl,
  markFirstPartyFetch,
};
