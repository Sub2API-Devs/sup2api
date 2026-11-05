/**
 * utils/model/promptBundles.ts
 *
 * 2.1.316 新增：模型提示词包选择。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rxbqzcvt.js (53)
 * attribution: placement 52, layout 1
 */
import { modelSupportsCapability, parseModelCapabilitiesEnv } from "./modelCatalog.js";
import { getCanonicalName, strippedCanonicalName, isRecognizedModel } from "./canonicalModelName.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../../services/analytics/growthbook.js";
import { isLocalAgentOrCowork } from "../entrypointKinds.js";
import { usesFablePromptBundle } from "./fableMitigations.js";
import { getCachedClientDataSlot, getCachedClientData } from "../config.js";
import { servedCapabilities, isCatalogSuppressed } from "./modelCatalog/servedCatalog.js";
import {
  stripAnyVersatileSuffix,
  strip1mSuffix,
  sameModelSpelling,
  isStandardVersion,
  parseModelId,
} from "./modelIds.js";
import { getMainLoopModel, isOpus55FamilyModel, isOpus5FamilyModel } from "./model.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { getSessionId, getRootSession } from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "./telemetryModelName.js";
import { setCachedGateValue } from "../../services/analytics/growthbookGates.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { array, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../debug.js";
import { env } from "../env.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "../envUtils.js";
import { memoizeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { HostScoped } from "../hostScoped.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-rxbqzcvt.js:828-856 placement
var TENGU_FENNEL_GODWIT = "tengu_fennel_godwit";
//@ chunk-rxbqzcvt.js:856-962 placement
/**
 * 判断模型是否使用 Opus 5 提示词包（能力声明且未被开关关闭）。
 */
function usesOpus5PromptBundle(model) {
  if (model === undefined) return false;
  if (modelSupportsCapability(getCanonicalName(model), "opus_5_prompt_bundle", model) !== true) return false;
  return !getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FENNEL_GODWIT, false);
}
//@ chunk-rxbqzcvt.js:962-1026 placement
function supportsOpus55PromptBundle(canonicalName) {
  return !isLocalAgentOrCowork() && modelSupportsCapability(canonicalName, "opus_5_5_prompt_bundle") === true;
}
//@ chunk-rxbqzcvt.js:1026-1356 placement
/**
 * 模型能力开关集合：对最新模型默认开启的能力、随 Opus 5 提示词包开启的能力、对另一组模型开启的能力，以及遥测去重上限与事件名。
 */
var DEFAULT_ON_CAPABILITIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var OPUS5_BUNDLE_CAPABILITIES;
var LATEST_MODEL_CAPABILITIES;
var MAX_LOGGED_SESSIONS;
var TENGU_MODEL_CAPABILITY_FROM_CLIENT_DATA;
var TENGU_MODEL_CAPABILITY_OFF_FROM_CLIENT_DATA;
deferInit("chunk-rxbqzcvt.js:1026", () => {
  DEFAULT_ON_CAPABILITIES = new Set([
    "turn_updates",
    "bash_output_audience_note",
    "silent_turn_reminder",
    "thinking_display_updates",
  ]);
  OPUS5_BUNDLE_CAPABILITIES = new Set(["bison_cairn", "larch_cistern"]);
  LATEST_MODEL_CAPABILITIES = new Set(["silent_turn_reminder", "quizzical_shore", "original_games_guidance"]);
  MAX_LOGGED_SESSIONS = 64;
  TENGU_MODEL_CAPABILITY_FROM_CLIENT_DATA = "tengu_model_capability_from_client_data";
  TENGU_MODEL_CAPABILITY_OFF_FROM_CLIENT_DATA = "tengu_model_capability_off_from_client_data";
});
//@ chunk-rxbqzcvt.js:1356-1609 placement
/**
 * 判断模型能力是否开启：显式覆盖 > 能力声明 > 默认开启集合（可被客户端数据关闭）> 客户端数据开启。
 */
