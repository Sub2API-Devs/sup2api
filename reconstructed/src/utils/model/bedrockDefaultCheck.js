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
import { No } from "./modelCatalog.js";
import { logForDebugging } from "../debug.js";
import { telemetrySafeModelName } from "./telemetryModelName.js";
import { getInitialSettings_2 } from "../settings/settings.js";
import {
  markModelRefused,
  modelNotAvailableError,
  registerFallbackLadder,
  cmr,
} from "./modelUnavailability.js";
import {
  REFUSED_TTL_MS,
  findFirstAccessibleModel,
  checkRememberedModelAccess,
  bze,
  PACKAGE_INFO,
  getCustomHeaders,
  _ze,
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
function M() {
  return tierConfig(DEFAULT_BEDROCK_OPUS_KEY);
}
//@ chunk-cnamfjf8.js:811-1829 placement
async function findBedrockUpgradeCandidates() {
  if (getAPIProvider() !== "bedrock") return [];
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) return [];
  let e = collectStalePins(M(), (u) => u.includes("application-inference-profile"));
  if (e.length === 0) return [];
  logEvent("tengu_bedrock_upgrade_check", { stale_tiers: fromNumber(e.length) });
  let o;
  try {
    o = await getBedrockInferenceProfiles();
  } catch {
    return [];
  }
  let l = getBedrockRegionPrefix(await resolveAwsRegion()),
    r = [];
  for (let u of e) {
    let firstParty = No[u.defaultKey].firstParty,
      g = findFirstMatch(o, firstParty, l);
    if (!g) continue;
    if (enforcedAllowlistLeavesOut(g)) {
      logForDebugging(`[bedrock-upgrade] ${leftOutDebugLine(u.tier, "upgrade", [g])}`);
      continue;
    }
    let A = getMarketingNameForModel(No[u.pinnedKey].firstParty),
      _ = getMarketingNameForModel(No[u.defaultKey].firstParty);
    if (!A || !_) continue;
    r.push({
      tier: u.tier,
      envVar: u.envVar,
      fromKey: u.pinnedKey,
      fromMarketingName: A,
      toKey: u.defaultKey,
      toMarketingName: _,
      toBedrockId: g,
    });
  }
  let filtered = (
    await Promise.all(
      r.map(async (u) => {
        let k = await probeBedrockModel(u.toBedrockId, u.tier, {
          isDefault: !0,
          versionTooOld: "unavailable",
        });
        return (
          logEvent("tengu_bedrock_probe_result", {
            tier: fromEnum(u.tier),
            model_id: telemetrySafeModelName(u.toBedrockId),
            accessible: k,
          }),
          k ? u : null
        );
      }),
    )
  ).filter((u) => u !== null);
  return (
    logForDebugging(`[bedrock-upgrade] tiersWithPin=${e.length} candidates=${filtered.length}`),
    filtered
  );
}
//@ chunk-cnamfjf8.js:1829-1863 placement
function seedEnvDefaultForUserPin(e) {
  return seedEnvDefaultForUserPin_2(e, M());
}
/**
 * 检查 Bedrock 默认模型可用性并找升级候选。
 */
