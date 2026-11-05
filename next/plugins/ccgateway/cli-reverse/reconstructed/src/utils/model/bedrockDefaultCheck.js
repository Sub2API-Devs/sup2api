/**
 * utils/model/bedrockDefaultCheck.ts
 *
 * 2.1.316 新增。检查 Bedrock 默认模型可用性并找升级候选。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-v357btam.js (16)
 * attribution: placement 16
 */
import {
  tierConfig,
  collectStalePins,
  enforcedAllowlistLeavesOut,
  leftOutDebugLine,
  seedEnvDefaultForUserPin as seedEnvDefaultForUserPin_2,
  lastLiveRoundStart,
  documentMayMoveTiers,
  collectUnpinnedTiers,
  refuteUnavailableDocumentDefaults,
  predecessorsInTier,
} from "./stalePins.js";
import { DEFAULT_BEDROCK_OPUS_KEY, getMarketingNameForModel, DEFAULT_3P_SONNET_KEY } from "./model.js";
import { getAPIProvider } from "./providers.js";
import { env } from "../env.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromNumber, fromEnum } from "../../services/analytics/safeMetadata.js";
import { getBedrockInferenceProfiles } from "../../services/analytics/telemetryCredentialGuard.js";
import { getBedrockRegionPrefix, findFirstMatch, withBedrockRegionPrefix } from "./bedrock.js";
import { resolveAwsRegion } from "../awsRegion.js";
import { catalogEntriesByFirstPartyId } from "./modelCatalog.js";
import { logForDebugging } from "../debug.js";
import { telemetrySafeModelName } from "./telemetryModelName.js";
import { getInitialSettings } from "../settings/settings.js";
import {
  markModelRefused,
  modelNotAvailableError,
  registerFallbackLadder,
  clearModelRefusal,
} from "./modelUnavailability.js";
import {
  REFUSED_TTL_MS,
  findFirstAccessibleModel,
  checkRememberedModelAccess,
  recordAccessVerdict,
  PACKAGE_INFO,
  getCustomHeaders,
  rememberedAccess,
} from "./thirdPartyModelAccess.js";
import { documentNamesCloudDefault } from "./planModeModel.js";
import { getModelStrings } from "./modelStrings.js";
import { toBedrockFoundationModelId, pickProfileForFoundationModel } from "./modelCatalog/catalogSeed.js";
import { nonEmptyOrUndefined } from "../envUtils.js";
import { getForwardableEnvHeaders } from "../../services/api/requestHeaders.js";
import {
  clearAuthorizationHeaders,
  filteredCustomBetaHeaders,
  hasCustomApiKeyHeader,
  CLOUD_AUTH_SLOT,
  bearerFromEnvOrHeaders,
  apiKeyHeaderFromEnv,
} from "../../services/api/customHeaders.js";
import {
  isHostManagedProviderAuth,
  refreshAndGetAwsCredentials,
  hostManagedAwsSdkCredentials,
  defaultAwsProviderChainResolver,
} from "../auth.js";
import { sendStartupModelCheck } from "./modelAccessCheck.js";

