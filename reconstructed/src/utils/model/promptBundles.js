/**
 * utils/model/promptBundles.ts
 *
 * 2.1.316 新增：模型提示词包选择。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p1bhnnws.js (53)
 * attribution: placement 53
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

//@ chunk-p1bhnnws.js:2662-2690 placement
var TENGU_FENNEL_GODWIT = "tengu_fennel_godwit";
//@ chunk-p1bhnnws.js:2690-2796 placement
/**
 * 判断模型是否使用 Opus 5 提示词包（能力声明且未被开关关闭）。
 */
function usesOpus5PromptBundle(model) {
  if (model === undefined) return false;
  if (modelSupportsCapability(getCanonicalName(model), "opus_5_prompt_bundle", model) !== true) return false;
  return !getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FENNEL_GODWIT, false);
}
//@ chunk-p1bhnnws.js:2796-2860 placement
function supportsOpus55PromptBundle(canonicalName) {
  return !isLocalAgentOrCowork() && modelSupportsCapability(canonicalName, "opus_5_5_prompt_bundle") === true;
}
//@ chunk-p1bhnnws.js:2860-3190 placement
/**
 * 模型能力开关集合：对最新模型默认开启的能力、随 Opus 5 提示词包开启的能力、对另一组模型开启的能力，以及遥测去重上限与事件名。
 */
var DEFAULT_ON_CAPABILITIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var OPUS5_BUNDLE_CAPABILITIES;
var LATEST_MODEL_CAPABILITIES;
var MAX_LOGGED_SESSIONS;
var TENGU_MODEL_CAPABILITY_FROM_CLIENT_DATA;
var TENGU_MODEL_CAPABILITY_OFF_FROM_CLIENT_DATA;
deferInit("chunk-p1bhnnws.js:2860", () => {
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
//@ chunk-p1bhnnws.js:3190-3443 placement
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
//@ chunk-p1bhnnws.js:3443-3575 placement
/**
 * 在能力列表中查找某前缀的最后一个启用值，返回前缀后的部分。
 */
function findCapabilityValue(prefix, model, model_2) {
  let modelCapabilitiesEnv = parseModelCapabilitiesEnv(model);
  return [...(servedCapabilities(model_2, model) ?? []), ...modelCapabilitiesEnv.keys()]
    .findLast((name) => name.startsWith(prefix) && modelCapabilitiesEnv.get(name) !== false)
    ?.slice(prefix.length);
}
//@ chunk-p1bhnnws.js:3575-3872 placement
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
//@ chunk-p1bhnnws.js:3872-3941 placement
function usesPerTurnEffort(canonical, model) {
  if (mainLoopCanonicalName() !== canonical) return false;
  return isModelCapabilityEnabled("per_turn_effort", canonical, model);
}
//@ chunk-p1bhnnws.js:3941-3993 placement
function mainLoopCanonicalName() {
  try {
    return getCanonicalName(getMainLoopModel());
  } catch {
    return null;
  }
}
//@ chunk-p1bhnnws.js:3993-4000 placement
// deferred: uses setCachedGateValue (../../services/analytics/growthbookGates.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-p1bhnnws.js:3993", () => {
  setCachedGateValue(usesPerTurnEffort);
});
//@ chunk-p1bhnnws.js:4000-4025 placement
/**
 * 恒返回 false（无该档位能力）。
 */
function neverTierCapability(capability) {
  return false;
}
//@ chunk-p1bhnnws.js:4025-4074 placement
/**
 * 判断是否 Opus 4.8 模型。
 */
function isOpus48Model(modelName) {
  return strip1mSuffix(modelName) === "claude-opus-4-8";
}
//@ chunk-p1bhnnws.js:4074-4099 placement
/**
 * 恒返回 false（无该档位能力，占位）。
 */
function neverTierCapabilityB(capability) {
  return false;
}
//@ chunk-p1bhnnws.js:4099-4306 placement
var LEGACY_PROMPT_MODELS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-p1bhnnws.js:4099", () => {
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
//@ chunk-p1bhnnws.js:4306-4340 placement
function isLegacyPromptModel(model) {
  return LEGACY_PROMPT_MODELS.has(strip1mSuffix(model));
}
//@ chunk-p1bhnnws.js:4340-4420 placement
/**
 * 判断模型（或覆盖模型）是否属于旧版提示词模型。
 */
