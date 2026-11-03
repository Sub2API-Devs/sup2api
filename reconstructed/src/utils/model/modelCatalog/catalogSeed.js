/**
 * utils/model/modelCatalog/catalogSeed.ts
 *
 * 2.1.316 新增：模型目录种子数据（Bedrock 等提供商 id）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (13)
 * attribution: placement 13
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
import { getProviderWireIdVariants } from "../../betas.js";
import { normalizeModelId } from "./catalogEntries.js";
import { BEDROCK_REGION_PREFIXES } from "../bedrock.js";
import { uniq } from "../../collections.js";
import { isKnownModelName } from "../knownModelNames.js";
import { parseModelId } from "../modelIds.js";
import { Re } from "../../../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../../../vendor/semver/index.js";

//@ chunk-aepeg2w5.js:218511-219037 placement
/**
 * 非 firstParty/gateway 提供商下，按模型目录把各行的线上模型 id（含 Bedrock 区域前缀变体）映射回目录行 id，带缓存。
 */
function findCatalogRowIdByWireId(e, { provider, generation, wireIdOf }) {
  if (isCatalogSurfaceBackend(provider)) return;
  let effectiveServedCatalog = getEffectiveServedCatalog();
  if (effectiveServedCatalog === null) return;
  let providerState = getProviderState();
  let w = getCatalogState().modelKnowledge?.settingsGeneration();
  let publishedWireIds = providerState.publishedWireIds;
  if (
    publishedWireIds?.catalog !== effectiveServedCatalog ||
    publishedWireIds.generation !== generation ||
    publishedWireIds.settingsGeneration !== w
  ) {
    let x = new Map();
    publishedWireIds = {
      catalog: effectiveServedCatalog,
      generation,
      settingsGeneration: w,
      rowIdByWireId: x,
    };
    providerState.publishedWireIds = publishedWireIds;
    for (let P of catalogModels(effectiveServedCatalog)) {
      if (entryModelKey(P.id) !== undefined) continue;
      let F = wireIdOf(P);
      if (F === undefined) continue;
      for (let L of getProviderWireIdVariants(F, provider)) {
        let G = normalizeModelId(L);
        if (!x.has(G) && !isKnownCatalogModelId(L)) x.set(G, P.id);
      }
    }
  }
  return publishedWireIds.rowIdByWireId.get(normalizeModelId(e));
}
//@ chunk-aepeg2w5.js:219085-219259 placement = isFoundationModel (1)
/**
 * 去掉合法区域前缀得到 "anthropic.<…>"，非 Bedrock 形式返回 undefined。旧版名 isFoundationModel_2 为错配。
 */
function toBedrockFoundationModelId(modelId) {
  let [, n, r] = /^(?:([A-Za-z-]+)\.)?anthropic\.(.+)$/i.exec(modelId) ?? [];
  if (r === undefined) return;
  if (n !== undefined && !BEDROCK_REGION_PREFIXES.includes(n.toLowerCase())) return;
  return `anthropic.${r}`;
}
//@ chunk-aepeg2w5.js:219259-219424 placement
/**
 * 在候选 id 中找同一基础模型，优先给定前缀。
 */
function pickProfileForFoundationModel(e, n, r) {
  let lower = e.toLowerCase();
  let h = `${r}.`;
  let y;
  for (let S of n) {
    if (toBedrockFoundationModelId(S)?.toLowerCase() !== lower) continue;
    if (S.toLowerCase().startsWith(h)) return S;
    y ??= S;
  }
  return y;
}
//@ chunk-aepeg2w5.js:219424-219514 placement
/**
 * 基础模型 id 及其全部区域前缀变体。
 */
function expandBedrockModelIdVariants(e) {
  let bedrockFoundationModelId = toBedrockFoundationModelId(e);
  if (bedrockFoundationModelId === undefined) return [e];
  return [
    bedrockFoundationModelId,
    ...BEDROCK_REGION_PREFIXES.map((r) => `${r}.${bedrockFoundationModelId}`),
  ];
}
//@ chunk-aepeg2w5.js:219514-219806 placement
/**
 * 获取已发布目录的行名分组（按目录缓存），用于拒绝规则匹配。
 */
