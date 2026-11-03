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
import { YFe } from "./fableMitigations.js";
import { getCachedClientDataSlot, getCachedClientData } from "../config.js";
import { $os, isCatalogSuppressed } from "./modelCatalog/servedCatalog.js";
import { Bn, Lt, Sv, wR, parseModelId } from "./modelIds.js";
import { getMainLoopModel, isOpus55FamilyModel, isOpus5FamilyModel } from "./model.js";
import { Ao } from "../../bootstrap/sessionFeatureValues.js";
import { getSessionId, getRootSession } from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "./telemetryModelName.js";
import { Uwi } from "../../services/analytics/growthbookGates.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { A, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../debug.js";
import { env } from "../env.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "../envUtils.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { HostScoped } from "../hostScoped.js";

//@ chunk-p1bhnnws.js:2662-2690 placement
var TENGU_FENNEL_GODWIT = "tengu_fennel_godwit";
/**
 * 判断模型是否使用 Opus 5 提示词包（能力声明且未被开关关闭）。
 */
//@ chunk-p1bhnnws.js:2690-2796 placement
function usesOpus5PromptBundle(e) {
  if (e === void 0) return !1;
  if (modelSupportsCapability(getCanonicalName(e), "opus_5_prompt_bundle", e) !== !0) return !1;
  return !getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FENNEL_GODWIT, !1);
}
//@ chunk-p1bhnnws.js:2796-2860 placement
function m(e) {
  return !isLocalAgentOrCowork() && modelSupportsCapability(e, "opus_5_5_prompt_bundle") === !0;
}
/**
 * 模型能力开关集合：对最新模型默认开启的能力、随 Opus 5 提示词包开启的能力、对另一组模型开启的能力，以及遥测去重上限与事件名。
 */
//@ chunk-p1bhnnws.js:2860-3190 placement
var DEFAULT_ON_CAPABILITIES = new Set([
    "turn_updates",
    "bash_output_audience_note",
    "silent_turn_reminder",
    "thinking_display_updates",
  ]),
  OPUS5_BUNDLE_CAPABILITIES = new Set(["bison_cairn", "larch_cistern"]),
  LATEST_MODEL_CAPABILITIES = new Set(["silent_turn_reminder", "quizzical_shore", "original_games_guidance"]),
  MAX_LOGGED_SESSIONS = 64,
  TENGU_MODEL_CAPABILITY_FROM_CLIENT_DATA = "tengu_model_capability_from_client_data",
  TENGU_MODEL_CAPABILITY_OFF_FROM_CLIENT_DATA = "tengu_model_capability_off_from_client_data";
/**
 * 判断模型能力是否开启：显式覆盖 > 能力声明 > 默认开启集合（可被客户端数据关闭）> 客户端数据开启。
 */
//@ chunk-p1bhnnws.js:3190-3443 placement
function isModelCapabilityEnabled(e, n, r, l) {
  if (l !== void 0) return l;
  let s = modelSupportsCapability(n, e, r);
  if (s !== void 0) return s;
  let d =
      (DEFAULT_ON_CAPABILITIES.has(e) && YFe(n)) ||
      (OPUS5_BUNDLE_CAPABILITIES.has(e) && usesOpus5PromptBundle(r)) ||
      (LATEST_MODEL_CAPABILITIES.has(e) && m(n)),
    u = getCachedClientDataSlot(r);
  if (d) {
    if (u?.data?.[e] !== !1) return !0;
    return (logClientDataCapability(TENGU_MODEL_CAPABILITY_OFF_FROM_CLIENT_DATA, e, u), !1);
  }
  if (u?.data?.[e] !== !0) return !1;
  return (logClientDataCapability(TENGU_MODEL_CAPABILITY_FROM_CLIENT_DATA, e, u), !0);
}
/**
 * 在能力列表中查找某前缀的最后一个启用值，返回前缀后的部分。
 */
