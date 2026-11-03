/**
 * utils/model/model.ts
 *
 * 主循环模型选择核心：用户指定模型（--model / /model / ANTHROPIC_MODEL / settings.model）解析、别名展开、各档默认模型（Opus/Sonnet/Haiku/Fable）、[1m] 后缀处理、显示名与营销名、旧 Opus 重映射。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/model.ts
 * pieces: chunk-095ptjmr.js (1), chunk-aepeg2w5.js (64), chunk-d1cgs5na.js (1), chunk-e6aww6q8.js (2), chunk-hwmsct5x.js (1)
 * attribution: fingerprint 10, placement 57, layout 2
 */
import { env } from "../env.js";
import { Sv, Lt, Nb, pve, parseModelId, Bn, v8 } from "./modelIds.js";
import {
  getCuratedModelPicker,
  parseUserSpecifiedModel,
  getClaudeAiUserDefaultModelDescription,
  getCatalogDisplayName,
  getPublicModelDisplayName,
} from "./modelDisplay.js";
import { getAdditionalModelOptionsCache, hasBootstrapModelOptions, isClaudeAISubscriber } from "../auth.js";
import { getProviderState } from "./providerCaches.js";
import {
  getSettingsModelOverrides,
  getCanonicalName,
  findOverrideCanonicalName,
  isRecognizedCanonical,
} from "./canonicalModelName.js";
import {
  getPairedPolicyModelOverrides,
  getSettingsForSource,
  getInitialSettings_2,
} from "../settings/settings.js";
import { eS, tS, Jc, isCatalogRowSelectable, fn } from "./modelCatalog/catalogCapabilities.js";
import { getUserSpecifiedModelSetting, isNonCustomMythosModel } from "./smallFastModel.js";
import { getDefaultMainLoopModel } from "./modelFallback.js";
import { WK, No, getCatalogEntry } from "./modelCatalog.js";
import { isModelAllowed } from "./modelAllowlist.js";
import {
  Cpr,
  Vte,
  activeServedCatalog,
  fo,
  findServedModel,
  Yte,
  UUe,
  bi,
} from "./modelCatalog/servedCatalog.js";
import {
  getAPIProvider,
  isFirstPartyAnthropicBaseUrl,
  isActiveCatalogModel,
  isFirstPartyApiBackend,
  usesFirstPartyModelIds,
} from "./providers.js";
import {
  getModelStrings,
  resolveProviderModelId,
  getRawModelStrings,
  gatewayModelIdFor,
} from "./modelStrings.js";
import {
  OPUS_FALLBACK_ORDER,
  MODEL_KEY_BY_FIRST_PARTY_ID,
  Bp,
  getSonnet46ContextWindowOverride,
} from "./configs.js";
import { inherit1mSuffix, Mw, ju, antGrants1MContext } from "./classifierModel.js";
import { nI } from "./bedrock.js";
import { sanitizeTitle } from "../resultError.js";
import {
  modelHasNative1MContext,
  has1mSuffix,
  supports1mBeta,
  olt,
  is1mContextDisabled,
} from "./contextWindow1m.js";
import { getDefaultSonnetBuiltin } from "./modelOptions.js";
import { append1mSuffixIfMissing, getDefaultHaikuModel, getRuntimeMainLoopModel } from "./planModeModel.js";
import { isExemptDefaultResolvingPick, getModelEnforcementState, Gw } from "./defaultModel.js";
import { logForDebugging } from "../debug.js";
import { tf } from "../../services/gateway/hostCheck.js";
import { isLongContext1mCreditsBlocked } from "../../bootstrap/state.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import { TENGU_KIND_DEWDROP } from "../../services/api/withRetry.js";
import { int } from "../attachments/environmentChange.js";
import { Us } from "../../services/projects/threadRows.js";
import {
  getToolPermissionContext,
  getMainLoopModel as getMainLoopModel_2,
} from "../permissions/toolPermissionContext.js";
import { Pkt } from "../contextAttachments/modelInfo.js";
import { doesMostRecentAssistantMessageExceed200k } from "../tokens.js";
import {
  getLastModelIdentity,
  isSameModelIdentity,
  buildModelEnvInfoAttachment,
} from "../../constants/prompts.js";

/**
 * 模型是否等于某档 ANTHROPIC_DEFAULT_{FABLE,OPUS,SONNET,HAIKU}_MODEL。旧版名 getDefaultHaikuModel 为错配。
 */
//@ chunk-aepeg2w5.js:420461-420644 fingerprint = getDefaultHaikuModel (0.317)
function isTierDefaultModelEnv(e) {
  return [
    env.ANTHROPIC_DEFAULT_FABLE_MODEL,
    env.ANTHROPIC_DEFAULT_OPUS_MODEL,
    env.ANTHROPIC_DEFAULT_SONNET_MODEL,
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
  ].some((n) => n !== void 0 && Sv(n, e));
}
/**
 * 模型写法规范化：trim、小写并去掉修饰后缀。
 */
