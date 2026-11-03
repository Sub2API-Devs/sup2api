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
import { getProviderState, OVERTURNED_DENY_TTL_MS } from "./providerCaches.js";
import { isModelAllowed, normalizeForDenyMatch, denyEntryMatchesModel } from "./modelAllowlist.js";
import { LEGACY_MODEL_IDS, isModelKeyAliasOrResolved } from "./modelIds.js";
import { env } from "../env.js";
import { isOfferableModel } from "./modelOptions.js";
import { getCuratedModelPicker, parseUserSpecifiedModel } from "./modelDisplay.js";
import { getAPIProvider, isFirstPartyAnthropicBaseUrl, isFirstPartyProvider } from "./providers.js";
import { ALLOWED_OAUTH_BASE_URLS } from "../../constants/oauth.js";
import { sideQueryWithCounter } from "../sideQuery.js";
import { withDeadline } from "../sleep.js";
import { artifactPathPrefix } from "../../services/artifacts/artifactMount.js";
import { isServedExpandedSpelling } from "./model.js";
import { logForDebugging } from "../debug.js";
import { getModelAccessCache, effectiveAuthTokenEnv, isApiKeyHelperTheActiveCredential } from "../auth.js";
import { getErrnoCode, errorMessage } from "../errors.js";
import { logError } from "../log.js";
import { fetchBootstrapData } from "../../services/api/bootstrap.js";
import { saveGlobalConfig } from "../config.js";
import {
  NotFoundError,
  APIError,
  AuthenticationError,
  APIConnectionError,
} from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { suggestThirdPartyModel, alwaysFalseB } from "../../services/api/errors.js";
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

//@ chunk-ewfzwa2f.js:839-907 sole-consumer
/**
 * fetch_error、unknown、org_level_disabled_until（不据此判定需要额度）。
 */
var NON_DEFINITIVE_EXTRA_USAGE_REASONS = new Set(["fetch_error", "unknown", "org_level_disabled_until"]);
//@ chunk-ewfzwa2f.js:907-962 sole-consumer
/**
 * 本进程已探测通过的模型集合。
 */
function getValidatedModels() {
  return getProviderState().providerCache.validatedModels;
}
//@ chunk-ewfzwa2f.js:962-2167 fingerprint = validateModel (0.639)
/**
 * 校验模型：空名、白名单拒绝；非强制探测时别名、ANTHROPIC_CUSTOM_MODEL_OPTION、modelPicker 选项、已验证缓存直接通过；含控制字符的名字在非第一方直连时判不存在；否则发 max_tokens=1 探测请求（querySource=model_validation），成功记入缓存，失败交错误分类。
 */