//@ chunk-p1bhnnws.js:3443-3575 placement
function findCapabilityValue(e, n, r) {
  let l = parseModelCapabilitiesEnv(n);
  return [...($os(r, n) ?? []), ...l.keys()]
    .findLast((s) => s.startsWith(e) && l.get(s) !== !1)
    ?.slice(e.length);
}
//@ chunk-p1bhnnws.js:3575-3872 placement
function logClientDataCapability(e, n, r) {
  let l = r.model ?? Bn(getMainLoopModel()),
    s = (Ao().clientDataCapabilityLogged ??= new Map()),
    d = getSessionId(),
    u = s.get(d);
  if (u === void 0) {
    if (((u = new Set()), s.set(d, u), s.size > MAX_LOGGED_SESSIONS)) {
      let E = s.keys().next().value;
      if (E !== void 0) s.delete(E);
    }
  }
  let h = `${e === TENGU_MODEL_CAPABILITY_OFF_FROM_CLIENT_DATA ? "-" : ""}${n}:${l}`;
  if (!u.has(h)) (u.add(h), logEvent(e, { capability: fromEnum(n), model: telemetrySafeModelName(l) }));
}
//@ chunk-p1bhnnws.js:3872-3941 placement
function q(e, n) {
  if (j() !== e) return !1;
  return isModelCapabilityEnabled("per_turn_effort", e, n);
}
//@ chunk-p1bhnnws.js:3941-3993 placement
function j() {
  try {
    return getCanonicalName(getMainLoopModel());
  } catch {
    return null;
  }
}
//@ chunk-p1bhnnws.js:3993-4000 placement
Uwi(q);
//@ chunk-p1bhnnws.js:4000-4025 placement
function Ggi(e) {
  return !1;
}
//@ chunk-p1bhnnws.js:4025-4074 placement
function xit(e) {
  return Lt(e) === "claude-opus-4-8";
}
//@ chunk-p1bhnnws.js:4074-4099 placement
function zgi(e) {
  return !1;
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
function C(e) {
  return LEGACY_PROMPT_MODELS.has(Lt(e));
}
//@ chunk-p1bhnnws.js:4340-4420 placement
function jkn(e, n) {
  if (n === void 0) return C(e);
  return n.model !== void 0 && C(n.model);
}
//@ chunk-p1bhnnws.js:4420-4478 placement
var TENGU_LOGGIA_ROSTER = "tengu_loggia_roster",
  O = [],
  J = DoctorLazy(() => A(o().trim())),
  w;
//@ chunk-p1bhnnws.js:4478-4725 placement
function getLoggiaRoster() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LOGGIA_ROSTER, O),
    n = w;
  if (n !== void 0 && n.raw === e) return n.ids;
  let safeParse = J().safeParse(e);
  if (!safeParse.success)
    logForDebugging(
      `GrowthBook: ${TENGU_LOGGIA_ROSTER} is not a JSON array of model ids; treating it as empty`,
      { level: "warn" },
    );
  let l = safeParse.success ? safeParse.data : O;
  return ((w = { raw: e, ids: l }), l);
}
//@ chunk-p1bhnnws.js:4725-4771 placement
function OZo(e) {
  return getLoggiaRoster().some((n) => Sv(e, n));
}
//@ chunk-p1bhnnws.js:4771-4855 placement
function mme(e) {
  let n = f();
  return isCatalogSuppressed() ? n.leanRewriteCompiledOnly(e) : n.leanRewrite(e);
}
//@ chunk-p1bhnnws.js:4855-4905 placement
function nK(e) {
  return e.leanRewrite ?? mme(e.model);
}
//@ chunk-p1bhnnws.js:4905-5181 placement
function isLeanRewriteEnabled(e) {
  if (e === void 0) return !1;
  let n = getCanonicalName(e),
    r = modelSupportsCapability(n, "temporal_hare", e);
  if (r === !1) return !1;
  if (isCatalogSuppressed()) return r === !0 && g3(e);
  if (!(r === !0 || getCachedClientDataSlot(e)?.data?.temporal_hare === !0))
    return (
      isOpus55FamilyModel(e) && g3(e) && getFeatureValue_SESSION_PINNED("tengu_temporal_hare", !1) === !0
    );
  if (!g3(e)) return !1;
  return isModelCapabilityEnabled("temporal_hare", n, e);
}
//@ chunk-p1bhnnws.js:5181-5306 placement
function clientDataFlagIncludes(e, n) {
  let r = getCachedClientData()?.[e];
  return typeof r === "object" && r !== null && Object.entries(r).some(([l, s]) => s === !0 && n.includes(l));
}
//@ chunk-p1bhnnws.js:5306-5375 placement
function Kgi(e) {
  return env.CLAUDE_CODE_BASALT_COVE || clientDataFlagIncludes("basalt_cove", e);
}
//@ chunk-p1bhnnws.js:5375-5403 placement
var TENGU_THRIFTY_SONIC = "tengu_thrifty_sonic";
//@ chunk-p1bhnnws.js:5403-5512 placement
function getBashFirstAssignment() {
  let e = f();
  return isCatalogSuppressed() ? e.bashFirstSessionAssignmentCompiledOnly() : e.bashFirstSessionAssignment();
}
//@ chunk-p1bhnnws.js:5512-5678 placement
function computeBashFirstAssignment() {
  let e = getPromptModel(getMainLoopModel()),
    n = getCanonicalName(e),
    r = modelSupportsCapability(n, "thrifty_sonic", e);
  if (r === !1) return "none";
  if (YFe(n) || m(n) || getCachedClientData()?.[TENGU_THRIFTY_SONIC] === !0 || r) return "forced";
  return isOpus5FamilyModel(e) ? "cohort" : "none";
}
/**
 * 判断 thrifty_sonic 是否开启：环境变量、强制、关闭或按开关分组。
 */
