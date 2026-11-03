/**
 * utils/model/modelAllowlist.ts
 *
 * availableModels 白名单相关：已知模型名集合、按版本前缀匹配、别名与旧 Opus 展开、是否启用白名单。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/modelAllowlist.ts
 * pieces: chunk-aepeg2w5.js (43), chunk-hwmsct5x.js (1)
 * attribution: fingerprint 2, placement 41, file-local 1
 */
import {
  strip1mSuffix,
  parseModelId,
  sameModelSpelling,
  isModelKeyAlias,
  stripAnyVersatileSuffix,
  isBaseModelKey,
} from "./modelIds.js";
import { getCanonicalName, isRecognizedCanonical } from "./canonicalModelName.js";
import {
  getInitialSettings_2,
  getPairedPolicyModelOverrides,
  getSettingsForSource,
  getDeniedModelsPolicyOverrides,
  adminPolicyLoadFailureRefusesLaunch,
  getSettings_DEPRECATED,
} from "../settings/settings.js";
import { parseUserSpecifiedModel } from "./modelDisplay.js";
import { getAPIProvider, usesFirstPartyModelIds } from "./providers.js";
import {
  getModelAccessCache,
  hasStoredOAuthToken,
  hasProfileScope,
  getAnthropicApiKeySafe,
  isClaudeAISubscriber,
  getApiKeySourceSafe,
  getSubscriptionType,
  getOrgModelDefaultCache,
} from "../auth.js";
import { getProviderState, OVERTURNED_DENY_TTL_MS } from "./providerCaches.js";
import { reprobeDeniedSessionModel } from "./sessionModelRestriction.js";
import { getMainLoopModel, isServedExpandedSpelling } from "./model.js";
import { isServedCatalogActive } from "./modelCatalog/servedCatalog.js";
import { catalogEntriesByFirstPartyId } from "./modelCatalog.js";
import { isModelRemappedOrRetired, isModelDeprecated } from "./deprecation.js";
import { getModelStrings, getRawModelStrings, reverseModelOverride } from "./modelStrings.js";
import { resolveModelAliasEnvFree } from "./defaultModel.js";
import {
  parseDeniedModelEntry,
  versionEntryMatches,
  classifyModelListEntry,
  modelEntryMatches,
  isLatestAlias,
  anyEntryHasModelPrefix,
} from "./deniedModels.js";
import { getPublishedRowNameGroups } from "./modelCatalog/catalogSeed.js";
import { firstPartyNameToCanonical } from "./modelFallback.js";
import { displayModelName } from "./validateModel.js";

//@ chunk-aepeg2w5.js:135402-135419 fingerprint = modelMatchesVersionPrefix (1)
/**
 * "claude-"。覆盖错配旧名 modelMatchesVersionPrefix。
 */
var CLAUDE_MODEL_PREFIX = "claude-";
//@ chunk-aepeg2w5.js:409865-409991 placement
function normalizeForDenyMatch(apiName) {
  let n = strip1mSuffix(apiName.trim().toLowerCase());
  let modelId = parseModelId(n);
  if (modelId) return formatModelId(modelId);
  let canonicalName = getCanonicalName(n, {
    identity: true,
  });
  let modelId_2 = parseModelId(canonicalName);
  return modelId_2 ? formatModelId(modelId_2) : canonicalName;
}
//@ chunk-aepeg2w5.js:409991-410148 placement
function formatModelId({ family, major, minor, legacyVersionFirst, trailer }) {
  let y = minor ? `${major}-${minor}` : `${major}`;
  return `${legacyVersionFirst ? `claude-${y}-${family}` : `claude-${family}-${y}`}${trailer ?? ""}`;
}
//@ chunk-aepeg2w5.js:410148-410242 placement
function unentitledModelSet(modelAccessCache) {
  let n = new Set();
  for (let r of modelAccessCache ?? []) if (!r.entitled) n.add(normalizeForDenyMatch(r.apiName));
  return n;
}
//@ chunk-aepeg2w5.js:410242-410319 placement = applyModelOverrides (1)
/**
 * [settings.modelOverrides, 托管配对覆盖]。
 */