async function validateModel(model, options) {
  let normalizedModel = model.trim();
  if (!normalizedModel)
    return {
      valid: false,
      error: "Model name cannot be empty",
    };
  if (
    !isModelAllowed(
      normalizedModel,
      options.skipEntitlementDenyOverlay
        ? {
            skipEntitlementDenyOverlay: true,
          }
        : undefined,
    )
  )
    return {
      valid: false,
      error: `Model '${displayModelName(normalizedModel)}' is not in the list of available models`,
      notAllowed: true,
    };
  if (!options.forceServerProbe) {
    let lowerModel = normalizedModel.toLowerCase();
    if (LEGACY_MODEL_IDS.includes(lowerModel))
      return {
        valid: true,
      };
    if (normalizedModel === env.ANTHROPIC_CUSTOM_MODEL_OPTION)
      return {
        valid: true,
      };
    if (
      isOfferableModel(normalizedModel) &&
      getCuratedModelPicker()?.picker.options.some((option) => option.model.trim() === normalizedModel)
    )
      return {
        valid: true,
      };
    if (getValidatedModels().has(normalizedModel))
      return {
        valid: true,
      };
  }
  let apiProvider = getAPIProvider();
  let ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL;
  let hostname =
    ANTHROPIC_BASE_URL && URL.canParse(ANTHROPIC_BASE_URL) ? new URL(ANTHROPIC_BASE_URL).hostname : undefined;
  let m =
    isFirstPartyAnthropicBaseUrl() ||
    (hostname !== undefined &&
      (hostname === "anthropic.com" ||
        hostname.endsWith(".anthropic.com") ||
        ALLOWED_OAUTH_BASE_URLS.some((u) => new URL(u).hostname === hostname)));
  if (
    !(apiProvider === "gateway" || (apiProvider === "firstParty" && !m)) &&
    /[\s\p{Cc}\p{Cf}]/u.test(normalizedModel)
  )
    return {
      valid: false,
      error: `Model '${displayModelName(normalizedModel)}' not found`,
      notFound: true,
    };
  if (options.serverProbe === false)
    return {
      valid: true,
    };
  try {
    await sideQueryWithCounter({
      model: normalizedModel,
      max_tokens: 1,
      maxRetries: 0,
      querySource: "model_validation",
      resendWithoutRefusedContext1m: true,
      credentials: options.credentials,
      timeout: options.timeout,
      signal: options.signal,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Hi",
              cache_control: {
                type: "ephemeral",
              },
            },
          ],
        },
      ],
    });
    getValidatedModels().add(normalizedModel);
    return {
      valid: true,
    };
  } catch (error) {
    return handleValidationError(error, normalizedModel);
  }
}
//@ chunk-ewfzwa2f.js:2167-2179 layout
/**
 * 15000。
 */
var MODEL_PROBE_TIMEOUT_MS = 15000;
//@ chunk-ewfzwa2f.js:2179-2660 layout
/**
 * 带截止时间的探测；超时中止并返回 probe=undefined；账号在探测期间变化时清掉缓存并标记 accountChanged。
 */
async function probeModelWithDeadline(model, n) {
  let providerState = getProviderState();
  let generation = providerState.sessionModelDenyReprobe.generation;
  let abortController = new AbortController();
  let o = await withDeadline(
    validateModel(model, {
      forceServerProbe: n.forceServerProbe,
      skipEntitlementDenyOverlay: n.skipEntitlementDenyOverlay,
      credentials: n.credentials,
      timeout: n.deadlineMs,
      signal: abortController.signal,
    }),
    n.deadlineMs,
  );
  if (o === undefined) {
    abortController.abort();
    return {
      probe: undefined,
      accountChanged: false,
    };
  }
  let m = providerState.sessionModelDenyReprobe.generation !== generation;
  if (m) providerState.providerCache.validatedModels.delete(model.trim());
  return {
    probe: o,
    accountChanged: m,
  };
}
//@ chunk-ewfzwa2f.js:2660-2996 layout
/**
 * 有截止时间时走带超时探测，超时或账号变化返回可重试错误 "Couldn't confirm model …"。
 */
async function validateModelWithDeadline(model, options, deadlineMs) {
  if (deadlineMs === undefined || options.serverProbe === false) return validateModel(model, options);
  let { probe, accountChanged } = await probeModelWithDeadline(model, {
    ...options,
    deadlineMs,
  });
  if (probe === undefined || accountChanged) {
    let o = artifactPathPrefix("model");
    return {
      valid: false,
      error: `Couldn't confirm model "${displayModelName(model)}" with the API. ${o ? `Try again, or run ${o} to see available models.` : "Try again."}`,
      retryable: true,
    };
  }
  return probe;
}
//@ chunk-ewfzwa2f.js:2996-3055 layout
/**
 * 是否别名（可带 [1m]）。
 */
function isAliasSpelling(e) {
  let trimmed = e.toLowerCase().trim();
  return isModelKeyAliasOrResolved(trimmed);
}
//@ chunk-ewfzwa2f.js:3055-3101 layout
/**
 * 别名或已知简写时解析成具体模型，否则原样。
 */
function resolveAliasForProbe(e) {
  return isAliasSpelling(e) || isServedExpandedSpelling(e) ? parseUserSpecifiedModel(e) : e;
}
//@ chunk-ewfzwa2f.js:3101-4240 layout
/**
 * 复核“账号无权使用该模型”的缓存结论：策略拒绝、10 分钟内已确认拒绝直接返回；否则强制探测，成功则撤销拒绝并清理模型访问缓存（overturned），失败记录 denied_by_server。
 */
