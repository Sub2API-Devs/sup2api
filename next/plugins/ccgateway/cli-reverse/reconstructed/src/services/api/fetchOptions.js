/**
 * services/api/fetchOptions.ts
 *
 * 2.1.316 新增：一方 API 请求的 Bun fetch 扩展选项判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vn3g7zt8.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { hasSeenTrustOverride, isRuntimeStoreCABundle } from "../../utils/caCerts.js";
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { stripAnyVersatileSuffix } from "../../utils/model/modelIds.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vn3g7zt8.js:183419-183588 placement
var weakSet; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ALLOWED_FETCH_OPTION_KEYS;
var ALLOWED_TLS_OPTION_KEYS;
deferInit("chunk-vn3g7zt8.js:183419", () => {
  weakSet = new WeakSet();
  ALLOWED_FETCH_OPTION_KEYS = new Set([
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
  ALLOWED_TLS_OPTION_KEYS = new Set(["ca", "cert", "key", "passphrase"]);
});
//@ chunk-vn3g7zt8.js:183588-183959 placement
/**
 * 判断请求是否走一方 API 主机的 https 直连（用于启用 Bun fetch 的 tls/compress 等扩展选项）。
 */
function shouldUseFirstPartyFetchOptions({ provider, routedProvider, url, init }) {
  if (hasSeenTrustOverride() || provider !== "firstParty" || routedProvider !== "firstParty") return false;
  let targetUrl;
  try {
    targetUrl = new URL(url);
  } catch {
    return false;
  }
  if (
    targetUrl.protocol !== "https:" ||
    targetUrl.port !== "" ||
    targetUrl.username !== "" ||
    targetUrl.password !== "" ||
    !isFirstPartyAnthropicHost(targetUrl.href)
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
//@ chunk-vn3g7zt8.js:183959-184100 placement
function hasOnlyKeys(object, allowedKeys) {
  if (Object.getPrototypeOf(object) !== Object.prototype) return false;
  return Reflect.ownKeys(object).every((key) => typeof key === "string" && allowedKeys.has(key));
}
//@ chunk-vn3g7zt8.js:184100-184176 placement
function isSameUnredirectedUrl(response, url) {
  try {
    return !response.redirected && urlWithoutHash(response.url) === urlWithoutHash(url);
  } catch {
    return false;
  }
}
//@ chunk-vn3g7zt8.js:184176-184232 placement
function urlWithoutHash(url) {
  let parsed = new URL(url);
  parsed.hash = "";
  return parsed.href;
}
//@ chunk-vn3g7zt8.js:184232-184257 placement
function markFirstPartyFetch(headers) {
  weakSet.add(headers);
}
//@ chunk-vn3g7zt8.js:184257-184367 placement
function classifyFirstPartyRequest(error, facts) {
  return error?.headers !== undefined &&
    weakSet.has(error.headers) &&
    (!isInvalidRequestError(error) || isKnownInvalidRequestBody(error)) &&
    !mentionsModel(facts)
    ? "first_party"
    : undefined;
}
//@ chunk-vn3g7zt8.js:184367-184527 placement
function mentionsModel({ model, text }) {
  let lower = text.toLowerCase();
  let stripped = stripAnyVersatileSuffix(model);
  return [model, stripped, jsonStringify(stripped).slice(1, -1)].some((candidate) => {
    let lower_2 = candidate.trim().toLowerCase();
    return lower_2 !== "" && lower.includes(lower_2);
  });
}
//@ chunk-vn3g7zt8.js:184527-185033 placement
/**
 * 已知的无效请求错误消息模式（提示过长、max_tokens 超限、图片类型、余额不足）以及错误信封允许的键集合。
 */
var KNOWN_INVALID_REQUEST_PATTERNS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var INVALID_REQUEST_ENVELOPE_KEYS;
var INVALID_REQUEST_ERROR_KEYS;
deferInit("chunk-vn3g7zt8.js:184527", () => {
  KNOWN_INVALID_REQUEST_PATTERNS = [
    /^prompt is too long: \d+ tokens > \d+ maximum$/,
    /^max_tokens: \d+ > \d+, which is the maximum allowed number of output tokens for this model$/,
    /^messages\.\d+\.content\.\d+\.image\.source\.base64\.media_type: Input should be 'image\/jpeg', 'image\/png', 'image\/gif' or 'image\/webp'$/,
    /^Your credit balance is too low to access the Anthropic API\. Please go to Plans & Billing to upgrade or purchase credits\.$/,
  ];
  INVALID_REQUEST_ENVELOPE_KEYS = new Set(["type", "error", "request_id"]);
  INVALID_REQUEST_ERROR_KEYS = new Set(["type", "message", "details"]);
});
//@ chunk-vn3g7zt8.js:185033-185120 placement
function isInvalidRequestError(error) {
  return error.status === 400 || error.status === 422 || error.type === "invalid_request_error";
}
//@ chunk-vn3g7zt8.js:185120-185400 placement
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
  return (
    typeof message === "string" && KNOWN_INVALID_REQUEST_PATTERNS.some((pattern) => pattern.test(message))
  );
}
export {
  classifyFirstPartyRequest,
  shouldUseFirstPartyFetchOptions,
  isSameUnredirectedUrl,
  markFirstPartyFetch,
};