//@ chunk-cnamfjf8.js:1863-3580 placement
async function checkBedrockDefaultAvailability() {
  if (getAPIProvider() !== "bedrock") return [];
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) return [];
  let e = lastLiveRoundStart(Date.now()),
    modelOverrides = getInitialSettings_2().modelOverrides,
    l = documentMayMoveTiers() ? await resolveAwsRegion() : void 0,
    r = M(),
    f = collectUnpinnedTiers(r, modelOverrides);
  if (f.length === 0) return [];
  logEvent("tengu_bedrock_default_check", { unpinned_tiers: fromNumber(f.length) });
  let m;
  try {
    m = await getBedrockInferenceProfiles();
  } catch {
    m = [];
  }
  let u = l ?? (await resolveAwsRegion()),
    k = getBedrockRegionPrefix(u),
    any = f.some((s) => s.tier === "sonnet"),
    results = await Promise.all(
      f.map(async (s) => {
        let h = No[s.defaultKey],
          documentTarget = r[s.tier].documentTarget,
          E = r[s.tier].fromDocument === !0,
          T = documentTarget === void 0 ? void 0 : O(documentTarget.modelId, m, k),
          n = T ?? resolveBedrockModelId(s.defaultKey, m, k);
        if (!n) return null;
        if (enforcedAllowlistLeavesOut(n))
          return (logForDebugging(`[bedrock-fallback] ${leftOutDebugLine(s.tier, "check", [n])}`), null);
        await checkDefaultsUnchecked(s, n, m, k, modelOverrides, documentTarget, E, any);
        let p = {},
          y = await probeBedrockModel(n, s.tier, {
            isDefault: !0,
            ...(r[s.tier].fromDocument && { versionTooOld: "unavailable" }),
            onVerdict: (v, C) => {
              ((p.verdict = v), (p.at = C));
            },
          });
        if (
          (logEvent("tengu_bedrock_probe_result", {
            tier: fromEnum(s.tier),
            model_id: telemetrySafeModelName(n),
            accessible: y,
          }),
          y || p.verdict === "temporary")
        )
          return null;
        if (p.verdict === "refused")
          markModelRefused(n, modelNotAvailableError(n), (p.at ?? Date.now()) + REFUSED_TTL_MS);
        let d = await findUpgradeCandidatesUnchecked(
          s.defaultKey,
          s.tier,
          m,
          k,
          modelOverrides,
          e,
          documentTarget !== void 0,
          E,
        );
        if (!d) return null;
        if (p.verdict !== "refused") {
          if (!(
            d.answeredLive === !0 ||
            d.adminMapped === !0 ||
            (await probeBedrockModel(d.regionalId, d.crossTier ? "sonnet" : s.tier, { live: !0 }))
          ))
            return null;
          if (p.verdict === "denied" && d.adminMapped !== !0)
            (markModelRefused(n, modelNotAvailableError(n), Date.now() + REFUSED_TTL_MS),
              rememberBedrockModelAccess(n, s.tier, "refused"));
        }
        let D = documentTarget?.name ?? getMarketingNameForModel(h.firstParty),
          R = getMarketingNameForModel(No[d.key].firstParty);
        if (!D || !R) return null;
        return {
          tier: s.tier,
          envVar: s.envVar,
          defaultKey: s.defaultKey,
          defaultName: D,
          ...(T !== void 0 && { documentTargetId: T }),
          fallbackKey: d.key,
          fallbackName: R,
          fallbackBedrockId: d.regionalId,
          ...(d.crossTier && { crossTier: !0 }),
        };
      }),
    ),
    _ = [];
  for (let s of results) if (s !== null) _.push(s);
  return (logForDebugging(`[bedrock-fallback] unpinnedTiers=${f.length} fallbacks=${_.length}`), _);
}
//@ chunk-cnamfjf8.js:3580-4056 placement
async function checkBedrockDocumentDefaults() {
  if (
    getAPIProvider() !== "bedrock" ||
    env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST ||
    !documentNamesCloudDefault()
  )
    return [];
  (await resolveAwsRegion(),
    await getBedrockInferenceProfiles().catch(() => {
      return;
    }));
  let e = await refuteUnavailableDocumentDefaults(async (o, l) => {
    let r = {},
      f = await probeBedrockModel(o, l, {
        isDefault: !0,
        versionTooOld: "unavailable",
        onVerdict: (m) => {
          r.verdict = m;
        },
      });
    return (
      logEvent("tengu_bedrock_probe_result", {
        tier: fromEnum(l ?? "default"),
        model_id: telemetrySafeModelName(o),
        accessible: f,
      }),
      f || r.verdict === "temporary"
    );
  }, getInitialSettings_2().modelOverrides);
  return (logForDebugging(`[bedrock-fallback] refutedDocumentDefaults=${e.length}`), e);
}
/**
 * 检查 Bedrock 默认模型可用性
 */
