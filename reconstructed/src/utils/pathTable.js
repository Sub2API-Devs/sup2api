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
import { identity } from "./identity.js";
import { pu } from "../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { freezeStringEntries, frozenToolTableEntry, JUi } from "./hooks/functionHookMatchers.js";

//@ chunk-stemcnjv.js:308-340 placement
var pathTableSlot = identity(pu(), (o) => o.set(null));
//@ chunk-stemcnjv.js:340-404 placement
/**
 * setPathTable：设置当前宿主的路径表（空值表示清零）。
 */
function setPathTable(toolAliases) {
  let t = toolAliases !== undefined && toolAliases !== null;
  pathTableSlot.set(t ? freezeStringEntries(toolAliases) : null);
}
//@ chunk-stemcnjv.js:404-466 placement
/**
 * getEventPathNames：取事件对应的可用路径名列表。
 */
function getEventPathNames(event) {
  return frozenToolTableEntry(event) !== undefined ? (pathTableSlot.get() ?? undefined) : undefined;
}
//@ chunk-stemcnjv.js:466-518 placement
function setEventTableEntries(o, t) {
  if (frozenToolTableEntry(o) !== undefined) pathTableSlot.set(t ?? null);
}
//@ chunk-stemcnjv.js:518-605 placement
/**
 * 查找路径表。
 */
function lookupPathTable(o) {
  let t = frozenToolTableEntry(o);
  let table = pathTableSlot.get() ?? JUi;
  return t === undefined
    ? undefined
    : {
        table,
        paths: t,
      };
}
export { setPathTable, lookupPathTable, getEventPathNames };