//@ chunk-aepeg2w5.js:429528-429584 placement
function normalizeModelSpelling(e) {
  return Lt(e.trim().toLowerCase()).trim();
}
/**
 * 判断（规范化后的）模型名是否为已知的自定义模型：ANTHROPIC_CUSTOM_MODEL_OPTION、精选选择器选项、模型覆盖目标、附加模型选项缓存或已验证过的模型。
 */
//@ chunk-aepeg2w5.js:429584-429904 layout
function isKnownCustomModel(e) {
  let ANTHROPIC_CUSTOM_MODEL_OPTION = env.ANTHROPIC_CUSTOM_MODEL_OPTION;
  if (ANTHROPIC_CUSTOM_MODEL_OPTION !== void 0 && normalizeModelSpelling(ANTHROPIC_CUSTOM_MODEL_OPTION) === e)
    return !0;
  if (getCuratedModelPicker()?.picker.options.some((r) => normalizeModelSpelling(r.model) === e) ?? !1)
    return !0;
  if (isModelOverrideTarget(e)) return !0;
  if (
    getAdditionalModelOptionsCache().some(
      (r) => typeof r.value === "string" && normalizeModelSpelling(r.value) === e,
    )
  )
    return !0;
  for (let validatedModel of getProviderState().providerCache.validatedModels)
    if (normalizeModelSpelling(validatedModel) === e) return !0;
  return !1;
}
/**
 * 判断模型名是否为某个模型覆盖设置的目标值。
 */
//@ chunk-aepeg2w5.js:429904-430061 placement
function isModelOverrideTarget(e) {
  let n = normalizeModelSpelling(e);
  if (n === "") return !1;
  for (let r of [getSettingsModelOverrides(), getPairedPolicyModelOverrides()])
    for (let s of Object.values(r ?? {}))
      if (typeof s === "string" && normalizeModelSpelling(s) === n) return !0;
  return !1;
}
//@ chunk-aepeg2w5.js:430061-430111 placement
function isUnservedFamilySpelling(e) {
  return eS(e)?.kind === "unresolved";
}
//@ chunk-aepeg2w5.js:430111-430167 placement
function isUnservedModelSpelling(e, n) {
  return isUnservedFamilySpelling(e) || (n === "persisted" && tS(e));
}
//@ chunk-aepeg2w5.js:430167-430205 placement
function isServedExpandedSpelling(e) {
  return Jc(e) !== void 0;
}
//@ chunk-aepeg2w5.js:430205-430279 placement
function getMainLoopModel() {
  let e = getUserSpecifiedModelSetting();
  if (e !== void 0 && e !== null) return parseUserSpecifiedModel(e);
  return getDefaultMainLoopModel();
}
//@ chunk-aepeg2w5.js:430279-430359 placement
var Uu = {
  fable: {
    available: isFableAvailable,
    defaultModel: () => getDefaultFableModel(),
    builtinDefault: (e) => Wp(e),
  },
};
/**
 * 返回目录推荐且可用的最佳别名，否则 opus。
 */
//@ chunk-aepeg2w5.js:430359-430466 placement
function getBestAvailableAlias() {
  let best = WK().best;
  if (best !== void 0 && Object.hasOwn(Uu, best) && Uu[best]?.available()) return best;
  return "opus";
}
//@ chunk-aepeg2w5.js:430466-430664 placement
function getDefaultMainLoopModelSetting_2() {
  let e = Uu[getBestAvailableAlias()];
  if (e !== void 0) {
    let defaultModel = e.defaultModel(),
      r = getProviderState();
    if (r.resolvingBestModel) return defaultModel;
    r.resolvingBestModel = !0;
    try {
      if (isModelAllowed(defaultModel)) return defaultModel;
    } finally {
      r.resolvingBestModel = !1;
    }
  }
  return getDefaultOpusModel();
}
//@ chunk-aepeg2w5.js:430664-430762 placement
var DEFAULT_3P_OPUS_KEY = "opus46",
  DEFAULT_3P_SONNET_KEY = "sonnet45",
  DEFAULT_3P_HAIKU_KEY = "haiku45",
  DEFAULT_BEDROCK_OPUS_KEY = "opus55",
  DEFAULT_VERTEX_OPUS_KEY = "opus55",
  DEFAULT_MANTLE_OPUS_KEY = "opus55",
  DEFAULT_3P_FABLE_KEY = "fable51";
