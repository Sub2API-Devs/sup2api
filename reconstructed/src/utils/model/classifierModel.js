/**
 * utils/model/classifierModel.ts
 *
 * 2.1.316 新增：从 ANTHROPIC_DEFAULT_SONNET_MODEL 推出分类器固定模型。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (19)
 * attribution: placement 19
 */
import { has1mSuffix, modelHasNative1MContext, isLegacyNo1mModel } from "./contextWindow1m.js";
import { getCanonicalName, strippedCanonicalName } from "./canonicalModelName.js";
import { nI } from "./bedrock.js";
import { Lt, Sv } from "./modelIds.js";
import { env } from "../env.js";
import { logForDebugging } from "../debug.js";
import { isModelAllowedUnderActiveEnforcement } from "./defaultModel.js";
import { isModelAllowed, isModelDenied, getModelEntitlementDenySet } from "./modelAllowlist.js";
import { getModelStrings, getRawModelStrings } from "./modelStrings.js";
import { withCatalogSuppressed, findServedModel, fo, uto, Vte } from "./modelCatalog/servedCatalog.js";
import {
  isFableFamilyOrPinnedModel,
  BK,
  resolveDefaultOpusModel,
  resolveModelAliasSpelling,
  isFableAvailable,
  isMythosAvailable,
} from "./model.js";
import { OPUS_FALLBACK_ORDER, MODEL_KEY_BY_FIRST_PARTY_ID } from "./configs.js";
import {
  usesFirstPartyModelIds,
  getAPIProvider,
  isFirstPartyAnthropicBaseUrl,
  providerCatalogKey,
  isActiveCatalogModel,
  isFirstPartyApiBackend,
} from "./providers.js";
import { firstPartyNameToCanonical } from "./modelFallback.js";
import { getGatewayModelOptions } from "../../services/gateway/gatewayDiscovery.js";
import { Wat, Rxt, getUnsupportedModelMessage, Zb } from "./modelCatalog/catalogCapabilities.js";
import { resolveCatalogAlias, getCatalogEntry } from "./modelCatalog.js";
import { markdownSafeText } from "../resultError.js";
import { getAdditionalModelOptionsCache } from "../auth.js";
import { isNonCustomFableModel, isNonCustomMythosModel } from "./smallFastModel.js";
import { getPublicModelDisplayName } from "./modelDisplay.js";
import { getUltraplanModel } from "../../commands/ultraplan.js";

/**
 * n 为 [1m] 或原生 1M 而 e 不是且 e 不是旧模型时给 e 加 [1m]。旧版名 resolveSkillModelOverride_2 为错配。
 */
//@ chunk-aepeg2w5.js:433227-433312 placement = resolveSkillModelOverride (1)
function inherit1mSuffix(skillModel, currentModel) {
  if (
    (has1mSuffix(currentModel) || modelHasNative1MContext(currentModel)) &&
    !has1mSuffix(skillModel) &&
    !isLegacyNo1mModel(getCanonicalName(skillModel))
  )
    return nI(skillModel + "[1m]");
  return skillModel;
}
//@ chunk-aepeg2w5.js:433312-433392 placement
var Pw = ["claude-sonnet-5-5", "claude-opus-5-5"],
  vw = !1,
  zK = [...Pw, "claude-opus-5"];
//@ chunk-aepeg2w5.js:433392-433469 placement
function isAllowedAutoModeClassifierPin(e) {
  return !zK.includes(Lt(getCanonicalName(e, { identity: !0, deterministic: !0 })));
}
/**
 * 从 ANTHROPIC_DEFAULT_SONNET_MODEL 推出分类器固定模型。
 */