//@ chunk-v357btam.js:782-811 placement
function defaultBedrockOpusTier() {
  return tierConfig(DEFAULT_BEDROCK_OPUS_KEY);
}
//@ chunk-v357btam.js:811-1829 placement
async function findBedrockUpgradeCandidates() {
  if (getAPIProvider() !== "bedrock") return [];
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) return [];
  let stalePins = collectStalePins(defaultBedrockOpusTier(), (key) =>
    key.includes("application-inference-profile"),
  );
  if (stalePins.length === 0) return [];
  logEvent("tengu_bedrock_upgrade_check", {
    stale_tiers: fromNumber(stalePins.length),
  });
  let profiles;
  try {
    profiles = await getBedrockInferenceProfiles();
  } catch {
    return [];
  }
  let bedrockRegionPrefix = getBedrockRegionPrefix(await resolveAwsRegion());
  let candidates = [];
  for (let stalePin of stalePins) {
    let firstParty = catalogEntriesByFirstPartyId[stalePin.defaultKey].firstParty;
    let firstMatch = findFirstMatch(profiles, firstParty, bedrockRegionPrefix);
    if (!firstMatch) continue;
    if (enforcedAllowlistLeavesOut(firstMatch)) {
      logForDebugging(`[bedrock-upgrade] ${leftOutDebugLine(stalePin.tier, "upgrade", [firstMatch])}`);
      continue;
    }
    let marketingNameForModel = getMarketingNameForModel(
      catalogEntriesByFirstPartyId[stalePin.pinnedKey].firstParty,
    );
    let marketingNameForModel_2 = getMarketingNameForModel(
      catalogEntriesByFirstPartyId[stalePin.defaultKey].firstParty,
    );
    if (!marketingNameForModel || !marketingNameForModel_2) continue;
    candidates.push({
      tier: stalePin.tier,
      envVar: stalePin.envVar,
      fromKey: stalePin.pinnedKey,
      fromMarketingName: marketingNameForModel,
      toKey: stalePin.defaultKey,
      toMarketingName: marketingNameForModel_2,
      toBedrockId: firstMatch,
    });
  }
  let filtered = (
    await Promise.all(
      candidates.map(async (candidate) => {
        let accessible = await probeBedrockModel(candidate.toBedrockId, candidate.tier, {
          isDefault: true,
          versionTooOld: "unavailable",
        });
        logEvent("tengu_bedrock_probe_result", {
          tier: fromEnum(candidate.tier),
          model_id: telemetrySafeModelName(candidate.toBedrockId),
          accessible,
        });
        return accessible ? candidate : null;
      }),
    )
  ).filter((candidate) => candidate !== null);
  logForDebugging(`[bedrock-upgrade] tiersWithPin=${stalePins.length} candidates=${filtered.length}`);
  return filtered;
}
//@ chunk-v357btam.js:1829-1863 placement
function seedEnvDefaultForUserPin(value) {
  return seedEnvDefaultForUserPin_2(value, defaultBedrockOpusTier());
}
//@ chunk-v357btam.js:1863-3580 placement
/**
 * 检查 Bedrock 默认模型可用性并找升级候选。
 */
