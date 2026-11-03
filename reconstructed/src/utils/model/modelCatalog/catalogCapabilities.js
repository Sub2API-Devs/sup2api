/**
 * utils/model/modelCatalog/catalogCapabilities.ts
 *
 * 2.1.316 新增：目录条目是否应向本客户端提供（运行时、最低版本、非保密）；用占位符替换目录消息模板（问题反馈地址、包名等）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (62)
 * attribution: placement 62
 */
import { firstLineOf } from "../../stringUtils.js";
import { xb } from "./catalogSeed.js";
import { BEDROCK_REGION_PREFIXES } from "../bedrock.js";
import { parseModelId, wR } from "../modelIds.js";
import {
  hi,
  D3,
  getAPIProvider,
  isActiveCatalogModel,
  isFirstPartyApiBackend,
  providerCatalogKey,
  Dy,
  Iy,
  catalogModels,
  Oc,
  getProviderAliasTargets,
  hasProviderAliasTarget,
  a6e,
} from "../providers.js";
import {
  l6e,
  Ic,
  Axt,
  getProviderModelIdForEntry,
  getEffectiveServedCatalog,
  Bae,
  Hc,
  activeServedCatalog,
} from "./servedCatalog.js";
import { EFFORT_LEVELS } from "../../effort.js";
import { getCatalogState, WK, resolveCatalogAlias } from "../modelCatalog.js";
import { getProviderState } from "../providerCaches.js";
import { normalizeModelId } from "./catalogEntries.js";
import { lt_2 } from "../../semver.js";

/**
 * 按连字符拆分。
 */
//@ chunk-aepeg2w5.js:221109-221142 placement
function splitOnDash(e) {
  return firstLineOf(e, "-");
}
//@ chunk-aepeg2w5.js:221142-221190 placement
var RN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
/**
 * 是否为语义版本字符串。
 */
//@ chunk-aepeg2w5.js:221190-221244 placement
function isSemverString(e) {
  return typeof e === "string" && RN.test(e);
}
//@ chunk-aepeg2w5.js:221244-221292 placement
function hto(e) {
  return isSemverString(e) && xb.parse(e) != null;
}
//@ chunk-aepeg2w5.js:221292-221351 placement
function Pb(e) {
  return `Requires Claude Code v${e} or later`;
}
//@ chunk-aepeg2w5.js:221351-221398 placement
var xN = ["bedrock", "vertex", "foundry", "mantle"];
//@ chunk-aepeg2w5.js:221398-221423 placement
function pwi() {
  return xN;
}
//@ chunk-aepeg2w5.js:221423-221433 placement
var ON = !1;
//@ chunk-aepeg2w5.js:221433-221458 placement
function mwi() {
  return ON;
}
//@ chunk-aepeg2w5.js:221458-221538 placement
function jat(e) {
  return e === "bedrock" || e === "vertex" || e === "foundry" || e === "mantle";
}
/**
 * 模型目录能力名（native_1m、adaptive_thinking 等）。
 */
//@ chunk-aepeg2w5.js:221538-222014 placement
var CATALOG_CAPABILITY_NAMES = "native_1m",
  PN = [
    "adaptive_thinking",
    "rejects_disabled_thinking",
    "thinking_disabled_effort_cap",
    "context_management",
    "mid_conv_system",
    "mid_conv_tool_change",
    "lean_prompt",
    "refusal_fallback",
    CATALOG_CAPABILITY_NAMES,
  ],
  MN = 1e6,
  IN = ["low", "medium", "high"],
  $a = "claude-[a-z0-9]+(?:-[a-z0-9]+)*",
  Bc = {
    bedrock: new RegExp(
      `^(?:(?:${BEDROCK_REGION_PREFIXES.join("|")})\\.)?anthropic\\.${$a}(?::[0-9]{1,3})?$`,
    ),
    vertex: new RegExp(`^${$a}(?:@[0-9]{8})?$`),
    foundry: new RegExp(`^${$a}$`),
    mantle: new RegExp(`^anthropic\\.${$a}$`),
  };
