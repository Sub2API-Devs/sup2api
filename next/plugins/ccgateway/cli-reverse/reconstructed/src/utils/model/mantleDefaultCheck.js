/**
 * utils/model/mantleDefaultCheck.ts
 *
 * 2.1.316 新增：检查 Mantle 提供商下默认模型是否可访问（生成警告）；用 AnthropicBedrockMantle 客户端发送探测请求等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-paetrb4a.js (6)
 * attribution: placement 6
 */
import { catalogEntriesByFirstPartyId } from "./modelCatalog.js";
import { DEFAULT_MANTLE_OPUS_KEY, toProviderWireModelId, getMarketingNameForModel } from "./model.js";
import { getAPIProvider } from "./providers.js";
import { env } from "../env.js";
import { getInitialSettings_2 } from "../settings/settings.js";
import { getUserSpecifiedModelSetting } from "./smallFastModel.js";
import { userConfiguredDefault } from "./thirdPartyModelDefaults.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../debug.js";
import {
  PACKAGE_INFO,
  getCustomHeaders,
  rememberedAccess,
  recordAccessVerdict,
} from "./thirdPartyModelAccess.js";
import { resolveAwsRegion } from "../awsRegion.js";
import { awsCredentialSelectors } from "./bedrockDefaultCheck.js";
import { classifyProviderModelError } from "../../services/api/providerModelErrors.js";
import { getForwardableEnvHeaders } from "../../services/api/requestHeaders.js";
import {
  clearAuthorizationHeaders,
  filteredCustomBetaHeaders,
  hasCustomApiKeyHeader,
  CLOUD_AUTH_SLOT,
  bearerFromEnvOrHeaders,
} from "../../services/api/customHeaders.js";
import {
  isHostManagedProviderAuth,
  refreshAndGetAwsCredentials,
  hostManagedAwsSdkCredentials,
  defaultAwsProviderChainResolver,
} from "../auth.js";
import { sendStartupModelCheck } from "./modelAccessCheck.js";

//@ chunk-paetrb4a.js:3655-3710 placement
var filtered = Object.keys(catalogEntriesByFirstPartyId).filter(
  (key) => catalogEntriesByFirstPartyId[key].mantle !== null,
);
//@ chunk-paetrb4a.js:3710-5514 placement
/**
 * 检查 Mantle 提供商下默认模型是否可访问（生成警告）。
 */
