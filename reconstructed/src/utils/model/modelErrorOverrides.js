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
import { a6e, catalogModels, ato, getRowFamily } from "./providers.js";
import { Bae } from "./modelCatalog/servedCatalog.js";
import { normalizeModelId } from "./modelCatalog/catalogEntries.js";

//@ chunk-hwmsct5x.js:198401-198444 placement
var TENGU_MODEL_ERROR_OVERRIDES = "tengu-model-error-overrides",
  Xa = {};
//@ chunk-hwmsct5x.js:198444-198476 placement
function M_(e) {
  return isPlainObject(e) ? e : Xa;
}
//@ chunk-hwmsct5x.js:198476-198592 placement
function getModelErrorOverride(e, n) {
  if (typeof n !== "string" || n === "") return;
  let r = M_(e)[n];
  return typeof r === "object" && r !== null ? r : void 0;
}
//@ chunk-hwmsct5x.js:198592-198655 placement
async function oci(e) {
  let n = await getDynamicConfig_BLOCKS_ON_INIT(TENGU_MODEL_ERROR_OVERRIDES, Xa);
  return rc(getModelErrorOverride(n, e));
}
//@ chunk-hwmsct5x.js:198655-198690 placement
function rc(e) {
  return sc(e?.block);
}
//@ chunk-hwmsct5x.js:198690-198787 placement
function oc(e) {
  let n = getModelErrorOverride(getDynamicConfig_CACHED_MAY_BE_STALE(TENGU_MODEL_ERROR_OVERRIDES, Xa), e),
    r = rc(n);
  if (r === null) return null;
  return sc(n?.pickerHint) ?? r;
}
//@ chunk-hwmsct5x.js:198787-198873 placement
function sc(e) {
  if (typeof e !== "string") return null;
  let trimmed = e.trim();
  return trimmed === "" ? null : trimmed;
}
/**
 * 把目录中的模型整理为去重的行（served 来源时可用行在前），每行带来源、规范 key、是否可选、族名与别名族。
 */
//@ chunk-hwmsct5x.js:198873-199295 placement
function buildCatalogRows({ catalog: catalog, provenance: provenance }) {
  let r = [],
    s = new Set(),
    h = (R) => {
      if (R === "" || s.has(R)) return !1;
      return (s.add(R), !0);
    },
    y = getFamilyDefaults(catalog),
    w = new Map();
  for (let R of a6e) {
    let L = y[R];
    if (L !== void 0) w.set(Bae(L), R);
  }
  let S = catalogModels(catalog),
    E = provenance === "served" ? [...S.filter((R) => !ato(R)), ...S.filter(ato)] : S;
  for (let R of E) {
    let L = normalizeModelId(R.id);
    if (!h(L)) continue;
    r.push({
      provenance: provenance,
      key: L,
      row: R,
      selectable: isCatalogRowSelectable(catalog, R),
      family: getRowFamily(R),
      aliasFamily: w.get(Bae(R.id)),
    });
  }
  return r;
}
//@ chunk-hwmsct5x.js:199295-199365 placement
function sci(e) {
  return buildCatalogRows(e).flatMap((n) => (n.selectable ? [n.row.id] : []));
}
//@ chunk-hwmsct5x.js:199365-199448 placement
function ici(e) {
  return buildCatalogRows(e).flatMap((n) => (n.selectable && !ato(n.row) ? [n.row.id] : []));
}
/**
 * 见同句首个绑定的说明。
 */
//@ chunk-hwmsct5x.js:199448-199615 placement
var SONNET_SLOGAN = "Efficient for routine tasks",
  OPUS_SLOGAN = "Best for everyday, complex tasks",
  HAIKU_SLOGAN = "Fastest for quick answers",
  FABLE_SLOGAN = "Most capable for your hardest and longest-running tasks";

export { oci, sci, ici, SONNET_SLOGAN, OPUS_SLOGAN, FABLE_SLOGAN, HAIKU_SLOGAN, buildCatalogRows, oc };
