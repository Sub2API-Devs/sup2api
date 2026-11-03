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
import { has1mSuffix_2, modelHasNative1MContext, isLegacyNo1mModel } from "./contextWindow1m.js";
import { getCanonicalName, strippedCanonicalName } from "./canonicalModelName.js";
import { identityModelId } from "./bedrock.js";
import { strip1mSuffix, sameModelSpelling } from "./modelIds.js";
import { env } from "../env.js";
import { logForDebugging } from "../debug.js";
import { isModelAllowedUnderActiveEnforcement } from "./defaultModel.js";
import { isModelAllowed, isModelDenied, getModelEntitlementDenySet } from "./modelAllowlist.js";
import { getModelStrings, getRawModelStrings } from "./modelStrings.js";
import {
  withCatalogSuppressed,
  findServedModel,
  activeCatalogModels,
  findActiveServedByIdentity,
  isServedCatalogActive,
} from "./modelCatalog/servedCatalog.js";
import {
  isFableFamilyOrPinnedModel,
  isMythosModelValue_2,
  resolveDefaultOpusModel,
  resolveModelAliasSpelling,
  isFableAvailable,
  isMythosAvailable,
} from "./model.js";
import { OPUS_FALLBACK_ORDER as OPUS_FALLBACK_ORDER_2, MODEL_KEY_BY_FIRST_PARTY_ID } from "./configs.js";
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
import {
  supportsFamilyOverride,
  activeCatalogRowKnown,
  getUnsupportedModelMessage,
  activeFamilyDefault,
} from "./modelCatalog/catalogCapabilities.js";
import { resolveCatalogAlias, getCatalogEntry } from "./modelCatalog.js";
import { markdownSafeText } from "../resultError.js";
import { getAdditionalModelOptionsCache } from "../auth.js";
import { isNonCustomFableModel, isNonCustomMythosModel } from "./smallFastModel.js";
import { getPublicModelDisplayName } from "./modelDisplay.js";
import { getUltraplanModel } from "../../commands/ultraplan.js";

//@ chunk-aepeg2w5.js:433227-433312 placement = resolveSkillModelOverride (1)
/**
 * n 为 [1m] 或原生 1M 而 e 不是且 e 不是旧模型时给 e 加 [1m]。旧版名 resolveSkillModelOverride_2 为错配。
 */
function inherit1mSuffix(skillModel, currentModel) {
  if (
    (has1mSuffix_2(currentModel) || modelHasNative1MContext(currentModel)) &&
    !has1mSuffix_2(skillModel) &&
    !isLegacyNo1mModel(getCanonicalName(skillModel))
  )
    return identityModelId(skillModel + "[1m]");
  return skillModel;
}
//@ chunk-aepeg2w5.js:433312-433392 placement
var CLASSIFIER_PREFERRED_MODELS = ["claude-sonnet-5-5", "claude-opus-5-5"];
var classifierFallbackNoticed = false;
var CLASSIFIER_ALLOWED_MODELS = [...CLASSIFIER_PREFERRED_MODELS, "claude-opus-5"];
//@ chunk-aepeg2w5.js:433392-433469 placement
function isAllowedAutoModeClassifierPin(model) {
  return !CLASSIFIER_ALLOWED_MODELS.includes(
    strip1mSuffix(
      getCanonicalName(model, {
        identity: true,
        deterministic: true,
      }),
    ),
  );
}
//@ chunk-aepeg2w5.js:433469-433983 placement
/**
 * 从 ANTHROPIC_DEFAULT_SONNET_MODEL 推出分类器固定模型。
 */
