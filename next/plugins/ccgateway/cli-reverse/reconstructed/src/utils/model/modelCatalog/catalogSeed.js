/**
 * utils/model/modelCatalog/catalogSeed.ts
 *
 * 2.1.316 新增：模型目录种子数据（Bedrock 等提供商 id）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (14)
 * attribution: placement 13, layout 1
 */
import {
  isCatalogSurfaceBackend,
  getEffectiveServedCatalog,
  entryModelKey,
  bundledCatalogDocument,
  listSurfaceModels,
} from "./servedCatalog.js";
import { getProviderState } from "../providerCaches.js";
import { getCatalogState, catalogIdForProviderModelId } from "../modelCatalog.js";
import { catalogModels, getRowFamily } from "../providers.js";
import { normalizeModelId } from "./catalogEntries.js";
import { BEDROCK_REGION_PREFIXES } from "../bedrock.js";
import { normalizeCaseForComparison_2 } from "../../permissions/filesystem.js";
import { isKnownModelName } from "../knownModelNames.js";
import { parseModelId } from "../modelIds.js";
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../../../vendor/semver/index.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:228024-228550 placement
/**
 * 非 firstParty/gateway 提供商下，按模型目录把各行的线上模型 id（含 Bedrock 区域前缀变体）映射回目录行 id，带缓存。
 */
function findCatalogRowIdByWireId(wireId, { provider, generation, wireIdOf }) {
  if (isCatalogSurfaceBackend(provider)) return;
  let effectiveServedCatalog = getEffectiveServedCatalog();
  if (effectiveServedCatalog === null) return;
  let providerState = getProviderState();
  let settingsGeneration = getCatalogState().modelKnowledge?.settingsGeneration();
  let publishedWireIds = providerState.publishedWireIds;
  if (
    publishedWireIds?.catalog !== effectiveServedCatalog ||
    publishedWireIds.generation !== generation ||
    publishedWireIds.settingsGeneration !== settingsGeneration
  ) {
    let rowIdByWireId = new Map();
    publishedWireIds = {
      catalog: effectiveServedCatalog,
      generation,
      settingsGeneration,
      rowIdByWireId,
    };
    providerState.publishedWireIds = publishedWireIds;
    for (let row of catalogModels(effectiveServedCatalog)) {
      if (entryModelKey(row.id) !== undefined) continue;
      let wireIdOfRow = wireIdOf(row);
      if (wireIdOfRow === undefined) continue;
      for (let variant of getProviderWireIdVariants(wireIdOfRow, provider)) {
        let normalized = normalizeModelId(variant);
        if (!rowIdByWireId.has(normalized) && !isKnownCatalogModelId(variant))
          rowIdByWireId.set(normalized, row.id);
      }
    }
  }
  return publishedWireIds.rowIdByWireId.get(normalizeModelId(wireId));
}
//@ chunk-exfmq47h.js:228550-228598 layout
/**
 * Bedrock 返回模型 id 的跨区域推理配置变体列表，其他提供商返回 [id]。旧版名 getModelBetas 为错配。
 */
function getProviderWireIdVariants(modelId, provider) {
  return provider === "bedrock" ? expandBedrockModelIdVariants(modelId) : [modelId];
}
//@ chunk-exfmq47h.js:228598-228772 placement (2.1.88 match: isFoundationModel, 1)
/**
 * 去掉合法区域前缀得到 "anthropic.<…>"，非 Bedrock 形式返回 undefined。旧版名 isFoundationModel_2 为错配。
 */
function toBedrockFoundationModelId(modelId) {
  let [, prefix, rest] = /^(?:([A-Za-z-]+)\.)?anthropic\.(.+)$/i.exec(modelId) ?? [];
  if (rest === undefined) return;
  if (prefix !== undefined && !BEDROCK_REGION_PREFIXES.includes(prefix.toLowerCase())) return;
  return `anthropic.${rest}`;
}
//@ chunk-exfmq47h.js:228772-228937 placement
/**
 * 在候选 id 中找同一基础模型，优先给定前缀。
 */
function pickProfileForFoundationModel(foundationModelId, profiles, regionPrefix) {
  let lower = foundationModelId.toLowerCase();
  let regionPrefixDot = `${regionPrefix}.`;
  let fallback;
  for (let profile of profiles) {
    if (toBedrockFoundationModelId(profile)?.toLowerCase() !== lower) continue;
    if (profile.toLowerCase().startsWith(regionPrefixDot)) return profile;
    fallback ??= profile;
  }
  return fallback;
}
//@ chunk-exfmq47h.js:228937-229027 placement
/**
 * 基础模型 id 及其全部区域前缀变体。
 */