function getModelOverrideMaps() {
  let e;
  try {
    e = getInitialSettings_2().modelOverrides;
  } catch {
    e = undefined;
  }
  return [e, getPairedPolicyModelOverrides()];
}
//@ chunk-aepeg2w5.js:410319-410469 placement
/**
 * 模型是某覆盖的目标且其键在集合中。
 */
function isOverriddenModelInSet(e, n) {
  for (let r of getModelOverrideMaps()) {
    if (r === undefined) continue;
    for (let [key, value] of Object.entries(r)) {
      if (!sameModelSpelling(value, e)) continue;
      if (n.has(normalizeForDenyMatch(key))) return true;
    }
  }
  return false;
}
//@ chunk-aepeg2w5.js:410469-410608 placement
function isModelDenied(e, modelEntitlementDenySet) {
  if (modelEntitlementDenySet.size === 0) return false;
  let r = strip1mSuffix(e.trim().toLowerCase());
  return (isAliasOrExpandedSpelling(r) ? [r, strip1mSuffix(parseUserSpecifiedModel(r))] : [r]).some(
    (h) =>
      modelEntitlementDenySet.has(normalizeForDenyMatch(h)) ||
      isOverriddenModelInSet(h, modelEntitlementDenySet),
  );
}
//@ chunk-aepeg2w5.js:410608-410647 placement
function denyEntryMatchesModel(e, n) {
  return isModelDenied(n, unentitledModelSet([e]));
}
//@ chunk-aepeg2w5.js:410647-410991 placement
function getModelEntitlementDenySet() {
  let apiProvider = getAPIProvider();
  if (apiProvider !== "firstParty" && apiProvider !== "gateway") return new Set();
  let n = unentitledModelSet(getModelAccessCache());
  if (n.size === 0) return n;
  let providerState = getProviderState();
  let { overturnedEntitlementDenies } = providerState.providerCache;
  let { contestedDenies } = providerState.sessionModelDenyReprobe;
  if (overturnedEntitlementDenies.size > 0 || contestedDenies.size > 0) {
    let now = Date.now();
    for (let [S, w] of overturnedEntitlementDenies) if (now - w < OVERTURNED_DENY_TTL_MS) n.delete(S);
    for (let [S, w] of contestedDenies) if (w > now) n.delete(S);
  }
  return n;
}
//@ chunk-aepeg2w5.js:410991-411196 placement
function noteHonoredSessionModel(e) {
  let sessionModelDenyReprobe = getProviderState().sessionModelDenyReprobe;
  sessionModelDenyReprobe.honoredModels.add(e);
  if (!sessionModelDenyReprobe.refusedModels.has(e)) return;
  let now = Date.now();
  for (let contestedDeny of sessionModelDenyReprobe.contestedDenies.values()) if (contestedDeny > now) return;
  sessionModelDenyReprobe.refusedModels.delete(e);
}
//@ chunk-aepeg2w5.js:411196-411666 placement
function keepsHonoredModelOnCachedDeny(e) {
  let sessionModelDenyReprobe = getProviderState().sessionModelDenyReprobe;
  if (
    sessionModelDenyReprobe.reprobe === undefined ||
    !sessionModelDenyReprobe.honoredModels.has(e) ||
    sessionModelDenyReprobe.refusedModels.has(e) ||
    !isModelAllowed(e, {
      skipEntitlementDenyOverlay: true,
    })
  )
    return false;
  let { confirmedEntitlementDenies } = getProviderState().providerCache;
  let now = Date.now();
  let h = [];
  for (let y of getModelAccessCache())
    if (!y.entitled && denyEntryMatchesModel(y, e)) {
      let S = normalizeForDenyMatch(y.apiName);
      let w = confirmedEntitlementDenies.get(S);
      if (w !== undefined && now - w < OVERTURNED_DENY_TTL_MS) {
        sessionModelDenyReprobe.refusedModels.add(e);
        return false;
      }
      h.push(S);
    }
  if (h.length === 0) return false;
  return reprobeDeniedSessionModel({
    model: e,
    rowDenyKeys: h,
    describeFallbackModel: getMainLoopModel,
  });
}
//@ chunk-aepeg2w5.js:411666-411752 placement = logEventTo1P (1)
function isEntitlementOverlayUnavailable() {
  return (
    getAPIProvider() === "firstParty" &&
    hasStoredOAuthToken() &&
    !hasProfileScope() &&
    getAnthropicApiKeySafe() === null &&
    getModelAccessCache().length === 0
  );
}
//@ chunk-aepeg2w5.js:411752-411973 placement = isMaxSubscriber (0.303)
/**
 * 某模型是否在订阅内：优先用 modelAccessCache 的 entitled，第一方 API key 用户视为有，订阅用户按 pro/max/team。
 */