function isModelCapabilityEnabled(capability, canonicalName, model, explicit) {
  if (explicit !== undefined) return explicit;
  let supported = modelSupportsCapability(canonicalName, capability, model);
  if (supported !== undefined) return supported;
  let defaultOn =
    (DEFAULT_ON_CAPABILITIES.has(capability) && usesFablePromptBundle(canonicalName)) ||
    (OPUS5_BUNDLE_CAPABILITIES.has(capability) && usesOpus5PromptBundle(model)) ||
    (LATEST_MODEL_CAPABILITIES.has(capability) && supportsOpus55PromptBundle(canonicalName));
  let cachedClientDataSlot = getCachedClientDataSlot(model);
  if (defaultOn) {
    if (cachedClientDataSlot?.data?.[capability] !== false) return true;
    logClientDataCapability(TENGU_MODEL_CAPABILITY_OFF_FROM_CLIENT_DATA, capability, cachedClientDataSlot);
    return false;
  }
  if (cachedClientDataSlot?.data?.[capability] !== true) return false;
  logClientDataCapability(TENGU_MODEL_CAPABILITY_FROM_CLIENT_DATA, capability, cachedClientDataSlot);
  return true;
}
//@ chunk-rxbqzcvt.js:1609-1741 placement
/**
 * 在能力列表中查找某前缀的最后一个启用值，返回前缀后的部分。
 */
function findCapabilityValue(prefix, model, model_2) {
  let modelCapabilitiesEnv = parseModelCapabilitiesEnv(model);
  return [...(servedCapabilities(model_2, model) ?? []), ...modelCapabilitiesEnv.keys()]
    .findLast((name) => name.startsWith(prefix) && modelCapabilitiesEnv.get(name) !== false)
    ?.slice(prefix.length);
}
//@ chunk-rxbqzcvt.js:1741-2038 placement
function logClientDataCapability(eventName, capability, cachedClientDataSlot) {
  let model = cachedClientDataSlot.model ?? stripAnyVersatileSuffix(getMainLoopModel());
  let loggedBySession = (getSessionFeatureValues().clientDataCapabilityLogged ??= new Map());
  let sessionId = getSessionId();
  let logged = loggedBySession.get(sessionId);
  if (logged === undefined) {
    logged = new Set();
    loggedBySession.set(sessionId, logged);
    if (loggedBySession.size > MAX_LOGGED_SESSIONS) {
      let oldest = loggedBySession.keys().next().value;
      if (oldest !== undefined) loggedBySession.delete(oldest);
    }
  }
  let logKey = `${eventName === TENGU_MODEL_CAPABILITY_OFF_FROM_CLIENT_DATA ? "-" : ""}${capability}:${model}`;
  if (!logged.has(logKey)) {
    logged.add(logKey);
    logEvent(eventName, {
      capability: fromEnum(capability),
      model: telemetrySafeModelName(model),
    });
  }
}
//@ chunk-rxbqzcvt.js:2038-2107 placement
function usesPerTurnEffort(canonical, model) {
  if (mainLoopCanonicalName() !== canonical) return false;
  return isModelCapabilityEnabled("per_turn_effort", canonical, model);
}
//@ chunk-rxbqzcvt.js:2107-2159 placement
function mainLoopCanonicalName() {
  try {
    return getCanonicalName(getMainLoopModel());
  } catch {
    return null;
  }
}
//@ chunk-rxbqzcvt.js:2159-2166 placement
// deferred: uses setCachedGateValue (../../services/analytics/growthbookGates.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rxbqzcvt.js:2159", () => {
  setCachedGateValue(usesPerTurnEffort);
});
//@ chunk-rxbqzcvt.js:2166-2191 placement
/**
 * 恒返回 false（无该档位能力）。
 */
function neverTierCapability(capability) {
  return false;
}
//@ chunk-rxbqzcvt.js:2191-2240 placement
/**
 * 判断是否 Opus 4.8 模型。
 */
function isOpus48Model(modelName) {
  return strip1mSuffix(modelName) === "claude-opus-4-8";
}
//@ chunk-rxbqzcvt.js:2240-2265 placement
/**
 * 恒返回 false（无该档位能力，占位）。
 */
function neverTierCapabilityB(capability) {
  return false;
}
//@ chunk-rxbqzcvt.js:2265-2472 placement
var LEGACY_PROMPT_MODELS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rxbqzcvt.js:2265", () => {
  LEGACY_PROMPT_MODELS = new Set([
    "claude-opus-4-6",
    "claude-haiku-4-5",
    "claude-opus-4-5",
    "claude-opus-4-1",
    "claude-opus-4-0",
    "claude-sonnet-4-5",
    "claude-sonnet-4-0",
    "claude-3-7-sonnet",
    "claude-3-5-sonnet",
    "claude-3-5-haiku",
  ]);
});
//@ chunk-rxbqzcvt.js:2472-2506 placement
function isLegacyPromptModel(model) {
  return LEGACY_PROMPT_MODELS.has(strip1mSuffix(model));
}
//@ chunk-rxbqzcvt.js:2506-2586 placement
/**
 * 判断模型（或覆盖模型）是否属于旧版提示词模型。
 */
