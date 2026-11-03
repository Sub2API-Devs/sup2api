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
import { legacyRequireInterop } from "./catalogSeed.js";
import { BEDROCK_REGION_PREFIXES } from "../bedrock.js";
import { parseModelId, isStandardVersion } from "../modelIds.js";
import {
  isModelFamily,
  findServedCatalogRow,
  getAPIProvider,
  isActiveCatalogModel,
  isFirstPartyApiBackend,
  providerCatalogKey,
  effectiveCatalogProviderKey,
  isProviderOffered,
  catalogModels,
  familyFirstIds,
  getProviderAliasTargets,
  hasProviderAliasTarget,
  MODEL_FAMILY_NAMES,
} from "../providers.js";
import {
  clampInRange,
  MAX_INPUT_TOKEN_RANGE,
  OUTPUT_TOKEN_RANGE,
  getProviderModelIdForEntry,
  getEffectiveServedCatalog,
  modelIdentityKey,
  firstPartyIdFromCatalog,
  activeServedCatalog,
} from "./servedCatalog.js";
import { EFFORT_LEVELS } from "../../effort.js";
import { getCatalogState, getModelCatalog, resolveCatalogAlias } from "../modelCatalog.js";
import { getProviderState } from "../providerCaches.js";
import { normalizeModelId } from "./catalogEntries.js";
import { lt_2 } from "../../semver.js";

//@ chunk-aepeg2w5.js:221109-221142 placement
/**
 * 按连字符拆分。
 */
function splitOnDash(e) {
  return firstLineOf(e, "-");
}
//@ chunk-aepeg2w5.js:221142-221190 placement
var SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
//@ chunk-aepeg2w5.js:221190-221244 placement
/**
 * 是否为语义版本字符串。
 */
function isSemverString(e) {
  return typeof e === "string" && SEMVER_RE.test(e);
}
//@ chunk-aepeg2w5.js:221244-221292 placement
/**
 * 判断字符串是否为可解析的语义版本。
 */
function isSemverVersion(e) {
  return isSemverString(e) && legacyRequireInterop.parse(e) != null;
}
//@ chunk-aepeg2w5.js:221292-221351 placement
function minVersionNotice(minClaudeCodeVersion) {
  return `Requires Claude Code v${minClaudeCodeVersion} or later`;
}
//@ chunk-aepeg2w5.js:221351-221398 placement
var THIRD_PARTY_BACKENDS = ["bedrock", "vertex", "foundry", "mantle"];
//@ chunk-aepeg2w5.js:221398-221423 placement
/**
 * 返回第三方后端列表（bedrock/vertex/foundry/mantle）。
 */
function thirdPartyBackends() {
  return THIRD_PARTY_BACKENDS;
}
//@ chunk-aepeg2w5.js:221423-221433 placement
var INCLUDE_UNSUPPORTED_DEFAULT = false;
//@ chunk-aepeg2w5.js:221433-221458 placement
/**
 * 返回是否默认包含不受支持的模型的开关。
 */
function includeUnsupportedDefault() {
  return INCLUDE_UNSUPPORTED_DEFAULT;
}
//@ chunk-aepeg2w5.js:221458-221538 placement
/**
 * 判断后端名是否属于第三方后端。
 */
function isThirdPartyBackend(apiProvider) {
  return (
    apiProvider === "bedrock" ||
    apiProvider === "vertex" ||
    apiProvider === "foundry" ||
    apiProvider === "mantle"
  );
}
//@ chunk-aepeg2w5.js:221538-222014 placement
/**
 * 模型目录能力名（native_1m、adaptive_thinking 等）。
 */