function getPublishedRowNameGroups() {
  let effectiveServedCatalog = getEffectiveServedCatalog();
  let providerState = getProviderState();
  let publishedDenyDocuments = providerState.publishedDenyDocuments;
  let s = effectiveServedCatalog ?? (publishedDenyDocuments.length > 0 ? publishedDenyDocuments : "seed");
  if (providerState.publishedRowNames?.catalog === s) return providerState.publishedRowNames.groups;
  let h = bundledCatalogDocument();
  let y = mergeRowNameGroups(
    buildRowNameGroups([
      ...(effectiveServedCatalog === null ? [] : catalogModels(effectiveServedCatalog)),
      ...[...publishedDenyDocuments, ...(h === null ? [] : [h])].flatMap(listSurfaceModels),
    ]),
  );
  providerState.publishedRowNames = {
    catalog: s,
    groups: y,
  };
  return y;
}
//@ chunk-aepeg2w5.js:219806-220041 placement
function mergeRowNameGroups(rowNameGroups) {
  let n = new Map();
  for (let r of rowNameGroups) {
    let s = n.get(r.rowId);
    if (s === undefined) {
      n.set(r.rowId, r);
      continue;
    }
    n.set(r.rowId, {
      rowId: r.rowId,
      names: uniq([...s.names, ...r.names]),
      families: uniq([...s.families, ...r.families]),
    });
  }
  return [...n.values()];
}
//@ chunk-aepeg2w5.js:220041-220321 placement
function buildRowNameGroups(e) {
  return e
    .filter((n) => entryModelKey(n.id) === undefined)
    .map((n) => {
      let r = [n.id];
      for (let [key, value] of Object.entries(n.provider_ids ?? {})) {
        let trimmed = value?.trim();
        if (trimmed) {
          let w = key === "bedrock" ? expandBedrockModelIdVariants(trimmed) : [trimmed];
          if (!w.some(isKnownOrProfiledModel)) r.push(...w);
        }
      }
      let rowFamily = getRowFamily(n);
      return {
        rowId: n.id,
        names: r,
        families: rowFamily === undefined ? [] : [rowFamily],
      };
    });
}
//@ chunk-aepeg2w5.js:220321-220362 placement
/**
 * 判断该模型的任一传输形态 id 是否已知。
 */
function anyWireVariantKnown(e, apiProvider) {
  return getProviderWireIdVariants(e, apiProvider).some(isKnownCatalogModelId);
}
//@ chunk-aepeg2w5.js:220362-220409 placement
function isKnownOrProfiledModel(e) {
  let n = normalizeModelId(e);
  return isKnownModelName(n) || isKnownCatalogOrBase(n);
}
//@ chunk-aepeg2w5.js:220409-220609 placement
/**
 * 判断模型 id 是否为目录已知（内置、匹配模式、已知、覆盖值或设置映射）。
 */
function isKnownCatalogModelId(e) {
  let n = normalizeModelId(e);
  if (isKnownOrProfiledModel(e) || INFERENCE_PROFILE_PATH_RE.test(n)) return true;
  let modelKnowledge = getCatalogState().modelKnowledge;
  if (modelKnowledge === undefined) return false;
  return (
    modelKnowledge.isKnown(e) ||
    modelKnowledge.isKnown(n) ||
    modelKnowledge.isModelOverrideValue(n) ||
    modelKnowledge.settingsBehavesAs(n) !== undefined
  );
}
//@ chunk-aepeg2w5.js:220609-220658 placement
var INFERENCE_PROFILE_PATH_RE = /(^|[:/])application-inference-profile\//;
//@ chunk-aepeg2w5.js:220658-220749 placement
function isKnownCatalogOrBase(e) {
  if (catalogIdForProviderModelId(e) !== undefined) return true;
  let modelId = parseModelId(e);
  return modelId !== null && catalogIdForProviderModelId(modelId.base) !== undefined;
}
//@ chunk-aepeg2w5.js:220749-220767 placement
/**
 * 惰性加载的语义版本库（require 互操作）。
 */
var legacyRequireInterop = Re(require_semver_3(), 1);
export {
  getPublishedRowNameGroups,
  expandBedrockModelIdVariants,
  legacyRequireInterop,
  toBedrockFoundationModelId,
  anyWireVariantKnown,
  pickProfileForFoundationModel,
  findCatalogRowIdByWireId,
};