function isModelKnownServedToOrg(e) {
  if (getAPIProvider() !== "firstParty") return false;
  let modelAccessCache = getModelAccessCache();
  if (modelAccessCache.length > 0) {
    let s = normalizeForDenyMatch(e);
    return modelAccessCache.some((h) => h.entitled && normalizeForDenyMatch(h.apiName) === s);
  }
  if (!isClaudeAISubscriber()) return getApiKeySourceSafe() !== "none";
  let subscriptionType = getSubscriptionType();
  return subscriptionType === "pro" || subscriptionType === "max" || subscriptionType === "team";
}
//@ chunk-aepeg2w5.js:411973-412057 placement = logEventTo1P (1)
function getOrgModelDefault() {
  if (getAPIProvider() !== "firstParty") return null;
  if (isServedCatalogActive()) return null;
  return getOrgModelDefaultCache();
}
//@ chunk-aepeg2w5.js:412057-412138 placement
function getOrgModelDefaultUpdatedAt() {
  if (getAPIProvider() !== "firstParty") return null;
  return getOrgModelDefaultCache()?.updated_at ?? null;
}
//@ chunk-aepeg2w5.js:412138-412205 placement = returnValue (1)
function newestAllowedInFamily(as) {
  let e = iterateFirstPartyModelIds(as).next();
  return e.done === true ? null : e.value;
}
//@ chunk-aepeg2w5.js:412205-412347 placement
function* iterateFirstPartyModelIds(e) {
  let keys = Object.keys(catalogEntriesByFirstPartyId);
  for (let j = keys.length - 1; j >= 0; j--) {
    let firstParty = catalogEntriesByFirstPartyId[keys[j]].firstParty;
    if (
      familyHasSpecificEntries(getCanonicalName(firstParty), e) &&
      isModelAllowed(firstParty) &&
      !isModelRemappedOrRetired(firstParty) &&
      !isModelDeprecated(firstParty)
    )
      yield firstParty;
  }
}
//@ chunk-aepeg2w5.js:412347-412415 placement = returnValue (1)
function newestAllowedInFamilyForProvider(as) {
  let e = allowedVersionsInFamilyForProvider(as).next();
  return e.done === true ? null : e.value;
}
//@ chunk-aepeg2w5.js:412415-412735 placement
function* allowedVersionsInFamilyForProvider(e) {
  if (usesFirstPartyModelIds()) {
    yield* iterateFirstPartyModelIds(e);
    return;
  }
  let apiProvider = getAPIProvider();
  if (apiProvider === "foundry") return;
  let modelStrings = getModelStrings();
  let rawModelStrings = getRawModelStrings();
  let keys = Object.keys(catalogEntriesByFirstPartyId);
  for (let j = keys.length - 1; j >= 0; j--) {
    let S = keys[j];
    let w = catalogEntriesByFirstPartyId[S];
    if (
      w[apiProvider] === null ||
      parseModelId(w.firstParty)?.family !== e ||
      isModelRemappedOrRetired(w.firstParty) ||
      isModelDeprecated(w.firstParty)
    )
      continue;
    for (let R of new Set([modelStrings[S], rawModelStrings[S]]))
      if (R && isModelAllowed(R)) {
        yield R;
        break;
      }
  }
}
//@ chunk-aepeg2w5.js:412735-412920 placement
function familyHasSpecificEntries(family, allowlist) {
  for (let idx = family.indexOf(allowlist); idx !== -1; idx = family.indexOf(allowlist, idx + 1)) {
    let s = idx === 0 || !/[a-z0-9]/i.test(family[idx - 1]);
    let afterFamily = idx + allowlist.length;
    let y = afterFamily === family.length || !/[a-z0-9]/i.test(family[afterFamily]);
    if (s && y) return true;
  }
  return false;
}
//@ chunk-aepeg2w5.js:412920-412956 placement
function isAliasOrExpandedSpelling(e) {
  return isModelKeyAlias(e) || isServedExpandedSpelling(e);
}
//@ chunk-aepeg2w5.js:412956-412985 placement
function resolveAliasEnvFree(e) {
  return resolveModelAliasEnvFree(e);
}
//@ chunk-aepeg2w5.js:412985-413129 placement
function modelBelongsToFamily(e, n, envFreeAliasResolution) {
  if (isAliasOrExpandedSpelling(e)) {
    if (envFreeAliasResolution) {
      let aliasEnvFree = resolveAliasEnvFree(e);
      if (aliasEnvFree !== null) return familyHasSpecificEntries(aliasEnvFree, n);
      return !isModelKeyAlias(e) && familyHasSpecificEntries(e, n);
    }
    return familyHasSpecificEntries(parseUserSpecifiedModel(e).toLowerCase(), n);
  }
  return familyHasSpecificEntries(e, n);
}
//@ chunk-aepeg2w5.js:413129-413221 file-local
/**
 * e 以 n 开头且后面是结尾或 "-"（版本前缀边界匹配）。
 */