//@ chunk-cnamfjf8.js:4056-4884 placement
async function checkDefaultsUnchecked(e, o, l, r, f, m, u, k) {
  let g = (n, p) => ({ id: p, name: getMarketingNameForModel(No[n].firstParty) ?? No[n].firstParty }),
    A = (n) => Boolean(f?.[No[n].firstParty]),
    _ = (n) => A(n) && !enforcedAllowlistLeavesOut(String(getModelStrings()[n])),
    s = (n) =>
      n.flatMap((p) => {
        let y = resolveBedrockModelId(p, l, r);
        return y && !enforcedAllowlistLeavesOut(y) ? [g(p, y)] : [];
      }),
    h = (n, p) => s(predecessorsInTier(n, p).filter((y) => !A(y))),
    b = predecessorsInTier(e.defaultKey, e.tier, m !== void 0),
    E = u ? b.find(_) : void 0,
    T = [
      m === void 0 ? g(e.defaultKey, o) : { id: o, name: m.name },
      ...s((E === void 0 ? b : b.slice(0, b.indexOf(E))).filter((n) => !A(n))),
    ];
  if (E !== void 0) T.push(g(E, String(getModelStrings()[E])));
  else if (e.tier === "opus") {
    let n = resolveBedrockModelId(DEFAULT_3P_SONNET_KEY, l, r),
      p = !n
        ? []
        : !enforcedAllowlistLeavesOut(n)
          ? [g(DEFAULT_3P_SONNET_KEY, n)]
          : k
            ? h(DEFAULT_3P_SONNET_KEY, "sonnet")
            : [];
    T.push(...p.map((y) => ({ ...y, crossTier: !0 })));
  }
  (registerFallbackLadder("bedrock", e.tier, e.envVar, T),
    await Promise.all(
      T.slice(1).map(async (n) => {
        let p = n.crossTier ? "sonnet" : e.tier,
          y = await I(n.id, p);
        if (y?.state === "refused")
          markModelRefused(n.id, modelNotAvailableError(n.id), y.at + REFUSED_TTL_MS);
      }),
    ).catch(() => {}));
}
//@ chunk-cnamfjf8.js:4884-5002 placement
function resolveBedrockModelId(e, o, l) {
  let r = No[e],
    f = findFirstMatch(o, r.firstParty, l);
  if (f) return f;
  if (!r.bedrock) return null;
  return withBedrockRegionPrefix(r.bedrock, l);
}
//@ chunk-cnamfjf8.js:5002-5073 placement
function O(e, o, l) {
  let r = toBedrockFoundationModelId(e);
  return (r === void 0 ? void 0 : pickProfileForFoundationModel(r, o, l)) ?? e;
}
/**
 * 找 Bedrock 升级候选
 */
