/**
 * services/api/verificationRequired.ts
 *
 * 2.1.316 新增：清理验证提示文本并保留链接；只接受 Anthropic 官方主机的 https 验证链接等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (29)
 * attribution: placement 29
 */
import { Zt } from "../claudeAiLimits.js";
import { ge } from "../../utils/identity.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, T } from "../../../vendor/zod/v4/classic/schemas.js";
import { isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession, getSessionId } from "../../bootstrap/state.js";
import { API_ERROR_CONST_1000, API_ERROR_MESSAGE_PREFIX } from "./errors.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { Ot } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { logEvent } from "../analytics/index.js";
import { lit } from "../analytics/safeMetadata.js";
import { create, create_2 } from "../../../vendor/zod/lib/index.mjs";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { classifyAxiosError } from "../../utils/errors.js";

//@ chunk-aepeg2w5.js:289234-289261 placement
function kwi() {
  return null;
}
//@ chunk-aepeg2w5.js:289261-289284 placement
function Twi(e) {
  return;
}
//@ chunk-aepeg2w5.js:289284-289346 placement
function Awi() {
  return Zt().fastModeRateLimitDurationMs !== null;
}
//@ chunk-aepeg2w5.js:289346-289400 placement
function Cwi(e) {
  return Zt().checkFastModeRateLimit(e);
}
//@ chunk-aepeg2w5.js:289442-289521 placement
class JS {
  predicate = null;
  set(e) {
    let predicate = this.predicate;
    return ((this.predicate = e), predicate);
  }
}
//@ chunk-aepeg2w5.js:289521-289535 placement
var QS = new JS();
//@ chunk-aepeg2w5.js:289535-289567 placement
function ZS(e) {
  return QS.set(e);
}
//@ chunk-aepeg2w5.js:289567-289646 placement
function ev() {
  let predicate = QS.predicate;
  if (!predicate) return !1;
  try {
    return predicate();
  } catch {
    return !1;
  }
}
//@ chunk-aepeg2w5.js:289646-289694 placement
var ru = ge({ pending: null }, (e) => {
  e.pending = null;
});
//@ chunk-aepeg2w5.js:289820-289853 placement
function xwi() {
  return ru.pending;
}
//@ chunk-aepeg2w5.js:289853-289926 placement
var hn = { maxRedirects: 0, adapter: "http", validateStatus: (e) => e >= 200 && e < 300 };
//@ chunk-aepeg2w5.js:289926-290069 placement
var USER_FACING_ERROR_SCHEMA = DoctorLazy(() =>
    u({ error: u({ message: o(), details: u({ error_visibility: T("user_facing") }) }) }),
  ),
  ERROR_CODE_SCHEMA = DoctorLazy(() => u({ error: u({ details: u({ error_code: o() }) }) }));
/**
 * 从 403 响应中取验证错误消息。
 */
//@ chunk-aepeg2w5.js:290069-290189 placement
function verificationErrorMessage(e) {
  if (!isAxiosError(e)) return null;
  let safeParse = USER_FACING_ERROR_SCHEMA().safeParse(e.response?.data);
  return safeParse.success ? safeParse.data.error.message : null;
}
/**
 * 从 axios 错误的响应体中解析 error_code，失败返回 null。
 */