function isLegacyPromptModelOrOverride(model, remoteCall) {
  if (remoteCall === undefined) return isLegacyPromptModel(model);
  return remoteCall.model !== undefined && isLegacyPromptModel(remoteCall.model);
}
//@ chunk-rxbqzcvt.js:2586-2644 placement
var TENGU_LOGGIA_ROSTER; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var loggiaRosterState;
var loggiaRosterSchema;
var loggiaRosterMemo;
deferInit("chunk-rxbqzcvt.js:2586", () => {
  TENGU_LOGGIA_ROSTER = "tengu_loggia_roster";
  loggiaRosterState = [];
  loggiaRosterSchema = DoctorLazy(() => array(stringSchema().trim()));
});
//@ chunk-rxbqzcvt.js:2644-2891 placement
function getLoggiaRoster() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    TENGU_LOGGIA_ROSTER,
    loggiaRosterState,
  );
  let memo = loggiaRosterMemo;
  if (memo !== undefined && memo.raw === featureValue_CACHED_MAY_BE_STALE) return memo.ids;
  let parsed = loggiaRosterSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  if (!parsed.success)
    logForDebugging(
      `GrowthBook: ${TENGU_LOGGIA_ROSTER} is not a JSON array of model ids; treating it as empty`,
      {
        level: "warn",
      },
    );
  let ids = parsed.success ? parsed.data : loggiaRosterState;
  loggiaRosterMemo = {
    raw: featureValue_CACHED_MAY_BE_STALE,
    ids,
  };
  return ids;
}
//@ chunk-rxbqzcvt.js:2891-2937 placement
/**
 * 判断模型是否在 loggia 名单中。
 */
function isInLoggiaRoster(model) {
  return getLoggiaRoster().some((id) => sameModelSpelling(model, id));
}
//@ chunk-rxbqzcvt.js:2937-3021 placement
/**
 * 取该模型应使用的"精简改写"提示词包。
 */
function leanRewriteFor(model) {
  let state = currentPromptBundleState();
  return isCatalogSuppressed() ? state.leanRewriteCompiledOnly(model) : state.leanRewrite(model);
}
//@ chunk-rxbqzcvt.js:3021-3071 placement
/**
 * 优先用显式 leanRewrite，否则按模型取。
 */
function leanRewriteOf(bundle) {
  return bundle.leanRewrite ?? leanRewriteFor(bundle.model);
}
//@ chunk-rxbqzcvt.js:3071-3347 placement
function isLeanRewriteEnabled(model) {
  if (model === undefined) return false;
  let canonicalName = getCanonicalName(model);
  let supported = modelSupportsCapability(canonicalName, "temporal_hare", model);
  if (supported === false) return false;
  if (isCatalogSuppressed()) return supported === true && leanPromptFor(model);
  if (!(supported === true || getCachedClientDataSlot(model)?.data?.temporal_hare === true))
    return (
      isOpus55FamilyModel(model) &&
      leanPromptFor(model) &&
      getFeatureValue_SESSION_PINNED("tengu_temporal_hare", false) === true
    );
  if (!leanPromptFor(model)) return false;
  return isModelCapabilityEnabled("temporal_hare", canonicalName, model);
}
//@ chunk-rxbqzcvt.js:3347-3472 placement
function clientDataFlagIncludes(flagName, keys) {
  let flag = getCachedClientData()?.[flagName];
  return (
    typeof flag === "object" &&
    flag !== null &&
    Object.entries(flag).some(([key, value]) => value === true && keys.includes(key))
  );
}
//@ chunk-rxbqzcvt.js:3472-3541 placement
/**
 * 判断 basalt_cove 能力是否开启（环境变量或客户端数据）。
 */
