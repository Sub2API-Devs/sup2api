/**
 * utils/model/modelErrorOverrides.ts
 *
 * 2.1.316 新增：模型错误覆盖
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vn3g7zt8.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isPlainObject } from "../isPlainObject.js";
import {
  getDynamicConfig_BLOCKS_ON_INIT,
  getDynamicConfig_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { getFamilyDefaults, isCatalogRowSelectable } from "./modelCatalog/catalogCapabilities.js";
import { MODEL_FAMILY_NAMES, catalogModels, isOverflowRow, getRowFamily } from "./providers.js";
import { modelIdentityKey } from "./modelCatalog/servedCatalog.js";
import { normalizeModelId } from "./modelCatalog/catalogEntries.js";

//@ chunk-vn3g7zt8.js:198791-198834 placement
var TENGU_MODEL_ERROR_OVERRIDES = "tengu-model-error-overrides";
var EMPTY_OVERRIDES = {};
//@ chunk-vn3g7zt8.js:198834-198866 placement
function plainObjectOrEmpty(value) {
  return isPlainObject(value) ? value : EMPTY_OVERRIDES;
}
//@ chunk-vn3g7zt8.js:198866-198982 placement
function getModelErrorOverride(overrides, modelKey) {
  if (typeof modelKey !== "string" || modelKey === "") return;
  let override = plainObjectOrEmpty(overrides)[modelKey];
  return typeof override === "object" && override !== null ? override : undefined;
}
//@ chunk-vn3g7zt8.js:198982-199045 placement
/**
 * 异步取动态配置中该模型的阻断说明文本。
 */
async function blockedOverrideText(modelKey) {
  let overrides = await getDynamicConfig_BLOCKS_ON_INIT(TENGU_MODEL_ERROR_OVERRIDES, EMPTY_OVERRIDES);
  return blockTextFromOverride(getModelErrorOverride(overrides, modelKey));
}
//@ chunk-vn3g7zt8.js:199045-199080 placement
function blockTextFromOverride(modelErrorOverride) {
  return trimmedNonEmptyOrNull(modelErrorOverride?.block);
}
//@ chunk-vn3g7zt8.js:199080-199177 placement
/**
 * 取该模型的错误覆盖：pickerHint 优先，其次 block；都没有返回 null。
 */
function pickerHintFromOverride(modelKey) {
  let modelErrorOverride = getModelErrorOverride(
    getDynamicConfig_CACHED_MAY_BE_STALE(TENGU_MODEL_ERROR_OVERRIDES, EMPTY_OVERRIDES),
    modelKey,
  );
  let blockText = blockTextFromOverride(modelErrorOverride);
  if (blockText === null) return null;
  return trimmedNonEmptyOrNull(modelErrorOverride?.pickerHint) ?? blockText;
}
//@ chunk-vn3g7zt8.js:199177-199263 placement
function trimmedNonEmptyOrNull(value) {
  if (typeof value !== "string") return null;
  let trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
//@ chunk-vn3g7zt8.js:199263-199685 placement
/**
 * 把目录中的模型整理为去重的行（served 来源时可用行在前），每行带来源、规范 key、是否可选、族名与别名族。
 */
function buildCatalogRows({ catalog, provenance }) {
  let rows = [];
  let seen = new Set();
  let claimKey = (key) => {
    if (key === "" || seen.has(key)) return false;
    seen.add(key);
    return true;
  };
  let familyDefaults = getFamilyDefaults(catalog);
  let aliasFamilyByIdentity = new Map();
  for (let family of MODEL_FAMILY_NAMES) {
    let defaultModel = familyDefaults[family];
    if (defaultModel !== undefined) aliasFamilyByIdentity.set(modelIdentityKey(defaultModel), family);
  }
  let models = catalogModels(catalog);
  let ordered =
    provenance === "served"
      ? [...models.filter((model) => !isOverflowRow(model)), ...models.filter(isOverflowRow)]
      : models;
  for (let row of ordered) {
    let key = normalizeModelId(row.id);
    if (!claimKey(key)) continue;
    rows.push({
      provenance,
      key,
      row,
      selectable: isCatalogRowSelectable(catalog, row),
      family: getRowFamily(row),
      aliasFamily: aliasFamilyByIdentity.get(modelIdentityKey(row.id)),
    });
  }
  return rows;
}
//@ chunk-vn3g7zt8.js:199685-199755 placement
/**
 * 列出可选的目录行 id。
 */
function selectableRowIds(registry) {
  return buildCatalogRows(registry).flatMap((entry) => (entry.selectable ? [entry.row.id] : []));
}
//@ chunk-vn3g7zt8.js:199755-199838 placement
/**
 * 列出可选且非 overflow 分区的行 id。
 */
function selectableNonOverflowRowIds(registry) {
  return buildCatalogRows(registry).flatMap((entry) =>
    entry.selectable && !isOverflowRow(entry.row) ? [entry.row.id] : [],
  );
}
//@ chunk-vn3g7zt8.js:199838-200005 placement
/**
 * 见同句首个绑定的说明。
 */
var SONNET_SLOGAN = "Efficient for routine tasks";
var OPUS_SLOGAN = "Best for everyday, complex tasks";
var HAIKU_SLOGAN = "Fastest for quick answers";
var FABLE_SLOGAN = "Most capable for your hardest and longest-running tasks";
export {
  blockedOverrideText,
  selectableRowIds,
  selectableNonOverflowRowIds,
  SONNET_SLOGAN,
  OPUS_SLOGAN,
  FABLE_SLOGAN,
  HAIKU_SLOGAN,
  buildCatalogRows,
  pickerHintFromOverride,
};