/**
 * 判断模型 id 是否符合模式、不是 fast/latest 变体且基础名等于给定值。
 */
//@ chunk-aepeg2w5.js:222014-222123 placement
function matchesCatalogBase(e, n, r) {
  if (!r.test(e) || /-(?:fast|latest)\b/.test(e)) return !1;
  let s = parseModelId(e);
  return wR(s) && s.base === n;
}
/**
 * 目录条目是否应向本客户端提供（运行时、最低版本、非保密）。
 */
//@ chunk-aepeg2w5.js:222123-223055 placement
function isCatalogEntryOffered(e, n) {
  let runtime = e.runtime;
  if (
    runtime === void 0 ||
    e.confidential === !0 ||
    e.min_claude_code_version === null ||
    (e.name?.trim() ?? "") === ""
  )
    return !1;
  let s = parseModelId(e.id),
    h = runtime.family?.trim().toLowerCase();
  if (!wR(s) || s.legacyVersionFirst || s.base !== e.id || !(hi(h) || h === "fable") || h !== s.family)
    return !1;
  let y = l6e(runtime.max_input_tokens, Ic),
    S = l6e(runtime.max_output_tokens, Axt),
    w = l6e(runtime.default_output_tokens, Axt);
  if (y === void 0 || S === void 0 || w === void 0 || w > S) return !1;
  let R = runtime.effort_levels?.map((L) => L.trim().toLowerCase()),
    x = runtime.default_effort?.trim().toLowerCase();
  if (
    R === void 0 ||
    (R.length === 0
      ? x !== void 0
      : x === void 0 ||
        !R.includes(x) ||
        !EFFORT_LEVELS.some((L) => L === x) ||
        !IN.every((L) => R.includes(L)))
  )
    return !1;
  let P = new Set(runtime.capabilities?.map((L) => L.trim().toLowerCase()));
  if (PN.some((L) => P.has(L) === P.has(`-${L}`)) || P.has(CATALOG_CAPABILITY_NAMES) !== y >= MN) return !1;
  let F = getProviderModelIdForEntry(e, n);
  if (F === void 0 || !matchesCatalogBase(F, e.id, Bc[n])) return !1;
  return (n !== "bedrock" && n !== "vertex") || typeof runtime.eager_input_streaming?.[n] === "boolean";
}
//@ chunk-aepeg2w5.js:223055-223180 placement
var MAX_BEHAVES_AS_HOPS = 8,
  KNOWN_STATUS = { status: "known" },
  DESCRIBED_STATUS = { status: "described" },
  UNKNOWN_STATUS = { status: "unknown" },
  NOT_SUPPORTED_MESSAGE = "Not supported in this version of Claude Code";
//@ chunk-aepeg2w5.js:223180-223217 placement
function Hb(e) {
  getCatalogState().modelKnowledge = e;
}
//@ chunk-aepeg2w5.js:223217-223228 placement
var FN = 256;
//@ chunk-aepeg2w5.js:223228-223351 placement
function createCatalogLookupBucket() {
  return {
    byModel: new Map(),
    offeredRows: void 0,
    familySpellingTargets: void 0,
    familySpellingVouchGeneration: void 0,
  };
}
/**
 * 模型目录查找的记忆化（按设置与命名代次）。
 */
//@ chunk-aepeg2w5.js:223351-223685 placement
function catalogLookupMemo(e) {
  let n = getProviderState(),
    settingsGeneration = e.settingsGeneration(),
    namingGeneration = e.namingGeneration(),
    behavesAsMemo = n.behavesAsMemo;
  if (
    behavesAsMemo !== void 0 &&
    behavesAsMemo.lookup === e &&
    behavesAsMemo.settingsGeneration === settingsGeneration &&
    behavesAsMemo.namingGeneration === namingGeneration
  )
    return behavesAsMemo;
  let y = {
    lookup: e,
    settingsGeneration: settingsGeneration,
    namingGeneration: namingGeneration,
    settingsMappingsDeclared: void 0,
    withoutRows: createCatalogLookupBucket(),
    byCatalog: new WeakMap(),
  };
  return ((n.behavesAsMemo = y), y);
}
//@ chunk-aepeg2w5.js:223685-223811 placement
function getCatalogLookupBucket(e, n) {
  if (n === null) return e.withoutRows;
  let r = e.byCatalog.get(n);
  if (r === void 0) ((r = createCatalogLookupBucket()), e.byCatalog.set(n, r));
  return r;
}
//@ chunk-aepeg2w5.js:223811-223921 placement
function hasSettingsMappings(e) {
  return ((e.settingsMappingsDeclared ??= e.lookup.hasSettingsBehavesAs()), e.settingsMappingsDeclared);
}
/**
 * 查询模型在目录中的状态（已知、已描述、已映射或未知），按目录缓存。
 */