var CATALOG_CAPABILITY_NAMES_2 = "native_1m";
var CATALOG_CAPABILITY_NAMES = [
  "adaptive_thinking",
  "rejects_disabled_thinking",
  "thinking_disabled_effort_cap",
  "context_management",
  "mid_conv_system",
  "mid_conv_tool_change",
  "lean_prompt",
  "refusal_fallback",
  CATALOG_CAPABILITY_NAMES_2,
];
var MAX_CONTEXT_TOKENS_1M = 1e6;
var EFFORT_LEVEL_NAMES = ["low", "medium", "high"];
var CLAUDE_MODEL_ID_PATTERN = "claude-[a-z0-9]+(?:-[a-z0-9]+)*";
var PROVIDER_MODEL_ID_PATTERNS = {
  bedrock: new RegExp(
    `^(?:(?:${BEDROCK_REGION_PREFIXES.join("|")})\\.)?anthropic\\.${CLAUDE_MODEL_ID_PATTERN}(?::[0-9]{1,3})?$`,
  ),
  vertex: new RegExp(`^${CLAUDE_MODEL_ID_PATTERN}(?:@[0-9]{8})?$`),
  foundry: new RegExp(`^${CLAUDE_MODEL_ID_PATTERN}$`),
  mantle: new RegExp(`^anthropic\\.${CLAUDE_MODEL_ID_PATTERN}$`),
};
//@ chunk-aepeg2w5.js:222014-222123 placement
/**
 * 判断模型 id 是否符合模式、不是 fast/latest 变体且基础名等于给定值。
 */
function matchesCatalogBase(e, n, r) {
  if (!r.test(e) || /-(?:fast|latest)\b/.test(e)) return false;
  let modelId = parseModelId(e);
  return isStandardVersion(modelId) && modelId.base === n;
}
//@ chunk-aepeg2w5.js:222123-223055 placement
/**
 * 目录条目是否应向本客户端提供（运行时、最低版本、非保密）。
 */
function isCatalogEntryOffered(e, apiProvider) {
  let runtime = e.runtime;
  if (
    runtime === undefined ||
    e.confidential === true ||
    e.min_claude_code_version === null ||
    (e.name?.trim() ?? "") === ""
  )
    return false;
  let modelId = parseModelId(e.id);
  let lower = runtime.family?.trim().toLowerCase();
  if (
    !isStandardVersion(modelId) ||
    modelId.legacyVersionFirst ||
    modelId.base !== e.id ||
    !(isModelFamily(lower) || lower === "fable") ||
    lower !== modelId.family
  )
    return false;
  let y = clampInRange(runtime.max_input_tokens, MAX_INPUT_TOKEN_RANGE);
  let S = clampInRange(runtime.max_output_tokens, OUTPUT_TOKEN_RANGE);
  let w = clampInRange(runtime.default_output_tokens, OUTPUT_TOKEN_RANGE);
  if (y === undefined || S === undefined || w === undefined || w > S) return false;
  let mapped = runtime.effort_levels?.map((effortLevel) => effortLevel.trim().toLowerCase());
  let lower_2 = runtime.default_effort?.trim().toLowerCase();
  if (
    mapped === undefined ||
    (mapped.length === 0
      ? lower_2 !== undefined
      : lower_2 === undefined ||
        !mapped.includes(lower_2) ||
        !EFFORT_LEVELS.some((L) => L === lower_2) ||
        !EFFORT_LEVEL_NAMES.every((L) => mapped.includes(L)))
  )
    return false;
  let P = new Set(runtime.capabilities?.map((capability) => capability.trim().toLowerCase()));
  if (
    CATALOG_CAPABILITY_NAMES.some((L) => P.has(L) === P.has(`-${L}`)) ||
    P.has(CATALOG_CAPABILITY_NAMES_2) !== y >= MAX_CONTEXT_TOKENS_1M
  )
    return false;
  let providerModelIdForEntry = getProviderModelIdForEntry(e, apiProvider);
  if (
    providerModelIdForEntry === undefined ||
    !matchesCatalogBase(providerModelIdForEntry, e.id, PROVIDER_MODEL_ID_PATTERNS[apiProvider])
  )
    return false;
  return (
    (apiProvider !== "bedrock" && apiProvider !== "vertex") ||
    typeof runtime.eager_input_streaming?.[apiProvider] === "boolean"
  );
}
//@ chunk-aepeg2w5.js:223055-223180 placement
var MAX_BEHAVES_AS_HOPS = 8;
var KNOWN_STATUS = {
  status: "known",
};
var DESCRIBED_STATUS = {
  status: "described",
};
var UNKNOWN_STATUS = {
  status: "unknown",
};
var NOT_SUPPORTED_MESSAGE = "Not supported in this version of Claude Code";
//@ chunk-aepeg2w5.js:223180-223217 placement
/**
 * 安装目录的模型知识（modelKnowledge）对象。
 */