//@ chunk-aepeg2w5.js:430762-430813 placement
function isFableModelValue(e) {
  return e.includes("claude-fable-");
}
//@ chunk-aepeg2w5.js:430813-430865 placement
function isMythosModelValue(e) {
  return e.includes("claude-mythos-");
}
//@ chunk-aepeg2w5.js:430865-431253 placement
function isFableAvailable() {
  if (Cpr()) {
    if (!Vte() && (getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl()))
      return Boolean(env.ANTHROPIC_DEFAULT_FABLE_MODEL);
    if (
      isServedCatalogModelInactive(
        isFableModelValue,
        getCanonicalName(getDefaultFableModel(), { identity: !0 }),
      )
    )
      return !1;
    if (!Vte() && isDefaultFableOptionDisabled()) return !1;
    if (env.ANTHROPIC_DEFAULT_FABLE_MODEL) return !0;
    return HK(isFableModelValue);
  }
  if (isDefaultFableOptionDisabled()) return !1;
  if (env.ANTHROPIC_DEFAULT_FABLE_MODEL) return !0;
  switch (getAPIProvider()) {
    case "firstParty":
      return !0;
    case "gateway":
      return LK(isFableModelValue);
    default:
      return !1;
  }
}
//@ chunk-aepeg2w5.js:431253-431295 placement
function FK() {
  return getAdditionalModelOptionsCache().length > 0 || hasBootstrapModelOptions();
}
//@ chunk-aepeg2w5.js:431295-431388 placement
function LK(e) {
  return getAdditionalModelOptionsCache().some(
    (n) => n.disabled !== !0 && typeof n.value === "string" && e(n.value),
  );
}
//@ chunk-aepeg2w5.js:431388-431608 placement
function isDefaultFableOptionDisabled() {
  if (getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl()) return !1;
  let filtered = getAdditionalModelOptionsCache().filter(
      (r) => typeof r.value === "string" && isFableModelValue(r.value),
    ),
    n = getCanonicalName(getDefaultFableModel(), { identity: !0 });
  return Rw(
    filtered,
    (r) => getCanonicalName(String(r.value), { identity: !0 }) === n,
    (r) => r.disabled === !0,
  );
}
//@ chunk-aepeg2w5.js:431608-431692 placement
function Rw(e, n, r) {
  let filtered = e.filter(n),
    h = filtered.length > 0 ? filtered : e;
  return h.length > 0 && h.every(r);
}
//@ chunk-aepeg2w5.js:431692-431834 placement
function isServedCatalogModelInactive(e, n) {
  if (activeServedCatalog() === null) return !1;
  let filtered = fo().filter((s) => e(s.id));
  return Rw(
    filtered,
    (s) => n !== void 0 && getCanonicalName(s.id, { identity: !0 }) === n,
    (s) => !isActiveCatalogModel(s),
  );
}
//@ chunk-aepeg2w5.js:431834-432395 placement
function isMythosAvailable(e) {
  if (getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl()) return !1;
  let n = (y) => (isNonCustomMythosModel(y) ? y : void 0),
    r = e === void 0 ? void 0 : n(getCanonicalName(e, { identity: !0 })),
    s = (y) => {
      let filtered = y.filter((w) => w.canonical === r);
      return (filtered.length > 0 ? filtered : y).some((w) => w.enabled);
    },
    h = () => {
      let y = activeServedCatalog();
      return s(
        fo().flatMap((S) => {
          let w = n(getCanonicalName(S.id));
          return w && y !== null ? [{ canonical: w, enabled: isCatalogRowSelectable(y, S) }] : [];
        }),
      );
    };
  if (Vte()) return h();
  if (Cpr()) {
    if (isServedCatalogModelInactive(isMythosModelValue, r)) return !1;
    if (!FK()) return h();
  }
  return s(
    getAdditionalModelOptionsCache().flatMap((y) => {
      let S = typeof y.value === "string" ? n(getCanonicalName(y.value, { identity: !0 })) : void 0;
      return S ? [{ canonical: S, enabled: y.disabled !== !0 }] : [];
    }),
  );
}
//@ chunk-aepeg2w5.js:432395-432483 placement
function HK(e) {
  let n = activeServedCatalog();
  if (n === null) return !1;
  return fo().some((r) => isCatalogRowSelectable(n, r) && e(r.id));
}
//@ chunk-aepeg2w5.js:432483-432573 placement
function isPinnedFableModel(e) {
  let ANTHROPIC_DEFAULT_FABLE_MODEL = env.ANTHROPIC_DEFAULT_FABLE_MODEL;
  if (!ANTHROPIC_DEFAULT_FABLE_MODEL) return !1;
  return Lt(e) === Lt(ANTHROPIC_DEFAULT_FABLE_MODEL);
}
//@ chunk-aepeg2w5.js:432573-432673 placement
function isFableFamilyOrPinnedModel(e, n) {
  return (
    getCanonicalName(e, n?.identity ? { identity: !0 } : void 0).startsWith("claude-fable-") ||
    isPinnedFableModel(e)
  );
}
//@ chunk-aepeg2w5.js:432673-432730 placement
function BK(e) {
  return getCanonicalName(e).startsWith("claude-mythos-");
}
//@ chunk-aepeg2w5.js:432730-432781 placement
function isOpus5FamilyModel(e) {
  return Lt(getCanonicalName(e)) === "claude-opus-5";
}
//@ chunk-aepeg2w5.js:432781-432834 placement
function isOpus55FamilyModel(e) {
  return Lt(getCanonicalName(e)) === "claude-opus-5-5";
}
//@ chunk-aepeg2w5.js:432834-432889 placement
function isSonnet55FamilyModel(e) {
  return Lt(getCanonicalName(e)) === "claude-sonnet-5-5";
}
//@ chunk-aepeg2w5.js:432889-432958 placement
function KK(e) {
  return e === "claude-opus-4-6" || e === "claude-sonnet-4-6";
}
//@ chunk-aepeg2w5.js:432958-432983 placement
function isAntInternalFastModelId(e) {
  return !1;
}
/**
 * catalog 键 "opus5"。
 */