async function checkBedrockDefaultAvailability() {
  if (getAPIProvider() !== "bedrock") return [];
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) return [];
  let roundStart = lastLiveRoundStart(Date.now());
  let modelOverrides = getInitialSettings().modelOverrides;
  let region = documentMayMoveTiers() ? await resolveAwsRegion() : undefined;
  let documentTiers = defaultBedrockOpusTier();
  let unpinnedTiers = collectUnpinnedTiers(documentTiers, modelOverrides);
  if (unpinnedTiers.length === 0) return [];
  logEvent("tengu_bedrock_default_check", {
    unpinned_tiers: fromNumber(unpinnedTiers.length),
  });
  let profiles;
  try {
    profiles = await getBedrockInferenceProfiles();
  } catch {
    profiles = [];
  }
  let resolvedRegion = region ?? (await resolveAwsRegion());
  let bedrockRegionPrefix = getBedrockRegionPrefix(resolvedRegion);
  let sonnetInvolved = unpinnedTiers.some((unpinnedTier) => unpinnedTier.tier === "sonnet");
  let results = await Promise.all(
    unpinnedTiers.map(async (unpinnedTier) => {
      let catalogEntry = catalogEntriesByFirstPartyId[unpinnedTier.defaultKey];
      let documentTarget = documentTiers[unpinnedTier.tier].documentTarget;
      let fromDocument = documentTiers[unpinnedTier.tier].fromDocument === true;
      let documentModelId =
        documentTarget === undefined
          ? undefined
          : tailorBedrockModelId(documentTarget.modelId, profiles, bedrockRegionPrefix);
      let modelId =
        documentModelId ?? resolveBedrockModelId(unpinnedTier.defaultKey, profiles, bedrockRegionPrefix);
      if (!modelId) return null;
      if (enforcedAllowlistLeavesOut(modelId)) {
        logForDebugging(`[bedrock-fallback] ${leftOutDebugLine(unpinnedTier.tier, "check", [modelId])}`);
        return null;
      }
      await checkDefaultsUnchecked(
        unpinnedTier,
        modelId,
        profiles,
        bedrockRegionPrefix,
        modelOverrides,
        documentTarget,
        fromDocument,
        sonnetInvolved,
      );
      let probeState = {};
      let accessible = await probeBedrockModel(modelId, unpinnedTier.tier, {
        isDefault: true,
        ...(documentTiers[unpinnedTier.tier].fromDocument && {
          versionTooOld: "unavailable",
        }),
        onVerdict: (verdict, at) => {
          probeState.verdict = verdict;
          probeState.at = at;
        },
      });
      logEvent("tengu_bedrock_probe_result", {
        tier: fromEnum(unpinnedTier.tier),
        model_id: telemetrySafeModelName(modelId),
        accessible,
      });
      if (accessible || probeState.verdict === "temporary") return null;
      if (probeState.verdict === "refused")
        markModelRefused(
          modelId,
          modelNotAvailableError(modelId),
          (probeState.at ?? Date.now()) + REFUSED_TTL_MS,
        );
      let upgradeCandidatesUnchecked = await findUpgradeCandidatesUnchecked(
        unpinnedTier.defaultKey,
        unpinnedTier.tier,
        profiles,
        bedrockRegionPrefix,
        modelOverrides,
        roundStart,
        documentTarget !== undefined,
        fromDocument,
      );
      if (!upgradeCandidatesUnchecked) return null;
      if (probeState.verdict !== "refused") {
        if (!(
          upgradeCandidatesUnchecked.answeredLive === true ||
          upgradeCandidatesUnchecked.adminMapped === true ||
          (await probeBedrockModel(
            upgradeCandidatesUnchecked.regionalId,
            upgradeCandidatesUnchecked.crossTier ? "sonnet" : unpinnedTier.tier,
            {
              live: true,
            },
          ))
        ))
          return null;
        if (probeState.verdict === "denied" && upgradeCandidatesUnchecked.adminMapped !== true) {
          markModelRefused(modelId, modelNotAvailableError(modelId), Date.now() + REFUSED_TTL_MS);
          rememberBedrockModelAccess(modelId, unpinnedTier.tier, "refused");
        }
      }
      let defaultName = documentTarget?.name ?? getMarketingNameForModel(catalogEntry.firstParty);
      let marketingNameForModel = getMarketingNameForModel(
        catalogEntriesByFirstPartyId[upgradeCandidatesUnchecked.key].firstParty,
      );
      if (!defaultName || !marketingNameForModel) return null;
      return {
        tier: unpinnedTier.tier,
        envVar: unpinnedTier.envVar,
        defaultKey: unpinnedTier.defaultKey,
        defaultName,
        ...(documentModelId !== undefined && {
          documentTargetId: documentModelId,
        }),
        fallbackKey: upgradeCandidatesUnchecked.key,
        fallbackName: marketingNameForModel,
        fallbackBedrockId: upgradeCandidatesUnchecked.regionalId,
        ...(upgradeCandidatesUnchecked.crossTier && {
          crossTier: true,
        }),
      };
    }),
  );
  let fallbacks = [];
  for (let fallback of results) if (fallback !== null) fallbacks.push(fallback);
  logForDebugging(`[bedrock-fallback] unpinnedTiers=${unpinnedTiers.length} fallbacks=${fallbacks.length}`);
  return fallbacks;
}
//@ chunk-v357btam.js:3580-4056 placement
async function checkBedrockDocumentDefaults() {
  if (
    getAPIProvider() !== "bedrock" ||
    env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST ||
    !documentNamesCloudDefault()
  )
    return [];
  await resolveAwsRegion();
  await getBedrockInferenceProfiles().catch(() => {
    return;
  });
  let refuted = await refuteUnavailableDocumentDefaults(async (modelId, tier) => {
    let probeState = {};
    let accessible = await probeBedrockModel(modelId, tier, {
      isDefault: true,
      versionTooOld: "unavailable",
      onVerdict: (verdict) => {
        probeState.verdict = verdict;
      },
    });
    logEvent("tengu_bedrock_probe_result", {
      tier: fromEnum(tier ?? "default"),
      model_id: telemetrySafeModelName(modelId),
      accessible,
    });
    return accessible || probeState.verdict === "temporary";
  }, getInitialSettings().modelOverrides);
  logForDebugging(`[bedrock-fallback] refutedDocumentDefaults=${refuted.length}`);
  return refuted;
}
//@ chunk-v357btam.js:4056-4884 placement
/**
 * 检查 Bedrock 默认模型可用性
 */