async function reprobeEntitlementDeny(e, storageV5, credentials) {
  try {
    if (
      !isModelAllowed(e, {
        skipEntitlementDenyOverlay: true,
      })
    )
      return "denied_by_policy";
    let aliasForProbe = resolveAliasForProbe(e);
    if (isAliasSpelling(aliasForProbe)) return "denied_by_policy";
    let providerState = getProviderState();
    let { confirmedEntitlementDenies, overturnedEntitlementDenies } = providerState.providerCache;
    let p = normalizeForDenyMatch(aliasForProbe);
    let u = confirmedEntitlementDenies.get(p);
    if (u !== undefined && Date.now() - u < OVERTURNED_DENY_TTL_MS) return "denied_by_server";
    let { probe, accountChanged } = await probeModelWithDeadline(aliasForProbe, {
      credentials,
      deadlineMs: MODEL_PROBE_TIMEOUT_MS,
      forceServerProbe: true,
      skipEntitlementDenyOverlay: true,
    });
    if (probe === undefined) {
      logForDebugging("[model-access] stale-deny re-probe timed out", {
        level: "warn",
      });
      return "probe_failed";
    }
    if (!probe.valid && !probe.notFound && !probe.permissionDenied) return "probe_failed";
    if (accountChanged) {
      logForDebugging(
        "[model-access] stale-deny re-probe answered after the account changed; recording nothing",
      );
      return probe.valid ? "overturned" : "denied_by_server";
    }
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
      await evictModelAccessCacheEntry(e, storageV5);
    } catch (error) {
      if (getErrnoCode(error) !== undefined)
        logForDebugging(`[model-access] stale-deny eviction failed: ${errorMessage(error)}`, {
          level: "warn",
        });
      else logError(error);
    }
    fetchBootstrapData(storageV5, credentials);
    return "overturned";
  } catch (error) {
    logError(error);
    return "probe_failed";
  }
}
//@ chunk-ewfzwa2f.js:4240-4524 layout
/**
 * 从全局配置 modelAccessCache 删掉该模型的条目。
 */
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
        return true;
      return !denyEntryMatchesModel(o, e);
    });
    return filtered.length === modelAccessCache.length
      ? r
      : {
          ...r,
          modelAccessCache: filtered,
        };
  }, n);
}
//@ chunk-ewfzwa2f.js:4524-6216 fingerprint = handleValidationError (0.657)
/**
 * 探测错误转校验结果：模型不存在（附建议）、认证失败、网络错误、无权限、需要额度、可重试状态码等。
 */