function MAX_LOOKUP_BUCKETS(modelKnowledge) {
  getCatalogState().modelKnowledge = modelKnowledge;
}
//@ chunk-aepeg2w5.js:223217-223228 placement
var createCatalogLookupBucket = 256;
//@ chunk-aepeg2w5.js:223228-223351 placement
function createCatalogLookupBucket_2() {
  return {
    byModel: new Map(),
    offeredRows: undefined,
    familySpellingTargets: undefined,
    familySpellingVouchGeneration: undefined,
  };
}
//@ chunk-aepeg2w5.js:223351-223685 placement
/**
 * 模型目录查找的记忆化（按设置与命名代次）。
 */
function catalogLookupMemo(modelKnowledge) {
  let providerState = getProviderState();
  let r = modelKnowledge.settingsGeneration();
  let s = modelKnowledge.namingGeneration();
  let behavesAsMemo = providerState.behavesAsMemo;
  if (
    behavesAsMemo !== undefined &&
    behavesAsMemo.lookup === modelKnowledge &&
    behavesAsMemo.settingsGeneration === r &&
    behavesAsMemo.namingGeneration === s
  )
    return behavesAsMemo;
  let y = {
    lookup: modelKnowledge,
    settingsGeneration: r,
    namingGeneration: s,
    settingsMappingsDeclared: undefined,
    withoutRows: createCatalogLookupBucket_2(),
    byCatalog: new WeakMap(),
  };
  providerState.behavesAsMemo = y;
  return y;
}
//@ chunk-aepeg2w5.js:223685-223811 placement
function getCatalogLookupBucket(e, n) {
  if (n === null) return e.withoutRows;
  let r = e.byCatalog.get(n);
  if (r === undefined) {
    r = createCatalogLookupBucket_2();
    e.byCatalog.set(n, r);
  }
  return r;
}
//@ chunk-aepeg2w5.js:223811-223921 placement
function hasSettingsMappings(e) {
  e.settingsMappingsDeclared ??= e.lookup.hasSettingsBehavesAs();
  return e.settingsMappingsDeclared;
}
//@ chunk-aepeg2w5.js:223921-224137 placement
/**
 * 查询模型在目录中的状态（已知、已描述、已映射或未知），按目录缓存。
 */
function getModelCatalogStatus(e, n) {
  let modelKnowledge = getCatalogState().modelKnowledge;
  if (modelKnowledge === undefined) return KNOWN_STATUS;
  let s = catalogLookupMemo(modelKnowledge);
  let catalogLookupBucket = getCatalogLookupBucket(s, e);
  let y = catalogLookupBucket.byModel.get(n);
  if (y !== undefined) return y;
  let S = describeModelStatus(e, n, s);
  if (catalogLookupBucket.byModel.size >= createCatalogLookupBucket) catalogLookupBucket.byModel.clear();
  catalogLookupBucket.byModel.set(n, S);
  return S;
}
//@ chunk-aepeg2w5.js:224137-224466 placement
/**
 * 判断模型在目录中的状态（已知、描述、未知）。
 */
function describeModelStatus(e, n, r) {
  if (r.lookup.isKnown(n)) return KNOWN_STATUS;
  if (e === null && !hasSettingsMappings(r)) return UNKNOWN_STATUS;
  let s = new Set([normalizeModelId(n)]);
  let behavesAsTarget = findBehavesAsTarget(e, n, r, s, 0);
  if (behavesAsTarget !== undefined)
    return {
      status: "mapped",
      target: behavesAsTarget.target,
      source: behavesAsTarget.source,
      hops: behavesAsTarget.hops,
    };
  if (neverKnownByFallback(e, n, r)) return KNOWN_STATUS;
  if (e === null) return UNKNOWN_STATUS;
  for (let y of identitySpellingsFor(n, r)) {
    let servedCatalogRow = findServedCatalogRow(e, y);
    if (servedCatalogRow !== undefined)
      return isServedCatalogCapabilityUsable(e, servedCatalogRow) ? DESCRIBED_STATUS : UNKNOWN_STATUS;
  }
  return UNKNOWN_STATUS;
}
//@ chunk-aepeg2w5.js:224466-224506 placement
function isServedCatalogCapabilityUsable(e, servedCatalogRow) {
  return !formatCatalogMessage(servedCatalogRow) && canDescribeMinVersion(e, servedCatalogRow);
}
//@ chunk-aepeg2w5.js:224506-224690 placement
function canDescribeMinVersion(e, n) {
  let apiProvider = getAPIProvider();
  return (
    isPublishedCatalog(e) &&
    isThirdPartyBackend(apiProvider) &&
    isActiveCatalogModel(n) &&
    n.offered_on != null &&
    !isRowNotOnProvider(n, e) &&
    isCatalogEntryOffered(n, apiProvider) &&
    (n.behaves_as?.trim() ?? "") === "" &&
    getCatalogState().modelKnowledge?.settingsBehavesAs(n.id) === undefined
  );
}
//@ chunk-aepeg2w5.js:224690-224767 placement
/**
 * 任一模型是否在目录中有描述。
 */