async function checkDefaultsUnchecked(
  unpinnedTier,
  modelId,
  profiles,
  bedrockRegionPrefix,
  modelOverrides,
  documentTarget,
  fromDocument,
  sonnetInvolved,
) {
  let makeCandidate = (key, id) => ({
    id,
    name:
      getMarketingNameForModel(catalogEntriesByFirstPartyId[key].firstParty) ??
      catalogEntriesByFirstPartyId[key].firstParty,
  });
  let hasOverride = (key) => Boolean(modelOverrides?.[catalogEntriesByFirstPartyId[key].firstParty]);
  let isAllowedOverride = (key) =>
    hasOverride(key) && !enforcedAllowlistLeavesOut(String(getModelStrings()[key]));
  let resolveAll = (keys) =>
    keys.flatMap((key) => {
      let bedrockModelId = resolveBedrockModelId(key, profiles, bedrockRegionPrefix);
      return bedrockModelId && !enforcedAllowlistLeavesOut(bedrockModelId)
        ? [makeCandidate(key, bedrockModelId)]
        : [];
    });
  let crossTierPreds = (key, crossTier) =>
    resolveAll(predecessorsInTier(key, crossTier).filter((predKey) => !hasOverride(predKey)));
  let predecessors = predecessorsInTier(
    unpinnedTier.defaultKey,
    unpinnedTier.tier,
    documentTarget !== undefined,
  );
  let adminPinned = fromDocument ? predecessors.find(isAllowedOverride) : undefined;
  let ladder = [
    documentTarget === undefined
      ? makeCandidate(unpinnedTier.defaultKey, modelId)
      : {
          id: modelId,
          name: documentTarget.name,
        },
    ...resolveAll(
      (adminPinned === undefined
        ? predecessors
        : predecessors.slice(0, predecessors.indexOf(adminPinned))
      ).filter((key) => !hasOverride(key)),
    ),
  ];
  if (adminPinned !== undefined)
    ladder.push(makeCandidate(adminPinned, String(getModelStrings()[adminPinned])));
  else if (unpinnedTier.tier === "opus") {
    let bedrockModelId = resolveBedrockModelId(DEFAULT_3P_SONNET_KEY, profiles, bedrockRegionPrefix);
    let sonnetModelId = !bedrockModelId
      ? []
      : !enforcedAllowlistLeavesOut(bedrockModelId)
        ? [makeCandidate(DEFAULT_3P_SONNET_KEY, bedrockModelId)]
        : sonnetInvolved
          ? crossTierPreds(DEFAULT_3P_SONNET_KEY, "sonnet")
          : [];
    ladder.push(
      ...sonnetModelId.map((candidate) => ({
        ...candidate,
        crossTier: true,
      })),
    );
  }
  registerFallbackLadder("bedrock", unpinnedTier.tier, unpinnedTier.envVar, ladder);
  await Promise.all(
    ladder.slice(1).map(async (candidate) => {
      let tier = candidate.crossTier ? "sonnet" : unpinnedTier.tier;
      let remembered = await rememberedBedrockAccess(candidate.id, tier);
      if (remembered?.state === "refused")
        markModelRefused(candidate.id, modelNotAvailableError(candidate.id), remembered.at + REFUSED_TTL_MS);
    }),
  ).catch(() => {});
}
//@ chunk-v357btam.js:4884-5002 placement
function resolveBedrockModelId(key, profiles, regionPrefix) {
  let catalogEntry = catalogEntriesByFirstPartyId[key];
  let firstMatch = findFirstMatch(profiles, catalogEntry.firstParty, regionPrefix);
  if (firstMatch) return firstMatch;
  if (!catalogEntry.bedrock) return null;
  return withBedrockRegionPrefix(catalogEntry.bedrock, regionPrefix);
}
//@ chunk-v357btam.js:5002-5073 placement
function tailorBedrockModelId(modelId, profiles, regionPrefix) {
  let foundationModelId = toBedrockFoundationModelId(modelId);
  return (
    (foundationModelId === undefined
      ? undefined
      : pickProfileForFoundationModel(foundationModelId, profiles, regionPrefix)) ?? modelId
  );
}
//@ chunk-v357btam.js:5073-6206 placement
/**
 * 找 Bedrock 升级候选
 */