//@ chunk-p1bhnnws.js:5678-5851 placement
function isThriftySonicEnabled() {
  if (env.CLAUDE_CODE_THRIFTY_SONIC !== void 0) return env.CLAUDE_CODE_THRIFTY_SONIC;
  switch (getBashFirstAssignment()) {
    case "forced":
      return !0;
    case "none":
      return !1;
    case "cohort":
      return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_THRIFTY_SONIC, !1);
  }
}
//@ chunk-p1bhnnws.js:5851-5877 placement
var TENGU_COZY_TEAPOT = "tengu_cozy_teapot";
//@ chunk-p1bhnnws.js:5877-5935 placement
function N(e) {
  return e === "strict" || e === "relaxed" ? e : void 0;
}
//@ chunk-p1bhnnws.js:5935-6012 placement
function Vgi() {
  return env.CLAUDE_CODE_COZY_TEAPOT ?? f().bashFirstSteerVariant();
}
//@ chunk-p1bhnnws.js:6012-6108 placement
function ee() {
  return (
    N(getCachedClientData()?.[TENGU_COZY_TEAPOT]) ??
    (m(getCanonicalName(getPromptModel(getMainLoopModel()))) ? "relaxed" : void 0) ??
    N(getFeatureValue_SESSION_PINNED(TENGU_COZY_TEAPOT, null)) ??
    "strict"
  );
}
//@ chunk-p1bhnnws.js:6108-6158 placement
var TENGU_GORSE_PLOVER = "tengu_gorse_plover",
  TENGU_WILLOW_TERN = "tengu_willow_tern";
//@ chunk-p1bhnnws.js:6158-6209 placement
function te(e, n) {
  return e || getCachedClientData()?.[n] === !0 || getFeatureValue_CACHED_MAY_BE_STALE(n, !1);
}
/**
 * 判断 Bash act-first 是否开启（环境变量或开关，按会话缓存）。
 */
