/**
 * utils/plugins/functionHooks/admission.ts
 *
 * 2.1.316 新增。函数钩子准入。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0e3nf8ec.js (3)
 * attribution: placement 3
 */
import { createValueSlot } from "../../valueSlot.js";
import { getPluginRegistry } from "../pluginLoadState.js";
import { isOfficialMarketplaceRef, hasSimilarMarketplaceRef } from "../marketplaceNames.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-0e3nf8ec.js:336-349 placement
/**
 * moduleAdmissionCache：模块准入缓存。
 */
var moduleAdmissionCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0e3nf8ec.js:336", () => {
  moduleAdmissionCache = createValueSlot();
});
//@ chunk-0e3nf8ec.js:349-362 placement
/**
 * moduleAdmissionCacheB：模块准入缓存（第二个）。
 */
var moduleAdmissionCacheB; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0e3nf8ec.js:349", () => {
  moduleAdmissionCacheB = createValueSlot();
});
//@ chunk-0e3nf8ec.js:362-552 placement
/**
 * 插件模块是否已获准入（同一准入文本下判定过、官方、已封存或不在拦截名单）。
 */
function isModuleAdmitted(loadedPlugin) {
  let admissionText = getPluginRegistry().admissionText;
  if ((loadedPlugin.judgedUnder ?? null) === admissionText) return true;
  let pluginStorageId = loadedPlugin.args.pluginStorageId;
  return (
    isOfficialMarketplaceRef(pluginStorageId) ||
    (loadedPlugin.args.sealed === true && moduleAdmissionCacheB.get()?.(pluginStorageId) === true) ||
    !hasSimilarMarketplaceRef(pluginStorageId, moduleAdmissionCache.get()?.() ?? null)
  );
}
export { isModuleAdmitted, moduleAdmissionCache, moduleAdmissionCacheB };