//@ chunk-cnamfjf8.js:5073-6206 placement
async function findUpgradeCandidatesUnchecked(e, o, l, r, f, m, u = !1, k = !1) {
  let g = [];
  function A(d, D) {
    return d.flatMap((R) => {
      let v = resolveBedrockModelId(R, l, r);
      if (!v) return [];
      if (enforcedAllowlistLeavesOut(v))
        return (g.push(D === o ? v : `${v} (the cross-tier Sonnet default)`), []);
      return [{ key: R, regionalId: v, probeTier: D }];
    });
  }
  let _ = (d) => Boolean(f?.[No[d].firstParty]),
    s = (d) => _(d) && !enforcedAllowlistLeavesOut(String(getModelStrings()[d])),
    h = predecessorsInTier(e, o, u),
    b = k ? h.find(s) : void 0,
    filtered = (b === void 0 ? h : h.slice(0, h.indexOf(b))).filter((d) => !_(d)),
    T = [A(filtered, o)];
  if (o === "opus" && b === void 0) T.push(A([DEFAULT_3P_SONNET_KEY], "sonnet"));
  if (g.length > 0) logForDebugging(`[bedrock-fallback] ${leftOutDebugLine(o, "fallback", g)}`);
  let n = new Set(),
    p = (d) => ({
      onVerdict: (D, R) => {
        if (D === "refused")
          markModelRefused(
            d.regionalId,
            modelNotAvailableError(d.regionalId),
            (R ?? Date.now()) + REFUSED_TTL_MS,
          );
        else if (D === "accessible") {
          if ((cmr(d.regionalId), R === void 0)) n.add(d.regionalId);
        }
      },
    }),
    y = await findFirstAccessibleModel(
      T,
      (d, D) =>
        probeBedrockModel(d.regionalId, d.probeTier, {
          ...(D && { live: D }),
          ...(u && d.key === e && { isDefault: !0 }),
          ...(k && { versionTooOld: "unavailable" }),
          ...p(d),
        }),
      async (d) => (await I(d.regionalId, d.probeTier))?.state === "refused",
      m,
    );
  if (!y) return b === void 0 ? null : { key: b, regionalId: String(getModelStrings()[b]), adminMapped: !0 };
  return {
    key: y.key,
    regionalId: y.regionalId,
    ...(y.probeTier !== o && { crossTier: !0 }),
    ...(n.has(y.regionalId) && { answeredLive: !0 }),
  };
}
//@ chunk-cnamfjf8.js:6206-6370 placement
async function probeBedrockModel(e, o, l) {
  let r = await getBedrockRegionForTier(o);
  if (r === void 0) return (l?.onVerdict?.("temporary"), !1);
  return (
    (await checkRememberedModelAccess(
      "bedrock",
      await getBedrockClientCacheKey(r),
      e,
      () => probeBedrockModelUnchecked(e, r),
      l,
    )) === "accessible"
  );
}
//@ chunk-cnamfjf8.js:6370-6516 placement
async function rememberBedrockModelAccess(e, o, l) {
  try {
    let r = await getBedrockRegionForTier(o),
      f = r && (await getBedrockClientCacheKey(r));
    if (f) await bze(f, e, l);
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
function getBedrockClientCacheKey(e) {
  return PACKAGE_INFO("bedrock", () => [
    e,
    env.ANTHROPIC_BEDROCK_BASE_URL,
    env.CLAUDE_CODE_SKIP_BEDROCK_AUTH ? "skip-auth" : void 0,
    ...awsCredentialSelectors(),
    getCustomHeaders(),
  ]);
}
//@ chunk-cnamfjf8.js:6770-6850 placement
async function I(e, o) {
  let l = await getBedrockRegionForTier(o),
    r = l && (await getBedrockClientCacheKey(l));
  return r ? _ze(r, e) : void 0;
}
//@ chunk-cnamfjf8.js:6850-7128 placement
function awsCredentialSelectors() {
  let e = getInitialSettings_2();
  return [
    env.AWS_PROFILE,
    env.AWS_CONFIG_FILE,
    env.AWS_SHARED_CREDENTIALS_FILE,
    env.AWS_ACCESS_KEY_ID,
    env.AWS_ROLE_ARN,
    env.AWS_WEB_IDENTITY_TOKEN_FILE,
    env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI,
    env.AWS_CONTAINER_CREDENTIALS_FULL_URI,
    e.awsCredentialExport,
    e.awsAuthRefresh,
  ];
}
/**
 * 用 Bedrock 客户端探测模型
 */
//@ chunk-cnamfjf8.js:7128-8356 placement
async function probeBedrockModelUnchecked(e, o) {
  try {
    let [{ AnthropicBedrock: l }, { getProxyFetchOptions: r }] = await Promise.all([
        import("./chunk-h87x8cg3.js"),
        import("./chunk-amdegp7s.js"),
      ]),
      f = {
        awsRegion: o,
        maxRetries: 0,
        timeout: 8000,
        fetchOptions: r({
          url: env.ANTHROPIC_BEDROCK_BASE_URL || `https://bedrock-runtime.${o}.amazonaws.com`,
        }),
      },
      m,
      u = getForwardableEnvHeaders(),
      AWS_BEARER_TOKEN_BEDROCK = env.AWS_BEARER_TOKEN_BEDROCK;
    if (AWS_BEARER_TOKEN_BEDROCK)
      m = new l({
        ...f,
        apiKey: AWS_BEARER_TOKEN_BEDROCK,
        defaultHeaders: {
          ...u,
          ...clearAuthorizationHeaders(),
          ...filteredCustomBetaHeaders(),
          Authorization: `Bearer ${AWS_BEARER_TOKEN_BEDROCK}`,
          ...(!hasCustomApiKeyHeader() && { "X-Api-Key": null }),
        },
      });
    else {
      let CLAUDE_CODE_SKIP_BEDROCK_AUTH = env.CLAUDE_CODE_SKIP_BEDROCK_AUTH,
        A = isHostManagedProviderAuth(),
        _ = {
          authToken: null,
          defaultHeaders: {
            ...u,
            ...clearAuthorizationHeaders(),
            ...filteredCustomBetaHeaders(),
            Authorization: null,
            ...(!hasCustomApiKeyHeader() && { "X-Api-Key": null }),
          },
          ...CLOUD_AUTH_SLOT,
        },
        s = CLAUDE_CODE_SKIP_BEDROCK_AUTH ? bearerFromEnvOrHeaders() : void 0,
        h = CLAUDE_CODE_SKIP_BEDROCK_AUTH || A ? null : await refreshAndGetAwsCredentials();
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
                skipAuth: !0,
                authToken: null,
                defaultHeaders: { ...u, ...filteredCustomBetaHeaders() },
                ...CLOUD_AUTH_SLOT,
              }),
            ...(CLAUDE_CODE_SKIP_BEDROCK_AUTH &&
              s && {
                apiKey: s.match(/^Bearer (.+)$/i)?.[1] ?? s,
                defaultHeaders: {
                  ...u,
                  ...filteredCustomBetaHeaders(),
                  Authorization: s,
                  ...apiKeyHeaderFromEnv(),
                },
              }),
            ...(!CLAUDE_CODE_SKIP_BEDROCK_AUTH && _),
            ...(!CLAUDE_CODE_SKIP_BEDROCK_AUTH &&
              A && { providerChainResolver: hostManagedAwsSdkCredentials("Bedrock").providerChainResolver }),
            ...(!CLAUDE_CODE_SKIP_BEDROCK_AUTH &&
              !A && { providerChainResolver: defaultAwsProviderChainResolver(o) }),
          });
    }
    return (await m.messages.create(sendStartupModelCheck(e)), { accessible: !0 });
  } catch (error) {
    if (error?.status === 429) return { accessible: !0 };
    return { accessible: !1, error: error };
  }
}

export { awsCredentialSelectors };
