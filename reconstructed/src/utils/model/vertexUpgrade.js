/**
 * utils/model/vertexUpgrade.ts
 *
 * 2.1.316 新增：Vertex 默认模型可用性检查与升级候选。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5wnerh16.js (12)
 * attribution: placement 12
 */
import {
  tierConfig,
  collectStalePins,
  enforcedAllowlistLeavesOut,
  leftOutDebugLine,
  seedEnvDefaultForUserPin,
  lastLiveRoundStart,
  collectUnpinnedTiers,
  predecessorsInTier,
  refuteUnavailableDocumentDefaults,
} from "./stalePins.js";
import { DEFAULT_VERTEX_OPUS_KEY, getMarketingNameForModel, DEFAULT_3P_SONNET_KEY } from "./model.js";
import { getAPIProvider } from "./providers.js";
import { env } from "../env.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromNumber, fromEnum } from "../../services/analytics/safeMetadata.js";
import { catalogEntriesByFirstPartyId } from "./modelCatalog.js";
import { logForDebugging } from "../debug.js";
import { telemetrySafeModelName } from "./telemetryModelName.js";
import { getInitialSettings_2 } from "../settings/settings.js";
import {
  markModelRefused,
  modelNotAvailableError,
  clearModelRefusal,
  registerFallbackLadder,
} from "./modelUnavailability.js";
import {
  REFUSED_TTL_MS,
  findFirstAccessibleModel,
  rememberedAccess,
  checkRememberedModelAccess,
  recordAccessVerdict,
  PACKAGE_INFO,
  getCustomHeaders,
} from "./thirdPartyModelAccess.js";
import { getModelStrings } from "./modelStrings.js";
import { documentNamesCloudDefault } from "./planModeModel.js";
import {
  getConfiguredVertexProjectId,
  isHostManagedProviderAuth,
  refreshGcpCredentialsIfNeeded,
} from "../auth.js";
import { getVertexRegionForModel, getVertexBaseUrlForRegion } from "../envUtils.js";
import {
  buildVertexGoogleAuth,
  suppressVertexAuthRejection,
  vertexResidualCredentialPins,
} from "../../services/api/vertexAuth.js";
import { bearerFromEnvOrHeaders, CLOUD_AUTH_SLOT } from "../../services/api/customHeaders.js";
import { getForwardableEnvHeaders } from "../../services/api/requestHeaders.js";
import { sendStartupModelCheck } from "./modelAccessCheck.js";

