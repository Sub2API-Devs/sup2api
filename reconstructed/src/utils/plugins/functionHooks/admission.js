/**
 * utils/plugins/functionHooks/admission.ts
 *
 * 2.1.316 新增。函数钩子准入。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ess9gkz3.js (3)
 * attribution: placement 3
 */
import { to } from "../../valueSlot.js";
import { getPluginRegistry } from "../pluginLoadState.js";
import { isOfficialMarketplaceRef } from "../marketplaceNames.js";
import { cpr } from "../../permissions/permissions.js";

//@ chunk-ess9gkz3.js:336-349 placement
var R6r = to();
//@ chunk-ess9gkz3.js:349-362 placement
var x6r = to();
/**
 * 插件模块是否已获准入（同一准入文本下判定过、官方、已封存或不在拦截名单）。
 */
//@ chunk-ess9gkz3.js:362-552 placement
function isModuleAdmitted(o) {
  let admissionText = getPluginRegistry().admissionText;
  if ((o.judgedUnder ?? null) === admissionText) return !0;
  let pluginStorageId = o.args.pluginStorageId;
  return (
    isOfficialMarketplaceRef(pluginStorageId) ||
    (o.args.sealed === !0 && x6r.get()?.(pluginStorageId) === !0) ||
    !cpr(pluginStorageId, R6r.get()?.() ?? null)
  );
}

export { isModuleAdmitted, R6r, x6r };