function expandBedrockModelIdVariants(modelId) {
  let bedrockFoundationModelId = toBedrockFoundationModelId(modelId);
  if (bedrockFoundationModelId === undefined) return [modelId];
  return [
    bedrockFoundationModelId,
    ...BEDROCK_REGION_PREFIXES.map((prefix) => `${prefix}.${bedrockFoundationModelId}`),
  ];
}
//@ chunk-exfmq47h.js:229027-229319 placement
/**
 * 获取已发布目录的行名分组（按目录缓存），用于拒绝规则匹配。
 */
function getPublishedRowNameGroups() {
  let effectiveServedCatalog = getEffectiveServedCatalog();
  let providerState = getProviderState();
  let publishedDenyDocuments = providerState.publishedDenyDocuments;
  let catalogKey =
    effectiveServedCatalog ?? (publishedDenyDocuments.length > 0 ? publishedDenyDocuments : "seed");
  if (providerState.publishedRowNames?.catalog === catalogKey) return providerState.publishedRowNames.groups;
  let bundled = bundledCatalogDocument();
  let groups = mergeRowNameGroups(
    buildRowNameGroups([
      ...(effectiveServedCatalog === null ? [] : catalogModels(effectiveServedCatalog)),
      ...[...publishedDenyDocuments, ...(bundled === null ? [] : [bundled])].flatMap(listSurfaceModels),
    ]),
  );
  providerState.publishedRowNames = {
    catalog: catalogKey,
    groups,
  };
  return groups;
}
//@ chunk-exfmq47h.js:229319-229554 placement
function mergeRowNameGroups(rowNameGroups) {
  let byRowId = new Map();
  for (let group of rowNameGroups) {
    let existing = byRowId.get(group.rowId);
    if (existing === undefined) {
      byRowId.set(group.rowId, group);
      continue;
    }
    byRowId.set(group.rowId, {
      rowId: group.rowId,
      names: normalizeCaseForComparison_2([...existing.names, ...group.names]),
      families: normalizeCaseForComparison_2([...existing.families, ...group.families]),
    });
  }
  return [...byRowId.values()];
}
//@ chunk-exfmq47h.js:229554-229834 placement
function buildRowNameGroups(models) {
  return models
    .filter((model) => entryModelKey(model.id) === undefined)
    .map((model) => {
      let names = [model.id];
      for (let [key, value] of Object.entries(model.provider_ids ?? {})) {
        let modelId = value?.trim();
        if (modelId) {
          let variants = key === "bedrock" ? expandBedrockModelIdVariants(modelId) : [modelId];
          if (!variants.some(isKnownOrProfiledModel)) names.push(...variants);
        }
      }
      let rowFamily = getRowFamily(model);
      return {
        rowId: model.id,
        names,
        families: rowFamily === undefined ? [] : [rowFamily],
      };
    });
}
//@ chunk-exfmq47h.js:229834-229875 placement
/**
 * 判断该模型的任一传输形态 id 是否已知。
 */
function anyWireVariantKnown(modelId, provider) {
  return getProviderWireIdVariants(modelId, provider).some(isKnownCatalogModelId);
}
//@ chunk-exfmq47h.js:229875-229922 placement
function isKnownOrProfiledModel(modelId) {
  let normalized = normalizeModelId(modelId);
  return isKnownModelName(normalized) || isKnownCatalogOrBase(normalized);
}
//@ chunk-exfmq47h.js:229922-230122 placement
/**
 * 判断模型 id 是否为目录已知（内置、匹配模式、已知、覆盖值或设置映射）。
 */
function isKnownCatalogModelId(modelId) {
  let normalized = normalizeModelId(modelId);
  if (isKnownOrProfiledModel(modelId) || INFERENCE_PROFILE_PATH_RE.test(normalized)) return true;
  let modelKnowledge = getCatalogState().modelKnowledge;
  if (modelKnowledge === undefined) return false;
  return (
    modelKnowledge.isKnown(modelId) ||
    modelKnowledge.isKnown(normalized) ||
    modelKnowledge.isModelOverrideValue(normalized) ||
    modelKnowledge.settingsBehavesAs(normalized) !== undefined
  );
}
//@ chunk-exfmq47h.js:230122-230171 placement
var INFERENCE_PROFILE_PATH_RE = /(^|[:/])application-inference-profile\//;
//@ chunk-exfmq47h.js:230171-230264 placement
function isKnownCatalogOrBase(modelId) {
  if (catalogIdForProviderModelId(modelId) !== undefined) return true;
  let modelId_2 = parseModelId(modelId);
  return modelId_2 !== null && catalogIdForProviderModelId(modelId_2.base) !== undefined;
}
//@ chunk-exfmq47h.js:230264-230282 placement
/**
 * 惰性加载的语义版本库（require 互操作）。
 */
var legacyRequireInterop; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:230264", () => {
  legacyRequireInterop = __toESM(require_semver_3(), 1);
});
export {
  getPublishedRowNameGroups,
  legacyRequireInterop,
  toBedrockFoundationModelId,
  anyWireVariantKnown,
  pickProfileForFoundationModel,
  findCatalogRowIdByWireId,
};
