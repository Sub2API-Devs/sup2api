/**
 * services/api/bootstrap.ts
 *
 * 启动数据拉取：/api/claude_cli/bootstrap（或网关 /v1/models 发现）得到客户端数据、附加模型选项等并写入缓存。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/bootstrap.ts
 * pieces: chunk-aepeg2w5.js (1), chunk-mz6f608r.js (17)
 * attribution: placement 15, fingerprint 1, file-local 1, sole-consumer 1
 */
import { createHash } from "crypto";
import {
  biKeyCache,
  BI_KEY_PREFIX,
  MAX_BI_KEY_CACHE_ENTRIES,
  BI_KEY_UNAVAILABLE,
  USAGE_SNAPSHOT_MAX_AGE_MS,
} from "../../utils/plugins/pluginDirectories.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  create,
  create_20,
  create_12,
  create_15,
  create_2,
  create_3,
  create_6,
} from "../../../vendor/zod/lib/index.mjs";
import {
  findModelConfigById,
  getProviderState,
  pruneOverturnedEntitlementDenies,
} from "../../utils/model/providerCaches.js";
import { stripAnyVersatileSuffix } from "../../utils/model/modelIds.js";
import { getMarketingNameForModel, getMainLoopModel } from "../../utils/model/model.js";
import { getModelPricingString } from "../../utils/modelCost.js";
import {
  isClaudeAISubscriber,
  getClaudeAIOAuthTokenFingerprint,
  getAnthropicApiKeySafe,
  shouldUseWIFAuth,
  getClaudeAIOAuthTokens,
  hasProfileScope,
} from "../../utils/auth.js";
import { isCcsCoworkSurface, getEntrypointKind } from "../../utils/entrypointKinds.js";
import {
  getCcrDerivedSurface,
  setAuthenticatedAccount,
  isDiskless,
  setBearerPlan,
  getAuthenticatedAccountEpoch,
  getLearnedEffortCaps,
  getGatewayAuth,
} from "../../bootstrap/state.js";
import {
  getGlobalConfig,
  setClientDataCacheKeyGetter,
  setClientDataReadGate,
  setClientDataStrictReadGate,
  setClientDataOverride,
  setClientDataStaleMatchGetter,
  clearClientDataSeed,
  saveGlobalConfig,
} from "../../utils/config.js";
import { resolveRuntimeMainLoopModel } from "../../utils/model/planModeModel.js";
import { promptModelOverride } from "../../utils/model/promptBundles.js";
import { logError } from "../../utils/log.js";
import { providerReadsClientData, getAPIProvider } from "../../utils/model/providers.js";
import { applyClientDataModelOverrides } from "../clientDataUrl.js";
import { SUBSCRIPTION_TYPE_BY_ORG_TYPE } from "../oauth/client.js";
import { recordBearerAccountOverride } from "../oauth/bearerAccountOverride.js";
import { env } from "../../utils/env.js";
import { logForDebugging } from "../../utils/debug.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { getClaudeCodeUserAgent } from "../../utils/userAgent.js";
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { getCustomHeaderMap } from "./client.js";
import { hasManagedSettings } from "../../utils/settings/managedRestrictionKeys.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { getWIFTokenCache, getWIFCredentials } from "../oauth/wifCredentials.js";
import { getOauthConfig, OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { apiKeyForHost } from "../analytics/telemetryCredentialGuard.js";
import { withOAuth401Retry, claudeCodeUserAgent } from "../../utils/http.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { envDriftDetected } from "../../entrypoints/warmSpare/claimCredentials.js";
import { clearBetasCaches } from "../../utils/betas.js";
import { invalidateToolDescriptions } from "./toolDescriptionCache.js";
import { isTimestampedValue, withTimestampedEntry } from "../../utils/config/globalConfigValidation.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logEvent } from "../analytics/index.js";
import { isExpectedApiError } from "../../utils/errors.js";
import { refreshGrowthBookAfterBootstrap } from "../analytics/growthbook.js";
import { refreshGatewayToken } from "../gateway/gatewayAuth.js";
import { isNonCustomFableModel } from "../../utils/model/smallFastModel.js";
import { firstPartyNameToCanonical } from "../../utils/model/modelFallback.js";
import { sanitizeTitle, markdownSafeText } from "../../utils/resultError.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:64555-64789 placement
/**
 * 按入口/模型/版本/组织计算 bootstrap 缓存键（带内存缓存）。
 */
function bootstrapCacheKey(bootstrapRequestParams) {
  let json = JSON.stringify([
    bootstrapRequestParams.entrypoint ?? null,
    bootstrapRequestParams.model,
    bootstrapRequestParams.ccVersion,
    bootstrapRequestParams.organizationUuid,
  ]);
  let cacheKey = biKeyCache.get(json);
  if (cacheKey === undefined) {
    let digest = createHash("sha256").update(json).digest("hex");
    cacheKey = BI_KEY_PREFIX + digest.slice(0, 16);
    if (biKeyCache.size >= MAX_BI_KEY_CACHE_ENTRIES) biKeyCache.clear();
    biKeyCache.set(json, cacheKey);
  }
  return cacheKey;
}
//@ chunk-mz6f608r.js:1246-3050 placement
/**
 * /api/claude_cli/bootstrap 响应 schema：client_data、附加模型选项（转换为选项并补营销名/价格/禁用原因）、附加模型价格、模型权限、组织默认模型、oauth 账号信息、自动压缩窗口等。
 */
var BOOTSTRAP_RESPONSE_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-mz6f608r.js:1246", () => {
  BOOTSTRAP_RESPONSE_SCHEMA = DoctorLazy(() =>
    create({
      client_data: create_20(create_12()).nullish(),
      additional_model_options: create_15(
        create({
          model: create_2(),
          name: create_2(),
          description: create_2(),
          disabled_reason: create_2().nullish(),
        }).transform(({ model, name: displayName, description, disabled_reason: disabledReason }) => {
          let isFirstPartyModel = findModelConfigById(stripAnyVersatileSuffix(model));
          let marketingName = isFirstPartyModel ? getMarketingNameForModel(model) : null;
          let finalDescription = description;
          if (isFirstPartyModel && marketingName && disabledReason == null) {
            let labeledDescription = description
              ? description.startsWith(marketingName)
                ? description
                : `${marketingName} \xB7 ${description}`
              : marketingName;
            let pricing = getModelPricingString(model);
            finalDescription =
              pricing && !isClaudeAISubscriber() && !labeledDescription.includes("per Mtok")
                ? `${labeledDescription} \xB7 ${pricing}`
                : labeledDescription;
          }
          return {
            value: model,
            label: disabledReason != null ? `${displayName} (disabled)` : displayName,
            description: disabledReason
              ? finalDescription
                ? `${finalDescription} \xB7 ${disabledReason}`
                : disabledReason
              : finalDescription,
            ...(disabledReason != null && {
              disabled: true,
            }),
          };
        }),
      ).nullish(),
      additional_model_costs: create_20(
        create({
          input_tokens: create_3(),
          output_tokens: create_3(),
          prompt_cache_write_tokens: create_3(),
          prompt_cache_write_1h_tokens: create_3().nullish(),
          prompt_cache_read_tokens: create_3(),
          web_search_requests: create_3().nullish(),
        }).transform((rawCosts) => ({
          inputTokens: rawCosts.input_tokens,
          outputTokens: rawCosts.output_tokens,
          promptCacheWriteTokens: rawCosts.prompt_cache_write_tokens,
          ...(rawCosts.prompt_cache_write_1h_tokens != null && {
            promptCacheWrite1hTokens: rawCosts.prompt_cache_write_1h_tokens,
          }),
          promptCacheReadTokens: rawCosts.prompt_cache_read_tokens,
          webSearchRequests: rawCosts.web_search_requests ?? 0.01,
        })),
      ).nullish(),
      model_access: create_15(
        create({
          api_name: create_2(),
          entitled: create_6(),
          max_effort_level: create_2().nullish(),
        }).transform(({ api_name: apiName, entitled, max_effort_level: maxEffortLevel }) => ({
          apiName,
          entitled,
          ...(maxEffortLevel != null && {
            maxEffortLevel,
          }),
        })),
      ).nullish(),
      org_model_default: create({
        name: create_2(),
        updated_at: create_2(),
        data_source: create_2(),
        override_user_selection: create_6(),
        default_effort_level: create_2().nullish(),
        override_user_effort: create_6().nullish(),
      }).nullish(),
      oauth_account: create({
        account_uuid: create_2().nullish(),
        account_email: create_2().nullish(),
        organization_uuid: create_2().nullish(),
        organization_name: create_2().nullish(),
        organization_type: create_2().nullish(),
        organization_rate_limit_tier: create_2().nullish(),
        user_rate_limit_tier: create_2().nullish(),
        seat_tier: create_2().nullish(),
      })
        .passthrough()
        .nullish(),
      auto_compact_windows: create_20(create_2(), create_12()).nullish(),
      narrowed: create_6().nullish(),
    }),
  );
});
//@ chunk-mz6f608r.js:3050-3706 placement
/**
 * 生成 bootstrap 请求参数：入口类型、模型、CLI 版本等。
 */
