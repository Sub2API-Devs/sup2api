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
import { Bn } from "../../utils/model/modelIds.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-hwmsct5x.js:183031-183200 placement
var weakSet_2 = new WeakSet(),
  Qg = new Set([
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
  ]),
  Zg = new Set(["ca", "cert", "key", "passphrase"]);
/**
 * 判断请求是否走一方 API 主机的 https 直连（用于启用 Bun fetch 的 tls/compress 等扩展选项）。
 */
//@ chunk-hwmsct5x.js:183200-183571 placement
function shouldUseFirstPartyFetchOptions({
  provider: provider,
  routedProvider: routedProvider,
  url: url,
  init: init,
}) {
  if (hasSeenTrustOverride() || provider !== "firstParty" || routedProvider !== "firstParty") return !1;
  let h;
  try {
    h = new URL(url);
  } catch {
    return !1;
  }
  if (
    h.protocol !== "https:" ||
    h.port !== "" ||
    h.username !== "" ||
    h.password !== "" ||
    !isFirstPartyAnthropicHost(h.href)
  )
    return !1;
  if (init === void 0 || !hasOnlyKeys(init, Qg) || !("tls" in init)) return !1;
  let { tls: tls } = init;
  return (
    tls !== null &&
    typeof tls === "object" &&
    hasOnlyKeys(tls, Zg) &&
    "ca" in tls &&
    isRuntimeStoreCABundle(tls.ca)
  );
}
//@ chunk-hwmsct5x.js:183571-183712 placement
function hasOnlyKeys(e, n) {
  if (Object.getPrototypeOf(e) !== Object.prototype) return !1;
  return Reflect.ownKeys(e).every((r) => typeof r === "string" && n.has(r));
}
//@ chunk-hwmsct5x.js:183712-183788 placement
function Nd(e, n) {
  try {
    return !e.redirected && Fd(e.url) === Fd(n);
  } catch {
    return !1;
  }
}
//@ chunk-hwmsct5x.js:183788-183844 placement
function Fd(e) {
  let n = new URL(e);
  return ((n.hash = ""), n.href);
}
//@ chunk-hwmsct5x.js:183844-183869 placement
function Bd(e) {
  weakSet_2.add(e);
}
//@ chunk-hwmsct5x.js:183869-183979 placement
function classifyFirstPartyRequest(e, n) {
  return e?.headers !== void 0 &&
    weakSet_2.has(e.headers) &&
    (!o_(e) || isKnownInvalidRequestBody(e)) &&
    !mentionsModel(n)
    ? "first_party"
    : void 0;
}
//@ chunk-hwmsct5x.js:183979-184139 placement
function mentionsModel({ model: model, text: text }) {
  let lower = text.toLowerCase(),
    s = Bn(model);
  return [model, s, jsonStringify(s).slice(1, -1)].some((h) => {
    let lower_2 = h.trim().toLowerCase();
    return lower_2 !== "" && lower.includes(lower_2);
  });
}
//@ chunk-hwmsct5x.js:184139-184645 placement
var KNOWN_INVALID_REQUEST_PATTERNS = [
    /^prompt is too long: \d+ tokens > \d+ maximum$/,
    /^max_tokens: \d+ > \d+, which is the maximum allowed number of output tokens for this model$/,
    /^messages\.\d+\.content\.\d+\.image\.source\.base64\.media_type: Input should be 'image\/jpeg', 'image\/png', 'image\/gif' or 'image\/webp'$/,
    /^Your credit balance is too low to access the Anthropic API\. Please go to Plans & Billing to upgrade or purchase credits\.$/,
  ],
  n_ = new Set(["type", "error", "request_id"]),
  r_ = new Set(["type", "message", "details"]);
//@ chunk-hwmsct5x.js:184645-184732 placement
function o_(e) {
  return e.status === 400 || e.status === 422 || e.type === "invalid_request_error";
}
//@ chunk-hwmsct5x.js:184732-185012 placement
function isKnownInvalidRequestBody({ error: error }) {
  if (typeof error !== "object" || error === null || !hasOnlyKeys(error, n_) || !("error" in error))
    return !1;
  let { error: error_2 } = error;
  if (
    typeof error_2 !== "object" ||
    error_2 === null ||
    !hasOnlyKeys(error_2, r_) ||
    !("message" in error_2) ||
    ("details" in error_2 && error_2.details !== null)
  )
    return !1;
  let { message: message } = error_2;
  return typeof message === "string" && KNOWN_INVALID_REQUEST_PATTERNS.some((s) => s.test(message));
}

export { classifyFirstPartyRequest, shouldUseFirstPartyFetchOptions, Nd, Bd };
