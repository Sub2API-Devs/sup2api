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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:135402-135419 fingerprint (2.1.88 match: modelMatchesVersionPrefix, 1)
/**
 * "claude-"。覆盖错配旧名 modelMatchesVersionPrefix。
 */
var CLAUDE_MODEL_PREFIX = "claude-";
//@ chunk-aepeg2w5.js:409865-409991 placement
function normalizeForDenyMatch(modelName) {
  let lower = strip1mSuffix(modelName.trim().toLowerCase());
  let modelId = parseModelId(lower);
  if (modelId) return formatModelId(modelId);
  let canonicalName = getCanonicalName(lower, {
    identity: true,
  });
  let modelId_2 = parseModelId(canonicalName);
  return modelId_2 ? formatModelId(modelId_2) : canonicalName;
}
//@ chunk-aepeg2w5.js:409991-410148 placement
function formatModelId({ family, major, minor, legacyVersionFirst, trailer }) {
  let versionPart = minor ? `${major}-${minor}` : `${major}`;
  return `${legacyVersionFirst ? `claude-${versionPart}-${family}` : `claude-${family}-${versionPart}`}${trailer ?? ""}`;
}
//@ chunk-aepeg2w5.js:410148-410242 placement
function unentitledModelSet(modelAccessCache) {
  let denied = new Set();
  for (let row of modelAccessCache ?? []) if (!row.entitled) denied.add(normalizeForDenyMatch(row.apiName));
  return denied;
}
//@ chunk-aepeg2w5.js:410242-410319 placement (2.1.88 match: applyModelOverrides, 1)
/**
 * [settings.modelOverrides, 托管配对覆盖]。
 */
function getModelOverrideMaps() {
  let settingsOverrides;
  try {
    settingsOverrides = getInitialSettings_2().modelOverrides;
  } catch {
    settingsOverrides = undefined;
  }
  return [settingsOverrides, getPairedPolicyModelOverrides()];
}
//@ chunk-aepeg2w5.js:410319-410469 placement
/**
 * 模型是某覆盖的目标且其键在集合中。
 */
