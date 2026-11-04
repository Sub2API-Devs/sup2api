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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:221109-221142 placement
/**
 * 按连字符拆分。
 */
function splitOnDash(text) {
  return firstLineOf(text, "-");
}
//@ chunk-aepeg2w5.js:221142-221190 placement
var SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
//@ chunk-aepeg2w5.js:221190-221244 placement
/**
 * 是否为语义版本字符串。
 */
function isSemverString(value) {
  return typeof value === "string" && SEMVER_RE.test(value);
}
//@ chunk-aepeg2w5.js:221244-221292 placement
/**
 * 判断字符串是否为可解析的语义版本。
 */
function isSemverVersion(value) {
  return isSemverString(value) && legacyRequireInterop.parse(value) != null;
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
var CATALOG_CAPABILITY_NAMES_2; // deferred: uses BEDROCK_REGION_PREFIXES (../bedrock.js) of its import cycle while loading; runs once the cycle is complete
var CATALOG_CAPABILITY_NAMES;
var MAX_CONTEXT_TOKENS_1M;
var EFFORT_LEVEL_NAMES;
var CLAUDE_MODEL_ID_PATTERN;
var PROVIDER_MODEL_ID_PATTERNS;
deferInit("chunk-aepeg2w5.js:221538", () => {
  CATALOG_CAPABILITY_NAMES_2 = "native_1m";
  CATALOG_CAPABILITY_NAMES = [
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
  MAX_CONTEXT_TOKENS_1M = 1e6;
  EFFORT_LEVEL_NAMES = ["low", "medium", "high"];
  CLAUDE_MODEL_ID_PATTERN = "claude-[a-z0-9]+(?:-[a-z0-9]+)*";
  PROVIDER_MODEL_ID_PATTERNS = {
    bedrock: new RegExp(
      `^(?:(?:${BEDROCK_REGION_PREFIXES.join("|")})\\.)?anthropic\\.${CLAUDE_MODEL_ID_PATTERN}(?::[0-9]{1,3})?$`,
    ),
    vertex: new RegExp(`^${CLAUDE_MODEL_ID_PATTERN}(?:@[0-9]{8})?$`),
    foundry: new RegExp(`^${CLAUDE_MODEL_ID_PATTERN}$`),
    mantle: new RegExp(`^anthropic\\.${CLAUDE_MODEL_ID_PATTERN}$`),
  };
});
//@ chunk-aepeg2w5.js:222014-222123 placement
/**
 * 判断模型 id 是否符合模式、不是 fast/latest 变体且基础名等于给定值。
 */
function matchesCatalogBase(id, base, pattern) {
  if (!pattern.test(id) || /-(?:fast|latest)\b/.test(id)) return false;
  let modelId = parseModelId(id);
  return isStandardVersion(modelId) && modelId.base === base;
}
//@ chunk-aepeg2w5.js:222123-223055 placement
/**
 * 目录条目是否应向本客户端提供（运行时、最低版本、非保密）。
 */
function isCatalogEntryOffered(entry, provider) {
  let runtime = entry.runtime;
  if (
    runtime === undefined ||
    entry.confidential === true ||
    entry.min_claude_code_version === null ||
    (entry.name?.trim() ?? "") === ""
  )
    return false;
  let modelId = parseModelId(entry.id);
  let family = runtime.family?.trim().toLowerCase();
  if (
    !isStandardVersion(modelId) ||
    modelId.legacyVersionFirst ||
    modelId.base !== entry.id ||
    !(isModelFamily(family) || family === "fable") ||
    family !== modelId.family
  )
    return false;
  let maxInput = clampInRange(runtime.max_input_tokens, MAX_INPUT_TOKEN_RANGE);
  let maxOutput = clampInRange(runtime.max_output_tokens, OUTPUT_TOKEN_RANGE);
  let defaultOutput = clampInRange(runtime.default_output_tokens, OUTPUT_TOKEN_RANGE);
  if (
    maxInput === undefined ||
    maxOutput === undefined ||
    defaultOutput === undefined ||
    defaultOutput > maxOutput
  )
    return false;
  let mapped = runtime.effort_levels?.map((effortLevel) => effortLevel.trim().toLowerCase());
  let lower = runtime.default_effort?.trim().toLowerCase();
  if (
    mapped === undefined ||
    (mapped.length === 0
      ? lower !== undefined
      : lower === undefined ||
        !mapped.includes(lower) ||
        !EFFORT_LEVELS.some((level) => level === lower) ||
        !EFFORT_LEVEL_NAMES.every((levelName) => mapped.includes(levelName)))
  )
    return false;
  let capabilities = new Set(runtime.capabilities?.map((capability) => capability.trim().toLowerCase()));
  if (
    CATALOG_CAPABILITY_NAMES.some((name) => capabilities.has(name) === capabilities.has(`-${name}`)) ||
    capabilities.has(CATALOG_CAPABILITY_NAMES_2) !== maxInput >= MAX_CONTEXT_TOKENS_1M
  )
    return false;
  let id = getProviderModelIdForEntry(entry, provider);
  if (id === undefined || !matchesCatalogBase(id, entry.id, PROVIDER_MODEL_ID_PATTERNS[provider]))
    return false;
  return (
    (provider !== "bedrock" && provider !== "vertex") ||
    typeof runtime.eager_input_streaming?.[provider] === "boolean"
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
/**
 * 按模型缓存的目录查找结果：FN 是缓存条数的上限 256，超过即整体清空。
 */
var MAX_LOOKUP_CACHE_MODELS = 256;
//@ chunk-aepeg2w5.js:223228-223351 placement
function createCatalogLookupBucket() {
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
  let settingsGeneration = modelKnowledge.settingsGeneration();
  let namingGeneration = modelKnowledge.namingGeneration();
  let behavesAsMemo = providerState.behavesAsMemo;
  if (
    behavesAsMemo !== undefined &&
    behavesAsMemo.lookup === modelKnowledge &&
    behavesAsMemo.settingsGeneration === settingsGeneration &&
    behavesAsMemo.namingGeneration === namingGeneration
  )
    return behavesAsMemo;
  let memo = {
    lookup: modelKnowledge,
    settingsGeneration,
    namingGeneration,
    settingsMappingsDeclared: undefined,
    withoutRows: createCatalogLookupBucket(),
    byCatalog: new WeakMap(),
  };
  providerState.behavesAsMemo = memo;
  return memo;
}
//@ chunk-aepeg2w5.js:223685-223811 placement
function getCatalogLookupBucket(memo, catalog) {
  if (catalog === null) return memo.withoutRows;
  let bucket = memo.byCatalog.get(catalog);
  if (bucket === undefined) {
    bucket = createCatalogLookupBucket();
    memo.byCatalog.set(catalog, bucket);
  }
  return bucket;
}
//@ chunk-aepeg2w5.js:223811-223921 placement
function hasSettingsMappings(memo) {
  memo.settingsMappingsDeclared ??= memo.lookup.hasSettingsBehavesAs();
  return memo.settingsMappingsDeclared;
}
//@ chunk-aepeg2w5.js:223921-224137 placement
/**
 * 查询模型在目录中的状态（已知、已描述、已映射或未知），按目录缓存。
 */
function getModelCatalogStatus(catalog, modelId) {
  let modelKnowledge = getCatalogState().modelKnowledge;
  if (modelKnowledge === undefined) return KNOWN_STATUS;
  let memo = catalogLookupMemo(modelKnowledge);
  let catalogLookupBucket = getCatalogLookupBucket(memo, catalog);
  let cached = catalogLookupBucket.byModel.get(modelId);
  if (cached !== undefined) return cached;
  let status = describeModelStatus(catalog, modelId, memo);
  if (catalogLookupBucket.byModel.size >= MAX_LOOKUP_CACHE_MODELS) catalogLookupBucket.byModel.clear();
  catalogLookupBucket.byModel.set(modelId, status);
  return status;
}
//@ chunk-aepeg2w5.js:224137-224466 placement
/**
 * 判断模型在目录中的状态（已知、描述、未知）。
 */
function describeModelStatus(catalog, modelId, memo) {
  if (memo.lookup.isKnown(modelId)) return KNOWN_STATUS;
  if (catalog === null && !hasSettingsMappings(memo)) return UNKNOWN_STATUS;
  let visited = new Set([normalizeModelId(modelId)]);
  let behavesAsTarget = findBehavesAsTarget(catalog, modelId, memo, visited, 0);
  if (behavesAsTarget !== undefined)
    return {
      status: "mapped",
      target: behavesAsTarget.target,
      source: behavesAsTarget.source,
      hops: behavesAsTarget.hops,
    };
  if (neverKnownByFallback(catalog, modelId, memo)) return KNOWN_STATUS;
  if (catalog === null) return UNKNOWN_STATUS;
  for (let spelling of identitySpellingsFor(modelId, memo)) {
    let servedCatalogRow = findServedCatalogRow(catalog, spelling);
    if (servedCatalogRow !== undefined)
      return isServedCatalogCapabilityUsable(catalog, servedCatalogRow) ? DESCRIBED_STATUS : UNKNOWN_STATUS;
  }
  return UNKNOWN_STATUS;
}
//@ chunk-aepeg2w5.js:224466-224506 placement
function isServedCatalogCapabilityUsable(catalog, row) {
  return !formatCatalogMessage(row) && canDescribeMinVersion(catalog, row);
}
//@ chunk-aepeg2w5.js:224506-224690 placement
function canDescribeMinVersion(catalog, row) {
  let apiProvider = getAPIProvider();
  return (
    isPublishedCatalog(catalog) &&
    isThirdPartyBackend(apiProvider) &&
    isActiveCatalogModel(row) &&
    row.offered_on != null &&
    !isRowNotOnProvider(row, catalog) &&
    isCatalogEntryOffered(row, apiProvider) &&
    (row.behaves_as?.trim() ?? "") === "" &&
    getCatalogState().modelKnowledge?.settingsBehavesAs(row.id) === undefined
  );
}
//@ chunk-aepeg2w5.js:224690-224767 placement
/**
 * 任一模型是否在目录中有描述。
 */
function anyModelDescribed(...modelIds) {
  return modelIds.some((modelId) => modelId !== undefined && catalogStatusOf(modelId).status === "described");
}
//@ chunk-aepeg2w5.js:224767-224855 placement
/**
 * 判断目录中是否存在可描述（有 min 版本等信息）的该模型。
 */
function hasDescribableCatalogModel(modelName) {
  let catalog = getEffectiveServedCatalog();
  if (catalog === null) return false;
  let servedCatalogRow = findServedCatalogRow(catalog, modelName);
  return servedCatalogRow !== undefined && isServedCatalogCapabilityUsable(catalog, servedCatalogRow);
}
//@ chunk-aepeg2w5.js:224855-224912 placement
function isKnownOrBehavesAsKnown(catalog, target, memo) {
  return memo.lookup.isKnown(target) || neverKnownByFallback(catalog, target, memo);
}
//@ chunk-aepeg2w5.js:224912-224940 placement
function neverKnownByFallback(catalog, target, memo) {
  return false;
}
//@ chunk-aepeg2w5.js:224940-225231 placement
function findBehavesAsTarget(catalog, modelId, memo, visited, hops) {
  if (hops >= MAX_BEHAVES_AS_HOPS) return;
  for (let candidate of listBehavesAsCandidates(catalog, modelId, memo)) {
    let normalizedTarget = normalizeModelId(candidate.target);
    if (normalizedTarget === "" || visited.has(normalizedTarget)) continue;
    if (isKnownOrBehavesAsKnown(catalog, candidate.target, memo))
      return {
        target: candidate.target,
        source: candidate.source,
        hops: hops + 1,
      };
    visited.add(normalizedTarget);
    let behavesAsTarget = findBehavesAsTarget(catalog, candidate.target, memo, visited, hops + 1);
    if (behavesAsTarget !== undefined)
      return {
        target: behavesAsTarget.target,
        source: candidate.source,
        hops: behavesAsTarget.hops,
      };
  }
  return;
}
//@ chunk-aepeg2w5.js:225231-225484 placement
function listBehavesAsCandidates(catalog, modelId, memo) {
  let candidates = [];
  let spellings = identitySpellingsFor(modelId, memo);
  let servedTarget =
    catalog === null
      ? undefined
      : firstTrimmedValue(spellings, (spelling) => findServedCatalogRow(catalog, spelling)?.behaves_as);
  if (servedTarget !== undefined)
    candidates.push({
      target: servedTarget,
      source: "served",
    });
  if (hasSettingsMappings(memo)) {
    let settingsTarget = firstTrimmedValue(spellings, (spelling) => memo.lookup.settingsBehavesAs(spelling));
    if (settingsTarget !== undefined)
      candidates.push({
        target: settingsTarget,
        source: "settings",
      });
  }
  return candidates;
}
//@ chunk-aepeg2w5.js:225484-225567 placement
function identitySpellingsFor(modelId, memo) {
  let identity = memo.lookup.identitySpelling(modelId);
  return normalizeModelId(identity) === normalizeModelId(modelId) ? [modelId] : [modelId, identity];
}
//@ chunk-aepeg2w5.js:225567-225649 placement
function firstTrimmedValue(values, lookup) {
  for (let value of values) {
    let trimmed = lookup(value)?.trim() ?? "";
    if (trimmed !== "") return trimmed;
  }
  return;
}
//@ chunk-aepeg2w5.js:225649-225683 placement
function catalogStatusOf(modelId) {
  return getModelCatalogStatus(getEffectiveServedCatalog(), modelId);
}
//@ chunk-aepeg2w5.js:225683-225844 placement
/**
 * 若模型在目录中被映射为其他模型，返回映射目标。
 */
function resolveMappedModel(modelId) {
  let modelKnowledge = getCatalogState().modelKnowledge;
  if (modelKnowledge === undefined) return modelId;
  let effectiveServedCatalog = getEffectiveServedCatalog();
  if (effectiveServedCatalog === null && !hasSettingsMappings(catalogLookupMemo(modelKnowledge)))
    return modelId;
  let modelCatalogStatus = getModelCatalogStatus(effectiveServedCatalog, modelId);
  return modelCatalogStatus.status === "mapped" ? modelCatalogStatus.target : modelId;
}
//@ chunk-aepeg2w5.js:225844-225880 placement
function catalogRowStatus(catalog, row) {
  return getModelCatalogStatus(catalog, row.id);
}
//@ chunk-aepeg2w5.js:225880-226446 placement
/**
 * 用占位符替换目录消息模板（问题反馈地址、包名等）。
 */
function formatCatalogMessage(
  row,
  version = {
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
  let minClaudeCodeVersion = row.min_claude_code_version;
  return minClaudeCodeVersion != null && lt_2(splitOnDash(version), minClaudeCodeVersion);
}
//@ chunk-aepeg2w5.js:226446-226583 placement
/**
 * 返回模型不受支持时的说明（需要更新版本或本版本不支持）。
 */
function getUnsupportedModelMessage(row) {
  let minClaudeCodeVersion = row.min_claude_code_version;
  if (minClaudeCodeVersion == null || !formatCatalogMessage(row) || isRowNotOnProvider(row))
    return NOT_SUPPORTED_MESSAGE;
  let catalog = getEffectiveServedCatalog();
  return isFirstPartyApiBackend() || (catalog !== null && canDescribeMinVersion(catalog, row))
    ? minVersionNotice(minClaudeCodeVersion)
    : NOT_SUPPORTED_MESSAGE;
}
//@ chunk-aepeg2w5.js:226583-226658 placement
/**
 * 判断目录行是否不在当前提供商上（offered_on 不含该提供商的键）。
 */
function isRowNotOnProvider(row, catalog = getEffectiveServedCatalog()) {
  let apiProvider = getAPIProvider();
  let providerKey =
    catalog === null ? providerCatalogKey(apiProvider) : effectiveCatalogProviderKey(catalog, apiProvider);
  return !isProviderOffered(row, providerKey);
}
//@ chunk-aepeg2w5.js:226658-226809 placement
function isCatalogRowRecognized(catalog, row) {
  let recognized = catalogRowStatus(catalog, row).status !== "unknown";
  if (!isFirstPartyApiBackend()) return recognized;
  return (
    !formatCatalogMessage(row) &&
    (recognized || row.min_claude_code_version != null || getProviderState().includeUnsupportedModels)
  );
}
//@ chunk-aepeg2w5.js:226809-226913 placement
/**
 * 判断目录行是否可在模型选择器中选择。
 */
function isCatalogRowSelectable(catalog, row) {
  return (
    isActiveCatalogModel(row) &&
    !isRowNotOnProvider(row, catalog) &&
    isCatalogRowRecognized(catalog, row) &&
    (getCatalogState().modelKnowledge?.isRowNameable(row, isServedCatalogCapabilityUsable(catalog, row)) ??
      true)
  );
}
//@ chunk-aepeg2w5.js:226913-227087 placement
/**
 * 目录中向用户提供的模型行。
 */
function offeredCatalogRows(catalog) {
  let modelKnowledge = getCatalogState().modelKnowledge;
  if (modelKnowledge === undefined)
    return catalogModels(catalog).filter((row) => isCatalogRowSelectable(catalog, row));
  let catalogLookupBucket = getCatalogLookupBucket(catalogLookupMemo(modelKnowledge), catalog);
  catalogLookupBucket.offeredRows ??= catalogModels(catalog).filter((row) =>
    isCatalogRowSelectable(catalog, row),
  );
  return catalogLookupBucket.offeredRows;
}
//@ chunk-aepeg2w5.js:227087-227120 placement
function rowProviderOverrides(catalog) {
  return familyFirstIds(offeredCatalogRows(catalog));
}
//@ chunk-aepeg2w5.js:227120-227178 placement
/**
 * 列出目录中可用但不可选的行。
 */
function unselectableActiveRows(catalog) {
  return catalogModels(catalog).filter(
    (row) => isActiveCatalogModel(row) && !isCatalogRowRecognized(catalog, row),
  );
}
//@ chunk-aepeg2w5.js:227178-227585 placement
/**
 * 计算目录模型的按提供商覆盖。
 */
function providerModelOverrides(catalog, alias) {
  let { perProvider, everywhere } = getProviderAliasTargets(
    catalog,
    alias,
    providerCatalogKey(getAPIProvider()),
  );
  if (perProvider === undefined && everywhere === undefined) return {};
  let identities = new Set(catalogModels(catalog).map((row) => modelIdentityKey(row.id)));
  let idByIdentity = new Map();
  for (let row of offeredCatalogRows(catalog)) {
    let identity = modelIdentityKey(row.id);
    if (!idByIdentity.has(identity)) idByIdentity.set(identity, row.id);
  }
  let mapTarget = (target) => {
    if (target === undefined) return;
    let identity = modelIdentityKey(target);
    if (identities.has(identity)) return idByIdentity.get(identity);
    return isKnownNameableModel(catalog, target) ? (firstPartyIdFromCatalog(target) ?? target) : undefined;
  };
  let perProviderTarget = mapTarget(perProvider);
  let everywhereTarget = mapTarget(everywhere);
  return {
    ...(perProviderTarget !== undefined && {
      perProvider: perProviderTarget,
    }),
    ...(everywhereTarget !== undefined && {
      everywhere: everywhereTarget,
    }),
  };
}
//@ chunk-aepeg2w5.js:227585-227704 placement
function isKnownNameableModel(catalog, modelId) {
  if (!isPublishedCatalog(catalog)) return false;
  let modelKnowledge = getCatalogState().modelKnowledge;
  return (
    modelKnowledge !== undefined &&
    modelKnowledge.isKnown(modelId) &&
    modelKnowledge.isRowNameable({
      id: modelId,
    })
  );
}
//@ chunk-aepeg2w5.js:227704-227749 placement
function isPublishedCatalog(catalog) {
  return catalog.origin === "published";
}
//@ chunk-aepeg2w5.js:227749-227940 placement
function hasProviderAliasOverride(alias) {
  if (alias === "default") return false;
  let aliases = getModelCatalog().aliases;
  let def = Object.hasOwn(aliases, alias) ? aliases[alias] : undefined;
  let providerKey = providerCatalogKey(getAPIProvider());
  return (
    def?.per_provider !== undefined &&
    Object.hasOwn(def.per_provider, providerKey) &&
    !!def.per_provider[providerKey]
  );
}
//@ chunk-aepeg2w5.js:227940-228150 placement
function isAliasFamilyUnavailable_2(catalog, alias) {
  if (alias === "default") return false;
  let catalogAlias = resolveCatalogAlias(alias, providerCatalogKey(getAPIProvider()));
  if (catalogAlias === undefined) return false;
  let identity = modelIdentityKey(catalogAlias);
  let filtered = catalogModels(catalog).filter((row) => modelIdentityKey(row.id) === identity);
  return (
    filtered.some((row) => isRowNotOnProvider(row, catalog)) ||
    (filtered.length > 0 &&
      filtered.every((row) => !isActiveCatalogModel(row) || !isCatalogRowRecognized(catalog, row)))
  );
}
//@ chunk-aepeg2w5.js:228150-228201 placement
/**
 * 判断某别名族在当前生效目录中整体不可用。
 */
function isAliasFamilyUnavailable(alias) {
  let catalog = activeServedCatalog();
  return catalog !== null && isAliasFamilyUnavailable_2(catalog, alias);
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
function resolveFamilyDefault(catalog, alias, fallback) {
  if (!isPublishedCatalog(catalog)) return fallback;
  if (!supportsFamilyOverride()) return;
  let overrides = providerModelOverrides(catalog, alias);
  if (overrides.perProvider !== undefined) return overrides.perProvider;
  let unavailable = isAliasFamilyUnavailable_2(catalog, alias);
  if (!unavailable && hasProviderAliasOverride(alias)) return;
  if (overrides.everywhere !== undefined) return overrides.everywhere;
  return unavailable || !hasProviderAliasTarget(catalog, alias) ? fallback : undefined;
}
//@ chunk-aepeg2w5.js:228486-228631 placement
/**
 * 判断服务端目录是否把该模型标为支持计划模式。
 */
function catalogSupportsPlanMode(model) {
  let catalog = activeServedCatalog();
  if (catalog === null) return false;
  let identity = modelIdentityKey(model);
  let filtered = catalogModels(catalog).filter((row) => modelIdentityKey(row.id) === identity);
  return filtered.length === 0
    ? isKnownNameableModel(catalog, model)
    : filtered.some((row) => isOfferedCatalogRow(row.id));
}
//@ chunk-aepeg2w5.js:228631-228685 placement
/**
 * 取当前生效目录中该模型的提供商覆盖值。
 */
function activeProviderModelOverrides(alias) {
  let catalog = activeServedCatalog();
  return catalog === null ? {} : providerModelOverrides(catalog, alias);
}
//@ chunk-aepeg2w5.js:228685-228785 placement
/**
 * 计算目录中各族（opus/sonnet/haiku 等）的默认模型。
 */
function getFamilyDefaults(catalog) {
  let overrides = rowProviderOverrides(catalog);
  let defaults = {};
  for (let family of MODEL_FAMILY_NAMES) {
    let familyDefault = resolveFamilyDefault(catalog, family, overrides[family]);
    if (familyDefault !== undefined) defaults[family] = familyDefault;
  }
  return defaults;
}
//@ chunk-aepeg2w5.js:228785-228947 placement
/**
 * 返回某族的默认模型（Fable 只有在未被描述为不可用时才返回）。
 */
function getFamilyDefault(catalog, family) {
  if (family !== "fable") return getFamilyDefaults(catalog)[family];
  let familyDefault = resolveFamilyDefault(catalog, "fable", undefined);
  let row = familyDefault === undefined ? undefined : findServedCatalogRow(catalog, familyDefault);
  return row !== undefined && catalogRowStatus(catalog, row).status === "described"
    ? undefined
    : familyDefault;
}
//@ chunk-aepeg2w5.js:228947-229005 placement
/**
 * 取当前生效目录中某族的默认模型。
 */
function activeFamilyDefault(family) {
  let catalog = activeServedCatalog();
  return catalog === null ? undefined : getFamilyDefault(catalog, family);
}
//@ chunk-aepeg2w5.js:229005-229027 placement
/**
 * 恒返回 undefined（无目录别名目标）。
 */
function noCatalogAliasTarget(model) {
  return;
}
//@ chunk-aepeg2w5.js:229027-229049 placement
/**
 * 恒返回 undefined（无目录 behaves_as 目标）。
 */
function noCatalogBehavesAs(model) {
  return;
}
//@ chunk-aepeg2w5.js:229049-229086 placement
/**
 * 取目录行的 behaves_as 目标（此构建恒为 undefined）。
 */
function catalogBehavesAsTarget(model) {
  return noCatalogBehavesAs(model)?.target;
}
//@ chunk-aepeg2w5.js:229086-229110 placement
/**
 * 恒返回 false（模型永不标记为不可用）。
 */
function neverUnavailable(model) {
  return false;
}
//@ chunk-aepeg2w5.js:229110-229162 placement
/**
 * 判断当前生效目录中该模型行是否已知。
 */
function activeCatalogRowKnown(row) {
  let catalog = activeServedCatalog();
  return catalog !== null && isCatalogRowRecognized(catalog, row);
}
//@ chunk-aepeg2w5.js:229162-229259 placement
function isOfferedCatalogRow(id) {
  let catalog = activeServedCatalog();
  if (catalog === null) return false;
  let identity = normalizeModelId(id);
  return offeredCatalogRows(catalog).some((row) => normalizeModelId(row.id) === identity);
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