function prefixMatchesModel(modelName, prefix) {
  if (!modelName.startsWith(prefix)) return false;
  return modelName.length === prefix.length || modelName[prefix.length] === "-";
}
//@ chunk-aepeg2w5.js:413221-413363 placement = modelMatchesVersionPrefix (1)
/**
 * 模型（别名先解析）是否匹配版本前缀 n（允许省略 claude-）。
 */
function modelMatchesVersionPrefix(model, entry) {
  let resolvedModel = isAliasOrExpandedSpelling(model)
    ? strip1mSuffix(parseUserSpecifiedModel(model).toLowerCase())
    : model;
  if (prefixMatchesModel(resolvedModel, entry)) return true;
  if (!entry.startsWith("claude-") && prefixMatchesModel(resolvedModel, `claude-${entry}`)) return true;
  return false;
}
//@ chunk-aepeg2w5.js:413363-413442 placement
function familyKeyForModel(e, n) {
  for (let [key, value] of Object.entries(n)) if (sameModelSpelling(value, e)) return key;
  return e;
}
//@ chunk-aepeg2w5.js:413442-413601 placement
function aliasExpansionPermitted(e, n) {
  let r = strip1mSuffix(parseUserSpecifiedModel(e).trim().toLowerCase());
  let aliasEnvFree = resolveAliasEnvFree(e);
  if (aliasEnvFree !== null && strip1mSuffix(aliasEnvFree) === r) return true;
  if (isModelKeyAlias(r)) return false;
  return isModelAllowed(r, {
    ...n,
    envFreeAliasResolution: true,
  });
}
//@ chunk-aepeg2w5.js:413601-413620 placement
var weakMap_4 = new WeakMap();
//@ chunk-aepeg2w5.js:413620-413742 placement
function parseDeniedEntries(deniedModels) {
  let n = weakMap_4.get(deniedModels);
  if (n === undefined) {
    n = deniedModels.flatMap((r) => {
      let { entry } = parseDeniedModelEntry(r);
      return entry ? [entry] : [];
    });
    weakMap_4.set(deniedModels, n);
  }
  return n;
}
//@ chunk-aepeg2w5.js:413742-413778 placement
var EMPTY_ALLOWLIST = {
  entries: [],
  overrideMaps: [],
};
//@ chunk-aepeg2w5.js:413778-413974 placement
function getDeniedModelsPolicy() {
  let settingsForSource = getSettingsForSource("policySettings");
  let deniedModels = settingsForSource?.deniedModels;
  if (deniedModels === undefined || deniedModels.length === 0) return EMPTY_ALLOWLIST;
  let overrideMaps = [
    settingsForSource?.modelOverrides,
    getPairedPolicyModelOverrides(),
    getDeniedModelsPolicyOverrides(),
  ].filter((s) => s !== undefined);
  return {
    entries: parseDeniedEntries(deniedModels),
    overrideMaps,
  };
}
//@ chunk-aepeg2w5.js:413974-414038 placement
function hasManagedModelDenies() {
  try {
    return getDeniedModelsPolicy().entries.length > 0;
  } catch {
    return true;
  }
}
//@ chunk-aepeg2w5.js:414038-414149 placement
function parseCanonicalModel(e, n) {
  try {
    return parseModelId(
      getCanonicalName(
        e,
        n === undefined
          ? {
              identity: true,
            }
          : {
              identity: true,
              overridesMap: n,
            },
      ),
    );
  } catch {
    return null;
  }
}
//@ chunk-aepeg2w5.js:414149-414247 placement
function tailSegmentOrUndefined(e) {
  let trimmed = e.slice(e.lastIndexOf("/") + 1).trim();
  return e.includes("/") && trimmed !== "" ? trimmed : undefined;
}
//@ chunk-aepeg2w5.js:414247-414414 placement
function deniedModelsEntryMatches(entry, n, r) {
  switch (entry.kind) {
    case "literal":
      return n === entry.value;
    case "family":
      return r?.family === entry.family || familyHasSpecificEntries(n, entry.family);
    case "model":
      return r !== null && versionEntryMatches(entry.id, r);
  }
}
//@ chunk-aepeg2w5.js:414414-415347 placement
function isModelDeniedByManagedSettings(e) {
  let { entries, overrideMaps } = getDeniedModelsPolicy();
  if (entries.length === 0) return false;
  let s = stripAnyVersatileSuffix(e.trim());
  let h = stripAnyVersatileSuffix(parseUserSpecifiedModel(s).trim());
  let y = new Set([s, h]);
  for (let L of [...y]) {
    let G = tailSegmentOrUndefined(L);
    if (G !== undefined) y.add(G);
  }
  let mapped = [...y].map((L) => L.toLowerCase());
  let w = new Set();
  for (let { rowId, names, families } of getPublishedRowNameGroups()) {
    let mapped_2 = names.map((name) => stripAnyVersatileSuffix(name.trim()));
    let q = firstPartyNameToCanonical(rowId);
    if (
      mapped_2.some((Q) => mapped.includes(Q.toLowerCase())) ||
      (!isRecognizedCanonical(q) && mapped.some((Q) => firstPartyNameToCanonical(Q) === q))
    ) {
      mapped_2.forEach((Q) => y.add(Q));
      for (let family of families) w.add(family);
    }
  }
  if (entries.some((entry) => entry.kind === "family" && w.has(entry.family))) return true;
  let R = new Set([...y].map((L) => L.toLowerCase()));
  for (let overrideMap of overrideMaps)
    for (let [key, value] of Object.entries(overrideMap))
      if (parseModelId(value) === null && [...R].some((ee) => sameModelSpelling(value, ee)))
        R.add(strip1mSuffix(key.trim().toLowerCase()));
  let merged = Object.assign({}, ...overrideMaps);
  let P = (L, canonicalModel) => entries.some((entry) => deniedModelsEntryMatches(entry, L, canonicalModel));
  let F = (L, G) => P(G, parseCanonicalModel(L)) || P(G, parseCanonicalModel(L, merged));
  for (let L of R) {
    let modelId = parseModelId(L);
    if (modelId !== null ? P(L, modelId) : P(L, null) || F(L, L)) return true;
  }
  for (let L of y) {
    let lower = L.toLowerCase();
    if (parseModelId(lower) === null && F(L, lower)) return true;
  }
  return false;
}
//@ chunk-aepeg2w5.js:415347-415421 placement
function isExactModelsMatch() {
  return getSettingsForSource("policySettings")?.availableModelsMatch === "exact";
}
//@ chunk-aepeg2w5.js:415421-415556 placement
function getAliasBaseModel(e, envFreeAliasResolution) {
  if (isAliasOrExpandedSpelling(e)) return null;
  let r = envFreeAliasResolution ? resolveAliasEnvFree(e) : parseUserSpecifiedModel(e).trim().toLowerCase();
  if (r === null) return null;
  let s = strip1mSuffix(r);
  return s === e ? null : s;
}
//@ chunk-aepeg2w5.js:415556-415739 placement
function entryMatchesModel(e, n, envFreeAliasResolution) {
  let s = classifyModelListEntry(n);
  if (s.kind === "family") return true;
  if (s.kind !== "model") return false;
  let h = isAliasOrExpandedSpelling(e)
    ? envFreeAliasResolution
      ? (resolveAliasEnvFree(e) ?? e)
      : strip1mSuffix(parseUserSpecifiedModel(e).toLowerCase())
    : e;
  let modelId = parseModelId(h);
  return modelId !== null && modelEntryMatches(s, modelId, isLatestAlias(h, modelId));
}
//@ chunk-aepeg2w5.js:415739-415945 placement
function isExcludedByExactAllowlist(e) {
  let settingsForSource = getSettingsForSource("policySettings");
  if (settingsForSource?.availableModelsMatch !== "exact") return false;
  let availableModels = settingsForSource.availableModels;
  if (
    availableModels === undefined ||
    availableModels.every((availableModel) => classifyModelListEntry(availableModel).kind === "ignored")
  )
    return false;
  return !isModelAllowed(e, {
    allowlist: [...availableModels],
  });
}
//@ chunk-aepeg2w5.js:415945-415982 placement
function isBlockedByManagedModelPolicy(e) {
  return isModelDeniedByManagedSettings(e) || isExcludedByExactAllowlist(e);
}
//@ chunk-aepeg2w5.js:415982-417015 placement
function managedDenyStartupRefusal(e, n = "start") {
  let r;
  let s;
  try {
    r = isModelDeniedByManagedSettings(e);
    s = !r && isExcludedByExactAllowlist(e);
  } catch {
    return n === "start"
      ? null
      : "Can't switch to the default model: Claude Code couldn't read your organization's managed settings to check which models they allow. Restart Claude Code; if this keeps happening, ask your administrator to check the managed settings.";
  }
  if (s)
    return `${n === "start" ? "Claude Code can't start" : "Can't switch to the default model"}: your organization allows only the models listed in "availableModels", and none of them can be used as the default model (${displayModelName(strip1mSuffix(e))} isn't listed). Ask your administrator to update "availableModels".`;
  if (!r) return null;
  return `${n === "start" ? `Claude Code can't start: your organization's managed settings block the default model (${displayModelName(strip1mSuffix(e))}) in "deniedModels"` : `Can't switch to the default model: your organization's managed settings block it (${displayModelName(strip1mSuffix(e))}) in "deniedModels"`}, and none of the models they allow can be used as the default instead. Ask your administrator to update "deniedModels" or "availableModels".`;
}
//@ chunk-aepeg2w5.js:417015-418331 placement
function isModelAllowed(modelId, n) {
  try {
    if (isModelDeniedByManagedSettings(modelId)) return false;
  } catch {
    return false;
  }
  if (n?.allowlist === undefined) {
    try {
      if (adminPolicyLoadFailureRefusesLaunch()) return false;
    } catch {
      return false;
    }
    if (!n?.skipEntitlementDenyOverlay && isModelDenied(modelId, getModelEntitlementDenySet())) return false;
  }
  let r = getSettings_DEPRECATED() || {};
  let s = n?.allowlist ?? r.availableModels;
  if (!s) return true;
  if (s.length === 0) return false;
  let h;
  try {
    h = isExactModelsMatch();
  } catch {
    return false;
  }
  let mapped = (h ? s.filter((x) => classifyModelListEntry(x).kind !== "ignored") : s).map((x) =>
    strip1mSuffix(x.trim().toLowerCase()),
  );
  if (mapped.length === 0) return false;
  let S = strip1mSuffix(modelId.trim().toLowerCase());
  if (h) {
    let aliasBaseModel = getAliasBaseModel(S, n?.envFreeAliasResolution);
    if (
      aliasBaseModel !== null &&
      (getAliasBaseModel(aliasBaseModel, n?.envFreeAliasResolution) !== null ||
        !isModelAllowed(aliasBaseModel, n))
    )
      return false;
  }
  if (mapped.includes(S) && !isBaseModelKey(S)) {
    if (n?.envFreeAliasResolution || !isAliasOrExpandedSpelling(S) || aliasExpansionPermitted(S, n))
      return true;
  }
  let w;
  if (n?.overridesMap !== undefined) w = familyKeyForModel(modelId, n.overridesMap);
  else if (n?.ignoreModelOverrides) w = modelId;
  else {
    let x;
    try {
      x = getSettingsForSource("policySettings");
    } catch {
      return false;
    }
    w =
      x?.availableModels !== undefined
        ? familyKeyForModel(modelId, x.modelOverrides ?? getPairedPolicyModelOverrides() ?? {})
        : reverseModelOverride(modelId);
  }
  let model = strip1mSuffix(w.trim().toLowerCase());
  if (mapped.includes(model)) {
    if (!isBaseModelKey(model) || !anyEntryHasModelPrefix(model, mapped)) {
      if (
        n?.envFreeAliasResolution ||
        model !== S ||
        !isAliasOrExpandedSpelling(model) ||
        aliasExpansionPermitted(model, n)
      )
        return true;
    }
  }
  for (let x of mapped)
    if (
      isBaseModelKey(x) &&
      !anyEntryHasModelPrefix(x, mapped) &&
      modelBelongsToFamily(model, x, n?.envFreeAliasResolution)
    )
      return true;
  if (isAliasOrExpandedSpelling(model)) {
    let x = strip1mSuffix(parseUserSpecifiedModel(model).toLowerCase());
    if (mapped.includes(x)) return true;
  }
  for (let x of mapped)
    if (!isBaseModelKey(x) && isModelKeyAlias(x)) {
      let modelAliasEnvFree = resolveModelAliasEnvFree(x);
      if (modelAliasEnvFree !== null && strip1mSuffix(modelAliasEnvFree) === model) return true;
    }
  for (let x of mapped)
    if (
      !isBaseModelKey(x) &&
      !isModelKeyAlias(x) &&
      modelMatchesVersionPrefix(model, x) &&
      (!h || entryMatchesModel(model, x, n?.envFreeAliasResolution))
    )
      return true;
  return false;
}
//@ chunk-hwmsct5x.js:221057-221128 fingerprint = isModelAllowed (1)
/**
 * 未设 availableModels、无服务端白名单、无托管 enforced 条目时为真。旧版名 isModelAllowed 含义相反。
 */
function isModelAllowlistInactive() {
  return (
    !(getSettings_DEPRECATED() || {}).availableModels &&
    getModelEntitlementDenySet().size === 0 &&
    !hasManagedModelDenies()
  );
}
export {
  isModelAllowed,
  managedDenyStartupRefusal,
  deniedModelsEntryMatches,
  isEntitlementOverlayUnavailable,
  getOrgModelDefault,
  getOrgModelDefaultUpdatedAt,
  CLAUDE_MODEL_PREFIX,
  normalizeForDenyMatch,
  denyEntryMatchesModel,
  isModelDeniedByManagedSettings,
  isModelDenied,
  getModelEntitlementDenySet,
  keepsHonoredModelOnCachedDeny,
  noteHonoredSessionModel,
  newestAllowedInFamily,
  isModelAllowlistInactive,
  hasManagedModelDenies,
  newestAllowedInFamilyForProvider,
  isBlockedByManagedModelPolicy,
  aliasExpansionPermitted,
  isModelKnownServedToOrg,
  allowedVersionsInFamilyForProvider,
};
