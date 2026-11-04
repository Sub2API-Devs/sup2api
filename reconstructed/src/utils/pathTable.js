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
import { subscribe } from "../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import {
  freezeStringEntries,
  frozenToolTableEntry,
  EMPTY_MATCHER_TABLE,
} from "./hooks/functionHookMatchers.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-stemcnjv.js:308-340 placement
var pathTableSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-stemcnjv.js:308", () => {
  pathTableSlot = identity(subscribe(), (state) => state.set(null));
});
//@ chunk-stemcnjv.js:340-404 placement
/**
 * setPathTable：设置当前宿主的路径表（空值表示清零）。
 */
function setPathTable(table) {
  let hasAliases = table !== undefined && table !== null;
  pathTableSlot.set(hasAliases ? freezeStringEntries(table) : null);
}
//@ chunk-stemcnjv.js:404-466 placement
/**
 * getEventPathNames：取事件对应的可用路径名列表。
 */
function getEventPathNames(toolName) {
  return frozenToolTableEntry(toolName) !== undefined ? (pathTableSlot.get() ?? undefined) : undefined;
}
//@ chunk-stemcnjv.js:466-518 placement
function setEventTableEntries(toolName, entries) {
  if (frozenToolTableEntry(toolName) !== undefined) pathTableSlot.set(entries ?? null);
}
//@ chunk-stemcnjv.js:518-605 placement
/**
 * 查找路径表。
 */
function lookupPathTable(toolName) {
  let paths = frozenToolTableEntry(toolName);
  let table = pathTableSlot.get() ?? EMPTY_MATCHER_TABLE;
  return paths === undefined
    ? undefined
    : {
        table,
        paths,
      };
}
export { setPathTable, lookupPathTable, getEventPathNames, setEventTableEntries };