function isLegacyPromptModelOrOverride(model, remoteCall) {
  if (remoteCall === undefined) return isLegacyPromptModel(model);
  return remoteCall.model !== undefined && isLegacyPromptModel(remoteCall.model);
}
//@ chunk-p1bhnnws.js:4420-4478 placement
var TENGU_LOGGIA_ROSTER; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var loggiaRosterState;
var loggiaRosterSchema;
var loggiaRosterMemo;
deferInit("chunk-p1bhnnws.js:4420", () => {
  TENGU_LOGGIA_ROSTER = "tengu_loggia_roster";
  loggiaRosterState = [];
  loggiaRosterSchema = DoctorLazy(() => array(stringSchema().trim()));
});
//@ chunk-p1bhnnws.js:4478-4725 placement
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
//@ chunk-p1bhnnws.js:4725-4771 placement
/**
 * 判断模型是否在 loggia 名单中。
 */
function isInLoggiaRoster(model) {
  return getLoggiaRoster().some((id) => sameModelSpelling(model, id));
}
//@ chunk-p1bhnnws.js:4771-4855 placement
/**
 * 取该模型应使用的"精简改写"提示词包。
 */
function leanRewriteFor(model) {
  let state = currentPromptBundleState();
  return isCatalogSuppressed() ? state.leanRewriteCompiledOnly(model) : state.leanRewrite(model);
}
//@ chunk-p1bhnnws.js:4855-4905 placement
/**
 * 优先用显式 leanRewrite，否则按模型取。
 */
function leanRewriteOf(bundle) {
  return bundle.leanRewrite ?? leanRewriteFor(bundle.model);
}
//@ chunk-p1bhnnws.js:4905-5181 placement
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
//@ chunk-p1bhnnws.js:5181-5306 placement
function clientDataFlagIncludes(flagName, keys) {
  let flag = getCachedClientData()?.[flagName];
  return (
    typeof flag === "object" &&
    flag !== null &&
    Object.entries(flag).some(([key, value]) => value === true && keys.includes(key))
  );
}
//@ chunk-p1bhnnws.js:5306-5375 placement
/**
 * 判断 basalt_cove 能力是否开启（环境变量或客户端数据）。
 */
function isBasaltCoveOn(keys) {
  return env.CLAUDE_CODE_BASALT_COVE || clientDataFlagIncludes("basalt_cove", keys);
}
//@ chunk-p1bhnnws.js:5375-5403 placement
var TENGU_THRIFTY_SONIC = "tengu_thrifty_sonic";
//@ chunk-p1bhnnws.js:5403-5512 placement
function getBashFirstAssignment() {
  let state = currentPromptBundleState();
  return isCatalogSuppressed()
    ? state.bashFirstSessionAssignmentCompiledOnly()
    : state.bashFirstSessionAssignment();
}
//@ chunk-p1bhnnws.js:5512-5678 placement
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
//@ chunk-p1bhnnws.js:5678-5851 placement
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
//@ chunk-p1bhnnws.js:5851-5877 placement
var TENGU_COZY_TEAPOT = "tengu_cozy_teapot";
//@ chunk-p1bhnnws.js:5877-5935 placement
function normalizeSteerVariant(featureValue_SESSION_PINNED) {
  return featureValue_SESSION_PINNED === "strict" || featureValue_SESSION_PINNED === "relaxed"
    ? featureValue_SESSION_PINNED
    : undefined;
}
//@ chunk-p1bhnnws.js:5935-6012 placement
/**
 * 取 bash 优先的引导变体（环境变量优先）。
 */
function bashFirstSteerVariant() {
  return env.CLAUDE_CODE_COZY_TEAPOT ?? currentPromptBundleState().bashFirstSteerVariant();
}
//@ chunk-p1bhnnws.js:6012-6108 placement
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
//@ chunk-p1bhnnws.js:6108-6158 placement
var TENGU_GORSE_PLOVER = "tengu_gorse_plover";
var TENGU_WILLOW_TERN = "tengu_willow_tern";
//@ chunk-p1bhnnws.js:6158-6209 placement
function isClientFlagOrFeatureOn(flagOn, name) {
  return flagOn || getCachedClientData()?.[name] === true || getFeatureValue_CACHED_MAY_BE_STALE(name, false);
}
//@ chunk-p1bhnnws.js:6209-6322 placement
/**
 * 判断 Bash act-first 是否开启（环境变量或开关，按会话缓存）。
 */