//@ chunk-aepeg2w5.js:433469-433983 placement
function classifierPinFromEnv(e) {
  let n = strippedCanonicalName(e);
  if (n === "claude-sonnet-4-6" || n === "claude-sonnet-4-5") return;
  let ANTHROPIC_DEFAULT_SONNET_MODEL = env.ANTHROPIC_DEFAULT_SONNET_MODEL,
    h =
      ANTHROPIC_DEFAULT_SONNET_MODEL !== void 0 &&
      ANTHROPIC_DEFAULT_SONNET_MODEL === env.CLAUDE_CODE_3P_PROBE_WROTE_SONNET_DEFAULT
        ? void 0
        : ANTHROPIC_DEFAULT_SONNET_MODEL;
  if (h !== void 0 && Pw.includes(strippedCanonicalName(nI(h)))) {
    if (!vw)
      ((vw = !0),
        logForDebugging(
          `Auto mode classifier: ANTHROPIC_DEFAULT_SONNET_MODEL=${h} cannot serve as the classifier; using the Sonnet 5 default instead`,
        ));
    h = void 0;
  }
  if (
    h !== void 0 &&
    !(
      (isModelAllowedUnderActiveEnforcement(h) ?? isModelAllowed(h)) &&
      !isModelDenied(h, getModelEntitlementDenySet())
    )
  )
    return;
  if (h === void 0) {
    let sonnet5 = getModelStrings().sonnet5;
    if (!isModelAllowed(sonnet5)) return;
    h = sonnet5;
  }
  return inherit1mSuffix(nI(h), e);
}
//@ chunk-aepeg2w5.js:433983-434020 placement
function getPermissionClassifierExternalDefault(e) {
  return withCatalogSuppressed(() => classifierPinFromEnv(e));
}
//@ chunk-aepeg2w5.js:434020-434075 placement
function classifierFlagshipRerouteTarget(e) {
  if (isFableFamilyOrPinnedModel(e) || BK(e)) return resolveDefaultOpusModel(e);
  return e;
}
//@ chunk-aepeg2w5.js:434075-434113 placement
function getPermissionClassifierFlagshipRerouteTarget(e) {
  return withCatalogSuppressed(() => classifierFlagshipRerouteTarget(e));
}
//@ chunk-aepeg2w5.js:434113-434135 placement
var OPUS5 = "opus5",
  Fp = OPUS_FALLBACK_ORDER;