function getBootstrapRequestParams(model = getMainLoopModel()) {
  return {
    entrypoint:
      (getProviderState().fetchesClientData && isCcsCoworkSurface() ? getCcrDerivedSurface() : undefined) ??
      getEntrypointKind(),
    model: stripAnyVersatileSuffix(model),
    ccVersion: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    organizationUuid: getGlobalConfig().oauthAccount?.organizationUuid ?? null,
  };
}
//@ chunk-mz6f608r.js:3706-3908 placement
function isActiveBootstrapModel(modelId) {
  let strippedModel = stripAnyVersatileSuffix(modelId);
  let mainLoopModel = getMainLoopModel();
  if (strippedModel === stripAnyVersatileSuffix(mainLoopModel)) return true;
  let model = resolveRuntimeMainLoopModel({
    permissionMode: "plan",
    mainLoopModel,
  }).model;
  if (strippedModel === stripAnyVersatileSuffix(model)) return true;
  return [mainLoopModel, model].some((candidateModel) => {
    let overrideModel = promptModelOverride(candidateModel);
    return overrideModel !== undefined && strippedModel === stripAnyVersatileSuffix(overrideModel);
  });
}
//@ chunk-mz6f608r.js:3908-4006 placement
function installClientDataCacheKey() {
  setClientDataCacheKeyGetter((modelId) => {
    try {
      return bootstrapCacheKey(
        getBootstrapRequestParams(
          modelId !== undefined && isActiveBootstrapModel(modelId) ? undefined : modelId,
        ),
      );
    } catch (error) {
      logError(error);
      return BI_KEY_UNAVAILABLE;
    }
  });
}
//@ chunk-mz6f608r.js:4006-4011 placement
// deferred: uses installClientDataCacheKey of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-mz6f608r.js:4006", () => {
  installClientDataCacheKey();
});
//@ chunk-mz6f608r.js:4011-4037 placement
function readsProviderClientData() {
  return providerReadsClientData();
}
//@ chunk-mz6f608r.js:4037-4378 placement
function registerClientDataGetters() {
  try {
    setClientDataReadGate(() => {
      try {
        return readsProviderClientData();
      } catch (error) {
        logError(error);
        return true;
      }
    });
    setClientDataStrictReadGate(() => {
      try {
        return readsProviderClientData();
      } catch (error) {
        logError(error);
        return false;
      }
    });
    setClientDataOverride((clientData, overrides) => {
      try {
        return applyClientDataModelOverrides(clientData, overrides);
      } catch (error) {
        logError(error);
        return clientData;
      }
    });
    setClientDataStaleMatchGetter(() => {
      try {
        if (!readsProviderClientData()) return null;
        let bootstrapRequestParams = getBootstrapRequestParams();
        return {
          entrypoint: bootstrapRequestParams.entrypoint ?? null,
          model: bootstrapRequestParams.model,
          org: bootstrapRequestParams.organizationUuid,
        };
      } catch (error) {
        logError(error);
        return null;
      }
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-mz6f608r.js:4487-4985 placement
/**
 * 把 bootstrap 返回的 oauth_account 信息合并到本地账号信息（账号 uuid 不一致时不合并）。
 */
function mergeBootstrapAccount(account, remote) {
  if (!account || !remote) return account;
  if (remote.account_uuid != null && remote.account_uuid !== account.accountUuid) return account;
  let mergedFields = {
    organizationType: remote.organization_type ?? null,
    organizationRateLimitTier: remote.organization_rate_limit_tier ?? null,
    userRateLimitTier: remote.user_rate_limit_tier ?? null,
    seatTier: remote.seat_tier ?? null,
  };
  if (remote.account_email != null) mergedFields.emailAddress = remote.account_email;
  if (remote.organization_uuid != null) mergedFields.organizationUuid = remote.organization_uuid;
  if (remote.organization_name != null) mergedFields.organizationName = remote.organization_name;
  return {
    ...account,
    ...mergedFields,
  };
}
//@ chunk-mz6f608r.js:4985-5154 placement
function applyBootstrapAccount(oauthAccount) {
  if (!oauthAccount?.account_uuid) return;
  setAuthenticatedAccount({
    accountUuid: oauthAccount.account_uuid,
    emailAddress: isDiskless() ? undefined : (oauthAccount.account_email ?? undefined),
    organizationUuid: oauthAccount.organization_uuid ?? undefined,
  });
}
//@ chunk-mz6f608r.js:5154-5287 placement
function subscriptionTypeFromBootstrap(response) {
  let oauthAccount = response.oauth_account;
  return response.narrowed !== true && oauthAccount?.account_uuid && oauthAccount.organization_type
    ? SUBSCRIPTION_TYPE_BY_ORG_TYPE.get(oauthAccount.organization_type)
    : undefined;
}
//@ chunk-mz6f608r.js:5287-5545 placement
function recordBearerPlan(response, fingerprint, skipTier) {
  if (!skipTier) recordBearerAccountOverride(fingerprint, subscriptionTypeFromBootstrap(response));
  if (fingerprint !== null && fingerprint !== getClaudeAIOAuthTokenFingerprint()) return;
  let oauthAccount = response.oauth_account;
  let subscriptionType = subscriptionTypeFromBootstrap(response);
  setBearerPlan(
    fingerprint === null
      ? null
      : {
          bearerSha256: fingerprint,
          answeredAtMs: Date.now(),
          named:
            oauthAccount?.organization_uuid && subscriptionType !== undefined
              ? {
                  organizationUuid: oauthAccount.organization_uuid,
                  subscriptionType,
                }
              : null,
        },
  );
}
//@ chunk-mz6f608r.js:5545-8151 fingerprint (2.1.88 match: fetchBootstrapAPI, 0.628)
/**
 * 请求 bootstrap 接口（网关模式需 CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY 才查 /v1/models）。
 */
async function fetchBootstrapAPI(options, credentials) {
  if (getAPIProvider() === "gateway") {
    if (!env.CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY) {
      logForDebugging(
        "[Bootstrap] Skipped gateway /v1/models (CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY not set)",
      );
      return {
        response: {
          additional_model_options: [],
        },
        viaScopelessOAuth: false,
        oauthBearerSha256: null,
        wasEndpointMovedAtSend: false,
      };
    }
    let gatewayModelOptions = await fetchGatewayModelOptions(credentials);
    return (
      gatewayModelOptions && {
        response: gatewayModelOptions,
        viaScopelessOAuth: false,
        oauthBearerSha256: null,
        wasEndpointMovedAtSend: false,
      }
    );
  }
  if (isEssentialTrafficOnly()) {
    logForDebugging("[Bootstrap] Skipped: Nonessential traffic disabled");
    return null;
  }
  if (getAPIProvider() !== "firstParty") {
    logForDebugging("[Bootstrap] Skipped: 3P provider");
    return null;
  }
  let { params, userAgent } = getClaudeCodeUserAgent(options);
  let fetchOnce = async (baseUrl, authHeaders) => {
    logForDebugging("[Bootstrap] Fetching");
    let response = await axios_default.get(`${baseUrl}/api/claude_cli/bootstrap`, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": userAgent,
        ...getCustomHeaderMap(),
        ...authHeaders,
      },
      params,
      timeout: 5000,
      ...(hasManagedSettings() && {
        proxy: false,
        maxRedirects: 0,
        adapter: "http",
      }),
    });
    let parsed = BOOTSTRAP_RESPONSE_SCHEMA().safeParse(response.data);
    if (!parsed.success) {
      logForDebugging(`[Bootstrap] Response failed validation: ${parsed.error.message}`);
      logFeatureSad("api_bootstrap_fetch", "parse_failed");
      return null;
    }
    logForDebugging("[Bootstrap] Fetch ok");
    return parsed.data;
  };
  let apiKey = getAnthropicApiKeySafe();
  if (!apiKey && shouldUseWIFAuth())
    try {
      let [wifTokenCache, wifCredentials] = await Promise.all([getWIFTokenCache(), getWIFCredentials()]);
      if (wifTokenCache !== null) {
        let data = await fetchOnce(
          env.ANTHROPIC_BASE_URL || wifCredentials?.baseURL || getOauthConfig().BASE_API_URL,
          {
            ...wifCredentials?.extraHeaders,
            Authorization: `Bearer ${await wifTokenCache.getToken()}`,
            "anthropic-beta": OAUTH_BETA_HEADER,
          },
        );
        return (
          data && {
            response: data,
            viaScopelessOAuth: false,
            oauthBearerSha256: null,
            wasEndpointMovedAtSend: false,
          }
        );
      }
    } catch (error) {
      logForDebugging(
        `[Bootstrap] WIF fetch failed: ${axios_default.isAxiosError(error) ? (error.response?.status ?? error.code) : error instanceof Error ? error.constructor.name : "unknown"}`,
      );
      logFeatureSad("api_bootstrap_fetch", "wif_unavailable");
      return null;
    }
  let hostApiKey = apiKeyForHost(apiKey);
  if (!getClaudeAIOAuthTokens()?.accessToken && !hostApiKey) {
    logForDebugging("[Bootstrap] Skipped: no usable OAuth, WIF, or API key");
    return null;
  }
  if (env.ANTHROPIC_UNIX_SOCKET) {
    logForDebugging("[Bootstrap] Skipped: unix-socket-proxied session");
    logFeatureSad("api_bootstrap_fetch", "unix_socket_skip");
    return null;
  }
  let viaScopelessOAuth = false;
  let bearerSha256 = null;
  let wasEndpointMovedAtSend = false;
  try {
    let data = await withOAuth401Retry(
      async () => {
        let token = getClaudeAIOAuthTokens()?.accessToken;
        let profileScope = hasProfileScope();
        let authHeaders;
        if (token && (profileScope || !hostApiKey)) {
          viaScopelessOAuth = !profileScope && !hostApiKey;
          bearerSha256 = computeContentHash(token);
          authHeaders = {
            Authorization: `Bearer ${token}`,
            "anthropic-beta": OAUTH_BETA_HEADER,
          };
        } else if (hostApiKey) {
          viaScopelessOAuth = false;
          bearerSha256 = null;
          authHeaders = {
            "x-api-key": hostApiKey,
          };
        } else {
          logForDebugging("[Bootstrap] No auth available on retry, aborting");
          return null;
        }
        wasEndpointMovedAtSend = hasManagedSettings() && envDriftDetected();
        return fetchOnce(getOauthConfig().BASE_API_URL, authHeaders);
      },
      {
        gateToSessionOAuthCredential: isDiskless(),
        credentials,
      },
    );
    return (
      data && {
        response: data,
        viaScopelessOAuth,
        oauthBearerSha256: bearerSha256,
        wasEndpointMovedAtSend,
      }
    );
  } catch (error) {
    let status = axios_default.isAxiosError(error) ? error.response?.status : undefined;
    if (viaScopelessOAuth && status === 403) {
      logForDebugging("[Bootstrap] Skipped: 403 for OAuth token without profile scope");
      logFeatureSad("api_bootstrap_fetch", "no_profile_scope_403");
      return null;
    }
    logForDebugging(
      `[Bootstrap] Fetch failed: ${axios_default.isAxiosError(error) ? (error.response?.status ?? error.code) : "unknown"}`,
    );
    logFeatureBad("api_bootstrap_fetch", "request_failed");
    throw error;
  }
}
//@ chunk-mz6f608r.js:8151-8261 placement
/**
 * 非 unix socket，且有 API key 或可用 OAuth 令牌。
 */
function bootstrapFetchCanConvergeSlot() {
  if (env.ANTHROPIC_UNIX_SOCKET) return false;
  return (
    Boolean(apiKeyForHost(getAnthropicApiKeySafe())) ||
    (Boolean(getClaudeAIOAuthTokens()?.accessToken) && hasProfileScope())
  );
}
//@ chunk-mz6f608r.js:8261-8300 placement
/**
 * 重新拉取 bootstrap 数据。
 */
async function fetchBootstrapData(configWriteSource, credentials) {
  await refreshBootstrapData(configWriteSource, credentials);
}
//@ chunk-mz6f608r.js:8300-11179 placement (2.1.88 match: fetchBootstrapData, 0.296)
/**
 * 拉取并保存 bootstrap 数据（客户端数据、附加模型选项、渲染缓存），失败不抛出。
 */
async function refreshBootstrapData(
  configWriteSource,
  credentials,
  { keepRenderCaches = false, renderedClientData } = {},
) {
  registerClientDataGetters();
  try {
    let isFirstParty = getAPIProvider() === "firstParty";
    if (!isFirstParty) {
      clearBetasCaches();
      invalidateToolDescriptions();
    }
    let bootstrapRequestParams = getBootstrapRequestParams();
    let authenticatedAccountEpoch = getAuthenticatedAccountEpoch();
    let bootstrapAPI = await fetchBootstrapAPI(bootstrapRequestParams, credentials);
    if (!bootstrapAPI) return false;
    let { response, viaScopelessOAuth, oauthBearerSha256, wasEndpointMovedAtSend } = bootstrapAPI;
    if (authenticatedAccountEpoch !== getAuthenticatedAccountEpoch()) {
      logForDebugging("[Bootstrap] Discarding response fetched under a superseded credential");
      logFeatureSad("api_bootstrap_fetch", "superseded_credential");
      return false;
    }
    logFeatureOk(
      "api_bootstrap_fetch",
      hasManagedSettings()
        ? {
            bearer_plan_named: subscriptionTypeFromBootstrap(response) !== undefined,
          }
        : undefined,
    );
    let globalConfig = getGlobalConfig();
    let narrowed = response.narrowed ?? viaScopelessOAuth;
    let keepModelOptions = narrowed && response.additional_model_options == null;
    let keepModelCosts = narrowed && response.additional_model_costs == null;
    let keepModelAccess = narrowed && response.model_access == null;
    let keepOrgModelDefault = narrowed && response.org_model_default == null;
    let keepAutoCompactWindows = narrowed && response.auto_compact_windows == null;
    let clientData = response.client_data ?? null;
    let modelOptions = keepModelOptions
      ? (globalConfig.additionalModelOptionsCache ?? [])
      : (response.additional_model_options ?? []);
    let modelCosts = keepModelCosts
      ? (globalConfig.additionalModelCostsCache ?? {})
      : (response.additional_model_costs ?? {});
    let modelAccess = keepModelAccess ? (globalConfig.modelAccessCache ?? []) : (response.model_access ?? []);
    let autoCompactWindows = keepAutoCompactWindows
      ? (globalConfig.autoCompactWindowsCache ?? null)
      : (response.auto_compact_windows ?? null);
    applyBootstrapAccount(response.oauth_account);
    let config = getAuthenticatedAccountEpoch();
    recordBearerPlan(response, oauthBearerSha256, wasEndpointMovedAtSend);
    let mergedAccount = mergeBootstrapAccount(globalConfig.oauthAccount, response.oauth_account);
    let orgModelDefault = response.org_model_default
      ? {
          ...response.org_model_default,
          ...(mergedAccount?.organizationUuid && {
            orgUuid: mergedAccount.organizationUuid,
          }),
        }
      : keepOrgModelDefault
        ? (globalConfig.orgModelDefaultCache ?? null)
        : null;
    let cacheKey = bootstrapCacheKey({
      ...bootstrapRequestParams,
      organizationUuid: mergedAccount?.organizationUuid ?? bootstrapRequestParams.organizationUuid,
    });
    let slot = globalConfig.clientDataCacheSlots?.[cacheKey];
    let slotValue = isTimestampedValue(slot) ? slot : undefined;
    let slotHit = slotValue !== undefined;
    let accountUnchanged = import_sortedIndex_2(mergedAccount, globalConfig.oauthAccount);
    if (
      config !== authenticatedAccountEpoch ||
      !import_sortedIndex_2(globalConfig.modelAccessCache ?? [], modelAccess)
    )
      getLearnedEffortCaps().clear();
    let slotStale =
      isFirstParty && slotValue !== undefined && Date.now() - slotValue.at > USAGE_SNAPSHOT_MAX_AGE_MS;
    let clientDataChanged =
      isFirstParty && (slotValue === undefined || !import_sortedIndex_2(slotValue.data ?? null, clientData));
    let slotChanged =
      isFirstParty &&
      (renderedClientData !== undefined
        ? !import_sortedIndex_2(renderedClientData, clientData)
        : clientDataChanged);
    logEvent("tengu_client_data_cache_key", {
      slot_hit: slotHit,
      slot_changed: slotChanged,
      legacy_fallback: !slotHit && globalConfig.clientDataCache != null,
      slot_stale: slotStale,
    });
    let firstPartyProvider = isFirstParty;
    let optionsAnsweredBefore = typeof globalConfig.additionalModelOptionsAnsweredAt === "number";
    let modelOptionsUnchanged =
      keepModelOptions ||
      (firstPartyProvider
        ? Array.isArray(globalConfig.additionalModelOptionsCache) &&
          optionsAnsweredBefore &&
          import_sortedIndex_2(globalConfig.additionalModelOptionsCache, modelOptions)
        : !optionsAnsweredBefore &&
          import_sortedIndex_2(globalConfig.additionalModelOptionsCache ?? [], modelOptions));
    if (
      !clientDataChanged &&
      !slotChanged &&
      !slotStale &&
      modelOptionsUnchanged &&
      import_sortedIndex_2(globalConfig.additionalModelCostsCache ?? {}, modelCosts) &&
      import_sortedIndex_2(globalConfig.modelAccessCache ?? [], modelAccess) &&
      import_sortedIndex_2(globalConfig.orgModelDefaultCache ?? null, orgModelDefault) &&
      (!isFirstParty ||
        import_sortedIndex_2(globalConfig.autoCompactWindowsCache ?? null, autoCompactWindows)) &&
      accountUnchanged
    ) {
      logForDebugging("[Bootstrap] Cache unchanged, skipping write");
      clearClientDataSeed(cacheKey);
      if (!keepModelAccess) pruneOverturnedEntitlementDenies();
      return true;
    }
    logForDebugging("[Bootstrap] Cache updated, persisting to disk");
    let accountSuperseded = false;
    await saveGlobalConfig((current) => {
      if (config !== getAuthenticatedAccountEpoch()) {
        accountSuperseded = true;
        return current;
      }
      let mergedAccount = mergeBootstrapAccount(current.oauthAccount, response.oauth_account);
      let cacheKey = bootstrapCacheKey({
        ...bootstrapRequestParams,
        organizationUuid: mergedAccount?.organizationUuid ?? null,
      });
      return {
        ...current,
        clientDataCacheSlots: isFirstParty
          ? withTimestampedEntry(current.clientDataCacheSlots, cacheKey, {
              data: clientData,
              at: Date.now(),
              entrypoint: bootstrapRequestParams.entrypoint ?? null,
              model: bootstrapRequestParams.model,
              org: mergedAccount?.organizationUuid ?? null,
            })
          : current.clientDataCacheSlots,
        ...(keepModelOptions
          ? {}
          : {
              additionalModelOptionsCache: modelOptions,
              additionalModelOptionsAnsweredAt: firstPartyProvider ? Date.now() : undefined,
            }),
        ...(keepModelCosts
          ? {}
          : {
              additionalModelCostsCache: modelCosts,
            }),
        ...(keepModelAccess
          ? {}
          : {
              modelAccessCache: modelAccess,
            }),
        ...(keepOrgModelDefault
          ? {}
          : {
              orgModelDefaultCache: orgModelDefault,
            }),
        autoCompactWindowsCache:
          isFirstParty && !keepAutoCompactWindows
            ? autoCompactWindows
            : (current.autoCompactWindowsCache ?? null),
        oauthAccount: mergedAccount,
      };
    }, configWriteSource);
    clearClientDataSeed(cacheKey);
    if (accountSuperseded) return false;
    if (!keepModelAccess) pruneOverturnedEntitlementDenies();
    if (slotChanged && !keepRenderCaches) {
      clearBetasCaches();
      invalidateToolDescriptions();
    }
    return true;
  } catch (error) {
    if (isExpectedApiError(error))
      logForDebugging(`[Bootstrap] fetchBootstrapData failed: ${error}`, {
        level: "error",
      });
    else logError(error);
    return false;
  } finally {
    refreshGrowthBookAfterBootstrap();
  }
}
//@ chunk-mz6f608r.js:11179-11277 file-local
/**
 * 网关 GET /v1/models 响应的 zod schema（data[].id/display_name/description）。
 */
var gatewayModelsResponseSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-mz6f608r.js:11179", () => {
  gatewayModelsResponseSchema = DoctorLazy(() =>
    create({
      data: create_15(
        create({
          id: create_2(),
          display_name: create_2().nullish(),
          description: create_2().nullish(),
        }),
      ),
    }),
  );
});
//@ chunk-mz6f608r.js:11277-12106 sole-consumer
/**
 * 网关模式下带 JWT 请求 <gateway>/v1/models（limit 1000，5 秒超时），过滤出 claude/anthropic 且允许的模型，返回 {additional_model_options}；失败返回 null。
 */
