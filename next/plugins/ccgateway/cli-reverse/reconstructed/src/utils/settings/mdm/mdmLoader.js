/**
 * utils/settings/mdm/mdmLoader.ts
 *
 * 2.1.316 新增：MDM 托管设置加载器的宿主级状态、按需启动、读取结果与“是否已回答/加载中”判定。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5fn9rb8r.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { HostScoped } from "../../hostScoped.js";
import { MdmSettingsLoader, EMPTY_MDM_RESULT } from "./settings.js";
import { getRootSession } from "../../../bootstrap/state.js";
import { hasManagedSettingsCached } from "../../../cli/headlessCloud/attachServe.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-5fn9rb8r.js:10353-10378 placement
var mdmLoaderSlot; // deferred: uses MdmSettingsLoader (./settings.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5fn9rb8r.js:10353", () => {
  mdmLoaderSlot = new HostScoped(() => new MdmSettingsLoader());
});
//@ chunk-5fn9rb8r.js:10378-10415 placement
/**
 * mdmLoader：当前宿主的 MDM 加载器。
 */
function mdmLoader() {
  return mdmLoaderSlot.of(getRootSession().host);
}
//@ chunk-5fn9rb8r.js:10415-10448 placement
function startMdmLoad(options) {
  mdmLoader().startLoad(options);
}
//@ chunk-5fn9rb8r.js:10448-10523 placement
/**
 * ensureMdmLoaded：等待 MDM 加载完成。
 */
async function ensureMdmLoaded() {
  let loader = mdmLoader();
  if (!loader.loadPromise) startMdmLoad();
  await loader.loadPromise;
}
//@ chunk-5fn9rb8r.js:10523-10563 placement
/**
 * mdmResult：MDM 加载结果。
 */
function mdmResult() {
  return withAskedWhere(mdmLoader()).mdm ?? EMPTY_MDM_RESULT;
}
//@ chunk-5fn9rb8r.js:10563-10630 placement
/**
 * withAskedWhere：已询问过托管设置时保留提问位置。
 */
function withAskedWhere(snapshot) {
  return snapshot.whereAsked !== undefined && hasManagedSettingsCached() ? snapshot.whereAsked : snapshot;
}
//@ chunk-5fn9rb8r.js:10630-10730 placement
/**
 * 判断某个策略读取结果是否已有答复（无记录也视为已答复）。
 */
function isPolicyReadAnswered(key) {
  let readOutcomes = mdmLoader().readOutcomes;
  if (readOutcomes === null) return false;
  let outcome = readOutcomes[key];
  return outcome === null || outcome.answered;
}
//@ chunk-5fn9rb8r.js:10730-10772 placement
/**
 * setMdmReadOutcomes：记录 MDM 读取结果。
 */
function setMdmReadOutcomes(readOutcomes) {
  mdmLoader().readOutcomes = readOutcomes ?? null;
}
//@ chunk-5fn9rb8r.js:10772-10810 placement
/**
 * hasMdmResult：是否已有 MDM 结果。
 */
function hasMdmResult() {
  return mdmLoader().mdm !== null;
}
//@ chunk-5fn9rb8r.js:10810-10878 placement
/**
 * isMdmLoadInFlight：MDM 加载进行中。
 */
function isMdmLoadInFlight() {
  let loader = mdmLoader();
  return loader.loadPromise !== null && loader.mdm === null;
}
export {
  hasMdmResult,
  ensureMdmLoaded,
  mdmResult,
  withAskedWhere,
  mdmLoader,
  setMdmReadOutcomes,
  isMdmLoadInFlight,
  isPolicyReadAnswered,
};
