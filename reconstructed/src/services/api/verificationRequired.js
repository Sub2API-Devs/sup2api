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
import { getMockRateLimitState } from "../claudeAiLimits.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession, getSessionId } from "../../bootstrap/state.js";
import { API_ERROR_CONST_1000, API_ERROR_MESSAGE_PREFIX } from "./errors.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { APIError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { logEvent } from "../analytics/index.js";
import { lit } from "../analytics/safeMetadata.js";
import { create, create_2 } from "../../../vendor/zod/lib/index.mjs";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { classifyAxiosError } from "../../utils/errors.js";

//@ chunk-aepeg2w5.js:289234-289261 placement
/**
 * 导出函数 `nullVerificationState`：返回 null。
 */
function nullVerificationState() {
  return null;
}
//@ chunk-aepeg2w5.js:289261-289284 placement
/**
 * 导出函数 `noop`：参数 e。
 */
function noop(e) {
  return;
}
//@ chunk-aepeg2w5.js:289284-289346 placement
/**
 * 导出函数 `hasFastModeRateLimitDuration`：返回 Zt().fastModeRateLimitDurationMs !== null。
 */
function hasFastModeRateLimitDuration() {
  return getMockRateLimitState().fastModeRateLimitDurationMs !== null;
}
//@ chunk-aepeg2w5.js:289346-289400 placement
/**
 * 导出函数 `checkFastModeRateLimit`：参数 e，返回 Zt().checkFastModeRateLimit(e)。
 */
