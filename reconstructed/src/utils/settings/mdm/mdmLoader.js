/**
 * utils/settings/mdm/mdmLoader.ts
 *
 * 2.1.316 新增：MDM 托管设置加载器的宿主级状态、按需启动、读取结果与“是否已回答/加载中”判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q8cqcff6.js (10)
 * attribution: placement 10
 */
import { HostScoped } from "../../hostScoped.js";
import { MdmSettingsLoader, EMPTY_MDM_RESULT } from "./settings.js";
import { getRootSession } from "../../../bootstrap/state.js";
import { hasManagedSettingsCached } from "../../../cli/headlessCloud/attachServe.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-q8cqcff6.js:10110-10135 placement
var mdmLoaderSlot; // deferred: uses MdmSettingsLoader (./settings.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-q8cqcff6.js:10110", () => {
  mdmLoaderSlot = new HostScoped(() => new MdmSettingsLoader());
});
//@ chunk-q8cqcff6.js:10135-10172 placement
/**
 * mdmLoader：当前宿主的 MDM 加载器。
 */
function mdmLoader() {
  return mdmLoaderSlot.of(getRootSession().host);
}
//@ chunk-q8cqcff6.js:10172-10205 placement
function startMdmLoad(options) {
  mdmLoader().startLoad(options);
}
//@ chunk-q8cqcff6.js:10205-10280 placement
/**
 * ensureMdmLoaded：等待 MDM 加载完成。
 */
async function ensureMdmLoaded() {
  let loader = mdmLoader();
  if (!loader.loadPromise) startMdmLoad();
  await loader.loadPromise;
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
function withAskedWhere(snapshot) {
  return snapshot.whereAsked !== undefined && hasManagedSettingsCached() ? snapshot.whereAsked : snapshot;
}
//@ chunk-q8cqcff6.js:10387-10487 placement
/**
 * 判断某个策略读取结果是否已有答复（无记录也视为已答复）。
 */
function isPolicyReadAnswered(key) {
  let readOutcomes = mdmLoader().readOutcomes;
  if (readOutcomes === null) return false;
  let outcome = readOutcomes[key];
  return outcome === null || outcome.answered;
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
  let loader = mdmLoader();
  return loader.loadPromise !== null && loader.mdm === null;
}
export {
  ensureMdmLoaded,
  hasMdmResult,
  isMdmLoadInFlight,
  mdmResult,
  isPolicyReadAnswered,
  withAskedWhere,
  mdmLoader,
  setMdmReadOutcomes,
};