function isBasaltCoveOn(keys) {
  return env.CLAUDE_CODE_BASALT_COVE || clientDataFlagIncludes("basalt_cove", keys);
}
//@ chunk-rxbqzcvt.js:3541-3569 placement
var TENGU_THRIFTY_SONIC = "tengu_thrifty_sonic";
//@ chunk-rxbqzcvt.js:3569-3678 placement
function getBashFirstAssignment() {
  let state = currentPromptBundleState();
  return isCatalogSuppressed()
    ? state.bashFirstSessionAssignmentCompiledOnly()
    : state.bashFirstSessionAssignment();
}
//@ chunk-rxbqzcvt.js:3678-3844 placement
function computeBashFirstAssignment() {
  let model = getPromptModel(getMainLoopModel());
  let canonicalName = getCanonicalName(model);
  let supported = modelSupportsCapability(canonicalName, "thrifty_sonic", model);
  if (supported === false) return "none";
  if (
    usesFablePromptBundle(canonicalName) ||
    supportsOpus55PromptBundle(canonicalName) ||
    getCachedClientData()?.[TENGU_THRIFTY_SONIC] === true ||
    supported
  )
    return "forced";
  return isOpus5FamilyModel(model) ? "cohort" : "none";
}
//@ chunk-rxbqzcvt.js:3844-4017 placement
/**
 * 判断 thrifty_sonic 是否开启：环境变量、强制、关闭或按开关分组。
 */
function isThriftySonicEnabled() {
  if (env.CLAUDE_CODE_THRIFTY_SONIC !== undefined) return env.CLAUDE_CODE_THRIFTY_SONIC;
  switch (getBashFirstAssignment()) {
    case "forced":
      return true;
    case "none":
      return false;
    case "cohort":
      return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_THRIFTY_SONIC, false);
  }
}
//@ chunk-rxbqzcvt.js:4017-4043 placement
var TENGU_COZY_TEAPOT = "tengu_cozy_teapot";
//@ chunk-rxbqzcvt.js:4043-4101 placement
function normalizeSteerVariant(featureValue_SESSION_PINNED) {
  return featureValue_SESSION_PINNED === "strict" || featureValue_SESSION_PINNED === "relaxed"
    ? featureValue_SESSION_PINNED
    : undefined;
}
//@ chunk-rxbqzcvt.js:4101-4178 placement
/**
 * 取 bash 优先的引导变体（环境变量优先）。
 */
function bashFirstSteerVariant() {
  return env.CLAUDE_CODE_COZY_TEAPOT ?? currentPromptBundleState().bashFirstSteerVariant();
}
//@ chunk-rxbqzcvt.js:4178-4273 placement
function resolveBashFirstSteerVariant() {
  return (
    normalizeSteerVariant(getCachedClientData()?.[TENGU_COZY_TEAPOT]) ??
    (supportsOpus55PromptBundle(getCanonicalName(getPromptModel(getMainLoopModel())))
      ? "relaxed"
      : undefined) ??
    normalizeSteerVariant(getFeatureValue_SESSION_PINNED(TENGU_COZY_TEAPOT, null)) ??
    "strict"
  );
}
//@ chunk-rxbqzcvt.js:4273-4322 placement
var TENGU_GORSE_PLOVER = "tengu_gorse_plover";
var TENGU_WILLOW_TERN = "tengu_willow_tern";
//@ chunk-rxbqzcvt.js:4322-4373 placement
function isClientFlagOrFeatureOn(flagOn, name) {
  return flagOn || getCachedClientData()?.[name] === true || getFeatureValue_CACHED_MAY_BE_STALE(name, false);
}
//@ chunk-rxbqzcvt.js:4373-4485 layout
function isBashActFirstEnabled() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.bashActFirstEnabled ??= isClientFlagOrFeatureOn(
    env.CLAUDE_CODE_GORSE_PLOVER,
    TENGU_GORSE_PLOVER,
  );
  return sessionFeatureValues.bashActFirstEnabled;
}
//@ chunk-rxbqzcvt.js:4485-4576 placement
/**
 * 判断 amber_astrolabe 能力是否开启。
 */
function isAmberAstrolabeEnabled(model) {
  return isModelCapabilityEnabled(
    "amber_astrolabe",
    getCanonicalName(model),
    model,
    env.CLAUDE_CODE_AMBER_ASTROLABE || undefined,
  );
}
//@ chunk-rxbqzcvt.js:4576-4651 placement
/**
 * 判断 bison_cairn 能力是否开启。
 */
function isBisonCairnEnabled(modelName) {
  return isModelCapabilityEnabled(
    "bison_cairn",
    getCanonicalName(modelName),
    modelName,
    env.CLAUDE_CODE_BISON_CAIRN,
  );
}
//@ chunk-rxbqzcvt.js:4651-4738 placement
/**
 * 判断 larch_cistern 能力是否开启。
 */
function isLarchCisternEnabled(modelName) {
  return isModelCapabilityEnabled(
    "larch_cistern",
    getCanonicalName(modelName),
    modelName,
    env.CLAUDE_CODE_LARCH_CISTERN || undefined,
  );
}
//@ chunk-rxbqzcvt.js:4738-4982 placement
/**
 * 读取客户端数据中的 willow_tern 布尔覆盖（非布尔值只提示一次）。
 */