function handleValidationError(error, modelName) {
  if (error instanceof NotFoundError) {
    let fallback = suggestThirdPartyModel(modelName);
    let suggestion = fallback ? `. Try '${displayModelName(fallback)}' instead` : "";
    return {
      valid: false,
      error: `Model '${displayModelName(modelName)}' not found${suggestion}`,
      notFound: true,
      ...(isModelNotFoundError(error) && {
        serverRefusedModel: true,
      }),
    };
  }
  if (error instanceof APIError) {
    if (error instanceof AuthenticationError)
      return {
        valid: false,
        error: "Authentication failed. Please check your API credentials.",
        authFailed: true,
      };
    if (error instanceof APIConnectionError)
      return {
        valid: false,
        error: "Network error. Please check your internet connection.",
        retryable: true,
      };
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
        valid: false,
        error: `Model '${displayModelName(modelName)}' not found`,
        notFound: true,
        serverRefusedModel: true,
      };
    if (isModelPermissionDeniedError(error))
      return {
        valid: false,
        error: `Model '${displayModelName(modelName)}' isn't available for your account`,
        permissionDenied: true,
        serverRefusedModel: true,
      };
    let details = errorBody?.error?.details;
    let s = error.status === 429 && details?.error_code === "credits_required";
    let o = error.headers?.get?.(REPRESENTATIVE_CLAIM_HEADER);
    let m =
      s &&
      !o &&
      !NON_DEFINITIVE_EXTRA_USAGE_REASONS.has(
        error.headers?.get?.(OVERAGE_DISABLED_REASON_HEADER) ?? details?.disabled_reason ?? "",
      );
    let replaced = sanitizeShortText(sanitizeTelemetryString(formatAPIError(error))).replace(
      /[.!?\u2026]+$/,
      "",
    );
    if (
      isOAuthTokenRevokedError(error) ||
      (error.status === 403 &&
        isAwsCredentialError(error.headers?.get?.("x-amzn-errortype") ?? undefined, error.message))
    )
      return {
        valid: false,
        error: `API error: ${replaced} \xB7 model not changed`,
        authFailed: true,
      };
    let u =
      isRetryableStatus(error.status) ||
      (error.status === 407 && Boolean(getConfiguredProxyAuthHelper())) ||
      (error.status === 403 &&
        (env.CLAUDE_CODE_REMOTE ||
          (isFirstPartyProvider() && !effectiveAuthTokenEnv() && isApiKeyHelperTheActiveCredential())));
    return {
      valid: false,
      error: `API error: ${replaced} \xB7 model not changed`,
      ...(u
        ? {
            retryable: true,
          }
        : {
            rejected: true,
          }),
      ...(error.status === 429 && {
        rateLimited: true,
      }),
      ...(s && {
        creditsRequired: true,
      }),
      ...(error.status === 400 &&
        alwaysFalseB(error) && {
          sessionModeRefused: true,
        }),
      ...(error.status === 429 &&
        !s &&
        (o === "five_hour" || o === "seven_day") && {
          sharedLimitReached: true,
        }),
      ...(m && {
        serverRefusedModel: true,
      }),
    };
  }
  return {
    valid: false,
    error: `Unable to validate model: ${sanitizeShortText(sanitizeTelemetryString(errorMessage(error)))}`,
    retryable: true,
  };
}
//@ chunk-ewfzwa2f.js:6216-6283 affinity
/**
 * 无状态码、408、409、429 或 5xx。
 */
function isRetryableStatus(status) {
  return status === undefined || status === 408 || status === 409 || status === 429 || status >= 500;
}
//@ chunk-aepeg2w5.js:407872-407902 placement
/**
 * 模型名允许的字符集。
 */
var MODEL_NAME_ALLOWED_CHARS = "A-Za-z0-9._:/@[\\]-";
//@ chunk-aepeg2w5.js:407902-407945 placement
/**
 * 模型名最大长度与非法字符正则。
 */
var MAX_MODEL_NAME_CHARS = 128;
var regExp_28 = new RegExp(`[^${MODEL_NAME_ALLOWED_CHARS}]`, "g");
//@ chunk-aepeg2w5.js:407945-408081 placement
/**
 * 模型名的显示形式（去不可见字符、截断）。
 */
function displayModelName(e) {
  let replaced = e.replace(regExp_28, "");
  if (replaced.length === 0) return "(unrecognized model name)";
  return replaced.length > MAX_MODEL_NAME_CHARS
    ? `${replaced.slice(0, MAX_MODEL_NAME_CHARS)}\u2026`
    : replaced;
}
//@ chunk-aepeg2w5.js:408081-408194 placement = ASK_USER_QUESTION_TOOL_PROMPT (0.444)
/**
 * 组织设置限制模型时的提示文案（实际与 AskUserQuestion 无关）。
 */
function formatModelRestrictedNotice(e, n) {
  return `Model "${displayModelName(e)}" is restricted by your organization's settings. Using ${displayModelName(n)} instead.`;
}
export {
  reprobeEntitlementDeny,
  displayModelName,
  formatModelRestrictedNotice,
  MAX_MODEL_NAME_CHARS,
  isAliasSpelling,
  validateModelWithDeadline,
  resolveAliasForProbe,
  validateModel,
  MODEL_NAME_ALLOWED_CHARS,
};
