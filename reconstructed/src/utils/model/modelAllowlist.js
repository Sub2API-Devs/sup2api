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
import { Lt, parseModelId, Sv, Nb, Bn, I_ } from "./modelIds.js";
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
import { getProviderState, FXt } from "./providerCaches.js";
import { reprobeDeniedSessionModel } from "./sessionModelRestriction.js";
import { getMainLoopModel, isServedExpandedSpelling } from "./model.js";
import { Vte } from "./modelCatalog/servedCatalog.js";
import { No } from "./modelCatalog.js";
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

/**
 * "claude-"。覆盖错配旧名 modelMatchesVersionPrefix。
 */
//@ chunk-aepeg2w5.js:135402-135419 fingerprint = modelMatchesVersionPrefix (1)
var CLAUDE_MODEL_PREFIX = "claude-";
//@ chunk-aepeg2w5.js:409865-409991 placement
function normalizeForDenyMatch(e) {
  let n = Lt(e.trim().toLowerCase()),
    r = parseModelId(n);
  if (r) return formatModelId(r);
  let s = getCanonicalName(n, { identity: !0 }),
    h = parseModelId(s);
  return h ? formatModelId(h) : s;
}
//@ chunk-aepeg2w5.js:409991-410148 placement
function formatModelId({
  family: family,
  major: major,
  minor: minor,
  legacyVersionFirst: legacyVersionFirst,
  trailer: trailer,
}) {
  let y = minor ? `${major}-${minor}` : `${major}`;
  return `${legacyVersionFirst ? `claude-${y}-${family}` : `claude-${family}-${y}`}${trailer ?? ""}`;
}
//@ chunk-aepeg2w5.js:410148-410242 placement
function Dk(e) {
  let n = new Set();
  for (let r of e ?? []) if (!r.entitled) n.add(normalizeForDenyMatch(r.apiName));
  return n;
}
/**
 * [settings.modelOverrides, 托管配对覆盖]。
 */
//@ chunk-aepeg2w5.js:410242-410319 placement = applyModelOverrides (1)
function getModelOverrideMaps() {
  let e;
  try {
    e = getInitialSettings_2().modelOverrides;
  } catch {
    e = void 0;
  }
  return [e, getPairedPolicyModelOverrides()];
}
/**
 * 模型是某覆盖的目标且其键在集合中。
 */