//@ chunk-aepeg2w5.js:432983-432998 layout
var OPUS5_KEY = "opus5";
/**
 * 默认 Opus（带上下文后缀继承）：ANTHROPIC_DEFAULT_OPUS_MODEL，否则第一方从 opus5 起按 OPUS_FALLBACK_ORDER 轮转取第一个被允许的 Opus 字符串；与 n 的 [1m] 一致化。
 */
//@ chunk-aepeg2w5.js:432998-433227 fingerprint = getDefaultOpusModel (0.711)
function resolveDefaultOpusModel(e) {
  let ANTHROPIC_DEFAULT_OPUS_MODEL = env.ANTHROPIC_DEFAULT_OPUS_MODEL;
  if (ANTHROPIC_DEFAULT_OPUS_MODEL === void 0) {
    let r = getModelStrings();
    if (((ANTHROPIC_DEFAULT_OPUS_MODEL = r[OPUS5_KEY]), getAPIProvider() === "firstParty")) {
      let index = OPUS_FALLBACK_ORDER.indexOf(OPUS5_KEY);
      ANTHROPIC_DEFAULT_OPUS_MODEL =
        OPUS_FALLBACK_ORDER.slice(index)
          .concat(OPUS_FALLBACK_ORDER.slice(0, index))
          .map((h) => r[h])
          .find((h) => isModelAllowed(h)) ?? r[OPUS5_KEY];
    }
  }
  return inherit1mSuffix(nI(ANTHROPIC_DEFAULT_OPUS_MODEL), e);
}
/**
 * 档位别名（opus/sonnet/haiku/fable）在 settings 档位覆盖里配置的模型：映射到 catalog 键则取模型字符串表中的值，否则解析成提供商 id。
 */
//@ chunk-aepeg2w5.js:436867-437117 placement = aliasMatchesParentTier (0.852)
function getTierOverrideModel(alias, parentModel) {
  if (alias !== "opus" && alias !== "sonnet" && alias !== "haiku" && alias !== "fable") return;
  let canonical = Mw(alias);
  if (canonical === void 0) return;
  let lower = canonical.toLowerCase(),
    h = Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, lower) ? MODEL_KEY_BY_FIRST_PARTY_ID[lower] : void 0;
  if (h !== void 0) return parentModel[h];
  let y = resolveProviderModelId(findServedModel(canonical) ?? { id: canonical });
  return y === void 0 ? void 0 : nI(y);
}
//@ chunk-aepeg2w5.js:437117-437150 placement
function Bi(e) {
  return getTierOverrideModel(e, getModelStrings());
}
//@ chunk-aepeg2w5.js:437150-437503 placement
function documentTierAliasTarget(e) {
  if (activeServedCatalog() === null) return;
  let n = Mw(e);
  if (n === void 0) return;
  let lower = n.toLowerCase(),
    s = Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, lower) ? MODEL_KEY_BY_FIRST_PARTY_ID[lower] : void 0;
  if (s !== void 0) return { key: s, name: Fu(n, s) };
  let h = findServedModel(n) ?? { id: n },
    y = Yte(h.id);
  if (y !== void 0) return { key: y, name: Fu(n, y) };
  let S = resolveProviderModelId(h);
  return S === void 0
    ? void 0
    : { key: void 0, modelId: S, ...(fn(h.id) && { overrideKey: h.id }), name: Fu(n, void 0) };
}
//@ chunk-aepeg2w5.js:437503-437597 placement
function Fu(e, n) {
  return (
    getMarketingNameForModel(n !== void 0 ? No[n].firstParty : e) ??
    (sanitizeTitle(findServedModel(e)?.name ?? e) || "that model")
  );
}
//@ chunk-aepeg2w5.js:437597-437696 placement
function getDefaultFableModel() {
  let e = env.ANTHROPIC_DEFAULT_FABLE_MODEL ?? Bi("fable");
  return nI(e !== void 0 ? Dw(e) : Wp());
}
//@ chunk-aepeg2w5.js:437696-437765 placement
function strip1mTagWhereBuiltIn(e) {
  let n = strip1mTag(e);
  return n !== e && modelHasNative1MContext(n, { byItsOwnName: !0 }) ? n : e;
}
//@ chunk-aepeg2w5.js:437765-437858 placement
function Dw(e) {
  let n = strip1mTag(e);
  if (n === e) return e;
  return modelHasNative1MContext(n, { byItsOwnName: !0 }) || (isFirstPartyApiBackend() && XK(n)) ? n : e;
}
//@ chunk-aepeg2w5.js:437858-437882 placement
function XK(e) {
  return !1;
}
//@ chunk-aepeg2w5.js:437882-437946 placement
function Wp(e = getModelStrings()) {
  let n = ju("fable", e) ?? e.fable51;
  return Dw(n);
}
//@ chunk-aepeg2w5.js:437946-438052 placement
function getDefaultOpusModel() {
  let ANTHROPIC_DEFAULT_OPUS_MODEL = env.ANTHROPIC_DEFAULT_OPUS_MODEL;
  if (ANTHROPIC_DEFAULT_OPUS_MODEL !== void 0)
    return nI(strip1mTagWhereBuiltIn(ANTHROPIC_DEFAULT_OPUS_MODEL));
  return Bi("opus") ?? yn();
}
//@ chunk-aepeg2w5.js:438052-438102 placement
function yn(e = getModelStrings()) {
  return ju("opus", e) ?? e.opus55;
}
/**
 * 默认 Sonnet：ANTHROPIC_DEFAULT_SONNET_MODEL，否则 settings 档位覆盖，否则 catalog sonnet 档（第一方 claude-sonnet-5-5）。
 */