//@ chunk-aepeg2w5.js:290189-290320 placement
function readErrorCodeFromAxios(e) {
  if (!isAxiosError(e)) return null;
  let safeParse = ERROR_CODE_SCHEMA().safeParse(e.response?.data);
  return safeParse.success ? safeParse.data.error.details.error_code : null;
}
//@ chunk-aepeg2w5.js:290320-290533 placement
class ClaimOnceStore {
  #n = new Set();
  #e = new Map();
  lastBellAt = 0;
  claim(e) {
    if (this.#n.has(e)) return !1;
    return (this.#n.add(e), !0);
  }
  has(e) {
    return this.#n.has(e);
  }
  claimIfChanged(e, n) {
    if (this.#e.get(e) === n) return !1;
    return (this.#e.set(e, n), !0);
  }
}
/**
 * 一次性声明存储（按 host）。
 */
//@ chunk-aepeg2w5.js:290533-290558 placement
var claimOnceStore = new HostScoped(() => new ClaimOnceStore());
/**
 * 获取一次性声明存储。
 */
//@ chunk-aepeg2w5.js:290558-290595 placement
function claimOnce() {
  return claimOnceStore.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:290595-290722 placement
var VERIFICATION_REQUIRED_SCHEMA = DoctorLazy(() =>
  u({
    error: u({
      type: T("permission_error"),
      message: o().min(1),
      details: u({ error_code: T("verification_required") }),
    }),
  }),
);
/**
 * 解析 403 响应中的"需要验证"错误，返回清洗后的消息。
 */
//@ chunk-aepeg2w5.js:290722-290836 placement
function parseVerificationRequired(e, n) {
  if (e !== 403) return;
  let safeParse = VERIFICATION_REQUIRED_SCHEMA().safeParse(n);
  if (!safeParse.success) return;
  return sanitizeVerificationMessage(safeParse.data.error.message);
}
//@ chunk-aepeg2w5.js:290836-290864 placement
var Tf = API_ERROR_CONST_1000 - `${API_ERROR_MESSAGE_PREFIX}: `.length;
/**
 * 清理验证提示文本并保留链接。
 */
//@ chunk-aepeg2w5.js:290864-291186 placement
function sanitizeVerificationMessage(e) {
  let trimmed = e.replace(/[\p{Cc}\p{Cf}\u0020\u2028\u2029]+/gu, " ").trim();
  if (trimmed === "") return;
  if (trimmed.length <= Tf) return trimmed;
  let index = trimmed.lastIndexOf("https://");
  if (index !== -1) {
    let index_2 = trimmed.indexOf(" ", index),
      sliced = trimmed.slice(index, index_2 === -1 ? void 0 : index_2),
      y = Tf - sliced.length - 2;
    if (y >= 0) return `${truncateToLength(trimmed.slice(0, index), y).trimEnd()}\u2026 ${sliced}`;
  }
  return `${truncateToLength(trimmed, Tf - 1)}\u2026`;
}
/**
 * 是否为 verification_required 的 403。
 */
//@ chunk-aepeg2w5.js:291186-291257 placement
function isVerificationRequiredError(e) {
  return e instanceof Ot && parseVerificationRequired(e.status, e.error) !== void 0;
}
/**
 * 每会话一次记录"需要验证"提示已显示，消息含链接时另记一条。
 */
//@ chunk-aepeg2w5.js:291257-291463 placement
function logVerificationShown(e) {
  if (!claimOnce().claim(`tengu_ranch_rc_shown:${getSessionId()}`)) return;
  if ((logEvent("tengu_ranch_rc_shown", { surface: lit("claude_code") }), e.includes("https://")))
    logEvent("tengu_ranch_rc_link_shown", { surface: lit("claude_code") });
}
//@ chunk-aepeg2w5.js:291463-291553 placement
class VerificationRequiredError extends Error {
  constructor(e, n) {
    super(e, n);
    this.name = "VerificationRequiredError";
  }
}
/**
 * 只接受 Anthropic 官方主机的 https 验证链接。
 */
//@ chunk-aepeg2w5.js:291553-291793 placement
function safeVerificationUrl(e) {
  let n;
  try {
    n = new URL(e);
  } catch {
    return;
  }
  if (n.protocol !== "https:" || n.username !== "" || n.password !== "" || n.port !== "") return;
  let hostname = n.hostname;
  return hostname === "portal.anthropic.com" || hostname === "claude.ai" || hostname === "platform.claude.com"
    ? n.href
    : void 0;
}
//@ chunk-aepeg2w5.js:291793-291919 placement
var OAUTH_PROFILE_SCHEMA = DoctorLazy(() =>
  create({
    account: create({ uuid: create_2(), email: create_2() }).passthrough(),
    organization: create({ uuid: create_2() }).passthrough(),
  }).passthrough(),
);
//@ chunk-aepeg2w5.js:291919-292165 placement
function parseOauthProfileResponse(e) {
  let safeParse = OAUTH_PROFILE_SCHEMA().safeParse(e);
  if (!safeParse.success) {
    (logFeatureBad("oauth_profile_fetch", "malformed_response_body"),
      logForDebugging(
        `OAuth profile: response body failed shape validation \u2014 ${safeParse.error.message}`,
        { level: "error" },
      ));
    return;
  }
  return (logFeatureOk("oauth_profile_fetch"), e);
}
//@ chunk-aepeg2w5.js:292165-292324 placement
function classifyProfileFetchError(e) {
  let { kind: kind, status: status } = classifyAxiosError(e);
  if (kind === "auth") return "no_auth";
  if (status === 429) return "rate_limited";
  if (kind === "timeout") return "timeout";
  return "network_error";
}
//@ chunk-aepeg2w5.js:292324-292428 placement
function profileFetchErrorCode(e) {
  let { kind: kind, status: status } = classifyAxiosError(e);
  return kind === "other" || status === void 0 ? "unexpected_error" : `http_${status}`;
}

export {
  claimOnce,
  sanitizeVerificationMessage,
  verificationErrorMessage,
  readErrorCodeFromAxios,
  kwi,
  isVerificationRequiredError,
  Twi,
  parseVerificationRequired,
  logVerificationShown,
  safeVerificationUrl,
  ru,
  hn,
  parseOauthProfileResponse,
  classifyProfileFetchError,
  profileFetchErrorCode,
  VerificationRequiredError,
  ev,
  ZS,
  claimOnceStore,
  xwi,
  Awi,
  Cwi,
};