//@ chunk-aepeg2w5.js:223921-224137 placement
function getModelCatalogStatus(e, n) {
  let modelKnowledge = getCatalogState().modelKnowledge;
  if (modelKnowledge === void 0) return KNOWN_STATUS;
  let s = catalogLookupMemo(modelKnowledge),
    h = getCatalogLookupBucket(s, e),
    y = h.byModel.get(n);
  if (y !== void 0) return y;
  let S = describeModelStatus(e, n, s);
  if (h.byModel.size >= FN) h.byModel.clear();
  return (h.byModel.set(n, S), S);
}
/**
 * 判断模型在目录中的状态（已知、描述、未知）。
 */
//@ chunk-aepeg2w5.js:224137-224466 placement
function describeModelStatus(e, n, r) {
  if (r.lookup.isKnown(n)) return KNOWN_STATUS;
  if (e === null && !hasSettingsMappings(r)) return UNKNOWN_STATUS;
  let s = new Set([normalizeModelId(n)]),
    h = findBehavesAsTarget(e, n, r, s, 0);
  if (h !== void 0) return { status: "mapped", target: h.target, source: h.source, hops: h.hops };
  if (Wb(e, n, r)) return KNOWN_STATUS;
  if (e === null) return UNKNOWN_STATUS;
  for (let y of jb(n, r)) {
    let S = D3(e, y);
    if (S !== void 0) return Vc(e, S) ? DESCRIBED_STATUS : UNKNOWN_STATUS;
  }
  return UNKNOWN_STATUS;
}
//@ chunk-aepeg2w5.js:224466-224506 placement
function Vc(e, n) {
  return !formatCatalogMessage(n) && canDescribeMinVersion(e, n);
}
//@ chunk-aepeg2w5.js:224506-224690 placement
function canDescribeMinVersion(e, n) {
  let r = getAPIProvider();
  return (
    Yc(e) &&
    jat(r) &&
    isActiveCatalogModel(n) &&
    n.offered_on != null &&
    !Cxt(n, e) &&
    isCatalogEntryOffered(n, r) &&
    (n.behaves_as?.trim() ?? "") === "" &&
    getCatalogState().modelKnowledge?.settingsBehavesAs(n.id) === void 0
  );
}
/**
 * 任一模型是否在目录中有描述。
 */