//@ chunk-p1bhnnws.js:6209-6322 placement
function isBashActFirstEnabled() {
  let e = Ao();
  return (
    (e.bashActFirstEnabled ??= te(env.CLAUDE_CODE_GORSE_PLOVER, TENGU_GORSE_PLOVER)),
    e.bashActFirstEnabled
  );
}
//@ chunk-p1bhnnws.js:6322-6413 placement
function Ygi(e) {
  return isModelCapabilityEnabled(
    "amber_astrolabe",
    getCanonicalName(e),
    e,
    env.CLAUDE_CODE_AMBER_ASTROLABE || void 0,
  );
}
//@ chunk-p1bhnnws.js:6413-6488 placement
function Xgi(e) {
  return isModelCapabilityEnabled("bison_cairn", getCanonicalName(e), e, env.CLAUDE_CODE_BISON_CAIRN);
}
//@ chunk-p1bhnnws.js:6488-6575 placement
function Jgi(e) {
  return isModelCapabilityEnabled(
    "larch_cistern",
    getCanonicalName(e),
    e,
    env.CLAUDE_CODE_LARCH_CISTERN || void 0,
  );
}
/**
 * 读取客户端数据中的 willow_tern 布尔覆盖（非布尔值只提示一次）。
 */
//@ chunk-p1bhnnws.js:6575-6819 placement
function getWillowTernOverride() {
  let e = getCachedClientData()?.[TENGU_WILLOW_TERN];
  if (typeof e === "boolean") return e;
  if (e !== void 0) {
    let n = f();
    if (!n.unusableWritingOverrideTold)
      ((n.unusableWritingOverrideTold = !0),
        logForDebugging(
          `willow_tern: ignoring non-boolean clientData ${TENGU_WILLOW_TERN} value of type ${typeof e}`,
        ));
  }
  return;
}
/**
 * 判断 willow_tern 写作指引是否开启：环境变量、客户端数据、最新模型或 Opus 5 提示词包加开关。
 */
//@ chunk-p1bhnnws.js:6819-7025 placement
function isWillowTernEnabled(e) {
  if (env.CLAUDE_CODE_WILLOW_TERN) return !0;
  let n = getWillowTernOverride();
  if (n !== void 0) return n;
  if (e === void 0) return !1;
  let r = getCanonicalName(e);
  if (YFe(r)) return !0;
  if (modelSupportsCapability(r, "opus_5_prompt_bundle", e) !== !0) return !1;
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WILLOW_TERN, !1);
}
//@ chunk-p1bhnnws.js:7025-7068 placement
function GFe() {
  return env.CLAUDE_CODE_SIMPLE;
}
//@ chunk-p1bhnnws.js:7068-7350 placement
function isLegacyPromptModel(e) {
  let n = getCanonicalName(e, { deterministic: !0 }),
    r = modelSupportsCapability(n, "lean_prompt", e);
  if (r !== void 0) return !r;
  return (
    n.includes("claude-3-") ||
    n.includes("haiku") ||
    n.includes("sonnet") ||
    n === "claude-opus-4-0" ||
    n === "claude-opus-4-1" ||
    n === "claude-opus-4-5" ||
    n === "claude-opus-4-6" ||
    n === "claude-opus-4-7"
  );
}
//@ chunk-p1bhnnws.js:7350-7431 placement
function g3(e) {
  let n = f();
  return isCatalogSuppressed() ? n.leanPromptCompiledOnly(e) : n.leanPrompt(e);
}
//@ chunk-p1bhnnws.js:7431-7479 placement
function gD(e) {
  return e.leanPrompt ?? g3(e.model);
}
//@ chunk-p1bhnnws.js:7479-7706 placement
function shouldUseLeanPrompt(e) {
  if (!e) return !1;
  if (isEnvTruthy(env.CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT)) return !0;
  if (isEnvDefinedFalsy(env.CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT)) return !1;
  if (!isLegacyPromptModel(e)) return !0;
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvet_tide", !1)) return !0;
  return clientDataFlagIncludes("simple_system_prompt", getCanonicalName(e));
}
//@ chunk-p1bhnnws.js:7706-7730 placement
var BREEZY_HORIZON = "breezy_horizon";
/**
 * 返回用于选择提示词的模型（可能被替换）。
 */
//@ chunk-p1bhnnws.js:7730-7841 placement
function getPromptModel(e) {
  if (e === void 0) return;
  let n = f();
  return isCatalogSuppressed() ? n.modelForPromptCompiledOnly(e) : n.modelForPrompt(e);
}
//@ chunk-p1bhnnws.js:7841-7916 placement
function Zgi(e) {
  let modelForPrompt = f().modelForPrompt;
  return modelForPrompt.cache.has(e) ? modelForPrompt(e) : void 0;
}
/**
 * 按 CLAUDE_CODE_BREEZY_HORIZON 或客户端数据中的映射，把用于选择提示词的模型替换为另一个模型（校验是模型 id、不是自身），首次替换上报 tengu_breezy_horizon。
 */
