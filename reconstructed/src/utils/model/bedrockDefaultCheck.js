/**
 * utils/model/bedrockDefaultCheck.ts
 *
 * 2.1.316 新增。检查 Bedrock 默认模型可用性并找升级候选。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cnamfjf8.js (16)
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
import { getInitialSettings_2 } from "../settings/settings.js";
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

//@ chunk-cnamfjf8.js:782-811 placement
function defaultBedrockOpusTier() {
  return tierConfig(DEFAULT_BEDROCK_OPUS_KEY);
}
//@ chunk-cnamfjf8.js:811-1829 placement
async function findBedrockUpgradeCandidates() {
  if (getAPIProvider() !== "bedrock") return [];
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) return [];
  let stalePins = collectStalePins(defaultBedrockOpusTier(), (u) =>
    u.includes("application-inference-profile"),
  );
  if (stalePins.length === 0) return [];
  logEvent("tengu_bedrock_upgrade_check", {
    stale_tiers: fromNumber(stalePins.length),
  });
  let o;
  try {
    o = await getBedrockInferenceProfiles();
  } catch {
    return [];
  }
  let bedrockRegionPrefix = getBedrockRegionPrefix(await resolveAwsRegion());
  let r = [];
  for (let stalePin of stalePins) {
    let firstParty = catalogEntriesByFirstPartyId[stalePin.defaultKey].firstParty;
    let firstMatch = findFirstMatch(o, firstParty, bedrockRegionPrefix);
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
    r.push({
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
      r.map(async (u) => {
        let k = await probeBedrockModel(u.toBedrockId, u.tier, {
          isDefault: true,
          versionTooOld: "unavailable",
        });
        logEvent("tengu_bedrock_probe_result", {
          tier: fromEnum(u.tier),
          model_id: telemetrySafeModelName(u.toBedrockId),
          accessible: k,
        });
        return k ? u : null;
      }),
    )
  ).filter((u) => u !== null);
  logForDebugging(`[bedrock-upgrade] tiersWithPin=${stalePins.length} candidates=${filtered.length}`);
  return filtered;
}
//@ chunk-cnamfjf8.js:1829-1863 placement
function seedEnvDefaultForUserPin(e) {
  return seedEnvDefaultForUserPin_2(e, defaultBedrockOpusTier());
}
//@ chunk-cnamfjf8.js:1863-3580 placement
/**
 * 检查 Bedrock 默认模型可用性并找升级候选。
 */