//@ chunk-aepeg2w5.js:224690-224767 placement
function anyModelDescribed(...e) {
  return e.some((n) => n !== void 0 && BN(n).status === "described");
}
//@ chunk-aepeg2w5.js:224767-224855 placement
function fn(e) {
  let n = getEffectiveServedCatalog();
  if (n === null) return !1;
  let r = D3(n, e);
  return r !== void 0 && Vc(n, r);
}
//@ chunk-aepeg2w5.js:224855-224912 placement
function UN(e, n, r) {
  return r.lookup.isKnown(n) || Wb(e, n, r);
}
//@ chunk-aepeg2w5.js:224912-224940 placement
function Wb(e, n, r) {
  return !1;
}
//@ chunk-aepeg2w5.js:224940-225231 placement
function findBehavesAsTarget(e, n, r, s, h) {
  if (h >= MAX_BEHAVES_AS_HOPS) return;
  for (let y of listBehavesAsCandidates(e, n, r)) {
    let S = normalizeModelId(y.target);
    if (S === "" || s.has(S)) continue;
    if (UN(e, y.target, r)) return { target: y.target, source: y.source, hops: h + 1 };
    s.add(S);
    let w = findBehavesAsTarget(e, y.target, r, s, h + 1);
    if (w !== void 0) return { target: w.target, source: y.source, hops: w.hops };
  }
  return;
}
//@ chunk-aepeg2w5.js:225231-225484 placement
function listBehavesAsCandidates(e, n, r) {
  let s = [],
    h = jb(n, r),
    y = e === null ? void 0 : Ub(h, (S) => D3(e, S)?.behaves_as);
  if (y !== void 0) s.push({ target: y, source: "served" });
  if (hasSettingsMappings(r)) {
    let S = Ub(h, (w) => r.lookup.settingsBehavesAs(w));
    if (S !== void 0) s.push({ target: S, source: "settings" });
  }
  return s;
}
//@ chunk-aepeg2w5.js:225484-225567 placement
function jb(e, n) {
  let identitySpelling = n.lookup.identitySpelling(e);
  return normalizeModelId(identitySpelling) === normalizeModelId(e) ? [e] : [e, identitySpelling];
}
//@ chunk-aepeg2w5.js:225567-225649 placement
function Ub(e, n) {
  for (let r of e) {
    let s = n(r)?.trim() ?? "";
    if (s !== "") return s;
  }
  return;
}
//@ chunk-aepeg2w5.js:225649-225683 placement
function BN(e) {
  return getModelCatalogStatus(getEffectiveServedCatalog(), e);
}
/**
 * 若模型在目录中被映射为其他模型，返回映射目标。
 */
//@ chunk-aepeg2w5.js:225683-225844 placement
function resolveMappedModel(e) {
  let modelKnowledge = getCatalogState().modelKnowledge;
  if (modelKnowledge === void 0) return e;
  let r = getEffectiveServedCatalog();
  if (r === null && !hasSettingsMappings(catalogLookupMemo(modelKnowledge))) return e;
  let s = getModelCatalogStatus(r, e);
  return s.status === "mapped" ? s.target : e;
}
//@ chunk-aepeg2w5.js:225844-225880 placement
function Yb(e, n) {
  return getModelCatalogStatus(e, n.id);
}
/**
 * 用占位符替换目录消息模板（问题反馈地址、包名等）。
 */
//@ chunk-aepeg2w5.js:225880-226446 placement
function formatCatalogMessage(
  e,
  n = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION,
) {
  let min_claude_code_version = e.min_claude_code_version;
  return min_claude_code_version != null && lt_2(splitOnDash(n), min_claude_code_version);
}
/**
 * 返回模型不受支持时的说明（需要更新版本或本版本不支持）。
 */
//@ chunk-aepeg2w5.js:226446-226583 placement
function getUnsupportedModelMessage(e) {
  let min_claude_code_version = e.min_claude_code_version;
  if (min_claude_code_version == null || !formatCatalogMessage(e) || Cxt(e)) return NOT_SUPPORTED_MESSAGE;
  let r = getEffectiveServedCatalog();
  return isFirstPartyApiBackend() || (r !== null && canDescribeMinVersion(r, e))
    ? Pb(min_claude_code_version)
    : NOT_SUPPORTED_MESSAGE;
}
//@ chunk-aepeg2w5.js:226583-226658 placement
function Cxt(e, n = getEffectiveServedCatalog()) {
  let r = getAPIProvider(),
    s = n === null ? providerCatalogKey(r) : Dy(n, r);
  return !Iy(e, s);
}
//@ chunk-aepeg2w5.js:226658-226809 placement
function isCatalogRowRecognized(e, n) {
  let r = Yb(e, n).status !== "unknown";
  if (!isFirstPartyApiBackend()) return r;
  return (
    !formatCatalogMessage(n) &&
    (r || n.min_claude_code_version != null || getProviderState().includeUnsupportedModels)
  );
}
/**
 * 判断目录行是否可在模型选择器中选择。
 */
