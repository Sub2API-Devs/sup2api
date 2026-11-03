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
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
} from "crypto";
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
import { Bn } from "../../utils/model/modelIds.js";
import { getMarketingNameForModel, getMainLoopModel } from "../../utils/model/model.js";
import { getModelPricingString } from "./_new/getModelPricingString.js";
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
import { Zgi } from "../../utils/model/promptBundles.js";
import { logError } from "../../utils/log.js";
import { eoo, RTi, na, BI1, wI } from "../../utils/plugins/pluginDirectories.js";
import { providerReadsClientData, getAPIProvider } from "../../utils/model/providers.js";
import { applyClientDataModelOverrides } from "../clientDataUrl.js";
import { SUBSCRIPTION_TYPE_BY_ORG_TYPE } from "../oauth/client.js";
import { recordBearerAccountOverride } from "../oauth/bearerAccountOverride.js";
import { env } from "../../utils/env.js";
import { logForDebugging } from "../../utils/debug.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { getClaudeCodeUserAgent } from "../../utils/userAgent.js";
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";
import { getCustomHeaderMap } from "./client.js";
import { hasManagedSettings } from "../../utils/settings/managedRestrictionKeys.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { getWIFTokenCache, getWIFCredentials } from "../oauth/wifCredentials.js";
import { getOauthConfig, OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { apiKeyForHost } from "../analytics/telemetryCredentialGuard.js";
import { withOAuth401Retry, claudeCodeUserAgent } from "../../utils/http.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { ORt } from "../../entrypoints/warmSpare/claimCredentials.js";
import { clearBetasCaches } from "../../utils/betas.js";
import { invalidateToolDescriptions } from "./toolDescriptionCache.js";
import { isTimestampedValue, withTimestampedEntry } from "../../utils/config/globalConfigValidation.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logEvent } from "../analytics/index.js";
import { isExpectedApiError } from "../../utils/errors.js";
import { refreshGrowthBookAfterBootstrap } from "../analytics/growthbook.js";
import { refreshGatewayToken } from "../gateway/gatewayAuth.js";
import { isNonCustomFableModel } from "../../utils/model/smallFastModel.js";
import { firstPartyNameToCanonical } from "../../utils/model/modelFallback.js";
import { sanitizeTitle, markdownSafeText } from "../../utils/resultError.js";

/**
 * /api/claude_cli/bootstrap 响应 schema：client_data、附加模型选项（转换为选项并补营销名/价格/禁用原因）、附加模型价格、模型权限、组织默认模型、oauth 账号信息、自动压缩窗口等。
 */
//@ chunk-mz6f608r.js:1246-3050 placement
var BOOTSTRAP_RESPONSE_SCHEMA = DoctorLazy(() =>
  create({
    client_data: create_20(create_12()).nullish(),
    additional_model_options: create_15(
      create({
        model: create_2(),
        name: create_2(),
        description: create_2(),
        disabled_reason: create_2().nullish(),
      }).transform(
        ({ model: model, name: displayName, description: description, disabled_reason: disabled_reason }) => {
          let isFirstPartyModel = findModelConfigById(Bn(model)),
            marketingName = isFirstPartyModel ? getMarketingNameForModel(model) : null,
            finalDescription = description;
          if (isFirstPartyModel && marketingName && disabled_reason == null) {
            let labeledDescription = description
                ? description.startsWith(marketingName)
                  ? description
                  : `${marketingName} \xB7 ${description}`
                : marketingName,
              pricing = getModelPricingString(model);
            finalDescription =
              pricing && !isClaudeAISubscriber() && !labeledDescription.includes("per Mtok")
                ? `${labeledDescription} \xB7 ${pricing}`
                : labeledDescription;
          }
          return {
            value: model,
            label: disabled_reason != null ? `${displayName} (disabled)` : displayName,
            description: disabled_reason
              ? finalDescription
                ? `${finalDescription} \xB7 ${disabled_reason}`
                : disabled_reason
              : finalDescription,
            ...(disabled_reason != null && { disabled: !0 }),
          };
        },
      ),
    ).nullish(),
    additional_model_costs: create_20(
      create({
        input_tokens: create_3(),
        output_tokens: create_3(),
        prompt_cache_write_tokens: create_3(),
        prompt_cache_write_1h_tokens: create_3().nullish(),
        prompt_cache_read_tokens: create_3(),
        web_search_requests: create_3().nullish(),
      }).transform((e) => ({
        inputTokens: e.input_tokens,
        outputTokens: e.output_tokens,
        promptCacheWriteTokens: e.prompt_cache_write_tokens,
        ...(e.prompt_cache_write_1h_tokens != null && {
          promptCacheWrite1hTokens: e.prompt_cache_write_1h_tokens,
        }),
        promptCacheReadTokens: e.prompt_cache_read_tokens,
        webSearchRequests: e.web_search_requests ?? 0.01,
      })),
    ).nullish(),
    model_access: create_15(
      create({
        api_name: create_2(),
        entitled: create_6(),
        max_effort_level: create_2().nullish(),
      }).transform(({ api_name: api_name, entitled: entitled, max_effort_level: max_effort_level }) => ({
        apiName: api_name,
        entitled: entitled,
        ...(max_effort_level != null && { maxEffortLevel: max_effort_level }),
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
/**
 * 生成 bootstrap 请求参数：入口类型、模型、CLI 版本等。
 */
//@ chunk-mz6f608r.js:3050-3706 placement
function getBootstrapRequestParams(model = getMainLoopModel()) {
  return {
    entrypoint:
      (getProviderState().fetchesClientData && isCcsCoworkSurface() ? getCcrDerivedSurface() : void 0) ??
      getEntrypointKind(),
    model: Bn(model),
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
function isActiveBootstrapModel(e) {
  let o = Bn(e),
    n = getMainLoopModel();
  if (o === Bn(n)) return !0;
  let model = resolveRuntimeMainLoopModel({ permissionMode: "plan", mainLoopModel: n }).model;
  if (o === Bn(model)) return !0;
  return [n, model].some((s) => {
    let u = Zgi(s);
    return u !== void 0 && o === Bn(u);
  });
}
//@ chunk-mz6f608r.js:3908-4006 placement
function it() {
  setClientDataCacheKeyGetter((e) => {
    try {
      return bootstrapCacheKey(
        getBootstrapRequestParams(e !== void 0 && isActiveBootstrapModel(e) ? void 0 : e),
      );
    } catch (error) {
      return (logError(error), eoo);
    }
  });
}
//@ chunk-mz6f608r.js:4006-4011 placement
it();
//@ chunk-mz6f608r.js:4011-4037 placement
function z() {
  return providerReadsClientData();
}
//@ chunk-mz6f608r.js:4037-4378 placement
function registerClientDataGetters() {
  try {
    (setClientDataReadGate(() => {
      try {
        return z();
      } catch (error) {
        return (logError(error), !0);
      }
    }),
      setClientDataStrictReadGate(() => {
        try {
          return z();
        } catch (error) {
          return (logError(error), !1);
        }
      }),
      setClientDataOverride((e, o) => {
        try {
          return applyClientDataModelOverrides(e, o);
        } catch (error) {
          return (logError(error), e);
        }
      }),
      setClientDataStaleMatchGetter(() => {
        try {
          if (!z()) return null;
          let e = getBootstrapRequestParams();
          return { entrypoint: e.entrypoint ?? null, model: e.model, org: e.organizationUuid };
        } catch (error) {
          return (logError(error), null);
        }
      }));
  } catch (error) {
    logError(error);
  }
}
/**
 * 把 bootstrap 返回的 oauth_account 信息合并到本地账号信息（账号 uuid 不一致时不合并）。
 */
//@ chunk-mz6f608r.js:4487-4985 placement
function mergeBootstrapAccount(account, remote) {
  if (!account || !remote) return account;
  if (remote.account_uuid != null && remote.account_uuid !== account.accountUuid) return account;
  let n = {
    organizationType: remote.organization_type ?? null,
    organizationRateLimitTier: remote.organization_rate_limit_tier ?? null,
    userRateLimitTier: remote.user_rate_limit_tier ?? null,
    seatTier: remote.seat_tier ?? null,
  };
  if (remote.account_email != null) n.emailAddress = remote.account_email;
  if (remote.organization_uuid != null) n.organizationUuid = remote.organization_uuid;
  if (remote.organization_name != null) n.organizationName = remote.organization_name;
  return { ...account, ...n };
}
//@ chunk-mz6f608r.js:4985-5154 placement
function applyBootstrapAccount(e) {
  if (!e?.account_uuid) return;
  setAuthenticatedAccount({
    accountUuid: e.account_uuid,
    emailAddress: isDiskless() ? void 0 : (e.account_email ?? void 0),
    organizationUuid: e.organization_uuid ?? void 0,
  });
}
//@ chunk-mz6f608r.js:5154-5287 placement
function subscriptionTypeFromBootstrap(e) {
  let oauth_account = e.oauth_account;
  return e.narrowed !== !0 && oauth_account?.account_uuid && oauth_account.organization_type
    ? SUBSCRIPTION_TYPE_BY_ORG_TYPE.get(oauth_account.organization_type)
    : void 0;
}
//@ chunk-mz6f608r.js:5287-5545 placement
function recordBearerPlan(response, fingerprint, skipTier) {
  if (!skipTier) recordBearerAccountOverride(fingerprint, subscriptionTypeFromBootstrap(response));
  if (fingerprint !== null && fingerprint !== getClaudeAIOAuthTokenFingerprint()) return;
  let oauth_account = response.oauth_account,
    s = subscriptionTypeFromBootstrap(response);
  setBearerPlan(
    fingerprint === null
      ? null
      : {
          bearerSha256: fingerprint,
          answeredAtMs: Date.now(),
          named:
            oauth_account?.organization_uuid && s !== void 0
              ? { organizationUuid: oauth_account.organization_uuid, subscriptionType: s }
              : null,
        },
  );
}
/**
 * 请求 bootstrap 接口（网关模式需 CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY 才查 /v1/models）。
 */
//@ chunk-mz6f608r.js:5545-8151 fingerprint = fetchBootstrapAPI (0.628)
async function fetchBootstrapAPI(e, o) {
  if (getAPIProvider() === "gateway") {
    if (!env.CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY)
      return (
        logForDebugging(
          "[Bootstrap] Skipped gateway /v1/models (CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY not set)",
        ),
        {
          response: { additional_model_options: [] },
          viaScopelessOAuth: !1,
          oauthBearerSha256: null,
          wasEndpointMovedAtSend: !1,
        }
      );
    let d = await fetchGatewayModelOptions(o);
    return d && { response: d, viaScopelessOAuth: !1, oauthBearerSha256: null, wasEndpointMovedAtSend: !1 };
  }
  if (isEssentialTrafficOnly())
    return (logForDebugging("[Bootstrap] Skipped: Nonessential traffic disabled"), null);
  if (getAPIProvider() !== "firstParty") return (logForDebugging("[Bootstrap] Skipped: 3P provider"), null);
  let { params: params, userAgent: userAgent } = getClaudeCodeUserAgent(e),
    s = async (d, r) => {
      logForDebugging("[Bootstrap] Fetching");
      let A = await Dt.get(`${d}/api/claude_cli/bootstrap`, {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": userAgent,
            ...getCustomHeaderMap(),
            ...r,
          },
          params: params,
          timeout: 5000,
          ...(hasManagedSettings() && { proxy: !1, maxRedirects: 0, adapter: "http" }),
        }),
        safeParse = BOOTSTRAP_RESPONSE_SCHEMA().safeParse(A.data);
      if (!safeParse.success)
        return (
          logForDebugging(`[Bootstrap] Response failed validation: ${safeParse.error.message}`),
          logFeatureSad("api_bootstrap_fetch", "parse_failed"),
          null
        );
      return (logForDebugging("[Bootstrap] Fetch ok"), safeParse.data);
    },
    apiKey = getAnthropicApiKeySafe();
  if (!apiKey && shouldUseWIFAuth())
    try {
      let [d, r] = await Promise.all([getWIFTokenCache(), getWIFCredentials()]);
      if (d !== null) {
        let A = await s(env.ANTHROPIC_BASE_URL || r?.baseURL || getOauthConfig().BASE_API_URL, {
          ...r?.extraHeaders,
          Authorization: `Bearer ${await d.getToken()}`,
          "anthropic-beta": OAUTH_BETA_HEADER,
        });
        return (
          A && { response: A, viaScopelessOAuth: !1, oauthBearerSha256: null, wasEndpointMovedAtSend: !1 }
        );
      }
    } catch (error) {
      return (
        logForDebugging(
          `[Bootstrap] WIF fetch failed: ${Dt.isAxiosError(error) ? (error.response?.status ?? error.code) : error instanceof Error ? error.constructor.name : "unknown"}`,
        ),
        logFeatureSad("api_bootstrap_fetch", "wif_unavailable"),
        null
      );
    }
  let _ = apiKeyForHost(apiKey);
  if (!getClaudeAIOAuthTokens()?.accessToken && !_)
    return (logForDebugging("[Bootstrap] Skipped: no usable OAuth, WIF, or API key"), null);
  if (env.ANTHROPIC_UNIX_SOCKET)
    return (
      logForDebugging("[Bootstrap] Skipped: unix-socket-proxied session"),
      logFeatureSad("api_bootstrap_fetch", "unix_socket_skip"),
      null
    );
  let c = !1,
    S = null,
    b = !1;
  try {
    let d = await withOAuth401Retry(
      async () => {
        let token = getClaudeAIOAuthTokens()?.accessToken,
          A = hasProfileScope(),
          authHeaders;
        if (token && (A || !_))
          ((c = !A && !_),
            (S = computeContentHash(token)),
            (authHeaders = { Authorization: `Bearer ${token}`, "anthropic-beta": OAUTH_BETA_HEADER }));
        else if (_) ((c = !1), (S = null), (authHeaders = { "x-api-key": _ }));
        else return (logForDebugging("[Bootstrap] No auth available on retry, aborting"), null);
        return ((b = hasManagedSettings() && ORt()), s(getOauthConfig().BASE_API_URL, authHeaders));
      },
      { gateToSessionOAuthCredential: isDiskless(), credentials: o },
    );
    return d && { response: d, viaScopelessOAuth: c, oauthBearerSha256: S, wasEndpointMovedAtSend: b };
  } catch (error) {
    let r = Dt.isAxiosError(error) ? error.response?.status : void 0;
    if (c && r === 403)
      return (
        logForDebugging("[Bootstrap] Skipped: 403 for OAuth token without profile scope"),
        logFeatureSad("api_bootstrap_fetch", "no_profile_scope_403"),
        null
      );
    throw (
      logForDebugging(
        `[Bootstrap] Fetch failed: ${Dt.isAxiosError(error) ? (error.response?.status ?? error.code) : "unknown"}`,
      ),
      logFeatureBad("api_bootstrap_fetch", "request_failed"),
      error
    );
  }
}
/**
 * 非 unix socket，且有 API key 或可用 OAuth 令牌。
 */
//@ chunk-mz6f608r.js:8151-8261 placement
function bootstrapFetchCanConvergeSlot() {
  if (env.ANTHROPIC_UNIX_SOCKET) return !1;
  return (
    Boolean(apiKeyForHost(getAnthropicApiKeySafe())) ||
    (Boolean(getClaudeAIOAuthTokens()?.accessToken) && hasProfileScope())
  );
}
/**
 * 重新拉取 bootstrap 数据。
 */
//@ chunk-mz6f608r.js:8261-8300 placement
async function fetchBootstrapData(e, o) {
  await refreshBootstrapData(e, o);
}
/**
 * 拉取并保存 bootstrap 数据（客户端数据、附加模型选项、渲染缓存），失败不抛出。
 */
//@ chunk-mz6f608r.js:8300-11179 placement = fetchBootstrapData (0.296)
async function refreshBootstrapData(e, o, { keepRenderCaches: n = !1, renderedClientData: h } = {}) {
  registerClientDataGetters();
  try {
    let s = getAPIProvider() === "firstParty";
    if (!s) (clearBetasCaches(), invalidateToolDescriptions());
    let u = getBootstrapRequestParams(),
      _ = getAuthenticatedAccountEpoch(),
      y = await fetchBootstrapAPI(u, o);
    if (!y) return !1;
    let {
      response: response,
      viaScopelessOAuth: viaScopelessOAuth,
      oauthBearerSha256: oauthBearerSha256,
      wasEndpointMovedAtSend: wasEndpointMovedAtSend,
    } = y;
    if (_ !== getAuthenticatedAccountEpoch())
      return (
        logForDebugging("[Bootstrap] Discarding response fetched under a superseded credential"),
        logFeatureSad("api_bootstrap_fetch", "superseded_credential"),
        !1
      );
    logFeatureOk(
      "api_bootstrap_fetch",
      hasManagedSettings()
        ? { bearer_plan_named: subscriptionTypeFromBootstrap(response) !== void 0 }
        : void 0,
    );
    let r = getGlobalConfig(),
      A = response.narrowed ?? viaScopelessOAuth,
      C = A && response.additional_model_options == null,
      U = A && response.additional_model_costs == null,
      k = A && response.model_access == null,
      L = A && response.org_model_default == null,
      F = A && response.auto_compact_windows == null,
      O = response.client_data ?? null,
      D = C ? (r.additionalModelOptionsCache ?? []) : (response.additional_model_options ?? []),
      x = U ? (r.additionalModelCostsCache ?? {}) : (response.additional_model_costs ?? {}),
      M = k ? (r.modelAccessCache ?? []) : (response.model_access ?? []),
      N = F ? (r.autoCompactWindowsCache ?? null) : (response.auto_compact_windows ?? null);
    applyBootstrapAccount(response.oauth_account);
    let config = getAuthenticatedAccountEpoch();
    recordBearerPlan(response, oauthBearerSha256, wasEndpointMovedAtSend);
    let E = mergeBootstrapAccount(r.oauthAccount, response.oauth_account),
      H = response.org_model_default
        ? { ...response.org_model_default, ...(E?.organizationUuid && { orgUuid: E.organizationUuid }) }
        : L
          ? (r.orgModelDefaultCache ?? null)
          : null,
      v = bootstrapCacheKey({ ...u, organizationUuid: E?.organizationUuid ?? u.organizationUuid }),
      W = r.clientDataCacheSlots?.[v],
      B = isTimestampedValue(W) ? W : void 0,
      j = B !== void 0,
      Z = En(E, r.oauthAccount);
    if (config !== _ || !En(r.modelAccessCache ?? [], M)) getLearnedEffortCaps().clear();
    let K = s && B !== void 0 && Date.now() - B.at > RTi,
      Y = s && (B === void 0 || !En(B.data ?? null, O)),
      R = s && (h !== void 0 ? !En(h, O) : Y);
    logEvent("tengu_client_data_cache_key", {
      slot_hit: j,
      slot_changed: R,
      legacy_fallback: !j && r.clientDataCache != null,
      slot_stale: K,
    });
    let q = s,
      V = typeof r.additionalModelOptionsAnsweredAt === "number",
      tt =
        C ||
        (q
          ? Array.isArray(r.additionalModelOptionsCache) && V && En(r.additionalModelOptionsCache, D)
          : !V && En(r.additionalModelOptionsCache ?? [], D));
    if (
      !Y &&
      !R &&
      !K &&
      tt &&
      En(r.additionalModelCostsCache ?? {}, x) &&
      En(r.modelAccessCache ?? [], M) &&
      En(r.orgModelDefaultCache ?? null, H) &&
      (!s || En(r.autoCompactWindowsCache ?? null, N)) &&
      Z
    ) {
      if ((logForDebugging("[Bootstrap] Cache unchanged, skipping write"), clearClientDataSeed(v), !k))
        pruneOverturnedEntitlementDenies();
      return !0;
    }
    logForDebugging("[Bootstrap] Cache updated, persisting to disk");
    let J = !1;
    if (
      (await saveGlobalConfig((current) => {
        if (config !== getAuthenticatedAccountEpoch()) return ((J = !0), current);
        let T = mergeBootstrapAccount(current.oauthAccount, response.oauth_account),
          et = bootstrapCacheKey({ ...u, organizationUuid: T?.organizationUuid ?? null });
        return {
          ...current,
          clientDataCacheSlots: s
            ? withTimestampedEntry(current.clientDataCacheSlots, et, {
                data: O,
                at: Date.now(),
                entrypoint: u.entrypoint ?? null,
                model: u.model,
                org: T?.organizationUuid ?? null,
              })
            : current.clientDataCacheSlots,
          ...(C
            ? {}
            : { additionalModelOptionsCache: D, additionalModelOptionsAnsweredAt: q ? Date.now() : void 0 }),
          ...(U ? {} : { additionalModelCostsCache: x }),
          ...(k ? {} : { modelAccessCache: M }),
          ...(L ? {} : { orgModelDefaultCache: H }),
          autoCompactWindowsCache: s && !F ? N : (current.autoCompactWindowsCache ?? null),
          oauthAccount: T,
        };
      }, e),
      clearClientDataSeed(v),
      J)
    )
      return !1;
    if (!k) pruneOverturnedEntitlementDenies();
    if (R && !n) (clearBetasCaches(), invalidateToolDescriptions());
    return !0;
  } catch (error) {
    if (isExpectedApiError(error))
      logForDebugging(`[Bootstrap] fetchBootstrapData failed: ${error}`, { level: "error" });
    else logError(error);
    return !1;
  } finally {
    refreshGrowthBookAfterBootstrap();
  }
}
/**
 * 网关 GET /v1/models 响应的 zod schema（data[].id/display_name/description）。
 */
//@ chunk-mz6f608r.js:11179-11277 file-local
var gatewayModelsResponseSchema = DoctorLazy(() =>
  create({
    data: create_15(
      create({ id: create_2(), display_name: create_2().nullish(), description: create_2().nullish() }),
    ),
  }),
);
/**
 * 网关模式下带 JWT 请求 <gateway>/v1/models（limit 1000，5 秒超时），过滤出 claude/anthropic 且允许的模型，返回 {additional_model_options}；失败返回 null。
 */
//@ chunk-mz6f608r.js:11277-12106 sole-consumer
async function fetchGatewayModelOptions(e) {
  await refreshGatewayToken(e);
  let o = getGatewayAuth();
  if (!o) return null;
  try {
    let n = await Dt.get(`${o.url}/v1/models`, {
        headers: {
          Authorization: `Bearer ${o.jwt}`,
          "anthropic-version": "2023-06-01",
          "User-Agent": claudeCodeUserAgent(),
        },
        params: { limit: 1000 },
        timeout: 5000,
      }),
      safeParse = gatewayModelsResponseSchema().safeParse(n.data);
    if (!safeParse.success)
      return (
        logForDebugging(`[Bootstrap] Gateway /v1/models failed validation: ${safeParse.error.message}`),
        null
      );
    let mapped = safeParse.data.data
      .filter((u) => /(claude|anthropic)/i.test(u.id))
      .filter((u) => {
        let _ = findModelConfigById(u.id);
        return _ === null || isNonCustomFableModel(firstPartyNameToCanonical(_.firstParty));
      })
      .map((u) => ({
        value: u.id,
        label: sanitizeTitle(u.display_name ?? "") || sanitizeTitle(u.id),
        description: markdownSafeText(u.description ?? ""),
      }));
    return (
      logForDebugging(`[Bootstrap] Gateway /v1/models \u2192 ${mapped.length} custom options`),
      { additional_model_options: mapped }
    );
  } catch (error) {
    return (
      logForDebugging(
        `[Bootstrap] Gateway /v1/models fetch failed: ${Dt.isAxiosError(error) ? (error.response?.status ?? error.code) : "unknown"}`,
      ),
      null
    );
  }
}
/**
 * 按入口/模型/版本/组织计算 bootstrap 缓存键（带内存缓存）。
 */
//@ chunk-aepeg2w5.js:64555-64789 placement
function bootstrapCacheKey(e) {
  let json = JSON.stringify([e.entrypoint ?? null, e.model, e.ccVersion, e.organizationUuid]),
    r = na.get(json);
  if (r === void 0) {
    let digest = createHash("sha256").update(json).digest("hex");
    if (((r = BI1 + digest.slice(0, 16)), na.size >= wI)) na.clear();
    na.set(json, r);
  }
  return r;
}

export { registerClientDataGetters, fetchBootstrapData, bootstrapFetchCanConvergeSlot };
