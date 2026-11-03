/**
 * utils/model/validateModel.ts
 *
 * /model 与 --model 的模型校验：白名单检查、已知别名直通、服务器探测（max_tokens=1 的 "Hi" 请求）、错误分类成用户提示、权利拒绝的复核缓存。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/validateModel.ts
 * pieces: chunk-aepeg2w5.js (4), chunk-ewfzwa2f.js (12)
 * attribution: placement 4, sole-consumer 2, fingerprint 2, layout 7, affinity 1
 */
import { getProviderState, FXt } from "./providerCaches.js";
import { isModelAllowed, normalizeForDenyMatch, denyEntryMatchesModel } from "./modelAllowlist.js";
import { E8, pve } from "./modelIds.js";
import { env } from "../env.js";
import { isOfferableModel } from "./modelOptions.js";
import { getCuratedModelPicker, parseUserSpecifiedModel } from "./modelDisplay.js";
import { getAPIProvider, isFirstPartyAnthropicBaseUrl, isFirstPartyProvider } from "./providers.js";
import { ALLOWED_OAUTH_BASE_URLS } from "../../constants/oauth.js";
import { aN } from "../sideQuery.js";
import { withDeadline } from "../sleep.js";
import { artifactPathPrefix } from "../../services/artifacts/artifactMount.js";
import { isServedExpandedSpelling } from "./model.js";
import { logForDebugging } from "../debug.js";
import { getModelAccessCache, effectiveAuthTokenEnv, isApiKeyHelperTheActiveCredential } from "../auth.js";
import { getErrnoCode, errorMessage } from "../errors.js";
import { logError } from "../log.js";
import { fetchBootstrapData } from "../../services/api/bootstrap.js";
import { saveGlobalConfig } from "../config.js";
import { V9e, Ot, K9e, ef } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { suggestThirdPartyModel, U9t } from "../../services/api/errors.js";
import {
  isModelNotFoundError,
  isModelPermissionDeniedError,
  isOAuthTokenRevokedError,
} from "../../services/api/withRetry.js";
import {
  REPRESENTATIVE_CLAIM_HEADER,
  OVERAGE_DISABLED_REASON_HEADER,
} from "../../services/lowPriority/headers.js";
import { sanitizeShortText } from "../resultError.js";
import { sanitizeTelemetryString } from "../sanitization.js";
import { formatAPIError } from "../../services/api/errorUtils.js";
import { isAwsCredentialError } from "../aws.js";
import { getConfiguredProxyAuthHelper } from "../proxy.js";

/**
 * fetch_error、unknown、org_level_disabled_until（不据此判定需要额度）。
 */
//@ chunk-ewfzwa2f.js:839-907 sole-consumer
var NON_DEFINITIVE_EXTRA_USAGE_REASONS = new Set(["fetch_error", "unknown", "org_level_disabled_until"]);
/**
 * 本进程已探测通过的模型集合。
 */
//@ chunk-ewfzwa2f.js:907-962 sole-consumer
function getValidatedModels() {
  return getProviderState().providerCache.validatedModels;
}
/**
 * 校验模型：空名、白名单拒绝；非强制探测时别名、ANTHROPIC_CUSTOM_MODEL_OPTION、modelPicker 选项、已验证缓存直接通过；含控制字符的名字在非第一方直连时判不存在；否则发 max_tokens=1 探测请求（querySource=model_validation），成功记入缓存，失败交错误分类。
 */
