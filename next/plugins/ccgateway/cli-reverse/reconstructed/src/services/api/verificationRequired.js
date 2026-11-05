/**
 * services/api/verificationRequired.ts
 *
 * 2.1.316 新增：清理验证提示文本并保留链接；只接受 Anthropic 官方主机的 https 验证链接等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (29)
 * attribution: placement 29
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getMockRateLimitState } from "../claudeAiLimits.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, literal } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:298857-298884 placement
/**
 * 导出函数 `nullVerificationState`：返回 null。
 */
function nullVerificationState() {
  return null;
}
//@ chunk-exfmq47h.js:298884-298907 placement
/**
 * 导出函数 `noop`：参数 e。
 */
function noop(error) {
  return;
}
//@ chunk-exfmq47h.js:298907-298969 placement
/**
 * 导出函数 `hasFastModeRateLimitDuration`：返回 Zt().fastModeRateLimitDurationMs !== null。
 */
function hasFastModeRateLimitDuration() {
  return getMockRateLimitState().fastModeRateLimitDurationMs !== null;
}
//@ chunk-exfmq47h.js:298969-299023 placement
/**
 * 导出函数 `checkFastModeRateLimit`：参数 e，返回 Zt().checkFastModeRateLimit(e)。
 */
function checkFastModeRateLimit(isFastModeActive) {
  return getMockRateLimitState().checkFastModeRateLimit(isFastModeActive);
}
//@ chunk-exfmq47h.js:299065-299144 placement
class VerificationPredicateSlot {
  predicate = null;
  set(predicate) {
    let predicate_2 = this.predicate;
    this.predicate = predicate;
    return predicate_2;
  }
}
//@ chunk-exfmq47h.js:299144-299158 placement
var verificationPredicateSlot; // deferred: uses VerificationPredicateSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:299144", () => {
  verificationPredicateSlot = new VerificationPredicateSlot();
});
//@ chunk-exfmq47h.js:299158-299190 placement
function setVerificationPredicate(isPolicyGraceEnabled) {
  return verificationPredicateSlot.set(isPolicyGraceEnabled);
}
//@ chunk-exfmq47h.js:299190-299269 placement
function isVerificationRequired() {
  let predicate = verificationPredicateSlot.predicate;
  if (!predicate) return false;
  try {
    return predicate();
  } catch {
    return false;
  }
}
//@ chunk-exfmq47h.js:299269-299317 placement
var pendingVerificationState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:299269", () => {
  pendingVerificationState = identity_2(
    {
      pending: null,
    },
    (state) => {
      state.pending = null;
    },
  );
});
//@ chunk-exfmq47h.js:299443-299476 placement
/**
 * 导出函数 `pendingVerification`：返回 ru.pending。
 */
function pendingVerification() {
  return pendingVerificationState.pending;
}
//@ chunk-exfmq47h.js:299476-299549 placement
var FAST_MODE_CHECK_HTTP_OPTIONS = {
  maxRedirects: 0,
  adapter: "http",
  validateStatus: (status) => status >= 200 && status < 300,
};
//@ chunk-exfmq47h.js:299549-299692 placement
var USER_FACING_ERROR_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ERROR_CODE_SCHEMA;
deferInit("chunk-exfmq47h.js:299549", () => {
  USER_FACING_ERROR_SCHEMA = DoctorLazy(() =>
    objectSchema({
      error: objectSchema({
        message: stringSchema(),
        details: objectSchema({
          error_visibility: literal("user_facing"),
        }),
      }),
    }),
  );
  ERROR_CODE_SCHEMA = DoctorLazy(() =>
    objectSchema({
      error: objectSchema({
        details: objectSchema({
          error_code: stringSchema(),
        }),
      }),
    }),
  );
});
//@ chunk-exfmq47h.js:299692-299812 placement
/**
 * 从 403 响应中取验证错误消息。
 */
function verificationErrorMessage(error) {
  if (!isAxiosError(error)) return null;
  let parsed = USER_FACING_ERROR_SCHEMA().safeParse(error.response?.data);
  return parsed.success ? parsed.data.error.message : null;
}
//@ chunk-exfmq47h.js:299812-299943 placement
/**
 * 从 axios 错误的响应体中解析 error_code，失败返回 null。
 */
function readErrorCodeFromAxios(error) {
  if (!isAxiosError(error)) return null;
  let parsed = ERROR_CODE_SCHEMA().safeParse(error.response?.data);
  return parsed.success ? parsed.data.error.details.error_code : null;
}
//@ chunk-exfmq47h.js:299943-300156 placement
class ClaimOnceStore {
  #n = new Set();
  #e = new Map();
  lastBellAt = 0;
  claim(key) {
    if (this.#n.has(key)) return false;
    this.#n.add(key);
    return true;
  }
  has(key) {
    return this.#n.has(key);
  }
  claimIfChanged(key, value) {
    if (this.#e.get(key) === value) return false;
    this.#e.set(key, value);
    return true;
  }
}
//@ chunk-exfmq47h.js:300156-300181 placement
/**
 * 一次性声明存储（按 host）。
 */
var claimOnceStore; // deferred: uses ClaimOnceStore of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:300156", () => {
  claimOnceStore = new HostScoped(() => new ClaimOnceStore());
});
//@ chunk-exfmq47h.js:300181-300218 placement
/**
 * 获取一次性声明存储。
 */