function isOverriddenModelInSet(model, denied) {
  for (let overrides of getModelOverrideMaps()) {
    if (overrides === undefined) continue;
    for (let [key, value] of Object.entries(overrides)) {
      if (!sameModelSpelling(value, model)) continue;
      if (denied.has(normalizeForDenyMatch(key))) return true;
    }
  }
  return false;
}
//@ chunk-aepeg2w5.js:410469-410608 placement
function isModelDenied(model, modelEntitlementDenySet) {
  if (modelEntitlementDenySet.size === 0) return false;
  let lower = strip1mSuffix(model.trim().toLowerCase());
  return (
    isAliasOrExpandedSpelling(lower) ? [lower, strip1mSuffix(parseUserSpecifiedModel(lower))] : [lower]
  ).some(
    (candidate) =>
      modelEntitlementDenySet.has(normalizeForDenyMatch(candidate)) ||
      isOverriddenModelInSet(candidate, modelEntitlementDenySet),
  );
}
//@ chunk-aepeg2w5.js:410608-410647 placement
function denyEntryMatchesModel(row, model) {
  return isModelDenied(model, unentitledModelSet([row]));
}
//@ chunk-aepeg2w5.js:410647-410991 placement
function getModelEntitlementDenySet() {
  let apiProvider = getAPIProvider();
  if (apiProvider !== "firstParty" && apiProvider !== "gateway") return new Set();
  let denied = unentitledModelSet(getModelAccessCache());
  if (denied.size === 0) return denied;
  let providerState = getProviderState();
  let { overturnedEntitlementDenies } = providerState.providerCache;
  let { contestedDenies } = providerState.sessionModelDenyReprobe;
  if (overturnedEntitlementDenies.size > 0 || contestedDenies.size > 0) {
    let now = Date.now();
    for (let [key, at] of overturnedEntitlementDenies)
      if (now - at < OVERTURNED_DENY_TTL_MS) denied.delete(key);
    for (let [key, until] of contestedDenies) if (until > now) denied.delete(key);
  }
  return denied;
}
//@ chunk-aepeg2w5.js:410991-411196 placement
function noteHonoredSessionModel(model) {
  let sessionModelDenyReprobe = getProviderState().sessionModelDenyReprobe;
  sessionModelDenyReprobe.honoredModels.add(model);
  if (!sessionModelDenyReprobe.refusedModels.has(model)) return;
  let now = Date.now();
  for (let contestedDeny of sessionModelDenyReprobe.contestedDenies.values()) if (contestedDeny > now) return;
  sessionModelDenyReprobe.refusedModels.delete(model);
}
//@ chunk-aepeg2w5.js:411196-411666 placement
function keepsHonoredModelOnCachedDeny(model) {
  let sessionModelDenyReprobe = getProviderState().sessionModelDenyReprobe;
  if (
    sessionModelDenyReprobe.reprobe === undefined ||
    !sessionModelDenyReprobe.honoredModels.has(model) ||
    sessionModelDenyReprobe.refusedModels.has(model) ||
    !isModelAllowed(model, {
      skipEntitlementDenyOverlay: true,
    })
  )
    return false;
  let { confirmedEntitlementDenies } = getProviderState().providerCache;
  let now = Date.now();
  let denyKeys = [];
  for (let row of getModelAccessCache())
    if (!row.entitled && denyEntryMatchesModel(row, model)) {
      let denyKey = normalizeForDenyMatch(row.apiName);
      let at = confirmedEntitlementDenies.get(denyKey);
      if (at !== undefined && now - at < OVERTURNED_DENY_TTL_MS) {
        sessionModelDenyReprobe.refusedModels.add(model);
        return false;
      }
      denyKeys.push(denyKey);
    }
  if (denyKeys.length === 0) return false;
  return reprobeDeniedSessionModel({
    model,
    rowDenyKeys: denyKeys,
    describeFallbackModel: getMainLoopModel,
  });
}
//@ chunk-aepeg2w5.js:411666-411752 placement (2.1.88 match: logEventTo1P, 1)
function isEntitlementOverlayUnavailable() {
  return (
    getAPIProvider() === "firstParty" &&
    hasStoredOAuthToken() &&
    !hasProfileScope() &&
    getAnthropicApiKeySafe() === null &&
    getModelAccessCache().length === 0
  );
}
//@ chunk-aepeg2w5.js:411752-411973 placement (2.1.88 match: isMaxSubscriber, 0.303)
/**
 * 某模型是否在订阅内：优先用 modelAccessCache 的 entitled，第一方 API key 用户视为有，订阅用户按 pro/max/team。
 */