//@ chunk-aepeg2w5.js:438102-438212 placement = getDefaultSonnetModel (0.276)
function getDefaultSonnetModel() {
  let ANTHROPIC_DEFAULT_SONNET_MODEL = env.ANTHROPIC_DEFAULT_SONNET_MODEL;
  if (ANTHROPIC_DEFAULT_SONNET_MODEL !== void 0)
    return nI(strip1mTagWhereBuiltIn(ANTHROPIC_DEFAULT_SONNET_MODEL));
  return Bi("sonnet") ?? getDefaultSonnetBuiltin();
}
/**
 * 一组旧模型规范名；getAgentToolCallFormatVersion 一类判断（命中返回 4，否则 3）用。旧版名 firstPartyNameToCanonical 为错配。
 */
//@ chunk-aepeg2w5.js:459417-459696 fingerprint = firstPartyNameToCanonical (0.849)
var LEGACY_SUBAGENT_MODEL_IDS = new Set([
  "claude-3-opus",
  "claude-3-sonnet",
  "claude-3-haiku",
  "claude-3-5-sonnet",
  "claude-3-5-haiku",
  "claude-3-7-sonnet",
  "claude-opus-4-0",
  "claude-opus-4-1",
  "claude-opus-4-5",
  "claude-opus-4-6",
  "claude-sonnet-4-0",
  "claude-sonnet-4-5",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
]);
/**
 * 解析用户写的模型：别名（fable/opusplan/sonnet/haiku/opus/best，可带 [1m]）展开成对应档默认模型；旧 Opus 4/4.1 在重映射开启时换成默认 Opus；其余保留并规范 [1m] 后缀。
 */
//@ chunk-aepeg2w5.js:464052-464521 fingerprint = parseUserSpecifiedModel (0.775)
function resolveModelAliasSetting(modelInput) {
  let modelInputTrimmed = modelInput.trim(),
    normalizedModel = modelInputTrimmed.toLowerCase(),
    has1mTag = has1mSuffix(normalizedModel),
    baseAntModel = Lt(normalizedModel).trim();
  if (Nb(baseAntModel))
    switch (baseAntModel) {
      case "fable": {
        let y = getDefaultFableModel();
        return nI(y + (has1mTag && !isFirstPartyApiBackend() && !has1mSuffix(y) ? "[1m]" : ""));
      }
      case "opusplan":
        return has1mTag ? nI(append1mSuffixIfMissing(getDefaultSonnetModel())) : getDefaultSonnetModel();
      case "sonnet":
        return has1mTag ? nI(append1mSuffixIfMissing(getDefaultSonnetModel())) : getDefaultSonnetModel();
      case "haiku":
        return has1mTag ? nI(append1mSuffixIfMissing(getDefaultHaikuModel())) : getDefaultHaikuModel();
      case "opus":
        return has1mTag ? nI(append1mSuffixIfMissing(getDefaultOpusModel())) : getDefaultOpusModel();
      case "best":
        return getDefaultMainLoopModelSetting_2();
      default:
    }
  if (usesFirstPartyModelIds() && isLegacyOpusFirstParty(baseAntModel) && isLegacyModelRemapEnabled())
    return has1mTag ? nI(append1mSuffixIfMissing(getDefaultOpusModel())) : getDefaultOpusModel();
  if (has1mTag) return nI(modelInputTrimmed.replace(/(\[1m\])+$/i, "").trim() + "[1m]");
  return nI(modelInputTrimmed);
}
//@ chunk-aepeg2w5.js:464521-464580 placement
function resolveModelAliasSpelling(e) {
  return pve(e.toLowerCase().trim()) ? parseUserSpecifiedModel(e) : e;
}
/**
 * model 为 "inherit" 时返回 undefined，否则原样返回（技能/命令的模型字段）。
 */