function anyModelDescribed(...e) {
  return e.some((n) => n !== undefined && catalogStatusOf(n).status === "described");
}
//@ chunk-aepeg2w5.js:224767-224855 placement
/**
 * 判断目录中是否存在可描述（有 min 版本等信息）的该模型。
 */
function hasDescribableCatalogModel(id) {
  let effectiveServedCatalog = getEffectiveServedCatalog();
  if (effectiveServedCatalog === null) return false;
  let servedCatalogRow = findServedCatalogRow(effectiveServedCatalog, id);
  return (
    servedCatalogRow !== undefined &&
    isServedCatalogCapabilityUsable(effectiveServedCatalog, servedCatalogRow)
  );
}
//@ chunk-aepeg2w5.js:224855-224912 placement
function isKnownOrBehavesAsKnown(e, target, r) {
  return r.lookup.isKnown(target) || neverKnownByFallback(e, target, r);
}
//@ chunk-aepeg2w5.js:224912-224940 placement
function neverKnownByFallback(e, n, r) {
  return false;
}
//@ chunk-aepeg2w5.js:224940-225231 placement
function findBehavesAsTarget(e, n, r, s, h) {
  if (h >= MAX_BEHAVES_AS_HOPS) return;
  for (let y of listBehavesAsCandidates(e, n, r)) {
    let S = normalizeModelId(y.target);
    if (S === "" || s.has(S)) continue;
    if (isKnownOrBehavesAsKnown(e, y.target, r))
      return {
        target: y.target,
        source: y.source,
        hops: h + 1,
      };
    s.add(S);
    let behavesAsTarget = findBehavesAsTarget(e, y.target, r, s, h + 1);
    if (behavesAsTarget !== undefined)
      return {
        target: behavesAsTarget.target,
        source: y.source,
        hops: behavesAsTarget.hops,
      };
  }
  return;
}
//@ chunk-aepeg2w5.js:225231-225484 placement
function listBehavesAsCandidates(e, n, r) {
  let s = [];
  let h = identitySpellingsFor(n, r);
  let y = e === null ? undefined : firstTrimmedValue(h, (S) => findServedCatalogRow(e, S)?.behaves_as);
  if (y !== undefined)
    s.push({
      target: y,
      source: "served",
    });
  if (hasSettingsMappings(r)) {
    let S = firstTrimmedValue(h, (w) => r.lookup.settingsBehavesAs(w));
    if (S !== undefined)
      s.push({
        target: S,
        source: "settings",
      });
  }
  return s;
}
//@ chunk-aepeg2w5.js:225484-225567 placement
function identitySpellingsFor(e, n) {
  let r = n.lookup.identitySpelling(e);
  return normalizeModelId(r) === normalizeModelId(e) ? [e] : [e, r];
}
//@ chunk-aepeg2w5.js:225567-225649 placement
function firstTrimmedValue(e, n) {
  for (let r of e) {
    let s = n(r)?.trim() ?? "";
    if (s !== "") return s;
  }
  return;
}
//@ chunk-aepeg2w5.js:225649-225683 placement
function catalogStatusOf(e) {
  return getModelCatalogStatus(getEffectiveServedCatalog(), e);
}
//@ chunk-aepeg2w5.js:225683-225844 placement
/**
 * 若模型在目录中被映射为其他模型，返回映射目标。
 */