//@ chunk-aepeg2w5.js:226809-226913 placement
function isCatalogRowSelectable(e, n) {
  return (
    isActiveCatalogModel(n) &&
    !Cxt(n, e) &&
    isCatalogRowRecognized(e, n) &&
    (getCatalogState().modelKnowledge?.isRowNameable(n, Vc(e, n)) ?? !0)
  );
}
/**
 * 目录中向用户提供的模型行。
 */
//@ chunk-aepeg2w5.js:226913-227087 placement
function offeredCatalogRows(e) {
  let modelKnowledge = getCatalogState().modelKnowledge;
  if (modelKnowledge === void 0) return catalogModels(e).filter((s) => isCatalogRowSelectable(e, s));
  let r = getCatalogLookupBucket(catalogLookupMemo(modelKnowledge), e);
  return ((r.offeredRows ??= catalogModels(e).filter((s) => isCatalogRowSelectable(e, s))), r.offeredRows);
}
//@ chunk-aepeg2w5.js:227087-227120 placement
function KN(e) {
  return Oc(offeredCatalogRows(e));
}
//@ chunk-aepeg2w5.js:227120-227178 placement
function gwi(e) {
  return catalogModels(e).filter((n) => isActiveCatalogModel(n) && !isCatalogRowRecognized(e, n));
}
/**
 * 计算目录模型的按提供商覆盖。
 */
//@ chunk-aepeg2w5.js:227178-227585 placement
function providerModelOverrides(e, n) {
  let { perProvider: perProvider, everywhere: everywhere } = getProviderAliasTargets(
    e,
    n,
    providerCatalogKey(getAPIProvider()),
  );
  if (perProvider === void 0 && everywhere === void 0) return {};
  let h = new Set(catalogModels(e).map((x) => Bae(x.id))),
    y = new Map();
  for (let x of offeredCatalogRows(e)) {
    let P = Bae(x.id);
    if (!y.has(P)) y.set(P, x.id);
  }
  let S = (x) => {
      if (x === void 0) return;
      let P = Bae(x);
      if (h.has(P)) return y.get(P);
      return isKnownNameableModel(e, x) ? (Hc(x) ?? x) : void 0;
    },
    w = S(perProvider),
    R = S(everywhere);
  return { ...(w !== void 0 && { perProvider: w }), ...(R !== void 0 && { everywhere: R }) };
}
//@ chunk-aepeg2w5.js:227585-227704 placement
function isKnownNameableModel(e, n) {
  if (!Yc(e)) return !1;
  let modelKnowledge = getCatalogState().modelKnowledge;
  return modelKnowledge !== void 0 && modelKnowledge.isKnown(n) && modelKnowledge.isRowNameable({ id: n });
}
//@ chunk-aepeg2w5.js:227704-227749 placement
function Yc(e) {
  return e.origin === "published";
}
//@ chunk-aepeg2w5.js:227749-227940 placement
function hasProviderAliasOverride(e) {
  if (e === "default") return !1;
  let aliases = WK().aliases,
    r = Object.hasOwn(aliases, e) ? aliases[e] : void 0,
    s = providerCatalogKey(getAPIProvider());
  return r?.per_provider !== void 0 && Object.hasOwn(r.per_provider, s) && !!r.per_provider[s];
}
//@ chunk-aepeg2w5.js:227940-228150 placement
function isAliasFamilyUnavailable(e, n) {
  if (n === "default") return !1;
  let r = resolveCatalogAlias(n, providerCatalogKey(getAPIProvider()));
  if (r === void 0) return !1;
  let s = Bae(r),
    filtered = catalogModels(e).filter((y) => Bae(y.id) === s);
  return (
    filtered.some((y) => Cxt(y, e)) ||
    (filtered.length > 0 && filtered.every((y) => !isActiveCatalogModel(y) || !isCatalogRowRecognized(e, y)))
  );
}
//@ chunk-aepeg2w5.js:228150-228201 placement
function qc(e) {
  let n = activeServedCatalog();
  return n !== null && isAliasFamilyUnavailable(n, e);
}
//@ chunk-aepeg2w5.js:228201-228262 placement
function Wat() {
  let e = getAPIProvider();
  return e !== "mantle" && e !== "foundry";
}
//@ chunk-aepeg2w5.js:228262-228486 placement
function resolveFamilyDefault(e, n, r) {
  if (!Yc(e)) return r;
  if (!Wat()) return;
  let s = providerModelOverrides(e, n);
  if (s.perProvider !== void 0) return s.perProvider;
  let h = isAliasFamilyUnavailable(e, n);
  if (!h && hasProviderAliasOverride(n)) return;
  if (s.everywhere !== void 0) return s.everywhere;
  return h || !hasProviderAliasTarget(e, n) ? r : void 0;
}
/**
 * 判断服务端目录是否把该模型标为支持计划模式。
 */