//@ chunk-aepeg2w5.js:464580-464626 placement = resolveAgentModelDisplay (1)
function inlineSkillModelOverride(agent) {
  return agent === "inherit" ? void 0 : agent;
}
//@ chunk-aepeg2w5.js:464626-464951 placement
function resolveSkillModelOverride(e, n) {
  let publicName = parseUserSpecifiedModel(e);
  if (!isExemptDefaultResolvingPick(publicName) && !isModelAllowed(publicName))
    return (
      logForDebugging(
        `Skill/command model "${e}" is not in the availableModels allowlist; keeping the session model`,
        { level: "warn" },
      ),
      n
    );
  let s = has1mSuffix(n) || modelHasNative1MContext(n) || antGrants1MContext(n),
    h = s || Bp(n);
  if (has1mSuffix(e) || !h) return e;
  let resolved = parseUserSpecifiedModel(e);
  if (modelHasNative1MContext(resolved)) return resolved;
  if (Bp(resolved) || antGrants1MContext(resolved)) return resolved;
  if (s && supports1mBeta(resolved)) return e + "[1m]";
  return e;
}
/**
 * 旧 Opus 第一方 id（4.0/4.1 及带日期形式），用于自动重映射。
 */
//@ chunk-aepeg2w5.js:464951-465048 fingerprint = LEGACY_OPUS_FIRSTPARTY (1)
var LEGACY_OPUS_FIRSTPARTY = [
  "claude-opus-4-20250514",
  "claude-opus-4-1-20250805",
  "claude-opus-4-0",
  "claude-opus-4-1",
];
/**
 * 是否旧 Opus 4 或 4.1 的第一方 id。
 */
//@ chunk-aepeg2w5.js:465048-465086 placement
function isLegacyOpusFirstParty(model) {
  return LEGACY_OPUS_FIRSTPARTY.includes(model);
}
/**
 * 旧模型重映射是否开启（未设 CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP）。
 */
//@ chunk-aepeg2w5.js:465086-465149 placement = isLegacyModelRemapEnabled (1)
function isLegacyModelRemapEnabled() {
  return !env.CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP;
}
/**
 * 模型设置的显示串：null 显示 "Default (<默认模型>)"；别名显示 "alias (解析后)"。
 */
//@ chunk-aepeg2w5.js:465149-465304 placement = modelDisplayString (0.478)
function modelDisplayString(model) {
  if (model === null) {
    if (isClaudeAISubscriber()) return `Default (${getClaudeAiUserDefaultModelDescription()})`;
    return `Default (${getDefaultMainLoopModel()})`;
  }
  let resolvedModel = parseUserSpecifiedModel(model);
  return (
    sanitizeTitle(
      strip1mTagWhereBuiltIn(model) === resolvedModel ? resolvedModel : `${model} (${resolvedModel})`,
    ) || "unknown model"
  );
}
/**
 * claude-3-x 系列的营销名（Claude 3.7 Sonnet 等）。
 */
//@ chunk-aepeg2w5.js:465304-465608 fingerprint = getMarketingNameForModel (0.47)
var MODELS_WITH_1M_DISPLAY_SUFFIX = new Set([
    "claude-opus-4-6",
    "claude-opus-4-7",
    "claude-opus-4-8",
    "claude-opus-5",
    "claude-opus-5-5",
    "claude-sonnet-4-0",
    "claude-sonnet-4-5",
    "claude-sonnet-4-6",
  ]),
  LEGACY_MARKETING_NAMES = new Map([
    ["claude-3-7-sonnet", "Claude 3.7 Sonnet"],
    ["claude-3-5-sonnet", "Claude 3.5 Sonnet"],
    ["claude-3-5-haiku", "Claude 3.5 Haiku"],
  ]);