function resolveMappedModel(e) {
  let modelKnowledge = getCatalogState().modelKnowledge;
  if (modelKnowledge === undefined) return e;
  let effectiveServedCatalog = getEffectiveServedCatalog();
  if (effectiveServedCatalog === null && !hasSettingsMappings(catalogLookupMemo(modelKnowledge))) return e;
  let modelCatalogStatus = getModelCatalogStatus(effectiveServedCatalog, e);
  return modelCatalogStatus.status === "mapped" ? modelCatalogStatus.target : e;
}
//@ chunk-aepeg2w5.js:225844-225880 placement
function catalogRowStatus(e, n) {
  return getModelCatalogStatus(e, n.id);
}
//@ chunk-aepeg2w5.js:225880-226446 placement
/**
 * 用占位符替换目录消息模板（问题反馈地址、包名等）。
 */
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
  let minClaudeCodeVersion = e.min_claude_code_version;
  return minClaudeCodeVersion != null && lt_2(splitOnDash(n), minClaudeCodeVersion);
}
//@ chunk-aepeg2w5.js:226446-226583 placement
/**
 * 返回模型不受支持时的说明（需要更新版本或本版本不支持）。
 */
function getUnsupportedModelMessage(e) {
  let minClaudeCodeVersion = e.min_claude_code_version;
  if (minClaudeCodeVersion == null || !formatCatalogMessage(e) || isRowNotOnProvider(e))
    return NOT_SUPPORTED_MESSAGE;
  let effectiveServedCatalog = getEffectiveServedCatalog();
  return isFirstPartyApiBackend() ||
    (effectiveServedCatalog !== null && canDescribeMinVersion(effectiveServedCatalog, e))
    ? minVersionNotice(minClaudeCodeVersion)
    : NOT_SUPPORTED_MESSAGE;
}
//@ chunk-aepeg2w5.js:226583-226658 placement
/**
 * 判断目录行是否不在当前提供商上（offered_on 不含该提供商的键）。
 */
function isRowNotOnProvider(e, n = getEffectiveServedCatalog()) {
  let apiProvider = getAPIProvider();
  let s = n === null ? providerCatalogKey(apiProvider) : effectiveCatalogProviderKey(n, apiProvider);
  return !isProviderOffered(e, s);
}
//@ chunk-aepeg2w5.js:226658-226809 placement
function isCatalogRowRecognized(e, n) {
  let r = catalogRowStatus(e, n).status !== "unknown";
  if (!isFirstPartyApiBackend()) return r;
  return (
    !formatCatalogMessage(n) &&
    (r || n.min_claude_code_version != null || getProviderState().includeUnsupportedModels)
  );
}
//@ chunk-aepeg2w5.js:226809-226913 placement
/**
 * 判断目录行是否可在模型选择器中选择。
 */
function isCatalogRowSelectable(e, n) {
  return (
    isActiveCatalogModel(n) &&
    !isRowNotOnProvider(n, e) &&
    isCatalogRowRecognized(e, n) &&
    (getCatalogState().modelKnowledge?.isRowNameable(n, isServedCatalogCapabilityUsable(e, n)) ?? true)
  );
}
//@ chunk-aepeg2w5.js:226913-227087 placement
/**
 * 目录中向用户提供的模型行。
 */
function offeredCatalogRows(e) {
  let modelKnowledge = getCatalogState().modelKnowledge;
  if (modelKnowledge === undefined) return catalogModels(e).filter((s) => isCatalogRowSelectable(e, s));
  let catalogLookupBucket = getCatalogLookupBucket(catalogLookupMemo(modelKnowledge), e);
  catalogLookupBucket.offeredRows ??= catalogModels(e).filter((s) => isCatalogRowSelectable(e, s));
  return catalogLookupBucket.offeredRows;
}
//@ chunk-aepeg2w5.js:227087-227120 placement
function rowProviderOverrides(e) {
  return familyFirstIds(offeredCatalogRows(e));
}
//@ chunk-aepeg2w5.js:227120-227178 placement
/**
 * 列出目录中可用但不可选的行。
 */
function unselectableActiveRows(e) {
  return catalogModels(e).filter((n) => isActiveCatalogModel(n) && !isCatalogRowRecognized(e, n));
}
//@ chunk-aepeg2w5.js:227178-227585 placement
/**
 * 计算目录模型的按提供商覆盖。
 */