//@ chunk-aepeg2w5.js:228486-228631 placement
function catalogSupportsPlanMode(e) {
  let n = activeServedCatalog();
  if (n === null) return !1;
  let r = Bae(e),
    filtered = catalogModels(n).filter((h) => Bae(h.id) === r);
  return filtered.length === 0 ? isKnownNameableModel(n, e) : filtered.some((h) => $N(h.id));
}
//@ chunk-aepeg2w5.js:228631-228685 placement
function wi(e) {
  let n = activeServedCatalog();
  return n === null ? {} : providerModelOverrides(n, e);
}
/**
 * 计算目录中各族（opus/sonnet/haiku 等）的默认模型。
 */
//@ chunk-aepeg2w5.js:228685-228785 placement
function getFamilyDefaults(e) {
  let n = KN(e),
    r = {};
  for (let s of a6e) {
    let h = resolveFamilyDefault(e, s, n[s]);
    if (h !== void 0) r[s] = h;
  }
  return r;
}
/**
 * 返回某族的默认模型（Fable 只有在未被描述为不可用时才返回）。
 */
//@ chunk-aepeg2w5.js:228785-228947 placement
function getFamilyDefault(e, n) {
  if (n !== "fable") return getFamilyDefaults(e)[n];
  let r = resolveFamilyDefault(e, "fable", void 0),
    s = r === void 0 ? void 0 : D3(e, r);
  return s !== void 0 && Yb(e, s).status === "described" ? void 0 : r;
}
//@ chunk-aepeg2w5.js:228947-229005 placement
function Zb(e) {
  let n = activeServedCatalog();
  return n === null ? void 0 : getFamilyDefault(n, e);
}
//@ chunk-aepeg2w5.js:229005-229027 placement
function eS(e) {
  return;
}
//@ chunk-aepeg2w5.js:229027-229049 placement
function Jc(e) {
  return;
}
//@ chunk-aepeg2w5.js:229049-229086 placement
function hwi(e) {
  return Jc(e)?.target;
}
//@ chunk-aepeg2w5.js:229086-229110 placement
function tS(e) {
  return !1;
}
//@ chunk-aepeg2w5.js:229110-229162 placement
function Rxt(e) {
  let n = activeServedCatalog();
  return n !== null && isCatalogRowRecognized(n, e);
}
//@ chunk-aepeg2w5.js:229162-229259 placement
function $N(e) {
  let n = activeServedCatalog();
  if (n === null) return !1;
  let r = normalizeModelId(e);
  return offeredCatalogRows(n).some((s) => normalizeModelId(s.id) === r);
}

export {
  anyModelDescribed,
  Rxt,
  formatCatalogMessage,
  eS,
  tS,
  Jc,
  isCatalogRowSelectable,
  fn,
  isSemverString,
  splitOnDash,
  hwi,
  jat,
  Bc,
  matchesCatalogBase,
  offeredCatalogRows,
  getFamilyDefault,
  Wat,
  providerModelOverrides,
  getFamilyDefaults,
  getModelCatalogStatus,
  gwi,
  Hb,
  getUnsupportedModelMessage,
  Zb,
  qc,
  Cxt,
  wi,
  catalogSupportsPlanMode,
  resolveMappedModel,
  CATALOG_CAPABILITY_NAMES,
  hto,
  mwi,
  pwi,
};