//@ chunk-ewfzwa2f.js:962-2167 fingerprint = validateModel (0.639)
async function validateModel(model, options) {
  let normalizedModel = model.trim();
  if (!normalizedModel) return { valid: !1, error: "Model name cannot be empty" };
  if (
    !isModelAllowed(
      normalizedModel,
      options.skipEntitlementDenyOverlay ? { skipEntitlementDenyOverlay: !0 } : void 0,
    )
  )
    return {
      valid: !1,
      error: `Model '${displayModelName(normalizedModel)}' is not in the list of available models`,
      notAllowed: !0,
    };
  if (!options.forceServerProbe) {
    let lowerModel = normalizedModel.toLowerCase();
    if (E8.includes(lowerModel)) return { valid: !0 };
    if (normalizedModel === env.ANTHROPIC_CUSTOM_MODEL_OPTION) return { valid: !0 };
    if (
      isOfferableModel(normalizedModel) &&
      getCuratedModelPicker()?.picker.options.some((c) => c.model.trim() === normalizedModel)
    )
      return { valid: !0 };
    if (getValidatedModels().has(normalizedModel)) return { valid: !0 };
  }
  let a = getAPIProvider(),
    ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL,
    o =
      ANTHROPIC_BASE_URL && URL.canParse(ANTHROPIC_BASE_URL) ? new URL(ANTHROPIC_BASE_URL).hostname : void 0,
    m =
      isFirstPartyAnthropicBaseUrl() ||
      (o !== void 0 &&
        (o === "anthropic.com" ||
          o.endsWith(".anthropic.com") ||
          ALLOWED_OAUTH_BASE_URLS.some((u) => new URL(u).hostname === o)));
  if (!(a === "gateway" || (a === "firstParty" && !m)) && /[\s\p{Cc}\p{Cf}]/u.test(normalizedModel))
    return { valid: !1, error: `Model '${displayModelName(normalizedModel)}' not found`, notFound: !0 };
  if (options.serverProbe === !1) return { valid: !0 };
  try {
    return (
      await aN({
        model: normalizedModel,
        max_tokens: 1,
        maxRetries: 0,
        querySource: "model_validation",
        resendWithoutRefusedContext1m: !0,
        credentials: options.credentials,
        timeout: options.timeout,
        signal: options.signal,
        messages: [
          { role: "user", content: [{ type: "text", text: "Hi", cache_control: { type: "ephemeral" } }] },
        ],
      }),
      getValidatedModels().add(normalizedModel),
      { valid: !0 }
    );
  } catch (error) {
    return handleValidationError(error, normalizedModel);
  }
}
/**
 * 15000。
 */
//@ chunk-ewfzwa2f.js:2167-2179 layout
var MODEL_PROBE_TIMEOUT_MS = 15000;
/**
 * 带截止时间的探测；超时中止并返回 probe=undefined；账号在探测期间变化时清掉缓存并标记 accountChanged。
 */
//@ chunk-ewfzwa2f.js:2179-2660 layout
async function probeModelWithDeadline(e, n) {
  let r = getProviderState(),
    generation = r.sessionModelDenyReprobe.generation,
    abortController = new AbortController(),
    o = await withDeadline(
      validateModel(e, {
        forceServerProbe: n.forceServerProbe,
        skipEntitlementDenyOverlay: n.skipEntitlementDenyOverlay,
        credentials: n.credentials,
        timeout: n.deadlineMs,
        signal: abortController.signal,
      }),
      n.deadlineMs,
    );
  if (o === void 0) return (abortController.abort(), { probe: void 0, accountChanged: !1 });
  let m = r.sessionModelDenyReprobe.generation !== generation;
  if (m) r.providerCache.validatedModels.delete(e.trim());
  return { probe: o, accountChanged: m };
}
/**
 * 有截止时间时走带超时探测，超时或账号变化返回可重试错误 "Couldn't confirm model …"。
 */
//@ chunk-ewfzwa2f.js:2660-2996 layout
async function validateModelWithDeadline(e, n, r) {
  if (r === void 0 || n.serverProbe === !1) return validateModel(e, n);
  let { probe: probe, accountChanged: accountChanged } = await probeModelWithDeadline(e, {
    ...n,
    deadlineMs: r,
  });
  if (probe === void 0 || accountChanged) {
    let o = artifactPathPrefix("model");
    return {
      valid: !1,
      error: `Couldn't confirm model "${displayModelName(e)}" with the API. ${o ? `Try again, or run ${o} to see available models.` : "Try again."}`,
      retryable: !0,
    };
  }
  return probe;
}
/**
 * 是否别名（可带 [1m]）。
 */
//@ chunk-ewfzwa2f.js:2996-3055 layout
function isAliasSpelling(e) {
  let trimmed = e.toLowerCase().trim();
  return pve(trimmed);
}
/**
 * 别名或已知简写时解析成具体模型，否则原样。
 */
//@ chunk-ewfzwa2f.js:3055-3101 layout
function resolveAliasForProbe(e) {
  return isAliasSpelling(e) || isServedExpandedSpelling(e) ? parseUserSpecifiedModel(e) : e;
}
/**
 * 复核“账号无权使用该模型”的缓存结论：策略拒绝、10 分钟内已确认拒绝直接返回；否则强制探测，成功则撤销拒绝并清理模型访问缓存（overturned），失败记录 denied_by_server。
 */