//@ chunk-aepeg2w5.js:434135-434233 placement
function $p() {
  let e = usesFirstPartyModelIds() ? catalogDefaultKeyForFamily("opus") : void 0;
  return e !== void 0 && Fp.indexOf(e) > OPUS_FALLBACK_ORDER.indexOf(OPUS5) ? e : OPUS5;
}
//@ chunk-aepeg2w5.js:434233-434308 placement
function getRefusalFallbackOpusLineupIds() {
  let e = getModelStrings();
  return Fp.slice(Fp.indexOf($p())).map((n) => e[n]);
}
//@ chunk-aepeg2w5.js:434308-434395 placement
function getRefusalFallbackOpusModel() {
  let ANTHROPIC_DEFAULT_OPUS_MODEL = env.ANTHROPIC_DEFAULT_OPUS_MODEL;
  return ANTHROPIC_DEFAULT_OPUS_MODEL !== void 0 ? nI(ANTHROPIC_DEFAULT_OPUS_MODEL) : getModelStrings()[$p()];
}
//@ chunk-aepeg2w5.js:434395-434429 placement
function enforcementRefusalFallbackOpusModel() {
  return getRawModelStrings()[$p()];
}
//@ chunk-aepeg2w5.js:434429-436118 placement
function getModelUnavailabilityReason(e, n) {
  let r = resolveModelAliasSpelling(e),
    s = n?.ignoreModelOverrides ? (re) => firstPartyNameToCanonical(Lt(re.toLowerCase()).trim()) : VK,
    h = s(e),
    y = s(r),
    S = (re) =>
      n?.ignoreModelOverrides ? s(re) : getCanonicalName(Lt(re.toLowerCase()).trim(), { identity: !0 }),
    w = S(e),
    R = S(r),
    any = getGatewayModelOptions().some(
      (re) =>
        re.disabled !== !0 &&
        typeof re.value === "string" &&
        (Sv(re.value, e) || Sv(re.value, r) || S(re.value) === w || S(re.value) === R),
    ),
    any_2 = (
      getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl()
        ? [
            env.ANTHROPIC_DEFAULT_FABLE_MODEL,
            env.ANTHROPIC_DEFAULT_OPUS_MODEL,
            env.ANTHROPIC_DEFAULT_SONNET_MODEL,
            env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
            env.ANTHROPIC_CUSTOM_MODEL_OPTION,
            ...(Wat()
              ? []
              : ["opus", "sonnet", "haiku"].map((re) =>
                  resolveCatalogAlias(re, providerCatalogKey(getAPIProvider())),
                )),
          ]
        : []
    ).some((re) => re !== void 0 && (Sv(re, e) || Sv(re, r) || S(re) === w || S(re) === R)),
    L =
      any || any_2
        ? void 0
        : (findServedModel(e, r, h, y) ??
          fo().find((re) => !isActiveCatalogModel(re) && (s(re.id) === h || s(re.id) === y))),
    G = any || any_2 ? void 0 : uto(e),
    ee =
      G !== void 0 &&
      (!isActiveCatalogModel(G) || (isFirstPartyApiBackend() && !Rxt(G))) &&
      (L === void 0 || isActiveCatalogModel(L))
        ? G
        : L;
  if (ee !== void 0 && !isActiveCatalogModel(ee))
    return {
      reason: "disabled",
      description:
        markdownSafeText(ee.selection_notice?.text ?? ee.notice?.text ?? "") ||
        markdownSafeText(ee.description ?? "") ||
        "Not available",
    };
  if (ee !== void 0 && isFirstPartyApiBackend() && !Rxt(ee))
    return { reason: "disabled", description: getUnsupportedModelMessage(ee), notOffered: !0 };
  if (getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl()) return null;
  if (!Vte()) {
    let found = getAdditionalModelOptionsCache().find(
      (se) => se.disabled === !0 && typeof se.value === "string" && (s(se.value) === h || s(se.value) === y),
    );
    if (found) return { reason: "disabled", description: found.description };
  }
  let q = n?.ignoreModelOverrides ? firstPartyNameToCanonical(r) : getCanonicalName(r, { identity: !0 }),
    Q = Vte()
      ? fo().some((re) => isActiveCatalogModel(re) && (s(re.id) === h || s(re.id) === y))
      : getAdditionalModelOptionsCache().some(
          (re) =>
            re.disabled !== !0 && typeof re.value === "string" && (s(re.value) === h || s(re.value) === y),
        );
  if (!Q && !isFableAvailable() && isNonCustomFableModel(q))
    return { reason: "absent", displayName: getPublicModelDisplayName(r) ?? "That model" };
  if (!Q && !isMythosAvailable(q) && isNonCustomMythosModel(q))
    return { reason: "absent", displayName: getPublicModelDisplayName(r) ?? "That model" };
  return null;
}
//@ chunk-aepeg2w5.js:436118-436171 placement
function VK(e) {
  return getCanonicalName(Lt(e.toLowerCase()).trim());
}
//@ chunk-aepeg2w5.js:436171-436194 placement
function antUpstreamContextWindow(e) {
  return;
}
//@ chunk-aepeg2w5.js:436194-436219 placement
function antGrants1MContext(e) {
  return !1;
}
//@ chunk-aepeg2w5.js:436219-436288 placement
function ju(e, n, r = getAPIProvider()) {
  let s = catalogDefaultKeyForFamily(e, r);
  return s !== void 0 ? n[s] : void 0;
}
//@ chunk-aepeg2w5.js:436288-436421 placement
function catalogDefaultKeyForFamily(e, n = getAPIProvider()) {
  let r = resolveCatalogAlias(e, providerCatalogKey(n));
  if (r === void 0) return;
  let s = getCatalogEntry(r)?.provider_ids.first_party;
  return s !== void 0 ? MODEL_KEY_BY_FIRST_PARTY_ID[s] : void 0;
}
//@ chunk-aepeg2w5.js:436421-436484 placement
function Mw(e) {
  let n = Zb(e);
  return n === void 0 || getUltraplanModel(e, n) ? void 0 : n;
}

export {
  inherit1mSuffix,
  Mw,
  ju,
  antGrants1MContext,
  catalogDefaultKeyForFamily,
  getModelUnavailabilityReason,
  antUpstreamContextWindow,
  getPermissionClassifierFlagshipRerouteTarget,
  getPermissionClassifierExternalDefault,
  isAllowedAutoModeClassifierPin,
  enforcementRefusalFallbackOpusModel,
  getRefusalFallbackOpusModel,
  getRefusalFallbackOpusLineupIds,
  classifierFlagshipRerouteTarget,
};