//@ chunk-5wnerh16.js:3691-3720 placement
function defaultVertexOpusTier() {
  return tierConfig(DEFAULT_VERTEX_OPUS_KEY);
}
//@ chunk-5wnerh16.js:3720-4564 placement
async function findVertexUpgradeCandidates() {
  if (getAPIProvider() !== "vertex") return [];
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) return [];
  let stalePins = collectStalePins(defaultVertexOpusTier());
  if (stalePins.length === 0) return [];
  logEvent("tengu_vertex_upgrade_check", {
    stale_tiers: fromNumber(stalePins.length),
  });
  let filtered = (
    await Promise.all(
      stalePins.map(async (stalePin) => {
        let vertex = catalogEntriesByFirstPartyId[stalePin.defaultKey].vertex;
        if (vertex === null) return null;
        if (enforcedAllowlistLeavesOut(vertex)) {
          logForDebugging(`[vertex-upgrade] ${leftOutDebugLine(stalePin.tier, "upgrade", [vertex])}`);
          return null;
        }
        let g = await probeVertexModel(vertex, {
          isDefault: true,
          versionTooOld: "unavailable",
        });
        logEvent("tengu_vertex_probe_result", {
          tier: fromEnum(stalePin.tier),
          model_id: telemetrySafeModelName(vertex),
          accessible: g,
        });
        if (!g) return null;
        let marketingNameForModel = getMarketingNameForModel(
          catalogEntriesByFirstPartyId[stalePin.pinnedKey].firstParty,
        );
        let marketingNameForModel_2 = getMarketingNameForModel(
          catalogEntriesByFirstPartyId[stalePin.defaultKey].firstParty,
        );
        if (!marketingNameForModel || !marketingNameForModel_2) return null;
        return {
          tier: stalePin.tier,
          envVar: stalePin.envVar,
          fromKey: stalePin.pinnedKey,
          fromMarketingName: marketingNameForModel,
          toKey: stalePin.defaultKey,
          toMarketingName: marketingNameForModel_2,
          toVertexId: vertex,
        };
      }),
    )
  ).filter((n) => n !== null);
  logForDebugging(`[vertex-upgrade] tiersWithPin=${stalePins.length} candidates=${filtered.length}`);
  return filtered;
}
//@ chunk-5wnerh16.js:4564-4597 placement
function seedUserPinEnvDefault(e) {
  return seedEnvDefaultForUserPin(e, defaultVertexOpusTier());
}
//@ chunk-5wnerh16.js:4597-6038 placement
async function checkVertexDefaultAvailability() {
  if (getAPIProvider() !== "vertex") return [];
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) return [];
  let deadline = lastLiveRoundStart(Date.now());
  let modelOverrides = getInitialSettings_2().modelOverrides;
  let d = defaultVertexOpusTier();
  let unpinnedTiers = collectUnpinnedTiers(d, modelOverrides);
  if (unpinnedTiers.length === 0) return [];
  logEvent("tengu_vertex_default_check", {
    unpinned_tiers: fromNumber(unpinnedTiers.length),
  });
  let includeCrossTier = unpinnedTiers.some((unpinnedTier) => unpinnedTier.tier === "sonnet");
  let results = await Promise.all(
    unpinnedTiers.map(async (unpinnedTier) => {
      let _ = catalogEntriesByFirstPartyId[unpinnedTier.defaultKey];
      let documentTarget = d[unpinnedTier.tier].documentTarget;
      let V = d[unpinnedTier.tier].fromDocument === true;
      let y = documentTarget?.modelId ?? _.vertex;
      if (y !== null && enforcedAllowlistLeavesOut(y)) {
        logForDebugging(`[vertex-fallback] ${leftOutDebugLine(unpinnedTier.tier, "check", [y])}`);
        return null;
      }
      await registerVertexLadder(unpinnedTier, modelOverrides, documentTarget, V, includeCrossTier);
      let p = {};
      let b = await probeVertexModel(y, {
        isDefault: true,
        ...(d[unpinnedTier.tier].fromDocument && {
          versionTooOld: "unavailable",
        }),
        onVerdict: (verdict, at) => {
          p.verdict = verdict;
          p.at = at;
        },
      });
      logEvent("tengu_vertex_probe_result", {
        tier: fromEnum(unpinnedTier.tier),
        model_id: telemetrySafeModelName(y),
        accessible: b,
      });
      if (b || p.verdict === "temporary") return null;
      if (y !== null && p.verdict === "refused")
        markModelRefused(y, modelNotAvailableError(y), (p.at ?? Date.now()) + REFUSED_TTL_MS);
      let vertexFallback = await findVertexFallback(
        unpinnedTier.defaultKey,
        unpinnedTier.tier,
        modelOverrides,
        deadline,
        documentTarget !== undefined,
        V,
      );
      if (!vertexFallback) return null;
      if (
        p.verdict !== "refused" &&
        vertexFallback.answeredLive !== true &&
        vertexFallback.adminMapped !== true &&
        !(await probeVertexModel(vertexFallback.vertexId, {
          live: true,
        }))
      )
        return null;
      let l = documentTarget?.name ?? getMarketingNameForModel(_.firstParty);
      let marketingNameForModel = getMarketingNameForModel(
        catalogEntriesByFirstPartyId[vertexFallback.key].firstParty,
      );
      if (!l || !marketingNameForModel) return null;
      return {
        tier: unpinnedTier.tier,
        envVar: unpinnedTier.envVar,
        defaultKey: unpinnedTier.defaultKey,
        defaultName: l,
        ...(documentTarget !== undefined && {
          documentTargetId: documentTarget.modelId,
        }),
        fallbackKey: vertexFallback.key,
        fallbackName: marketingNameForModel,
        fallbackVertexId: vertexFallback.vertexId,
        ...(vertexFallback.crossTier && {
          crossTier: true,
        }),
      };
    }),
  );
  let v = [];
  for (let o of results) if (o !== null) v.push(o);
  logForDebugging(`[vertex-fallback] unpinnedTiers=${unpinnedTiers.length} fallbacks=${v.length}`);
  return v;
}
//@ chunk-5wnerh16.js:6038-7099 placement
/**
 * 为 Vertex 默认模型寻找可用的回退：按同档前代模型（排除已映射与被白名单排除者）及 Opus 跨档 Sonnet 默认依次探测，记录拒绝/可用结论，返回选中的键与 Vertex id。
 */