function providerModelOverrides(e, n) {
  let { perProvider, everywhere } = getProviderAliasTargets(e, n, providerCatalogKey(getAPIProvider()));
  if (perProvider === undefined && everywhere === undefined) return {};
  let h = new Set(catalogModels(e).map((x) => modelIdentityKey(x.id)));
  let y = new Map();
  for (let x of offeredCatalogRows(e)) {
    let P = modelIdentityKey(x.id);
    if (!y.has(P)) y.set(P, x.id);
  }
  let S = (x) => {
    if (x === undefined) return;
    let P = modelIdentityKey(x);
    if (h.has(P)) return y.get(P);
    return isKnownNameableModel(e, x) ? (firstPartyIdFromCatalog(x) ?? x) : undefined;
  };
  let w = S(perProvider);
  let R = S(everywhere);
  return {
    ...(w !== undefined && {
      perProvider: w,
    }),
    ...(R !== undefined && {
      everywhere: R,
    }),
  };
}
//@ chunk-aepeg2w5.js:227585-227704 placement
function isKnownNameableModel(e, n) {
  if (!isPublishedCatalog(e)) return false;
  let modelKnowledge = getCatalogState().modelKnowledge;
  return (
    modelKnowledge !== undefined &&
    modelKnowledge.isKnown(n) &&
    modelKnowledge.isRowNameable({
      id: n,
    })
  );
}
//@ chunk-aepeg2w5.js:227704-227749 placement
function isPublishedCatalog(e) {
  return e.origin === "published";
}
//@ chunk-aepeg2w5.js:227749-227940 placement
function hasProviderAliasOverride(e) {
  if (e === "default") return false;
  let aliases = getModelCatalog().aliases;
  let r = Object.hasOwn(aliases, e) ? aliases[e] : undefined;
  let s = providerCatalogKey(getAPIProvider());
  return r?.per_provider !== undefined && Object.hasOwn(r.per_provider, s) && !!r.per_provider[s];
}
//@ chunk-aepeg2w5.js:227940-228150 placement
function isAliasFamilyUnavailable_2(e, n) {
  if (n === "default") return false;
  let catalogAlias = resolveCatalogAlias(n, providerCatalogKey(getAPIProvider()));
  if (catalogAlias === undefined) return false;
  let s = modelIdentityKey(catalogAlias);
  let filtered = catalogModels(e).filter((y) => modelIdentityKey(y.id) === s);
  return (
    filtered.some((y) => isRowNotOnProvider(y, e)) ||
    (filtered.length > 0 && filtered.every((y) => !isActiveCatalogModel(y) || !isCatalogRowRecognized(e, y)))
  );
}
//@ chunk-aepeg2w5.js:228150-228201 placement
/**
 * 判断某别名族在当前生效目录中整体不可用。
 */
function isAliasFamilyUnavailable(e) {
  let n = activeServedCatalog();
  return n !== null && isAliasFamilyUnavailable_2(n, e);
}
//@ chunk-aepeg2w5.js:228201-228262 placement
/**
 * 判断当前提供商是否支持族覆盖（非 mantle/foundry）。
 */
function supportsFamilyOverride() {
  let apiProvider = getAPIProvider();
  return apiProvider !== "mantle" && apiProvider !== "foundry";
}
//@ chunk-aepeg2w5.js:228262-228486 placement
function resolveFamilyDefault(e, n, r) {
  if (!isPublishedCatalog(e)) return r;
  if (!supportsFamilyOverride()) return;
  let s = providerModelOverrides(e, n);
  if (s.perProvider !== undefined) return s.perProvider;
  let h = isAliasFamilyUnavailable_2(e, n);
  if (!h && hasProviderAliasOverride(n)) return;
  if (s.everywhere !== undefined) return s.everywhere;
  return h || !hasProviderAliasTarget(e, n) ? r : undefined;
}
//@ chunk-aepeg2w5.js:228486-228631 placement
/**
 * 判断服务端目录是否把该模型标为支持计划模式。
 */
function catalogSupportsPlanMode(e) {
  let n = activeServedCatalog();
  if (n === null) return false;
  let r = modelIdentityKey(e);
  let filtered = catalogModels(n).filter((h) => modelIdentityKey(h.id) === r);
  return filtered.length === 0 ? isKnownNameableModel(n, e) : filtered.some((h) => isOfferedCatalogRow(h.id));
}
//@ chunk-aepeg2w5.js:228631-228685 placement
/**
 * 取当前生效目录中该模型的提供商覆盖值。
 */