//@ chunk-aepeg2w5.js:410319-410469 placement
function isOverriddenModelInSet(e, n) {
  for (let r of getModelOverrideMaps()) {
    if (r === void 0) continue;
    for (let [s, h] of Object.entries(r)) {
      if (!Sv(h, e)) continue;
      if (n.has(normalizeForDenyMatch(s))) return !0;
    }
  }
  return !1;
}
//@ chunk-aepeg2w5.js:410469-410608 placement
function isModelDenied(e, n) {
  if (n.size === 0) return !1;
  let r = Lt(e.trim().toLowerCase());
  return (ar(r) ? [r, Lt(parseUserSpecifiedModel(r))] : [r]).some(
    (h) => n.has(normalizeForDenyMatch(h)) || isOverriddenModelInSet(h, n),
  );
}
//@ chunk-aepeg2w5.js:410608-410647 placement
function denyEntryMatchesModel(e, n) {
  return isModelDenied(n, Dk([e]));
}
//@ chunk-aepeg2w5.js:410647-410991 placement
function getModelEntitlementDenySet() {
  let e = getAPIProvider();
  if (e !== "firstParty" && e !== "gateway") return new Set();
  let n = Dk(getModelAccessCache());
  if (n.size === 0) return n;
  let r = getProviderState(),
    { overturnedEntitlementDenies: overturnedEntitlementDenies } = r.providerCache,
    { contestedDenies: contestedDenies } = r.sessionModelDenyReprobe;
  if (overturnedEntitlementDenies.size > 0 || contestedDenies.size > 0) {
    let now = Date.now();
    for (let [S, w] of overturnedEntitlementDenies) if (now - w < FXt) n.delete(S);
    for (let [S, w] of contestedDenies) if (w > now) n.delete(S);
  }
  return n;
}
//@ chunk-aepeg2w5.js:410991-411196 placement
function noteHonoredSessionModel(e) {
  let sessionModelDenyReprobe = getProviderState().sessionModelDenyReprobe;
  if ((sessionModelDenyReprobe.honoredModels.add(e), !sessionModelDenyReprobe.refusedModels.has(e))) return;
  let now = Date.now();
  for (let s of sessionModelDenyReprobe.contestedDenies.values()) if (s > now) return;
  sessionModelDenyReprobe.refusedModels.delete(e);
}
//@ chunk-aepeg2w5.js:411196-411666 placement
function keepsHonoredModelOnCachedDeny(e) {
  let sessionModelDenyReprobe = getProviderState().sessionModelDenyReprobe;
  if (
    sessionModelDenyReprobe.reprobe === void 0 ||
    !sessionModelDenyReprobe.honoredModels.has(e) ||
    sessionModelDenyReprobe.refusedModels.has(e) ||
    !isModelAllowed(e, { skipEntitlementDenyOverlay: !0 })
  )
    return !1;
  let { confirmedEntitlementDenies: confirmedEntitlementDenies } = getProviderState().providerCache,
    now = Date.now(),
    h = [];
  for (let y of getModelAccessCache())
    if (!y.entitled && denyEntryMatchesModel(y, e)) {
      let S = normalizeForDenyMatch(y.apiName),
        w = confirmedEntitlementDenies.get(S);
      if (w !== void 0 && now - w < FXt) return (sessionModelDenyReprobe.refusedModels.add(e), !1);
      h.push(S);
    }
  if (h.length === 0) return !1;
  return reprobeDeniedSessionModel({ model: e, rowDenyKeys: h, describeFallbackModel: getMainLoopModel });
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
/**
 * 某模型是否在订阅内：优先用 modelAccessCache 的 entitled，第一方 API key 用户视为有，订阅用户按 pro/max/team。
 */
//@ chunk-aepeg2w5.js:411752-411973 placement = isMaxSubscriber (0.303)
function isModelKnownServedToOrg(e) {
  if (getAPIProvider() !== "firstParty") return !1;
  let n = getModelAccessCache();
  if (n.length > 0) {
    let s = normalizeForDenyMatch(e);
    return n.some((h) => h.entitled && normalizeForDenyMatch(h.apiName) === s);
  }
  if (!isClaudeAISubscriber()) return getApiKeySourceSafe() !== "none";
  let r = getSubscriptionType();
  return r === "pro" || r === "max" || r === "team";
}
//@ chunk-aepeg2w5.js:411973-412057 placement = logEventTo1P (1)
function getOrgModelDefault() {
  if (getAPIProvider() !== "firstParty") return null;
  if (Vte()) return null;
  return getOrgModelDefaultCache();
}
//@ chunk-aepeg2w5.js:412057-412138 placement
function getOrgModelDefaultUpdatedAt() {
  if (getAPIProvider() !== "firstParty") return null;
  return getOrgModelDefaultCache()?.updated_at ?? null;
}
//@ chunk-aepeg2w5.js:412138-412205 placement = returnValue (1)
function newestAllowedInFamily(as) {
  let n = iterateFirstPartyModelIds(as).next();
  return n.done === !0 ? null : n.value;
}
//@ chunk-aepeg2w5.js:412205-412347 placement
function* iterateFirstPartyModelIds(e) {
  let keys = Object.keys(No);
  for (let r = keys.length - 1; r >= 0; r--) {
    let firstParty = No[keys[r]].firstParty;
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
  let n = allowedVersionsInFamilyForProvider(as).next();
  return n.done === !0 ? null : n.value;
}
//@ chunk-aepeg2w5.js:412415-412735 placement
function* allowedVersionsInFamilyForProvider(e) {
  if (usesFirstPartyModelIds()) {
    yield* iterateFirstPartyModelIds(e);
    return;
  }
  let n = getAPIProvider();
  if (n === "foundry") return;
  let r = getModelStrings(),
    s = getRawModelStrings(),
    keys = Object.keys(No);
  for (let y = keys.length - 1; y >= 0; y--) {
    let S = keys[y],
      w = No[S];
    if (
      w[n] === null ||
      parseModelId(w.firstParty)?.family !== e ||
      isModelRemappedOrRetired(w.firstParty) ||
      isModelDeprecated(w.firstParty)
    )
      continue;
    for (let R of new Set([r[S], s[S]]))
      if (R && isModelAllowed(R)) {
        yield R;
        break;
      }
  }
}
//@ chunk-aepeg2w5.js:412735-412920 placement
function familyHasSpecificEntries(family, allowlist) {
  for (let idx = family.indexOf(allowlist); idx !== -1; idx = family.indexOf(allowlist, idx + 1)) {
    let s = idx === 0 || !/[a-z0-9]/i.test(family[idx - 1]),
      afterFamily = idx + allowlist.length,
      y = afterFamily === family.length || !/[a-z0-9]/i.test(family[afterFamily]);
    if (s && y) return !0;
  }
  return !1;
}
//@ chunk-aepeg2w5.js:412920-412956 placement
function ar(e) {
  return Nb(e) || isServedExpandedSpelling(e);
}
//@ chunk-aepeg2w5.js:412956-412985 placement
function Iu(e) {
  return resolveModelAliasEnvFree(e);
}
//@ chunk-aepeg2w5.js:412985-413129 placement
function modelBelongsToFamily(e, n, r) {
  if (ar(e)) {
    if (r) {
      let s = Iu(e);
      if (s !== null) return familyHasSpecificEntries(s, n);
      return !Nb(e) && familyHasSpecificEntries(e, n);
    }
    return familyHasSpecificEntries(parseUserSpecifiedModel(e).toLowerCase(), n);
  }
  return familyHasSpecificEntries(e, n);
}
/**
 * e 以 n 开头且后面是结尾或 "-"（版本前缀边界匹配）。
 */
//@ chunk-aepeg2w5.js:413129-413221 file-local
function prefixMatchesModel(modelName, prefix) {
  if (!modelName.startsWith(prefix)) return !1;
  return modelName.length === prefix.length || modelName[prefix.length] === "-";
}
/**
 * 模型（别名先解析）是否匹配版本前缀 n（允许省略 claude-）。
 */
//@ chunk-aepeg2w5.js:413221-413363 placement = modelMatchesVersionPrefix (1)
function modelMatchesVersionPrefix(model, entry) {
  let resolvedModel = ar(model) ? Lt(parseUserSpecifiedModel(model).toLowerCase()) : model;
  if (prefixMatchesModel(resolvedModel, entry)) return !0;
  if (!entry.startsWith("claude-") && prefixMatchesModel(resolvedModel, `claude-${entry}`)) return !0;
  return !1;
}
//@ chunk-aepeg2w5.js:413363-413442 placement
function Ok(e, n) {
  for (let [r, s] of Object.entries(n)) if (Sv(s, e)) return r;
  return e;
}
//@ chunk-aepeg2w5.js:413442-413601 placement
function aliasExpansionPermitted(e, n) {
  let r = Lt(parseUserSpecifiedModel(e).trim().toLowerCase()),
    s = Iu(e);
  if (s !== null && Lt(s) === r) return !0;
  if (Nb(r)) return !1;
  return isModelAllowed(r, { ...n, envFreeAliasResolution: !0 });
}
//@ chunk-aepeg2w5.js:413601-413620 placement
var weakMap_4 = new WeakMap();
//@ chunk-aepeg2w5.js:413620-413742 placement
function parseDeniedEntries(e) {
  let n = weakMap_4.get(e);
  if (n === void 0)
    ((n = e.flatMap((r) => {
      let { entry: entry } = parseDeniedModelEntry(r);
      return entry ? [entry] : [];
    })),
      weakMap_4.set(e, n));
  return n;
}
//@ chunk-aepeg2w5.js:413742-413778 placement
var lK = { entries: [], overrideMaps: [] };
//@ chunk-aepeg2w5.js:413778-413974 placement
function getDeniedModelsPolicy() {
  let e = getSettingsForSource("policySettings"),
    n = e?.deniedModels;
  if (n === void 0 || n.length === 0) return lK;
  let filtered = [
    e?.modelOverrides,
    getPairedPolicyModelOverrides(),
    getDeniedModelsPolicyOverrides(),
  ].filter((s) => s !== void 0);
  return { entries: parseDeniedEntries(n), overrideMaps: filtered };
}
//@ chunk-aepeg2w5.js:413974-414038 placement
function hasManagedModelDenies() {
  try {
    return getDeniedModelsPolicy().entries.length > 0;
  } catch {
    return !0;
  }
}
//@ chunk-aepeg2w5.js:414038-414149 placement
function parseCanonicalModel(e, n) {
  try {
    return parseModelId(
      getCanonicalName(e, n === void 0 ? { identity: !0 } : { identity: !0, overridesMap: n }),
    );
  } catch {
    return null;
  }
}
//@ chunk-aepeg2w5.js:414149-414247 placement
function dK(e) {
  let trimmed = e.slice(e.lastIndexOf("/") + 1).trim();
  return e.includes("/") && trimmed !== "" ? trimmed : void 0;
}
//@ chunk-aepeg2w5.js:414247-414414 placement
function deniedModelsEntryMatches(e, n, r) {
  switch (e.kind) {
    case "literal":
      return n === e.value;
    case "family":
      return r?.family === e.family || familyHasSpecificEntries(n, e.family);
    case "model":
      return r !== null && versionEntryMatches(e.id, r);
  }
}
//@ chunk-aepeg2w5.js:414414-415347 placement
function isModelDeniedByManagedSettings(e) {
  let { entries: entries, overrideMaps: overrideMaps } = getDeniedModelsPolicy();
  if (entries.length === 0) return !1;
  let s = Bn(e.trim()),
    h = Bn(parseUserSpecifiedModel(s).trim()),
    y = new Set([s, h]);
  for (let L of [...y]) {
    let G = dK(L);
    if (G !== void 0) y.add(G);
  }
  let mapped = [...y].map((L) => L.toLowerCase()),
    w = new Set();
  for (let { rowId: rowId, names: names, families: families } of getPublishedRowNameGroups()) {
    let mapped_2 = names.map((Q) => Bn(Q.trim())),
      q = firstPartyNameToCanonical(rowId);
    if (
      mapped_2.some((Q) => mapped.includes(Q.toLowerCase())) ||
      (!isRecognizedCanonical(q) && mapped.some((Q) => firstPartyNameToCanonical(Q) === q))
    ) {
      mapped_2.forEach((Q) => y.add(Q));
      for (let Q of families) w.add(Q);
    }
  }
  if (entries.some((L) => L.kind === "family" && w.has(L.family))) return !0;
  let R = new Set([...y].map((L) => L.toLowerCase()));
  for (let L of overrideMaps)
    for (let [G, j] of Object.entries(L))
      if (parseModelId(j) === null && [...R].some((ee) => Sv(j, ee))) R.add(Lt(G.trim().toLowerCase()));
  let merged = Object.assign({}, ...overrideMaps),
    P = (L, G) => entries.some((j) => deniedModelsEntryMatches(j, L, G)),
    F = (L, G) => P(G, parseCanonicalModel(L)) || P(G, parseCanonicalModel(L, merged));
  for (let L of R) {
    let G = parseModelId(L);
    if (G !== null ? P(L, G) : P(L, null) || F(L, L)) return !0;
  }
  for (let L of y) {
    let lower = L.toLowerCase();
    if (parseModelId(lower) === null && F(L, lower)) return !0;
  }
  return !1;
}
//@ chunk-aepeg2w5.js:415347-415421 placement
function cK() {
  return getSettingsForSource("policySettings")?.availableModelsMatch === "exact";
}
//@ chunk-aepeg2w5.js:415421-415556 placement
function getAliasBaseModel(e, n) {
  if (ar(e)) return null;
  let r = n ? Iu(e) : parseUserSpecifiedModel(e).trim().toLowerCase();
  if (r === null) return null;
  let s = Lt(r);
  return s === e ? null : s;
}
//@ chunk-aepeg2w5.js:415556-415739 placement
function entryMatchesModel(e, n, r) {
  let s = classifyModelListEntry(n);
  if (s.kind === "family") return !0;
  if (s.kind !== "model") return !1;
  let h = ar(e) ? (r ? (Iu(e) ?? e) : Lt(parseUserSpecifiedModel(e).toLowerCase())) : e,
    y = parseModelId(h);
  return y !== null && modelEntryMatches(s, y, isLatestAlias(h, y));
}
//@ chunk-aepeg2w5.js:415739-415945 placement
function isExcludedByExactAllowlist(e) {
  let n = getSettingsForSource("policySettings");
  if (n?.availableModelsMatch !== "exact") return !1;
  let availableModels = n.availableModels;
  if (
    availableModels === void 0 ||
    availableModels.every((s) => classifyModelListEntry(s).kind === "ignored")
  )
    return !1;
  return !isModelAllowed(e, { allowlist: [...availableModels] });
}
//@ chunk-aepeg2w5.js:415945-415982 placement
function isBlockedByManagedModelPolicy(e) {
  return isModelDeniedByManagedSettings(e) || isExcludedByExactAllowlist(e);
}
//@ chunk-aepeg2w5.js:415982-417015 placement
function managedDenyStartupRefusal(e, n = "start") {
  let r, s;
  try {
    ((r = isModelDeniedByManagedSettings(e)), (s = !r && isExcludedByExactAllowlist(e)));
  } catch {
    return n === "start"
      ? null
      : "Can't switch to the default model: Claude Code couldn't read your organization's managed settings to check which models they allow. Restart Claude Code; if this keeps happening, ask your administrator to check the managed settings.";
  }
  if (s)
    return `${n === "start" ? "Claude Code can't start" : "Can't switch to the default model"}: your organization allows only the models listed in "availableModels", and none of them can be used as the default model (${displayModelName(Lt(e))} isn't listed). Ask your administrator to update "availableModels".`;
  if (!r) return null;
  return `${n === "start" ? `Claude Code can't start: your organization's managed settings block the default model (${displayModelName(Lt(e))}) in "deniedModels"` : `Can't switch to the default model: your organization's managed settings block it (${displayModelName(Lt(e))}) in "deniedModels"`}, and none of the models they allow can be used as the default instead. Ask your administrator to update "deniedModels" or "availableModels".`;
}
//@ chunk-aepeg2w5.js:417015-418331 placement
function isModelAllowed(e, n) {
  try {
    if (isModelDeniedByManagedSettings(e)) return !1;
  } catch {
    return !1;
  }
  if (n?.allowlist === void 0) {
    try {
      if (adminPolicyLoadFailureRefusesLaunch()) return !1;
    } catch {
      return !1;
    }
    if (!n?.skipEntitlementDenyOverlay && isModelDenied(e, getModelEntitlementDenySet())) return !1;
  }
  let r = getSettings_DEPRECATED() || {},
    s = n?.allowlist ?? r.availableModels;
  if (!s) return !0;
  if (s.length === 0) return !1;
  let h;
  try {
    h = cK();
  } catch {
    return !1;
  }
  let mapped = (h ? s.filter((x) => classifyModelListEntry(x).kind !== "ignored") : s).map((x) =>
    Lt(x.trim().toLowerCase()),
  );
  if (mapped.length === 0) return !1;
  let S = Lt(e.trim().toLowerCase());
  if (h) {
    let x = getAliasBaseModel(S, n?.envFreeAliasResolution);
    if (x !== null && (getAliasBaseModel(x, n?.envFreeAliasResolution) !== null || !isModelAllowed(x, n)))
      return !1;
  }
  if (mapped.includes(S) && !I_(S)) {
    if (n?.envFreeAliasResolution || !ar(S) || aliasExpansionPermitted(S, n)) return !0;
  }
  let w;
  if (n?.overridesMap !== void 0) w = Ok(e, n.overridesMap);
  else if (n?.ignoreModelOverrides) w = e;
  else {
    let x;
    try {
      x = getSettingsForSource("policySettings");
    } catch {
      return !1;
    }
    w =
      x?.availableModels !== void 0
        ? Ok(e, x.modelOverrides ?? getPairedPolicyModelOverrides() ?? {})
        : reverseModelOverride(e);
  }
  let R = Lt(w.trim().toLowerCase());
  if (mapped.includes(R)) {
    if (!I_(R) || !anyEntryHasModelPrefix(R, mapped)) {
      if (n?.envFreeAliasResolution || R !== S || !ar(R) || aliasExpansionPermitted(R, n)) return !0;
    }
  }
  for (let x of mapped)
    if (I_(x) && !anyEntryHasModelPrefix(x, mapped) && modelBelongsToFamily(R, x, n?.envFreeAliasResolution))
      return !0;
  if (ar(R)) {
    let x = Lt(parseUserSpecifiedModel(R).toLowerCase());
    if (mapped.includes(x)) return !0;
  }
  for (let x of mapped)
    if (!I_(x) && Nb(x)) {
      let P = resolveModelAliasEnvFree(x);
      if (P !== null && Lt(P) === R) return !0;
    }
  for (let x of mapped)
    if (
      !I_(x) &&
      !Nb(x) &&
      modelMatchesVersionPrefix(R, x) &&
      (!h || entryMatchesModel(R, x, n?.envFreeAliasResolution))
    )
      return !0;
  return !1;
}
/**
 * 未设 availableModels、无服务端白名单、无托管 enforced 条目时为真。旧版名 isModelAllowed 含义相反。
 */
//@ chunk-hwmsct5x.js:221057-221128 fingerprint = isModelAllowed (1)
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
  isModelAllowlistInactive,
  hasManagedModelDenies,
  newestAllowedInFamily,
  newestAllowedInFamilyForProvider,
  isBlockedByManagedModelPolicy,
  aliasExpansionPermitted,
  isModelKnownServedToOrg,
  allowedVersionsInFamilyForProvider,
};