async function findVertexFallback(
  defaultKey,
  tier,
  accessMap,
  deadline,
  isDefault = false,
  versionTooOld = false,
) {
  let isMapped = (f) => Boolean(accessMap?.[catalogEntriesByFirstPartyId[f].firstParty]);
  let isUsable = (f) => isMapped(f) && !enforcedAllowlistLeavesOut(String(getModelStrings()[f]));
  let predecessors = predecessorsInTier(defaultKey, tier, isDefault);
  let adminMapped = versionTooOld ? predecessors.find(isUsable) : undefined;
  let filtered = (
    adminMapped === undefined ? predecessors : predecessors.slice(0, predecessors.indexOf(adminMapped))
  ).filter((f) => !isMapped(f));
  let filtered_2 = filtered.filter((f) => !vertexVariantFor(f));
  let needsCrossTier = tier === "opus" && adminMapped === undefined;
  let crossTierKeys =
    needsCrossTier && !vertexVariantFor(DEFAULT_3P_SONNET_KEY) ? [DEFAULT_3P_SONNET_KEY] : [];
  let mapped = filtered.filter(vertexVariantFor).map((f) => String(catalogEntriesByFirstPartyId[f].vertex));
  if (needsCrossTier && vertexVariantFor(DEFAULT_3P_SONNET_KEY))
    mapped.push(
      `${catalogEntriesByFirstPartyId[DEFAULT_3P_SONNET_KEY].vertex} (the cross-tier Sonnet default)`,
    );
  if (mapped.length > 0) logForDebugging(`[vertex-fallback] ${leftOutDebugLine(tier, "fallback", mapped)}`);
  let answeredLive = new Set();
  let found = await findFirstAccessibleModel(
    [filtered_2, crossTierKeys],
    (f, D) => {
      let vertex = catalogEntriesByFirstPartyId[f].vertex;
      return probeVertexModel(vertex, {
        ...(D && {
          live: D,
        }),
        ...(isDefault &&
          f === defaultKey && {
            isDefault: true,
          }),
        ...(versionTooOld && {
          versionTooOld: "unavailable",
        }),
        onVerdict: (k, h) => {
          if (k === "refused" && vertex !== null)
            markModelRefused(vertex, modelNotAvailableError(vertex), (h ?? Date.now()) + REFUSED_TTL_MS);
          else if (k === "accessible" && vertex !== null) {
            clearModelRefusal(vertex);
            if (h === undefined) answeredLive.add(f);
          }
        },
      });
    },
    async (f) => {
      let vertex = catalogEntriesByFirstPartyId[f].vertex;
      if (vertex === null) return false;
      let vertexCacheKey = await getVertexCacheKey(vertex);
      return (
        vertexCacheKey !== undefined && (await rememberedAccess(vertexCacheKey, vertex))?.state === "refused"
      );
    },
    deadline,
  );
  if (found === undefined)
    return adminMapped === undefined
      ? null
      : {
          key: adminMapped,
          vertexId: String(getModelStrings()[adminMapped]),
          adminMapped: true,
        };
  return {
    key: found,
    vertexId: catalogEntriesByFirstPartyId[found].vertex,
    ...(crossTierKeys.includes(found) && {
      crossTier: true,
    }),
    ...(answeredLive.has(found) && {
      answeredLive: true,
    }),
  };
}
//@ chunk-5wnerh16.js:7099-7524 placement
async function checkVertexDocumentDefaults() {
  if (
    getAPIProvider() !== "vertex" ||
    env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST ||
    !documentNamesCloudDefault()
  )
    return [];
  let e = await refuteUnavailableDocumentDefaults(async (s, d) => {
    let n = {};
    let u = await probeVertexModel(s, {
      isDefault: true,
      versionTooOld: "unavailable",
      onVerdict: (verdict) => {
        n.verdict = verdict;
      },
    });
    logEvent("tengu_vertex_probe_result", {
      tier: fromEnum(d ?? "default"),
      model_id: telemetrySafeModelName(s),
      accessible: u,
    });
    return u || n.verdict === "temporary";
  }, getInitialSettings_2().modelOverrides);
  logForDebugging(`[vertex-fallback] refutedDocumentDefaults=${e.length}`);
  return e;
}
//@ chunk-5wnerh16.js:7524-7660 placement
async function probeVertexModel(e, s) {
  if (e === null) {
    s?.onVerdict?.("refused");
    return false;
  }
  return (
    (await checkRememberedModelAccess(
      "vertex",
      await getVertexCacheKey(e),
      e,
      () => sendVertexStartupCheck(e),
      s,
    )) === "accessible"
  );
}
//@ chunk-5wnerh16.js:7660-7795 placement
async function rememberVertexModelAccess(e, s) {
  try {
    let vertexCacheKey = await getVertexCacheKey(e);
    if (vertexCacheKey !== undefined) await recordAccessVerdict(vertexCacheKey, e, s);
  } catch (error) {
    logForDebugging(`[3p-model-memory] vertex record failed: ${error}`);
  }
}
//@ chunk-5wnerh16.js:7795-8720 placement
/**
 * 为 Vertex 某档注册回退阶梯（默认模型、前代模型、管理员映射或跨档 Sonnet），并把记忆中已被拒绝的阶梯模型标记为拒绝。
 */
