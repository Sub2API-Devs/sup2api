/**
 * utils/settings/managedPluginTiers.ts
 *
 * 托管插件层级（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q8cqcff6.js (12)
 * attribution: placement 12
 */
import { HostScoped } from "../hostScoped.js";
import { MdmSettingsLoader, EMPTY_MDM_RESULT } from "./mdm/settings.js";
import { getRootSession } from "../../bootstrap/state.js";
import { hasManagedSettingsCached } from "../../cli/headlessCloud/attachServe.js";

//@ chunk-q8cqcff6.js:9983-10039 placement
var Qt = "@builtin",
  Ii = ["prependPlugins", "appendPlugins"];
//@ chunk-q8cqcff6.js:10039-10110 placement
function Ni(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-q8cqcff6.js:10110-10135 placement
var Ci = new HostScoped(() => new MdmSettingsLoader());
//@ chunk-q8cqcff6.js:10135-10172 placement
function se() {
  return Ci.of(getRootSession().host);
}
//@ chunk-q8cqcff6.js:10172-10205 placement
function bi(e) {
  se().startLoad(e);
}
//@ chunk-q8cqcff6.js:10205-10280 placement
async function t1e() {
  let e = se();
  if (!e.loadPromise) bi();
  await e.loadPromise;
}
//@ chunk-q8cqcff6.js:10280-10320 placement
function One() {
  return Uyr(se()).mdm ?? EMPTY_MDM_RESULT;
}
//@ chunk-q8cqcff6.js:10320-10387 placement
function Uyr(e) {
  return e.whereAsked !== void 0 && hasManagedSettingsCached() ? e.whereAsked : e;
}
/**
 * 判断某个策略读取结果是否已有答复（无记录也视为已答复）。
 */
//@ chunk-q8cqcff6.js:10387-10487 placement
function isPolicyReadAnswered(e) {
  let readOutcomes = se().readOutcomes;
  if (readOutcomes === null) return !1;
  let r = readOutcomes[e];
  return r === null || r.answered;
}
//@ chunk-q8cqcff6.js:10487-10529 placement
function cIn(e) {
  se().readOutcomes = e ?? null;
}
//@ chunk-q8cqcff6.js:10529-10567 placement
function ave() {
  return se().mdm !== null;
}
//@ chunk-q8cqcff6.js:10567-10635 placement
function uIn() {
  let e = se();
  return e.loadPromise !== null && e.mdm === null;
}

export { t1e, ave, uIn, One, isPolicyReadAnswered, Uyr, cIn, se, Ii, Ni, Qt };
