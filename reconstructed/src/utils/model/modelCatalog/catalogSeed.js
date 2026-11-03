/**
 * utils/model/modelCatalog/catalogSeed.ts
 *
 * 2.1.316 新增：模型目录种子数据（Bedrock 等提供商 id）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (12)
 * attribution: placement 12
 */
import { BEDROCK_REGION_PREFIXES } from "../bedrock.js";
import { getEffectiveServedCatalog, kCn, listSurfaceModels, Yte } from "./servedCatalog.js";
import { getProviderState } from "../providerCaches.js";
import { catalogModels, getRowFamily } from "../providers.js";
import { uniq } from "../../collections.js";
import { getProviderWireIdVariants } from "../../betas.js";
import { normalizeModelId } from "./catalogEntries.js";
import { isKnownModelName } from "../knownModelNames.js";
import { getCatalogState, catalogIdForProviderModelId } from "../modelCatalog.js";
import { parseModelId } from "../modelIds.js";
import { Re } from "../../../../runtime/bun-runtime.js";
import { Vy } from "../../../../vendor/semver/index.js";

/**
 * 去掉合法区域前缀得到 "anthropic.<…>"，非 Bedrock 形式返回 undefined。旧版名 isFoundationModel_2 为错配。
 */
//@ chunk-aepeg2w5.js:219085-219259 placement = isFoundationModel (1)
function toBedrockFoundationModelId(modelId) {
  let [, n, r] = /^(?:([A-Za-z-]+)\.)?anthropic\.(.+)$/i.exec(modelId) ?? [];
  if (r === void 0) return;
  if (n !== void 0 && !BEDROCK_REGION_PREFIXES.includes(n.toLowerCase())) return;
  return `anthropic.${r}`;
}
/**
 * 在候选 id 中找同一基础模型，优先给定前缀。
 */
//@ chunk-aepeg2w5.js:219259-219424 placement
function pickProfileForFoundationModel(e, n, r) {
  let lower = e.toLowerCase(),
    h = `${r}.`,
    y;
  for (let S of n) {
    if (toBedrockFoundationModelId(S)?.toLowerCase() !== lower) continue;
    if (S.toLowerCase().startsWith(h)) return S;
    y ??= S;
  }
  return y;
}
/**
 * 基础模型 id 及其全部区域前缀变体。
 */
//@ chunk-aepeg2w5.js:219424-219514 placement
function expandBedrockModelIdVariants(e) {
  let n = toBedrockFoundationModelId(e);
  if (n === void 0) return [e];
  return [n, ...BEDROCK_REGION_PREFIXES.map((r) => `${r}.${n}`)];
}
/**
 * 获取已发布目录的行名分组（按目录缓存），用于拒绝规则匹配。
 */
//@ chunk-aepeg2w5.js:219514-219806 placement
function getPublishedRowNameGroups() {
  let e = getEffectiveServedCatalog(),
    n = getProviderState(),
    publishedDenyDocuments = n.publishedDenyDocuments,
    s = e ?? (publishedDenyDocuments.length > 0 ? publishedDenyDocuments : "seed");
  if (n.publishedRowNames?.catalog === s) return n.publishedRowNames.groups;
  let h = kCn(),
    y = mergeRowNameGroups(
      buildRowNameGroups([
        ...(e === null ? [] : catalogModels(e)),
        ...[...publishedDenyDocuments, ...(h === null ? [] : [h])].flatMap(listSurfaceModels),
      ]),
    );
  return ((n.publishedRowNames = { catalog: s, groups: y }), y);
}
//@ chunk-aepeg2w5.js:219806-220041 placement
function mergeRowNameGroups(e) {
  let n = new Map();
  for (let r of e) {
    let s = n.get(r.rowId);
    if (s === void 0) {
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
    .filter((n) => Yte(n.id) === void 0)
    .map((n) => {
      let r = [n.id];
      for (let [h, y] of Object.entries(n.provider_ids ?? {})) {
        let S = y?.trim();
        if (S) {
          let w = h === "bedrock" ? expandBedrockModelIdVariants(S) : [S];
          if (!w.some(Cb)) r.push(...w);
        }
      }
      let s = getRowFamily(n);
      return { rowId: n.id, names: r, families: s === void 0 ? [] : [s] };
    });
}
//@ chunk-aepeg2w5.js:220321-220362 placement
function Tb(e, n) {
  return getProviderWireIdVariants(e, n).some(isKnownCatalogModelId);
}
//@ chunk-aepeg2w5.js:220362-220409 placement
function Cb(e) {
  let n = normalizeModelId(e);
  return isKnownModelName(n) || TN(n);
}
/**
 * 判断模型 id 是否为目录已知（内置、匹配模式、已知、覆盖值或设置映射）。
 */
//@ chunk-aepeg2w5.js:220409-220609 placement
function isKnownCatalogModelId(e) {
  let n = normalizeModelId(e);
  if (Cb(e) || AN.test(n)) return !0;
  let modelKnowledge = getCatalogState().modelKnowledge;
  if (modelKnowledge === void 0) return !1;
  return (
    modelKnowledge.isKnown(e) ||
    modelKnowledge.isKnown(n) ||
    modelKnowledge.isModelOverrideValue(n) ||
    modelKnowledge.settingsBehavesAs(n) !== void 0
  );
}
//@ chunk-aepeg2w5.js:220609-220658 placement
var AN = /(^|[:/])application-inference-profile\//;
//@ chunk-aepeg2w5.js:220658-220749 placement
function TN(e) {
  if (catalogIdForProviderModelId(e) !== void 0) return !0;
  let n = parseModelId(e);
  return n !== null && catalogIdForProviderModelId(n.base) !== void 0;
}
//@ chunk-aepeg2w5.js:220749-220767 placement
var xb = Re(Vy(), 1);

export {
  getPublishedRowNameGroups,
  isKnownCatalogModelId,
  expandBedrockModelIdVariants,
  xb,
  toBedrockFoundationModelId,
  Tb,
  pickProfileForFoundationModel,
};