//@ chunk-ewfzwa2f.js:3101-4240 layout
async function reprobeEntitlementDeny(e, n, r) {
  try {
    if (!isModelAllowed(e, { skipEntitlementDenyOverlay: !0 })) return "denied_by_policy";
    let a = resolveAliasForProbe(e);
    if (isAliasSpelling(a)) return "denied_by_policy";
    let s = getProviderState(),
      {
        confirmedEntitlementDenies: confirmedEntitlementDenies,
        overturnedEntitlementDenies: overturnedEntitlementDenies,
      } = s.providerCache,
      p = normalizeForDenyMatch(a),
      u = confirmedEntitlementDenies.get(p);
    if (u !== void 0 && Date.now() - u < FXt) return "denied_by_server";
    let { probe: probe, accountChanged: accountChanged } = await probeModelWithDeadline(a, {
      credentials: r,
      deadlineMs: MODEL_PROBE_TIMEOUT_MS,
      forceServerProbe: !0,
      skipEntitlementDenyOverlay: !0,
    });
    if (probe === void 0)
      return (
        logForDebugging("[model-access] stale-deny re-probe timed out", { level: "warn" }),
        "probe_failed"
      );
    if (!probe.valid && !probe.notFound && !probe.permissionDenied) return "probe_failed";
    if (accountChanged)
      return (
        logForDebugging(
          "[model-access] stale-deny re-probe answered after the account changed; recording nothing",
        ),
        probe.valid ? "overturned" : "denied_by_server"
      );
    if (!probe.valid) {
      let now = Date.now();
      confirmedEntitlementDenies.set(p, now);
      for (let v of getModelAccessCache())
        if (denyEntryMatchesModel(v, e))
          confirmedEntitlementDenies.set(normalizeForDenyMatch(v.apiName), now);
      return "denied_by_server";
    }
    confirmedEntitlementDenies.delete(p);
    let now = Date.now();
    for (let f of getModelAccessCache())
      if (denyEntryMatchesModel(f, e)) overturnedEntitlementDenies.set(normalizeForDenyMatch(f.apiName), now);
    try {
      await evictModelAccessCacheEntry(e, n);
    } catch (error) {
      if (getErrnoCode(error) !== void 0)
        logForDebugging(`[model-access] stale-deny eviction failed: ${errorMessage(error)}`, {
          level: "warn",
        });
      else logError(error);
    }
    return (fetchBootstrapData(n, r), "overturned");
  } catch (error) {
    return (logError(error), "probe_failed");
  }
}
/**
 * 从全局配置 modelAccessCache 删掉该模型的条目。
 */
//@ chunk-ewfzwa2f.js:4240-4524 layout
async function evictModelAccessCacheEntry(e, n) {
  await saveGlobalConfig((r) => {
    let modelAccessCache = r.modelAccessCache;
    if (!modelAccessCache?.length) return r;
    let filtered = modelAccessCache.filter((o) => {
      if (
        o == null ||
        typeof o !== "object" ||
        typeof o.apiName !== "string" ||
        typeof o.entitled !== "boolean"
      )
        return !0;
      return !denyEntryMatchesModel(o, e);
    });
    return filtered.length === modelAccessCache.length ? r : { ...r, modelAccessCache: filtered };
  }, n);
}
/**
 * 探测错误转校验结果：模型不存在（附建议）、认证失败、网络错误、无权限、需要额度、可重试状态码等。
 */