//@ chunk-p1bhnnws.js:7916-8551 placement
function resolvePromptModelSwap(model) {
  let CLAUDE_CODE_BREEZY_HORIZON = env.CLAUDE_CODE_BREEZY_HORIZON;
  if (isEnvDefinedFalsy(CLAUDE_CODE_BREEZY_HORIZON)) return model;
  let canonical = strippedCanonicalName(model),
    clientDataMap = getCachedClientData()?.[BREEZY_HORIZON],
    override =
      CLAUDE_CODE_BREEZY_HORIZON ??
      (typeof clientDataMap === "object" && clientDataMap !== null
        ? Object.entries(clientDataMap).find(([h]) => h === canonical)?.[1]
        : void 0);
  if (override === void 0) return model;
  let source = CLAUDE_CODE_BREEZY_HORIZON !== void 0 ? "env" : "client_data";
  if (typeof override !== "string" || !ie(override))
    return (
      logForDebugging(
        `[breezy_horizon] ${source}: ignoring ${String(override)} for ${canonical}: not a model id`,
        { level: "warn" },
      ),
      model
    );
  let targetCanonical = strippedCanonicalName(override);
  if (targetCanonical === canonical) {
    if (!wR(parseModelId(override)))
      logForDebugging(
        `[breezy_horizon] ${source}: ${override} names ${canonical} itself, so it maps nothing`,
        { level: "warn" },
      );
    return model;
  }
  let promptModelSwapsLogged = f().promptModelSwapsLogged;
  if (!promptModelSwapsLogged.has(model))
    (promptModelSwapsLogged.add(model),
      logEvent("tengu_breezy_horizon", {
        from_model: telemetrySafeModelName(canonical),
        to_model: telemetrySafeModelName(targetCanonical),
        source: fromEnum(source),
      }));
  return override;
}
//@ chunk-p1bhnnws.js:8551-8591 placement
function ie(e) {
  return isRecognizedModel(e) || wR(parseModelId(e));
}
/**
 * 按会话缓存的提示词包判定：bash 优先分组、精简提示词、提示词模型替换、精简改写（各有仅编译期目录的版本），以及已记录的替换与警告状态。
 */
//@ chunk-p1bhnnws.js:8591-8916 placement
class PromptBundleState {
  bashFirstSessionAssignment = io(computeBashFirstAssignment);
  bashFirstSessionAssignmentCompiledOnly = io(computeBashFirstAssignment);
  bashFirstSteerVariant = io(ee);
  leanPrompt = io(shouldUseLeanPrompt);
  leanPromptCompiledOnly = io(shouldUseLeanPrompt);
  modelForPrompt = io(resolvePromptModelSwap);
  modelForPromptCompiledOnly = io(resolvePromptModelSwap);
  leanRewrite = io(isLeanRewriteEnabled);
  leanRewriteCompiledOnly = io(isLeanRewriteEnabled);
  promptModelSwapsLogged = new Set();
  unusableWritingOverrideTold = !1;
}
//@ chunk-p1bhnnws.js:8916-8940 placement
var ae = new HostScoped(() => new PromptBundleState());
//@ chunk-p1bhnnws.js:8940-8976 placement
function f() {
  return ae.of(getRootSession().host);
}

export {
  mme,
  Ggi,
  zgi,
  isModelCapabilityEnabled,
  Kgi,
  g3,
  isWillowTernEnabled,
  getWillowTernOverride,
  Ygi,
  xit,
  getPromptModel,
  GFe,
  usesOpus5PromptBundle,
  Xgi,
  Jgi,
  gD,
  nK,
  Zgi,
  isThriftySonicEnabled,
  Vgi,
  jkn,
  isBashActFirstEnabled,
  findCapabilityValue,
  OZo,
};