async function checkBedrockDefaultAvailability() {
  if (getAPIProvider() !== "bedrock") return [];
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) return [];
  let e = lastLiveRoundStart(Date.now());
  let modelOverrides = getInitialSettings_2().modelOverrides;
  let l = documentMayMoveTiers() ? await resolveAwsRegion() : undefined;
  let r = defaultBedrockOpusTier();
  let unpinnedTiers = collectUnpinnedTiers(r, modelOverrides);
  if (unpinnedTiers.length === 0) return [];
  logEvent("tengu_bedrock_default_check", {
    unpinned_tiers: fromNumber(unpinnedTiers.length),
  });
  let m;
  try {
    m = await getBedrockInferenceProfiles();
  } catch {
    m = [];
  }
  let u = l ?? (await resolveAwsRegion());
  let bedrockRegionPrefix = getBedrockRegionPrefix(u);
  let any = unpinnedTiers.some((unpinnedTier) => unpinnedTier.tier === "sonnet");
  let results = await Promise.all(
    unpinnedTiers.map(async (unpinnedTier) => {
      let h = catalogEntriesByFirstPartyId[unpinnedTier.defaultKey];
      let documentTarget = r[unpinnedTier.tier].documentTarget;
      let E = r[unpinnedTier.tier].fromDocument === true;
      let T =
        documentTarget === undefined
          ? undefined
          : tailorBedrockModelId(documentTarget.modelId, m, bedrockRegionPrefix);
      let n = T ?? resolveBedrockModelId(unpinnedTier.defaultKey, m, bedrockRegionPrefix);
      if (!n) return null;
      if (enforcedAllowlistLeavesOut(n)) {
        logForDebugging(`[bedrock-fallback] ${leftOutDebugLine(unpinnedTier.tier, "check", [n])}`);
        return null;
      }
      await checkDefaultsUnchecked(
        unpinnedTier,
        n,
        m,
        bedrockRegionPrefix,
        modelOverrides,
        documentTarget,
        E,
        any,
      );
      let p = {};
      let y = await probeBedrockModel(n, unpinnedTier.tier, {
        isDefault: true,
        ...(r[unpinnedTier.tier].fromDocument && {
          versionTooOld: "unavailable",
        }),
        onVerdict: (verdict, at) => {
          p.verdict = verdict;
          p.at = at;
        },
      });
      logEvent("tengu_bedrock_probe_result", {
        tier: fromEnum(unpinnedTier.tier),
        model_id: telemetrySafeModelName(n),
        accessible: y,
      });
      if (y || p.verdict === "temporary") return null;
      if (p.verdict === "refused")
        markModelRefused(n, modelNotAvailableError(n), (p.at ?? Date.now()) + REFUSED_TTL_MS);
      let upgradeCandidatesUnchecked = await findUpgradeCandidatesUnchecked(
        unpinnedTier.defaultKey,
        unpinnedTier.tier,
        m,
        bedrockRegionPrefix,
        modelOverrides,
        e,
        documentTarget !== undefined,
        E,
      );
      if (!upgradeCandidatesUnchecked) return null;
      if (p.verdict !== "refused") {
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
        if (p.verdict === "denied" && upgradeCandidatesUnchecked.adminMapped !== true) {
          markModelRefused(n, modelNotAvailableError(n), Date.now() + REFUSED_TTL_MS);
          rememberBedrockModelAccess(n, unpinnedTier.tier, "refused");
        }
      }
      let D = documentTarget?.name ?? getMarketingNameForModel(h.firstParty);
      let marketingNameForModel = getMarketingNameForModel(
        catalogEntriesByFirstPartyId[upgradeCandidatesUnchecked.key].firstParty,
      );
      if (!D || !marketingNameForModel) return null;
      return {
        tier: unpinnedTier.tier,
        envVar: unpinnedTier.envVar,
        defaultKey: unpinnedTier.defaultKey,
        defaultName: D,
        ...(T !== undefined && {
          documentTargetId: T,
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
  let _ = [];
  for (let s of results) if (s !== null) _.push(s);
  logForDebugging(`[bedrock-fallback] unpinnedTiers=${unpinnedTiers.length} fallbacks=${_.length}`);
  return _;
}
//@ chunk-cnamfjf8.js:3580-4056 placement
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
  let e = await refuteUnavailableDocumentDefaults(async (o, l) => {
    let r = {};
    let f = await probeBedrockModel(o, l, {
      isDefault: true,
      versionTooOld: "unavailable",
      onVerdict: (verdict) => {
        r.verdict = verdict;
      },
    });
    logEvent("tengu_bedrock_probe_result", {
      tier: fromEnum(l ?? "default"),
      model_id: telemetrySafeModelName(o),
      accessible: f,
    });
    return f || r.verdict === "temporary";
  }, getInitialSettings_2().modelOverrides);
  logForDebugging(`[bedrock-fallback] refutedDocumentDefaults=${e.length}`);
  return e;
}
//@ chunk-cnamfjf8.js:4056-4884 placement
/**
 * 检查 Bedrock 默认模型可用性
 */
async function checkDefaultsUnchecked(
  unpinnedTier,
  o,
  l,
  bedrockRegionPrefix,
  modelOverrides,
  documentTarget,
  u,
  k,
) {
  let g = (n, id) => ({
    id,
    name:
      getMarketingNameForModel(catalogEntriesByFirstPartyId[n].firstParty) ??
      catalogEntriesByFirstPartyId[n].firstParty,
  });
  let A = (n) => Boolean(modelOverrides?.[catalogEntriesByFirstPartyId[n].firstParty]);
  let _ = (n) => A(n) && !enforcedAllowlistLeavesOut(String(getModelStrings()[n]));
  let s = (n) =>
    n.flatMap((p) => {
      let bedrockModelId = resolveBedrockModelId(p, l, bedrockRegionPrefix);
      return bedrockModelId && !enforcedAllowlistLeavesOut(bedrockModelId) ? [g(p, bedrockModelId)] : [];
    });
  let h = (n, p) => s(predecessorsInTier(n, p).filter((y) => !A(y)));
  let b = predecessorsInTier(unpinnedTier.defaultKey, unpinnedTier.tier, documentTarget !== undefined);
  let E = u ? b.find(_) : undefined;
  let T = [
    documentTarget === undefined
      ? g(unpinnedTier.defaultKey, o)
      : {
          id: o,
          name: documentTarget.name,
        },
    ...s((E === undefined ? b : b.slice(0, b.indexOf(E))).filter((n) => !A(n))),
  ];
  if (E !== undefined) T.push(g(E, String(getModelStrings()[E])));
  else if (unpinnedTier.tier === "opus") {
    let bedrockModelId = resolveBedrockModelId(DEFAULT_3P_SONNET_KEY, l, bedrockRegionPrefix);
    let p = !bedrockModelId
      ? []
      : !enforcedAllowlistLeavesOut(bedrockModelId)
        ? [g(DEFAULT_3P_SONNET_KEY, bedrockModelId)]
        : k
          ? h(DEFAULT_3P_SONNET_KEY, "sonnet")
          : [];
    T.push(
      ...p.map((y) => ({
        ...y,
        crossTier: true,
      })),
    );
  }
  registerFallbackLadder("bedrock", unpinnedTier.tier, unpinnedTier.envVar, T);
  await Promise.all(
    T.slice(1).map(async (n) => {
      let tier = n.crossTier ? "sonnet" : unpinnedTier.tier;
      let y = await rememberedBedrockAccess(n.id, tier);
      if (y?.state === "refused") markModelRefused(n.id, modelNotAvailableError(n.id), y.at + REFUSED_TTL_MS);
    }),
  ).catch(() => {});
}
//@ chunk-cnamfjf8.js:4884-5002 placement
function resolveBedrockModelId(e, o, l) {
  let r = catalogEntriesByFirstPartyId[e];
  let firstMatch = findFirstMatch(o, r.firstParty, l);
  if (firstMatch) return firstMatch;
  if (!r.bedrock) return null;
  return withBedrockRegionPrefix(r.bedrock, l);
}
//@ chunk-cnamfjf8.js:5002-5073 placement
function tailorBedrockModelId(modelId, o, bedrockRegionPrefix) {
  let bedrockFoundationModelId = toBedrockFoundationModelId(modelId);
  return (
    (bedrockFoundationModelId === undefined
      ? undefined
      : pickProfileForFoundationModel(bedrockFoundationModelId, o, bedrockRegionPrefix)) ?? modelId
  );
}
//@ chunk-cnamfjf8.js:5073-6206 placement
/**
 * 找 Bedrock 升级候选
 */
async function findUpgradeCandidatesUnchecked(
  defaultKey,
  tier,
  l,
  bedrockRegionPrefix,
  modelOverrides,
  m,
  u = false,
  k = false,
) {
  let g = [];
  function A(d, D) {
    return d.flatMap((R) => {
      let bedrockModelId = resolveBedrockModelId(R, l, bedrockRegionPrefix);
      if (!bedrockModelId) return [];
      if (enforcedAllowlistLeavesOut(bedrockModelId)) {
        g.push(D === tier ? bedrockModelId : `${bedrockModelId} (the cross-tier Sonnet default)`);
        return [];
      }
      return [
        {
          key: R,
          regionalId: bedrockModelId,
          probeTier: D,
        },
      ];
    });
  }
  let _ = (d) => Boolean(modelOverrides?.[catalogEntriesByFirstPartyId[d].firstParty]);
  let s = (d) => _(d) && !enforcedAllowlistLeavesOut(String(getModelStrings()[d]));
  let h = predecessorsInTier(defaultKey, tier, u);
  let b = k ? h.find(s) : undefined;
  let filtered = (b === undefined ? h : h.slice(0, h.indexOf(b))).filter((d) => !_(d));
  let T = [A(filtered, tier)];
  if (tier === "opus" && b === undefined) T.push(A([DEFAULT_3P_SONNET_KEY], "sonnet"));
  if (g.length > 0) logForDebugging(`[bedrock-fallback] ${leftOutDebugLine(tier, "fallback", g)}`);
  let n = new Set();
  let p = (d) => ({
    onVerdict: (D, R) => {
      if (D === "refused")
        markModelRefused(
          d.regionalId,
          modelNotAvailableError(d.regionalId),
          (R ?? Date.now()) + REFUSED_TTL_MS,
        );
      else if (D === "accessible") {
        clearModelRefusal(d.regionalId);
        if (R === undefined) n.add(d.regionalId);
      }
    },
  });
  let firstAccessibleModel = await findFirstAccessibleModel(
    T,
    (d, D) =>
      probeBedrockModel(d.regionalId, d.probeTier, {
        ...(D && {
          live: D,
        }),
        ...(u &&
          d.key === defaultKey && {
            isDefault: true,
          }),
        ...(k && {
          versionTooOld: "unavailable",
        }),
        ...p(d),
      }),
    async (d) => (await rememberedBedrockAccess(d.regionalId, d.probeTier))?.state === "refused",
    m,
  );
  if (!firstAccessibleModel)
    return b === undefined
      ? null
      : {
          key: b,
          regionalId: String(getModelStrings()[b]),
          adminMapped: true,
        };
  return {
    key: firstAccessibleModel.key,
    regionalId: firstAccessibleModel.regionalId,
    ...(firstAccessibleModel.probeTier !== tier && {
      crossTier: true,
    }),
    ...(n.has(firstAccessibleModel.regionalId) && {
      answeredLive: true,
    }),
  };
}
//@ chunk-cnamfjf8.js:6206-6370 placement
async function probeBedrockModel(e, o, l) {
  let bedrockRegionForTier = await getBedrockRegionForTier(o);
  if (bedrockRegionForTier === undefined) {
    l?.onVerdict?.("temporary");
    return false;
  }
  return (
    (await checkRememberedModelAccess(
      "bedrock",
      await getBedrockClientCacheKey(bedrockRegionForTier),
      e,
      () => probeBedrockModelUnchecked(e, bedrockRegionForTier),
      l,
    )) === "accessible"
  );
}
//@ chunk-cnamfjf8.js:6370-6516 placement
async function rememberBedrockModelAccess(e, tier, l) {
  try {
    let bedrockRegionForTier = await getBedrockRegionForTier(tier);
    let f = bedrockRegionForTier && (await getBedrockClientCacheKey(bedrockRegionForTier));
    if (f) await recordAccessVerdict(f, e, l);
  } catch (error) {
    logForDebugging(`[3p-model-memory] bedrock record failed: ${error}`);
  }
}
//@ chunk-cnamfjf8.js:6516-6631 placement
async function getBedrockRegionForTier(e) {
  try {
    return (
      (e === "haiku" && nonEmptyOrUndefined(env.ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION)) ||
      (await resolveAwsRegion())
    );
  } catch {
    return;
  }
}
//@ chunk-cnamfjf8.js:6631-6770 placement
function getBedrockClientCacheKey(bedrockRegionForTier) {
  return PACKAGE_INFO("bedrock", () => [
    bedrockRegionForTier,
    env.ANTHROPIC_BEDROCK_BASE_URL,
    env.CLAUDE_CODE_SKIP_BEDROCK_AUTH ? "skip-auth" : undefined,
    ...awsCredentialSelectors(),
    getCustomHeaders(),
  ]);
}
//@ chunk-cnamfjf8.js:6770-6850 placement
async function rememberedBedrockAccess(e, o) {
  let bedrockRegionForTier = await getBedrockRegionForTier(o);
  let r = bedrockRegionForTier && (await getBedrockClientCacheKey(bedrockRegionForTier));
  return r ? rememberedAccess(r, e) : undefined;
}
//@ chunk-cnamfjf8.js:6850-7128 placement
function awsCredentialSelectors() {
  let initialSettings = getInitialSettings_2();
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
//@ chunk-cnamfjf8.js:7128-8356 placement
/**
 * 用 Bedrock 客户端探测模型
 */
async function probeBedrockModelUnchecked(e, bedrockRegionForTier) {
  try {
    let [{ AnthropicBedrock: l }, { getProxyFetchOptions: r }] = await Promise.all([
      import("./chunk-h87x8cg3.js"),
      import("./chunk-amdegp7s.js"),
    ]);
    let f = {
      awsRegion: bedrockRegionForTier,
      maxRetries: 0,
      timeout: 8000,
      fetchOptions: r({
        url:
          env.ANTHROPIC_BEDROCK_BASE_URL || `https://bedrock-runtime.${bedrockRegionForTier}.amazonaws.com`,
      }),
    };
    let m;
    let forwardableEnvHeaders = getForwardableEnvHeaders();
    let AWS_BEARER_TOKEN_BEDROCK = env.AWS_BEARER_TOKEN_BEDROCK;
    if (AWS_BEARER_TOKEN_BEDROCK)
      m = new l({
        ...f,
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
      let A = isHostManagedProviderAuth();
      let _ = {
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
      let s = CLAUDE_CODE_SKIP_BEDROCK_AUTH ? bearerFromEnvOrHeaders() : undefined;
      let h = CLAUDE_CODE_SKIP_BEDROCK_AUTH || A ? null : await refreshAndGetAwsCredentials();
      m = h
        ? new l({
            ...f,
            ..._,
            awsAccessKey: h.accessKeyId,
            awsSecretKey: h.secretAccessKey,
            awsSessionToken: h.sessionToken,
          })
        : new l({
            ...f,
            ...(CLAUDE_CODE_SKIP_BEDROCK_AUTH &&
              !s && {
                skipAuth: true,
                authToken: null,
                defaultHeaders: {
                  ...forwardableEnvHeaders,
                  ...filteredCustomBetaHeaders(),
                },
                ...CLOUD_AUTH_SLOT,
              }),
            ...(CLAUDE_CODE_SKIP_BEDROCK_AUTH &&
              s && {
                apiKey: s.match(/^Bearer (.+)$/i)?.[1] ?? s,
                defaultHeaders: {
                  ...forwardableEnvHeaders,
                  ...filteredCustomBetaHeaders(),
                  Authorization: s,
                  ...apiKeyHeaderFromEnv(),
                },
              }),
            ...(!CLAUDE_CODE_SKIP_BEDROCK_AUTH && _),
            ...(!CLAUDE_CODE_SKIP_BEDROCK_AUTH &&
              A && {
                providerChainResolver: hostManagedAwsSdkCredentials("Bedrock").providerChainResolver,
              }),
            ...(!CLAUDE_CODE_SKIP_BEDROCK_AUTH &&
              !A && {
                providerChainResolver: defaultAwsProviderChainResolver(bedrockRegionForTier),
              }),
          });
    }
    await m.messages.create(sendStartupModelCheck(e));
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
export { awsCredentialSelectors };