function claimOnce() {
  return claimOnceStore.of(getRootSession().host);
}
//@ chunk-exfmq47h.js:300218-300345 placement
var VERIFICATION_REQUIRED_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:300218", () => {
  VERIFICATION_REQUIRED_SCHEMA = DoctorLazy(() =>
    objectSchema({
      error: objectSchema({
        type: literal("permission_error"),
        message: stringSchema().min(1),
        details: objectSchema({
          error_code: literal("verification_required"),
        }),
      }),
    }),
  );
});
//@ chunk-exfmq47h.js:300345-300459 placement
/**
 * 解析 403 响应中的"需要验证"错误，返回清洗后的消息。
 */
function parseVerificationRequired(status, error) {
  if (status !== 403) return;
  let parsed = VERIFICATION_REQUIRED_SCHEMA().safeParse(error);
  if (!parsed.success) return;
  return sanitizeVerificationMessage(parsed.data.error.message);
}
//@ chunk-exfmq47h.js:300459-300487 placement
var MAX_VERIFICATION_TEXT_CHARS = API_ERROR_CONST_1000 - `${API_ERROR_MESSAGE_PREFIX}: `.length;
//@ chunk-exfmq47h.js:300487-300807 placement
/**
 * 清理验证提示文本并保留链接。
 */
function sanitizeVerificationMessage(message) {
  let trimmed = message.replace(/[\p{Cc}\p{Cf}\u0020\u2028\u2029]+/gu, " ").trim();
  if (trimmed === "") return;
  if (trimmed.length <= MAX_VERIFICATION_TEXT_CHARS) return trimmed;
  let index = trimmed.lastIndexOf("https://");
  if (index !== -1) {
    let index_2 = trimmed.indexOf(" ", index);
    let sliced = trimmed.slice(index, index_2 === -1 ? undefined : index_2);
    let budget = MAX_VERIFICATION_TEXT_CHARS - sliced.length - 2;
    if (budget >= 0) return `${truncateToLength(trimmed.slice(0, index), budget).trimEnd()}\u2026 ${sliced}`;
  }
  return `${truncateToLength(trimmed, MAX_VERIFICATION_TEXT_CHARS - 1)}\u2026`;
}
//@ chunk-exfmq47h.js:300807-300878 placement
/**
 * 是否为 verification_required 的 403。
 */
function isVerificationRequiredError(error) {
  return error instanceof APIError && parseVerificationRequired(error.status, error.error) !== undefined;
}
//@ chunk-exfmq47h.js:300878-301084 placement
/**
 * 每会话一次记录"需要验证"提示已显示，消息含链接时另记一条。
 */
function logVerificationShown(info) {
  if (!claimOnce().claim(`tengu_ranch_rc_shown:${getSessionId()}`)) return;
  logEvent("tengu_ranch_rc_shown", {
    surface: lit("claude_code"),
  });
  if (info.includes("https://"))
    logEvent("tengu_ranch_rc_link_shown", {
      surface: lit("claude_code"),
    });
}
//@ chunk-exfmq47h.js:301084-301174 placement
class VerificationRequiredError extends Error {
  constructor(message, status) {
    super(message, status);
    this.name = "VerificationRequiredError";
  }
}
//@ chunk-exfmq47h.js:301174-301414 placement
/**
 * 只接受 Anthropic 官方主机的 https 验证链接。
 */
function safeVerificationUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "" || parsed.port !== "")
    return;
  let hostname = parsed.hostname;
  return hostname === "portal.anthropic.com" || hostname === "claude.ai" || hostname === "platform.claude.com"
    ? parsed.href
    : undefined;
}
//@ chunk-exfmq47h.js:301414-301540 placement
var OAUTH_PROFILE_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:301414", () => {
  OAUTH_PROFILE_SCHEMA = DoctorLazy(() =>
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
});
//@ chunk-exfmq47h.js:301540-301786 placement
function parseOauthProfileResponse(response) {
  let parsed = OAUTH_PROFILE_SCHEMA().safeParse(response);
  if (!parsed.success) {
    logFeatureBad("oauth_profile_fetch", "malformed_response_body");
    logForDebugging(`OAuth profile: response body failed shape validation \u2014 ${parsed.error.message}`, {
      level: "error",
    });
    return;
  }
  logFeatureOk("oauth_profile_fetch");
  return response;
}
//@ chunk-exfmq47h.js:301786-301945 placement
function classifyProfileFetchError(error) {
  let { kind, status } = classifyAxiosError(error);
  if (kind === "auth") return "no_auth";
  if (status === 429) return "rate_limited";
  if (kind === "timeout") return "timeout";
  return "network_error";
}
//@ chunk-exfmq47h.js:301945-302049 placement
function profileFetchErrorCode(error) {
  let { kind, status } = classifyAxiosError(error);
  return kind === "other" || status === undefined ? "unexpected_error" : `http_${status}`;
}
export {
  claimOnce,
  isVerificationRequiredError,
  parseVerificationRequired,
  logVerificationShown,
  claimOnceStore,
  verificationErrorMessage,
  hasFastModeRateLimitDuration,
  checkFastModeRateLimit,
  sanitizeVerificationMessage,
  safeVerificationUrl,
  pendingVerification,
  readErrorCodeFromAxios,
  nullVerificationState,
  setVerificationPredicate,
  noop,
  pendingVerificationState,
  FAST_MODE_CHECK_HTTP_OPTIONS,
  parseOauthProfileResponse,
  classifyProfileFetchError,
  profileFetchErrorCode,
  VerificationRequiredError,
  isVerificationRequired,
};
