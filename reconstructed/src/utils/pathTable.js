/**
 * utils/pathTable.ts
 *
 * 2.1.316 新增：查找路径表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-stemcnjv.js (5)
 * attribution: placement 5
 */
import { ge } from "./identity.js";
import { pu } from "../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { XUi, Eos, freeze } from "./hooks/functionHookMatchers.js";

//@ chunk-stemcnjv.js:308-340 placement
var e = ge(pu(), (o) => o.set(null));
//@ chunk-stemcnjv.js:340-404 placement
function VUi(o) {
  let t = o !== void 0 && o !== null;
  e.set(t ? XUi(o) : null);
}
//@ chunk-stemcnjv.js:404-466 placement
function qUi(o) {
  return Eos(o) !== void 0 ? (e.get() ?? void 0) : void 0;
}
//@ chunk-stemcnjv.js:466-518 placement
function YUi(o, t) {
  if (Eos(o) !== void 0) e.set(t ?? null);
}
/**
 * 查找路径表。
 */
//@ chunk-stemcnjv.js:518-605 placement
function lookupPathTable(o) {
  let t = Eos(o),
    m = e.get() ?? freeze;
  return t === void 0 ? void 0 : { table: m, paths: t };
}

export { VUi, lookupPathTable, qUi };
