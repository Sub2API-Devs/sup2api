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
import { array, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../debug.js";
import { env } from "../env.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "../envUtils.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { HostScoped } from "../hostScoped.js";

//@ chunk-p1bhnnws.js:2662-2690 placement
var TENGU_FENNEL_GODWIT = "tengu_fennel_godwit";
//@ chunk-p1bhnnws.js:2690-2796 placement
/**
 * 判断模型是否使用 Opus 5 提示词包（能力声明且未被开关关闭）。
 */
function usesOpus5PromptBundle(e) {
  if (e === undefined) return false;
  if (modelSupportsCapability(getCanonicalName(e), "opus_5_prompt_bundle", e) !== true) return false;
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
var DEFAULT_ON_CAPABILITIES = new Set([
  "turn_updates",
  "bash_output_audience_note",
  "silent_turn_reminder",
  "thinking_display_updates",
]);
var OPUS5_BUNDLE_CAPABILITIES = new Set(["bison_cairn", "larch_cistern"]);
var LATEST_MODEL_CAPABILITIES = new Set([
  "silent_turn_reminder",
  "quizzical_shore",
  "original_games_guidance",
]);
var MAX_LOGGED_SESSIONS = 64;
var TENGU_MODEL_CAPABILITY_FROM_CLIENT_DATA = "tengu_model_capability_from_client_data";
var TENGU_MODEL_CAPABILITY_OFF_FROM_CLIENT_DATA = "tengu_model_capability_off_from_client_data";
//@ chunk-p1bhnnws.js:3190-3443 placement
/**
 * 判断模型能力是否开启：显式覆盖 > 能力声明 > 默认开启集合（可被客户端数据关闭）> 客户端数据开启。
 */
function isModelCapabilityEnabled(e, canonicalName, r, l) {
  if (l !== undefined) return l;
  let s = modelSupportsCapability(canonicalName, e, r);
  if (s !== undefined) return s;
  let d =
    (DEFAULT_ON_CAPABILITIES.has(e) && usesFablePromptBundle(canonicalName)) ||
    (OPUS5_BUNDLE_CAPABILITIES.has(e) && usesOpus5PromptBundle(r)) ||
    (LATEST_MODEL_CAPABILITIES.has(e) && supportsOpus55PromptBundle(canonicalName));
  let cachedClientDataSlot = getCachedClientDataSlot(r);
  if (d) {
    if (cachedClientDataSlot?.data?.[e] !== false) return true;
    logClientDataCapability(TENGU_MODEL_CAPABILITY_OFF_FROM_CLIENT_DATA, e, cachedClientDataSlot);
    return false;
  }
  if (cachedClientDataSlot?.data?.[e] !== true) return false;
  logClientDataCapability(TENGU_MODEL_CAPABILITY_FROM_CLIENT_DATA, e, cachedClientDataSlot);
  return true;
}
//@ chunk-p1bhnnws.js:3443-3575 placement
/**
 * 在能力列表中查找某前缀的最后一个启用值，返回前缀后的部分。
 */
function findCapabilityValue(e, canonicalName, r) {
  let modelCapabilitiesEnv = parseModelCapabilitiesEnv(canonicalName);
  return [...(servedCapabilities(r, canonicalName) ?? []), ...modelCapabilitiesEnv.keys()]
    .findLast((s) => s.startsWith(e) && modelCapabilitiesEnv.get(s) !== false)
    ?.slice(e.length);
}
//@ chunk-p1bhnnws.js:3575-3872 placement
function logClientDataCapability(e, n, cachedClientDataSlot) {
  let l = cachedClientDataSlot.model ?? stripAnyVersatileSuffix(getMainLoopModel());
  let s = (getSessionFeatureValues().clientDataCapabilityLogged ??= new Map());
  let sessionId = getSessionId();
  let u = s.get(sessionId);
  if (u === undefined) {
    u = new Set();
    s.set(sessionId, u);
    if (s.size > MAX_LOGGED_SESSIONS) {
      let E = s.keys().next().value;
      if (E !== undefined) s.delete(E);
    }
  }
  let h = `${e === TENGU_MODEL_CAPABILITY_OFF_FROM_CLIENT_DATA ? "-" : ""}${n}:${l}`;
  if (!u.has(h)) {
    u.add(h);
    logEvent(e, {
      capability: fromEnum(n),
      model: telemetrySafeModelName(l),
    });
  }
}
//@ chunk-p1bhnnws.js:3872-3941 placement
function usesPerTurnEffort(e, n) {
  if (mainLoopCanonicalName() !== e) return false;
  return isModelCapabilityEnabled("per_turn_effort", e, n);
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
setCachedGateValue(usesPerTurnEffort);
//@ chunk-p1bhnnws.js:4000-4025 placement
/**
 * 恒返回 false（无该档位能力）。
 */
function neverTierCapability(e) {
  return false;
}
//@ chunk-p1bhnnws.js:4025-4074 placement
/**
 * 判断是否 Opus 4.8 模型。
 */
function isOpus48Model(canonicalName) {
  return strip1mSuffix(canonicalName) === "claude-opus-4-8";
}
//@ chunk-p1bhnnws.js:4074-4099 placement
/**
 * 恒返回 false（无该档位能力，占位）。
 */
function neverTierCapabilityB(e) {
  return false;
}
//@ chunk-p1bhnnws.js:4099-4306 placement
var LEGACY_PROMPT_MODELS = new Set([
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
//@ chunk-p1bhnnws.js:4306-4340 placement
function isLegacyPromptModel(e) {
  return LEGACY_PROMPT_MODELS.has(strip1mSuffix(e));
}
//@ chunk-p1bhnnws.js:4340-4420 placement
/**
 * 判断模型（或覆盖模型）是否属于旧版提示词模型。
 */
function isLegacyPromptModelOrOverride(canonicalName, remoteCall) {
  if (remoteCall === undefined) return isLegacyPromptModel(canonicalName);
  return remoteCall.model !== undefined && isLegacyPromptModel(remoteCall.model);
}
//@ chunk-p1bhnnws.js:4420-4478 placement
var TENGU_LOGGIA_ROSTER = "tengu_loggia_roster";
var loggiaRosterState = [];
var loggiaRosterSchema = DoctorLazy(() => array(string().trim()));
var loggiaRosterMemo;
//@ chunk-p1bhnnws.js:4478-4725 placement
function getLoggiaRoster() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    TENGU_LOGGIA_ROSTER,
    loggiaRosterState,
  );
  let n = loggiaRosterMemo;
  if (n !== undefined && n.raw === featureValue_CACHED_MAY_BE_STALE) return n.ids;
  let r = loggiaRosterSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  if (!r.success)
    logForDebugging(
      `GrowthBook: ${TENGU_LOGGIA_ROSTER} is not a JSON array of model ids; treating it as empty`,
      {
        level: "warn",
      },
    );
  let l = r.success ? r.data : loggiaRosterState;
  loggiaRosterMemo = {
    raw: featureValue_CACHED_MAY_BE_STALE,
    ids: l,
  };
  return l;
}
//@ chunk-p1bhnnws.js:4725-4771 placement
/**
 * 判断模型是否在 loggia 名单中。
 */
function isInLoggiaRoster(e) {
  return getLoggiaRoster().some((n) => sameModelSpelling(e, n));
}
//@ chunk-p1bhnnws.js:4771-4855 placement
/**
 * 取该模型应使用的"精简改写"提示词包。
 */
function leanRewriteFor(e) {
  let n = currentPromptBundleState();
  return isCatalogSuppressed() ? n.leanRewriteCompiledOnly(e) : n.leanRewrite(e);
}
//@ chunk-p1bhnnws.js:4855-4905 placement
/**
 * 优先用显式 leanRewrite，否则按模型取。
 */
function leanRewriteOf(e) {
  return e.leanRewrite ?? leanRewriteFor(e.model);
}
//@ chunk-p1bhnnws.js:4905-5181 placement
function isLeanRewriteEnabled(e) {
  if (e === undefined) return false;
  let canonicalName = getCanonicalName(e);
  let r = modelSupportsCapability(canonicalName, "temporal_hare", e);
  if (r === false) return false;
  if (isCatalogSuppressed()) return r === true && leanPromptFor(e);
  if (!(r === true || getCachedClientDataSlot(e)?.data?.temporal_hare === true))
    return (
      isOpus55FamilyModel(e) &&
      leanPromptFor(e) &&
      getFeatureValue_SESSION_PINNED("tengu_temporal_hare", false) === true
    );
  if (!leanPromptFor(e)) return false;
  return isModelCapabilityEnabled("temporal_hare", canonicalName, e);
}
//@ chunk-p1bhnnws.js:5181-5306 placement
function clientDataFlagIncludes(e, n) {
  let r = getCachedClientData()?.[e];
  return (
    typeof r === "object" &&
    r !== null &&
    Object.entries(r).some(([key, value]) => value === true && n.includes(key))
  );
}
//@ chunk-p1bhnnws.js:5306-5375 placement
/**
 * 判断 basalt_cove 能力是否开启（环境变量或客户端数据）。
 */
function isBasaltCoveOn(canonicalName) {
  return env.CLAUDE_CODE_BASALT_COVE || clientDataFlagIncludes("basalt_cove", canonicalName);
}
//@ chunk-p1bhnnws.js:5375-5403 placement
var TENGU_THRIFTY_SONIC = "tengu_thrifty_sonic";
//@ chunk-p1bhnnws.js:5403-5512 placement
function getBashFirstAssignment() {
  let e = currentPromptBundleState();
  return isCatalogSuppressed() ? e.bashFirstSessionAssignmentCompiledOnly() : e.bashFirstSessionAssignment();
}
//@ chunk-p1bhnnws.js:5512-5678 placement
function computeBashFirstAssignment() {
  let promptModel = getPromptModel(getMainLoopModel());
  let canonicalName = getCanonicalName(promptModel);
  let r = modelSupportsCapability(canonicalName, "thrifty_sonic", promptModel);
  if (r === false) return "none";
  if (
    usesFablePromptBundle(canonicalName) ||
    supportsOpus55PromptBundle(canonicalName) ||
    getCachedClientData()?.[TENGU_THRIFTY_SONIC] === true ||
    r
  )
    return "forced";
  return isOpus5FamilyModel(promptModel) ? "cohort" : "none";
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
function isClientFlagOrFeatureOn(e, n) {
  return e || getCachedClientData()?.[n] === true || getFeatureValue_CACHED_MAY_BE_STALE(n, false);
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
function isAmberAstrolabeEnabled(e) {
  return isModelCapabilityEnabled(
    "amber_astrolabe",
    getCanonicalName(e),
    e,
    env.CLAUDE_CODE_AMBER_ASTROLABE || undefined,
  );
}
//@ chunk-p1bhnnws.js:6413-6488 placement
/**
 * 判断 bison_cairn 能力是否开启。
 */
function isBisonCairnEnabled(promptModel) {
  return isModelCapabilityEnabled(
    "bison_cairn",
    getCanonicalName(promptModel),
    promptModel,
    env.CLAUDE_CODE_BISON_CAIRN,
  );
}
//@ chunk-p1bhnnws.js:6488-6575 placement
/**
 * 判断 larch_cistern 能力是否开启。
 */
function isLarchCisternEnabled(promptModel) {
  return isModelCapabilityEnabled(
    "larch_cistern",
    getCanonicalName(promptModel),
    promptModel,
    env.CLAUDE_CODE_LARCH_CISTERN || undefined,
  );
}
//@ chunk-p1bhnnws.js:6575-6819 placement
/**
 * 读取客户端数据中的 willow_tern 布尔覆盖（非布尔值只提示一次）。
 */
function getWillowTernOverride() {
  let e = getCachedClientData()?.[TENGU_WILLOW_TERN];
  if (typeof e === "boolean") return e;
  if (e !== undefined) {
    let n = currentPromptBundleState();
    if (!n.unusableWritingOverrideTold) {
      n.unusableWritingOverrideTold = true;
      logForDebugging(
        `willow_tern: ignoring non-boolean clientData ${TENGU_WILLOW_TERN} value of type ${typeof e}`,
      );
    }
  }
  return;
}
//@ chunk-p1bhnnws.js:6819-7025 placement
/**
 * 判断 willow_tern 写作指引是否开启：环境变量、客户端数据、最新模型或 Opus 5 提示词包加开关。
 */
function isWillowTernEnabled(e) {
  if (env.CLAUDE_CODE_WILLOW_TERN) return true;
  let willowTernOverride = getWillowTernOverride();
  if (willowTernOverride !== undefined) return willowTernOverride;
  if (e === undefined) return false;
  let canonicalName = getCanonicalName(e);
  if (usesFablePromptBundle(canonicalName)) return true;
  if (modelSupportsCapability(canonicalName, "opus_5_prompt_bundle", e) !== true) return false;
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
function isLegacyPromptModel_2(e) {
  let canonicalName = getCanonicalName(e, {
    deterministic: true,
  });
  let r = modelSupportsCapability(canonicalName, "lean_prompt", e);
  if (r !== undefined) return !r;
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
function leanPromptFor(e) {
  let n = currentPromptBundleState();
  return isCatalogSuppressed() ? n.leanPromptCompiledOnly(e) : n.leanPrompt(e);
}
//@ chunk-p1bhnnws.js:7431-7479 placement
/**
 * 优先用显式 leanPrompt，否则按模型取。
 */
function leanPromptOf(e) {
  return e.leanPrompt ?? leanPromptFor(e.model);
}
//@ chunk-p1bhnnws.js:7479-7706 placement
function shouldUseLeanPrompt(e) {
  if (!e) return false;
  if (isEnvTruthy(env.CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT)) return true;
  if (isEnvDefinedFalsy(env.CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT)) return false;
  if (!isLegacyPromptModel_2(e)) return true;
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvet_tide", false)) return true;
  return clientDataFlagIncludes("simple_system_prompt", getCanonicalName(e));
}
//@ chunk-p1bhnnws.js:7706-7730 placement
var BREEZY_HORIZON = "breezy_horizon";
//@ chunk-p1bhnnws.js:7730-7841 placement
/**
 * 返回用于选择提示词的模型（可能被替换）。
 */
function getPromptModel(e) {
  if (e === undefined) return;
  let n = currentPromptBundleState();
  return isCatalogSuppressed() ? n.modelForPromptCompiledOnly(e) : n.modelForPrompt(e);
}
//@ chunk-p1bhnnws.js:7841-7916 placement
/**
 * 若该模型在提示词模型替换缓存中，返回替换后的模型。
 */
function promptModelOverride(e) {
  let modelForPrompt = currentPromptBundleState().modelForPrompt;
  return modelForPrompt.cache.has(e) ? modelForPrompt(e) : undefined;
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
  bashFirstSessionAssignment = io(computeBashFirstAssignment);
  bashFirstSessionAssignmentCompiledOnly = io(computeBashFirstAssignment);
  bashFirstSteerVariant = io(resolveBashFirstSteerVariant);
  leanPrompt = io(shouldUseLeanPrompt);
  leanPromptCompiledOnly = io(shouldUseLeanPrompt);
  modelForPrompt = io(resolvePromptModelSwap);
  modelForPromptCompiledOnly = io(resolvePromptModelSwap);
  leanRewrite = io(isLeanRewriteEnabled);
  leanRewriteCompiledOnly = io(isLeanRewriteEnabled);
  promptModelSwapsLogged = new Set();
  unusableWritingOverrideTold = false;
}
//@ chunk-p1bhnnws.js:8916-8940 placement
var promptBundleStateRegistry = new HostScoped(() => new PromptBundleState());
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