//@ chunk-aepeg2w5.js:465608-466021 placement
function nameForUnnamedModelId(e) {
  if (getAPIProvider() === "foundry") return;
  let trimmed = e.trim(),
    lower = trimmed.toLowerCase();
  if (/\s/.test(lower)) return;
  let s = PG(Lt(trimmed));
  if (s !== void 0) return getCatalogDisplayName(s, has1mSuffix(strip1mTagWhereBuiltIn(trimmed))) ?? void 0;
  let h = lower,
    y = parseModelId(h);
  if (!y) {
    let index = lower.indexOf("claude-");
    if (index <= 0 || /[a-z0-9]/.test(lower[index - 1] ?? "")) return;
    ((h = lower.slice(index)), (y = parseModelId(h)));
  }
  if (!y || y.trailer !== void 0 || /-fast(?![a-z0-9])/.test(h.slice(h.lastIndexOf(y.base) + y.base.length)))
    return;
  return getPublicModelDisplayName(has1mSuffix(h) ? h : Lt(h)) ?? void 0;
}
//@ chunk-aepeg2w5.js:466021-466067 placement
function PG(e) {
  return (
    findOverrideCanonicalName(getSettingsModelOverrides(), e) ??
    findOverrideCanonicalName(getPairedPolicyModelOverrides(), e)
  );
}
//@ chunk-aepeg2w5.js:466067-466272 placement
function getMarketingNameForModel(e) {
  if (getAPIProvider() === "foundry") return;
  let n = getCanonicalName(e, { identity: !0 }),
    r = LEGACY_MARKETING_NAMES.get(n);
  if (r !== void 0) return r;
  let s = getCatalogEntry(n);
  if (!s) return;
  return olt(strip1mTagWhereBuiltIn(e)) && MODELS_WITH_1M_DISPLAY_SUFFIX.has(n)
    ? `${s.display_name} (1M context)`
    : s.display_name;
}
//@ chunk-aepeg2w5.js:466272-466355 placement
function modelSettingResolvesThroughModelStrings(e) {
  let lower = Bn(e).trim().toLowerCase();
  return Nb(lower) || Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, lower);
}
//@ chunk-aepeg2w5.js:466355-466630 placement
function toProviderWireModelId(e) {
  let n = Bn(e),
    lower = n.toLowerCase();
  if (!Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, lower)) return catalogAliasFor(n) ?? n;
  let s = MODEL_KEY_BY_FIRST_PARTY_ID[lower];
  if (s === void 0) return n;
  let h = warnModelOutsideAvailable({ id: lower, raw: getRawModelStrings()[s], overrideKey: lower });
  if (h === void 0) return n;
  let y = getAPIProvider();
  if (h.overridden || (y !== "foundry" && No[s][y] !== null)) return Bn(h.mapped);
  return n;
}
/**
 * 模型不在托管 availableModels 中时记录警告。
 */
//@ chunk-aepeg2w5.js:466630-467071 placement
function warnModelOutsideAvailable({ id: id, raw: raw, overrideKey: overrideKey }) {
  if (getModelEnforcementState().state === "refused") return;
  let h;
  try {
    h = getSettingsForSource("policySettings");
  } catch {
    return;
  }
  let y = h?.availableModels,
    S = h?.modelOverrides ?? getPairedPolicyModelOverrides() ?? {};
  if (y !== void 0 && !isModelAllowed(id, { allowlist: y, overridesMap: S, envFreeAliasResolution: !0 }))
    return;
  let w = y === void 0 ? (getInitialSettings_2().modelOverrides ?? {}) : S,
    R = overrideKey !== void 0 && Object.hasOwn(w, overrideKey) ? w[overrideKey] : void 0;
  if (!R || (y === void 0 && R === raw) || Gw(R)) return { mapped: raw, overridden: !1 };
  return { mapped: R, overridden: !0 };
}
/**
 * 取模型在目录中的别名（若可唯一确定）。
 */
//@ chunk-aepeg2w5.js:467071-467388 placement
function catalogAliasFor(e) {
  let n = UUe(e);
  if (n === void 0 || Yte(n.id) !== void 0) return;
  let r = fn(n.id) ? n.id : void 0;
  if (tf(e) !== void 0 && e.toLowerCase() !== r) return;
  let s = resolveProviderModelId(n);
  if (s === void 0 || (s === n.id && r === void 0)) return;
  let h = warnModelOutsideAvailable({ id: n.id, raw: gatewayModelIdFor(n) ?? e, overrideKey: r });
  if (h === void 0 || h.mapped === n.id || Gw(h.mapped)) return;
  return Bn(h.mapped);
}
//@ chunk-aepeg2w5.js:467388-467435 placement
function strip1mTag(model) {
  return model.replace(/\[1m\]/gi, "");
}
//@ chunk-aepeg2w5.js:467435-467685 placement
function getFlagContextWindow(e) {
  let n = getCanonicalName(e, { identity: !0, overridesMap: {} });
  if (
    !KK(n) ||
    !isFirstPartyApiBackend() ||
    is1mContextDisabled() ||
    isLongContext1mCreditsBlocked() ||
    getSonnet46ContextWindowOverride(e) !== null
  )
    return null;
  let r = getFeatureValue_SESSION_PINNED(TENGU_KIND_DEWDROP, {})?.[n];
  if (typeof r !== "number" || !Number.isInteger(r) || r >= 1e6) return null;
  let min = Math.min(r, bi(e, n) ?? r);
  return min > rlt ? min : null;
}
//@ chunk-aepeg2w5.js:470748-470799 placement
var rlt = 200000,
  CK = 200000,
  zG = 1e6,
  Qw = 32000,
  jG = 128000;
/**
 * 自定义模型名能否按 opus 别名对待：不含已知族名、不是已知模型或档位默认、也不是 ANTHROPIC_SMALL_FAST_MODEL。旧版名 getSmallFastModel 为错配。
 */
