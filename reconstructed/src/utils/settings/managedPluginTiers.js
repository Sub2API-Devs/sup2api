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
/**
 * BUILTIN_PLUGIN_TIER：内置插件层级标记；PLUGIN_ORDER_KEYS：插件顺序设置键（同一声明共 2 个绑定）。
 */
var BUILTIN_PLUGIN_TIER = "@builtin";
var PLUGIN_ORDER_KEYS = ["prependPlugins", "appendPlugins"];
//@ chunk-q8cqcff6.js:10039-10110 placement
/**
 * isPlainRecord：非 null 非数组的对象。
 */
function isPlainRecord(enabledPlugins) {
  return typeof enabledPlugins === "object" && enabledPlugins !== null && !Array.isArray(enabledPlugins);
}
//@ chunk-q8cqcff6.js:10110-10135 placement
var mdmLoaderSlot = new HostScoped(() => new MdmSettingsLoader());
//@ chunk-q8cqcff6.js:10135-10172 placement
/**
 * mdmLoader：当前宿主的 MDM 加载器。
 */
function mdmLoader() {
  return mdmLoaderSlot.of(getRootSession().host);
}
//@ chunk-q8cqcff6.js:10172-10205 placement
function startMdmLoad(e) {
  mdmLoader().startLoad(e);
}
//@ chunk-q8cqcff6.js:10205-10280 placement
/**
 * ensureMdmLoaded：等待 MDM 加载完成。
 */
async function ensureMdmLoaded() {
  let e = mdmLoader();
  if (!e.loadPromise) startMdmLoad();
  await e.loadPromise;
}
//@ chunk-q8cqcff6.js:10280-10320 placement
/**
 * mdmResult：MDM 加载结果。
 */
function mdmResult() {
  return withAskedWhere(mdmLoader()).mdm ?? EMPTY_MDM_RESULT;
}
//@ chunk-q8cqcff6.js:10320-10387 placement
/**
 * withAskedWhere：已询问过托管设置时保留提问位置。
 */
function withAskedWhere(e) {
  return e.whereAsked !== undefined && hasManagedSettingsCached() ? e.whereAsked : e;
}
//@ chunk-q8cqcff6.js:10387-10487 placement
/**
 * 判断某个策略读取结果是否已有答复（无记录也视为已答复）。
 */
function isPolicyReadAnswered(e) {
  let readOutcomes = mdmLoader().readOutcomes;
  if (readOutcomes === null) return false;
  let r = readOutcomes[e];
  return r === null || r.answered;
}
//@ chunk-q8cqcff6.js:10487-10529 placement
/**
 * setMdmReadOutcomes：记录 MDM 读取结果。
 */
function setMdmReadOutcomes(readOutcomes) {
  mdmLoader().readOutcomes = readOutcomes ?? null;
}
//@ chunk-q8cqcff6.js:10529-10567 placement
/**
 * hasMdmResult：是否已有 MDM 结果。
 */
function hasMdmResult() {
  return mdmLoader().mdm !== null;
}
//@ chunk-q8cqcff6.js:10567-10635 placement
/**
 * isMdmLoadInFlight：MDM 加载进行中。
 */
function isMdmLoadInFlight() {
  let e = mdmLoader();
  return e.loadPromise !== null && e.mdm === null;
}
export {
  ensureMdmLoaded,
  hasMdmResult,
  isMdmLoadInFlight,
  mdmResult,
  isPolicyReadAnswered,
  withAskedWhere,
  setMdmReadOutcomes,
  mdmLoader,
  PLUGIN_ORDER_KEYS,
  isPlainRecord,
  BUILTIN_PLUGIN_TIER,
};