function isModelKnownServedToOrg(model) {
  if (getAPIProvider() !== "firstParty") return false;
  let modelAccessCache = getModelAccessCache();
  if (modelAccessCache.length > 0) {
    let normalized = normalizeForDenyMatch(model);
    return modelAccessCache.some((row) => row.entitled && normalizeForDenyMatch(row.apiName) === normalized);
  }
  if (!isClaudeAISubscriber()) return getApiKeySourceSafe() !== "none";
  let subscriptionType = getSubscriptionType();
  return subscriptionType === "pro" || subscriptionType === "max" || subscriptionType === "team";
}
//@ chunk-aepeg2w5.js:411973-412057 placement (2.1.88 match: logEventTo1P, 1)
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
//@ chunk-aepeg2w5.js:412138-412205 placement (2.1.88 match: returnValue, 1)
function newestAllowedInFamily(as) {
  let e = iterateFirstPartyModelIds(as).next();
  return e.done === true ? null : e.value;
}
//@ chunk-aepeg2w5.js:412205-412347 placement
function* iterateFirstPartyModelIds(family) {
  let keys = Object.keys(catalogEntriesByFirstPartyId);
  for (let j = keys.length - 1; j >= 0; j--) {
    let firstParty = catalogEntriesByFirstPartyId[keys[j]].firstParty;
    if (
      familyHasSpecificEntries(getCanonicalName(firstParty), family) &&
      isModelAllowed(firstParty) &&
      !isModelRemappedOrRetired(firstParty) &&
      !isModelDeprecated(firstParty)
    )
      yield firstParty;
  }
}
//@ chunk-aepeg2w5.js:412347-412415 placement (2.1.88 match: returnValue, 1)
function newestAllowedInFamilyForProvider(as) {
  let e = allowedVersionsInFamilyForProvider(as).next();
  return e.done === true ? null : e.value;
}
//@ chunk-aepeg2w5.js:412415-412735 placement
function* allowedVersionsInFamilyForProvider(family) {
  if (usesFirstPartyModelIds()) {
    yield* iterateFirstPartyModelIds(family);
    return;
  }
  let apiProvider = getAPIProvider();
  if (apiProvider === "foundry") return;
  let modelStrings = getModelStrings();
  let rawModelStrings = getRawModelStrings();
  let keys = Object.keys(catalogEntriesByFirstPartyId);
  for (let j = keys.length - 1; j >= 0; j--) {
    let key = keys[j];
    let row = catalogEntriesByFirstPartyId[key];
    if (
      row[apiProvider] === null ||
      parseModelId(row.firstParty)?.family !== family ||
      isModelRemappedOrRetired(row.firstParty) ||
      isModelDeprecated(row.firstParty)
    )
      continue;
    for (let candidate of new Set([modelStrings[key], rawModelStrings[key]]))
      if (candidate && isModelAllowed(candidate)) {
        yield candidate;
        break;
      }
  }
}
//@ chunk-aepeg2w5.js:412735-412920 placement
function familyHasSpecificEntries(family, allowlist) {
  for (let idx = family.indexOf(allowlist); idx !== -1; idx = family.indexOf(allowlist, idx + 1)) {
    let boundaryBefore = idx === 0 || !/[a-z0-9]/i.test(family[idx - 1]);
    let afterFamily = idx + allowlist.length;
    let boundaryAfter = afterFamily === family.length || !/[a-z0-9]/i.test(family[afterFamily]);
    if (boundaryBefore && boundaryAfter) return true;
  }
  return false;
}
//@ chunk-aepeg2w5.js:412920-412956 placement
function isAliasOrExpandedSpelling(spelling) {
  return isModelKeyAlias(spelling) || isServedExpandedSpelling(spelling);
}
//@ chunk-aepeg2w5.js:412956-412985 placement
function resolveAliasEnvFree(alias) {
  return resolveModelAliasEnvFree(alias);
}
//@ chunk-aepeg2w5.js:412985-413129 placement
function modelBelongsToFamily(spelling, family, envFreeAliasResolution) {
  if (isAliasOrExpandedSpelling(spelling)) {
    if (envFreeAliasResolution) {
      let aliasEnvFree = resolveAliasEnvFree(spelling);
      if (aliasEnvFree !== null) return familyHasSpecificEntries(aliasEnvFree, family);
      return !isModelKeyAlias(spelling) && familyHasSpecificEntries(spelling, family);
    }
    return familyHasSpecificEntries(parseUserSpecifiedModel(spelling).toLowerCase(), family);
  }
  return familyHasSpecificEntries(spelling, family);
}
//@ chunk-aepeg2w5.js:413129-413221 file-local
/**
 * e 以 n 开头且后面是结尾或 "-"（版本前缀边界匹配）。
 */