//@ chunk-ewfzwa2f.js:4524-6216 fingerprint = handleValidationError (0.657)
function handleValidationError(error, modelName) {
  if (error instanceof V9e) {
    let fallback = suggestThirdPartyModel(modelName),
      a = fallback ? `. Try '${displayModelName(fallback)}' instead` : "";
    return {
      valid: !1,
      error: `Model '${displayModelName(modelName)}' not found${a}`,
      notFound: !0,
      ...(isModelNotFoundError(error) && { serverRefusedModel: !0 }),
    };
  }
  if (error instanceof Ot) {
    if (error instanceof K9e)
      return {
        valid: !1,
        error: "Authentication failed. Please check your API credentials.",
        authFailed: !0,
      };
    if (error instanceof ef)
      return { valid: !1, error: "Network error. Please check your internet connection.", retryable: !0 };
    let errorBody = error.error;
    if (
      errorBody &&
      typeof errorBody === "object" &&
      "type" in errorBody &&
      errorBody.type === "not_found_error" &&
      "message" in errorBody &&
      typeof errorBody.message === "string" &&
      errorBody.message.includes("model:")
    )
      return {
        valid: !1,
        error: `Model '${displayModelName(modelName)}' not found`,
        notFound: !0,
        serverRefusedModel: !0,
      };
    if (isModelPermissionDeniedError(error))
      return {
        valid: !1,
        error: `Model '${displayModelName(modelName)}' isn't available for your account`,
        permissionDenied: !0,
        serverRefusedModel: !0,
      };
    let a = errorBody?.error?.details,
      s = error.status === 429 && a?.error_code === "credits_required",
      o = error.headers?.get?.(REPRESENTATIVE_CLAIM_HEADER),
      m =
        s &&
        !o &&
        !NON_DEFINITIVE_EXTRA_USAGE_REASONS.has(
          error.headers?.get?.(OVERAGE_DISABLED_REASON_HEADER) ?? a?.disabled_reason ?? "",
        ),
      replaced = sanitizeShortText(sanitizeTelemetryString(formatAPIError(error))).replace(
        /[.!?\u2026]+$/,
        "",
      );
    if (
      isOAuthTokenRevokedError(error) ||
      (error.status === 403 &&
        isAwsCredentialError(error.headers?.get?.("x-amzn-errortype") ?? void 0, error.message))
    )
      return { valid: !1, error: `API error: ${replaced} \xB7 model not changed`, authFailed: !0 };
    let u =
      isRetryableStatus(error.status) ||
      (error.status === 407 && Boolean(getConfiguredProxyAuthHelper())) ||
      (error.status === 403 &&
        (env.CLAUDE_CODE_REMOTE ||
          (isFirstPartyProvider() && !effectiveAuthTokenEnv() && isApiKeyHelperTheActiveCredential())));
    return {
      valid: !1,
      error: `API error: ${replaced} \xB7 model not changed`,
      ...(u ? { retryable: !0 } : { rejected: !0 }),
      ...(error.status === 429 && { rateLimited: !0 }),
      ...(s && { creditsRequired: !0 }),
      ...(error.status === 400 && U9t(error) && { sessionModeRefused: !0 }),
      ...(error.status === 429 &&
        !s &&
        (o === "five_hour" || o === "seven_day") && { sharedLimitReached: !0 }),
      ...(m && { serverRefusedModel: !0 }),
    };
  }
  return {
    valid: !1,
    error: `Unable to validate model: ${sanitizeShortText(sanitizeTelemetryString(errorMessage(error)))}`,
    retryable: !0,
  };
}
/**
 * 无状态码、408、409、429 或 5xx。
 */
//@ chunk-ewfzwa2f.js:6216-6283 affinity
function isRetryableStatus(e) {
  return e === void 0 || e === 408 || e === 409 || e === 429 || e >= 500;
}
//@ chunk-aepeg2w5.js:407872-407902 placement
var Yto = "A-Za-z0-9._:/@[\\]-";
//@ chunk-aepeg2w5.js:407902-407945 placement
var Xto = 128,
  regExp_28 = new RegExp(`[^${Yto}]`, "g");
/**
 * 模型名的显示形式（去不可见字符、截断）。
 */
//@ chunk-aepeg2w5.js:407945-408081 placement
function displayModelName(e) {
  let replaced = e.replace(regExp_28, "");
  if (replaced.length === 0) return "(unrecognized model name)";
  return replaced.length > Xto ? `${replaced.slice(0, Xto)}\u2026` : replaced;
}
/**
 * 组织设置限制模型时的提示文案（实际与 AskUserQuestion 无关）。
 */
//@ chunk-aepeg2w5.js:408081-408194 placement = ASK_USER_QUESTION_TOOL_PROMPT (0.444)
function formatModelRestrictedNotice(e, n) {
  return `Model "${displayModelName(e)}" is restricted by your organization's settings. Using ${displayModelName(n)} instead.`;
}

export {
  reprobeEntitlementDeny,
  displayModelName,
  formatModelRestrictedNotice,
  Xto,
  isAliasSpelling,
  validateModelWithDeadline,
  resolveAliasForProbe,
  validateModel,
  Yto,
};