function isBashActFirstEnabled() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.bashActFirstEnabled ??= isClientFlagOrFeatureOn(
    env.CLAUDE_CODE_GORSE_PLOVER,
    TENGU_GORSE_PLOVER,
  );
  return sessionFeatureValues.bashActFirstEnabled;
}
//@ chunk-p1bhnnws.js:6322-6413 placement
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
//@ chunk-p1bhnnws.js:6413-6488 placement
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
//@ chunk-p1bhnnws.js:6488-6575 placement
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
//@ chunk-p1bhnnws.js:6575-6819 placement
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
//@ chunk-p1bhnnws.js:6819-7025 placement
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
//@ chunk-p1bhnnws.js:7025-7068 placement
/**
 * 取 CLAUDE_CODE_SIMPLE 环境变量。
 */
function simpleModeEnv() {
  return env.CLAUDE_CODE_SIMPLE;
}
//@ chunk-p1bhnnws.js:7068-7350 placement
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
//@ chunk-p1bhnnws.js:7350-7431 placement
/**
 * 取该模型应使用的精简提示词包。
 */
function leanPromptFor(model) {
  let state = currentPromptBundleState();
  return isCatalogSuppressed() ? state.leanPromptCompiledOnly(model) : state.leanPrompt(model);
}
//@ chunk-p1bhnnws.js:7431-7479 placement
/**
 * 优先用显式 leanPrompt，否则按模型取。
 */
function leanPromptOf(bundle) {
  return bundle.leanPrompt ?? leanPromptFor(bundle.model);
}
//@ chunk-p1bhnnws.js:7479-7706 placement
function shouldUseLeanPrompt(model) {
  if (!model) return false;
  if (isEnvTruthy(env.CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT)) return true;
  if (isEnvDefinedFalsy(env.CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT)) return false;
  if (!isLegacyPromptModel_2(model)) return true;
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvet_tide", false)) return true;
  return clientDataFlagIncludes("simple_system_prompt", getCanonicalName(model));
}
//@ chunk-p1bhnnws.js:7706-7730 placement
var BREEZY_HORIZON = "breezy_horizon";
//@ chunk-p1bhnnws.js:7730-7841 placement
/**
 * 返回用于选择提示词的模型（可能被替换）。
 */
function getPromptModel(model) {
  if (model === undefined) return;
  let state = currentPromptBundleState();
  return isCatalogSuppressed() ? state.modelForPromptCompiledOnly(model) : state.modelForPrompt(model);
}
//@ chunk-p1bhnnws.js:7841-7916 placement
/**
 * 若该模型在提示词模型替换缓存中，返回替换后的模型。
 */
function promptModelOverride(model) {
  let modelForPrompt = currentPromptBundleState().modelForPrompt;
  return modelForPrompt.cache.has(model) ? modelForPrompt(model) : undefined;
}
//@ chunk-p1bhnnws.js:7916-8551 placement
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
//@ chunk-p1bhnnws.js:8551-8591 placement
function isUsablePromptModelOverride(override) {
  return isRecognizedModel(override) || isStandardVersion(parseModelId(override));
}
//@ chunk-p1bhnnws.js:8591-8916 placement
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
//@ chunk-p1bhnnws.js:8916-8940 placement
var promptBundleStateRegistry; // deferred: uses PromptBundleState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-p1bhnnws.js:8916", () => {
  promptBundleStateRegistry = new HostScoped(() => new PromptBundleState());
});
//@ chunk-p1bhnnws.js:8940-8976 placement
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
  leanRewriteOf,
  promptModelOverride,
  isThriftySonicEnabled,
  bashFirstSteerVariant,
  isLegacyPromptModelOrOverride,
  isBashActFirstEnabled,
  findCapabilityValue,
  isInLoggiaRoster,
};