//@ chunk-e6aww6q8.js:1428769-1428917 fingerprint = getSmallFastModel (1)
function isOpusAliasCandidate(e, n) {
  if (v8.some((s) => n.includes(s))) return !1;
  if (isRecognizedCanonical(n) || isTierDefaultModelEnv(e)) return !1;
  let ANTHROPIC_SMALL_FAST_MODEL = env.ANTHROPIC_SMALL_FAST_MODEL;
  return !(ANTHROPIC_SMALL_FAST_MODEL !== void 0 && Sv(ANTHROPIC_SMALL_FAST_MODEL, e));
}
/**
 * 运行时模型（含 plan 模式切换）与上次公告不同时生成模型公告附件。旧版名 getRuntimeMainLoopModel 不准确。
 */
//@ chunk-e6aww6q8.js:3333467-3333681 fingerprint = getRuntimeMainLoopModel (0.687)
async function getRuntimeModelSwitchAnnouncements(e, n) {
  if (!int(e.options)) return [];
  let r = Us(n ?? []),
    mode = getToolPermissionContext(e).mode,
    h = Pkt(
      getRuntimeMainLoopModel({
        permissionMode: mode,
        mainLoopModel: getMainLoopModel_2(e),
        exceeds200kTokens: mode === "plan" && doesMostRecentAssistantMessageExceed200k(r),
      }),
    ),
    y = getLastModelIdentity(r);
  return y && isSameModelIdentity(y, h) ? [] : [await buildModelEnvInfoAttachment(h)];
}
/**
 * 已有 [1m] 原样返回，否则追加 [1m]。旧版名 resolveSkillModelOverride 为错配。
 */
//@ chunk-095ptjmr.js:6087-6140 fingerprint = resolveSkillModelOverride (1)
function ensure1mSuffix(f) {
  return /\[1m\]$/i.test(f) ? f : `${f}[1m]`;
}
/**
 * 默认模型设置展开：opusplan 返回 [默认 Opus, 解析后]，否则 [解析后]。
 */
//@ chunk-d1cgs5na.js:12054-12136 fingerprint = renderDefaultModelSetting (1)
function renderDefaultModelSetting(setting) {
  return Lt(setting.toLowerCase().trim()) === "opusplan"
    ? [getDefaultOpusModel(), parseUserSpecifiedModel(setting)]
    : [parseUserSpecifiedModel(setting)];
}
/**
 * sonnet/opus/haiku/fable → 对应默认模型 getter 的结果。旧版名 CLAUDE_4_5_OR_4_6_MODEL_IDS 为错配。
 */
//@ chunk-hwmsct5x.js:200437-200502 placement = CLAUDE_4_5_OR_4_6_MODEL_IDS (0.463)
function getDefaultModelForFamily(e) {
  return {
    sonnet: getDefaultSonnetModel,
    opus: getDefaultOpusModel,
    haiku: getDefaultHaikuModel,
    fable: getDefaultFableModel,
  }[e]();
}

export {
  strip1mTagWhereBuiltIn,
  isPinnedFableModel,
  getDefaultOpusModel,
  getMainLoopModel,
  modelDisplayString,
  ensure1mSuffix,
  resolveModelAliasSpelling,
  toProviderWireModelId,
  isOpus5FamilyModel,
  strip1mTag,
  modelSettingResolvesThroughModelStrings,
  renderDefaultModelSetting,
  isOpus55FamilyModel,
  isSonnet55FamilyModel,
  resolveSkillModelOverride,
  getDefaultSonnetModel,
  DEFAULT_3P_OPUS_KEY,
  DEFAULT_3P_SONNET_KEY,
  DEFAULT_3P_HAIKU_KEY,
  isFableModelValue,
  isMythosModelValue,
  CK,
  isFableFamilyOrPinnedModel,
  inlineSkillModelOverride,
  isUnservedFamilySpelling,
  isTierDefaultModelEnv,
  rlt,
  isUnservedModelSpelling,
  isAntInternalFastModelId,
  isOpusAliasCandidate,
  getMarketingNameForModel,
  DEFAULT_MANTLE_OPUS_KEY,
  DEFAULT_VERTEX_OPUS_KEY,
  isFableAvailable,
  isMythosAvailable,
  isServedExpandedSpelling,
  isLegacyOpusFirstParty,
  isLegacyModelRemapEnabled,
  isModelOverrideTarget,
  normalizeModelSpelling,
  isKnownCustomModel,
  LEGACY_SUBAGENT_MODEL_IDS,
  Bi,
  yn,
  nameForUnnamedModelId,
  resolveModelAliasSetting,
  BK,
  resolveDefaultOpusModel,
  getDefaultModelForFamily,
  getDefaultFableModel,
  Fu,
  Wp,
  Uu,
  getBestAvailableAlias,
  zG,
  getFlagContextWindow,
  Qw,
  jG,
  getRuntimeModelSwitchAnnouncements,
  DEFAULT_BEDROCK_OPUS_KEY,
  documentTierAliasTarget,
  DEFAULT_3P_FABLE_KEY,
};