async function checkMantleDefaults(defaultKey = DEFAULT_MANTLE_OPUS_KEY, options) {
  if (getAPIProvider() !== "mantle") return [];
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) return [];
  let modelOverrides = getInitialSettings_2().modelOverrides;
  if (modelOverrides?.[catalogEntriesByFirstPartyId[defaultKey].firstParty]) return [];
  let userPinned = options?.userPinned ?? getUserSpecifiedModelSetting() != null;
  let ANTHROPIC_DEFAULT_OPUS_MODEL = env.ANTHROPIC_DEFAULT_OPUS_MODEL;
  let refutedPin;
  if (ANTHROPIC_DEFAULT_OPUS_MODEL !== undefined && !userConfiguredDefault("opus")) {
    if (userPinned) return [];
    let access = await mantleCheckCacheKey(toProviderWireModelId(ANTHROPIC_DEFAULT_OPUS_MODEL));
    logEvent("tengu_mantle_probe_result", {
      model_key: lit("admin_pin"),
      accessible: lit(
        access === "refuted"
          ? "false"
          : access === "accessible" || access === "outdated"
            ? "true"
            : "unknown",
      ),
    });
    if (access !== "refuted")
      return [
        {
          kind: "adminPin",
          tier: "opus",
          adminMantleId: ANTHROPIC_DEFAULT_OPUS_MODEL,
        },
      ];
    refutedPin = ANTHROPIC_DEFAULT_OPUS_MODEL;
  }
  let mantle = catalogEntriesByFirstPartyId[defaultKey].mantle;
  if (!mantle) return [];
  logEvent("tengu_mantle_default_check", {});
  let accessible = await isMantleModelAccessible(mantle);
  logEvent("tengu_mantle_probe_result", {
    model_key: fromEnum(defaultKey),
    accessible: lit(accessible ? "true" : "false"),
  });
  if (accessible) {
    if (refutedPin !== undefined)
      return [
        {
          kind: "pinRefuted",
          tier: "opus",
          refutedValue: refutedPin,
          workingKey: defaultKey,
          workingName:
            getMarketingNameForModel(catalogEntriesByFirstPartyId[defaultKey].firstParty) ?? mantle,
          workingMantleId: mantle,
          defaultKey,
        },
      ];
    return [];
  }
  let defaultName = getMarketingNameForModel(catalogEntriesByFirstPartyId[defaultKey].firstParty) ?? mantle;
  let index = filtered.indexOf(defaultKey);
  let filtered_2 = filtered
    .slice(0, index)
    .reverse()
    .filter(
      (key) => key.startsWith("opus") && !modelOverrides?.[catalogEntriesByFirstPartyId[key].firstParty],
    );
  let results = await Promise.all(
    filtered_2.map(async (key) => {
      let mantle = catalogEntriesByFirstPartyId[key].mantle;
      let accessible = await isMantleModelAccessible(mantle);
      logEvent("tengu_mantle_probe_result", {
        model_key: fromEnum(key),
        accessible: lit(accessible ? "true" : "false"),
      });
      let name = getMarketingNameForModel(catalogEntriesByFirstPartyId[key].firstParty) ?? mantle;
      return {
        key,
        mantleId: mantle,
        name,
        ok: accessible,
      };
    }),
  );
  for (let result of results)
    if (result.ok) {
      logForDebugging(`[mantle-fallback] default=${defaultKey} fallback=${result.key}`);
      if (refutedPin !== undefined)
        return [
          {
            kind: "pinRefuted",
            tier: "opus",
            refutedValue: refutedPin,
            workingKey: result.key,
            workingName: result.name,
            workingMantleId: result.mantleId,
            defaultKey,
          },
        ];
      return [
        {
          kind: "fallback",
          tier: "opus",
          envVar: "ANTHROPIC_DEFAULT_OPUS_MODEL",
          defaultKey,
          defaultName,
          fallbackKey: result.key,
          fallbackName: result.name,
          fallbackMantleId: result.mantleId,
        },
      ];
    }
  let triedNames = [
    ...(refutedPin !== undefined ? [`the admin-configured model (${refutedPin})`] : []),
    defaultName,
    ...results.map((result) => result.name),
  ];
  logForDebugging(`[mantle-fallback] default=${defaultKey} exhausted \u2014 no working Opus`);
  return [
    {
      kind: "exhausted",
      tier: "opus",
      defaultName,
      triedNames,
    },
  ];
}
//@ chunk-paetrb4a.js:5514-5871 placement
/**
 * 带缓存地探测 Mantle 模型访问。
 */
async function mantleCheckCacheKey(modelId) {
  let cacheKey = await PACKAGE_INFO("mantle", async () => [
    await resolveAwsRegion(),
    env.ANTHROPIC_BEDROCK_MANTLE_BASE_URL,
    env.CLAUDE_CODE_SKIP_MANTLE_AUTH ? "skip-auth" : undefined,
    ...awsCredentialSelectors(),
    getCustomHeaders(),
  ]);
  if (cacheKey !== undefined && (await rememberedAccess(cacheKey, modelId))?.state === "ok") {
    logForDebugging(`[mantle-probe] ${modelId}: accessible (remembered)`);
    return "accessible";
  }
  let verdict = await probeMantleModel(modelId);
  if (verdict === "accessible" && cacheKey !== undefined) recordAccessVerdict(cacheKey, modelId, "ok");
  return verdict;
}
//@ chunk-paetrb4a.js:5871-6735 placement
/**
 * 探测 Mantle 模型可访问性（429 视为可访问）。
 */
async function probeMantleModel(modelId) {
  try {
    await sendMantleProbe(modelId);
    return "accessible";
  } catch (error) {
    let status = error?.status;
    if (status === 429) return "accessible";
    let errorKind = classifyProviderModelError("mantle", error);
    if (errorKind === "outdated") {
      logForDebugging(
        `[mantle-probe] ${modelId}: needs a newer Claude Code than ${
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION
        }; keeping it, so the first request shows the update message`,
      );
      return "outdated";
    }
    if (status === 400 || status === 403 || status === 404)
      return errorKind === "credential" ? "unknown" : "refuted";
    return "unknown";
  }
}
//@ chunk-paetrb4a.js:6735-6812 placement
async function isMantleModelAccessible(modelId) {
  let verdict = await mantleCheckCacheKey(modelId);
  return verdict === "accessible" || verdict === "outdated";
}
//@ chunk-paetrb4a.js:6812-7944 placement
/**
 * 用 AnthropicBedrockMantle 客户端发送探测请求。
 */
