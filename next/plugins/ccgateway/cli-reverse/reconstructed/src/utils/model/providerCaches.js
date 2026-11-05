/**
 * utils/model/providerCaches.ts
 *
 * 2.1.316 新增：与提供商绑定的模型缓存（按会话的提供商状态、权益否决的过期、模型 beta 缓存）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5m8x0kb6.js (9)
 * attribution: placement 9
 */
import { catalogEntriesByFirstPartyId } from "./modelCatalog.js";
import { createSignal } from "../signal.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5m8x0kb6.js:28099-28262 placement
/**
 * 按任一提供商的模型 id 查找内置模型配置。
 */
function findModelConfigById(modelId) {
  let lower = modelId.toLowerCase();
  for (let entry of Object.values(catalogEntriesByFirstPartyId))
    for (let value of Object.values(entry))
      if (typeof value === "string" && value.toLowerCase() === lower) return entry;
  return null;
}
//@ chunk-5m8x0kb6.js:28262-28277 placement
/**
 * 被推翻的权益拒绝记录的保留时长（10 分钟）。
 */
var OVERTURNED_DENY_TTL_MS = 600000;
//@ chunk-5m8x0kb6.js:28277-28399 placement
function pruneOverturnedEntitlementDenies() {
  let overturnedEntitlementDenies = getProviderState().providerCache.overturnedEntitlementDenies;
  let now = Date.now();
  for (let [key, at] of overturnedEntitlementDenies)
    if (now - at >= OVERTURNED_DENY_TTL_MS) overturnedEntitlementDenies.delete(key);
}
//@ chunk-5m8x0kb6.js:28399-28741 placement
function createProviderCache() {
  return {
    validatedModels: new Set(),
    confirmedEntitlementDenies: new Map(),
    overturnedEntitlementDenies: new Map(),
    bedrockInferenceProfiles: undefined,
    settledBedrockInferenceProfiles: undefined,
    inferenceProfileBackingModels: new Map(),
    modelConfigs: new Map(),
    clientDataFetches: new Map(),
    capabilityOverrides: new Map(),
    probeResults: new Map(),
    preconnectFired: false,
  };
}
//@ chunk-5m8x0kb6.js:28741-28871 placement
function createModelBetaCaches() {
  return {
    allModelBetas: new Map(),
    modelBetas: new Map(),
    bedrockExtraBodyParamsBetas: new Map(),
    midConversationSystem: new Map(),
  };
}
//@ chunk-5m8x0kb6.js:28871-29025 placement
/**
 * 删除提供商缓存中满足条件的模型 beta 记录。
 */
function clearModelBetas(predicate) {
  let { betas, betasCompiledOnly } = getProviderState();
  for (let map of [...Object.values(betas), ...Object.values(betasCompiledOnly)])
    for (let key of [...map.keys()]) if (predicate(key)) map.delete(key);
}
//@ chunk-5m8x0kb6.js:29025-30594 placement
function createProviderState() {
  return {
    providerCache: createProviderCache(),
    fetchesClientData: false,
    includeUnsupportedModels: false,
    sessionModelDenyReprobe: {
      reprobe: undefined,
      honoredModels: new Set(),
      contestedDenies: new Map(),
      refusedModels: new Set(),
      generation: 0,
      restricted: createSignal(),
    },
    betas: createModelBetaCaches(),
    betasCompiledOnly: createModelBetaCaches(),
    usageCreditsOnlyModelFlags: {
      fableBilling: null,
      creditsOnlyTiers: null,
    },
    warnedEnforcementMessages: new Set(),
    resolvingBestModel: false,
    modelCapabilitiesByCachePath: new Map(),
    gatewayModelsByCachePath: new Map(),
    modelCapabilitiesStorageV5: undefined,
    gatewayModelsStorageV5: undefined,
    servedCatalogByKey: new Map(),
    servedCatalogRefreshes: new Map(),
    servedCatalogSettledRefreshes: new WeakSet(),
    servedCatalogRefusal: undefined,
    servedCatalogPostLoginRun: undefined,
    publishedCatalogByKey: new Map(),
    publishedCatalogRefreshes: new Map(),
    publishedCatalogSettledRefreshes: new WeakSet(),
    publishedCatalogFloorMarks: new Map(),
    publishedCatalogFloorRead: undefined,
    publishedCatalogFloorWrite: undefined,
    publishedRowNames: undefined,
    publishedDenyDocuments: [],
    clientDataUrl: {
      pending: undefined,
      document: undefined,
      assumesFirstPartyBaseUrl: false,
    },
    servedCatalogShadowStarted: false,
    servedCatalogActive: undefined,
    servedCatalogMaskedIds: new Set(),
    servedCatalogMasksEveryId: false,
    servedCatalogPublicIds: new Map(),
    servedCatalogMaskHydrated: false,
    servedCatalogMaskHydration: undefined,
    servedCatalogMaskRetryAt: 0,
    servedCatalogPersistedMaskedIds: undefined,
    servedCatalogMaskWrite: undefined,
    servedCatalogSuppressDepth: 0,
    servedCatalogDeactivatedRows: undefined,
    familySpellingVerdicts: new Map(),
    behavesAsMemo: undefined,
    publishedWireIds: undefined,
    unservedModelDrop: undefined,
    modelMix: undefined,
    servedCatalogOffBeforeAsking: undefined,
    catalogDecision: undefined,
  };
}
//@ chunk-5m8x0kb6.js:30594-30616 placement
var providerStateSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5m8x0kb6.js:30594", () => {
  providerStateSlot = new SessionRootSlot(() => createProviderState());
});
//@ chunk-5m8x0kb6.js:30616-30647 placement
function getProviderState() {
  return providerStateSlot.of(getRootSession());
}
export {
  findModelConfigById,
  getProviderState,
  createModelBetaCaches,
  pruneOverturnedEntitlementDenies,
  OVERTURNED_DENY_TTL_MS,
  clearModelBetas,
  createProviderCache,
};
