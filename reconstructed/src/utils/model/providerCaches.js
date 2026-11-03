/**
 * utils/model/providerCaches.ts
 *
 * 2.1.316 新增：与提供商绑定的模型缓存（按会话的提供商状态、权益否决的过期、模型 beta 缓存）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-v9tcvh08.js (9)
 * attribution: placement 9
 */
import { No } from "./modelCatalog.js";
import { createSignal } from "../signal.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";

/**
 * 按任一提供商的模型 id 查找内置模型配置。
 */
//@ chunk-v9tcvh08.js:28064-28227 placement
function findModelConfigById(e) {
  let lower = e.toLowerCase();
  for (let a of Object.values(No))
    for (let n of Object.values(a)) if (typeof n === "string" && n.toLowerCase() === lower) return a;
  return null;
}
//@ chunk-v9tcvh08.js:28227-28242 placement
var FXt = 600000;
//@ chunk-v9tcvh08.js:28242-28364 placement
function pruneOverturnedEntitlementDenies() {
  let overturnedEntitlementDenies = getProviderState().providerCache.overturnedEntitlementDenies,
    now = Date.now();
  for (let [a, n] of overturnedEntitlementDenies) if (now - n >= FXt) overturnedEntitlementDenies.delete(a);
}
//@ chunk-v9tcvh08.js:28364-28706 placement
function createProviderCache() {
  return {
    validatedModels: new Set(),
    confirmedEntitlementDenies: new Map(),
    overturnedEntitlementDenies: new Map(),
    bedrockInferenceProfiles: void 0,
    settledBedrockInferenceProfiles: void 0,
    inferenceProfileBackingModels: new Map(),
    modelConfigs: new Map(),
    clientDataFetches: new Map(),
    capabilityOverrides: new Map(),
    probeResults: new Map(),
    preconnectFired: !1,
  };
}
//@ chunk-v9tcvh08.js:28706-28836 placement
function createModelBetaCaches() {
  return {
    allModelBetas: new Map(),
    modelBetas: new Map(),
    bedrockExtraBodyParamsBetas: new Map(),
    midConversationSystem: new Map(),
  };
}
/**
 * 删除提供商缓存中满足条件的模型 beta 记录。
 */
//@ chunk-v9tcvh08.js:28836-28990 placement
function clearModelBetas(e) {
  let { betas: betas, betasCompiledOnly: betasCompiledOnly } = getProviderState();
  for (let n of [...Object.values(betas), ...Object.values(betasCompiledOnly)])
    for (let r of [...n.keys()]) if (e(r)) n.delete(r);
}
//@ chunk-v9tcvh08.js:28990-30559 placement
function createProviderState() {
  return {
    providerCache: createProviderCache(),
    fetchesClientData: !1,
    includeUnsupportedModels: !1,
    sessionModelDenyReprobe: {
      reprobe: void 0,
      honoredModels: new Set(),
      contestedDenies: new Map(),
      refusedModels: new Set(),
      generation: 0,
      restricted: createSignal(),
    },
    betas: createModelBetaCaches(),
    betasCompiledOnly: createModelBetaCaches(),
    usageCreditsOnlyModelFlags: { fableBilling: null, creditsOnlyTiers: null },
    warnedEnforcementMessages: new Set(),
    resolvingBestModel: !1,
    modelCapabilitiesByCachePath: new Map(),
    gatewayModelsByCachePath: new Map(),
    modelCapabilitiesStorageV5: void 0,
    gatewayModelsStorageV5: void 0,
    servedCatalogByKey: new Map(),
    servedCatalogRefreshes: new Map(),
    servedCatalogSettledRefreshes: new WeakSet(),
    servedCatalogRefusal: void 0,
    servedCatalogPostLoginRun: void 0,
    publishedCatalogByKey: new Map(),
    publishedCatalogRefreshes: new Map(),
    publishedCatalogSettledRefreshes: new WeakSet(),
    publishedCatalogFloorMarks: new Map(),
    publishedCatalogFloorRead: void 0,
    publishedCatalogFloorWrite: void 0,
    publishedRowNames: void 0,
    publishedDenyDocuments: [],
    clientDataUrl: { pending: void 0, document: void 0, assumesFirstPartyBaseUrl: !1 },
    servedCatalogShadowStarted: !1,
    servedCatalogActive: void 0,
    servedCatalogMaskedIds: new Set(),
    servedCatalogMasksEveryId: !1,
    servedCatalogPublicIds: new Map(),
    servedCatalogMaskHydrated: !1,
    servedCatalogMaskHydration: void 0,
    servedCatalogMaskRetryAt: 0,
    servedCatalogPersistedMaskedIds: void 0,
    servedCatalogMaskWrite: void 0,
    servedCatalogSuppressDepth: 0,
    servedCatalogDeactivatedRows: void 0,
    familySpellingVerdicts: new Map(),
    behavesAsMemo: void 0,
    publishedWireIds: void 0,
    unservedModelDrop: void 0,
    modelMix: void 0,
    servedCatalogOffBeforeAsking: void 0,
    catalogDecision: void 0,
  };
}
//@ chunk-v9tcvh08.js:30559-30581 placement
var H = new SessionRootSlot(() => createProviderState());
//@ chunk-v9tcvh08.js:30581-30612 placement
function getProviderState() {
  return H.of(getRootSession());
}

export {
  getProviderState,
  findModelConfigById,
  pruneOverturnedEntitlementDenies,
  clearModelBetas,
  FXt,
  createModelBetaCaches,
  createProviderCache,
};