async function registerVertexLadder(tierInfo, accessMap, documentTarget, preferAdmin, includeCrossTier) {
  let toRung = (r) => {
    let l = catalogEntriesByFirstPartyId[r];
    return l.vertex === null
      ? undefined
      : {
          id: l.vertex,
          name: getMarketingNameForModel(l.firstParty) ?? l.firstParty,
        };
  };
  let head =
    documentTarget === undefined
      ? toRung(tierInfo.defaultKey)
      : {
          id: documentTarget.modelId,
          name: documentTarget.name,
        };
  if (head === undefined) return;
  let isMapped = (r) => Boolean(accessMap?.[catalogEntriesByFirstPartyId[r].firstParty]);
  let isUsable = (r) => isMapped(r) && !enforcedAllowlistLeavesOut(String(getModelStrings()[r]));
  let toRungs = (r) => r.filter((l) => !vertexVariantFor(l)).flatMap((l) => toRung(l) ?? []);
  let predecessorRungs = (r, l) => toRungs(predecessorsInTier(r, l).filter((x) => !isMapped(x)));
  let predecessors = predecessorsInTier(tierInfo.defaultKey, tierInfo.tier, documentTarget !== undefined);
  let adminMapped = preferAdmin ? predecessors.find(isUsable) : undefined;
  let rungs = [
    head,
    ...toRungs(
      (adminMapped === undefined
        ? predecessors
        : predecessors.slice(0, predecessors.indexOf(adminMapped))
      ).filter((r) => !isMapped(r)),
    ),
  ];
  if (adminMapped !== undefined)
    rungs.push({
      id: String(getModelStrings()[adminMapped]),
      name:
        getMarketingNameForModel(catalogEntriesByFirstPartyId[adminMapped].firstParty) ??
        catalogEntriesByFirstPartyId[adminMapped].firstParty,
    });
  else if (tierInfo.tier === "opus") {
    let rung = toRung(DEFAULT_3P_SONNET_KEY);
    let l =
      rung === undefined
        ? []
        : !vertexVariantFor(DEFAULT_3P_SONNET_KEY)
          ? [rung]
          : includeCrossTier
            ? predecessorRungs(DEFAULT_3P_SONNET_KEY, "sonnet")
            : [];
    rungs.push(
      ...l.map((x) => ({
        ...x,
        crossTier: true,
      })),
    );
  }
  registerFallbackLadder("vertex", tierInfo.tier, tierInfo.envVar, rungs);
  await Promise.all(
    rungs.slice(1).map(async (rung) => {
      let vertexCacheKey = await getVertexCacheKey(rung.id);
      let x = vertexCacheKey === undefined ? undefined : await rememberedAccess(vertexCacheKey, rung.id);
      if (x?.state === "refused")
        markModelRefused(rung.id, modelNotAvailableError(rung.id), x.at + REFUSED_TTL_MS);
    }),
  ).catch(() => {});
}
//@ chunk-5wnerh16.js:8720-8972 placement
function getVertexCacheKey(e) {
  return PACKAGE_INFO("vertex", () => [
    env.ANTHROPIC_VERTEX_PROJECT_ID,
    getConfiguredVertexProjectId(),
    env.ANTHROPIC_GOOGLE_CLOUD_PROJECT,
    getVertexRegionForModel(e),
    env.ANTHROPIC_VERTEX_BASE_URL,
    env.GOOGLE_APPLICATION_CREDENTIALS,
    env.CLOUDSDK_CONFIG,
    env.CLAUDE_CODE_SKIP_VERTEX_AUTH ? "skip-auth" : undefined,
    getCustomHeaders(),
  ]);
}
//@ chunk-5wnerh16.js:8972-9592 placement
/**
 * 用 AnthropicVertex 客户端（按需刷新 GCP 凭据、8 秒超时、不重试）发送启动模型检查请求；成功或 429 视为可用，其他错误返回不可用及错误。
 */