function getWillowTernOverride() {
  let value = getCachedClientData()?.[TENGU_WILLOW_TERN];
  if (typeof value === "boolean") return value;
  if (value !== undefined) {
    let state = currentPromptBundleState();
    if (!state.unusableWritingOverrideTold) {
      state.unusableWritingOverrideTold = true;
      logForDebugging(
        `willow_tern: ignoring non-boolean clientData ${TENGU_WILLOW_TERN} value of type ${typeof value}`,
      );
    }
  }
  return;
}
//@ chunk-rxbqzcvt.js:4982-5188 placement
/**
 * 判断 willow_tern 写作指引是否开启：环境变量、客户端数据、最新模型或 Opus 5 提示词包加开关。
 */
function isWillowTernEnabled(model) {
  if (env.CLAUDE_CODE_WILLOW_TERN) return true;
  let willowTernOverride = getWillowTernOverride();
  if (willowTernOverride !== undefined) return willowTernOverride;
  if (model === undefined) return false;
  let canonicalName = getCanonicalName(model);
  if (usesFablePromptBundle(canonicalName)) return true;
  if (modelSupportsCapability(canonicalName, "opus_5_prompt_bundle", model) !== true) return false;
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WILLOW_TERN, false);
}
//@ chunk-rxbqzcvt.js:5188-5231 placement
/**
 * 取 CLAUDE_CODE_SIMPLE 环境变量。
 */
function simpleModeEnv() {
  return env.CLAUDE_CODE_SIMPLE;
}
//@ chunk-rxbqzcvt.js:5231-5513 placement
function isLegacyPromptModel_2(model) {
  let canonicalName = getCanonicalName(model, {
    deterministic: true,
  });
  let supported = modelSupportsCapability(canonicalName, "lean_prompt", model);
  if (supported !== undefined) return !supported;
  return (
    canonicalName.includes("claude-3-") ||
    canonicalName.includes("haiku") ||
    canonicalName.includes("sonnet") ||
    canonicalName === "claude-opus-4-0" ||
    canonicalName === "claude-opus-4-1" ||
    canonicalName === "claude-opus-4-5" ||
    canonicalName === "claude-opus-4-6" ||
    canonicalName === "claude-opus-4-7"
  );
}
//@ chunk-rxbqzcvt.js:5513-5594 placement
/**
 * 取该模型应使用的精简提示词包。
 */
function leanPromptFor(model) {
  let state = currentPromptBundleState();
  return isCatalogSuppressed() ? state.leanPromptCompiledOnly(model) : state.leanPrompt(model);
}
//@ chunk-rxbqzcvt.js:5594-5642 placement
/**
 * 优先用显式 leanPrompt，否则按模型取。
 */
function leanPromptOf(bundle) {
  return bundle.leanPrompt ?? leanPromptFor(bundle.model);
}
//@ chunk-rxbqzcvt.js:5642-5869 placement
function shouldUseLeanPrompt(model) {
  if (!model) return false;
  if (isEnvTruthy(env.CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT)) return true;
  if (isEnvDefinedFalsy(env.CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT)) return false;
  if (!isLegacyPromptModel_2(model)) return true;
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvet_tide", false)) return true;
  return clientDataFlagIncludes("simple_system_prompt", getCanonicalName(model));
}
//@ chunk-rxbqzcvt.js:5869-5893 placement
var BREEZY_HORIZON = "breezy_horizon";
//@ chunk-rxbqzcvt.js:5893-6004 placement
/**
 * 返回用于选择提示词的模型（可能被替换）。
 */
function getPromptModel(model) {
  if (model === undefined) return;
  let state = currentPromptBundleState();
  return isCatalogSuppressed() ? state.modelForPromptCompiledOnly(model) : state.modelForPrompt(model);
}
//@ chunk-rxbqzcvt.js:6004-6079 placement
/**
 * 若该模型在提示词模型替换缓存中，返回替换后的模型。
 */
function promptModelOverride(model) {
  let modelForPrompt = currentPromptBundleState().modelForPrompt;
  return modelForPrompt.cache.has(model) ? modelForPrompt(model) : undefined;
}
//@ chunk-rxbqzcvt.js:6079-6714 placement
/**
 * 按 CLAUDE_CODE_BREEZY_HORIZON 或客户端数据中的映射，把用于选择提示词的模型替换为另一个模型（校验是模型 id、不是自身），首次替换上报 tengu_breezy_horizon。
 */