async function fetchGatewayModelOptions(credentials) {
  await refreshGatewayToken(credentials);
  let gatewayAuth = getGatewayAuth();
  if (!gatewayAuth) return null;
  try {
    let response = await axios_default.get(`${gatewayAuth.url}/v1/models`, {
      headers: {
        Authorization: `Bearer ${gatewayAuth.jwt}`,
        "anthropic-version": "2023-06-01",
        "User-Agent": claudeCodeUserAgent(),
      },
      params: {
        limit: 1000,
      },
      timeout: 5000,
    });
    let parsed = gatewayModelsResponseSchema().safeParse(response.data);
    if (!parsed.success) {
      logForDebugging(`[Bootstrap] Gateway /v1/models failed validation: ${parsed.error.message}`);
      return null;
    }
    let mapped = parsed.data.data
      .filter((modelEntry) => /(claude|anthropic)/i.test(modelEntry.id))
      .filter((modelEntry) => {
        let modelConfigById = findModelConfigById(modelEntry.id);
        return (
          modelConfigById === null ||
          isNonCustomFableModel(firstPartyNameToCanonical(modelConfigById.firstParty))
        );
      })
      .map((modelEntry) => ({
        value: modelEntry.id,
        label: sanitizeTitle(modelEntry.display_name ?? "") || sanitizeTitle(modelEntry.id),
        description: markdownSafeText(modelEntry.description ?? ""),
      }));
    logForDebugging(`[Bootstrap] Gateway /v1/models \u2192 ${mapped.length} custom options`);
    return {
      additional_model_options: mapped,
    };
  } catch (error) {
    logForDebugging(
      `[Bootstrap] Gateway /v1/models fetch failed: ${axios_default.isAxiosError(error) ? (error.response?.status ?? error.code) : "unknown"}`,
    );
    return null;
  }
}
export { registerClientDataGetters, fetchBootstrapData, bootstrapFetchCanConvergeSlot, refreshBootstrapData };
