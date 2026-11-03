/**
 * utils/model/modelErrorOverrides.ts
 *
 * 2.1.316 新增：模型错误覆盖
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (11)
 * attribution: placement 11
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

//@ chunk-hwmsct5x.js:198401-198444 placement
var TENGU_MODEL_ERROR_OVERRIDES = "tengu-model-error-overrides";
var EMPTY_OVERRIDES = {};
//@ chunk-hwmsct5x.js:198444-198476 placement
function plainObjectOrEmpty(e) {
  return isPlainObject(e) ? e : EMPTY_OVERRIDES;
}
//@ chunk-hwmsct5x.js:198476-198592 placement
function getModelErrorOverride(e, n) {
  if (typeof n !== "string" || n === "") return;
  let r = plainObjectOrEmpty(e)[n];
  return typeof r === "object" && r !== null ? r : undefined;
}
//@ chunk-hwmsct5x.js:198592-198655 placement
/**
 * 异步取动态配置中该模型的阻断说明文本。
 */
async function blockedOverrideText(previousRequestId) {
  let dynamicConfig_BLOCKS_ON_INIT = await getDynamicConfig_BLOCKS_ON_INIT(
    TENGU_MODEL_ERROR_OVERRIDES,
    EMPTY_OVERRIDES,
  );
  return blockTextFromOverride(getModelErrorOverride(dynamicConfig_BLOCKS_ON_INIT, previousRequestId));
}
//@ chunk-hwmsct5x.js:198655-198690 placement
function blockTextFromOverride(modelErrorOverride) {
  return trimmedNonEmptyOrNull(modelErrorOverride?.block);
}
//@ chunk-hwmsct5x.js:198690-198787 placement
/**
 * 取该模型的错误覆盖：pickerHint 优先，其次 block；都没有返回 null。
 */
function pickerHintFromOverride(canonicalName) {
  let modelErrorOverride = getModelErrorOverride(
    getDynamicConfig_CACHED_MAY_BE_STALE(TENGU_MODEL_ERROR_OVERRIDES, EMPTY_OVERRIDES),
    canonicalName,
  );
  let r = blockTextFromOverride(modelErrorOverride);
  if (r === null) return null;
  return trimmedNonEmptyOrNull(modelErrorOverride?.pickerHint) ?? r;
}
//@ chunk-hwmsct5x.js:198787-198873 placement
function trimmedNonEmptyOrNull(e) {
  if (typeof e !== "string") return null;
  let trimmed = e.trim();
  return trimmed === "" ? null : trimmed;
}
//@ chunk-hwmsct5x.js:198873-199295 placement
/**
 * 把目录中的模型整理为去重的行（served 来源时可用行在前），每行带来源、规范 key、是否可选、族名与别名族。
 */
function buildCatalogRows({ catalog, provenance }) {
  let r = [];
  let s = new Set();
  let h = (R) => {
    if (R === "" || s.has(R)) return false;
    s.add(R);
    return true;
  };
  let familyDefaults = getFamilyDefaults(catalog);
  let w = new Map();
  for (let R of MODEL_FAMILY_NAMES) {
    let L = familyDefaults[R];
    if (L !== undefined) w.set(modelIdentityKey(L), R);
  }
  let S = catalogModels(catalog);
  let E = provenance === "served" ? [...S.filter((R) => !isOverflowRow(R)), ...S.filter(isOverflowRow)] : S;
  for (let R of E) {
    let L = normalizeModelId(R.id);
    if (!h(L)) continue;
    r.push({
      provenance,
      key: L,
      row: R,
      selectable: isCatalogRowSelectable(catalog, R),
      family: getRowFamily(R),
      aliasFamily: w.get(modelIdentityKey(R.id)),
    });
  }
  return r;
}
//@ chunk-hwmsct5x.js:199295-199365 placement
/**
 * 列出可选的目录行 id。
 */
function selectableRowIds(e) {
  return buildCatalogRows(e).flatMap((n) => (n.selectable ? [n.row.id] : []));
}
//@ chunk-hwmsct5x.js:199365-199448 placement
/**
 * 列出可选且非 overflow 分区的行 id。
 */
function selectableNonOverflowRowIds(e) {
  return buildCatalogRows(e).flatMap((n) => (n.selectable && !isOverflowRow(n.row) ? [n.row.id] : []));
}
//@ chunk-hwmsct5x.js:199448-199615 placement
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