function resolvePromptModelSwap(model) {
  let CLAUDE_CODE_BREEZY_HORIZON = env.CLAUDE_CODE_BREEZY_HORIZON;
  if (isEnvDefinedFalsy(CLAUDE_CODE_BREEZY_HORIZON)) return model;
  let canonical = strippedCanonicalName(model);
  let clientDataMap = getCachedClientData()?.[BREEZY_HORIZON];
  let override =
    CLAUDE_CODE_BREEZY_HORIZON ??
    (typeof clientDataMap === "object" && clientDataMap !== null
      ? Object.entries(clientDataMap).find(([key]) => key === canonical)?.[1]
      : undefined);
  if (override === undefined) return model;
  let source = CLAUDE_CODE_BREEZY_HORIZON !== undefined ? "env" : "client_data";
  if (typeof override !== "string" || !isUsablePromptModelOverride(override)) {
    logForDebugging(
      `[breezy_horizon] ${source}: ignoring ${String(override)} for ${canonical}: not a model id`,
      {
        level: "warn",
      },
    );
    return model;
  }
  let targetCanonical = strippedCanonicalName(override);
  if (targetCanonical === canonical) {
    if (!isStandardVersion(parseModelId(override)))
      logForDebugging(
        `[breezy_horizon] ${source}: ${override} names ${canonical} itself, so it maps nothing`,
        {
          level: "warn",
        },
      );
    return model;
  }
  let promptModelSwapsLogged = currentPromptBundleState().promptModelSwapsLogged;
  if (!promptModelSwapsLogged.has(model)) {
    promptModelSwapsLogged.add(model);
    logEvent("tengu_breezy_horizon", {
      from_model: telemetrySafeModelName(canonical),
      to_model: telemetrySafeModelName(targetCanonical),
      source: fromEnum(source),
    });
  }
  return override;
}
//@ chunk-rxbqzcvt.js:6714-6754 placement
function isUsablePromptModelOverride(override) {
  return isRecognizedModel(override) || isStandardVersion(parseModelId(override));
}
//@ chunk-rxbqzcvt.js:6754-7078 placement
/**
 * 按会话缓存的提示词包判定：bash 优先分组、精简提示词、提示词模型替换、精简改写（各有仅编译期目录的版本），以及已记录的替换与警告状态。
 */
class PromptBundleState {
  bashFirstSessionAssignment = memoizeAlias(computeBashFirstAssignment);
  bashFirstSessionAssignmentCompiledOnly = memoizeAlias(computeBashFirstAssignment);
  bashFirstSteerVariant = memoizeAlias(resolveBashFirstSteerVariant);
  leanPrompt = memoizeAlias(shouldUseLeanPrompt);
  leanPromptCompiledOnly = memoizeAlias(shouldUseLeanPrompt);
  modelForPrompt = memoizeAlias(resolvePromptModelSwap);
  modelForPromptCompiledOnly = memoizeAlias(resolvePromptModelSwap);
  leanRewrite = memoizeAlias(isLeanRewriteEnabled);
  leanRewriteCompiledOnly = memoizeAlias(isLeanRewriteEnabled);
  promptModelSwapsLogged = new Set();
  unusableWritingOverrideTold = false;
}
//@ chunk-rxbqzcvt.js:7078-7102 placement
var promptBundleStateRegistry; // deferred: uses PromptBundleState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rxbqzcvt.js:7078", () => {
  promptBundleStateRegistry = new HostScoped(() => new PromptBundleState());
});
//@ chunk-rxbqzcvt.js:7102-7138 placement
function currentPromptBundleState() {
  return promptBundleStateRegistry.of(getRootSession().host);
}
export {
  leanRewriteFor,
  neverTierCapability,
  neverTierCapabilityB,
  isModelCapabilityEnabled,
  isBasaltCoveOn,
  leanPromptFor,
  isWillowTernEnabled,
  getWillowTernOverride,
  isAmberAstrolabeEnabled,
  isOpus48Model,
  getPromptModel,
  simpleModeEnv,
  usesOpus5PromptBundle,
  isBisonCairnEnabled,
  isLarchCisternEnabled,
  leanPromptOf,
  isThriftySonicEnabled,
  bashFirstSteerVariant,
  leanRewriteOf,
  isLegacyPromptModelOrOverride,
  isBashActFirstEnabled,
  promptModelOverride,
  findCapabilityValue,
  isInLoggiaRoster,
};