function activeProviderModelOverrides(e) {
  let n = activeServedCatalog();
  return n === null ? {} : providerModelOverrides(n, e);
}
//@ chunk-aepeg2w5.js:228685-228785 placement
/**
 * 计算目录中各族（opus/sonnet/haiku 等）的默认模型。
 */
function getFamilyDefaults(e) {
  let n = rowProviderOverrides(e);
  let r = {};
  for (let s of MODEL_FAMILY_NAMES) {
    let familyDefault = resolveFamilyDefault(e, s, n[s]);
    if (familyDefault !== undefined) r[s] = familyDefault;
  }
  return r;
}
//@ chunk-aepeg2w5.js:228785-228947 placement
/**
 * 返回某族的默认模型（Fable 只有在未被描述为不可用时才返回）。
 */
function getFamilyDefault(e, n) {
  if (n !== "fable") return getFamilyDefaults(e)[n];
  let familyDefault = resolveFamilyDefault(e, "fable", undefined);
  let s = familyDefault === undefined ? undefined : findServedCatalogRow(e, familyDefault);
  return s !== undefined && catalogRowStatus(e, s).status === "described" ? undefined : familyDefault;
}
//@ chunk-aepeg2w5.js:228947-229005 placement
/**
 * 取当前生效目录中某族的默认模型。
 */
function activeFamilyDefault(e) {
  let n = activeServedCatalog();
  return n === null ? undefined : getFamilyDefault(n, e);
}
//@ chunk-aepeg2w5.js:229005-229027 placement
/**
 * 恒返回 undefined（无目录别名目标）。
 */
function noCatalogAliasTarget(e) {
  return;
}
//@ chunk-aepeg2w5.js:229027-229049 placement
/**
 * 恒返回 undefined（无目录 behaves_as 目标）。
 */
function noCatalogBehavesAs(e) {
  return;
}
//@ chunk-aepeg2w5.js:229049-229086 placement
/**
 * 取目录行的 behaves_as 目标（此构建恒为 undefined）。
 */
function catalogBehavesAsTarget(e) {
  return noCatalogBehavesAs(e)?.target;
}
//@ chunk-aepeg2w5.js:229086-229110 placement
/**
 * 恒返回 false（模型永不标记为不可用）。
 */
function neverUnavailable(e) {
  return false;
}
//@ chunk-aepeg2w5.js:229110-229162 placement
/**
 * 判断当前生效目录中该模型行是否已知。
 */
function activeCatalogRowKnown(e) {
  let n = activeServedCatalog();
  return n !== null && isCatalogRowRecognized(n, e);
}
//@ chunk-aepeg2w5.js:229162-229259 placement
function isOfferedCatalogRow(id) {
  let n = activeServedCatalog();
  if (n === null) return false;
  let r = normalizeModelId(id);
  return offeredCatalogRows(n).some((s) => normalizeModelId(s.id) === r);
}
export {
  anyModelDescribed,
  activeCatalogRowKnown,
  formatCatalogMessage,
  noCatalogAliasTarget,
  neverUnavailable,
  noCatalogBehavesAs,
  isCatalogRowSelectable,
  hasDescribableCatalogModel,
  isSemverString,
  splitOnDash,
  catalogBehavesAsTarget,
  isThirdPartyBackend,
  PROVIDER_MODEL_ID_PATTERNS,
  matchesCatalogBase,
  offeredCatalogRows,
  getFamilyDefault,
  supportsFamilyOverride,
  providerModelOverrides,
  getFamilyDefaults,
  getModelCatalogStatus,
  unselectableActiveRows,
  MAX_LOOKUP_BUCKETS,
  getUnsupportedModelMessage,
  activeFamilyDefault,
  isAliasFamilyUnavailable,
  isRowNotOnProvider,
  activeProviderModelOverrides,
  catalogSupportsPlanMode,
  resolveMappedModel,
  CATALOG_CAPABILITY_NAMES_2,
  isSemverVersion,
  includeUnsupportedDefault,
  thirdPartyBackends,
};