async function sendVertexStartupCheck(e) {
  try {
    let [{ AnthropicVertex: AnthropicVertexClass }, { getProxyFetchOptions }] = await Promise.all([
      import("./chunk-xa96axyz.js"),
      import("./chunk-amdegp7s.js"),
    ]);
    let CLAUDE_CODE_SKIP_VERTEX_AUTH = env.CLAUDE_CODE_SKIP_VERTEX_AUTH;
    let hostManaged = isHostManagedProviderAuth();
    if (!CLAUDE_CODE_SKIP_VERTEX_AUTH && !hostManaged) await refreshGcpCredentialsIfNeeded();
    let googleAuth = await buildVertexGoogleAuth(
      CLAUDE_CODE_SKIP_VERTEX_AUTH
        ? {
            kind: "skip",
          }
        : {
            kind: "default",
          },
      getConfiguredVertexProjectId(),
    );
    let region = getVertexRegionForModel(e);
    let bearer = CLAUDE_CODE_SKIP_VERTEX_AUTH ? bearerFromEnvOrHeaders() : undefined;
    await suppressVertexAuthRejection(
      new AnthropicVertexClass({
        region,
        googleAuth,
        maxRetries: 0,
        defaultHeaders: {
          ...getForwardableEnvHeaders(),
          ...vertexResidualCredentialPins(
            CLAUDE_CODE_SKIP_VERTEX_AUTH
              ? {
                  wireAuthorization: bearer,
                }
              : false,
          ),
        },
        ...CLOUD_AUTH_SLOT,
        timeout: 8000,
        fetchOptions: getProxyFetchOptions({
          url: env.ANTHROPIC_VERTEX_BASE_URL || getVertexBaseUrlForRegion(region),
        }),
      }),
    ).messages.create(sendStartupModelCheck(e));
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
//@ chunk-5wnerh16.js:9592-9648 placement
function vertexVariantFor(e) {
  let vertex = catalogEntriesByFirstPartyId[e].vertex;
  return vertex !== null && enforcedAllowlistLeavesOut(vertex);
}