async function sendMantleProbe(modelId) {
  let [{ AnthropicBedrockMantle }, { getProxyFetchOptions }] = await Promise.all([
    import("../../../vendor/@anthropic-ai/bedrock-sdk/AnthropicBedrock.lazy.js"),
    import("../proxy.js"),
  ]);
  let awsRegion = await resolveAwsRegion();
  let clientOptions = {
    awsRegion,
    maxRetries: 0,
    timeout: 8000,
    fetchOptions: getProxyFetchOptions({
      url: env.ANTHROPIC_BEDROCK_MANTLE_BASE_URL || `https://bedrock-mantle.${awsRegion}.api.aws`,
    }),
  };
  let client;
  let forwardableEnvHeaders = getForwardableEnvHeaders();
  let AWS_BEARER_TOKEN_BEDROCK = env.AWS_BEARER_TOKEN_BEDROCK;
  if (AWS_BEARER_TOKEN_BEDROCK)
    client = new AnthropicBedrockMantle({
      ...clientOptions,
      apiKey: AWS_BEARER_TOKEN_BEDROCK,
      defaultHeaders: {
        ...forwardableEnvHeaders,
        ...clearAuthorizationHeaders(),
        ...filteredCustomBetaHeaders(),
        Authorization: `Bearer ${AWS_BEARER_TOKEN_BEDROCK}`,
        ...(!hasCustomApiKeyHeader() && {
          "X-Api-Key": null,
        }),
      },
    });
  else {
    let CLAUDE_CODE_SKIP_MANTLE_AUTH = env.CLAUDE_CODE_SKIP_MANTLE_AUTH;
    let hostManaged = isHostManagedProviderAuth();
    let baseHeaders = {
      authToken: null,
      defaultHeaders: {
        ...forwardableEnvHeaders,
        ...clearAuthorizationHeaders(),
        ...filteredCustomBetaHeaders(),
        Authorization: null,
        ...(!hasCustomApiKeyHeader() && {
          "X-Api-Key": null,
        }),
      },
      ...CLOUD_AUTH_SLOT,
    };
    let bearerToken = CLAUDE_CODE_SKIP_MANTLE_AUTH ? bearerFromEnvOrHeaders() : undefined;
    let credentials =
      CLAUDE_CODE_SKIP_MANTLE_AUTH || hostManaged ? null : await refreshAndGetAwsCredentials();
    client = credentials
      ? new AnthropicBedrockMantle({
          ...clientOptions,
          ...baseHeaders,
          awsAccessKey: credentials.accessKeyId,
          awsSecretAccessKey: credentials.secretAccessKey,
          awsSessionToken: credentials.sessionToken,
        })
      : new AnthropicBedrockMantle({
          ...clientOptions,
          ...(CLAUDE_CODE_SKIP_MANTLE_AUTH &&
            !bearerToken && {
              skipAuth: true,
              authToken: null,
              defaultHeaders: {
                ...forwardableEnvHeaders,
                ...filteredCustomBetaHeaders(),
              },
              ...CLOUD_AUTH_SLOT,
            }),
          ...(CLAUDE_CODE_SKIP_MANTLE_AUTH &&
            bearerToken && {
              apiKey: bearerToken.match(/^Bearer (.+)$/i)?.[1] ?? bearerToken,
              defaultHeaders: {
                ...forwardableEnvHeaders,
                ...filteredCustomBetaHeaders(),
                Authorization: bearerToken,
              },
            }),
          ...(!CLAUDE_CODE_SKIP_MANTLE_AUTH && baseHeaders),
          ...(!CLAUDE_CODE_SKIP_MANTLE_AUTH &&
            hostManaged && {
              providerChainResolver: hostManagedAwsSdkCredentials("Mantle").providerChainResolver,
            }),
          ...(!CLAUDE_CODE_SKIP_MANTLE_AUTH &&
            !hostManaged && {
              providerChainResolver: defaultAwsProviderChainResolver(awsRegion),
            }),
        });
  }
  await client.messages.create(sendStartupModelCheck(modelId));
}
export { checkMantleDefaults };