async function findUpgradeCandidatesUnchecked(
  defaultKey,
  probeTier,
  profiles,
  bedrockRegionPrefix,
  modelOverrides,
  overrideMap,
  documentTiered = false,
  versionTooOld = false,
) {
  let leftOut = [];
  function resolveCandidates(keys, probeTier_2) {
    return keys.flatMap((key) => {
      let bedrockModelId = resolveBedrockModelId(key, profiles, bedrockRegionPrefix);
      if (!bedrockModelId) return [];
      if (enforcedAllowlistLeavesOut(bedrockModelId)) {
        leftOut.push(
          probeTier_2 === probeTier ? bedrockModelId : `${bedrockModelId} (the cross-tier Sonnet default)`,
        );
        return [];
      }
      return [
        {
          key,
          regionalId: bedrockModelId,
          probeTier: probeTier_2,
        },
      ];
    });
  }
  let hasOverride = (key) => Boolean(modelOverrides?.[catalogEntriesByFirstPartyId[key].firstParty]);
  let isAllowedOverride = (key) =>
    hasOverride(key) && !enforcedAllowlistLeavesOut(String(getModelStrings()[key]));
  let predecessors = predecessorsInTier(defaultKey, probeTier, documentTiered);
  let adminPinned = versionTooOld ? predecessors.find(isAllowedOverride) : undefined;
  let keys = (
    adminPinned === undefined ? predecessors : predecessors.slice(0, predecessors.indexOf(adminPinned))
  ).filter((key) => !hasOverride(key));
  let groups = [resolveCandidates(keys, probeTier)];
  if (probeTier === "opus" && adminPinned === undefined)
    groups.push(resolveCandidates([DEFAULT_3P_SONNET_KEY], "sonnet"));
  if (leftOut.length > 0)
    logForDebugging(`[bedrock-fallback] ${leftOutDebugLine(probeTier, "fallback", leftOut)}`);
  let liveAnswered = new Set();
  let onVerdict = (candidate) => ({
    onVerdict: (verdict, at) => {
      if (verdict === "refused")
        markModelRefused(
          candidate.regionalId,
          modelNotAvailableError(candidate.regionalId),
          (at ?? Date.now()) + REFUSED_TTL_MS,
        );
      else if (verdict === "accessible") {
        clearModelRefusal(candidate.regionalId);
        if (at === undefined) liveAnswered.add(candidate.regionalId);
      }
    },
  });
  let firstAccessibleModel = await findFirstAccessibleModel(
    groups,
    (candidate, live) =>
      probeBedrockModel(candidate.regionalId, candidate.probeTier, {
        ...(live && {
          live,
        }),
        ...(documentTiered &&
          candidate.key === defaultKey && {
            isDefault: true,
          }),
        ...(versionTooOld && {
          versionTooOld: "unavailable",
        }),
        ...onVerdict(candidate),
      }),
    async (candidate) =>
      (await rememberedBedrockAccess(candidate.regionalId, candidate.probeTier))?.state === "refused",
    overrideMap,
  );
  if (!firstAccessibleModel)
    return adminPinned === undefined
      ? null
      : {
          key: adminPinned,
          regionalId: String(getModelStrings()[adminPinned]),
          adminMapped: true,
        };
  return {
    key: firstAccessibleModel.key,
    regionalId: firstAccessibleModel.regionalId,
    ...(firstAccessibleModel.probeTier !== probeTier && {
      crossTier: true,
    }),
    ...(liveAnswered.has(firstAccessibleModel.regionalId) && {
      answeredLive: true,
    }),
  };
}
//@ chunk-v357btam.js:6206-6370 placement
async function probeBedrockModel(modelId, tier, options) {
  let bedrockRegionForTier = await getBedrockRegionForTier(tier);
  if (bedrockRegionForTier === undefined) {
    options?.onVerdict?.("temporary");
    return false;
  }
  return (
    (await checkRememberedModelAccess(
      "bedrock",
      await getBedrockClientCacheKey(bedrockRegionForTier),
      modelId,
      () => probeBedrockModelUnchecked(modelId, bedrockRegionForTier),
      options,
    )) === "accessible"
  );
}
//@ chunk-v357btam.js:6370-6516 placement
async function rememberBedrockModelAccess(modelId, tier, verdict) {
  try {
    let bedrockRegionForTier = await getBedrockRegionForTier(tier);
    let cacheKey = bedrockRegionForTier && (await getBedrockClientCacheKey(bedrockRegionForTier));
    if (cacheKey) await recordAccessVerdict(cacheKey, modelId, verdict);
  } catch (error) {
    logForDebugging(`[3p-model-memory] bedrock record failed: ${error}`);
  }
}
//@ chunk-v357btam.js:6516-6631 placement
async function getBedrockRegionForTier(tier) {
  try {
    return (
      (tier === "haiku" && nonEmptyOrUndefined(env.ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION)) ||
      (await resolveAwsRegion())
    );
  } catch {
    return;
  }
}
//@ chunk-v357btam.js:6631-6770 placement
function getBedrockClientCacheKey(bedrockRegionForTier) {
  return PACKAGE_INFO("bedrock", () => [
    bedrockRegionForTier,
    env.ANTHROPIC_BEDROCK_BASE_URL,
    env.CLAUDE_CODE_SKIP_BEDROCK_AUTH ? "skip-auth" : undefined,
    ...awsCredentialSelectors(),
    getCustomHeaders(),
  ]);
}
//@ chunk-v357btam.js:6770-6850 placement
async function rememberedBedrockAccess(modelId, tier) {
  let bedrockRegionForTier = await getBedrockRegionForTier(tier);
  let cacheKey = bedrockRegionForTier && (await getBedrockClientCacheKey(bedrockRegionForTier));
  return cacheKey ? rememberedAccess(cacheKey, modelId) : undefined;
}
//@ chunk-v357btam.js:6850-7128 placement
function awsCredentialSelectors() {
  let initialSettings = getInitialSettings();
  return [
    env.AWS_PROFILE,
    env.AWS_CONFIG_FILE,
    env.AWS_SHARED_CREDENTIALS_FILE,
    env.AWS_ACCESS_KEY_ID,
    env.AWS_ROLE_ARN,
    env.AWS_WEB_IDENTITY_TOKEN_FILE,
    env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI,
    env.AWS_CONTAINER_CREDENTIALS_FULL_URI,
    initialSettings.awsCredentialExport,
    initialSettings.awsAuthRefresh,
  ];
}
//@ chunk-v357btam.js:7128-8356 placement
/**
 * 用 Bedrock 客户端探测模型
 */
