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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:433227-433312 placement (2.1.88 match: resolveSkillModelOverride, 1)
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
  let strippedModel = strippedCanonicalName(currentModel);
  if (strippedModel === "claude-sonnet-4-6" || strippedModel === "claude-sonnet-4-5") return;
  let ANTHROPIC_DEFAULT_SONNET_MODEL = env.ANTHROPIC_DEFAULT_SONNET_MODEL;
  let candidate =
    ANTHROPIC_DEFAULT_SONNET_MODEL !== undefined &&
    ANTHROPIC_DEFAULT_SONNET_MODEL === env.CLAUDE_CODE_3P_PROBE_WROTE_SONNET_DEFAULT
      ? undefined
      : ANTHROPIC_DEFAULT_SONNET_MODEL;
  if (
    candidate !== undefined &&
    CLASSIFIER_PREFERRED_MODELS.includes(strippedCanonicalName(identityModelId(candidate)))
  ) {
    if (!classifierFallbackNoticed) {
      classifierFallbackNoticed = true;
      logForDebugging(
        `Auto mode classifier: ANTHROPIC_DEFAULT_SONNET_MODEL=${candidate} cannot serve as the classifier; using the Sonnet 5 default instead`,
      );
    }
    candidate = undefined;
  }
  if (
    candidate !== undefined &&
    !(
      (isModelAllowedUnderActiveEnforcement(candidate) ?? isModelAllowed(candidate)) &&
      !isModelDenied(candidate, getModelEntitlementDenySet())
    )
  )
    return;
  if (candidate === undefined) {
    let sonnet5 = getModelStrings().sonnet5;
    if (!isModelAllowed(sonnet5)) return;
    candidate = sonnet5;
  }
  return inherit1mSuffix(identityModelId(candidate), currentModel);
}
//@ chunk-aepeg2w5.js:433983-434020 placement
function getPermissionClassifierExternalDefault(mainModel) {
  return withCatalogSuppressed(() => classifierPinFromEnv(mainModel));
}
//@ chunk-aepeg2w5.js:434020-434075 placement
function classifierFlagshipRerouteTarget(model) {
  if (isFableFamilyOrPinnedModel(model) || isMythosModelValue_2(model)) return resolveDefaultOpusModel(model);
  return model;
}
//@ chunk-aepeg2w5.js:434075-434113 placement
function getPermissionClassifierFlagshipRerouteTarget(model) {
  return withCatalogSuppressed(() => classifierFlagshipRerouteTarget(model));
}
//@ chunk-aepeg2w5.js:434113-434135 placement
var OPUS5; // deferred: uses MODEL_CONFIGS (./configs.js) of its import cycle while loading; runs once the cycle is complete
var OPUS_FALLBACK_ORDER;
deferInit("chunk-aepeg2w5.js:434113", () => {
  OPUS5 = "opus5";
  OPUS_FALLBACK_ORDER = OPUS_FALLBACK_ORDER_2;
});
//@ chunk-aepeg2w5.js:434135-434233 placement
function preferredOpusKey() {
  let catalogKey = usesFirstPartyModelIds() ? catalogDefaultKeyForFamily("opus") : undefined;
  return catalogKey !== undefined &&
    OPUS_FALLBACK_ORDER.indexOf(catalogKey) > OPUS_FALLBACK_ORDER_2.indexOf(OPUS5)
    ? catalogKey
    : OPUS5;
}
//@ chunk-aepeg2w5.js:434233-434308 placement
function getRefusalFallbackOpusLineupIds() {
  let modelStrings = getModelStrings();
  return OPUS_FALLBACK_ORDER.slice(OPUS_FALLBACK_ORDER.indexOf(preferredOpusKey())).map(
    (key) => modelStrings[key],
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
function getModelUnavailabilityReason(modelId, options) {
  let modelAliasSpelling = resolveModelAliasSpelling(modelId);
  let toKey = options?.ignoreModelOverrides
    ? (value) => firstPartyNameToCanonical(strip1mSuffix(value.toLowerCase()).trim())
    : canonicalFromLowercase;
  let requestedKey = toKey(modelId);
  let aliasKey = toKey(modelAliasSpelling);
  let identityKeyOf = (value) =>
    options?.ignoreModelOverrides
      ? toKey(value)
      : getCanonicalName(strip1mSuffix(value.toLowerCase()).trim(), {
          identity: true,
        });
  let requestedIdentity = identityKeyOf(modelId);
  let aliasIdentity = identityKeyOf(modelAliasSpelling);
  let any = getGatewayModelOptions().some(
    (option) =>
      option.disabled !== true &&
      typeof option.value === "string" &&
      (sameModelSpelling(option.value, modelId) ||
        sameModelSpelling(option.value, modelAliasSpelling) ||
        identityKeyOf(option.value) === requestedIdentity ||
        identityKeyOf(option.value) === aliasIdentity),
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
            : ["opus", "sonnet", "haiku"].map((alias) =>
                resolveCatalogAlias(alias, providerCatalogKey(getAPIProvider())),
              )),
        ]
      : []
  ).some(
    (candidate) =>
      candidate !== undefined &&
      (sameModelSpelling(candidate, modelId) ||
        sameModelSpelling(candidate, modelAliasSpelling) ||
        identityKeyOf(candidate) === requestedIdentity ||
        identityKeyOf(candidate) === aliasIdentity),
  );
  let served =
    any || any_2
      ? undefined
      : (findServedModel(modelId, modelAliasSpelling, requestedKey, aliasKey) ??
        activeCatalogModels().find(
          (row) =>
            !isActiveCatalogModel(row) && (toKey(row.id) === requestedKey || toKey(row.id) === aliasKey),
        ));
  let activeServed = any || any_2 ? undefined : findActiveServedByIdentity(modelId);
  let match =
    activeServed !== undefined &&
    (!isActiveCatalogModel(activeServed) ||
      (isFirstPartyApiBackend() && !activeCatalogRowKnown(activeServed))) &&
    (served === undefined || isActiveCatalogModel(served))
      ? activeServed
      : served;
  if (match !== undefined && !isActiveCatalogModel(match))
    return {
      reason: "disabled",
      description:
        markdownSafeText(match.selection_notice?.text ?? match.notice?.text ?? "") ||
        markdownSafeText(match.description ?? "") ||
        "Not available",
    };
  if (match !== undefined && isFirstPartyApiBackend() && !activeCatalogRowKnown(match))
    return {
      reason: "disabled",
      description: getUnsupportedModelMessage(match),
      notOffered: true,
    };
  if (getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl()) return null;
  if (!isServedCatalogActive()) {
    let found = getAdditionalModelOptionsCache().find(
      (option) =>
        option.disabled === true &&
        typeof option.value === "string" &&
        (toKey(option.value) === requestedKey || toKey(option.value) === aliasKey),
    );
    if (found)
      return {
        reason: "disabled",
        description: found.description,
      };
  }
  let aliasCanonical = options?.ignoreModelOverrides
    ? firstPartyNameToCanonical(modelAliasSpelling)
    : getCanonicalName(modelAliasSpelling, {
        identity: true,
      });
  let isAvailable = isServedCatalogActive()
    ? activeCatalogModels().some(
        (row) => isActiveCatalogModel(row) && (toKey(row.id) === requestedKey || toKey(row.id) === aliasKey),
      )
    : getAdditionalModelOptionsCache().some(
        (option) =>
          option.disabled !== true &&
          typeof option.value === "string" &&
          (toKey(option.value) === requestedKey || toKey(option.value) === aliasKey),
      );
  if (!isAvailable && !isFableAvailable() && isNonCustomFableModel(aliasCanonical))
    return {
      reason: "absent",
      displayName: getPublicModelDisplayName(modelAliasSpelling) ?? "That model",
    };
  if (!isAvailable && !isMythosAvailable(aliasCanonical) && isNonCustomMythosModel(aliasCanonical))
    return {
      reason: "absent",
      displayName: getPublicModelDisplayName(modelAliasSpelling) ?? "That model",
    };
  return null;
}
//@ chunk-aepeg2w5.js:436118-436171 placement
function canonicalFromLowercase(modelId) {
  return getCanonicalName(strip1mSuffix(modelId.toLowerCase()).trim());
}
//@ chunk-aepeg2w5.js:436171-436194 placement
function antUpstreamContextWindow(model) {
  return;
}
//@ chunk-aepeg2w5.js:436194-436219 placement
function antGrants1MContext(modelId) {
  return false;
}
//@ chunk-aepeg2w5.js:436219-436288 placement
/**
 * 取某模型族在目录中的默认键对应的值。
 */
function catalogFamilyDefaultKey(family, modelStrings, provider = getAPIProvider()) {
  let key = catalogDefaultKeyForFamily(family, provider);
  return key !== undefined ? modelStrings[key] : undefined;
}
//@ chunk-aepeg2w5.js:436288-436421 placement
function catalogDefaultKeyForFamily(family, provider = getAPIProvider()) {
  let catalogAlias = resolveCatalogAlias(family, providerCatalogKey(provider));
  if (catalogAlias === undefined) return;
  let firstParty = getCatalogEntry(catalogAlias)?.provider_ids.first_party;
  return firstParty !== undefined ? MODEL_KEY_BY_FIRST_PARTY_ID[firstParty] : undefined;
}
//@ chunk-aepeg2w5.js:436421-436484 placement
/**
 * 取 ultraplan 模型（不可用或超计划模型时返回 undefined）。
 */
function ultraplanModelOrUndefined(model) {
  let familyDefault = activeFamilyDefault(model);
  return familyDefault === undefined || getUltraplanModel(model, familyDefault) ? undefined : familyDefault;
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