function checkFastModeRateLimit(isFastModeActive) {
  return getMockRateLimitState().checkFastModeRateLimit(isFastModeActive);
}
//@ chunk-aepeg2w5.js:289442-289521 placement
class VerificationPredicateSlot {
  predicate = null;
  set(predicate) {
    let predicate_2 = this.predicate;
    this.predicate = predicate;
    return predicate_2;
  }
}
//@ chunk-aepeg2w5.js:289521-289535 placement
var verificationPredicateSlot = new VerificationPredicateSlot();
//@ chunk-aepeg2w5.js:289535-289567 placement
function setVerificationPredicate(isPolicyGraceEnabled) {
  return verificationPredicateSlot.set(isPolicyGraceEnabled);
}
//@ chunk-aepeg2w5.js:289567-289646 placement
function isVerificationRequired() {
  let predicate = verificationPredicateSlot.predicate;
  if (!predicate) return false;
  try {
    return predicate();
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:289646-289694 placement
var pendingVerificationState = identity_2(
  {
    pending: null,
  },
  (e) => {
    e.pending = null;
  },
);
//@ chunk-aepeg2w5.js:289820-289853 placement
/**
 * 导出函数 `pendingVerification`：返回 ru.pending。
 */
function pendingVerification() {
  return pendingVerificationState.pending;
}
//@ chunk-aepeg2w5.js:289853-289926 placement
var FAST_MODE_CHECK_HTTP_OPTIONS = {
  maxRedirects: 0,
  adapter: "http",
  validateStatus: (e) => e >= 200 && e < 300,
};
//@ chunk-aepeg2w5.js:289926-290069 placement
var USER_FACING_ERROR_SCHEMA = DoctorLazy(() =>
  u({
    error: u({
      message: string(),
      details: u({
        error_visibility: literal("user_facing"),
      }),
    }),
  }),
);
var ERROR_CODE_SCHEMA = DoctorLazy(() =>
  u({
    error: u({
      details: u({
        error_code: string(),
      }),
    }),
  }),
);
//@ chunk-aepeg2w5.js:290069-290189 placement
/**
 * 从 403 响应中取验证错误消息。
 */
function verificationErrorMessage(error) {
  if (!isAxiosError(error)) return null;
  let n = USER_FACING_ERROR_SCHEMA().safeParse(error.response?.data);
  return n.success ? n.data.error.message : null;
}
//@ chunk-aepeg2w5.js:290189-290320 placement
/**
 * 从 axios 错误的响应体中解析 error_code，失败返回 null。
 */
function readErrorCodeFromAxios(e) {
  if (!isAxiosError(e)) return null;
  let n = ERROR_CODE_SCHEMA().safeParse(e.response?.data);
  return n.success ? n.data.error.details.error_code : null;
}
//@ chunk-aepeg2w5.js:290320-290533 placement
class ClaimOnceStore {
  #n = new Set();
  #e = new Map();
  lastBellAt = 0;
  claim(e) {
    if (this.#n.has(e)) return false;
    this.#n.add(e);
    return true;
  }
  has(e) {
    return this.#n.has(e);
  }
  claimIfChanged(e, n) {
    if (this.#e.get(e) === n) return false;
    this.#e.set(e, n);
    return true;
  }
}
//@ chunk-aepeg2w5.js:290533-290558 placement
/**
 * 一次性声明存储（按 host）。
 */
var claimOnceStore = new HostScoped(() => new ClaimOnceStore());
//@ chunk-aepeg2w5.js:290558-290595 placement
/**
 * 获取一次性声明存储。
 */
function claimOnce() {
  return claimOnceStore.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:290595-290722 placement
var VERIFICATION_REQUIRED_SCHEMA = DoctorLazy(() =>
  u({
    error: u({
      type: literal("permission_error"),
      message: string().min(1),
      details: u({
        error_code: literal("verification_required"),
      }),
    }),
  }),
);
//@ chunk-aepeg2w5.js:290722-290836 placement
/**
 * 解析 403 响应中的"需要验证"错误，返回清洗后的消息。
 */
function parseVerificationRequired(status, error) {
  if (status !== 403) return;
  let r = VERIFICATION_REQUIRED_SCHEMA().safeParse(error);
  if (!r.success) return;
  return sanitizeVerificationMessage(r.data.error.message);
}
//@ chunk-aepeg2w5.js:290836-290864 placement
var MAX_VERIFICATION_TEXT_CHARS = API_ERROR_CONST_1000 - `${API_ERROR_MESSAGE_PREFIX}: `.length;
//@ chunk-aepeg2w5.js:290864-291186 placement
/**
 * 清理验证提示文本并保留链接。
 */
function sanitizeVerificationMessage(e) {
  let trimmed = e.replace(/[\p{Cc}\p{Cf}\u0020\u2028\u2029]+/gu, " ").trim();
  if (trimmed === "") return;
  if (trimmed.length <= MAX_VERIFICATION_TEXT_CHARS) return trimmed;
  let index = trimmed.lastIndexOf("https://");
  if (index !== -1) {
    let index_2 = trimmed.indexOf(" ", index);
    let sliced = trimmed.slice(index, index_2 === -1 ? undefined : index_2);
    let y = MAX_VERIFICATION_TEXT_CHARS - sliced.length - 2;
    if (y >= 0) return `${truncateToLength(trimmed.slice(0, index), y).trimEnd()}\u2026 ${sliced}`;
  }
  return `${truncateToLength(trimmed, MAX_VERIFICATION_TEXT_CHARS - 1)}\u2026`;
}
//@ chunk-aepeg2w5.js:291186-291257 placement
/**
 * 是否为 verification_required 的 403。
 */
function isVerificationRequiredError(error) {
  return error instanceof APIError && parseVerificationRequired(error.status, error.error) !== undefined;
}
//@ chunk-aepeg2w5.js:291257-291463 placement
/**
 * 每会话一次记录"需要验证"提示已显示，消息含链接时另记一条。
 */
function logVerificationShown(e) {
  if (!claimOnce().claim(`tengu_ranch_rc_shown:${getSessionId()}`)) return;
  logEvent("tengu_ranch_rc_shown", {
    surface: lit("claude_code"),
  });
  if (e.includes("https://"))
    logEvent("tengu_ranch_rc_link_shown", {
      surface: lit("claude_code"),
    });
}
//@ chunk-aepeg2w5.js:291463-291553 placement
class VerificationRequiredError extends Error {
  constructor(message, n) {
    super(message, n);
    this.name = "VerificationRequiredError";
  }
}
//@ chunk-aepeg2w5.js:291553-291793 placement
/**
 * 只接受 Anthropic 官方主机的 https 验证链接。
 */
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
    : undefined;
}
//@ chunk-aepeg2w5.js:291793-291919 placement
var OAUTH_PROFILE_SCHEMA = DoctorLazy(() =>
  create({
    account: create({
      uuid: create_2(),
      email: create_2(),
    }).passthrough(),
    organization: create({
      uuid: create_2(),
    }).passthrough(),
  }).passthrough(),
);
//@ chunk-aepeg2w5.js:291919-292165 placement
function parseOauthProfileResponse(e) {
  let n = OAUTH_PROFILE_SCHEMA().safeParse(e);
  if (!n.success) {
    logFeatureBad("oauth_profile_fetch", "malformed_response_body");
    logForDebugging(`OAuth profile: response body failed shape validation \u2014 ${n.error.message}`, {
      level: "error",
    });
    return;
  }
  logFeatureOk("oauth_profile_fetch");
  return e;
}
//@ chunk-aepeg2w5.js:292165-292324 placement
function classifyProfileFetchError(error) {
  let { kind, status } = classifyAxiosError(error);
  if (kind === "auth") return "no_auth";
  if (status === 429) return "rate_limited";
  if (kind === "timeout") return "timeout";
  return "network_error";
}
//@ chunk-aepeg2w5.js:292324-292428 placement
function profileFetchErrorCode(error) {
  let { kind, status } = classifyAxiosError(error);
  return kind === "other" || status === undefined ? "unexpected_error" : `http_${status}`;
}
export {
  claimOnce,
  sanitizeVerificationMessage,
  verificationErrorMessage,
  readErrorCodeFromAxios,
  nullVerificationState,
  isVerificationRequiredError,
  noop,
  parseVerificationRequired,
  logVerificationShown,
  safeVerificationUrl,
  pendingVerificationState,
  FAST_MODE_CHECK_HTTP_OPTIONS,
  parseOauthProfileResponse,
  classifyProfileFetchError,
  profileFetchErrorCode,
  VerificationRequiredError,
  isVerificationRequired,
  setVerificationPredicate,
  claimOnceStore,
  pendingVerification,
  hasFastModeRateLimitDuration,
  checkFastModeRateLimit,
};