async function probeBedrockModelUnchecked(modelId, bedrockRegionForTier) {
  try {
    let [{ AnthropicBedrock }, { getProxyFetchOptions }] = await Promise.all([
      import("../../../vendor/@anthropic-ai/bedrock-sdk/AnthropicBedrock.lazy.js"),
      import("../proxy.js"),
    ]);
    let clientOptions = {
      awsRegion: bedrockRegionForTier,
      maxRetries: 0,
      timeout: 8000,
      fetchOptions: getProxyFetchOptions({
        url:
          env.ANTHROPIC_BEDROCK_BASE_URL || `https://bedrock-runtime.${bedrockRegionForTier}.amazonaws.com`,
      }),
    };
    let client;
    let forwardableEnvHeaders = getForwardableEnvHeaders();
    let AWS_BEARER_TOKEN_BEDROCK = env.AWS_BEARER_TOKEN_BEDROCK;
    if (AWS_BEARER_TOKEN_BEDROCK)
      client = new AnthropicBedrock({
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
      let CLAUDE_CODE_SKIP_BEDROCK_AUTH = env.CLAUDE_CODE_SKIP_BEDROCK_AUTH;
      let hostManagedAuth = isHostManagedProviderAuth();
      let managedAuthOptions = {
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
      let bearerToken = CLAUDE_CODE_SKIP_BEDROCK_AUTH ? bearerFromEnvOrHeaders() : undefined;
      let awsCredentials =
        CLAUDE_CODE_SKIP_BEDROCK_AUTH || hostManagedAuth ? null : await refreshAndGetAwsCredentials();
      client = awsCredentials
        ? new AnthropicBedrock({
            ...clientOptions,
            ...managedAuthOptions,
            awsAccessKey: awsCredentials.accessKeyId,
            awsSecretKey: awsCredentials.secretAccessKey,
            awsSessionToken: awsCredentials.sessionToken,
          })
        : new AnthropicBedrock({
            ...clientOptions,
            ...(CLAUDE_CODE_SKIP_BEDROCK_AUTH &&
              !bearerToken && {
                skipAuth: true,
                authToken: null,
                defaultHeaders: {
                  ...forwardableEnvHeaders,
                  ...filteredCustomBetaHeaders(),
                },
                ...CLOUD_AUTH_SLOT,
              }),
            ...(CLAUDE_CODE_SKIP_BEDROCK_AUTH &&
              bearerToken && {
                apiKey: bearerToken.match(/^Bearer (.+)$/i)?.[1] ?? bearerToken,
                defaultHeaders: {
                  ...forwardableEnvHeaders,
                  ...filteredCustomBetaHeaders(),
                  Authorization: bearerToken,
                  ...apiKeyHeaderFromEnv(),
                },
              }),
            ...(!CLAUDE_CODE_SKIP_BEDROCK_AUTH && managedAuthOptions),
            ...(!CLAUDE_CODE_SKIP_BEDROCK_AUTH &&
              hostManagedAuth && {
                providerChainResolver: hostManagedAwsSdkCredentials("Bedrock").providerChainResolver,
              }),
            ...(!CLAUDE_CODE_SKIP_BEDROCK_AUTH &&
              !hostManagedAuth && {
                providerChainResolver: defaultAwsProviderChainResolver(bedrockRegionForTier),
              }),
          });
    }
    await client.messages.create(sendStartupModelCheck(modelId));
    return {
      accessible: true,
    };
  } catch (error) {
    if (error?.status === 429)
      return {
        accessible: true,
      };
    return {
      accessible: false,
      error,
    };
  }
}
export {
  awsCredentialSelectors,
  checkBedrockDefaultAvailability,
  checkBedrockDocumentDefaults,
  findBedrockUpgradeCandidates,
  probeBedrockModel,
  rememberBedrockModelAccess,
  seedEnvDefaultForUserPin,
};