function classifierPinFromEnv(currentModel) {
  let n = strippedCanonicalName(currentModel);
  if (n === "claude-sonnet-4-6" || n === "claude-sonnet-4-5") return;
  let ANTHROPIC_DEFAULT_SONNET_MODEL = env.ANTHROPIC_DEFAULT_SONNET_MODEL;
  let h =
    ANTHROPIC_DEFAULT_SONNET_MODEL !== undefined &&
    ANTHROPIC_DEFAULT_SONNET_MODEL === env.CLAUDE_CODE_3P_PROBE_WROTE_SONNET_DEFAULT
      ? undefined
      : ANTHROPIC_DEFAULT_SONNET_MODEL;
  if (h !== undefined && CLASSIFIER_PREFERRED_MODELS.includes(strippedCanonicalName(identityModelId(h)))) {
    if (!classifierFallbackNoticed) {
      classifierFallbackNoticed = true;
      logForDebugging(
        `Auto mode classifier: ANTHROPIC_DEFAULT_SONNET_MODEL=${h} cannot serve as the classifier; using the Sonnet 5 default instead`,
      );
    }
    h = undefined;
  }
  if (
    h !== undefined &&
    !(
      (isModelAllowedUnderActiveEnforcement(h) ?? isModelAllowed(h)) &&
      !isModelDenied(h, getModelEntitlementDenySet())
    )
  )
    return;
  if (h === undefined) {
    let sonnet5 = getModelStrings().sonnet5;
    if (!isModelAllowed(sonnet5)) return;
    h = sonnet5;
  }
  return inherit1mSuffix(identityModelId(h), currentModel);
}
//@ chunk-aepeg2w5.js:433983-434020 placement
function getPermissionClassifierExternalDefault(mainModel) {
  return withCatalogSuppressed(() => classifierPinFromEnv(mainModel));
}
//@ chunk-aepeg2w5.js:434020-434075 placement
function classifierFlagshipRerouteTarget(e) {
  if (isFableFamilyOrPinnedModel(e) || isMythosModelValue_2(e)) return resolveDefaultOpusModel(e);
  return e;
}
//@ chunk-aepeg2w5.js:434075-434113 placement
function getPermissionClassifierFlagshipRerouteTarget(mainModel) {
  return withCatalogSuppressed(() => classifierFlagshipRerouteTarget(mainModel));
}
//@ chunk-aepeg2w5.js:434113-434135 placement
var OPUS5 = "opus5";
var OPUS_FALLBACK_ORDER = OPUS_FALLBACK_ORDER_2;
//@ chunk-aepeg2w5.js:434135-434233 placement
function preferredOpusKey() {
  let e = usesFirstPartyModelIds() ? catalogDefaultKeyForFamily("opus") : undefined;
  return e !== undefined && OPUS_FALLBACK_ORDER.indexOf(e) > OPUS_FALLBACK_ORDER_2.indexOf(OPUS5) ? e : OPUS5;
}
//@ chunk-aepeg2w5.js:434233-434308 placement
function getRefusalFallbackOpusLineupIds() {
  let modelStrings = getModelStrings();
  return OPUS_FALLBACK_ORDER.slice(OPUS_FALLBACK_ORDER.indexOf(preferredOpusKey())).map(
    (n) => modelStrings[n],
  );
}
//@ chunk-aepeg2w5.js:434308-434395 placement
function getRefusalFallbackOpusModel() {
  let ANTHROPIC_DEFAULT_OPUS_MODEL = env.ANTHROPIC_DEFAULT_OPUS_MODEL;
  return ANTHROPIC_DEFAULT_OPUS_MODEL !== undefined
    ? identityModelId(ANTHROPIC_DEFAULT_OPUS_MODEL)
    : getModelStrings()[preferredOpusKey()];
}
//@ chunk-aepeg2w5.js:434395-434429 placement
function enforcementRefusalFallbackOpusModel() {
  return getRawModelStrings()[preferredOpusKey()];
}
//@ chunk-aepeg2w5.js:434429-436118 placement
function getModelUnavailabilityReason(e, n) {
  let modelAliasSpelling = resolveModelAliasSpelling(e);
  let s = n?.ignoreModelOverrides
    ? (re) => firstPartyNameToCanonical(strip1mSuffix(re.toLowerCase()).trim())
    : canonicalFromLowercase;
  let h = s(e);
  let y = s(modelAliasSpelling);
  let S = (re) =>
    n?.ignoreModelOverrides
      ? s(re)
      : getCanonicalName(strip1mSuffix(re.toLowerCase()).trim(), {
          identity: true,
        });
  let w = S(e);
  let R = S(modelAliasSpelling);
  let any = getGatewayModelOptions().some(
    (re) =>
      re.disabled !== true &&
      typeof re.value === "string" &&
      (sameModelSpelling(re.value, e) ||
        sameModelSpelling(re.value, modelAliasSpelling) ||
        S(re.value) === w ||
        S(re.value) === R),
  );
  let any_2 = (
    getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl()
      ? [
          env.ANTHROPIC_DEFAULT_FABLE_MODEL,
          env.ANTHROPIC_DEFAULT_OPUS_MODEL,
          env.ANTHROPIC_DEFAULT_SONNET_MODEL,
          env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
          env.ANTHROPIC_CUSTOM_MODEL_OPTION,
          ...(supportsFamilyOverride()
            ? []
            : ["opus", "sonnet", "haiku"].map((re) =>
                resolveCatalogAlias(re, providerCatalogKey(getAPIProvider())),
              )),
        ]
      : []
  ).some(
    (re) =>
      re !== undefined &&
      (sameModelSpelling(re, e) || sameModelSpelling(re, modelAliasSpelling) || S(re) === w || S(re) === R),
  );
  let L =
    any || any_2
      ? undefined
      : (findServedModel(e, modelAliasSpelling, h, y) ??
        activeCatalogModels().find((re) => !isActiveCatalogModel(re) && (s(re.id) === h || s(re.id) === y)));
  let G = any || any_2 ? undefined : findActiveServedByIdentity(e);
  let ee =
    G !== undefined &&
    (!isActiveCatalogModel(G) || (isFirstPartyApiBackend() && !activeCatalogRowKnown(G))) &&
    (L === undefined || isActiveCatalogModel(L))
      ? G
      : L;
  if (ee !== undefined && !isActiveCatalogModel(ee))
    return {
      reason: "disabled",
      description:
        markdownSafeText(ee.selection_notice?.text ?? ee.notice?.text ?? "") ||
        markdownSafeText(ee.description ?? "") ||
        "Not available",
    };
  if (ee !== undefined && isFirstPartyApiBackend() && !activeCatalogRowKnown(ee))
    return {
      reason: "disabled",
      description: getUnsupportedModelMessage(ee),
      notOffered: true,
    };
  if (getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl()) return null;
  if (!isServedCatalogActive()) {
    let found = getAdditionalModelOptionsCache().find(
      (se) =>
        se.disabled === true && typeof se.value === "string" && (s(se.value) === h || s(se.value) === y),
    );
    if (found)
      return {
        reason: "disabled",
        description: found.description,
      };
  }
  let q = n?.ignoreModelOverrides
    ? firstPartyNameToCanonical(modelAliasSpelling)
    : getCanonicalName(modelAliasSpelling, {
        identity: true,
      });
  let Q = isServedCatalogActive()
    ? activeCatalogModels().some((re) => isActiveCatalogModel(re) && (s(re.id) === h || s(re.id) === y))
    : getAdditionalModelOptionsCache().some(
        (re) =>
          re.disabled !== true && typeof re.value === "string" && (s(re.value) === h || s(re.value) === y),
      );
  if (!Q && !isFableAvailable() && isNonCustomFableModel(q))
    return {
      reason: "absent",
      displayName: getPublicModelDisplayName(modelAliasSpelling) ?? "That model",
    };
  if (!Q && !isMythosAvailable(q) && isNonCustomMythosModel(q))
    return {
      reason: "absent",
      displayName: getPublicModelDisplayName(modelAliasSpelling) ?? "That model",
    };
  return null;
}
//@ chunk-aepeg2w5.js:436118-436171 placement
function canonicalFromLowercase(e) {
  return getCanonicalName(strip1mSuffix(e.toLowerCase()).trim());
}
//@ chunk-aepeg2w5.js:436171-436194 placement
function antUpstreamContextWindow(model) {
  return;
}
//@ chunk-aepeg2w5.js:436194-436219 placement
function antGrants1MContext(e) {
  return false;
}
//@ chunk-aepeg2w5.js:436219-436288 placement
/**
 * 取某模型族在目录中的默认键对应的值。
 */
function catalogFamilyDefaultKey(e, n, r = getAPIProvider()) {
  let s = catalogDefaultKeyForFamily(e, r);
  return s !== undefined ? n[s] : undefined;
}
//@ chunk-aepeg2w5.js:436288-436421 placement
function catalogDefaultKeyForFamily(e, n = getAPIProvider()) {
  let catalogAlias = resolveCatalogAlias(e, providerCatalogKey(n));
  if (catalogAlias === undefined) return;
  let firstParty = getCatalogEntry(catalogAlias)?.provider_ids.first_party;
  return firstParty !== undefined ? MODEL_KEY_BY_FIRST_PARTY_ID[firstParty] : undefined;
}
//@ chunk-aepeg2w5.js:436421-436484 placement
/**
 * 取 ultraplan 模型（不可用或超计划模型时返回 undefined）。
 */
function ultraplanModelOrUndefined(e) {
  let n = activeFamilyDefault(e);
  return n === undefined || getUltraplanModel(e, n) ? undefined : n;
}
export {
  inherit1mSuffix,
  ultraplanModelOrUndefined,
  catalogFamilyDefaultKey,
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