function prefixMatchesModel(modelName, prefix) {
  if (!modelName.startsWith(prefix)) return false;
  return modelName.length === prefix.length || modelName[prefix.length] === "-";
}
//@ chunk-aepeg2w5.js:413221-413363 placement (2.1.88 match: modelMatchesVersionPrefix, 1)
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
function familyKeyForModel(model, overrides) {
  for (let [key, value] of Object.entries(overrides)) if (sameModelSpelling(value, model)) return key;
  return model;
}
//@ chunk-aepeg2w5.js:413442-413601 placement
function aliasExpansionPermitted(spelling, options) {
  let canonical = strip1mSuffix(parseUserSpecifiedModel(spelling).trim().toLowerCase());
  let aliasEnvFree = resolveAliasEnvFree(spelling);
  if (aliasEnvFree !== null && strip1mSuffix(aliasEnvFree) === canonical) return true;
  if (isModelKeyAlias(canonical)) return false;
  return isModelAllowed(canonical, {
    ...options,
    envFreeAliasResolution: true,
  });
}
//@ chunk-aepeg2w5.js:413601-413620 placement
var weakMap_4; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aepeg2w5.js:413601", () => {
  weakMap_4 = new WeakMap();
});
//@ chunk-aepeg2w5.js:413620-413742 placement
function parseDeniedEntries(deniedModels) {
  let parsed = weakMap_4.get(deniedModels);
  if (parsed === undefined) {
    parsed = deniedModels.flatMap((raw) => {
      let { entry } = parseDeniedModelEntry(raw);
      return entry ? [entry] : [];
    });
    weakMap_4.set(deniedModels, parsed);
  }
  return parsed;
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
  ].filter((map) => map !== undefined);
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
function parseCanonicalModel(model, overridesMap) {
  try {
    return parseModelId(
      getCanonicalName(
        model,
        overridesMap === undefined
          ? {
              identity: true,
            }
          : {
              identity: true,
              overridesMap,
            },
      ),
    );
  } catch {
    return null;
  }
}
//@ chunk-aepeg2w5.js:414149-414247 placement
function tailSegmentOrUndefined(model) {
  let trimmed = model.slice(model.lastIndexOf("/") + 1).trim();
  return model.includes("/") && trimmed !== "" ? trimmed : undefined;
}
//@ chunk-aepeg2w5.js:414247-414414 placement
function deniedModelsEntryMatches(entry, value, parsed) {
  switch (entry.kind) {
    case "literal":
      return value === entry.value;
    case "family":
      return parsed?.family === entry.family || familyHasSpecificEntries(value, entry.family);
    case "model":
      return parsed !== null && versionEntryMatches(entry.id, parsed);
  }
}
//@ chunk-aepeg2w5.js:414414-415347 placement
function isModelDeniedByManagedSettings(model) {
  let { entries, overrideMaps } = getDeniedModelsPolicy();
  if (entries.length === 0) return false;
  let stripped = stripAnyVersatileSuffix(model.trim());
  let resolved = stripAnyVersatileSuffix(parseUserSpecifiedModel(stripped).trim());
  let names = new Set([stripped, resolved]);
  for (let name of [...names]) {
    let tail = tailSegmentOrUndefined(name);
    if (tail !== undefined) names.add(tail);
  }
  let mapped = [...names].map((name) => name.toLowerCase());
  let families = new Set();
  for (let { rowId, names: names_2, families: families_2 } of getPublishedRowNameGroups()) {
    let mapped_2 = names_2.map((name) => stripAnyVersatileSuffix(name.trim()));
    let rowCanonical = firstPartyNameToCanonical(rowId);
    if (
      mapped_2.some((rowName) => mapped.includes(rowName.toLowerCase())) ||
      (!isRecognizedCanonical(rowCanonical) &&
        mapped.some((name) => firstPartyNameToCanonical(name) === rowCanonical))
    ) {
      mapped_2.forEach((rowName) => names.add(rowName));
      for (let family of families_2) families.add(family);
    }
  }
  if (entries.some((entry) => entry.kind === "family" && families.has(entry.family))) return true;
  let lowerNames = new Set([...names].map((name) => name.toLowerCase()));
  for (let overrideMap of overrideMaps)
    for (let [key, value] of Object.entries(overrideMap))
      if (parseModelId(value) === null && [...lowerNames].some((name) => sameModelSpelling(value, name)))
        lowerNames.add(strip1mSuffix(key.trim().toLowerCase()));
  let merged = Object.assign({}, ...overrideMaps);
  let matchesEntry = (value, parsed) =>
    entries.some((entry) => deniedModelsEntryMatches(entry, value, parsed));
  let matchesCanonical = (raw, value) =>
    matchesEntry(value, parseCanonicalModel(raw)) || matchesEntry(value, parseCanonicalModel(raw, merged));
  for (let name of lowerNames) {
    let modelId = parseModelId(name);
    if (
      modelId !== null
        ? matchesEntry(name, modelId)
        : matchesEntry(name, null) || matchesCanonical(name, name)
    )
      return true;
  }
  for (let name of names) {
    let lower = name.toLowerCase();
    if (parseModelId(lower) === null && matchesCanonical(name, lower)) return true;
  }
  return false;
}
//@ chunk-aepeg2w5.js:415347-415421 placement
function isExactModelsMatch() {
  return getSettingsForSource("policySettings")?.availableModelsMatch === "exact";
}
//@ chunk-aepeg2w5.js:415421-415556 placement
function getAliasBaseModel(spelling, envFreeAliasResolution) {
  if (isAliasOrExpandedSpelling(spelling)) return null;
  let resolved = envFreeAliasResolution
    ? resolveAliasEnvFree(spelling)
    : parseUserSpecifiedModel(spelling).trim().toLowerCase();
  if (resolved === null) return null;
  let stripped = strip1mSuffix(resolved);
  return stripped === spelling ? null : stripped;
}
//@ chunk-aepeg2w5.js:415556-415739 placement
function entryMatchesModel(model, entry, envFreeAliasResolution) {
  let classified = classifyModelListEntry(entry);
  if (classified.kind === "family") return true;
  if (classified.kind !== "model") return false;
  let resolved = isAliasOrExpandedSpelling(model)
    ? envFreeAliasResolution
      ? (resolveAliasEnvFree(model) ?? model)
      : strip1mSuffix(parseUserSpecifiedModel(model).toLowerCase())
    : model;
  let modelId = parseModelId(resolved);
  return modelId !== null && modelEntryMatches(classified, modelId, isLatestAlias(resolved, modelId));
}
//@ chunk-aepeg2w5.js:415739-415945 placement
function isExcludedByExactAllowlist(model) {
  let settingsForSource = getSettingsForSource("policySettings");
  if (settingsForSource?.availableModelsMatch !== "exact") return false;
  let availableModels = settingsForSource.availableModels;
  if (
    availableModels === undefined ||
    availableModels.every((availableModel) => classifyModelListEntry(availableModel).kind === "ignored")
  )
    return false;
  return !isModelAllowed(model, {
    allowlist: [...availableModels],
  });
}
//@ chunk-aepeg2w5.js:415945-415982 placement
function isBlockedByManagedModelPolicy(model) {
  return isModelDeniedByManagedSettings(model) || isExcludedByExactAllowlist(model);
}
//@ chunk-aepeg2w5.js:415982-417015 placement
function managedDenyStartupRefusal(model, phase = "start") {
  let denied;
  let excluded;
  try {
    denied = isModelDeniedByManagedSettings(model);
    excluded = !denied && isExcludedByExactAllowlist(model);
  } catch {
    return phase === "start"
      ? null
      : "Can't switch to the default model: Claude Code couldn't read your organization's managed settings to check which models they allow. Restart Claude Code; if this keeps happening, ask your administrator to check the managed settings.";
  }
  if (excluded)
    return `${phase === "start" ? "Claude Code can't start" : "Can't switch to the default model"}: your organization allows only the models listed in "availableModels", and none of them can be used as the default model (${displayModelName(strip1mSuffix(model))} isn't listed). Ask your administrator to update "availableModels".`;
  if (!denied) return null;
  return `${phase === "start" ? `Claude Code can't start: your organization's managed settings block the default model (${displayModelName(strip1mSuffix(model))}) in "deniedModels"` : `Can't switch to the default model: your organization's managed settings block it (${displayModelName(strip1mSuffix(model))}) in "deniedModels"`}, and none of the models they allow can be used as the default instead. Ask your administrator to update "deniedModels" or "availableModels".`;
}
//@ chunk-aepeg2w5.js:417015-418331 placement
function isModelAllowed(modelName, options) {
  try {
    if (isModelDeniedByManagedSettings(modelName)) return false;
  } catch {
    return false;
  }
  if (options?.allowlist === undefined) {
    try {
      if (adminPolicyLoadFailureRefusesLaunch()) return false;
    } catch {
      return false;
    }
    if (!options?.skipEntitlementDenyOverlay && isModelDenied(modelName, getModelEntitlementDenySet()))
      return false;
  }
  let settings = getSettings_DEPRECATED() || {};
  let allowlist = options?.allowlist ?? settings.availableModels;
  if (!allowlist) return true;
  if (allowlist.length === 0) return false;
  let exactMatch;
  try {
    exactMatch = isExactModelsMatch();
  } catch {
    return false;
  }
  let entries = (
    exactMatch ? allowlist.filter((entry) => classifyModelListEntry(entry).kind !== "ignored") : allowlist
  ).map((entry) => strip1mSuffix(entry.trim().toLowerCase()));
  if (entries.length === 0) return false;
  let normalizedModel = strip1mSuffix(modelName.trim().toLowerCase());
  if (exactMatch) {
    let spelling = getAliasBaseModel(normalizedModel, options?.envFreeAliasResolution);
    if (
      spelling !== null &&
      (getAliasBaseModel(spelling, options?.envFreeAliasResolution) !== null ||
        !isModelAllowed(spelling, options))
    )
      return false;
  }
  if (entries.includes(normalizedModel) && !isBaseModelKey(normalizedModel)) {
    if (
      options?.envFreeAliasResolution ||
      !isAliasOrExpandedSpelling(normalizedModel) ||
      aliasExpansionPermitted(normalizedModel, options)
    )
      return true;
  }
  let familyKey;
  if (options?.overridesMap !== undefined) familyKey = familyKeyForModel(modelName, options.overridesMap);
  else if (options?.ignoreModelOverrides) familyKey = modelName;
  else {
    let settings;
    try {
      settings = getSettingsForSource("policySettings");
    } catch {
      return false;
    }
    familyKey =
      settings?.availableModels !== undefined
        ? familyKeyForModel(modelName, settings.modelOverrides ?? getPairedPolicyModelOverrides() ?? {})
        : reverseModelOverride(modelName);
  }
  let normalizedFamilyKey = strip1mSuffix(familyKey.trim().toLowerCase());
  if (entries.includes(normalizedFamilyKey)) {
    if (!isBaseModelKey(normalizedFamilyKey) || !anyEntryHasModelPrefix(normalizedFamilyKey, entries)) {
      if (
        options?.envFreeAliasResolution ||
        normalizedFamilyKey !== normalizedModel ||
        !isAliasOrExpandedSpelling(normalizedFamilyKey) ||
        aliasExpansionPermitted(normalizedFamilyKey, options)
      )
        return true;
    }
  }
  for (let entry of entries)
    if (
      isBaseModelKey(entry) &&
      !anyEntryHasModelPrefix(entry, entries) &&
      modelBelongsToFamily(normalizedFamilyKey, entry, options?.envFreeAliasResolution)
    )
      return true;
  if (isAliasOrExpandedSpelling(normalizedFamilyKey)) {
    let baseModel = strip1mSuffix(parseUserSpecifiedModel(normalizedFamilyKey).toLowerCase());
    if (entries.includes(baseModel)) return true;
  }
  for (let entry of entries)
    if (!isBaseModelKey(entry) && isModelKeyAlias(entry)) {
      let modelAliasEnvFree = resolveModelAliasEnvFree(entry);
      if (modelAliasEnvFree !== null && strip1mSuffix(modelAliasEnvFree) === normalizedFamilyKey) return true;
    }
  for (let entry of entries)
    if (
      !isBaseModelKey(entry) &&
      !isModelKeyAlias(entry) &&
      modelMatchesVersionPrefix(normalizedFamilyKey, entry) &&
      (!exactMatch || entryMatchesModel(normalizedFamilyKey, entry, options?.envFreeAliasResolution))
    )
      return true;
  return false;
}
//@ chunk-hwmsct5x.js:221057-221128 fingerprint (2.1.88 match: isModelAllowed, 1)
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
